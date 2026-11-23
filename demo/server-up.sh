#!/usr/bin/env bash
# [DX-DEMO1] Bring the demo stack up on a working copy of the sealed 1 billion record cluster (or the toy on the Mac).
#
#   sudo DEMO_ORIGINAL=/path/to/stopped/cluster DEMO_HANDOFF=/path/to/aged-scorecard.json bash demo/server-up.sh [--reset]
#   sudo env AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... S3_ENDPOINT=... S3_BUCKET=... bash demo/server-up.sh --fetch
#   bash demo/server-up.sh --toy [--reset]          (Mac lab VM, after demo/toy/build-toy.sh)
#
# The original cluster is never started or written. The stack runs on DEMO_ROOT/work/cluster (a byte copy);
# --reset replaces that copy from the original. Gateways listen on 127.0.0.1 only (write 18491, read 18495).
# Each step prints its wall time. The last line is "DEMO READY head=... records=...".
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/.." && pwd)
cd "$repo"
reset=0 fetch=0 toy=0
for arg in "$@"; do
  case $arg in --reset) reset=1;; --fetch) fetch=1;; --toy) toy=1;; *) echo "unknown option $arg" >&2; exit 2;; esac
done
port_w=18491 port_r=18495
# Pinned identity of the sealed 1 billion cut (coordinator, 2026-11-23). Digests only; no location or credential.
handoff_pin=faab1bc5bca8e6303285101003e5a42fc82c8e99fe2eadacaf125259b575bbf2
archive_pin=ea9a4b1df2d9efb2a416b7b40ae6b621eef62f3c14c33acabbb18f623979ffb6
tree_expect='{"files":1642,"bytes":176078670513,"treeSha":"115999f1771a325d2c60cf5a34bafc2be80ff2744069a270557724e783f07efc"}'
sealed_head=28309866 sealed_t=62888918 sealed_records=1000251169

t0=$SECONDS step_start=$SECONDS step_name=
step() { step_name=$1; step_start=$SECONDS; printf '[demo] %s ...\n' "$1"; }
done_step() { printf '[demo] %s done in %d s\n' "$step_name" "$((SECONDS - step_start))"; timings+="$step_name=$((SECONDS - step_start)) "; }
timings=

if [[ $toy == 1 ]]; then
  [[ $(uname -s) == Darwin && $fetch == 0 ]] || { echo 'The toy runs only in the Mac lab VM' >&2; exit 2; }
  export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
  root=${DEMO_ROOT:-$HOME/Claude/Projects/triplex-db-2/demo-toy}
  kind=toy
  original=tx2-dxdemo1-toy-original work=tx2-dxdemo1-toy-work
  handoff=$root/original/handoff.json
  export DX_STACK_EVIDENCE=$root/evidence
  heavy=(node lab/bin/heavy.mjs --label DX-DEMO1-toy-up --)
else
  [[ $(uname -s) == Linux && $EUID == 0 ]] || { echo 'Run as root on the rented Linux machine' >&2; exit 2; }
  export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
  root=${DEMO_ROOT:-/var/tmp/triplex-demo}
  kind=1b
  original=${DEMO_ORIGINAL:-$root/original/cluster} work=$root/work/cluster
  handoff=${DEMO_HANDOFF:-$root/original/aged-scorecard.json}
  export DX_BARE_METAL_ROOT=$root/state DX_STACK_EVIDENCE=$root/state/evidence
  heavy=()
fi
mkdir -p "$root" "$DX_STACK_EVIDENCE"
chmod 700 "$root"
if [[ -s $root/stack.prefix ]] && docker container inspect "$(cat "$root/stack.prefix")-pg" >/dev/null 2>&1; then
  echo "A demo stack is already up ($(cat "$root/stack.prefix")); run demo/server-down.sh first" >&2; exit 2
fi

