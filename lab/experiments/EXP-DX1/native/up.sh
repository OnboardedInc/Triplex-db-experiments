#!/usr/bin/env bash
# [DX-N1] Why: foreground supervision guarantees exit cleanup, including failed startup. Rejected: detached orphan JVMs.
source "$(dirname "$0")/common.sh"
prefix=${1:?usage: up.sh tx2-dxn1-PREFIX}; valid_prefix "$prefix"; resources
exec python3 "$HERE/stack.py" up "$prefix"
