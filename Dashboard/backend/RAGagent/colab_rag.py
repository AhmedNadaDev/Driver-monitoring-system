# ============================================================
#  Smart Bus Monitoring — Multi-Agent RAG System (Colab Edition)
#
#  4-Agent Pipeline:
#    QueryAgent -> RetrieverAgent -> AnalysisAgent -> ResponseAgent
#
#  Run each section top-to-bottom in separate Colab cells.
# ============================================================


# ─────────────────────────────────────────────────────────────
# SECTION 1 — Install dependencies
# ─────────────────────────────────────────────────────────────
# @title 1. Install dependencies
import subprocess, sys

def pip(*pkgs):
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", *pkgs])

pip(
    "pymongo==4.7.2",
    "sentence-transformers==3.0.1",
    "groq==0.9.0",
    "faker==25.2.0",
    "rich==13.7.1",
    "tqdm==4.66.4",
)

print("Dependencies installed.")


# ─────────────────────────────────────────────────────────────
# SECTION 2 — Credentials
# ─────────────────────────────────────────────────────────────
# @title 2. Set credentials

# Option A: paste directly
MONGODB_URI   = "your_mongodb_uri_here"
GROQ_API_KEY  = "your_groq_api_key_here"

# Option B: Colab Secrets
# from google.colab import userdata
# MONGODB_URI  = userdata.get("MONGODB_URI")
# GROQ_API_KEY = userdata.get("GROQ_API_KEY")

MONGODB_DATABASE   = "bus_monitoring"
MONGODB_COLLECTION = "trips"
GROQ_MODEL         = "llama-3.3-70b-versatile"
EMBEDDING_MODEL    = "all-MiniLM-L6-v2"
EMBEDDING_DIM      = 384
VECTOR_INDEX_NAME  = "trip_vector_index"
TOP_K              = 5
MAX_TOKENS         = 1024
TEMPERATURE        = 0.2

print("Configuration ready.")


# ─────────────────────────────────────────────────────────────
# SECTION 3 — Imports
# ─────────────────────────────────────────────────────────────
# @title 3. Imports

import json, logging, random, time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from faker import Faker
from groq import Groq
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("bus_rag")
console = Console()
fake = Faker()
random.seed(42)

print("Imports done.")


# ─────────────────────────────────────────────────────────────
# SECTION 4 — MongoDB client helper
# ─────────────────────────────────────────────────────────────
# @title 4. MongoDB client

def get_mongo_client() -> MongoClient:
    return MongoClient(
        MONGODB_URI,
        tls=True,
        tlsAllowInvalidCertificates=True,
        serverSelectionTimeoutMS=30_000,
    )

print("MongoDB client helper ready.")


# ─────────────────────────────────────────────────────────────
# SECTION 5 — Data generation
# ─────────────────────────────────────────────────────────────
# @title 5. Data generation

VIOLATION_TYPES = [
    "phone_usage", "smoking", "drowsiness", "no_seatbelt", "hands_off_steering",
]
VIOLATION_SEVERITY = {
    "phone_usage": "high", "smoking": "medium", "drowsiness": "critical",
    "no_seatbelt": "high", "hands_off_steering": "high",
}
EVENT_TYPES = ["overspeed", "harsh_braking", "sharp_turn", "lane_departure"]
ROUTES = [
    "Route 1 -- City Center to Airport",
    "Route 2 -- Suburbs to Industrial Zone",
    "Route 3 -- University Loop",
    "Route 4 -- Hospital Corridor",
    "Route 5 -- Cross-city Express",
    "Route 6 -- Night Shuttle",
    "Route 7 -- School Service",
    "Route 8 -- Harbor Line",
]
DRIVER_POOL = [
    {"driver_id": f"DRV-{i:03d}", "name": fake.name(), "licence": fake.bothify("LIC-####-???")}
    for i in range(1, 21)
]
VEHICLE_POOL = [f"BUS-{i:03d}" for i in range(1, 11)]
VIOLATION_PENALTIES = {"phone_usage": 10, "smoking": 6, "drowsiness": 15, "no_seatbelt": 8, "hands_off_steering": 10}
EVENT_PENALTIES = {"overspeed": 8, "harsh_braking": 5, "sharp_turn": 4, "lane_departure": 7}


def compute_safety_score(violations, events):
    score = 100
    for v in violations: score -= VIOLATION_PENALTIES.get(v["type"], 5)
    for e in events:     score -= EVENT_PENALTIES.get(e["type"], 3)
    return max(0, min(100, score))


