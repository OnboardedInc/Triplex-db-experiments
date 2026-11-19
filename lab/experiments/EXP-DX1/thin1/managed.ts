import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [action, supplied, mode, rung, out, guestNode] = process.argv.slice(2);
const integrated = ["int1-thin", "int1-deep", "int1-proof", "int1-idle", "int1-pooled", "int1-isolated"].includes(mode ?? "");
const repo = fileURLToPath(new URL("../../../../", import.meta.url)),
  dir = path.resolve(supplied ?? ".");
assert(dir.startsWith(path.resolve(repo, "runs") + "/"));
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const main = path.dirname(
  execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd: repo,
    encoding: "utf8",
  }).trim(),
);
const file = path.join(dir, "lab/config/slots.json"),
  cred = path.join(dir, "attempt.json"),
  manifest = path.join(dir, "stack.json");
const write = (file: string, data: unknown) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
const imageFolder = path.join(dir, "lab/config/datomic");
const manager = (args: string[]) =>
  execFileSync(
    process.execPath,
    ["lab/bin/engine.mjs", ...args, "--lane", "datomic", "--holder", "DX-THIN1"],
    {
      cwd: repo,
      encoding: "utf8",
      maxBuffer: 32 << 20,
      env: {
        ...process.env,
        TX2_CONFIG_DIR: dir,
        TX2_SLOTS_FILE: file,
        TX2_LOCKS_DIR: path.join(main, "lab/locks"),
        TX2_ENGINE_DIR: path.join(main, "runs/engines"),
        TX2_DOCKER_HOST: read(path.join(main, "lab/config/slots.json")).dockerHost,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
const ownerFile = (s: string) => path.join(main, "lab/locks/datomic-" + s + "/owner.json");
const run = fileURLToPath(import.meta.url);
function prepare() {
  fs.mkdirSync(dir);
  fs.mkdirSync(path.dirname(imageFolder), { recursive: true });
  fs.cpSync(path.join(repo, "lab/config/datomic"), imageFolder, { recursive: true });
  fs.mkdirSync(path.join(dir, "packages/datomic/src"), { recursive: true });
  fs.cpSync(
    path.join(repo, "packages/datomic/gateway"),
    path.join(dir, "packages/datomic/gateway"),
    { recursive: true },
  );
  fs.copyFileSync(
    path.join(repo, "packages/datomic/src/codec-spec.json"),
    path.join(dir, "packages/datomic/src/codec-spec.json"),
  );
  fs.copyFileSync(
    fileURLToPath(new URL("./slot.ts", import.meta.url)),
    path.join(imageFolder, "slot.ts"),
  );
  const recipe = path.join(imageFolder, "Dockerfile");
  const original = fs.readFileSync(recipe, "utf8");
  fs.writeFileSync(
    recipe,
    "FROM postgres:17-alpine AS thinpg\nFROM node:22.23.2-bookworm-slim AS thinnode\n" +
      original +
      "\nCOPY --from=thinpg / /opt/thin-pg/\nCOPY --from=thinnode /usr/local/bin/node /usr/local/bin/node\n" +
      "RUN ln -s /opt/thin-pg/lib/ld-musl-aarch64.so.1 /lib/ld-musl-aarch64.so.1 && printf '%s\\n' '/opt/thin-pg/lib:/opt/thin-pg/usr/lib:/opt/thin-pg/usr/local/lib' > /etc/ld-musl-aarch64.path && cp -a /opt/thin-pg/usr/share/icu/. /usr/share/icu/ && /opt/thin-pg/usr/local/bin/postgres --version && node --version\n",
  );
  fs.writeFileSync(
    path.join(imageFolder, "entrypoint.sh"),
    "#!/bin/sh\nexec /usr/local/bin/node --no-warnings --experimental-transform-types /config/slot.ts\n",
  );
  // [DX-THIN1] Why: keep the pool, exclusive slot names, ports and ownership checks common to every worktree.
  // Rejected: substituting a private pool ledger or changing the tag of a resident image.
  fs.copyFileSync(
    fileURLToPath(new URL("./cache-charge.ts", import.meta.url)),
    path.join(imageFolder, "cache-charge.ts"),
  );
  const diagnosticJdk = process.env.DX_THIN_DIAGNOSTIC_JDK;
  if (diagnosticJdk) {
    const expected = "e3522e707fc7dbe2a72c30746b1e7068301a0213ecd213d4491f35a14eb55578";
    assert.equal(
      createHash("sha256").update(fs.readFileSync(diagnosticJdk)).digest("hex"),
      expected,
      "Unexpected Temurin 21 diagnostic JDK",
    );
    fs.copyFileSync(diagnosticJdk, path.join(imageFolder, "diagnostic-jdk.tar.gz"));
    fs.appendFileSync(
      recipe,
      "RUN mkdir -p /opt/thin-jdk && tar --strip-components=1 -xzf /config/diagnostic-jdk.tar.gz -C /opt/thin-jdk && /opt/thin-jdk/bin/jcmd -h >/dev/null\n",
    );
  }
  const cfg = read(path.join(main, "lab/config/slots.json"));
  cfg.lanes.datomic.image =
    "tx2-dxthin-managed:" +
    createHash("sha256")
      .update(fs.readFileSync(recipe))
      .update(fs.readFileSync(path.join(imageFolder, "slot.ts")))
      .update(fs.readFileSync(path.join(imageFolder, "cache-charge.ts")))
      .digest("hex")
      .slice(0, 16);
  write(file, cfg);
  fs.writeFileSync(path.join(dir, "build.log"), manager(["build"]));
}
function setup() {
  const cfg = read(file),
    nonce = randomBytes(10).toString("hex"),
    secret = randomBytes(20).toString("hex");
  // [DX-INT1] Why: every exclusive slot has the same published maximum. Let the manager adjudicate two free slots without tying up a busy builder's preferred slot.
  // Rejected: borrowing a resident or changing the global reservation pool.
  const slots = integrated ? ["s2", "s1", "s3"].filter(s=>!fs.existsSync(ownerFile(s))).slice(0,2) : ["s2","s1"];
  assert.equal(slots.length,2,"Two exclusive slots are required");
  const original=read(path.join(main,"lab/config/slots.json")).slots.datomic;
  for (const [slot, role] of [[slots[0]!, "write"], [slots[1]!, "read"]]) {
    assert(!fs.existsSync(ownerFile(slot)), "Exclusive slot is in use");
    const settings = cfg.slots.datomic[slot] = { ...original[slot] };
    settings.gatewayOpts =
      "-Xms160m -Xmx896m -Ddatomic.objectCacheMax=192m -XX:+ExitOnOutOfMemoryError -Ddxthin.run=" +
      nonce +
      " -Ddxthin.secret=" +
      secret +
      " -Ddxthin.role=" +
      role;
    settings.transactorOpts = "-Xms256m -Xmx1170m -XX:+ExitOnOutOfMemoryError";
    if (role === "read") settings.memBytes = Math.min(settings.memBytes, 1536 * 1024 ** 2);
  }
  write(file, cfg);
  write(cred, { nonce, secret, slots });
  return slots;
}
function witness(slot: string) {
  const owner = read(ownerFile(slot)),
    cfg = read(file),
    attempt = read(cred);
  assert(
    owner.holder === "DX-THIN1" &&
      owner.mode === "exclusive" &&
      fs.realpathSync(owner.worktree) === fs.realpathSync(repo),
  );
  const line = manager(["logs", "--slot", slot, "--tail", "2000"])
    .split("\n")
    .filter((l) => l.startsWith("DXTHIN-SLOT "))
    .at(-1);
  assert(line, "Missing live slot identity");
  const event = JSON.parse(line.slice(12));
  assert(event.nonce === attempt.nonce && event.role === (slot === (attempt.slots?.[0] ?? "s2") ? "write" : "read"));
  return {
    role: event.role,
    owner: ownerFile(slot),
    name: owner.container,
    createdAt: owner.createdAt,
    endpoint: owner.endpoint,
    address: event.address,
    metrics: "http://" + event.address + ":8989/metrics",
    id: event.containerId,
    source: event.source,
    imageId: cfg.lanes.datomic.imageId,
  };
}
function bind() {
  const peers = ((read(cred).slots ?? ["s2","s1"]) as string[]).map(witness),
    cfg = read(file),
    attempt = read(cred);
  assert(peers[0]!.source === peers[1]!.source);
  write(manifest, {
    prefix: "tx2-dxthin-" + attempt.nonce,
    writeUrl: peers[0]!.endpoint,
    readUrl: peers[1]!.endpoint,
    gatewaySourceSha256: peers[0]!.source,
    buildInputsSha256: cfg.lanes.datomic.buildInputsSha256,
    managed: {
      nonce: attempt.nonce,
      peers,
      cacheDiagnostic: fs.existsSync(path.join(imageFolder, "diagnostic-jdk.tar.gz")),
    },
    containers: peers.map((p) => ({ name: p.name, id: p.id, imageId: p.imageId })),
  });
}
if (action === "--guest") {
  assert(process.platform === "linux" && (mode === "all" || mode === "touched" || integrated) && rung && out);
  const stack = read(manifest);
  Object.assign(process.env, {
    DATOMIC_URL: stack.writeUrl,
    DATOMIC_READ_URLS: stack.readUrl,
    DX_THIN_STACK: manifest,
    DX_THIN_CREDENTIAL: cred,
    TRIPLEX_DATOMIC_LAYOUT: "lean",
  });
  if (process.argv[7]) {
    const armRoot = integrated ? path.dirname(out) : out;
    if (integrated) assert.equal(path.basename(armRoot), "int1");
    assert(
      path.basename(path.dirname(armRoot)) === "DX-THIN1" &&
        path.basename(path.dirname(path.dirname(armRoot))) === "evidence",
    );
    process.env.DX_THIN_HOST_PID = process.argv[7];
    process.env.DX_THIN_MEASURE = path.resolve(armRoot, "../../..", "locks", "measure");
  }
  process.argv = [process.execPath, run, "live", mode, rung, out];
  if (integrated) { process.chdir(repo); await import("../int1/trial.ts"); }
  else await import("./trial.ts");
} else {
  assert.equal(process.platform, "darwin");
  if (action === "--build") prepare();
  else if (action === "--bind") bind();
  else if (action === "--arm") {
    assert(
      (mode === "all" || mode === "touched" || integrated) &&
        rung &&
        Number.isSafeInteger(Number(rung)) &&
        out &&
        path.isAbsolute(out) &&
        !fs.existsSync(out) &&
        guestNode &&
        path.isAbsolute(guestNode),
    );
    const disk = fs.statfsSync(repo, { bigint: true });
    assert(disk.bavail * disk.bsize > 5n * 1024n ** 3n);
    const [writerSlot, readerSlot] = setup() as [string,string];
    const exp = "DX-THIN1-" + read(cred).nonce;
    try {
      manager(["up", "--slot", writerSlot, "--exp", exp]);
      const primary = witness(writerSlot);
      const cfg = read(file);
      cfg.slots.datomic[readerSlot].gatewayOpts += " -Ddxthin.primary=" + primary.address;
      write(file, cfg);
      manager(["up", "--slot", readerSlot, "--exp", exp]);
      bind();
      execFileSync(
        "colima",
        [
          "ssh",
          "--profile",
          "triplex2",
          "--",
          guestNode,
          "--no-warnings",
          "--experimental-transform-types",
          "--expose-gc",
          "--max-old-space-size=1900",
          run,
          "--guest",
          dir,
          mode,
          rung,
          out,
          String(process.pid),
        ],
        { cwd: repo, stdio: "inherit" },
      );
    } finally {
      for (const slot of [readerSlot, writerSlot])
        if (fs.existsSync(ownerFile(slot))) {
          const o = read(ownerFile(slot));
          if (
            o.holder === "DX-THIN1" &&
            o.experiment === exp &&
            fs.realpathSync(o.worktree) === fs.realpathSync(repo)
          )
            manager([
              "down",
              "--slot",
              slot,
              "--note",
              "Retain the owned SQL attempt for measurement review",
            ]);
        }
    }
  } else
    throw Error(
      "Use --build DIR, --bind DIR or --arm DIR MODE SIZE NEW_EVIDENCE_DIR GUEST_NODE via the heavy runner",
    );
}
