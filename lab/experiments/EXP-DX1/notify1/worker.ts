import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { openComposition } from "../../../bench/lib/composition.ts";
import { sqliteStore } from "../act1/sqlite.ts";
import { Dispatcher, type Metrics } from "./dispatcher.ts";
import { Relay } from "./relay.ts";
import { Notices } from "./journal.ts";
import { Fixture } from "./fixture.ts";
import { Documents } from "./store.ts";
import type { Tail } from "./journal.ts";
import { deepInputs } from "./deep.ts";

export interface Job {
  source: string;
  recipient: string;
  directory?: string;
  deep: boolean;
  subjects: number;
  epoch: string;
  gap: number;
  priority: boolean;
  profileDir?: string;
  recipientPages?: number;
  releases?: number;
  readIntervalMs?: number;
  sourceEndpoint?: string;
  publicationPosition?: number;
}
export function recipient(name: string, directory?: string) {
  return directory ? sqliteStore(directory, name) : openComposition("reach", "datomic", name);
}
export function separate(
  job: Job,
  grant: (() => Promise<void>) | undefined,
  onEffect: () => void,
  signal: AbortSignal,
) {
  const child = fork(fileURLToPath(import.meta.url), [], {
    execArgv: ["--experimental-strip-types"],
    stdio: ["ignore", "inherit", "inherit", "ipc"],
    signal,
  });
  return new Promise<Metrics>((resolve, reject) => {
    let result: Metrics | undefined, failure: string | undefined;
    child.on("error", reject);
    child.on("message", async (msg: any) => {
      try {
        assert(msg.epoch === job.epoch);
        if (msg.kind === "grant") {
          await grant?.();
          if (child.connected) child.send({ kind: "granted", epoch: job.epoch });
        } else if (msg.kind === "effect") onEffect();
        else if (msg.kind === "done") result = msg.metrics;
        else if (msg.kind === "error") failure = msg.message;
        else throw Error("Unexpected dispatcher response");
      } catch (e) {
        reject(e);
        child.kill();
      }
    });
    child.on("exit", (code) =>
      code === 0 && result
        ? resolve(result)
        : reject(Error(failure ?? "Dispatcher exited " + code)),
    );
    child.send(job);
  });
}
if (process.argv[1] === import.meta.filename) {
  process.once("message", async (job: Job) => {
    const send = (data: unknown) => process.send!({ epoch: job.epoch, ...(data as object) });
    const inherited = process.env.DATOMIC_URL;
    if (job.sourceEndpoint) {
      assert(job.recipientPages && job.directory && job.publicationPosition);
      assert(job.sourceEndpoint !== inherited);
      process.env.DATOMIC_URL = job.sourceEndpoint;
    }
    const source = await openComposition("reach", "datomic", job.source).finally(() => {
      if (inherited === undefined) delete process.env.DATOMIC_URL;
      else process.env.DATOMIC_URL = inherited;
    });
    const receiver = await recipient(job.recipient, job.directory);
    try {
      if (job.sourceEndpoint) assert.equal(source.backend.url, job.sourceEndpoint);
      const budget = job.profileDir
        ? new (await import("./budget.ts")).Budget({
            epoch: job.epoch,
            role: "worker",
            dir: job.profileDir,
          })
        : undefined;
      // [DX-STG1] Why: this peer has no write-queue class because progress is
      // committed at the recipient. Rejected: silently retrying on the writer.
      const transport = job.sourceEndpoint
        ? {
            ...source,
            transact: async (): Promise<never> => {
              throw Error("Dedicated sender cannot write source");
            },
          }
        : source;
      const src = budget?.store(transport, "source") ?? transport;
      const a = new Notices(
        src,
        "account",
        job.deep ? deepInputs(src, job.subjects) : new Fixture(src, job.subjects),
      );
      assert.equal((await a.observe()).value.epoch, job.epoch);
      if (job.publicationPosition) {
        const cut = await a.db.get<Tail>("tail", job.publicationPosition);
        assert.equal(cut.value.epoch, job.epoch);
        assert.equal(cut.value.sequence, (job.releases ?? 1) + 1);
        assert.equal(cut.at, job.publicationPosition);
      }
      const sink = new Documents(budget?.store(receiver, "receiver") ?? receiver, "effects");
      const d = job.recipientPages
        ? new Relay(a, sink, job.recipientPages, job.readIntervalMs)
        : new Dispatcher(a, sink);
      a.budget = budget;
      if (budget) budget.enabled = true;
      const grant = job.priority
        ? async () => {
            const t = performance.timeOrigin + performance.now();
            await new Promise<void>((resolve) => {
              process.once("message", (m: any) => {
                assert(m.kind === "granted" && m.epoch === job.epoch);
                resolve();
              });
              send({ kind: "grant" });
            });
            budget?.mark("foreground-grant", t);
          }
        : undefined;
      const metrics = await d.drain({
        through: (job.releases ?? 1) + 1,
        gapMs: job.gap,
        grant,
        afterReceive: async () => {
          send({ kind: "effect" });
        },
      });
      const cpu = process.cpuUsage();
      budget?.mark("child-total-cpu", performance.timeOrigin + performance.now(), { cpu });
      budget?.finish();
      send({ kind: "done", metrics });
    } catch (e) {
      send({ kind: "error", message: String(e) });
      process.exitCode = 1;
    } finally {
      await receiver.close();
      await source.close();
      process.disconnect?.();
    }
  });
}
