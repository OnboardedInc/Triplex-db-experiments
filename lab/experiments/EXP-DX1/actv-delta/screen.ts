import { parseOutbox } from "../../../bench/lib/w0-outbox-state.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { generateTrace } from "../../../bench/lib/trace.ts";
import { percentile } from "../../../bench/lib/w0-traffic.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { Window } from "./v3.ts";
import { Receiver, drain } from "./dispatch.ts";
import { Account } from "./account.ts";
import { Objects, hash } from "./store.ts";
import { emptyAudit, event, query } from "./bench-rung.ts";
import { readers, type ReadSample } from "./traffic.ts";
import type { Recipe } from "./model.ts";
export async function screen(
  comp: CompositionHandle,
  reader: Account,
  sink: Receiver,
  source: Account,
  oracle: ReturnType<typeof emptyAudit>,
  dir: string,
  ids: string[],
  seq: number,
) {
  const basis = (await source.head(await comp.currentPosition())).value.basis,
    quiet = new Account(new Objects(comp, "quiet"), source.binding),
    quietIds = ["pl:quiet"],
    qo = emptyAudit();
  const initial = await quiet.bootstrap(quietIds, [{ subject: "pl:quiet", facts: [] }], basis);
  await query(qo, "source", [{ subject: "pl:quiet", facts: [] }]);
  await event(qo, { seq: 0, basis, doc: W0.R1.doc });
  const window = await Window.open(comp, source, "screen-live"),
    frozen = generateTrace({ seed: "DX-H2-frozen-v1", subjects: ids.length, durationS: 180 });
  let index = frozen.findIndex((e) => e.burst && !e.resend),
    active = seq;
  const sample: any[] = [],
    changes: any[] = [],
    from = performance.now(),
    stop = new Set<string>();
  const mutate = async () => {
    while (frozen[index]!.resend) index++;
    const e = frozen[index++]!,
      at = performance.now(),
      r = await window.apply(e),
      ev = (await source.db.get<Recipe>("event:" + (active + 1), r.position)).value;
    assert.equal(ev.seq, ++active);
    await event(oracle, {
      seq: active,
      basis: ev.basis,
      doc: ev.next,
      subject: W0.placementId(e.subject),
      edits: r.edits,
    });
    changes.push({ seq: active, ms: performance.now() - at, kind: e.kind, facts: e.facts });
  };
  const offer = async (rel: W0.CompiledRelease, label: string, overlap: boolean) => {
    const at = performance.now(),
      r = await source.seal(
        "screen-" + active + "-" + label,
        rel,
        overlap ? { beforeCas: mutate } : {},
      ),
      ack = performance.now() - at,
      ev = (await reader.db.get<Recipe>("event:" + r.seq, r.position)).value;
    assert(r.seq === ++active);
    await event(oracle, { seq: active, basis: ev.basis, doc: rel.doc });
    const s = ids[(active * 73) % ids.length]!,
      [actual, want] = await Promise.all([
        reader.readAt(s, r.position),
        query(oracle, "read", { seq: active, subjects: [s] }),
      ]);
    assert.equal(hash(JSON.parse(W0.outputJson(actual.output))), want[0].output);
    assert.equal(
      hash(parseOutbox(W0.publishJson({ state: actual.state, deliveries: [] })).state),
      want[0].state,
    );
    const A = performance.now() - at;
    sample.push({
      label,
      seq: active,
      position: r.position,
      ack,
      A,
      point: s,
      output: want[0].output,
    });
    if (["broad", "narrow"].includes(label) && A >= 1000) stop.add(label);
  };
  let same: ReadSample[] = [];
  try {
    const neighbors = await readers(quiet, quietIds, 1, async () => {
      same = await readers(reader, ids, 64, async () => {
        await mutate();
        for (let i = 0; i < 20 && stop.size < 2; i++) {
          await offer(W0.R1, "reset", false);
          await offer(W0.R2, stop.has("broad") ? "broad-control" : "broad", true);
          if (!stop.has("narrow")) await offer(W0.R3, "narrow", true);
        }
        await mutate();
      });
    });
    async function verify(samples: ReadSample[], oracle: ReturnType<typeof emptyAudit>) {
      const bySeq = new Map<number, Map<string, ReadSample[]>>();
      for (const v of samples) {
        const group = bySeq.get(v.seq) ?? new Map(),
          xs = group.get(v.id) ?? [];
        xs.push(v);
        group.set(v.id, xs);
        bySeq.set(v.seq, group);
      }
      for (const [n, group] of [...bySeq].sort((a, b) => a[0] - b[0])) {
        const out = await query(oracle, "read", { seq: n, subjects: [...group.keys()] });
        for (const x of out)
          for (const observed of group.get(x.subject)!) {
            assert.equal(observed.output, x.output);
            assert.equal(observed.state, x.state);
          }
      }
      return {
        n: samples.length,
        p50: percentile(
          samples.map((s) => s.ms),
          0.5,
        ),
        p99: percentile(
          samples.map((s) => s.ms),
          0.99,
        ),
        sha: hash(JSON.stringify(samples)),
      };
    }
    const checked = await verify(same, oracle),
      neighbor = await verify(neighbors, qo);
    const r = {
      scope: comp.scopeName,
      account: source.db.account,
      elapsedMs: performance.now() - from,
      completed: sample,
      changed: changes,
      stopped: [...stop],
      readers: 64,
      checked,
      neighbor,
      quietSeed: initial,
      backlogAtStart: seq,
      drainThrough: active,
    };
    fs.writeFileSync(path.join(dir, "screen.json"), JSON.stringify(r) + "\n", { flag: "wx" });
    await drain(source, sink, active);
  } finally {
    qo.close();
  }
}
