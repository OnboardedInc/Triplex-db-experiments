# Questions across subjects, connected: one call, two routes, one meaning (XQ10, 2026-11-24)

Branch `exp/DX-XQ10-questions-connected`, from `exp/DX-XQ9-question-shapes` `2ef4cb3c4`, with
`exp/DX-XQ7-question-reader` `a5631af24` and then `exp/DX-XQ4-commit-index` `0f4843e25` merged. Not merged onto
`exp/DX-INT1`. Every option is off by default; no existing default changes. Every time on this page is the Mac lab VM's
and is diagnostic; counts, differences and refusals are the result.

**Lead.** One SDK call (`askPage`, `askAll`) now answers a question across subjects from the index or from the slow
exact route, and the two give identical answers wherever both apply: **4,626 questions at 3 positions x 3 valid times,
0 differences** in the agreement gate (section 4), 396 of 396 through the SDK on a stack, 54 of 54 in the console's
proof. Eight differences of meaning were found and each is fixed, refused on both routes, or settled by routing
(section 4); the generated difference table has no case where the index points to a slow route that then refuses, and
none where the slow route answers what the index calls unanswerable. The question reader serves all three routes from
their own pools, byte-equal to the single reader on 2,463 `find` pages and 2,794 pages of the question reader's own
gate, never early after a late start. With every option off the stored log equals the base gateway's (33,609 datoms,
same hash) and 58 of 58 stored-function identities equal the base, after fixing a hazard the merge inherited. The
console shows which route answered and why, lets either be forced, puts both answers side by side with their costs and
lists the indexed attributes with the declare call shown, not run. **The hint fix does not work**: with it, the index's
extra reads inside apply rise (+0.34, +0.29, +0.48 at 1, 3, 6 values against +0.06, +0.09, +0.21 without it, 300
saves a cell); keep it off. Nothing ran on a server; the shortest session that answers "affordable and exact at
1 billion" is 4.2 to 7.7 hours, **$4.61 to $8.41** (section 8).

## 1. What was built

| Part | Where | What it does | Default |
| --- | --- | --- | --- |
| **One SDK call** | `packages/datomic/src/ask.ts`: `askPage`, `askAll`, `AskRefused` | A question in the shared condition language goes to the index (`find`) first; a typed refusal with `fallback: "sweep"` sends the same question to the slow exact route (`sweep`) at the same basis and the same valid time (a missing valid time is fixed to the caller's clock before either route is asked). `route: "index"` or `"sweep"` forces one. A refusal with `fallback: "none"`, or without the field (a protected value, a malformed question), is thrown as it is. Every answer states `route`, `indexRefusal` (why the index did not answer), `position`, `validAt`, `complete`, `examined` (index entries and entity reads, or IDs listed and subjects read). A cursor carries its route, position and valid time and is never sent to the other route; a later index page refused with `fallback: "sweep"` restarts the question on the sweep at the pinned position (`restarted: true`). | A new function; nothing calls it unless asked |
| **One meaning on both routes** | `cross_find.clj`, `sweep.clj` | The differences of meaning found by the agreement gate, each settled (section 4). | Only with the routes on |
| **`find` knows the sweep's shapes** | `cross_find.clj` `sweep-fallback`, `sweep-only-shape!` | `find` refuses the sweep's added shapes (`anyOf`, `top`, `sum`, an order with a type, `ne`, `contains`, `has`) by type with `fallback: "sweep"`; a protected attribute anywhere in a question is refused first, with no fallback; `ValueFamilyMismatch` carries a fallback; `sweep-fallback` says `"none"` for what the sweep refuses by value family. | Only with `TX2_CROSS_INDEX=1` |
| **One admission for ID lists and `find`** | `ids.clj` `admitted`, `admitted-find` | `TX2_ID_LIST_QUEUE_MS` unset: the ID list branch's admission byte for byte (a second question of a busy account refused at once), shared by `find`. Set: the index branch's fair queue (per-account turn, `TX2_ID_LIST_PER_ACCOUNT`, then the fair pool, `IndexBusy` only after the wait) for both routes. `TX2_FIND_PERMITS` gives `find` its own pool (unset: the ID list pool, as built). | Off |
| **The question reader serves `find`** | `question_reader.clj` (unchanged: `find` was already in its route list), `stack/up.sh`, `rd5/second-reader.sh` | Role `q` gets `TX2_CROSS_INDEX` with the stack; `DX_QUESTION_FIND_PERMITS`; the launcher makes both cursor keys per stack when the question reader is on (section 5). | Off |
| **Stored-function identities restored** | `lean.clj`, `uncached.clj`, `subject_save.clj`, `cross_index.clj`, `main.clj` | The merge moved 17 identities with every option off, inherited; fixed (section 3). | No change with options off |
| **The hint fix** | `index_hints.clj`, `TX2_INDEX_HINTS=1` | Both lookup functions also touch the owner's entry range, each entry key the save writes (EAVT on its owner, AVET by value) and the declaration's sequence datom; new idents installed only with the option on (section 7). | Off |
| **Console and agent tools** | `examples/demo-mcp/src/questions.ts`, `tools.ts`, `declare-index.ts`; `examples/console/src/pages/questions.tsx` | The page's "Fast answer from the index" is real: the route that answered and why, a route choice, both answers side by side with their costs, an "Indexed attributes" view with the declare call shown and not run; `ask_across_subjects` gains `route` and the route fields; new read-only `indexed_attributes` (section 6). | The page's default route is auto; on a database with no declaration every answer comes from the slow route as before |
| **Toy option** | `demo/server/profile.mjs`, `demo/server-up.sh`, `demo/toy/up.sh`, `demo/console/index-declaration.json` | `DEMO_CROSS_INDEX=1`: the toy's gateways run the index and the start script declares and backfills six of the demo data's attributes. | Off |
| **Gates** | `xq10/agree.clj` (inside the index gate's world), `xq10/reader.ts` + `reader.sh`, `xq10/stacks.sh`, `xq10/suites.sh`, `xq10/idents.sh`, `xq10/stack-check.py`, `packages/datomic/test/ask.test.ts` | Sections 2 to 7. | |
| **Server runner** | `xq10/server.ts` | The agreement gate at 1 billion on one deep account (section 8, run G). | |

## 2. The merge, its conflicts and their resolutions

`1af0aceb5` merges the question reader into the question shapes branch; `2df7342b7` merges the index. Both sides kept
everywhere.

| # | File | Conflict | Resolution |
| --- | --- | --- | --- |
| 1 | `demo/server/profile.mjs` | The question routes on in the demo environment (XQ8/XQ9) against the question reader's role (XQ7) | Both: the routes, then `DEMO_QUESTION_READER`'s role |
| 2 | `stack/up.sh` (first merge) | `DX_SWEEP_SHAPES` (XQ9) against the question reader role and `DX_QUESTIONS_AT` (XQ7) | Both, in that order; role `q` gets the shapes too (they are in the loop over every role) |
| 3 | `stack/up.sh` (second merge) | The index's `DX_CROSS_INDEX` and `DX_INDEX_QUERY_PERMITS` blocks against XQ7's per-role pool variables | XQ7's per-role variables kept (role `q` takes `DX_QUESTION_*` first); `DX_CROSS_INDEX` added for every role; the index branch's duplicate `DX_INDEX_QUERY_PERMITS` block dropped (`index_permits` already passes it) |
| 4 | `ids.clj` admission | The index branch's always-on fair queue (`ids/admitted`, shared by `ids` and `find`, waiting each request's own bound) against XQ7's optional queue (`TX2_ID_LIST_QUEUE_MS`, ID lists only) | **One queue under the question reader's option name.** Unset: the ID list branch's admission byte for byte (busy account refused at once, permit waited up to the request's bound), now shared by `find`. Set: the index branch's behaviour for both routes (fair per-account turn, `TX2_ID_LIST_PER_ACCOUNT` places, fair pool, `IndexBusy` with `retryAfterMs` only after the queue time); answers carry `queue {micros, ahead}`. XQ7's counter renamed `admitted-count` so the index branch's `admitted` function keeps its name. Change of behaviour against the index branch alone: with the option unset, a second `find` of a busy account is refused at once instead of queued; set the option for the index branch's behaviour (the index gate below runs with it at 50 ms) |
| 5 | `ids_test.clj` busy case | XQ3's immediate refusal against XQ4's queued wait | Both cases: the off case as XQ3 wrote it (pinned to the option unset), the queued case as XQ4 wrote it under the option |
| 6 | `main.clj` requires | `sweep` and `question-reader` (XQ9, XQ7) against `cross-find` (XQ4) | All three, after `commit` and `subject-save`; `route-handler` (the guard) wraps `route-handler-routed` as XQ7 built it, and the `find` routes sit inside the latter (auto-merged) |
| 7 | `question_reader_test.clj` | Uses XQ7's counter and two-argument `queued-admit!` | Follows the renames |

