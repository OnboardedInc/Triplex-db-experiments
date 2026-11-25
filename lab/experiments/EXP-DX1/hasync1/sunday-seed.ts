import assert from "node:assert/strict";
import { hash } from "../ha1/common.ts";

export type ColdSeed = { directory: string; sha256: string; cluster: string };

export function seedFiles(raw: string, expected: string) {
  assert.match(expected, /^[a-f0-9]{64}$/);
  assert.equal(hash(raw), expected, "Stopped-directory manifest digest differs");
  const files = new Set<string>();
  for (const line of raw.trimEnd().split("\n")) {
    const match = /^[a-f0-9]{64}  \.\/([A-Za-z0-9._/-]+)$/.exec(line);
    assert(match, "Malformed stopped-directory manifest");
    const file = match[1]!;
    assert(file.split("/").every((p) => p && p !== "." && p !== ".."));
    assert(!files.has(file));
    files.add(file);
  }
  assert(files.has("PG_VERSION") && files.has("global/pg_control"));
  for (const marker of ["postmaster.pid", "standby.signal", "recovery.signal", "backup_label"])
    assert(!files.has(marker), "Expected an unmounted clean primary image");
  return files.size;
}

// [DX-HASYNC2] Why: the serial copy and single-stream hash of 126 GB took 712 s against a 720 s limit on server A. Eight
// workers copy and hash disjoint file lists; the same manifest still checks every byte and the file count. Rejected: skipping the
// per-case hash, which would let a damaged working copy start.
export const coldWorkers = 8;

export function coldPhases(logs: string) {
  const m = /^cold-phases copy-ms=(\d+) hash-ms=(\d+) kib=(\d+) workers=(\d+)$/m.exec(logs);
  assert(m, "Cold copy did not report its phases");
  const phases = { copyMs: Number(m[1]), hashMs: Number(m[2]), bytes: Number(m[3]) * 1024, workers: Number(m[4]) };
  // [DX-HA2] The pipelined copy checks each file as it is copied, so its one phase covers both; the default prints no such line.
  const pipelined = /^cold-pipelined copy-and-check-ms=(\d+)$/m.exec(logs);
  if (!pipelined) return phases;
  assert.equal(phases.hashMs, 0);
  assert.equal(Number(pipelined[1]), phases.copyMs);
  return { ...phases, pipelined: true as const };
}

