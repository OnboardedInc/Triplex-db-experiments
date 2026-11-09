# ER01-S round 4 adversarial QA — CX-VER01S-5

**Verdict: ACCEPT for the completed offline decoder/scanner fixtures.** No blocking
semantic finding in this round. The round 3 layered-scalar misses now produce
positive findings, including authenticated target opens for retained usable keys.
This verdict does not certify live erasure or a decoder CPU/time bound; the
unfinished large-base64 diagnostic below remains explicitly unqualified.

**North star:** erasure correctness under `lab/SCOPE.md` §2.3,
`lab/NORTH-STAR.md`, and `lab/TARGETS.md` §§3/7. Offline, synthetic files only;
no acceptance obligation or engine capability is promoted.

## Source and resumed state

Candidate: `1a7fc86c4ee90f2f255d4767c1ff9fcc55da308a`, builder round 4 on
`exp/OBS01-observer`. Read its actual round 4 report, the three earlier verifier
reports and retained scenario tools. The requested merge was already present as
`bdfc9a59481b12028361b20747c06336a53f750c`, on `verify/ER01-S`.
This run resumed the interrupted WIP `91cfc1b7fcf7d5506263a121356929bb7150ea6a`;
it did not repeat or alter that merge. Earlier round 4 partial artifacts remain in
place. All new attempts have their own `CX-VER01S-5` durable root.

Every observer source was compared with the exact candidate Git object before
and after the new matrix, and again during final readback. Fresh baseline source
preimages equal those same pins. No observer or acceptance implementation was
edited by this review; all new tools and committed results are under `lab/verify/`.

## Completed checks

| Check | Exact result |
| --- | --- |
| Fresh candidate unit suites | 11 format tests and 28 scanner tests, all successful. |
| All earlier scenarios | 61 exact historical inputs, freshly executed with frozen candidate parsers: 31 oldest REFUSED; next 14 have 1 PASS / 11 FAIL / 2 REFUSED; latest 16 have 2 PASS / 14 FAIL. |
| Second FSST block | Exact marker at global index 1,048,576; removing the second codebook raises the expected refusal. |
| ASCII ordered pairs/triples | 386 valid pairs + 7,377 valid triples; every exact marker recovered. 637 text-domain exclusions explicitly recorded. |
| UTF-8 ordered pairs/triples | 119 valid pairs + 1,307 valid triples; every exact emoji/snow marker recovered. 26 text-domain exclusions explicitly recorded. |
| Complete normalizer | 20 triple-layer representatives in real SQLite BLOB rows: all P and aggregate FAIL, actual protected hits, zero unparsed bytes. |
| Actual default-depth controls | 33-layer URL, backslash-hex and quoted-printable inputs: P and aggregate REFUSED, with explicit full-origin unparsed ranges; no unsafe PASS. |

The 61 replays are **new executions of exact historical synthetic bytes**, not
new engine acquisitions. Original input manifests, raw stream hashes, run/case
identities, parser/runtime pins, expected findings and authenticated opens are
checked. Nominal and removed-key/retained-append-only-envelope controls still
PASS. Unsupported layouts still REFUSE. The old overflow, superseded WAL frame,
escaped key, fresh identified key and removing-envelope cases preserve actual
positive findings; they are not qualified solely through blanket refusal.

### Layer matrix and denominator

`matrix.py` enumerates all 20² + 20³ ordered combinations, including repeated
wrappers and both orders. Its layers are JSON, Unicode-escaped JSON,
backslash hex, backslash octal, URL, quoted-printable, base64, unpadded base64url,
folded base64, hex, little-/big-endian length framing, byte-varints, explicit
fixture records, UTF-16 LE/BE, UTF-32 LE/BE, gzip and native SQLite.

Each fixture is independently inverted in reverse order to the exact seeded
bytes before the frozen closure is tested. Content-addressed input files and
per-case layer order, input digest, view count, issues and timing are retained.
Text encoders require valid UTF-8. Invalid compositions, such as arbitrary
compressed bytes passed directly to JSON string encoding, are counted as
OUT-OF-DOMAIN, not passing tests. No extra base64 adaptation is silently added.

