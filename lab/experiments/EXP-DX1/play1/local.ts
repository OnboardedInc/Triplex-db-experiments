import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, statfsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { openInstance } from "../../../../examples/playground/instance.ts";
import { loadFixture } from "../../../../examples/playground/fixture.ts";
import { liveGate } from "../../../../examples/playground/live-gate.ts";
import { runSnapshot } from "../../../../examples/playground/snapshot-run.ts";
import { checkPlan, type SeedPlan } from "../../../../examples/playground/snapshot.ts";
import {
  caps,
  dockerClient,
  hash,
  repo,
  Stack,
  type Docker,
} from "../../../../examples/playground/stack.ts";
import {
  admission,
  DOCKER_HOST,
  git,
  listTx2Containers,
  readOwner,
  slotInfo,
  vmDisk,
  withPool,
} from "../../../bin/lib.mjs";

const run = promisify(execFile);
type Config = Parameters<typeof slotInfo>[0];
type Slot = ReturnType<typeof slotInfo>;
type Manager = {
  acquireSlot: (slot: Slot, holder: string, experiment: string) => { created: boolean };
  releaseSlot: (slot: Slot) => void;
  assertMeasureAdmission: (holder: string) => void;
};

async function browserGate(out: string, url: string) {
  const result = await run(
    process.execPath,
    [
      "node_modules/@playwright/test/cli.js",
      "test",
      "--config=playwright.playground.config.ts",
      "--output",
      join(out, "browser"),
    ],
    { cwd: repo, timeout: 180_000, env: { ...process.env, PLAYGROUND_TEST_URL: url } },
  ).then(
    (output) => ({ output }),
    (error: Error & { stdout?: string; stderr?: string }) => ({ output: error, error }),
  );
  await writeFile(
    join(out, "browser.txt"),
    (result.output.stdout ?? "") + (result.output.stderr ?? ""),
    { flag: "wx" },
  );
  console.log(result.output.stdout);
  return "error" in result ? result.error : undefined;
}

async function writerGate(
  urls: { write: string; read: string },
  source: string,
  probe: { attempt: string; ordered: boolean },
) {
  // [DX-INT1] Why: the live playground sets its SDK tracing before this extra probe opens.
  // Rejected: importing the SDK during launcher startup and silently changing demo tracing.
  const [{ DatomicClient, orderedSaveIdentity }, { decodeRowText }, { command }] = await Promise.all([
    import("../../../../packages/datomic/dist/index.js"),
    import("../../../../packages/datomic/dist/rowText.js"),
    import("../w1/group/workload.ts"),
  ]);
  const write = new DatomicClient(urls.write);
  const read = new DatomicClient(urls.read);
  const scope = JSON.stringify(["triplex-scope-v1", "test", "play1-writer", probe.attempt, 0]);
  const entity = "acct/playground/lean-writer";
  const attr = ":person/status";
  const value = (text: string) => ({ e: entity, a: attr, v: { type: "string" as const, value: text } });
  try {
    const { db, created } = await write.create(scope, "lean", true, 30000);
    assert(created);
    await write.transact(db, command("play1-writer-seed", [value("before")]));
    const { handle, position } = await read.begin(db);
    try {
      const readAt = (recordedPosition: number) => read.rows(db, {
        entityIds: [entity], basis: { recordedPosition, validAt: 0 },
      });
      const before = await readAt(position);
      assert.deepEqual(before.map((row) => row.value_string), ["before"]);
      const opts = await write.request<{
        attempt: string;
        database: string;
        gatewaySourceHash: string;
        position: number;
        subjectSave?: boolean;
        subjectNumericOwner?: boolean;
        subjectOrderedIds?: boolean;
        subjectFunction?: string;
        subjectPrefetch?: boolean;
        options: { groupCommit: boolean };
      }>("GET", "/v1/db/" + db + "/write-options");
      assert.deepEqual(
        [opts.attempt, opts.database, opts.position, opts.gatewaySourceHash],
        [probe.attempt, db, position, source],
      );
      assert.deepEqual(
        [opts.subjectSave, opts.subjectNumericOwner, opts.subjectOrderedIds, opts.subjectPrefetch].map(Boolean),
        [probe.ordered, probe.ordered, probe.ordered, false],
      );
      assert.equal(opts.options.groupCommit, !probe.ordered);
      const block = probe.ordered ? orderedSaveIdentity() : undefined;
      const operation = "play1-writer-save";
      const input = {
        ...command(operation, [value("after")], before, true, false, block),
        sourceK: position,
        live: before.map((row) => row.id),
        groupAccount: "playground",
        writeClass: "live" as const,
      };
      const ack = await write.transact(db, input) as {
        subjectSave?: string;
        subjectOrderedIds?: boolean;
        operationId: string;
        position: { v: string };
      };
      const cut = Number(ack.position.v), expected = input.claims[0]!.txId;
      assert.deepEqual([ack.operationId, cut], [operation, position + 1]);
      assert.equal(await read.claim(db, operation, cut), expected);
      if (probe.ordered) {
        assert.match(opts.subjectFunction ?? "", /^:triplex\.subject\/v-[a-f0-9]{24}$/);
        assert.deepEqual([ack.subjectSave, ack.subjectOrderedIds], [opts.subjectFunction, true]);
      } else assert(!ack.subjectOrderedIds);
      const { transactions } = await read.request<{ transactions: [string, number, string[]][] }>(
        "POST", "/v2/db/" + db + "/transactions", { after: position, limit: 1 });
      assert.equal(transactions.length, 1);
      const [tx, observed, wire] = transactions[0]!;
      assert.deepEqual([tx, observed], [expected, cut]);
      const ids = wire.map(decodeRowText).map((row) => row.id).sort();
      const expectedJournalIds = input.rows
        .filter((row) => row.entity_type === "_Transaction")
        .map((row) => row.id)
        .sort();
      assert.deepEqual(ids, expectedJournalIds);
      const rows = await Promise.all([readAt(position), readAt(cut)]);
      assert.deepEqual(
        rows.map((batch) => batch.map((row) => [row.id, row.value_string])),
        [[[before[0]!.id, "before"]], [[input.rows[0]!.id, "after"]]],
      );
      return { ...probe, db, source, position, cut, tx, ids, installed: opts.subjectFunction };
    } finally {
      await read.release(db, handle);
    }
  } finally {
    write.close();
    read.close();
  }
}

