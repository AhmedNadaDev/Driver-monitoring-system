"""
memory.py — Session-scoped conversational memory for Conversational RAG.

Stores multi-turn conversation history in-memory with configurable truncation.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Dict, List


@dataclass
class ChatTurn:
    """Single conversation turn (user + assistant)."""

    user: str
    assistant: str


class ConversationMemoryStore:
    """Thread-safe in-memory conversation store keyed by session_id."""

    def __init__(self, max_turns: int = 5) -> None:
        self.max_turns = max(1, max_turns)
        self._store: Dict[str, List[ChatTurn]] = {}
        self._lock = threading.Lock()

    def get_history(self, session_id: str) -> List[ChatTurn]:
        """Return a copy of session history."""
        with self._lock:
            return list(self._store.get(session_id, []))

    def append_turn(self, session_id: str, user: str, assistant: str) -> None:
        """Append a new turn and truncate history to max_turns."""
        if not session_id:
            return
        with self._lock:
            turns = self._store.setdefault(session_id, [])
            turns.append(ChatTurn(user=user, assistant=assistant))
            if len(turns) > self.max_turns:
                self._store[session_id] = turns[-self.max_turns :]

    def clear(self, session_id: str) -> None:
        """Clear a conversation session."""
        with self._lock:
            self._store.pop(session_id, None)


memory_store = ConversationMemoryStore()
