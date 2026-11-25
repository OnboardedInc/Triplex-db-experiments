#!/bin/bash
# [DX-SRV2] Detached deadline alert on the Mac for the rented-server session (srv1/SESSION-PLAN.md C.1): from the
# deadline on, every 15 minutes, if any rented machine still answers on TCP 22, show a notification on the Mac's own
# notification centre. It deletes nothing and holds no credential. It stops when no machine answers, or after 14 hours.
#   nohup bash lab/experiments/EXP-DX1/srv2/mac-alert.sh 'YYYY-MM-DD HH:MM' HOSTS_FILE >> LOG 2>&1 &
# HOSTS_FILE is a private file outside the repository, one public address per line (written by the orchestrator at
# rental time). The deadline is the plan's forecast end plus 2 hours, local time.
# ALERT_PORT (22), ALERT_EVERY (900 s) and ALERT_SHOW=0 (print instead of notifying) exist for the Mac's own test.
set -u
deadline=${1:?deadline YYYY-MM-DD HH:MM local}; hosts=${2:?private hosts file}
[[ -f $hosts ]] || { echo "mac-alert: no hosts file" >&2; exit 2; }
port=${ALERT_PORT:-22} every=${ALERT_EVERY:-900} show=${ALERT_SHOW:-1}
end=$(date -j -f '%Y-%m-%d %H:%M' "$deadline" +%s) || { echo "mac-alert: bad deadline" >&2; exit 2; }
echo "$(date '+%F %T') mac-alert armed for $deadline, $(grep -c . "$hosts") machine(s), port $port"
while [ "$(date +%s)" -lt "$end" ]; do sleep 60; done
n=0
while [ $n -lt $((14 * 3600 / every)) ]; do
  up=0; while read -r h; do [[ -z $h ]] && continue; nc -z -G 8 "$h" "$port" >/dev/null 2>&1 && up=$((up + 1)); done < "$hosts"
  if [ $up -gt 0 ]; then
    msg="$up rented machine(s) still answer past the session deadline at USD 1.09 an hour each. Open Claude Code and say: delete the servers"
    if [ "$show" = 1 ]; then osascript -e "display notification \"$msg\" with title \"Triplex: server still billing\" sound name \"Basso\"" >/dev/null 2>&1; fi
    echo "$(date '+%F %T') $up still answering after the deadline; alert $([ "$show" = 1 ] && echo shown || echo "printed only")"
  else
    echo "$(date '+%F %T') no rented machine answers; alert loop ends"; exit 0
  fi
  n=$((n + 1)); sleep "$every"
done
echo "$(date '+%F %T') 14 hours of alerts; loop ends"
