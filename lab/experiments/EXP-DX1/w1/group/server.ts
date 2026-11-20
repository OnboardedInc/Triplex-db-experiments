import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { withStack } from "../bench.ts";
import { sourceInventory } from "../../scale1/source.ts";
import { fileHash } from "../../scale1/measurements.ts";
import { accounts, pooledDigest } from "./population.ts";
import { verifyPopulation } from "./seed-readback.ts";
import { runArm } from "./workload.ts";
import { verifyWriteOptions } from "../write-options.ts";

const write = (f: string, x: unknown) =>
  fs.writeFileSync(f, JSON.stringify(x, null, 2) + "\n", { flag: "wx" });
const [, , action, directory, source, batch] = process.argv;
const repo = path.resolve(import.meta.dirname, "../../../../..");
if (action === "worker") {
  const { arm, grouped } = JSON.parse(
    fs.readFileSync(path.join(directory!, "request.json"), "utf8"),
  );
  assert.equal(process.env.TRIPLEX_TRACE_SOURCE, arm.source);
  assert.equal(process.env.TRIPLEX_TRACE_SLOT, arm.slot);
  const result = await runArm(process.env.DATOMIC_URL!, arm.nonce, grouped, true);
  write(path.join(directory!, "raw.json"), result);
  write(
    path.join(directory!, "seed-readback.json"),
    await verifyPopulation(process.env.DATOMIC_URL!, result),
  );
} else if (action === "run") {
  assert(
    directory &&
      source &&
      batch &&
      /^[a-z][a-z0-9]{2,14}$/.test(batch) &&
      /^[a-f0-9]{40}$/.test(source),
  );
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
  assert.equal(git("rev-parse", "HEAD"), source);
  assert.equal(git("diff", "--name-only", "HEAD"), "");
  const out = path.join(directory, "results");
  fs.mkdirSync(out);
  const inventory = sourceInventory(repo);
  for (const f of git("ls-files", "lab/experiments/EXP-DX1/w1", "packages/datomic/src").split("\n"))
    inventory.files[f] = await fileHash(f);
  write(path.join(out, "source.json"), inventory);
  const summaries = [];
  for (const grouped of [false, true]) {
    const i = grouped ? 2 : 1,
      attempt = path.join(out, "arm-" + i);
    fs.mkdirSync(attempt);
    const arm = {
      source,
      slot: `tx2-dxscale1-w1-${batch}-${i}`,
      nonce: randomUUID(),
      population: "deep" as const,
      lookup: "individual" as const,
      readers: false,
    };
    write(path.join(attempt, "request.json"), { arm, grouped });
    const result = await withStack(
      attempt,
      arm,
      async (env) => {
        // [DX-W1] Why: pin the external sender, bind the frozen roster and keep the full stream on the assigned host.
        // Rejected: adding ten per-scope rates or inferring shared capacity from independently seeded databases.
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
        const raw = path.join(attempt, "raw.json"),
          r = JSON.parse(fs.readFileSync(raw, "utf8")) as Awaited<ReturnType<typeof runArm>>;
        const writerExpectation = path.join(attempt, "writer-expectation.json");
        const writerOptions = r.writerOptions!;
        const expected = JSON.parse(fs.readFileSync(writerExpectation, "utf8"));
        assert.deepEqual(writerOptions.expected, expected);
        verifyWriteOptions(writerOptions.observed, r.db, expected, writerOptions.historyRange);
        assert.equal(writerOptions.observed.position, r.phases[0]!.firstPosition - 1);
        const readback = JSON.parse(
          fs.readFileSync(path.join(attempt, "seed-readback.json"), "utf8"),
        );
        assert.deepEqual(readback, {
          facts: 16_245_050,
          seedCommits: r.phases[0]!.firstPosition - 1,
          seedCut: r.phases[0]!.firstPosition - 1,
          digest: pooledDigest,
        });
        assert.equal(r.nonce, arm.nonce);
        assert.equal(r.grouped, grouped);
        assert.equal(JSON.parse(r.scope)[3], arm.nonce + "-load");
        assert.equal(r.db, "s2-" + Buffer.from(r.scope).toString("base64url"));
        assert.deepEqual(
          r.seeds.map((s) => [s.account, s.subjects, s.facts]),
          accounts.map((a) => [a.index, 10000, 1624505]),
        );
        assert.deepEqual(
          r.phases.map((p) => p.name),
          ["alone", "one", "nine", "all"],
        );
        for (const phase of r.phases) {
          assert(
            phase.wall >= 59_900 &&
              phase.count === phase.records.length &&
              phase.records.filter((x) => x.probe).length === 600,
          );
          assert.equal(phase.physical, new Set(phase.records.map((x) => x.t)).size);
          assert.equal(new Set(phase.records.map((x) => x.pos)).size, phase.count);
          const probes = phase.records.filter((r) => r.probe);
          for (const r of probes) {
            const prefix = phase.name + "-q-9-";
            assert(r.id.startsWith(prefix) && r.account === 9);
            const index = Number(r.id.slice(prefix.length));
            assert(Number.isInteger(index) && index >= 0 && index < 600);
            assert(
              Math.abs(r.started + r.elapsed - r.scheduled - index * 100) < 0.001,
              "Quiet offer schedule changed",
            );
          }
          assert.equal(new Set(probes.map((r) => r.id)).size, 600);
          const sorted = (rs: typeof probes) => rs.map((r) => r.scheduled).sort((a, b) => a - b);
          const percentile = (values: number[], q: number) =>
            values[Math.ceil(q * values.length) - 1]!;
          assert.equal(phase.quietMs!.p99, percentile(sorted(probes), 0.99));
          for (const [account, metrics] of Object.entries(phase.byAccount)) {
            const observed = sorted(phase.records.filter((r) => r.account === Number(account)));
            assert.equal(metrics.count, observed.length);
            assert.equal(metrics.commitMs.p50, percentile(observed, 0.5));
            assert.equal(metrics.commitMs.p99, percentile(observed, 0.99));
          }
          if (grouped && phase.name !== "alone") assert(phase.physical < phase.count);
        }
        const baseline = r.phases[0]!.quietMs!.p99;
        const phases = r.phases.map(({ records, ...p }) => ({
          ...p,
          quietP99Ratio: p.quietMs!.p99 / baseline,
          recordsSha256: createHash("sha256").update(JSON.stringify(records)).digest("hex"),
        }));
        return {
          arm,
          grouped,
          scope: r.scope,
          db: r.db,
          seed: pooledDigest,
          seeds: r.seeds,
          phases,
          writerOptions,
          writerExpectationSha256: await fileHash(writerExpectation),
          rawSha256: await fileHash(raw),
          seedReadbackSha256: await fileHash(path.join(attempt, "seed-readback.json")),
        };
      },
      grouped,
    );
    write(path.join(attempt, "summary.json"), result);
    summaries.push(result);
  }
  assert.notEqual(summaries[0]!.db, summaries[1]!.db);
  assert.deepEqual(summaries[0]!.seeds, summaries[1]!.seeds);
  write(path.join(out, "comparison.json"), {
    kind: "group-commit",
    source,
    seed: pooledDigest,
    arms: summaries,
  });
} else throw Error("Use the published W1 group controller");
