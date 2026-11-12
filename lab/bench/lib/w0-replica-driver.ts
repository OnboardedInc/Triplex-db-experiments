import { forEachBounded, orderedMap } from "./w0-parallel.ts";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { getHeapStatistics } from "node:v8";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { seedW0 } from "./w0-seed.ts";
import { recordReplicaHttp } from "./w0-replica-record.ts";
import { DatomicClient, Replica, RecentReads } from "../../../packages/datomic/dist/index.js";
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
import { outboxEntity } from "./w0-outbox.ts";
import { evaluateAll, compactCandidateReferences } from "./w0-replica.ts";
import { DomainOracle, DomainOraclePool } from "./w0-gates.ts";
import { startRuntimeFollower, startThreadedW0Live } from "./w0-runtime.ts";
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
    workers = Number(opt("workers", "3")),
    oracleConcurrency = Number(opt("oracle-concurrency", "1")),
    oracleProcesses = Number(opt("oracle-processes", "1")),
    verificationPages = Number(opt("verification-pages", "1"));
  if (!Number.isSafeInteger(oracleProcesses) || oracleProcesses < 1 || oracleProcesses > 4)
    throw Error("invalid oracle process count");
  if (!Number.isSafeInteger(oracleConcurrency) || oracleConcurrency < 1 || oracleConcurrency > 32)
    throw Error("invalid oracle concurrency");
  if (!Number.isSafeInteger(verificationPages) || verificationPages < 1 || verificationPages > 8)
    throw Error("invalid verification page concurrency");
  const seedPosition = argv.includes("--seed-position") ? Number(opt("seed-position")) : undefined;
  if (seedPosition !== undefined && (!Number.isSafeInteger(seedPosition) || seedPosition < 1))
    throw Error("invalid sealed seed position");
  // [DX-S5] Why: the 1k current-read Map retained 152405 entries; its full-scale mirror reverses R2's ~3 GB index compaction.
  // Rejected: risking the 11 GiB driver budget; 100k uses the shared-base ReplicaSnapshot path instead.
  if (argv.includes("--replica-current-index") && N > 10000)
    throw Error(
      "current-read Map is limited to 10000 subjects; use shared snapshots at full scale",
    );
  const publicationTrials: {
    id: string;
    mode: string;
    size: number;
    inflight: number;
    gapMs?: number;
    yieldToWriter?: boolean;
    maxWriterYieldMs?: number;
    r1Size?: number;
    r1Inflight?: number;
  }[] = JSON.parse(opt("publication-trials", "[]"));
  if (
    !Array.isArray(publicationTrials) ||
    publicationTrials.length > 3 ||
    publicationTrials.some((t) => t === null || typeof t !== "object") ||
    new Set(publicationTrials.map((t) => t.id)).size !== publicationTrials.length ||
    publicationTrials.some(
      (t) =>
        !/^[a-z0-9-]{8,64}$/.test(t.id) ||
        !["replica", "gateway"].includes(t.mode) ||
        !Number.isInteger(t.size) ||
        t.size < 1 ||
        t.size > 256 ||
        !Number.isInteger(t.inflight) ||
        t.inflight < 1 ||
        t.inflight > 32 ||
        (t.gapMs !== undefined && (!Number.isFinite(t.gapMs) || t.gapMs < 0 || t.gapMs > 1000)) ||
        (t.yieldToWriter !== undefined && typeof t.yieldToWriter !== "boolean") ||
        (t.maxWriterYieldMs !== undefined &&
          (!Number.isFinite(t.maxWriterYieldMs) ||
            t.maxWriterYieldMs < 0 ||
            t.maxWriterYieldMs > 1000)) ||
        (t.r1Size !== undefined &&
          (!Number.isInteger(t.r1Size) || t.r1Size < 1 || t.r1Size > 256)) ||
        (t.r1Inflight !== undefined &&
          (!Number.isInteger(t.r1Inflight) || t.r1Inflight < 1 || t.r1Inflight > 32)),
    ) ||
    (publicationTrials.length &&
      (!seedPosition ||
        !argv.includes("--seed-fingerprint") ||
        !argv.includes("--publish") ||
        !argv.includes("--live") ||
        !argv.includes("--batch-oracle") ||
        !argv.includes("--candidates") ||
        !argv.includes("--oracle-candidates") ||
        !opt("publication-id") ||
        publicationTrials.some((t) => t.id === opt("publication-id"))))
  )
    throw Error("invalid publication trials binding/settings");
  const candidateVerification = argv.includes("--verify-candidates-at-seed");
  const repeatActivation = argv.includes("--activation-at-seed");
  const publicationId = opt("publication-id");
  if (
    repeatActivation &&
    (!seedPosition ||
      !argv.includes("--seed-fingerprint") ||
      !argv.includes("--publish") ||
      argv.includes("--seed") ||
      candidateVerification ||
      !/^[a-z0-9-]{8,64}$/.test(publicationId))
  )
    throw Error(
      "repeat activation requires sealed cut, full fingerprint, publication and a fresh namespace",
    );
  if (publicationId) {
    if (!/^[a-z0-9-]{8,64}$/.test(publicationId)) throw Error("invalid publication namespace");
    process.env.TX2_W0_OUTBOX_NAMESPACE = publicationId;
  }
  if (!["gateway", "replica"].includes(opt("reader-mode", "gateway")))
    throw Error("invalid reader mode");
  const publication = argv.includes("--publication-inflight")
    ? {
        inflight: Number(opt("publication-inflight")),
        frameSize: Number(opt("publication-size", "64")),
        gapMs: Number(opt("publication-gap-ms", "0")),
        yieldToWriter: argv.includes("--publication-yield-writer"),
        maxWriterYieldMs: Number(opt("publication-yield-ms", "50")),
      }
    : undefined;
  if (
    publication &&
    (!Number.isFinite(publication.maxWriterYieldMs) ||
      publication.maxWriterYieldMs < 0 ||
      publication.maxWriterYieldMs > 1000 ||
      !Number.isFinite(publication.gapMs) ||
      publication.gapMs < 0 ||
      publication.gapMs > 1000 ||
      !Number.isInteger(publication.frameSize) ||
      publication.frameSize < 1 ||
      publication.frameSize > 256 ||
      !Number.isInteger(publication.inflight) ||
      publication.inflight < 1 ||
      publication.inflight > 32)
  )
    throw Error("invalid publication gap");

  // [DX-S5] Why: a second oracle hold reads the immutable seed cut after the first-use activation appended records.
  // Rejected: accepting a consumed seed for another timed publication, or replaying the live writer trace.
  if (
    candidateVerification &&
    (seedPosition === undefined ||
      !argv.includes("--candidates") ||
      !argv.includes("--oracle-candidates") ||
      !argv.includes("--seed-fingerprint") ||
      [
        "--publish",
        "--post-capture",
        "--live",
        "--seed",
        "--follow-commands",
        "--corpus",
        "--corpus-after",
        "--journal-fast-gate",
      ].some((flag) => argv.includes(flag)))
  )
    throw Error("invalid read-only candidate verification");
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
    batchOracle = argv.includes("--batch-oracle"),
    oracle = new DomainOraclePool(
      batchOracle
        ? new URL("../../experiments/EXP-DX1/s5/oracle.py", import.meta.url).pathname
        : undefined,
      oracleProcesses,
    );
  const report: any = { classification: "DIAGNOSTIC", acceptance: false, N, scope, workers };
  report.nodeHeapLimitBytes = getHeapStatistics().heap_size_limit;
  // [DX-S5] Why: report actual all-subject oracle time separately from activation and storage readback.
  // Rejected: projecting the 10k verifier cost or silently replacing full verification with sampling.
  let oracleWallMs = 0,
    oracleActive = 0,
    oracleStarted = 0;
  const timedOracle = async (...args: Parameters<DomainOracle["call"]>) => {
    if (oracleActive++ === 0) oracleStarted = performance.now();
    try {
      return await oracle.call(...args);
    } finally {
      if (--oracleActive === 0) oracleWallMs += performance.now() - oracleStarted;
    }
  };
  const currentReads = argv.includes("--replica-current-index") ? new RecentReads(0, 0) : undefined;
  let currentReadEntities = 0;
  if (currentReads)
    replica.onUpdate = (update) => {
      currentReads.apply(update);
      currentReadEntities = update.reset
        ? update.changes.length
        : currentReadEntities +
          update.changes.filter(([, previous]) => previous === undefined).length;
    };
  let traffic:
    | Awaited<ReturnType<typeof startW0Live>>
    | Awaited<ReturnType<typeof startThreadedW0Live>>
    | undefined;
  let runtimeFollower: Awaited<ReturnType<typeof startRuntimeFollower>> | undefined;
  const threaded = argv.includes("--runtime-workers");
  const startFollowing = async () => {
    if (threaded)
      runtimeFollower ??= await startRuntimeFollower(replica, scope, db, comp.backend.url);
    else replica.start();
  };
  const stopFollowing = async () => {
    if (runtimeFollower) {
      report.followerThread = await runtimeFollower.stop();
      runtimeFollower = undefined;
    }
    await replica.stop();
  };
  const startTraffic = async (options: Parameters<typeof startW0Live>[0]) =>
    threaded && options.replica
      ? startThreadedW0Live(options, runtimeFollower!, Number(opt("reader-workers", "2")))
      : startW0Live(options);
  let bulkCounts: Awaited<ReturnType<typeof openBulkCounts>> | undefined;
  let verificationComp = comp;
  const followTo = async (p: number) => {
    while (replica.position < p) await replica.followOnce(1000, p);
    if (!replica.isValid || replica.position !== p)
      throw new Error("Replica did not reach exact acknowledged cut");
  };
  const recordedPage = (roots: readonly string[], basis: { position: number; validAt: number }) =>
    recorder
      ? recorder.around(() => verificationComp.sweepPage(roots, basis))
      : verificationComp.sweepPage(roots, basis);
  const equalWorlds = async (cut: number, fingerprint = false) => {
    const hashes = [createHash("sha256"), createHash("sha256")];
    hashes.forEach((h) => h.update("["));
    let facts = 0;
    const snap = await replica.snapshotAt(cut);
    if (currentReads && currentReads.position !== cut)
      throw Error("current-read index is not at the world-verification cut");
    let worlds = 0,
      subjectSnapshots = 0;
    // [DX-S5] Why: pipeline immutable native pages, but fold every world in its original subject order.
    // Rejected: concurrent digest updates (response completion order would change the fingerprint).
    const offsets = Array.from({ length: Math.ceil(subjects.length / 64) }, (_, i) => i * 64);
    for await (const { ids, page } of orderedMap(offsets, verificationPages, async (i) => {
      const ids = subjects.slice(i, i + 64);
      return { ids, page: await recordedPage(ids, { position: cut, validAt: V_W0 }) };
    })) {
      const rowIndex = new Map<string, (typeof page.rows)[number][]>();
      for (const row of page.rows) {
        const list = rowIndex.get(row.entityId) ?? [];
        list.push(row);
        rowIndex.set(row.entityId, list);
      }
      for (const subject of ids) {
        if (opt("reader-mode", "gateway") === "replica") {
          const scoped = replica.snapshotSubject(subject);
          if (
            scoped.position !== cut ||
            scoped.validAt !== V_W0 ||
            worldCanonical(worldOf(subject, scoped.world(subject))) !==
              worldCanonical(worldOf(subject, snap.world(subject)))
          )
            throw Error(
              "Current subject snapshot differs at the exact verification cut " + subject,
            );
          subjectSnapshots++;
        }
        if (currentReads) {
          const local = currentReads.pull(subject, { recordedPosition: cut, validAt: V_W0 });
          if (
            !local ||
            worldCanonical(worldOf(subject, local.rows)) !==
              worldCanonical(worldOf(subject, snap.world(subject)))
          )
            throw Error("Current-position pullAt index differs from replica snapshot " + subject);
        }
        if (
          worldCanonical(worldOf(subject, snap.world(subject))) !==
          worldCanonical(worldOf(subject, reachableRows([subject], page.rows, rowIndex)))
        )
          throw new Error("World equality mismatch " + subject);
        if (fingerprint) {
          const world = worldOf(subject, reachableRows([subject], page.rows, rowIndex));
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
    return { snap, worlds, subjectSnapshots };
  };
  const commit = async (operations: any[], id: string) => {
    const r = await comp.transact(operations, {
      commandId: "dxr1:" + (publicationId ? publicationId + ":" : "") + id,
    });
    if (!r.ok) throw new Error(r.tag);
    return r.value;
  };
  try {
    // [DX-S5] Why: untimed exact readback can use the two-core reader peer and bounded page overlap.
    // Rejected: serial verification on the one-core writer peer; defaults and all content/cut checks stay intact.
    if (verificationPages > 1) {
      const writerURL = process.env.DATOMIC_URL;
      const readURL = process.env.DATOMIC_READ_URLS?.split(",")[0];
      if (!readURL) throw Error("parallel verification requires a read peer");
      process.env.DATOMIC_URL = readURL;
      try {
        verificationComp = await openComposition("reach", "datomic", scope);
      } finally {
        if (writerURL === undefined) delete process.env.DATOMIC_URL;
        else process.env.DATOMIC_URL = writerURL;
      }
    }
    report.verificationPages = verificationPages;
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
    // [DX-S5] Why: a declared first-use run must begin at the sealed position, before any activation writes.
    // Rejected: silently evaluating an already consumed first-use seed at a later head.
    if (
      seedPosition !== undefined &&
      (candidateVerification || repeatActivation ? cut < seedPosition : cut !== seedPosition)
    )
      throw Error("initial head differs from sealed position");
    report.initialSeedPosition = cut;
    report.publicationId = publicationId;
    report.readerMode = opt("reader-mode", "gateway");
    report.currentPositionReadIndex = !!currentReads;
    report.candidateVerificationOnly = candidateVerification;
    if (candidateVerification || repeatActivation) cut = seedPosition!;
    // [DX-S5] Why: include this attempt's outboxes in the ordered-feed copy; absence at P is read from storage, not presumed from a UUID.
    // Rejected: treating an arbitrary namespace as empty without reading its exact initial cut.
    const trialOutboxRoots = publicationTrials.flatMap((t) =>
      subjects.map((subject) => "p5:outbox:" + t.id + ":" + subject),
    );
    await replica.bootstrap(
      publicationId || publication
        ? [...subjects, ...subjects.map(outboxEntity), ...trialOutboxRoots]
        : subjects,
      cut,
    );
    // [DX-S5] Why: configured empty roots remain explicit empty entities in snapshots, including later trial namespaces.
    // Rejected: treating Replica.world's missing-root exception as evidence of absence.
    if (trialOutboxRoots.some((id) => replica.world(id).length))
      throw Error("trial namespace already exists at seed cut");
    if (publicationId && subjects.some((s) => replica.world(outboxEntity(s)).length))
      throw Error("publication namespace already exists at seed cut");
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
    // [DX-S5] Why: first use may append activation/outbox records, but its application input stays at the sealed cut.
    // Rejected: quietly moving the requested sealed input basis to the later activation transaction.
    const pinnedInput =
      seedPosition !== undefined ? await replica.snapshotAt(seedPosition) : undefined;
    const bootstrapEquality = await equalWorlds(cut, argv.includes("--seed-fingerprint"));
    report.bootstrapWorlds = bootstrapEquality.worlds;
    report.subjectSnapshotWorlds = bootstrapEquality.subjectSnapshots;
    console.log(
      JSON.stringify({
        kind: "bootstrap-world-equality",
        worlds: report.bootstrapWorlds,
        currentReadWorlds: currentReads ? report.bootstrapWorlds : 0,
        subjectSnapshotWorlds: report.subjectSnapshotWorlds,
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
            entityId: "p5:tenant" + (publicationId ? ":" + publicationId : ""),
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
    const r1Snapshot = pinnedInput ?? (await replica.snapshotAt(cut)),
      r1Position = r1Snapshot.position;
    if (argv.includes("--publish")) {
      if (publicationId && subjects.some((s) => replica.world(outboxEntity(s)).length))
        throw Error("publication namespace already used at current head");
      const publicationView = await replica.snapshotAt(replica.position);
      const r1 = await evaluateAll({
        replica,
        subjects,
        releases: W0.R1,
        position: r1Position,
        workers,
        view: r1Snapshot,
        publish: comp,
        ...(publication
          ? {
              publication: {
                ...publication,
                frameSize: Number(opt("r1-publication-size", String(publication.frameSize))),
                inflight: Number(opt("r1-publication-inflight", String(publication.inflight))),
                readStates: (ids) => ids.flatMap((id) => publicationView.world(id)),
              },
            }
          : {}),
      });
      report.r1Publication = {
        changed: r1.publication!.changed,
        commits: r1.publication!.commits,
        wallMs: r1.publication!.wallMs,
        profile: { ...r1.publication, responses: r1.publication!.responses.map((r) => r.timing) },
      };
      report.r1Evaluation = {
        wallMs: r1.evaluationWallMs,
        passWallMs: r1.passWallMs,
        combinedWallMs: r1.passWallMs + r1.publication!.wallMs,
        live: false,
      };
      console.log(
        JSON.stringify({
          kind: "r1-publication",
          evaluation: report.r1Evaluation,
          publication: report.r1Publication,
        }),
      );
      cut = await comp.currentPosition();
      await followTo(cut);
      const old = replica
        .world("p5:tenant" + (publicationId ? ":" + publicationId : ""))
        .filter(
          (r) =>
            r.entityId === "p5:tenant" + (publicationId ? ":" + publicationId : "") &&
            r.attribute === "p5/activation",
        );
      const active = await commit(
        [
          ...old.map((r) => ({ op: "retract", id: r.id })),
          {
            op: "assert",
            entityId: "p5:tenant" + (publicationId ? ":" + publicationId : ""),
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
    const snap = pinnedInput ?? (await replica.snapshotAt(cut));
    cut = snap.position;
    report.frozenInputPosition = cut;
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
      ...(opt("reader-mode", "gateway") === "replica" ? { replica } : {}),
      commandNamespace: publicationId,
      currentReads: opt("reader-mode", "gateway") === "replica" ? currentReads : undefined,
    };
    const publicationView = await replica.snapshotAt(replica.position);
    const result = await evaluateAll({
      replica,
      subjects,
      releases: W0.R2,
      position: cut,
      workers,
      view: snap,
      ...(argv.includes("--publish") ? { publish: comp } : {}),
      ...(publication
        ? {
            publication: {
              ...publication,
              readStates: (ids) => ids.flatMap((id) => publicationView.world(id)),
            },
          }
        : {}),
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
              await timedOracle("evaluate", {
                world: worldOf(subject, snap.world(subject)),
                release: "R2",
                basis: { tx: cut, validTime: W0.POPULATION_VALID_TIME },
              }),
            );
            const after = JSON.parse(
              await timedOracle("evaluate", {
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
        await startFollowing();
        traffic = await startTraffic({ ...liveOptions, id: "baseline" });
        await new Promise((r) => setTimeout(r, Number(opt("baseline-ms", "30000"))));
        report.baseline = await traffic.stop();
        console.log(
          JSON.stringify({
            kind: "live-baseline",
            ...report.baseline,
            queueToServiceP99: report.baseline.commit.p99 / report.baseline.commitService.p99,
          }),
        );
        if (
          argv.includes("--require-healthy-baseline") &&
          (report.baseline.commit.p99 / report.baseline.commitService.p99 > 5 ||
            report.baseline.pendingAtStop > 32)
        )
          throw Error("baseline queue is not bounded: activation refused");
        traffic = undefined;
        collectLiveLag = true;
        traffic = await startTraffic({ ...liveOptions, id: "sweep" });
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
    await stopFollowing();
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
      heapUsedBytes: process.memoryUsage().heapUsed,
      memoryGeometryScope:
        "retained data/index and main heap after GC; cgroup peak covers all driver processes",
      wallMs: result.evaluationWallMs,
      passWallMs: result.passWallMs + report.freezeMs,
      passRate: N / ((result.passWallMs + report.freezeMs) / 1000),
      startupMs: result.startupMs,
      cpuSeconds: result.cpuSeconds,
      workerMetrics: result.workerMetrics,
      rate: result.subjectsPerSecond,
    };
    if (result.publication)
      report.publication = {
        changed: result.publication.changed,
        commits: result.publication.commits,
        wallMs: result.publication.wallMs,
        profile: {
          ...result.publication,
          responses: result.publication.responses.map((r) => r.timing),
        },
      };
    // [DX-S5] Why: retain measured activation/memory observations even if the later full oracle exceeds its hold.
    // Rejected: calling incomplete exactness a PASS or losing all timing observations on a verifier timeout.
    console.log(
      JSON.stringify({
        kind: candidateVerification ? "verification-evaluation" : "activation-measurement",
        exactness: "pending",
        N,
        scope,
        releaseHash: W0.R2.hash,
        subjects: result.records.length,
        cut,
        evaluation: report.evaluation,
        publication: report.publication,
        combinedWallMs: report.evaluation.passWallMs + (report.publication?.wallMs ?? 0),
        baseline: report.baseline,
        live: report.live,
        matched: report.matched,
        liveFollow: report.liveFollow,
        cgroupPeakBytes: fs.existsSync("/sys/fs/cgroup/memory.peak")
          ? Number(fs.readFileSync("/sys/fs/cgroup/memory.peak", "utf8"))
          : null,
      }),
    );
    // [DX-R1] Why: every independent oracle comparison is after the last publication ACK, over the frozen input cut.
    // Rejected: sampling subjects or using evaluator output as the oracle's input.
    const exactnessStarted = performance.now();
    const oracleBeforeExactness = oracleWallMs;
    let checked = 0,
      statesCompared = 0,
      expectedR1Changed = 0,
      expectedR2Changed = 0;
    const expectedTrialStates = new Map<string, string>();
    const finalPosition = await comp.currentPosition();
    report.publishedStatePosition = finalPosition;
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
        await timedOracle("publish", { state: previous, evaluations: [recordOf(output)] }),
      );
      if (next.error) throw new Error("Oracle publication error " + next.error);
      const changed =
        next.deliveries.length > 0 || canonical(next.state.items) !== canonical(previous.items);
      return { changed, state: changed ? next.state : previous };
    };
    const recordOffsets = Array.from(
      { length: candidateVerification ? 0 : Math.ceil(result.records.length / 64) },
      (_, i) => i * 64,
    );
    for await (const { records, gateway, states } of orderedMap(
      recordOffsets,
      verificationPages,
      async (offset) => {
        const records = result.records.slice(offset, offset + 64);
        const gateway = await recordedPage(
          records.map((r) => r.subject),
          { position: cut, validAt: V_W0 },
        );
        const states = argv.includes("--publish")
          ? await recordedPage(
              records.map((r) => outboxEntity(r.subject)),
              { position: finalPosition, validAt: V_W0 },
            )
          : undefined;
        return { records, gateway, states };
      },
    )) {
      const rowIndex = new Map<string, (typeof gateway.rows)[number][]>();
      for (const row of gateway.rows) {
        const list = rowIndex.get(row.entityId) ?? [];
        list.push(row);
        rowIndex.set(row.entityId, list);
      }
      await forEachBounded(records, oracleConcurrency, async (r) => {
        const world = worldOf(r.subject, reachableRows([r.subject], gateway.rows, rowIndex));
        if (
          worldSha256(world) !== r.worldSha256 ||
          worldCanonical(world) !== worldCanonical(worldOf(r.subject, snap.world(r.subject)))
        )
          throw new Error("Frozen world/gateway mismatch " + r.subject);
        let paired: any;
        if (batchOracle && states) {
          const r1World = worldOf(r.subject, r1Snapshot.world(r.subject));
          paired = JSON.parse(
            await timedOracle("activation-check", {
              world,
              ...(worldCanonical(r1World) === worldCanonical(world) ? {} : { r1World }),
              basisR1: { tx: r1Position, validTime: W0.POPULATION_VALID_TIME },
              basisR2: { tx: cut, validTime: W0.POPULATION_VALID_TIME },
            }),
          );
        }
        const expected = paired
          ? paired.R2
          : await timedOracle("evaluate", {
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
          let expectedState: any;
          if (paired) {
            expectedR1Changed += Number(paired.r1Changed);
            expectedR2Changed += Number(paired.r2Changed);
            expectedState = paired.state;
          } else {
            const r1 = JSON.parse(
              await timedOracle("evaluate", {
                world: worldOf(r.subject, r1Snapshot.world(r.subject)),
                release: "R1",
                basis: { tx: r1Position, validTime: W0.POPULATION_VALID_TIME },
              }),
            );
            const first = await applyExpected({ items: [], pending: [], subjects: [] }, r1);
            const second = await applyExpected(first.state, JSON.parse(expected));
            expectedR1Changed += Number(first.changed);
            expectedR2Changed += Number(second.changed);
            expectedState = second.state;
          }
          const rows = states.rows.filter(
            (row) => row.entityId === outboxEntity(r.subject) && row.attribute === "p5/state",
          );
          if (rows.length > 1) throw new Error("Ambiguous published state");
          const actual = rows.length
            ? wireState(JSON.parse(rows[0].value.value))
            : { items: [], pending: [], subjects: [] };
          const expectedBytes = canonical(expectedState);
          if (canonical(actual) !== expectedBytes)
            throw new Error("Independent published state mismatch " + r.subject);
          if (publicationTrials.length) expectedTrialStates.set(r.subject, expectedBytes);
          statesCompared++;
        }
        checked++;
      });
    }
    if (
      statesCompared &&
      (expectedR1Changed !== report.r1Publication.changed ||
        expectedR2Changed !== report.publication.changed)
    )
      throw new Error("Changed subject coverage mismatch");
    report.publishedStatesCompared = statesCompared;
    report.oracleCompared = checked;
    report.oracleConcurrency = oracleConcurrency;
    report.oracleProcesses = oracleProcesses;
    report.oracleTransport = batchOracle ? "batched unchanged O-DOMAIN" : "original";
    report.postAckExactnessWallMs = performance.now() - exactnessStarted;
    report.postAckOracleWallMs = oracleWallMs - oracleBeforeExactness;
    console.log(
      JSON.stringify({
        kind: candidateVerification ? "main-exactness-not-rerun" : "post-ack-equality",
        sourcePosition: cut,
        publishedStatePosition: report.publishedStatePosition,
        subjects: checked,
        states: statesCompared,
        exactnessWallMs: report.postAckExactnessWallMs,
        oracleWallMs: report.postAckOracleWallMs,
        evaluation: report.evaluation,
        publication: report.publication && {
          changed: report.publication.changed,
          commits: report.publication.commits,
          wallMs: report.publication.wallMs,
        },
        liveFollow: report.liveFollow,
        matched: report.matched,
      }),
    );
    const references = argv.includes("--candidates")
      ? compactCandidateReferences(result.records, Boolean(publicationTrials.length))
      : { candidates: [], worlds: [] };
    const sharedCandidateBytes = references.candidates,
      sharedWorldHashes = references.worlds;
    let trialR1Reference: string[] = [];
    if (argv.includes("--candidates")) {
      // [DX-S5] Why: all single-release records have already been verified (or will be checked as candidate zero).
      // Rejected: retaining duplicate object graphs until the three-candidate deserializer exhausts Node's heap.
      result.records.length = 0;
      (globalThis as any).gc?.();
      const position = cut;
      const variant = (id: string, key: string, n: number) =>
        W0.compileRelease({
          ...W0.R2.doc,
          rules: W0.R2.doc.rules.map((r) =>
            r.id === id ? ({ ...r, params: { [key]: n } } as any) : r,
          ),
        });
      // [DX-S5] Why: the three canonical releases all have an independent Python oracle; keep the prior custom candidates as the default.
      // Rejected: reporting three-candidate exactness after checking only the shared R2 candidate.
      const canonicalCandidates = argv.includes("--oracle-candidates");
      const candidateReleases = canonicalCandidates
        ? [W0.R2, W0.R1, W0.R3]
        : [
            W0.R2,
            variant("OT", "thresholdMinutes", 2700),
            variant("PAYCHG", "thresholdCents", 700),
          ];
      const multi = await evaluateAll({
        replica,
        subjects,
        position,
        workers,
        view: snap,
        // [DX-R1] Why: compare one and three candidates under the same live reader/writer profile.
        // Rejected: timing the three-candidate pass after stopping all live traffic.
        beforeTimedWindow: async () => {
          if (!live) return;
          collectLiveLag = false;
          await startFollowing();
          traffic = await startTraffic({ ...liveOptions, id: "candidates" });
        },
        releases: candidateReleases,
      });
      console.log(
        JSON.stringify({
          kind: "candidate-measurement",
          exactness: "pending",
          N,
          cut,
          subjects: multi.records.length,
          releaseHashes: candidateReleases.map((r) => r.hash),
          wallMs: multi.evaluationWallMs,
          passWallMs: multi.passWallMs + report.freezeMs,
          live: Boolean(traffic),
        }),
      );
      const candidateTraffic = traffic as Awaited<ReturnType<typeof startW0Live>> | undefined;
      const candidateLive = candidateTraffic ? await candidateTraffic.stop() : undefined;
      traffic = undefined;
      await stopFollowing();
      if (multi.records.length !== N || sharedCandidateBytes.length !== N)
        throw new Error("Candidate subject coverage mismatch");
      for (let i = 0; i < multi.records.length; i++) {
        if (canonical(multi.records[i].candidates[0]) !== sharedCandidateBytes[i])
          throw new Error("Candidate pass changed its shared R2 input/output cut");
      }
      const candidateOracleStarted = performance.now();
      let candidateOracleCompared = 0;
      if (canonicalCandidates) {
        await forEachBounded(multi.records, oracleConcurrency, async (r) => {
          const world = worldOf(r.subject, snap.world(r.subject));
          if (worldSha256(world) !== r.worldSha256 || r.candidates.length !== 3)
            throw new Error("Candidate world/coverage mismatch");
          const batchExpected = batchOracle
            ? JSON.parse(
                await timedOracle("evaluate-many", {
                  world,
                  requests: ["R2", "R1", "R3"].map((release) => ({
                    release,
                    basis: { tx: cut, validTime: W0.POPULATION_VALID_TIME },
                  })),
                }),
              )
            : undefined;
          if (batchExpected && batchExpected.length !== 3)
            throw Error("Incomplete oracle candidate batch");
          for (let j = 0; j < 3; j++) {
            const expected = batchExpected
              ? batchExpected[j]
              : await timedOracle("evaluate", {
                  world,
                  release: ["R2", "R1", "R3"][j],
                  basis: { tx: cut, validTime: W0.POPULATION_VALID_TIME },
                });
            const candidate = r.candidates[j];
            if (W0.outputJson(candidate.output) !== expected)
              throw new Error("Candidate Python output mismatch " + r.subject);
            const record = {
              ...candidate.record,
              workItems: candidate.record.workItems.map((w) => ({
                ...w,
                payload: JSON.parse(w.payload),
              })),
            };
            if (canonical(record) !== canonical(recordOf(JSON.parse(expected))))
              throw new Error("Candidate Python record mismatch " + r.subject);
            candidateOracleCompared++;
          }
        });
        if (candidateOracleCompared !== N * 3)
          throw new Error("Candidate oracle coverage mismatch");
      }
      (globalThis as any).gc?.();
      report.candidates = {
        heapUsedBytes: process.memoryUsage().heapUsed,
        retainedSubjects: multi.records.length,
        oracleCompared: candidateOracleCompared,
        oracleWallMs: canonicalCandidates ? performance.now() - candidateOracleStarted : null,
        releaseHashes: candidateReleases.map((r) => r.hash),
        wallMs: multi.evaluationWallMs,
        ratio: multi.evaluationWallMs / result.evaluationWallMs,
        passWallMs: multi.passWallMs + report.freezeMs,
        passRatio: (multi.passWallMs + report.freezeMs) / (result.passWallMs + report.freezeMs),
        cpuSeconds: multi.cpuSeconds,
        workerMetrics: multi.workerMetrics,
        live: candidateLive,
      };
      console.log(JSON.stringify({ kind: "candidates", ...report.candidates }));
      if (publicationTrials.length) {
        if (
          candidateOracleCompared !== 3 * N ||
          expectedTrialStates.size !== N ||
          cut !== seedPosition ||
          r1Position !== seedPosition
        )
          throw Error("publication trials lack complete independent references");
        trialR1Reference = multi.records.map((r) => canonical(r.candidates[1]));
        multi.records.length = 0;
      }
    }
    // [DX-S5] Why: reuse complete independently checked canonical expectations only for identical immutable P/release inputs.
    // Rejected: rerunning the expensive bootstrap/oracle for each scheduler setting, sampling states, or using unverified evaluator bytes.
    report.publicationTrials = [];
    (globalThis as any).gc?.();
    for (const trial of publicationTrials) {
      process.env.TX2_W0_OUTBOX_NAMESPACE = trial.id;
      try {
        await followTo(await comp.currentPosition());
        const initial = await comp.currentPosition();
        let absent = 0;
        const offsets = Array.from({ length: Math.ceil(N / 64) }, (_, i) => i * 64);
        for await (const page of orderedMap(offsets, verificationPages, (i) =>
          recordedPage(subjects.slice(i, i + 64).map(outboxEntity), {
            position: initial,
            validAt: V_W0,
          }),
        )) {
          if (page.position !== initial || page.rows.length)
            throw Error("trial namespace not fresh at exact head");
          absent += Math.min(64, N - absent);
        }
        if (absent !== N) throw Error("incomplete trial absence proof");
        const activateTrial = async (release: string) => {
          const ack = await commit(
            [
              {
                op: "assert",
                entityId: "p5:tenant:" + trial.id,
                attribute: "p5/activation",
                value: { type: "string", value: release },
                validFrom: V_W0,
              },
            ],
            "trial:" + trial.id + ":activate:" + release,
          );
          await followTo(ack.position);
        };
        await activateTrial("R1");
        const r1View = await replica.snapshotAt(replica.position);
        const r1Trial = await evaluateAll({
          replica,
          subjects,
          releases: W0.R1,
          workers,
          view: r1Snapshot,
          position: r1Position,
          publish: comp,
          publication: {
            frameSize: trial.r1Size ?? 256,
            inflight: trial.r1Inflight ?? 8,
            readStates: (ids) => ids.flatMap((id) => r1View.world(id)),
          },
        });
        if (
          r1Trial.records.length !== N ||
          r1Trial.publication!.changed !== expectedR1Changed ||
          r1Trial.publication!.responses.some((r) => r.retry)
        )
          throw Error("R1 trial publication coverage/replay mismatch");
        for (let i = 0; i < N; i++)
          if (
            r1Trial.records[i].subject !== subjects[i] ||
            r1Trial.records[i].worldSha256 !== sharedWorldHashes[i] ||
            canonical(r1Trial.records[i].candidates[0]) !== trialR1Reference[i]
          )
            throw Error("R1 trial differs from independently checked bytes");
        const profile = (p: NonNullable<typeof r1Trial.publication>) => ({
          ...p,
          responses: p.responses.map((r) => r.timing),
        });
        const r1Metric = {
          evaluationMs: r1Trial.evaluationWallMs,
          passMs: r1Trial.passWallMs,
          publication: profile(r1Trial.publication!),
        };
        r1Trial.records.length = 0;
        r1Trial.publication!.responses.length = 0;
        await followTo(await comp.currentPosition());
        await activateTrial("R2");
        const stateView = await replica.snapshotAt(replica.position);
        const options = {
          ...liveOptions,
          commandNamespace: trial.id,
          replica: trial.mode === "replica" ? replica : undefined,
          currentReads: trial.mode === "replica" ? currentReads : undefined,
        };
        let baseline: any;
        const r2Trial = await evaluateAll({
          replica,
          subjects,
          releases: W0.R2,
          workers,
          view: snap,
          position: cut,
          publish: comp,
          publication: {
            frameSize: trial.size,
            inflight: trial.inflight,
            gapMs: trial.gapMs,
            yieldToWriter: trial.yieldToWriter,
            maxWriterYieldMs: trial.maxWriterYieldMs,
            readStates: (ids) => ids.flatMap((id) => stateView.world(id)),
          },
          beforeTimedWindow: async () => {
            await startFollowing();
            traffic = await startTraffic({ ...options, id: trial.id + "-baseline" });
            await new Promise((r) => setTimeout(r, Number(opt("baseline-ms", "30000"))));
            baseline = await traffic.stop();
            traffic = undefined;
            traffic = await startTraffic({ ...options, id: trial.id + "-sweep" });
          },
        });
        const during = await traffic!.stop();
        traffic = undefined;
        await stopFollowing();
        const stateCut = await comp.currentPosition();
        if (
          r2Trial.records.length !== N ||
          r2Trial.publication!.changed !== expectedR2Changed ||
          r2Trial.publication!.responses.some((r) => r.retry)
        )
          throw Error("R2 trial publication coverage/replay mismatch");
        for (let i = 0; i < N; i++)
          if (
            r2Trial.records[i].subject !== subjects[i] ||
            r2Trial.records[i].worldSha256 !== sharedWorldHashes[i] ||
            canonical(r2Trial.records[i].candidates[0]) !== sharedCandidateBytes[i]
          )
            throw Error("R2 trial differs from independently checked bytes");
        const metric = {
          id: trial.id,
          mode: trial.mode,
          sourcePosition: cut,
          initialHead: initial,
          statePosition: stateCut,
          r1: r1Metric,
          evaluationMs: r2Trial.evaluationWallMs,
          passMs: r2Trial.passWallMs,
          publication: profile(r2Trial.publication!),
          combinedWallMs: r2Trial.passWallMs + r2Trial.publication!.wallMs,
          baseline,
          live: during,
          matched: matchW0Live(baseline, during),
          outputsCompared: N,
          recordsCompared: N,
          statesCompared: 0,
          exactness: "pending",
          cgroupPeakBytes: fs.existsSync("/sys/fs/cgroup/memory.peak")
            ? Number(fs.readFileSync("/sys/fs/cgroup/memory.peak", "utf8"))
            : null,
        };
        console.log(JSON.stringify({ kind: "publication-trial-measurement", ...metric }));
        r2Trial.records.length = 0;
        r2Trial.publication!.responses.length = 0;
        for await (const page of orderedMap(offsets, verificationPages, (i) =>
          recordedPage(subjects.slice(i, i + 64).map(outboxEntity), {
            position: stateCut,
            validAt: V_W0,
          }),
        )) {
          if (page.position !== stateCut) throw Error("trial stored state cut mismatch");
          const i = metric.statesCompared;
          for (const subject of subjects.slice(i, i + 64)) {
            const rows = page.rows.filter(
              (row) => row.entityId === outboxEntity(subject) && row.attribute === "p5/state",
            );
            if (rows.length > 1) throw Error("ambiguous trial state");
            const actual = rows.length
              ? wireState(JSON.parse(rows[0].value.value))
              : { items: [], pending: [], subjects: [] };
            if (canonical(actual) !== expectedTrialStates.get(subject))
              throw Error("trial state differs from independent oracle " + subject);
            metric.statesCompared++;
          }
        }
        if (metric.statesCompared !== N) throw Error("incomplete trial state coverage");
        metric.exactness = "all-independent-reference-bytes-equal";
        report.publicationTrials.push(metric);
        console.log(JSON.stringify({ kind: "publication-trial-result", ...metric }));
      } finally {
        process.env.TX2_W0_OUTBOX_NAMESPACE = publicationId;
      }
      (globalThis as any).gc?.();
    }
    expectedTrialStates.clear();
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
      liveReaders: live ? 256 : 0,
    };
    report.finalPosition = await comp.currentPosition();
    if (candidateVerification) {
      // [DX-S5] Why: verify the read-only declaration against this hold's actual logical head at both ends.
      // Rejected: treating the absence of publication flags alone as evidence that nothing appended commands.
      if (report.finalPosition !== report.initialSeedPosition)
        throw Error("Read-only candidate verification changed the logical head");
    }
    report.currentReadIndex = currentReads
      ? {
          entries: currentReadEntities,
          historyBytes: currentReads.historyBytes,
          scope:
            "current position at fixed valid time; lookup Map in main heap, packed buffers shared with replica",
        }
      : null;
    report.rss = process.memoryUsage().rss;
    report.peakRss = process.resourceUsage().maxRSS * 1024;
    console.log(
      JSON.stringify({
        kind: candidateVerification ? "candidate-verification-result" : "result",
        ...report,
      }),
    );
    return report;
  } finally {
    if (traffic) await traffic.stop();
    await stopFollowing();
    await recorder?.close();
    oracle.close();
    bulkCounts?.close();
    feedClient.close();
    client.close();
    if (verificationComp !== comp) await verificationComp.close();
    await comp.close();
  }
}
