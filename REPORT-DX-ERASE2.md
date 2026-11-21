# Removal on request

**North star** P1, P2, P3 and P6. Verify that a removed value stays absent at old and new points in time, then measure the cost to saves, reads and the journal. [Scope](lab/SCOPE.md) · [Priorities](lab/NORTH-STAR.md) · [Targets](lab/TARGETS.md)

The removal branch includes the ordered writer, the server profile and rolling credits from `f8057d113`. Use the final removal branch tip as an integration input. The earlier removal branch alone lacks the integration fixes and full-size command. The server stage is driver-run. A prepared command is not a v0.1 measurement.

## The November 20 work

| Item | Behavior and gate | Observed cost or result |
| --- | --- | --- |
| Parallel saves and deferred Publish, `9fdad4ed2` and `aae746442` | Two other people save while the first person's plan waits. A plan made before removal is refused without a receipt. Queued Publish settlement and notification writes use the current sequence. Reopening an earlier Publish answer returns the current safe explanation. | The native witness committed at positions 4, 5 and 6, then rejected the stale plan after the removal at 7. The held Publish destinations stayed at 1 and 0. These are correctness counts. The native sequence check adds one validation to the ordinary prepared transaction. [Writer gates and evidence](lab/experiments/EXP-DX1/erase1/WRITER-PART3.md) |
| Durable removal sequence and sealing keys, `dec122118` | PostgreSQL stores the removal record and sealed key rows outside Datomic backups. Replacing the gateway preserves the removed and retained witnesses at both cuts. Restoring the prior Datomic copy refuses reads until the same removal has been replayed. | The prior 64-save Mac blocks had medians 48.93 ms plain, 48.69 ms protected and 18.97 ms plain. The two differences were −0.24 ms and +29.72 ms at the client. The drift makes those figures diagnostic. [Shared authority gate](lab/experiments/EXP-DX1/erase1/AUTHORITY-PART3.md) |
| Scheduled cleanup, `1d6e9afcc` | Both arms remove the same 100 sealed bodies and verify exact absence at the native barrier. One requests a separate build and the other folds cleanup into the next scheduled build. | Mac diagnostics recorded 153 versus 114 leaves and 765 versus 477 ms of native indexing. Both arms checked forty quiet saves. A separate run at 4M facts saw 1.28–1.50× quiet save p99, so the neighbour bar remains open. [Cleanup gate and evidence](lab/experiments/EXP-DX1/erase1/CLEANUP-PART3.md) |

