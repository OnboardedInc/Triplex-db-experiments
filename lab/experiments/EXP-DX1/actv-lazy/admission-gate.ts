import {DomainOracle} from "../../../bench/lib/w0-gates.ts";
import {parseOutbox} from "../../../bench/lib/w0-outbox-state.ts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, canonical, triplexValue, sha256 } from "../../../bench/lib/w0-world.ts";
import { activation, fact, millis, openStore } from "./store.ts";
import { calculate, admitLive, cursorOps, itemRoot, pendingRoot, propose } from "./decision.ts";
const dir = process.argv[2]!,
  id = randomUUID(),
  at = W0.POPULATION_VALID_TIME,
  earlier = "2026-11-04T11:59:59.999999Z",
  subject = "pl:fixture";
const add = (
  entityId: string,
  attribute: string,
  v: string | number,
  validFrom = 0,
  validTo?: number,
) => ({
  op: "assert",
  entityId,
  attribute,
  value: triplexValue(attribute, v),
  validFrom,
  ...(validTo === undefined ? {} : { validTo }),
});
const results = [];
for (const schedule of ["held", "first", "time", "two-hop", "aba", "serial"]) {
  const name = "lazy-" + id + "-" + schedule;
  let s = await openStore(name);
  try {
    const initial = await activation(s, "activation-1", W0.R1, earlier);
    assert.equal(initial.changes.length, 1);
    const base = await s.input("source-10", { kind: "source", at: earlier }, [
      add(subject, "location", "loc:fixture"),
      add("loc:fixture", "jurisdiction", "jur:fixture"),
      add("jur:fixture", "stateMinWageCents", 1650),
      add(subject, "payRateCents", schedule === "first" ? 1650 : 1600),
      add(subject, "bgcStatus", "clear"),
      fact("members/page/0", "lazy/members", [subject]),
    ]);
    const closeInput = async () => {
      const p = await s.head(),
        c = await s.controls(p);
      return s.commit("test/close/" + c.input, "test/baseline", cursorOps(c, { done: c.input }), p);
    };
    await closeInput();
    const initialProposal = await propose(s, "w0", subject);
    const first = await admitLive(s, "w0", initialProposal);
    if (first.status === "accepted") {
      await s.close();
      s = await openStore(name);
      const retry = await admitLive(s, "w0", initialProposal);
      assert(retry.status === "accepted");
      assert.deepEqual(retry.receipt, first.receipt);
    }
    assert.equal(first.status, schedule === "first" ? "unchanged" : "accepted");
    const change = await s.input("source-15", { kind: "source", at: earlier }, [
      { op: "retract", id: base.changes[3].tripleId },
      add(subject, "payRateCents", 1500, 0, schedule === "time" ? millis(at) : undefined),
    ]);
    await closeInput();
    const held = await propose(s, "w0", subject);
    if (schedule === "serial") {
      const other = await openStore(name);
      try {
        const result = await admitLive(s, "w0", held, async () => {
          await activation(other, "activation-2", W0.R2, at);
        });
        assert.equal(result.status, "stale");
      } finally {
        await other.close();
      }
    } else if (schedule === "aba") {
      await activation(s, "activation-2", W0.R2, at);
      await activation(s, "activation-3", W0.R1, at);
    } else if (schedule === "two-hop") {
      await s.input("source-20", { kind: "source", at }, [
        { op: "retract", id: base.changes[2].tripleId },
        add("jur:fixture", "stateMinWageCents", 1800),
      ]);
    } else {
      await s.input("source-20", { kind: "source", at }, [
        ...(schedule === "time"
          ? []
          : [
              {
                op: "retract",
                id: change.changes.find(
                  (c: any) => c.attribute === "payRateCents" && c.op === "assert",
                ).tripleId,
              },
            ]),
        add(
          subject,
          "payRateCents",
          schedule === "first" ? 1650 : 1600,
          schedule === "time" ? millis(at) : 0,
        ),
      ]);
    }
    await closeInput();
    const fresh = await propose(s, "w0", subject);
    const live = await admitLive(s, "w0", fresh);
    const before = await s.head();
    await s.close();
    s = await openStore(name);
    assert.equal((await activation(s, "activation-1", W0.R1, earlier)).txId, initial.txId);
    assert.equal((await admitLive(s, "w0", held)).status, "stale");
    if (schedule === "time") {
      const controls = await s.controls(before),
        basis = { tx: before, validTime: earlier };
      const historical = await calculate(s, "w0", subject, basis, controls, controls);
      assert.equal(
        JSON.parse(historical.json).workItems.find(
          (w: any) => w.kind === "notify.pay-below-minimum",
        ).payload.payRateCents,
        1500,
      );
      assert.equal(
        (
          await admitLive(s, "w0", {
            scope: name,
            format: "w0",
            subject,
            basis,
            witness: historical.witness,
          })
        ).status,
        "stale",
      );
    }
    const outsider = await propose(s, "w0", "pl:never-enrolled");
    assert.equal((await admitLive(s, "w0", outsider)).status, "outside-roster");
    const authentic = await propose(s, "w0", subject);
    await assert.rejects(admitLive(s, "w0", { ...authentic, witness: "unearned" }), /Untrusted/);
    assert.equal(await s.head(), before);
    const noop = await admitLive(s, "w0", await propose(s, "w0", subject));
    assert.equal(noop.status, "unchanged");
    assert.equal(await s.head(), before);
    const stored = await s.rows([itemRoot(subject)], before);
    const oracle=new DomainOracle();
    let expected:any={subjects:[],items:[],pending:[]};
    try{for(const q of [initialProposal,fresh]){
      const source=new Map<string,any>(),activations=[];let cursor=0;const t=millis(q.basis.validTime);
      while(cursor<q.basis.tx){
        const page=await s.comp.feedPage(cursor,8);assert(page.transactions.length);
        for(const tr of page.transactions){if(tr.position>q.basis.tx)break;assert.equal(tr.position,++cursor);
          if(tr.actor!=="lazy/input")continue;
          for(const c of tr.changes){
            if(c.entityId==="lazy/account/releases" && c.op==="assert"){const r=JSON.parse(c.value.value);activations.push({tx:tr.position,from:r.from,release:r.release});}
            if(![subject,"loc:fixture","jur:fixture"].includes(c.entityId))continue;
            if(c.op==="retract"){source.delete(c.tripleId);continue;}
            if(c.validFrom<=t && (c.validTo==null||t<c.validTo))source.set(c.tripleId,{e:c.entityId,a:c.attribute,v:c.value.type==="integer"?Number(c.value.value):c.value.value,tx:tr.position});
          }
        }
      }
      const out=JSON.parse(await oracle.call("reconcile",{world:{subject,facts:[...source.values()]},activations,basis:q.basis}));
      expected=JSON.parse(await oracle.call("publish",{state:expected,evaluations:[{subject,release:out.release,basis:q.basis,workItems:out.workItems}]})).state;
    }}finally{oracle.close();}
    const toWire=(v:any)=>({...v,payload:JSON.parse(v.payload),seq:Number(v.seq)});
    const actualItems=stored.flatMap(r=>parseOutbox(r.value.value)).map(toWire);
    const pending=await s.rows([pendingRoot(subject)],before);
    const actualPending=pending.map(r=>({p:r.position,d:toWire(parseOutbox(r.value.value))})).sort((a,b)=>a.p-b.p||a.d.id.localeCompare(b.d.id)).map(r=>r.d);
    assert.deepEqual(actualItems,expected.items);assert.deepEqual(actualPending,expected.pending);
    results.push({
      schedule,legacySubjects:expected.subjects,pending:actualPending,
      scope: name,
      activation: initial.txId,
      original: initial.position,
      before,
      live: live.status,
      held: held.witness,
      items: sha256(canonical(stored)),
    });
  } finally {
    await s.close();
  }
}
writeFileSync(join(dir, "admission.json"), canonical({ id, results }) + "\n", { flag: "wx" });
