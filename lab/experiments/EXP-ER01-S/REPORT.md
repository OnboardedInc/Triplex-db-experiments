# EXP-ER01-S — evaluator-owned erasure scanners

Builder: CX-OBS01. Branch: `exp/OBS01-observer`. Parent delivery: OBS01 round 5, `c55a7282de5d77c55cee6f4c5d87397a32e43a91`. This delivery is separate from the observer protocol work. Scope: R38 §§3, 4 and 6.2; Q95a–h and Q82c–d; offline synthetic controls only. No system-under-test erasure code was written.

## Result

Implemented P/C/K/D normalizers under `lab/observer/erasure/`, a QLever FSST-squared decoder, complete read-only file acquisition, a pinned Node AES-GCM decryptor, an evaluator-case compiler, and adversarial fixture gates. A retained first version passed its 23 fixture tests and G-S1/S2/S3; final self-review then identified insufficient D coverage of older SQLite WAL rows. The final retained gate and its new physical-copy regression tests are recorded below. No engine, resident, Docker lifecycle, exclusive slot, key store or VM configuration was changed.

The normalizer produces `erasure-scans/1` records from raw observer JSONL chunks. Each scan has its own controls and result. It preserves REFUSED when a location cannot be decoded or observed. It does not create an old O-OBS `keyDestroyedEvidence` boolean from a deletion declaration. The existing obs-bundle writer/seal verifier and O-OBS at `23e2273` are exercised for authentication and recomputation only; the old semantic ERASURE-SCAN schema has no four-scan consumer yet.

## R38 §4.2 coverage and fixture boundaries

| R38 location | Fixture / scanner | Offline result to require; actual boundary |
| --- | --- | --- |
| Q broker frames: broker.db, WAL or segment files | Actual SQLite main DB and committed WAL; frame byte file; P/C | Find both controls before, twin/live control afterward; C removal for DB, retention for append-only WAL/frames. Native broker schema not assumed. |
| Q recent_rows / H1 live and retired tables | SQLite byte-page fixture; P/C | Ciphertext absent after rewrite; full bytes searched, not SELECT-only absence. |
| Q .vocabulary.* | FSST-squared decoder, codebooks + internal + global ids + external + mmap offsets; P/C | Decoded positive controls mandatory. Blind, incomplete, wrong ABI or malformed components REFUSED. |
| Q .update-triples, previous.*, .index.* | Byte fixtures; P/C | Find planted bytes. Real ID-only index semantics require the corresponding vocabulary; raw synthetic file does not claim native ID decoding. |
| Q gens/g* | Separate new and old vocabulary fixtures | New generation must omit target; retained old generation is inventoried/append-only. Actual directory deletion needs a directory witness adapter; a missing file currently REFUSES. |
| Q metrics, server, rebuild logs | Three byte fixtures; P/C | Plaintext leakage fails; ciphertext retained in logs is permitted. |
| X log/LOG and REPLICA_LOG | Separate binary fixtures; P/C | Complete byte search, append-only envelope retention allowed. |
| X buffers L0..Ln and garbage tries | Separate L0, L8, garbage fixture files; P/C | Byte profiles with positive controls; no native compressed Arrow decoder claimed. Unknown codecs REFUSE. |
| X xt.source_log_msgs.tx_ops | EI-labeled **fixture** query output; P/C | Tests exact known envelope bytes and source identity binding, not a live XTDB query adapter. |
| X DEBUG logs, spans, Docker JSON log | Three byte fixtures; P/C | Same positive-control rules as other logs. |
| D Datomic Postgres segments | Raw page fixture and separate unknown-segment negative | Raw byte search finds planted values; undocumented Datomic encoding explicitly REFUSED. D is the intended crypto path, not a fabricated native segment decoder. |
| D transactor and gateway logs | Two byte fixtures; P/C | Read-only byte search. |
| D Datomic pg_wal | Raw page fixture and unknown-WAL negative | Raw fixture finds controls; undocumented native storage payloads REFUSED. |
| Q/X keys.db and WAL | Actual SQLite `er01_keys` fixture + committed WAL; K and D | K searches physical DB/WAL bytes. D replays private copies, uses a fixed fixture schema, and never opens originals through SQLite. |
| D triplex_keys heap / TOAST / pg_wal | Three binary key fixtures; K | Search binary, base64 and hex wrapped-key bytes. Native compressed/reassembled TOAST or Postgres key-row reconstruction not qualified; those need the future ER01-C/DA04 extraction adapter. |
| all kms.db and WAL | Actual SQLite main DB/WAL storing wrapped epoch controls; K | Old epoch wrapper survives shred but must disappear at rotation. D separately consumes the complete declared authority record fixture. |
| all backups, golden clones, backup-db output | Separate data fixtures plus key-store backup; P/C/K as applicable | D tries the supplied backup as well as the live SQLite key store; stale usable backup causes FAIL. |
| all observer stores, proxy captures, Docker logs | Three separate byte fixtures; P/C | These are deliberately inventoried, not excluded as convenient observer output. Only declared synthetic harness controls are excluded from real-data claims. |
| all host logs and errors | Separate byte fixture; P/C | Planted plaintext detected in supported encoding profiles. |
| all closures, outbox, work items | Identities-only byte fixture; P | Planted plaintext detected; C not applicable under R38/Q95h. |
| all JVM/Node heaps and key LRU | Explicit unknown-heap codec | REFUSED. Need qualified heap acquisition or process restart witness; no heap access this round. |
| all freed VM filesystem blocks | Explicit unknown-block codec | REFUSED. Need disposable per-slot filesystem/block acquisition and inventory. |
| host APFS/SSD freed/remapped blocks | Explicit unknown-host-block codec | REFUSED; residual outside this lab's proof. Do not infer absence from an inaccessible mock file. |

