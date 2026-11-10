#!/bin/bash
# [DX-S4] Why: serialize the lane's Turtle integer shorthand as strict N-Quads typed literals, without changing RDF terms. Rejected: depending on nonstandard N-Quads numeric parsing or retaining a second multi-GB input copy.
set -euo pipefail
cd /data
printf '%s' '{"num-triples-per-batch":500000}' > settings.json
sed -E 's|^(<[^>]*> <[^>]*> )(-?[0-9]+)( <[^>]*> \.)$|\1"\2"^^<http://www.w3.org/2001/XMLSchema#integer>\3|' /input/facts.nq |
 tee >(sha256sum > /data/indexed-input.sha256) |
 qlever-index -i triplex -f - -F nq -s settings.json --stxxl-memory 512M --no-patterns
wait
