import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { deepOwnFacts } from "../../../bench/lib/deep-world.ts";
import { ownFacts, SEED_VALID_FROM, type Fact } from "../../../bench/lib/world.ts";
import { seedOps } from "../../../bench/lib/commands.ts";

export const sha = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
export type Shape = "seed" | "deep" | "thin";
export interface Frame {
  first: number;
  end: number;
  operations: ReturnType<typeof seedOps>;
}
const definition = sha(
  [
    "./source.ts",
    "../../../bench/lib/deep-world.ts",
    "../../../bench/lib/world.ts",
    "../../../bench/lib/commands.ts",
    "../../../bench/lib/rng.ts",
    "../../../bench/lib/canonical.ts",
  ]
    .map((f) => sha(readFileSync(new URL(f, import.meta.url))))
    .join("/"),
);
export const sourceId = (shape: Shape, subjects: number) =>
  sha(JSON.stringify([definition, shape, subjects, SEED_VALID_FROM]));
function thin(i: number): Fact[] {
  const root = "pl:" + i,
    out: Fact[] = [];
  for (let j = 0; j < 2 + Number(i % 5 >= 2); j++) {
    const answer = root + "/ans:" + j;
    out.push(
      { e: root, a: "answers", v: { type: "ref", value: answer } },
      {
        e: answer,
        a: "field",
        v: { type: "string", value: ["source-key", "import-batch", "external-status"][j]! },
      },
    );
    if (j < 2 || i % 5 >= 3)
      out.push({ e: answer, a: "value", v: { type: "string", value: j + "-" + i } });
  }
  if (i % 5 === 1 || i % 5 === 4)
    out.push({
      e: root,
      a: "weeklyMinutes",
      v: { type: "integer", value: String(1200 + (i % 1800)) },
    });
  return out;
}
// [DX-LOAD1] Why: all arms regenerate the same immutable source and pack complete subjects, including typed references. Rejected: padding a slow arm or splitting a subject across concurrent frames.
export function* frames(
  shape: Shape,
  subjects: number,
  width: number,
  first = 0,
): Generator<Frame, void> {
  assert(
    Number.isSafeInteger(subjects) &&
      subjects > 0 &&
      Number.isSafeInteger(width) &&
      width > 0 &&
      width <= 8192,
  );
  let rows: Fact[] = [],
    start = first;
  for (let i = first; i < subjects; i++) {
    const facts = shape === "deep" ? deepOwnFacts(i) : shape === "thin" ? thin(i) : ownFacts(i, 20);
    assert(
      facts.length <= width,
      "A complete source subject exceeds the selected transaction bound",
    );
    if (rows.length && rows.length + facts.length > width) {
      yield { first: start, end: i, operations: seedOps(rows) };
      rows = [];
      start = i;
    }
    for (const f of facts)
      rows.push({
        e: "acct/import/" + f.e,
        a: f.a,
        v: f.v.type === "ref" ? { type: "ref", value: "acct/import/" + f.v.value } : f.v,
      });
  }
  if (rows.length) yield { first: start, end: subjects, operations: seedOps(rows) };
}
export function identity(scope: string, source: string, width: number, frame: Frame) {
  const commandId = "load1/" + sha(JSON.stringify([scope, source, width])) + "/" + frame.first;
  return {
    commandId,
    actor: "bulk-import",
    correlationId: sha(JSON.stringify([commandId, frame.end, frame.operations])),
  };
}
