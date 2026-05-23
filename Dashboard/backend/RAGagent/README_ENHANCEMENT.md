# RAGagent Production Audit and Recovery

## System Issues Found

1. **MongoDB connection mode bug**
   - `get_mongo_client()` forced `tls=True` for every URI, including `mongodb://localhost`.
   - This caused SSL handshake failures on local/non-TLS MongoDB and blocked retrieval/embedding.

2. **Retrieval could fail hard when Atlas Search is unavailable**
   - `$vectorSearch` exceptions were not gracefully handled.
   - On non-Atlas deployments or missing Search config, semantic retrieval failed outright.

3. **No deterministic handling for critical business questions**
   - Queries like "Which driver has the most trips?" depended on LLM-generated aggregation pipelines.
   - LLM-generated pipelines can be brittle and occasionally omit robust grouping/filtering logic.

4. **Context missed strong identifiers**
   - Context formatting did not include a stable trip identifier and often lacked public driver ID.
   - This reduced grounding quality and made responses weaker/less actionable.

5. **Violation type normalization mismatch**
   - User vocabulary (`drowsiness`, `phone usage`, `no seatbelt`) did not consistently map to DB enums (`drowsy`, `cellphone`, `no_belt`).
   - Relevance filtering could drop valid documents.

6. **Embedding refresh logic was incomplete**
   - Embeddings were generated only for documents without `embedding`.
   - Corrupt/incomplete vectors and empty summaries were not repaired.

7. **Insufficient operational observability**
   - Limited structured logs for embedding dimension, retrieval document counts, context payload, and fallback execution.
   - Failures were harder to diagnose in production.

## Root Causes

- **Schema/infra assumptions leaked into runtime code.** The pipeline assumed Atlas vector search and TLS connectivity in all environments.
- **Over-reliance on LLM-generated query plans for deterministic analytics.** "Top/lowest/list" analytical questions should use reliable server-side pipelines.
- **Weak normalization boundary between NLP layer and DB schema.** Equivalent violation terms were not canonicalized to storage enums.
- **Data quality handling was shallow.** Existing but invalid embeddings were treated as valid.
- **Prompt + context contract had gaps.** Missing identifiers and weak guardrails increased the chance of "no data" style answers even when data existed.

## Fixes Applied

### 1) Connection Reliability
- Updated `config.py`:
  - `mongodb+srv://` -> TLS enabled
  - `mongodb://localhost` / `127.0.0.1` -> TLS disabled
  - Other `mongodb://` hosts -> TLS controlled by `MONGODB_TLS=true|false`

### 2) Retrieval Hardening
- Updated `agents.py` `RetrieverAgent._vector_search()`:
  - Added structured logging for query and embedding dimension.
  - Wrapped `$vectorSearch` execution in `try/except`.
  - Added fallback retrieval (`recent trips`) when vector search fails.

### 3) Deterministic Aggregations for Critical Questions
- Added deterministic pipelines in `RetrieverAgent._deterministic_aggregation()` for:
  - "most trips"
  - "lowest safety score"
  - "list drivers with drowsiness violations"
- These run before LLM-generated aggregation for reliability.

### 4) Better Context Grounding
- Added `tripMongoId` and `driverPublicId` in enrichment/projection.
- Updated analysis formatter to include:
  - Trip ID
  - Driver public ID
  - richer traceable context lines

### 5) Violation Canonicalization
- Added alias normalization table:
  - `drowsiness` -> `drowsy`
  - `phone_usage` -> `cellphone`
  - `no_seatbelt` -> `no_belt`
  - `hands_off_steering` -> `hands_off_wheel`
  - etc.
- Applied normalization in both `QueryAgent` and `AnalysisAgent`.

### 6) Embedding Health Repair
- Updated `embedding_generator.py` to regenerate embeddings for:
  - missing embeddings
  - empty embeddings
  - wrong dimensionality (`embedding.383` missing)
  - missing/empty `trip_summary`
- Added embedding batch logging for easier tracing.

### 7) Response Guardrail and Diagnostics
- Added prompt guardrail:
  - If context has records, model must not claim there is no data.
- Added logs for context size and document count before generation.
- Aggregation `doc_count` now reflects row count (instead of always `0`).

### 8) Validation Query Set Updated
- `main.py` benchmark now includes:
  - "Which driver has the most trips?"
  - "Who has the lowest safety score?"
  - "List drivers with drowsiness violations"

## Before vs After Behavior

## Before
- Common analytical queries could return weak/no-data responses due to:
  - brittle LLM-generated aggregations
  - failed vector search without fallback
  - connection failures in local DB mode
  - poor context identifiers

## After
- The same class of questions is answered via deterministic pipelines or resilient retrieval fallback.
- Context is richer and traceable (trip + driver IDs).
- Failure modes are logged and observable.

### Verified run outputs (current environment)

1. **Query:** `Which driver has the most trips?`
   - **Source:** `aggregation` (deterministic)
   - **Result:** `Ahmed Nada has the most trips.`

2. **Query:** `Who has the lowest safety score?`
   - **Source:** `aggregation` (deterministic)
   - **Result:** `Ahmed Nada has the lowest safety score...`

3. **Query:** `List drivers with drowsiness violations`
   - **Source:** vector-search path with fallback when `$vectorSearch` unavailable
   - **Result:** Drivers with drowsy violations were correctly listed from DB-backed context.

## Debugging Guide

1. **Check connectivity**
   - Verify `MONGODB_URI`, `MONGODB_DATABASE`, `MONGODB_COLLECTION`.
   - For non-SRV remote hosts, set `MONGODB_TLS=true` if cluster requires TLS.

2. **Check embedding health**
   - Run `python main.py --embed`.
   - Ensure docs have 384-dim vectors and non-empty `trip_summary`.

3. **Check vector search availability**
   - If Mongo returns `SearchNotEnabled`, use Atlas Search or rely on fallback retrieval path.
   - If Atlas is used, confirm index name matches `VECTOR_INDEX_NAME`.

4. **Inspect logs**
   - QueryAgent: extracted intent/entities
   - RetrieverAgent: source path, embedding dim, docs returned, fallback activation
   - AnalysisAgent: context size and doc count
   - ResponseAgent: context length and token usage

5. **Validate critical questions**
   - Run `python main.py --test` and inspect the three added benchmark queries first.

## Best Practices Added

- **Hybrid resilience:** semantic vector retrieval + operational fallback path.
- **Deterministic analytics:** key ranking/count business questions now use explicit Mongo pipelines.
- **Schema-aware normalization:** user language mapped to DB enums before filtering.
- **Grounded context contract:** include stable IDs and richer evidence lines.
- **Prompt guardrails:** discourage false "no data" conclusions when records exist.
- **Observability-first:** added logs at each pipeline stage to speed incident triage.

## Optional Next Improvements

1. Add true **hybrid ranking** (`vector score` + recency + violation severity weighting).
2. Persist deterministic query templates in a dedicated rule engine.
3. Add integration tests that assert:
   - retrieval source
   - non-empty context
   - answer contains at least one concrete identifier.
4. Add periodic embedding integrity job for drift/corruption detection.
