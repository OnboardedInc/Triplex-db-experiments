// [DX-API1] The four ports of a shape (shapes.ts): today, pinned, loader (CallReads) and batch1 (one request), shared by
// the Mac driver (run.ts) and the server driver (server.ts).
import { DatomicClient, CallReads, readBatch } from "../../../../packages/datomic/dist/index.js";
import { taskId } from "../../../bench/lib/deep-world.ts";
import { refsOf, type Ctx, type Shape, type Step } from "./shapes.ts";

export type Result = { trips: number; reads: number; rows: number; position?: number; positions: number[]; loads?: number;
  answers: Map<string, any[]>; pages: Map<string, any>; afterKeys: Set<string>; savedValue?: string; missedOwnWrite?: number;
  /** Wall time of each single request (today and pinned). */
  requestMs?: number[] };
export type Save = (c: DatomicClient, id: string, change: { e: string; a: string; v: { type: string; value: string } }[]) => Promise<number>;
export type Port = "today" | "pinned" | "loader" | "batch1";

export function makePorts(db: string, validAt: number, writer: DatomicClient, save: Save) {
  const keyOf = (step: Step, id: string) => `${step.key}|${step.pattern?.attribute ?? "*"}|${id}`;
  const subjectsOf = (step: Step, c: Ctx, done: Map<string, any[]>, pages: Map<string, any>) => {
    if (step.ids) return step.ids(c);
    const src = step.from!;
    if (!src.attribute) return (pages.get(src.step)?.ids ?? []) as string[];
    return refsOf(done.get(src.step) ?? [], src.attribute);
  };

  async function today(c: DatomicClient, shape: Shape, ctx: Ctx, pinned: boolean, at?: number): Promise<Result> {
    const r: Result = { trips: 0, reads: 0, rows: 0, positions: [], answers: new Map(), pages: new Map(), afterKeys: new Set() };
    let basis: any;
    if (pinned) {
      const p = at ?? Number((await c.basis(db)).position.v);
      r.trips += at === undefined ? 1 : 0;
      basis = { recordedPosition: p, validAt };
      r.position = p;
    }
    const steps = new Map<string, any[]>();
    let afterSave = false;
    const runLevels = async (levels: Step[][]) => {
      for (const level of levels) {
        await Promise.all(level.map(async (step) => {
          if (step.page) {
            r.trips++; r.reads++;
            const page = await c.listIds(db, { ...step.page(ctx), ...(basis ? { basis: { recordedPosition: basis.recordedPosition, validAt } } : {}) } as any);
            r.pages.set(step.key, page);
            return;
          }
          const list = subjectsOf(step, ctx, steps, r.pages);
          const got = await Promise.all(list.map(async (id) => {
            r.trips++; r.reads++;
            const t0 = performance.now();
            const answer = await c.request<any>("POST", "/v1/db/" + db + "/read",
              { entityIds: [id], ...(step.pattern ? { pattern: step.pattern } : {}), ...(basis ? { basis } : {}) });
            (r.requestMs ??= []).push(performance.now() - t0);
            r.rows += answer.rows.length;
            r.answers.set(keyOf(step, id), answer.rows);
            if (afterSave) r.afterKeys.add(keyOf(step, id));
            return answer.rows as any[];
          }));
          steps.set(step.key, got.flat());
        }));
      }
    };
    await runLevels(shape.levels);
    if (shape.save) {
      const e = ctx.A + taskId(ctx.i, ctx.t), value = "submitted " + crypto.randomUUID();
      const position = await save(writer, `api1-submit-${crypto.randomUUID()}`, [{ e, a: ":task/field-0", v: { type: "string", value } }]);
      r.savedValue = value;
      if (pinned) basis = { recordedPosition: position, validAt };
      afterSave = true;
      await runLevels(shape.after!);
      const after = r.answers.get(keyOf({ key: "taskAfter" }, e)) ?? [];
      const seen = after.filter((x: any) => (x.attribute?.v ?? x.attribute) === ":task/field-0").map((x: any) => x.value_string?.v ?? x.value_string);
      r.missedOwnWrite = seen.includes(value) ? 0 : 1;
    }
    return r;
  }

  async function loader(c: DatomicClient, shape: Shape, ctx: Ctx, at?: number, stats = false): Promise<Result> {
    const L = new CallReads(c, db, { validAt, ...(at !== undefined ? { position: at } : {}), stats });
    const r: Result = { trips: 0, reads: 0, rows: 0, positions: [], answers: new Map(), pages: new Map(), afterKeys: new Set() };
    const steps = new Map<string, any[]>();
    let afterSave = false;
    const runLevels = async (levels: Step[][]) => {
      for (const level of levels) {
        await Promise.all(level.map(async (step) => {
          if (step.page) { r.pages.set(step.key, await L.ids(step.page(ctx) as any)); return; }
          const list = subjectsOf(step, ctx, steps, r.pages);
          const got = await Promise.all(list.map(async (id) => {
            const rows = await L.rows(id, step.pattern);
            r.answers.set(keyOf(step, id), rows as any[]);
            if (afterSave) r.afterKeys.add(keyOf(step, id));
            r.rows += rows.length;
            return rows as any[];
          }));
          steps.set(step.key, got.flat());
        }));
      }
    };
    await runLevels(shape.levels);
    if (shape.save) {
      const e = ctx.A + taskId(ctx.i, ctx.t), value = "submitted " + crypto.randomUUID();
      const position = await save(writer, `api1-submit-${crypto.randomUUID()}`, [{ e, a: ":task/field-0", v: { type: "string", value } }]);
      r.savedValue = value;
      L.afterWrite(position);
      afterSave = true;
      await runLevels(shape.after!);
      const after = r.answers.get(keyOf({ key: "taskAfter" }, e)) ?? [];
      r.missedOwnWrite = after.some((x: any) => x.attribute === ":task/field-0" && x.value_string === value) ? 0 : 1;
    }
    r.trips = L.counts.requests; r.reads = L.counts.reads; r.positions = L.counts.positions; r.position = L.counts.positions[0];
    if (stats) r.loads = L.counts.loads;
    return r;
  }

  const toEntries = (steps: Step[], ctx: Ctx) => {
    const index = new Map<string, number>();
    const entries: any[] = [];
    for (const step of steps) {
      index.set(step.key, entries.length);
      if (step.page) entries.push({ op: "ids", ...step.page(ctx) });
      else if (step.reach) entries.push({ op: "reach", rootsFrom: { entry: index.get(step.from!.step)!, ...(step.from!.attribute ? { attribute: step.from!.attribute } : {}), limit: 64 } });
      else if (step.ids) entries.push({ op: "rows", entityIds: step.ids(ctx), ...(step.pattern ? { pattern: step.pattern } : {}) });
      else entries.push({ op: "rows", entityIdsFrom: { entry: index.get(step.from!.step)!, ...(step.from!.attribute ? { attribute: step.from!.attribute } : {}) }, ...(step.pattern ? { pattern: step.pattern } : {}) });
    }
    return { entries, index };
  };
  async function batch1(c: DatomicClient, shape: Shape, ctx: Ctx, at?: number, stats = false, limits?: object): Promise<Result & { batch: any[] }> {
    const r: Result & { batch: any[] } = { trips: 0, reads: 0, rows: 0, positions: [], answers: new Map(), pages: new Map(), afterKeys: new Set(), batch: [], loads: 0 };
    const one = async (steps: Step[], extra: object) => {
      const { entries } = toEntries(steps, ctx);
      const answer = await readBatch(c, db, { basis: { validAt, ...(at !== undefined ? { recordedPosition: at } : {}) }, reads: entries, ...extra, ...(stats ? { stats: true } : {}), ...(limits ? { limits } : {}) } as any);
      r.trips += answer.requests; r.positions.push(answer.position); r.position ??= answer.position;
      if (answer.stats) r.loads! += answer.stats.loads;
      const byKey = new Map<string, any>();
      steps.forEach((step, k) => {
        const a: any = answer.answers[k];
        byKey.set(step.key, a);
        // The subjects this entry read: literal, an earlier page's IDs, or the references in an earlier answer.
        const asked: string[] = step.page ? [] : step.ids ? step.ids(ctx)
          : !step.from!.attribute ? (byKey.get(step.from!.step)?.ids ?? []) : refsOf(byKey.get(step.from!.step)?.rows ?? [], step.from!.attribute);
        r.batch.push({ step, entry: entries[k], answer: a, position: answer.position, asked });
        if (step.page) { r.pages.set(step.key, a); r.reads++; }
        else if (step.reach) r.reads += asked.length;
        else { r.rows += a.rows.length; r.reads += asked.length; }
      });
      return answer;
    };
    await one(shape.batch ?? shape.levels.flat(), {});
    if (shape.save) {
      const e = ctx.A + taskId(ctx.i, ctx.t), value = "submitted " + crypto.randomUUID();
      const position = await save(writer, `api1-submit-${crypto.randomUUID()}`, [{ e, a: ":task/field-0", v: { type: "string", value } }]);
      r.savedValue = value;
      const answer = await one(shape.after!.flat(), { atLeastPosition: position, basisWaitMs: 2000 });
      const task = answer.answers[0] as any;
      r.missedOwnWrite = task.rows.some((x: any) => x.attribute.v === ":task/field-0" && x.value_string?.v === value) ? 0 : 1;
    }
    return r;
  }
  return { today, loader, batch1, toEntries, keyOf, subjectsOf };
}
