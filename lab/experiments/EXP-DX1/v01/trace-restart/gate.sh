#!/usr/bin/env bash
# [DX-CARD2] Mac gate for the trace file per process start (gateway trace.clj `writer`): three starts of one role in one
# trace directory, as a stack's bring-up does with the write gateway. Each start must write its own record; the last
# start owns gw-w.jsonl and the two earlier files are kept beside it. One lab container per start, no stack.
#   node lab/bin/heavy.mjs --label DX-CARD2-trace -- bash lab/experiments/EXP-DX1/v01/trace-restart/gate.sh NEW_DIR
set -euo pipefail
out=${1:?new absolute output directory under /Users}
[[ $out == /Users/* && ! -e $out ]] || { echo "give a new absolute output directory under /Users" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel); here=lab/experiments/EXP-DX1/v01/trace-restart
mkdir -p "$out/trace"; chmod 777 "$out/trace"
for start in 1 2 3; do
  docker run --rm --network none --memory 768m -e PROBE_START=$start -e TRIPLEX_TRACE_DIR=/trace -e TRIPLEX_TRACE_LEVEL=summary \
    -e TRIPLEX_TRACE_PROCESS=gw-w -e TRIPLEX_TRACE_JFR=0 -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src \
    -e "DATOMIC_JAVA_OPTS=-Xms64m -Xmx384m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json" \
    -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
    -v "$repo/$here:/probe:ro" -v "$out/trace:/trace" --entrypoint /opt/datomic/bin/run "${DX_CARD2_IMAGE:-tx2-datomic:1.0.7745-da00}" /probe/probe.clj
done
ls -1 "$out/trace" | tee "$out/files.txt"
python3 -I - "$out/trace" <<'PY'
import json, os, re, sys
d = sys.argv[1]; files = sorted(os.listdir(d))
kept = sorted((f for f in files if re.fullmatch(r"gw-w\.start-\d+-\d+\.jsonl", f)), key=lambda f: int(f.split("-")[2]))
assert "gw-w.jsonl" in files and len(kept) == 2, files
def starts(f): return [json.loads(l)["start"] for l in open(os.path.join(d, f)) if '"probe"' in l]
got = [starts(f) for f in kept] + [starts("gw-w.jsonl")]
assert got == [["1"], ["2"], ["3"]], got
print("PASS: three starts, three files, each start's record in its own file:", kept + ["gw-w.jsonl"])
PY
