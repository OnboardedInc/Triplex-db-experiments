// [DX-API1] The four ports of a shape (shapes.ts): today, pinned, loader (CallReads) and batch1 (one request), shared by
// the Mac driver (run.ts) and the server driver (server.ts). With `defs` (a DefinitionCache), the loader and batch1 take
// the steps marked `def` (definitions in force) from the cache when the call's release pointer names the cached release.
import { DatomicClient, CallReads, readBatch, DefinitionCache, DefinitionReleaseAmbiguous, revisionMap, worldRevisions } from "../../../../packages/datomic/dist/index.js";
import { taskId } from "../../../bench/lib/deep-world.ts";
import { def, refsOf, RELEASE, type Ctx, type Shape, type Step } from "./shapes.ts";

export type Result = { trips: number; reads: number; rows: number; position?: number; positions: number[]; loads?: number;
  answers: Map<string, any[]>; pages: Map<string, any>; worlds: Map<string, any>; afterKeys: Set<string>; savedValue?: string;
  missedOwnWrite?: number; defHits: number; defMisses: number; profile?: any[];
  /** Definition answers kept but refused because a revision or the removal sequence moved; revision lookups sent. */
  defRevisionMisses?: number; revisionReads?: number;
  /** Wall time of each single request (today and pinned). */
  requestMs?: number[] };
export type Save = (c: DatomicClient, id: string, change: { e: string; a: string; v: { type: string; value: string } }[]) => Promise<number>;
export type Port = "today" | "pinned" | "loader" | "batch1";
export type Options = { at?: number; stats?: boolean; limits?: object; defs?: DefinitionCache; profile?: boolean; legacyParse?: boolean; prefetch?: boolean };
const fresh = (): Result => ({ trips: 0, reads: 0, rows: 0, positions: [], answers: new Map(), pages: new Map(), worlds: new Map(),
  afterKeys: new Set(), defHits: 0, defMisses: 0 });
const v = (x: any) => (x !== null && typeof x === "object" ? x.v : x);
const hashOf = (rows: readonly any[], pointer = "") => {
  const values = rows.filter((r) => v(r.attribute) === RELEASE).map((r) => v(r.value_string));
  if (values.length > 1) throw new DefinitionReleaseAmbiguous(pointer, values);
  return values.length === 1 && typeof values[0] === "string" ? (values[0] as string) : undefined;
};

