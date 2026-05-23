"""
run_eval.py — Retrieval quality evaluation using live MongoDB data.

Runs automatically on server startup (called from server.py lifespan).
Results are saved to eval_results.json in this directory.

Two query strategies per sampled trip:
  driver+violation — "Which trips had <violation> by driver <name>?"
  summary_prefix   — first 180 chars of stored trip_summary (near-oracle test)

CLI usage:
  python run_eval.py --n 6
"""

import argparse
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from config import get_mongo_client, settings
from embedding_generator import get_model
from retrieval_metrics import precision_at_k, recall_at_k, mrr, hit_rate, ndcg_at_k
from reranker import rerank

logger = logging.getLogger(__name__)

SNIPPET_CHARS  = 180
RESULTS_FILE   = Path(__file__).parent / "eval_results.json"


# ── Build eval cases from MongoDB ─────────────────────────────────────────────

def _violation_query(trip: dict) -> str:
    violations = trip.get("violations", [])
    v_types    = list({v.get("type", "") for v in violations if v.get("type")})
    driver     = (trip.get("driverInfo") or {}).get("name", "Unknown Driver")
    if v_types:
        return f"Which trips had {' and '.join(v_types[:2])} violations by driver {driver}?"
    return f"Show all trips for driver {driver}"


def _summary_query(trip: dict) -> str:
    return (trip.get("trip_summary") or "")[:SNIPPET_CHARS].strip()


def sample_from_db(n: int = 20) -> List[dict]:
    client = get_mongo_client()
    try:
        col = client[settings.mongodb_database][settings.mongodb_collection]
        pipeline = [
            {"$match": {"trip_summary": {"$exists": True, "$ne": ""}}},
            {"$lookup": {"from": "violations", "localField": "_id",
                         "foreignField": "trip", "as": "violations"}},
            {"$match": {"violations.0": {"$exists": True}}},
            {"$sample": {"size": n}},
            {"$lookup": {"from": "drivers", "localField": "driver",
                         "foreignField": "_id", "as": "driverInfo"}},
            {"$unwind": {"path": "$driverInfo", "preserveNullAndEmptyArrays": True}},
            {"$project": {"_id": 1, "trip_summary": 1, "violations": 1, "driverInfo": 1}},
        ]
        trips = list(col.aggregate(pipeline))
        cases = []
        for trip in trips:
            tid = str(trip["_id"])
            q1  = _violation_query(trip)
            q2  = _summary_query(trip)
            if q1:
                cases.append({"query": q1, "expected": {tid}, "strategy": "driver+violation"})
            if q2:
                cases.append({"query": q2, "expected": {tid}, "strategy": "summary_prefix"})
        return cases
    finally:
        client.close()


# ── Retrieval step ────────────────────────────────────────────────────────────

def _retrieve_and_rerank(query: str, top_k: int = 5) -> List[str]:
    client = get_mongo_client()
    try:
        col       = client[settings.mongodb_database][settings.mongodb_collection]
        query_emb = get_model().encode(query, normalize_embeddings=True).tolist()
        pipeline  = [
            {"$vectorSearch": {
                "index": settings.vector_index_name, "path": "embedding",
                "queryVector": query_emb, "numCandidates": 100, "limit": 10,
            }},
            {"$project": {"_id": 1, "trip_summary": 1}},
        ]
        raw      = list(col.aggregate(pipeline))
        docs     = [{"id": str(r["_id"]), "text": r.get("trip_summary", "")} for r in raw]
        reranked = rerank(query, docs, top_k=top_k)
        return [r["id"] for r in reranked]
    finally:
        client.close()


# ── Core evaluation ───────────────────────────────────────────────────────────

