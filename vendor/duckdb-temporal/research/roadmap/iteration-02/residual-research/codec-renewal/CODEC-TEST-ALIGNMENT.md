# C1-P test-instrumentation alignment

**31 October 2026 UTC; before any source writer.** This supplements the frozen selected decision `55bb41d35b005760ace90ea0c504302d4aeacddc075b8e887c152abf03ad1686`; neither that decision nor its research/raw archive is rewritten.

The independent acceptance-preparation lane found one retained test that instruments the internal helper deliberately replaced by C1-P: `storage/tests/test_batch_codec.py::test_shared_validation_late_fault_counts_and_no_alias`. Current source wraps `_carrier_payload` and expects `(reads, domain, shape) == (2, 256, 256)` for 256 cells.

Permit only the necessary assertion realignment in this existing method: wrap the new private after-key helper and still require exactly **256** shape calls; separately wrap the unchanged public `_carrier_payload` and require **zero** private-path calls. Keep exactly two full FP reads, 256 `_canonical_payload` calls, the no-temporary-Value assertion, input and output non-alias assertions, late malformed-cell failure after 256 domain calls, unpublished sentinel, and empty/string/int two-read checks. Preserve every other existing test/assertion unless a concrete finding is separately reviewed and recorded.

This strengthens observation of the selected call-graph change rather than suppressing a failing test. It does not authorize relaxing validation, removing the test, accepting unavailable skips, changing FP policy/caps/roots, or starting app tests before the complete candidate freeze. The eventual writer owns only this minimal existing-test adjustment in addition to the selected typed-store edit and new focused tests. The coordinator still requires verified durable decision publication and an explicit ownership handoff first.
