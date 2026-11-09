// [EXP-P2X2] Why: every arm imports its own built public exports and Effect instance.
// Rejected: overlaying old adapter source onto current core (would measure a new, unqualified hybrid).
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { sha } from "./observe.mjs";
export async function modules(root) {
  const require = createRequire(path.join(root, "package.json"));
  const effect = await import(require.resolve("effect"));
  return {
    ...effect,
    core: await import(path.join(root, "packages/core/dist/index.js")),
    api: await import(path.join(root, "packages/core/dist/runtime/index.js")),
    xtdb: await import(path.join(root, "packages/xtdb/dist/index.js")),
  };
}
export function buildIdentity(root) {
  const files = {};
  for (const pkg of ["core", "xtdb"])
    for (const sub of ["src", "dist"]) {
      const dir = path.join(root, "packages", pkg, sub);
      for (const f of fs.readdirSync(dir, { recursive: true }).sort())
        if (fs.statSync(path.join(dir, f)).isFile())
          files[`packages/${pkg}/${sub}/${f}`] = sha(path.join(dir, f));
    }
  for (const f of ["pnpm-lock.yaml", "pnpm-workspace.yaml", "package.json"])
    files[f] = sha(path.join(root, f));
  const diff = execFileSync(
    "git",
    ["diff", "--", "packages/core", "packages/xtdb", "pnpm-lock.yaml"],
    { cwd: root, encoding: "utf8" },
  );
  if (diff) throw new Error("package source differs from chosen revision");
  return {
    root,
    head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    files,
  };
}
export async function runtime(root, arm, scope) {
  const m = await modules(root),
    { Effect, Layer, ManagedRuntime, core, api, xtdb } = m;
  const inner = xtdb.makeXtdbClient("postgres://xtdb:xtdb@127.0.0.1:5471/xtdb", {
    maxConnections: 20,
  });
  const counts = {
    submits: 0,
    casConflicts: 0,
    commandConflicts: 0,
    otherRejections: 0,
    transportErrors: 0,
  };
  const timings = { submit: [], sourceCut: [], claim: [], receipt: [], other: [] };
  let explicitWaitQueries = 0;
  const client = {
    close: () => inner.close(),
    query: async (sql, ...args) => {
      const k = /FROM tx_meta/.test(sql)
        ? "sourceCut"
        : /FROM tx_claims/.test(sql)
          ? "claim"
          : /FROM tx_attempts/.test(sql)
            ? "receipt"
            : "other";
      if (/AWAIT_TOKEN|AWAIT_TX/i.test(sql)) explicitWaitQueries++;
      const t = performance.now();
      try {
        return await inner.query(sql, ...args);
      } finally {
        timings[k].push(performance.now() - t);
      }
    },
    submit: async (...args) => {
      counts.submits++;
      const t = performance.now();
      try {
        return await inner.submit(...args);
      } catch (error) {
        const message = String(error?.message ?? error);
        if (/triplex-cas-conflict/.test(message)) counts.casConflicts++;
        else if (/triplex-command-conflict/.test(message)) counts.commandConflicts++;
        else if (error?.constructor?.name === "XtdbTransactionRejected") counts.otherRejections++;
        else counts.transportErrors++;
        throw error;
      } finally {
        timings.submit.push(performance.now() - t);
      }
    },
  };
  const adapter = xtdb.makeXtdbStorageAdapter(client, scope, {
    commitPath: arm === "C" ? "subject-stamp" : "scope-counter",
    admissionQueue: false,
  });
  const layer = api.Runtime.define({
    name: "p2x2",
    storage: Layer.succeed(api.StorageAdapter, adapter),
    queries: Layer.succeed(api.QueryExecutor, xtdb.makeXtdbQueryExecutor(client, scope)),
  }).layer({ scope: api.DatabaseScope.test(scope), capabilities: api.Capabilities.none });
  const managed = ManagedRuntime.make(layer);
  const triples = await managed.runPromise(
    Effect.gen(function* () {
      return yield* core.Triples;
    }),
  );
  const ops = (seq, subject, facts, correction = false) =>
    Array.from({ length: facts }, (_, k) => ({
      op: "assert",
      entityId: core.EntityId.make(`subj:${subject}`),
      attribute: `:p2x/f${k}`,
      value: core.string(`v${seq}-${k}`),
      entityType: "p2x-subject",
      ...(correction ? { validFrom: Date.now() - 30 * 86400000 } : {}),
    }));
  return {
    ...m,
    adapter,
    triples,
    client,
    inner,
    scope,
    timings,
    counts,
    ops,
    run: (e) => managed.runPromise(e),
    waitCount: () => explicitWaitQueries,
    close: async () => {
      await managed.dispose();
      await inner.close();
    },
  };
}
