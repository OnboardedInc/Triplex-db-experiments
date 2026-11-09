# EXP-ER01-S adversarial QA — CX-VER01S

**Verdict: FIX-FIRST.** The scanners can issue aggregate `PASS` while a SQLite query
still returns the protected plaintext or envelope. D also issues `PASS` for a
physically retained, usable assertion-key wrapper that an independent decryptor
opens. These are false absence/decryption conclusions within the offline fixture
boundary, not objections about live-engine acceptance.

**North star:** correctness floor for real erasure/crypto-shredding, `lab/SCOPE.md`
§2.3, `lab/NORTH-STAR.md`, `lab/TARGETS.md` §§3/7. This review changes no product or
observer implementation and does not promote a contract obligation.

Reviewer branch: `verify/ER01-S`. Candidate:
`1492d8b8457d62a942328889f651bef1ef707550` (`503832b3d51a0c8ddc8d087744e888e70d901284`
implementation). The review worktree starts at that exact candidate; all scanner
source bytes matched it before and after execution. The builder's working copy was
not edited. Reviewed the builder report and retained evidence, R38 §§4.1/4.2/6.2,
Q82d and Q95a–h. In the supplied main-checkout snapshot Q82d is compiled in
`lab/acceptance/RULINGS.md:603`; Q95a–h are still in
`lab/acceptance/RULINGS-PENDING.md:122` onwards. This review follows the requested
R38 design without changing those rulings or inferring compilation of pending rows.

## Findings

### F1 — HIGH (P1): raw byte matching misses readable SQLite overflow payloads

**Code:** `lab/observer/erasure/scanners.py:100`, `:112`, `:146`, `:157`, `:182`.

`contents()` returns physical files unchanged for byte/SQLite profiles, and
`found()` only performs `blob.count(needle)`. A logical SQLite cell can cross an
overflow-page pointer. Reading the complete file does not reassemble that cell.
Finding a small contiguous twin elsewhere in the file does not qualify detection
of that layout.

**Reproduction:** run `review.py` as below; inspect
`attempt-01/sqlite-overflow-plaintext/{comparison,records}.json` and
`plaintext-overflow-sql.json`. The verifier creates a real WAL-mode SQLite database
with 512-byte pages, a three-column `controls(padding BLOB,value BLOB,tail BLOB)`
table, contiguous twin/live-envelope rows, and an exact protected value in a row
whose payload crosses an overflow pointer. `PRAGMA integrity_check` returns `ok`;
`SELECT value ...` returns the exact 26-byte protected plaintext. The full plaintext
is not physically contiguous in either the main file or its committed WAL. With
these files in the declared broker/H1/WAL locations, all three P results have
`protectedHits:0`, `twinHits:1`, `status:PASS`; the aggregate is also `PASS`.

`sqlite-overflow-envelope` repeats this with the exact EI-pinned 107-byte `txe1.`
envelope. Both remove-policy main-file locations (`q-broker-sqlite`,
`q-recent-rows-h1`) report `rotate.targetHits:0` and `PASS`, although SQLite returns
that exact surviving envelope. `physical-overflow-key` additionally shows K
missing a recoverable 60-byte wrapped key in an extra physical file in its declared
key location. That last file deliberately uses a SQLite overflow fixture in a raw
key location; it is not represented as a native Postgres TOAST proof.

The same limitation affects compression and record fragmentation. The
`plaintext-gzip` and `plaintext-record-fragments` diagnostics append an independently
recoverable target to each of the 31 non-vocabulary data profiles. All 31 P results
and the aggregate remain `PASS`. These are explicit generic encoding diagnostics,
not claims that gzip/JSON fragments are native XTDB or Postgres formats. Native
TOAST/pglz/LZ4 and engine-specific record reconstruction remain unqualified. The
builder correctly discloses this gap, but its positive byte fixtures do not satisfy
the requested compressed/split-record G-S1 coverage.

**Proposed fix:** retain physical byte scans but also decode logical page/record
content, including overflow chains and historical WAL frames, before claiming
absence. Bind the supported layout, page size, encoding, compression and decoder
identity to the evaluator case. Return `REFUSED` for layouts that cannot be fully
decoded; a contiguous control must not qualify another unsupported layout. Replace
the raw fake-heap/TOAST coverage assertion with actual native-format fixtures and
appropriate unknown-layout refusals. Add the retained SQLite cases as regressions.

