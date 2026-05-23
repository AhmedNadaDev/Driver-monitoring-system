"""
query_rewriter.py — Rewrites follow-up queries into standalone questions.
"""

from __future__ import annotations

import json
import logging
from typing import List

from config import settings
from generation import get_groq_client
from memory import ChatTurn

logger = logging.getLogger(__name__)

_REWRITE_SYSTEM = """You rewrite user follow-up questions into standalone questions.
You are given a short conversation history and the latest user query.

Rules:
1. Keep the rewritten query faithful to user intent.
2. Resolve references like "why", "which one", "what about last week", "that driver".
3. If no rewrite is needed, return the original query unchanged.
4. Return JSON only: {"standalone_query":"..."}"""


def _history_text(history: List[ChatTurn]) -> str:
    if not history:
        return "No previous turns."
    lines = []
    for idx, turn in enumerate(history, 1):
        lines.append(f"Turn {idx} User: {turn.user}")
        lines.append(f"Turn {idx} Assistant: {turn.assistant}")
    return "\n".join(lines)


def rewrite_query_with_context(query: str, history: List[ChatTurn]) -> str:
    """
    Rewrite a query to be standalone using session history.

    Falls back to rule-based behavior when LLM call fails.
    """
    q = query.strip()
    if not q:
        return query
    if not history:
        return q

    try:
        user_prompt = (
            f"Conversation history:\n{_history_text(history)}\n\n"
            f"Latest user query:\n{q}\n"
        )
        resp = get_groq_client().chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": _REWRITE_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=180,
            temperature=0,
            response_format={"type": "json_object"},
        )
        raw = json.loads(resp.choices[0].message.content.strip())
        rewritten = (raw.get("standalone_query") or "").strip()
        if rewritten:
            logger.info("[Rewrite] '%s' -> '%s'", q, rewritten)
            return rewritten
    except Exception as exc:
        logger.warning("[Rewrite] LLM rewrite failed, using rule fallback: %s", exc)

    # Rule fallback for short ambiguous follow-ups.
    previous_user = history[-1].user if history else ""
    previous_assistant = history[-1].assistant if history else ""
    if len(q.split()) <= 5:
        return (
            f"In reference to the previous answer.\n"
            f"Previous question: {previous_user}\n"
            f"Previous answer: {previous_assistant}\n"
            f"Follow-up question: {q}"
        )
    return q