async function dumpProbe(docker: Docker, prefix: string, out: string) {
  const pg = prefix + "-pg";
  const writers = [prefix + "-write", prefix + "-read", prefix + "-tx"];
  // [DX-PLAY1] Why: compare the dump to the same immutable rows. Datomic indexing can
  // write new SQL values even after the last API call. Rejected: hashing a moving catalog.
  for (const name of writers)
    assert.equal(
      await docker(["inspect", "--format", '{{index .Config.Labels "triplex.playground"}}', name]),
      prefix,
    );
  await docker(["stop", "--time", "10", ...writers]);

  const sql = (db: string, cmd: string) =>
    docker([
      "exec",
      pg,
      "psql",
      "-XAt",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      db,
      "-c",
      cmd,
    ]);
  const source = await sql("datomic", "SELECT pg_database_size(current_database())");
  const start = performance.now();
  await docker([
    "exec",
    pg,
    "pg_dump",
    "-U",
    "postgres",
    "-Fc",
    "-Z",
    "6",
    "-d",
    "datomic",
    "-f",
    "/tmp/playground.dump",
  ]);
  const dumpMs = performance.now() - start;
  const saved = join(out, "postgres.dump");
  await docker(["cp", pg + ":/tmp/playground.dump", saved]);
  const restore = performance.now();
  await docker(["exec", pg, "createdb", "-U", "postgres", "playground_restore"]);
  try {
    await docker([
      "exec",
      pg,
      "pg_restore",
      "--exit-on-error",
      "-U",
      "postgres",
      "-d",
      "playground_restore",
      "/tmp/playground.dump",
    ]);
    const restoreMs = performance.now() - restore;
    // [DX-PLAY1] Why: compare every restored row, binary value and key in both directions; a dump exit code proves no content.
    // Rejected: calling a file size comparison a restorable database.
    const table =
      "SELECT count(*), encode(sha256(convert_to(string_agg(encode(sha256(convert_to(row(id,rev,map,encode(val,'hex'))::text, 'UTF8')), 'hex'), '' ORDER BY id), 'UTF8')), 'hex') FROM datomic_kvs";
    const original = await sql("datomic", table);
    const restored = await sql("playground_restore", table);
    assert.match(original, /^[1-9][0-9]*\|[a-f0-9]{64}$/);
    assert.equal(restored, original);
    return {
      dumpBytes: (await stat(saved)).size,
      dumpSha256: hash(await readFile(saved)),
      dumpMs,
      restoreMs,
      databaseBytes: Number(source),
      rowDigest: original,
    };
  } finally {
    await docker(["exec", pg, "dropdb", "-U", "postgres", "playground_restore"]);
  }
}