def build_trip_summary(doc):
    driver, did = doc["driver"]["name"], doc["driver"]["driver_id"]
    v_lines = [f"{v['type'].replace('_',' ')} ({v['severity']}) at {v['timestamp'].strftime('%H:%M')}" for v in doc["violations"]]
    e_lines = []
    for e in doc["events"]:
        detail = ""
        if e["type"] == "overspeed": detail = f" -- {e['speed_kmh']} km/h in {e['limit_kmh']} zone"
        elif e["type"] == "harsh_braking": detail = f" -- decel {e['deceleration_mss']:.1f} m/s2"
        e_lines.append(f"{e['type'].replace('_',' ')}{detail} at {e['timestamp'].strftime('%H:%M')}")
    return (
        f"Trip {doc['trip_id']} on {doc['start_time'].strftime('%Y-%m-%d')}: "
        f"Driver {driver} ({did}) vehicle {doc['vehicle_id']} on {doc['route']}. "
        f"Duration {doc['duration_minutes']}min, {doc['distance_km']:.1f}km. "
        f"Score: {doc['safety_score']}/100. "
        f"Violations: {'; '.join(v_lines) if v_lines else 'none'}. "
        f"Events: {'; '.join(e_lines) if e_lines else 'none'}."
    )


def generate_trip(idx, base_date):
    driver, vehicle, route = random.choice(DRIVER_POOL), random.choice(VEHICLE_POOL), random.choice(ROUTES)
    start = base_date.replace(hour=random.randint(5,22), minute=random.choice([0,15,30,45]), second=0, microsecond=0)
    dur = random.randint(20, 120)
    risk = random.random()
    violations = []
    for vt in VIOLATION_TYPES:
        if random.random() > (0.85 - risk * 0.6):
            violations.append({"type": vt, "severity": VIOLATION_SEVERITY[vt],
                "timestamp": start + timedelta(seconds=random.randint(60, dur*60-60)),
                "duration_seconds": random.randint(3, 30)})
    events = []
    for et in EVENT_TYPES:
        for _ in range(random.choices([0,1,2,3], weights=[0.5,0.25,0.15,0.1])[0]):
            evt = {"type": et, "timestamp": start + timedelta(seconds=random.randint(60, dur*60-60))}
            if et == "overspeed":
                lim = random.choice([40,60,80,100]); evt["limit_kmh"] = lim; evt["speed_kmh"] = lim + random.randint(5,40)
            elif et == "harsh_braking":
                evt["deceleration_mss"] = round(random.uniform(3.5, 8.0), 2)
            events.append(evt)
    score = compute_safety_score(violations, events)
    doc = {"trip_id": f"TRIP-{idx:05d}", "driver": driver, "vehicle_id": vehicle,
           "route": route, "start_time": start, "end_time": start + timedelta(minutes=dur),
           "duration_minutes": dur, "distance_km": round(random.uniform(5,80), 1),
           "violations": violations, "events": events, "safety_score": score,
           "violation_count": len(violations), "event_count": len(events), "created_at": datetime.utcnow()}
    doc["trip_summary"] = build_trip_summary(doc)
    return doc


def generate_and_store(num_days=14, trips_per_day=20):
    client = get_mongo_client()
    col = client[MONGODB_DATABASE][MONGODB_COLLECTION]
    col.create_index("trip_id", unique=True)
    col.create_index("driver.driver_id"); col.create_index("start_time"); col.create_index("safety_score")
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    ops, idx = [], 1
    for d in range(num_days, 0, -1):
        base = today - timedelta(days=d)
        for _ in range(trips_per_day):
            doc = generate_trip(idx, base); ops.append(UpdateOne({"trip_id": doc["trip_id"]}, {"$set": doc}, upsert=True)); idx += 1
    try:
        res = col.bulk_write(ops, ordered=False)
        total = res.upserted_count + res.modified_count
    except BulkWriteError: total = 0
    finally: client.close()
    return total

print("Data generation ready.")


# ─────────────────────────────────────────────────────────────
# SECTION 6 — Embedding
# ─────────────────────────────────────────────────────────────
# @title 6. Embedding helpers

_embed_model = None

