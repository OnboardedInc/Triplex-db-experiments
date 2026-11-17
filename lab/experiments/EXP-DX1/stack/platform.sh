#!/usr/bin/env bash
# [DX-T1-14] Why: an explicitly selected physical Linux host must use its native daemon and owned evidence directory.
# Rejected: fall back to another Mac context, require files from the lab Mac, or mistake a VM result for bare metal.
dx_platform=$(uname -s)
if [[ ${DX_BARE_METAL:-0} == 1 ]]; then
  [[ $dx_platform == Linux ]] || { echo 'DX_BARE_METAL requires Linux; the Mac daemon is never redirected' >&2; return 2; }
  export DOCKER_HOST=unix:///var/run/docker.sock
  export DX_LAB_ROOT=${DX_BARE_METAL_ROOT:-$HOME/.local/state/triplex-db-2}
  export DX_HOST_PLATFORM=linux-bare-metal
else
  [[ $dx_platform == Darwin ]] || { echo 'Linux requires explicit DX_BARE_METAL=1' >&2; return 2; }
  export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
  export DX_LAB_ROOT=$HOME/Claude/Projects/triplex-db-2
  export DX_HOST_PLATFORM=darwin-colima
fi
[[ $DX_LAB_ROOT == /* && $DX_LAB_ROOT != / && $DX_LAB_ROOT != *$'\n'* ]] || return 2
export DX_EVIDENCE_ROOT=$DX_LAB_ROOT/evidence
