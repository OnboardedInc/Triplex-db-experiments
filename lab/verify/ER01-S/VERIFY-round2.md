# ER01-S round 2 adversarial QA — CX-VER01S

**Verdict: FIX-FIRST.** Round 2 addresses the original overflow and UTF-16 key
regressions, but two new high-severity defects still produce aggregate `PASS`:
coverage from the last page image can qualify a different earlier WAL frame, and
decoded JSON string values never reach the search/key-candidate views.

**North star:** the erasure correctness floor in `lab/SCOPE.md` §2.3,
`lab/NORTH-STAR.md` and `lab/TARGETS.md` §§3/7. Offline only, following R38
§§4.1/4.2/6.2 and the requested Q82d/Q95 rules. No acceptance obligation is promoted.

Candidate: `4750d83b64d8b098ea0cad41dd47893e1a6fab26`, read from the builder's round 2
report and `round2/INDEX.json`, merged as explicitly requested into `verify/ER01-S`
by merge commit `5089385741009861f583ffbaaa76742245a66f8a`. All observer source
bytes were checked against that candidate before and after the probes. The
reviewer's code is confined to `lab/verify/`; the code under review was not fixed.

## Findings

### R2-F1 — HIGH (P1): final-image coverage is wrongly assigned to superseded WAL frames

**File/line:** `lab/observer/erasure/formats.py:268`, especially `:271–290`.

`sqlite_wal()` accumulates frames until a commit, reconstructs only the final
snapshot, then maps that snapshot's parsed ranges onto **every** frame for each
page number. If the same page occurs twice, the earlier body need not match the
body actually decoded. Zero fill/metadata in the last image can therefore label
earlier protected payload bytes as fully parsed. Raw search does not repair the
error when the old logical value crosses overflow pointers/frame headers.

**Reproduction:** retained `round2/probe-02/superseded-within-commit-wal`. The
verifier uses SQLite to create an insert/delete history with a 1,700-byte value
containing the exact protected marker across overflow-page boundaries. It retains
the native pre-delete and post-delete WAL. For this separate negative case it
removes the first commit marker and recomputes every frame checksum, so the earlier
page images are superseded within the later committed transaction. No checksum,
salt or frame-size corruption is used. This modified transaction-boundary fixture
is not presented as stock-writer output.

SQLite independently accepts the resulting main/WAL pair: `integrity_check=ok`,
zero current target rows. Independently opening the original native prior-commit
WAL returns the exact seeded value, SHA256
`6922a6a19e8f336b502c31abb7e64a552f936b752cbbd6ad9824160c0ca1c74f`.
Its physical payload frames are still present in the modified WAL. The full
protected marker is not contiguous in the WAL. Nevertheless the scanner reports:

```text
q-broker-wal P: PASS
rotate: protectedHits=0, twinHits=2, unparsedBytes=0
aggregate: PASS
```

Evidence: `probe-02/{base-main.db,pre-delete.wal,after-delete.wal,wal-original-proof.json}`,
the scenario's exact raw/case/parser/records, and
`validation-01/sqlite-independent.json`. The final coalesced WAL SHA256 is
`6881223d5429cbe70c00a77280cd48fb85af3f0d4158a916610ae7901aca4ba7`.
The ordinary, unmodified history is detected (`superseded-committed-wal: FAIL`),
which isolates this defect to multiple versions before a commit boundary.

**Proposed fix:** qualify each physical frame using its own observed bytes and
the correct historical overflow dependencies. Never transfer coverage from a
later page unless the relevant earlier bytes are proven identical. Reconstruct
and search superseded images; if their payload cannot be reconstructed, retain
those ranges as unparsed and return `REFUSED`. Add this multiple-frame case beside
the existing multiple-commit regression.

### R2-F2 — HIGH (P1): escaped JSON scalars hide plaintext and usable keys behind complete coverage

**File/line:** `lab/observer/erasure/formats.py:442–450`, `:492–493`, `:528–530`;
downstream `lab/observer/erasure/scanners.py:358` (`candidate_boxes`).

`supplemental_views()` parses JSON objects but returns them as row objects. It
only adds decoded bytes for two special array forms. String leaves of normal
objects are never added to `blobs`, so P/C searches and `candidate_boxes()` do not
see their unescaped contents. Structural record coverage remains complete and
does not signal that search/candidate discovery is incomplete.

**Plaintext reproduction:** encode the protected marker as base64 inside
`INFO event={"value":"..."}`, using legal `\uXXXX` JSON escapes for each base64
character. Python's independent `json.loads` and base64 decode recover the exact
protected marker. An unescaped base64 log is detected (`base64-json-log: FAIL`),
but `escaped-base64-json-log` reports P and aggregate `PASS`, zero protected hits
and zero unparsed bytes. The same log in a real SQLite `logs(value TEXT)` row also
passes (`escaped-base64-json-sqlite`); an independent SQL/JSON/base64 read recovers
the marker. This is not limited to the synthetic record grammar.

