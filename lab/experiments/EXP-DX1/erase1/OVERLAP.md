# Batch excision, import and Publish

**North star** P2, P3 and P5. Price larger native requests and check whether other durable paths can retain or revive an erased value. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

## Ten and a hundred people

Each arm used one Datomic excision transaction and one index job on the 94,848-fact seed. Each person's edit saves changed two fields. Both fixtures isolated the target journal rows before measurement. Save and read columns give p50/p99 in ms for the paired 500-save blocks. The narrower job window uses the native create-index interval.

| People / saves each | Matched datoms | ACK / index / sync, ms | Leaf / directory writes | Saves, control → erase | Pinned reads, control → erase | Saves entirely in job (n) |
| --- | ---: | ---: | ---: | --- | --- | --- |
| 10 / 32 | 7,313 | 29 / 732 / 944 | 75 / 7 | 11.9/42.0 → 10.9/85.2 | 3.0/14.7 → 2.6/14.8 | 19.5/278.0 (14) |
| 100 / 8 | 42,007 | 146 / 1,240 / 1,890 | 133 / 7 | 10.2/26.0 → 10.2/66.6 | 2.4/8.9 → 2.5/10.8 | 15.3/172.2 (48) |

Fresh reads cleared all selected rows after synchronization. Retained gateway handles still returned the protected marker 7.5 s and 7.3 s after the requests. GC after both arms removed 17.9 MB of stored values and freed zero relation bytes. The separate full rewrite freed 24.9 MB of relation allocation. [Method](METHOD.md)

## Import

The real paced `ImportRun` wrote 18,795 assertions for 160 deep subjects in 40 frames per arm. Native excision of the aged person started with the first overlapping write. Three frames covering 1,407 assertions touched the 590 ms index job. Five frames touched the request-index through synchronization interval. The job wrote 157 leaves and eight directories, including ordinary concurrent writes. The fresh barrier took 988 ms. Median frame ACK was 126.7 ms in control and 135.6 ms with excision. The elapsed write span was 7.71 s in each arm. This comparison used disjoint input IDs in the same scope.

After fresh reads confirmed absence, a one-entry archive replay through `ImportRun` asserted the same exact value again. The fresh import receipt matched its journal payload, and a new gateway read returned that value. The native excision imposes a cutoff on old datoms. The import needs the erasure frontier to fence late entries for the erased assertion.

## Publish

The real INT1 `activate` took logical cut 41 in a separate 320-person scope. The first checkpoint deliberately held it until excision completed. The job rewrote 23 leaves and seven directories in 110 ms. Its fresh barrier took 1.04 s. Publish then completed in two durable page commits at the original cut. All 320 native outbox readbacks and all 320 O-DOMAIN comparisons matched that original cut. Activate took 2.22 s including the intentional pause.

The SQLite world projection still returned the exact erased `field-0` value after the barrier. The published subject had one pending item and its outbox body contained no copy of the test marker. This run shows a Publish can retain pre-erasure inputs and commit its old-cut result. It exercised a synthetic field rather than the SSN-specific rule or a protected payload in an effect. [Publish implementation](../int1/activation.ts) · [Erasure rulings](../../../acceptance/RULINGS.md)

The [manifest](OVERLAP-SHA256SUMS) is relative to the durable `evidence/DX-ERASE1/` directory. `batch-700` includes both paired blocks and reclamation. `overlap-700` includes the import checkpoints, matched native log, original Publish projection, durable page receipts, two fresh-peer reads and cleanup. The local runner bound both attempts to their exact source and slot.
