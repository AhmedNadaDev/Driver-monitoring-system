# Conversational RAG Upgrade

## What Was Added

- **Session memory system** (`memory.py`)
  - In-memory session store keyed by `session_id`
  - Multi-user support
  - Automatic truncation to last `N` turns (`MEMORY_MAX_TURNS`)
- **Query rewriting layer** (`query_rewriter.py`)
  - Rewrites follow-up queries into standalone questions before retrieval
  - LLM-based rewriting with rule-based fallback
- **Conversation-aware pipeline integration**
  - `rag_pipeline.ask()` now supports `session_id`
  - New order: memory lookup -> rewrite -> query understanding -> retrieval -> response
- **Conversation-aware prompting**
  - Response prompt now includes:
    - compressed conversation history
    - rewritten standalone query
    - retrieved context
- **Weak-retrieval fallback**
  - If retrieval is weak (`doc_count == 0`), history is injected as fallback context
- **Session-aware interfaces**
  - API: `POST /query` accepts `session_id`
  - API: `DELETE /session/{session_id}` clears memory
  - CLI chat now runs with a generated session id

## Architecture Diagram (Text)

```text
User Query + session_id
        |
        v
[Memory Store] ----> recent turns (last N)
        |
        v
[Query Rewriter]
  follow-up -> standalone query
        |
        v
[QueryAgent]
  intent + entities + retrieval plan
        |
        v
[RetrieverAgent]
  deterministic aggregation / vector / lookup
        |
        v
[AnalysisAgent]
  relevance filtering + context assembly
        |
        v
[ResponseAgent]
  prompt(history + rewritten query + retrieved context)
        |
        v
Assistant Answer
        |
        v
[Memory Store Append Turn]
```

## How Memory Works

1. Caller passes `session_id` to `ask()` or API `/query`.
2. Memory store returns conversation turns for that session.
3. Rewriter resolves ambiguous follow-ups (e.g. "Why?", "Which one?").
4. Pipeline answers using rewritten question + history-aware prompt.
5. Final answer is appended back to memory.
6. Store truncates to `MEMORY_MAX_TURNS`.

### Memory Data Model

```python
[
  {"user": "...", "assistant": "..."},
  {"user": "...", "assistant": "..."},
]
```

## Example Conversations (Before vs After)

## 1) Lowest safety score -> Why?

### Before (stateless)
- Q1: "Which driver has the lowest safety score?"
- Q2: "Why?"
- Result: ambiguous / often "not enough information".

### After (conversational)
- Q1 answered with identified driver.
- Q2 rewritten to: "Why does <driver> have the lowest safety score?"
- Result: answer stays anchored to previous turn.

## 2) Most trips -> What about last week?

### Before
- Follow-up loses comparison scope.

### After
- Follow-up rewritten with temporal scope.
- Retrieval applies time-aware logic and returns contextual comparison.

## 3) Drowsiness list -> Which one is worst?

### Before
- "Which one" unresolved.

### After
- Rewritten to severity/comparison intent.
- Uses deterministic aggregation path for drowsiness ranking.

## Design Decisions

- **Dedicated memory module** for clean separation of concerns.
- **Session-scoped store** to support concurrent users and API usage.
- **Pre-retrieval rewriting** to maximize retrieval quality on follow-ups.
- **Prompt-level conversation grounding** to maintain continuity.
- **Bounded memory** to control token usage and latency.
- **Non-breaking defaults**: memory is optional (`session_id` required and `ENABLE_MEMORY=true`).

## Limitations

- Memory is in-process only (resets on restart).
- No long-horizon summarization yet (only truncation).
- Rewrite quality depends on LLM reliability.
- If data itself is missing/incomplete, continuity helps but cannot invent facts.

## Future Improvements

- Persist memory in Redis/Mongo for horizontal scaling.
- Add long-term summary memory for older turns.
- Add retrieval-aware conversational state (entities/time windows) as structured memory.
- Add explicit confidence scores for rewritten queries.
- Add automated integration tests with expected assertions per turn.

## Configuration

Add in `.env`:

```env
ENABLE_MEMORY=true
MEMORY_MAX_TURNS=5
```

## Usage

### API

`POST /query`

```json
{
  "query": "Why?",
  "session_id": "user-123"
}
```

`DELETE /session/user-123` to clear history.

### CLI

- `python main.py --chat` -> auto session id (memory-aware)
- `python main.py --query "Which driver has the lowest safety score?" --session-id my-session`
- `python main.py --conversation-test` for mandatory multi-turn validation scenarios
