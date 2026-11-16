# Part 11 lossless smoke compression

Only large files from smoke attempts a–h were compressed in place with `zstd -q -19 --rm`. Final smoke i, all calibration directories, and every `trace/raw` path were untouched.

30 files: 130,197,360 → 14,704,373 bytes. Live free space 15.969 → 16.076 GiB; APFS/concurrent activity means this is not a physical-space sum.

Every original SHA256 was recorded before compression; a complete decode was hashed afterward and had to match. The source was removed only by successful `zstd --rm`; no other files were removed. `evidence/DX-T1/p11-close/compression.json` lists each original/compressed path, sizes, hashes and verification time; the append-only journal retains first observations.

Restore any original path before using an old run’s original manifest:

```sh
zstd -d --rm <file>.zst
```

The restored bytes match the original per-run checksums. These old attempts remain incomplete where their original receipts say incomplete; compression does not promote them.
