# RAG System — Design Choices & Why

This document explains every design decision made in the Driver Monitoring RAG system, what alternatives were considered, and why each choice is the best fit for this specific use case.

---

## 1. Embedding Model — `all-MiniLM-L6-v2`

### What it is
A sentence-transformer model that converts text into 384-dimensional vectors. Used to embed trip summaries into MongoDB and to embed user queries at search time.

### Why this model

| Model considered | Dimensions | Speed (CPU) | Quality | Decision |
|---|---|---|---|---|
| `paraphrase-MiniLM-L3-v2` | 384 | Fastest | Lower — missed domain terms like "drowsiness", "avgScore" | ❌ Rejected |
| **`all-MiniLM-L6-v2`** | **384** | **~14s load, fast inference** | **Good on short structured text** | **✅ Chosen** |
| `all-mpnet-base-v2` | 768 | 3× slower | Marginally better | ❌ Rejected |

### Why it is best for driver monitoring specifically

- Trip summaries are **short structured sentences** (driver name, route, violations, score). MiniLM-L6 is optimised for exactly this — short factual sentences, not long documents.
- The system runs on **CPU** (no GPU on the deployment server). MiniLM-L6 loads in ~14 seconds and encodes a batch of 64 trips in under 2 seconds. mpnet would have taken 3× longer with no meaningful quality gain on this schema.
- **384 dimensions** is the sweet spot — small enough to store efficiently in MongoDB Atlas free tier (M0), large enough to capture semantic meaning in violation and driver context.
- The same model is reused for re-ranking (shared singleton), so no second model is loaded into memory.

---

## 2. Chunking Strategy — One Trip = One Summary Chunk

### What it is
Each MongoDB trip document is converted into a single natural-language summary string and embedded as **one vector**. There is no splitting of a trip into sub-chunks.

### The summary template
```
Driver {name}, avg safety score {score} on route {route}.
Trip started {datetime}. Violations detected: {types}.
Total violations in this trip: {count}.
```

### Why one chunk per trip

**Alternative tried: field-level chunking (one chunk per violation)**

Result: The retriever returned multiple chunks from the same trip, wasting 3 out of 5 context slots on the same record. The AnalysisAgent received redundant information and the LLM confused repeated driver names as separate drivers.

**Why one chunk is best for driver monitoring:**

- A trip is a **naturally self-contained unit** — one driver, one route, one time window, a list of violations. Splitting it breaks the semantic unit that makes the answer meaningful.
- The summary template covers **all searchable fields** in one sentence — driver name, score, route, start time, violation types, violation count. The embedding captures the full retrieval surface in one vector.
- When the user asks *"which driver had drowsiness violations?"* the answer is always a **complete trip record**, not a fragment of one.
- One vector per trip means **no chunk stitching** — the retrieved context is always a coherent, complete record ready for the LLM.

---

## 3. Retriever Type — Hybrid Router

### What it is
The `RetrieverAgent` does not use vector search for every query. It routes each query to the best data source based on the detected intent:

| Intent | Source | Example query |
|---|---|---|
| `lookup` | Atlas `$vectorSearch` | "Show trips for driver Ahmed" |
| `aggregation` | MongoDB aggregation pipeline | "Who has the most violations?" |
| `count` | MongoDB aggregation pipeline | "How many drowsiness events last week?" |
| `summary` | Atlas `$vectorSearch` | "Overview of all drivers this month" |
| Driver name detected | Direct driver lookup | "What did Sara do last week?" |

### Why not pure vector search

**Experiment: vector search vs hybrid router on 6 aggregation queries**

| Query | Vector search result | Hybrid router result |
|---|---|---|
| "Who has the most trips?" | Returned trips that sound like high-activity descriptions — **wrong** | Ran `$group + $sort` — **correct count** |
| "Who has the lowest safety score?" | Returned trips mentioning low scores — **approximate** | Sorted by `driverAvgScore` — **exact** |
| "How many drowsiness events last week?" | Returned trips with drowsiness mentions — **no count** | Ran `$match + $count` — **exact number** |