export function makePorts(db: string, validAt: number, writer: DatomicClient, save: Save) {
  const keyOf = (step: Step, id: string) => `${step.key}|${step.pattern?.attribute ?? "*"}|${id}`;
  const subjectsOf = (step: Step, c: Ctx, done: Map<string, any[]>, pages: Map<string, any>) => {
    if (step.ids) return step.ids(c);
    const src = step.from!;
    if (!src.attribute) return (pages.get(src.step)?.ids ?? []) as string[];
    return refsOf(done.get(src.step) ?? [], src.attribute);
  };
  const submit = async (ctx: Ctx) => {
    const e = ctx.A + taskId(ctx.i, ctx.t), value = "submitted " + crypto.randomUUID();
    const position = await save(writer, `api1-submit-${crypto.randomUUID()}`, [{ e, a: ":task/field-0", v: { type: "string", value } }]);
    return { e, value, position };
  };

  async function today(c: DatomicClient, shape: Shape, ctx: Ctx, pinned: boolean, at?: number): Promise<Result> {
    const r = fresh();
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
            // The ID list route runs one request per account at a time and answers IndexBusy (retry) otherwise.
            let page: any;
            for (let attempt = 0; ; attempt++) {
              try { page = await c.listIds(db, { ...step.page(ctx), ...(basis ? { basis: { recordedPosition: basis.recordedPosition, validAt } } : {}) } as any); break; }
              catch (e: any) { if (e?.code !== "IndexBusy" || attempt > 2000) throw e; r.trips++; await new Promise((s) => setTimeout(s, 2)); }
            }
            r.pages.set(step.key, page);
            return;
          }
          const list = subjectsOf(step, ctx, steps, r.pages);
          if (step.reach) {
            // One reach request per root (the single route today's port has for a world).
            await Promise.all(list.map(async (id) => {
              r.trips++;
              const t0 = performance.now();
              const world = await c.request<any>("POST", "/v2/db/" + db + "/reach-many", { roots: [id], basis: basis ?? { validAt } });
              (r.requestMs ??= []).push(performance.now() - t0);
              r.reads += world.entities.length;
              r.worlds.set(keyOf(step, id), world);
            }));
            return;
          }
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
      const { e, value, position } = await submit(ctx);
      r.savedValue = value;
      if (pinned) basis = { recordedPosition: position, validAt };
      afterSave = true;
      await runLevels(shape.after!);
      const after = r.answers.get(keyOf({ key: "taskAfter" }, e)) ?? [];
      const seen = after.filter((x: any) => v(x.attribute) === ":task/field-0").map((x: any) => v(x.value_string));
      r.missedOwnWrite = seen.includes(value) ? 0 : 1;
    }
    return r;
  }

  async function loader(c: DatomicClient, shape: Shape, ctx: Ctx, o: Options = {}): Promise<Result> {
    const L = new CallReads(c, db, { validAt, ...(o.at !== undefined ? { position: o.at } : {}), ...(o.stats ? { stats: true } : {}) });
    const r = fresh();
    const pointer = def.account(ctx.A);
    const hits0 = o.defs ? o.defs.counts.hits : 0, misses0 = o.defs ? o.defs.counts.misses : 0;
    const steps = new Map<string, any[]>();
    let afterSave = false;
    const runLevels = async (levels: Step[][]) => {
      for (const level of levels) {
        await Promise.all(level.map(async (step) => {
          if (step.page) { r.pages.set(step.key, await L.ids(step.page(ctx) as any)); return; }
          const list = subjectsOf(step, ctx, steps, r.pages);
          const cached = o.defs && step.def;
          if (step.reach) {
            await Promise.all(list.map(async (id) => {
              const world = cached ? await L.definitionReach(o.defs!, pointer, RELEASE, id) : await L.reach(id);
              r.worlds.set(keyOf(step, id), world);
            }));
            return;
          }
          const got = await Promise.all(list.map(async (id) => {
            const rows = cached ? await L.definitionRows(o.defs!, pointer, RELEASE, id, step.pattern) : await L.rows(id, step.pattern);
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
      const { e, value, position } = await submit(ctx);
      r.savedValue = value;
      L.afterWrite(position);
      afterSave = true;
      await runLevels(shape.after!);
      const after = r.answers.get(keyOf({ key: "taskAfter" }, e)) ?? [];
      r.missedOwnWrite = after.some((x: any) => x.attribute === ":task/field-0" && x.value_string === value) ? 0 : 1;
    }
    r.trips = L.counts.requests; r.positions = L.counts.positions; r.position = L.counts.positions[0];
    r.reads = [...r.answers.keys()].length + [...r.worlds.values()].reduce((n, w) => n + (w.entities?.length ?? 0), 0) + r.pages.size;
    if (o.defs) { r.defHits = o.defs.counts.hits - hits0; r.defMisses = o.defs.counts.misses - misses0; }
    if (o.stats) r.loads = L.counts.loads;
    return r;
  }

  const toEntries = (steps: Step[], ctx: Ctx, literal = new Map<string, string[]>()) => {
    const index = new Map<string, number>();
    const entries: any[] = [];
    for (const step of steps) {
      index.set(step.key, entries.length);
      const ids = literal.get(step.key) ?? (step.ids ? step.ids(ctx) : undefined);
      if (step.page) entries.push({ op: "ids", ...step.page(ctx) });
      else if ((step as any).revisions && ids) entries.push({ op: "revisions", entityIds: ids });
      else if ((step as any).revisions) entries.push({ op: "revisions", entityIdsFrom: { entry: index.get(step.from!.step)!, attribute: step.from!.attribute } });
      else if (step.reach && ids) entries.push({ op: "reach", roots: ids });
      else if (step.reach) entries.push({ op: "reach", rootsFrom: { entry: index.get(step.from!.step)!, ...(step.from!.attribute ? { attribute: step.from!.attribute } : {}), limit: 64 } });
      else if (ids) entries.push({ op: "rows", entityIds: ids, ...(step.pattern ? { pattern: step.pattern } : {}) });
      else entries.push({ op: "rows", entityIdsFrom: { entry: index.get(step.from!.step)!, ...(step.from!.attribute ? { attribute: step.from!.attribute } : {}) }, ...(step.pattern ? { pattern: step.pattern } : {}) });
    }
    return { entries, index };
  };
  async function batch1(c: DatomicClient, shape: Shape, ctx: Ctx, o: Options = {}): Promise<Result & { batch: any[] }> {
    const r: Result & { batch: any[] } = { ...fresh(), batch: [], loads: 0 };
    const byKey = new Map<string, any>();
    const extraFields = { ...(o.stats ? { stats: true } : {}), ...(o.profile ? { stats: true, profile: true } : {}), ...(o.legacyParse ? { legacyParse: true } : {}),
      ...(o.prefetch === false ? { prefetch: false } : {}), ...(o.limits ? { limits: o.limits } : {}) };
    const record = (step: Step, entry: any, a: any, position: number, asked: string[]) => {
      byKey.set(step.key, a);
      if ((step as any).revisions) { r.revisionReads = (r.revisionReads ?? 0) + (a?.revisions?.length ?? 0); return; }
      r.batch.push({ step, entry, answer: a, position, asked });
      if (step.page) { r.pages.set(step.key, a); r.reads++; }
      else if (step.reach) r.reads += Array.isArray(a?.entities) ? a.entities.length : asked.length;  // every entity of the worlds
      else { r.rows += a.rows.length; r.reads += asked.length; }
    };
    const askedFor = (step: Step) => step.page ? [] : step.ids ? step.ids(ctx)
      : !step.from!.attribute ? (byKey.get(step.from!.step)?.ids ?? []) : refsOf(byKey.get(step.from!.step)?.rows ?? [], step.from!.attribute);
    const one = async (steps: Step[], extra: object, pin?: number, literal?: Map<string, string[]>) => {
      const { entries } = toEntries(steps, ctx, literal);
      const at = pin ?? o.at;
      const answer = await readBatch(c, db, { basis: { validAt, ...(at !== undefined ? { recordedPosition: at } : {}) }, reads: entries, ...extra, ...extraFields } as any);
      r.trips += answer.requests; r.positions.push(answer.position); r.position ??= answer.position;
      if (answer.stats) { r.loads! += answer.stats.loads; for (const page of answer.stats.pages ?? []) if ((page as any).samples) (r.profile ??= []).push(page); }
      steps.forEach((step, k) => record(step, entries[k], answer.answers[k], answer.position, literal?.get(step.key) ?? askedFor(step)));
      return answer;
    };
    const all = shape.batch ?? shape.levels.flat();
    // With a definitions cache (DefinitionCache): a definition step whose answers the cache holds under the account's last
    // seen release is left out of the first request, and the revisions of its entities are read in its place (a
    // `revisions` entry: one seek each, no rows). Its kept answer is used only when, at the call's position, the release
    // marker names the same hash, every revision is the kept one and the removal sequence is the same; otherwise the step
    // is read at the same position and kept. Rows definition steps read in the first request carry a revisions entry too,
    // so what is kept carries its revisions. Two release markers on one account: DefinitionReleaseAmbiguous.
    const pointer = def.account(ctx.A);
    const keyFor = (step: Step, id: string) => (step.reach ? "reach " : "rows " + JSON.stringify(step.pattern ?? null) + " ") + id;
    const guess = o.defs?.lastHash(pointer);
    const literalIds = (step: Step) => (step.ids ? step.ids(ctx) : undefined);
    const keptWorldIds = (step: Step) => {
      const roots = literalIds(step);
      if (!roots || guess === undefined) return undefined;
      const kept = roots.map((id) => o.defs!.entry(pointer, guess, keyFor(step, id)));
      return kept.every(Boolean) ? [...new Set(kept.flatMap((k) => [...k!.revisions.keys()]))] : undefined;
    };
    const omit = o.defs && guess !== undefined ? all.filter((s) => s.def && (!s.reach || keptWorldIds(s))) : [];
    const sent = all.filter((s) => !omit.includes(s));
    const revStep = (step: Step, ids?: string[]): Step => ({ ...step, key: step.key + "#rev", ...(ids ? { ids: () => ids, from: undefined } : {}), revisions: true } as any);
    const revSteps = o.defs ? all.filter((s) => s.def).flatMap((s) => {
      if (s.reach) { const ids = omit.includes(s) ? keptWorldIds(s) : undefined; return ids ? [revStep(s, ids)] : []; }
      return s.ids || (s.from && sent.some((x) => x.key === s.from!.step)) ? [revStep(s)] : [];
    }) : [];
    const first = await one([...sent, ...revSteps], {});
    if (o.defs) {
      const seq = first.erasureSeq;
      const accountStep = all.find((s) => s.key === "account");
      const hash = accountStep ? hashOf(byKey.get("account")?.rows ?? [], pointer) : undefined;
      const revisionsFor = async (step: Step, ids: string[]) => {
        const got = byKey.get(step.key + "#rev");
        if (got) return revisionMap(got);
        await one([revStep(step, ids)], {}, first.position);
        return revisionMap(byKey.get(step.key + "#rev"));
      };
      const only = (m: Map<string, number>, ids: Iterable<string>) => new Map([...ids].map((id) => [id, m.get(id) ?? -1]));
      // Definition steps read in the first request are kept with their revisions.
      if (hash !== undefined) for (const b of r.batch.filter((b) => b.step.def)) {
        if (b.step.reach) for (const id of b.asked) o.defs.store(pointer, hash, keyFor(b.step, id), b.answer, worldRevisions(b.answer), seq);
        else {
          const revs = await revisionsFor(b.step, b.asked);
          for (const id of b.asked) o.defs.store(pointer, hash, keyFor(b.step, id), b.answer.rows.filter((x: any) => v(x.entity_id) === id), only(revs, [id]), seq);
        }
      }
      for (const step of omit) {
        const ids = askedFor(step);
        const kept = ids.map((id) => (hash !== undefined ? o.defs!.entry(pointer, hash, keyFor(step, id)) : undefined));
        let ok = hash !== undefined && kept.every(Boolean);
        let current = new Map<string, number>();
        if (ok) {
          current = await revisionsFor(step, step.reach ? [...new Set(kept.flatMap((k) => [...k!.revisions.keys()]))] : ids);
          ok = kept.every((k, n) => o.defs!.valid(k!, only(current, step.reach ? k!.revisions.keys() : [ids[n]!]), seq));
          if (!ok) { o.defs.counts.revisionMisses++; r.defRevisionMisses = (r.defRevisionMisses ?? 0) + 1; }
        }
        if (ok) {
          o.defs.counts.hits++; r.defHits++;
          const a = step.reach ? kept[0]!.value : { rows: kept.flatMap((k) => k!.value as any[]) };
          record(step, { op: step.reach ? "reach" : "rows", ...(step.reach ? { roots: ids } : { entityIds: ids }) }, a, first.position, ids);
        } else {
          o.defs.counts.misses++; r.defMisses++;
          await one([step], {}, first.position, new Map([[step.key, ids]]));
          const b = r.batch[r.batch.length - 1]!;
          if (hash !== undefined) {
            if (step.reach) for (const id of ids) o.defs.store(pointer, hash, keyFor(step, id), b.answer, worldRevisions(b.answer), seq);
            else {
              const revs = current.size ? current : await revisionsFor(step, ids);
              for (const id of ids) o.defs.store(pointer, hash, keyFor(step, id), b.answer.rows.filter((x: any) => v(x.entity_id) === id), only(revs, [id]), seq);
            }
          }
        }
      }
    }
    if (shape.save) {
      const { value, position } = await submit(ctx);
      r.savedValue = value;
      const answer = await one(shape.after!.flat(), { atLeastPosition: position, basisWaitMs: 2000 });
      const task = answer.answers[0] as any;
      r.missedOwnWrite = task.rows.some((x: any) => x.attribute.v === ":task/field-0" && x.value_string?.v === value) ? 0 : 1;
    }
    return r;
  }
  return { today, loader, batch1, toEntries, keyOf, subjectsOf };
}
