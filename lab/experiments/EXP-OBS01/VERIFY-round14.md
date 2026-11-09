# OBS01 round 14 independent review

**Verdict: ACCEPT-OFFLINE**, limited to **R13-F1 under Q109a**. Reviewed
`c121780e7e00ae795690f4d37d91d13807171160` on `exp/OBS01-observer`, as CX-VOBS7. No blocking finding or new
counterexample was found in the string/char/comment arrangements tested. This is not live W0 or durability acceptance.

Read the authoritative scope/protocol and REPORT.md Round 14. Correctness reason: source clock identity is a prerequisite
for the durability observer's commit-order measurements. Q109a's trusted-image model and diagnostic dump parser remain
unchanged; crafted-dump cases do not affect this verdict.

## Fix verification

`clock-proof.mjs:100` now consumes strings, character literals and comments in one traversal. Comment delimiters encountered
inside literals remain literal content; escaped characters are consumed within that literal. Delimiters and quote
characters inside real comments do not alter literal state. Removed block comments leave whitespace, preventing accidental
identifier joining. EOF or an unescaped newline before a literal closes, or EOF before a block comment closes, produces an
error. `sourceTimeSites` at `:132` adds these errors to `other`, and the existing gate at `:282` refuses them.

The source-helper/probe diagnostics use the same lexer. Their results remain diagnostic under Q109a; lexical errors reach
the source gate independently, so a later recognized monotonic read cannot rescue an earlier error.

**The original two R13-F1 fixtures pass without edits.** All five reviewer source files for rounds 9–13 are byte-identical
to their versions at review commit `6785096a`; see
[unchanged-fixture-audit.json](../../verify/CX-VOBS7/round14/unchanged-fixture-audit.json). In particular,
`review_round13.mjs` retains SHA256 `46f3f117bbc996c0281ac47b268a6d25bcef0492610b9755d29cf6fd90a89859`.
Its nine URL-wrapped and nine block-delimiter-wrapped time statements now all refuse through the source check, proof and
pure W0 judge. The fresh inputs/results are in
[prior-round13/url-string-source.json](../../verify/CX-VOBS7/round14/prior-round13/url-string-source.json) and
[prior-round13/block-string-source.json](../../verify/CX-VOBS7/round14/prior-round13/block-string-source.json).

The actual pinned `.bt` lexes without errors, reports exactly **15 `nsecs(monotonic)` sites and `other: []`**, and passes
the proof and pure W0 controls. Its bytes were not edited.

## Independent lexical checks

New tool: [review_round14.mjs](../../verify/CX-VOBS7/review_round14.mjs). Expected executable reads are established by
construction: all surrounding literal/comment pieces close before an active time statement is inserted. This avoids using
a second copy of the implementation as the expected-result oracle.

| Check | Fresh result |
| --- | --- |
| 30 harmless literal/comment pieces, plus the actual pinned source | All lex cleanly and pass proof/W0 controls. Includes URLs, comment delimiters, quoted clock names, escaped quotes/backslashes, escaped control characters, char literals and both comment forms. |
| Every before-piece × after-piece × nine active time statements | **8,100/8,100** retain a forbidden time read; no lexical errors or hidden reads. |
| Seeded mixed arrangements, seed `0x14c0ffee` | **10,000/10,000** retain the inserted active time read across varying piece counts and insertion positions. |
| Pinned-source variants with URL, block-delimiter and escaped-char surroundings | **27/27** refuse through source/proof/W0. |
| Comments/whitespace/newlines between `nsecs`, parentheses and non-monotonic mode | **18/18** refuse; four corresponding monotonic controls pass. |
| Unterminated string, char and block-comment forms | **270/270** report lexical errors and refuse through source/proof/W0, including 0–12 trailing backslashes, EOF/newline boundaries, line offsets and later monotonic reads. |

The nine active statement forms are bare `nsecs`, `nsecs()`, `nsecs(boot)`, `nsecs(tai)`, `nsecs(sw_tai)`, `elapsed`,
`jiffies`, `time(...)` and `strftime(...)`. No active non-monotonic read passed in this corpus. The aggregate corpora retain
their exact generation recipe in the hashed reviewer source, counts, input-stream and observation-stream SHA256 values,
and any mismatches (all empty). Representative gate cases retain complete source, lexical output and proof/W0 results.