ASCII byte-varints can be an identity, so `finish.py` additionally enumerates
11² + 11³ UTF-8 scalar combinations, including high-bit byte-varints. JSON
surrogate pairs and byte-preserving octal/hex escapes have independent inverses.
Across both matrices: **9,189 valid fixtures, zero exact-marker misses**;
663 excluded text-domain cells. Of the successful findings, 268 also carry
explicit decoder issues. Those are recorded as findings with unresolved views,
not claims of complete readable coverage.

The direct closure matrices exercise exact decoder results. They are not
9,189 full P/C/K/D normalizer runs. To check integration, each of the 20 outer
layers wraps `base64(JSON-Unicode(marker))`, then is stored in an actual SQLite
BLOB beside twin/live controls. Independent SQL readback equals the seeded value;
the complete source-bound normalizer finds it and FAILs in every case. Existing
WAL/TOAST/FSST, C/K/D and authenticated-decrypt integration is also rerun in the
61 earlier scenarios and unit suites.

### Default bound, not a reduced override

Default `VIEW_DEPTH_LIMIT` is asserted to equal **32**. The URL control nests
only the first protected byte, so its size grows linearly. Independent repeated
unquoting recovers the exact protected marker at each depth.

| URL layers | Direct exact marker | Direct issues | Full P / aggregate | Origin unparsed bytes |
| --- | --- | --- | --- | --- |
| 31 | Found | None | FAIL / FAIL | 0 |
| 32 | Found | None | REFUSED / REFUSED, positive finding preserved | 251 |
| 33 | Not reached | Budget exceeded | REFUSED / REFUSED | 253 |

At 32 scalar transformations the surrounding physical record consumes another
transformation on the whole-file path. That earlier path conservatively refuses
the file even though the independently seeded payload still finds the marker.
This matches the documented per-seed bound and retained earlier exhaustion.

The additional 33-layer backslash and quoted-printable inputs are 125 and 92
bytes respectively. Independent inverses recover the exact seeded marker. Both
direct closures record budget exhaustion; full P and aggregate REFUSE, with
`parsedBytes=0` and the full physical ranges `[0,286)` and `[0,253)` unparsed.
All three beyond-bound cases are actual default-bound runs, not patched limits.

## Incomplete diagnostics and open execution-cost observation

An optional **385,276-byte, 33-layer base64** direct-closure probe in
`boundary-01` did not return before this reviewer interrupted it. Its wrapper
held the slot from 04:52:12 UTC until the verified SIGINT at 04:58:08 UTC; this
interval includes startup and is not a controlled benchmark. The interrupt
trace lands in the folded-base64 token regex at
`lab/observer/erasure/formats.py:530–531`. A long uninterrupted alphabet run
makes the unanchored folded-token pattern try many start positions.

This is an **unqualified execution-cost observation**, not an observed false
PASS or proof of a particular production latency failure. The declared limits
bound views/depth/bytes; they do not establish a CPU deadline. The retained
`boundary-01/base64/encoded.bin` and `boundary-executed.py` reproduce the exact
input and invocation logic. A follow-up should measure this case and consider
linear tokenization or an explicitly specified work/cancellation limit that
returns REFUSED. This review does **not** assert that this unfinished base64
case returned REFUSED.

The process had loaded an earlier reviewer-script draft while waiting/admitting;
changes to the local draft did not change that running process. Its own wrapper
was identified by exact heavy-slot label and PID 59189, signaled, and observed to
exit 128 with KeyboardInterrupt. The sandbox initially denied the signal; the
same narrowly verified action succeeded through automatic escalation review.
`boundary-abort.json` retains the actual signal receipt. No other holder or
engine was signaled. Rerun reason: use compact independently invertible depth
fixtures in new `boundary-02`, preserving all earlier bytes.

The first `validation-01` completed its UTF-8 matrix and 20 full-parser checks,
then failed on the absent interrupted-boundary manifest. It emitted **no verdict
summary or index**. After `boundary-02` finished, new `validation-02` reran the
checks and completed all readbacks before emitting ACCEPT. Both incomplete
attempts are retained; their later retention manifests are explicitly labeled
post-interruption byte retention, not original gate receipts.