The readable fixture inventory includes 34 data location profiles, nine key-location profiles and one D aggregate over all declared key copies. Five additional opaque/unreachable location profiles deliberately refuse P/C. Synthetic Postgres pages and XTDB files test byte scanners and positive-control handling, not undocumented native storage serialization. A fresh real-engine control must qualify any such location before product erasure acceptance.

## Implementation details that affect evidence

P's protected needle is bound to the exact expected plaintext digest, assertion id and value kind used by D/EI. The twin differs, shares the canonical value kind and 32-byte length bucket, and carries a pinned fixture commit-path declaration. Values, keys, envelopes, phase nonces and run id are newly generated for a fixture attempt. The fixture commit-path declaration is not presented as an independently qualified real-engine witness.

C gets envelopes/contexts from the evaluator-pinned EI fixture payload; builder-provided verdict flags are never inputs. Before erasure the same method must locate both exact envelopes. An append-only location can retain ciphertext; a removing location cannot. Vocabulary controls must be in decoded words; raw symbol-table coincidence is insufficient. Physical companion bytes are also searched for leaks.

K's target wrapper set must equal the complete set of canary key versions in D's before inventory. Controls must belong to D's live envelope and key authority. K checks physical bytes, including WAL/backups, rather than SQL row absence. The current K profile is conservative: wrapped target bytes must disappear at shred/rotate even from non-backup WAL. R38 permits old wrappers in non-backup WAL after their epoch dies; the isolated D test demonstrates that those cannot open, while a forbidden old-epoch backup still fails K. This restriction can cause a false negative, never a crypto-erasure PASS.

D additionally recovers obsolete four-column fixture key records from SQLite main/WAL bytes, not only the latest SELECT view. Known before-canary wrapper and epoch records are retried wherever the physical K scans find their bytes (including Postgres fixtures and kms WAL). A regression keeps a deleted key in an older committed WAL frame, and another keeps both an old key and epoch in physical WAL while live record views have removed them; D must FAIL both.

D opens both before values to their exact expected digests. At shred/rotation it must open the live control and fail to open the target after trying every declared root, authority row, key-store copy and backup. A stale usable key backup fails. An old wrapper without its destroyed epoch cannot open. Wrong roots, bad context/AAD, corrupt canaries, unknown schemas or missing copies refuse. Root key bytes remain fixture/evaluator inputs; they never enter a SUT process.

R38 leaves product wire details/schema to ER01-C. The fixture profile explicitly uses uint32-LE value length + zero padding to 32-byte multiples, compact JSON five-part context AAD, key-id-hex wrapping AAD, JSON `[tenant,epoch]` epoch AAD, base64 GCM boxes and a fixture SQLite key table. These are decoder-test choices, **not changes to the product contract**. Future product adapters must match the actual implemented encoding and refuse mismatches. No live Datomic/Postgres extraction is claimed.

