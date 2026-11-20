# DX-HA1 part 5 evidence

- Overnight bare-metal input is DX-BM1's durable `overnight/i13-1` (source `bd2ce3bf9957af8da948a44d353e68aa06ae9c5a`, slot `loadtailn19`, nonce `127f6fa9-b88d-4733-b00e-d91e540e8f7d`). Its independent reconciliation covers 32,400 offers from the five arms.
- The same-scope attribution is under `DX-HA1/load5/i13-1/overnight.json` in durable evidence. It retains per-save stage matches, native transaction times, long log-path parks, GC, and index intervals. Index adoption overlaps are process-wide and retain their own basis identity.
- To replay, extract the raw archive's `import/load-tail-<nonce>/` members into a fresh directory and add `attempt.json`, `cleanup.json` and `observations.json` from the summary. Run `node --import tsx lab/experiments/EXP-DX1/load1/overnight.ts <extracted-directory> <original-i13-1-directory>`.
- Attribution audit. The analyzer checks exact request, terminal, archive, JFR original hashes and event counts, original offer tape hashes and summaries, nonce, source, slot, scope, process clock/boot and matching database/transaction identifiers. It reports historical observations, without issuing a new verdict or receipt.

## Microframe proof audit

| Source | Content check | Freshness | Binding |
|---|---|---|---|
| `Snapshot.open/write/verify` | Durable manifest, original claim and feed content, exact ordered IDs/digest, every typed row at one cut; command IDs and positions are unique. | The worker requires position zero on a new physical database. Local cursor and window counts advance on checked receipts; claims, feed and pinned storage are reread after drain. | Scope, source seal, width, and source span identify each claim; every expected receipt is compared at its exact position. Replay correlates the emitted receipt with the mounted gateway and bound attempt. |
| `live` and `queryMarker` | Exact live save ACK contents and pinned read contents, plus complete marker frame contents and assertion-ID digest from an independent request. | Scheduled due times, observed completions, and marker reads from the current window. | Nonce/Git/slot and scope in the offer tape, verified guest clock, and marker anchored to the exact acknowledged frame basis. |
| `temporalExercise` and its feed callback | Original retry receipt, full assertion and retract target identity in the feed, and five historical/current reads across birth, backdate and retirement. | Exactly one dropped successful reply and three unique commands; steps execute during the live window. | Same immutable logical command, operation digest, receipt tx and position, fresh experiment scope. |
| `replayLive` and controller | Recompute offer denominators, timing, throughput, grants, one outstanding frame and marker high-water; verify native position identities. | Read the current arm's tape and require exact schedule coverage; the receiver reads the transferred current campaign. | Attempt scope/nonce/revision/slot, frame shape and original ordered receipt positions. The worker separately enforces the full storage oracle. |

The experiment adds no acceptance verdict. No contract pin moved.

The first Mac attempt `1b3dfba9-4ddc-4fe5-8744-8aa74fdfd6ff` verified 11,880 control offers before the final readback rejected unsupported depth eight. This attempt produced no completed arm. The cleanup removed all its containers and networks. The next attempt uses the existing supported depth four.

Attempt `0ae918e0-ea4e-4432-b341-5b8f59435783` completed its first control and stopped in the 24-fact arm. The public benchmark wrapper surfaced the retry as `Unknown` instead of the tagged result seen in the in-memory test. The verification now records that transport outcome and always resolves the original command via a fresh durable lookup and full later feed reconciliation. Attempt cleanup is retained.

The full Mac frontier used slot s2 with nonce `89c1dabf-aabc-4a88-9a1f-b8a4eb04f37d`, source `440bdb529eb113f98712fb632387ed5fd8e397ee`, and ended with zero containers and networks. The raw observations, throwaway SQLite ledgers, five offer tapes and role counters are in durable `DX-HA1/load1/load-micro-89c1dabf-aabc-4a88-9a1f-b8a4eb04f37d/`. Per-account ratios, queue and hold distributions, possible interval overlaps and GC thirds are in `DX-HA1/load5/micro-mac.json`, produced by the adjacent `read-mac.mjs`.

The local volume check uses the same content and source audit as the microframe frontier. `--diagnostic` leaves the shared measurement locks alone and labels the completed observation `profile.timing=diagnostic`. It preserves the VM pool reservation and exact source recheck. The larger bare-metal window has its own fixed durations and two matched-load controls. [Command and predictions](MICRO-SERVER.md)
