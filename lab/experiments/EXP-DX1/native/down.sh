#!/usr/bin/env bash
# [DX-N1] Why: verify PID birth and command before signalling. Rejected: pgrep-based cleanup (unrelated processes).
source "$(dirname "$0")/common.sh"
prefix=${1:?usage: down.sh tx2-dxn1-PREFIX [--keep]}; valid_prefix "$prefix"
[[ $# == 1 || ($# == 2 && $2 == --keep) ]] || exit 2
exec python3 "$HERE/stack.py" down "$@"
