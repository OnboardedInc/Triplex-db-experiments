# K01 observation-to-PASS audit — round 5, before commit

North star: correctness of reused seeds/evidence supporting P1-P5; authority is `lab/SCOPE.md`, `lab/NORTH-STAR.md`,
`lab/TARGETS.md`. Scope is the K01 implementation and its lifecycle, seed admission and measurement runner. This is a
source audit and offline control result, not independent verification or live acceptance.

Every K01 success-producing boundary found by searching `pass`, `ok`, `settled`, `qualified`, `sourceMatches`,
`storageImmutable` and `verdict` in engine.mjs, xtdb-log.mjs, clone-check.ts, lib/clone.ts, lib/bulk.ts and the runner:

| Boundary | Content checked | Freshness checked | Binding checked |
| --- | --- | --- | --- |
| Engine `probe` / `waitReady`; clone health C2 | Managed running inspect, health/port and started HTTP status; failed/signaled/error acquisition cannot supply a status. QLever uses successful HTTP response. This is readiness only, not seed qualification. | New calls on every poll; no cached healthy result | Named slot/container/endpoint; writer started endpoint waits for replay |
| `diskFloorVerdict` and pool admission | Finite resource forecast, project floor/caps and reservations | Live host/VM readings for admission/copy | Request's slot/container, existing reservations; resource success never implies semantic PASS |
| `toolcheck` | Required named tool output satisfies the explicit capability predicates; successful helper acquisition | Current pinned-image helper call | Configured image; capability diagnostic only |
| `stopVerdict` / `stopSlot` | Stop lines, no dirty-stop line, exit 143, no OOM, under 10 s; successful log read required | Current inspect/log reads bounded to start timestamp; final same container/start; lifecycle invalidated before stop | Slot holder/generation/operation token; stopped lifecycle transition cannot overwrite another operation |
| Live settle | Two new cuts, block tx=T, source F<=M, submitted=processed=M, lag/jobs zero, upload progress, first-cut table coverage at any trie level and second-cut stable catalog | Current T independently read each poll, equal initial T; listing/trie/T/M stable for three 5 s readings | Each intended new block and phase; returns provisional `qualified:false` pending stopped bytes |
| `verifyMaintenanceTail` | Exact contiguous LocalLog framing/trailers, schema-recursive accepted bodies, required FlushBlock expected index, only TriesAdded after F, exact terminal M | Stopped bytes acquired after current clean stop; no extra record beyond M | F/M/T plus decoded index compared to intended checkpoint; every frame/payload and entire retained tail hashed |
| `offlineCheck` / qualified settle | Successful helper, empty .tmp, both log tails structurally complete, exact block listing and decoded source tail | Runs stopped before copy and again after reference stop | Current snapshot/cut index/F/M/T and actual block; qualification requires the byte proof |
| `parseListing` / source-to-golden copy equality | One unambiguous regular-file stat/hash per path, valid size/mode/owner/hash, exact canonical sorted tree preimage; source tree equals destination tree | Read-only stopped source and just-created destination in same successful helper | Whole regular-file set/path/size/mode/uid/gid/content SHA-256; creation UUID distinguishes volume generation |
| Golden publication | Valid stopped-tail qualification, successful reference start, complete fingerprint, seed position, unchanged end state and clean reference stop, timer bound, second offline proof | Reference runs after copy; end gauges/listing/layout read after fingerprint | Image/system config/seed inputs/key, manifest bytes, copy tree, creation UUID, reference resume at M; diagnostic provisional output cannot publish a golden |
| `loadGolden` | Recomputes key, redecodes both stopped proofs and snapshot/cut binding, requires current volume and exact seed manifest hash | Current volume inspect, current manifest bytes, no qualified-bit shortcut | Creation UUID and seed-key labels; deleted/recreated volume cannot reuse old record even with the same name |
| Clone C1 at creation | Copied destination tree equals golden tree before any start; malformed listing refuses | Immediate pre-start helper output, no live-log substitution | Golden/copy identity, copy UUID, expected/observed hashes and actual tree hash |
| C1 at re-verification | Required lowercase SHA-256 values for golden, copy tree and C1 expected/observed all exist and equal; saved pass must be true but is insufficient | Current owner copy certificate and loaded golden; immutable pre-start evidence intentionally reused | Clone kind/key/golden volume/copy UUID; parent compares complete certificate under owner lock |
| `fingerprint` and C3 | Successful current queries and exact transaction-cut/tx catalog comparison; any producer query error blocks qualification | New producer process/queries; current start and post-fingerprint checks | Same golden/clone manifest scope/basis and tx frontier |
| C4 | Exact scope counts/positions, position equal manifest's last position | New queries | Manifest scope/position; complete JSON equality |
| C5 | Exact history counts and distinct transaction times | New history queries | Same manifest scope and reference fingerprint |
| C6 | Trie/block catalog digests and live-table rows equal; required layout digest present | New catalog queries, safe current block-file enumeration, no held snapshot; startup/end checks bracket work | Digests computed by local fingerprint producer from actual rows, same reference/clone snapshot; equality alone does not establish semantic SQL correctness |
| C7 | Three observed compactor job counts all zero | Three new readings 5 s apart after fingerprint | Named node; final start check also confirms T/M/layout |
| C8 | Fixed-subject pull result and EXPLAIN plan hashes equal reference; required hashes present | New pulls and plan query; final start check | Same deterministic samples, scope, recorded/valid basis and authored probe; local producer hashes actual canonical results |
| `startCheck` | Successful started endpoint, resume log M, zero live rows/lag/jobs, T/M/trie/listing equal | Three new readings; successful current start inspect/log plus same final start inspect | Current container/start timestamp, expected checkpoint snapshot and replay M |
| Child overall PASS | C1-C8 all present/true; fingerprint errors map to failed gates | Fresh child invocation, post-fingerprint gauges/start check | Loaded golden and owner; child is trusted local implementation, not arbitrary third-party JSON |
| Parent owner PASS publication | Complete consistent C1-C8 verdict and successful child acquisition; exact golden-record and receipt bytes hashed | Running/start identity rechecked; pending attempt and full certificate compared while lock held | Holder/generation/lifecycle plus attempt ID, current immutable copy certificate; initial revocation and error publication use same lock |
| Driver clone admission | Manifest hash, C1 internal hash equality, certificate recomputation, PASS, verified container/start identity | Reads current owner; lifecycle STARTING/STOPPING/STOPPED/REMOVING refuses | Current manifest and clone certificate; current owner supersedes historical standalone PASS files |
| `diffListings.storageImmutable` | No missing files and no changed non-log file (metadata/content equality) | Just-observed stopped listing compared with retained listing | Explicit selected golden/reference; diagnostic only, additions are allowed by its documented meaning and do not imply C1 |
| Runner T1 / golden/clone workflow | Semantic stop proof must be true plus successful process completion; later gates depend on their semantic verdicts | Each invocation uses new holder/output paths and actual fresh commands | Exact invocation creation receipt/UUID for golden cleanup; current slot holder for source cleanup |
| `down` and release success | Successful removal/absence listing; any read or removal/accounting failure leaves revoked state | Lifecycle and current receipts revoked under owner lock before any physical teardown or pool wait; absence queried after removal | Release compares owner generation/holder/creation time/lifecycle token under lock; never deletes a later owner's directory |
| Golden cleanup | Managed golden label, matching requested creation UUID and no mounts; successful absence listing after removal | New reads, current-invocation receipt only in runner | Removing a volume invalidates its loadability; creation UUID prevents an old golden receipt becoming current after recreation |

## Audit-driven changes and trust limits

This pass found and fixed the adjacent engine HTTP-status check, tree-preimage validation and teardown absence proof,
as well as the three reviewer findings. Stop/start now carry lifecycle markers as well as down. A failed lifecycle operation
keeps admission revoked; restarting clears its marker only for the same operation after readiness. A failed teardown
retains historical receipts in verificationHistory but current readiness is STALE. Standalone historical PASS files are
forensic records, not current admission; they are not rewritten to make historical results disappear.

Checks confirm content/freshness/binding within the local producer/consumer protocol described above. This does not
make hashes signatures, prove an arbitrary hand-edited JSON file honest, or prove the native SQL/SDK semantics from offline
mocks. All producers are local trusted code; recorded source hashes identify what ran. Existing exact-data oracle/live
qualification requirements remain. Native Kotlin codec execution, real engine teardown and reference/clone equality still
need the separately admitted live run and independent review. Other lanes' lifecycle contracts were not redesigned.
