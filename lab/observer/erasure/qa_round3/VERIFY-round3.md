# ER01-S round 3 adversarial QA — CX-VER01S

**Verdict: FIX-FIRST.** The two round 2 regressions are addressed in the retained
cases, including physical WAL frame coverage and escaped JSON keys. One new
high-severity defect remains: inverse base64/hex scalar layers never enter the
escape closure. Supported, completely parsed containers therefore still receive
aggregate `PASS` while plaintext, a removing-location envelope, or a usable key
remains independently recoverable.

**North star:** erasure correctness, `lab/SCOPE.md` §2.3, `lab/NORTH-STAR.md`,
`lab/TARGETS.md` §§3/7; R38 §§4.1/4.2/6.2 and the requested Q82d/Q95 rules. Offline
QA only. No acceptance obligation or live-engine erasure claim is promoted.

Candidate `bb90dfcdbeca8e6f13d2ecdef31f4de5a03ac847` was the builder head when
review began. Read its round 3 report/index, then merged it as requested into
`verify/ER01-S` with merge commit `575eb4ceee3a5d94af7401e1dfc6e341a6d08d3b`.
Observer source bytes match that candidate before and after the new executions.
No scanner/product/acceptance implementation was edited by this review.

## R3-F1 — HIGH (P1): layered scalar encoding bypasses semantic search and D enumeration

**File/line:** `lab/observer/erasure/formats.py:468` (`supplemental_views`),
`:495–499` (inverse base64 only for string arrays), `:509–545` (closure transforms),
`:565` (container coverage); downstream
`lab/observer/erasure/scanners.py:109` (`plaintext_forms`) and
`:358` (`candidate_boxes`).

The closure decodes JSON/backslash, URL and quoted-printable escaping, Unicode
text views and gzip. It does not decode generic base64 or hex scalar strings and
enqueue their decoded bytes. Searching a single base64/hex form of the expected
needle only handles the opposite ordering: URL escaping outside a hex value is
found, while hex outside URL escaping is missed; similarly, base64 outside
JSON-escaped text is missed. The existing depth/view/byte budgets never refuse
these cases because the missing inverse transform is never attempted.

These are ordinary compositions of encodings already included in the scanner's
search claims. No custom cipher, unknown engine codec or unavailable location is
needed. The outer containers are either the explicit supported record grammar or
a genuine SQLite table, and the relevant coverage reports zero unparsed bytes.

### Plaintext and native SQLite reproduction

Construct `b64(json_unicode_string(protected_value))` and place it after
`INFO payload=` in a supported log record, with the original twin/live controls.
Independent base64 decode followed by `json.loads` returns the exact protected
bytes. The resulting `probe-01/base64-of-json-escaped-plaintext` reports:

```text
P host-log: PASS; rotate protectedHits=0, twinHits=2; unparsedBytes=0
aggregate: PASS
```

`base64-json-escaped-native-sqlite` stores that log in a real
`logs(value TEXT)` SQLite row. Independent SQLite SELECT, base64 decode and JSON
decode recover the same value. P and the aggregate again pass, with zero
unparsed bytes and `protectedHits=0`. The protected value SHA256 is
`a98e35a56e2295ae452f71fe45d23626188202cd7624cf6171ee0a8d0af508b4`.

`hex-of-url-encoded-string` independently decodes to the same value and also
receives aggregate PASS. Reversing those layers (`hex-inside-url-encoded-string`)
is correctly detected as FAIL, isolating the ordering gap.

### Envelope reproduction

`validation-01/layered-envelope-both-post-phases` uses a removing location with
the exact target/live envelopes present before, then retains the target as
`b64(json_unicode_string(envelope))` in both shred and rotate phases. The live
envelope remains directly readable. Independent decoding returns exact envelope
SHA256 `fa7bfb466a614fb457263a889c5aa692a21d041f8e3d7da6664b2e7024e665e7`.
C reports PASS, both post-phase target hit counts are zero, coverage is complete,
and the aggregate is PASS.

`native-envelope-01` independently confirms this in the existing
`q-recent-rows-h1` remove-policy location, using a real SQLite
`controls(value TEXT)` database and **no policy override**. Before target/control
hits are both 3. Shred and rotate each have controlHits=3, targetHits=0; C and the
aggregate PASS with zero unparsed bytes. Independent SQL/base64/JSON readback
returns the exact same envelope digest. The earlier removing-log profile is an
explicit synthetic policy test; this native case exercises the existing policy.

The first envelope diagnostic, `probe-01/base64-json-escaped-envelope`, had a
rotate miss but correctly failed because its shred phase still contained the
direct envelope. That diagnostic is retained unchanged and is **not** counted as
an aggregate false PASS. The focused case removes that masking condition.

