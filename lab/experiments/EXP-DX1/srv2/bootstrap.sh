#!/usr/bin/env bash
# [DX-SRV2] First command on a fresh rented machine (Ubuntu 24.04, as root): the packages, the pinned Node 22 that
# v01/build.ts needs to start (the same archive and digest t1/bare-metal.sh pins), and a checkout of the public
# repository at COMMIT. Then srv2/session.sh stage builds everything else. Creates nothing outside /opt/srv2-node and
# the checkout. No credential is needed or read.
#   bash bootstrap.sh COMMIT CHECKOUT        (server)
#   bash bootstrap.sh --check                (Mac: download and verify the Node archive only, into a temporary folder)
set -euo pipefail
version=22.23.2 pin=d60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307
file=node-v$version-linux-x64.tar.xz url=https://nodejs.org/dist/v$version/$file
sum() { if command -v sha256sum >/dev/null; then sha256sum "$1"; else shasum -a 256 "$1"; fi | cut -d' ' -f1; }
if [[ ${1:-} == --check ]]; then
  t=$(mktemp -d); trap 'rm -rf "$t"' EXIT
  curl -fsSLo "$t/$file" "$url"; got=$(sum "$t/$file")
  [[ $got == "$pin" ]] && echo "node archive verified: $got ($(wc -c < "$t/$file") bytes)" || { echo "node archive digest $got differs from $pin" >&2; exit 1; }
  exit 0
fi
commit=${1:?COMMIT}; checkout=${2:?CHECKOUT}
[[ $commit =~ ^[a-f0-9]{40}$ && $checkout == /* ]] || exit 2
[[ $(uname -s) == Linux && $EUID == 0 && $(uname -m) == x86_64 ]] || { echo "run as root on the rented x86_64 Linux machine" >&2; exit 2; }
apt-get update -qq && apt-get install -y -qq git curl xz-utils ca-certificates rclone zstd >/dev/null
if [[ ! -x /opt/srv2-node/bin/node ]]; then
  curl -fsSLo "/tmp/$file" "$url"; [[ $(sum "/tmp/$file") == "$pin" ]] || { echo "node archive digest differs" >&2; exit 1; }
  mkdir -p /opt/srv2-node && tar -xJf "/tmp/$file" --strip-components=1 -C /opt/srv2-node && rm -f "/tmp/$file"
fi
ln -sf /opt/srv2-node/bin/node /usr/local/bin/node
[[ -d $checkout/.git ]] || git clone -q https://github.com/OnboardedInc/Triplex-db-experiments.git "$checkout"
git -C "$checkout" fetch -q origin && git -C "$checkout" checkout -q --detach "$commit"
[[ $(git -C "$checkout" rev-parse HEAD) == "$commit" && -z $(git -C "$checkout" status --porcelain) ]]
echo "bootstrap done: node $(node --version), checkout $checkout at ${commit:0:9}"
