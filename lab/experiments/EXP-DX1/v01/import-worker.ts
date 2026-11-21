import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { openComposition } from "../../../bench/lib/composition.ts";
import { scopeKey, hex } from "./adopt.ts";
import { jsonFile } from "./adopted.ts";
import { isWriter } from "./profile.ts";
import { live } from "../load1/live.ts";
import { replayLive } from "../load1/live-evidence.ts";

const [out, scope, cut, group, capacity, writer] = process.argv.slice(2);
assert(out && scope && cut && group && isWriter(writer) && (capacity === "toy" || capacity === "server"));
const toy = capacity === "toy";
const rate = toy ? 10 : 50, arm = "pace-32-fixed", mode = "load-paced";
const after = Number(cut), referenceImport = writer === "per-person-ordered";
const nonce = process.env.TRIPLEX_TRACE_RUN!, source = process.env.TRIPLEX_TRACE_SOURCE!, slot = process.env.TRIPLEX_TRACE_SLOT!;
assert(nonce && source && slot);
const comp = await openComposition("reach", "datomic", scope);
try {
  const result = await live(comp, scope, rate, out, arm, !toy, mode, { after, maxGroup: Number(group), clockRun: toy ? nonce : slot, referenceImport });
  const bytes = fs.readFileSync(path.join(out, arm + ".offers.json"));
  const tape = JSON.parse(bytes.toString());
  const db = "s2-" + Buffer.from(scopeKey(scope)).toString("base64url");
  assert.equal(tape.expectedDb, db);
  replayLive(tape, { nonce, source: { git: source }, slot, mode }, { ...result, arm, held: { scope, after, referenceImport } }, toy);
  jsonFile(path.join(out, "result.json"), { ...result, source, nonce, slot, db, toy, after, arm, writer, referenceImport, sha256: hex(bytes) });
} finally {
  await comp.close();
}
