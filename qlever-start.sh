#!/bin/bash
set -euo pipefail
cd /data
if [[ ! -f triplex.index.pso ]]; then
  # This bootstrap graph belongs only to this independent development server.
  printf '<urn:triplex:bootstrap> <urn:triplex:format> "1" .\n' > bootstrap.nt
  qlever-index -i triplex -f bootstrap.nt -F nt --stxxl-memory 512M --no-patterns
fi
# [EXP-002] R8 6.1 server knobs: -j 4 (a rebuild holds one query thread; -j 16 on 2 CPUs only queues),
# cache 512M / single entry 128M (inside -m), default timeout 10s for requests that carry none (the
# SDK always sends its own), planner threshold 1 (the homebase F setting; planner memory is outside
# -m), no unbounded metrics/resource logs next to the index. lab/bin/engine.mjs substitutes -m per slot.
exec qlever-server -i triplex -p 7019 -j 4 -m 2G -c 512M -e 128M -s 10s --persist-updates --no-patterns --no-access-check --no-metrics-log --no-resource-usage-log --set-runtime-parameter query-planning-budget=1
