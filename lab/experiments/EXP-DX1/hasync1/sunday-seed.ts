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

// [DX-HASYNC1] Why: copy and verify local bytes before PostgreSQL can modify them. Rejected: a live directory or a network base backup for the first standby.
export const coldCopy = `
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
  cp -a ./. "$PGDATA/"
  cd "$PGDATA"
  sha256sum -c /cold/SHA256SUMS >/dev/null
  chown -R postgres:postgres "$PGDATA"
  chmod 700 "$PGDATA"
  printf '\\nhost replication ha1stream all scram-sha-256\\n' >> pg_hba.conf
  printf "\\nsynchronous_standby_names = '%s'\\n" "$COLD_SYNC" >> postgresql.auto.conf
  if test -n "$COLD_CONN"; then
    printf "primary_conninfo = '%s'\\nrecovery_target_timeline = 'latest'\\n" "$COLD_CONN" >> postgresql.auto.conf
    touch standby.signal
  fi
  printf 'verified-cold-copy %s\\n' "$COLD_SHA256"
`;

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
  ];
}
