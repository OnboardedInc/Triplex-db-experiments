// @ts-nocheck -- [DX-T1-10] Why: validate Docker/guest filesystem records at the boundary. Rejected: infer physical separation from a volume name.
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
async function main() {
  const [action, prefix, dir] = process.argv.slice(2),
    endpoint = "unix://" + path.join(os.homedir(), ".colima/triplex2/docker.sock");
  if (
    !["create", "export-clean"].includes(action) ||
    !/^tx2-dxt1-[a-z0-9-]+$/.test(prefix ?? "") ||
    !dir ||
    process.env.DOCKER_HOST !== endpoint
  )
    throw Error("Unowned harness volume request");
  const evidence = path.resolve(dir),
    ownerFile = path.join(os.homedir(), "Claude/Projects/triplex-db-2/locks/measure/owner.json"),
    lease = JSON.parse(fs.readFileSync(ownerFile));
  if (lease.id !== "DX-T1") throw Error("Harness volume requires DX-T1 measurement lease");
  const delegated = process.env.DX_R3_PAIR_LEASE_PID;
  if (delegated ? lease.pid !== Number(delegated) : lease.prefix !== prefix)
    throw Error("Harness lease does not bind this attempt");
  if (evidence !== path.join(os.homedir(), "Claude/Projects/triplex-db-2/evidence/DX-T1", prefix))
    throw Error("Harness export destination is outside its attempt");
  process.kill(lease.pid, 0);
  const volume = prefix + "-driver",
    device = "/var/tmp/" + prefix + "-harness",
    image = "node:22.23.2-bookworm-slim";
  const docker = (args) =>
    execFileSync("docker", args, { encoding: "utf8", maxBuffer: 32 * 1024 ** 2 });
  const guest = (role, body, input) =>
    JSON.parse(
      docker([
        "run",
        "--rm",
        "--pull",
        "never",
        "--name",
        prefix + "-harness-" + role,
        "--network",
        "none",
        "--memory",
        "256m",
        "--memory-swap",
        "256m",
        "--mount",
        "type=bind,src=/var/tmp,dst=/owned",
        image,
        "node",
        "-e",
        body,
        JSON.stringify(input),
      ]),
    );
  const common = `const fs=require('node:fs'),p=require('node:path'),crypto=require('node:crypto');const input=JSON.parse(process.argv[1]);if(!/^tx2-dxt1-[a-z0-9-]+$/.test(input.prefix))throw Error('prefix');const root=p.join('/owned',input.prefix+'-harness');`;
  if (action === "create") {
    const source = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      owner = { prefix, source, createdAt: Date.now() };
    const actual = guest(
      "create",
      common +
        `fs.mkdirSync(root,{mode:448});fs.writeFileSync(p.join(root,'.harness-owner.json'),JSON.stringify(input),{flag:'wx'});const fd=fs.openSync(p.join(root,'.harness-owner.json'),'r');fs.fsyncSync(fd);fs.closeSync(fd);const stat=fs.statfsSync(root);if(stat.type!==0xef53)throw Error('Harness root is not ext4');console.log(JSON.stringify({owner:input,filesystemType:stat.type,device:fs.statSync(root).dev,bootId:fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim(),mount:fs.readFileSync('/proc/self/mountinfo','utf8').split('\\n').find(l=>l.includes(' /owned '))}));`,
      owner,
    );
    if (JSON.stringify(actual.owner) !== JSON.stringify(owner) || !actual.mount?.includes("ext4"))
      throw Error("Harness ownership readback");
    docker([
      "volume",
      "create",
      "--driver",
      "local",
      "--label",
      "triplex.owner=" + prefix,
      "--opt",
      "type=none",
      "--opt",
      "o=bind",
      "--opt",
      "device=" + device,
      volume,
    ]);
    fs.writeFileSync(
      path.join(evidence, "harness-volume.json"),
      JSON.stringify({ volume, device, ...actual }, null, 2) + "\n",
      { flag: "wx" },
    );
  } else {
    const prepared = JSON.parse(fs.readFileSync(path.join(evidence, "harness-volume.json"))),
      v = JSON.parse(docker(["volume", "inspect", volume]))[0];
    if (
      prepared.volume !== volume ||
      prepared.device !== device ||
      prepared.owner.prefix !== prefix ||
      v.Options?.device !== device ||
      v.Options?.o !== "bind" ||
      v.Labels?.["triplex.owner"] !== prefix ||
      docker(["ps", "-a", "--filter", "volume=" + volume, "--format", "{{.Names}}"]).trim()
    )
      throw Error("Harness still mounted or ownership differs");
    // [DX-T1-10] Why: remove an owned guest directory only after exact source/export content and closure match.
    // Rejected: trust Docker cp exit alone, delete an unbound root path, or erase failed-run evidence before verifying its copy.
    const observed = guest(
      "hash",
      common +
        `(async()=>{const owner=JSON.parse(fs.readFileSync(p.join(root,'.harness-owner.json')));if(JSON.stringify(owner)!==JSON.stringify(input))throw Error('owner');const files=[];async function visit(dir){for(const name of fs.readdirSync(dir)){const f=p.join(dir,name),s=fs.lstatSync(f);if(s.isSymbolicLink())throw Error('Unexpected harness symlink');if(s.isDirectory())await visit(f);else if(s.isFile()){const h=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(f))h.update(chunk);files.push({path:p.relative(root,f),bytes:s.size,sha256:h.digest('hex')})}else throw Error('Unexpected harness node')}}await visit(root);console.log(JSON.stringify({owner,files,at:Date.now()}))})().catch(e=>{console.error(e);process.exitCode=1});`,
      prepared.owner,
    );
    if (JSON.stringify(observed.owner) !== JSON.stringify(prepared.owner))
      throw Error("Export source owner differs");
    await verifyHarnessExport(observed, path.join(evidence, "driver"));
    fs.writeFileSync(
      path.join(evidence, "harness-export.json"),
      JSON.stringify(
        {
          ...observed,
          verifiedAt: Date.now(),
          scope: "Exact owned transient harness export only, not an oracle or performance PASS.",
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
    docker(["volume", "rm", volume]);
    const removed = guest(
      "remove",
      common +
        `const owner=JSON.parse(fs.readFileSync(p.join(root,'.harness-owner.json')));if(JSON.stringify(owner)!==JSON.stringify(input))throw Error('owner');fs.rmSync(root,{recursive:true});console.log(JSON.stringify({prefix:input.prefix,removed:!fs.existsSync(root),at:Date.now()}));`,
      prepared.owner,
    );
    if (!removed.removed || removed.prefix !== prefix) throw Error("Harness cleanup readback");
    fs.writeFileSync(path.join(evidence, "harness-cleanup.json"), JSON.stringify(removed) + "\n", {
      flag: "wx",
    });
  }
}
export async function verifyHarnessExport(observed, target) {
  const expected = new Set();
  if (!observed || !Array.isArray(observed.files) || !observed.files.length)
    throw Error("Missing export manifest");
  for (const item of observed.files) {
    if (
      typeof item.path !== "string" ||
      !Number.isSafeInteger(item.bytes) ||
      item.bytes < 0 ||
      !/^[a-f0-9]{64}$/.test(item.sha256)
    )
      throw Error("Invalid export entry");
    const f = path.resolve(target, item.path);
    if (
      !f.startsWith(target + path.sep) ||
      expected.has(item.path) ||
      !fs.lstatSync(f).isFile() ||
      fs.statSync(f).size !== item.bytes
    )
      throw Error("Export path/length differs");
    expected.add(item.path);
    const h = crypto.createHash("sha256");
    for await (const chunk of fs.createReadStream(f)) h.update(chunk);
    if (h.digest("hex") !== item.sha256) throw Error("Export bytes differ");
    const fd = fs.openSync(f, "r");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
  }
  const actual = [];
  function visit(d) {
    for (const name of fs.readdirSync(d)) {
      const f = path.join(d, name),
        s = fs.lstatSync(f);
      if (s.isDirectory()) visit(f);
      else if (s.isFile()) actual.push(path.relative(target, f));
      else throw Error("Export contains special node");
    }
  }
  visit(target);
  if (actual.length !== expected.size || actual.some((f) => !expected.has(f)))
    throw Error("Export closed-world file set differs");
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  await main();
