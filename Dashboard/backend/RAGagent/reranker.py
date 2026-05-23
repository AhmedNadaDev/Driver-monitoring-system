from typing import List, Dict

from sentence_transformers import util

from embedding_generator import get_model


def rerank(query: str, docs: List[Dict], top_k: int = 5) -> List[Dict]:
    """
    Re-rank docs by cosine similarity to the query.

    docs format: [{"id": "...", "text": "..."}, ...]
    Returns the top_k docs sorted by descending score, each with an added "score" key.
    Uses the shared model singleton from embedding_generator (no second model load).
    """
    if not docs:
        return []

    model = get_model()
    query_emb = model.encode(query, normalize_embeddings=True)
    doc_embs  = model.encode([d["text"] for d in docs], normalize_embeddings=True)
    scores    = util.cos_sim(query_emb, doc_embs)[0]

    ranked = sorted(zip(docs, scores), key=lambda x: float(x[1]), reverse=True)

    return [
        {"id": doc["id"], "text": doc["text"], "score": float(score)}
        for doc, score in ranked[:top_k]
    ]
