import math
from typing import List, Set


def precision_at_k(retrieved: List[str], relevant: Set[str], k: int = 5) -> float:
    if not retrieved:
        return 0.0
    return len(set(retrieved[:k]) & relevant) / k


def recall_at_k(retrieved: List[str], relevant: Set[str], k: int = 5) -> float:
    if not relevant:
        return 0.0
    return len(set(retrieved[:k]) & relevant) / len(relevant)


def mrr(retrieved: List[str], relevant: Set[str]) -> float:
    for i, doc_id in enumerate(retrieved):
        if doc_id in relevant:
            return 1.0 / (i + 1)
    return 0.0


def hit_rate(retrieved: List[str], relevant: Set[str]) -> float:
    return 1.0 if set(retrieved) & relevant else 0.0


def ndcg_at_k(retrieved: List[str], relevant: Set[str], k: int = 5) -> float:
    """Normalised Discounted Cumulative Gain at k (binary relevance)."""
    def dcg(ids: List[str]) -> float:
        return sum(
            1.0 / math.log2(i + 2)
            for i, doc_id in enumerate(ids[:k])
            if doc_id in relevant
        )
    ideal = dcg(list(relevant)[:k])
    return dcg(retrieved) / ideal if ideal > 0 else 0.0
