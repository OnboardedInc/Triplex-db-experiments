// [EXP-NSR-R2] Why: oracle comparison needs answer identity independent of wire IDs/formatting. Rejected: hashing the RPC envelope or retaining bytes only for loop zero (F1).
import { createHash } from "node:crypto";
import { validateJson } from "./rpc.mjs";
export function canonicalAnswer(value) {
  validateJson(value);
  const emit = (v) => {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map(emit).join(",") + "]";
    return (
      "{" +
      Object.keys(v)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + emit(v[k]))
        .join(",") +
      "}"
    );
  };
  return emit(value);
}
export const answerDigest = (value) =>
  createHash("sha256").update(canonicalAnswer(value), "utf8").digest("hex");
export function readEvidence(request, answer, wire, { loop, sequence, every }) {
  const sampled = loop === undefined || sequence === 0 || sequence % every === 0;
  const answerCanonical = canonicalAnswer(answer);
  return {
    request,
    requestKey: canonicalAnswer(request),
    answerEncoding: "answer-canonical/1",
    answerSha256: createHash("sha256").update(answerCanonical, "utf8").digest("hex"),
    rawWireSha256: createHash("sha256").update(wire).digest("hex"),
    sampled,
    ...(loop === undefined ? {} : { loop, sequence }),
    ...(sampled ? { answer, answerCanonical, responseBytes: wire.toString("utf8") } : {}),
  };
}
