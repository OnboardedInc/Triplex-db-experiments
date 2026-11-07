import postgres from "postgres";
import { execFileSync } from "node:child_process";
import { cp, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const runId = Date.now().toString();
const container = `triplex-xtdb-restore-${runId}`;
const backup = path.join(root, ".xtdb", `backup-${runId}`);
const restore = path.join(root, ".xtdb", `restore-${runId}`);
const evidence = {
  runId,
  observedAt: new Date().toISOString(),
  type: "clean-stopped-full-log-and-storage-backup",
  status: "RUNNING",
  limitations: [
    "Logical native-storage recovery test; public API replay after restore is a separate gate.",
    "No claim for abrupt crash during commit, online backup, or lost acknowledgement.",
  ],
};
const docker = (...args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
  }).trim();
const connect = (port) =>
  postgres(`postgres://xtdb:xtdb@127.0.0.1:${port}/xtdb`, {
    max: 1,
    fetch_types: false,
    prepare: false,
    onnotice: () => {},
    connect_timeout: 2,
  });
const snapshot = async (sql) => {
  const result = {};
  for (const table of [
    "tx_assertions",
    "tx_meta",
    "tx_claims",
    "tx_attempts",
    "tx_query_relations",
    "tx_query_generations",
    "tx_query_members",
  ]) {
    const rows = await sql.unsafe(`SELECT COUNT(*) AS total FROM ${table} FOR ALL VALID_TIME`);
    result[table] = rows[0].total;
  }
  result.positions = [
    ...(await sql.unsafe(
      "SELECT scope_key, position FROM tx_meta FOR ALL VALID_TIME ORDER BY scope_key, position",
    )),
  ];
  result.claims = [
    ...(await sql.unsafe(
      "SELECT scope_key, command_id, tx_id FROM tx_claims FOR ALL VALID_TIME ORDER BY scope_key, command_id",
    )),
  ];
  result.samples = [
    ...(await sql.unsafe(
      "SELECT * FROM tx_assertions FOR ALL VALID_TIME ORDER BY scope_key, id LIMIT 100",
    )),
  ];
  return result;
};
let stopped = false,
  restoreStarted = false;
try {
  const bytes =
    Number(
      execFileSync("du", ["-sk", path.join(root, ".xtdb/data")], { encoding: "utf8" }).split(
        /\s+/,
      )[0],
    ) * 1024;
  evidence.admission = JSON.parse(
    execFileSync(
      process.execPath,
      [
        path.join(root, "scripts/xtdb-resources.mjs"),
        "--require-server",
        "--planned-bytes",
        String(bytes * 3 + 32 * 1024 * 1024),
      ],
      { encoding: "utf8" },
    ),
  );
  assert.equal(evidence.admission.result, "ADMITTED");
  const source = connect(5442);
  try {
    evidence.before = await snapshot(source);
  } finally {
    await source.end();
  }
  docker("stop", "-t", "30", "triplex-xtdb-local");
  stopped = true;
  await cp(path.join(root, ".xtdb/data"), backup, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
  await cp(backup, restore, { recursive: true, errorOnExist: true, force: false });
  evidence.backup = backup;
  evidence.restore = restore;
  docker(
    "run",
    "--detach",
    "--name",
    container,
    "--label",
    "com.triplex.owner=triplex-db",
    "--cpus",
    "4",
    "--memory",
    "8g",
    "--memory-swap",
    "8g",
    "--env",
    "JDK_JAVA_OPTIONS=-Xmx3g -XX:MaxDirectMemorySize=2g",
    "--publish",
    "127.0.0.1:5444:5432",
    "--mount",
    `type=bind,source=${path.join(root, "xtdb-config.yaml")},target=/etc/xtdb/config.yaml,readonly`,
    "--mount",
    `type=bind,source=${restore},target=/var/lib/xtdb`,
    "ghcr.io/xtdb/xtdb:2.2.0@sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77",
    "-f",
    "/etc/xtdb/config.yaml",
  );
  restoreStarted = true;
  for (let attempt = 0; ; attempt++) {
    const restored = connect(5444);
    try {
      evidence.after = await snapshot(restored);
      break;
    } catch (error) {
      if (attempt >= 30) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      await restored.end({ timeout: 1 });
    }
  }
  assert.deepEqual(evidence.after, evidence.before);
  evidence.status = "PASS_NATIVE_LOGICAL_RESTORE";
} catch (error) {
  evidence.status = "FAIL";
  evidence.error = { message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  if (restoreStarted) {
    try {
      docker("stop", "-t", "30", container);
    } catch (error) {
      evidence.restoreStopError = error.message;
    }
  }
  if (stopped) {
    try {
      docker("start", "triplex-xtdb-local");
    } catch (error) {
      evidence.sourceRestartError = error.message;
      process.exitCode = 1;
    }
  }
  await mkdir(path.join(root, "qualification/evidence"), { recursive: true });
  const output = path.join(root, "qualification/evidence", `recovery-${runId}.json`);
  await writeFile(output, JSON.stringify(evidence, null, 2) + "\n", { flag: "wx" });
  console.log(output, evidence.status);
}
