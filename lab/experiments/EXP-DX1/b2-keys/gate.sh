#!/usr/bin/env bash
# [DX-B2] The gate of the standalone B2 fix, in process, one ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-B2-gate -- \
#     bash lab/experiments/EXP-DX1/b2-keys/gate.sh NEW_ABSOLUTE_DIR [BASE_COMMIT]
# Phases (B2_GATE_PHASES, default "b2 paired suites"):
#   b2      b2-keys/b2.sh on this worktree, every option off (today's database-wide rule), the other removal held
#           pending B2_HOLD_MS past the grace (default 30000) at each hold point (at its publication, before its native
#           commit), on the file authority and on the PostgreSQL authority. Fails when a published removal's key
#           outlives its grace + the hold. The base (BASE_COMMIT, default 1ed2650bd) runs too, as the reference.
#   paired  b2-keys/paired.clj on the base and on this worktree, with removals and with every removal left out, unsealed
#           and sealed: one SHA-256 of the native log per run, every reply, and the key store after one shred pass.
#           Fails unless the native logs and replies are identical; the key stores are printed and compared.
#   suites  the gateway's Clojure suites, on the base and on this worktree.
#   scenarios  [review] b2r/scenarios.clj (S1, S2a, S2b, S3) on the file and the PostgreSQL authority: S3 forces a
#           failure at every new failure line and fails if a line prints key bytes (a hex run of 64 or more, or \x),
#           a protected value, a subject ID or a scope word.
#   fuzz    [review] b2r/fuzz.clj, B2R_SCHEDULES (default 20000) schedules on each authority, seed B2R_SEED.
#   lines   [review F5, F9] b2-keys/lines.clj on this worktree: a persistent failure prints one line, then one a minute
#           with the number not printed; a refused PostgreSQL batch prints its SQL state and the server's text, never
#           the driver's message (the statement with a wrapped key); other exceptions print their class only.
#   n1      [DX-N1] n1-keys/pool.clj (R0 to R3: the key pool after a restart, a save of more protected values than the
#           pool holds, a burst) on this worktree and on the base, file and PostgreSQL authority: this worktree must pass
#           every check (the base's result is printed as the reference); and b2-keys/paired.clj on the PostgreSQL
#           authority, base and this worktree, with removals and with every removal left out, unsealed and sealed,
#           compared as in the paired phase (which runs on the file authority).
# The paired native logs are compared after paired.clj's normalisation, not as raw bytes: :db/txInstant datoms are
# left out; every clock value (a number from 1e12 to 1e14, a 13-digit number, a float clock, a hex double clock)
# becomes CLOCK or HEXCLOCK; the database name becomes DB; the random removal transaction IDs, every UUID and every
# 64-character hash become placeholders; the scope key's value becomes SCOPE and a sealed body's ciphertext BODY.
# Entity IDs, t values, attributes and every other value are compared as they are.
set -uo pipefail
out=${1:?absolute new output directory}; base=${2:-1ed2650bd}
[[ $out == /* && ! -e $out ]] || { echo "gate.sh: give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
x=$repo/lab/experiments/EXP-DX1
phases=${B2_GATE_PHASES:-b2 paired suites scenarios lines n1}
mkdir -p "$out/this" "$out/base" "$out/lab"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic/gateway lab/experiments/EXP-DX1/b2-keys > "$out/dirty"
cp -R "$repo/packages/datomic/gateway/src" "$out/this/src"; cp "$repo/packages/datomic/src/codec-spec.json" "$out/this/codec-spec.json"
git -C "$repo" archive "$base" packages/datomic/gateway/src packages/datomic/src/codec-spec.json | tar -x -C "$out/base"
mv "$out/base/packages/datomic/gateway/src" "$out/base/src"; cp "$out/base/packages/datomic/src/codec-spec.json" "$out/base/codec-spec.json"
rm -rf "$out/base/packages"; echo "$base" > "$out/base/commit"
cp "$x/wfix1/regression.clj" "$x/b2-keys/paired.clj" "$x/b2-keys/lines.clj" "$out/lab/"
image=${DX_B2_IMAGE_ID:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
[[ $(docker image inspect --format '{{.Id}}' "$image") == "$image" ]] || { echo "gate.sh: image $image not present" >&2; exit 2; }
echo "$image" > "$out/image"
status=0
run() { # NAME SOURCE FORM [ENV...]
  local name=$1 source=$2 form=$3; shift 3
  printf '%s\n' "$form" > "$out/$name.clj"
  mkdir -p "$out/$name.out"
  docker run --rm --pull never --name "tx2-dxb2-gate-$$-$name" --memory 3g --cpus 2 -v "$out/$name.out:/out" \
    -v "$out/$source/src:/opt/gateway/src:ro" -v "$out/$source/codec-spec.json:/opt/spec/codec-spec.json:ro" \
    -v "$out/lab:/lab:ro" -v "$out/$name.clj:/opt/run.clj:ro" \
    -e TRIPLEX_ERASURE_DIRECTORY=/tmp/b2-authority -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}' \
    -e DF01_RECORDED_PAGE=/tmp/recorded-page.json "$@" --entrypoint /bin/bash "$image" -c \
    'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' \
    > "$out/$name.log" 2>&1 || status=1
  echo "$name $image" >> "$out/images-ran"
  grep -E "B2_PAIRED |SUITES|FAIL in|ERROR in|Exception" "$out/$name.log" | cut -c1-600 | head -12
}
if [[ $phases == *b2* ]]; then
  for authority in file pg; do
    B2_AUTHORITY=$authority B2_HOLD_MS=${B2_HOLD_MS:-30000} bash "$x/b2-keys/b2.sh" "$out/b2-this-$authority" worktree off || status=1
    B2_AUTHORITY=$authority B2_HOLD_MS=${B2_HOLD_MS:-30000} bash "$x/b2-keys/b2.sh" "$out/b2-base-$authority" "$base" off > /dev/null 2>&1
    grep -h "ERA2_B2_SUMMARY" "$out/b2-this-$authority"/b2-off.log "$out/b2-base-$authority"/b2-off.log | sed "s/^/$authority /"
  done
fi
if [[ $phases == *paired* ]]; then
  paired='(load-file "/lab/regression.clj") (load-file "/lab/paired.clj") (b2-paired/main)'
  for source in base this; do
    run "paired-$source-removals" "$source" "$paired" -e TRIPLEX_ERASURE_SHRED_GRACE_MS=0
    run "paired-$source-none" "$source" "$paired" -e TRIPLEX_ERASURE_SHRED_GRACE_MS=0 -e PAIRED_NO_REMOVALS=1
  done
  python3 - "$out" <<'PY' || status=1
import sys, re, hashlib
out = sys.argv[1]
def rows(name):
    text = open(f"{out}/{name}.log").read()
    logs = [l for l in text.splitlines() if l.startswith("B2_PAIRED ")]
    replies = [l for l in text.splitlines() if l.startswith("B2_PAIRED_REPLIES")]
    field = lambda l, k: (re.search(r':' + k + r' ("[^"]*"|[0-9]+|true|false)', l) or [None, None])[1]
    return ([{k: field(l, k) for k in ["sealed", "datoms", "sha256", "reads", "keys", "keys-sha256"]} for l in logs],
            hashlib.md5("\n".join(replies).encode()).hexdigest())
ok = True
for variant in ["removals", "none"]:
    b, t = rows(f"paired-base-{variant}"), rows(f"paired-this-{variant}")
    native = [(r["sealed"], r["datoms"], r["sha256"], r["reads"]) for r in b[0]] == [(r["sealed"], r["datoms"], r["sha256"], r["reads"]) for r in t[0]] and len(b[0]) == 2
    keys = [(r["keys"], r["keys-sha256"]) for r in b[0]] == [(r["keys"], r["keys-sha256"]) for r in t[0]]
    print("B2_PAIRED_COMPARE", variant, "native log", "identical" if native else "DIFFERENT", "| replies", "identical" if b[1] == t[1] else "DIFFERENT",
          "| key store after a shred pass", "identical" if keys else "different")
    for side, r in [("base", b), ("this", t)]:
        for x in r[0]: print("  ", side, x)
    ok = ok and native and b[1] == t[1]
sys.exit(0 if ok else 1)
PY
fi
if [[ $phases == *suites* ]]; then
  suites=$(cd "$repo/packages/datomic/gateway/src" && ls triplex/gateway/*_test.clj | sed 's#/#.#g; s#_#-#g; s#\.clj$##' | tr '\n' ' ')
  suites="triplex.gateway.selftest $suites"
  # the gate: this worktree's suites end exactly as the base's (the same tests, passes, failures and errors)
  kept=$status
  for source in base this; do
    run "suites-$source" "$source" "(require 'clojure.test) (def nss (quote [$suites])) (apply require nss)
(let [r (apply clojure.test/run-tests nss)] (println \"B2_SUITES\" (pr-str (select-keys r [:test :pass :fail :error])))
  (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))"
  done
  status=$kept
  b=$(grep -h "^B2_SUITES" "$out/suites-base.log"); t=$(grep -h "^B2_SUITES" "$out/suites-this.log")
  echo "B2_SUITES base $b"; echo "B2_SUITES this $t"
  [[ -n $t && $b == "$t" ]] || { echo "B2_SUITES differ from the base"; status=1; }
fi
if [[ $phases == *scenarios* ]]; then
  for authority in file pg; do
    bash "$x/b2r/run.sh" "$out/scenarios-$authority" worktree "$authority" scenarios.clj '(b2r-scenarios/main)' || status=1
    grep -hE "^B2R_SCEN_SUMMARY|^B2R_SCEN FAIL" "$out/scenarios-$authority/run.log" 2>/dev/null | cut -c1-300 | head -8
  done
fi
if [[ $phases == *fuzz* ]]; then
  for authority in file pg; do
    bash "$x/b2r/run.sh" "$out/fuzz-$authority" worktree "$authority" fuzz.clj '(b2r-fuzz/main)' \
      "B2R_SCHEDULES=${B2R_SCHEDULES:-20000}" "B2R_SEED=${B2R_SEED:-1000000}" || status=1
    grep -hE "^B2R_FUZZ_SUMMARY|^B2R_FUZZ_VIOLATION" "$out/fuzz-$authority/run.log" 2>/dev/null | cut -c1-600 | tail -6
  done
fi
if [[ $phases == *lines* ]]; then
  run lines-this this '(load-file "/lab/lines.clj") (b2-lines/main)'
  grep -hE "^B2_LINES" "$out/lines-this.log" | cut -c1-300
  grep -q "^B2_LINES_SUMMARY {:checks 10, :failed 0}" "$out/lines-this.log" || status=1
fi
if [[ $phases == *n1* ]]; then
  for authority in file pg; do
    bash "$x/n1-keys/run.sh" "$out/n1-this-$authority" worktree "$authority" n1-keys/pool.clj '(n1-pool/main)' > /dev/null || status=1
    bash "$x/n1-keys/run.sh" "$out/n1-base-$authority" "$base" "$authority" n1-keys/pool.clj '(n1-pool/main)' > /dev/null
    grep -h "^N1_SUMMARY" "$out/n1-this-$authority/run.log" "$out/n1-base-$authority/run.log" | sed "s/^/$authority /"
  done
  for source in base this; do
    for variant in removals none; do
      ref=$base; [[ $source == this ]] && ref=worktree
      extra=(TRIPLEX_ERASURE_SHRED_GRACE_MS=0); [[ $variant == none ]] && extra+=(PAIRED_NO_REMOVALS=1)
      bash "$x/n1-keys/run.sh" "$out/n1-paired-pg-$source-$variant" "$ref" pg b2-keys/paired.clj '(b2-paired/main)' "${extra[@]}" > /dev/null
    done
  done
  python3 - "$out" <<'PY2' || status=1
import sys, re, hashlib
out = sys.argv[1]
def rows(name):
    text = open(f"{out}/{name}/run.log").read()
    logs = [l for l in text.splitlines() if l.startswith("B2_PAIRED ")]
    replies = [l for l in text.splitlines() if l.startswith("B2_PAIRED_REPLIES")]
    field = lambda l, k: (re.search(r':' + k + r' ("[^"]*"|[0-9]+|true|false)', l) or [None, None])[1]
    return [{k: field(l, k) for k in ["sealed", "datoms", "sha256", "reads"]} for l in logs], hashlib.md5("\n".join(replies).encode()).hexdigest()
ok = True
for variant in ["removals", "none"]:
    b, t = rows(f"n1-paired-pg-base-{variant}"), rows(f"n1-paired-pg-this-{variant}")
    native = b[0] == t[0] and len(b[0]) == 2
    print("N1_PAIRED_PG", variant, "native log", "identical" if native else "DIFFERENT", "| replies", "identical" if b[1] == t[1] else "DIFFERENT")
    for side, r in [("base", b), ("this", t)]:
        for x in r[0]: print("  ", side, x)
    ok = ok and native and b[1] == t[1]
sys.exit(0 if ok else 1)
PY2
fi
rm -rf "$out/this/src" "$out/base/src"
exit "$status"
