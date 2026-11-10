#!/bin/sh
# Samples the Mac for a few seconds and prints one JSON line: load, swap in use, CPU used by processes other than the VM,
# and whether a call or recording app is busy. Exit 0 if the host is quiet enough to trust absolute timings, 1 if not.
# Why: on 2026-11-10 a north-star run taken during a video call with 17 GB of swap in use showed multi-second commit tails
# that the same code did not show an hour earlier. This Mac has 6 performance cores for an 8-vCPU VM; anything else that is
# busy pushes vCPUs onto efficiency cores.
# usage: lab/bin/host-quiet.sh [max-other-cpu-percent, default 150] ; add --wait N to retry every 60 s for up to N minutes
max=150; wait=0
while [ $# -gt 0 ]; do case "$1" in --wait) wait=$2; shift 2;; *) max=$1; shift;; esac; done
sample() {
  other=$(ps -axo pcpu,comm | awk '!/Virtualization|com.apple.Virtualization|limactl|ssh / && NR>1 {s+=$1} END {printf "%.0f", s}')
  call=$(ps -axo pcpu,comm | awk '/UVCAssistant|coreaudiod|zoom.us|Granola|FathomMeeting/ {s+=$1} END {printf "%.0f", s}')
  load=$(sysctl -n vm.loadavg | awk '{print $2}')
  swap=$(sysctl -n vm.swapusage | sed 's/.*used = \([0-9.]*\)M.*/\1/')
  ok=true; [ "$other" -gt "$max" ] && ok=false; [ "$call" -gt 20 ] && ok=false
  printf '{"at":"%s","load1":%s,"swapUsedMB":%s,"otherCpuPercent":%s,"callAppsCpuPercent":%s,"quiet":%s}\n' "$(date -u +%FT%TZ)" "$load" "$swap" "$other" "$call" "$ok"
  [ "$ok" = true ]
}
i=0
while :; do
  if sample; then exit 0; fi
  i=$((i+1)); [ "$i" -gt "$wait" ] && exit 1
  sleep 60
done
