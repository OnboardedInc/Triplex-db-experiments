# EXP-X02 round-5 QA — CX-VX02-3

**Verdict: ACCEPT for the F1-R4/F2-R4/F3-R4 repair at `7b11af08b847fecf0667842a6e0b31139729373b`.** No remaining reproducible product finding emerged from the requested regression and lexer checks. Fresh clean-source G0 passes **968/968**. The round-4 independent safe matrix now passes **162/162**, and all **2,362** unsafe controls fail typed before answer dispatch. The generated lexer comparison exercises **all 363 non-fragment token classes** and finds **zero admitted token-boundary mismatches** among conclusive cases. **Twelve extreme comment cases remain oracle-inconclusive because the separate 128 MiB reference JVM exhausted its heap**; they are explicitly excluded from agreement claims. This verdict accepts this repair, not full X02 qualification.

**North star:** correctness floor for P1 exact-cut reads and P4 current reads. Goals and targets come only from main-checkout `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure follows `CLAUDE.md` and `lab/PROTOCOL.md`. Q79f remains in `RULINGS-PENDING.md:179`; this dispatch expressly supplies it as the QA requirement, not a claim that it is compiled production acceptance. The actual row is retained in `round5/ruling-Q79f.txt`. Reviewer branch began at `fe12d1c`. No product implementation was edited.

## Disposition of the round-4 findings

| Finding | Reviewed implementation at `7b11af0` | Fresh independent result |
| --- | --- | --- |
| F1-R4, identifier boundaries | `packages/xtdb/src/native/SqlTokens.ts:5–69` selects longest matches from pinned patterns, consumes whole identifiers/quoted tokens and handles dollar mode separately | All 18 prior quoted/dollar-identifier false refusals now return the raw engine answer. All four original unsafe dollar/backtick controls and both exact CTE follow-ups now fail typed with **no answer dispatch**. Two exact-contract safe CTE controls still match real XTDB. |
| F2-R4, grouped suffixes | `ReadOnlySql.ts:34–83`, invoked at expression level | All **15/15** prior ORDER BY/LIMIT/OFFSET/FETCH/grouped-compound controls now match XTDB for ANY/SOME/ALL. |
| F3-R4, nested comments | `SqlTokens.ts:19–35` uses an iterative nesting counter | All **3/3** prior nested-comment query controls now match XTDB. Additional comment boundaries are compared with the actual resident lexer below. Unterminated comments and unsupported characters are refused. |

There are **no new findings requiring a product fix**. The unresolved deep-comment oracle resource observations below are verification limits, not silently promoted passes or demonstrated tokenizer disagreements.

## Round-4 and earlier regressions rerun

Evidence paths in the remainder of this report are relative to `lab/verify/X02/round5/`.

| Check | Fresh result | Evidence |
| --- | --- | --- |
| G0, clean committed source | **968 executed / 968 pass / 0 fail / 130 expected skips / 0 unexpected** | `G0-receipt.json`, `G0-raw/`, `G0.log` |
| Original generated safe grammar | **1,818/1,818** complete public/raw row matches | `grammar-review.json`, safe origin `author-generator` |
| Earlier six UNION and six original parenthesized regressions | **12/12** public/raw matches, including ALL's empty answers | Same file, origin `reviewer-previous` |
| Round-4 reviewer safe matrix | **162/162** public/raw matches; all previous 36 safe refusals repaired | Same file, origin `independent` |
| Round-4 unsafe matrix | **2,362/2,362** typed pre-dispatch refusals: 1,818 original generated mutations, 468 independent grammar/comparison controls, 72 ordinary modifying/control statements, 4 identifier-boundary controls | Same file, unsafe array |
| Round-4 spot set | **21/21 expected dispositions**: 12 supported controls match; 9 invalid lexical/syntax spellings fail typed and are also rejected directly by the engine | `spot.json`, `spot.log` |
| Original unsafe identifier controls | **4/4** local/public refusals, no answer dispatch | `check-offline.json`, `.log` |
| Exact-contract CTE follow-ups | **2/2** safe real public/raw matches; **2/2** unsafe variants refused before mock answer dispatch | `boundary-confirmation.json`, `.log` |
| Earlier F1-R2 subqueries | **6/6** supported public/raw results | `subquery-regression.json`, `.log` |
| Earlier SQL/compiler diagnostics | All **13** records retain expected disposition: four envelope/public refusals, three raw cast controls, two exact-compute compiler refusals | `source-hazards.json`, `.jsonl`, `probe-source.log` |
| Earlier sum diagnostics | **20/20** original and **30/30** expanded controls; both languages; overflow recovery retained | `source-sums.json`, `delta-sums.json`, corresponding logs |
| Earlier offline diagnostics | **10** inventory boundaries, **120** exact-compute/input checks, **213** mixed-default task executions, ordinary default check; **13/13** original source-map checks | `delta-offline.json`, `offline-source.json`, corresponding logs |
| Generated lexer reproduction | **Derived 48 token patterns; `--check` passed** | `generator-check.log` |
| Builder evidence audit | **89/89** indexed hashes match the builder worktree | `author-manifest-audit.json` |

The main grammar run retains **1,995** safe/control records and **1,992** complete matches. Its other three records are the same separately classified boundary diagnostics from round 4: two real queries deliberately return an extra identifier-named column and fail the v-only result schema; the SELECT-only multiple-statement control is now correctly refused locally. These are not safe-shape regressions. The separate exact-contract CTE follow-up verifies the legitimate identifier spellings through the actual provider without extra result columns.

The earlier unchanged `delta-live.ts` expectations still match **20/22** literally. The two exceptions remain the previously documented engine-invalid `k = (ANY...)` and `k = ((SOME...))` spellings: they fail typed and have raw engine syntax errors. No historical expectation was rewritten to hide those differences. The raw DECIMAL→BIGINT control still demonstrates the known engine rounding hazard; generated exact Datalog compute still refuses typed. This repair does not claim precision safety for arbitrary authored arithmetic.

## Independent lexer oracle and generated coverage

The local machine has no installed Java runtime. The independent oracle therefore uses the **actual `xtdb.antlr.SqlLexer` class already in tx2-xtdb-dev**, rather than installing a runtime or reimplementing the builder's expected regexes. A separate, read-only JVM process in that container lexes input strings; it does not call the XTDB SQL API, transaction API or server JVM. Unsafe-looking text is lexer input data only.

`lexer-oracle.clj` instantiates that generated ANTLR lexer and overrides only `skip()` to emit otherwise skipped comment/whitespace tokens on a hidden channel. Its ATN, lexical rules, longest-match behavior, dollar-mode transitions and delimiter predicate remain the resident implementation. Metadata records ANTLR runtime **4.13.2** and actual maximum Java heap **129,761,280 bytes**. The child process uses `-Xmx128m`, a 16 MiB direct-memory setting and one active processor; `JDK_JAVA_OPTIONS` is cleared for this child only. The resident service environment and configuration are unchanged. This is a Java heap cap, not a claim of whole-process RSS containment.

`oracle-container-binding.json` records the exact container/image/start identity; `oracle-class-binding.json` hashes the loaded class bytes as **`0b5338bc8a285e81a8543230872f886a84ea607a051b3ef1ac373512ea44b4a4`**. `oracle-execution.json` and `oracle-fresh-execution.json` retain actual command arguments, input counts and executed Clojure source hashes. No new container, engine or exclusive reservation was created.

`generate-lexer-inputs.py` parses the retained pinned `SqlLexer.g4` productions to generate **5,387 unique input strings**. This generator supplies test inputs, not expected tokenization. The reference is the running generated lexer. The fixture is byte-identical to the reviewed package fixture, SHA-256 **`3d7f01c3d638fea7765279da259112a805ca8061e374ec952ab253a8b1fd9c0a`**.

Generation covers every non-fragment rule, with lexical neighbors and case variations, then adds stateful and edge cases:

- All keyword spellings and regular identifiers, dollar-bearing continuations, double-quoted/backtick identifiers, doubled delimiters, quoted Unicode, and unsupported unquoted Unicode.
- Ordinary character strings, C escapes, binary strings, dollar strings with six delimiter forms, mismatched delimiter case, overlapping dollar text, closed/unterminated modes and embedded apparent SQL.
- Integer/float/exponent boundaries, parameters, punctuation, every operator class and adjacent operator combinations, including comment/operator prefixes.
- CR, LF and CRLF line comments; nested block comments with quote/keyword/Unicode payloads at depths **1, 2, 3, 4, 8, 16, 64, 257, 1,024 and 4,096**; truncated boundaries and unterminated controls.
- ASCII SQL whitespace and the tested Unicode space/control characters, including U+0085, NBSP, U+1680, U+2000–U+200A, U+2028/U+2029, U+202F, U+205F, U+3000, BOM and zero-width characters.

The oracle outputs observed tokens, start/end offsets, errors and final mode. Java code-point offsets are converted to UTF-16 offsets for comparison with TypeScript. Keywords are normalized to the complete word boundary used by the product, and dollar-mode opening/text/closing tokens are coalesced into one quoted span. Original text and span boundaries must match exactly; these normalizations do not erase boundary differences. Comments and whitespace are compared too.

The product tokenizer exposes normalized tokens but no offsets. `traced-SqlTokens.ts` is an **observational copy under this review directory**, with only span-appending instrumentation and its import rebound to the target's generated patterns. `tracing.patch` and `tracing-provenance.json` preserve the exact transformation. Every input runs **both the unmodified product function and this copy**, requiring identical return values or errors. **5,387/5,387 instrumented behavior checks agree**. No product source or dist file was instrumented or edited.

### Final lexer comparison

| Disposition | Count | Meaning |
| --- | ---: | --- |
| Exact agreement | **4,546** | Admitted input; reference lexing, every boundary, token output and word output agree. |
| Refused despite lexically valid reference stream | **32** | **28** strict unterminated-comment refusals and **4** one-statement-policy refusals. A lexer can tokenize text that is forbidden as a native read. These were refused, as Q79f requires. |
| Invalid/incomplete reference lexing and refused locally | **797** | Unsupported characters, invalid quoted forms or incomplete modes fail closed. |
| Admitted boundary/error mismatch | **0** | No reproducible fail-open tokenizer disagreement in conclusive cases. |
| Oracle resource gap | **12** | Depth 1,024/4,096 comment cases exhausted the separate reference JVM heap; no comparison verdict adopted. |

All **363/363 non-fragment token classes** from the pinned fixture were actually observed in reference output; there are no missing token classes. `lexer-generation.json` records the expected rules, and `lexer-comparison-final.json` records observed classes and each disposition. This is rule-class coverage over a finite generated suite, not proof over every possible string or an unbounded nesting claim.

**Resource observations remain open.** Six balanced and six truncated comment cases at depths 1,024/4,096 exhaust the 128 MiB oracle heap. A new attempt constructs fresh DFA and prediction-context caches per input, using the same ATN and heap cap; all twelve remain resource-inconclusive. `oracle-fresh-freeze.json`, `lexer-oracle-fresh.clj`, `oracle-fresh.jsonl` and its execution receipt preserve that rerun and reason. These strings were never submitted to the SQL endpoint. The local tokenizer handles the balanced inputs and refuses the truncated ones, but independent token-boundary agreement at those two extreme depths was **not verified**. Conclusive comment tests reach depth 257. No heap increase or shared-service configuration change was attempted.

## Reproduction and evidence integrity

All commands run through shared heavy admission. From the verifier worktree, the retained exact runner is:

```sh
node lab/bin/heavy.mjs --label CX-VX02-5-regressions -- node lab/verify/X02/round5/run-regressions.mjs
node lab/bin/heavy.mjs --label CX-VX02-5-lexer-oracle -- python3 lab/verify/X02/round5/run-oracle.py
node lab/bin/heavy.mjs --label CX-VX02-5-oracle-fresh-context -- python3 lab/verify/X02/round5/run-oracle-fresh.py
node lab/bin/heavy.mjs --label CX-VX02-5-boundary-comparison-final -- node --import tsx lab/verify/X02/round5/compare-lexer-final.ts
```

These output files already exist and are retained. For reruns, copy the tools into a new attempt directory, bind the same target, and select fresh exclusive output/log names. Complete the oracle before comparison; do not overwrite an earlier attempt. `regression-exec-outcomes.json` and `exec-outcomes.json` retain actual step/process outcomes separately from semantic assertions.

The first boundary comparison was launched while the oracle output was still partial and rejected **5,315/5,387** records before publishing a semantic JSON; its failure log remains. The next completed comparison originally mislabeled six admitted inputs whose oracle had an OutOfMemoryError as mismatches. That original `lexer-comparison.json` and log remain unchanged. The final comparator explicitly separates all twelve oracle resource exceptions, consumes the fresh-cache attempt and records zero *conclusive* admitted mismatches. This is correction of a verifier classification error, not erasure of product failures or adoption of oracle OOM as valid lexing. Both comparison sources and raw attempts are retained.

G0 ID: **`G0-xtdb-20261108T231524Z-f60cae`**. Detached target **`round5/target/`** is exactly `7b11af0`, with no tracked product or lockfile changes. G0 records `dirty:false`, exact HEAD/tree, empty tracked patch, Node `v22.23.2`, pnpm `10.11.0`, source/build/input hashes and raw steps. Existing dependency/workspace links were copied; there was no install or lockfile/config change. Fresh builds use declared scripts. Four source-map checks independently bind ReadOnlySql, SqlTokens, SqlLexerPatterns and NativeQueries to the built outputs; the older probes additionally match 13 source-map embeddings.

G0 used the unchanged committed owned-store pnpm shim disclosed in prior rounds: unchanged declared build/typecheck scripts and installed Vitest, because pinned pnpm rejects store-dir on these recursive run/exec forms; its actual pnpm version call uses the required owned store. This is not a root `pnpm check` claim. Command from the target:

```sh
PATH="$PWD/lab/experiments/EXP-X02-xtql-parity/round2/bin:$PATH" node lab/bin/heavy.mjs --label CX-VX02-5-G0 -- node lab/bin/gate.mjs G0 --lane xtdb --exp CX-VX02-5 --note 'Independent clean 7b11af0 Q79f lexer review; unchanged owned-store shim'
```

`summary.json` checks semantic denominators independently of exits. `manifest.json` hashes tools, input/output bytes, retained failures, actual oracle identity, source/build files and this report; it also binds the earlier retained regression inputs. Target-local G0 content-addressed preimages remain under `target/runs/objects/`; the target is gitignored and reconstructible from the reviewed commit. Snapshot/hash receipts do not retroactively claim old diagnostic results as fresh or all tools as frozen before execution.

All actual database queries were read-only virtual-relation diagnostics against **shared tx2-xtdb-dev at 127.0.0.1:5470**, one connection per process and 15-second timeouts. Unsafe SQL used recording clients or the lexer-only oracle; **no modifying statement was sent to XTDB for execution**. Clients close in finally; subprocesses finish and release heavy grants. Admission waits were respected, and disk snapshots exceed the 5 GiB host-free floor. Final engine status remains running/healthy/READY. Docker used only the private triplex2 socket; there was no lifecycle operation, resident restart, exclusive slot, fixture write, unrelated service, excluded port or default daemon use.

## Remaining scope

The deep-comment oracle resource cases above remain unverified. The older exclusive qualification backlog also remains open: full pure-XTQL G2 and matched SQL packet with independent coverage across every builder; real D=8/D=9 recursion; dense 5,050-edge/125,000-walk/NULL/plan controls; seven incomplete writer-interleaving controls. Q58a's broader basis/token contract is separate. No exclusive run was attempted.

No full G1/G2, complete writer suite, performance/golden-scenario qualification, root-wide check, pack check, PostgreSQL/FoundationDB suite or combined X02+C8 verification was performed. No product fix, new dependency, main-checkout source edit, agent spawn, merge, push, deployment or publication occurred. No policy clarification is required for the repaired round-4 findings under the supplied Q79f.
