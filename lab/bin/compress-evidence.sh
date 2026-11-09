#!/bin/sh
# Compress large, settled evidence files in place (zstd), keeping every byte recoverable.
# Why: host disk is the binding constraint on live runs (lab/STATE.md, 2026-11-09). Evidence that a report has already analyzed
# is kept, never deleted: each file is compressed, the archive is tested, its decompressed SHA256 must equal the original's,
# the original's hash is appended to ORIGINAL-SHA256SUMS.txt in the same directory, and only then is the original removed.
# Files modified in the last 30 minutes, files any process has open, and SQLite files in directories without a .settled marker are
# skipped, so stores still being read are never touched.
# Usage: lab/bin/compress-evidence.sh [evidence-root] [min-size, default +20M]
root="${1:-/Users/sam/Claude/Projects/triplex-db-2/evidence}"
size="${2:-+20M}"
count=0
find "$root" -type f -size "$size" -mmin +30 ! -name '*.zst' ! -name '*.tgz' ! -name '*.tar.zst' ! -name '*.gz' 2>/dev/null |
while read -r f; do
  # Never touch a file some process has open (read-only opens do not update mtime; P5B round 3 lost its stores mid-run this way).
  if lsof -t -- "$f" >/dev/null 2>&1; then continue; fi
  # SQLite stores and their WAL/SHM are compressed only when their directory is marked settled with a .settled file.
  case "$f" in *.db|*.db-wal|*.db-shm|*.sqlite|*.sqlite-wal|*.sqlite-shm|*-wal|*-shm)
    [ -e "$(dirname "$f")/.settled" ] || continue;; esac
  zstd -q -T0 -3 "$f" -o "$f.zst" || { rm -f "$f.zst"; continue; }
  zstd -t -q "$f.zst" || { rm -f "$f.zst"; continue; }
  a=$(shasum -a 256 "$f" | cut -d' ' -f1)
  b=$(zstd -dc "$f.zst" | shasum -a 256 | cut -d' ' -f1)
  if [ "$a" = "$b" ]; then
    echo "$a  $(basename "$f")" >> "$(dirname "$f")/ORIGINAL-SHA256SUMS.txt"
    rm "$f"
    count=$((count + 1))
  else
    rm -f "$f.zst"
  fi
done
df -h "$root" | tail -1
