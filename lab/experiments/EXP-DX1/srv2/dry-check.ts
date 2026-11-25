// [DX-SRV2] The Mac checks behind srv2/session.sh --dry-run (diagnostic; counts and refusals are results):
//   dry-check.ts copy EVID        make_copy / remove_copy and the spend guard of srv2/lib.sh, in a Linux container on a toy
//                                 PostgreSQL tree (the server's GNU tools), every refusal case included
//   dry-check.ts downloads EVID   the Datomic archive's size at its URL against lab/config/datomic/verification.json, and
//                                 the Node release manifest against the pins in t1/bare-metal.sh (no credentials needed)
//   dry-check.ts card DIR [K=V…]  a toy card fixture ran the classification and the requested read and writer options
// Rejected: checking these by reading the scripts (each check runs the code the server will run).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [mode, target, ...rest] = process.argv.slice(2);
const here = path.dirname(new URL(import.meta.url).pathname), repo = path.resolve(here, "../../../..");
const write = (name: string, value: unknown) => { fs.mkdirSync(target!, { recursive: true }); fs.writeFileSync(path.join(target!, name), JSON.stringify(value, null, 2) + "\n"); };

if (mode === "copy") {
  const image = process.env.DRY_IMAGE;
  assert(image && /^tx2-dx[a-z0-9]+-(managed|jre21|jre25|native):[a-f0-9]{15,16}$/.test(image), "DRY_IMAGE: the toy image this builder built");
  const script = String.raw`
set -uo pipefail
. /srv2/lib.sh
fail=0; ok() { echo "PASS $1"; }; bad() { echo "FAIL $1"; fail=1; }
mkdir -p /w/src/global /w/src/pg_wal /w/src/base/1 /w/scratch
echo 17 > /w/src/PG_VERSION; head -c 8192 /dev/urandom > /w/src/global/pg_control
head -c 1048576 /dev/urandom > /w/src/pg_wal/000000010000000000000001; head -c 65536 /dev/urandom > /w/src/base/1/16384
chmod 700 /w/src; chown -R 65534:65534 /w/src
export SCRATCH=/w/scratch AGED_PGDATA_SOURCE=/w/src
# df on a tmpfs: the 20 GiB headroom rule would refuse; give the scratch a large fake free size through a wrapper
df() { if [[ $* == *-Pk* ]]; then printf 'F 1 2 3 4\nx 1 1 %d 1 /\n' $((40*1024*1024)); else command df "$@"; fi; }
make_copy /w/scratch/c1 >/dev/null && cmp /w/src/global/pg_control /w/scratch/c1/global/pg_control && [[ $(stat -c %U /w/scratch/c1/base/1/16384) == nobody && $(stat -c %a /w/scratch/c1) == 700 && -d /w/scratch/c1/pg_wal && ! -L /w/scratch/c1/pg_wal ]] && ok "copy keeps bytes, owner, modes and the internal pg_wal" || bad copy
make_copy /w/scratch/c1 2>/dev/null && bad "an existing copy accepted" || ok "refuses an existing copy"
make_copy /w/elsewhere 2>/dev/null && bad "a copy outside SCRATCH accepted" || ok "refuses a copy outside SCRATCH"
touch /w/src/postmaster.pid; make_copy /w/scratch/c2 2>/dev/null && bad "a running source accepted" || ok "refuses a source with postmaster.pid"; rm /w/src/postmaster.pid
echo 16 > /w/src/PG_VERSION; make_copy /w/scratch/c3 2>/dev/null && bad "PG 16 accepted" || ok "refuses a cluster that is not PostgreSQL 17"; echo 17 > /w/src/PG_VERSION
ln /w/src/base/1/16384 /w/src/base/1/16385; make_copy /w/scratch/c4 2>/dev/null && bad "hard links accepted" || ok "refuses hard links in the copy"; rm /w/src/base/1/16385; rm -rf /w/scratch/c4
df() { if [[ $* == *-Pk* ]]; then printf 'F 1 2 3 4\nx 1 1 %d 1 /\n' 1024; else command df "$@"; fi; }
make_copy /w/scratch/c5 2>/dev/null && bad "no space accepted" || ok "refuses without the copy's size plus 20 GiB free"
remove_copy /w/src 2>/dev/null && bad "removed the source" || ok "remove_copy refuses the source"
remove_copy /w/scratch/nothing 2>/dev/null && bad "removed a non-copy" || ok "remove_copy refuses a directory that is not a copy"
remove_copy /w/scratch/c1 && [[ ! -e /w/scratch/c1 && -f /w/src/PG_VERSION ]] && ok "remove_copy removes the copy only" || bad remove
# Spend: 20 h of machine A and 5 h of B (B deleted), USD 1.09 an hour, nothing before: 27.25
now=$(date +%s); export PRICE_PER_HOUR=1.09 SPEND_BEFORE=0 MACHINE_A_STARTED=$((now-72000)) MACHINE_A_ENDED= MACHINE_B_STARTED=$((now-36000)) MACHINE_B_ENDED=$((now-18000))
read -r s r < <(spend_now); [[ $s == 27.25 && $r == 1 ]] && ok "spend 27.25 with one machine running" || bad "spend $s $r"
[[ $(step_high_minutes a4) == 160 && $(step_high_minutes b4) == 240 && $(step_high_minutes nothing) == 0 ]] && ok "step ceilings from the plan" || bad ceilings
exit $fail`;
  let out: string, code = 0;
  try {
    out = execFileSync("docker", ["run", "--rm", "--network", "none", "--label", "tx2.holder=DX-SRV2", "--name", "tx2-dxsrv2-copy-check",
      "-v", here + ":/srv2:ro", "--tmpfs", "/w:size=64m", "--entrypoint", "/bin/bash", image, "-c", script], { encoding: "utf8" });
  } catch (e: any) { out = String(e.stdout ?? "") + String(e.stderr ?? ""); code = e.status ?? 1; }
  const lines = out.trim().split("\n");
  write("copy-check.json", { image, imageId: execFileSync("docker", ["image", "inspect", "--format", "{{.Id}}", image], { encoding: "utf8" }).trim(),
    passed: lines.filter((l) => l.startsWith("PASS")).length, failed: lines.filter((l) => l.startsWith("FAIL")), lines });
  console.log(out.trim());
  assert.equal(code, 0, "a copy or spend check failed");
} else if (mode === "downloads") {
  const v = JSON.parse(fs.readFileSync(path.join(repo, "lab/config/datomic/verification.json"), "utf8"));
  const head = execFileSync("curl", ["-fsSI", "https://datomic-pro-downloads.s3.amazonaws.com/1.0.7745/datomic-pro-1.0.7745.zip"], { encoding: "utf8" });
  const bytes = Number(/^content-length:\s*(\d+)/im.exec(head)?.[1]);
  const shasums = execFileSync("curl", ["-fsS", "https://nodejs.org/dist/v22.23.2/SHASUMS256.txt"], { encoding: "utf8" });
  const bare = fs.readFileSync(path.join(repo, "lab/experiments/EXP-DX1/t1/bare-metal.sh"), "utf8");
  const pin = /'node-v22\.23\.2-linux-x64\.tar\.xz': '([a-f0-9]{64})'/.exec(bare)?.[1];
  const listed = shasums.split("\n").find((l) => l.endsWith("  node-v22.23.2-linux-x64.tar.xz"))?.split(" ")[0];
  const runtime = fs.readFileSync(path.join(repo, "lab/config/datomic/runtime.mjs"), "utf8");
  const bases = [...runtime.matchAll(/base: "([^"]+)"/g)].map((m) => m[1]);
  const result = { datomicZip: { url: "datomic-pro-1.0.7745.zip at the vendor's download host", bytesAtUrl: bytes, bytesPinned: v.zipBytes,
    sizeMatches: bytes === v.zipBytes, sha256Pinned: v.zipSha256, note: "the digest is checked by t1/bare-metal.sh after download on the server" },
    node: { file: "node-v22.23.2-linux-x64.tar.xz", pinned: pin, releaseManifest: listed, matches: !!pin && pin === listed },
    javaBases: { pinnedByDigest: bases, note: "Java 21 and 25 come from these images, pulled by digest by the build; a wrong digest fails the pull" } };
  write("downloads-check.json", result);
  console.log(JSON.stringify(result));
  assert(result.datomicZip.sizeMatches && result.node.matches && bases.length === 2 && bases.every((b) => /@sha256:[a-f0-9]{64}$/.test(b!)));
} else if (mode === "card") {
  const dir = target!, want = Object.fromEntries(rest.map((kv) => [kv.slice(0, kv.indexOf("=")), kv.slice(kv.indexOf("=") + 1)]));
  const card = fs.readFileSync(path.join(dir, "SCORECARD-v0.1.md"), "utf8");
  const ops = JSON.parse(fs.readFileSync(path.join(dir, "campaign", "loaded", "operations.json"), "utf8"));
  const arm = JSON.parse(fs.readFileSync(path.join(dir, "campaign", "loaded", "arm.json"), "utf8"));
  const checks: Record<string, boolean> = {};
  if (want.DX_V01_SAMPLE_EVERY) {
    const steps = ops.p1 as any[], line = ops.p1Random;
    checks["card rows P1 in memory and P1 not in memory"] = /\| P1 in memory \|/.test(card) && /\| P1 not in memory \|/.test(card);
    checks["card table Reads by where the subject is"] = card.includes("## Reads by where the subject is");
    checks["every ladder step classified, none unmatched"] = steps.length > 0 && steps.every((s) => s.classified && !s.classified.error && s.classified.unmatched === 0);
    checks["every read sampled (every exchange)"] = steps.every((s) => s.classified?.sampledReads === s.classified?.stepReads && s.classified?.every === 1);
    checks["random line classified, none unmatched"] = !!line?.classified && !line.classified.error && line.classified.unmatched === 0;
    checks["0 wrong values and 0 errors"] = steps.every((s) => s.errors === 0) && line && line.wrong === 0 && line.errors === 0;
  }
  const observed = arm.settings?.observed ?? {};
  const flag = (name: string) => JSON.stringify(observed).includes(name);
  if (want.TX2_SUBJECT_WIDE === "1") checks["writer reports subjectWide"] = flag("subjectWide");
  if (want.TX2_SUBJECT_HINTS === "1") checks["writer reports subjectHints"] = flag("subjectHints");
  if (want.TX2_GENERAL_PREFETCH === "1") checks["writer reports generalPrefetch"] = flag("generalPrefetch");
  if (want.DX_S2_PRODUCT === "1") checks["every save through the product's path"] = JSON.stringify(arm).includes("product") || JSON.stringify(ops.writes?.[0] ?? {}).includes("product");
  write("card-check.json", { dir: path.basename(dir), options: want, checks });
  console.log(JSON.stringify(checks));
  assert(Object.values(checks).every(Boolean), "a card dry-run check failed");
} else throw new Error("dry-check.ts copy|downloads|card");
