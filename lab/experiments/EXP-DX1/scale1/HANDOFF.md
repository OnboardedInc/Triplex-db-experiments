# DX-SCALE1 handoff

North star. Measure pinned reads, offer-to-ACK commits, feed lag, current worlds and verified release activation on one and ten independent deep accounts. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

<!-- state -->
At 17:45 UTC November 19, DX-DRV1 still owned the bench through its third arm. BM1 has priority next through its day queue. DX-SCALE1 has started no remote process. The local branch contains the driver merge. The experiment branch needs an initial public revision before the server can clone it. The lab preamble assigns pushes to the orchestrator. The task separately requests report pushes after each measured item.
<!-- end state -->

With `BENCH_SERVER` set from the private brief, this one read-only command shows the previous controller, its terminal status, every scale unit and each arm's stage.

```sh
node --import tsx lab/experiments/EXP-DX1/scale1/control.ts status
```

After BM1's terminal handoff, `control.ts prepare` builds the exact published revision from anonymous HTTPS. Its ceiling is 35 minutes. Each `launch` refreshes BM1, checks the tested public head, checks the dedicated daemon, and starts a separate systemd unit with process-group and stack cleanup. Use a fresh tag for each attempt. The runner retains failures and aborts an arm after 15 minutes without workload evidence progress.

| Order | People × scopes | Arms | Maximum time per arm |
| --- | --- | --- | --- |
| 1 | 10,000 × 1 | zero then reader | 4 h each |
| 2 | 100,000 × 1 | zero, reader, activation | 8 h, 8 h, 10 h |
| 3 | 10,000 × 10 | zero, reader, activation | 4 h, 4 h, 10 h |
| 4 | 100,000 × 10 | zero, reader, activation, or bounded parallel seed if only seeding fits | 8 h, 8 h, 10 h |

Once the tested revision is published, `control.ts campaign BATCH` runs the ordered sequence from the Mac. It polls the prior queue locally, prepares the public checkout, waits for each cleanup and transfer, and uses the measured sizing from the matching single-account rung. Reusing the batch resumes from its verified terminal files. Set `DX_SCALE1_SOURCE` to retain the tested runtime revision across report-only commits.

The command takes `launch ITEM FRESH-TAG zero|reader|activation|seed`. For a reader, pass `--baseline ZERO-TAG`. Use `--sizing SINGLE-READER-TAG` for an observed memory and disk estimate. Item 4 requires the single-100k sizing receipt. A capacity refusal leaves its arithmetic in the attempt directory before any engines start. Examples use shell variables for the deployment and attempt names.

```sh
node --import tsx lab/experiments/EXP-DX1/scale1/control.ts launch 1 "$ZERO_TAG" zero
node --import tsx lab/experiments/EXP-DX1/scale1/control.ts collect "$ZERO_TAG"
node --import tsx lab/experiments/EXP-DX1/scale1/control.ts launch 1 "$READER_TAG" reader --baseline "$ZERO_TAG"
node --import tsx lab/experiments/EXP-DX1/scale1/control.ts collect "$READER_TAG"
```

`collect` verifies the archive bytes and terminal identity, updates the durable trace index and regenerates the owner report. Archives under 2 GiB can be copied to the Mac. Larger raw archives retain their server path, size and SHA-256 in the transfer receipt. An unqualified or partial run retains its actual exit, last seed progress and cleanup inventory. Never infer an arm's end from its ceiling.
