#!/usr/bin/env bash
# [DX-DEMO1] On the Mac: close the SSH forwards demo/connect.sh opened and remove the connection state file.
#   demo/disconnect.sh [--toy]      (TRIPLEX_DEMO_STATE=<file> closes that connection's tunnel and file instead)
set -euo pipefail
dir=$HOME/.triplex-demo
state=${TRIPLEX_DEMO_STATE:-$dir/connection.json}
if [[ $state == "$dir/connection.json" ]]; then control=$dir/tunnel.sock; else control=$dir/tunnel-$(basename "$state" .json).sock; fi
if [[ ${1:-} == --toy ]]; then
  ssh_base=(ssh -F "$HOME/.colima/_lima/colima-triplex2/ssh.config"); target=lima-colima-triplex2
else
  server=${DEMO_SERVER:-$(cat "$dir/server" 2>/dev/null || true)}
  ssh_base=(ssh -i "$HOME/.ssh/triplex_bench_ed25519" -o UserKnownHostsFile="$dir/known_hosts"); target=ubuntu@${server:-unknown}
fi
if [[ -S $control ]]; then "${ssh_base[@]}" -S "$control" -O exit "$target" 2>/dev/null || true; fi
rm -f "$control" "$state"
echo "DISCONNECTED"
