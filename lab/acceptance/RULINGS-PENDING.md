# Rulings recorded but not yet compiled (Q38c: RULINGS.md holds only compiled or explicitly listed entries)

These move into RULINGS.md when the contract version that compiles them is built.

## Q51b: EXP-P2X feed lag on XTDB (not compiled in 0.3.8: an experiment direction with no contract effect)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q51b feed lag on XTDB | The next XTDB P2/P3 experiment puts XTDB behind the same host log and broker as EXP-P2Q (EXP-P2B: XTDB as the replica, current and history layer), since that composition measured feed lag p99 12.8-24.5 ms and an ACK independent of the engine. The subject-stamp path stays the XTDB-native arm (A1) to compare against; a separate consumer database through ATTACH is not pursued unless P2B fails. | both engines stay candidates for every layer; fewer moving parts |

## Q57: EXP-D01b W0 SPEC readings A11-A15 (to fold into W0-1.1.2 with Q53's A01-A10; not compiled: W0-1.1.2 has to land first)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q57a A11 non-JSON number tokens | `NaN`, `Infinity` and `-Infinity` are W0.E_SHAPE, extending A01. | SPEC 4.4.1 |
| Q57b A12 long integer tokens | An integer token over 4,300 digits is still an integer token: E_VALUE for a value, E_BASIS for a tx. Implementations must not fail on their language's integer-parsing limits. | SPEC 2, 4.4 |
| Q57c A13 nesting depth | Any nesting depth is a valid JSON value, then E_VALUE; implementations must not fail on recursion limits. | SPEC 4.4.1 |
| Q57d A14 string order | Strings order by Unicode code point, which equals UTF-8 byte order. This covers object keys and the sorts of items, subjects, effects and projection, plus the basis guard's validTime comparison. Escapes follow A07. | SPEC 9 item 2 |
| Q57e A15 inconsistent receiver snapshots | Entries are kept as given and re-sorted stably by seq. Only seq = done + 1 releases; entries at or below done, and the second of two duplicates, stay waiting. | SPEC 8.9 |

## Q63: EXP-X05 follower result and the P1 direction
| Q | Ruling | Basis |
| --- | --- | --- |
| Q63a shared-volume follower | Rejected for promotion: XTDB 2.2.0's ReadOnlyLocalLog reads half-written records and dies permanently (9 deaths in 30 minutes), though it never answered wrongly. The second-writer guard and follower harness stay. | EXP-X05 |
| Q63b P1 direction | Read scaling on both lanes comes from replicas fed by the broker (Q58b): each XTDB or QLever replica has its own applier and marker, so readers never touch the writer's log or indexer and the shared-log follower is unnecessary. EXP-P2B measures the first XTDB replica; a second-replica arm follows. Kafka (E8, about 7 GiB) is deferred. | P1; R23; Q58b |
| Q63c upstream report | The ReadOnlyLocalLog torn-read repro joins the R21 upstream-filing question for Sam; nothing is filed without him. | publishes lab findings |
| Q63d literal SQL | Seeders and appliers on XTDB use parameterised statements only; 1,000-row literal INSERTs exhausted a 2 GiB heap (X05), as per-cell expressions did in P2X. | X05, P2X |