def get_embed_model():
    global _embed_model
    if _embed_model is None:
        import torch
        _embed_model = SentenceTransformer(EMBEDDING_MODEL)
        if torch.cuda.is_available():
            _embed_model = _embed_model.cuda()
            logger.info("Embedding model on GPU: %s", torch.cuda.get_device_name(0))
    return _embed_model

def embed_texts(texts):
    import torch
    model = get_embed_model()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    return model.encode(texts, batch_size=128, normalize_embeddings=True,
                        show_progress_bar=False, device=device).tolist()

def embed_single(text): return embed_texts([text])[0]

def generate_and_store_embeddings(batch_size=256):
    client = get_mongo_client()
    col = client[MONGODB_DATABASE][MONGODB_COLLECTION]
    pending = col.count_documents({"embedding": {"$exists": False}})
    if pending == 0: client.close(); return 0
    updated, buf_ids, buf_texts = 0, [], []
    def flush():
        nonlocal updated
        if not buf_ids: return
        vecs = embed_texts(buf_texts)
        updated += col.bulk_write([UpdateOne({"trip_id": t}, {"$set": {"embedding": v}}) for t, v in zip(buf_ids, vecs)], ordered=False).modified_count
        buf_ids.clear(); buf_texts.clear()
    with tqdm(total=pending, desc="Embeddings") as bar:
        for doc in col.find({"embedding": {"$exists": False}}, {"trip_id": 1, "trip_summary": 1}):
            buf_ids.append(doc["trip_id"]); buf_texts.append(doc.get("trip_summary", "")); bar.update(1)
            if len(buf_ids) >= batch_size: flush()
    flush(); client.close()
    return updated

print("Embedding helpers ready.")


# ─────────────────────────────────────────────────────────────
# SECTION 7 — Groq client
# ─────────────────────────────────────────────────────────────
# @title 7. Groq client

_groq_client = None
def get_groq_client():
    global _groq_client
    if _groq_client is None: _groq_client = Groq(api_key=GROQ_API_KEY)
    return _groq_client

print("Groq client ready.")


# ─────────────────────────────────────────────────────────────
# SECTION 8 — Agent message contracts
# ─────────────────────────────────────────────────────────────
# @title 8. Agent contracts

@dataclass
class QueryPlan:
    original_query: str
    reformulated_query: str
    intent: str                    # lookup | aggregation | count | summary
    driver_name: Optional[str]
    days_back: Optional[int]
    route: Optional[str]
    violation_type: Optional[str]
    latency_ms: float = 0.0

@dataclass
class RetrievalResult:
    query_plan: QueryPlan
    documents: List[Dict[str, Any]]
    aggregation_result: Optional[str]
    source: str                    # vector_search | driver_lookup | aggregation
    latency_ms: float = 0.0

@dataclass
class AnalysisResult:
    query_plan: QueryPlan
    retrieval: RetrievalResult
    context: str
    doc_count: int
    latency_ms: float = 0.0

@dataclass
class FinalResponse:
    query: str; answer: str; intent: str; source: str; doc_count: int; context: str
    query_agent_ms: float; retriever_agent_ms: float
    analysis_agent_ms: float; response_agent_ms: float; total_ms: float

print("Agent contracts defined.")


# ─────────────────────────────────────────────────────────────
# SECTION 9 — Agent 1: QueryAgent
# ─────────────────────────────────────────────────────────────
# @title 9. QueryAgent

_QUERY_AGENT_SYSTEM = """You are the Query Agent for a smart bus monitoring system.
Understand the user's question and return a JSON query plan.

Database fields: driver.name, driver.driver_id, vehicle_id, route,
start_time, end_time, duration_minutes, distance_km, safety_score (0-100),
violations: [{type, severity, timestamp}] (types: phone_usage, smoking, drowsiness, no_seatbelt, hands_off_steering),
events: [{type, timestamp}] (types: overspeed, harsh_braking, sharp_turn, lane_departure)

Return JSON:
{
  "reformulated_query": "<search-optimised rewrite>",
  "intent": "lookup" | "aggregation" | "count" | "summary",
  "driver_name": "<name or null>",
  "days_back": <int or null>,
  "route": "<route or null>",
  "violation_type": "<type or null>"
}

days_back: null=all, 1=today, 2=yesterday, 7=this week, 30=this month.
Return ONLY valid JSON."""


