#!/bin/sh
# [COLD-1] Why: every latency in this investigation is read beside the Mac's swap and non-VM CPU at that moment.
# Rejected: a session-level note (the Mac's owner may start work between two arms).
# usage: host-context.sh LABEL   prints one JSON line
label=${1:-}
other=$(ps -axo pcpu,comm | awk '!/Virtualization|com.apple.Virtualization|limactl|ssh / && NR>1 {s+=$1} END {printf "%.1f", s}')
vm=$(ps -axo pcpu,comm | awk '/com.apple.Virtualization.VirtualMachine/ {s+=$1} END {printf "%.1f", s}')
load=$(sysctl -n vm.loadavg | awk '{print $2}')
swap=$(sysctl -n vm.swapusage | sed 's/.*used = \([0-9.]*\)M.*/\1/')
free=$(df -k "$HOME" | awk 'NR==2 {printf "%.2f", $4/1048576}')
printf '{"label":"%s","at":"%s","load1":%s,"swapUsedMB":%s,"otherCpuPercent":%s,"vmCpuPercent":%s,"diskFreeGiB":%s}\n' "$label" "$(date -u +%FT%TZ)" "$load" "$swap" "$other" "$vm" "$free"
