# Lossless evidence compression, 2026-11-14

Cutoff: no regular file modified on or after 2026-11-10 00:00 UTC. DX-* and ORCH-* excluded from this table. Every selected source is SHA256-bound and its zstd stream decoded and compared while the original descriptor remains recoverable. Journal: DX-T1/p5-compression.jsonl.

Restore one file: `zstd -d --rm <file>.zst`.

| Directory | Logical bytes before | Logical bytes after | Files compressed |
| --- | ---: | ---: | ---: |
| A01-040-R2 | 186700933 | 111628503 | 19 |
| CX-A01-0312 | 13423699 | 11585635 | 2 |
| CX-A01-0314 | 99219812 | 87181823 | 13 |
| CX-A01-040 | 388730074 | 237643725 | 39 |
| CX-CHECKJS | 6434151 | 1033625 | 4 |
| CX-DF01 | 172215928 | 119097399 | 12 |
| CX-DI01-R2 | 187796812 | 112724382 | 19 |
| CX-DI01-R3 | 264328021 | 145625561 | 30 |
| CX-FD01 | 22310648 | 19553552 | 3 |
| CX-G03 | 244769348 | 78812508 | 15 |
| CX-INT-D | 6522902 | 5614679 | 1 |
| CX-INT-Q | 205375831 | 144000768 | 16 |
| CX-K01-R2 | 19986817 | 5800986 | 11 |
| CX-M01R | 11348618 | 7381973 | 4 |
| CX-NSR | 56596842 | 55677810 | 1 |
| CX-OBS01 | 590749070 | 475794398 | 14 |
| CX-P2Q-R3 | 16131068 | 16131068 | 0 |
| CX-P3M | 14379993 | 13460961 | 1 |
| CX-P5A | 277881646 | 23557968 | 30 |
| CX-P5B | 445249446 | 418187726 | 9 |
| CX-QG1 | 494306440 | 447378146 | 9 |
| CX-QNODELAY | 67120531 | 61359316 | 4 |
| CX-RT01 | 45591745 | 26210565 | 6 |
| CX-VA01-0311 | 42027186 | 34493772 | 8 |
| CX-VA01-0314 | 278842575 | 85002260 | 74 |
| CX-VA01-040 | 223672691 | 126622803 | 35 |
| CX-VDF01 | 27322 | 27322 | 0 |
| CX-VER01S | 288933795 | 239869582 | 7 |
| CX-VER01S-5 | 162510908 | 145102782 | 3 |
| CX-VFD01 | 41545428 | 41480734 | 2 |
| CX-VG03-56 | 28476923 | 28476923 | 0 |
| CX-VG03-7D | 20789554 | 20789554 | 0 |
| CX-VHS01 | 2697249698 | 550315055 | 25 |
| CX-VINTQ | 125685992 | 67649488 | 26 |
| CX-VK01 | 7802033 | 1106269 | 5 |
| CX-VM01R | 590836 | 590836 | 0 |
| CX-VNSR | 12468853 | 12468853 | 0 |
| CX-VNSR-5 | 2952169 | 2952169 | 0 |
| CX-VOBS6 | 16105831 | 16105831 | 0 |
| CX-VP2B | 33262799 | 11135137 | 3 |
| CX-VP2Q-11 | 113138806 | 70652334 | 8 |
| CX-VP2Q-4 | 3730631 | 3730631 | 0 |
| CX-VP3M | 10666620 | 9747588 | 1 |
| CX-VP4N | 96132255 | 17682427 | 17 |
| CX-VP5A | 233697447 | 22935301 | 24 |
| CX-VQH1 | 276812618 | 75813978 | 59 |
| CX-VQNODELAY | 68431306 | 51379833 | 6 |
| CX-VRT01 | 17976394 | 17976394 | 0 |
| CX-VW02 | 31596183 | 9774383 | 7 |
| CX-W02 | 21529925 | 8757690 | 5 |
| CX-XRUN | 14952664 | 3289744 | 4 |
| DF01-R4 | 756883 | 756883 | 0 |
| ER01-S | 11516195 | 11516195 | 0 |
| EXP-DA01 | 64230783 | 23509914 | 13 |
| EXP-W02 | 8192659 | 177228 | 6 |
| G03-R7 | 382647 | 382647 | 0 |
| OBS01 | 536399782 | 458503613 | 29 |
| OBS01-IMAGE | 17471 | 17471 | 0 |
| OBS01-R10 | 1585257 | 1585257 | 0 |
| OBS01-R11 | 1620948 | 1620948 | 0 |
| OBS01-R9 | 5524082 | 5524082 | 0 |
| QH1-R2 | 542434983 | 536028031 | 2 |
| QH1-R3 | 734548782 | 611978392 | 56 |
| QH1-R4 | 2974374841 | 513152229 | 4 |
| QH1-R5 | 41148208 | 11195139 | 2 |
| XN-S1 | 11370838 | 11370838 | 0 |
| worktree-leftovers | 5551373 | 3203514 | 1 |

Mac free before: 18432081920 bytes; current: 25563426816 bytes. Allocated totals are observations, not additive APFS physical ownership.

DX-T1 raw trace scan: zero eligible smoke or uncited-arm files over 1 MiB outside the excluded formats. The two uncompressed raw gateway files belong to the report-cited interrupted writer arm and remain untouched. No container was changed.

Pre-existing compressed target preserved; alternate archive: `QH1-R4/store-candidate/broker.db.DX-T1-20261114.zst`. Restore from its directory: `zstd -d --rm -o broker.db broker.db.DX-T1-20261114.zst`.

Verified selected files: 694; original bytes 7992341813; compressed bytes 835801395. Free after: 25538187264 bytes (23.784 GiB), versus 17.166 GiB before. The requested 25-GiB target is not met within this authorized selection; nothing else was removed.
