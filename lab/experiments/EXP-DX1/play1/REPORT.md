The playground can start from the Git fixture or a prepared database snapshot.
Snapshot startup checks files and compares generated people at three points in time.
The small fixture and all three larger snapshots restored correctly on the Mac.
The 5 GB option is forecast at 246 deep people and 9,840 wide people.
The full population choices exceed 5 GB in the sizing model.
The clean-clone workflow runs only when started by hand.
Erasure stays unavailable because the integration branch refuses protected native queries.
Continuous compliance scenarios remain reserved for the owner.

## Start and explore

```sh
pnpm playground start
pnpm playground stop
```

For a prepared tier, use `pnpm playground start --tier NAME --data SOURCE`. Supply a local snapshot directory or an HTTPS object base containing its manifest. The Git fixture retains its replay path. The older compact history bundle remains available with `--tier full --replay`.

Open the printed loopback address. Pick an account and a person to compare the current graph with an earlier cut. Try a save, duplicate receipt and stale conflict. The live feed resumes at its native cursor. Publish shows the first answer and reports materialization progress. The right panel shows returned records, available timing spans, and JSON request and reply. The dashboard and both MCP transports call the same action service. [Agent guide](../../../../AGENTS-PLAYGROUND.md) · [Data model](DATA-MODEL.md) · [Full-tier size and upload](SIZE.md)

**North star** P1/P4 exact current and earlier reads, P2 atomic saves and receipts, P3 ordered resume, P5 Publish and P8 import. Laptop timings are diagnostic. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

From the Mac lab, rerun the correctness gate with one ordinary heavy token and a fresh output directory.

```sh
node lab/bin/heavy.mjs --label DX-PLAY1-live -- node lab/bin/engine.mjs play1 \
  --holder DX-PLAY1 --portable --browser --out "$PLAYGROUND_EVIDENCE_DIR"
```

## Evidence and limits

The deterministic Git fixture, action discovery and loopback transport checks passed. Stdio discovery returned all 13 tools in two JSON-RPC frames. The pinned lockfile validated offline in lockfile-only mode. Raw output and its source binding are in `evidence/DX-PLAY1/lightweight.txt` and `evidence/DX-PLAY1/lightweight-source.json`.

The lab-admitted small bundle gate passed all four checks, including an HTTP range resume and refusal of a corrupt object. The four workspace builds and the final playground TypeScript check passed under ordinary heavy tokens. Formatting and lint passed for the changed files. The package logs are `evidence/DX-PLAY1/build-ordinary-02.txt`, `evidence/DX-PLAY1/typecheck-final.txt` and `evidence/DX-PLAY1/fixture-test-retry.txt`.

The `live-12` gate passed on source commit `3f2db8cc9` in a fresh database. It checked all 13 API actions, including exact current and historical records, the second submission's original receipt, stale and command-key conflicts, native query results, release answers and both MCP transports. Chromium exercised the dashboard with the live feed active through Publish and observed a background write. The quiesced PostgreSQL restore matched all 885 source rows. Teardown removed the attempt's containers, volume, network, built image and runtime directory, closed its HTTP listener and released its slot. The evidence is under `evidence/DX-PLAY1/live-12`. [Evidence checksums](SHA256SUMS)

Earlier attempts are retained. A live dump produced a different row digest while Datomic was still running. The first Chromium launch was denied by the macOS sandbox. Later Chromium attempts reached an unavailable transactor during Publish even though its container was still running. The final path uses the reader for the feed watch, checks transactor liveness and quiesces the owned Datomic processes before dumping. All Mac timings are diagnostic.

The full-population artifacts, replay and restore remain unmeasured. The `live-12` lab gate exercised the portable launcher and teardown through `engine.mjs`. The manual workflow covers a separate clean clone on plain Docker once dispatched. [Size and startup paths](SIZE.md)

