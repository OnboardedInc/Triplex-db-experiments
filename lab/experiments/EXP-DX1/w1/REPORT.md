Take `eb529d629` from `exp/DX-W1-commit-tail-reads` into `exp/DX-INT1` for version 0.1.
Set `TX2_LEAN_NATIVE_QUERY=1` for the stored journal and `TX2_LEAN_NATIVE_LOG=1` for the identity-only feed.
Set `TX2_SAVE_LEDGER=1` to share save metadata and `TX2_SMALL_ROWS=1` to shrink row text. Keep K eligible and packed P off.
A new page sees an already-saved change even if its reader's clock is behind. The fix writes zero records.
A one-field point page now makes one request. It took 3.04 ms versus 2.14 ms for Match on the same Mac run.
A protected replacement stored 22 records versus 17 for the plain save. The planted value stayed out of the save request, row index, journal storage and feed.
The protected K tests covered held reads, replay, notices and backup restore. Declare protection before loading a fresh seed.
Populated plaintext scopes still need a migration that preserves their history. The gateway refuses to switch them in place.

[Part 9. Save reads as storage grows](RETIREMENT-READS.md)

## Query evidence

- The controlled reader at 100 and durable save at 102 reproduced the missing page before the fix. Classic and actual K then matched O-REPLAY, including the exact int64, float and recorded position. The implicit clock selects valid time only. New cursors bind to the committed position. Old cursors retain their original selectors.
- The paired SQL probe rotated Match, four-call Datalog and one-call Datalog at 64 consecutive acknowledged saves on a 48-subject seed. Their p50s were 2.14, 18.88 and 3.04 ms, and p99s were 67.18, 135.49 and 62.86 ms. The one-request scalar projection was 1.42× Match at p50. The four calls took 1.31 ms for basis, 1.57 for snapshot, 10.30 for query and 1.25 for release at their individual medians. Removing the extra calls alone had measured 4.51× Match in the prior arm. The indexed read for the compiler's exact scalar shape brought the ratio below 1.5.
- Set `TRIPLEX_DATOMIC_POINT_QUERY=1` in the SDK. Each page keeps its original cut across intervening saves. The measured ratio covers a named one-field projection. [Playground query support and journal indexing options](QUERY-SUPPORT.md)
- Bare-metal prediction recorded before execution is 1.2–1.6× Match at p50 for that projection on a fresh seed or a separately aged database. Runtime structure gives one request in each case. The probe exercises 64 paired reads and takes the URL of an owned SQL gateway configured with the four options above and `TX2_PREDECESSOR_LOOKUP=1`.

```sh
node --experimental-transform-types --input-type=module -e 'import { randomUUID } from "node:crypto"; import { queryCost } from "./lab/experiments/EXP-DX1/w1/small/query6.ts"; console.log(JSON.stringify(await queryCost(process.env.DATOMIC_URL, randomUUID())))'
```

## Protected K

- The raw probe recovered the exact live value from current and held history, then checked the actual captured saves, stored journal and retained history/index and the feed, bound to the original assertion and retirement positions. The matched replacements stored 2,606 and 2,909 UTF-8 string bytes and sent 6,922 and 7,010 encrypted request bytes. The five extra records describe the separate encrypted body. The 32-byte value key lives outside Datomic. These are native string bytes before storage framing or compression.
- Both journal forms use opaque references on protected changes. The row key and predecessor keep the assertion identity. The committed claim and operation IDs still identify the original receipt. Only the current removal sequence can authorize reconstruction or replay. Configure the SDK's pinned `TRIPLEX_DATOMIC_WRITE_PUBLIC_KEY`, the matching gateway `TRIPLEX_GATEWAY_WRITE_PRIVATE_KEY` and a separate durable `TRIPLEX_ERASURE_DIRECTORY` before enabling sealing.
- All thirteen checks passed on the merged code. They cover an open handle, fresh history, current and retained replicas, journal, feed resume, import replay, Publish, notice sender and recipient, joined staging, the SSN rule and backup restore. K's protected feed takes its clock from the durable save ledger at the corresponding native offset.
- An exact legacy migration remains open. The candidate is a sealed replay at a stopped source cut, with identical assertion IDs, receipts, logical positions and recorded and valid times, and a verified map for outstanding native feed offsets. Verify all old pinned cuts and resumable feed positions before switching the reader. Old replicas, indexes, SQL storage and backups would then need proven retirement.

## Binding and handoff

- The page checks bind query and ordering, scope, valid time and committed position. The one-call reply checks its exact scope and position. The paired price verifier checks equivalent values and cuts, HTTP calls and unique attempts before computing the ratio. These are Mac diagnostics.
- Sealed writes authenticate scope, operation and attempt. The serial writer checks the current removal sequence. The value envelope authenticates assertion, owner, field and validity. Receipts continue to come from committed operation and claim identities. The SQL run binds the raw controls, gate results and cleanup to its source, slot, image, fresh scope, exact positions and removal sequence.
- The code take includes INT1 `4e61d236e` on the DX-W1 branch. The focused SDK run had 30 tests across six files. The Datomic package and declarations built. Offline dry runs verified the core and Datomic package contents. The required store option is refused by `pnpm pack`, so the full clean-consumer gate remains unverified.
- The first combined SQL rerun caught a gateway reader error before seeding. The corrected build passed the sealed K rerun. All owned slots, containers, volumes and images were released or removed. No acceptance files or pinned source hashes changed. No bench host was used. [Part 7 evidence manifest](WRITE7-SHA256SUMS) · [Part 6 evidence](WRITE6-SHA256SUMS)
