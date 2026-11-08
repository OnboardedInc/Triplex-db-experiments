# EXP-D01b-112 brief: the packages/w0 kernel passes W0-1.1.2 (136 golden cases)

## Commander's intent
The TypeScript W0 kernel (packages/w0, merged on main 02424ff) is the P5 release-sweep engine and the domain answer for the golden
scenarios. It passed W0-1.1.1's 87 cases. W0-1.1.2 (accepted at exp/D01-w0-1.1.2 fedfcda) adds 49 cases, readings A01-A15 written into
SPEC.md, and three case forms. The kernel must pass all 136, and its test harness must not be able to hide a bug in the kernel's own
JSON writer or its input handling. That second clause is the point: the old harness compared outputs it re-serialised with the kernel's
own writer, so a writer bug cancels out.

## Setup
1. `git -C /Users/sam/projects/triplex-db-2 worktree add /Users/sam/projects/triplex-db-2/.claude/worktrees/w0-kernel-112 -b exp/D01b-w0-kernel-112 main`
2. In that worktree, `git merge --no-ff exp/D01-w0-1.1.2` so lab/world/W0 holds 1.1.2.
3. Install with pnpm only, always `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`; never `pnpm config set`.
4. Work only in that worktree. Read lab/world/W0/SPEC.md (1.1.2), lab/world/W0/README.md, lab/experiments/EXP-D01b-w0-kernel/REPORT.md.

## Work
1. **Reading input:** support the `inputBase64` case form (C91 BOM, C92 invalid UTF-8, C128 NaN). The decoded bytes are the input.
2. **Checking input:** check the exact bytes handed to the kernel against `lab/world/W0/cases/input-sha256.json` before running.
3. **Checking output:** compare the SHA-256 of every output's canonical bytes against `lab/world/W0/cases/expected-sha256.json`. Never
   compare against `expected` re-serialised by the kernel's writer. Keep a structural diff only as a debugging aid on failure.
4. **Synthetic cases:** `synthetic: true` (C100-C102, C133-C136) marks records `evaluate` never produces; follow README's rule for them.
5. **Case list:** replace the hard-coded "has C01-C87" check with the id list read from the case folder, cross-checked against
   expected-sha256.json, so a dropped case file fails.
6. **SPEC changes:** implement whatever SPEC 1.1.2 decides that the kernel did differently. Known candidates: A12 unbounded integers in
   publish/receive (C130, C131 need exact BigInt to 10^5000), A11 NaN/Infinity as E_SHAPE, A13 deep nesting, A14 code-point order,
   A15 receiver snapshots, and the A07 writer rules exercised by C136. Report each change with its SPEC section number.
7. **Re-measure:** rerun the 100k fingerprint through heavy.mjs exactly as REPORT.md shows (`W0_GIT_COMMIT=<sha> node lab/bin/heavy.mjs
   --label D01b-112 -- node packages/w0/dist/cli/fingerprint.js --n 100000 --wire-every 50 --out .../receipts/fingerprint-100k-112.json`);
   it must equal the 1.1.1 fingerprint (basis.tx 4,338,757; facts 44,537,987; worlds, R1, R2, R3 equal). Rerun the cost measurement only
   if the hot path changed, and say whether it did.
8. **Mutation check:** plant at least three deliberate faults (one in the JSON writer, one in input decoding, one in a rule) and show
   the harness fails each one. Revert them.

## Independence and limits
- Do not read lab/oracles/domain, any D01c branch or report, or lab/verify/D01c. The kernel stays an independent implementation.
- Change only packages/w0/**, lab/experiments/EXP-D01b-w0-kernel/receipts/** and the pnpm-lock importer block for packages/w0.
- No Docker is needed. Never touch /Users/sam/projects/triplex-db or ports 15442 and 17019.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Return
A short report: pass count (vitest total and the 136 case tests); every kernel change with its SPEC citation; the fingerprint result;
mutation results; per-file sha256 of changed files; branch head. If SPEC 1.1.2 is ambiguous anywhere, list it as SPEC-AMBIGUITY with a
proposed reading and golden case; do not guess silently.
