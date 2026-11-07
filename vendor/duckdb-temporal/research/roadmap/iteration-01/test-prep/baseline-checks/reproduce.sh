#!/usr/bin/env bash
# Rebuild and test v1 only, without writing into the frozen source snapshot.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
base=$(cd "$here/../../frozen-baseline" && pwd)
out=${1:?Supply a new absolute output directory}
[[ "$out" = /* && ! -e "$out" ]] || { echo 'Use a new absolute output directory' >&2; exit 2; }
: "${TD_DUCKDB2_PYTHONPATH:?Supply the existing pinned DuckDB 2.0.0 wheel directory}"
mkdir -p "$out/build" "$out/temp"
export TMPDIR="$out/temp" PYTHONDONTWRITEBYTECODE=1 OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1
{
  g++ --version | head -1
  g++ -std=c++17 -O3 -DNDEBUG -fPIC -fvisibility=hidden -shared \
    -Wall -Wextra -Wpedantic -Werror -Wno-missing-field-initializers \
    -I"$base/engine/vendor" -I"$base/engine/src" \
    "$base/engine/src/temporal_core.cpp" "$base/engine/src/temporal_datalog.cpp" \
    -o "$out/build/temporal_datalog.so"
  python3 "$base/engine/vendor/append_extension_metadata.py" \
    -l "$out/build/temporal_datalog.so" -n temporal_datalog \
    -o "$out/build/temporal_datalog.duckdb_extension" \
    -p linux_amd64 -dv v1.2.0 -ev 0.1.0 --abi-type C_STRUCT
  sha256sum "$out/build/temporal_datalog.duckdb_extension"
} 2>&1 | tee "$out/build.log"
extension="$out/build/temporal_datalog.duckdb_extension"
for mode in native storage correctness qa; do
  PYTHONPATH="$TD_DUCKDB2_PYTHONPATH" python3 "$here/run_baseline.py" \
    --mode "$mode" --output-root "$out/duckdb2" --extension "$extension" \
    --baseline "$base" 2>&1 | tee "$out/$mode-duckdb2.log"
done
NODE_DISABLE_COMPILE_CACHE=1 node --test "$base"/site/tests/*.test.mjs \
  2>&1 | tee "$out/browser-v1.log"
if [[ -n "${TD_DUCKDB143_PYTHONPATH:-}" ]]; then
  PYTHONPATH="$TD_DUCKDB143_PYTHONPATH" python3 "$here/run_baseline.py" \
    --mode native --output-root "$out/duckdb143" --extension "$extension" \
    --baseline "$base" 2>&1 | tee "$out/native-duckdb143.log"
else
  echo 'UNRUN: no TD_DUCKDB143_PYTHONPATH supplied' | tee "$out/native-duckdb143.log"
fi
python3 - "$base" <<'PY'
from pathlib import Path
import hashlib,json,sys
root=Path(sys.argv[1]);manifest=json.loads((root/'EXPORT-MANIFEST.json').read_text())
assert all(hashlib.sha256((root/x['path']).read_bytes()).hexdigest()==x['sha256']
           for x in manifest['files'])
print('All 218 frozen manifest entries unchanged after isolated checks')
PY
