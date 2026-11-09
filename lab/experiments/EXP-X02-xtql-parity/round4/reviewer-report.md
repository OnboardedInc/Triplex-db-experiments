# EXP-X02 round-4 review — CX-VX02-3

**Verdict: FIX-FIRST.** Independently reviewed **`416d84e6d4870a9902e122f0aa873facf2f0f997`** against `200d669`, from reviewer branch `verify/X02` at `dc4857b`. All **1,818** builder-generated safe cases and all **12** prior six-case regressions now match XTDB. Fresh clean-source G0 passes **967/967**. The requested broader claim fails: identifier tokenization can hide unsafe operands and second statements; independent safe cases also expose quoted-identifier, grouped-query suffix and nested-comment refusals. No implementation was changed.

**North star:** correctness floor for P1 exact-cut reads and P4 current reads. Goals and targets come only from main-checkout `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure follows `CLAUDE.md` and `lab/PROTOCOL.md`. Q79e is currently a row in **`RULINGS-PENDING.md:155`**, not a compiled ruling. This dispatch expressly supplies it as the review requirement; this report does not claim it is already contractual production acceptance. `round4/ruling-Q79e.txt` retains the row read this round.

## F1-R4 — P1: identifier boundaries hide unsafe SQL from the guard

**Locations at `416d84e`: `packages/xtdb/src/native/ReadOnlySql.ts:42`, `:69–79`; related new false refusals at `:119`.**

The local lexer does not recognize backtick-delimited identifiers and excludes `$` from regular identifier continuations. It consequently mistakes a dollar tag *inside an identifier* for the start of a dollar-quoted string. Everything up to a later matching tag is skipped, including unsafe comparisons, semicolons and modifying keywords.

An actual query-shaped reproduction is:

```sql
WITH a$tag$ AS (SELECT 1)
SELECT 'x' AS v
WHERE 1 = ANY/**/(ARRAY[1,2])
  AND EXISTS(SELECT 1 AS z$tag$b)
