import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { readWriteOptions } from "../../w1/write-options.ts";
import { SEED_VALID_FROM } from "../../../../bench/lib/world.ts";
import { checkCell, ratios, type Observation } from "./check.ts";
import { now, type Begin, type Feed, type ReadResult, type Scope } from "./observer.ts";
import {
  cellKey,
  cellOrder,
  cellSeconds,
  field,
  rates,
  repetitions,
  sha,
  task,
  writeTape,
} from "./plan.ts";
import { disk, engineResources, write, type Destination } from "./seed.ts";
import { play, preload, resolveUncertain } from "./writes.ts";
import type { Request } from "./server.ts";

function message<T>(child: ChildProcess, match: (m: any) => boolean, timeout = 240000) {
  return new Promise<T>((ok, fail) => {
    const clear = () => {
      clearTimeout(timer);
      child.off("message", onMessage);
      child.off("exit", exit);
      child.off("error", error);
    };
    const onMessage = (m: any) => {
      if (!match(m)) return;
      clear();
      if (m.error) fail(Error(m.error));
      else ok(m.data as T);
    };
    const exit = (code: unknown) => {
      clear();
      fail(Error("Observer exited " + code));
    };
    const error = (e: Error) => {
      clear();
      fail(e);
    };
    const timer = setTimeout(() => {
      clear();
      fail(Error("Observer deadline"));
    }, timeout);
    child.on("message", onMessage);
    child.once("exit", exit);
    child.once("error", error);
  });
}

