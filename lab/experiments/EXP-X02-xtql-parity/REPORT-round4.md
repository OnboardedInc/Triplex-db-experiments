# EXP-X02 round 4 — CX-X02-R3

Result: **F1-R4, F2-R4 and F3-R4 repaired for independent review**, under the dispatch's Q79f. This is a builder hand-back, not independent verification or promotion. Baseline: `416d84e6d4870a9902e122f0aa873facf2f0f997`. The reviewer report and its case inputs were read from the read-only `verify/X02` worktree named in the task; retained copies/inputs are under `round4/`.

North star: correctness floor for P1 exact-cut reads and P4 current reads. Goals and targets come only from main-checkout `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Q79f in main-checkout `lab/acceptance/RULINGS-PENDING.md` governs lexer alignment and nested comments; Q79e's query-expression requirement governs grouped suffixes. These are expressly supplied dispatch requirements, not a claim that pending rulings are frozen production acceptance.

## Repairs

**F1-R4 — token boundaries.** `scripts/generate-xtdb-lexer.mjs` derives regular token patterns from the retained XTDB v2.2.0 `SqlLexer.g4`. It expands the pinned fragments, quoted terminals, character classes, negation, alternatives and repetition into regexes; unfamiliar grammar syntax fails generation. `SqlLexerPatterns.ts` is generated, source-hash bound and reproducible with `--check`.

`SqlTokens.ts` applies longest-match token boundaries, preserving declaration order for ties. Regular identifiers consume dollar continuations before dollar-tag interpretation; double-quoted/backtick identifiers consume their entire escaped-delimiter form. Ordinary strings, C-escape strings, binary strings, numeric tokens, parameters, punctuation and operators use the derived patterns. Keyword spellings share the complete regular-identifier boundary and are classified only after consumption. The full seven comparison operators now remain whole tokens.

Only the lexer's ASCII whitespace is skipped. Unsupported characters, malformed quotes, missing dollar-string delimiters and other unrecognized token boundaries fail closed; JavaScript's broader whitespace/Unicode normalization is not applied. Quoted Unicode follows the pinned delimited-identifier rule; unsupported unquoted Unicode is refused. This is a boundary-compatible lexical envelope, not a complete ANTLR parser or a promise that every SQL token sequence is semantically valid.

**F3-R4 — nested comments.** LINE_COMMENT follows the pinned CR/LF boundary. BLOCK_COMMENT follows the pinned recursive production through an iterative nesting counter: quotes, parentheses and keywords inside comments have no special role; every nested opener must close. Unterminated comments fail typed. There is no application-imposed comment-depth cap and no JavaScript call-stack recursion for comments.

**F2-R4 — expression suffixes.** The query-expression classifier consumes ORDER BY and the pinned offsetAndLimit productions after grouped/compound bodies: OFFSET with optional ROW/ROWS, LIMIT, and FETCH FIRST/NEXT with optional count, ROW/ROWS and ONLY. Offset and fetch may occur in either permitted order. Counts accept the pinned unsigned-integer/parameter forms. Balanced sort-expression groups remain opaque SQL for the engine to validate. Missing productions, suffixes in the wrong order and a set arm after a completed suffix are refused.

Full statement/forbidden-word checks and the scan of every nested quantified comparison remain. An admitted outer query or ORDER BY expression cannot conceal an unsafe comparison. No schema, arithmetic, routing, dependency, engine configuration or public export changed. All modified/new package code is in the private XTDB package.

## Generated tests and fresh results

The original `queryExpressionCorpus()` and its **1,818** cases are unchanged. A separate generator adds:

- **234 identifier cases:** 13 representative regular/dollar-bearing/double-quoted/backtick/escaped-delimiter/quoted-Unicode pairs × depths 1–3 × absent/present nested comments × ANY/SOME/ALL.
- **45 nested-comment cases:** depths 1, 2, 3, 8 and 64 × three embedded quote/parenthesis/keyword payloads × all quantifiers.
- **2,700 suffix cases:** three grouped SELECT/VALUES/compound bodies × ORDER BY absent/present × 25 offset/fetch combinations × depths 1–3 × comments absent/present × all quantifiers.
- **351 unsafe boundary/set/suffix mutations** and **18 malformed/unsupported lexer or grammar controls**, including second statements, unterminated comments, Unicode boundary mismatches and invalid suffixes.

The unit provider test requires dispatch for generated safe cases and typed failure without answer dispatch for unsafe/malformed cases. Live safe comparisons use complete public rows versus freshly executed raw XTDB rows, preserving empty answers. Unsafe text runs only through actual public providers with recording clients; mutation statements and known-hazard array predicates are never executed directly against the resident.

| Fresh check | Result | Evidence under `round4/` |
| --- | --- | --- |
| Final G0 | **968 executed / 968 pass / 0 fail / 130 expected skips / 0 unexpected** | `G0-receipt.json`, `G0-raw/`, `G0-final.log` |
| Original safe grammar | **1,818/1,818** public/raw row matches | `grammar-live.json`, `.json.jsonl`, `.log` |
| Original generated unsafe set | **1,818/1,818** typed pre-dispatch refusals | Same file, `unsafe` array; explicit `answerDispatched:false` |
| New generated safe lexer/suffix cases | **2,979/2,979** public/raw row matches | `lexer-live.json`, `.json.jsonl`, `.log` |
| Reviewer's exact supported cases | **174/174** public/raw matches: 162 independent + 12 prior regressions | Same file, `safe` origin `reviewer`; `reviewer-cases.json` |
| Reviewer's spot cases | **21/21** expected dispositions: supported queries match, engine-invalid spellings fail typed | Same file, separate `spot` array |
| Unsafe/malformed expanded set | **915/915** typed pre-dispatch refusals: 351 generated unsafe + 18 generated malformed + 544 reviewer + two exact CTE boundary follow-ups | Same file, `unsafe` array |
| Earlier subqueries/token/compiler controls | Six F1-R2 matches; 22/22 token outcomes; all 13 SQL/compiler records retain expected disposition | `subquery-regression.json`, `delta-live.json`, `source-hazards.json` and logs |
| Earlier arithmetic/default diagnostics | 20/20 and 30/30 sums; 10 inventory boundaries; 120 exact-compute/input checks; 213 default-routing executions; 13 source-map matches | `source-sums.json`, `delta-sums.json`, `delta-offline.json`, `offline-source.json` and logs |
| Format/lint/regeneration | oxfmt passes; oxlint zero warnings/errors; lexer `--check` and `git diff --check` pass | Commands below |

The six minimal reviewer UNION cases also remain in `grammar-live.json`'s separate `reviewer` array and match the engine. These overlap the retained prior-regression controls; they are not additional unique coverage. All denominators refer to the named fresh result arrays, not wrapper exits or global X02 completion.

`exec-outcomes.json` retains the nine actual probe exits. `collect.py` separately checks semantic records, counts, corpus uniqueness, no-answer-dispatch flags, source-map correspondence and G0 source hashes. `summary.json` preserves counts; `manifest.json` indexes tools, inputs and outputs. `source.patch` preserves the tracked delta; newly added lexer/generator files are committed and hash-bound separately.

## Source derivation and execution

Pinned primary sources are XTDB v2.2.0 [SqlLexer.g4](https://raw.githubusercontent.com/xtdb/xtdb/v2.2.0/core/src/main/antlr/xtdb/antlr/SqlLexer.g4) and [Sql.g4](https://raw.githubusercontent.com/xtdb/xtdb/v2.2.0/core/src/main/antlr/xtdb/antlr/Sql.g4). This round copied their byte-retained local reviewer versions; it did not claim a new network download. Lexer fixture SHA-256 is `3d7f01c3d638fea7765279da259112a805ca8061e374ec952ab253a8b1fd9c0a`. The fixture is `packages/xtdb/test/fixtures/SqlLexer-v2.2.0.g4`; parser grammar and the reviewer's original download provenance are retained here.

The generator emits **48** boundary patterns. Single-word keyword rules are represented by the same complete regular-identifier lexeme boundary instead of hundreds of duplicate regex matches. Recursive comments and dollar-mode delimiter equality are implemented as explicit state, adapting the pinned lexer rather than pretending regular expressions express recursive comments. This adds no lexer runtime dependency.

Commands from this worktree:

```sh
node scripts/generate-xtdb-lexer.mjs --check
PATH="$PWD/lab/experiments/EXP-X02-xtql-parity/round2/bin:$PATH" node lab/bin/heavy.mjs --label CX-X02-R4-G0-final -- node lab/bin/gate.mjs G0 --lane xtdb --exp CX-X02-R4 --previous G0-xtdb-20261108T230523Z-50f390 --note 'Final formatted grammar-derived lexer; no semantic change from initial passing run'
DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock node lab/bin/heavy.mjs --label CX-X02-R4-live -- node lab/experiments/EXP-X02-xtql-parity/round4/run-probes.mjs
node lab/bin/heavy.mjs --label CX-X02-R4-evidence -- python3 lab/experiments/EXP-X02-xtql-parity/round4/collect.py
node_modules/.bin/oxfmt --check packages/xtdb/src/native/ReadOnlySql.ts packages/xtdb/src/native/SqlTokens.ts packages/xtdb/src/native/SqlLexerPatterns.ts packages/xtdb/test/native-query.test.ts packages/xtdb/test/query-expression-corpus.ts scripts/generate-xtdb-lexer.mjs
node_modules/.bin/oxlint packages/xtdb/src/native/ReadOnlySql.ts packages/xtdb/src/native/SqlTokens.ts packages/xtdb/src/native/SqlLexerPatterns.ts packages/xtdb/test/native-query.test.ts packages/xtdb/test/query-expression-corpus.ts scripts/generate-xtdb-lexer.mjs
git diff --check
```

Live outputs use exclusive creation; retain them and select fresh output/log names for reruns. The runner takes one shared heavy grant and executes probes sequentially. Prior probes retain their original inputs, the earlier disclosed import/output adaptations and two engine-invalid parenthesized-quantifier expectations. This round changes the original 1,818 unsafe executions to recording clients and adds explicit no-answer-dispatch assertions; safe SQL inputs remain unchanged. The exact reviewer cases are extracted from its retained JSON, rather than inferred from prose.

Final G0 is `G0-xtdb-20261108T230612Z-2a04a8`. Initial `G0-xtdb-20261108T230523Z-50f390` also passed 968/968; the final attempt follows deterministic formatting of the generated pattern module. Both receipts and initial log are retained. Final package source/tests were unchanged during live execution.

Both G0 attempts use the unchanged committed round-2 owned-store pnpm shim: unchanged package build/typecheck scripts in order and installed Vitest, because pinned pnpm rejects store-dir on recursive run/exec; its actual pnpm version call supplies the required owned store. This is not an unmodified root check. No install, lockfile or pnpm configuration change occurred. Optional stash capture printed `error: could not write index`; receipts preserve dirty working-source hashes, patch/build evidence and no stash snapshot. The containing commit preserves final source; these are not clean-commit G0 claims.

Heavy admission waits were respected. Disk snapshots remain above the 5 GiB floor. Every live process used shared XTDB `127.0.0.1:5470`, the private Docker host, one connection, 15-second query timeouts and virtual relations; clients close in finally. No fixture writes, exclusive reservation, lifecycle operation or resident restart occurred.

## Open work and limits

Independent review of the committed repair remains required. This round does not close the prior exclusive qualification backlog: full pure-XTQL G2 and matched SQL packet, real D=8/D=9 recursion, dense graph/NULL/plan checks or incomplete writer-interleaving controls. Q58a's broader basis/token contract remains separate. Exact Datalog compute still fails typed until an exact lowering is qualified; the raw engine cast control still demonstrates its known precision hazard.

No full G1/G2, performance/golden-scenario qualification, root-wide check, pack check or PostgreSQL/FoundationDB integration was run. No main-checkout source edit, new dependency, public export, agent spawn, merge, push, deployment or publication occurred. Unrelated historical untracked receipts remain untouched.
