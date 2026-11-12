#!/usr/bin/env bash
# [DX-R3-P9] Why: isolate the shared transaction-function delta on a private, fresh non-strict scope.
# Rejected: weakening a strict scope, or blaming the policy lookup without a source-function control.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
tag=${1:?p9 tag}
control=$(mktemp -d "$PWD/lab/experiments/EXP-DX1/r3/.old-commit-XXXXXX")
child=
finish() {
  rc=$?; trap - EXIT TERM INT
  if [[ -n $child ]]; then kill -TERM "$child" 2>/dev/null || true; wait "$child" || true; fi
  rm -rf "$control"
  exit "$rc"
}
trap finish EXIT
trap 'exit 143' TERM INT
cp -R packages/datomic/gateway "$control/gateway"
git show 1eea10e2:packages/datomic/gateway/src/triplex/gateway/commit.clj > "$control/gateway/src/triplex/gateway/commit.clj"
echo 'DX-R3 source bisection: only commit.clj from 1eea10e2; all other gateway and client code current; only non-strict scope A'
shasum -a 256 "$control/gateway/src/triplex/gateway/commit.clj"
export DX_R3_GATEWAY_SRC=$control/gateway
bash lab/experiments/EXP-DX1/r3/writer-arms.sh "$tag" A & child=$!
wait "$child"; child=
