# Part 9 lossless disk recovery

The storage study ended below the 15-GiB admission floor. No further measurement was admitted there. APFS-cloned viewer copies share blocks, so deleting or archiving one copy would not reclaim their summed logical size. The chosen operation is macOS `ditto --hfsCompression`: transparent APFS compression preserves the same paths, file lengths and readable bytes, including ordinary JSON/SQLite readers.

| batch | files | logical bytes | allocated bytes before / after | live free GiB before / after |
| --- | ---: | ---: | ---: | --- |
| derived reports/viewers | 214 | 2,422,835,096 | 2,427,486,208 / 360,681,472 | 14.443 / 15.480 |
| smoke raw and then-uncited storage-study raw | 75 | 342,564,343 | 343,674,880 / 33,017,856 | 15.472 / 15.760 |

One earlier successful 18,490,265-byte derived-file trial is separate from those counts. The initial sandboxed trial produced an unreadable temporary copy and failed the byte check; the original remained untouched. The successful unsandboxed trial and both completed batches require exact original-versus-copied SHA256 and length, unchanged source modification time, a real compressed-file flag and a smaller allocation before atomic replacement. Each new file is synced and read back again. Source identities and data timestamps remain in the original bytes. The private journals retain every selected path, original/readback hashes, allocation observations and restore instructions; all raw gzip streams stay directly readable and unchanged.

The derived batch selects report/viewer JSON/HTML with hashes matching the original per-run content manifests, including matching ignored worktree copies. It does not select raw streams or source code. The raw batch selects only smoke raw files and the previously uncited part-9 sync-method study, within owned attempt folders; it changes no readable byte or path. Each batch checks the measurement lock is absent and the owned-engine inventory empty. No image, container, volume, seed, unrelated file or cited baseline is removed. Allocated block sums are not physical free-space sums on APFS; the live free-space observations above are authoritative.

To remove transparent compression while preserving content: `ditto --nohfsCompression --nopreserveHFSCompression FILE TEMP`, verify TEMP against the journal's original SHA256, then atomically replace FILE. Normal readers need no restore step. Private receipts/scripts: `evidence/DX-T1/p9-checks/compression-trial-b.json`, `p9-derived-compression/`, `p9-smoke-raw-compression/`. The 15-GiB guard remains in force; compression is maintenance before admission, not concurrent benchmark work.
