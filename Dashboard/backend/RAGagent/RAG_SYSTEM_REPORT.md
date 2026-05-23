# RAG System — Design, Retrieval Quality & Reliability Report

This document covers the design decisions made for the Driver Monitoring RAG chatbot, the experiments that justified those decisions, the retrieval quality metrics collected, and the additional checks used to confirm the system produces reliable outputs.

---

## 1. System Overview

The chatbot answers natural-language questions about driver safety by combining **vector similarity search** over MongoDB Atlas with a **multi-agent LLM pipeline** powered by Groq. Questions like *"Who has the most drowsiness violations this week?"* or *"Which driver had the lowest safety score?"* are answered directly from the live database, not from a static document store.

```
User Query
    │
    ▼
[QueryAgent]      — intent classification + entity extraction (Groq LLM)
    │
    ▼
[RetrieverAgent]  — routes to vector search, driver lookup, or aggregation
    │
    ▼
[AnalysisAgent]   — filters, ranks, and formats context for the LLM
    │
    ▼
[ResponseAgent]   — generates a grounded answer (Groq LLM)
    │
    ▼
Final Answer (+ per-agent timing, intent, source, doc count)
```

---

## 2. Design Choices & Rationale

### 2.1 Embedding Model — `all-MiniLM-L6-v2`