export async function local(
  options: {
    holder?: string;
    out?: string;
    browser?: boolean;
    portable?: boolean;
    snapshot?: string;
    deep?: string;
    daily?: string;
    writer?: string;
  },
  config: Config,
  manager: Manager,
) {
  const holder = options.holder;
  // [DX-INT1] Why: the integrated playground diagnostic owns its own portable slot and image.
  // Rejected: using another builder's holder identity or cached image.
  assert(process.platform === "darwin" && (holder === "DX-PLAY1" || (holder === "DX-THIN1" && options.portable)));
  assert(
    (process.env.TX2_DOCKER_HOST ?? DOCKER_HOST) === DOCKER_HOST,
    "Use the private lab Docker endpoint",
  );
  assert(options.out, "Pass a fresh evidence directory");
  assert(options.writer === undefined || (options.portable && !options.snapshot &&
    (options.writer === "grouped" || options.writer === "subject")));
  const writerProbe = options.writer === undefined ? undefined : {
    ordered: options.writer === "subject", attempt: randomUUID(),
  };
  const out = resolve(options.out);
  await mkdir(out);
  const prefix = "tx2-dxplay1-" + randomBytes(6).toString("hex");
  const installed = dockerClient(DOCKER_HOST);
  let slot: Slot | undefined;
  let instance: Awaited<ReturnType<typeof openInstance>> | undefined;
  const shutdown = new AbortController();
  const abort = () => shutdown.abort();
  process.once("SIGTERM", abort);
  process.once("SIGINT", abort);
  const fixture = loadFixture();
  const plan: SeedPlan =
    options.deep === undefined
      ? "small"
      : {
          deep: Number(options.deep),
          daily: options.daily === "real" ? "real" : Number(options.daily),
        };
  checkPlan(plan);
  const sources = [
    "package.json",
    "pnpm-lock.yaml",
    "lab/bin/engine.mjs",
    "lab/config/datomic/Dockerfile",
    "examples/playground/service.ts",
    "examples/playground/stack.ts",
    "examples/playground/live-gate.ts",
    "examples/playground/people.json.gz",
    "examples/playground/fixture.ts",
    "lab/experiments/EXP-DX1/play1/local.ts",
    "packages/dashboard/playground/ui.ts",
    "e2e/playground-datomic.spec.ts",
  ];
  const sourceHashes = Object.fromEntries(
    await Promise.all(sources.map(async (name) => [name, hash(await readFile(join(repo, name)))])),
  );
  try {
    while (!slot) {
      shutdown.signal.throwIfAborted();
      const disk = statfsSync(repo);
      assert(disk.bavail * disk.bsize >= 10 * 2 ** 30, "Below the 10 GiB playground build floor");
      await withPool((ledger) => {
        // [DX-PLAY1] Why: ordinary correctness holds one heavy token.
        // Rejected: waiting for a foreign measurement lease while that owner drains this token.
        manager.assertMeasureAdmission(holder);
        const live = listTx2Containers({ all: true });
        const candidate = ["s1", "s2", "s3"]
          .map((name) => slotInfo(config, "datomic", name))
          .find(
            (info) => !existsSync(info.lockDir) && !live.some((c) => c.name === info.container),
          );
        const roles = Object.entries(caps);
        const request = {
          container: prefix,
          memBytes: roles.reduce((n, [, mib]) => n + mib, 0) * 2 ** 20,
          diskForecastBytes: 3 * 2 ** 30,
        };
        if (
          !candidate ||
          !admission({
            config,
            reservations: ledger.reservations,
            running: live,
            request,
            diskUsedBytes: vmDisk(config).usedBytes,
          }).ok
        )
          return;
        assert(manager.acquireSlot(candidate, holder, "DX-PLAY1-playground").created);
        slot = candidate;
        for (const [role, mib] of roles)
          ledger.reservations.push({
            container: prefix + "-" + role,
            lane: "datomic",
            slot: candidate.slot,
            holder,
            pid: process.pid,
            state: "play1",
            cpus: 2,
            memBytes: mib * 2 ** 20,
            diskForecastBytes: role === "pg" ? request.diskForecastBytes : 0,
          });
      });
      if (!slot) {
        console.log("Waiting for an exclusive playground slot");
        await delay(20_000, undefined, { signal: shutdown.signal });
      }
    }
    const image = config.lanes.datomic.imageId as string;
    assert.match(image, /^sha256:[0-9a-f]{64}$/);
    if (!options.portable)
      assert.equal(await installed(["image", "inspect", "--format", "{{.Id}}", image]), image);
    const stackOptions = {
      docker: installed,
      prefix,
      directory: join(out, "instance"),
      fixture,
      writerProbe,
      apiPort: 0,
      ports: { write: 0, read: 0 },
      signal: shutdown.signal,
      // [DX-PLAY1] Why: record the synthetic gate's backend error before its isolated stack is removed.
      // Rejected: exposing backend diagnostics to dashboard or agent clients.
      onFault: (action: string, error: unknown) => console.error("Action fault", action, error),
      ...(!options.portable ? { cachedImage: image } : {}),
    };
    assert.deepEqual(await new Stack(stackOptions).inventory(), {
      ps: [],
      volume: [],
      network: [],
      image: [],
    });
    if (options.snapshot) {
      const sourceHead = git(["rev-parse", "HEAD"]);
      assert.equal(git(["status", "--porcelain"]), "", "Snapshot gates need committed source");
      await runSnapshot({
        ...stackOptions,
        plan,
        out,
        tier: options.snapshot,
        sourceHead,
        slot: slot.slot,
        timingClass: "laptop diagnostic",
        ...(options.browser
          ? {
              verifyBrowser: async (url: string) => {
                const error = await browserGate(out, url);
                if (error) throw error;
              },
            }
          : {}),
        beforeSeal: () => {
          assert.equal(git(["rev-parse", "HEAD"]), sourceHead);
          assert.equal(
            git(["status", "--porcelain"]),
            "",
            "Snapshot source changed during the gate",
          );
          const owner = readOwner(slot!);
          assert.equal(owner?.holder, holder);
          assert.equal(owner?.pid, process.pid);
        },
      });
      return;
    }
    instance = await openInstance(stackOptions);
    const ready = await instance.ready;
    console.log("Playground ready", instance.server.url, Math.round(ready.seedMs) + " ms seed");
    const stats = await liveGate(instance.server.url, fixture.checksum);
    await writeFile(join(out, "actions.json"), JSON.stringify(stats, null, 2) + "\n", {
      flag: "wx",
    });
    if (writerProbe) {
      const observed = await writerGate(ready.urls, ready.gatewaySource, writerProbe);
      await writeFile(join(out, "writer.json"), JSON.stringify(observed, null, 2) + "\n", { flag: "wx" });
    }
    const browserError = options.browser ? await browserGate(out, instance.server.url) : undefined;
    const transactor = JSON.parse(
      await installed(["inspect", "--format", "{{json .State}}", prefix + "-tx"]),
    ) as { Running: boolean; OOMKilled: boolean; ExitCode: number };
    await writeFile(join(out, "transactor-state.json"), JSON.stringify(transactor) + "\n", {
      flag: "wx",
    });
    const snapshot = await dumpProbe(installed, prefix, out);
    await writeFile(
      join(out, "size.json"),
      JSON.stringify(
        {
          dump: snapshot,
          fixtureBytes: (await stat(join(repo, "examples/playground/people.json.gz"))).size,
          bootMs: ready.stackMs,
          replayMs: ready.seedMs,
          residentCapsMiB: caps,
          timingClass: "laptop diagnostic",
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
    if (browserError) throw browserError;
    assert(transactor.Running && !transactor.OOMKilled, "The transactor did not stay alive");
    for (const [name, sha256] of Object.entries(sourceHashes))
      assert.equal(hash(await readFile(join(repo, name))), sha256, "Source drifted: " + name);
    await writeFile(
      join(out, "run.json"),
      JSON.stringify(
        {
          head: git(["rev-parse", "HEAD"]),
          prefix,
          holder,
          slot: slot.slot,
          sourceHashes,
          gatewaySource: ready.gatewaySource,
          fixture: fixture.checksum,
          browserRequested: Boolean(options.browser),
          writerProbe,
          timingClass: "laptop diagnostic",
          portableImage: Boolean(options.portable),
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
  } catch (error) {
    await writeFile(
      join(out, "failed.txt"),
      String(error instanceof Error ? error.stack : error) + "\n",
      { flag: "wx" },
    );
    throw error;
  } finally {
    process.removeListener("SIGINT", abort);
    process.removeListener("SIGTERM", abort);
    if (instance) {
      const clean = await instance.close();
      assert.deepEqual(clean, { ps: [], volume: [], network: [], image: [] });
      assert.equal(existsSync(join(out, "instance")), false);
      await assert.rejects(
        fetch(instance.server.url + "/health", { signal: AbortSignal.timeout(3000) }),
      );
      await writeFile(join(out, "cleanup.json"), JSON.stringify(clean) + "\n", { flag: "wx" });
    }
    if (slot) {
      const exact = slot;
      await withPool((ledger) => {
        const owner = readOwner(exact);
        assert.equal(owner?.holder, holder);
        assert.equal(owner?.pid, process.pid);
        ledger.reservations = ledger.reservations.filter(
          (row: { holder: string; container: string }) =>
            !(row.holder === holder && row.container.startsWith(prefix + "-")),
        );
        manager.releaseSlot(exact);
      });
    }
  }
}
