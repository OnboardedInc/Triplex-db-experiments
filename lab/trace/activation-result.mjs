// @ts-nocheck -- [DX-T1-14] Why: validate the completed native diagnostic envelope before a receipt. Rejected: missing-field defaults or treating timing output as exactness.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
const sha = (b) => createHash("sha256").update(b).digest("hex");
export function qualifyActivation(envelopes, expected) {
  if (
    !expected ||
    ![1000, 10000, 100000].includes(expected.subjects) ||
    !/^tx2-dxt1-[a-z0-9-]+$/.test(expected.run ?? "") ||
    expected.slot !== expected.run ||
    !/^[0-9a-f]{40}$/.test(expected.source ?? "") ||
    ![expected.programSha256, expected.sourceManifestSha256].every((s) =>
      /^[0-9a-f]{64}$/.test(s ?? ""),
    ) ||
    !/^[0-9a-f-]{36}$/.test(expected.nonce ?? "") ||
    typeof expected.scope !== "string" ||
    !expected.scope ||
    (expected.sealedCut !== undefined &&
      (!Number.isSafeInteger(expected.sealedCut) || expected.sealedCut < 1))
  )
    throw Error("Invalid activation attempt identity");
  if (envelopes.length !== 1) throw Error("Expected one completed activation envelope");
  const e = envelopes[0],
    r = e.result;
  if (
    e.schema !== "triplex.activation-envelope/1" ||
    ["run", "source", "slot", "nonce", "programSha256", "sourceManifestSha256"].some(
      (k) => !expected[k] || e[k] !== expected[k],
    ) ||
    !Number.isFinite(e.durationMs) ||
    e.durationMs < 0
  )
    throw Error("Stale/foreign activation envelope");
  const publication = (p) =>
    p &&
    Number.isSafeInteger(p.changed) &&
    p.changed >= 0 &&
    p.changed <= expected.subjects &&
    Number.isSafeInteger(p.commits) &&
    p.commits > 0 &&
    Number.isFinite(p.wallMs) &&
    p.wallMs >= 0;
  if (
    !r ||
    r.classification !== "DIAGNOSTIC" ||
    r.acceptance !== false ||
    r.N !== expected.subjects ||
    r.scope !== expected.scope ||
    r.bootstrapWorlds !== expected.subjects ||
    r.oracleCompared !== expected.subjects ||
    r.publishedStatesCompared !== expected.subjects ||
    !Number.isSafeInteger(r.bootstrap?.position) ||
    !Number.isSafeInteger(r.finalPosition) ||
    r.finalPosition !== r.publishedStatePosition ||
    r.finalPosition <= r.bootstrap.position ||
    !publication(r.publication) ||
    !publication(r.r1Publication) ||
    !Array.isArray(r.fullHistoryCounts) ||
    !r.fullHistoryCounts.length ||
    (expected.sealedCut !== undefined && r.bootstrap.position !== expected.sealedCut)
  )
    throw Error("Incomplete activation content/cut coverage");
  return {
    schema: "triplex.activation-check/1",
    run: e.run,
    source: e.source,
    slot: e.slot,
    nonce: e.nonce,
    programSha256: e.programSha256,
    sourceManifestSha256: e.sourceManifestSha256,
    subjects: r.N,
    scope: r.scope,
    inputPosition: r.bootstrap.position,
    publishedPosition: r.finalPosition,
    worldsCompared: r.bootstrapWorlds,
    oracleCompared: r.oracleCompared,
    publishedStatesCompared: r.publishedStatesCompared,
    exactness: "complete independent comparisons reached",
    performanceVerdict: "NOT JUDGED: diagnostic host",
    durationMs: e.durationMs,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [directory, logName] = process.argv.slice(2);
  if (!directory || !/^[-a-z]+\.log$/.test(logName ?? ""))
    throw Error("activation-result.mjs RUN LOG");
  const expected = JSON.parse(
    fs.readFileSync(path.join(directory, "activation-attempt.json"), "utf8"),
  );
  const sourceManifest = fs.readFileSync(path.join(directory, "source.SHA256SUMS"));
  if (sha(sourceManifest) !== expected.sourceManifestSha256)
    throw Error("Changed activation source manifest");
  const bytes = fs.readFileSync(path.join(directory, logName));
  const envelopes = bytes
    .toString("utf8")
    .split("\n")
    .flatMap((line) => {
      try {
        const r = JSON.parse(line);
        return r.schema === "triplex.activation-envelope/1" ? [r] : [];
      } catch {
        return [];
      }
    });
  const result = qualifyActivation(envelopes, expected);
  result.logSha256 = sha(bytes);
  result.attemptSha256 = sha(fs.readFileSync(path.join(directory, "activation-attempt.json")));
  fs.writeFileSync(
    path.join(directory, "ACTIVATION-CHECK.json"),
    JSON.stringify(result, null, 2) + "\n",
    { flag: "wx" },
  );
}
