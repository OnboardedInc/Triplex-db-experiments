import assert from "node:assert/strict";
import { execFileSync, fork } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isIPv4 } from "node:net";
import { verifiedTree } from "../../../bin/datomic-context.mjs";

const [command, location, staged, control, ...extra] = process.argv.slice(2);
const guardComparison = command === "check-guarded";
const cleanupStudy =
  command === "check-cleanup-separate"
    ? "separate"
    : command === "check-cleanup-folded"
      ? "folded"
      : undefined;
const neighbourCheck = command === "check-neighbours" || !!cleanupStudy;
const authorityCost = command === "check-authority-cost";
const seedRole = command === "stage-control" ? "control" : undefined;
assert(
  process.platform === "linux" &&
    [
      "stage",
      "check",
      "stage-fast",
      "check-fast",
      "stage-control",
      "check-guarded",
      "check-neighbours",
      "check-cleanup-separate",
      "check-cleanup-folded",
      "check-authority-cost",
    ].includes(command),
);
const action = command.startsWith("stage") ? "stage" : "check";
const mode =
  command.endsWith("-fast") || guardComparison || neighbourCheck || authorityCost || seedRole
    ? "fast"
    : "scale";
assert(location && !extra.length && (action === "check" ? staged : staged === undefined));
assert(guardComparison === Boolean(control));
const dir = path.resolve(location);
/** @param {string} name */
function env(name) {
  const value = process.env[name];
  assert(value, `Missing ${name}`);
  return value;
}