export async function runCells(
  dir: string,
  request: Request,
  id: Destination,
  scopes: Scope[],
  writeUrl: string,
  readUrl: string,
  optionsBinding: string,
  status: (stage: string) => void,
) {
  assert(scopes.flatMap((s) => s.accounts).every((a, i) => a === i));
  const senders = scopes
    .flatMap((s) => s.accounts)
    .map((a) => ({
      client: new DatomicClient(writeUrl, 35000),
      scope: scopes.find((s) => s.accounts.includes(a))!,
    }));
  const checker = new DatomicClient(readUrl, 35000);
  assert(senders.every((s) => s.scope));
  const log = fs.openSync(path.join(dir, "observers.log"), "wx");
  const children = ["0", "1", "feed"].map((role, i) =>
    spawn(
      "taskset",
      [
        "-c",
        String(5 + i),
        process.execPath,
        "--import",
        "tsx",
        path.join(import.meta.dirname, "observer.ts"),
        role,
      ],
      {
        env: { ...process.env, DECISION_OBSERVER_URL: readUrl },
        stdio: ["ignore", log, log, "ipc"],
      },
    ),
  );
  fs.closeSync(log);
  try {
    await Promise.all(
      children.map((c, i) => message(c, (m) => m.ready === ["0", "1", "feed"][i], 15000)),
    );
    const cpus = (pid: number) =>
      /^Cpus_allowed_list:\s+([\d,-]+)$/m.exec(
        fs.readFileSync("/proc/" + pid + "/status", "utf8"),
      )?.[1];
    const placement = [cpus(process.pid), ...children.map((c) => cpus(c.pid!))];
    assert.deepEqual(placement, ["3", "5", "6", "7"]);
    status("preparing identical field predecessors");
    const prepared = [];
    const writeOptions = [];
    const checked = new Set<string>();
    for (const [a, s] of senders.entries()) {
      const open = await s.client.create(
        JSON.stringify(["triplex-scope-v1", "test", "test", s.scope.name, 0]),
        "lean",
        true,
        35000,
      );
      assert(!open.created && open.db === s.scope.db && open.strictRecordClocks);
      if (!checked.has(open.db)) {
        const readback = await readWriteOptions(writeUrl, open.db, optionsBinding);
        assert.equal(readback.observed.position, s.scope.seedCut);
        writeOptions.push(readback);
        checked.add(open.db);
      }
      prepared.push({ ...s, rows: await preload(s.client, s.scope, id.people, a) });
    }
    const initial = path.join(dir, "initial.json");
    write(path.join(dir, "writer-readbacks.json"), {
      ...id,
      at: Date.now(),
      entries: writeOptions,
    });
    write(initial, { ...id, accounts: prepared.map((s) => [...s.rows]), scopes });
    const model = prepared.map((s) => new Map([...s.rows].map(([e, rows]) => [e, [...rows]])));
    const reference = {
      before: disk(id.slot),
      memory: process.memoryUsage(),
      placement,
      sameClientCount: prepared.length,
      sqlScopeCount: scopes.length,
      engines: engineResources(id.slot),
    };
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(reference.engines).map(([k, v]: [string, any]) => [k, v.cpus]),
      ),
      { tx: "0", pg: "1", "gw-w": "2", "gw-r": "4,8" },
    );
    const reports: ReturnType<typeof checkCell>[] = [];
    const begin = Date.now();
    for (const repeat of repetitions(id.layout)) {
      for (const cell of cellOrder(repeat, id.layout)) {
        const key = cellKey(cell, repeat);
        status("running " + key);
        const before = engineResources(id.slot),
          countBefore = disk(id.slot);
        const placed = scopes.map((s) => ({ ...s })),
          start = Math.ceil(now() + 2000);
        const withReaders = request.withReaders ?? true;
        const m: Begin = {
          kind: "begin",
          key,
          start,
          people: id.people,
          repeat,
          cell,
          withReaders,
          scopes: placed,
        };
        // [DX-SCALE1] Why: feed completion follows the entire offered window and its drain.
        // Rejected: spending the observer's four-minute allowance while a five-minute cell is still offering.
        const intervalEnd = start + cellSeconds(cell) * 1000;
        const observerTimeout = Math.ceil(intervalEnd - now()) + 240000;
        const readers = children
          .slice(0, 2)
          .map((c) => message<ReadResult>(c, (r) => r.key === key, observerTimeout));
        const feed = message<Feed[]>(children[2]!, (r) => r.key === key, observerTimeout);
        // Attach failure handlers immediately. The timed write ledger must be
        // retained even if an independent observer has already failed.
        const observers = Promise.allSettled([...readers, feed]);
        for (const c of children) c.send(m);
        const timing = await play(prepared, writeTape(id.people, cell, repeat), start, id.nonce);
        write(path.join(dir, key + "-writer.json"), {
          ...id,
          key,
          cell,
          repeat,
          start,
          scopes: placed,
          writes: timing.rows,
        });
        while (now() < intervalEnd) await sleep(Math.ceil(intervalEnd - now()));
        write(path.join(dir, key + "-resources.json"), {
          ...id,
          key,
          start,
          afterAt: Date.now(),
          before,
          after: engineResources(id.slot),
          disk: { before: countBefore, after: disk(id.slot) },
        });
        await resolveUncertain(prepared, timing.unresolved);
        const ends: Record<string, number> = {};
        for (const s of scopes) {
          const c = prepared[s.accounts[0]!]!.client;
          const snap = await c.begin(s.db);
          ends[s.db] = snap.position;
          await c.release(s.db, snap.handle);
        }
        children[2]!.send({ kind: "finish", key, cuts: ends });
        const observed = await observers;
        write(
          path.join(dir, key + "-observers.json"),
          observed.map((outcome) =>
            outcome.status === "fulfilled"
              ? outcome
              : { status: outcome.status, reason: String(outcome.reason) },
          ),
        );
        const [a, b, f] = observed;
        assert(
          a?.status === "fulfilled" && b?.status === "fulfilled" && f?.status === "fulfilled",
          "Observer failures after timed writer evidence was sealed. " +
            observed.flatMap((o) => (o.status === "rejected" ? [String(o.reason)] : [])).join(" "),
        );
        const full: Observation = {
          ...id,
          cell,
          repeat,
          withReaders,
          start,
          scopes: placed,
          writes: timing.rows,
          reads: [a.value as ReadResult, b.value as ReadResult],
          feed: f.value as Feed[],
        };
        const raw = path.join(dir, key + "-raw.json");
        write(raw, full);
        const result = checkCell(full, model);
        const pins = [];
        for (const cut of result.cuts) {
          const values = [];
          for (const position of [cut.position - 1, cut.position]) {
            const actual = await checker.rows(cut.db, {
              entityIds: [task(cut.account, cut.subject)],
              pattern: { attribute: field(0) },
              basis: { recordedPosition: position, validAt: SEED_VALID_FROM },
            });
            assert(actual.length === 1 && actual[0]!.recorded_position <= position);
            values.push([actual[0]!.id, actual[0]!.value_string]);
          }
          assert.deepEqual(values, [cut.before, cut.after]);
          pins.push({ ...cut, values });
        }
        write(path.join(dir, key + "-cuts.json"), { ...id, key, at: Date.now(), pins });
        const { distributions: _samples, ...row } = result;
        write(path.join(dir, key + "-result.json"), { ...id, rawSemanticHash: sha(full), ...row });
        reports.push(result);
        for (const s of scopes) s.cut = ends[s.db]!;
      }
    }
    const comparisons = (id.layout === "single" ? [] : rates).map((rate) => ({
      rate,
      ratios: ratios(
        reports.filter((r) => r.cell === "alone"),
        reports.filter((r) => r.cell === rate),
      ),
      completeCapacity: reports.filter((r) => r.cell === rate).every((r) => r.capacityBars),
    }));
    const footprint = { ...reference, after: disk(id.slot), endedMemory: process.memoryUsage() };
    write(path.join(dir, "measurement.json"), {
      ...id,
      mode: request.mode,
      from: request.from,
      withReaders: request.withReaders ?? true,
      elapsedMs: Date.now() - begin,
      comparisons,
      footprint,
      cells: reports.map(({ distributions: _samples, ...r }) => r),
    });
  } finally {
    for (const c of children) {
      if (c.connected) c.disconnect();
      if (c.exitCode === null && !c.signalCode) c.kill("SIGTERM");
    }
    for (const s of senders) s.client.close();
    checker.close();
  }
}
