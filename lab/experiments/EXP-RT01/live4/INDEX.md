# RT01 live round 4 evidence

North star: P1 exact pinned reads and P2 small atomic commit latency; scope/targets: lab/SCOPE.md, NORTH-STAR.md and TARGETS.md.

**G2 PASS. G6 setup blocked, timing UNJUDGED.** Recorder `top` spawn gets sandbox EPERM before any A/A/B sample. No rule file or 10k seed. A read-only permission probe succeeds, but recovery disk is 12.24 GiB versus the unchanged >13 GiB forecast. No second live attempt. Owned resources removed, private trim/context verified; old live3 FAIL unchanged.

Raw root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live4/`.

- `prep1`: actual 19 rule tests and exact executed source preimages (new non-GREEN continuation policy).
- `admission1`, `owner-start.json`, `engine-start.json`: actual inside-grant capacity, slot and engine identity.
- `live-attempt1`: closed command streams/exits, first setup failure and engine removal.
- `g2-attempt1`: six build phases, exact source/build maps, full conformance/routes/schedules/determinism and SQL trace.
- `g6-attempt1`: source/build/baseline/runner binding, initial sanity/setup traffic, exact EPERM stack, empty calibration/points. Raw program FAIL is a setup error, not a judged performance failure.
- `cleanup.json`, named cleanup stdout/stderr: exact owned-resource absence, private fstrim and context restore.
- `counter-check1`: fresh actual aggregate host counters with approved execution permission, read-only slot/disk/context check and no recovery acquisition.
- `RESULT.json`, `seal-source.mjs`: content-checked derived outcome and exact closure implementation; full manifest read back after all streams close.

`DURABLE-SHA256SUMS` is relative to this raw root. `DURABLE-INDEX.json` gives file/byte totals. Bulky traces remain outside Git. Source files are preserved in prep1; no live flow beyond initial recorder setup is claimed. A future attempt requires new output paths, approved host-counter permission and sufficient disk; never overwrite this attempt or regrade live3.
