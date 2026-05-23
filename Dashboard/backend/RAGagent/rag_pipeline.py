"""
rag_pipeline.py — Multi-agent orchestrator for the Bus Monitoring RAG system.

Runs 4 agents sequentially:

  User Query
    → [QueryAgent]     — intent, entities, query reformulation
    → [RetrieverAgent] — vector search / driver lookup / aggregation
    → [AnalysisAgent]  — filter, rank, format context
    → [ResponseAgent]  — Groq LLM answer generation

Each agent passes a typed payload to the next.
"""

import logging
import time
from typing import List, Optional

from config import settings
from agents import (
    QueryAgent,
    RetrieverAgent,
    AnalysisAgent,
    ResponseAgent,
    FinalResponse,
)
from memory import memory_store, ChatTurn
from query_rewriter import rewrite_query_with_context

logger = logging.getLogger(__name__)

# Instantiate agents once (they are stateless singletons)
_query_agent    = QueryAgent()
_retriever_agent = RetrieverAgent()
_analysis_agent = AnalysisAgent()
_response_agent = ResponseAgent()

def ask(
    query: str,
    stream: bool = False,
    session_id: Optional[str] = None,
) -> FinalResponse:
    """
    Run the full 4-agent pipeline for a single query.

    Args:
        query: Natural language question.
        stream: Stream LLM tokens to stdout.
        session_id: Optional conversation session key.

    Returns:
        FinalResponse with answer, per-agent timing, and metadata.
    """
    t0 = time.perf_counter()
    use_memory = settings.enable_memory and bool(session_id)
    history: List[ChatTurn] = (
        memory_store.get_history(session_id) if use_memory and session_id else []
    )
    history_text = _history_for_prompt(history)
    rewritten_query = rewrite_query_with_context(query, history) if use_memory else query

    # Agent 1 — Query understanding
    query_plan = _query_agent.run(rewritten_query)
    query_plan.original_query = query
    query_plan.rewritten_query = rewritten_query
    query_plan.conversation_history = history_text

    # Agent 2 — Data retrieval
    retrieval = _retriever_agent.run(query_plan)

    # Agent 3 — Analysis & context formatting
    analysis = _analysis_agent.run(retrieval)
    if analysis.doc_count == 0 and history_text != "No prior conversation.":
        analysis.memory_fallback_context = history_text

    # Agent 4 — Response generation
    answer, response_ms, response_agent_name = _response_agent.run(analysis, stream=stream)

    total_ms = (time.perf_counter() - t0) * 1000

    result = FinalResponse(
        query=query,
        answer=answer,
        intent=query_plan.intent,
        source=retrieval.source,
        response_agent_name=response_agent_name,
        doc_count=analysis.doc_count,
        context=analysis.context,
        query_agent_ms=query_plan.latency_ms,
        retriever_agent_ms=retrieval.latency_ms,
        analysis_agent_ms=analysis.latency_ms,
        response_agent_ms=response_ms,
        total_ms=total_ms,
    )

    logger.info(
        "Pipeline complete — %.0fms total | "
        "QueryAgent=%.0fms RetrieverAgent=%.0fms "
        "AnalysisAgent=%.0fms ResponseAgent=%.0fms | "
        "intent=%s source=%s docs=%d",
        total_ms,
        query_plan.latency_ms, retrieval.latency_ms,
        analysis.latency_ms, response_ms,
        query_plan.intent, retrieval.source, analysis.doc_count,
    )
    if use_memory and session_id:
        memory_store.max_turns = settings.memory_max_turns
        memory_store.append_turn(session_id, query, answer)
    return result


def batch_ask(queries: List[str]) -> List[FinalResponse]:
    """Run multiple queries sequentially."""
    return [ask(q) for q in queries]


def _history_for_prompt(history: List[ChatTurn]) -> str:
    if not history:
        return "No prior conversation."
    # Keep most recent turns only (memory_store already truncates globally).
    lines = []
    for idx, turn in enumerate(reversed(history[-settings.memory_max_turns :]), 1):
        lines.append(f"[Recent Turn {idx}] User: {turn.user}")
        lines.append(f"[Recent Turn {idx}] Assistant: {turn.assistant}")
    return "\n".join(lines)


if __name__ == "__main__":
    for q in [
        "Which is the most common violation?",
        "Which driver had the most drowsiness events this week?",
        "What violations does Cathy Wood often do?",
        "Which driver had the lowest safety score this week?",
    ]:
        resp = ask(q)
        print(f"\nQ: {resp.query}")
        print(f"A: {resp.answer}")
        print(f"   [{resp.intent} via {resp.source}, {resp.doc_count} docs, {resp.total_ms:.0f}ms]")