**Added at the merge (not a conflict):** `TX2_FIND_PERMITS` (find's own pool, as the question reader's sizing asks:
"lists 2, sweeps 3, find 1"); `DX_INDEX_CURSOR_SECRET` and `DX_FIND_PERMITS`/`DX_QUESTION_FIND_PERMITS` in the launcher.

## 3. Stored-function identities: a hazard the merge inherited, fixed

`xq10/idents.sh` (the several-owners builder's method, `s3/idents.sh`) loads the gateway as production does and prints
every stored-function identity and every quoted code form's hash, in 10 writer settings. **The merged head first moved
17 of 58 with every option off**, against the base `2ef4cb3c4`, in every setting: the commit function's code,
`subject-save` (the per-subject writer, `:triplex.subject/v-…`), the owner head, the general hint function and the
packed journal. Run by run:

| Tree | Against | Equal | Differ |
| --- | --- | ---: | ---: |
| base `2ef4cb3c4`, run twice | itself | 58 | 0 (deterministic) |
| the question reader head `a5631af24` | base | 41 | 17 |
| first merge `1af0aceb5` | `a5631af24` | 58 | 0 |
| second merge `2df7342b7` | `a5631af24` | 53 | 5 |
| **this branch, final** | **base** | **58** | **0, in all 9 option-off settings** |

**Causes.** (1) `exp/DX-RD5-uncached-read`, which the question reader branch merged, adds a `require` of `uncached` and
one call to `lean.clj` and puts `uncached` early in `main.clj`'s requires: both compile before `commit.clj`, so the
counter behind the generated names inside the stored code (`#(...)` parameters, auto-gensyms) moves, and the commit and
per-subject functions get new identities: a database opened by that gateway would install new function versions with
every option off. (2) The index branch's three edits to `subject_save.clj` come after that file's own stored code, so
they moved only the owner head and the general hint function (installed only with their options on); the index
branch's own G8 (a paired log with every option off) could not see it.

**Fix**, the index branch's own method (its pinned check is installed from its namespace): `lean.clj` is the base plus
one hook var and one call through it (`(when prefetch-hook (prefetch-hook ...))`: no generated names);
`uncached.clj`, now loaded last by `main.clj`, fills the hook only with `TX2_READ_PREFETCH=1`; `subject_save.clj` is the
base plus one var (`small-op`) read where it read `prepared/small-op?`; `cross_index.clj` replaces that var and wraps
`render-ops` (readdressing a subject's entries to its numeric owner after it, which is the same as inside it, since
`render-ops` passes entry operations through unchanged) only with `TX2_CROSS_INDEX=1`. **The uncached-read branch's
`lean.clj` hazard is that branch's on `exp/DX-INT1` too: whoever merges it there should take this form.**


## Each piece's gate on the merged head

**Image check, for every stack-based run below.** Shared tags are rebuilt by other builders' gates, so every run starts
its containers by an image ID resolved at its start, records the ID each container ran, and counts only when they
match; the gateway code is this tree mounted read-only, hashed before the run and checked inside it (the stacks: each
gateway's `/health` answers the launcher's file-list hash, compared file by file with the tree by `xq10/stack-check.py`).
The index gate's runs (`xq4/gate.sh`) used `tx2-datomic:dx-real2-production` resolved to `da58aea16b31…` (it was
retagged by another builder at 15:49 local from `3ac77d8ae37c…`, the image the first merge suites ran); the stacks used
`tx2-datomic:1.0.7745-da00` = `21a67288007d…`. No image was built by this branch (neither image carries the gateway: the
code that runs is the mounted tree).