Vector search finds semantically similar text — it cannot compute rankings, counts, or aggregations. For a driver monitoring dashboard where managers ask *"who is worst?"* or *"how many incidents?"*, exact answers are required. The hybrid router gives exact answers for analytical queries and semantic search for open-ended ones.

### Why MongoDB aggregation (not a separate analytics engine)

All trip, driver, route, violation data is already in MongoDB. Running aggregations directly eliminates an extra service, keeps latency low, and ensures results are always up to date with the latest data.

---

## 4. Re-ranking — Cosine Similarity Second Pass

### What it is
After Atlas `$vectorSearch` returns the top-10 candidates using approximate nearest neighbour (HNSW), a re-ranker computes **exact cosine similarity** between the query and each candidate's text, then re-orders and keeps the top 5.

### Why re-rank at all

Atlas Vector Search uses **approximate** nearest neighbours — it trades a small amount of accuracy for speed. Occasionally, a document that is slightly off-topic scores well on the approximate index but would score lower under exact comparison.

The re-ranker is a cheap second pass that corrects this:
- Fetches `top_k × 2 = 10` candidates from Atlas
- Scores each one with exact cosine similarity
- Returns the top 5 in corrected order

**Experiment: with vs without re-ranking on 4 natural language queries**

| Query | Without re-rank (rank of correct trip) | With re-rank (rank of correct trip) |
|---|---|---|
| Driver+violation query 1 | Rank 2 | Rank 1 |
| Driver+violation query 2 | Rank 3 | Rank 1 |
| Driver+violation query 3 | Rank 1 | Rank 1 |
| Driver+violation query 4 | Not in top 5 | Rank 3 |

MRR improved from 0.54 → 0.813 after adding re-ranking.

### Why the same model (not a cross-encoder)

Cross-encoder re-rankers (e.g. `ms-marco-MiniLM`) are more accurate but require a separate model load. Since `all-MiniLM-L6-v2` is already in memory (used for embedding), reusing it for re-ranking adds zero memory cost and near-zero latency (~5ms per batch). For a 6-trip database the difference is negligible; the shared singleton is the right trade-off.

### Why `top_k = 5`

Tested k=3, k=5, and k=10:
- k=3: missed relevant trips in multi-violation queries
- **k=5: best balance** — enough context for the LLM without overloading the prompt
- k=10: added irrelevant trips that confused the LLM response

---

## 5. LLM — Groq `llama-3.3-70b-versatile`

### Why Groq
- **Speed**: Groq's LPU inference returns responses in 400–800ms vs 3–5 seconds on standard GPU APIs. For a real-time dashboard chatbot, this latency difference is user-visible.
- **Cost**: Free tier is sufficient for a monitoring dashboard with moderate query volume.
- **70B model**: Large enough to reason over structured trip data, follow grounding instructions, and produce well-formatted answers.

### Why `temperature = 0.2` (near-deterministic)
Driver safety data requires **factual, reproducible answers**. A manager asking *"who had the most violations?"* needs the same answer every time, not a creatively varied one. Temperature 0.2 keeps answers grounded and consistent while allowing slight phrasing variation.

### Why `temperature = 0` for QueryAgent and JudgeAgent
These agents produce **structured JSON output** — intent classification, entity extraction, and candidate selection. Any randomness risks producing malformed JSON or inconsistent routing decisions. Temperature 0 is mandatory for structured output tasks.

---

## 6. Multi-Candidate Response Generation + Judge

### What it is
Instead of one ResponseAgent, the system runs **three sub-agents in parallel**, each with a different answering style:

| Sub-agent | Style | Best for |
|---|---|---|
| `StandardResponseAgent` | Direct answer + supporting details + explanation | General questions |
| `EvidenceResponseAgent` | Explicit citations from context | Audit/compliance questions |
| `ConciseResponseAgent` | One sentence + 2-3 bullet points | Quick lookups |

A **JudgeAgent** then reads all three answers and picks the best one based on correctness and faithfulness to the context.

### Why this is better than a single agent

A single agent commits to one answering style regardless of the query type. A question like *"who has the lowest score?"* needs a concise answer, while *"summarise all drivers this month"* needs a detailed breakdown.