`compile.py` embeds all source bytes and evaluator inputs in the standalone Python script, plus the exact Node executable path/hash/version. Parser dependencies are pinned, not imported from mutable neighbors. `snapshot.py` reads complete regular files using no-follow opens for every path component and pre/post stat checks; budget overflow, missing paths, source changes and symlinks fail. Main DB/WAL coherence across concurrent files still needs an engine/storage snapshot witness; fixture capture takes the pair while its connection is held. Real EI capture and directory-deletion acquisition remain adapters to qualify with the product; the file-only helper refuses EI entries rather than pretending to query them.

## PASS / verdict / receipt audit (preamble 9a)

| Code site | Content | Freshness | Binding / refusal |
| --- | --- | --- | --- |
| `snapshot.read_file` emits complete/stable-file metadata | Complete byte count/hash, regular file, no prefix/tail acceptance; pre/post dev/inode/size/mtime/ctime | New read on each call; changing source refuses | Every path component no-follow, exact absolute path; no claimed coherent multi-file snapshot. |
| `decode_capture` establishes normalized inputs | Recompute every raw/file hash and size; exact complete inventory; exact EI envelopes/contexts | Unique phase nonces, run id, ordered bounded monotonic samples; all before/shred/rotate phases mandatory | Exact stream, source, container, slot, case digest, path, location, codec, independent source kind; partial/changing/duplicate/missing entries REFUSE. |
| `scan_p` calls `status` | Protected bytes absent before and after; matched twin found at each phase with same decoder; supported encoding forms searched | Only validated capture phases; fresh random twin/target per attempt | P needle digest/assertion/type tied to EI/D; positive in different location or only vocabulary codebook does not count. Missing control REFUSES. |
| `scan_c` calls `status` | Before target/live envelopes found; after live control found; removal enforced where configured, retention explicit | Same validated attempt/phases | Exact EI envelope bytes/context and per-location policy pinned by evaluator case; missing envelope/control/decoder REFUSES. |
| `scan_k` calls `status` | Every expected wrapper/epoch version found before, controls found afterward; target absence required by stage | Same validated attempt, before/shred/rotate separation | All K versions/controls cross-checked against D key/authority records; all declared file copies scanned; blind/missing control REFUSES. |
| `decryptEvidence` emits authenticated-open observations; `scan_d` issues D result | AES-GCM authentication under exact context; before/live opens compared to expected plaintext SHA256; every supplied key/backup tried | Caller passes only validated capture phases; before target positive required | Exact 16-byte key id, tenant, epoch, contexts and root inventory; runtime executable pinned; unsupported/missing/corrupt inputs REFUSE. Worker observations alone are not an erasure verdict. |
| `normalize_erasure` emits aggregate | Requires P/C/K locations and D, complete physical-location policy set; REFUSED dominates FAIL dominates PASS | Same verified source set; input SHA256 retained | No aggregation without full declared inventory and all controls. Boundary is explicit `declared-files-only`, not whole-engine or whole-disk erasure. |
| `gate.main` emits G-S1/S2/S3 PASS receipt | Assert exact expected location set, every positive control and D open/closed outcomes; assert blind REFUSED, stale backup FAIL and opaque codecs REFUSED; require all unit tests succeed | Generates one new fixture attempt; adversarial replays explicitly reuse that attempt and are labeled replays | Retain raw/case/parser/code/runtime hashes; verify source did not change during gate; source and input manifests retained. G-S2 gate PASS means scanner REFUSED, not erasure PASS. |
| `test_scanners` assertions and Bundle/seal/O-OBS authentication test | Independently expected planted controls, mutations, HMAC chains and raw recomputation; tampered normalized JSON rejected | New fixture per test class; synthetic clocks/nonces explicitly fixtures | Engine identity `offline-fixture-no-engine`, slot `offline`; pinned O-OBS code loaded with git show; only authentication invoked, no semantic acceptance or verifier promotion. |

`fixtures.make_fixture/make_frames` manufacture labeled test inputs and do not certify observations. Their stable-file flags are synthetic fixtures, not production acquisition receipts. `fixture_crypto.mjs` is an evaluator test-data generator, not product erasure code. No other new code emits a PASS or receipt.

## Gates, first failure and retained evidence

