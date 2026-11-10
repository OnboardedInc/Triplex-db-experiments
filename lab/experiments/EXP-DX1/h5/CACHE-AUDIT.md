# Bounded-client-cache variant audit

Original 1/4/8-worker attempts each failed in the 64-reader no-sweep baseline, before activation metrics: the driver cgroup hit its fixed 8 GiB cap and recorded OOM kills. Their raw observations and RUNNING receipts remain unqualified; no latency ratio or sweep rate is assigned.

The explicit 10,000-entity-per-client variant uses the same session UUID reset plus local cache clear already implemented by DatomicClient at 500,000 entries. It leaves the original response decoder, genuine row positions, immutable revisions, missing-reference full-response retry and every W0 gate unchanged. An in-flight request may exceed the threshold and may need the original full-response repair; rows are never sampled or discarded from the returned result. All threads load the policy. CPU/memory assignments and 64-reader count remain unchanged.

The variant requires a fresh 200-subject gate (`tx2-dxh5-equivalence2`) at both cuts and one actual Agent request per page, source rechecks including the policy, then fresh G0 on each restored clone and all activation gates. Old uncapped gate results do not admit capped measurements. The policy is an experiment workaround for the observed OOM, not a package change or P5 acceptance. Byte-based/shared/row-only caching remains unimplemented.