**Usable-key reproduction:** `round2/encoded-key-01/{hex,base64}` puts the target's
live-epoch wrapped key in a distinct physical key file, inside a JSON scalar
escaped the same way. The other current key copies contain only the live control.
The envelope remains in the declared data files/EI input. Independent JSON plus
hex/base64 decoding returns the exact wrapped key, SHA256
`5d335759bd6a47a3b4cc0d4823f84b868856c67b8bd4a47fcd508f7c2b45e58d`.
The independent Node decryptor authenticates its key material under the retained
epoch/root and opens the target envelope to expected plaintext SHA256
`46a1c6b9a5a79261bc641c26b1ec664b0b0eee9d554c806dbeb28b65e4ce1711`.
Both encodings yield:

```text
d-keys-heap K: PASS; targetHits=0; controlHits=4; unparsedBytes=0
D: PASS; target opened=false; live control opened=true; unparsedBytes=0
aggregate: PASS
```

The independent decryptor source is the unchanged round 1 `rewrap.mjs`; it unwraps
the exact recovered key input, rewraps the same material and authenticates the
envelope. Its exact input/output and source hash are retained. This is a key
enumeration failure, not evidence that the AES-GCM operation itself is wrong.

**Proposed fix:** feed bounded recursive JSON string leaves into the searchable
and candidate views, including the supported base64/hex representations after
unescaping. Keep container parsing and semantic search coverage distinct; an
unresolved encoding or exhausted recursion/candidate budget must cause `REFUSED`.
Add object-string regressions for P, K and D in both native SQLite and explicit
log fixtures. Preserve the exact authenticated-open checks.

## What passed, refused and remains unqualified

Fresh execution of the builder's round 2 runner completed **33 unit tests**
(7 format tests in 0.032 s; 26 scanner tests in 39.892 s) and **all 31 exact retained
round 1 scenarios**. Every old aggregate now returns `REFUSED` because legacy
opaque byte profiles are unparsed. The exact old overflow and UTF-16 key cases
also preserve actual positive findings/decryption opens; they are not merely
discarded. A new fully decoded nominal fixture returns `PASS`.

The reviewer added **14 full-normalizer scenarios** (12 in `probe-02`, including
the nominal control, and two encoded-key extensions), plus a separate direct
two-block FSST decoder control. They use fresh synthetic fixture
`ER01-S-a4dafa129e3745119ee771f8e3791014`, slot `offline`, container
`offline-fixture-no-engine`. Mutations deliberately share that fixture's
before/shred/rotate inputs and are labeled synthetic replays, not live collection.

| Requested hiding case | Observed outcome |
| --- | --- |
| Value split across two overflow pages | P `FAIL` in real SQLite main and WAL; protectedHits=2 and zero unparsed bytes. The 1,700-byte logical value contains the marker across a physical overflow boundary. |
| Value in a freelist page | P `REFUSED` with positive raw leakage finding; actual SQLite freelist contains retained bytes after delete with `secure_delete=OFF`. |
| WAL frame superseded by a later commit | P `FAIL`; exact native committed insert/delete history is searched. |
| WAL frame superseded before the same commit | **Unsafe PASS**, R2-F1; independently accepted by SQLite. |
| pglz-compressed TOAST | P `FAIL`; independent pglz encoder/decoder and PG16/8192 native-layout page assembly recover the exact target. Not server-generated storage evidence. |
| XTDB buffer block | P `REFUSED` on an opaque IPC-like compressed block. Independent gzip readback recovers the target. Native XTDB/Arrow decoder remains unqualified; this case claims only refusal. |
| QLever vocabulary word | P `FAIL` through the full normalizer's FSST-squared decoder. |
| QLever second vocabulary block | Direct frozen decoder finds the exact marker at global index 1,048,576 among 1,048,578 decoded words/copies; removing the second codebook raises `missing FSST block decoder`. Native-layout fixture, no IndexBuilder claim. |
| base64 inside JSON inside a log line | Ordinary spelling: P `FAIL`. Legal Unicode-escaped spelling: **P/aggregate PASS**, including native SQLite storage, R2-F2. |
| Hex key in one file, envelope in another | K/D `FAIL`, target authenticated-open found. |
| Escaped hex/base64 key inside JSON in a separate file | **K/D/aggregate PASS** although independent authenticated opening succeeds, R2-F2. |

Original blind/unknown/source-binding controls were included in the fresh 33-test
run and retained 31 replays. Explicit opaque codecs still refuse. These results
do not establish blanket refusal safety for every byte layout; R2-F1/F2 show why
zero unparsed bytes alone is insufficient.