class QueryAgent:
    def run(self, user_query: str) -> QueryPlan:
        t0 = time.perf_counter()
        try:
            resp = get_groq_client().chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "system", "content": _QUERY_AGENT_SYSTEM},
                          {"role": "user",   "content": user_query}],
                max_tokens=200, temperature=0,
                response_format={"type": "json_object"})
            p = json.loads(resp.choices[0].message.content.strip())
        except Exception as e:
            logger.warning("[QueryAgent] %s", e); p = {}
        plan = QueryPlan(
            original_query=user_query,
            reformulated_query=p.get("reformulated_query", user_query),
            intent=p.get("intent", "lookup"),
            driver_name=p.get("driver_name"),
            days_back=p.get("days_back"),
            route=p.get("route"),
            violation_type=p.get("violation_type"),
            latency_ms=(time.perf_counter() - t0) * 1000)
        logger.info("[QueryAgent] intent=%s driver=%s days=%s (%.0fms)",
                    plan.intent, plan.driver_name, plan.days_back, plan.latency_ms)
        return plan

print("QueryAgent ready.")


# ─────────────────────────────────────────────────────────────
# SECTION 10 — Agent 2: RetrieverAgent
# ─────────────────────────────────────────────────────────────
# @title 10. RetrieverAgent

_PIPELINE_SYSTEM = """You are a MongoDB aggregation expert for a trips collection.
Fields: trip_id, driver.driver_id, driver.name, vehicle_id, route,
start_time (Date), end_time, duration_minutes, distance_km,
safety_score (0-100), violation_count, event_count,
violations: [{type, severity, timestamp}], events: [{type, timestamp, ...}].

Generate a compact aggregation pipeline. End with {"$limit": 20}.
Return ONLY: {"pipeline": [...]}"""

_PROJ = {
    "_id": 0, "trip_id": 1, "driver": 1, "vehicle_id": 1, "route": 1,
    "start_time": 1, "end_time": 1, "duration_minutes": 1, "distance_km": 1,
    "safety_score": 1, "violation_count": 1, "event_count": 1,
    "violations": 1, "events": 1, "trip_summary": 1,
}


class RetrieverAgent:
    def run(self, plan: QueryPlan) -> RetrievalResult:
        t0 = time.perf_counter()
        if plan.driver_name:
            docs, agg, src = self._by_driver(plan), None, "driver_lookup"
        elif plan.intent in ("aggregation", "count", "summary"):
            docs, agg, src = [], self._aggregate(plan), "aggregation"
        else:
            docs, agg, src = self._vector_search(plan), None, "vector_search"
        result = RetrievalResult(query_plan=plan, documents=docs,
            aggregation_result=agg, source=src,
            latency_ms=(time.perf_counter() - t0) * 1000)
        logger.info("[RetrieverAgent] source=%s docs=%d (%.0fms)", src, len(docs), result.latency_ms)
        return result

    def _vector_search(self, plan):
        qv = embed_single(plan.reformulated_query)
        vs = {"index": VECTOR_INDEX_NAME, "path": "embedding", "queryVector": qv,
              "numCandidates": max(TOP_K * 10, 100), "limit": TOP_K}
        df = self._date_filter(plan.days_back)
        if df: vs["filter"] = {"start_time": df}
        proj = {**_PROJ, "score": {"$meta": "vectorSearchScore"}}
        return self._run([{"$vectorSearch": vs}, {"$project": proj}])

    def _by_driver(self, plan):
        match = {"driver.name": {"$regex": plan.driver_name, "$options": "i"}}
        df = self._date_filter(plan.days_back)
        if df: match["start_time"] = df
        client = get_mongo_client()
        try: return list(client[MONGODB_DATABASE][MONGODB_COLLECTION].find(match, _PROJ).sort("start_time", -1))
        finally: client.close()

    def _aggregate(self, plan):
        msg = plan.reformulated_query
        if plan.days_back:
            cutoff = (datetime.utcnow() - timedelta(days=plan.days_back)).strftime("%Y-%m-%dT%H:%M:%S")
            msg += f"\n[Time filter: start_time >= {cutoff}]"
        try:
            resp = get_groq_client().chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "system", "content": _PIPELINE_SYSTEM}, {"role": "user", "content": msg}],
                max_tokens=600, temperature=0, response_format={"type": "json_object"})
            pipeline = json.loads(resp.choices[0].message.content.strip()).get("pipeline", [])
            results = self._run(pipeline, disk=True)
            return json.dumps(json.loads(json.dumps(results, default=str)), indent=2)
        except Exception as e:
            return json.dumps([{"error": str(e)}])

    def _run(self, pipeline, disk=False):
        client = get_mongo_client()
        try: return list(client[MONGODB_DATABASE][MONGODB_COLLECTION].aggregate(pipeline, allowDiskUse=disk))
        finally: client.close()

    @staticmethod
    def _date_filter(days_back):
        if days_back is None: return None
        return {"$gte": datetime.utcnow() - timedelta(days=days_back)}

