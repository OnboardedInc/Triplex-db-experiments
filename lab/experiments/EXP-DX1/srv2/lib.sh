#!/usr/bin/env bash
# [DX-SRV2] Functions shared by srv2/session.sh and its Mac checks (sourced; no side effects). Spend from elapsed machine
# minutes, and the scratch copy procedure of the scorecard parts. Uses: PRICE_PER_HOUR, SPEND_BEFORE, MACHINE_A_STARTED,
# MACHINE_A_ENDED, MACHINE_B_STARTED, MACHINE_B_ENDED (epoch seconds), SCRATCH, AGED_PGDATA_SOURCE.
step_high_minutes() {  # the plan's high estimate per step (srv1/SESSION-PLAN.md C.2), cleanup excluded
  case $1 in stage) echo 85;; a1) echo 39;; a2) echo 60;; a2b) echo 20;; a9) echo 60;; a4) echo 160;; b1) echo 96;; b2) echo 57;;
    b3) echo 49;; b4) echo 240;; b5) echo 116;; b6) echo 42;; b7) echo 60;; a5) echo 80;; a6) echo 180;; a7) echo 85;; a8) echo 90;;
    b8) echo 200;; finish) echo 30;; *) echo 0;; esac
}
spend_now() {  # prints: spend_usd running_machines
  local now; now=$(date +%s)
  awk -v now="$now" -v p="$PRICE_PER_HOUR" -v before="$SPEND_BEFORE" \
    -v as="${MACHINE_A_STARTED:-}" -v ae="${MACHINE_A_ENDED:-}" -v bs="${MACHINE_B_STARTED:-}" -v be="${MACHINE_B_ENDED:-}" 'BEGIN{
      s=before; r=0
      if (as!="") { e=(ae!=""?ae:now); s+=(e-as)/3600*p; if (ae=="") r++ }
      if (bs!="") { e=(be!=""?be:now); s+=(e-bs)/3600*p; if (be=="") r++ }
      printf "%.2f %d\n", s, r }'
}
# make_copy and remove_copy: the copy procedure the scorecard parts used (owner, modes and the internal pg_wal kept;
# the source stays stopped; a private byte copy with no hard links). The pages named them without a script.
make_copy() {
  local copy=$1 src=${2:-$AGED_PGDATA_SOURCE}
  [[ $copy == "$SCRATCH"/* && ! -e $copy ]] || { echo "make_copy: $copy must be new and under SCRATCH" >&2; return 2; }
  [[ $(cat "$src/PG_VERSION") == 17 && -d $src/pg_wal && ! -L $src/pg_wal ]] || { echo "make_copy: $src is not a stopped PostgreSQL 17 cluster" >&2; return 2; }
  local m; for m in postmaster.pid backup_label standby.signal recovery.signal; do [[ ! -e $src/$m ]] || { echo "make_copy: $src has $m" >&2; return 2; }; done
  local need_kb have_kb; need_kb=$(du -sk "$src" | cut -f1); have_kb=$(df -Pk "$SCRATCH" | awk 'NR==2{print $4}')
  ((have_kb > need_kb + 20 * 1024 * 1024)) || { echo "make_copy: under the copy's size plus 20 GiB free in $SCRATCH" >&2; return 2; }
  local t=$SECONDS
  mkdir -p "$copy"; cp -a "$src/." "$copy/"
  cmp "$src/global/pg_control" "$copy/global/pg_control"
  [[ -z $(find "$copy" -xdev -type f -links +1 -print -quit) ]] || { echo "make_copy: hard links in the copy" >&2; return 2; }
  echo "[srv2] copy $copy in $((SECONDS - t)) s"
}
remove_copy() {
  local copy=$1
  [[ $copy == "$SCRATCH"/* && -f $copy/PG_VERSION ]] || { echo "remove_copy: $copy is not a copy under SCRATCH" >&2; return 2; }
  rm -rf --one-file-system "$copy"
}
