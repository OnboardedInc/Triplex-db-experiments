#!/usr/bin/env bash
# [DX-JVM1] Why: the integrated native suite loads the actual signed Datomic classes on Java 25.
# Rejected: running SDK-only mocks or substituting Java 21 for a Java 25 compatibility result.
set -euo pipefail
java=${1:?Java 25 executable} zip=${2:?pinned Datomic ZIP} out=${3:?fresh evidence directory}
source=$(git rev-parse --verify "${4:-HEAD}^{commit}")
[[ $(df -Pk "$(dirname "$out")" | awk 'NR==2 {print $4}') -ge 5242880 ]] || { echo 'Host free disk below 5 GiB' >&2; exit 2; }
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
# [DX-JVM1] Why: run the unchanged integrated suite and use its exact archived fixtures on the host.
# Rejected: writing the container's /opt layout on the Mac or skipping three fixture-dependent tests.
cat > "$out/run-selftest.clj" <<'CLJ'
(require '[clojure.java.io :as io] '[triplex.gateway.selftest :as suite])
(let [original slurp
      root (System/getProperty "triplex.gateway.fixtureRoot")
      fixtures {"/opt/gateway/codec-cases.json" (io/file root "codec-cases.json")
                "/opt/gateway/codec-vectors.json" (io/file root "codec-vectors.json")
                "/opt/gateway/history-range-case.json" (io/file root "history-range-case.json")}]
  (with-redefs [clojure.core/slurp (fn [file & options]
                                   (apply original (get fixtures file file) options))]
    (suite/-main)))
CLJ
for gc in G1 Z; do
  "$java" "${base[@]}" "-XX:+Use${gc}GC" --sun-misc-unsafe-memory-access=allow --enable-native-access=ALL-UNNAMED \
    "$spec" "-Dtriplex.gateway.fixtureRoot=$src/packages/datomic/gateway" \
    -cp "$classpath" clojure.main "$out/run-selftest.clj" > "$out/native-$gc.log" 2>&1
  grep -Fx 'Ran 27 tests containing 54079 assertions.' "$out/native-$gc.log"
  grep -Fx '0 failures, 0 errors.' "$out/native-$gc.log"
done
(cd "$out"; tail -1 native-inputs.txt | shasum -a 256 -c)