The part 2 small snapshot restored and ran all 13 actions on the source used for the sizing ladder, `734890a2c`. The three individual-save samples measured 19,278, 34,862 and 66,010 initial facts. The first 96-person attempt failed with a Datomic read error. Subsequent runs passed after the playground bounded config reads to committed subject IDs and rebuilt against the integration ref. The fit selects 246 deep people and 9,840 wide people at the 5 GB sensitivity ceiling. Its upper build forecast is 2.21 hours, so I retained the one-command server recipe and did not build the selected tier on the Mac. No bucket or upload was created. [Sizing table and command](SIZE.md)

On integration revision `990badf25`, playground commit `3b40fd516` passed the build, typecheck, six fixture tests, all 13 restored API actions, both MCP transports and Chromium against the restored database. The snapshot gate checked all three time cuts and verified that no owned runtime resources remained. The evidence archive is `part2-final-01.tar.gz`. [Evidence checksums](SHA256SUMS)

The release demo uses the shared ConfigStore and the HTTP package's configuration descriptors. An intentionally small status rule provides a visible answer and durable background materialization. The standalone Foldkit explorer continues to serve the generic Triples view. The Datomic dashboard has its own workspace panel for commit positions, traces, native query and Publish.

The orchestrator confirmed that the superseded plan commit used the generic lab identity.

## Observation audit

- The Git fixture loader checks SHA-256 and size. The fixture test compares generated bytes to the actual checked-in archive and verifies shape and temporal differences.
- The full bundle loader checks manifest profile, inventory, order and each object's size and SHA-256 before importing. Replay validates each object's record count. Resumed downloads check the returned byte range and final digest.
- Stack startup compares the fresh loopback gateway response to the expected version and source. It reads back the mounted source and codec file hashes from the labeled containers.
- Saves use a durable command claim and an intent digest. The stale check binds the person's observed assertion identities to its write precondition. The response reads the write result at its receipt position.
- Publish commits the configured policy and evaluates against the returned position. Background progress advances only after writes return their receipts. The live gate checks the visible action result against its independently expected status and compares the persisted answer.
- The native gate exercises every action in one fresh scope and records the matching source and fixture identities plus the exact slot and attempt. The dump probe checks all three Datomic containers' attempt labels before stopping them, then compares restored keys and values with that attempt's quiesced PostgreSQL database and records the dump SHA-256.
- Teardown inventories only the unique attempt label, checks zero owned Docker resources, rejects the former health endpoint, and releases the exact holder and slot. A failed cleanup preserves the reservation for investigation.
- No acceptance files or paths named in the acceptance checksum pins changed.

## Snapshot observation audit

- Startup binds the requested tier to the manifest, verifies chunk names, order, sizes and SHA-256, and hashes again after copying each object into the isolated PostgreSQL container. The selected PostgreSQL and Datomic versions and fact codec constrain the restore format.
- A restored instance checks the exact Datomic scope, head and checkpoint carried by the archive. Before exposing API actions it compares the independently generated person and owned-record values, cardinalities and keys at the current cut and both earlier cuts. The fresh restore gate also reads the first person through the HTTP API.
- The snapshot runner writes its evidence after the checked read, measured memory and storage observations, confirmed owned-resource inventory and shutdown of its original API address. The Mac adapter binds the gate to a committed source tree, manifest digest, unique run and live reservation owner before sealing.
- Export waits for a fresh Datomic index job on the exact source database and checks that its requested native tick covers the named snapshot head. The subsequent shutdown quiesces the owned processes before measuring and exporting PostgreSQL.
- The private playground scope has one config writer. It records config subject IDs from the committed ConfigStore result and uses them to bound subsequent reads of those records. ConfigStore still reads Datomic values. An uncertain commit invalidates the bound IDs until ConfigStore reads the authoritative state again.
- The manual workflow binds the checkout to the dispatched commit, requires empty initial inventory, exercises expected fixture results on a fresh loopback server, then compares Docker inventory and requires the runtime directory and listener to disappear.

## Manual clean-clone workflow

Once the workflow file is on the repository's default branch, open Actions, choose **Playground clean clone**, select the branch to test and click **Run workflow**. The CLI equivalent is `gh workflow run playground-clean-clone.yml --ref exp/DX-INT1` after the playground is merged there. This implementation did not dispatch the workflow. [GitHub manual workflow documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
