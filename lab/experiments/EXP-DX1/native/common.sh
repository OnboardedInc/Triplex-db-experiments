#!/usr/bin/env bash
# [DX-N1] Why: one owned tree and strict prefixes bound cleanup. Rejected: global tools and name-based killing.
set -euo pipefail
NATIVE=/Users/sam/Claude/Projects/triplex-db-2/native
EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-N1
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO=$(cd "$HERE/../../../.." && pwd)
valid_prefix() { [[ ${1:-} =~ ^tx2-dxn1-[a-z0-9-]+$ ]] || { echo 'prefix must match tx2-dxn1-[a-z0-9-]+' >&2; exit 2; }; }
resources() {
  local free
  free=$(df -k /System/Volumes/Data | awk 'NR==2 {print $4}')
  (( free >= 15*1024*1024 )) || { echo 'need 15 GiB host disk free' >&2; exit 1; }
  mkdir -p "$NATIVE/runs"
  (( $(du -sk "$NATIVE/runs" | awk '{print $1}') < 6*1000*1000 )) || { echo 'native/runs exceeds 6 GB' >&2; exit 1; }
}
