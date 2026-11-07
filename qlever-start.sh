#!/bin/bash
set -euo pipefail
cd /data
if [[ ! -f triplex.index.pso ]]; then
  # This bootstrap graph belongs only to this independent development server.
  printf '<urn:triplex:bootstrap> <urn:triplex:format> "1" .\n' > bootstrap.nt
  qlever-index -i triplex -f bootstrap.nt -F nt --stxxl-memory 512M --no-patterns
fi
exec qlever-server -i triplex -p 7019 -j 16 -m 2G -c 256M -e 64M --persist-updates --no-patterns --no-access-check
