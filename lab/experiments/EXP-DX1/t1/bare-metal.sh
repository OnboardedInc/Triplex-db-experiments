#!/usr/bin/env bash
# [DX-T1-14] Why: reproduce native builds, seed and workload from one public Git revision on a new physical machine.
# Rejected: exporting a Mac image/seed, running emulated images, or installing anything on the owner's Mac.
set -euo pipefail
mode=${1:---plan}; commit=${2:?full public repository commit}; work=${3:-$HOME/triplex-bare-metal}
[[ $mode == --plan || $mode == --prepare || $mode == --run ]] && [[ $commit =~ ^[0-9a-f]{40}$ ]] || exit 2
if [[ $mode == --plan ]]; then
  printf '%s\n' "Ubuntu 24.04 physical host; x86_64 or arm64; at least 8 CPUs, 24 GiB RAM and 80 GiB free."
  printf '%s\n' "Public source: OnboardedInc/Triplex-db-experiments at $commit; pinned Datomic 1.0.7745 distribution SHA256 from that checkout."
  printf '%s\n' 'Install Docker from Ubuntu; native Temurin/Node/Postgres images; pinned pnpm; local 1k correctness smoke, self-seeded 10k v3 off/zero/loaded/off, fixed-gap diagnostics; collect a checksummed archive.'
  printf '%s\n' 'Use --prepare to stop at the built toolchain and images.'
  printf '%s\n' 'No Mac source, dependency cache, seed, credential, VM or keep-warm request is required. This plan performs no installation or network call.'
  exit