### F2 — HIGH (P1): D can omit a usable newly wrapped key from its search

**Code:** `lab/observer/erasure/scanners.py:245`, `:266`, `:276`, `:291`, `:341`.

For physical K files, `recover_physical_keys()` mostly looks for exact wrapper bytes
already known from the before-phase logical key sets. A key rewrapped with a fresh
GCM nonce is a different byte string. Raw heap/TOAST/WAL files without a
`decryptRole` are skipped by `decrypt_input()`, and the physical fallback does not
extract arbitrary new rows from them. It can therefore interpret incomplete key
enumeration as inability to decrypt. The SQLite forensic fallback additionally
hard-codes UTF-8/ASCII text serial sizes instead of rejecting unsupported encodings.

**Native SQLite reproduction:**
`coverage-02/new-wrapper-old-wal-UTF-16le`. The database uses the exact supported
four-column `er01_keys(key_id,tenant,epoch,wrapped)` schema. A freshly rewrapped
target key is inserted and committed, then deleted and committed. SQL at the
latest commit sees no target row, but replaying the captured WAL only through its
previous committed frame recovers the complete row. The independent decryptor
opens the erased envelope to SHA256
`4749ad1fdb2b8e432915e216f598cf3380c24ed7d0bf8d51236751343ff3f61d`.
The live epoch/root remain in the declared inputs. Both K results, D and the
aggregate nevertheless report `PASS`, with D claiming the target cannot open.
The identical UTF-8 case is detected: D reports `FAIL` and `opened:true`.
The database headers explicitly identify encoding 2 versus 1. This is a real
committed SQLite WAL, not a mock Postgres format. If UTF-16LE is outside the intended
profile, the required result is `REFUSED`; the implementation never checks that
boundary before returning PASS.

**Additional reproduction:** `attempt-01/new-wrapper-d-keys-{heap,toast,wal}`. The independent
`rewrap.mjs` unwraps the target's assertion key, rewraps it under the still-live
epoch 2 using a fresh nonce, and authenticates the exact erased envelope back to
its evaluator-pinned plaintext SHA256. A complete row with that usable wrapper is
placed in each physical key fixture in turn; the same live epoch/root are in the
declared rotate inputs. K, D and the aggregate all report `PASS`. D says
`rotate[0].opened:false` while the independent decryptor demonstrates an exact
successful authenticated open. These physical Postgres fixtures are expressly raw
fixtures; the finding is that unqualified extraction silently becomes a D `PASS`.

**Proposed fix:** require complete key/epoch enumeration from every declared
physical key copy at every phase, rather than only rediscovering the old known
byte strings. Decode all committed historical rows and try newly observed
wrappers too. Validate SQLite header encoding and schema/layout before forensic
enumeration; support the encoding or refuse it. Any inaccessible or unsupported
physical extraction must make D `REFUSED`, even when a live control opens through
a different, supported copy. Keep exact authenticated-plaintext checks intact.

## Executed checks and evidence boundary

The original suite was rerun under the shared heavy semaphore: **25 tests, OK,
25.158 s**. This includes the real archived QLever bootstrap manifest/FSST check,
blind and malformed decoders, stale backups, old physical WAL keys and epoch bytes,
source/attempt bindings, and observer-bundle authentication/recomputation. This is
fresh execution; the builder's old PASS is treated separately as historical.

The builder's 219-file / 4,104,595-byte retained manifest was independently read
back in full. Every listed file size/hash, the manifest hash and the gate hash
match `evidence/location.json`. That verifies retained bytes, not renewed semantic
acceptance.

`review.py` completed **22 offline scenarios**, and `coverage.py` completed **nine
additional scenarios**, using fresh random fixture attempt
`ER01-S-d1f7809e0ed1446fb3a425274c542afa`. Each replay retains a complete case,
standalone pinned parser, disk-read-back source files, raw stream, normalized
record and independent comparison. Mutation replays deliberately share that one
fixture attempt and are labeled as such. The declared slot/container are
`offline` / `offline-fixture-no-engine`; there is no live-slot claim.

