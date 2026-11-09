# RT01 fix round 2 evidence

North star: P1 exact named cuts and P2 exact decided receipts. QA source: verify/RT01, 420f647. Reproductions are copied from that review; `.original.txt` preserves the original bytes. Executable copies change only package-relative import paths and output destinations. No oracle or acceptance source is copied into the experiment or edited.

Full audit and results are appended to ../REPORT.md. First local typecheck found three remaining KV calls to the removed duplicate journal fast path (TS2554); all KV callers were then moved to the same encoder. Raw new gate output will be kept here while below rule 9c limits. Larger output belongs at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/` with a local SHA256SUMS/index.

## PASS audit before product commit

- `toReadError`: preserves the exact BasisNotAvailable or existing ReadError object; all transport/public read wrappers use it. Other errors retain the original cause. Tests require top-level tag/axis/cut, not nested cause identity.
- The single `encodeJournalChange`: drops own recordedAt for all asserts and same-physical-commit retracts, and all retractedAt fields; preserves older assertion instants. Its required physical-instant argument comes from the current transaction, including nested ordinals. Decoder restores omitted own instants from the persisted journal position fact. Raw and hydrated bytes are both checked, including ordinary old retracts and legacy v1.
- `queryRows` on both adapters: resolves basis before checking empty entity IDs; successful empty reads remain optimized after availability. Tests require actual scope-cut queries, correct refusal metadata, the 2 s nearby deadline and immediate far-future refusal; answer queries/writes fail the transport.
- Copied reviewer reproductions and round2 runner: fresh actual adapter/core requests; original and adapted runner hashes, input/output hashes, exact source before/after, unique run ID and offline context. Execution completion alone is not acceptance; assertions compare output contents and reject every nonmatching route or raw journal.
- Scope-scan measurement: actual emitted A0/compact guard selects baseline position-only versus position-plus-stamp scans over explicitly sized synthetic history; both maxima must match known expected values before a sample is retained. It records operation counts and durations, never a performance PASS or a prediction of engine planning.
- Source-bound package gates: same run-gates.mjs content/freshness/binding audit as round A. No old receipt is reused as fresh round2 source evidence. Independent/live gates remain pending.
