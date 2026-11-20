# Recovery drill evidence

The files live under the durable evidence directory for DX-HA1. Run `shasum -a 256 -c PATH_TO_SHA256SUMS` there. Each directory name includes a fresh attempt nonce. The manifest also covers partial attempts and their first failures.

| Attempt | Experiment | Recorded outcome |
| --- | --- | --- |
| `failures-6762852d-66c6-4cb5-b68f-cbd47542bb20` | failures | Admission wait ended before any container was created. |
| `failures-3ac86e9e-b935-4aca-a288-99c7500135ca` | failures | Stopped. Datomic exited before its broker opened. Explicit JDBC driver configuration and both log streams were added. Cleanup recorded. |
| `failures-3a61405b-c92d-4b23-8a4d-30e98509ed44` | failures | Stopped. The append fixture selected a scope-wide conflict check without a source position. Cleanup recorded. |
| `failures-1a07bfd1-1fc7-4ea0-a862-5c4d4e6dba3c` | failures | Stopped. The operation lookup path split a synthetic identifier containing a slash. Cleanup recorded. |
| `failures-e6422603-f34f-4e7b-abe6-ee29f1d6140c` | failures | Stopped. Writer could not reconnect to the old dynamically published Docker port. Cleanup recorded. |
| `move-e863f5b1-fe1d-4c36-a1f0-097af5d992f6` | move | Stopped. The pinned CLI returned a parenthesized cut list. The initial parser expected a map. Cleanup recorded. |
| `move-4af352f4-e042-4fc6-9256-f44b1ba1cc0d` | move | Diagnostic with cleanup, 640 seeded facts. The working tree based on `2e9bc58e6` included the corrected cut parser. The published-source baseline follows at `0d347ebe5`. |
| `replication-f16f12d0-829a-4b5b-9f7a-a541a2a66695` | replication | Completed with cleanup. Source `0d347ebe5`. Two pairs of 30 application commits per arm plus promoted-primary readback. |
| `failures-f390a673-4396-480a-867b-d154d5cd2d16` | failures | Completed with cleanup. Source `0d347ebe5`. Four fault files contain per-scope receipts, intervals and live read/feed observations. |
| `move-de720297-f039-46f1-8a69-a7ef0ce1554c` | move | Completed with cleanup. Source `0d347ebe5`. 640 seeded facts. |
| `move-f0bb9e34-908f-4587-8881-93b6cf03be19` | move | Host free disk fell below the 5 GiB admission floor. No role was started. |
| `move-c4d6c76d-4f91-4124-b685-c8c304597892` | move | Host free disk fell below the 5 GiB admission floor. No role was started. |
| `failures-92ec3d7f-30f4-4af2-beec-0ffcdc30ee0e` | failures | Completed with cleanup. Source `6fdc0ae2a`. Four fault files contain per-scope receipts, intervals and live read/feed observations. |
| `move-eb91545f-8107-49a4-b7ea-e81b14f65c35` | move | Completed with cleanup. Source `6fdc0ae2a`. 5,120 seeded facts. |
| `move-1a99afc0-08e4-4e0d-8f3b-2c55f81ff414` | move | Completed with cleanup. Source `6fdc0ae2a`. 20,480 seeded facts. |
| `move-647fc814-a355-406e-89dd-bf20294a8611` | move | Completed with cleanup. Source `068815b67`. 20,480 seeded facts. |

## Local gates

The first general lab check lacked published outputs for other lanes in the filtered install. After building those workspace dependencies, the second run reported only the pre-existing unchecked file. Both gate directories include raw standard output, exit status, source and log digests.

- `gates-5ea1c716-9965-4bf1-9a02-14126e80610b` contains the first check run.
- `gates-cd0574f5-d926-42fd-b450-bd521d04c231` contains final checks, the baseline file comparison and the three-rung sizing calculation.

The sustained fault measurements use `failures-92ec3d7f-30f4-4af2-beec-0ffcdc30ee0e`. The promotion measurement uses `replication-f16f12d0-829a-4b5b-9f7a-a541a2a66695`. The instrumented move repeat uses `move-647fc814-a355-406e-89dd-bf20294a8611`.
