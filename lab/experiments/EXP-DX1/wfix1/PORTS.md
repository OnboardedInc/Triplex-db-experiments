# Carrying the write fixes forward

The common integration point is `0f92704d2`. It includes DX-W1 through `40d85db6e`, including the storage-collection and reopen checks.

| Branch | Snapshot | Commit to merge | Prepared merge resolution |
| --- | --- | --- | --- |
| DX-PREP1 | `0bcc9ec55` | `0f92704d2` | Run the resolution below |
| DX-COMPACT1 | `737d712bb` | `0f92704d2` | Git merges it cleanly |
| DX-INT1 | `4c9a28fa6` | `0f92704d2` | Run the resolution below |

The merge contains the original fixes `a1e8ca12b`, `edffda1a7`, `db444ad25`, `d3572e794`, `866a65043`, `3d7569a19`, `9d605bcd9`, `9a2d0938c` and the oracle check in `f781fd457`. The write-path merge resolutions are in `7aa14ede4`, `0ef76425a`, `375368a64` and `0f92704d2`.

On the downstream branch, run `git merge --no-ff --no-commit 0f92704d2`. For PREP1 and INT1, obtain the resolution script from the WFIX1 report commit and run it with the downstream revision, `0f92704d2`, and the worktree path. Stage the gateway's `commit.clj`, `group.clj` and `group_prepare.clj` after reviewing the resolved diff. [port-prepared.py](port-prepared.py)

The script keeps PREP1's shared row stamper, preview and overlap window. The exact bytes checked by its native guard now supply the whole retraction. The guard checks operation and command identities before the head and predecessor witnesses. It uses a new installed function ID so reopened scopes use the new checks. The INT1 resolution preserves import profiling, the bulk-grant annotation and the prepared scheduling window.

PREP1 and INT1 already preserve the ordered suffix and reject changed journal content in the measured field comparator. Their existing oversize errors use 413. The integration preserves the SDK's published 400 `InvalidValue` error and the valid suffix starts at the unspent sequence. Both already have a write-options witness for the write5 arms. Other measured arms need the attempt-bound writer witness.

SDK recovery and ordered-body regressions used each branch's actual client and loopback transport. The feed mutation test runs the branch's own comparison against changed clock, range and value with the original ID. It first checks that the unchanged change passes. All three integrated SDK and feed snapshots passed.

The first three merge snapshots passed 98 native assertions each. Pinned O-REPLAY matched all three write modes in every snapshot. PREP1 also passed its prepared writer gate. INT1's first adaptation kept its existing reference fallback for timed retirements. The revised INT1 recipe and all original branch native reproductions are queued for separate verification.

While the gates were queued, PREP1 merged the fixes through `0f92704d2` in `f8d9571fa` and ported the ledger bindings in `b9b3e95e5`. That newer head is under test with its own prepared certificate. The newer COMPACT1 and INT1 heads kept the tested gateway, SDK and W1 harness bytes.
