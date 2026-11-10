#!/usr/bin/env bash
# [DX-N1] Why: verified, relocatable vendor bundles avoid system installs. Rejected: brew install (shared state).
source "$(dirname "$0")/common.sh"
[[ $(uname -sm) == 'Darwin arm64' ]] || exit 2
resources
mkdir -p "$NATIVE/tools/downloads"
cd "$NATIVE/tools/downloads"
fetch() {
  [[ -f $1 ]] || curl --fail --location --max-filesize 500000000 "$2" -o "$1"
  printf '%s  %s\n' "$3" "$1" | shasum -a 256 -c -
}
fetch postgres.dmg https://github.com/PostgresApp/PostgresApp/releases/download/v2.9.6/Postgres-2.9.6-17.dmg b38bb00b8c8702a568270aab85995c550f7f93d1503b818efdc5ff9a519b7168
fetch jdk.tar.gz https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.13%2B9/OpenJDK21U-jdk_aarch64_mac_hotspot_21.0.13_9.tar.gz bf036b35b071bfb2f54f2c0af8ee8d88afa95ee6eb3dce02c0f94cfc2524d04a
[[ -d $NATIVE/tools/jdk-21.0.13+9 ]] || tar -xzf jdk.tar.gz -C "$NATIVE/tools"
mounted=false; extracted=false
cleanup() {
 rc=$?; trap - EXIT
 [[ $mounted == false ]] || hdiutil detach "$NATIVE/tools/pg-mount"
 [[ $extracted == false ]] || docker rm tx2-dxn1-extract
 exit "$rc"
}
trap cleanup EXIT
if [[ ! -d $NATIVE/tools/postgres ]]; then
 hdiutil attach -readonly -nobrowse -mountpoint "$NATIVE/tools/pg-mount" postgres.dmg
 mounted=true
 cp -R "$NATIVE/tools/pg-mount/Postgres.app/Contents/Versions/17" "$NATIVE/tools/postgres"
fi
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
if [[ ! -d $NATIVE/tools/datomic ]]; then
 docker create --name tx2-dxn1-extract --pull never tx2-datomic:1.0.7745-da00
 extracted=true
 docker cp tx2-dxn1-extract:/opt/datomic "$NATIVE/tools/datomic"
fi
"$NATIVE/tools/postgres/bin/postgres" --version
"$NATIVE/tools/jdk-21.0.13+9/Contents/Home/bin/java" -version