The first command waited for heavy admission, then reported 23 tests in 25.041 seconds with one assertion failure and three errors. `first-gate-result.json` preserves that diagnostic summary and the rerun reason. Global binding refusal was stronger than three tests expected. Another negative fixture removed its positive control while trying to isolate a stale old-epoch backup; K correctly REFUSED. Tests were corrected to expect early refusal and to preserve the live control. No scanner check was weakened. Source edits occurred while the initial command was queued; that initial output is diagnostic, not an immutable source-bound gate.

The first retained run (`run-20261109-0227`, run id `ER01-S-daa9fd2d44054882ae283bae7225f2e8`) passed its existing controls, but is superseded for the final source by the physical-WAL D fix. It remains retained. Rerun reason: meaningful new adversarial coverage and scanner fix; the existing tests could not distinguish a current-row-only D decoder from one that tries physical retained keys.

Final gate command (through the lab heavy semaphore, with ≥5 GiB checked both before queueing and at actual execution):

```sh
node lab/bin/heavy.mjs --label CX-OBS01-ER01-S-frozen-final -- python3 -B lab/observer/erasure/gate.py --output /Users/sam/Claude/Projects/triplex-db-2/evidence/ER01-S/run-20261109-frozen-final
```

The intermediate `run-20261109-physical-final` ran 25 tests successfully in 29.203 seconds, then REFUSED to emit a gate receipt because fixture readback code changed while it ran. This is the intended source-drift guard. That attempt remains retained with no `gates.json`. The final rerun freezes source and adds readback of each planted positive fixture file through `snapshot.read_file`, instead of framing generated in-memory bytes without a disk read.

Final frozen gate: **PASS G-S1, G-S2, G-S3**, with **25 tests passing**, 77 individual positive scan results and 44 declared locations/aggregates (43 file profiles plus D). The blind vocabulary replay is REFUSED. Five opaque/unreachable location kinds each REFUSE P/C. Stale usable backups and a retained physical key+epoch pair both FAIL D. The SQLite deleted-row regression also FAILS D as required; current SQL row absence is insufficient.