| Requested check | Observed result and limit |
| --- | --- |
| Plaintext at beginning, end and across a contiguous 4 KiB boundary | P detects it in all 34 data profiles on each replay; the three vocabulary profiles use decoded FSST words. |
| Envelopes at beginning, end and across a contiguous 4 KiB boundary | All 33 C profiles find exact before/rotate targets: four remove-policy locations fail and 29 append-only locations retain. The three vocabulary profiles use decoded words. |
| Wrapped/epoch keys at beginning, end and across a contiguous 4 KiB boundary | K detects all nine key profiles. Some intentionally malformed JSON/DB D inputs refuse, so these are K-only byte-search results. |
| QLever compressed vocabulary | Archived known literal test and fresh planted FSST words succeed; disabling the decoder refuses all three vocabulary profiles. No new IndexBuilder execution. |
| SQLite main file and committed WAL with genuine overflow | F1: protected plaintext and remove-policy envelopes are missed, despite independent SQL readback. |
| Postgres heap, TOAST and pg_wal | Raw fixture byte controls succeed; generic compressed/fragmented controls and new wrappers reveal blind spots. Actual native compressed/reassembled storage is not qualified. |
| XTDB LOG, REPLICA_LOG and buffers | Raw byte boundary controls succeed; generic compressed/fragmented payloads remain undetected. Actual compressed engine-format coverage is not claimed. |
| Decoder absent or unknown/opaque profile | Blind FSST plus five explicit unknown codecs refuse. Missing acquisition throws `FileNotFoundError`; a missing raw inventory entry normalizes to `REFUSED`. Neither emits PASS. |
| D nominal G-S3 | Before: both envelopes open to exact digests. Shred/rotate: live opens and target does not. A stale usable key+epoch backup makes D `FAIL`. |
| D completeness | F2: a retained valid fresh wrapper can still produce D/aggregate `PASS`, including an actual old committed UTF-16LE SQLite WAL frame. UTF-8 detects the same row. Nominal G-S3 does not establish complete search. |

**Gate assessment:** G-S1 needs fixes and native-format/reassembly coverage before
qualification. The explicit blind/unknown/missing-input G-S2 cases behave safely,
but unsupported layouts admitted as `bytes` remain an absence-proof gap. G-S3's
nominal live/dead control passes; its claimed exhaustive key search is unsound
under F2. No product/engine erasure or acceptance-contract PASS follows.

## Reproduce

From this review worktree, check at least 5 GiB host free space, then use new empty
output paths beneath the reviewer's durable evidence directory:

```sh
node lab/bin/heavy.mjs --label CX-VER01S-baseline -- python3 -B lab/observer/erasure/test_scanners.py
node lab/bin/heavy.mjs --label CX-VER01S-adversarial -- python3 -B lab/verify/ER01-S/review.py --output /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VER01S/new-attempt
node lab/bin/heavy.mjs --label CX-VER01S-coverage -- python3 -B lab/verify/ER01-S/coverage.py --original /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VER01S/attempt-01 --output /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VER01S/new-coverage
```

The verifier intentionally asserts current false-PASS observations to reproduce
the defects. A zero exit from these tools is a reproduction result, not a scanner
promotion. After a fix, update expected outcomes only after checking the retained
independent SQL/decryption oracles.

## PASS/verdict/receipt audit (rule 9a)

