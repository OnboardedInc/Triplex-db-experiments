#!/usr/bin/env bash
# [DX-JVM1] Why: collect one small Mac startup diagnostic under a normal heavy token.
# Rejected: replaying collector arms on the shared Mac or draining its heavy tokens.
set -euo pipefail
[[ $(uname -s) == Darwin ]]
java=${1:?Java major}
image=${2:?private Datomic image receipt}
out=${3:?new durable evidence subdirectory}
[[ $java == 21 || $java == 25 ]]
[[ -f $image && $(df -Pk "$(dirname "$out")" | awk 'NR==2 {print $4}') -ge 5242880 ]]
export DX_JAVA=$java DX_DATOMIC_IMAGE_RECEIPT=$image
exec node lab/bin/heavy.mjs --label DX-JVM1 -- node lab/bin/engine.mjs jvm-inventory --holder DX-JVM1 --out "$out"