## Evidence and reproduction

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VER01S/round2/`.
The committed [round2/INDEX.json](round2/INDEX.json) and
[round2/SHA256SUMS](round2/SHA256SUMS) bind complete readbacks, source pins, raw
streams, parsers, independent SQL/decryption proofs and output records. Files over
1 MB and raw evidence directories stay outside git. The builder's 214-file final04
manifest was independently read back in full and matched its declared SHA256
`48ea46bb14087111018429148486c768d2076c08484356df356d296e0cec87fa`.

```sh
# At least 5 GiB free; choose new empty evidence output paths.
node lab/bin/heavy.mjs --label CX-VER01S-R2-replay -- python3 -B lab/observer/erasure/run_round2.py /absolute/new/baseline
node lab/bin/heavy.mjs --label CX-VER01S-R2-new -- python3 -B lab/verify/ER01-S/round2/probe.py --output /absolute/new/probes
```

`encoded_key.py` and `validate.py` are the retained supplementary executions over
the exact `probe-02` fixture. Their fixed durable paths are explicit in source;
read the retained exact inputs/parsers to replay individual cases without changing
those scripts. A reproduction tool's zero exit means its observations completed,
not that an erasure gate passed. Unsafe statuses remain visible in the summaries.

`probe-01` is retained as a failed verifier seed-construction attempt: the initial
padding window did not cross an overflow boundary. No SUT defect is inferred from
that assertion failure. Rerun reason: move padding to the correct physical window
and preserve prior WAL frames without checkpoint recycling. `probe-02` then
completed all 12 original new cases. Its source snapshot was saved before execution;
the first failed source snapshot, nonces, raw inputs and logs are also retained.

## PASS/verdict/receipt audit (9a)

| Site | Content | Freshness and binding |
| --- | --- | --- |
| Candidate merge and source pins | Every observer file matches `git show 4750d83:<path>`; unchanged at execution end. | Exact candidate/merge identities; source preimages copied before probes. No main-checkout edits. |
| Fresh builder runner / 31-case replay | Original 33 tests pass; exact retained raw hashes, overflow hits, key opens and per-file partitions checked. | Fresh execution over explicitly historical captures, exact input run ids/nonces retained; source drift guards and frozen parser/runtime pins. |
| `probe.py:replay` | Executes frozen standalone parser over disk-read-back inputs; retains complete stdout/raw/case; checks coverage counts and records expected negative scan statuses without suppressing unsafe PASS. | Fresh synthetic attempt, phase windows/nonces and offline slot/container; raw/parser/source hashes retained and checked before/after. |
| SQLite/pglz/log seed oracles | Exact SQL bytes, native WAL bytes, independent pglz decode, JSON/base64/hex decode equal seeded controls. | Generated in this attempt; exact files and digest comparisons retained. WAL boundary modification is separately labeled, not forged as stock writer output. |
| `validate.py` SQL and FSST controls | SQLite integrity and row results independently verified; second-block decoder returns exact expected bytes; missing dictionary fails. | Exact retained DB/WAL hashes, frozen decoder and codebooks; direct decoder scope explicit, not a full normalizer collection claim. |
| `encoded_key.py` | Independent decoded wrapper bytes match exact usable key input; authenticated expected plaintext digest checked; K/D statuses and zero-unparsed observations retained. | Exact same fixture, separate physical files and retained epoch/root; unchanged independent decryptor source hash and exact input/output retained. |
| Evidence manifest/index writers and final readback | Read every indexed byte, reject hash mismatch, duplicate/unlisted/out-of-root paths; list unsafe scenarios and FIX-FIRST, never semantic erasure PASS. | Bound candidate, attempt identities and file/source/verifier hashes; failed attempt preserved separately. |

The inherited observer still needs external bundle authentication and independent
collection to support real acceptance. These scripts do not manufacture that proof.

## Changes, limits and next step

The authorized merge brings the builder's source changes exactly as listed with
old/new SHA256 values in its report's **Round 2 pin movements** and
`lab/experiments/EXP-ER01-S/round2/INDEX.json`. This review makes no further observer
source changes. No `lab/acceptance/` file or acceptance-pinned path is changed;
there are no additional old/new pinned hashes to report or re-pin here.

No code fixes, live engine, Docker/VM changes, engine slots, package installs,
network services, main-branch merges, pushes, native server-generated TOAST
qualification, live XTDB buffer decoding, concurrent acquisition qualification,
freed-block/heap proof, scale/performance testing or four-scan O-OBS semantic
promotion was performed. Heavy wrappers released their grants. No project-wide
`pnpm check` was run for review-only scripts.

Fix R2-F1/F2 and rerun independent QA. Native unsupported locations must remain
REFUSED until their own source-bound decoders and fresh controls qualify them.
