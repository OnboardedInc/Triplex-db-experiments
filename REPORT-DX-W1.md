# DX-W1 part 11

North star P2 and P4. Count serial SQL reads per save and preserve exact current and pinned views. [Scope](lab/SCOPE.md) · [Targets](lab/TARGETS.md).

The integration base is `d1bb9ea9e`. The first write-side slice uses an authoritative root in an isolated native trial. A first eligible replacement takes the old person's live IDs at the guarded cut and puts them into pages of up to 32 IDs. A new version entity carries the assertions and precise retirement markers, with the ordinary journal still under its existing representation. Subsequent replacements change the root and only the affected pages. The legacy rows and legacy revision remain intact.

The authoring scope is deliberately isolated from the product writer. Existing generic writers, import, deferred Publish, protected removal and the complete reader and feed surface do not yet understand the new physical layout. A switch advertised to those callers would risk an incorrect result. The native writer and projection are staged for exact testing, with no new product launch setting or server command.

## First touch and server forecast

Nine busy accounts with 1,900 distinct people each can account for at most 17,100 first touches, or 14.47% of the 118,200 offers in five minutes at 394/s, before the quiet account. Enumerating the current deterministic full-size tape gives 13,932 busy first touches and 367 quiet first touches, or 14,299 total (12.10%). The counts are 10,535 in the first half (17.83%) and 3,764 in the second (6.37%). These are offered first touches at an untouched start. Actual migrated saves must be counted by first successful append, especially when offers expire.

Measure the cold migration window separately with the original tape. Then run a measured first-touch pass covering the same tape's owners on each disposable arm, perform the same maintenance and restarts, and report the steady windows from reproducible post-pass copies. Compare saves, reads and added bytes for the migration pass too. An unreported warmup would hide more than one in ten saves at 394/s.

The fresh rolling12 result at `1b2eaf8bb` reached 473.80 saves/s at 620 and 2,455 ms second-half ACK p99 at 394. The completed design still forecasts 0.20 SQL fetches/save and 1.09 ms apply at fresh size, 0.30/1.16 ms at 1B and 0.36/1.21 ms at 8B. The pre-run ranges for rolling6 are 231–235 / 390–394 / 520–610 durable saves/s at 235 / 394 / 620 offered on fresh, and 49–50 / 231–235 at 50 / 235 offered on 1B. These assume the integrated writer avoids the old owner and predecessor reads. This trial keeps the old public-ID check and uses indirect reads to load current rows. It does not yet establish those assumptions. [Part 10 index and p99 forecasts](lab/experiments/EXP-DX1/w1/OWNER-HEAD.md).

## Audit

- The native receipt checks the exact root string, accepted position and clock, the added assertion identities and the owner reference of the new version entity. The same native transaction supplies the retirement marker bytes and immutable page bytes. It also verifies the operation, claim and ordinary journal at the committed cut.
- The isolated gate compares the pre-migration legacy rows, post-migration projection and later roots using exact cuts, and checks the named moving revision, journal and operation receipt. Competing native plans come from one cut. The managed run pins the staged inputs and reports the attempt and source with its test counts.