These are finite source-level checks and code review, not a formal proof over the complete bpftrace language. The actual
bpftrace lexer/compiler and preprocessor semantics were not independently exercised. Unsupported syntax also remains
subject to Q109a's clean compiler-exit gate; no broader grammar compatibility claim is made here.

## All requested suites

One admitted offline capture, after waiting for a heavy slot:

```sh
node lab/bin/heavy.mjs --label CX-VOBS7-R14 -- python3 -B lab/verify/CX-VOBS7/run_round14.py
```

Runner-entry free space: **23,831,080,960 bytes**. All 12 child commands exit zero.

| Suite | Result |
| --- | --- |
| `test_vm.py` | 14/14 |
| `test_syncwitness.py` | 18/18 |
| `test_round10.py` | 40/40 |
| `test_round11.py` | 20/20 |
| `test_engine.mjs` | 25/25 |
| `test_round12.mjs`, including the new round 14 test | 25/25 |
| reviewer round 9 | 11/11 |
| reviewer round 10 | 4/4 |
| reviewer round 11 | 5/5 |
| reviewer round 12 | 8/8 |
| reviewer round 13, including both unchanged R13-F1 fixtures | 5/5 |
| new reviewer round 14 | 5/5 |

Totals: **92 Python + 50 Node builder tests**, **33 prior reviewer tests**, and **5 new reviewer tests** pass. These are the
listed offline suites, not unrelated repository or resident/VM integration suites.

[RUN.json](../../verify/CX-VOBS7/round14/RUN.json) records the exact reviewed head, attempt times, command argv/exits,
raw output hashes and 24 source hashes; `sourceUnchanged` is true. Round 11–13 JavaScript replays differ only in output
directory, with their exact transformations and hashes recorded. Historical evidence is untouched. See
[INDEX.md](../../verify/CX-VOBS7/round14/INDEX.md) and
[SHA256SUMS](../../verify/CX-VOBS7/round14/SHA256SUMS) for the fresh evidence.

## Verdict/receipt audit (rule 9a)

| Reviewer site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `run_round14.py` capture and source-equality check | Exact child exits and raw stdout/stderr hashes; before/after source equality; runner completion alone is not PASS | New attempt directory and times, after heavy admission | Reviewed head, 24 exact source hashes, argv and replay transformations; no engine-slot claim |
| Prior fixture replays | Existing unchanged assertions, including both original R13-F1 failures now requiring refusal | Fresh round 9–13 executions into new output directories | Canonical fixture hashes and replay byte equality except recorded output path; historical outputs not adopted |
| Pinned/literal and token-gap assertions | Exact pinned count/error expectations and proof/W0 booleans; active reads must refuse, harmless contents may pass | Fresh pure calls on actual pinned bytes or constructed sources | Source text/hash, lexer output and neutral control inputs retained; W0 engine facts explicitly stand-ins |
| Cross-product and seeded assertions / aggregate records | Every constructed active statement must remain visible with no lexical error; mismatch lists must be empty | All 18,100 cases executed in this attempt | Deterministic recipe, seed, count, source-script hash and input/observation stream digests; no real compiler claim |
| Unterminated-form assertions | Every one of 270 cases must report a lexical error, place it in `other`, and refuse both proof and W0 | Fresh generated calls; later good reads included as negatives | Exact generation recipe/digests plus retained source/result samples; matching source hashes in proof facts |
| Fixture-byte audit and SHA256SUMS | Old/new fixture bytes compare equal; manifest verified against evidence bytes | Comparison and checksum verification performed in this review | Both source commits, each fixture path/hash, and all evidence files |
| This ACCEPT-OFFLINE verdict | All requested suites and unchanged regressions pass; no counterexample in reviewed lexical scope | Reviewed c121780e and this fresh execution only | Source-bound evidence above; verdict limited to R13-F1/Q109a and makes no live W0 or engine acceptance claim |

No implementation fix, existing fixture edit or `lab/acceptance` change was made by this review. No existing pinned path's
hash moves. Each evidence file is below 1 MB and the raw evidence directory is below 5 MB.

Not performed: VM/Docker/Colima/engine/network commands, actual bpftrace compilation/attach, image builds, W0–W4,
B9/CR-NS integration or unrelated repository suites. No open blocker remains in R13-F1; real-output/golden review remains
the separate, previously documented follow-up under Q109a.