| Piece | Gate | Run | Result | Image and source check |
| --- | --- | --- | --- | --- |
| Index | G1 exactness against brute force | `world-1` | **2,718 questions, 0 differences** (6 positions x 9 valid times, 197,475 pages, 4,928,127 matching answers; the index branch: 2,448, see section 9) | pass |
| Index | Agreement with the exact sweep (the index branch's own) | `world-1` | **64 questions, 0 differences** (ids 43, count per value 17, count 4; the index branch: 77) | pass |
| Index | G2 backfill against the writers | `world-1` | 189,476 value and 60,096 type entries both ways, dry run 0 to add and 0 to retract | pass |
| Index | G3 protection, D3 bulk frames, B1 release rule, G4 accounts and cursors, E1 index-only answers | `world-1` | all pass | pass |
| Index | G5 bounds | `world-1` | counts, pages, busy and pinned reads pass; **the 60 ms time clause failed** (63.8 ms, throttled; section 9) | pass |
| Index | G8 stored log with every option off | `g8-base` (base `2ef4cb3c4`'s gateway) / `g8-mine` | **identical**: 33,609 datoms, head 620, SHA-256 `460d2d0f…` on both, byte-equal files | pass, both |
| Index, shapes, reader | Stored-function identities, 10 settings | `idents/final-656909cce` | **58 of 58 equal to the base in 9 settings**; with `TX2_INDEX_HINTS=1` exactly the 4 hint identities change | by ID |
| All | In-memory suites, 4 arms (unset, index, routes, queue) | `suites-final` | 84 or 85 tests, 236,356 to 236,445 assertions, **0 failures**, 1 error each: `feed-test/http-route`, the shapes branch's own (its `suites-off` has it) | by ID, all 4 |
| ID lists | XQ3's stack gate | `stacks-1/xq3` | **1,654 pass**, 0 fail | pass |
| Sweep | XQ6's stack gate | `stacks-1/xq6` | **5,917 pass**, 0 fail | pass |
| Shapes | XQ9's gate, shapes off, with the twin | `stacks-1/xq9off` | **5,917 pass**; twin with the shapes on: 2,244 of 2,244 compared answers identical, 6 busy skipped | pass |
| Shapes | XQ9's gate, every shape on | `stacks-1/xq9shapes` | **8,519 pass**, 0 fail | pass |
| Question reader | XQ7's stack gate | `stacks-1/xq7` | **6,875 pass, 1 fail**: byte-equal **2,794 pages** (2,176,978 bytes) question reader against the single reader; the one fail: fairness (f), one of four arms had a page with 4 admissions ahead of it where the gate allows 2 (6,944 pages; the other three arms 2). **Repeated** (`stacks-2/xq7`): **6,876 pass, 0 fail**, at most 2 ahead in all four arms (1 in one). Not traced; 1 arm of 8 over the two runs | pass |
| Connected | `xq10/reader.ts` main | `stacks-3/reader` | **5,783 pass, 0 fail** (section 5) | pass, the question reader's `/health` too |
| Connected | `xq10/reader.ts` refusal | `stacks-2/refusal` | **9 of 9**: with `TX2_QUESTIONS_AT` the main reader and the writer refuse `ids`, `sweep` and `find` with 421 naming the question reader; the SDK without `questionReaderUrl` gets that refusal, with it the question reader's index answer, equal to the count asked directly; the question reader counts the `find` pages it served | pass |
| Console | questions 2,603, existing 37, page pass 56, catalogue 80 | `console-3`, `console-4` | all pass (section 6) | the toy's own stack: image `21a67288007d…`, source hash `2abf5da3…` = this tree |
| SDK | `ask.test.ts` | | 9 of 9 | |

## 4. One meaning on both routes: the agreement gate and the difference table

**The gate** (`xq10/agree.clj`, loaded into the index gate's own world, `world-1`): the index (`find`) and the slow
exact route (`sweep`, every shape on) as two independent paths through the real route handler of one gateway, every
answer compared in full (IDs in order, counts, counts per value with the no-value group, projections as sets). Its own
account of edge values (`acc-e`: negative zero, ties, several and repeated values of one attribute, no value, values of
another family, json, long and odd texts, integers past 64 bits, references to another account, valid intervals that
open and close exactly at the gate's valid times), written in three commits after the backfill, plus the big world's
`acc-a` with the index gate's random questions that both routes accept.

| Run | Questions | Cells | Differences | Refused | Pages (find / sweep) |
| --- | ---: | --- | ---: | ---: | ---: |
| `world-1`, final gateway code | **4,626** (ids 2,360, count 2,025, count per value 241; 745 of the ID lists also in value order, compared as sets) | 3 positions (11,674, 11,703, 11,712: the three edge commits) x 3 valid times (2024-01-04, 2024-02-23, 2026-09-21), 514 questions each | **0** | 0 | 10,912 / 14,059 |
| `agree-debug1` (300 subjects, before the fixes below) | 4,545 | the same | 18, all one cause (row 1 below), fixed | 0 | 5,460 / 5,514 |

3,858 of the 4,626 answers are not empty; they fall into 140 distinct (account, result, size) answers.

**Every difference of meaning found, and how it was settled:**

| # | Difference | Shown by | Settled |
| --- | --- | --- | --- |
| 1 | `from {prefix, shape}`: `find` matched the shape against the part after the prefix, the sweep (and the ID lists) against the whole local part | `agree-debug1`, 18 differences | `find` now matches the whole local part, the ID list grammar; an ID pattern's shape is the whole pattern (`cross_find.clj`) |
| 2 | Count per value: `find` left out matching subjects with no value of `of`; the sweep counts them in a no-value group (value null) | the agreement gate (count per value with the no-value group) | `find` counts them in the same group, carried in its cursor; the SDK sorts that group last on both routes |
| 3 | Negative zero: the sweep grouped -0.0 and 0.0 apart for numbers and datetimes; the index stores one key | the edge account | `sweep.clj` folds -0.0 into 0.0 when it groups and compares; the SDK prints -0 as 0 |
| 4 | Integers past 2^53: the routes return them as text and as numbers | the edge account | the SDK returns every integer as text on both routes |
| 5 | A range on a boolean: `find` refused with `fallback: "sweep"`, and the sweep refuses it too | the difference table | `sweep-fallback` checks the value family: `fallback: "none"` where the sweep refuses by family |
| 6 | `ValueFamilyMismatch` and the sweep-only shapes (an unknown field read as `InvalidValue`) carried no fallback | the difference table | `ValueFamilyMismatch` is an index refusal with a fallback; `anyOf`, `top`, `sum` and a typed order are refused by type with `fallback: "sweep"` |
| 7 | A protected attribute inside a sweep-only shape reached the sweep's own check only | the difference table | `find` checks protection first, anywhere in the question: 409 `ProtectedValueLookup`, no fallback, on both routes |
| 8 | Top N against the index's value order: 48 of 144 pairs equal; ties in descending order differ (`find` by entity descending, the sweep by ID ascending) and the sweep's top keeps the best value per subject | the top pairs | **Not unified, settled by routing:** the SDK sends a top N only to the sweep, and the index's value order only as an ID list in value order. Recorded, not a defect of either answer |

**The difference table** (`world-1`, phase `table`, generated by running every shape and condition once on each route;
`out/xq10-table.json`): 45 cases. **No case where the index refuses with `fallback: "sweep"` and the sweep refuses**
(`fallbackSweepButSweepRefused: []`), **no case where the index says `"none"` and the sweep answers**
(`sweepAnswersFindRefusesNone: []`). Five shapes are the index's alone (`countDistinct`, `from {type}`, the three entity
or value orders); the SDK sends them to the index and returns its refusal as it is.

| Case | `find` | `sweep` | Verdict |
| --- | --- | --- | --- |
| eq on a declared attribute | 200 | 200 | both answer (agreement gate compares) |
| eq on an attribute not declared | 409 AttributeNotIndexed fallback sweep | 200 | index refuses, sweep answers |
| eq with a value of another family than declared | 400 ValueFamilyMismatch fallback sweep | 200 | index refuses, sweep answers |
| in, 3 values | 200 | 200 | both answer (agreement gate compares) |
| range on a string | 200 | 200 | both answer (agreement gate compares) |
| range on a boolean | 400 UnsupportedOperation fallback none | 400 UnsupportedOperation | both refuse |
| prefix | 200 | 200 | both answer (agreement gate compares) |
| prefix longer than 200 characters | 200 | 200 | both answer (agreement gate compares) |
| prefix on an integer attribute | 400 UnsupportedOperation fallback sweep | 200 | index refuses, sweep answers |
| exists | 200 | 200 | both answer (agreement gate compares) |
| missing with from | 200 | 200 | both answer (agreement gate compares) |
| missing alone, no from | 400 UnsupportedOperation fallback sweep | 200 | index refuses, sweep answers |
| ne (is not) | 400 UnsupportedOperation fallback sweep | 200 | index refuses, sweep answers |
| contains | 400 UnsupportedOperation fallback sweep | 200 | index refuses, sweep answers |
| contains, any case | 400 UnsupportedOperation fallback sweep | 200 | index refuses, sweep answers |
| has related (one level, by key) | 400 UnsupportedOperation fallback sweep | 200 | index refuses, sweep answers |
| anyOf (OR groups) | 400 UnsupportedOperation fallback sweep | 200 | index refuses, sweep answers |
| 5 conditions | 400 UnsupportedOperation fallback sweep | 200 | index refuses, sweep answers |
| 9 conditions | 400 UnsupportedOperation fallback none | 400 UnsupportedOperation | both refuse |
| json value in eq | 400 ValueFamilyMismatch fallback none | 400 UnsupportedOperation | both refuse |
| result count | 200 | 200 | both answer (agreement gate compares) |
| result countByValue | 200 | 200 | both answer (agreement gate compares) |
| result countDistinct | 200 | 400 UnsupportedOperation | index only |
| result top N | 400 UnsupportedOperation fallback sweep | 200 | index refuses, sweep answers |
| result sum | 400 UnsupportedOperation fallback sweep | 200 | index refuses, sweep answers |
| from {type} | 200 | 400 InvalidValue | index only |
| from prefix with shape | 200 | 200 | both answer (agreement gate compares) |
| order by entity, descending | 200 | 400 OrderedPagingNeedsIndex | index only |
| order by entity, ascending, range only | 200 | 400 OrderedPagingNeedsIndex | index only |
| order by the range attribute | 200 | 400 OrderedPagingNeedsIndex | index only |
| project a reference | 200 | 200 | both answer (agreement gate compares) |
| project a text attribute | 400 UnsupportedOperation fallback sweep | 200 | index refuses, sweep answers |
| project 5 references | 400 UnsupportedOperation fallback sweep | 200 | index refuses, sweep answers |
| position before the index's epoch | 409 IndexNotAvailableAtPosition fallback sweep | 200 | index refuses, sweep answers |
| position inside a group commit | 409 InteriorPosition fallback none | 409 InteriorPosition | both refuse |
| record time basis | 200 | 200 | both answer (agreement gate compares) |
| at least a position | 200 | 200 | both answer (agreement gate compares) |
| a position not reached yet (1 ms wait) | 409 BasisNotAvailable | 409 BasisNotAvailable | both refuse |
| limit 1001 | 400 InvalidValue | 400 InvalidValue | both refuse |
| no account | 400 AccountRequired | 400 AccountRequired | both refuse |
| the other route's cursor | 409 CursorMismatch | 409 CursorMismatch | both refuse |
| an edited cursor | 409 CursorMismatch | 409 CursorMismatch | both refuse |
| a protected attribute in eq | 409 ProtectedValueLookup | 409 ProtectedValueLookup | both refuse |
| a protected attribute in an OR group (sweep shape) | 409 ProtectedValueLookup | 409 ProtectedValueLookup | both refuse |
| a protected attribute as `of` | 409 ProtectedValueLookup | 409 ProtectedValueLookup | both refuse |

## 5. The question reader serves all three routes

**Pools.** The question reader (`TX2_QUESTION_READER=1`, role `q` of `stack/up.sh`) serves `ids`, `sweep` and `find`,
each from its own permit pool, sized on the role: `DX_QUESTION_INDEX_QUERY_PERMITS` (ID lists), `DX_QUESTION_SWEEP_PERMITS`
with `DX_QUESTION_SWEEP_PER_ACCOUNT` (sweeps) and, new, `DX_QUESTION_FIND_PERMITS` (`find`; `TX2_FIND_PERMITS` on the
gateway; unset, `find` shares the ID list pool as the index branch built it). The one admission (section 2, row 4)
applies to `ids` and `find` on whichever gateway serves them.

**Cursor keys, shared by the launcher.** A sweep cursor is signed with `TX2_SWEEP_CURSOR_SECRET`, a `find` cursor with
`TX2_INDEX_CURSOR_SECRET` (ID list cursors are not signed). With `DX_QUESTION_READER=1` and a key not given,
`stack/up.sh` makes each key once per stack (24 random bytes, hex) and passes the same value to every gateway role (`w`,
`r`, `q`), so a cursor issued by one gateway continues on any other of the stack and survives a restart of the question
reader. A key given in the environment is used as given (16 to 128 letters or digits). The keys live only in the
launched containers' environment; nothing is written to the repository or to the evidence. Without the question reader
nothing changes: each key is passed only when given. The second-machine launcher (`rd5/second-reader.sh`) takes
`RD5_INDEX_CURSOR_SECRET` beside the sweep's key, and `RD5_CROSS_INDEX=1`, `RD5_FIND_PERMITS` (written, not run).

**`TX2_QUESTIONS_AT`.** With it, the main reader and the writer refuse all three routes with 421 `QuestionReaderRoute`
naming the question reader's URL. The SDK sends the question routes to the question reader when given its
`questionReaderUrl` option; without it the 421 comes back as it is.

**Results** (`stacks-3/reader`, a stack of this tree with the index, ID lists, the sweep with every shape and the
question reader on, no cursor key given, so the launcher made both; every container checked by image ID and source;
earlier runs `stacks-1/reader` and `stacks-2/reader` failed on the gate's own mistakes, an at-least wait over the
SDK's 2,000 ms limit and a "before the epoch" position equal to the epoch, both fixed in the gate):

| Check | Result |
| --- | --- |
| (a) `find` on the question reader against the single (main) reader, 3 positions x 3 valid times x 2 accounts whose names prefix each other, 4 questions each, bounds from 20 entries | **2,463 pages byte-equal** (2,420,654 bytes, timing fields removed); **2,031 pages continued on the other reader** with the cursor the first issued (the shared key); 36 refusals byte-equal on both |
| (b) the one SDK call, `askAll` forced to each route and auto | **396 questions with identical answers on both routes**; auto answered all 396 from the index; 36 ID lists in entity order driven only by a range or a prefix (the index refuses that order) and 12 questions the index refuses by attribute or shape (not declared, `ne`, `anyOf`, top N, at 3 positions) answered by the sweep with the index's typed refusal, at the same basis, equal to the sweep asked directly; before the index's epoch the sweep answers at that position; a refusal with `fallback: "none"` is returned as it is |
| (c) the question reader stopped, 5 saves, started again; 28 probes pinned to or at least at positions up to 5 past the head, waits 1 and 2,000 ms | **0 answered early, 0 different** from the single reader at the position answered: 20 answered, 4 `BasisNotAvailable`, 4 `AtLeastTimeout`; a cursor issued before the restart continues after it, equal on either reader |
| Refusal mode (`stacks-2/refusal`) | 9 of 9 (section "Each piece's gate", above) |

## 6. What the owner sees in the console

The page "Ask across subjects" (`/questions`), on a toy whose gateways run the index and which declares attributes:

- **Which route answered, and why.** "How this was answered" leads with a badge, *Answered from the index* or *Answered
  by reading each subject*. When the index did not answer, one sentence says why, with the store's code (for example:
  "That attribute ... is not declared for the index, so the fast route cannot answer it. (AttributeNotIndexed)"; a
  list with a text column: the index projects only references, so the slow route answered). The facts grid adds
  *Index entries examined* and *Entities read to confirm* beside *Subjects examined*.
- **A route choice** beside *Ask*: *Auto* (default), *Index only*, *Slow route only*. A forced index that cannot answer
  shows its refusal; a forced slow route answers everything it takes.
- **Both answers side by side.** *Compare both routes* asks the shown question again on each route, at the position and
  valid time of the answer shown, to the end, and shows a three-row table: the answer (a count, the groups, or the
  number of IDs), what it holds for, and its work (*N index entries examined, M entities read* against *N subjects
  read, M fact rows*), with the time (diagnostic). Below it: "The same answer from both routes." (or, if they ever
  differed, a sentence calling it a defect).
- **Indexed attributes**, a small card under the examples: the declaration (database-wide), each attribute with its
  family and "from position N"; for the chosen kind, how many of its attributes are declared and how many could be;
  *Show the declare call* reveals the SDK call (`declareIndexes` then `backfillIndex`, with the quiet-window note),
  marked "Shown, not run".
- On a database with no declaration (the owner's toy today): the badge says the slow route answered, the status says
  "off: nothing is declared in this database", and every answer is the slow route's, as before.

**Agent tools.** `ask_across_subjects` takes `route` (`auto`, `index`, `sweep`) and every answer carries
`route.code`, `route.used`, `route.indexRefusal {code, fallback, explanation}`, `route.forced`, `route.restarted`,
`progress.indexEntriesExamined` and `progress.entityReads`; its description says when the index answers. New read-only
tool `indexed_attributes` (account, optional kind): the declaration, each attribute's position, the kind's attributes
marked, and the declare call shown and never run.

**Switching the owner's console to this branch (written, not run; it restarts his console, so it needs his word).**
From this worktree, as `demo/toy/README-FOR-CONSOLE.md` describes for the questions build:

1. Build once: `pnpm install --store-dir <repo>/.pnpm-store --frozen-lockfile --offline`, then
   `node_modules/.bin/turbo run build --filter=@triplex-build/triplex-datomic`, then `(cd examples/console && pnpm run build)`.
2. `bash demo/toy/down.sh` (must end with `DEMO DOWN in N s; working copy: shut down`).
3. `DEMO_CROSS_INDEX=1 bash demo/toy/up.sh` (no `--reset`: the data stays). It must print `DEMO READY head=<the same
   head as before>`, then `INDEX DECLARED: ... backfill sealed true` (or `INDEX ALREADY DECLARED` on a second start)
   and `Console: http://127.0.0.1:28580/`. The declaration adds six attributes and their entries to the toy's working
   copy (database-wide, only growing); without `DEMO_CROSS_INDEX=1` step 3 is the questions build exactly, with the
   fast route off.
4. Re-register the assistant's MCP server at this worktree (`claude mcp remove triplex-demo`, then
   `claude mcp add triplex-demo -- node <this worktree>/examples/demo-mcp/src/mcp.ts`), new session.
5. Reload the console tab.

**What changes:** new stack containers with `TX2_CROSS_INDEX=1`; six declared attributes and about a thousand index
entries written once by the backfill (the toy declared 966 entries over 3,075 entities in 1.6 s on the second toy);
every later save of a declared attribute writes its entry in the same commit. **What is lost:** about a minute of
console time and any open question's cursor. **To go back:** `down.sh`, then `up.sh` in the previous worktree; the
declaration and its entries stay in the working copy (a gateway without the option never reads them, and the stored
functions are unchanged). **Hazard, not guarded:** saves made by a gateway without the option write no entries and do
not move the fence, so turning the index on again later would answer from stale entries; `find` does not detect it.
Before turning it on again, run the reconciliation backfill (`backfillIndex`, which adds and retracts) in a quiet
window, or never go back; even then, a question pinned to a position from the time it was off would read the stale
entries (the epoch does not move), so the gap is the index branch's to close (an epoch reset on reconciliation).

**Proofs on the second toy** (`xq10`, ports 18631/18635, console 28593; its gateways run this tree's code, source
hash `2abf5da383e5…` answered by `/health`, image `21a67288007d…` for the transactor and both gateways; the toy declares
six attributes, 966 entries over 3,075 entities). Evidence `runs/console-3` and `runs/console-4`:

| Proof | Result | What it adds for this branch |
| --- | --- | --- |
| Questions proof (`prove-questions.ts`) | **2,603 of 2,603** | every question on both routes and auto (54), the route and the fast-index place stated on every answer, index entries examined reported when the index answered, forced routes and their refusals, an index cursor refused on the slow route |
| Existing console proof (`prove.ts`) | **37 of 37** | unchanged behaviour of the rest of the console |
| Page pass (`e2e/questions-pass.mjs`, light and dark) | **56 of 56** | route badge, route choice, both answers side by side with the same answer and their costs, the slow route when chosen, the declare call shown and not run, Stop and continue (on the slow route) |
| Tool catalogue (`gate-catalogue.ts`) | **80 of 80** | `ask_across_subjects` with `route`, the new `indexed_attributes` |

**Defects these proofs found, fixed:** (1) every second index page was refused (`CursorMismatch`): the SDK dropped the
first page's basis on index cursor pages, and `find` binds a cursor to the whole request; the ask cursor now carries it
(test added). (2) A list filling N rows asks each later page for fewer, and the SDK's cursor bound the limit; a list's
limit is now a page size, as both routes treat it (test added). (3) A range on yes/no on a declared text attribute is
refused by both routes, but the index's sentence pointed to the slow route; with `fallback: "none"` it now says neither
route answers. (4) Stop could not be shown because the index answers the count in one page; the page pass stops the slow
route.


## 7. The hint fix, measured: it does not help; keep it off

**What it is** (`index_hints.clj`, `TX2_INDEX_HINTS=1`, default off): the per-subject writer's and the general writer's
lookup functions also touch the owner's index entry range, each entry key the save writes (EAVT on its owner, AVET by
value) and the declaration's sequence datom, so that the entries' segments are in the cache before the transaction
applies. Installed as **new function identities** (S3's method): with the option on exactly 4 identities change (the two
hint functions' code and ident) and 4 new keys appear; with it off, 58 of 58 equal the base (section 3).

**Measured:** the index gate's G6 cost harness, 10,000 subjects padded to 30 facts each, transactor object cache 32 MB,
both hint options on, reads inside apply per first-touch save, **index on minus index off**, at 1, 3 and 6 declared
values (1 and 3 on the per-subject writer, 6 on the general writer). Every cell passed its image and source check
(image `da58aea16b31…`, the gateway tree mounted and hashed); both arms attach the same hints (general 1,238, per
subject 2,406 in the 300-save cells).

| Cell | Saves per arm | k = 1 | k = 3 | k = 6 |
| --- | ---: | ---: | ---: | ---: |
| fix off, run 1 | 100 | +0.23 | +0.22 | +0.29 |
| fix off, run 2 | 100 | +0.35 | +0.19 | +0.08 |
| **fix off, run 3** | **300** | **+0.06** | **+0.09** | **+0.21** |
| fix on, range starts only (the index branch's proposal) | 100 | +0.34 | +0.28 | +0.54 |
| fix on, exact keys, run 2 | 100 | +0.13 | +0.16 | +0.56 |
| **fix on, exact keys, run 3** | **300** | **+0.34** | **+0.29** | **+0.48** |

**Reading.** The target was +0.2 or under. Without the fix the 300-save cell is +0.06, +0.09 and +0.21 (the 100-save
cells scatter from +0.08 to +0.35 between runs of the same code, so a 100-save cell cannot separate +0.1 from +0.3).
With the fix the 300-save cell is +0.34, +0.29 and +0.48: **the fix makes reads inside apply worse, at every k**; the
touches themselves appear to load segments that the apply then reads again, or evict ones it needed (not traced).
Datoms per save (+2, +6, +12, exactly 2 per declared value) and index bytes per save (134, 433, 847 B) are the same in
every cell. **Recommendation: leave `TX2_INDEX_HINTS` off and do not carry it forward**; the server pair (section 8, run
C) measures the excess on the real cache size, where it may not exist.

## 8. Server runs for questions across subjects, in order, for the day a machine is rented

No server is rented; a rental needs the owner's approval in money terms. All costs at **$1.09 per machine hour**
(f4.metal.small: 12 cores, 96 GB, NVMe, as the earlier rentals). The sealed 1 billion cluster is in object storage
(`aged-1b/cluster.tar.zst`, 145 GB compressed); fetching and unpacking it on a fresh machine was not timed by anyone
(estimated 20 to 45 min). Every command below is from its piece's page, at this branch's head (it carries all three
pieces); predictions were written before any run, by the piece's builder, except G (this page).

| # | Run (page) | Needs | Duration | Cost | Prediction | What would show it wrong |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Provision, build at the commit (SDK, image), fetch and unpack the sealed cluster | | 30 to 65 min | $0.55 to $1.18 | | |
| A | **ID lists** (`xq3/ID-LISTS.md` section 5; `xq3/server.ts`) | bring-up 1 | 3 to 10 min | $0.05 to $0.18 | One deep account: exactly 100,000 subjects in 100 pages; warm 0.1 to 0.35 s in all, cold 0.3 to 1.0 s; an old pin 1.0 to 2.5 times the head | a count other than 100,000; warm over 3 µs per entry; a cold walk over 3 s |
| D | **Sweep arms** (`xq6/EXACT-SWEEP.md` section 5 arms A and B; `xq9/QUESTION-SHAPES.md` section 6 arm C; `xq6/server.ts`) | bring-up 1 | 40 to 70 min | $0.73 to $1.27 | 100,000 subjects: 120 to 210 s on 1 permit, 45 to 80 s on 3, 30 to 60 s on 6, 150,000 to 200,000 loads; a sweep beside re-read pinned readers cuts their reads/s 30 to 80%; C1 (subjects with 3 or more open tasks) 220 to 440 s on one part, 45 to 100 s on six; C2 (top 100 by pay) 100 to 200 s on one part | counts that differ between arms; one permit over 300 s; six parts not 1.3 times faster than three; C1 one part over 600 s (tasks not stored beside their subject) |
| E | **Question reader arm** (`xq7/QUESTION-READER.md` section 6; `xq7/server.ts`) | bring-up 2 | 21 to 33 min of windows | $0.38 to $0.60 | Main reader's storage reads per pinned read: 0 to 0.05 in controls and with the sweeps on the question reader; 0.6 to 1.8 with them on the main reader (reads/s down 40 to 85%) | question-reader windows above the control by more than 0.05; main-reader windows within 10% of the control (then sweeps could share the main reader) |
| B | **Backfill of the 1 billion database** with exactness samples (`xq4/COMMIT-INDEX.md` S-1; `xq1/server.ts backfill`) | its own copy | 90 to 240 min | $1.64 to $4.36 | value entries 17.9 million ± 5%; bytes per entry 230 to 330 B; backfill 25 to 75 min; 1,000 sampled subjects in each of ten accounts: 0 mismatches; dry run 0 to add, 0 to retract | any sample mismatch or a non-zero dry run (stop: nothing ships); backfill and indexing job over 4 h (then an online, per-account backfill comes first); entries outside 17.0 to 18.8 million |
| C | **The save pair judged against the bars** (`xq4/COMMIT-INDEX.md` S-2; `lab/bin/scorecard.mjs --cross-index`) | two copies of the backfilled database | about 100 min (+2 preflight, +14 for the two copies) | $2.10 | on minus off: datoms per save +1.5 to 2.5; log bytes +300 to 800 B; reads inside apply +0 to 0.05; commit p50 +0.05 to 0.4 ms, p99 +0 to 3 ms; stored rate unchanged | with the index on, save median over 10 ms or p99 over 50 ms in a cell where the off arm is inside them (repeated 600 s cells); over 0.5 ms of writer time per save for 1 to 3 declared values; over 0.2 extra reads inside apply per first touch (section 7: on the toy's 32 MB cache the excess is +0.06 to +0.21 over 300 saves, and the hint fix makes it worse) |
| F | **Question bench, index** (`xq4/COMMIT-INDEX.md` S-3; `xq1/server.ts bench`) | its own bring-up of the backfilled copy | 40 to 60 min | $0.73 to $1.09 | first pages 1 to 5 ms warm, 8 to 50 ms cold; Q1 count 30 to 120 ms warm; Q4 full count 0.15 to 0.5 s warm; Q5 40 to 150 ms warm; quiet-account pinned-read p99 ratio at most 1.15 beside a cold Q4 count | a first page over 20 ms warm or 100 ms cold at p99; counts slower than 1 µs per entry warm or 10 ms per 1,000 entries cold; the quiet ratio over 1.25 and over its bar |
| G | **The agreement gate at 1 billion** (this page; `xq10/server.ts`) | bring-up 3 (backfilled copy, `DX_CROSS_INDEX=1 DX_SWEEP=1 DX_SWEEP_SHAPES=all DX_SWEEP_PERMITS=6 DX_SWEEP_PER_ACCOUNT=6`) | 3 to 12 min bring-up + 15 to 30 min | $0.33 to $0.76 | account-003, the head, now and 30 days ago: 11 comparisons of 7 questions (profiles by background, a range of start dates, the subjects, tasks complete with progress 10 or more, tasks per status with the no-value group, tasks with no status, one complete ID list), **0 differences**; auto answers every one from the index; index counts 0.03 to 0.5 s warm; each sweep of 100,000 profiles or subjects 30 to 60 s on 10 parts over 6 permits, each sweep of about 570,000 tasks 3 to 6 min; the parts examine exactly the kind's IDs (the runner stops otherwise) | any difference (stop: the index is not exact at that size, nothing builds on it); an index count over 3 s; a sweep part at another position |

**Bring-ups that can be shared.** Bring-up 1 (the sealed cluster with `DX_ID_LISTS=1 DX_SWEEP=1 DX_SWEEP_SHAPES=all`,
six sweep permits): A and D. Bring-up 2 (the sealed cluster with `DEMO_QUESTION_READER=1`, three main-reader sweep
permits): E, which needs the question reader's own settings. B runs on its own copy; C's two arms each bring up the card's
stack on their own copy; F brings up its own stack; G needs bring-up 3 on the backfilled copy. Whether
`demo/server-up.sh` accepts the backfilled copy as `DEMO_ORIGINAL` (its identity check compares the cluster with the
sealed handoff) is **not checked**: if it refuses, start G's stack with `stack/up.sh` on the copy as `xq1/server.ts verify`
does.

**The shortest session that answers "is the index affordable at 1 billion, and are its answers exact there":**
0 + B + C + G = 30 to 65 + 90 to 240 + 116 + 18 to 42 minutes = 254 to 463 minutes, **4.2 to 7.7 hours, $4.61 to
$8.41**. B answers what the backfill costs and checks 10,000 sampled subjects against the rows; C answers whether saves
stay inside the bars with the index on; G answers whether the index and the slow route agree on a deep account at that
size. Adding F (what a question costs from the index) makes it 294 to 523 minutes, 4.9 to 8.7 hours, $5.34 to $9.50.
The whole list back to back on one machine (0, bring-up 1, A, D, bring-up 2, E, B, C, F, G): 364 to 660 minutes,
**6.1 to 11.0 hours, $6.61 to $11.99**. A second machine (the rule allows two) running bring-up 1, A, D, bring-up 2 and E
on its own fetched copy beside B, C, F and G on the first saves 1.2 to 2.7 hours of wall time and costs its own setup,
$0.55 to $1.18 more.


## 9. What is not verified

- **Nothing ran on a server.** Every number at 1 billion is a prediction (section 8); every time on this page is the
  Mac's and diagnostic.
- **Agreement at 1 billion** (run G): written and checked for syntax, not run at size. Whether `demo/server-up.sh`
  accepts the backfilled copy is not checked.
- **The hint fix does not help** (section 7): with it, reads inside apply rise; why is not traced. Without it the
  300-save cell meets +0.2 at 1 and 3 values and is +0.21 at 6, on the Mac's 32 MB cache only.
- **G5's time limit** (the index gate's concurrency case) failed by 3.8 ms: the slowest of 64 concurrent `find`
  requests took 63.8 ms against 60 ms, with 139 ms of host throttling during it and 6.9 s of collector time in the
  phase; counts, statuses and the 200 pinned reads beside it all passed. The index branch's page records the same
  clause failing in 4 of its 8 toy runs under CPU-quota throttling (`xq4/COMMIT-INDEX.md` G5). Not rerun here.
- **28 entity reads on index-only first pages** in `world-1`'s G1 (the index branch's runs counted 0): they are the
  confirmations of long keys the counter includes; which questions drew them is not traced. `world-1`'s G1 asked
  2,718 questions where the index branch's asked 2,448 with the same seed; the cause of the larger count (this run has
  the sweep and its shapes on) is not traced either. 0 differences in both.
- **`world-1` ran at `bc0ce9efd`**: the gateway tree differs from the final one only in `index_hints.clj` (the exact-key
  touches), which loads but does nothing with `TX2_INDEX_HINTS` unset, as in that run.
- **Top N against the index's value order**: not offered as one question (the SDK sends a top N only to the sweep);
  their different tie order and order value are recorded, not unified (section 4).
- **The index's own refusal of ID order for lists driven only by a range or a prefix** means such lists are answered
  by the slow route under auto; a value-ordered list is the index's alone. Not changed.
- **Turning the index off and on again** on a declared database leaves stale entries and `find` does not detect it
  (section 6); the index branch's open gap.
- **The uncached-read branch's batch prefetch** (`TX2_READ_PREFETCH=1`) after its hook moved out of `lean.clj`: the
  suites pass and the identities hold; its own gate (`rd5`) was not rerun here.
- **The second-machine question reader serving `find`** (`rd5/second-reader.sh RD5_CROSS_INDEX=1`): written, not run
  anywhere (as XQ7's second-machine path).
- **The owner's console** still runs `dx-con1-app`; the switch steps (section 6) are written, not run.
- **"Off means 404" inside the suites:** the suites' probe of the ID list, sweep and `find` routes on a database that does
  not exist gets the gateway's database-not-found answer before any route check, with the options off and on alike,
  so it shows nothing; the option-off state is shown instead by the stored log (equal to the base's), the identities
  and the shapes twin (2,244 of 2,244 identical).
- **The question reader's fairness bound** (XQ7 gate (f)): one arm of eight over two runs had a page with 4
  admissions ahead where the gate allows 2; the repeat passed every arm. Not traced.
- **Release-written values** (settlement): both routes read stored facts only, as their pages state; unchanged.