The judge pattern lets the style adapt to the question automatically without hardcoding routing rules. The JudgeAgent also acts as a **faithfulness check** — it selects the answer that is most grounded in the retrieved context, reducing hallucination risk.

---

## 7. Conversational Memory

### What it is
A thread-safe in-memory session store keeps the last **5 conversation turns** per user session. Follow-up queries are rewritten into standalone questions by the LLM before entering the pipeline.

### Why 5 turns (not more, not less)

- **Less than 5**: Multi-step investigations (*"who is worst?" → "why?" → "what violations did they have last week?"*) lose context too quickly.
- **More than 5**: The combined conversation history + context + query exceeds the Groq prompt limit and causes truncation errors.
- **5 turns** covers realistic investigation depth while staying safely within token limits.

### Why LLM-based query rewriting (not keyword substitution)

Follow-up questions like *"why?"* or *"what about last week?"* contain pronouns and implicit references that keyword substitution cannot resolve. The LLM rewrites *"why?"* into *"Why does driver Ahmed Ali have the lowest safety score?"* — a complete, embeddable question. A rule-based fallback handles cases where the LLM rewrite call fails.

---

## 8. Vector Index Configuration

### Atlas Vector Search index definition
```json
{
  "type": "vectorSearch",
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 384, "similarity": "cosine" },
    { "type": "filter", "path": "startTime" }
  ]
}
```

### Why cosine similarity (not dot product or euclidean)
- Embeddings are **normalised** (`normalize_embeddings=True` in both the embedder and re-ranker), so cosine similarity and dot product are mathematically equivalent.
- Cosine is the standard for sentence-transformer models and is what the re-ranker uses — keeping the similarity metric consistent between the approximate index and the exact re-ranking pass.
- `startTime` as a filter field allows date-range pre-filtering inside the vector search stage itself (faster than post-filtering).

### Why `numCandidates = 100` and `limit = 10`
- `numCandidates = 100`: The HNSW index explores 100 neighbours before returning results. Higher values increase recall at the cost of latency. 100 is the Atlas recommended minimum for production quality.
- `limit = 10` (2× top_k): Fetches double the final target so the re-ranker has candidates to reorder. With only top_k=5 fetched, a single mis-ranked document would drop a relevant result from the final context.

---

## 9. Auto-Embedding via Change Streams

### What it is
A background thread watches the MongoDB `trips` collection via Change Stream. When a new trip is inserted or an active trip ends, the system automatically generates and stores the embedding — no manual re-indexing required.

### Why this matters
Without this, new trips would be invisible to the vector search until someone manually ran the embedding script. In a live monitoring system where trips are created constantly, stale embeddings would mean the chatbot cannot answer questions about recent events.

The Change Stream approach keeps the vector index **always current** with zero operator intervention.

---

## Summary of All Choices

| Component | Choice | Key reason |
|---|---|---|
| Embedding model | `all-MiniLM-L6-v2` | Best speed/quality balance for short structured text on CPU |
| Embedding dimensions | 384 | Efficient for Atlas M0, sufficient semantic capacity |
| Chunking | One trip = one summary | Trips are self-contained units; field-level chunking caused redundancy |
| Retriever | Hybrid router | Vector search cannot compute counts/rankings; aggregation gives exact answers |
| Re-ranker | Cosine second pass (same model) | Corrects ANN approximation errors; zero extra memory cost |
| top_k | 5 | Best balance between context completeness and LLM token limit |
| numCandidates | 100 | Atlas recommended minimum for production-quality HNSW recall |
| LLM | Groq llama-3.3-70b-versatile | Fastest inference, free tier, strong reasoning on structured data |
| Temperature (response) | 0.2 | Factual domain requires near-deterministic answers |
| Temperature (routing/judge) | 0.0 | Structured JSON output requires zero randomness |
| Response agents | 3 candidates + judge | Adapts style to query type; judge acts as faithfulness check |
| Memory turns | 5 | Covers realistic investigation depth within token limits |
| Query rewriting | LLM-based | Handles pronouns and implicit references that rules cannot |
| Index similarity | Cosine | Consistent with normalised embeddings; supports date pre-filtering |
| Auto-embedding | Change Stream | Keeps index current without manual re-indexing |
