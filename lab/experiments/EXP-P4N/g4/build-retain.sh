#!/bin/sh
# [EXP-P4N] Why: one heavy token for build, typecheck and retaining the arm, so a busy heavy pool costs one wait, not three.
# usage: build-retain.sh <armName>
set -e
cd /Users/sam/projects/triplex-db-2/.claude/worktrees/qh1/packages/qlever
../../node_modules/.bin/tsdown
../../node_modules/.bin/tsc --declaration --emitDeclarationOnly --rootDir src --outDir dist
../../node_modules/.bin/tsc --noEmit
cd ../..
node lab/experiments/EXP-P4N/g4/arms4.mjs "$1"
