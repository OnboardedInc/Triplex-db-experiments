All accounts stay in one Datomic database.
The aging tool writes a full journal and keeps one native transaction per save.
Two Mac admissions ended before any database started. A new attempt is queued.
Larger ages have no measurements from this run yet.
The server forecast depends on the rate of those complete writes.
The successor rehearsal checks a single move for every account.
The erasure drill tracks whether old copies can still return a value.
The timings from this Mac will describe this setup.

# DX-AGE1

**North star** P1 exact old and near pins, P2 durable save tails, P3 feed, P4 current reads. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Aging and gate

The deterministic solo K tape has ten deep and four thin accounts. Each replacement retains 16/20/24 datoms for one/two/three fields. A native pipeline preserves the original physical transaction boundaries. The gate drives the ordinary gateway save entry point against a separate database, then compares durable native logs, receipts, current rows, old pins and feed pages against the same tape. [Method](METHOD.md)

## Receipt audit

- Seed batches and native save batches compare every expected value, attribute, entity and added/retracted bit against fresh, monotonically advancing native reports. The save header and source position bind the command. Engine-assigned instants are checked for type. The exact logical clocks are checked as values.
- The fidelity observation is emitted only after both new databases' named receipts, durable log frames, current and pinned rows and feed pages match. The attempt binds its source archive, validated container identities, image and library hashes, SQL settings, exclusive slot and cleanup.
- Changed files are outside the acceptance pin set. The acceptance contract was left intact.

## Measurements, campaign and successor

The Mac harness measures the fixed population at three increasing ages, with 3.5 and 50 offered saves/s, settled and overlapping index requests, fresh-peer and warm reads, role memory, SQL bytes and native recovery. [Method](METHOD.md)

The 1B / 2B / 4B / 8B server campaign has predeclared predictions and stop conditions. At 20k records/s from a compatible 0.82B seed, age-only cost is $2.73 / $17.86 / $48.14 / $108.70 cumulative. This is a sensitivity; the full-shape sustained rate still needs a run. [Campaign](CAMPAIGN.md)

The successor prototype carries all 14 test accounts at one logical cut. It checks the old product writer fence, current and old pins, a two-era page, replay of the original native receipt and erasure carriers on both sides. Full erasure remains open until the drill executes.

- The Mac read and feed measurements compare sampled content with the tape at their requested cut. Index adoption binds a native t; overlap samples require interval intersection. Backup checks the vendor segment readback at the selected t, then restored logical head, current and pinned values, receipt and feed in separate SQL storage.
- The successor observation checks the exact pre/post-cut oracle and feed, then records physical erasure observations and routed marker results at the named cuts. It has no production erasure verdict.

## Evidence to date

The durable DX-AGE1 evidence root has cleanup receipts for fidelity-a and fidelity-b. Both record zero owned roles and volumes. The first attempt yielded its heavy token. The second lost a measurement-lease race. JavaScript syntax, target inversion, budget arithmetic and the fit implementation were checked locally. The Datomic gates and measured-rate server repricing remain open.