print("RetrieverAgent ready.")


# ─────────────────────────────────────────────────────────────
# SECTION 11 — Agent 3: AnalysisAgent
# ─────────────────────────────────────────────────────────────
# @title 11. AnalysisAgent

class AnalysisAgent:
    MAX_DOCS = 25

    def run(self, retrieval: RetrievalResult) -> AnalysisResult:
        t0 = time.perf_counter()
        plan = retrieval.query_plan
        if retrieval.source == "aggregation" and retrieval.aggregation_result:
            context = f"Aggregated results:\n{retrieval.aggregation_result}"
            doc_count = 0
        else:
            docs = self._filter(retrieval.documents, plan)[:self.MAX_DOCS]
            context = self._format(docs)
            doc_count = len(docs)
        return AnalysisResult(query_plan=plan, retrieval=retrieval,
            context=context, doc_count=doc_count,
            latency_ms=(time.perf_counter() - t0) * 1000)

    def _filter(self, docs, plan):
        filtered = docs
        if plan.violation_type:
            vt = plan.violation_type.lower().replace(" ", "_")
            f2 = [d for d in filtered if any(v.get("type","").lower() == vt for v in d.get("violations", []))]
            if f2: filtered = f2
        if plan.route:
            f2 = [d for d in filtered if plan.route.lower() in d.get("route","").lower()]
            if f2: filtered = f2
        return filtered

    def _format(self, docs):
        if not docs: return "No relevant trip records found."
        parts = []
        for i, doc in enumerate(docs, 1):
            drv = doc.get("driver", {})
            vt = ", ".join(f"{v['type']} ({v.get('severity','?')}) at {self._ts(v.get('timestamp'))}" for v in doc.get("violations",[])) or "none"
            et = ", ".join(f"{e['type']} at {self._ts(e.get('timestamp'))}" for e in doc.get("events",[])) or "none"
            sim = doc.get("score")
            parts.append(
                f"[Record {i}]\n  Trip: {doc.get('trip_id')}  Driver: {drv.get('name')} ({drv.get('driver_id')})\n"
                f"  Vehicle: {doc.get('vehicle_id')}  Route: {doc.get('route')}\n"
                f"  Time: {self._ts(doc.get('start_time'))} - {self._ts(doc.get('end_time'))}  "
                f"Duration: {doc.get('duration_minutes')}min  Distance: {doc.get('distance_km')}km\n"
                f"  Safety Score: {doc.get('safety_score')}/100\n"
                f"  Violations: {vt}\n  Events: {et}"
                + (f"\n  Similarity: {sim:.4f}" if sim else ""))
        return "\n\n".join(parts)

    @staticmethod
    def _ts(v):
        if isinstance(v, datetime): return v.strftime("%Y-%m-%d %H:%M")
        return str(v) if v else "N/A"

print("AnalysisAgent ready.")


# ─────────────────────────────────────────────────────────────
# SECTION 12 — Agent 4: ResponseAgent
# ─────────────────────────────────────────────────────────────
# @title 12. ResponseAgent

_RESP_SYS = """You are an expert analyst for a Smart Bus Monitoring System.
Answer using ONLY the data below. Cite Trip ID and Driver ID.
Structure: Direct Answer, Supporting Details (bullets), Explanation (2-3 sentences).
If data is insufficient, say so."""


class ResponseAgent:
    def run(self, analysis: AnalysisResult, stream=False):
        t0 = time.perf_counter()
        user_msg = f"Context:\n{analysis.context}\n\n---\nQuestion: {analysis.query_plan.original_query}\n\nAnswer:"
        if stream:
            answer = self._stream(user_msg)
        else:
            answer = self._blocking(user_msg)
        return answer, (time.perf_counter() - t0) * 1000

    def _blocking(self, msg):
        try:
            resp = get_groq_client().chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "system", "content": _RESP_SYS}, {"role": "user", "content": msg}],
                max_tokens=MAX_TOKENS, temperature=TEMPERATURE)
            return resp.choices[0].message.content.strip()
        except Exception as e: return f"[Error] {e}"

    def _stream(self, msg):
        tokens = []
        print("Answer: ", end="", flush=True)
        try:
            s = get_groq_client().chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "system", "content": _RESP_SYS}, {"role": "user", "content": msg}],
                max_tokens=MAX_TOKENS, temperature=TEMPERATURE, stream=True)
            for chunk in s:
                d = chunk.choices[0].delta.content
                if d: print(d, end="", flush=True); tokens.append(d)
            print()
        except Exception as e: tokens.append(f"\n[Error: {e}]")
        return "".join(tokens)