## Q64: EXP-A01 contract 0.3.9 questions
| Q | Ruling | Basis |
| --- | --- | --- |
| Q64a build spec | EXP-E01 proposes the real BUILD_SPEC values (install with `pnpm install --offline --frozen-lockfile --store-dir <repo>/.pnpm-store`, the per-package build, the gate's system-under-test argv) as `lab/config/build.json`; a contract version pins them. Until then every qualify run fails closed with BUILD-SPEC, as intended. | Q61f |
| Q64b frozen trace | EXP-M01 freezes the screening series (Q60g) and the acceptance trace generator, each with its own `writerTrace.generator.frozen` entry; until then claims stay DIAGNOSTIC. | Q61h, Q60g |
| Q64c COMPILED oracles | Confirmed: oracles whose answers are compiled into the contract itself (O-ERR, O-CONTRACT) count as pinned by the contract version; answer-producing oracles that run separately (O-REPLAY, O-DOMAIN, O-TDK1) need pins and registry entries. | Q59e |
| Q64d Q63 | Compile Q63b (P1 through broker-fed replicas) into COMPOSITION.experimentDirections and Q63d (parameterised SQL for seeders and appliers) as a rule in 0.3.10. | Q63 |
| Q64e slots.json | Keep it read but not hashed; an image change still fails generation until the pin moves in a contract version. | Q61i |
| Q64f pending sub-ids | The orchestrator moves sub-id rows together with their compiled section; 0.3.10 adds a check that a pending sub-id never also appears as a RULINGS.md row, while still allowing a pending sub-id (Q51b) under a compiled base. | Q47d |

## Q65: EXP-E01 on contract 0.3.9
| Q | Ruling | Basis |
| --- | --- | --- |
| Q65a O-CONTRACT runner | O-CONTRACT gets an `oracleRunners` entry run from the authority's files (Q59e): a reference-model entry point in build_contract.py that answers one composition-identity case as canonical JSON. Without it G10.composition.identity-bound, a prerequisite of every claim, can never run. | Q61c |
| Q65b buildSpecSha256 | sha256 of the canonical JSON of {format, argv, outputs, run}. | Q61f |
| Q65c case-result/2 selection | A case reached by several select entries records the first select entry in contract order. | Q61e |
| Q65d build-manifest/2 packages | "Each built package" is the parent directory of each `dist/` output. | Q61f |
| Q65e build spec | E01's proposal (lab/config/build.json on exp/E01-claim-evaluator: `pnpm install --offline --frozen-lockfile --store-dir <repo>/.pnpm-store` then the five package builds in dependency order; outputs the five dist/ directories; run `node packages/qualification/workloads/obl-case.ts --case {case} --mode {mode}`) is pinned in 0.3.10 once `obl-case.ts` exists. | Q64a |
| Q65f executing OBL gate | The missing piece for any QUALIFIED claim is an executing `gate.mjs OBL` with `obl-case.ts`, a fault injector that writes fault-witness/1 records, and the PAIR-0 paired-rounds runner from EXP-M01. One experiment (EXP-G03) builds it after EXP-M01 lands. | Q55a |

## Q66: EXP-O04b O-REPLAY 0.4.2 limits
| Q | Ruling | Basis |
| --- | --- | --- |
| Q66a several erasures in flight | Erasure commits become visible in position order, so a read that started before n in-flight erasure commits in its scope sees a prefix of them: the acceptable answers are the n + 1 prefixes (none, the first, the first two, ...), not all 2^n subsets. | Q52e; Q31 positions and the resolved prefix |
| Q66b cursor over an in-flight read | A continuation cursor carries the erasure prefix its page was computed with, and every later page answers with that same prefix; the oracle answers `cursorFrom` on an in-flight entry per prefix instead of refusing. | Q52e; G10.cursor.stable |
| Q66c scope | Only erasures in the read's own scope are in flight; erasures in other scopes always apply. Confirmed. | scopes are independent sources |
| Q66d explicit text conversion | The explicitly converted half of DR-JSON-STRING-TEXT is a lane obligation; the oracle does not model text-to-decimal conversion. Confirmed. | Q49e |

## Q67: Codex round 8 on contract 0.3.9 and claim.mjs
| Q | Ruling | Basis |
| --- | --- | --- |
| Q67a blockers stay | Every blocker stays until EXP-G03's executing gate exists; manifests, runners, build spec, frozen trace and A0 controls are pinned only through contract versions. | round 8 finding 1 |
| Q67b execution identity | An execution's identity is its source tree, build spec, lockfile, toolchain versions, runner and config hashes per instance; executions are keyed by instance, never by output hash. | finding 2 |
| Q67c reset during a query | Single-request read surfaces read the replica marker in the same request as the answer. Multi-request surfaces (Datalog, executor) use replica incarnation fencing: every replay begins by writing a new incarnation id, and an answer is accepted only if (incarnation, marker) is equal before and after. The reset-during-query interleaving is an independently authored case. | finding 4 |
| Q67d P3 timing | Both arms enumerate the final published source prefix from the source's own record and timestamp actual publication (broker: watermark publication; engine as source: commit resolution); ACK records are reconciled afterwards; a late or lost ACK is never a feed defect. | finding 5; Q55d |
| Q67e isolation | Builds and both arms run isolated from evaluator, oracle, evidence and control storage; oracle bytes run from an evaluator-owned read-only copy re-hashed before every invocation; offline verdicts stay DIAGNOSTIC. | finding 6 |
| Q67f PAIR-0 admission | Admission recomputes every paired decision, noise grade, offered-command accounting and bar from retained per-round histograms, signals and events; the number of rounds must equal a registered look (8, 12, 18 or 24); the RED-window and committed-only counterexamples execute against admission. | finding 7; Q60 |
| Q67g placement | Shared workload identity is separate from each arm's placement; a duet needs equal capacity, equal regime and disjoint cpusets; slots are per arm; under cpusets the per-core denominator is the cpuset size. | finding 8; R22 |
| Q67h error representation | One representation: `_tag` "BasisNotAvailable" or "ReplicaUnavailable" with {required, observed, replica}; `cause` is optional; core gains these error classes and adapters return them. | finding 9; Q58a |
| Q67i comparators | case-result/2 is recomputed with its declared comparator on retained raw objects; byte equality applies only to CMP-EXACT. | finding 10; Q61e |
| Q67j promotion | Claim kind is preserved and promotion prerequisites (GATE-BROKER-HARDENING and others) are enforced mechanically; until supported, promotion qualification is rejected explicitly. | finding 11; Q62b |