The final run is `ER01-S-2ea6f81b26d8442087e849a0e9e8b788`, slot `offline`, engine identity `offline-fixture-no-engine`. Full retained evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/ER01-S/run-20261109-frozen-final`. Committed receipts are in `evidence/`: exact `gates.json`, unit log, source/raw/parser file manifest and `location.json`. Every manifest file was read back and matched by size/SHA256; every scanner source pin still matches the committed candidate source. No verdict was edited after generation.

Manifest: `d23e3127e010abf0d046503ad9c65650ddad53b08026e09c9eed1903a8add225`; gates: `ffa61ef7d6056350b59f71f4e82dc4191ead9228a48ffdd748bc967def96bbf2`. The manifest covers 219 files / 4104595 bytes. Exact positive raw-stream SHA256: `8d8193d13180cf391365a8f0863c5f8dafc84a9c6e7b53353f2b186904b007f0`. Node crypto runtime: `v22.23.2`, SHA256 `18e387c90ab8a8400183e8bdd396376e1e875b91b4c874b894dcade7b35bf572`. The low-level worker now independently checks each authenticated plaintext digest as well as the Python normalizer.

The retention-copy check introduces no new semantic PASS: it checks each exact manifest path stays inside the retained root, file size/hash equals the gate's manifest, and current scanner hashes equal `sourceSha256`. It copies existing gate records byte-for-byte. Freshness and binding come from that exact final run id, raw hash, generated case/parser and code pins. `location.json` records paths and hashes only.

## Not done / questions for later work

No live engine scan, erasure product operation, FSST IndexBuilder invocation, engine/VM configuration change, physical freed-block proof, scale/overhead qualification, concurrent DB/WAL snapshot qualification or independent verifier recollection was performed. The existing archived real QLever index is decoded and verified against its known bootstrap input and full archived manifest; new planted vocabulary controls use an explicit legal fixture encoder. No acceptance claim follows for the resident's index.

ER01-C must settle actual padding/AAD/key schemas before its independent read-only adapters are pinned. Native Datomic segment and compressed Postgres/TOAST decoding remain unavailable; actual locations without a working positive control REFUSE. O-OBS needs a four-scan semantic consumer before these records can support an ERASURE acceptance claim. Host APFS/SSD residuals remain as R38 states. No Sam approval question is needed for this offline scanner work.

## Delivery commits

Implementation and PASS audit: `503832b3d51a0c8ddc8d087744e888e70d901284`. Retained gate records, manifest and unit log are committed separately in the following evidence commit. No merge or push was performed. The final scanner sources still match the frozen gate pins; only report/evidence files changed after qualification.


# Round 2 — QA F1/F2: byte coverage and exhaustive candidate discovery

North star: the correctness floor for erasure/crypto-shredding (SCOPE §2.3, NORTH-STAR, TARGETS §§3/7). Parent `1492d8b8457d62a942328889f651bef1ef707550`; QA `verify/ER01-S` at `f68d941`. Round 1's nominal PASSs did not establish absence: the reviewer demonstrated actual SQLite overflow values and a usable UTF-16LE WAL key behind PASS. Those qualification claims are superseded by this round; all prior evidence is retained.

Read the review's VERIFY.md/EVIDENCE.json, copied its two scenario generators and independent decryptor verbatim into `lab/observer/erasure/qa_round1/`, and replay the exact 22 + 9 retained case/raw inputs with a newly frozen parser. The copied generators intentionally assert old false PASSs and are retained as provenance, not executed as current gates. The new `replay_qa_round2.py` preserves their independent SQL/decryption observations and requires no unsafe aggregate PASS; it additionally requires actual overflow hits and successful D opens for every usable newly rewrapped key case. These are fresh **executions** over explicitly historical source observations, not a claim of new engine collection.

## Changed behavior

Each P/C/K/D result reports per-file coverage for each phase: `rawSearchedRanges`, disjoint `parsedRanges`, and explicit `unparsedRanges` carrying reasons and exact byte offsets. The counts partition the captured size. Every file is searched physically, regardless of decoder result; decoded values only add search views and key candidates. A candidate PASS is changed to REFUSED if any relevant protected bytes remain unparsed. Findings and observations survive refusal (`findingStatus` describes the otherwise computed result). Unknown `bytes` cannot qualify an absence claim. Old fake Postgres/XTDB files therefore refuse in retained QA; the nominal synthetic fixture profile now uses an explicit, checked length-prefixed `erasure-fixture-records/2` grammar, with no claim that it is an engine format.

SQLite parsing validates page size and text encoding (UTF-8/16LE/16BE), decodes record serial types/varints, reassembles table/index overflow chains, walks freelist trunks/leaves and freeblock chains, and records unknown nonzero residuals as unparsed. Zero fill and structural metadata are accounted for, never omitted. Old free records without enough reconstruction evidence REFUSE instead of turning into absence. WAL parsing validates header/frame checksums, salts, frame boundaries and page size against the captured main file, then searches committed historical views and reassembled logical values. Uncommitted, incomplete or unparsed page ranges refuse. Current SQL row absence is no substitute for searching historical views.

Postgres TOAST has a separate native PG16 little-endian 8192-byte page profile: heap line pointers, three-column toast tuples, short/four-byte varlena, chunk id/sequence, complete reassembly and none/pglz/LZ4 decoding. Pinned per-value raw/external sizes and compression descriptors are checked. Missing chunks, unsupported flags, unknown compression, dead/free residue and mismatched inventories refuse, while recoverable complete chunk groups remain searchable. Actual heap/pg_wal schemas outside this supported TOAST profile remain unparsed; no renamed byte fixture qualifies them.

Raw and reconstructed search includes UTF-8, UTF-16LE/BE, base64/base64url padded/unpadded, upper/lower hex, JSON escaping and byte-array varints; SQLite serial integer and length-prefix representations are decoded. The earlier UTF-32LE profile is retained. Supplemental gzip/JSON-fragment decoding adds findings without granting parser coverage to an opaque container. D discovers row metadata in decoded records and all supported textual encodings, tries fresh wrappers and encoded key boxes against the available tenant/epoch/key ids, deduplicates equivalent candidates, and keeps unknown layouts/budget exhaustion REFUSED. It does not restrict discovery to before-byte patterns. Invalid sources no longer prevent attempts on other discoverable candidates. Root-inventory drift refuses even if a retained before root can still open controls.

## Gate history

`diagnostic01` retained under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-OBS01/ER01-S-round2/`: six format tests passed; 25 scanner tests had two failures. One was a real root-drift refusal regression introduced by the expanded candidate path; fixed by explicitly retaining root-inventory drift as an issue while still trying all available roots. The other showed TOAST inventory rejection losing reassembled extra chunk-group findings; fixed by retaining those candidate views while refusing incomplete metadata coverage. The next run is meaningful new coverage of both fixes, not replacement of the first failure.

