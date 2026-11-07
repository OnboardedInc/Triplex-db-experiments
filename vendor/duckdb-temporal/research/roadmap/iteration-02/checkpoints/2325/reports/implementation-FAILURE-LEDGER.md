# Retained trial negatives

## Candidate01 — INVALID, not accepted

First immutable typed source180d814a…/manifestf435849b… remains unchanged. A supported-state no-DB smoke and independently covered subsets passed, but they missed two genuine reviewer counterexamples:

1. Query getter reentrantly closes the store through RLock; FP-only post-preparation check then attempts BEGIN on a closed connection. Preserved `checkpoint-01-reentry.json` reproduces query/query_json/evaluated-transact failures. Fixed by full `_ready()` after all callback-capable preparation, not a host repair or wider all-callback claim.
2. Nonzero public Value f64 payload was unnecessarily assigned twice, invoking a subtype descriptor setter twice. Preserved `checkpoint-01-public-subtype.json` compares hardened baseline success with candidate failure. Fixed by rewriting payload only when canonical integer bits are zero, as baseline does; cached identity remains shared/bit-based.

Fresh primary checks before correction: official CPython RLock docs explain same-thread recursive admission, dataclass frozen initialization uses object.__setattr__, and CPython generic object assignment still respects data descriptors. [Threading](https://docs.python.org/3.12/library/threading.html#rlock-objects), [dataclasses](https://docs.python.org/3.12/library/dataclasses.html#frozen-instances), [CPython3.12.14 object assignment](https://raw.githubusercontent.com/python/cpython/v3.12.14/Objects/object.c). Source02 regression tests and the separate review/acceptance lanes close both defects. Neither initial subset PASS nor smoke is reported as candidate01 acceptance.

## Migration harness output setup — FAIL/incomplete

`migration26-initial-output-confinement.log` preserves a harness-owned-output error: the requested JSON report path was outside its explicit fixture root. No26-case result was claimed from that attempt. The unchanged harness was rerun with --output inside the copied adapter's actual storage/explicit fixture root. The terminal completed JSON was then copied as text to the evidence path; it reports26PASS/0FAIL/0UNRUN. No sql_fixtures.owned, ROOT, caps, source or assertions were relaxed.
