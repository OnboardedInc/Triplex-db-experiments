#!/usr/bin/env bash
set -euo pipefail
# [DX-BM1] Why: start the failover's role B on bench 4 exactly as hasync1/SUNDAY.md, under taskset -c 0-11.
# sunday.ts checks Cpus_allowed_list == 0-11 and both servers run with SMT on (0-23), so the plain command refuses
# ("The server profile needs cores 0 through 11"); this path starts no stack/up.sh, so pinning the launcher is safe.
# Rejected: turning SMT off on rented hosts or editing the pinned launcher.
config=${1:-/root/p9/config.json}
[[ $EUID == 0 && -f $config ]]
cd /var/tmp/triplex-p9-build/repository
exec taskset -c 0-11 sh -ceu 'exec 9>/var/tmp/triplex-bm1/dx-bm1-day.lock; flock -n 9; export HA1_SUNDAY_FLOCK=1; exec timeout --kill-after=30s 239m "$1" --import tsx lab/experiments/EXP-DX1/hasync1/sunday.ts b "$2"' \
  run /var/tmp/triplex-p9-build/tools/bin/node "$config"
