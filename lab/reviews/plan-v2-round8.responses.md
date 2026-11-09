# Codex round 8 (contract 0.3.9 and claim.mjs e2a082e): responses (orchestrator, 2026-11-08 00:54Z)

Verdict NOT READY. Round-7 items: 5 CLOSED; 1, 2, 6, 7 PARTIAL. New: 6 (critical), 7 (critical), 8, 9, 10, 11. Open findings by round: 14, 13, 7, 6,
5, 4, 5, now 10: the count rose because the claim evaluator, PAIR-0 and the broker fix round entered the evidence. All accepted as Q67 (rows in
lab/acceptance/RULINGS-PENDING.md).

| Finding | Ruling | Owner |
| --- | --- | --- |
| 1 (R7-1) executing qualification incomplete | Q67a keep every blocker; EXP-G03 builds the executing gate (Q65f); manifests, runners, build, trace and A0 pinned only through contract versions | EXP-G03, A01 |
| 2 (R7-2) binary identity omits runtime | Q67b execution identity = source tree, build spec, lockfile, toolchain versions, runner and config hashes per instance; executions keyed by instance, never by output hash (fixes the byBinary aliasing) | EXP-E01 |
| 3 (R7-5) | closed | none |
| 4 (R7-6) reset during a query | Q67c single-request surfaces read the marker in the same request as the answer; multi-request surfaces (Datalog, executor) use replica incarnation fencing: every replay begins by writing a new incarnation id, and an answer is accepted only if (incarnation, marker) is equal before and after; the reset interleaving joins the independently authored cases | P2Q author after V-P2Q's verdict |
| 5 (R7-7) P3 timing | Q67d both arms enumerate the final published source prefix from the source's own record and timestamp actual publication (broker: watermark publication; engine source: commit resolution); ACK records are reconciled afterwards; a late or lost ACK is never a feed defect | P2Q author; EXP-M01 for the general driver |
| 6 candidate builds can modify the judge | Q67e builds and both arms run isolated from evaluator, oracle, evidence and control storage (containers in the executing gate); oracle bytes run from an evaluator-owned read-only copy re-hashed before every invocation; offline verdicts stay DIAGNOSTIC | EXP-G03, EXP-E01 |
| 7 PAIR-0 admission accepts failing evidence | Q67f admission recomputes every paired decision, noise grade, offered-command accounting and bar from retained per-round histograms, signals and events; rounds must equal a registered look (8, 12, 18, 24); the RED-window and committed-only counterexamples execute against admission | A01 (reference), EXP-E01, EXP-M01 (artifact format) |
| 8 placement | Q67g shared workload identity is separate from each arm's placement; a duet needs equal capacity, equal regime and disjoint cpusets; per-arm slots; under cpusets the per-core denominator is the cpuset size | A01, EXP-M01 |
| 9 error representation | Q67h one representation: `_tag` "BasisNotAvailable" or "ReplicaUnavailable" with {required, observed, replica}; `cause` optional; core gains the error classes and adapters return them | A01, P2Q author (core error types) |
| 10 comparator overridden by hash | Q67i case-result/2 is recomputed with its declared comparator on retained raw objects; byte equality only for CMP-EXACT | EXP-E01 |
| 11 promotion gates not enforced | Q67j claim kind is preserved and promotion prerequisites (GATE-BROKER-HARDENING and others) are enforced mechanically; until supported, promotion qualification is rejected explicitly | A01, EXP-E01 |
