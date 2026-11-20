# What Publish and ordinary saves cost

The Mac trials enrolled 1,000 people (4,109 native facts) from the compact W0 fixture. Enrolment built the census and notice index before any release offer. It took 2.16 s. Publish timed receipt of the offered rule document through durability and the first exact answer from a connected reader. The census oracle and dispatcher ran after the timed offers and saves.

| People and mode | Offer to durable / first correct answer (ms) | Native write request (KiB) | Fact changes | People evaluated at Publish | Changed values stored |
|---|---:|---:|---:|---:|---:|
| 1,000 Wage notice record | 48 / 58 | 22.2 | 4 | 0 | 0 |
| 1,000 Wage with stored values | 86 / 105 | 51.1 | 5 | 166 | 250 |
| 1,000 Overtime with stored values | 167 / 177 | 25.6 | 5 | 1,000 | 96 |
| 1,000 W0 R1 → R2 with stored values | 181 / 194 | 60.4 | 6 | 1,000 | 379 |

The wage change owed 166 notices. The three-rule release owed the same number. The overtime edit owed zero. In owed mode, a durable record binds the enrolled roster, rule, prior event and native source cut. This defines the debts while the recipient is offline. The dispatcher seeks in the notice index, checks the original source at that cut and assigns individual notice sequences as it sends. The release, replacement tail and owed event share one native transaction. The later dispatcher run applied 883 verified effects from the full release and save series in 5.25 s.

Both stored and envelopes modes store outputs before releasing the marker. Stored mode writes changed tasks, obligations, flags and work payloads, including deletions. Envelopes mode also stores the release hash, basis, trace and work versions in every returned envelope. Those fields can move for every person on a release. An indexed wage edit evaluated only its candidates, reading one index page per 64 enrolled people. Overtime and the three-rule release used the full source census because their reader-only inputs have no notice index.

## Ordinary saves

| Save at 1,000 people | Native fact changes | Of which notice / index | Native request KiB | Client CPU / end-to-end median (ms) |
|---|---:|---:|---:|---:|
| Reader-only field | 5 | 0 / 0 | 9.5 | 17.6 / 50.6 |
| Notice input, same index posting | 8 | 3 / 0 | 19.4 | 26.6 / 68.7 |
| Notice input, changed posting | 10 | 3 / 2 | 23.2 | 27.6 / 79.4 |

Each row is the median of six real saves at the fixed business time. Every command writes the edited source interval and an account clock. Notice-relevant saves add an event and replace the tail. A changed posting updates one bounded base-relative leaf. A reader-only change updates neither. Shared and backdated edits can invalidate the index and trigger a later exact census read. These are native request bytes and client CPU. Engine log bytes and fleet p99 remain unmeasured.

## Projecting the same distribution

| People and edit | Changed people / output rows | Owed notices | Projected work and commit if it fits (s) | Stored-mode native request (MiB) | Packed literal envelopes alone (MiB) |
|---|---:|---:|---:|---:|---:|
| 100,000 Wage with stored values | 16,495 / 24,743 | 16,495 | 3.9 | 2.82 | 16.6 |
| 100,000 Overtime with stored values | 8,098 / 8,098 | 0 | 12.0 | 0.30 | 14.5 |
| 100,000 W0 R1 → R2 with stored values | 20,081 / 37,652 | 16,495 | 13.4 | 3.73 | 17.3 |
| 1,000,000 Wage with stored values | 164,947 / 247,421 | 164,947 | 38.7 | 27.98 | 166.4 |
| 1,000,000 Overtime with stored values | 80,840 / 80,840 | 0 | 119.6 | 2.81 | 145.4 |
| 1,000,000 W0 R1 → R2 with stored values | 200,805 / 376,511 | 164,947 | 133.4 | 37.11 | 173.0 |

These estimates use the verified 1,000-person rung. The lab declined the optional 10,000-person repeat because its disk forecast exceeded the available pool budget. The model counts the exact fixture changes and scales observed materialization time by roster size and incremental wire bytes by changed rows. The document lead edit adds a task and due obligation and deletes the prior window obligation. The literal estimate re-packs the oracle’s complete answer bytes using the same chunk size and codec as Publish. The crash gate also verified these chunks against real native assertions. [Model](join/cost-model.py)

The gateway rejects bodies above **4 MiB** before a transaction starts. An oversized one-transaction publication leaves the earlier release active. The literal envelopes projection exceeds 4 MiB at 100,000 even before framing. For receipt-only Publish, both scales still require one transaction and four changes. Native admission reads and competing source activity can affect its latency. The estimates use a compact synthetic mix and the local machine. Actual deep-fact workload, multi-account time and server latency remain open. [Gateway body limit](../../../../packages/datomic/gateway/src/triplex/gateway/main.clj)