## Evidence and reproduction

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VER01S-5/round4/`.
[Primary index](round4/INDEX.json), [final retention index](round4/FINAL-INDEX.json)
and [review checksums](round4/SHA256SUMS) bind the complete artifacts.
The builder's historical final06 is independently read back without treating its
old PASS as fresh execution.

| Complete readback | Files / bytes | Manifest SHA256 |
| --- | --- | --- |
| builder final06 | 6,026 / 87,357,788 | `4db02d81b17a6fd313d3de20c70b539c86302d13fecbb4db33d510f7270d2cd5` |
| baseline-01 | 6,026 / 87,357,788 | `b0969987af68bc36abbf7308352ee7bb10db9fe203fb9ce793dbf2a3acd7fefc` |
| matrix-01 | 7,084 / 23,153,981 | `318f0ca27efcbdefb7c0582bab1dd77fa4bbb68d1747f72edc321663797e4ef3` |
| boundary-02 | 354 / 2,222,441 | `25ff579bb44d82ac2a7e9911668b7123292176c0b7959f37681af73a2bc2de21` |
| validation-02 | 3,523 / 23,323,742 | `e4ca738e0278218886c32df83b7cd6ab5251c70e87f51fe0e5a9ec3a5b9e6876` |

All bulky/raw evidence stays outside git. `retention-01` adds complete readback
of the interrupted/failed artifacts and copies the exact reviewer source,
reports and small logs; its final identity is in FINAL-INDEX.json.

```sh
# Check >=5 GiB free before each admission. Use new, empty output paths.
node lab/bin/heavy.mjs --label ER01S-R4-baseline -- python3 -B lab/observer/erasure/run_round4.py /absolute/new/root/baseline-01
node lab/bin/heavy.mjs --label ER01S-R4-matrix -- python3 -B lab/verify/ER01-S/round4/matrix.py --output /absolute/new/root/matrix-01
# Run dependencies in this order; wait for each completion.
node lab/bin/heavy.mjs --label ER01S-R4-boundary -- python3 -B lab/verify/ER01-S/round4/boundary.py --root /absolute/new/root --attempt boundary-02
node lab/bin/heavy.mjs --label ER01S-R4-validation -- python3 -B lab/verify/ER01-S/round4/finish.py --root /absolute/new/root --attempt validation-02 --boundary boundary-02
```

Fresh matrix fixture: `ER01-S-2e0ca833c10e4f5bafc0278c2f22420a`, slot `offline`,
container `offline-fixture-no-engine`. Boundary and full-parser mutations share
that exact fixture/case; they are not independent live collections.

## PASS/verdict/receipt audit (9a)

| Result-producing site | Content | Freshness and binding |
| --- | --- | --- |
| Candidate runner / unit assertions | 39 tests; controls, exact markers, expected decrypt digests, negative binding cases. | Fresh execution with copied candidate source preimages; runtime/parser/source hashes and post-run drift check. |
| 31/14/16 replay gates and FSST control | Exact historical raw/manifests, expected findings/opens, complete physical partitions, exact second-block marker and missing-codebook refusal. | Fresh parser execution over explicitly historical bytes; original run/case/slot/container/nonces retained; no recollection claim. |
| `matrix.py` observation/summary | Independent inverse equals exact seeded marker; every valid ordered pair/triple searched; missing findings remain visible. It does not emit semantic acceptance. | New output directory, fixture UUID and source snapshot; candidate Git bytes, raw input digests, frozen parser and final source guards. |
| `boundary.py` qualified flag | Exact independent inverses; P and aggregate REFUSED; full originating file unparsed; actual budget issues. | New boundary-02; same bound fixture, actual disk readback, raw/parser/source digests; own executed source retained and rechecked. |
| `finish.py` ACCEPT / primary index | Zero matrix misses, exact denominator accounting, 20 actual protected-hit FAILs, default-depth REFUSED, complete manifests and 61-case/39-test baseline success before verdict. | New validation-02; exact candidate/run identities; every manifest entry/file-set/hash read back; baseline source pins equal matrix pins; own/boundary/source drift checks. |
| `readback` and final retention receipts | File-set equality, confinement, duplicate rejection, exact bytes/SHA; incomplete attempts labeled only for retention, never promoted. | Fresh post-interruption byte readback, unique retention-01 path; completed source-bound primary index preserved and linked by digest. |
| `retain_final.py` final index/checksums | Rechecks completed manifests, exact Git source objects and retained bytes; copies exact report/tools, verifies every final checksum. It carries the completed scoped verdict, not a new erasure result. | All relevant wrappers already terminal; exact candidate, run, report/source/index digests and fresh retention timestamp. |
| Review report | ACCEPT only for the completed offline fixture scope; unfinished base64 diagnostic and exclusions remain explicit. | Links the exact indexed attempts, source movement proof and retained first failures; no historical PASS substituted for fresh execution. |

## Imported source-pin movements (9b)

No `lab/acceptance/` edit or new contract version. Searches found no explicit
acceptance pin naming a changed erasure path. The authorized candidate merge
already imported the following evaluator-source pin movements from `bb90dfcd`;
this review verified each old Git object and new candidate byte digest. There
are **no additional observer-source movements** in this review. Machine-readable
copy: [PIN-MOVEMENTS.json](round4/PIN-MOVEMENTS.json). New means absent at that base.

| Path | Old SHA256 | New SHA256 |
| --- | --- | --- |
| `lab/observer/erasure/README.md` | `468c677a86c1f28499c66b92201e705e1d4b7c3f4d1082317cbadf2f7a7b643a` | `bac7ddd94ef1a23cbe7b1910687c5412ceef51c8c604cb49af3e6079678586fa` |
| `lab/observer/erasure/formats.py` | `97f6c6c846b330109c89f39a3e36fb87baed9da0da26b1fa7bbc7b21332e74c9` | `96adc38c719a35de0477af599b6895c41e974a1e54a68abb9d8ee8ab3cfb1ecc` |
| `lab/observer/erasure/qa_round3/INDEX.json` | `new` | `32ad2d492ac5816acdd189de589e3df5a547a48962957d36f657017f5cf3f7a8` |
| `lab/observer/erasure/qa_round3/SHA256SUMS` | `new` | `f7be4a2c5d03355786509773f7b36ea29ec5aa85b267abd6c24dc4bb7a10bed2` |
| `lab/observer/erasure/qa_round3/VERIFY-round3.md` | `new` | `04953ca5dc9050193e23884e068950ab62351828c831478940efc534fc44a2b1` |
| `lab/observer/erasure/qa_round3/finish.py` | `new` | `50f590dc4b7507a091304afd3a075083bb00ebf128bfd076f73571e2a9c8c105` |
| `lab/observer/erasure/qa_round3/native_envelope.py` | `new` | `fe0daeb13b94aa55f565512c4b2b44c42c840b6f4970d48805ca61690108fbee` |
| `lab/observer/erasure/qa_round3/probe.py` | `new` | `cd76cd05d954cac9128ba2e092c986031b2f60084b4dca90525c4920b3fbf1cd` |
| `lab/observer/erasure/replay_qa_round4.py` | `new` | `bb13f6f256d174206616e51273447cc341fa2266e65019de21ae827149b3845b` |
| `lab/observer/erasure/run_round4.py` | `new` | `5daf52b4264cf90e3d3faaa76922511cd538d99fedd7bef81224633a2b42f430` |
| `lab/observer/erasure/test_formats.py` | `5546892ad443c2d1594fcc3355f0d66fd8e6e68c9fb1526ab1339abb565c9446` | `e3a920f452dd5593d2edfc7034cfaf5f7fe0af830ffab9fc4c54a2d8e5e7ef36` |
| `lab/observer/erasure/test_scanners.py` | `709a16ea0e626020e04a0f1b0a409e1f0707e47449418ab6ef96ab5d4708acb9` | `dd984897ab40d18dda1aa2952f11917a11088ee59ef2318651d7352539e61312` |

## Boundaries

No scanner fixes, live engines, Docker/VM operations, engine slots, package
installation, network services, acceptance changes, main-branch merges or pushes.
No native PG-server/XTDB codec qualification, physical freed-block proof,
concurrent acquisition, scale/performance qualification, or four-scan O-OBS
semantic promotion. No project-wide pnpm check for these reviewer-only Python
scripts; the source-bound observer suites and focused offline scenarios are the
relevant checks. Heavy wrappers were observed terminal and released their slots.
External authenticated acquisition and engine-specific evidence remain required
for live acceptance. The large-base64 CPU/work question above remains open.
