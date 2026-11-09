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
