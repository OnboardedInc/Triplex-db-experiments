import fs from "node:fs";
import { createHash } from "node:crypto";
import { runReplicaDriver } from "../../../bench/lib/w0-replica-driver.ts";
import { flushTracing } from "../../../../packages/datomic/dist/index.js";

// [DX-T1-14] Why: a fresh nonce and exact source/program binding distinguish this completed readback from retained S5 output.
// Rejected: accept process exit zero, an earlier result line, or cross-process epoch alignment as a semantic receipt.
const {
  TRIPLEX_TRACE_RUN: run,
  TRIPLEX_TRACE_SOURCE: source,
  TRIPLEX_TRACE_SLOT: slot,
  DX_ACTIVATION_NONCE: nonce,
  DX_ACTIVATION_BUILD_SHA256: sourceManifestSha256,
} = process.env;
if (
  !/^[0-9a-f]{64}$/.test(sourceManifestSha256 ?? "") ||
  !/^tx2-dxt1-[a-z0-9-]+$/.test(run ?? "") ||
  slot !== run ||
  !/^[0-9a-f]{40}$/.test(source ?? "") ||
  !/^[0-9a-f-]{36}$/.test(nonce ?? "")
)
  throw Error("Missing activation attempt identity");
const programSha256 = createHash("sha256")
  .update(fs.readFileSync(new URL(import.meta.url)))
  .digest("hex");
const started = process.hrtime.bigint();
try {
  let args = process.argv.slice(2);
  // [DX-ACT1] Why: the read-only mounted checkout transports this stage's explicit experiment options into the existing managed stack. Rejected: forwarding arbitrary shell arguments or changing the frozen driver defaults.
  if (/^tx2-dxt1-bm1-act[a-z0-9]{9}-activation-a$/.test(run!)) {
    const { benchArguments } = await import("../act1/bench-proof.ts");
    args = benchArguments(args, run!, source!, nonce!);
  }
  const result = await runReplicaDriver(args);
  console.log(
    JSON.stringify({
      schema: "triplex.activation-envelope/1",
      run,
      source,
      slot,
      nonce,
      programSha256,
      sourceManifestSha256,
      durationMs: Number(process.hrtime.bigint() - started) / 1e6,
      result,
    }),
  );
} finally {
  await flushTracing();
}
