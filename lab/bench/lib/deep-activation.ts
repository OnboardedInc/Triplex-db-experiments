import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CompositionHandle, Receipt } from "./composition.ts";
import { DomainOraclePool } from "./w0-gates.ts";
import { publishChanged } from "./w0-replica.ts";
import { outboxEntity } from "./w0-outbox.ts";
import { W0, canonical, type WorldRow, type PositionBasis } from "./w0-world.ts";
import { ids, subjectOf } from "./world.ts";
import { taskId } from "./deep-world.ts";

const pageSize = 32;
const businessTime = (ms: number) => new Date(ms).toISOString().replace(/Z$/, "000Z");
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const indexRows = (rows: readonly WorldRow[]) => {
  const bySubject = new Map<number, WorldRow[]>();
  for (const row of rows) {
    const i = subjectOf(row.entityId);
    assert(i !== null);
    const list = bySubject.get(i) ?? [];
    list.push(row);
    bySubject.set(i, list);
  }
  return bySubject;
};

// [DX-SCALE1] Why: the release reads actual stored custom values, file dates, task answers and progress at one named cut. Rejected: evaluating a separately seeded W0 database while calling its activation a deep-account result.
export function policyWorld(i: number, rows: readonly WorldRow[], basis: PositionBasis): W0.World {
  assert(
    rows.length &&
      rows.every(
        (r) =>
          subjectOf(r.entityId) === i &&
          r.position <= basis.position &&
          r.validFrom <= basis.validAt &&
          (r.validTo == null || basis.validAt < r.validTo),
      ),
  );
  const subject = W0.placementId(i),
    facts: W0.Fact[] = [];
  const read = (e: string, a: string) => {
    const matches = rows.filter((r) => r.entityId === e && r.attribute === a);
    assert.equal(matches.length, 1, `Missing or ambiguous ${a}`);
    return matches[0]!;
  };
  const put = (e: string, a: string, v: W0.Fact["v"], row: WorldRow) =>
    facts.push({ e, a, v, tx: row.position });
  const custom = (a: string) => read(ids.worker(i), `:person/custom-${a}`);
  const start = custom("start"),
    pay = custom("pay-cents"),
    time = custom("weekly-minutes"),
    state = custom("state-floor"),
    local = custom("local-floor"),
    bgc = custom("background");
  put(subject, "startDate", start.value.value, start);
  put(subject, "payRateCents", Number(pay.value.value), pay);
  put(subject, "weeklyMinutes", Number(time.value.value), time);
  put(subject, "bgcStatus", bgc.value.value, bgc);
  const loc = `loc:l${i}`,
    jur = `jur:j${i}`;
  put(subject, "location", loc, local);
  put(loc, "jurisdiction", jur, state);
  put(loc, "localMinWageCents", Number(local.value.value), local);
  put(jur, "stateMinWageCents", Number(state.value.value), state);
  const tasks = rows
    .filter((r) => r.attribute === ":placement/task")
    .sort((a, b) => a.value.value.localeCompare(b.value.value));
  assert(tasks.length);
  const first = read(taskId(i, 0), ":task/progress");
  if (Number(first.value.value) > 0)
    put(subject, "section1AttestedAt", `${start.value.value}T12:00:00.000000Z`, first);
  for (const [n, r] of rows
    .filter((r) => r.attribute === ":person/file")
    .sort((a, b) => a.value.value.localeCompare(b.value.value))
    .entries()) {
    const doc = `${subject}/doc:d${n}`,
      expiry = read(r.value.value, ":file/expiresOn");
    put(subject, "documents", doc, r);
    put(doc, "docType", n === 0 ? "ead" : "visa", r);
    put(doc, "expiresOn", expiry.value.value, expiry);
  }
  for (const [n, r] of tasks.entries()) {
    const answer = `${subject}/ans:t${n}`,
      field = read(r.value.value, ":task/field-0");
    put(subject, "answers", answer, r);
    put(answer, "field", `task-${n}`, field);
    put(answer, "value", field.value.value, field);
  }
  const stamp = read(ids.placement(i), ":placement/stamp"),
    a = `${subject}/ans:revision`;
  put(subject, "answers", a, stamp);
  put(a, "field", "revision", stamp);
  put(a, "value", String(stamp.value.value), stamp);
  return { subject, facts };
}