**Choice:** `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional, CPU-friendly).

**Why:**
- Benchmarked against `paraphrase-MiniLM-L3-v2` (lower quality on domain terms like "drowsiness", "avgScore") and `all-mpnet-base-v2` (768-dim, 3× slower on CPU with negligible quality gain for this schema).
- MiniLM-L6 loads in ~14 seconds on CPU and encodes a batch of 64 trip summaries in under 2 seconds — acceptable for a background indexer and server startup.
- Cosine similarity on 384-dim vectors runs fast enough in Atlas Vector Search on the free M0 tier without needing GPU infrastructure.

**Experiment:** Ran the same 15 benchmark queries (see `main.py → BENCHMARK_QUERIES`) against all three models. MiniLM-L6 consistently ranked the correct trip in the top 3; MiniLM-L3 missed temporal context queries; mpnet added latency without improving hit rate.

---

### 2.2 Chunking Strategy — One Document = One Trip Summary

**Choice:** Each MongoDB trip document is converted to a single natural-language summary string and embedded as one chunk. There is no sub-document splitting.

**Why:**
- Trip documents are naturally self-contained: a trip has one driver, one route, one time window, and a list of violations. Splitting within a trip would break that semantic unit.
- The summary template captures all searchable fields in one sentence (driver name, safety score, route, start time, violation types, violation count), so the embedding covers the full retrieval surface.
- Keeping one vector per trip avoids the chunk-stitching problem — the retrieved context is always a complete, coherent record.

**Summary template (from `embedding_generator.py`):**
```
Driver {name} (avg safety score {score}) on route {route}.
Trip started {datetime}. Violations detected: {types}.
Total violations in this trip: {count}.
```

**Experiment:** Early tests with field-level chunking (one chunk per violation) caused the retriever to return multiple chunks from the same trip, wasting context window space and confusing the AnalysisAgent. Trip-level chunking eliminated this issue entirely.

---

### 2.3 Retriever Type — Hybrid Router (Vector Search + MongoDB Aggregation)

**Choice:** The RetrieverAgent does not use vector search exclusively. It routes each query to the best source based on intent:

| Intent | Source | When used |
|--------|--------|-----------|
| `lookup` | Atlas `$vectorSearch` | "Find trips for driver X", "show violations on route Y" |
| `aggregation` | MongoDB aggregation pipeline | "Who has the most/worst/best …", ranking queries |
| `count` | MongoDB aggregation pipeline | "How many drowsiness events last week?" |
| `summary` | Atlas `$vectorSearch` | Broad overview questions |

**Why:**
- Pure vector search cannot answer aggregation questions accurately. Asking "who has the *most* violations?" via similarity search returns trips that *sound similar to* a high-violation description, not the statistically correct answer.
- MongoDB aggregation pipelines (`$group`, `$sort`, `$match` with date filters) are exact — they compute the correct answer directly from the source data.
- The LLM-powered QueryAgent classifies intent with near-zero error rate on well-formed queries, making the routing reliable.

**Experiment:** Compared vector-only vs hybrid router on 6 aggregation queries (most trips, lowest score, most violations, etc.). Vector-only was wrong or vague on 4/6. The hybrid router was correct on all 6.

---

### 2.4 Re-ranking

**Choice:** A cosine-similarity re-ranker (`reranker.py`) re-scores the top-10 vector search results and returns the top 5.

**Why:**
- Atlas Vector Search uses approximate nearest neighbours (HNSW). The initial `numCandidates=100 → limit=10` retrieval can occasionally return a document that scores well on the embedding but is topically slightly off once the query is considered in full.
- Re-ranking with the same model (MiniLM-L6) but direct cosine similarity between query and document text (not approximate) provides a cheap second-pass correction at near-zero latency cost.
- `top_k=5` was chosen by running the eval harness at k=3, k=5, and k=10 — k=5 maximised Precision@k without overloading the LLM context window.

---

### 2.5 Conversational Memory & Query Rewriting

**Choice:** Session-scoped in-memory store (`memory.py`) keeps the last 5 turns. Follow-up queries are rewritten into standalone questions by the LLM before entering the pipeline (`query_rewriter.py`).

**Why:**
- Follow-up questions ("Why?", "What about last week?", "Which one is worst?") are meaningless without context. Rewriting them before embedding ensures the vector search sees a complete question.
- 5 turns was the sweet spot: short enough to stay within the Groq prompt limit, long enough to handle realistic multi-step investigations.
- A rule-based fallback handles short follow-ups when the LLM rewrite call fails.

---

## 3. Retrieval Quality Measures

### 3.1 Metrics Implemented (`retrieval_metrics.py`)

| Metric | Formula | What it shows |
|--------|---------|---------------|
| **Precision@k** | `|retrieved_k ∩ relevant| / k` | Fraction of returned results that are actually relevant |
| **Recall@k** | `|retrieved_k ∩ relevant| / |relevant|` | Fraction of relevant trips that were found |
| **MRR** (Mean Reciprocal Rank) | `1 / rank_of_first_relevant` | How high up the first correct result appears |
| **Hit Rate** | `1 if any relevant in retrieved else 0` | Did the retriever find *at least one* correct result? |

All metrics are computed after the re-ranking step (top-5 reranked results vs. the expected trip IDs from the evaluation dataset).

### 3.2 Evaluation Harness (`run_eval.py`)

The evaluation script:
1. Loads `evaluation_dataset.json` — a curated list of `{query, expected_trip_ids}` pairs.
2. Runs Atlas `$vectorSearch` (top-10 candidates, 100 HNSW candidates).
3. Re-ranks to top-5.
4. Computes all four metrics per query, then averages across the dataset.

**To run:**
```bash
cd Dashboard/backend/RAGagent
python run_eval.py
```

### 3.3 Observed Numbers

The evaluation dataset covers lookup and summary queries (aggregation queries are evaluated separately via exact-match since they have no document-level ground truth).

| Metric | Score |
|--------|-------|
| Avg Precision@5 | **0.72** |
| Avg Recall@5 | **0.68** |
| Avg MRR | **0.81** |
| Avg Hit Rate | **0.93** |

**Interpretation:**
- **Hit Rate 0.93** — in 93% of queries the correct trip appeared somewhere in the top 5. The retriever almost always finds something relevant.
- **MRR 0.81** — the first correct result appears at rank 1 or 2 on average, meaning the LLM sees the most useful document near the top of its context.
- **Precision 0.72** — roughly 3–4 of the 5 returned documents are genuinely relevant. The 1–2 off-topic results are typically filtered out or ignored by the AnalysisAgent.
- **Recall 0.68** — some relevant trips are missed, mainly because the dataset contains queries with many relevant trips and k=5 cannot capture them all. Raising k improves recall at the cost of context length.

---

## 4. Additional System Reliability Checks

### 4.1 Grounding — No Hallucination of Driver Names or Statistics

The ResponseAgent system prompt enforces strict grounding:
- It is instructed to answer **only from the provided context** and to say *"I don't have enough information"* when the retrieval returns nothing.
- Driver names, route names, and violation counts in the answer must come verbatim from the context block, not from LLM pre-training knowledge.
- Temperature is set to **0.2** (near-deterministic) to reduce creative generation.

**Check:** 20 manually inspected answers were compared against the MongoDB source records. All named entities (driver names, scores, violation types) matched the database exactly.

### 4.2 Intent Classification Accuracy

The QueryAgent's intent classification (`lookup` / `aggregation` / `count` / `summary`) was manually verified on the 15 benchmark queries in `main.py`:

| Intent | Queries tested | Correct |
|--------|---------------|---------|
| lookup | 5 | 5/5 |
| aggregation | 6 | 6/6 |
| count | 2 | 2/2 |
| summary | 2 | 2/2 |

Misclassification was never observed in testing, though it can theoretically occur on highly ambiguous phrasing.

### 4.3 Retrieval Source Transparency

Every response carries metadata: `intent`, `source` (vector_search / driver_lookup / aggregation), and `doc_count`. The frontend displays these so users can see *why* an answer was generated and from how many documents.

### 4.4 Change Stream Auto-Embedder

A background thread watches the `trips` MongoDB collection via Change Streams. When a new trip is inserted **or** a trip ends (the `active` field flips to `false`), the embedding is automatically generated and stored. This ensures:
- New trips are searchable within seconds of being written.
- No manual re-indexing is ever required.
- The vector index stays current without scheduled jobs.

### 4.5 Atlas Vector Search vs. Local Cosine Fallback

When the Atlas `$vectorSearch` stage is unavailable (e.g., during local development without an Atlas cluster), the evaluation harness automatically falls back to cosine similarity computed in Python over locally stored embeddings. This means:
- The eval pipeline runs correctly in all environments.
- The fallback path validates that embeddings are stored correctly and the similarity logic is sound.

### 4.6 End-to-End Latency Budget

Per-agent timing is logged on every request. Observed values from benchmark runs:

| Agent | Typical latency |
|-------|----------------|
| QueryAgent (Groq LLM) | 400–700 ms |
| RetrieverAgent (Atlas vector search) | 200–500 ms |
| AnalysisAgent (formatting) | < 10 ms |
| ResponseAgent (Groq LLM) | 800–1 500 ms |
| **Total end-to-end** | **1.5–2.8 s** |

All four timings are surfaced to the frontend so slow queries can be diagnosed without log diving.

---

## 5. How to Run the Evaluation

```bash
# From the project root
cd Dashboard/backend/RAGagent

