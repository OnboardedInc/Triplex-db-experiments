# CX-VA01-040: contract 0.4.0, round 2

Verdict: **ACCEPT** for the repaired contract and offline integration. F1 and F2 are closed. The historical Q45a violation remains recorded; this verdict does not certify the defective intermediate commits or qualify a live engine, workload or performance result.

Candidate: `contract/0.4.0` at `35cb04b55309c35c5dd120ee05b5c0ac8e5ad7fa`. Builder's gated implementation/main merge: `a2b1271f7c302368c5a9b0eb12f597f04f17184d`, incorporating main `1c2ee46f53cf3b8bb9498c8dc38c0c2526569bb5`. Independent executions below ran on committed reviewer integration `8fd292918694f31eb970312ee600c8dad3d1b84a`, on `verify/A01-040`. Candidate is its ancestor, and `git diff 35cb04b5 HEAD -- . ':(exclude)lab/verify/A01'` is empty. The only generated merge conflicts were resolved with the candidate's exact `ACCEPTANCE.md` and `obligations.json` bytes. No reviewed implementation was fixed by this reviewer.

## Findings and dispositions

### F1, formerly P1 — closed: stale O-CONTRACT runner pin

At `lab/acceptance/build_contract.py:6464`, `o_contract_runner_hashes()` hashes the actual generator and the final rendered projection. Assignment at line 6469 now follows every **projection-affecting** module assignment, including the Datomic image override. Both runner hashes equal disk bytes; the projection hash is `6fae9baacf3c36902fed3704526d50ec3788b05d1eddf6287b3989fc5438b266`. `checks_pin_OCONTRACT` at line 6473 recomputes the map, uses a missing-map-safe lookup and fails before writing. `main` also cross-checks the generated artifact and runner maps.

Precision: the source comment/report's phrase “after every module-level assignment” is not literally true. `PIN_STAGE_OCONTRACT` and `SCOPE_SOURCES +=` follow at lines 6471–6472. Neither affects `projection_text()`; its projection reads composition, composition fields, source variant fields, log fields and image pins. The later-mutation controls demonstrate fail-closed behavior if projection inputs change again. This wording issue does not reopen F1.

I independently injected all seven new mutations into an otherwise passing copied generator, without modifying `lab/acceptance/`. Every control returned exit 1 with structured `CONTRACT INVALID:` and the required specific diagnostic, rather than merely failing an unrelated check:

| Mutation | Required diagnostic observed |
| --- | --- |
| Late Datomic image assignment | O-CONTRACT runner pin is stale |
| Late projection/log field assignment | O-CONTRACT runner pin is stale |
| Wrong projection hash | O-CONTRACT runner pin is stale |
| Wrong generator source hash | O-CONTRACT runner pin is stale |
| Missing runner hash map | O-CONTRACT runner pin is stale |
| Wrong recorded stage hash | O-CONTRACT projection pin, diff or per-hunk workload note drift |
| Flipped workload-change note | O-CONTRACT projection pin, diff or per-hunk workload note drift |

Some mutants also trigger other legitimate guards; each includes its intended guard. Canonical inputs remain unchanged. Full stdout and mutant hashes are in `evidence-0.4.0-r2/mutation-results.json`.

`OCONTRACT-repin-review.json` accurately binds the single projection hunk to Git, `f3ed6211^1` → `f3ed6211`: `@@ -58,7 +58,7 @@`, changing only `imagePins.datomic.imageId`, from `sha256:34fb9db10a278ff5614e7ac59788a2456329c75d098871ce1831465e243f2dcf` to `sha256:aecbac4c6712d70d17dfba7b50cabaaf727aef6b3e72ec1fe2000b5523b36bcf`. The complete JSON comparison finds no other changed leaf. No query, data, writer schedule or threshold changes. The expected O-CONTRACT identity answer changes for cases comparing that Datomic digest. The production runner was actually invoked by the fresh contract tests: the new digest gives `bound=true, imagesPinned=true`; the old gives `bound=true, imagesPinned=false`. Generator pin/check wiring does not change `contract_oracle_answer` or `contract_oracle_projection`. New engine measurements remain required.

### F2, formerly P2 — closed: G0 did not build W0

`lab/bin/gate.mjs:51` adds W0 only to G0's build/hash package list. `build()` and `hashDist()` consume that list; typechecking/vitest still consume the unchanged `lanePackages` at line 47. Other gates retain their prior package selection.

