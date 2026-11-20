# Carrying the write fixes forward

The common integration point is `0f92704d2`. It includes DX-W1 through `40d85db6e`, including the storage-collection and reopen checks.

| Branch | Snapshot | Commit to merge | Prepared merge resolution |
| --- | --- | --- | --- |
| DX-PREP1 | `0bcc9ec55` | `0f92704d2` | Run the resolution below |
| DX-COMPACT1 | `737d712bb` | `0f92704d2` | Git merges it cleanly |
| DX-INT1 | `4c9a28fa6` | `0f92704d2` | Run the resolution below |

| Finding reproduced before the merge | PREP1 | COMPACT1 | INT1 |
| --- | --- | --- | --- |
| 1. Replacement resend | Yes in SDK. Native returned typed duplicates with HTTP 400. | Yes in SDK and native singleton, fresh-ID and fallback cases. | Yes in SDK. Native resend tests passed. |
| 2. Stored retraction content | Yes | Yes | Yes |
| 3. Hinted scope maintenance | No | Yes | No |
| 4. Independent live save | No | Yes | No |
| 5. Stored account owners | No | Yes | No |
| 6. Ordered size-cap suffix | No | Yes | No |
| 7. Live writer readback | Yes outside write5 | Yes | Yes outside write5 |
| 8. Feed change mutation | No | Yes | No |

The merge contains the original fixes `a1e8ca12b`, `edffda1a7`, `db444ad25`, `d3572e794`, `866a65043`, `3d7569a19`, `9d605bcd9`, `9a2d0938c` and the oracle check in `f781fd457`. The write-path merge resolutions are in `7aa14ede4`, `0ef76425a`, `375368a64` and `0f92704d2`.

On COMPACT1, merge `0f92704d2` directly. On the frozen PREP1 and INT1 snapshots, start the merge and resolve the expected conflicts in `commit.clj` and `group.clj` with the checked script. Review the three files before staging the resolution. [port-prepared.py](port-prepared.py)

```sh
target=$(git rev-parse HEAD)
recipe=$(mktemp)
git show e1ff6c78a:lab/experiments/EXP-DX1/wfix1/port-prepared.py > "$recipe"
git merge --no-ff --no-commit 0f92704d2
python3 "$recipe" "$target" 0f92704d2 "$PWD"
git add packages/datomic/gateway/src/triplex/gateway/{commit,group,group_prepare}.clj
```

The script keeps PREP1's shared row stamper, preview and overlap window. The exact bytes checked by its native guard now supply the whole retraction. The guard checks operation and command identities before the head and predecessor witnesses. It uses a new installed function ID so reopened scopes use the new checks. The INT1 resolution preserves import profiling, the bulk-grant annotation and the prepared scheduling window.

PREP1 and INT1 already preserve the ordered suffix and reject changed journal content in the measured field comparator. Their existing oversize errors use 413. The integration preserves the SDK's published 400 `InvalidValue` error and the valid suffix starts at the unspent sequence. Both already have a write-options witness for the write5 arms. Other measured arms need the attempt-bound writer witness.

SDK recovery and ordered-body regressions used each branch's actual client and loopback transport. Run the feed mutation check with `node --import tsx branch-feed.mjs <frozen-export>`. It checks the branch's own comparison against changed clock, range and value with the original ID, after the unchanged change passes. All three integrated SDK and feed snapshots passed.

The first three merge snapshots passed 98 native assertions each. Pinned O-REPLAY matched all three write modes in every snapshot. PREP1 also passed its prepared writer gate. INT1's first adaptation kept its existing reference fallback for timed retirements. The revised INT1 recipe has a separate prepared-writer rerun queued.

PREP1 merged the fixes through `0f92704d2` in `f8d9571fa` and reconciled that merge in `b9b3e95e5`. That head passed the ordinary native, SDK, feed and oracle regressions. The latest examined head `504f4ae61` has identical tested inputs and keeps its prepared certificate and profiler. COMPACT1 `2c9a1a6e2` and INT1 `b00bab845` kept the tested gateway, SDK and W1 harness bytes. Their merges produce the same tested writer code with the recipes above. The separate layout replay diagnostic fix is `09088a27f`.
