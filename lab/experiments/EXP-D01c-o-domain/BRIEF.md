# EXP-D01c O-DOMAIN: the independent domain oracle for W0-1.1.1 (stdlib Python)

**North star:** P5 (release activation evaluates a release, TARGETS 1.1 P5) and P3 (expected affected-subject sets through references),
plus the expected domain outputs of every golden scenario (TARGETS 6.1). The contract's W0-dependent obligations stay blocked until
O-DOMAIN exists and reproduces the accepted fingerprint. **Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md 1.1 P5, 6.1, 7;
lab/world/W0/SPEC.md (W0-1.1.1, the only normative text); lab/verify/D01/VERIFY.md (all three reviews).

## Commander's intent
A second, independent implementation of W0 that any golden scenario or P5 receipt can trust as its expected-answer source: all 87 golden
cases byte for byte, and the 100k population fingerprint reproduced exactly from SPEC 12.7's recipe. When this lands, W0's pin closes and
the TypeScript kernel (written separately) is checked against O-DOMAIN, so a shared misreading would have to fool two authors plus the
reviewer's own evaluator.

## Point of view
1. **SPEC.md alone.** Implement W0's six pure operations (evaluate, reconcile, affected, preview semantics, publish, receive) from SPEC.md.
   Do not read V-D01's scratch evaluator (/Users/sam/Claude/Projects/triplex-db-2/V-D01/), packages/, lab/oracles/replay or lab/bench.
   If SPEC is ambiguous, record it as a SPEC-AMBIGUITY item with the reading you chose; never guess silently.
2. **Exactness.** Token-level JSON parsing (fraction and exponent tokens kept as text, duplicate keys rejected anywhere), integers only,
   instants as strings, canonical JSON exactly per SPEC 9.
3. **The population generator** from SPEC 12 (draw fields, Zipf weights, P4 buckets, ballast chains, jurisdictions, the scheduled raise)
   and the fingerprint per SPEC 12.7. Expected: basis.tx 4,338,757; 44,537,987 facts; worlds sha256:fec1d7ce...c760; R1 sha256:c1b2d410...1a79;
   R2 sha256:551bbbc4...b562; R3 sha256:a5950922...ee2f. A mismatch is a finding to localize (which world, which fact), not to patch over.
4. **A CLI like O-REPLAY's:** `python3 -I lab/oracles/domain/cli.py run <case.json>`, `--test`, `--population --rung 100k --fingerprint`,
   and `affected` / `publish` / `receive` entry points the scenario runner (W01) can call.

## Boundaries
Worktree branch `exp/D01c-o-domain`. Files: `lab/oracles/domain/**` only. Stdlib Python, `python3 -I`. No engines. The 100k population is
large (44.5M facts): stream it, keep memory under about 2 GiB, and run the population step through `node lab/bin/heavy.mjs --label D01c -- ...`.

## Report
Commit hash; 87-case result; fingerprint match (or the first divergence localized); SPEC-AMBIGUITY list; per-file hash table.