type Release = "R1" | "R2";
type Cut = PositionBasis & { txId: string; assertion: string };
export class DeepActivation {
  private readonly cuts = new Map<Release, Cut>();
  private readonly directory: string;
  private readonly subjects: number;
  private readonly run: string;
  constructor(directory: string, people: number, run: string) {
    this.directory = directory;
    this.subjects = people;
    this.run = run;
  }
  async execute(
    comp: CompositionHandle,
    name: Release,
    observe: (receipt: Receipt, ops: any[], actor: string) => void,
    captured?: (cut: Cut) => Promise<unknown>,
  ) {
    const observed = {
      ...comp,
      transact: async (...args: Parameters<typeof comp.transact>) => {
        const r = await comp.transact(...args);
        if (r.ok) {
          assert.equal(typeof args[1].actor, "string");
          observe(r.value, [...args[0]], String(args[1].actor));
        }
        return r;
      },
    };
    const release = W0[name],
      entity = `deep-release:${this.run}`,
      prior = this.cuts.get("R1");
    const ops = [
      ...(name === "R2" ? [{ op: "retract", id: prior!.assertion }] : []),
      {
        op: "assert",
        entityId: entity,
        attribute: ":release/hash",
        value: { type: "string", value: release.hash },
        validFrom: 0,
      },
    ];
    const startedAt = Date.now();
    const change = await observed.transact(ops, {
      commandId: `${this.run}:activate:${name}`,
      actor: "deep-activation",
      preconditions: name === "R2" ? [{ _tag: "TripleLive", id: prior!.assertion }] : [],
    });
    if (!change.ok) throw Error(`Activation failed: ${change.tag}`);
    const asserted = change.value.triples;
    assert.equal(asserted.length, 1);
    assert.equal(asserted[0]!.value.value, release.hash);
    const cut = {
      position: change.value.position,
      validAt: startedAt,
      txId: change.value.txId,
      assertion: asserted[0]!.id,
    };
    this.cuts.set(name, cut);
    const mutation = captured?.(cut);
    mutation?.catch(() => {});
    const file = path.join(this.directory, `deep-${name}-evaluations.jsonl`),
      fd = fs.openSync(file, "wx"),
      sum = createHash("sha256");
    let publications = 0,
      publicationPosition = cut.position,
      changed = 0;
    try {
      for (let n = 0; n < this.subjects; n += pageSize) {
        const group = Array.from(
          { length: Math.min(pageSize, this.subjects - n) },
          (_, j) => n + j,
        );
        const page = await comp.sweepPage(group.map(ids.placement), {
          position: cut.position,
          validAt: cut.validAt,
        });
        assert.equal(page.reportedBasis?.position, cut.position);
        assert.equal(page.reportedBasis?.validAt, cut.validAt);
        const rows = indexRows(page.rows),
          lines: string[] = [];
        const records = group.map((i) => {
          const world = policyWorld(i, rows.get(i) ?? [], cut),
            result = W0.sweepSubject(world, release, {
              tx: cut.position,
              validTime: businessTime(cut.validAt),
            });
          if ("error" in result) throw Error(`${name} evaluation failed: ${result.error}`);
          lines.push(JSON.stringify([i, hash(canonical(world)), hash(result.json)]) + "\n");
          return result.record;
        });
        // [DX-SCALE1] Why: an unchanged work item still needs a newer durable guard. Rejected: prefiltering equal items, which previously discarded the decision for unchanged people.
        const ack = await publishChanged(observed, records, {
          layout: "guard-fact",
          frameSize: pageSize,
          inflight: 1,
        });
        for (const response of ack.responses)
          if (response.committed) {
            assert(
              response.txId &&
                Number.isSafeInteger(response.position) &&
                response.position > cut.position,
            );
            publicationPosition = Math.max(publicationPosition, response.position);
          }
        assert(ack.responses.every((r) => !r.retry));
        publications += ack.commits;
        changed += ack.changed;
        const bytes = lines.join("");
        fs.writeFileSync(fd, bytes);
        sum.update(bytes);
        if (n % (pageSize * 32) === 0)
          console.log(
            JSON.stringify({
              event: "deep-activation-progress",
              release: name,
              through: n + group.length,
            }),
          );
      }
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    const endedAt = Date.now(),
      mutations = await mutation;
    return {
      release: release.hash,
      cut,
      subjects: this.subjects,
      publications,
      publicationPosition,
      layout: "guard-fact",
      changed,
      startedAt,
      endedAt,
      wallMs: endedAt - startedAt,
      outputSha256: sum.digest("hex"),
      mutations,
    };
  }
  async verify(
    comp: CompositionHandle,
    r1: { outputSha256: string; publicationPosition: number; changed: number },
    r2: { outputSha256: string; publicationPosition: number; changed: number; mutations?: unknown },
  ) {
    const sourceCuts = [this.cuts.get("R1")!, this.cuts.get("R2")!] as const,
      final = await comp.currentPosition();
    const results = [r1, r2];
    // [DX-SCALE1] Why: match both committed release facts and the outbox after each sweep to their actual immutable cuts. Rejected: validating R2 at the current head while silently accepting a missing R1 guard.
    for (const [k, c] of sourceCuts.entries()) {
      assert(
        results[k]!.publicationPosition > c.position && results[k]!.publicationPosition <= final,
      );
      const entity = `deep-release:${this.run}`,
        page = await comp.sweepPage([entity], { position: c.position, validAt: c.validAt });
      assert.deepEqual(page.reportedBasis, { position: c.position, validAt: c.validAt });
      const rows = page.rows.filter(
        (row) => row.entityId === entity && row.attribute === ":release/hash",
      );
      assert.equal(rows.length, 1);
      assert(
        rows[0]!.id === c.assertion &&
          rows[0]!.position === c.position &&
          rows[0]!.value.value === [W0.R1.hash, W0.R2.hash][k],
      );
    }
    const logs = ["R1", "R2"].map((release, k) => {
      const bytes = fs.readFileSync(
        path.join(this.directory, `deep-${release}-evaluations.jsonl`),
        "utf8",
      );
      assert.equal(hash(bytes), [r1, r2][k]!.outputSha256);
      const rows = bytes.trimEnd().split("\n");
      assert.equal(rows.length, this.subjects);
      return rows;
    });
    if (Array.isArray(r2.mutations)) {
      for (const { subject, position } of r2.mutations) {
        assert(
          Number.isSafeInteger(subject) &&
            Number.isSafeInteger(position) &&
            position > sourceCuts[1].position,
        );
        const root = ids.placement(subject),
          before = sourceCuts[1],
          validAt = Date.now();
        const old = await comp.sweepPage([root], {
          position: before.position,
          validAt: before.validAt,
        });
        const after = await comp.sweepPage([root], { position, validAt });
        const stamp = (p: typeof old) => {
          const s = p.rows.filter((r) => r.entityId === root && r.attribute === ":placement/stamp");
          assert.equal(s.length, 1);
          return s[0]!;
        };
        assert.equal(old.reportedBasis?.position, before.position);
        assert.equal(after.reportedBasis?.position, position);
        assert(
          stamp(old).position <= before.position &&
            stamp(after).position === position &&
            Number(stamp(after).value.value) > Number(stamp(old).value.value),
        );
      }
    }
    const oracle = new DomainOraclePool(new URL("./w0-oracle.py", import.meta.url).pathname, 2);
    let checked = 0,
      itemChanges = 0;
    const changed = [0, 0];
    try {
      for (let n = 0; n < this.subjects; n += pageSize) {
        const group = Array.from(
          { length: Math.min(pageSize, this.subjects - n) },
          (_, j) => n + j,
        );
        const pages = await Promise.all(
          sourceCuts.map((c) =>
            comp.sweepPage(group.map(ids.placement), { position: c.position, validAt: c.validAt }),
          ),
        );
        const by = pages.map((p, k) => {
          assert.equal(p.reportedBasis?.position, sourceCuts[k]!.position);
          assert.equal(p.reportedBasis.validAt, sourceCuts[k]!.validAt);
          return indexRows(p.rows);
        });
        const states = await Promise.all(
          results.map((result, k) =>
            comp.sweepPage(
              group.map((i) => outboxEntity(W0.placementId(i))),
              { position: result.publicationPosition, validAt: sourceCuts[k]!.validAt },
            ),
          ),
        );
        for (const [k, s] of states.entries())
          assert.deepEqual(s.reportedBasis, {
            position: results[k]!.publicationPosition,
            validAt: sourceCuts[k]!.validAt,
          });
        await Promise.all(
          group.map(async (i) => {
            const worlds = sourceCuts.map((c, k) => policyWorld(i, by[k]!.get(i) ?? [], c));
            for (let k = 0; k < 2; k++) {
              const line = JSON.parse(logs[k]![i]!);
              assert.equal(line[0], i);
              assert.equal(line[1], hash(canonical(worlds[k])));
            }
            const bases = sourceCuts.map((c) => ({
              tx: c.position,
              validTime: businessTime(c.validAt),
            }));
            let previous: any = { items: [], pending: [], subjects: [] };
            for (const [k, release] of ["R1", "R2"].entries()) {
              const output = await oracle.call("evaluate", {
                world: worlds[k],
                release,
                basis: bases[k],
              });
              const { basis, subject, workItems, release: releaseHash } = JSON.parse(output);
              assert.equal(subject, W0.placementId(i));
              assert.equal(JSON.parse(logs[k]![i]!)[2], hash(output));
              const published = JSON.parse(
                await oracle.call("publish", {
                  state: previous,
                  evaluations: [{ basis, subject, workItems, release: releaseHash }],
                }),
              );
              assert(Array.isArray(published.deliveries) && published.state.subjects.length === 1);
              const entity = outboxEntity(subject),
                rows = states[k]!.rows.filter((row) => row.entityId === entity);
              const single = (attribute: string) => {
                const found = rows.filter((row) => row.attribute === attribute);
                assert(
                  found.length <= 1 &&
                    found.every(
                      (row) =>
                        row.value.type === "string" &&
                        row.position <= results[k]!.publicationPosition,
                    ),
                );
                return found[0];
              };
              const body = single("p5/state"),
                guard = single("p5/guard");
              assert(guard && guard.position > sourceCuts[k]!.position);
              const actual = body
                ? JSON.parse(body.value.value)
                : { items: [], pending: [], subjects: [] };
              assert.equal(actual.subjects.length, 0);
              actual.subjects = [JSON.parse(guard.value.value)];
              for (const work of [...actual.items, ...actual.pending])
                if (typeof work.payload === "string") work.payload = JSON.parse(work.payload);
              assert.equal(canonical(actual), canonical(published.state));
              changed[k]! += Number(canonical(published.state) !== canonical(previous));
              if (k === 1)
                itemChanges += Number(
                  published.deliveries.length > 0 ||
                    canonical(published.state.items) !== canonical(previous.items),
                );
              previous = published.state;
            }
            checked++;
          }),
        );
        if (n % (pageSize * 32) === 0)
          console.log(JSON.stringify({ event: "deep-activation-oracle", through: checked }));
      }
    } finally {
      oracle.close();
    }
    assert.equal(checked, this.subjects);
    assert.deepEqual(changed, [r1.changed, r2.changed]);
    return {
      checked,
      guardComparisons: checked * 2,
      changed: changed[1],
      itemChanges,
      finalPosition: final,
      domain: "O-DOMAIN",
      releaseHashes: [W0.R1.hash, W0.R2.hash],
    };
  }
}