A short initial 0.6-second offline diagnostic probe was inadvertently started after the same command's df output had already dropped below 5 GiB (4,884,732 KiB). It used no engine and is not qualification evidence. Subsequent heavy commands check free space before entering the wrapper, and the retained runner checks again at actual execution; no bypass or cleanup of shared state was used.

Final gate, coverage audit, changed source-pin hashes and retention index are appended after execution. No lab/acceptance file is edited. No SUT or engine/VM change, live collection or semantic O-OBS promotion is part of this round.


## Round 2 PASS / coverage / receipt audit (9a)

| Site | Content | Freshness and binding |
| --- | --- | --- |
| `byte_partition`, SQLite/WAL/TOAST parsers | Byte counts partition size; structural fields and decoded records are accounted for, zero fill searched, unexplained nonzero bytes explicitly ranged. Native payload fragments are assembled before field searches. Checksums/encoding/size/flags/sequence failures cannot qualify coverage. | Recomputed from the current authenticated sample bytes; report includes exact file id/path/source kind/SHA256 within each phase. No reused coverage cache across attempts. |
| `analyze_files` / supplemental decoders | Always retain the entire raw file as a search view. Supplemental decoded views only add candidates; unknown `bytes`, parser errors and decode-budget failures remain unparsed. Declared FSST is decoded as FSST even if compressed bytes resemble another file header. | Evaluator-selected codec and decoder bytes are frozen; complete groups/companions belong to the same captured phase and exact inventory. |
| P/C/K `scan_*` | Raw plus decoded needle/control forms searched; controls required. K also finds newly wrapped versions by exact canary key/tenant identity. No absence PASS on a missing control or parser gap. | Same run/slot/container/input guard and phase nonces/windows as `decode_capture`; P binds to EI/D expected plaintext and identity, C to exact EI envelope, K to canary versions and metadata. |
| `qualified_status` | Every individual scanner's candidate verdict is gated on zero unparsed bytes for every relevant file/phase, not merely the aggregate. A partial result returns REFUSED. | Only the local analysis built after capture integrity/context checks is used; missing phases or location set cannot qualify. |
| `recover_physical_keys`, `candidate_boxes`, D | Enumerate fresh native/historical row wrappers, UTF-16 and other encoded candidates, plus key boxes across known key/tenant/epoch identities. Every distinct discovered candidate is tried cryptographically. Equivalent byte-identical candidates are deduplicated. D requires exact authenticated expected plaintext for both before/live controls; failed opens alone do not qualify unknown source copies. | Candidate bytes/metadata come from exact phase files. No restriction to pre-erasure wrapper bytes. Changed root inventory, source/schema errors and incomplete enumeration REFUSE even if another source's control opens. |
| Node `decryptEvidence` observations | AES-GCM authentication and padding/exact plaintext SHA256 checks remain mandatory. Candidate-only epoch hypotheses may fail authentication without invalidating genuine copies; invalid declared authority rows remain issues. No crypto observation alone issues erasure PASS. | Frozen Node source and executable SHA256; exact supplied root/epoch/key/context inputs; independent QA decrypt proof remains separate. |
| `normalize_erasure` aggregate / `findingStatus` | Adds per-file coverage to each result; zero-unparsed rule repeated at aggregation. Incomplete records have only FAIL or UNDETERMINED finding status, never a secondary PASS. Refusal preserves positive findings and ranges. | Exact validated capture/run/container/slot/case/raw digest; no whole-engine, freed-block or fresh-collection claim. |
| `run_round2` receipt | Requires both named suites and all 31 replays to exit successfully, source hashes unchanged, and manifests all retained bytes. A nonzero stage retains FAILED and logs, not PASS. | Source snapshot taken before execution; new unique output directory and timestamps; exact source-file set/pins checked after execution. |
| `replay_qa_round2` comparisons | Reads/copies exact original case/raw bytes and checks their retained hashes. Requires overflow hit observations, independent decrypt-proof target opens, every coverage partition, and no negative scenario aggregate PASS. | New parser execution is explicitly a replay of the review's original run id/nonces/observations. It never relabels old capture as a fresh attempt. Original comparison/decrypt evidence is retained unchanged. |
| Unit assertions and retention copy | Fully decoded nominal fixtures still PASS; native overflow/UTF-16/WAL/TOAST controls and malformed/free-space cases have independent SQL/expected-byte checks. Retention copies exact existing records/manifests and rechecks hashes, not new semantic verdicts. | New temporary fixture files and random controls; pinned parser/runtime; copied reviewer source is checked verbatim. Evidence index is bound to exact run directory, manifest and source pins. |