def _run_eval(n: int = 20) -> dict:
    cases = sample_from_db(n=n)
    if not cases:
        return {}

    by_strategy: dict = {}
    for item in cases:
        ids   = _retrieve_and_rerank(item["query"], top_k=5)
        exp   = item["expected"]
        strat = item["strategy"]

        by_strategy.setdefault(strat, {"p": [], "r": [], "m": [], "h": [], "ndcg": []})
        by_strategy[strat]["p"].append(precision_at_k(ids, exp, k=5))
        by_strategy[strat]["r"].append(recall_at_k(ids, exp, k=5))
        by_strategy[strat]["m"].append(mrr(ids, exp))
        by_strategy[strat]["h"].append(hit_rate(ids, exp))
        by_strategy[strat]["ndcg"].append(ndcg_at_k(ids, exp, k=5))

    return by_strategy


# ── Save to JSON ──────────────────────────────────────────────────────────────

def save_results(n: int = None) -> None:
    """
    Run retrieval evaluation against live MongoDB, compute all metrics,
    and save the results to eval_results.json.
    Called automatically from server.py on startup.
    """
    client = get_mongo_client()
    try:
        col      = client[settings.mongodb_database][settings.mongodb_collection]
        total    = col.count_documents({})
        embedded = col.count_documents({"trip_summary": {"$exists": True, "$ne": ""}})
    finally:
        client.close()

    sample_n = n or min(total, 20)

    output = {
        "run_at":         datetime.now(timezone.utc).isoformat(),
        "total_trips":    total,
        "embedded_trips": embedded,
        "sample_size":    sample_n,
        "pipeline":       "Atlas VectorSearch (top-10) → cosine re-ranker (top-5)",
        "strategies":     {},
        "overall":        {},
    }

    if embedded == 0:
        output["error"] = "No embedded trips found. Run: python main.py --embed"
        RESULTS_FILE.write_text(json.dumps(output, indent=2))
        logger.warning("[Eval] No embedded trips — skipping eval.")
        return

    by_strategy = _run_eval(n=sample_n)
    if not by_strategy:
        output["error"] = "No trips with violations found to evaluate."
        RESULTS_FILE.write_text(json.dumps(output, indent=2))
        return

    all_p, all_r, all_m, all_h, all_ndcg = [], [], [], [], []

    for strat, vals in by_strategy.items():
        n_q = len(vals["p"])
        avg = lambda k: round(sum(vals[k]) / n_q, 4) if n_q else 0.0
        output["strategies"][strat] = {
            "queries":     n_q,
            "precision_at_5": avg("p"),
            "recall_at_5":    avg("r"),
            "mrr":            avg("m"),
            "ndcg_at_5":      avg("ndcg"),
            "hit_rate":       avg("h"),
        }
        all_p    += vals["p"];    all_r    += vals["r"]
        all_m    += vals["m"];    all_h    += vals["h"]
        all_ndcg += vals["ndcg"]

    n_total = len(all_p)
    avg_all = lambda lst: round(sum(lst) / n_total, 4)
    output["overall"] = {
        "queries":        n_total,
        "precision_at_5": avg_all(all_p),
        "recall_at_5":    avg_all(all_r),
        "mrr":            avg_all(all_m),
        "ndcg_at_5":      avg_all(all_ndcg),
        "hit_rate":       avg_all(all_h),
    }

    RESULTS_FILE.write_text(json.dumps(output, indent=2))
    logger.info(
        "[Eval] Results saved to %s — P@5=%.3f  R@5=%.3f  MRR=%.3f  NDCG@5=%.3f  Hit=%.3f",
        RESULTS_FILE,
        output["overall"]["precision_at_5"],
        output["overall"]["recall_at_5"],
        output["overall"]["mrr"],
        output["overall"]["ndcg_at_5"],
        output["overall"]["hit_rate"],
    )


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=20, help="Trips to sample")
    args = parser.parse_args()
    save_results(n=args.n)
    print(f"Results saved to {RESULTS_FILE}")
    print(json.dumps(json.loads(RESULTS_FILE.read_text()), indent=2))
