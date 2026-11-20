import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { withStack } from "../bench.ts";
import { sourceInventory } from "../../scale1/source.ts";
import { fileHash } from "../../scale1/measurements.ts";
import { runArm, seedPooled } from "../group/workload.ts";
import { pooledDigest } from "../group/population.ts";
import { verifyPopulation } from "../group/seed-readback.ts";
import { fieldPhase, scopeKey } from "./traffic.ts";
import { verifyJournalRead } from "./journal-witness.ts";
import { readWriteOptions, verifyWriteOptions } from "../write-options.ts";
import {
  modes,
  fieldPolicy,
  fieldPlan,
  validateArm,
  validateComparison,
  type Study,
  type Mode,
} from "./bench-check.ts";
const repo = path.resolve(import.meta.dirname, "../../../../..");
const [, , action, dir, source, batch, requested, profile] = process.argv;
const predictionPath = (enhanced: boolean, write5: boolean, write6 = false) =>
  path.join(
    import.meta.dirname,
    write6
      ? "../small/write6-predictions.json"
      : write5
        ? "../small/write5-predictions.json"
        : enhanced
          ? "../small/predictions.json"
          : "predictions.json",
  );
const write = (name: string, data: unknown) =>
  fs.writeFileSync(name, JSON.stringify(data) + "\n", { flag: "wx" });
