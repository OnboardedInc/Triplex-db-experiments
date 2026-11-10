# DX-H6 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6/`.

- [SHA256SUMS](SHA256SUMS): 1165 files, 3537312750 bytes; all independently checked with `shasum -a256 -c` (exit0). This is integrity verification, not semantic acceptance.
- [PIN-CHANGES.json](PIN-CHANGES.json): no changed acceptance-pinned path; acceptance contract unchanged.
- `recorded-pages/`, `recorded-source/`: actual 16-page HTTP capture and 1,000 original-SDK golden subjects.
- `offline-runs/final-common-layout/` and `offline-runs/post-b8-current/`: identical measured source hashes; all golden bytes equal, differing measured CPU costs retained.
- `analysis.json`, `seed10000-rate-curve.json`, `seed10000-journal-observation.json`: derived observations; not acceptance.
- `tx2-dxh6-sweep1000d/`: final 4-worker/cap2 warm live run; all seven previously complete gates PASS, overall PARTIAL.
- `tx2-dxh6-seed10000/`: guarded exit1, incomplete G0; complete2.303 GB ACK journal retained. No10k sweep executed.
- `gateway-floor/`, CPU profiles, all probe/failure/build/test logs remain under the durable root.
- `final-owned-inventory.json`: no H6 containers, networks or volumes remain. No sealed H6 volume kept; H5 original seed untouched.

Queue-only helper cancellations were consolidated into `DX-H6-evidence-batch`; their original queue logs remain. The final1k admission retried with the lab tool's supported100ms polling after starvation at1s. Neither cancellation was a semantic trial. Temporary checksum execution logs are `/tmp/dxh6-manifest-result.json` and `/tmp/dxh6-manifest-verify.log`; the committed manifest and inventory are the durable record.

Attempt exit/cleanup inventory (removed volume names come from actual cleanup output):

| Attempt                    | Exit | Finished UTC         | Removed volumes                                                                                         |
| -------------------------- | ---: | -------------------- | ------------------------------------------------------------------------------------------------------- |
| `tx2-dxh6-record1`         |    1 | 2026-11-10T12:19:50Z | `tx2-dxh6-record1-driver`, `tx2-dxh6-record1-pg-data`, `tx2-dxh6-record1-tools`                         |
| `tx2-dxh6-record2`         |    0 | 2026-11-10T12:23:38Z | `tx2-dxh6-record2-driver`, `tx2-dxh6-record2-pg-data`, `tx2-dxh6-record2-tools`                         |
| `tx2-dxh6-seed-probe1`     |    1 | 2026-11-10T13:28:41Z | `tx2-dxh6-seed-probe1-driver`, `tx2-dxh6-seed-probe1-pg-data`, `tx2-dxh6-seed-probe1-tools`             |
| `tx2-dxh6-seed-probe2`     |    1 | 2026-11-10T13:53:20Z | `tx2-dxh6-seed-probe2-driver`, `tx2-dxh6-seed-probe2-pg-data`, `tx2-dxh6-seed-probe2-tools`             |
| `tx2-dxh6-seed-probe3`     |    1 | 2026-11-10T14:36:36Z | `tx2-dxh6-seed-probe3-driver`, `tx2-dxh6-seed-probe3-pg-data`, `tx2-dxh6-seed-probe3-tools`             |
| `tx2-dxh6-seed1000-postb8` |    0 | 2026-11-10T14:46:19Z | `tx2-dxh6-seed1000-postb8-driver`, `tx2-dxh6-seed1000-postb8-pg-data`, `tx2-dxh6-seed1000-postb8-tools` |
| `tx2-dxh6-seed1000-serial` |    0 | 2026-11-10T14:08:36Z | `tx2-dxh6-seed1000-serial-driver`, `tx2-dxh6-seed1000-serial-pg-data`, `tx2-dxh6-seed1000-serial-tools` |
| `tx2-dxh6-seed10000`       |    1 | 2026-11-10T15:30:14Z | `tx2-dxh6-seed10000-driver`, `tx2-dxh6-seed10000-pg-data`, `tx2-dxh6-seed10000-tools`                   |
| `tx2-dxh6-sweep1000a`      |    1 | 2026-11-10T12:52:29Z | `tx2-dxh6-sweep1000a-driver`, `tx2-dxh6-sweep1000a-pg-data`, `tx2-dxh6-sweep1000a-tools`                |
| `tx2-dxh6-sweep1000b`      |    0 | 2026-11-10T13:28:16Z | `tx2-dxh6-sweep1000b-driver`, `tx2-dxh6-sweep1000b-pg-data`, `tx2-dxh6-sweep1000b-tools`                |
| `tx2-dxh6-sweep1000c`      |    0 | 2026-11-10T14:00:01Z | `tx2-dxh6-sweep1000c-driver`, `tx2-dxh6-sweep1000c-pg-data`, `tx2-dxh6-sweep1000c-tools`                |
| `tx2-dxh6-sweep1000d`      |    0 | 2026-11-10T15:45:21Z | `tx2-dxh6-sweep1000d-driver`, `tx2-dxh6-sweep1000d-pg-data`, `tx2-dxh6-sweep1000d-tools`                |
