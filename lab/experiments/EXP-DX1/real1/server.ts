import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { networkInterfaces } from "node:os";
import { parseArgs } from "node:util";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { checkAdoptedPeer, hex, readScaleSeal } from "../v01/adopt.ts";
import { cleanSource, verifyBuild } from "../v01/source.ts";
import { checkRealisticPeer, load } from "./load.ts";
import { roster, type Profile } from "./population.ts";
import {
  fileHash,
  openRealisticSeal,
  stoppedInventory,
  validateImage,
  verifyPgdata,
  write,
  type Census,
  type Image,
  type Parent,
} from "./seal.ts";

const repository = path.resolve(import.meta.dirname, "../../../..");
const stack = path.resolve(import.meta.dirname, "../stack");
const run = (bin: string, args: string[], input?: string) =>
  execFileSync(bin, args, {
    input,
    cwd: repository,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  }).trim();
const git = (...args: string[]) => run("git", args);
const docker = (...args: string[]) => run("docker", args);
const absolute = (value: string) => {
  assert(path.isAbsolute(value) && !/[,\r\n"]/.test(value));
  return path.normalize(value);
};
const GiB = 1024 ** 3;
const free = (dir: string) => {
  const s = fs.statfsSync(dir);
  return s.bavail * s.bsize;
};
const disjoint = (a: string, b: string) =>
  a !== b && !a.startsWith(b + "/") && !b.startsWith(a + "/");
const shaPattern = /^[a-f0-9]{64}$/;

const {
  values: args,
  positionals: [mode],
} = parseArgs({
  allowPositionals: true,
  options: {
    commit: { type: "string" },
    seed: { type: "string" },
    "image-sha256": { type: "string" },
    "transfer-sha256": { type: "string" },
    "pgdata-source": { type: "string" },
    "pgdata-sha256": { type: "string" },
    pgdata: { type: "string" },
    out: { type: "string" },
    profile: { type: "string" },
    "port-write": { type: "string", default: "8491" },
    "port-read": { type: "string", default: "8492" },
    seconds: { type: "string", default: "300" },
    sweep: { type: "string", default: "10000" },
    "quiet-only": { type: "boolean" },
    "realistic-mix": { type: "boolean" },
  },
});
const requireArg = (value: string | undefined) => {
  assert(value);
  return value;
};

function dialect(endpoint: string) {
  process.env.DATOMIC_URL = endpoint;
  process.env.TRIPLEX_DATOMIC_LAYOUT = "lean";
  process.env.DX_STRICT_RECORD_CLOCKS = "1";
  process.env.DX_SERVER_RECORD_TIME = "1";
  process.env.TX2_W0_POINT_JOURNAL = "1";
}
function pgState(dir: string, slot: string) {
  const result = docker(
    "run",
    "--rm",
    "--pull",
    "never",
    "--name",
    slot + "-control",
    "--network",
    "none",
    "--mount",
    "type=bind,source=" + dir + ",target=/check,readonly",
    "--entrypoint",
    "pg_controldata",
    "postgres:17-alpine",
    "/check",
  );
  assert.match(result, /^Database cluster state:\s+shut down\s*$/m);
  assert.match(result, /^Database system identifier:\s+\d+\s*$/m);
}
function inventory(slot: string) {
  return [
    docker("ps", "-aq", "--filter", "name=^/" + slot + "-"),
    docker("network", "ls", "-q", "--filter", "name=^" + slot + "-"),
  ].filter(Boolean);
}
function pg(slot: string, sql: string, role = "postgres") {
  return docker(
    "exec",
    slot + "-pg",
    "psql",
    "-XAtq",
    "-v",
    "ON_ERROR_STOP=1",
    "-U",
    role,
    "-d",
    "datomic",
    "-c",
    sql,
  );
}
function durability(slot: string) {
  assert.equal(
    pg(slot, "show fsync; show synchronous_commit; show full_page_writes", "datomic"),
    "on\non\non",
  );
}
function census(slot: string, db: string, index = false): Census {
  assert.match(db, /^s2-[a-zA-Z0-9_-]+$/);
  const program = `(require '[datomic.api :as d] '[triplex.gateway.main :as g] '[triplex.gateway.storage :as s])
(let [conn (d/connect (g/db-uri "${db}"))
      t (d/basis-t (d/db conn))]
  ${index ? "(d/request-index conn) (assert (deref (d/sync-index conn t) 900000 nil))" : ""}
  (let [view (d/db conn)]
    (println "DX_REAL1_CENSUS" (s/head-position view) (d/basis-t view) (:datoms (d/db-stats view)))))
(shutdown-agents)
(System/exit 0)`;
  const raw = run(
    "docker",
    [
      "exec",
      "-i",
      "-e",
      "DATOMIC_JAVA_OPTS=-Xms128m -Xmx512m -XX:+UseSerialGC",
      slot + "-gw-w",
      "/opt/datomic/bin/run",
      "/dev/stdin",
    ],
    program,
  );
  const m = /^DX_REAL1_CENSUS (\d+) (\d+) (\d+)$/m.exec(raw);
  assert(m, "Missing native Datomic census");
  return {
    head: Number(m[1]),
    nativeT: Number(m[2]),
    nativeRecords: Number(m[3]),
    sqlBytes: Number(pg(slot, "select pg_database_size(current_database())")),
  };
}
function publish(dir: string, image: Image) {
  // [DX-REAL1] Why: validate the exact candidate before publishing any success transfer.
  // Rejected: leaving a terminal success marker behind after a shape or parent-pin failure.
  validateImage(dir, image, image.profile === "toy");
  const file = path.join(dir, "image.json");
  write(file, image);
  const imagePin = hex(fs.readFileSync(file));
  const transfer = path.join(dir, "transfer.json");
  write(transfer, {
    source: image.source,
    nonce: image.nonce,
    slot: image.slot,
    tag: path.basename(dir),
    result: "success",
    summaryFiles: { "image.json": imagePin },
  });
  return { imagePin, transferPin: hex(fs.readFileSync(transfer)) };
}

async function main() {
  assert(["extend", "measure", "verify", "toy"].includes(mode ?? ""));
  const revision = git("rev-parse", "HEAD");
  if (mode !== "toy") {
    assert.equal(process.platform, "linux");
    assert.equal(args.commit, revision, "Use the instructed source commit");
    process.chdir(repository);
    cleanSource(revision);
  }
  if (mode === "verify") {
    const dir = fs.realpathSync(requireArg(args.seed));
    const image = openRealisticSeal(
      dir,
      requireArg(args["image-sha256"]),
      requireArg(args["transfer-sha256"]),
    );
    assert.equal(await fileHash(path.join(dir, "extension-ledger.sqlite")), image.proof.ledgerSha);
    await verifyPgdata(fs.realpathSync(requireArg(args["pgdata-source"])), image);
    console.log(
      JSON.stringify({ image: image.format, cut: image.proof.cut, tree: image.pgdata?.treeSha }),
    );
    return;
  }

  const out = absolute(requireArg(args.out));
  const nonce = randomUUID();
  const slot = mode === "toy" ? requireArg(process.env.DX_REAL1_TOY_SLOT) : "tx2-dxreal1-" + nonce;
  const profile = (mode === "toy" ? "toy" : args.profile) as Profile;
  const loopback = Object.values(networkInterfaces())
    .flat()
    .find((n) => n?.internal && n.family === "IPv4");
  assert(loopback, "The local gateway needs an IPv4 loopback interface");
  const writeUrl = "http://" + loopback.address + ":" + args["port-write"];
  const readUrl = "http://" + loopback.address + ":" + args["port-read"];
  dialect(writeUrl);
  const measure = async (
    image: Image,
    readerURL: string,
    diagnostic: boolean,
    residency?: () => unknown,
  ) => {
    const { workload } = await import("./workload.ts");
    await workload(image, writeUrl, readerURL, out, {
      seconds: Number(args.seconds),
      sweep: Number(args.sweep),
      quietOnly: args["quiet-only"] ?? false,
      diagnostic,
      binding: { source: revision, slot, nonce },
      residency,
    });
  };
  if (mode === "toy") {
    assert.equal(process.platform, "darwin");
    assert(args["realistic-mix"]);
    assert.match(requireArg(process.env.DX_REAL1_TOY_ADMISSION), /^dx-real1-[a-f0-9]{20}$/);
    fs.mkdirSync(out, { mode: 0o700 });
    const scope = "dx-real1-toy-" + nonce;
    const key = JSON.stringify(["triplex-scope-v1", "test", "test", scope, 0]);
    const parent: Parent = {
      tag: "toy-parent",
      imageSha: hex(key),
      transferSha: hex(nonce),
      pgdataSha: hex("toy"),
      scope,
      db: "s2-" + Buffer.from(key).toString("base64url"),
      cut: 0,
      facts: 0,
      people: 500,
    };
    const proof = await load(parent, "toy", revision, writeUrl, out, () =>
      assert(free(out) >= 5 * GiB),
    );
    const image = describe(
      parent,
      proof,
      { head: proof.cut, nativeT: 0, nativeRecords: 0, sqlBytes: 0 },
      null,
      profile,
    );
    const pins = publish(out, image);
    const reader = new DatomicClient(writeUrl, 35_000);
    try {
      await checkRealisticPeer(
        reader,
        openRealisticSeal(out, pins.imagePin, pins.transferPin, true),
      );
    } finally {
      reader.close();
    }
    await measure(image, writeUrl, true);
    return;
  }

  assert(
    process.getuid?.() === 0,
    "Run the bare-metal controller as the PostgreSQL copy owner (root)",
  );
  const build = requireArg(process.env.DX_V01_BUILD_RECEIPT);
  verifyBuild(revision, build);
  const buildSha = await fileHash(build);
  process.env.DOCKER_HOST = "unix:///var/run/docker.sock";
  process.env.DX_JAVA = "21";
  process.env.DX_BARE_METAL = "1";
  process.env.DX_INT1_GATEWAYS = "demand";
  process.env.DX_GROUP_COMMIT = "1";
  process.env.DX_QUIET_LOGS = "1";
  process.env.DX_BARE_METAL_ROOT = path.dirname(out);
  process.env.DX_STACK_EVIDENCE = path.join(out, "stack");

  const seed = fs.realpathSync(requireArg(args.seed));
  const parentDir = fs.realpathSync(requireArg(args["pgdata-source"]));
  const data = absolute(requireArg(args.pgdata));
  const imagePin = requireArg(args["image-sha256"]),
    transferPin = requireArg(args["transfer-sha256"]);
  const extending = mode === "extend";
  const original = extending
    ? readScaleSeal(path.join(seed, "image.json"), imagePin, false, transferPin)
    : undefined;
  const sealed = extending ? undefined : openRealisticSeal(seed, imagePin, transferPin);
  if (sealed) {
    assert(args["realistic-mix"], "Select --realistic-mix explicitly");
    assert.equal(
      await fileHash(path.join(seed, "extension-ledger.sqlite")),
      sealed.proof.ledgerSha,
    );
  } else assert(profile === "first" || profile === "full");
  const pgPin = extending ? requireArg(args["pgdata-sha256"]) : sealed!.pgdata!.treeSha;
  assert.match(pgPin, shaPattern);
  const copyParent = path.dirname(data);
  assert.equal(fs.realpathSync(path.dirname(copyParent)), path.dirname(copyParent));
  assert.equal(fs.realpathSync(path.dirname(out)), path.dirname(out));
  assert.equal(path.basename(data), "pgdata");
  assert(!fs.existsSync(copyParent) && !fs.existsSync(out));
  for (const target of [out, copyParent])
    for (const held of [parentDir, seed]) assert(disjoint(held, target));
  assert(disjoint(copyParent, out));
  assert.deepEqual(inventory(slot), []);
  const held = await stoppedInventory(parentDir);
  assert.equal(held.treeSha, pgPin);
  if (sealed) assert.deepEqual(held, sealed.pgdata);
  const growth = extending && profile === "full" ? 100 : 40;
  assert(free(path.dirname(copyParent)) > held.bytes + growth * GiB);
  assert(free(path.dirname(out)) >= 5 * GiB);
  fs.mkdirSync(out, { mode: 0o700 });
  fs.mkdirSync(copyParent, { mode: 0o700 });
  pgState(parentDir, slot);
  run("cp", ["-a", "--reflink=never", "--", parentDir, data]);
  assert.deepEqual(await stoppedInventory(data), held);
  write(path.join(copyParent, "real1-copy.json"), {
    revision,
    slot,
    nonce,
    inventory: held,
    buildSha,
    imagePin,
    transferPin,
  });
  let outcome:
    | { parent: Parent; proof: Awaited<ReturnType<typeof load>>; census: Census }
    | undefined;
  try {
    execFileSync(
      "bash",
      [
        path.join(stack, "up.sh"),
        slot,
        "--real1-pgdata",
        data,
        "--port-write",
        args["port-write"]!,
        "--port-read",
        args["port-read"]!,
        "--cpus-tx",
        "0,2,3",
        "--cpus-pg",
        "1",
        "--cpus-gw-write",
        "4,5",
        "--cpus-gw-read",
        "6,7",
        "--pg-memory",
        "6g",
        "--tx-memory",
        "12g",
        "--tx-java-opts",
        "-Xms2g -Xmx8g",
        "--object-cache-max",
        "2g",
        "--memory-index-threshold",
        "128m",
        "--memory-index-max",
        "512m",
        "--pg-settings",
        "-c shared_buffers=2GB -c max_wal_size=8GB -c synchronous_commit=on -c fsync=on -c full_page_writes=on",
      ],
      { cwd: repository, stdio: "inherit" },
    );
    const mounted = JSON.parse(docker("inspect", "--format", "{{json .Mounts}}", slot + "-pg")) as {
      Source: string;
      Destination: string;
      RW: boolean;
    }[];
    assert.deepEqual(
      mounted
        .filter((m) => m.Destination === "/var/lib/postgresql/data")
        .map((m) => [m.Source, m.RW]),
      [[data, true]],
    );
    assert(mounted.every((m) => disjoint(m.Source, parentDir)));
    durability(slot);
    write(path.join(out, "run-input.json"), {
      source: revision,
      slot,
      nonce,
      buildSha,
      imagePin,
      transferPin,
      sourceTreeSha: held.treeSha,
      mount: mounted.filter((m) => m.Destination === "/var/lib/postgresql/data"),
    });
    if (original) {
      const reader = new DatomicClient(readUrl, 35_000);
      try {
        await checkAdoptedPeer(reader, original, original.scope.cut);
      } finally {
        reader.close();
      }
      const before = census(slot, original.scope.db);
      assert.equal(before.head, original.scope.cut);
      assert.equal(before.nativeRecords, 429_778_659);
      write(path.join(out, "native-before.json"), before);
      const parent: Parent = {
        tag: path.basename(seed),
        imageSha: imagePin,
        transferSha: transferPin,
        pgdataSha: pgPin,
        scope: original.scope.name,
        db: original.scope.db,
        cut: original.scope.cut,
        facts: original.image.facts,
        people: original.proof.cursor,
      };
      const parentCopy = path.join(out, "parent", parent.tag);
      fs.mkdirSync(parentCopy, { recursive: true, mode: 0o700 });
      for (const [name, pin] of [
        ["image.json", imagePin],
        ["transfer.json", transferPin],
      ]) {
        const bytes = fs.readFileSync(path.join(seed, name));
        assert.equal(hex(bytes), pin);
        fs.writeFileSync(path.join(parentCopy, name), bytes, {
          flag: "wx",
          mode: 0o400,
          flush: true,
        });
      }
      const checkSpace = () => {
        assert(free(data) >= 16 * GiB && free(out) >= 5 * GiB);
      };
      const proof = await load(parent, profile, revision, writeUrl, out, checkSpace);
      checkSpace();
      const indexed = census(slot, parent.db, true);
      assert(indexed.nativeT > before.nativeT && indexed.nativeRecords > before.nativeRecords);
      assert.equal(indexed.head, proof.cut);
      pg(slot, "vacuum (analyze)");
      durability(slot);
      pg(slot, "checkpoint");
      outcome = {
        parent,
        proof,
        census: {
          ...indexed,
          sqlBytes: Number(pg(slot, "select pg_database_size(current_database())")),
        },
      };
    } else {
      const reviewer = new DatomicClient(writeUrl, 35_000);
      try {
        await checkRealisticPeer(reviewer, sealed!, false);
      } finally {
        reviewer.close();
      }
      const opened = census(slot, sealed!.parent.db);
      assert.deepEqual(
        [opened.head, opened.nativeT, opened.nativeRecords],
        [sealed!.census.head, sealed!.census.nativeT, sealed!.census.nativeRecords],
      );
      await measure(sealed!, readUrl, false, () => residency(slot));
    }
  } finally {
    const pgId = docker("ps", "-q", "--filter", "name=^/" + slot + "-pg$");
    try {
      if (pgId) {
        for (const role of ["gw-r", "gw-w", "tx"]) {
          const id = docker("ps", "-q", "--filter", "name=^/" + slot + "-" + role + "$");
          if (id) docker("stop", "-t", "60", id);
        }
        docker("stop", "-t", "120", pgId);
        assert.equal(docker("inspect", "--format", "{{.State.ExitCode}}", pgId), "0");
      }
    } finally {
      run("bash", [path.join(stack, "down.sh"), slot, "--volumes"]);
      assert.deepEqual(inventory(slot), []);
    }
  }
  assert.deepEqual(
    await stoppedInventory(parentDir),
    held,
    "Parent PGDATA changed during this attempt",
  );
  pgState(data, slot);
  if (outcome) {
    const image = describe(
      outcome.parent,
      outcome.proof,
      outcome.census,
      await stoppedInventory(data),
      profile,
    );
    const pins = publish(out, image);
    openRealisticSeal(out, pins.imagePin, pins.transferPin);
    console.log(
      JSON.stringify({ ...pins, pgdata: data, inventory: image.pgdata, census: image.census }),
    );
  } else {
    // [DX-REAL1] Why: a terminal measurement anchor binds the output to this invocation and its clean stop.
    // Rejected: accepting a workload file from an incomplete stack or an earlier copy.
    write(path.join(out, "complete.json"), {
      source: revision,
      slot,
      nonce,
      buildSha,
      imagePin,
      transferPin,
      sourceTree: held.treeSha,
      workloadSha: await fileHash(path.join(out, "workload.json")),
    });
  }

  function describe(
    parent: Parent,
    proof: Image["proof"],
    counters: Census,
    pgdata: Image["pgdata"],
    kind: Profile,
  ): Image {
    const accounts = roster(kind);
    return {
      format: "scale1-realistic-pgdata/1",
      source: revision,
      slot,
      nonce,
      layout: "pooled",
      verification: "extension-commands-feed-and-pinned-members",
      profile: kind,
      parent,
      proof,
      census: counters,
      pgdata,
      accounts,
      people: parent.people + proof.cursor,
      facts: parent.facts + proof.facts,
      scopes: [
        {
          name: parent.scope,
          db: parent.db,
          seedCut: proof.cut,
          cut: proof.cut,
          accounts: accounts.map((a) => a.id),
        },
      ],
    };
  }
}

function residency(slot: string) {
  return Object.fromEntries(
    ["tx", "gw-w", "gw-r"].map((role) => {
      const pid = Number(docker("inspect", "--format", "{{.State.Pid}}", slot + "-" + role));
      assert(Number.isSafeInteger(pid) && pid > 0);
      const info = fs.readFileSync("/proc/" + pid + "/status", "utf8");
      const bytes = Number(/^VmRSS:\s+(\d+)\s+kB$/m.exec(info)?.[1]) * 1024;
      const threads = Number(/^Threads:\s+(\d+)$/m.exec(info)?.[1]);
      assert(bytes > 0 && threads > 0);
      return [role, { pid, rssBytes: bytes, threads }];
    }),
  );
}

await main();