The externally visible parser remains `normalize_erasure` in a frozen standalone script. Internal scanners receive analysis only after `decode_capture` content/freshness/binding checks; `qualified_status` does not substitute for authentication. Existing obs-bundle HMAC/seal/witness and independent recollection requirements remain unchanged. No oracle or product erasure code was edited.

## Round 2 final gates and retention

Final frozen run: **33 tests pass (7 format + 26 scanner), all 31 exact QA inputs replayed**. Every old aggregate is REFUSED because unsupported legacy byte profiles are now explicitly unparsed. This is not blanket refusal: the fully decoded nominal fixture suite still passes, SQLite overflow P/C produce FAIL with zero unparsed bytes, and fresh UTF-16LE/BE WAL-key regressions produce D/K FAIL under complete protected coverage.

| Retained case | Result in final source |
| --- | --- |
| SQLite overflow plaintext (main and WAL) | P FAIL, protectedHits=2, zero unparsed bytes |
| SQLite overflow envelope (main/H1) | C FAIL, targetHits=2, zero unparsed bytes |
| Reviewer UTF-16LE old-commit key | D opens exact expected digest; REFUSED with findingStatus FAIL because other old physical byte profiles remain opaque |
| Fresh UTF-16LE and UTF-16BE key regressions | D/K FAIL with complete coverage; independent decryptor confirms exact plaintext |
| Native-layout TOAST | None/pglz/LZ4 decode; stock 1996-byte boundary reconstructs a non-contiguous canary; malformed/unknown layouts refuse |
| Blind, opaque, malformed and residual ranges | REFUSED; raw search/findings retained |