```

Expected: local typed refusal before answer dispatch, as for other non-subquery ANY operands. Observed: `readOnlyNativeSql` accepts, and the actual public provider with a recording client dispatches the full answer SQL and succeeds on the mock response. Replacing only `ARRAY[1,2]` with `SELECT 1` produces a safe control that returns `[{"v":"x"}]` through **both the real public provider and direct XTDB**. The safe control establishes that these identifier spellings are legitimate engine syntax, rather than assuming a Unicode or token spelling the engine does not support. A backtick-delimited equivalent reproduces both outcomes.

A second-statement reproduction is:

```sql
SELECT 1 AS a$tag$; DELETE FROM tx_assertions; SELECT 2 AS z$tag$b
```

The guard also admits this text and the public provider dispatches it to a recording mock. A backtick version does the same. To verify actual lexical boundaries without writing data, a **SELECT-only three-statement control** was executed directly: XTDB returned three separate result sets, whereas the guard falsely treated it as one admissible query. The real public provider's outer `SELECT * FROM (...)` wrapper rejects that multi-statement control with an engine syntax error. **No DELETE, other mutation, or known-hazard array predicate was executed on the resident.** The evidence establishes failed local preflight and reachable unsafe answer dispatch; it does not establish a successful database mutation or a fresh live wrong answer. A mock Success is not engine semantic acceptance.

The same lexical mismatch causes **18 supported false refusals** in the independent safe matrix, of which **15 are newly rejected relative to `200d669`**. Example:

```sql
SELECT 'x' AS v WHERE 1 = ANY (SELECT 1 AS `UNION`)
```

The old guard admits it and XTDB returns `[{"v":"x"}]`; Q79e interprets UNION inside the backticks as a set operator and refuses it. Quoted INTERSECT/EXCEPT, doubled backticks around keyword text, and the regular identifier `a$UNION` show the same newly introduced regression for ANY/SOME/ALL. A backtick identifier containing `(` supplies another three existing false refusals. These availability symptoms share the same lexer repair and are not counted as separate defects.

**Evidence:** `round4/check-offline.json` (four unsafe admissions), `grammar-review.json` (`unsafe` origin `boundary-unsafe`, plus `safe` names `leaf-*-backtick-*` and `leaf-*-dollar-identifier`), and **`boundary-confirmation.json`** (two safe real-engine/public matches and two corresponding unsafe mock dispatches). `SqlLexer.g4:407–411` from pinned XTDB v2.2.0 explicitly allows `$` in regular identifiers and supports backtick identifiers with doubled-backtick escaping. These are lexical gaps inherited from `200d669`; the quoted-set-operator availability regression is newly introduced by Q79e. Earlier review rounds did not test this identifier interaction.

**Proposed fix:** tokenize the pinned identifier forms completely before interpreting dollar tags, set operators, comments or statement separators. Treat backticks and escaped backticks as a quoted identifier token; retain `$` inside regular identifiers so it cannot start a string. Then rerun the entire grammar corpus, these identifier controls, ordinary dollar strings, and all earlier unsafe refusals through the public provider. Keep whole-query mutation and nested-comparison scans. This requires lexer alignment, not more enumerated safe SQL strings.

## F2-R4 — P2: valid grouped query expressions with suffixes remain refused

**Location at `416d84e`: `packages/xtdb/src/native/ReadOnlySql.ts:131–132`.**

```sql
SELECT 'x' AS v WHERE 1 = ANY ((SELECT 1) LIMIT 1)
```

Expected and directly observed from XTDB: `[{"v":"x"}]`. Observed from the target public provider: typed non-subquery-operand refusal. Once the classifier consumes `(SELECT 1)`, it requires either the end of the operand or a set operator; it cannot consume the valid LIMIT suffix. ORDER BY, OFFSET, FETCH FIRST and a grouped set-expression with ORDER BY/LIMIT reproduce this across ANY/SOME/ALL: **15/15 independently executed supported false refusals**. All were also refused by `200d669`; this is an incomplete Q79e query-expression grammar, not a new regression attributed to this commit.

Pinned `Sql.g4:693–735` defines `queryExpressionNoWith := queryExpressionBody orderByClause? offsetAndLimit?`, with a grouped query as one possible body. These suffixes are valid parts of the query expression, not scalar/array operands. Ordinary ungrouped SELECT bodies may happen to admit the same suffix text because their bodies are opaque, making the refusal depend on an otherwise valid parenthesis layer.

**Evidence:** `grammar-review.json`, safe names `leaf-*-suffix-*`; the earlier independent `spot.json` includes five minimal ANY examples. All raw answers are retained separately from local errors; no timeout or Die determines this finding.

**Proposed fix:** recognize the pinned query-expression suffix productions at the expression level, including after grouped/compound bodies, while consuming the entire operand and still scanning every nested comparison. Add grammar-generated cases varying suffix presence, parenthesized body and set operations. If Q79e intends a narrower authored-native surface, that needs an explicit restriction; its current “any parenthesized query expression” wording supplies none.

## F3-R4 — P2: engine-supported nested block comments contradict unrestricted comment placement

**Location at `416d84e`: `packages/xtdb/src/native/ReadOnlySql.ts:29`.**

```sql
SELECT 'x' AS v WHERE 1 = ANY (SELECT /* a /* b */ c */ 1)
```

XTDB returns `[{"v":"x"}]`; the envelope refuses its explicitly non-nested-comment policy. ANY/SOME/ALL give **3/3** supported false refusals. Pinned `SqlLexer.g4:12` recursively defines `BLOCK_COMMENT`; nested comments are supported SQL syntax. This is a deliberate, pre-existing conservative restriction, not an accidental new regression. It remains a gap under Q79e's unrestricted “comments anywhere” requirement and the dispatch's broader safe-shape check.

**Evidence:** `grammar-review.json`, names `leaf-*-nested-block`, and `spot.json`'s `nested-comment`. **Proposed fix:** consume balanced nested block comments consistently with the pinned lexer, retaining errors for unterminated comments; add nesting depths and embedded quote/parenthesis tokens to generated controls. Alternatively, explicitly narrow the ruling to closed non-nested block comments instead of claiming unrestricted engine-supported comments.

## Independent execution and denominators

All following evidence paths are under `lab/verify/X02/round4/`.

| Check | Result | Evidence |
| --- | --- | --- |
| Fresh G0 on clean committed source | **967 executed / 967 pass / 0 fail / 130 expected skips / 0 unexpected** | `G0-receipt.json`, `G0-raw/`, `G0.log` |
| Builder-generated safe cases, independently rerun | **1,818/1,818** complete public/raw row matches | `grammar-review.json`, safe origin `author-generator` |
| Prior regressions | **12/12** match: all six UNION forms from round 3 and all six original parenthesized forms | Same file, origin `reviewer-previous`; original SQL read from retained reviewer JSON |
| Independent safe matrix | **162 cases: 126 public/raw matches, 36 supported false refusals, 0 raw engine errors** | Same file, origin `independent` |
| Builder's exact generated unsafe mutations, rerun with recording client | **1,818/1,818** typed refusals before answer dispatch | Same file, unsafe origin `author-mutation-rerun` |
| Independent unsafe grammar/comparison controls | **468/468** typed refusals before answer dispatch | Same file, unsafe origin `independent` |
| Ordinary mutation/control statements | **72/72** typed refusals before answer dispatch | Same file, unsafe origin `mutation` |
| Identifier-boundary unsafe controls | **0/4 refused; all four admitted and dispatched to mock** | Same file, unsafe origin `boundary-unsafe`; also `check-offline.json` |
| Exact-contract identifier follow-up | **2/2 safe real public/raw matches; 2/2 unsafe counterparts admitted to mock** | `boundary-confirmation.json` |
| Exploratory lexer/suffix controls | **21** retained, with all real provider results and raw rows/errors; no Die | `spot.json`, `spot.log` |
| Builder manifest audit | **75/75** recorded file hashes match the builder worktree | `author-manifest-audit.json` |

The main run totals **1,995 query/control records** and **2,362 unsafe mock records**. Its **1,956 public/raw matches** are the 1,818 + 12 + 126 above. The remaining 39 are **36 real safe refusals plus three separately classified boundary controls**, not 39 product findings. Of the latter, two deliberately return an extra identifier-named column and therefore fail the v-only row contract after engine execution; the third is the SELECT-only multi-statement control rejected by the engine's outer wrapper. Their exact results are retained. The follow-up moves identifier tags into an unused CTE so the real safe public controls have the exact row contract and both succeed.

The independent generation adds mixed UNION/INTERSECT/EXCEPT chains with **DISTINCT**, ANY/SOME/ALL case variation, depths **1, 4 and 9**, differently grouped arms, ordinary whitespace and comments containing Unicode/parentheses/CRLF. Its 108 such compound cases all match. Another 54 leaf/suffix cases exercise double quotes, escaped strings, dollar strings, backticks, doubled delimiters, dollar-bearing identifiers, Unicode identifiers and literals, nested comments, and suffixes. Unsafe controls vary all seven comparison spellings (`=`, `<>`, `!=`, `<`, `<=`, `>`, `>=`), all three quantifiers, four gaps, malformed/bare/wrapped operands, later set arms and deep nested comparisons. Ordinary mutation controls vary INSERT, UPDATE, DELETE, ERASE, DROP and SET across direct statements, second statements and CTE positions. Unsafe tests use a recording client; no modifying statement was sent to XTDB.

The spot controls retain **nine engine-invalid inputs**: unquoted reserved UNION as an alias, two Unicode keyword lookalikes, and six non-ASCII/non-SQL whitespace characters. Local admission of those spellings produces typed real-engine syntax failures, not a supported-query finding. The engine accepts the tested Unicode quoted content and ASCII case folding. JavaScript's broader `\s` does not establish that XTDB accepts those Unicode whitespace characters. No normalization or Unicode keyword equivalence is inferred.

## Reproduction, source binding and operations

From this reviewer worktree, choose fresh output/log names (tools use exclusive output creation):

```sh
DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock node lab/bin/heavy.mjs --label CX-VX02-4-grammar-new -- node --import tsx lab/verify/X02/round4/grammar-review.ts "$PWD/lab/verify/X02/round4/grammar-review-new.json"
DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock node lab/bin/heavy.mjs --label CX-VX02-4-boundary-new -- node --import tsx lab/verify/X02/round4/boundary-confirmation.ts "$PWD/lab/verify/X02/round4/boundary-confirmation-new.json"
```

The grammar tool imports the committed builder generator solely to rerun its exact corpus; its additional 162 safe cases and 544 unsafe controls are reviewer-authored, not builder-provided expectations. Every safe engine answer is compared with the same actual public-provider execution; empty answers remain empty. Unsafe acceptance is checked independently of the raw query grammar, using the real public provider and a recording client to require typed failure **and no answer dispatch**. The main tool exits one for its actual failures. Boundary confirmation exits zero when its safe controls succeed; its retained unsafe admissions still remain findings.

Detached target **`round4/target/`** is exactly `416d84e`, with no tracked product or lockfile changes. Existing dependency links were copied from the preceding reviewer target, with target-relative package links. No install or shared build edit occurred. G0 freshly built the packages; `build-source-check.json` verifies the built ReadOnlySql/NativeQueries source-map contents equal target source. `manifest.json` binds source/build files, lockfile, pnpm shim, tools, raw outputs and this report; target-local G0 content-addressed preimages remain retained under `target/runs/objects/`. The target is gitignored and reconstructible from the reviewed commit. Three main probe sources were hash-recorded before the queued grammar process started; none changed during execution. The later boundary follow-up is separately retained and hash-indexed, not retroactively presented as a pre-run freeze.

Fresh G0 ID: **`G0-xtdb-20261108T223604Z-8609c6`**. Receipt records `dirty:false`, exact HEAD/tree, empty tracked patch, Node `v22.23.2`, pnpm `10.11.0`, input/build hashes and all raw steps. Its unchanged committed owned-store shim runs unchanged declared package build/typecheck scripts and installed Vitest because pnpm 10.11 rejects store-dir on recursive run/exec; its actual pnpm version invocation uses the required owned store. This is the disclosed earlier-round adaptation, not a root `pnpm check` claim. From the target:

```sh
PATH="$PWD/lab/experiments/EXP-X02-xtql-parity/round2/bin:$PATH" node lab/bin/heavy.mjs --label CX-VX02-4-G0 -- node lab/bin/gate.mjs G0 --lane xtdb --exp CX-VX02-4 --note 'Independent committed 416d84e grammar review; unchanged owned-store shim'
```

Pinned primary sources [Sql.g4](https://raw.githubusercontent.com/xtdb/xtdb/v2.2.0/core/src/main/antlr/xtdb/antlr/Sql.g4) and [SqlLexer.g4](https://raw.githubusercontent.com/xtdb/xtdb/v2.2.0/core/src/main/antlr/xtdb/antlr/SqlLexer.g4) were downloaded without user-identifying parameters and retained byte-for-byte; `grammar-source-provenance.json` records URLs and hashes. Local engine execution, rather than assumed grammar acceptance, establishes every supported counterexample.

All live work used **only shared tx2-xtdb-dev at 127.0.0.1:5470**, one client connection per process, 15-second query timeouts and read-only virtual relations. Clients close in finally. Commands ran through heavy admission; the corpus process waited for a token and was not bypassed. Disk observations exceed the 5 GiB host-free floor. No exclusive slot, fixture writes, engine lifecycle operation, resident restart, unrelated service, excluded port or default Docker daemon was used. Engine status before/after is retained. The source-read-only main checkout was not edited.

`exec-outcomes.json` retains actual exits. The initial offline-boundary tool launch used a target cwd with an outer-relative creation path and failed module resolution before queries; `check-offline.log` remains, and the corrected attempt uses `check-offline-r2.log`. G0, spot and corrected offline/confirmation processes completed; the grammar process's exit one and all mismatches remain. No previous failure output was overwritten. `summary.json` preserves denominators independently of exit codes; `manifest.json` is the evidence index.

## Limits and remaining work

This is a Q79e guard review, not complete X02 qualification. The prior exclusive-slot backlog remains open: strict full pure-XTQL G2 and matched SQL packet with independent coverage across every builder; real D=8/D=9 recursion; dense 5,050-edge/125,000-walk control and NULL/plan checks; seven incomplete writer-interleaving controls. Q58a's broader native basis/token contract is separate. No exclusive run was attempted, as explicitly instructed.

No full G1/G2, full writer suite, performance/golden-scenario qualification, root-wide check, pack check, PostgreSQL/FoundationDB suite or combined X02+C8 verification was performed. This round did not rerun unrelated arithmetic/routing diagnostics beyond relevant fresh G0 coverage. No product fix, agent spawn, merge, push, deployment or publication occurred. The remaining policy question is whether Q79e intends to retain the older nested-comment restriction; the current wording does not express it. Fixing that wording alone would not resolve F1 or F2.
