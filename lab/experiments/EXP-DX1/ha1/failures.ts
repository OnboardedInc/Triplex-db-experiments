import assert from "node:assert/strict";
import {
  Account,
  DatomicClient,
  errorCode,
  immutable,
} from "../../../../packages/datomic/test/ha1-account.ts";
import { ackProxy } from "./ack-proxy.ts";
import { clock, sleep, until } from "./common.ts";
import type { Stack } from "./stack.ts";

export async function failures(s: Stack, scopeCount: number, people = 0) {
  await s.tool();
  await s.postgres("pg", s.a);
  await s.database("pg", "moving");
  await s.tx("active", s.a, "pg", "moving");
  await until("active broker", async () => (await s.broker("active")) || undefined);
  await s.tx("standby", s.b, "pg", "moving");
  await Promise.all([
    s.gateway("write", s.a, "pg", "moving"),
    s.gateway("read", s.a, "pg", "moving"),
  ]);
  const [w, r] = await Promise.all([s.ready("write"), s.ready("read")]);
  const accounts = Array.from(
    { length: scopeCount },
    (_, i) => new Account(s.e.prefix + "-" + i, w, r),
  );
  try {
    for (const ac of accounts) {
      await ac.open();
      for (let i = 0; i < people; i++) await ac.send(ac.intent("seed-" + i, 160, "seed-" + i));
      await ac.send(ac.intent("opening"));
      await ac.pinned(ac.receipts.values().next().value!);
      await ac.verify();
    }
    for (const fault of ["active", "write", "read", "pg"] as const) {
      if (fault === "active") {
        assert(await s.broker("active"));
        assert(!(await s.broker("standby")));
        const marker = await until("standby heartbeat monitor", async () => {
          const line = await s.exec(
            "standby",
            "sh",
            "-c",
            "grep -h ':transactor/standby' log/*.log | tail -1",
          );
          return line.includes(":transactor/standby") ? line : undefined;
        });
        const standby = await s.view("standby");
        assert(standby.State.Running);
        s.e.log("before-election", {
          active: (await s.view("active")).Id,
          standby: standby.Id,
          marker: s.redact(marker),
        });
      }
      const p = await ackProxy(w),
        transport = new DatomicClient(p.url, 25000);
      const first = accounts.map((ac) => ac.intent(fault + "-lost")),
        racing = accounts.map((ac) => ac.intent(fault + "-racing"));
      const stopped = accounts.map((ac) => ac.intent(fault + "-unsent", 1, "held-" + fault));
      for (const i of stopped) p.hold(i.operationId);
      const uncertain = (inputs: typeof first) =>
        inputs.map((input, i) =>
          transport.transact(accounts[i]!.db, input).then(
            () => {
              throw Error("Withheld ACK escaped");
            },
            (err) => {
              assert.equal(errorCode(err), "Transport");
              return "Transport";
            },
          ),
        );
      let stop = false;
      const observations: {
        scope: string;
        kind: string;
        start: number;
        end: number;
        result: string;
        cursor?: string;
      }[] = [];
      const observers: Promise<void>[] = [];
      const delivered = accounts.map(() => [] as any[]);
      const cursors = accounts.map((ac) =>
        String(
          [...ac.receipts.values()].reduce((n, r) => (BigInt(r.t.v) > n ? BigInt(r.t.v) : n), 0n) +
            1n,
        ),
      );
      try {
        for (const [i, ac] of accounts.entries())
          for (const kind of ["read", "feed"]) {
            const pinned = [...ac.receipts.values()][0]!;
            let cursor = cursors[i]!;
            const loop = async () => {
              while (!stop) {
                const start = clock();
                try {
                  if (kind === "read") await ac.pinned(pinned);
                  else {
                    const page = await ac.r.log(ac.db, cursor, 8);
                    // [DX-HA1] Why: a live feed can precede its HTTP receipt. Rejected: dropping rows whose ACK is still in flight.
                    for (const row of page.rows)
                      if (row.kind === "commit") {
                        delivered[i]!.push(row);
                        s.e.log("live-feed", { scope: ac.key, fault, from: cursor, row });
                      }
                    cursor = page.nextT;
                  }
                  observations.push({
                    scope: ac.key,
                    kind,
                    start,
                    end: clock(),
                    result: "ok",
                    cursor,
                  });
                } catch (e) {
                  const code = errorCode(e);
                  if (!code) throw e;
                  observations.push({
                    scope: ac.key,
                    kind,
                    start,
                    end: clock(),
                    result: code,
                    cursor,
                  });
                }
                await sleep(160);
              }
            };
            const observed = loop();
            observed.catch(() => {});
            observers.push(observed);
          }
        const lost = uncertain(first);
        await p.wait(
          first.map((i) => i.operationId),
          true,
        );
        const original = first.map((i) => {
          const req = p.requests.get(i.operationId)!;
          assert.equal(req.status, 200);
          return immutable(req.reply);
        });
        const inflight = uncertain(racing);
        await p.wait(
          racing.map((i) => i.operationId),
          false,
        );
        const undelivered = uncertain(stopped);
        await until(
          "held requests",
          async () => stopped.every((i) => p.requests.has(i.operationId)) || undefined,
        );
        const event = await s.kill(fault);
        p.drop();
        await Promise.all([...lost, ...inflight, ...undelivered]);
        const replacement = fault === "active" ? Promise.resolve() : s.restart(fault);
        const scopes = await Promise.all(
          accounts.map(async (ac, i) => {
            const prior = Math.max(...ac.arrivals.values());
            const before = ac.attempts.length;
            const fresh = ac.intent(fault + "-new", 1, "new-" + fault);
            const offered = [{ op: fresh.operationId, scheduled: clock() }];
            const freshAck = ac.send(fresh);
            freshAck.catch(() => {});
            let chain: Promise<unknown> = freshAck;
            const arrivals = (async () => {
              for (let round = 1; round < 3 || !ac.receipts.has(fresh.operationId); round++) {
                assert(round < 245, "Timed out offering writes across the fault");
                const due = offered[0]!.scheduled + round * 625;
                await sleep(Math.max(0, due - clock()));
                const input = ac.intent(fault + "-queued-" + round, 1, "new-" + fault);
                offered.push({ op: input.operationId, scheduled: due });
                chain = chain.then(() => ac.send(input));
                chain.catch(() => {});
              }
              await chain;
            })();
            arrivals.catch(() => {});
            const l = await ac.send(first[i]!);
            assert.deepEqual(l, original[i]);
            const race = await ac.send(racing[i]!);
            const held = p.requests.get(racing[i]!.operationId)!;
            if (held.status === 200) assert.deepEqual(race, immutable(held.reply));
            const receipt = await freshAck;
            await Promise.all([replacement, arrivals]);
            const noSend = stopped[i]!;
            assert.equal(p.requests.get(noSend.operationId)!.sent, false);
            assert.equal((await ac.w.operation(ac.db, noSend.operationId)).status, "absent");
            const firstPublication = await ac.send(noSend);
            const newAck = ac.arrivals.get(fresh.operationId)!;
            const audit = await until("read/feed caught up", async () => {
              try {
                await ac.pinned([...ac.receipts.values()][0]!);
                await ac.pinned(receipt);
                const b = await ac.r.basis(ac.db);
                if (BigInt(b.t.v) < BigInt(receipt.t.v)) return undefined;
                return await ac.verify(cursors[i]);
              } catch (e) {
                if (!errorCode(e)) throw e;
                return undefined;
              }
            });
            return {
              scope: ac.key,
              lastAckToFirstNewMs: newAck - prior,
              firstNewMs: [Math.max(0, newAck - event.to), newAck - event.from],
              offered: offered.map((o) => ({ ...o, ack: ac.arrivals.get(o.op) })),
              undelivered: firstPublication,
              withheld: original[i],
              racing: { outcome: race, upstreamStatus: held.status ?? null },
              fresh: receipt,
              audit,
              attempts: ac.attempts.slice(before),
            };
          }),
        );
        await until(
          "live observers reach the recovered head",
          async () =>
            accounts.every(
              (ac, i) =>
                delivered[i]!.length === scopes[i]!.audit.operations &&
                observations.some(
                  (o) =>
                    o.scope === ac.key &&
                    o.kind === "read" &&
                    o.result === "ok" &&
                    o.start >= event.to,
                ),
            ) || undefined,
          30000,
        );
        stop = true;
        await Promise.all(observers);
        for (const [i, ac] of accounts.entries()) {
          const expected = [...ac.receipts.values()]
            .filter((r) => BigInt(r.t.v) >= BigInt(cursors[i]!))
            .sort((a, b) => Number(BigInt(a.t.v) - BigInt(b.t.v)));
          assert.deepEqual(
            delivered[i]!.map((row) => row.transaction.operationId),
            expected.map((r) => r.operationId),
          );
          for (const row of delivered[i]!) ac.checkEntry(row);
        }
        assert(fault !== "active" || (await s.broker("standby")));
        for (const ac of accounts)
          for (const kind of ["read", "feed"]) {
            assert(
              observations.some(
                (o) =>
                  o.scope === ac.key && o.kind === kind && o.result === "ok" && o.end >= event.from,
              ),
              "Missing live continuity sample",
            );
          }
        s.e.write(fault, {
          nonce: s.e.nonce,
          event,
          scopes,
          observations,
          wire: [...p.requests].map(([op, v]) => ({
            op,
            requestBytes: v.requestBytes,
            responseBytes: v.responseBytes,
            status: v.status,
          })),
        });
        console.log("Recorded " + fault);
      } finally {
        stop = true;
        p.drop();
        p.close();
        transport.close();
        await Promise.allSettled(observers);
      }
    }
    return { faults: 4, scopes: scopeCount };
  } finally {
    for (const ac of accounts) ac.close();
  }
}
