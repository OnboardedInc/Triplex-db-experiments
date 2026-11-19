import { bytes as wireBytes } from "../import1/source.ts";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { measureHttp } from "../../../bench/lib/http-counts.ts";
import { activation, openStore } from "./store.ts";
import { seed, valid } from "./fixture.ts";
import { LazyReader } from "./read.ts";
import { Dispatcher, Receiver } from "./dispatch.ts";
import { admitLive, propose, type Format } from "./decision.ts";
export function pct(xs: number[], q: number) {
  assert(xs.length > 0);
  return [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * q) - 1]!;
}
const disk = (dir: string, n: string, x: unknown) =>
  writeFileSync(join(dir, n), wireBytes(x) + "\n", { flag: "wx" });
const wire = (d: W0.Delivery) => ({ ...d, seq: Number(d.seq), payload: JSON.parse(d.payload) });
export async function price(dir: string, n: number, format: Format = "w0", verifyAll = true) {
  const nonce = randomUUID(),
    s = await openStore("lazy-price-" + nonce, format),
    oracle = new DomainOracle();
  let rx: Receiver | undefined;
  const d = new Dispatcher(s, format, 32);
  try {
    const start = performance.now(),
      f = await seed(s, n),
      seedMs = performance.now() - start;
    rx = new Receiver(join(dir, "receiver.sqlite"), s.scope, f.id);
    const stages: any[] = [],
      reader = new LazyReader(s, format, 4 << 20, () => valid);
    let guardRows = 0;
    let state: any = { items: [], subjects: [], pending: [] };
    for (const [i, release] of [W0.R1, W0.R2, W0.R3].entries()) {
      const old = await s.head(),
        before = { ...s.counters },
        cpuBefore = process.cpuUsage(),
        offer = performance.now();
      const observed = await measureHttp(() => activation(s, "switch-" + i, release, valid));
      const durable = s.counters.ackObserved,
        ack = observed.value,
        returned = performance.now(),
        after = { ...s.counters },
        markerCpuUs = process.cpuUsage(cpuBefore);
      assert(
        ack.position === old + 1 &&
          ack.changes.length === 1 &&
          ack.changes[0].entityId === "lazy/account/releases",
      );
      assert.equal(after.writes - before.writes, 1);
      assert.equal(after.subjectRoots - before.subjectRoots, 0);
      assert.equal(after.rosterRoots - before.rosterRoots, 0);
      const who = n - 1,
        childNonce = randomUUID();
      const child = JSON.parse(
        execFileSync(
          process.execPath,
          ["--experimental-strip-types", new URL("./cold.ts", import.meta.url).pathname],
          {
            input: JSON.stringify({
              scope: s.scope,
              format,
              subject: f.roster[who],
              validTime: valid,
              nonce: childNonce,
            }),
            encoding: "utf8",
            timeout: 90000,
          },
        ),
      );
      const firstDone = performance.now();
      assert.equal(child.nonce, childNonce);
      assert.equal(child.scope, s.scope);
      assert.equal(child.result.basis.tx, ack.position);
      assert.equal(child.result.route, "authoritative-source");
      const ref = await oracle.call("evaluate", {
        release: release.name,
        world: f.world(who),
        basis: { tx: ack.position, validTime: valid },
      });
      assert.equal(child.result.json, ref);
      const misses: number[] = [],
        hits: number[] = [],
        readCosts = [];
      for (let j = 0; j < Math.min(24, n); j++) {
        const k = Math.floor((j * n) / 24),
          subject = f.roster[k]!,
          basis = { position: ack.position, validTime: valid },
          expected = await oracle.call("evaluate", {
            world: f.world(k),
            release: release.name,
            basis: { tx: ack.position, validTime: valid },
          });
        const t = performance.now(),
          cpu = process.cpuUsage(),
          missProbe = await measureHttp(() => reader.readAt(subject, basis)),
          miss = missProbe.value,
          m = performance.now(),
          missCpu = process.cpuUsage(cpu),
          hitStart = process.cpuUsage(),
          hitProbe = await measureHttp(() => reader.readAt(subject, basis)),
          hit = hitProbe.value,
          h = performance.now();
        readCosts.push({
          subject,
          missHttp: missProbe.requests,
          hitHttp: hitProbe.requests,
          missCpuUs: missCpu,
          hitCpuUs: process.cpuUsage(hitStart),
        });
        assert.equal(miss.json, expected);
        assert.equal(hit.json, expected);
        assert.equal(hit.route, "exact-cache");
        misses.push(m - t);
        hits.push(h - m);
      }
      const began = performance.now(),
        dispatchCpu = process.cpuUsage(),
        effects: W0.Delivery[] = [],
        changed: string[] = [],
        candidates: string[] = [],
        fractions: any[] = [];
      await d.drain((r) => {
        for (const c of r.receipt.changes) {
          const allowed =
            c.entityId === "lazy/account/dispatcher" ||
            r.changedSubjects.some(
              (owner) =>
                (c.entityId === "lazy/item/" + owner && c.attribute === "lazy/items") ||
                (c.entityId === "lazy/pending/" + owner && c.attribute === "lazy/delivery"),
            );
          if (!allowed) guardRows++;
        }
        assert.equal(guardRows, 0, "Unexpected subject or guard write");

        if (r.event === ack.position) {
          effects.push(...r.deliveries);
          changed.push(...r.changedSubjects);
          candidates.push(...r.subjects);
          fractions.push({
            n: r.subjects.length,
            examined: r.examined,
            reason: r.reason,
            command: r.receipt.commandId,
            position: r.receipt.position,
          });
        }
      });
      const outboxDone = performance.now(),
        publisherCpuUs = process.cpuUsage(dispatchCpu),
        receiverCpu = process.cpuUsage(),
        sent = await rx.drain(s),
        applied = performance.now();
      const receiverCpuUs = process.cpuUsage(receiverCpu);
      assert.equal(sent, effects.length);
      assert.equal(new Set(candidates).size, candidates.length);
      if (i === 2) assert.equal(candidates.length, 0);
      const ordinary: number[] = [];
      for (let j = 0; j < 16; j++) {
        const t = performance.now(),
          q = await propose(s, format, f.roster[(j * 29) % n]!),
          position = await s.head();
        assert.equal((await admitLive(s, format, q)).status, "unchanged");
        assert.equal(await s.head(), position);
        ordinary.push(performance.now() - t);
      }
      const digest = createHash("sha256");
      if (verifyAll) {
        const records = [];
        for (let lo = 0; lo < n; lo += 32) {
          const ids = f.roster.slice(lo, lo + 32),
            actual = await reader.readMany(ids, ack.position, valid);
          const expected = await Promise.all(
            ids.map((_, j) =>
              oracle.call("evaluate", {
                world: f.world(lo + j),
                release: release.name,
                basis: { tx: ack.position, validTime: valid },
              }),
            ),
          );
          for (const [j, x] of expected.entries()) {
            assert.equal(actual[j], x);
            digest.update(x + "\n");
            const o = JSON.parse(x);
            records.push({
              basis: o.basis,
              release: o.release,
              subject: o.subject,
              workItems: o.workItems,
            });
          }
        }
        const oldItems = new Map(state.items.map((it: any) => [it.id, it]));
        const next = JSON.parse(await oracle.call("publish", { state, evaluations: records }));
        const expectedChanged = [
          ...new Set<string>(
            next.state.items
              .filter(
                (it: any) =>
                  !oldItems.has(it.id) || canonical(oldItems.get(it.id)) !== canonical(it),
              )
              .map((it: any) => it.subject),
          ),
        ].sort();
        assert.deepEqual(changed.toSorted(), expectedChanged);
        assert.deepEqual(effects.map(wire), next.deliveries);
        state = { ...next.state, pending: [] };
      }
      stages.push({
        release: release.name,
        marker: ack.txId,
        p: ack.position,
        offer,
        durable,
        returned,
        firstDone,
        offerToAckMs: durable - offer,
        ackToColdMs: firstDone - durable,
        offerToColdMs: firstDone - offer,
        coldCallMs: child.callMs,
        coldPid: child.pid,
        activationHttp: observed.requests,
        markerCpuUs,
        publisherCpuUs,
        receiverCpuUs,
        readCosts,
        markerJournalBytes: Buffer.byteLength(wireBytes(ack)),
        rssBytes: process.memoryUsage().rss,
        activationSubjectVisits: after.subjectRoots - before.subjectRoots,
        activationRosterVisits: after.rosterRoots - before.rosterRoots,
        activationWrites: after.writes - before.writes,
        misses,
        hits,
        ordinary,
        candidateCount: candidates.length,
        changedOwners: changed.length,
        effects: sent,
        drainMs: outboxDone - began,
        receiveMs: applied - outboxDone,
        receiverPerSecond: sent ? (1000 * sent) / (applied - outboxDone) : 0,
        frames: fractions,
        checked: verifyAll ? n : 0,
        oracleHash: digest.digest("hex"),
        coldHash: sha256(ref),
      });
      disk(dir, "stage-" + i + ".json", stages.at(-1));
    }
    let correctedAt: number | undefined;
    function currentWorld(i: number) {
      const world = f.world(i);
      if (correctedAt === undefined) return world;
      const tx = correctedAt;
      return {
        subject: world.subject,
        facts: world.facts.map((row) =>
          row.e === "jur:g0" && row.a === "stateMinWageCents" ? { ...row, v: 1950, tx } : row,
        ),
      };
    }
    if (n === 1000 && format === "w0" && verifyAll) {
      const old = await s.head(),
        rows = await s.rows(["jur:g0"], old, valid),
        floor = rows.find((r) => r.attribute === "stateMinWageCents")!;
      const change = await s.input("two-hop-correction", { kind: "source", at: valid }, [
        { op: "retract", id: floor.id },
        {
          op: "assert",
          entityId: "jur:g0",
          attribute: "stateMinWageCents",
          value: { type: "integer", value: "1950" },
          validFrom: 1,
        },
      ]);
      correctedAt = change.position;
      const h = createHash("sha256"),
        records = [];
      for (let lo = 0; lo < n; lo += 32) {
        const ids = f.roster.slice(lo, lo + 32),
          actual = await reader.readMany(ids, change.position, valid);
        for (const [j, id] of ids.entries()) {
          const expected = await oracle.call("evaluate", {
            world: currentWorld(lo + j),
            release: "R3",
            basis: { tx: change.position, validTime: valid },
          });
          assert.equal(actual[j], expected);
          h.update(expected + "\n");
          const o = JSON.parse(expected);
          records.push({ basis: o.basis, release: o.release, subject: id, workItems: o.workItems });
        }
      }
      const wanted = JSON.parse(await oracle.call("publish", { state, evaluations: records })),
        observed: W0.Delivery[] = [];
      await d.drain((r) => observed.push(...r.deliveries));
      assert.deepEqual(observed.map(wire), wanted.deliveries);
      state = { ...wanted.state, pending: [] };
      disk(dir, "mutation.json", {
        tx: change.txId,
        cut: change.position,
        prior: old,
        checked: n,
        outputs: h.digest("hex"),
        owed: observed.length,
      });
    }
    const maintenance = [];
    if (format === "w0" && verifyAll) {
      await rx.drain(s);
      for (let sample = 0; sample < 8; sample++) {
        const i = 10 + 11 * sample,
          subject = f.roster[i]!,
          world = currentWorld(i),
          old = world.facts.find((x) => x.e === subject && x.a === "payRateCents")!;
        const start = performance.now(),
          native = (await s.rows([subject], await s.head(), valid)).find(
            (r) => r.entityId === subject && r.attribute === "payRateCents",
          )!;
        assert.equal(Number(native.value.value), old.v);
        const pay = sample % 2 ? (Number(old.v) < 1650 ? 1800 : 1400) : Number(old.v);
        const source = await s.input("ordinary/" + i, { kind: "source", at: valid }, [
          { op: "retract", id: native.id },
          {
            op: "assert",
            entityId: subject,
            attribute: "payRateCents",
            value: { type: "integer", value: String(pay) },
            validFrom: 0,
          },
        ]);
        const saved = performance.now(),
          deltas: W0.Delivery[] = [];
        let cursorWrites = 0,
          changed = 0;
        await d.drain((r) => {
          cursorWrites++;
          changed += r.changedSubjects.length;
          deltas.push(...r.deliveries);
        });
        const published = performance.now();
        const delivered: number = await rx.drain(s),
          end = performance.now();
        assert.equal(delivered, deltas.length);
        const b = { tx: source.position, validTime: valid };
        const answer = JSON.parse(
          await oracle.call("evaluate", {
            world: {
              subject,
              facts: world.facts.map((x) =>
                x === old ? { ...x, v: pay, tx: source.position } : x,
              ),
            },
            release: "R3",
            basis: b,
          }),
        );
        const prior = {
          items: state.items.filter((it: any) => it.subject === subject),
          subjects: [],
          pending: [],
        };
        const wanted = JSON.parse(
          await oracle.call("publish", {
            state: prior,
            evaluations: [
              { basis: b, subject, release: answer.release, workItems: answer.workItems },
            ],
          }),
        );
        assert.deepEqual(deltas.map(wire), wanted.deliveries);
        assert.equal(changed, Number(canonical(prior.items) !== canonical(wanted.state.items)));
        maintenance.push({
          source: source.txId,
          subject,
          changed,
          delivered,
          cursorWrites,
          saveMs: saved - start,
          reconcileMs: published - saved,
          receiverMs: end - published,
        });
      }
    }
    const result = {
      nonce,
      scope: s.scope,
      format,
      n,
      seedFacts: f.facts,
      seedFrames: f.frames,
      seedMs,
      roster: f.rosterHash,
      seedHash: f.sourceHash,
      oldGuards: verifyAll ? state.subjects.length : null,
      lazyGuards: guardRows,
      maintenance,
      queryPlans: d.queryPlans,
      stages,
    };
    disk(dir, "price.json", result);
    return result;
  } finally {
    rx?.close();
    d.close();
    oracle.close();
    await s.close();
  }
}
if (process.argv[1] === import.meta.filename)
  await price(process.argv[2]!, Number(process.argv[3]), (process.argv[4] ?? "w0") as Format);