The prior 128-person bare-metal run observed 81.78 ms to durable acknowledgement for 416 aged assertions, 94.37 ms to the verified marker and 1.13 s for 128 sealed bodies. Its full-size run stopped during tooling. [Prior server disposition](https://github.com/OnboardedInc/Triplex-db-experiments/blob/b8c1d9d49/lab/experiments/EXP-DX1/bm1/HANDOFF.md#erasure-stage-disposition)

## Fresh Mac gates

Both the grouped writer and ordered per-person writer passed all 13 product route checks with `--credit-mode rolling6 --sealed-witness` at `3169eb4aa`. Each run checked the native sealed body and pointer for the exact saved witness before removing it. The acknowledgements agreed with the selected writer. Both runs restored a real pre-removal copy and then read the marker. The Datomic SDK suite passed 439 tests with 53 skipped. Focused TypeScript, lint, shell syntax and server help checks passed.

The fresh shared-authority recovery and ordered replacement diagnostic ran at `e15da20ab`. After replacing the gateway, the selected live SQL key was absent while its sealed body still existed. The same marker and unchanged control survived the old-data restore after replay. The three 64-save native application medians were **1.74 ms plain, 1.01 ms protected, 0.81 ms plain**. Protected minus control was **−0.73 ms and +0.20 ms**. Native transaction records were **23 plain and 28 protected** for these replacements. The two plain medians differ by 0.93 ms, so the diagnostic does not settle the 0.3 ms bar. Forecast **0.1–0.8 ms** additional median time on bare metal.


The fresh parallel gate again committed the two independent saves at positions 4 and 5 and the held save at 6. After removal at 7 it rejected the stale save with `CasConflict`. The Publish gate rejected two deferred writes with both destination heads held at 1 and 0. At the same old pin the reopened reader matched an independent read byte for byte and returned the removed-SSN task.

The fresh cleanup arms each checked all 40 quiet saves and exactly 100 removed bodies. Separate versus folded builds wrote **138 versus 99 leaves** in **396 versus 289 ms** of measured native index time. The full cleanup barrier elapsed **3.57 versus 2.24 seconds**. These are Mac diagnostics. The eight saves per block do not settle neighbour p99. The original noisier 4M-record result and this shorter check are retained. The server forecast is **8–75 seconds** to the barrier and **1.10–2.00×** quiet-save p99.

The archives include the first ordered attempt with source drift during restore and the first grouped attempt which did not activate grouping. The later sealed runs used one ordinary heavy token apiece and removed their owned stacks and volumes. [Evidence archive checksums](lab/experiments/EXP-DX1/erase1/DX-ERASE2-SHA256SUMS)


## Product boundary

An empty lean scope can declare the field list with sealed storage. In the pooled database, different accounts can use distinct schema field names in that list. The production declaration still requires an empty scope or an identical existing policy. Retrofitting a field with existing clear history and independently changing one account's policy after pooled traffic begins remain open. The driver uses a private setup route for a newly invented field on an isolated sealed seed. The route is absent from the normal gateway. The protected-value filter returns `ErasureQueryUnsupported`. Raw queries on a protected scope remain conservatively refused.

A separate durable authority can survive loss of the gateway. The Mac simulation replaces the gateway container and its writable filesystem while PostgreSQL stays live. Key rotation against old authority copies still needs a custodian, replication policy and a measured recovery gate. The owner must decide whether to set a physical deletion deadline for sealed bodies and where to host the removal authority and wrapping-key custodian. The existing 15-minute irrecoverability requirement is distinct from the later removal of ciphertext.

## Server and scorecard

Use [the full-size command and forecasts](lab/experiments/EXP-DX1/erase1/SERVER-ERASE2.md) on the ten-account, one-million-person fresh seed. The timing checks cover thirteen live observations. The complete product suite also checks retained replicas, import replay, deferred Publish, notices, the SSN rule and an actual restore. The product suite and live server routes are distinct evidence. Both scorecard rows remain NOT RUN. The handoff describes adding the live checks on the shared seed and retaining the restore fixture for the standing checks.

## Evidence audit

- The local regression verifies the exact 13 route names, the planted identity and protected value before removal, the marker and logical position after removal, plus both backup and restore. Its sender verifies the configured credit mode by admitting the actual saved witness, resolving its credit from the gateway reply and reading the acknowledged row. The launcher binds the attempt, source and compiled files, gateway bytes, image, slot and owned cleanup. The rolling route suite proves compatibility with rolling admission. The loaded credit benchmark is a separate server window.
- The authority recovery checks the gateway replacement identity, original and retained assertions, same removal sequence and restored marker, and verifies key absence while the ciphertext is still present. The application counter samples require a prepared reply, exact operation and claim, and matching native row. A missing native counter remains unmeasured.
- The server input verifies the build and seed pins, supported launch policy, stopped PostgreSQL cluster and original logical head. The removal and live checks compare the exact original identities, marker and retained row coordinates from this attempt. The feed and stored journal checks verify original change records and the exact new positions. The load samples are reconciled against durable journal identity and contents. Cleanup checks the exact identity set, missing live keys, native excision transaction and body absence, and a retained marker.
- Shutdown evidence requires the exact owned container IDs stopped, a clean PostgreSQL exit, absence of the live PID file and the PostgreSQL clean-shutdown state. Source, slot and attempt are recorded with the observations. Failed or missing checks cannot stand in for an accepted measurement.
- A path comparison against the acceptance catalog found no changed pinned path. No acceptance files were edited.
