# Retained DX-H6 failures

North star: P5; failures never grant acceptance.

1. `tx2-dxh6-record1`: setup failed before capture when the separate raw-reader client requested zero-byte caches. Package cache budgets require at least one byte. Changed to the supported one-byte minimum; no cache insertions occur on the raw path. Source, stack/log/exit and empty cleanup inventories retained. Retry `record2` succeeded from a fresh clone.
2. `tx2-dxh6-sweep1000a`: fresh G0 passed with the exact sealed 1k fingerprint. During activation, actual publication ACKs returned, then persisting the publication object failed with `TypeError: W0 has no non-integer number: 28.843`: telemetry durations were included in the W0 integer-only encoder. The attempt is FAIL, no complete sweep wall/rate/coverage/activation gate is assigned, and publication outcomes beyond the retained partial data are unqualified. All owned containers/networks/volumes were removed before lease release. Retry saves only semantic deliveries/retry in canonical evidence and keeps fractional timing in metrics; a regression test covers both floating telemetry and rejection of business floats. The independent publish fold now derives its evaluation records from O-DOMAIN's expected outputs and compares the full actual record, including inputs, before publishing expectations.

Evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6/`; each attempt has its immutable prefix directory and launcher log. No failed attempt was relabelled or overwritten.