Final evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-OBS01/ER01-S-round2/final04`. Committed `round2/SHA256SUMS` and `round2/INDEX.json` identify all raw inputs/parsers/outputs/logs outside git (9c). The manifest SHA256 is `48ea46bb14087111018429148486c768d2076c08484356df356d296e0cec87fa`; RESULT.json SHA256 is `65ab71bb5d961189986e7ede5060e46a85bc1dfd11977301e3a1fdeecb2d8a54`. Retention readback checks every hash and the complete file set, every current source pin, and all verbatim reviewer copies.

Meaningful reruns remain retained: diagnostic01 exposed root drift and lost TOAST candidates; diagnostic02 passed the then-current suites and 31 cases. final01 added the stronger fresh UTF-16 coverage test and correctly refused on two stale pointer bytes. final02 failed a test assumption: deleting the sole row clears the pointer, so it did not exercise the intended stale slot. The fixture now leaves a control row and deletes only the target. final03 passed after historical pointer accounting. Final format review then enforced stock TOAST chunk sizes and beneficial compression, added a genuine cross-1996-byte boundary vector, and final04 passed all final source. No failure was overwritten.

The historical pointer exception is narrow: exact pointer-array bytes must equal metadata in a prior decoded checksummed WAL view. It does not exempt arbitrary freed bytes. TOAST fixtures now use stock chunking and valid compressed-size relationships; they remain manually constructed native-layout files, not a claim of server-generated storage qualification.

Actual final command (free disk checked before wrapper and again at runner entry):

```sh
node lab/bin/heavy.mjs --label CX-OBS01-ER01S-R2-final04 -- python3 -B lab/observer/erasure/run_round2.py /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-OBS01/ER01-S-round2/final04
```

`gate.py` remains the round-1 fixture entry point; its inherited audit applies, but it is not the round-2 qualification command. Round 2 uses the recursive source snapshot, native-format tests and all 31 copied QA cases in `run_round2.py`.

## Round 2 pin movements (9b)

No `lab/acceptance/` file or contract version was changed. Searching the acceptance files found no explicit acceptance pin for a modified erasure-source path. Round-1 evaluator source pins do move; all changed/new paths are listed here. Old retained parsers/QA files are unchanged; new parsers have new paths and hashes in INDEX.json, not overwritten old pins.

| Path | Old SHA256 at 1492d8b8 | New SHA256 |
| --- | --- | --- |
| `lab/observer/erasure/README.md` | `a2cb3c5aa11bf9d96d38201370c8139ecd60ae1629349ee302fc78c1c81886e0` | `17affaa2e2bf522baf29d638333371ec79eabaf26c3e2e3d0522db29a3b2f7ea` |
| `lab/observer/erasure/compile.py` | `6188e80ccadbabc9f45aef83d357fd461dd9545c32f3e6dc2c3730e91cc453a2` | `a12127437e7afe6ffaabe28b5865178331eea00e9ce9fe01ef35cc788002d3fb` |
| `lab/observer/erasure/decrypt.mjs` | `3d88758668421a25503020325be8d939d0c8aad632638e6544a52c9e647ec46b` | `8a8a376186ed65cc0b40e6c4adb8bccbe168dc792fb9c74e42498fb1d6599af3` |
| `lab/observer/erasure/fixtures.py` | `7d84916b90a25152097af7360c1b7f6af594cf98bafd3b5acd2b75953aa9b945` | `1c159628642d5598c679568648aebb716b614619f89cdb5d8849fb9dc27d7003` |
| `lab/observer/erasure/formats.py` | new path | `f906ef710cc4202d80466d5f97570e5345ac06294d3d48b9c987dabc87ccad08` |
| `lab/observer/erasure/qa_round1/EVIDENCE.json` | new path | `ea8602e512b7543eb5cc1e61887cd7bde3fdcdf5834d457fba30233eb4a8e904` |
| `lab/observer/erasure/qa_round1/VERIFY.md` | new path | `857c773e31c931f6da997408c7c0d746bebc1c0134306f705111bd34f1140260` |
| `lab/observer/erasure/qa_round1/coverage.py` | new path | `b6d5e8c50c4f6c87184713fceced2da6b294ddef46d2b67f249913c51757518e` |
| `lab/observer/erasure/qa_round1/review.py` | new path | `1389c5993604b86ac5e9253450ff7d00ae4336a15e70a0589c6b96bf2f6ccc63` |
| `lab/observer/erasure/qa_round1/rewrap.mjs` | new path | `0a14297ab822b30fc5a774df729661b1f448d850b02ca220a1d1b113db8dd2a9` |
| `lab/observer/erasure/replay_qa_round2.py` | new path | `f50841d1fc060faeb2d8e55a722bc97eceda525e26022a41be13b9aa18dee7b7` |
| `lab/observer/erasure/run_round2.py` | new path | `c5a8db6ed66ba705938abb37be4a820f64a5fbafbc8883a2e345818a60992fbd` |
| `lab/observer/erasure/scanners.py` | `0369ab3031c2dee67f257354cb9d281623f0242ebbbdd6e988e11ca5d8200ea9` | `fb3be824eb4629c093ce9e823ebfe932200d491c7c915460f4912fb7c8e94e4b` |
| `lab/observer/erasure/test_formats.py` | new path | `8364c2a4b3be55bc1e5d4f20df0f76ecc99b3784471e43337581e475df66eedd` |
| `lab/observer/erasure/test_scanners.py` | `3439adfe0622c8bb950a6c7c653176faf33a8557250609a4a84c1fb25457b30e` | `016512cc73f61c61933ceb6943ec2c4e1c0e7bbe84a01808b953ec9034efae30` |

## Round 2 remaining limits

No live engine, SUT erasure operation, engine/VM configuration, product schema/AAD, concurrent snapshot qualification, independent verifier recollection or four-scan semantic O-OBS promotion was performed. No merge/push. Native Postgres heap/pg_wal, unknown Datomic/XTDB codecs and unreconstructed freed records remain REFUSED with their ranges; they are not silently counted as proved erased. Supported profile budgets and external-pointer/TOAST descriptors must be evaluator-owned. A production schema needs its own pinned adapters and fresh controls. Root/WAL/source integrity refusals are distinct from authenticated evidence that a key still opens.