I retained the old W0 outputs at ignored `runs/verify/CX-VA01-040-r2/w0-before`, created an empty `packages/w0/dist`, recorded that empty directory and source HEAD, and ran G0 with **no manual W0 build**. Fresh run `G0-xtdb-20261109T125135Z-c026e9` passed 1289/1289 tests, with 140 expected skips and zero unexpected skips. Its build manifest binds 52 W0 files / 314,097 bytes, aggregate SHA256 `35a7ca1e2ec21e19b8e8d7e2bc9925b864d830d3afb5481443559af40fb4d983`. Every W0 file was rehashed and retained. The receipt records the exact committed head, contract hash, no source diff, no engine slot, nine matching heavy-parent grants and passing step results.

Counts and skips match round 1's successful XTDB G0. I also read the builder's three fresh `a2b1271f` receipts: XTDB 1289/140, Datomic 1344/66, QLever 1513/79 (executed/expected skips). All bind the same W0 aggregate. These two other lanes were not independently rerun in round 2.

### Historical Q45a breach — recorded, not retroactively repaired

Location: DF01 merge `f3ed6211`, `lab/acceptance/obligations.json` → `oracleRunners.O-CONTRACT.sha256`. Reproduction: compare its stored projection hash with the projection bytes at that commit. The stale `82b3b4e0…` map persists through `4fa6192c`; the actual re-pin is in `a853fe42`. Severity of the original defect was P1 (F1). The fix prevents recurrence and repairs the current head; it cannot make the earlier merge satisfy Q45a's same-commit rule. The orchestrator explicitly chose not to rewrite history.

The literal answer to “was any evidence produced in that interval?” is **yes**. It would be inaccurate to say that no relied-on artifacts existed there:

- Eight tracked historical G0 receipts name `00589f84`, `372ff80d` or `739089ad`, inside the defective interval: five PASS and three FAIL. None of their paths, run IDs or receipt hashes is referenced by the current contract inputs, serialized contract or semantic registry. They are superseded, not adopted by this verdict.
- Thirteen still-pinned provenance inputs were introduced during the interval: QNODELAY review/diff (2), M01 review (1), CHECKJS review/two evaluator diffs/three oracle diffs (6), authority review (1), DF01 image review (1), and final CHECKJS review/diff (2). The exact paths, introducing commits and old receipt identities are enumerated in `evidence-0.4.0-r2/history-audit.json`.

Those thirteen are static Git-diff, literal-ruling and image-identity records, not answers computed by the stale O-CONTRACT runner. Fresh contract tests revalidate their content against named Git objects, current file hashes, hunk headers, unchanged executable oracle bodies and the image identity chain. No current semantic commit reference points into the defective interval. All obligation statuses remain `OPEN`, `buildSpec.argv` remains null, and qualification blockers remain present. Current round-2 gate evidence is from the repaired committed tree, independently checked below. Thus I accept current content without relying on a defective-interval gate/oracle result. I do **not** assert the stronger, false “no evidence from the interval” condition. Proposed treatment: retain the breach and supersession trail; do not reuse those old receipts as current qualification evidence. No history rewrite was performed.

## Main merge and fresh checks

All 100 literal pending rows on main `1c2ee46f` that are not compiled here survive byte-for-byte, representing 98 unique pending IDs. Only Q98a–i, Q101a and Q104a are newly compiled relative to the prior contract baseline. Compiled IDs are absent from the pending ID projection, which exactly equals the generator's pending parser. This includes preservation of the later Q100/Q102/Q103/Q105–Q108 rows as well as the earlier held rulings. The fresh 16-test suite also checks literal authority and policy projections.

Each command ran through its own heavy grant, on committed `8fd29291` with unchanged source inputs. `--verify` was a separate completed step before the evaluator. The candidate implementation bytes are identical on that head.

| Independent round-2 check | Result |
| --- | --- |
| `python3 -I -B lab/acceptance/build_contract.py --verify` | PASS; six generated outputs byte-identical on second regeneration |
| Evaluator `node --test lab/bin/test/claim.test.mjs lab/bin/test/claim-round2.test.mjs` | 108/108; zero fail, cancelled, skipped or todo |
| `regressions/test040.py` | 16/16, including actual production O-CONTRACT invocation and Git-bound re-pin review |
| Seven targeted new mutations | 7/7 rejected for intended diagnostics |
| Static/main/history audit | PASS after correcting the reviewer's history traversal |
| Empty-W0 offline XTDB G0 | PASS 1289/1289; 140 expected skips; 52 W0 outputs bound |
| Builder durable evidence integrity | All 98 manifest entries rehashed; three repaired-tree G0 receipts inspected |

