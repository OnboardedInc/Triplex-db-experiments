# V-D01e delta review of W0-1.1.2 (exp/D01-w0-1.1.2 242bb40) against the accepted W0-1.1.1 (ada2e90)

**North star:** P5 and P3's dependency rules, and every golden scenario's domain answer, are judged against W0. W0-1.1.2 adds no new meaning: it
writes the readings A01-A15 (RULINGS-PENDING Q53, Q57) into SPEC.md and adds 49 golden cases (C88-C136; C88-C127 are V-D01c's P01-P40) so the
cases can tell a wrong implementation from a right one. **Inputs:** the W0 author's report in lab/experiments/EXP-D01-world-definition/REPORT.md
section "W0-1.1.2"; lab/verify/D01c/VERIFY.md (the mutation review that motivated it).

## Commander's intent
Decide ACCEPT or FIX-FIRST for W0-1.1.2. ACCEPT means: (1) no meaning changed: C01-C87, R1-R3 and the 100k fingerprint are byte-identical to
W0-1.1.1; (2) every new reading in SPEC.md is the ruled one, stated precisely enough that two implementers agree; (3) every new case's expected
output follows from SPEC.md by hand, and the case set kills every mutant in V-D01c's tables A and B (kernel-relevant).

## What to check
1. Hash table: the 95 W0-1.1.1 files against lab/verify/D01/W0-1.1.1-ada2e90-SHA256SUMS (only README, SPEC, schema.json, validate.py may differ),
   and the new lab/world/W0/SHA256SUMS (145 files).
2. Re-derive at least 20 of C88-C136 by hand from SPEC.md, including every error case, C130/C131 (exact 10^5000), C132 (2,000-deep nesting),
   C133/C134 (code point order), C135 and C136 (A07 writer cases).
3. Judge the two rules the author chose beyond the reading text: (a) every character outside U+0020-U+007E escaped (U+007F included), short
   escapes for \b \t \n \f \r, a lone surrogate written as its own escape, `/` not escaped (= `json.dumps(ensure_ascii=True)`); (b) payload keys
   that look like array indexes sort by code point ("10" before "9"). Say whether SPEC now states each precisely.
4. The new case forms: `inputBase64`, `synthetic: true` (records evaluate never produces), and `expected-sha256.json` (frozen canonical bytes).
   Are they sufficient for a harness that cannot read JSON-invalid input or whose writer might hide a bug?
5. Run validate.py (136 cases OK expected) and your own independent check of the fingerprint if you still have your scratch evaluator.

## Boundaries
Branch verify/D01 (merge exp/D01-w0-1.1.2 into it). Write only lab/verify/D01/V-D01e/**. No edits to lab/world/W0. Stdlib Python with python3 -I;
no engines; heavy commands through lab/bin/heavy.mjs. Do not read lab/oracles/domain or packages/w0 source. Commits end with "Co-Authored-By:
Claude Opus 5.5 <noreply@anthropic.com>".

## Report (return as text)
Verdict; checks 1-5; per-case re-derivation table; findings with fixes; commit hash.
