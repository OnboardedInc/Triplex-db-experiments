#!/usr/bin/env bash
# [DX-BM1] Why: recover the timeline and anatomy from the original failed render's sealed trace bytes.
# Rejected: rewriting the original attempt, rerunning timed traffic, or treating the derived files as an exact read gate.
set -euo pipefail
original=${1:?terminal original run}
scratch=${2:?fresh scratch parent}
out=${3:?pure render output}
mkdir "$scratch" "$out"
copy="$scratch/$(basename "$original")"
mkdir -p "$copy/driver"
(cd "$original/trace/raw"; sha256sum -c ../SHA256SUMS >/dev/null)
cp -al "$original/trace" "$copy/trace"
cp "$original"/{trace-run.json,head.txt,source-build-hashes.json} "$copy/"
cp "$original"/driver/ns-{report.json,writes.jsonl} "$copy/driver/"
node lab/bin/heavy.mjs --label DX-BM1-recover-trace -- node lab/trace/finalize.mjs "$copy" --render-only --no-register
for file in TRACE-REPORT.md trace.html trace.chrome.json trace-summary.json COMMIT-ANATOMY.md commit-anatomy.json SHA256SUMS; do
  cp --reflink=auto "$copy/$file" "$out/"
done
cp "$copy/trace/SHA256SUMS" "$out/ORIGINAL-RAW.SHA256SUMS"
printf '%s\n' 'Derived from the original timed observations and saved report. Original terminal correctness and oracle status are unchanged.' > "$out/READING.txt"