First reviewer-tool failures are retained, not rewritten as successes: `audit.log`/`audit.json` record an `IndexError` caused by relying on Git addition-history simplification; `audit-attempt2` uses first-parent object existence checks. `seal-attempt1.log`/`.py` record a duplicate-object read-only copy error; the corrected collector validates an existing identical content address instead of overwriting it. These failures did not modify reviewed inputs or invalidate the already completed executions.

## Evidence and rule 9a audit

Durable round-2 root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-040/r2/`. Small summaries, exact terminal receipt and the SHA256 index are committed under `lab/verify/A01/evidence-0.4.0-r2/`. The index binds **161 files / 3,632,709 bytes**, all reread after logs closed; index SHA256 `0ef229aad841013b1fb9f675bfa4786091bf0a4d90d564b88f0101f2359abbc9`. Raw gate objects/output and W0 bytes stay outside Git. Round-1 evidence and its FIX-FIRST report remain intact.

Every reviewer-authored place that turns observations into a successful check, receipt or verdict is listed here:

1. `r2/review.py:command`: retains actual stdout, exit, command, start/end time, committed head, tool preimage hash, matching newly observed heavy-owner bytes and before/after input hashes. Success is not adopted from exit alone: `seal.py` checks the specific output content. Exclusive log creation prevents silently reusing an old attempt.
2. `r2/review.py:mutations`: verifies the copied baseline first, then requires structured invalid content, nonzero exit and each specific expected message. Fresh isolated copied source is hashed per mutant; canonical source snapshots must remain unchanged.
3. `r2/review.py:audit`: compares actual current and historical Git bytes, literal pending rows, exact new ruling set, actual runner hashes and changed projection leaves. History findings are tied to exact commit ancestry and artifact identities; the report explicitly preserves the distinction between static metadata and semantic evidence.
4. `r2/seal.py`: rehashes closed command logs and tool/owner preimages, checks expected TAP counts/contract output/mutation messages, and verifies source stability. For the fresh G0 it checks committed head, contract bytes, experiment, offline null slot, step outcomes, precise counts/skips, nine parent grants and the time envelope after the recorded empty dist. It verifies every object size/hash and every W0 output against the gate manifest before retention. Original terminal receipt removal occurs only after byte-equal durable/Git copies and completed checks.
5. `r2/seal.py`'s builder-evidence adoption and `artifact-audit.json`: verify all 98 source-manifest bytes and exact repaired-tree receipt heads/W0 hashes; explicitly mark builder gates as not independently rerun. The final SHA256 manifest is created from closed files and every entry is reread. This establishes artifact integrity, not live execution freshness for builder jobs.
6. This report's ACCEPT combines those fresh checks and source inspection for the exact candidate-equivalent committed tree. Historical receipts stay historical; pending obligations stay open. No result is promoted to live or performance acceptance.

No reviewer-authored tool/report file is a current contract pin. Importing the candidate into the review branch moved these existing pinned/generated bytes relative to round-1 review head `4d487ce5`; they are candidate bytes, not reviewer edits (old → new SHA256):

| Path | Old | New |
| --- | --- | --- |
| `lab/acceptance/build_contract.py` | `653cec719e6f7f8964b00aca1f8ba1b40325e7b645153743059b0df3674a87db` | `05a8bffe27edf6a669fa405120a2ebad401ea241ef88f1f4b935befb2d6d19f5` |
| `lab/acceptance/obligations.json` | `1d270d69aea640702fb5c7af1b5542fc4923d1428c4009320a47b34e78132355` | `dff8ab607624fdd8ccba7af2ee2034b4a2ae6080fc493aacd8d6e119a940d7f5` |
| `lab/acceptance/ACCEPTANCE.md` | `d8c7e68174b6be46d7caedea03d45445c2769dae7a20a32002a642b46ae96945` | `33d03e097e30df7526f28027f7a82100ffe99a6be8fa1db1c4058be8e45e8bcb` |

Execution source `lab/bin/gate.mjs` also changes from `b16bf528e849d19811d0c6958a5e3f6968a268956e2439fff36f76067594fffd` to `1d3368558035b424e014f296371964e0301d4d2cb52a659559aa7fcaf954032a`. The already-correct projection file remains unchanged; only its stale runner-map value is corrected. The builder's own full pin/re-pin history remains in the two reports and `OCONTRACT-repin-review.json`.

## Limits and open questions

No blocking question remains for this scoped re-review. I did not rerun the other 34 existing mutations, the lab pack gate, Datomic/QLever G0, live engine gates, PAIR or benchmarks in round 2; the new fixes received the independent checks listed above, and builder round-2 artifacts were integrity-checked separately. No container lifecycle changes, main checkout edits, main merge, push or history rewrite occurred. This review does not make any claim about main commits after the explicitly reviewed `1c2ee46f` merge.