fi
[[ $(uname -s) == Linux ]] || { echo 'Refusing installation outside Linux' >&2; exit 2; }
if [[ $EUID != 0 ]];then exec sudo bash "$0" "$mode" "$commit" "$work";fi
[[ $work == /* && $work != / && $work != *$'\n'* ]] || exit 2
source /etc/os-release
[[ $ID == ubuntu && $VERSION_ID == 24.04 ]] || { echo 'Ubuntu 24.04 required' >&2;exit 2; }
case $(uname -m) in x86_64) arch=amd64;node_arch=x64;; aarch64|arm64) arch=arm64;node_arch=arm64;; *)exit 2;; esac
[[ ! -e $work ]] || { echo 'Use a fresh owned work directory' >&2;exit 2; }
command -v systemd-detect-virt >/dev/null || { echo 'systemd-detect-virt is required to establish a physical host' >&2;exit 2; }
if systemd-detect-virt --quiet;then echo 'A VM or container is not bare metal' >&2;exit 2;fi
[[ $(getconf _NPROCESSORS_ONLN) -ge 8 && $(awk '/^MemTotal:/{print $2}' /proc/meminfo) -ge 24117248 ]] || { echo 'Need eight CPUs and at least 23 GiB usable memory (24 GiB installed)' >&2;exit 2; }
parent=$(dirname "$work");while [[ ! -d $parent ]];do parent=$(dirname "$parent");done
[[ $(df -Pk "$parent" | awk 'NR==2{print $4}') -ge 83886080 ]] || { echo 'Need 80 GiB free before builds and spill' >&2;exit 2; }
cache=${DX_NATIVE_BOOTSTRAP_CACHE:-}
if [[ -n $cache ]]; then
  # [DX-BM1] Why: copy already pinned archives and the package store before a second bench session.
  # Rejected: touching the old checkout, sharing a mutable install, or spending measurement time on repeat downloads.
  [[ $mode == --prepare && $cache == /* && $cache != "$work" && -d $cache/results ]] || exit 2
  dpkg-query -W docker.io git curl ca-certificates python3 unzip zstd xz-utils util-linux >/dev/null
  systemctl is-active --quiet docker
else
  apt-get update
  apt-get install -y docker.io git curl ca-certificates python3 unzip zstd xz-utils util-linux
  systemctl enable --now docker
fi
mkdir -p "$work/downloads" "$work/results" "$work/tools"
exec > >(tee "$work/bootstrap.log") 2>&1
export DX_BARE_METAL=1 DX_BARE_METAL_ROOT=$work/state
export DOCKER_HOST=unix:///var/run/docker.sock
export DOCKER_CONFIG=$work/docker-config GIT_TERMINAL_PROMPT=0
mkdir -p "$DOCKER_CONFIG"
export DX_STACK_EVIDENCE=$DX_BARE_METAL_ROOT/evidence/DX-T1 TRIPLEX_TRACE_EVIDENCE=$DX_BARE_METAL_ROOT/evidence
mkdir -p "$DX_STACK_EVIDENCE" "$DX_BARE_METAL_ROOT/locks"
[[ -z $(docker ps -q) ]] || { echo 'Use an idle dedicated daemon; existing containers are left alone' >&2;exit 2; }
docker version > "$work/results/docker-version.txt"
dpkg-query -W docker.io git curl python3 zstd util-linux > "$work/results/system-packages.txt"
archive_reports() {
  rc=$?;trap - EXIT TERM INT
  printf '%s\n' "$rc" > "$work/results/bootstrap.exit"
  if [[ -d $DX_STACK_EVIDENCE ]];then
    (cd "$work"; find state/evidence/DX-T1 -type f \( -name '*REPORT.md' -o -name 'TABLES.md' -o -name 'VERDICT*.md' -o -name 'trace.html' -o -name 'SHA256SUMS' -o -name 'COMMIT-ANATOMY.md' -o -name 'commit-anatomy.json' -o -name 'ns-report.json' \) -print0) > "$work/results/report-files.list0"
    tar -C "$work" --null -T "$work/results/report-files.list0" -c -I 'zstd -3' -f "$work/reports.tar.zst.tmp" results bootstrap.log
    mv "$work/reports.tar.zst.tmp" "$work/results/reports.tar.zst"
    sha256sum "$work/results/reports.tar.zst" > "$work/results/reports.tar.zst.sha256"
  fi
  printf 'Report archive: %s (pipeline exit %s)\n' "$work/results/reports.tar.zst" "$rc"
  exit "$rc"
}
trap archive_reports EXIT
trap 'exit 143' TERM INT
git clone --no-checkout https://github.com/OnboardedInc/Triplex-db-experiments.git "$work/repository"
git -C "$work/repository" checkout --detach "$commit"
[[ $(git -C "$work/repository" rev-parse HEAD) == "$commit" ]] || exit 2
cd "$work/repository"
version=22.23.2
if [[ -n $cache ]]; then
  cp -- "$cache/downloads/node.tar.xz" "$cache/downloads/node-SHASUMS256.txt" \
    "$cache/downloads/datomic-pro-1.0.7745.zip" "$work/downloads/"
  cp -a -- "$cache/corepack" "$cache/pnpm-store" "$work/"
else
  curl -fsSLo "$work/downloads/node.tar.xz" "https://nodejs.org/dist/v$version/node-v$version-linux-$node_arch.tar.xz"
  curl -fsSLo "$work/downloads/node-SHASUMS256.txt" "https://nodejs.org/dist/v$version/SHASUMS256.txt"
fi
python3 - "$work/downloads" "$version" "$node_arch" <<'PY_NODE'
import pathlib,hashlib,sys
p=pathlib.Path(sys.argv[1]);name=f'node-v{sys.argv[2]}-linux-{sys.argv[3]}.tar.xz'
rows=[line.split() for line in (p/'node-SHASUMS256.txt').read_text().splitlines()]
expected=[h for h,n in rows if n==name];assert len(expected)==1
assert hashlib.sha256((p/'node.tar.xz').read_bytes()).hexdigest()==expected[0]
PY_NODE
tar -xJf "$work/downloads/node.tar.xz" --strip-components=1 -C "$work/tools"
python3 - "$work" "$arch" <<'PY_DOWNLOADS'
import hashlib,json,pathlib,sys
p=pathlib.Path(sys.argv[1]);f=p/'downloads/node.tar.xz'
(p/'results/DOWNLOADS.json').write_text(json.dumps({'architecture':sys.argv[2],'nodeVersion':'22.23.2','nodeArchiveBytes':f.stat().st_size,'nodeArchiveSha256':hashlib.sha256(f.read_bytes()).hexdigest(),'nodeSource':'https://nodejs.org/dist/v22.23.2/SHASUMS256.txt'},indent=2)+'\n')
PY_DOWNLOADS
export PATH=$work/tools/bin:$PATH COREPACK_HOME=$work/corepack
corepack enable --install-directory "$work/tools/bin"
offline=()
if [[ -n $cache ]]; then offline=(--offline); fi
pnpm --store-dir "$work/pnpm-store" install --frozen-lockfile "${offline[@]}"
# [DX-BM1] Why: the 1k smoke imports W0's public dist export on a clean Linux checkout.
# Rejected: assuming the package is built transitively by the three existing targets (the first smoke stopped at ERR_MODULE_NOT_FOUND).
node lab/bin/heavy.mjs --label DX-BM1-native-build -- node_modules/.bin/turbo run build --filter=@triplex-build/triplex-datomic --filter=@triplex-build/triplex-host --filter=@triplex-build/triplex-qualification --filter=@triplex-build/w0
test -s packages/w0/dist/index.js
if [[ -z $cache ]]; then
  curl -fsSLo "$work/downloads/datomic-pro-1.0.7745.zip" https://datomic-pro-downloads.s3.amazonaws.com/1.0.7745/datomic-pro-1.0.7745.zip
fi
python3 - "$work" <<'PY_DATOMIC'
import hashlib,json,pathlib,shutil,sys,zipfile
p=pathlib.Path(sys.argv[1]);archive=p/'downloads/datomic-pro-1.0.7745.zip';v=json.load(open('lab/config/datomic/verification.json'))
assert archive.stat().st_size==v['zipBytes'] and hashlib.sha256(archive.read_bytes()).hexdigest()==v['zipSha256']
context=p/'image';context.mkdir()
with zipfile.ZipFile(archive) as z:
 for n in z.namelist():assert not pathlib.PurePosixPath(n).is_absolute() and '..' not in pathlib.PurePosixPath(n).parts
 z.extractall(p/'downloads/extracted')
shutil.copytree(p/'downloads/extracted/datomic-pro-1.0.7745',context/'datomic')
shutil.copytree('packages/datomic/gateway',context/'gateway');shutil.copy2('packages/datomic/src/codec-spec.json',context/'gateway/codec-spec.json')
shutil.copytree('lab/config/datomic',context/'config');shutil.copy2('lab/config/datomic/Dockerfile',context/'Dockerfile')
for f in (context/'datomic/bin').iterdir():
 if f.is_file():f.chmod(0o755)
rows=[]
for f in sorted(context.rglob('*')):
 if f.is_file():rows.append(f'{hashlib.sha256(f.read_bytes()).hexdigest()}  {f.relative_to(context)}')
(p/'results/IMAGE-INPUTS.SHA256SUMS').write_text('\n'.join(rows)+'\n')
PY_DATOMIC
docker pull --platform "linux/$arch" node:22.23.2-bookworm-slim
docker pull --platform "linux/$arch" postgres:17-alpine
build_hash=$(sha256sum "$work/results/IMAGE-INPUTS.SHA256SUMS" | cut -d' ' -f1)
# [DX-JVM1] Why: a prepared checkout can compare both JREs against the same signed vendor archive.
# Rejected: replacing the Java 21 tag before the matched comparison.
java_tag() { DX_JAVA=$1 node lab/config/datomic/runtime.mjs "$2"; }
[[ ${DX_JAVA:-21} == 21 || $DX_JAVA == 25 ]]
majors=(21)
[[ ${DX_JAVA:-21} != 25 ]] || majors+=(25)
images=(node:22.23.2-bookworm-slim postgres:17-alpine)
for major in "${majors[@]}"; do
  tag=$(java_tag "$major" tag)
  node lab/bin/heavy.mjs --label "DX-T1-native-image-$major" -- docker build --platform "linux/$arch"     --build-arg "BUILD_INPUTS_SHA256=$build_hash" --build-arg "DATOMIC_BASE=$(java_tag "$major" base)"     --build-arg "DATOMIC_JAVA_MAJOR=$major" --build-arg "DATOMIC_JAVA_VERSION=$(java_tag "$major" version)"     -t "$tag" "$work/image"
  [[ $(docker image inspect --format '{{.Architecture}}' "$tag") == "$arch" ]]
  images+=("$tag")
done
docker image inspect "${images[@]}" > "$work/results/images.json"
lscpu > "$work/results/lscpu.txt";lsblk -o NAME,TYPE,SIZE,FSTYPE,MOUNTPOINTS > "$work/results/disks.txt"
[[ $mode != --prepare ]] || exit 0
export DX_COMPILER_POLICY=early DX_NATIVE_GATES=0
# [DX-T1-14] Why: correctness smoke precedes the self-seeded 10k study; no sealed Mac volume is an input.
# Rejected: downloading private seeds or omitting the loaded arm's independent oracle.
bash lab/experiments/EXP-DX1/t1/run.sh real tx2-dxt1-native-smoke --subjects 1000 --max-readers 64 --level-s 10 --match-duration-s 200
DX_NS_PROFILE=v3 TRIPLEX_BENCH_SPILL_MAX_BYTES=30064771072 bash lab/experiments/EXP-DX1/t1/study.sh tx2-dxt1-native-v3
DX_NS_PROFILE=smoke TRIPLEX_TRACE_LEVEL=full bash lab/experiments/EXP-DX1/t1/run.sh real tx2-dxt1-native-gaps --rung 10k --zero-readers --reader-ladder-only --max-readers 0 --idle-keep none --probe10-per-s 0 --idle-gaps-ms 10,50,100,250,500,1000 --idle-commits 150 --idle-warmup-commits 0
