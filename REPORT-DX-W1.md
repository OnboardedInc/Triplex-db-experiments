# DX-W1 part 11

North star P2 and P4. Count serial SQL reads per save and preserve exact current and pinned views. [Scope](lab/SCOPE.md) · [Targets](lab/TARGETS.md).

The integration base is `d1bb9ea9e`. The first write-side slice uses an authoritative root in an isolated native trial. A first eligible replacement takes the old person's live IDs at the guarded cut and puts them into pages of up to 32 IDs. A new version entity carries the assertions and precise retirement markers, with the ordinary journal still under its existing representation. Subsequent replacements change the root and only the affected pages. The legacy rows and legacy revision remain intact.

The authoring scope is deliberately isolated from the product writer. Existing generic writers, import, deferred Publish, protected removal and the complete reader and feed surface still need to support the new physical layout. The native writer and projection have exactness evidence within the isolated fixture. A product launch setting and server command remain pending.

## Local results

| Check | Result |
| --- | --- |
| Authoritative layout on synced SQL storage | 32 assertions across two tests. First touch, a legacy writer winning the migration race, two plans contending on an absent root, same-owner replacement order, legacy assertion reuse, exact old and new cuts, and committed operation recovery by identity. The writer checks exact native row text, markers, pages and root bytes before verifying the operation and claim. |
| Matched legacy and migrated reads | Full current and pinned answers for 81 rows and complete ordinary journal replies had matching digests. Each reader ran in a separate JVM and checked the exact stored answer on every sample. |
| Diagnostic current / pinned p50 | 1.452 / 1.377 ms legacy, 1.941 / 2.131 ms migrated. Both arms took 24 samples per cut after six warmup reads each. These are in-process projection and digest timings, without gateway transport. The migrated path reads its root and pages, does one bounded legacy-row index scan, and seeks a row and its owner for each live fresh version. |
| One-field native write | 29 records and 3,148 UTF-8 bytes of added string datoms on first touch of the 81-row person. Next replacement wrote 26 records and 2,534 string bytes and replaced only one page. These are native write bytes before index and log framing. |

The new shape still needs a better version-pointer lookup before offering it on the current-read path. The isolated writer's I/O summaries were empty. Settled bytes and the matched three-writer SQL read counts remain unmeasured. Part 10's single-transaction 23-record baseline is a sizing reference without a matched byte comparison. The diagnostic output has no PASS threshold.

The existing writer separately reran 909 native assertions and the sealed recovery fixture under both credit policies at `af304c2b3`. Each mode reconciled 56 durable edits and six absent refused offers. Those checks cover the part 10 witness. The new writer still needs born-after-switch creation and ordered reuse coverage, lost reply and failed append gates under both credit policies, migrated protected removal and backup restore, deferred Publish, and ordinary import into a migrated person. Full read-route compatibility and atomic enforcement by every other mutator are pending. [Evidence hashes](lab/experiments/EXP-DX1/w1/WRITE11-SHA256SUMS).

## First touch and server forecast

Nine busy accounts with 1,900 distinct people each can account for at most 17,100 first touches, or 14.47% of the 118,200 offers in five minutes at 394/s, before the quiet account. Enumerating the current deterministic full-size tape gives 13,932 busy first touches and 367 quiet first touches, or 14,299 total (12.10%). The counts are 10,535 in the first half (17.83%) and 3,764 in the second (6.37%). These are offered first touches at an untouched start. Actual migrated saves must be counted by first successful append, especially when offers expire.

Measure the cold migration window separately with the original tape. Then run a measured first-touch pass covering the same tape's owners on each disposable arm, perform the same maintenance and restarts, and report the steady windows from reproducible post-pass copies. Compare saves, reads and added bytes for the migration pass too. An unreported warmup would hide more than one in ten saves at 394/s.

The fresh rolling12 result at `1b2eaf8bb` reached 473.80 saves/s at 620 and 2,455 ms second-half ACK p99 at 394. The completed design still forecasts 0.20 SQL fetches/save and 1.09 ms apply at fresh size, 0.30/1.16 ms at 1B and 0.36/1.21 ms at 8B. The pre-run rolling6 ranges are below. These assume the integrated writer avoids the old owner and predecessor reads. This trial keeps the old public-ID check and uses indirect reads to load current rows. The assumptions remain unverified. [Part 10 index forecasts](lab/experiments/EXP-DX1/w1/OWNER-HEAD.md).

| Copy and offered | Completed head durable saves/s | Aggregate offer-to-ACK p99 forecast |
| --- | --- | --- |
| Fresh, 235/s | 231–235 | 0.04–0.50 s |
| Fresh, 394/s | 390–394 | 0.08–3 s |
| Fresh, 620/s | 520–610 | 3–31 s, depending on queue saturation |
| 1B, 50/s | 49–50 | 0.02–0.20 s |
| 1B, 235/s | 231–235 | 0.04–3 s |

The server comparison stays unpublished. Its intended shape is independently restored paired copies for the existing writer, append retirement and completed head, with five-minute windows split in halves, selectable credit mode and lookup sampling every 64 transactions.

## Audit

- The native receipt checks the exact root string, accepted position and clock, the added assertion identities and the owner reference of the new version entity. The same native transaction supplies the retirement marker bytes and immutable page bytes. It also verifies the operation, claim and ordinary journal at the committed cut.
- The isolated gate compares the pre-migration legacy rows, post-migration projection and later roots using exact cuts, and checks the named moving revision, journal and operation receipt. Competing native plans come from one cut. The managed run pins the staged inputs and reports the attempt and source with its test counts.
- The two projection diagnostics require matching fixture digests before sampling. Each independent JVM checks the expected complete row digest at the exact recorded database t on every current and pinned read. The evidence binds fresh scope names, attempt, native cuts and distinct JVM identities. These samples have no acceptance threshold.
