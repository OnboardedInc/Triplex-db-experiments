# Additive errata — goal6 exact-pin cancellation research

**Date:** 2026-11-01 UTC. **Scope:** citation/wording calibration only. This new note supplements, and does not modify, any of the 49 frozen `research-001/` files. Original `REPORT.md` SHA256: `ed508f8f74bb8b5ad818127b4ce8cbab9b230c246bfb930b1220f0280290b51e`.

Exact public DuckDB pin throughout: `d54cbbe3df17e8e5ce68312f483b4155836112aa`. Only the already-retained public source text was re-read. No API invocation, new source acquisition or empirical behavior is asserted.

## E1 — separate vector-reference and arena citations

In REPORT §6, line95, the label **“reference and arena contract”** points to `vector.yaml#L512-L527`. That range supports **vector_reference**, not the arena claim.

Use these separate references instead:

- [Vector-reference alias/lifetime contract, vector.yaml lines512–527](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/vector/vector.yaml#L512-L527).
- [Vector arena first-use allocation and lifetime, vector.yaml lines698–708](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/vector/vector.yaml#L698-L708).
- [Borrowed arena and byte lifetime, common.yaml lines130–135](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/common/common.yaml#L130-L135).

The retained arena text says that `vector_get_arena` allocates the arena on first use, returns a borrowed arena that the caller must not destroy, and bounds its validity by vector flattening, reallocation or destruction. The common type description gives allocated bytes the arena's lifetime. This corrects citation precision; it does not change the report's accounting/ownership conclusion or establish a runtime allocation observation.

## E2 — exact scope and persistence of deadline throttling

Read the first paragraph of REPORT §3.2, and corresponding compact summaries, with this more precise wording:

> In `ClientContext::InterruptCheck`, the calling thread's function-local `thread_local uint32_t` counter persists across invocations; it is not newly reset for each query. After the earlier interrupt-state check, the counter increments only when the query deadline is valid and short-circuit evaluation reaches that increment. This path calls `BlockingInterruptCheck` when the incremented counter is divisible by256. Its phase is therefore not a newly started per-query 256-call work or time quantum. Other directly invoked blocking/deadline checks remain distinct paths.

The interrupt-state test occurs before that conditional increment. The numeral256 describes the modulo throttle in this function, not elapsed time, byte/instruction work, callback preemption or a fresh query-level budget. No per-query cancellation/deadline-latency guarantee follows. [Exact retained implementation, client_context.cpp lines1100–1110](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/client_context.cpp#L1100-L1110), [direct blocking check, lines1114–1120](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/client_context.cpp#L1114-L1120).

## Status and limits

These two corrections do not resolve the remaining upstream-admission, callback-local polling, error-helper safety, atomicity or health proof boundaries. They add no source implementation, API/host route, execution plan, capacity/security gate, runtime result or future-stability claim. All empirical checks remain **UNRUN**. Independent erratum-delta review and cross-lane synthesis are still pending; no overall heavy-round closure or implementation/action/publication authority is inferred. All prior stops, paused reads and frozen originals remain unchanged.

