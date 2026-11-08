# V-D01e delta review of W0-1.1.2 (242bb40): FIX-FIRST for one line of SPEC text (saved by the orchestrator, 2026-11-08 01:18Z)

**Verdict:** C01-C87, R1-R3 and the 100k fingerprint are byte-identical to W0-1.1.1 (fingerprint recomputed independently through heavy.mjs in
2 min 23 s: basis.tx 4,338,757; 44,537,987 facts; worlds fec1d7ce...c760; R1 c1b2d410...1a79 [corrected by the orchestrator 2026-11-08: the verdict line had a typo, 3a79; the pin, the O-DOMAIN receipt, V-D01 and V-D01c all have ...1a79]; R2 551bbbc4...b562; R3 a5950922...ee2f; R3 reach 9,497,
changed 418, 0 changed unreached; floors unchanged). All 49 new cases (C88-C136) re-derived by hand from inputs only and matched expected and
frozen bytes; the reviewer's independent evaluator, updated for A01-A15, matches all 136 against both. Both extra exact rules are stated
precisely (escaping: `"` and `\`, `\b \t \n \f \r`, every other character outside U+0020-U+007E including U+007F as `\u` plus four lowercase hex
digits, above U+FFFF as a surrogate pair, a lone surrogate as its own escape, `/` as itself = json.dumps(ensure_ascii=True); array-index-like keys
by code point, "10" before "9", with C136 and C133 pinning them), except E1. Verifier commit d9021cf on verify/D01 (W0-1.1.2-242bb40-SHA256SUMS:
146 files OK, table digest sha256:c6202cf4...71c57; results.json). Did not read lab/oracles/domain, packages/w0 or V-D01c's mutant sources.

## Checks
1 Hash tables PASS (91/95 W0-1.1.1 files byte-identical; README, SPEC, schema.json, validate.py differ as allowed; new SHA256SUMS 145/145 OK,
digest 951ee3d5...07fc5). 2 Re-derivation PASS (all 49). 3 Extra rules precise except E1. 4 Case forms sufficient: inputBase64 carries C91, C92,
C128; expected-sha256.json kills the writer mutants M54 and M55; a harness that re-serializes inputs through JSON.parse/stringify makes a correct
implementation fail 11 cases (C38, C45, C66, C68, C71, C72, C100, C129-C131, C136), so the suite exposes it; `synthetic: true` needs E2. 5
validate.py 136 OK; planted mutations rejected (frozen-hash changes, expected changes under an old hash, base64 edits to C91, C92, C128, reversed
synthetic output order, raw-token rewrites of C93 `-0`, C130's seq, C132's nesting, a forged id in a non-synthetic case), except E2 and N2.
Mutants: the reviewer's own reconstructions of V-D01c's tables A and B (kernel-relevant) plus 9 for A01 and A07-A15, 41 in all, each killed by the
case written for it; control 136/136.

## Findings
- **E1 (must fix; text only):** SPEC.md line 807 (section 9 item 7) shows the raw UTF-8 bytes of U+1F600 where it should show its escape text
  (😀), contradicting the rule it illustrates. Fix the line and regenerate SHA256SUMS; no case, release or fingerprint changes.
- **E2 (low):** validate.py accepts `synthetic: true` on any case and then skips id and version recomputation (C73 with a forged id passes once
  flagged); allow the flag only on the ids section 11.1 lists (C100-C102, C133-C136).
- N1 (note): "publish and receive integers have no upper bound" is not in Q57b's text; W0-1.1.1 stated no bound either, so no meaning changed;
  record the reading beside Q57b when Q57 compiles.
- N2 (note): validate.py does not check SHA256SUMS; pin its digest and have harnesses run `shasum -a 256 -c`.
- N3 (optional): freeze an input sha256 per case so a harness can verify the bytes it hands over (only C93 and C94 would pass silently under a
  re-serializing harness today).

## Orchestrator diff check of the fix (fedfcda, one commit on 242bb40): ACCEPT (2026-11-08 01:22Z)
- `git diff --stat 242bb40 fedfcda`: SHA256SUMS, SPEC.md, input-sha256.json (new), validate.py only; cases/, releases/, expected-sha256.json,
  README.md and schema.json byte-identical (git diff --quiet), so no case, release or fingerprint input changed.
- E1: SPEC section 9 item 7 now reads "U+1F600 as `😀`"; SPEC.md holds no 4-byte UTF-8 character. E2: synthetic allowed only on
  C100-C102 and C133-C136, a listed case missing the flag is flagged. N2: validate.py checks SHA256SUMS. N3: input-sha256.json per case,
  recomputed by validate.py.
- From a clean `git archive fedfcda`: `python3 -I lab/world/W0/validate.py` prints 136 cases, R1 fd57551a...b031, R2 7d2f4008...07a9, R3
  f345d9fe...312e, OK; `shasum -a 256 -c lab/world/W0/SHA256SUMS` 146/146 OK (digest b5941569...b051c per the author). Author's 6/6 planted
  mutations caught. W0-1.1.2 is accepted at fedfcda; it merges together with the W0 pin move in contract 0.3.10.
