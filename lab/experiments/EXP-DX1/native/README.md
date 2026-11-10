# Native lane D (DX-N1)

North star: P1/P2 second measuring arm to distinguish hypervisor penalties from database cost. No acceptance promotion.

Run `bash lab/experiments/EXP-DX1/native/setup.sh` once. It installs only beneath
`/Users/sam/Claude/Projects/triplex-db-2/native/tools/`. Dependencies use the pinned offline store. Build packages in this
worktree before measuring. Run all engine work through the lab heavy wrapper:

```sh
node lab/bin/heavy.mjs --label DX-N1-smoke -- bash lab/experiments/EXP-DX1/native/run.sh smoke tx2-dxn1-example
node lab/bin/heavy.mjs --label DX-N1-tests -- bash lab/experiments/EXP-DX1/native/run.sh tests tx2-dxn1-tests
node lab/bin/heavy.mjs --label DX-N1-medium -- bash lab/experiments/EXP-DX1/native/run.sh medium tx2-dxn1-medium
DX_NATIVE_WAL=fsync_writethrough node lab/bin/heavy.mjs --label DX-N1-flush -- bash lab/experiments/EXP-DX1/native/run.sh medium tx2-dxn1-flush
node lab/bin/heavy.mjs --label DX-N1-matched -- bash lab/experiments/EXP-DX1/native/matched.sh tx2-dxn1-matched
```

`run.sh real PREFIX [driver args]` uses the original driver's smoke profile at 10k subjects by default; provide the desired
profile/rung/limits. `medium` explicitly uses 2,000 subjects and 30-second levels. `pair` runs a zero-reader arm then a ladder
using its writes as the baseline, each in a separate bounded hold (like h3). `matched.sh` holds one lock for VM/native/VM/native.

`up.sh PREFIX` is a **foreground supervisor**: it writes `runs/PREFIX/ready.json`, waits, and stops every owned process on
exit. It never detaches. Use it under a measurement lock. `down.sh PREFIX [--keep]` validates recorded PID birth/command
identity, stops only those roots (Postgres shuts down its children), and deletes `pg-data` and `tx-data` unless `--keep`.
Logs, PID records, effective configuration, source/build hashes and cleanup evidence remain. Run names cannot be reused.
Every measured attempt is archived compressed under `evidence/DX-N1/`. A 19-minute timer reserves the final 60 seconds
of the 20-minute lease for cleanup; a failed cleanup retains the lock for inspection.

Endpoints bind only to IPv4 loopback at 28400 (Postgres), 28401 (transactor), 28403/28404 (gateways). The supervisor checks
28400–28405 before launch. `DX_NATIVE_PORT_BASE` selects another six-port range within 28400–28499. The gateway run-local
copy changes only its hardcoded listener; original and adapted file hashes are recorded. Datomic remains 1.0.7745. The native
arm has no CPU quota or affinity; `taskpolicy` removes background policy and requests tier 0/default disk policy. The driver
uses `TX2_NATIVE_PIDS` for cumulative `ps time` sampling, including live PostgreSQL descendants. CPU of short-lived exited
children may be missed. Per-process fields keep the existing `containers` key for report compatibility. No quota bar is emitted.

`DX_NATIVE_WAL=default` records the macOS default; `fsync_writethrough` explicitly selects the stronger flush request.
Both always enable fsync, synchronous_commit and full_page_writes and read their effective settings back from Postgres.
There is no power-loss qualification here. The Colima VM remains running; no keep-awake helper is used.

To remove installed tools and all retained native runs **after all supervisors are stopped and PID cleanup is verified**:

```sh
rm -rf /Users/sam/Claude/Projects/triplex-db-2/native
```

This deliberately leaves compressed evidence in `evidence/DX-N1/`.

For bounded N1 windows, the existing differential corpus supports ranges without changing its RNG stream. Use
`DX_N1_TEST_SET=remaining DX_N1_LAYOUT_COUNT=100` after a retained completed reach/concurrent run, then
`DX_N1_TEST_SET=layout DX_N1_LAYOUT_COUNT=100 DX_N1_LAYOUT_START=100` and start `200`, each with a fresh prefix. The default
remains all eight suites with all 300 scenarios; report the ranges and completed files rather than treating a partial run
as a full pass.
