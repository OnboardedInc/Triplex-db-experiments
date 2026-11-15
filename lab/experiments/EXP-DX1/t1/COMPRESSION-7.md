# Part 7 lossless compression

Only authorized incomplete-attempt and smoke raw files were selected; report files/viewers/source manifests remain. Every counted file passed zstd integrity and original-versus-decoded SHA256. Original hashes and restore commands remain in private JSONL journals. No other files, images, foreign containers or volumes were removed.

| batch | files | original bytes | compressed bytes | free GiB before / after |
| --- | ---: | ---: | ---: | --- |
| p7-compression | 4205 | 3288004868 | 299540251 | 19.494 / 22.239 |
| p7-retry-compression | 2523 | 1734288732 | 178162841 | 17.340 / 18.781 |
| p7-headroom-compression | 189 | 1670129090 | 52880498 | 14.699 / 15.777 |
| p7-model-compression | 22 | 102244992 | 4815588 | 14.464 / 14.553 |

Restore an individual selected file with `zstd -d --rm <file>.zst`; its original SHA256 is in the batch journal. New model journals use verified gzip after full replay (`gzip -dk <file>.gz` restores a copy); new completed runs also gzip only their own split-observation inputs after all checks. ORACLE-ARCHIVE.jsonl binds original/decoded and compressed bytes.

Free space is a live filesystem observation, not the sum of logical file lengths: APFS sharing and other host work mean byte reduction is not guaranteed to equal free-space growth. The initial 15-GiB guard was restored; later admission refused model-a and model-b closing at approximately 14.5 GiB. The guard was not relaxed again.

Final full-pair admission also refused before lease/container acquisition. Final recorded free space: 14.384 GiB; owned container/volume inventory empty and measurement lock absent. The eligible incomplete-attempt paths retained only about 92 MB of uncompressed large reports, viewers and protected writer baselines, which were not removed. No further compression could supply the missing headroom within that authorized set.