const endpoint = new URL(env("DATOMIC_URL"));
/** @param {string} h */
const loopback = (h) => isIPv4(h) && h.split(".")[0] === "127";
assert(endpoint.protocol === "http:" && loopback(endpoint.hostname) && endpoint.pathname === "/");
const nonce = env("DX_ERASE_NONCE");
assert.match(nonce, /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
assert.match(process.env.DX_ERASE_TOKEN ?? "", /^[a-f0-9]{48}$/);
const prefix = "datomic:sql://{db}?jdbc:";
const template = env("DATOMIC_URI_TEMPLATE");
assert(template.startsWith(prefix));
const database = "erase1_" + nonce.replaceAll("-", "");
const jdbc = new URL(template.slice(prefix.length));
assert(
  jdbc.protocol === "postgresql:" && loopback(jdbc.hostname) && jdbc.pathname === "/" + database,
);
const datomicHome = env("DX_ERASE_DATOMIC_HOME");
const sqlData = env("DX_ERASE_SQL_DATA");
assert(path.isAbsolute(datomicHome) && path.isAbsolute(sqlData));
const pgHost = process.env.PGHOST ?? jdbc.hostname;
const pgPort = jdbc.port || "5432";
assert(pgHost === jdbc.hostname || pgHost.startsWith("/"));
assert(!process.env.PGHOSTADDR && !process.env.PGSERVICE);
assert.equal(process.env.PGPORT ?? pgPort, pgPort);
assert.equal(process.env.PGDATABASE, database);
const root = fileURLToPath(new URL("../../../..", import.meta.url));
/** @param {string | Buffer} s */
const sums = (s) => createHash("sha256").update(s).digest("hex");
/** @param {...string} a */
const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8" }).trim();
const source = git("rev-parse", "HEAD");
const gatewayCode = path.join(root, "packages/datomic/gateway/src");
const parts = [gatewayCode, import.meta.dirname];
const codec = path.join(root, "packages/datomic/src/codec-spec.json");
const buildSums = () =>
  Object.fromEntries(
    ["core", "datomic", "qualification", "w0"].map((name) => [
      name,
      sums(
        JSON.stringify(
          verifiedTree(path.join(root, "packages", name, "dist")).filter((f) =>
            f.path.endsWith(".js"),
          ),
        ),
      ),
    ]),
  );
/** @param {string} sql */
const psql = (sql) =>
  execFileSync(
    "psql",
    ["-XAtq", "-h", pgHost, "-p", pgPort, "-d", database, "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8", timeout: 600000 },
  ).trim();
const builds = buildSums();
const attempt = {
  nonce,
  people: 100000,
  mode,
  slot: "prepared",
  attempt: randomUUID(),
  source,
  builds,
  seedRole,
  guardComparison,
  neighbourCheck,
  cleanupStudy,
  authorityCost,
};
const health = await fetch(new URL("/health", endpoint));
assert(health.ok);
const identity = await health.json();
assert(
  identity &&
    typeof identity === "object" &&
    "datomicVersion" in identity &&
    "gatewaySourceHash" in identity &&
    typeof identity.gatewaySourceHash === "string",
  "Unexpected prepared gateway identity",
);
const { datomicVersion, gatewaySourceHash } = identity;
assert.equal(datomicVersion, "1.0.7745");
assert.equal(gatewaySourceHash, sums(JSON.stringify(verifiedTree(path.dirname(gatewayCode)))));
assert.equal(git("status", "--porcelain", "--untracked-files=no"), "");
const txLog = env("DX_ERASE_TX_LOG");
assert(path.isAbsolute(txLog));
const logStart = fs.statSync(txLog);
fs.mkdirSync(dir);
assert.equal(
  psql(
    "SELECT current_database(), current_setting('fsync'), current_setting('synchronous_commit'), current_setting('server_version_num')::int / 10000",
  ),
  database + "|on|on|17",
);
assert.equal(fs.realpathSync(psql("SHOW data_directory")), fs.realpathSync(sqlData));
// [DX-ERASE1] Why: staging and maintenance require the same disposable SQL store.
// Rejected: inferring scratch-store ownership from an endpoint or database name alone.
let stageSha256, stagedSource, controlSha256;
if (action === "stage") {
  if (!seedRole)
    psql(
      `CREATE TABLE dx_erase1_scratch(nonce text PRIMARY KEY); INSERT INTO dx_erase1_scratch VALUES ('${nonce}');`,
    );
  assert.equal(psql("SELECT nonce FROM dx_erase1_scratch"), nonce);
} else {
  assert(staged);
  assert.equal(psql("SELECT nonce FROM dx_erase1_scratch"), nonce);
  const raw = fs.readFileSync(staged);
  const plan = JSON.parse(raw.toString());
  assert.equal(plan.nonce, nonce);
  assert.equal(plan.people, attempt.people);
  stagedSource = plan.source;
  // [DX-ERASE1] Why: a sealed check requires the authority enrolled before the original seed.
  // Rejected: reusing a staged native-excision seed (its rows were created without that authority).
  assert.equal(plan.mode, mode);
  stageSha256 = sums(raw);
  if (guardComparison || neighbourCheck || authorityCost) {
    // [DX-ERASE1] Why: the held sealed copy may have been built at an earlier reviewed source.
    // Rejected: accepting a staged manifest by name or restaging the full sealed fixture inside the timed check.
    const sealedSha = env("DX_ERASE_SEALED_SHA256");
    assert.match(sealedSha, /^[a-f0-9]{64}$/);
    assert.equal(stageSha256, sealedSha);
    assert.equal(plan.seedRole, undefined);
    assert.match(stagedSource, /^[a-f0-9]{40}$/);
    git("merge-base", "--is-ancestor", stagedSource, source);
    if (guardComparison) {
      const controlBytes = fs.readFileSync(control);
      const plain = JSON.parse(controlBytes.toString());
      assert.equal(plain.seedRole, "control");
      assert.equal(plain.source, source);
      assert.equal(plain.nonce, nonce);
      assert.equal(plain.mode, mode);
      assert.equal(plain.people, attempt.people);
      assert.deepEqual(plain.builds, builds);
      assert.equal(plain.data.facts, plan.data.facts);
      controlSha256 = sums(controlBytes);
    }
  } else {
    assert.equal(plan.source, source);
    assert.deepEqual(plan.builds, builds);
  }
}
const binding = {
  ...attempt,
  gateway: gatewaySourceHash,
  stageSha256,
  stagedSource,
  controlSha256,
};
const run = { ...binding, binding: sums(JSON.stringify(binding)) };
fs.writeFileSync(path.join(dir, "native.json"), JSON.stringify(run) + "\n", { flag: "wx" });
const child = fork(
  path.join(import.meta.dirname, "run.ts"),
  [dir, action, ...(staged ? [staged] : []), ...(control ? [control] : [])],
  {
    execArgv: ["--experimental-transform-types", "--max-old-space-size=2048"],
    env: {
      ...process.env,
      DATOMIC_URL: endpoint.origin,
      TX2_W0_POINT_JOURNAL: "1",
      TRIPLEX_DATOMIC_LAYOUT: "lean",
      DX_ERASE_MEASURE: "",
    },
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  },
);
const term = () => child.kill("SIGTERM");
const intr = () => child.kill("SIGINT");
process.on("SIGTERM", term);
process.on("SIGINT", intr);
child.on(
  "message",
  (/** @type {{ binding: string, op: string, id: number, sql: string, plan: object }} */ msg) => {
    try {
      assert.equal(msg.binding, run.binding);
      let result;
      switch (msg.op) {
        case "sql":
          assert.equal(psql("SELECT nonce FROM dx_erase1_scratch"), nonce);
          result = psql(msg.sql);
          break;
        case "fresh":
          result = execFileSync(path.join(datomicHome, "bin/run"), ["-m", "erase1", "fresh"], {
            cwd: datomicHome,
            input: JSON.stringify(msg.plan),
            encoding: "utf8",
            timeout: 490000,
            env: {
              ...process.env,
              DATOMIC_EXT_CLASSPATH: parts.join(path.delimiter),
              DATOMIC_JAVA_OPTS: "-Xms64m -Xmx1g -Dtriplex.codec.spec=" + codec,
            },
          });
          break;
        case "guard": {
          const f = fs.statfsSync(sqlData);
          result = { free: f.bavail * f.bsize };
          assert(result.free >= 24 * 2 ** 30, "Prepared probe needs room for one rewrite and WAL");
          break;
        }
        default:
          throw Error("Invalid prepared-stack operation");
      }
      child.send({ id: msg.id, result });
    } catch (e) {
      child.send({ id: msg.id, error: String(e) });
    }
  },
);
try {
  const outcome = await new Promise((ok, fail) => {
    child.once("exit", (code, signal) => ok({ code, signal }));
    child.once("error", fail);
  });
  fs.writeFileSync(path.join(dir, "driver-exit.json"), JSON.stringify(outcome) + "\n", {
    flag: "wx",
  });
  const end = fs.statSync(txLog);
  assert(
    end.ino === logStart.ino &&
      end.size >= logStart.size &&
      end.size - logStart.size < 128 * 2 ** 20,
  );
  const fd = fs.openSync(txLog, "r");
  try {
    const raw = Buffer.alloc(end.size - logStart.size);
    assert.equal(fs.readSync(fd, raw, 0, raw.length, logStart.size), raw.length);
    fs.writeFileSync(path.join(dir, "tx.log"), raw, { flag: "wx" });
  } finally {
    fs.closeSync(fd);
  }
  assert.deepEqual(outcome, { code: 0, signal: null });
  assert.equal(git("rev-parse", "HEAD"), source);
  assert.equal(git("status", "--porcelain", "--untracked-files=no"), "");
  assert.deepEqual(buildSums(), builds);
  if (action === "check" && mode === "fast") {
    const observed = JSON.parse(
      fs.readFileSync(
        path.join(
          dir,
          guardComparison
            ? "guarded-comparison.json"
            : neighbourCheck
              ? "quiet-comparison.json"
              : authorityCost
                ? "authority-saves.json"
                : "fast-result.json",
        ),
        "utf8",
      ),
    );
    assert.equal(observed.binding, run.binding);
    assert.equal(observed.nonce, nonce);
    assert.equal(observed.mode, mode);
    assert.equal(observed.people, attempt.people);
    if (guardComparison || neighbourCheck || authorityCost) {
      if (guardComparison) assert.equal(observed.controlSha256, controlSha256);
      assert.equal(observed.stageSha256, stageSha256);
      assert.equal(observed.attempt, attempt.attempt);
    }
    console.log(JSON.stringify(observed.data, null, 2));
  }
  if (action === "check" && mode === "scale") {
    execFileSync("python3", [path.join(import.meta.dirname, "summarize.py"), dir], {
      stdio: "inherit",
    });
  }
} finally {
  process.off("SIGTERM", term);
  process.off("SIGINT", intr);
}
