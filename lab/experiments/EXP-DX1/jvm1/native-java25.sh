#!/usr/bin/env bash
# [DX-JVM1] Why: the integrated native suite loads the actual signed Datomic classes on Java 25.
# Rejected: running SDK-only mocks or substituting Java 21 for a Java 25 compatibility result.
set -euo pipefail
java=${1:?Java 25 executable} zip=${2:?pinned Datomic ZIP} out=${3:?fresh evidence directory}
source=$(git rev-parse --verify "${4:-HEAD}^{commit}")
mkdir "$out"
"$java" -version > "$out/version.log" 2>&1
grep -F '25.0.5+8' "$out/version.log" >/dev/null
src="$out/source"
mkdir "$src" "$out/vendor"
git archive "$source" lab/config/datomic/SHA256SUMS lab/config/datomic/verification.json packages/datomic/gateway packages/datomic/src/codec-spec.json > "$out/source.tar"
tar -xf "$out/source.tar" -C "$src"
dist="$out/vendor/datomic-pro-1.0.7745"
python3 - "$zip" "$src/lab/config/datomic/verification.json" "$out/vendor" <<'VENDOR'
import hashlib,json,pathlib,sys,zipfile
archive,verification,out=map(pathlib.Path,sys.argv[1:])
pin=json.loads(verification.read_text())
assert archive.stat().st_size==pin['zipBytes']
with archive.open('rb') as file:
    assert hashlib.file_digest(file,'sha256').hexdigest()==pin['zipSha256']
with zipfile.ZipFile(archive) as file:
    for entry in file.namelist():
        path=pathlib.PurePosixPath(entry)
        assert not path.is_absolute() and '..' not in path.parts
    file.extractall(out)
VENDOR
peer="$dist/peer-1.0.7745.jar"
digest=$(shasum -a 256 "$peer" | awk '{print $1}')
grep -Fx "$digest  peer-1.0.7745.jar" "$src/lab/config/datomic/SHA256SUMS" >/dev/null
printf 'source=%s\npeerSha256=%s\n' "$source" "$digest" > "$out/native-inputs.txt"
(cd "$out"; shasum -a 256 source.tar) >> "$out/native-inputs.txt"
classpath="$src/packages/datomic/gateway/src:$peer:$dist/datomic-transactor-pro-1.0.7745.jar:$dist/lib/*:$dist/resources"
base=(-Xms128m -Xmx896m -XX:ActiveProcessorCount=2 -XX:+PrintFlagsFinal -XX:-UsePerfData)
spec="-Dtriplex.codec.spec=$src/packages/datomic/src/codec-spec.json"
expr='(require (quote datomic.api))
(when-not (datomic.api/create-database "datomic:mem://boot-warnings") (System/exit 1))
@(datomic.api/transact (datomic.api/connect "datomic:mem://boot-warnings") [])
(println "LIBRARIES" (clojure-version) (.getImplementationVersion (.getPackage org.slf4j.LoggerFactory)))
(System/exit 0)'
"$java" "${base[@]}" -XX:+UseG1GC "$spec" -cp "$classpath" clojure.main -e "$expr" > "$out/warnings.log" 2>&1
"$java" "${base[@]}" -XX:+UseG1GC --sun-misc-unsafe-memory-access=allow --enable-native-access=ALL-UNNAMED "$spec" -cp "$classpath" clojure.main -e "$expr" > "$out/compatibility.log" 2>&1
grep -Fx 'LIBRARIES 1.12.5 2.0.17' "$out/compatibility.log"
for gc in G1 Z; do
  "$java" "${base[@]}" "-XX:+Use${gc}GC" --sun-misc-unsafe-memory-access=allow --enable-native-access=ALL-UNNAMED \
    "$spec" -cp "$classpath" clojure.main -m triplex.gateway.selftest > "$out/native-$gc.log" 2>&1
  grep -E '^Ran [0-9]+ tests containing [0-9]+ assertions\.$' "$out/native-$gc.log"
  grep -Fx '0 failures, 0 errors.' "$out/native-$gc.log"
done
(cd "$out"; tail -1 native-inputs.txt | shasum -a 256 -c)
