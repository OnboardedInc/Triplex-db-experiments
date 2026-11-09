import { CountLedger } from "./w0-counts.ts";
import { DomainOracle, wireRecord, emptyWireState } from "./w0-gates.ts";
import { fork } from "node:child_process";
import { Rng, seedOf } from "./rng.ts";
import { subjectHash } from "./sweep.ts";
import { canonical, sha256, type PositionBasis } from "./w0-world.ts";
import type { CompositionHandle } from "./composition.ts";
export async function recoverSweep(o: {
  comp: CompositionHandle;
  subjects: readonly string[];
  basis: PositionBasis;
  scope: string;
  cursor: string;
  sweepId: string;
  release?: string;
  activations?: readonly any[];
  seed: string;
  stops?: number;
  validate?: (records: readonly any[]) => Promise<void>;
}) {
  if (!o.activations?.length)
    throw new Error("G4 publication requires activation/reconcile records");
  const pages = Math.ceil(o.subjects.length / 64),
    count = o.stops ?? 10;
  if (pages < count || count < 1)
    throw new Error("G4 needs enough distinct pages for process stops");
  const ledger = new CountLedger(await o.comp.storeCounts());
  const oracle = new DomainOracle();
  let expectedState: any = emptyWireState();
  const rng = new Rng(seedOf(o.seed));
  const targets = new Set<number>();
  while (targets.size < count) targets.add(rng.int(pages));
  const schedule = [...targets]
    .sort((a, b) => a - b)
    .map((page, i) => ({ page, phase: i % 2 ? "checkpoint" : "publish" }));
  const expectedDeliveries = new Map<string, string>();
  const pageDeliveries = new Map<number, string>();
  const expected = new Map<string, string>(),
    deliveries = new Map<string, string>();
  let retries = 0,
    publications = 0;
  const processes: any[] = [];
  const options = {
    lane: "xtdb",
    ...(o.comp.positionBinding
      ? { positionBinding: o.comp.positionBinding(o.basis.position) }
      : {}),
    scope: o.scope,
    subjects: o.subjects,
    basis: o.basis,
    sweepId: o.sweepId,
    cursor: o.cursor,
    release: o.release ?? "R2",
    activations: o.activations,
  };
  const run = async (stop?: { page: number; phase: string }, reference = false) => {
    const child = fork(new URL("./sweep-process.ts", import.meta.url), [], {
      serialization: "advanced",
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    });
    let failure: string | undefined,
      completed = false,
      stopped = false;
    let stderr = "";
    child.stderr?.on("data", (d) => (stderr += d));
    const timeout = setTimeout(() => {
      failure = "G4 child deadline";
      child.kill("SIGKILL");
    }, 600_000);
    const handle = async (m: any) => {
      if (m.type === "failure") {
        failure = m.error;
        return;
      }
      if (m.type === "done") {
        completed = m.result?.complete === true;
        return;
      }
      if (m.type !== "rpc") return;
      try {
        let value: any;
        if (m.method === "sweepPage") value = await o.comp.sweepPage(m.args[0], m.args[1]);
        else if (m.method === "publish") {
          const [records, page] = m.args;
          await o.validate?.(records);
          for (const r of records) {
            const bytes = canonical({ world: r.world, output: r.output, record: r.record });
            if (reference) {
              if (expected.has(r.subject)) throw new Error("reference duplicate subject");
              expected.set(r.subject, bytes);
            } else if (expected.get(r.subject) !== bytes)
              throw new Error("G4 recovered output differs");
          }
          // [EXP-P5-R2] Why: an independent reference must not pre-populate the recovery outbox. Rejected: publishing the reference (turns every interrupted attempt into a retry-only test).
          if (reference) {
            const expectedPublish = JSON.parse(
              await oracle.call("publish", {
                state: expectedState,
                evaluations: records.map((r: any) => wireRecord(r.record)),
              }),
            );
            expectedState = expectedPublish.state;
            const referenceDeliveries = expectedPublish.deliveries.map((d: any) => ({
              ...d,
              payload: canonical(d.payload),
            }));
            pageDeliveries.set(page, canonical(referenceDeliveries));
            for (const d of referenceDeliveries) {
              const key = d.id + ":" + d.seq;
              if (expectedDeliveries.has(key)) throw new Error("independent reference duplicate");
              expectedDeliveries.set(key, canonical(d));
            }
            value = { deliveries: referenceDeliveries, referenceOnly: true };
          } else {
            value = await o.comp.publishOutbox(records.map((r: any) => r.record));
            if (pageDeliveries.get(page) !== canonical(value.deliveries))
              throw new Error("G4 delivery bytes differ from independent reference");
            if (value.retry) retries++;
            else {
              if (!value.operations || !value.receipt)
                throw Error("G9 missing publication receipt");
              ledger.add(value.operations, value.receipt);
              publications++;
              for (const d of value.deliveries) {
                const key = d.id + ":" + d.seq;
                if (deliveries.has(key)) throw new Error("G4 duplicate visible delivery");
                deliveries.set(key, canonical(d));
              }
            }
          }
          if (!reference && stop?.phase === "publish" && stop.page === page) {
            stopped = true;
            child.kill("SIGKILL");
            return;
          }
        } else if (m.method === "checkpoint") {
          if (!reference && stop?.phase === "checkpoint" && stop.page === m.args[0]) {
            stopped = true;
            child.kill("SIGKILL");
            return;
          }
        } else throw new Error("unknown G4 RPC");
        if (child.connected) child.send({ type: "reply", id: m.id, value });
      } catch (e: any) {
        failure = String(e.stack ?? e);
        child.kill("SIGKILL");
      }
    };
    child.on("message", (m) => void handle(m));
    const exit = new Promise<void>((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        clearTimeout(timeout);
        processes.push({ pid: child.pid, code, signal, stopped, completed, stop: stop ?? null });
        if (failure) reject(new Error(failure));
        else if (stopped && signal === "SIGKILL") resolve();
        else if (code === 0 && completed) resolve();
        else reject(new Error(`G4 unexpected exit ${code}/${signal}: ${stderr}`));
      });
    });
    child.send({
      type: "start",
      options: { ...options, cursor: reference ? o.cursor + ".reference" : o.cursor },
    });
    await exit;
    if (stop && !stopped) throw new Error("G4 scheduled process stop did not occur");
  };
  try {
    const referenceCounts = await o.comp.storeCounts();
    await run(undefined, true);
    if (canonical(referenceCounts) !== canonical(await o.comp.storeCounts()))
      throw new Error("reference mutated store");
    if (
      expected.size !== o.subjects.length ||
      subjectHash([...expected.keys()].sort()) !== subjectHash(o.subjects)
    )
      throw new Error("G4 reference coverage mismatch");
    for (const stop of schedule) await run(stop);
    await run();
    if (
      publications !== pages ||
      canonical([...deliveries.entries()].sort()) !==
        canonical([...expectedDeliveries.entries()].sort())
    )
      throw new Error("G4 first publications/delivery coverage mismatch");
    const counts = await ledger.finish(o.comp);
    // [EXP-P5-R2] Why: actual abrupt controller exits, unchanged owner, persisted page cursor and byte-equal outputs establish restart behavior. Rejected: caught callbacks pretending to be a process stop.
    return {
      status: "PASS" as const,
      scope: o.scope,
      basis: o.basis,
      subjects: o.subjects.length,
      listSha256: subjectHash(o.subjects),
      seed: o.seed,
      schedule,
      processes,
      retries,
      publications,
      visibleDeliveries: deliveries.size,
      outputsSha256: sha256(canonical([...expected.entries()].sort())),
      complete: true,
      referencePublication: false,
      referenceCounts,
      counts,
      oracle: "fresh O-DOMAIN publish; reference never writes the outbox",
    };
  } finally {
    oracle.close();
  }
}
