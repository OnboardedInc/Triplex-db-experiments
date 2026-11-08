// [CX-VP2Q-5] Why: distinguish a new nested-decode regression from the older broad message heuristic.
// Rejected: attributing every pre-existing false positive to the cause-walk delta.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { transpileModule, ModuleKind, ScriptTarget } from "typescript";
import { expect, it } from "vitest";
import { QleverHttpError } from "../../../../packages/qlever/src/QleverClient.js";
import { BasisNotAvailable, isUnreachable } from "../../../../packages/qlever/src/broker/errors.js";
import { writeJson } from "./harness.js";

it("round5 delta: following a decode cause must not turn it into a transport failure", () => {
  const file = "packages/qlever/src/broker/errors.ts";
  const baseline = execFileSync("git", ["show", `03909d6:${file}`], { encoding: "utf8" });
  const predicate = baseline.slice(baseline.indexOf("export const isUnreachable ="));
  const js = transpileModule(predicate, { compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 } }).outputText.replace(/^export /gm, "");
  const old = new Function("QleverHttpError", "BasisNotAvailable", `${js}; return isUnreachable;`)(QleverHttpError, BasisNotAvailable);
  const decoded = new TypeError("terminated", { cause: new SyntaxError("Invalid JSON in connection field") });
  const plain = new TypeError("Cannot decode the connection field");
  const observations = { baselineRef: "03909d6", file, baselineSha256: createHash("sha256").update(baseline).digest("hex"), nestedDecode: { baseline: old(decoded), current: isUnreachable(decoded) }, plainDecode: { baseline: old(plain), current: isUnreachable(plain) } };
  writeJson("round5-baseline-differential.json", observations);
  expect(observations.nestedDecode.baseline).toBe(false);
  expect(observations.nestedDecode.current).toBe(false);
});