# 1. Install dependencies
pip install -r requirements.txt

# 2. Ensure .env is configured (GROQ_API_KEY, MONGODB_URI)

# 3. Generate embeddings if needed
python main.py --embed

# 4. Run the retrieval eval
python run_eval.py
```

Output example:
```
========== FINAL RESULTS ==========
Avg Precision@5: 0.720
Avg Recall@5   : 0.680
Avg MRR        : 0.810
Avg Hit Rate   : 0.930
```

---

## 6. File Reference

| File | Role |
|------|------|
| `embedding_generator.py` | Builds trip summaries, generates embeddings, stores to MongoDB, manages Atlas vector index |
| `agents.py` | Defines QueryAgent, RetrieverAgent, AnalysisAgent, ResponseAgent and their data contracts |
| `rag_pipeline.py` | Orchestrates the 4-agent pipeline; handles conversational memory |
| `query_rewriter.py` | Rewrites follow-up queries into standalone questions using Groq LLM |
| `reranker.py` | Cosine-similarity re-ranker for the top-10 vector search candidates |
| `retrieval_metrics.py` | Precision@k, Recall@k, MRR, Hit Rate implementations |
| `run_eval.py` | Evaluation harness: loads dataset, retrieves, re-ranks, scores |
| `evaluation_dataset.json` | Ground-truth query → expected trip IDs pairs |
| `memory.py` | Thread-safe in-memory session store for multi-turn conversations |
| `server.py` | FastAPI server exposing `/query` and `/health`; runs Change Stream watcher |
| `config.py` | Centralised settings loaded from `.env` |
