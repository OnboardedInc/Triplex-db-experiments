# Rulings recorded but not yet compiled (Q38c: RULINGS.md holds only compiled or explicitly listed entries)

These move into RULINGS.md when the contract version that compiles them is built.

## Q51b: EXP-P2X feed lag on XTDB (not compiled in 0.3.8: an experiment direction with no contract effect)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q51b feed lag on XTDB | The next XTDB P2/P3 experiment puts XTDB behind the same host log and broker as EXP-P2Q (EXP-P2B: XTDB as the replica, current and history layer), since that composition measured feed lag p99 12.8-24.5 ms and an ACK independent of the engine. The subject-stamp path stays the XTDB-native arm (A1) to compare against; a separate consumer database through ATTACH is not pursued unless P2B fails. | both engines stay candidates for every layer; fewer moving parts |

## Q70: V-O04e cursor continuations of in-flight reads (O-REPLAY 0.4.4)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q70a continuation view | Every `cursorFrom` continuation is answered from the source read's start, scope and prefixes, whether or not the source had commits in flight; a continuation's own readStart is never consulted. | V-O04e F7 |
| Q70b literal token | A literal cursor token equal to a `nextCursor` that a read with commits in flight issued earlier in the same case continues that read per prefix; token bytes and the cursor vectors stay unchanged. Any other literal token keeps today's rule (the query's own read view). | V-O04e F8, fix (b) |

## Q70 additions: what O-REPLAY 0.4.4 left undecided
| Q | Ruling | Basis |
| --- | --- | --- |
| Q70c any issuing read | Q70b extends to every read: a literal cursor token equal to a `nextCursor` issued earlier in the same case by any read, in flight or not, continues that read (its start, scope and prefixes). Only a token no earlier read issued uses the query's own read view. This closes the F7 hole reached through a literal token. | O-REPLAY 0.4.4 author, item 1 |
| Q70d equal tokens | When several earlier reads issued the same token, the continuation follows the latest of them in case order. | 0.4.4 author, item 2 |
| Q70e prefixes without the token | Prefixes whose pages did not issue the token are left out, the same as a prefix with no next cursor under `cursorFrom`. | 0.4.4 author, item 3 |

