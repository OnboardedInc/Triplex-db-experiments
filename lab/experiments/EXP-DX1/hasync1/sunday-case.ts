import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { Evidence, inputs, sleep, type Role } from "../ha1/common.ts";
import { Stack, type Site } from "../ha1/stack.ts";
import type { Row } from "../scale1/decision/field-save.ts";
import { checkAdoptedPeer, type AdoptedSeed } from "../v01/adopt.ts";
import { checkOldRestart } from "./faults.ts";
import { SyncPair, sundayProfile, type SundayPair } from "./pair.ts";
import { lsn, wait } from "./supervisor.ts";
import {
  partitionReceipts,
  readReceipts,
  seedPosition,
  sundayTraffic,
  windows,
} from "./sunday-traffic.ts";

export const sundayCases = [
  { name: "b-50", rate: 50, policy: "B", kind: "fault", budget: 42 },
  { name: "b-235", rate: 235, policy: "B", kind: "fault", budget: 42 },
  { name: "a-50", rate: 50, policy: "A", kind: "fault", budget: 35 },
  { name: "a-235", rate: 235, policy: "A", kind: "fault", budget: 35 },
  { name: "move-235", rate: 235, policy: "B", kind: "planned", budget: 32 },
  { name: "fence-50", rate: 50, policy: "B", kind: "fault", budget: 28 },
] as const;
type Cell = (typeof sundayCases)[number];

