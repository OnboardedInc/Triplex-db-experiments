import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { guardSeed } from "../act2/preflight-runner.ts";
import { sha256 } from "../../../bench/lib/w0-world.ts";
import { inputPins, measuredPair } from "./rung.ts";

export async function preflight(
  dir: string,
  binding: { source: string; slot: string; nonce: string },
  recipient?: {
    pages: number;
    intervalMs: number;
    route?: "recipient" | "isolated" | "copied";
    copyWorkers?: number;
  },
) {
  try {
    const pins = inputPins(binding.source);
    const identity = guardSeed(path.join(dir, "act2-preflight"), binding, {
      ...process.env,
      TRIPLEX_TRACE_SOURCE: binding.source,
      TRIPLEX_TRACE_SLOT: binding.slot,
      TRIPLEX_TRACE_DIR: path.join(dir, "identity-trace"),
    });
    const pre = path.join(dir, "notice-preflight");
    fs.mkdirSync(pre);
    const pair = await measuredPair(
      1000,
      pre,
      binding.source,
      binding.slot,
      randomUUID(),
      true,
      20,
      4,
      true,
      true,
      recipient?.pages,
      recipient?.intervalMs ?? 0,
    );
    const proof = pair.dispatch.proof;
    assert(
      proof?.subjects === 1000 &&
        proof.eventCounts[1]! > 0 &&
        proof.effects === proof.eventCounts.reduce((a, b) => a + b, 0),
    );
    if (recipient?.route === "copied") {
      assert.equal(pair.copyWorkers, recipient.copyWorkers);
      const copy = pair.dispatch.dispatch.copy;
      assert(
        copy && copy.captures > 0 && copy.evaluated > 0,
        "No copy-backed work in the native preflight",
      );
    }
    const receipt = {
      binding,
      recipient: recipient ?? null,
      inputPins: pins,
      windowIdentity: identity.binding,
      oracle: identity.oracleSha256,
      noticeAttempt: pair.nonce,
      noticeDigest: proof.orderedEffectSha256,
      subjects: proof.subjects,
      offers: pair.dispatch.saveCount,
    };
    assert.deepEqual(inputPins(binding.source), pins);
    fs.writeFileSync(path.join(dir, "preflight-receipt.json"), JSON.stringify(receipt) + "\n", {
      flag: "wx",
    });
    return receipt;
  } catch (e) {
    fs.writeFileSync(
      path.join(dir, "preflight-stop.json"),
      JSON.stringify({ ...binding, reason: String(e) }) + "\n",
      { flag: "wx" },
    );
    throw e;
  }
}
if (process.argv[1] === import.meta.filename) {
  const dir = process.env.NOTIFY_DIR!,
    raw = fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!),
    owner = JSON.parse(raw.toString());
  const b = JSON.parse(fs.readFileSync(path.join(dir, "binding.json"), "utf8"));
  assert(
    b.owner === sha256(raw) &&
      owner.holder === "DX-STG1" &&
      owner.endpoint === process.env.DATOMIC_URL &&
      b.slot === owner.container &&
      owner.mode === "exclusive",
  );
  assert(b.source === execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim());
  const result = await preflight(dir, { source: b.source, slot: b.slot, nonce: b.nonce });
  assert(fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!).equals(raw));
  console.log(result);
}