# 1. Bootstrap what is missing (server only). A machine that already ran t1/bare-metal.sh --prepare skips this.
if [[ $toy == 0 ]]; then
  step bootstrap
  if [[ -d $root/build/tools/bin ]]; then export PATH=$root/build/tools/bin:$PATH; fi
  missing=()
  command -v docker >/dev/null || missing+=(docker)
  command -v node >/dev/null && [[ $(node -p 'process.versions.node.split(".")[0]') -ge 22 ]] || missing+=(node)
  for image in tx2-datomic:1.0.7745-da00 tx2-datomic:1.0.7745-jre25 postgres:17-alpine; do
    command -v docker >/dev/null && docker image inspect "$image" >/dev/null 2>&1 || missing+=("$image")
  done
  if ((${#missing[@]})); then
    echo "[demo] missing: ${missing[*]}; running the native bootstrap (about 10 to 15 minutes)"
    [[ -z $(git status --porcelain) ]] || { echo 'Bootstrap needs a clean checkout of a pushed commit' >&2; exit 2; }
    [[ ! -e $root/build ]] || { echo "Remove $root/build or finish it by hand" >&2; exit 2; }
    DX_JAVA=25 bash lab/experiments/EXP-DX1/t1/bare-metal.sh --prepare "$(git rev-parse HEAD)" "$root/build"
    export PATH=$root/build/tools/bin:$PATH
  fi
  if [[ ! -e $original || $fetch == 1 ]]; then
    command -v zstd >/dev/null && command -v rclone >/dev/null || { apt-get update -qq && apt-get install -y -qq zstd rclone; }
  fi
  done_step
fi

# 2. Fetch the sealed cluster and its handoff from object storage when they are not on this machine.
if [[ $toy == 0 && ( ! -e $original || ! -e $handoff ) ]]; then
  [[ $fetch == 1 ]] || { echo "No cluster at $original or no handoff at $handoff; pass --fetch with storage credentials" >&2; exit 2; }
  [[ $original == "$root/original/cluster" && $handoff == "$root/original/aged-scorecard.json" ]] || exit 2
  : "${AWS_ACCESS_KEY_ID:?}" "${AWS_SECRET_ACCESS_KEY:?}" "${S3_ENDPOINT:?}" "${S3_BUCKET:?}"
  free_gb=$(df -P --block-size=1G "$root" | awk 'NR==2{print $4}')
  ((free_gb >= 520)) || { echo "Need 520 GB free under $root (archive 146, original 177, working copy 177, slack); have $free_gb" >&2; exit 2; }
  step fetch
  # Credentials reach rclone through its environment only and are never written or printed.
  export RCLONE_CONFIG_DEMO_TYPE=s3 RCLONE_CONFIG_DEMO_PROVIDER=Other RCLONE_CONFIG_DEMO_ENV_AUTH=false
  export RCLONE_CONFIG_DEMO_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID RCLONE_CONFIG_DEMO_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
  export RCLONE_CONFIG_DEMO_ENDPOINT=$S3_ENDPOINT RCLONE_CONFIG_DEMO_REGION=${AWS_DEFAULT_REGION:-us-east-1}
  mkdir -p "$root/download" "$root/original"
  rclone copy "demo:$S3_BUCKET/aged-1b" "$root/download" --include 'cluster.tar.zst' --include '*.json' \
    --transfers 4 --multi-thread-streams 16 --multi-thread-cutoff 256M --stats 60s --stats-one-line
  unset RCLONE_CONFIG_DEMO_ACCESS_KEY_ID RCLONE_CONFIG_DEMO_SECRET_ACCESS_KEY AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
  done_step
  step verify-archive
  [[ $(sha256sum "$root/download/aged-scorecard.json" | cut -d' ' -f1) == "$handoff_pin" ]]
  [[ $(sha256sum "$root/download/cluster.tar.zst" | cut -d' ' -f1) == "$archive_pin" ]]
  done_step
  step extract
  rm -rf "$root/original/extract"; mkdir "$root/original/extract"
  zstd -dc -T0 "$root/download/cluster.tar.zst" | tar -x --same-owner --numeric-owner -p -C "$root/original/extract"
  found=$(find "$root/original/extract" -maxdepth 3 -name PG_VERSION -printf '%h\n')
  [[ -n $found && $(printf '%s\n' "$found" | wc -l) == 1 ]]
  mv "$found" "$root/original/cluster"
  rm -rf "$root/original/extract"
  cp "$root/download/aged-scorecard.json" "$handoff"
  [[ ${DEMO_KEEP_ARCHIVE:-0} == 1 ]] || rm -f "$root/download/cluster.tar.zst"
  done_step
  step verify-tree
  python3 -I "$here/server/inventory.py" "$root/original/cluster" --expect "$tree_expect" > "$root/original/inventory.json"
  done_step
fi

# 3. Identity of the inputs before anything starts.
step check-handoff
if [[ $toy == 1 ]]; then
  [[ -f $handoff && -s $handoff.sha256 && $(shasum -a 256 "$handoff" | cut -d' ' -f1) == "$(cat "$handoff.sha256")" ]]
  docker volume inspect "$original" >/dev/null
else
  [[ $(sha256sum "$handoff" | cut -d' ' -f1) == "$handoff_pin" ]]
  [[ $(cat "$original/PG_VERSION") == 17 && ! -e $original/postmaster.pid ]]
fi
done_step

# 4. The working copy. The original is only ever read.
fresh=0
if [[ $toy == 1 ]]; then
  if [[ $reset == 1 ]] && docker volume inspect "$work" >/dev/null 2>&1; then docker volume rm "$work" >/dev/null; fi
  if ! docker volume inspect "$work" >/dev/null 2>&1; then
    step copy
    docker volume create "$work" >/dev/null
    docker run --rm --pull never --network none -v "$original:/from:ro" -v "$work:/to" --entrypoint /bin/sh \
      postgres:17-alpine -euc 'test "$(cat /from/PG_VERSION)" = 17; test ! -e /from/postmaster.pid; cp -a /from/. /to/'
    fresh=1
    done_step
  fi
else
  if [[ $reset == 1 && -e $work ]]; then rm -rf --one-file-system -- "$work"; fi
  if [[ ! -e $work ]]; then
    step copy
    mkdir -p "$(dirname "$work")"
    cp -a -- "$original" "$work.partial"
    mv "$work.partial" "$work"
    fresh=1
    done_step
  fi
  [[ ! -e $work/postmaster.pid ]] || { echo 'The working copy was not shut down cleanly; use --reset' >&2; exit 2; }
fi

# 5. Start PostgreSQL, the transactor and both gateways on the working copy.
step start-stack
prefix=tx2-dxdemo1-$kind-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
printf '%s\n' "$prefix" > "$root/stack.prefix"
profile=()
while IFS= read -r line; do profile+=("$line"); done < <(node "$here/server/profile.mjs" "$([[ $toy == 1 ]] && echo toy || echo server)")
envs=() args=() seen_sep=0
for line in "${profile[@]}"; do
  if [[ $line == -- ]]; then seen_sep=1; elif [[ $seen_sep == 0 ]]; then envs+=("$line"); else args+=("$line"); fi
done
${heavy[@]+"${heavy[@]}"} env "${envs[@]}" DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_QUIET_LOGS=1 TRIPLEX_TRACE_LEVEL=off \
  bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --demo-pgdata "$work" --port-write "$port_w" --port-read "$port_r" "${args[@]}"
done_step

# 6. Identity checks against the live stack: the gateway head, a fresh peer's head, t and record count, and on a
#    fresh 1 billion copy the AGE1 scorecard check (the same one the V01 card and the aged arms run).
step identity
image=$(DX_JAVA=21 node lab/config/datomic/runtime.mjs image)
database=$(node -e '
  const b = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const name = "s2-" + Buffer.from(b.scope).toString("base64url");
  if (b.database !== name) throw Error("Handoff database " + b.database + " is not the scope database " + name);
  console.log(name)' "$handoff")
basis=$(curl -fsS --max-time 30 "http://127.0.0.1:$port_w/v1/db/$database/basis")
gateway_head=$(node -e 'console.log(JSON.parse(process.argv[1]).position.v)' "$basis")
uri="datomic:sql://$database?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic"
identity=$(DEMO_PREFIX=$prefix DEMO_IMAGE=$image bash "$here/server/java.sh" -Xmx1g \
  -cp "/opt/datomic/datomic-transactor-pro-1.0.7745.jar:/opt/datomic/lib/*:/opt/datomic/resources:$repo/packages/datomic/gateway/src:$here/server/clj" \
  "-Dtriplex.codec.spec=$repo/packages/datomic/src/codec-spec.json" "-Dlogback.configurationFile=$repo/lab/experiments/EXP-DX1/age1/server-logback.xml" \
  clojure.main -m demo.identity "$uri" "$database" | sed -n 's/^DEMO_IDENTITY //p')
[[ -n $identity ]] || { echo 'The fresh peer did not report its identity' >&2; exit 1; }
read -r head physical_t records < <(node -e 'const x = JSON.parse(process.argv[1]); console.log(x.logicalHead, x.physicalT, x.records)' "$identity")
[[ $head == "$gateway_head" ]] || { echo "Gateway head $gateway_head differs from the peer's $head" >&2; exit 1; }
read -r want_head want_t want_records < <(node -e '
  const b = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  console.log(b.logicalHead, b.physicalT, b.records)' "$handoff")
if [[ $kind == 1b ]]; then
  [[ $want_head == "$sealed_head" && $want_t == "$sealed_t" && $want_records == "$sealed_records" ]]
fi
scorecard=skipped
if [[ $head == "$want_head" ]]; then
  [[ $physical_t == "$want_t" && $records == "$want_records" ]] ||
    { echo "Live t $physical_t or records $records differ from the handoff ($want_t, $want_records)" >&2; exit 1; }
  if [[ $kind == 1b ]]; then
    home=$root/datomic-home
    if [[ ! -f $home/datomic-transactor-pro-1.0.7745.jar ]]; then
      docker rm -f "$prefix-home" >/dev/null 2>&1 || true
      docker create --name "$prefix-home" --pull never "$image" >/dev/null
      rm -rf "$home.partial"; docker cp "$prefix-home:/opt/datomic" "$home.partial"; docker rm "$prefix-home" >/dev/null
      mv "$home.partial" "$home"
    fi
    scorecard=$(AGE_JAVA="$here/server/java.sh" AGE_DATOMIC_HOME=$home DEMO_PREFIX=$prefix DEMO_IMAGE=$image \
      DATOMIC_URI_TEMPLATE="datomic:sql://{db}?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic" \
      node lab/experiments/EXP-DX1/age1/scorecard.mjs check "$handoff" "$handoff_pin" | tail -n 1)
  else
    scorecard=toy-handoff
  fi
elif (( head > want_head )); then
  echo "[demo] the working copy holds $((head - want_head)) positions of demo changes since the seal; --reset restores the sealed copy"
else
  echo "Live head $head is behind the sealed head $want_head" >&2; exit 1
fi
# Open the scope the way the integrated clients do (installs this build's commit function and schema, never creates).
opened=$(curl -fsS --max-time 60 -H 'content-type: application/json' "http://127.0.0.1:$port_w/v1/db/create" \
  -d "$(node -e 'const b=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(JSON.stringify({scope:b.scope,layout:"lean",strictRecordClocks:true}))' "$handoff")")
node -e 'const o = JSON.parse(process.argv[1]); if (o.created !== false || o.db !== process.argv[2]) throw Error("Scope open did not find the existing database: " + process.argv[1])' "$opened" "$database"
done_step

# 7. The ready file the Mac's connect.sh reads over SSH. No address, credential or personal detail is in it.
node -e '
  const fs = require("fs");
  const [file, handoff, kind, prefix, database, head, t, records, scorecard, fresh, timings, pw, pr, identity] = process.argv.slice(1);
  const b = JSON.parse(fs.readFileSync(handoff, "utf8"));
  const ready = { version: "triplex-demo-ready/1", kind, prefix, database, scope: b.scope,
    writePort: Number(pw), readPort: Number(pr), workingCopy: true,
    head: Number(head), physicalT: Number(t), recordsAtBringUp: Number(records),
    sealed: { head: b.logicalHead, physicalT: b.physicalT, records: b.records },
    roster: b.roster, clocks: b.clocks ?? null, lastRecordedAt: JSON.parse(identity).lastRecordedAt,
    loaderPositionRows: kind === "1b" || b.loaderPositionRows === true, freshCopy: fresh === "1", scorecardCheck: scorecard === "skipped" || scorecard === "toy-handoff" ? scorecard : JSON.parse(scorecard),
    startedAt: new Date().toISOString(),
    stepSeconds: Object.fromEntries(timings.trim().split(" ").filter(Boolean).map((x) => { const [k, v] = x.split("="); return [k, Number(v)]; })) };
  fs.writeFileSync(file, JSON.stringify(ready, null, 2) + "\n", { mode: 0o644 });' \
  "$root/ready.json" "$handoff" "$kind" "$prefix" "$database" "$head" "$physical_t" "$records" "$scorecard" "$fresh" "$timings" "$port_w" "$port_r" "$identity"
printf 'DEMO READY head=%s records=%s t=%s database-prefix=%s write=127.0.0.1:%s read=127.0.0.1:%s total=%ds\n' \
  "$head" "$records" "$physical_t" "${database:0:12}" "$port_w" "$port_r" "$((SECONDS - t0))"