export async function sundayCase(
  parent: string,
  session: string,
  cell: Cell,
  seed: SundayPair & { origin: AdoptedSeed },
  assign: (e: Evidence) => { a: Site; b: Site },
) {
  const mode = cell.kind === "planned" ? "hasync-move" : "hasync-ack";
  const e = new Evidence(parent, mode, session);
  const { a, b } = assign(e);
  const bindings = {
    session,
    nonce: e.nonce,
    slot: e.slot,
    source: e.source,
    cell,
    seedSha256: seed.primary.sha256,
    cluster: seed.primary.cluster,
  };
  e.write("sunday-inputs", bindings);
  const sizes: [Role, number, string][] = [
    ["tool", 256, "9"],
    ["pg", sundayProfile.pg.memoryMiB, sundayProfile.pg.cpus],
    ["target", sundayProfile.pg.memoryMiB, sundayProfile.pg.cpus],
    ...(["active", "standby", "write", "read", "write-b"] as const).map(
      (role): [Role, number, string] => {
        const p =
          sundayProfile[
            role === "active" || role === "standby" ? "tx" : role === "read" ? "gw-r" : "gw-w"
          ];
        return [role, p.memoryMiB, p.cpus!];
      },
    ),
  ];
  const secret = () => randomBytes(18).toString("hex");
  const stack = new Stack(
    e,
    a,
    b,
    { secret: secret(), admin: secret() },
    new Map(sizes.map(([role, cap]) => [role, cap])),
    new Map(sizes.map(([role, , cpus]) => [role, cpus])),
  );
  const pair = new SyncPair(stack, undefined, undefined, seed);
  let traffic: Awaited<ReturnType<typeof sundayTraffic>> | undefined;
  let reader: DatomicClient | undefined;
  try {
    await stack.open();
    const start = performance.now();
    const { ac } = await pair.open();
    const primaryReadyMs = performance.now() - start;
    const initialStandby = await pair.clone();
    await pair.service();
    await pair.checkServerProfile();
    const original = new DatomicClient(pair.writer, 20000);
    const originalReceipts = await checkAdoptedPeer(original, seed.origin, seedPosition).finally(
      () => original.close(),
    );
    e.write("sunday-origin", { ...bindings, originalReceipts });
    reader = new DatomicClient(pair.reader, 5500);
    assert.equal((await reader.basis(ac.db)).position.v, String(seedPosition));
    for (const role of ["pg", "target"] as const)
      assert.equal(
        await pair.sql(
          role,
          "select current_setting('synchronous_commit'),current_setting('fsync'),current_setting('full_page_writes')",
        ),
        "on|on|on",
      );
    if (cell.kind === "planned") pair.nextWriter = await pair.gateway("write-b", b, "target");
    let returning: unknown;
    if (cell.name === "fence-50")
      pair.beforeReplacement = async () => {
        returning = { processes: await checkOldRestart(pair), disk: await pair.probeOldDiskBoot() };
      };
    traffic = await sundayTraffic(e, pair.route!, reader, seed.scope, cell.rate);
    const flow = traffic;
    assert.equal(flow.db, ac.db);
    await sleep(12250);
    const policy = cell.policy === "A" ? "single-copy-after-fence" : "two-copy";
    const supervisor = pair.supervisor();
    let faultAt: number;
    if (cell.kind === "planned") {
      await supervisor.run("planned", policy);
      faultAt = pair.transitions.find((x) => x.stage === "sealed")!.at;
    } else {
      const killed = await Promise.all([stack.kill("pg"), stack.kill("active")]);
      faultAt = Math.min(...killed.map((r) => r.from));
      await supervisor.run("fault", policy);
    }
    const routedAt = pair.transitions.find((x) => x.stage === "routed")!.at;
    const newEpoch = pair.route!.currentEpoch();
    await wait("fresh scheduled commit after routing", 120000, async () =>
      flow.rows.some((r) => r.receipt && r.epoch === newEpoch) ? true : undefined,
    );
    // [DX-HASYNC1] Why: measure a visible one-copy exposure while the same field workload remains active. Rejected: inferring the loss from writable configuration alone.
    await sleep(cell.policy === "A" ? 8000 : 4000);
    const stopAt = await flow.stop();
    const summary = windows(flow.rows, faultAt, routedAt, stopAt, newEpoch);
    const cohorts = partitionReceipts(flow.rows, newEpoch);
    assert(
      cohorts.before.length && cohorts.after.length,
      "Both writer epochs must acknowledge a save",
    );
    const recent = flow.rows.filter(
      (r) => r.kind === "save" && r.due >= faultAt - 1000 && r.due < faultAt,
    );
    assert(
      recent.some((row) => row.receipt && row.end < faultAt),
      "No acknowledged save from the fault's last second of offered load",
    );
    const all = [...cohorts.before, ...cohorts.after];
    const survivor = await readReceipts(reader, ac.db, all, (batch) =>
      e.log("sunday-survivor-read", batch),
    );
    assert(
      await reader.claim(ac.db, originalReceipts.terminal, seedPosition),
      "Seed terminal receipt is absent on the survivor",
    );
    assert(
      await reader.claim(ac.db, originalReceipts.manifest, 1),
      "Seed manifest receipt is absent on the survivor",
    );
    const boundary = { bindings, database: ac.db, faultAt, routedAt, stopAt, summary };
    e.write("sunday-survivor", { ...boundary, rows: survivor });
    assert(
      survivor.every((entry) => entry.observed),
      "An acknowledged receipt is missing on the first survivor",
    );
    assert(!flow.rows.some((row) => row.state === "wrong"));
    assert(summary.reads > 0 && summary.firstReceipt);
    for (const receipt of [cohorts.before, cohorts.after].map((epoch) =>
      epoch.find((r) => flow.samples.has(r.operationId)),
    )) {
      assert(receipt, "Missing a field witness from one writer epoch");
      const wanted = flow.samples.get(receipt.operationId)!;
      const actual: readonly Row[] = await reader.rows(ac.db, {
        entityIds: [wanted[0]!.entity_id],
        basisT: receipt.t.v,
        basis: { validAt: SEED_VALID_FROM, recordedPosition: Number(receipt.position.v) },
      });
      const triples: (Row | undefined)[] = wanted.map((r) => actual.find((row) => row.id === r.id));
      assert.deepEqual(
        triples.map(
          (r) => r && [r.id, r.attribute, r.value_type, r.value_string, r.recorded_position],
        ),
        wanted.map((r) => [r.id, r.attribute, r.value_type, r.value_string, r.recorded_position]),
      );
      e.log("sunday-field-witness", { receipt, wanted, triples });
    }
    let loss: { previouslyProtected: number; oneCopy: number; exposed: number } | undefined;
    let copy:
      | { copyMs?: number; toProtectedReceiptMs: number; remoteFlush: string; required: string }
      | undefined;
    if (cell.policy === "A") {
      assert.equal(
        await pair.sql(
          "target",
          "select current_setting('synchronous_commit'),current_setting('synchronous_standby_names')",
        ),
        "on|",
      );
      assert.equal(await pair.sql("target", "select count(*) from pg_stat_replication"), "0");
      pair.route!.seal();
      const secondStop = await Promise.all([stack.kill("target"), stack.kill("standby")]);
      const old = await pair.inspectFirstDisk();
      const disk = new DatomicClient(old.url, 10000);
      try {
        const missing = await readReceipts(disk, ac.db, all, (batch) =>
          e.log("sunday-second-failure-read", batch),
        );
        loss = {
          previouslyProtected: missing.slice(0, cohorts.before.length).filter((r) => !r.observed)
            .length,
          oneCopy: missing.slice(cohorts.before.length).filter((r) => !r.observed).length,
          exposed: cohorts.after.length,
        };
        const { url: _url, ...diskIdentity } = old;
        e.write("sunday-second-failure", {
          ...boundary,
          secondStop,
          diskIdentity,
          rows: missing,
          loss,
        });
        assert.deepEqual(loss, {
          previouslyProtected: 0,
          oneCopy: cohorts.after.length,
          exposed: cohorts.after.length,
        });
      } finally {
        disk.close();
      }
    } else {
      const required = await pair.sql("target", "select pg_current_wal_flush_lsn()");
      const remoteFlush = await wait(
        "protected current receipt on the rebuilt pair",
        15000,
        async () => {
          const value = await pair.sql(
            "target",
            "select flush_lsn from pg_stat_replication where application_name='sync_a' and sync_state='sync' and state='streaming'",
          );
          return value && lsn(value) >= lsn(required) ? value : undefined;
        },
      );
      assert.equal(await pair.sql("pg", "select pg_is_in_recovery()"), "t");
      assert(summary.firstWriteMs !== null);
      copy = {
        ...(pair.replacement ? { copyMs: pair.replacement.copiedMs } : {}),
        toProtectedReceiptMs: summary.firstWriteMs,
        remoteFlush,
        required,
      };
    }
    const result = {
      ...boundary,
      sender: {
        offered: flow.rows.filter((r) => r.kind === "save").length,
        lastSecondOffered: recent.length,
        lastSecondAcknowledgedBeforeFault: recent.filter((r) => r.receipt && r.end < faultAt)
          .length,
        preFailureAcknowledged: cohorts.before.length,
        newWriterAcknowledged: cohorts.after.length,
        initialHealthyOffers: flow.rows.filter((r) => r.kind === "save" && r.due < faultAt).length,
      },
      primaryReadyMs,
      initialStandby,
      startupMs: flow.start - start,
      firstLoss: survivor.filter((entry) => !entry.observed).length,
      bars: {
        lost: survivor.every((entry) => entry.observed),
        writes60s: summary.firstWriteMs !== null && summary.firstWriteMs <= 60000,
        reads: summary.reads > 0 && summary.missedReads === 0,
        ...(cell.kind === "planned"
          ? { move30s: summary.firstWriteMs !== null && summary.firstWriteMs <= 30000 }
          : {}),
      },
      ...(copy ? { copy } : {}),
      ...(loss ? { loss } : {}),
      ...(returning ? { returning } : {}),
    };
    e.write("sunday-observation", result);
    return { dir: e.dir, ...result };
  } catch (error) {
    const message = stack.redact(error instanceof Error ? error.message : String(error));
    e.write("failure", { ...bindings, message });
    throw new Error(message);
  } finally {
    try {
      await traffic?.stop();
    } finally {
      reader?.close();
      try {
        await stack.capture();
      } finally {
        await stack.cleanup();
        await pair.cleanup();
        e.write("cleanup", { ...bindings, containers: 0, networks: 0, volumes: 0 });
      }
      assert.deepEqual(inputs(mode), e.source);
    }
  }
}