const read = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
async function fieldArm(
  url: string,
  seedUrl: string,
  nonce: string,
  directory: string,
  enhanced: boolean,
  write5: boolean,
  opened?: (client: DatomicClient, db: string) => Promise<void>,
) {
  const seed = new DatomicClient(seedUrl, 35000),
    c = new DatomicClient(url, 35000),
    scope = scopeKey(nonce + "-load");
  try {
    const init = await seed.create(scope, "lean", true, 35000);
    assert(init.created && init.strictRecordClocks);
    const { head: seedHead, seeds } = await seedPooled(seed, init.db);
    const open = await c.create(scope, "lean", true, 35000);
    assert(!open.created && open.db === init.db);
    const writerOptions = await readWriteOptions(
      url,
      init.db,
      process.env.DX_W1_WRITER_EXPECTATION,
    );
    assert.equal(writerOptions.observed.position, seedHead);
    await opened?.(c, init.db);
    const phases = [],
      senders = new Map<string, number>();
    let head = seedHead;
    for (const window of fieldPlan(enhanced)) {
      const p = await fieldPhase(
        c,
        init.db,
        head,
        nonce,
        window.label,
        window.schedule,
        true,
        senders,
        write5,
      );
      write(path.join(directory, window.label + ".json"), p);
      assert.deepEqual(p.failures, []);
      head += p.offered;
      phases.push(p);
    }
    return { nonce, scope, db: init.db, seeds, phases, writerOptions };
  } finally {
    c.close();
    seed.close();
  }
}
if (action === "worker") {
  assert(dir);
  const req = read(path.join(dir, "request.json")),
    url = process.env.DATOMIC_URL!,
    bootstrapUrl = process.env.DATOMIC_READ_URLS!;
  assert.equal(process.env.TRIPLEX_TRACE_SOURCE, req.arm.source);
  assert.equal(process.env.TRIPLEX_TRACE_SLOT, req.arm.slot);
  assert.equal(
    await fileHash(predictionPath(req.enhanced, req.write5, req.write6)),
    req.predictionSha256,
  );
  assert(req.study === "pulse" || req.study === "rates");
  assert(
    typeof req.enhanced === "boolean" &&
      typeof req.write5 === "boolean" &&
      (req.write6 === undefined || typeof req.write6 === "boolean") &&
      !(req.write5 && req.write6) &&
      modes(req.study, req.enhanced, req.write5, req.write6).includes(req.mode),
  );
  const policy = fieldPolicy(req.mode, req.enhanced);
  if (req.enhanced) assert.deepEqual(read(path.join(dir, "field-options.json")), policy);
  assert(url && bootstrapUrl && url !== bootstrapUrl);
  const readOptions = async (client: DatomicClient, db: string) => {
    const actual = await client.request<{
      database: string;
      scope: string;
      basis: string;
      predecessorRequested: boolean;
      predecessorSelected: boolean;
      selectedFunction: string;
      selectedDefinitionSha256: string;
      installedDefinitionMatches: boolean;
      ledger: boolean;
      packedJournal: boolean;
      packedJournalCount: number;
      fastReply: boolean;
      leanNativeQuery: boolean;
      leanNativeLog: boolean;
    }>("GET", `/v2/db/${db}/write-options`);
    assert.equal(actual.database, db);
    assert.equal(JSON.parse(actual.scope)[3], req.arm.nonce + "-load");
    assert.match(actual.basis, /^\d+$/);
    assert.match(actual.selectedDefinitionSha256, /^[a-f0-9]{64}$/);
    assert(actual.installedDefinitionMatches);
    assert.equal(actual.predecessorRequested, policy.predecessor);
    assert.equal(actual.predecessorSelected, policy.predecessor);
    assert.match(
      actual.selectedFunction,
      policy.predecessor ? /^:triplex\.write\/v-[a-f0-9]{24}$/ : /^:triplex\/commit$/,
    );
    assert.equal(actual.ledger, policy.ledger);
    assert.equal(actual.packedJournal, policy.packedJournal);
    assert.equal(actual.fastReply, policy.fastReplyAndWire);
    if (req.write6) assert(actual.leanNativeQuery && actual.leanNativeLog);
    assert.deepEqual(
      client.cacheDiagnostics().fastPaths,
      policy.fastReplyAndWire ? ["save-wire"] : [],
    );
    return actual;
  };
  let before: Awaited<ReturnType<typeof readOptions>> | undefined;
  const opened =
    req.write5 || req.write6
      ? async (client: DatomicClient, db: string) => {
          before = await readOptions(client, db);
          assert.equal(before.packedJournalCount, 0);
        }
      : undefined;
  const r =
    req.study === "pulse"
      ? await runArm(url, req.arm.nonce, policy.grouping, true, {
          pulse: true,
          smallPulse: req.enhanced,
          bootstrapUrl,
          denseJournalIds: req.write5 || req.write6,
          ...(opened ? { opened } : {}),
        })
      : await fieldArm(
          url,
          bootstrapUrl,
          req.arm.nonce,
          dir,
          req.enhanced,
          req.write5 || req.write6,
          opened,
        );
  if (req.write5 || req.write6) {
    assert(before);
    const client = new DatomicClient(url, 35_000);
    try {
      const after = await readOptions(client, r.db);
      assert.equal(before.scope, after.scope);
      assert.equal(before.selectedDefinitionSha256, after.selectedDefinitionSha256);
      assert(BigInt(after.basis) > BigInt(before.basis));
      if (policy.packedJournal) assert(after.packedJournalCount > 0);
      else assert.equal(after.packedJournalCount, 0);
      if (req.write6) {
        const phase = r.phases[0]!;
        const sample =
          "rows" in phase
            ? phase.rows.find((row) => row.p === phase.headBefore + 1)
            : phase.records.find((row) => row.pos === phase.firstPosition);
        assert(sample);
        const witness = await verifyJournalRead(
          client,
          r.db,
          {
            id: sample.id,
            t: sample.t,
            position: "p" in sample ? sample.p : sample.pos,
          },
          policy.packedJournal,
        );
        write(path.join(dir, "journal-witness.json"), {
          nonce: req.arm.nonce,
          source: req.arm.source,
          slot: req.arm.slot,
          ...witness,
        });
      }
      write(path.join(dir, "write-options.json"), {
        nonce: req.arm.nonce,
        source: req.arm.source,
        slot: req.arm.slot,
        before,
        after,
      });
    } finally {
      client.close();
    }
  }
  write(path.join(dir, "raw.json"), r);
  const seedHead =
    "headBefore" in r.phases[0]! ? r.phases[0]!.headBefore : r.phases[0]!.firstPosition - 1;
  write(
    path.join(dir, "seed-readback.json"),
    await verifyPopulation(url, {
      scope: r.scope,
      db: r.db,
      phases: [{ firstPosition: seedHead + 1 }],
    }),
  );
} else if (action === "run") {
  assert(
    dir &&
      source &&
      batch &&
      /^[a-z][a-z0-9]{2,14}$/.test(batch) &&
      (requested === "pulse" || requested === "rates") &&
      (profile === undefined ||
        profile === "--enhanced" ||
        profile === "--write5" ||
        profile === "--write6"),
  );
  const study: Study = requested,
    write5 = profile === "--write5",
    write6 = profile === "--write6",
    enhanced = profile === "--enhanced" || write5 || write6,
    pred = predictionPath(enhanced, write5, write6);
  assert.equal(git("rev-parse", "HEAD"), source);
  assert.equal(git("diff", "--name-only", "HEAD"), "");
  const out = path.join(dir, "results");
  fs.mkdirSync(out);
  const predictionSha256 = await fileHash(pred);
  const prediction = read(pred);
  assert.equal(
    prediction.schema,
    write6
      ? "dx-w1/write6-predictions/1"
      : write5
        ? "dx-w1/write5-predictions/1"
        : enhanced
          ? "dx-w1/write4-predictions/1"
          : "dx-w1/field-predictions/1",
  );
  assert.equal(prediction.beforeServerRun, true);
  fs.copyFileSync(pred, path.join(out, "predictions.json"), fs.constants.COPYFILE_EXCL);
  assert.equal(await fileHash(path.join(out, "predictions.json")), predictionSha256);
  const inventory = sourceInventory(repo);
  for (const f of git("ls-files", "lab/experiments/EXP-DX1/w1", "packages/datomic/src").split("\n"))
    inventory.files[f] = await fileHash(f);
  write(path.join(out, "source.json"), inventory);
  const arms = [];
  for (const [index, mode] of modes(study, enhanced, write5, write6).entries()) {
    const attempt = path.join(out, "arm-" + (index + 1));
    fs.mkdirSync(attempt);
    const arm = {
      source,
      slot: `tx2-dxscale1-w1-${batch}-${index + 1}`,
      nonce: randomUUID(),
      population: "deep" as const,
      lookup: "individual" as const,
      readers: false,
    };
    const policy = fieldPolicy(mode, enhanced);
    if (write6)
      assert.equal(
        prediction.arms[mode].journalAcceptanceEligible,
        policy.journalAcceptanceEligible,
      );
    write(path.join(attempt, "request.json"), {
      arm,
      mode,
      study,
      enhanced,
      write5,
      ...(write6 ? { write6 } : {}),
      predictionSha256,
    });
    const r = await withStack(
      attempt,
      arm,
      async (env) => {
        execFileSync(
          "taskset",
          [
            "-c",
            "3,5,6,7",
            process.execPath,
            "--import",
            "tsx",
            path.join(import.meta.dirname, "server.ts"),
            "worker",
            attempt,
          ],
          { cwd: repo, env, stdio: "inherit", timeout: 24 * 3600_000 },
        );
        const rawFile = path.join(attempt, "raw.json"),
          seedFile = path.join(attempt, "seed-readback.json"),
          raw = read(rawFile),
          check = read(seedFile);
        const phases = validateArm(raw, mode, study, arm.nonce, enhanced);
        assert.equal(check.facts, 16_245_050);
        assert.equal(check.digest, pooledDigest);
        const first = raw.phases[0];
        assert.equal(check.seedCut, first.headBefore ?? first.firstPosition - 1);
        const writerExpectation = path.join(attempt, "writer-expectation.json");
        const expected = read(writerExpectation);
        assert.deepEqual(raw.writerOptions.expected, expected);
        verifyWriteOptions(
          raw.writerOptions.observed,
          raw.db,
          expected,
          raw.writerOptions.historyRange,
        );
        assert.equal(raw.writerOptions.observed.position, check.seedCut);
        return {
          arm,
          mode,
          ...(enhanced ? { policy } : {}),
          db: raw.db,
          writerOptions: raw.writerOptions,
          writerExpectationSha256: await fileHash(writerExpectation),
          scope: raw.scope,
          seed: pooledDigest,
          seedFacts: check.facts,
          phases,
          predictionSha256,
          rawSha256: await fileHash(rawFile),
          seedReadbackSha256: await fileHash(seedFile),
          ...(write5 || write6
            ? { writeOptionsSha256: await fileHash(path.join(attempt, "write-options.json")) }
            : {}),
          ...(write6
            ? { journalWitnessSha256: await fileHash(path.join(attempt, "journal-witness.json")) }
            : {}),
        };
      },
      policy.grouping,
      mode,
      enhanced,
    );
    write(path.join(attempt, "summary.json"), r);
    arms.push(r);
  }
  const comparison = {
    study,
    source,
    enhanced,
    write5,
    ...(write6 ? { write6 } : {}),
    arms,
    predictionSha256,
  };
  validateComparison(comparison, study, source, batch, enhanced, write5, write6);
  write(path.join(out, "comparison.json"), comparison);
} else throw Error("Use the published W1 campaign controller");
