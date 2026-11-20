#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: Docker top needs PID to enumerate owned processes even when INT1 consumes one metric.
# Rejected: supplying synthetic RSS or thread counts or modifying the checked-out producer.
if [[ $# == 4 && $1 == top && $3 == -eo && ( $4 == rss || $4 == nlwp ) ]]; then
  [[ $2 =~ ^[0-9a-f]{64}$ && " $DX_BM1_INT1_CONTAINER_IDS " == *" $2 "* ]] || exit 65
  "$DX_BM1_DOCKER_NATIVE" top "$2" -eo "pid,$4" |
    awk -v metric="$4" '
      NR == 1 {
        if (NF != 2 || $1 != "PID" || $2 != toupper(metric)) exit 1
        print $2
        next
      }
      {
        if (NF != 2 || $1 !~ /^[0-9]+$/ || $2 !~ /^[0-9]+$/ || (metric == "nlwp" && $2 < 1)) exit 1
        print $2
      }
      END { if (NR < 2) exit 1 }
    '
else
  exec "$DX_BM1_DOCKER_NATIVE" "$@"
fi
