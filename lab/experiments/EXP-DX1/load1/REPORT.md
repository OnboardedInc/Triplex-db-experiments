# Loading one shared Datomic database
The old loader waited for each batch. Its two server runs loaded 4,578–4,669 facts per second.
On the Mac, most removable client work was preparing rows for the wire. Updating the local journal took about 9 milliseconds per batch.
Two batches in flight worked best in this test. The importer can restart and recover the same receipt without inserting the facts twice.
At 50 saves per second, the two larger batches loaded 3,307–3,833 facts per second but made the quiet account's slow saves much slower.
Even the smallest tested batch missed the quiet account's latency limit. A save can still wait for a bulk transaction already running.
I expect roughly 41 minutes for 16 million facts and 7 hours 40 minutes for 160 million on the servers.
The server predictions are untested. The Mac results explain the behaviour and carry no acceptance verdict.

## Where the time went

The archived 2,000-fact server witness joined the same 5,988-datom transaction across Node, gateway and native telemetry. The 413 ms cycle included 73 ms before the next SDK start, 69 ms row encoding, 13 ms body encoding, 12 ms other client work and about 245 ms gateway/peer. That last interval contained 8 ms JSON parse, 53 ms preparation, about 42 ms before native entry, 100 ms native envelope and 41 ms peer/reply. Native apply was 72 ms including 59 ms of the transaction function. The 13 ms log park sits inside the native envelope. These nested spans and rounded components overlap.

| Mac median for 1,972 business facts | Unchanged client | Fast row + body | Fast row + empty range |
|---|---:|---:|---:|
| Generate, stage, encode rows, encode body (ms) | 2.4 / 93 / 103 / 35 | 2.6 / 100 / 18 / 28 | 1.8 / 86 / 17 / 29 |
| HTTP round trip (ms) | 760 | 478 | 529 |
| Gateway JSON parse, row checks and tx-data construction (ms) | 23 / 59 / 31 | 12 / 46 / 27 | 10 / 33 / 30 |
| Gateway wait including native apply (ms) | 608 (238) | 342 (137) | 355 (93) |
| Native historic seeks, time (ms) | 4,595 / 25 | 4,595 / 10 | 1 empty range |
| Client settle, model journal (ms) | 10 / 9.2 | 12 / 8.5 | 10 / 9.5 |

Thirty batches, ten per option, in the order ordinary, row, range, range, row, ordinary. A typical request was 2.65 MB, the diagnostic response about 0.46 kB and the transaction 5,901 native datoms. The peer parses/binds every row and looks up the operation and journal entity. Per-row AVET history seeks are in the serialized transaction function, one for each new business or journal ID. Retirements and revision checks retain their original paths. The benchmark starts its feed replica after seeding. The measured caller path includes its expected-model journal. Native timing also varied across the ordinary and row arms, which kept the same history checks.

## Quiet loader and live imports

The ten quiet arms each reconciled 13,147 source facts with the public journal and pinned store. With 2,000-fact caps the bookended depth-one arms gave 1,808 and 4,813 facts/s, depth two 4,506 and 5,826, depth four 3,543. Startup and arm order matter. At depth two, caps of 1,024 and 3,000 gave 4,922 and 4,556. The ordinary compact wire at depth two gave 2,475 and 3,747. Chosen server point is two in flight up to 2,000 facts.

The new peer reconstructs ID and ordering from the canonical fresh row texts and repeats content validation. It skips individual history seeks only after checking every distinct ID, both bounds and an empty covering range against serialized history, including retired rows. A nonempty or unsupported interval falls back. Older peers reject the compact request. A FULL SQLite checkpoint advances only through contiguous verified receipts. The restart test acknowledged a later batch first, withheld the earlier checkpoint, reopened and recovered the original transaction ID, position, clock and assertion IDs. The end-to-end sealed-file proof awaits a Mac slot.

| Offered saves/s | Bulk cap | In-window facts/s | Quiet read p99 ms (ratio) | Quiet save p99 ms (ratio) | Verified of all offers |
|---:|---:|---:|---:|---:|---:|
| 50 | Control | 0 | 11.8 | 28.2 | 1,440/1,440 |
| 50 | 128 | 2,682 | 19.6 (1.67×) | 132.9 (4.72×) | 720/720 |
| 50 | 500 | 3,307 | 76.6 (6.50×) | 260.7 (9.25×) | 720/720 |
| 50 | 2,000 | 3,833 | 81.6 (6.93×) | 385.0 (13.67×) | 720/720 |
| 235 | Control | 0 | 73.1 | 576.8 | 5,159/5,880 |
| 235 | 128 | 42 | 94.5 (1.29×) | 413.4 (0.72×) | 2,695/2,940 |
| 235 | 500 | 454 | 121.2 (1.66×) | 173.3 (0.30×) | 2,914/2,940 |
| 235 | 2,000 | 1,167 | 173.8 (2.38×) | 845.4 (1.47×) | 2,410/2,940 |

One new physical database per arm, ten writing namespaces and an extra quiet account at five writes and five pinned reads per second. Each Mac arm offers for 12 seconds. Controls pool both bookends. Candidate p99 uses 60 scheduled quiet samples per class minus any misses. Latency includes offer delay from one Node process. At 50/s, p99 quiet offer delay was 6–17 ms versus 132–384 ms save service after offer. Every observed native bulk grant was solo and found no runnable live save waiting. This still permits a save to arrive during an admitted bulk commit. At 235/s, the controls also missed offers. The 390/s retry is queued after a gateway port collision.

- `profile.ts/oracle.ts` tie every exact row, receipt and metric to the source, nonce, slot, operation ID and native position. `Snapshot.open/write/verify` binds the destination manifest and packing to the source, checks ACK content or the original claim, advances the verified prefix and compares the physical rows and feed at a pin.
- W1's range certificate and group materializer use the serialized before/after databases. Each group ACK names its actual logical member. `live.ts` verifies runnable-live and group-size at grants, every published command against the feed and the quiet pin. `run.ts` and the engine check images, mounts, source hashes, counts and cleanup. The image miss, port collision and interrupted stack are recorded. Scoped TypeScript, three loader checks and 110 Datomic tests checked the changes. Eleven opt-in tests skipped.
- [Server predictions and commands](BENCH.md) · [Attempt index](EVIDENCE.md) · [Checksums](SHA256SUMS)