print("ResponseAgent ready.")


# ─────────────────────────────────────────────────────────────
# SECTION 13 — Pipeline orchestrator
# ─────────────────────────────────────────────────────────────
# @title 13. Pipeline

query_agent    = QueryAgent()
retriever_agent = RetrieverAgent()
analysis_agent = AnalysisAgent()
response_agent = ResponseAgent()


def ask(query, stream=False):
    t0 = time.perf_counter()
    plan       = query_agent.run(query)
    retrieval  = retriever_agent.run(plan)
    analysis   = analysis_agent.run(retrieval)
    answer, rms = response_agent.run(analysis, stream=stream)
    return FinalResponse(
        query=query, answer=answer, intent=plan.intent,
        source=retrieval.source, doc_count=analysis.doc_count,
        context=analysis.context,
        query_agent_ms=plan.latency_ms,
        retriever_agent_ms=retrieval.latency_ms,
        analysis_agent_ms=analysis.latency_ms,
        response_agent_ms=rms,
        total_ms=(time.perf_counter() - t0) * 1000)


def display_result(r):
    console.rule("[bold cyan]RAG Answer")
    console.print(Panel(r.answer, title="[bold green]Answer", border_style="green"))
    t = Table(title="Agent Pipeline", header_style="bold magenta")
    t.add_column("Agent", style="cyan"); t.add_column("Latency", justify="right"); t.add_column("Detail", style="dim")
    t.add_row("1. QueryAgent",    f"{r.query_agent_ms:.0f} ms",    f"intent={r.intent}")
    t.add_row("2. RetrieverAgent",f"{r.retriever_agent_ms:.0f} ms",f"source={r.source}")
    t.add_row("3. AnalysisAgent", f"{r.analysis_agent_ms:.0f} ms", f"docs={r.doc_count}")
    t.add_row("4. ResponseAgent", f"{r.response_agent_ms:.0f} ms", "Groq LLM")
    t.add_row("[bold]Total[/bold]",f"[bold]{r.total_ms:.0f} ms[/bold]", "", style="bold")
    console.print(t); console.print()

print("Pipeline orchestrator ready.")


# ─────────────────────────────────────────────────────────────
# SECTION 14 — Setup (run once)
# ─────────────────────────────────────────────────────────────
# @title 14. Run setup

RUN_SETUP = True

if RUN_SETUP:
    console.rule("[bold yellow]Step 1 -- Data Generation")
    n = generate_and_store(num_days=14, trips_per_day=20)
    console.print(f"[green]{n} documents written.[/green]\n")

    console.rule("[bold yellow]Step 2 -- Embeddings")
    u = generate_and_store_embeddings(batch_size=256)
    console.print(f"[green]{u} documents updated.[/green]\n")

    console.print("[yellow]Create the Atlas Vector Search index if not done yet.[/yellow]")


# ─────────────────────────────────────────────────────────────
# SECTION 15 — Benchmark
# ─────────────────────────────────────────────────────────────
# @title 15. Run benchmark queries

QUERIES = [
    "Which driver had the lowest safety score this week?",
    "How many drowsiness events occurred yesterday?",
    "Which is the most common violation?",
    "What violations does Cathy Wood often do?",
    "Which bus had the most harsh braking events this week?",
    "Who is the safest driver in the past 30 days?",
    "Summarise the safety performance of all drivers this month.",
]

for i, q in enumerate(QUERIES, 1):
    console.rule(f"[dim]Query {i}/{len(QUERIES)}")
    r = ask(q, stream=False)
    display_result(r)


# ─────────────────────────────────────────────────────────────
# SECTION 16 — Single query
# ─────────────────────────────────────────────────────────────
# @title 16. Ask a question

MY_QUERY = "Which driver had the most violations this week?"
r = ask(MY_QUERY, stream=True)
display_result(r)
