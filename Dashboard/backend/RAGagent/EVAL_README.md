# RAG Evaluation — How It Works & What the Numbers Mean

This document explains the retrieval evaluation system built for the Driver Monitoring RAG chatbot: what it measures, how it runs, what each metric means, and how to interpret the results.

---

## 1. What Is Being Evaluated

The evaluation tests **retrieval quality** — the ability of the system to find the right trip records from MongoDB when given a natural language question.

The pipeline being tested:

```
Natural Language Query
        │
        ▼
Atlas $vectorSearch  (top-10 candidates from vector index)
        │
        ▼
Cosine Re-ranker     (re-scores and keeps top-5)
        │
        ▼
Retrieved Trip IDs   ← eval checks these against the expected answer
```

---

## 2. How Test Cases Are Generated (No Manual Work Needed)

There is no static test file. Every time the eval runs, it **automatically samples real trips from MongoDB** and builds test queries from their known content.

For each sampled trip, two queries are generated:

### Strategy 1 — `driver+violation` (realistic user question)
Built from the driver name and violation types stored in the trip:
```
"Which trips had drowsy and cellphone violations by driver Ahmed Ali?"
```
The system knows the correct answer is that specific trip because the question was built from it. This tests how well the retriever handles real-world natural language questions.

### Strategy 2 — `summary_prefix` (near-oracle test)
Takes the first 180 characters of the stored `trip_summary` field:
```
"Driver Ahmed Ali, avg safety score 72.3 on route Line 5. Trip started 2024-03-10..."
```
Since the vector index was built from this exact text, this tests the technical fidelity of the embedding and index — it should score near-perfect.

---

## 3. Metrics Explained

All metrics are computed against **top-5 results after re-ranking**.

### Precision@5
**Formula:** `(correct trips in top 5) / 5`

How many of the 5 returned results are the expected trip. With a small database (6 trips), this is naturally low because the system returns 5 out of 6 possible trips — only 1 of which is the target. This improves significantly with more data.

### Recall@5
**Formula:** `(correct trips found in top 5) / (total correct trips)`

Did the system find the expected trip within the top 5? With one expected trip per query, this is either 1.0 (found) or 0.0 (not found). Averaged across queries it shows the overall find-rate.

### MRR — Mean Reciprocal Rank
**Formula:** `1 / rank_of_first_correct_result`

If the correct trip appears at rank 1 → MRR = 1.0. At rank 2 → MRR = 0.5. At rank 3 → MRR = 0.33. A high MRR means the correct result appears near the top of the list, which is what matters most — the LLM sees the most relevant document first.

### NDCG@5 — Normalised Discounted Cumulative Gain
**Formula:** `DCG / ideal_DCG` (logarithmic position weighting)

Similar to MRR but uses a logarithmic penalty for lower-ranked correct results. Rank 1 is worth more than rank 2, which is worth more than rank 3, etc. NDCG = 1.0 means the correct result was at rank 1. It measures both whether the correct result was found AND how high up it appeared.

### Hit Rate
**Formula:** `1 if any correct result in top 5 else 0`

The simplest metric — did the correct trip appear anywhere in the top 5? Averaged across queries to give a percentage. A hit rate of 0.875 means the correct trip was found in 87.5% of all queries.

---

## 4. Actual Results (from `eval_results.json`)

**Run date:** 2026-04-23  
**Database:** 6 total trips, all 6 embedded  
**Sample:** 6 trips → 8 test queries (4 per strategy)  
**Pipeline:** Atlas VectorSearch (top-10) → cosine re-ranker (top-5)

### Strategy 1: Natural Language Queries (`driver+violation`)
*Tests real user questions — hardest test*

| Metric | Score | Interpretation |
|--------|-------|----------------|
| Precision@5 | **0.150** | Low due to small database size (6 trips only) |
| Recall@5 | **0.750** | Correct trip found in 3 out of 4 queries |
| MRR | **0.625** | Correct trip appears at rank 1–2 on average |
| NDCG@5 | **0.658** | Good ranking quality for natural language input |
| Hit Rate | **0.750** | Found the right trip in 75% of queries |

### Strategy 2: Summary-Prefix Queries (`summary_prefix`)
*Tests index fidelity — near-oracle baseline*

| Metric | Score | Interpretation |
|--------|-------|----------------|
| Precision@5 | **0.200** | 1 correct out of 5 returned (max possible with 6 trips) |
| Recall@5 | **1.000** | Perfect — found the correct trip every time |
| MRR | **1.000** | Correct trip always at rank 1 |
| NDCG@5 | **1.000** | Perfect ranking — correct trip always first |
| Hit Rate | **1.000** | Found the right trip in 100% of queries |

### Overall (all 8 queries combined)

| Metric | Score |
|--------|-------|
| Precision@5 | **0.175** |
| Recall@5 | **0.875** |
| MRR | **0.813** |
| NDCG@5 | **0.829** |
| Hit Rate | **0.875** |

---

## 5. How to Read These Numbers

**Precision is low — is that a problem?**

No. With only 6 trips in the database, the system returns 5 of them for every query. Only 1 is the exact expected answer, so the maximum achievable Precision@5 is `1/5 = 0.2`. Precision will naturally improve as more trips are added.

**The meaningful metrics with a small database are:**

- **Hit Rate 0.875** — the correct trip appears in the top 5 almost every time
- **MRR 0.813** — when found, it appears near rank 1
- **NDCG 0.829** — the ranking order is correct and the best result is at the top
- **Summary-prefix scores 1.000** — confirms the vector index and embeddings are working correctly

**What the gap between strategies tells you:**

The `summary_prefix` strategy scores perfectly (1.0) while `driver+violation` scores around 0.75. This gap is the cost of natural language variation — real user questions are harder than feeding the exact embedded text back. A gap under 0.30 is acceptable. This system's gap is 0.25, which is good.

---

## 6. When the Eval Runs

### Automatically on server startup
Every time the RAG server starts (`npm run dev`), the eval runs in a background thread and updates `eval_results.json`. No manual action needed.

### Manually from the terminal
```bash
cd Dashboard/backend/RAGagent
python run_eval.py --n 6
```
Replace `6` with the number of trips in your database. The results are printed to the terminal and saved to `eval_results.json`.

---

## 7. File Reference

| File | Role |
|------|------|
| `run_eval.py` | Samples trips from MongoDB, generates queries, runs retrieval, computes metrics, saves JSON |
| `retrieval_metrics.py` | Pure functions: Precision@k, Recall@k, MRR, NDCG@k, Hit Rate |
| `reranker.py` | Cosine re-ranker using the shared `all-MiniLM-L6-v2` model singleton |
| `eval_results.json` | Output file — updated on every server start or manual run |
| `server.py` | Calls `save_results()` in a background thread during lifespan startup |

---

## 8. Limitations & Next Steps

| Limitation | Impact |
|------------|--------|
| Only 6 trips in database | Precision is artificially low; add more trips for realistic scores |
| Retrieval-only eval | Does not measure answer quality, faithfulness, or context relevance |
| Single expected trip per query | Real queries may have multiple valid trips; eval treats it as binary |

**What would make the eval more complete:**
- **Context relevance** — LLM judge scores whether retrieved text is relevant to the question
- **Answer faithfulness** — LLM judge checks if the final answer stays grounded in the context
- **Answer correctness** — LLM judge verifies the answer is factually right
- **More data** — 50+ trips would give statistically meaningful Precision scores
