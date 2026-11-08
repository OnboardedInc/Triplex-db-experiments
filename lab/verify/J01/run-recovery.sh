#!/bin/sh
set -u
# [CX-VJ01] Why: finish only the recovery/race frontier skipped by the retained wrong-tag assertion. Rejected: repeating already-passing value/read tests.
node lab/verify/J01/live.mjs xtdb --recovery-only > lab/verify/J01/live-xtdb-recovery.log 2>&1
verify_exit=$?
node lab/verify/J01/identity.mjs final
exit "$verify_exit"