// [DX-HASYNC1] Why: copy and verify local bytes before PostgreSQL can modify them. Rejected: a live directory or a network base backup for the first standby.
// [DX-HA2] Split into three parts so that the pipelined copy shares the same checks before and after; `coldCopy` is
// byte-identical to the text of `b03e806fd` (its SHA-256 is pinned in `recovery-options.test.ts`).
const coldHead = `
  test "$(cat /cold/PGDATA/PG_VERSION)" = 17
  test -z "$(find /cold/PGDATA ! -type f ! -type d -print -quit)"
  for marker in postmaster.pid standby.signal recovery.signal backup_label; do
    test ! -e "/cold/PGDATA/$marker"
  done
  cd /cold/PGDATA
  sum=$(sha256sum /cold/SHA256SUMS)
  test "\${sum%% *}" = "$COLD_SHA256"
  test "$(find . -type f | wc -l)" -eq "$(wc -l < /cold/SHA256SUMS)"
  control=$(LC_ALL=C pg_controldata .)
  printf '%s\\n' "$control" | grep -Eq 'Database cluster state:[[:space:]]+shut down$'
  printf '%s\\n' "$control" | grep -Eq "Database system identifier:[[:space:]]+$COLD_CLUSTER\$"
  ms() { awk '{ printf "%d", $1 * 1000 }' /proc/uptime; }
  begin=$(ms)
  find . -type d | while IFS= read -r d; do mkdir -p "$PGDATA/$d"; done
`;
const coldSerial = `  awk -v n="$COLD_WORKERS" '{ print substr($0, 67) > ("/tmp/cold-files." (NR % n)) }' /cold/SHA256SUMS
  awk -v n="$COLD_WORKERS" '{ print > ("/tmp/cold-sums." (NR % n)) }' /cold/SHA256SUMS
  pids=
  for list in /tmp/cold-files.*; do
    ( while IFS= read -r f; do cp -p "$f" "$PGDATA/$f"; done < "$list" ) &
    pids="$pids $!"
  done
  for pid in $pids; do wait "$pid"; done
  copied=$(ms)
  cd "$PGDATA"
  pids=
  for list in /tmp/cold-sums.*; do
    sha256sum -c "$list" >/dev/null &
    pids="$pids $!"
  done
  for pid in $pids; do wait "$pid"; done
  hashed=$(ms)
  test "$(find . -type f | wc -l)" -eq "$(wc -l < /cold/SHA256SUMS)"
  printf 'cold-phases copy-ms=%s hash-ms=%s kib=%s workers=%s\\n' "$((copied - begin))" "$((hashed - copied))" "$(du -sk . | cut -f1)" "$COLD_WORKERS"
`;
const coldTail = `  chown -R postgres:postgres "$PGDATA"
  chmod 700 "$PGDATA"
  printf '\\nhost replication ha1stream all scram-sha-256\\n' >> pg_hba.conf
  printf "\\nsynchronous_standby_names = '%s'\\n" "$COLD_SYNC" >> postgresql.auto.conf
  if test -n "$COLD_CONN"; then
    printf "primary_conninfo = '%s'\\nrecovery_target_timeline = 'latest'\\n" "$COLD_CONN" >> postgresql.auto.conf
    touch standby.signal
  fi
  printf 'verified-cold-copy %s\\n' "$COLD_SHA256"
`;
export const coldCopy = coldHead + coldSerial + coldTail;

// [DX-HA2] Why: the serial form copies every file and then re-reads all 126 GB to hash it (452 s of the 603 s on November
// 23). Here each worker checks a file right after copying it, so copying one file overlaps checking another. The check is
// the same: every destination file against its manifest digest, then the file count. The read bypasses the page cache
// (O_DIRECT, after the kernel writes the file back), so it checks the bytes on the disk; the serial check read the disk
// only for files its container's memory limit had already evicted. Rejected: hashing the source bytes as they stream past
// (it would no longer read what was written) and a cached read (it would check memory, not the disk).
const coldPipelined = `  awk -v n="$COLD_WORKERS" '{ print substr($0, 1, 64), substr($0, 67) > ("/tmp/cold-pairs." (NR % n)) }' /cold/SHA256SUMS
  pids=
  for list in /tmp/cold-pairs.*; do
    ( while read -r want f; do
        cp -p "$f" "$PGDATA/$f"
        got=$(dd if="$PGDATA/$f" iflag=direct bs=1M 2>/dev/null | sha256sum)
        test "\${got%% *}" = "$want"
      done < "$list" ) &
    pids="$pids $!"
  done
  for pid in $pids; do wait "$pid"; done
  checked=$(ms)
  cd "$PGDATA"
  test "$(find . -type f | wc -l)" -eq "$(wc -l < /cold/SHA256SUMS)"
  printf 'cold-phases copy-ms=%s hash-ms=0 kib=%s workers=%s\\n' "$((checked - begin))" "$(du -sk . | cut -f1)" "$COLD_WORKERS"
  printf 'cold-pipelined copy-and-check-ms=%s\\n' "$((checked - begin))"
`;
export const coldCopyPipelined = coldHead + coldPipelined + coldTail;

export function coldMount(seed: ColdSeed, app = "", conn = "") {
  return [
    "--mount",
    "type=bind,source=" + seed.directory + ",target=/cold,readonly",
    "-e",
    "COLD_SHA256=" + seed.sha256,
    "-e",
    "COLD_CLUSTER=" + seed.cluster,
    "-e",
    "COLD_SYNC=" + app,
    "-e",
    "COLD_CONN=" + conn,
    "-e",
    "COLD_WORKERS=" + coldWorkers,
  ];
}