## Q72: V-P2Q round 2 on f711193 (broker fix round 2)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q72a lock helper | The flock helper runs detached in its own process group, ignores INT, TERM and HUP, and exits only on stdin EOF; when it exits for any reason the log fail-stops (every later append throws), and each append checks the helper is alive. A test kills the helper and Ctrl-Cs the holder's group and shows no second writer. | V-P2Q N1 |
| Q72b answer snapshot | Q67c applies to every broker read surface: a surface that answers in one request reads the marker in that request (a UNION with the marker triple, as pulls do); a surface that needs several requests (Datalog executor, dependencyState, native with awaitBasisMs) compares (incarnation, marker) before and after, and every fence and replay writes a new incarnation first. V-P2Q's live residual test (zero-downtime rewind between the probes) is a regression case. | V-P2Q N2; Q67c |
| Q72c reasons | Rename reasons to the contract's strings now (`basis-not-reached`, `replica-unreachable`). Core tagged errors (Q67h) are required before the broker becomes a default, not for the default-off merge; until then no claim may close an obligation pinned to E-BASIS-NOT-AVAILABLE or E-REPLICA-UNAVAILABLE. | V-P2Q question 5; Q67h |
| Q72d A0 guard | The A0 change with the option off is a correctness fix (main answers a basis above the published position) and stays. The frozen A0 control (Q46b) is re-frozen at the P2Q merge, and every matched comparison names the change. | V-P2Q N3; Q62a |
| Q72e outage replay | The synchronous whole-log replay per outage pull is a blocker for default, not for default-off; it is replaced by the Q58c store (recent_rows or a current index, on R25's design). Probes are coalesced into one in-flight probe per replica in this round. Tests import src through tsx, never dist. | V-P2Q N4, N5, N8 |
| Q72g native in broker mode | Every broker-mode wiring passes `awaitBasisMs: 2000` (the Q58a default) until the core native facade exists; receipts are measured at the claimed head. | V-P2Q N7, m3 |

## Q73: EXP-D01b-112 readings for W0-1.1.3
| Q | Ruling | Basis |
| --- | --- | --- |
| Q73a deep writes | A publish or receive payload of any nesting depth is copied and written exactly (A13 applies to the writer as well as the reader). W0-1.1.3 adds a synthetic publish case with a payload of 20,000 nested arrays, delivered and stored unchanged. | EXP-D01b-112 SPEC-AMBIGUITY 1 |
| Q73b waiting at done + 1 | An inconsistent receiver snapshot with a waiting entry at done + 1 is kept as given (A15); an arriving seq equal to that entry is a duplicate, so the entry is never released. W0-1.1.3 adds a synthetic receive case: state {done 2, waiting [seq 3]}, deliveries [seq 3, seq 5]; projection applies 3 and 5, effects apply nothing, waiting [3, 5]. | EXP-D01b-112 SPEC-AMBIGUITY 2; A15 |

## Q70 additions: V-O04f gaps (O-REPLAY 0.4.6)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q70f ambiguous literal token | When the earlier reads that issued a literal token disagree in start, scope or per-prefix answers, the continuation fails closed with a typed X-NOT-MODELED "ambiguous literal token" (a fourth listed refusal site). Issuers with identical views continue as Q70d says. | V-O04f F9 |
| Q70g journal pagination | Q70c extends to the journal: a `transactions` call whose `after` equals a `next` that an earlier transactions page issued in the same case continues that read (its start and prefixes), one answer per prefix; an `after` no earlier page issued uses the call's own read view. | V-O04f F10 |

## Q74: R26 seed once, clone faithfully
| Q | Ruling | Basis |
| --- | --- | --- |
| Q74a who may clone | Screening and development receipts may be seeded by clone of a golden; the receipt records `seededBy: clone` with the golden key (adapter commit, world and seed-generator hash, driver seed options, image digest, engine config hash) and the golden's freeze fingerprint. Acceptance runs seed fresh (TARGETS 6). | R26 open question 2 |
| Q74b freeze state | The canonical freeze state is settled: `POST /system/finish-block`, compactor jobs 0, live index empty. A fresh-seeded arm compared with a cloned arm settles the same way before its window. Older unsettled A0 receipts are not compared with settled ones. | R26 open question 1 |
| Q74c validation first | No clone-seeded receipt counts, even for screening, until validation E1 passes: a fresh-seeded slot against its clone under the PAIR-0 A/A procedure, holding within 1.10 at p50 and 1.15 at p99, with R26 section 6.9's seven predictions checked. | R26 section 6.9 |
| Q74d readiness | A cloned slot is ready only after `/healthz/started` (read with `docker exec`) and the R26 C1-C8 checks pass, then the same warm-up on every arm. | R26 risk 2 |
| Q74e maintenance in every window | Runs that measure P1 force one `finish-block` at a fixed trace time in every window, on every arm, so a settled clone still has a maintenance event. | R26 note |
| Q74f disk | A golden or clone is made only when host free disk after the copy stays at or above 5 GiB; clone volumes are removed after each run. At the 10k rung (3.41 GiB per XTDB volume) that allows one clone at a time today. | R26 risk 4; host 8.7 GiB free |
| Q74g broker compositions | A broker composition clones the engine volume and the broker directory together, from one stopped moment. | R26 open question 3 |

## Q70 additions: O-REPLAY 0.4.6 author's choices and one journal gap (0.4.7)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q70h issuer views | Issuers are compared by view: start, scope, and the prefixes whose pages issued the token. Issuers with identical views and different page bodies (for example different limits reaching the same token) continue rather than refuse, because the continuation depends only on the view. | 0.4.6 author choice 1 |
| Q70i journal fail-closed | Q70f's fail-closed rule applies to a journal `after` issued by disagreeing pages too ("ambiguous journal after"); Q70g matching requires the same journal scope. | 0.4.6 author choices 2, 3 |
| Q70j journal in-flight scope | A `transactions` read decides which erasures are in flight from its own `scope` field, not from `cut.scope` or the default scope. | 0.4.6 author item 4 |
| Q70k read scope everywhere | Q70j applies to every read kind that takes a `scope` field (`transactions`, `transaction`, `transactionByCommand`, `transactionsForEntity`, `journalFacts`, `assertions`, `cutCatalog`, `history` with no cut): in-flight erasures come from the scope the read reads. Other kinds use their cut's scope. | O-REPLAY 0.4.7 author |

## Q75: V-E01 on claim.mjs 2796455 (E01 fix round 2; contract items for 0.3.11)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q75a evaluator integrity | At the start of every run, every evaluator-side file the run executes (claim.mjs, lib.mjs, gate.mjs, the reference and oracle runner files) is compared with its git blob at the evaluator's commit, read with `GIT_NO_REPLACE_OBJECTS=1`; a mismatch refuses the run and marks the checkout poisoned (EVALUATOR-TAMPERED) until restored from git. An edit made and restored inside one run stays on the named unprotected list until EXP-G03 isolates builds. | V-E01 F1 |
| Q75b trusted bytes first | Every oracle copy and every other trusted byte is read, hashed and copied before the first candidate process runs; the evaluator's git runs with `GIT_NO_REPLACE_OBJECTS=1` and checks each blob against its tree entry's object id. | V-E01 F2 |
| Q75c pinned runners | An oracle is pinned only when the contract lists sha256 for every runner file; COMPILED oracles (O-CONTRACT) are pinned that way through the contract's own outputs. A claim that depends on any oracle without such a list is DIAGNOSTIC (Q59e literally). build_contract.py's contractBlockers and claim.mjs's follow the same rule in contract 0.3.11. | V-E01 F2 contract conflict |
| Q75d toolchain | The identity records each resolved binary children run (node, pnpm, python3): path, sha256 and version; children run with PATH pinned to the recorded toolchain directory. | V-E01 F3 |
| Q75e links and modes | The identity walk uses lstat, refuses any symlink that resolves outside the checkout, and hashes file modes; configuration the evaluator does not apply is recorded as unbound, not hashed as if applied. | V-E01 F3, F10 |
| Q75f per-child environment | Every child process gets a fresh HOME and TMPDIR. | V-E01 F4 |
| Q75g comparators in O-REPLAY answers | A row comparator applies to each `queries[i]` entry's `result` (or its `inFlight.acceptable[j].result`) inside an O-REPLAY answer; `commandOutcomes` and `state` compare exactly. Contract 0.3.11 states this; until then those cases stay UNCOMPARABLE (fail closed). | V-E01 F5 |
| Q75h CMP-ERROR cause | Following compiled Q67h, `cause` is optional; when present it must be a structured object with `_tag` or `message`. | V-E01 F6; Q67h |
| Q75i evidence and paths | The run keeps the set of evidence hashes it wrote and requires every one at the end (deletion detected); every return path carries GATE-NOT-RUN from the run's start; end checks run inside the try. admitCore returns DIAGNOSTIC for `kind: "promotion"`, and admit_claim in the reference does the same in 0.3.11. | V-E01 F7, F8, F9 |
| Q75j report honesty | The unprotected list names F1's in-run restore, setsid, TOCTOU, no filesystem or network isolation; "double fork escapes" is corrected (it is killed). Q67i's "CMP-EXACT" reads as CMP-EXACT-VALUE; no comparator is plain byte equality, and hash equality applies only to case-result/1 documents. | V-E01 corrections; A01 0.3.10 note 5 |
| Q70l one continuation rule | Every paged read kind continues by one rule. The oracle keeps a table of paged kinds and their continuation parameter and issued value (entityPage: `cursor`/`cursorFrom` and `nextCursor`; `transactions`: `after` and `next`; `transactionsForEntity`: `beforePosition` and `nextBeforePosition`, matched on the same entity, scope and `snapshotPosition`). A continuation value equal to one an earlier page of the same kind and key issued continues that read's view (Q70a-c, Q70g); disagreeing issuers refuse (Q70f, Q70i); identical views continue (Q70d, Q70h). A self-check fails if any query kind whose output carries a `next*` field is missing from the table, so a new paged kind cannot be left on the old rule. | V-O04g F11; the F7-F12 pattern |
| Q70m typed continuation values | `after`, `beforePosition` and any other integer continuation parameter must be a JSON integer; a string, a float or a negative value makes the case malformed (exit 2), never a crash or a FAIL exit. Matching uses the parsed integer. | V-O04g F12, F13 |

## Q76: EXP-C8 open questions (reads never write)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q76a scale of closures | The single-read default's typed refusal above 1M edge rows (XTDB) or 100k (QLever) stands. Cheaper per-round reads (XTDB entity-keyed projection tables, a QLever IRI ledger, R10 6.4) belong to a later experiment on the P4 current structure (Q68a), since both need an id-keyed current copy. | C8 questions 1-3 |
| Q76b dead schema | `XtdbStorageAdapter.initialize` stops creating `tx_query_relations`; the C8 follow-up removes it after V-C8, so no read-path artefact remains in the schema. | C8 question 4 |
| Q76c tail constraints | A recursive rule shape a lane cannot answer is refused typed, never answered without its constraint. Core's SQL `compileRecursiveCTE` ignoring tail constraints is a correctness defect for the SQL adapters outside the two lanes; it is recorded in the capability matrix and fixed when a lane uses it. | C8 question 5 |
| Q76d WL20 supports | The C8 follow-up wires `countSimplePaths` into WL20 supports on both lanes, so supports are general rather than path lengths 1-3. | C8 question 6 |
| Q76e maintained-query publication | Maintained queries publish only from the change feed consumer (P3), never from a read; until that consumer exists, `query()` answers directly. | C8 question 7 |
| Q76f clean receipts | XTDB G1/G2 receipts for C8 are rerun on an exclusive slot after V-X02's; the overloaded-dev receipts stay as diagnostic. | C8 question 8 |
| Q70n completeness by execution | The Q70l completeness check runs every query kind registered in `run.QUERIES` on generated cases and inspects the actual output (top level, pages and nested objects) for any `next*` key; a kind whose output carries one and is not in `CONTINUATIONS` fails, and a kind that cannot be exercised fails conservatively. Static source matching may stay as an extra check, never as the only one. Negative controls: a computed key, a helper in another module, a nested dictionary. | V-O04h F14 |
| Q70o page selector typed | `cursorFrom.page` is an integer continuation parameter under Q70m: a JSON integer from 0 to the last page index, otherwise the case is malformed (exit 2); invalid reference shapes raise the oracle's input error, never an uncaught exception. | V-O04h F15 |
