# Iteration 1: final source and evidence checkpoint

The bounded typed-value feature is accepted at source commit `e42a8adc0f6f6f3c0b4eca903016a61bab4c3f67`. This is **not** production readiness or completion of the ten-item roadmap. The draft PR remains open. Item 2 requires a fresh deep research gate before implementation.

The actual unstable DuckDB C API v2 artifact targets exact DuckDB v2.0.0. The typed SQL API name `td_query_v2` is a separate version axis. Strict string/bool/int64/finite-float identities survive literals, interning, joins, sorting, persistence and returned rows. Existing history migrates only to strings, preserving assertion IDs, receipts, clocks and timestamps.

## Evidence and limits

- Real checks pass: 57 native typed cases, 29 independent SQL/native cases, 22 legacy native cases, 23 legacy storage cases, 26 migration acceptance cases, 96 browser groups and 122 unchanged browser-contract checks. Counts overlap, not a certification score.
- Normal and ASan/UBSan core campaigns include 12,024 exact legacy row/counter/error comparisons. The instrumented actual-v2 binding also passes all 57 native cases. Leak detection is explicitly disabled; prebuilt DuckDB/Python are not completely instrumented.
- Both production and same-frozen-core API-only artifacts reproduce bit-for-bit on this host/compiler under unchanged pre/post source hashes. Correct old-host rejection was verified. This is not cross-machine reproducibility certification.
- The original process-isolated benchmark and its observed losses remain preserved. The tighter 756-pair/1,512-sample, CPU-pinned serial A/B study does not reproduce a large causal ABI regression (roughly 0.97–1.03× paired medians). Typed Python result conversion remains separately material. A compact UNION projection was correct but slower and was **not adopted**.
- Initial harness/runtime failures are retained beside corrected results. No error suppression, type coercion, production path-policy relaxation, user-computer/Codex action, new deployment, merge or GitHub deletion was used.

## Recover all data without storing build outputs

Run `python3 restore_archive.py` to verify the eight Base64 parts and write `iteration01-curated-evidence.tar.gz`; it does not extract or execute anything. Expected SHA-256: `4e279aaa6bdea3c1ab00df0073064bd558d48eb57cdf6f45bc735e388777f16b`.

The archive has 279 outer files, including complete source/provenance/results archives for the initial balanced study, paired follow-up and rejected compact-host experiment. All original archive hashes remain in `BUILD-OUTPUT-CURATION.json`; their original files remain unchanged in cloud scratch. Three reproducible compiled extensions were removed from the derived initial archive. Source, measurements, negative results and licenses retain their exact bytes. `MANIFEST.json` and each inner `DERIVED-MANIFEST.json` describe curated payloads; older checksum lists are historical provenance, not assertions that excluded build outputs are present.

The exact final v1 baseline is separately recoverable at `fcc3e71f0aa49069dd35384bf17f008421696e4d`. Current code and portable `verify_typed.sh` are on PR #7. Complete resource/cancellation accounting, crash recovery certification, planning/negation/aggregates/incrementality/history and Triplex conformance remain later ordered goals. Original/frozen source and the deployed v1 Site remain unchanged.
