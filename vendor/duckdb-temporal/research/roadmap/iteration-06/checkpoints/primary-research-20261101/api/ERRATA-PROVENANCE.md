# Errata provenance

**Created:** 2026-11-01T07:38:01Z. **Verification basis:** only retained literal public-source text in the frozen research-001 packet. No new network/source request, source parser/import, API invocation or machine observation.

## Original packet binding

- `research-001/REPORT.md`: SHA256 `ed508f8f74bb8b5ad818127b4ce8cbab9b230c246bfb930b1220f0280290b51e`.
- `research-001/MANIFEST.json`: SHA256 `db710b3ffa62282e0c204b305b417676cd082e6bd235590a7c13ebf0a2d19d69`.
- `research-001/SHA256SUMS`: SHA256 `4611370268c87b5b1fa1862f4d3b90339e025687245502ba1e4fc0956c440b5f`.
- No original file is edited, replaced or deleted by this additive packet.

## Already acquired exact-pin sources used

Repository `duckdb/duckdb`, ref `d54cbbe3df17e8e5ce68312f483b4155836112aa`:

| Public source | Retained returned Git blob | Retained response record and SHA256 |
|---|---|---|
| `api_spec/v2/vector/vector.yaml` | `3d9fc5c4d1b1335798fd9a53463f89e80e237e70` | `research-001/PUBLIC-VECTOR-SPEC-RESPONSE.json` — `9f1f7452b03a86ec44522599cbd5ba7a10a3e50711ca9527715a58825a966a56` |
| `api_spec/v2/common/common.yaml` | `f883f81361154d6591904e451211df204d2dc3b1` | `research-001/PUBLIC-COMMON-RESPONSE.json` — `1f65cf00f4d8c0f37d6342ede76989f90b2d28eb793719026a6cee51da7fa7c5` |
| `src/main/client_context.cpp` | `1631051fd816da2badc69b1f7a6028607c56d4c3` | `research-001/PUBLIC-CLIENT-CONTEXT-IMPL-RESPONSE.json` — `124979d81e8e9014bfbcafffeeb8cd64d4d36cbb57e98d05bc1b762aa1cd7079` |

The initial attempt to access an earlier in-memory text cache found it unavailable and stopped before any source read. It created only the new before-progress log. Verification then used one literal text-filter/read call over the three exact retained response records and the cited frozen report lines. That same call completed normally; it did not re-fetch, execute or import source. The captured arena and interrupt-check text matches the corrected anchors/wording. Content-only hashes bind the named retained bytes; they are not runtime verification, a computer snapshot or durable-backup proof.

## Independent-review request

The requested review is limited to E1 citation separation and E2 persistent eligible-check-counter wording against these already acquired sources. No empirical/action permission or overall research/implementation acceptance is requested or implied.

