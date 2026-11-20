# Adopting the pooled SCALE1 seed

The server input is the verified `image.json` from the SCALE1 decision loader, its independently verified transfer digest, and an exclusively held database containing that seed. Admit only after the transfer's restored-data checks, or from the original quiesced seed after sealing. AGE1 checks the pinned image manifest bytes, database scope, exact seed cut, LOAD1 manifest and final command, layout, logical clock and the stored membership, row bytes and revision of every selected subject at that cut. The independent transfer binds the original dump checksum to restored storage. Repeat adoption from the same cut on resume and retain the same roster.

| Property | SCALE1 pooled seed | AGE1 part 1 synthetic seed |
| --- | --- | --- |
| People and accounts | 1M people, 10 deep accounts | 10 deep and 4 thin accounts, parameterized |
| Physical seed | Lean v3, strict clocks, native rows for real deep graph including refs and membership, verified bulk-import journal, claim and scope metadata | Lean v3, strict clocks, plain synthetic field rows, minimal frame metadata |
| Editable subject | First task of each sampled person, fields 0–2, 57-character values | Flat synthetic person, first three fields, shorter values |
| Seed lookups | Indexed task ID and archived field texts at the sealed cut. Lookup distinctness and owner revision come from native storage. | IDs, predecessor bytes and revision derived from synthetic tape |
| At and beyond the cut | Solo K saves, matched by physical record bytes after normalizing native transaction IDs and instants | Solo K saves with the same per-save record categories |

Use the observed Datomic history count for the absolute target. The seed's 162,456,470 facts are the business fact count. The journal, claim, owner, revision, physical transaction and schema records add to that count. If the native count is 0.82B, adding 180M records at 5,875–20,097/s takes 2.49–8.51 hours ($2.71–$9.28). Restarting the full seed took a forecast 18 hours ($19.62) before aging or measurements. A fresh 0.25B synthetic start would add 750M records and cost $11.30–$38.65 plus the new seed and the measurements. The adopted seed preserves the previously paid work and exposes the actual graph and bulk-import records to the index and cold-read tests.

The local fixture executes the SCALE1 two-frame `Snapshot` loader and `source()` fixture from `04e864ae07af65b952d015cb9907a35bc66ecf09` through the public SDK. It reduces the roster to eight people per account and uses the staged AGE1 gateway with the same lean v3 and strict-clock settings. Native backup/restore gives the product and generator the same seed IDs and timestamps. The gate compares both against an independently evaluated tape and each other at current and pinned cuts.
