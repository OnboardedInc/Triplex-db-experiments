# Aged input for the v0.1 scorecard

At seal, AGE1 writes `1000000000/aged-scorecard.json` and prints its SHA-256. Keep the bundle digest from the provisioning output. The bundle contains the native Datomic ID, physical database name, canonical scope, real history count and exact physical and logical cuts. It names the original SCALE1 seal, the complete ten-account roster, the original and final record clocks, the active-set size and replay length. It embeds the two exact replay ledgers compressed together and gives their independent hashes. Neither URI nor SQL credentials are in the bundle.

The queued server revision `2859d6b15` can finish as pinned. Run the exporter from the merge candidate against its intact run directory and exclusively held database once it seals.

The handoff labels the journal encoding. Merged INT1 writes compact rows with authoritative predecessor metadata. A seal from the queued revision uses the earlier K journal. The checker uses the encoding recorded by the producer when it compares the feed.

```sh
node lab/experiments/EXP-DX1/age1/scorecard.mjs export \
  "$AGE_SEALED_JSON" "$AGE_SEALED_SHA256" "$AGE_STATE_EDN" "$AGE_HANDOFF_JSON"
```

`AGE_SEALED_JSON` is the runner's `1000000000/sealed.json`. The state is `age1-<sha256-of-physical-database-name>.edn` next to the runner output directory. Keep the adjacent `.population.edn` and the original attempt directory. Use the original seal's trusted byte digest. The exporter checks both ledgers and the seal and restore observations, then opens a fresh peer on the sealed live cut.

Before offers, the scorecard can run the following with its own actual database destination. `AGE_JAVA`, `AGE_DATOMIC_HOME` and `DATOMIC_URI_TEMPLATE` select the running storage. For an owned native restore with a renamed database, set `AGE_SCORECARD_PHYSICAL_DB` to its assigned `age-restore-<uuid>` name. The restore must preserve the original Datomic ID and exact cut.

```sh
node lab/experiments/EXP-DX1/age1/scorecard.mjs check "$AGE_HANDOFF_JSON" "$AGE_HANDOFF_SHA256"
```

The command fails on a fresh seed or an advanced head. It compares the exact logical scope and history count, native ID, both cuts, the final durable receipt and clocks, ten original member and row witnesses, current and pinned field probes, and the last seven journal entries. A successful CLI observation is bound to a new peer challenge and the expected handoff bytes. A fresh or incomplete calibration has no 1B handoff.

`replayLedgerGzip` is base64 of gzip-compressed JSON with two entries. Each entry is base64 of the exact EDN file. The checkpoint holds the final save offset and probe predecessors. The population ledger holds original owner IDs, revisions, predecessor row texts and record clocks. `triplex.age.rung/load-state!` reconstructs the population with the sparse probe map. `triplex.age.tape/command` derives command and journal IDs from an offset. `triplex.age.tape/expected-adopted` derives current rows at a replay offset for those owners. To cover the rest of the roster, use SCALE1's source graph and original loader identities at the original cut. AGE1 saves touch only the owners named by its active and probe ledgers.

The current v0.1 launcher still expects a legacy INT1 seed. Its SCALE1 path must select this explicit lean layout, consume the replay preimage and require the live check before arming its tape. The handoff does not certify fresh-arm adoption, thin and small account coverage, or the scorecard's timing.
