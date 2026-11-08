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
