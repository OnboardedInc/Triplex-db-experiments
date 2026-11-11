import fs from "node:fs";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { seedW0 } from "./w0-seed.ts";
import { recordReplicaHttp } from "./w0-replica-record.ts";
import { DatomicClient, Replica } from "../../../packages/datomic/dist/index.js";
import { openComposition } from "./composition.ts";
import { runtimeApi } from "./triplex.ts";
import { openBulkCounts } from "../../experiments/EXP-DX1/h6/bulk-counts.ts";
import {
  W0,
  V_W0,
  worldOf,
  worldCanonical,
  canonical,
  reachableRows,
  triplexValue,
  worldSha256,
} from "./w0-world.ts";
import { subjectList } from "./sweep.ts";
import { evaluateAll } from "./w0-replica.ts";
import { DomainOracle } from "./w0-gates.ts";
import { startW0Live, matchW0Live } from "./w0-replica-live.ts";
// [DX-R1] Why: this explicit entry point leaves the existing full-sweep gates and H8's path unchanged.
// Rejected: relabelling old controller PASS rows as replica acceptance.
export async function runReplicaDriver(argv: string[]) {
  const opt = (k: string, d = "") => {
    const i = argv.indexOf("--" + k);
    return i < 0 ? d : argv[i + 1];
  };
  const N = Number(opt("rung", "1000")),
    scope = opt("scope"),
    workers = Number(opt("workers", "3"));
  if (!scope || !Number.isSafeInteger(N) || N < 1)
    throw new Error("Existing seeded scope and positive N required");
  const subjects = subjectList(N),
    comp = await openComposition("reach", "datomic", scope);
  const client = new DatomicClient(
    process.env.DATOMIC_READ_URLS?.split(",")[0] ?? comp.backend.url,
    35000,
    64 * 1024 ** 2,
    { entityCacheBytes: 1, rowCacheBytes: 1 },
  );
  const db =
    "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(scope))).toString("base64url");
  // [DX-R2] Why: feed publication is already visible on the writer peer; 256 read pulls must not queue its wakeup.
  // Rejected: sharing the saturated read-peer HTTP queue for both feed and bootstrap.
  const feedClient = new DatomicClient(comp.backend.url, 35000, 64 * 1024 ** 2, {
    entityCacheBytes: 1,
    rowCacheBytes: 1,
  });
  const base = Replica.source(client, db, () => comp.currentPosition(), V_W0),
    recordDir = opt("record-dir");
  base.feed = Replica.source(feedClient, db, () => comp.currentPosition(), V_W0).feed;
  const recorder = recordDir ? recordReplicaHttp(recordDir) : undefined;
  if (recorder)
    for (const method of ["page", "feed"] as const) {
      const original = base[method] as Function;
      (base as any)[method] = (...args: any[]) => recorder.around(() => original(...args));
    }
  let recordedInline = false,
    pageReads = 0,
    feedReads = 0;
  const originalPage = base.page,
    originalFeed = base.feed;
  base.page = (...args) => {
    pageReads++;
    return originalPage(...args);
  };
  base.feed = async (...args) => {
    feedReads++;
    const result = await originalFeed(...args);
    if (!recordedInline && result.transactions.length) {
      recordedInline = true;
      console.log(JSON.stringify({ kind: "inline-feed-sample", request: args, response: result }));
    }
    return result;
  };
  const replica = new Replica(base, V_W0),
    oracle = new DomainOracle();
  const report: any = { classification: "DIAGNOSTIC", acceptance: false, N, scope, workers };
  let traffic: Awaited<ReturnType<typeof startW0Live>> | undefined;
  let bulkCounts: Awaited<ReturnType<typeof openBulkCounts>> | undefined;
  const followTo = async (p: number) => {
    while (replica.position < p) await replica.followOnce(1000, p);
    if (!replica.isValid || replica.position !== p)
      throw new Error("Replica did not reach exact acknowledged cut");
  };
  const recordedPage = (roots: readonly string[], basis: { position: number; validAt: number }) =>
    recorder ? recorder.around(() => comp.sweepPage(roots, basis)) : comp.sweepPage(roots, basis);
  const equalWorlds = async (cut: number, fingerprint = false) => {
    const hashes = [createHash("sha256"), createHash("sha256")];
    hashes.forEach((h) => h.update("["));
    let facts = 0;
    const snap = await replica.snapshotAt(cut);
    let worlds = 0;
    for (let i = 0; i < subjects.length; i += 64) {
      const ids = subjects.slice(i, i + 64),
        page = await recordedPage(ids, { position: cut, validAt: V_W0 });
      for (const subject of ids) {
        if (
          worldCanonical(worldOf(subject, snap.world(subject))) !==
          worldCanonical(worldOf(subject, reachableRows([subject], page.rows)))
        )
          throw new Error("World equality mismatch " + subject);
        if (fingerprint) {
          const world = worldOf(subject, reachableRows([subject], page.rows));
          const output = W0.sweepSubject(world, W0.R2, {
            tx: cut,
            validTime: W0.POPULATION_VALID_TIME,
          });
          if ("error" in output) throw new Error(output.error);
          hashes[0].update((worlds ? "," : "") + worldCanonical(world));
          hashes[1].update((worlds ? "," : "") + output.json);
          facts += world.facts.length;
        }
        worlds++;
      }
    }
    if (fingerprint) {
      hashes.forEach((h) => h.update("]"));
      const actual = {
        basisTx: cut,
        facts,
        worlds: "sha256:" + hashes[0].digest("hex"),
        R2: "sha256:" + hashes[1].digest("hex"),
      };
      const { stdout } = await promisify(execFile)(
        "python3",
        [
          "-I",
          "lab/oracles/domain/cli.py",
          "--population",
          "--rung",
          String(N),
          "--fingerprint",
          "--no-stats",
        ],
        { maxBuffer: 4 << 20 },
      );
      const full = JSON.parse(stdout).fingerprint;
      const expected = {
        basisTx: full.basisTx,
        facts: full.facts,
        worlds: full.worlds,
        R2: full.R2,
      };
      if (canonical(actual) !== canonical(expected))
        throw new Error("Independent seed fingerprint mismatch");
      console.log(JSON.stringify({ kind: "seed-fingerprint", observed: actual, expected }));
      report.seedFingerprint = actual;
    }
    return { snap, worlds };
  };
  const commit = async (operations: any[], id: string) => {
    const r = await comp.transact(operations, { commandId: "dxr1:" + id });
    if (!r.ok) throw new Error(r.tag);
    return r.value;
  };
  try {
    // [DX-R1] Why: reuse H6's qualified full-history transport; per-entity HTTP would consume the bounded hold.
    // Rejected: replacing stored history counts with client ACK totals or changing their expected values.
    bulkCounts = await openBulkCounts(comp);
    comp.storeCounts = bulkCounts.count;
    if (argv.includes("--seed")) {
      if (!recordDir) throw new Error("Seed log directory required");
      fs.mkdirSync(recordDir, { recursive: true });
      const log = recordDir + "/../seed.ndjson";
      report.seed = await seedW0(comp, N, log, async () => {
        if (process.env.DX_R1_DEADLINE && Date.now() > Number(process.env.DX_R1_DEADLINE) - 180000)
          throw new Error("Seed exceeded its reserved portion of the hold");
      });
      await pipeline(
        fs.createReadStream(log),
        createGzip(),
        fs.createWriteStream(log + ".gz", { flags: "wx" }),
      );
      fs.unlinkSync(log);
      console.log(JSON.stringify({ kind: "seed", ...report.seed }));
    }
    (globalThis as any).gc?.();
    const initialHeap = process.memoryUsage().heapUsed;
    const start = performance.now();
    let cut = await comp.currentPosition();
    await replica.bootstrap(subjects, cut);
    (globalThis as any).gc?.();
    const bootstrapImage = (await replica.snapshotAt(cut)).sharedImage();
    report.bootstrap = {
      initialHeap,
      indexBytes: bootstrapImage.shared!.index.byteLength,
      slabBytes: bootstrapImage.shared!.buffers.reduce((n, buffer) => n + buffer.byteLength, 0),
      pageReads,
      indexHeapDelta: process.memoryUsage().heapUsed - initialHeap,
      wallMs: performance.now() - start,
      bytes: replica.bytes,
      bytesPerSubject: replica.bytes / N,
      position: cut,
    };
    console.log(JSON.stringify({ kind: "bootstrap", ...report.bootstrap }));
    report.bootstrapWorlds = (await equalWorlds(cut, argv.includes("--seed-fingerprint"))).worlds;
    console.log(
      JSON.stringify({
        kind: "bootstrap-world-equality",
        worlds: report.bootstrapWorlds,
        mismatches: 0,
      }),
    );
    const commands = Number(opt("follow-commands", "0"));
    if (commands) {
      const lags: number[] = [];
      let cpuSeconds = 0,
        added: string[] = [];
      const subject = subjects.find((s) =>
        replica.world(s).some((r) => r.entityId === s && r.attribute === "location"),
      )!;
      const location = replica
        .world(subject)
        .find((r) => r.entityId === subject && r.attribute === "location")!.value.value as string;
      for (let i = 0; i < commands; i++) {
        let ops: any[];
        if (i % 4 < 2) {
          const entityId = i % 4 === 0 ? subject : location,
            attribute = i % 4 === 0 ? "weeklyMinutes" : "localMinWageCents";
          const old = replica
            .world(entityId)
            .filter((r) => r.entityId === entityId && r.attribute === attribute);
          ops = [
            ...old.map((r) => ({ op: "retract", id: r.id })),
            {
              op: "assert",
              entityId,
              attribute,
              value: triplexValue(attribute, i % 8 < 4 ? 1200 : 3000),
              validFrom: V_W0 - 86400000,
            },
          ];
        } else if (i % 4 === 2) {
          const answer = subject + "/ans:dxr1-" + i;
          ops = [
            [subject, "answers", answer],
            [answer, "field", "trace"],
            [answer, "value", "test"],
          ].map(([entityId, attribute, value]) => ({
            op: "assert",
            entityId,
            attribute,
            value: triplexValue(attribute, value),
            validFrom: V_W0,
          }));
        } else ops = added.map((id) => ({ op: "retract", id }));
        const retiredIds = new Set(ops.filter((op) => op.op === "retract").map((op) => op.id));
        const retiredRows = replica.world(subject).filter((row) => retiredIds.has(row.id));
        const r = await commit(ops, "follow:" + i),
          ack = performance.now();
        const cpu = process.threadCpuUsage();
        await followTo(r.position);
        const d = process.threadCpuUsage(cpu);
        cpuSeconds += (d.user + d.system) / 1e6;
        if (replica.position !== r.position) throw new Error("Follow did not reach ACK");
        lags.push(performance.now() - ack);
        // [DX-R1] Why: compare acknowledged content as well as the independent database pull; shared stale reads cannot hide a dropped update.
        // Rejected: accepting watermark progress alone after a write.
        for (const op of ops.filter((op) => op.op === "assert")) {
          if (
            !replica
              .world(op.entityId)
              .some(
                (row) =>
                  row.entityId === op.entityId &&
                  row.attribute === op.attribute &&
                  row.position === r.position &&
                  canonical(row.value) === canonical(op.value),
              )
          )
            throw new Error("Acknowledged assertion absent from replica");
        }
        for (const old of retiredRows)
          if (replica.world(old.entityId).some((row) => row.id === old.id))
            throw new Error("Retired row remained in replica");
        if (i % 4 === 2)
          added = replica
            .world(subject)
            .filter(
              (r) =>
                r.entityId.endsWith("/ans:dxr1-" + i) ||
                (r.value.type === "ref" && r.value.value.endsWith("/ans:dxr1-" + i)),
            )
            .map((r) => r.id);
        if ((i + 1) % 250 === 0)
          console.log(
            JSON.stringify({
              kind: "follow-progress",
              commands: i + 1,
              position: replica.position,
            }),
          );
      }
      cut = replica.position;
      lags.sort((a, b) => a - b);
      report.follow = {
        commands,
        cpuSeconds,
        extraPageReads: pageReads - report.bootstrap.pageReads,
        cpuScope:
          "main thread: feed, need decode and packing; excludes asynchronous evidence compression",
        p99AckToAppliedMs: lags[Math.ceil(lags.length * 0.99) - 1],
        worlds: (await equalWorlds(cut)).worlds,
        workload:
          "serial live scalar replacement, shared location replacement, add/remove answer references",
      };
      console.log(JSON.stringify({ kind: "follow-equality", ...report.follow }));
    }
    if (argv.includes("--publish")) {
      const active = await commit(
        [
          {
            op: "assert",
            entityId: "p5:tenant",
            attribute: "p5/activation",
            value: { type: "string", value: "R1" },
            validFrom: V_W0,
          },
        ],
        "activate:R1",
      );
      cut = active.position;
      await followTo(cut);
      report.activations = { R1: cut };
    }
    const r1Snapshot = await replica.snapshotAt(cut),
      r1Position = cut;
    if (argv.includes("--publish")) {
      const r1 = await evaluateAll({
        replica,
        subjects,
        releases: W0.R1,
        position: cut,
        workers,
        view: r1Snapshot,
        publish: comp,
      });
      report.r1Publication = {
        changed: r1.publication!.changed,
        commits: r1.publication!.commits,
        wallMs: r1.publication!.wallMs,
      };
      cut = await comp.currentPosition();
      await followTo(cut);
      const old = replica
        .world("p5:tenant")
        .filter((r) => r.entityId === "p5:tenant" && r.attribute === "p5/activation");
      const active = await commit(
        [
          ...old.map((r) => ({ op: "retract", id: r.id })),
          {
            op: "assert",
            entityId: "p5:tenant",
            attribute: "p5/activation",
            value: { type: "string", value: "R2" },
            validFrom: V_W0,
          },
        ],
        "activate:R2",
      );
      cut = active.position;
      await followTo(cut);
      report.activations.R2 = cut;
    }
    const freezeStarted = performance.now();
    const snap = await replica.snapshotAt(cut);
    report.freezeMs = performance.now() - freezeStarted;
    const live = argv.includes("--live");
    const trafficDir = opt("traffic-dir", recordDir + "/../traffic");
    if (live) fs.mkdirSync(trafficDir, { recursive: true });
    const liveLags: { ack: number; lagMs: number }[] = [],
      livePending: Promise<void>[] = [];
    let collectLiveLag = false;
    const observedComp = {
      ...comp,
      transact: async (...args: Parameters<typeof comp.transact>) => {
        const result = await comp.transact(...args);
        if (result.ok && collectLiveLag) {
          const start = performance.now(),
            ack = performance.timeOrigin + start;
          const pending = replica.caughtUpTo(result.value.position).then(() => {
            liveLags.push({ ack, lagMs: performance.now() - start });
          });
          void pending.catch(() => {});
          livePending.push(pending);
        }
        return result;
      },
    };
    const liveOptions = {
      comp: observedComp,
      composition: "reach",
      lane: "datomic",
      scope,
      N,
      dir: trafficDir,
      seed: opt("traffic-seed", "DX-H2-frozen-v1"),
      offsetS: Number(opt("traffic-offset-s", "0")),
      warmupMs: Number(opt("live-warmup-ms", "15000")),
    };
    const result = await evaluateAll({
      replica,
      subjects,
      releases: W0.R2,
      position: cut,
      workers,
      view: snap,
      ...(argv.includes("--publish") ? { publish: comp } : {}),
      beforeTimedWindow: async () => {
        if (argv.includes("--post-capture")) {
          const mutations: string[] = [];
          for (const subject of subjects) {
            if (mutations.length >= Math.ceil(N / 100)) break;
            const old = snap
              .world(subject)
              .filter((r) => r.entityId === subject && r.attribute === "weeklyMinutes");
            if (!old.length) continue;
            const changed = Number(old[0].value.value) > 2400 ? 1200 : 3000;
            const r = await commit(
              [
                ...old.map((row) => ({ op: "retract", id: row.id })),
                {
                  op: "assert",
                  entityId: subject,
                  attribute: "weeklyMinutes",
                  value: triplexValue("weeklyMinutes", changed),
                  validFrom: V_W0 - 86400000,
                },
              ],
              "post-capture:" + subject,
            );
            await followTo(r.position);
            const before = JSON.parse(
              await oracle.call("evaluate", {
                world: worldOf(subject, snap.world(subject)),
                release: "R2",
                basis: { tx: cut, validTime: W0.POPULATION_VALID_TIME },
              }),
            );
            const after = JSON.parse(
              await oracle.call("evaluate", {
                world: worldOf(subject, replica.world(subject)),
                release: "R2",
                basis: { tx: r.position, validTime: W0.POPULATION_VALID_TIME },
              }),
            );
            if (before.error || after.error || canonical(before.flags) === canonical(after.flags))
              throw new Error("Post-capture positive oracle witness absent");
            mutations.push(subject);
          }
          if (mutations.length !== Math.ceil(N / 100))
            throw new Error("Insufficient post-capture positive witnesses");
          const negatives = subjects
            .filter((subject) => !mutations.includes(subject))
            .slice(0, mutations.length);
          for (const subject of negatives)
            if (
              worldCanonical(worldOf(subject, snap.world(subject))) !==
              worldCanonical(worldOf(subject, replica.world(subject)))
            )
              throw new Error("Post-capture negative input witness changed");
          report.postCapture = {
            subjects: mutations,
            negativeSubjects: negatives,
            captured: cut,
            current: replica.position,
          };
        }
        if (!live) return;
        // [DX-R1] Why: the runtime follows writes in both no-sweep and sweep arms, so only evaluation/publication differs.
        // Rejected: pausing follow during baseline (creates an artificial backlog and omits normal replica cost).
        replica.start();
        traffic = await startW0Live({ ...liveOptions, id: "baseline" });
        await new Promise((r) => setTimeout(r, Number(opt("baseline-ms", "30000"))));
        report.baseline = await traffic.stop();
        traffic = undefined;
        collectLiveLag = true;
        traffic = await startW0Live({ ...liveOptions, id: "sweep" });
      },
    });
    if (traffic) {
      report.live = await traffic.stop();
      traffic = undefined;
      report.matched = matchW0Live(report.baseline, report.live);
      await Promise.all(livePending);
      const lags = liveLags
        .filter((r) => r.ack >= report.live.startedAtMs && r.ack < report.live.endedAtMs)
        .map((r) => r.lagMs)
        .sort((a, b) => a - b);
      report.liveFollow = {
        commits: lags.length,
        p50AckToAppliedMs: lags.length ? lags[Math.ceil(lags.length * 0.5) - 1] : null,
        p99AckToAppliedMs: lags.length ? lags[Math.ceil(lags.length * 0.99) - 1] : null,
      };
    }
    await replica.stop();
    const currentImage = (await replica.snapshotAt(replica.position)).sharedImage();
    const retainedImages = [r1Snapshot.sharedImage(), snap.sharedImage(), currentImage];
    const retainedBuffers = new Set(
      retainedImages.flatMap((image) => [
        ...image.shared!.buffers,
        ...image.entities.map(([, entity]) => entity.buffer),
      ]),
    );
    const retainedIndexes = new Set(retainedImages.map((image) => image.shared!.index));
    (globalThis as any).gc?.();
    report.evaluation = {
      retainedDataBytes: [...retainedBuffers].reduce((n, buffer) => n + buffer.byteLength, 0),
      retainedIndexBytes: [...retainedIndexes].reduce((n, buffer) => n + buffer.byteLength, 0),
      inputBytes: result.replicaBytes,
      sharedIndexBytes: snap.sharedImage().shared!.index.byteLength,
      overlayEntities: snap.sharedImage().entities.length,
      heapDelta: process.memoryUsage().heapUsed - initialHeap,
      wallMs: result.evaluationWallMs,
      passWallMs: result.passWallMs + report.freezeMs,
      passRate: N / ((result.passWallMs + report.freezeMs) / 1000),
      startupMs: result.startupMs,
      cpuSeconds: result.cpuSeconds,
      rate: result.subjectsPerSecond,
    };
    if (result.publication)
      report.publication = {
        changed: result.publication.changed,
        commits: result.publication.commits,
        wallMs: result.publication.wallMs,
      };
    // [DX-R1] Why: every independent oracle comparison is after the last publication ACK, over the frozen input cut.
    // Rejected: sampling subjects or using evaluator output as the oracle's input.
    let checked = 0,
      statesCompared = 0,
      expectedR1Changed = 0,
      expectedR2Changed = 0;
    const finalPosition = await comp.currentPosition();
    const wireState = (state: any) => ({
      ...state,
      items: state.items.map((i: any) => ({
        ...i,
        payload: typeof i.payload === "string" ? JSON.parse(i.payload) : i.payload,
      })),
      pending: state.pending.map((i: any) => ({
        ...i,
        payload: typeof i.payload === "string" ? JSON.parse(i.payload) : i.payload,
      })),
    });
    const recordOf = (output: any) => ({
      basis: output.basis,
      release: output.release,
      subject: output.subject,
      workItems: output.workItems,
    });
    const applyExpected = async (previous: any, output: any) => {
      const next = JSON.parse(
        await oracle.call("publish", { state: previous, evaluations: [recordOf(output)] }),
      );
      if (next.error) throw new Error("Oracle publication error " + next.error);
      const changed =
        next.deliveries.length > 0 || canonical(next.state.items) !== canonical(previous.items);
      return { changed, state: changed ? next.state : previous };
    };
    for (let offset = 0; offset < result.records.length; offset += 64) {
      const records = result.records.slice(offset, offset + 64);
      const gateway = await recordedPage(
        records.map((r) => r.subject),
        { position: cut, validAt: V_W0 },
      );
      const states = argv.includes("--publish")
        ? await recordedPage(
            records.map((r) => "p5:outbox:" + r.subject),
            { position: finalPosition, validAt: V_W0 },
          )
        : undefined;
      for (const r of records) {
        const world = worldOf(r.subject, reachableRows([r.subject], gateway.rows));
        if (
          worldSha256(world) !== r.worldSha256 ||
          worldCanonical(world) !== worldCanonical(worldOf(r.subject, snap.world(r.subject)))
        )
          throw new Error("Frozen world/gateway mismatch " + r.subject);
        const expected = await oracle.call("evaluate", {
          world,
          release: "R2",
          basis: { tx: cut, validTime: W0.POPULATION_VALID_TIME },
        });
        if (W0.outputJson(r.candidates[0].output) !== expected)
          throw new Error("Python output mismatch " + r.subject);
        const expectedOutput = JSON.parse(expected);
        const normalizedRecord = {
          ...r.candidates[0].record,
          workItems: r.candidates[0].record.workItems.map((w) => ({
            ...w,
            payload: JSON.parse(w.payload),
          })),
        };
        if (canonical(normalizedRecord) !== canonical(recordOf(expectedOutput)))
          throw new Error("Independent Python record mismatch " + r.subject);
        const slow = W0.sweepSubject(world, W0.R2, {
          tx: cut,
          validTime: W0.POPULATION_VALID_TIME,
        });
        if ("error" in slow || canonical(slow.record) !== canonical(r.candidates[0].record))
          throw new Error("Full sweep record mismatch");
        if (states) {
          const r1 = JSON.parse(
            await oracle.call("evaluate", {
              world: worldOf(r.subject, r1Snapshot.world(r.subject)),
              release: "R1",
              basis: { tx: r1Position, validTime: W0.POPULATION_VALID_TIME },
            }),
          );
          const first = await applyExpected({ items: [], pending: [], subjects: [] }, r1);
          const second = await applyExpected(first.state, JSON.parse(expected));
          expectedR1Changed += Number(first.changed);
          expectedR2Changed += Number(second.changed);
          const rows = states.rows.filter(
            (row) => row.entityId === "p5:outbox:" + r.subject && row.attribute === "p5/state",
          );
          if (rows.length > 1) throw new Error("Ambiguous published state");
          const actual = rows.length
            ? wireState(JSON.parse(rows[0].value.value))
            : { items: [], pending: [], subjects: [] };
          if (canonical(actual) !== canonical(second.state))
            throw new Error("Independent published state mismatch " + r.subject);
          statesCompared++;
        }
        checked++;
      }
    }
    if (
      statesCompared &&
      (expectedR1Changed !== report.r1Publication.changed ||
        expectedR2Changed !== report.publication.changed)
    )
      throw new Error("Changed subject coverage mismatch");
    report.publishedStatesCompared = statesCompared;
    report.oracleCompared = checked;
    console.log(
      JSON.stringify({
        kind: "post-ack-equality",
        subjects: checked,
        states: statesCompared,
        evaluation: report.evaluation,
        publication: report.publication,
        liveFollow: report.liveFollow,
        matched: report.matched,
      }),
    );
    if (argv.includes("--candidates")) {
      const position = cut;
      const variant = (id: string, key: string, n: number) =>
        W0.compileRelease({
          ...W0.R2.doc,
          rules: W0.R2.doc.rules.map((r) =>
            r.id === id ? ({ ...r, params: { [key]: n } } as any) : r,
          ),
        });
      const multi = await evaluateAll({
        replica,
        subjects,
        position,
        workers,
        view: snap,
        // [DX-R1] Why: compare one and three candidates under the same 64-reader/writer profile.
        // Rejected: timing the three-candidate pass after stopping all live traffic.
        beforeTimedWindow: async () => {
          if (!live) return;
          collectLiveLag = false;
          replica.start();
          traffic = await startW0Live({ ...liveOptions, id: "candidates" });
        },
        releases: [
          W0.R2,
          variant("OT", "thresholdMinutes", 2700),
          variant("PAYCHG", "thresholdCents", 700),
        ],
      });
      const candidateTraffic = traffic as Awaited<ReturnType<typeof startW0Live>> | undefined;
      const candidateLive = candidateTraffic ? await candidateTraffic.stop() : undefined;
      traffic = undefined;
      await replica.stop();
      for (let i = 0; i < multi.records.length; i++) {
        if (
          canonical(multi.records[i].candidates[0]) !== canonical(result.records[i].candidates[0])
        )
          throw new Error("Candidate pass changed its shared R2 input/output cut");
      }
      report.candidates = {
        wallMs: multi.evaluationWallMs,
        ratio: multi.evaluationWallMs / result.evaluationWallMs,
        passWallMs: multi.passWallMs + report.freezeMs,
        passRatio: (multi.passWallMs + report.freezeMs) / (result.passWallMs + report.freezeMs),
        cpuSeconds: multi.cpuSeconds,
        live: candidateLive,
      };
      console.log(JSON.stringify({ kind: "candidates", ...report.candidates }));
    }
    if (argv.includes("--journal-counts")) {
      // [DX-R1] Why: the candidate live arm has its own real commits after publication-state verification.
      // Rejected: folding those new journals against the earlier publication cut.
      const countPosition = await comp.currentPosition();
      let after = 0,
        assertions = 0,
        retired = 0;
      while (after < countPosition) {
        const page = await comp.feedPage(after, Math.min(100, countPosition - after));
        if (!page.transactions.length) throw new Error("Journal fold gap");
        for (const tx of page.transactions) {
          if (tx.position !== after + 1 || tx.position > countPosition)
            throw new Error("Journal position mismatch");
          after = tx.position;
          for (const c of tx.changes) {
            assertions += Number(c.op === "assert");
            retired += Number(c.op === "retract");
          }
        }
      }
      const counts = await comp.storeCounts();
      if (
        counts.position !== after ||
        counts.assertions !== assertions ||
        counts.retired !== retired ||
        ("frames" in counts && counts.frames !== after)
      )
        throw new Error("Independent journal count mismatch");
      report.journalCounts = counts;
    }
    if (fs.existsSync("/sys/fs/cgroup/memory.peak"))
      report.cgroupPeakBytes = Number(fs.readFileSync("/sys/fs/cgroup/memory.peak", "utf8"));
    report.fullHistoryCounts = bulkCounts.stats;
    report.transport = {
      pageReads,
      feedReads,
      feedPeer: "writer",
      bootstrapPeer: "reader",
      liveReaders: 256,
    };
    report.rss = process.memoryUsage().rss;
    report.peakRss = process.resourceUsage().maxRSS * 1024;
    console.log(JSON.stringify({ kind: "result", ...report }));
    return report;
  } finally {
    if (traffic) await traffic.stop();
    await replica.stop();
    await recorder?.close();
    oracle.close();
    bulkCounts?.close();
    feedClient.close();
    client.close();
    await comp.close();
  }
}