### Usable known and freshly wrapped keys

`probe-01/base64-json-escaped-usable-key` leaves the target's epoch-2 wrapper as
base64 outside a JSON-escaped hex string in a distinct key file. Independent
decoding recovers the exact before-known wrapper, SHA256
`ff7b3c1c138eff94de678cd734499bdb6eade16ad448b42291b773bc5f0007f7`.
The retained root and live epoch authenticate its key material and open the
target to the exact plaintext digest above. Nevertheless:

```text
K d-keys-heap: PASS; targetHits=0; controlHits=4; unparsedBytes=0
D: PASS; erased target opened=false; live control opened=true; unparsedBytes=0
aggregate: PASS
```

The same failure occurs with a **complete identified fresh key record**:
`validation-01/base64-identified-fresh-key-record` stores a base64-encoded JSON row
carrying key id, tenant, epoch and a freshly rewrapped usable box. Independent
base64/JSON decoding yields that exact row, and the separate Node decryptor
authenticates the stored wrapper's material and the target envelope. K, D and the
aggregate still pass. This eliminates the builder's documented distinction
between before-known bare boxes and identified fresh key records as an explanation.

**Proposed fix:** add bounded inverse base64/hex token/string views to the additive
closure, then feed their bytes back through JSON/escape decoding and key candidate
enumeration. Bind supported compositions/token extraction to the evaluator's
profile; unresolved layers or exhausted work budgets must refuse. Keep original
physical bytes/ranges and exact authenticated-open checks. Add both encoding
orders, native SQLite scalar, removing-envelope and identified fresh-key
regressions. This review supplies reproductions, not a scanner patch.

## Fresh verification and requested controls

The candidate runner completed **35 tests** (8 format tests, 0.023 s; 27 scanner
tests, 52.684 s), **all 45 exact retained scenarios**, and the **second-block FSST
control**. The 31 original legacy aggregates remain REFUSED; the subsequent 14
cases have one nominal PASS, 11 FAIL and two REFUSED. The previously missed
superseded-frame plaintext and escaped key boxes are now found. The direct FSST
control again checks the exact marker at global index 1,048,576 and refusal when
the second codebook is removed.

Fresh synthetic fixture: `ER01-S-6b1df2acad8048f78799dbc21e50529e`, slot `offline`,
container `offline-fixture-no-engine`. The 13 initial, two focused and one native-envelope executions
are explicit mutations/replays of that fresh fixture, not separate live captures.

| New requested case | Observation |
| --- | --- |
| Base64 of JSON-escaped plaintext | Aggregate PASS in supported log and native SQLite; R3-F1. |
| Hex inside a URL-encoded string | P FAIL; independently unquoted/hex-decoded exact marker found. |
| Hex outside a URL-encoded string | Aggregate PASS; R3-F1. |
| Layered retained envelope | Focused C/aggregate PASS with both post phases encoded; R3-F1. |
| Layered usable known/identified fresh key | K/D/aggregate PASS despite independent authenticated opening; R3-F1. |
| URL-encoded hex usable key | K/D FAIL; target opening found. |
| Plaintext split across native WAL frames | P FAIL; the 1,700-byte SQLite value contains the marker across overflow/frame boundaries and raw marker search alone cannot find it. |
| Same split value in a superseded physical image | P FAIL after coalescing the two commit groups with valid recomputed frame checksums. |
| Usable key, envelope only in superseded committed WAL data | Exact envelope found by C; K/D FAIL with authenticated target opening. |
| Usable key, envelope only in an earlier frame before the same commit | Exact envelope found; D FAIL. Each physical body hash/range/partition is checked against raw bytes. |
| Removed key, same retained superseded envelope | Aggregate PASS is correct: append-only ciphertext is allowed, D target stays closed and live control opens. |

The WAL fixtures come from actual SQLite insert/delete history. The coalesced
variants deliberately remove the first commit marker and recompute checksums;
they are labeled native-layout fixtures, not claimed as unmodified stock-writer
output. Independent SQLite opens verify integrity and exact pre-delete values,
and verify zero current target rows in the coalesced final views, for both
plaintext and envelope histories. The decoded envelope is bound to the same
EI/case envelope used by D. Other declared data files omit that envelope in the
new superseded-envelope cases; the evaluator case/EI itself is an excluded
synthetic harness input, not a second physical data-store copy.

