Busy-host diagnostic evidence; no performance verdict. All paths below are relative to `$EVIDENCE_ROOT/DX-T1/`.

The committed [SHA256 manifest](EVIDENCE-14.sha256) seals original inputs, failures, receipts, terminal states, raw traces, proof scripts and analyses. Verify from that root with `shasum -a 256 -c <checkout>/lab/experiments/EXP-DX1/t1/EVIDENCE-14.sha256`. Symlinks are not followed. No raw output or core is committed.

| Attempt suffix (`tx2-dxt1-p14-`) | Result | Raw trace bytes on disk | Full directory bytes |
| --- | --- | ---: | ---: |
| [init-smoke](runs/tx2-dxt1-p14-init-smoke/INDEX.md) | 1k NS correctness smoke; retained | 36070198 | 165531724 |
| [reading-100000](runs/tx2-dxt1-p14-reading-100000/INDEX.md) | 100k scope-open deadline refusal; no completed reading | 14274806 | 18283100 |
| [scale-a-100000](runs/tx2-dxt1-p14-scale-a-100000/INDEX.md) | incomplete bootstrap fit trial | 54952456 | 77261540 |
| [scale-b-100000](runs/tx2-dxt1-p14-scale-b-100000/INDEX.md) | incomplete bootstrap/heap fit trial | 43342631 | 64241692 |
| [scale-b-10000](runs/tx2-dxt1-p14-scale-b-10000/INDEX.md) | complete earlier 10k neighbour | 85091768 | 231509672 |
| [scale-c-100000](runs/tx2-dxt1-p14-scale-c-100000/INDEX.md) | 3-GiB isolate exhausted; interrupted core preserved | 84029607 | 333321515 |
| [scale-d-100000](runs/tx2-dxt1-p14-scale-d-100000/INDEX.md) | complete seed/bootstrap, guest-global OOM during sweep; censored | 135757994 | 725956349 |
| [scale-d-10000](runs/tx2-dxt1-p14-scale-d-10000/INDEX.md) | complete same-source zero-reader neighbour; 8,529/8,529, zero expired | 95343181 | 426167662 |
| [w0-clone](runs/tx2-dxt1-p14-w0-clone/INDEX.md) | content comparisons reached; receipt refused missing full journal counts | 219569 | 20538193 |
| [w0-clone-b](runs/tx2-dxt1-p14-w0-clone-b/INDEX.md) | fresh sealed clone: full independent content receipt | 817758 | 21141002 |
| [w0-seed](runs/tx2-dxt1-p14-w0-seed/INDEX.md) | pre-stack Bash-3 error; zero exit file is not completion | 0 | 127837 |
| [w0-seed-b](runs/tx2-dxt1-p14-w0-seed-b/INDEX.md) | fresh content receipt; PID trace collision | 22553115 | 50159187 |
| [w0-seed-c](runs/tx2-dxt1-p14-w0-seed-c/INDEX.md) | fresh content receipt; filename/drain gaps | 22259067 | 49474050 |
| [w0-seed-d](runs/tx2-dxt1-p14-w0-seed-d/INDEX.md) | fresh content receipt; all seven terminal trace shards healthy | 22798664 | 50187812 |

Principal population source: `c165501b0b77c9301764c6d3df323abf82ff0051`; final fresh 1k recorder-drain source: `14f5297eb81f3bd72937b4da16775dbfb3866b1e`. Reporting revisions do not replace either measured source.

Detailed phase/layer/cache/adoption/size/memory tables: [READING-14.md](READING-14.md). Analysis inputs: `p14/partial-d-ack.json`, `p14/neighbour-d-ack.json`, `p14/neighbour-d-qualified.json`, `p14/reading-extra.json`; exact control equivalence: `p14/ack-comparison-check.json`; confirmed kernel identity: `p14/OOM-D.json`; follower HTTP 503: `p14/follower-client-exchange.json`. The killed arm has no complete offer/expiry denominator or final oracle.

Integrity and cleanup: `p14/activation-trace-health-final.json`, `p14/final-cleanup-18.json`, `p14/protected-final.log`, `p14/pin-scan-14.json`; [qualification audit](AUDIT-14.md), [checks](CHECKS-14.md). No changed path is mentioned by the acceptance contract; no pinned hash was moved.

Compression: `p14/COMPRESSION-14.json` records each original, compressed and decompressed SHA256. Three closed W0 gateway traces total 324,795,366 bytes became 18,163,395 bytes, with exact round trips before unlink. The interrupted 6,707,933,184-byte core became 740,758,482 bytes (`p14/core/CORE.json`); this preserves the interrupted file and does not certify a complete core. Restore a `.zst` with `zstd -d --rm <file>.zst`. Existing NS compressed-raw manifests remain unchanged.

The orphan recovery and one-time inode/dentry reclaim are retained in `p14/recover-c*.log` and `p14/core-reclaim.log`. Every stack was stopped and the exact guest boot checked; file-data caches, the VM and foreign resources were not cleared. Recovered free space includes previously unlinked files and cannot all be attributed to the 6.7-GB core.

Historical F/H correlation limitations: [STEADINESS-14.md](STEADINESS-14.md). Physical-server procedure and explicit untested boundaries: [BARE-METAL.md](BARE-METAL.md).
