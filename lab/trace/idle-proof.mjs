// @ts-nocheck -- [DX-T1-10] Why: a native no-datom diagnostic receipt requires content, freshness and exact attempt binding. Rejected: trust HTTP 409 alone.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
export function qualifyIdleRefusal(text, result, manifest, now = Date.now()) {
  const input = JSON.parse(text);
  if (
    result.schema !== "triplex.idle-refusal.v1" ||
    result.run !== input.run ||
    result.slot !== input.slot ||
    result.source !== input.source ||
    result.scope !== input.scope ||
    result.requestHash !== sha(text) ||
    input.run !== manifest.tag ||
    input.slot !== manifest.slot ||
    input.source !== manifest.source ||
    input.createdAt < manifest.startedAt ||
    result.startedAt < input.createdAt - 1000 ||
    ![input.createdAt, result.startedAt, result.endedAt].every(Number.isFinite) ||
    result.endedAt < result.startedAt ||
    result.endedAt > now + 1000 ||
    now - result.endedAt > 60000 ||
    !Number.isSafeInteger(result.beforeT) ||
    result.beforeT < 0 ||
    result.afterT !== result.beforeT ||
    result.transactions !== 0 ||
    result.datoms !== 0 ||
    result.responses?.length !== 25 ||
    result.responses.some((r) => r.status !== 409 || r.code !== "CasConflict")
  )
    throw Error("Idle refusal content/freshness/binding differs");
  return {
    ...result,
    qualifiedAt: now,
    scopeOfProof:
      "Only these 25 actual HTTP refusals append no transaction or datom; diagnostic warming must check every response too.",
  };
}
async function main() {
  const [action, directory] = process.argv.slice(2),
    dir = path.resolve(directory);
  const m = JSON.parse(fs.readFileSync(path.join(dir, "trace-run.json"))),
    source = fs.readFileSync(path.join(dir, "head.txt"), "utf8").trim();
  if (
    !/^tx2-dxt1-[a-z0-9-]+$/.test(m.tag) ||
    m.slot !== m.tag ||
    m.source !== source ||
    !/^[a-f0-9]{40}$/.test(source)
  )
    throw Error("Foreign idle proof");
  const file = path.join(dir, "idle-refusal-input.json");
  if (action === "prepare") {
    fs.writeFileSync(
      file,
      JSON.stringify({
        run: m.tag,
        slot: m.slot,
        source,
        createdAt: Date.now(),
        scope: JSON.stringify(["triplex-scope-v1", "lab", "idle-refusal", m.tag, 0]),
      }) + "\n",
      { flag: "wx" },
    );
  } else if (action === "qualify") {
    const rows = fs
      .readFileSync(path.join(dir, "idle-refusal-stdout.jsonl"), "utf8")
      .split("\n")
      .filter((l) => l.startsWith("{"))
      .map((l) => JSON.parse(l))
      .filter((r) => r.schema === "triplex.idle-refusal.v1");
    if (rows.length !== 1) throw Error("Missing/duplicate native proof record");
    const receipt = qualifyIdleRefusal(fs.readFileSync(file, "utf8"), rows[0], m);
    const bytes = JSON.stringify(receipt, null, 2) + "\n";
    fs.writeFileSync(path.join(dir, "idle-refusal-proof.json"), bytes, { flag: "wx" });
    console.log(sha(bytes));
  } else throw Error("prepare or qualify required");
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  await main();