## Evidence and reproduction

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VER01S/round3/`.
Committed [round3/INDEX.json](round3/INDEX.json) and
[round3/SHA256SUMS](round3/SHA256SUMS) identify source pins, cases, frozen parsers,
raw streams, records, independent SQL/decryption proofs and complete readbacks.
The eight flagged scenario entries include the one masked C-phase diagnostic;
the other **seven** are aggregate false PASSs from the one underlying defect.

| Read-back directory | Files / bytes (manifest excluded) | Manifest SHA256 |
| --- | --- | --- |
| Builder `final01` | 2,939 / 64,035,556 | `653d726214aa86d68a3be406f517f53c0e5c5366bddd6f73d34970dbb0312974` |
| Reviewer `baseline-01` | 2,939 / 64,035,556 | `80a04a0991369744e8474d1e98efd16466fca58b61b1d2d00120ae22b25310ae` |
| Reviewer `probe-01` | 2,480 / 15,295,031 | `27eae5d02113a5b02f002df81954e6ec97473a90fc7c94a4e4296c3ab75e308a` |
| Reviewer `validation-01` | 368 / 2,386,970 | `f5e60b5979cd44f2a6529fa9c8e862acaea267f3f0be19b65f35e87c6bead242` |
| Reviewer `native-envelope-01` | 177 / 1,113,702 | `999680041d49fb01d3f53e11658a5cdaf3b53d2709e3f52a77a5323ab7665b39` |

```sh
# Check >=5 GiB free; choose new empty output directories.
node lab/bin/heavy.mjs --label CX-VER01S-R3-baseline -- python3 -B lab/observer/erasure/run_round3.py /absolute/new/baseline
node lab/bin/heavy.mjs --label CX-VER01S-R3-probes -- python3 -B lab/verify/ER01-S/round3/probe.py --output /absolute/new/probes
```

`finish.py` and `native_envelope.py` use the explicitly retained `probe-01` input
paths for the focused cases and independent readback. Each retained standalone parser can instead be
replayed against its own `raw.jsonl`. A reproduction tool exiting zero records
completed observations, not erasure acceptance. No attempt failed or was erased;
the focused C test is an added diagnostic isolation, not a replaced result.

## PASS/verdict/receipt audit (9a)

| Site | Content | Freshness and binding |
| --- | --- | --- |
| Candidate source pins | Every observer source byte equals the exact candidate Git object; checked again after execution. | Candidate/merge ids recorded; verifier preimage saved before probes. |
| Candidate runner / 45 replays / FSST | Fresh suites, exact original raw/manifests, required findings/opens, physical frame identities and exact second-block marker/refusal. | Historical inputs are labeled replay; new execution freezes all source preimages and parser/runtime pins. |
| `probe.py:replay` | Runs frozen parser over disk-read-back sources; checks exact raw hashes, coverage partitions and physical frame body hashes/ranges; preserves unsafe PASS and per-phase observations. | Fresh random fixture, all bound phases/nonces, exact source/case/parser/raw digest and offline identity. |
| Layered seed oracles and `finish.py` focused replays | Independent base64/JSON/hex/URL round trips equal seeded values/boxes; removing-envelope phases isolated; identified fresh key row independently authenticated. | Exact same fresh fixture, separate labeled mutations; decoder/decryptor source and exact input/output retained. |
| `native_envelope.py` focused C replay and final index | Real SQLite SELECT/base64/JSON equals the EI envelope; original H1 remove policy retained; exact C observations and complete coverage recorded. Full prior/new manifest readback precedes index update. | Same bound fresh fixture and exact observer source pins; own source preimage/hash saved before execution, raw/parser hashes and independent SQL result retained. |
| Independent SQLite readback | Real SELECT/`integrity_check` checks exact pre-delete value hashes, coalesced empty final state and stored layered text. | Captured main/WAL files copied privately; exact file/digest identities retained, no live snapshot claim. |
| Independent Node decryptor | Exact wrapped material, AES-GCM authentication/padding/expected plaintext digest checked. | Unchanged reviewer decryptor hash, exact root/epoch/key/context inputs; no product/engine acceptance verdict. |
| Summary/index/manifests | FIX-FIRST follows recorded unsafe checks; reads every manifest entry and verifies complete file set, confinement, unique paths and SHA256. | Bound attempt/candidate/source/verifier identities; historical builder byte readback is not fresh semantic acceptance. |

## Boundaries and next step

The authorized candidate merge brings exactly the builder's source-pin movements
listed with old/new SHA256 values in its round 3 report/index. Review tools make
no further observer changes. No acceptance-pinned path or `lab/acceptance/` file
was changed; there are no additional old/new pinned hashes to report.

No scanner fixes, live engines, Docker/VM changes, engine slots, network services,
package installs, main-branch merges, pushes, concurrent acquisition qualification,
native PG-server/XTDB codec qualification, heap/freed-block proof, performance
qualification or four-scan O-OBS semantic promotion was performed. Heavy grants
were released by the wrappers. No project-wide `pnpm check` was run for these
review-only scripts. External bundle authentication and fresh acquisition remain
required for live acceptance. Fix R3-F1 and independently rerun before promotion.