| Verifier site | Content check | Freshness and binding |
| --- | --- | --- |
| `review.py:main`, historical readback | Reads and hashes every manifest file, exact sizes/count/total and gate/manifest hashes. | Labeled historical; exact builder `location.json`, no fresh PASS inferred. |
| `review.py:run`, `coverage.py:run` | Executes each frozen parser on retained raw bytes, checks exact per-scan expected statuses; retains full outputs, including refusals/failures. | Original candidate source hashes checked before/after; fresh fixture run id, phase windows/nonces, exact cases/raw/parser hashes, offline slot identity. Supplemental cases explicitly replay the fresh attempt. |
| `review.py:overflow_pair` | SQLite integrity check and exact SQL value equal the planted needle; verifies contiguous raw occurrence is absent. | New local SQLite files, held writer for collection; exact collected main/WAL hashes and SQL proof retained. No live engine identity claimed. |
| `rewrap.mjs` | AES-GCM-authenticated key/envelope open; exact plaintext digest and padding required. | Fresh nonce, exact retained root/epoch/key/context inputs; script source pins and parser/runtime pins retained. Emits an independent observation, not an erasure PASS. |
| `coverage.py:main`, old-commit replay | Replays an actual prior committed WAL prefix through SQLite, recovers exact row, authenticates target independently. | Exact committed frame ends and captured DB/WAL hashes retained; supported source pins checked before/after. |
| Missing-source checks | Requires acquisition failure and normalized `REFUSED` on incomplete raw inventory. | Uses the fresh fixture's exact bound case; missing local path is separately labeled acquisition failure. |
| `review.py` summary `FIX-FIRST`, supplemental summary and manifests | Reaches summary only after all reproduction assertions complete; hashes every retained file. | Source/verifier hash drift checks; records exact attempt, candidate and input hashes. No semantic PASS or promotion is emitted. |
| `retain.py:main`, evidence index and `SHA256SUMS` | Reads every manifest entry, checks exact size/SHA256, confines paths, rejects duplicate/missing/unlisted files, and checks current observer/verifier source pins. | Binds the exact two completed attempts and the separate failed diagnostic; records their manifest hashes and fresh fixture id. The failed source snapshot is explicitly post-failure. No new semantic verdict is computed. |
| Baseline test process/logs | Original 25-test suite exits zero and reports every named test. | Fresh heavy-wrapper invocation against unchanged candidate sources; stdout/stderr retained. Test PASS is limited to those test cases. |

## Retention, changes and open work

All tools/results in git are under `lab/verify/ER01-S/`. Raw evidence is outside
git under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VER01S/`; the evidence
index [EVIDENCE.json](EVIDENCE.json) and [SHA256SUMS](SHA256SUMS) identify it. The first completed attempt is retained
unchanged. Supplemental execution adds meaningful envelope-boundary and alternate
SQLite-encoding coverage; it does not replace or erase the first attempt.

`coverage-01` is a retained failed verifier attempt: its gzip-key diagnostic
incorrectly expected random binary to become unsearchable after gzip. Deflate
stored those bytes, and K correctly returned `FAIL`. This is a verifier expectation
error, not an observer regression. Its raw files, outputs, executed verifier source
and stderr remain retained. Rerun reason: compress the already-supported hex key
representation, independently decompress/decode it, and assert that none of the
three supported key forms occur contiguously in that diagnostic payload.
`coverage-02` then completed all nine checks. The UTF-8/UTF-16LE WAL finding was
already reproduced before that diagnostic error and is confirmed in the final run.
The failed attempt's source copy is labeled a post-failure snapshot, not retroactive
immutable source proof.

Final readback verified every listed file and the exact complete file sets:

| Durable directory | Files / bytes in manifest (manifest excluded) | SHA256 of `SHA256.json` |
| --- | --- | --- |
| `attempt-01` | 4,036 / 24,013,409 | `dc261650a838249549dc4f85aa0ddb16b9f2d27d8ab615b57ee094acd6f64988` |
| `coverage-01` (failed diagnostic) | 1,226 / 7,140,953 | `8d83b23d0b147d5931679a4117b36f0c0ae5bd57b63c30f9855d1dbb7a0c1caf` |
| `coverage-02` | 1,570 / 9,152,959 | `7a40cb81dcacf7e69a859cd28f25f38297f3182bf3ae477d7175df75db56b764` |

No observer/product code, acceptance file, publication anchor or pinned input was
changed. Therefore there are **no changed acceptance-pinned paths or old/new hashes**
to report. No engines, Docker, ports, engine slots, package installs, global caches,
network services, merges or pushes were used. Heavy grants were released by their
wrappers. No root `pnpm check` was run for these standalone review scripts.

Not verified: live storage acquisition, coherent concurrent DB/WAL snapshots,
actual native Postgres TOAST compression/reassembly or Datomic segments, native
XTDB compressed records, heaps/freed blocks, real erasure operations, process
restart witnesses, scale, performance, or a four-scan O-OBS semantic consumer.
Those remain qualification work; inaccessible physical locations cannot be counted
as proved erased. Resolve F1/F2 and rerun independent QA before promotion.
