#!/usr/bin/env bash
# [DX-S4] Why: measure the real full-channel immutable index and verify every _row via SPARQL. Rejected: reporting temporary builder output or a blob-only index as the lane mapping.
set -euo pipefail
p=$S4_PREFIX;out=$S4_EVIDENCE/$p;here=$(cd "$(dirname "$0")" && pwd)
: "${S4_QLEVER_INPUT:?prepared full RDF input required}"
python3 "$here/check-input.py" "$S4_INPUT" > "$out/input-check.json"
python3 - "$S4_QLEVER_INPUT" "$out" <<'PY'
import pathlib,json,sys,hashlib
p=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);s=json.loads((p/'summary.json').read_text());assert s['rows']==442410
h=hashlib.sha256()
with (p/'facts.nq').open('rb') as f:
 while b:=f.read(1024*1024):h.update(b)
assert h.hexdigest()==s['nqSha256'] and (p/'facts.nq').stat().st_size==s['nqBytes']
binding=json.loads((out/'input-check.json').read_text());assert s['sourceSha256']==binding['input_files']['rows.jsonl']['sha256']
(out/'rdf-input-check.json').write_text(json.dumps(s,indent=2)+'\n')
PY
image=sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec
docker image inspect "$image" node:22.23.2-bookworm-slim > "$out/qlever-images.json"
docker network create "$p-net" >/dev/null;docker volume create "$p-data" >/dev/null
docker run --rm --pull never --name "$p-init" --network none -v "$p-data:/data" postgres:17-alpine sh -c 'chmod 777 /data' > "$out/init.log"
docker run --pull never --name "$p-indexer" --memory 4g -v "$p-data:/data" -v "$S4_QLEVER_INPUT:/input:ro" -v "$here:/s4:ro" -w /data --entrypoint /bin/bash "$image" /s4/qlever-index.sh > "$out/index.log" 2> "$out/index.stderr"
docker cp "$p-indexer:/data/indexed-input.sha256" "$out/indexed-input.sha256"
docker inspect "$p-indexer" > "$out/indexer-container.json"
docker run -d --pull never --name "$p-qlever" --network "$p-net" --memory 3g -v "$p-data:/data" -w /data --entrypoint qlever-server "$image" -i triplex -p 7019 -j 4 -m 1G -c 128M -e 64M -s 30s --no-patterns --no-access-check --no-metrics-log --no-resource-usage-log > "$out/qlever-id.txt"
ready=false
for i in {1..60};do
 if docker exec "$p-qlever" curl -fsS -G --data-urlencode 'query=SELECT * WHERE { ?s ?p ?o } LIMIT 1' http://127.0.0.1:7019/ > "$out/health.json" 2>/dev/null;then ready=true;break;fi;sleep 1
done
$ready || exit 1
docker run --pull never --name "$p-driver" --network "$p-net" --memory 2g -e "S4_PREFIX=$p" -v "$here:/s4:ro" -v "$S4_INPUT:/input:ro" node:22.23.2-bookworm-slim node /s4/qlever-verify.mjs > "$out/driver.jsonl" 2> "$out/driver.stderr"
docker inspect "$p-qlever" "$p-driver" > "$out/containers.json"
docker stop -t 20 "$p-qlever" >/dev/null
docker run --rm --pull never --name "$p-du" -v "$p-data:/data:ro" postgres:17-alpine sh -c 'du -sk /data; find /data -type f -exec stat -c "%s %n" {} \;' > "$out/stopped-du.txt"
