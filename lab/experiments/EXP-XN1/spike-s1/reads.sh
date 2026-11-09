#!/bin/sh
# [EXP-XN1] Why: finish every first-pass read before waiting for compaction.
# Rejected: interleaving idle waits with the immediate pass (changes its condition).
set -eu
phase=$1
for kind in a b c d; do
 for clients in 1 4 16; do
  node lab/bin/heavy.mjs --label XN-S1-read-$phase-$kind-$clients -- node lab/experiments/EXP-XN1/spike-s1/read.mjs read "$phase" "$kind" "$clients"
 done
done
