No sealed 100,000-subject seed exists from DX-S5.

The requested volume was `tx2-dxs5-seed-100000-pg-data`, scope `dxs5-w0-100000-v1`.
Attempt `seed100000-a.log.gz` ran from 2026-11-11 11:32:41 UTC until approximately 14:18:39 UTC and failed after seven committed chunks.
It reached 70,000 subjects and logical position 3,041,238 through real window-32 commits; summed command time was 5,299.869 s (573.833 commands/s).
The fresh post-vacuum peer failed with `ActiveMQNotConnectedException / AMQ219007`; the original cleanup removed the unsealed data and checkpoint volumes.
The original transactor failure's root cause is unproven: its resident JVM diagnostics were not captured before that cleanup.

The last fully read-back prefix was 60,000 subjects, at position 2,608,828, with 26,787,308 reachable fact occurrences.
Its world fingerprint was `sha256:7bb39ce4e93a802b9ddf2e1ea8d677cd4fc71ac91f4ff3637a5f972f33fa6b56`.
This covers the first 60,000 worlds of the 100,000-subject rung (L=2000, K=100), not a separately generated 60,000-subject rung.
The 70,000-subject pre-maintenance scan counted 87,507,432 current and 87,534,992 historical native rows; post-maintenance preservation at that prefix was not verified.
The last SQL table-size observation was 10,778,935,296 B, largest leaf 677,642,240 B; this is not a sealed-volume measurement.
Peak sampled PostgreSQL volume allocation was 16,195,883,008 B. Minimum sampled Mac free space was 25.859741 GiB; minimum VM free space was 42,817,120 KiB.
No 100,000-subject fingerprint, fact count, sealed bytes, clone time or release-activation result was obtained.

The corrected procedure retains an owned unsealed data/checkpoint pair on failure and supports `S5_RESUME=1` with the same N/chunk arguments.
It stops JVMs around VACUUM FULL, reconnects before fresh verification, and captures resident failure diagnostics.
Fresh corrected proofs passed at 1,000 subjects (including injected AMQ219007/reconnect) and 10,000 subjects (including whole-controller interruption, retained volumes and 896 replayed committed suffix commands).
Both final world fingerprints match the provided sealed-seed references; every native current/history row matched before and after maintenance.
These bounded proofs do not qualify 100,000 subjects, turn the failed 70,000-subject attempt into a PASS, or recover its deleted data.
Final inventory contains no DX-S5 containers, volumes or networks; no sealed 100,000-subject volume was retained.
