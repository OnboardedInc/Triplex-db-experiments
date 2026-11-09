#!/bin/bash
set -euo pipefail
cd /data
if [[ ! -f triplex.index.pso ]]; then
  # This bootstrap graph belongs only to this independent development server.
  printf '<urn:triplex:bootstrap> <urn:triplex:format> "1" .\n' > bootstrap.nt
  qlever-index -i triplex -f bootstrap.nt -F nt --stxxl-memory 512M --no-patterns
fi
# [EXP-P2Q arm "np"] Identical to the repo qlever-start.sh (EXP-002 / R8 6.1 knobs, same 0.6.0 image digest via
# slots.json) except two flags, selected only with TX2_CONFIG_DIR=<this directory> for the replica arm:
# - no --persist-updates: R21 1.3 / R17 2.2 measured `diskWriteback` (DeltaTriples::writeToDisk, the whole delta
#   re-serialized on every update) at about 45 of 129 ms per update at 500k delta. The host log is the source of
#   truth and the broker replays it from the replica's marker after a restart, so the persisted delta is redundant.
# - --rebuild-keep-previous-index-dirs none: rebuilds keep no previous.* copies, which hold pre-erasure literals
#   (R17 0.2 item 4, R21 section 2). The default is original-and-most-recent.
# A0 stays on the repo script (persist on) so its comparisons stay in one series.
exec qlever-server -i triplex -p 7019 -j 4 -m 2G -c 512M -e 128M -s 10s --rebuild-keep-previous-index-dirs none --no-patterns --no-access-check --no-metrics-log --no-resource-usage-log --set-runtime-parameter query-planning-budget=1
