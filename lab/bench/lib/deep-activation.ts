import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CompositionHandle, Receipt } from "./composition.ts";
import { DomainOraclePool } from "./w0-gates.ts";
import { publishChanged } from "./w0-replica.ts";
import { pageAddress, pageRoots } from "./w0-page-outbox.ts";
import { pageWireState } from "./w0-page-check.ts";
import { W0, canonical, type WorldRow, type PositionBasis } from "./w0-world.ts";
import { ids, subjectOf } from "./world.ts";
import { taskId } from "./deep-world.ts";
import {
  tenantRows,
  tenantRowsId,
  type Account as TenantAccount,
} from "../../experiments/EXP-DX1/scale1/tenants.ts";
import { DeepProjectionIndex } from "./deep-projection-index.ts";
import { buildIndex, eadRelease, selectRelease, type SelectorCut } from "./w0-selector.ts";
import { selectorOracle } from "./w0-selector-oracle.ts";

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
  private readonly nextRelease: W0.CompiledRelease;
  private readonly firstSubject: number;
  private readonly tenant?: TenantAccount;
  constructor(
    directory: string,
    people: number,
    run: string,
    first: number | "standard" | "ead90" = 0,
    next: "standard" | "ead90" = "standard",
    tenant?: TenantAccount,
  ) {
    this.firstSubject = typeof first === "number" ? first : 0;
    if (typeof first === "string") next = first;
    this.tenant = tenant;
    if (tenant) assert(tenant.first === this.firstSubject && tenant.people === people);
    this.nextRelease = next === "ead90" ? eadRelease() : W0.R2;
    this.directory = directory;
    this.subjects = people;
    this.run = run;
  }
  private projection(comp: CompositionHandle) {
    if (comp.name !== "reach-touched") return undefined;
    const code = ["deep-activation", "deep-projection-index", "deep-world", "w0-selector"].map(
      (name) => hash(fs.readFileSync(new URL("./" + name + ".ts", import.meta.url), "utf8")),
    );
    const tenant = this.tenant;
    const schema = tenant
      ? [
          tenantRowsId,
          tenant,
          hash(
            fs.readFileSync(
              new URL("../../experiments/EXP-DX1/scale1/tenants.ts", import.meta.url),
              "utf8",
            ),
          ),
        ]
      : "deep/1";
    const binding = hash(
      canonical([
        this.run,
        comp.scopeName,
        comp.backend.url,
        this.firstSubject,
        this.subjects,
        schema,
        ...code,
      ]),
    );
    // [DX-INT1] Why: a pooled release certifies only its account's owned facts; the tenant roster verifies durable catalog and shard assertions.
    // Rejected: generating pooled task values from a global ordinal or including another account in the release.
    const seedFor = tenant
      ? (i: number) =>
          i < tenant.first || i >= tenant.first + tenant.people
            ? undefined
            : tenantRows(tenant, i - tenant.first).filter((f) => subjectOf(f.e) === i)
      : undefined;
    return new DeepProjectionIndex(
      path.join(this.directory, "deep-policy.sqlite"),
      binding,
      policyWorld,
      seedFor,
    );
  }
  async finishImport(comp: CompositionHandle, cut: PositionBasis) {
    const projection = this.projection(comp);
    if (!projection) return;
    const started = performance.now();
    try {
      const input = await projection.catchUp(comp, cut);
      return { ...input, wallMs: performance.now() - started, diskBytes: projection.diskBytes };
    } finally {
      projection.close();
    }
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
    const release = name === "R1" ? W0.R1 : this.nextRelease,
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
    const records: W0.EvaluationRecord[] = [];
    const roster = Array.from({ length: this.subjects }, (_, i) =>
      W0.placementId(this.firstSubject + i),
    );
    const projection = this.projection(comp);
    const binding = projection?.binding;
    const selection = { full: 0, candidates: 0, excluded: 0 };
    const policyBasis = { tx: cut.position, validTime: businessTime(cut.validAt) };
    const basis = { position: cut.position, validAt: cut.validAt };
    let changes;
    try {
      if (projection) changes = await projection.catchUp(comp, basis);
      // [DX-INT1] Why: ACT1 consumes dated policy inputs independently of demand admission. The ordinary deep trace retains its release and full-evaluation semantics.
      // Rejected: substituting the narrow release in the frozen workload or warming a reader to evaluate a release.
      const width = projection ? 256 : pageSize;
      for (let n = 0; n < this.subjects; n += width) {
        const group = Array.from(
          { length: Math.min(width, this.subjects - n) },
          (_, j) => this.firstSubject + n + j,
        );
        const lines: string[] = [];
        if (projection && binding) {
          const worlds = await projection.worlds(comp, group, basis);
          const members = group.map((i) => W0.placementId(i));
          const byId = new Map(group.map((i) => [W0.placementId(i), worlds.get(i)!]));
          const sealCut: SelectorCut = {
            scope: comp.scopeName!,
            generation: binding,
            source: cut.txId,
            basis: policyBasis,
            frontier: cut.position,
            erasure: this.run,
          };
          const file = path.join(this.directory, "deep-" + name + "-selector.sqlite");
          const checkpoint = file + ".cursor";
          const index =
            release.hash === this.nextRelease.hash && release.hash !== W0.R2.hash
              ? {
                  file,
                  seal: buildIndex(
                    file,
                    sealCut,
                    members,
                    members.map((id) => byId.get(id)!),
                  ),
                }
              : undefined;
          const page = selectRelease({
            index,
            checkpoint,
            attempt: binding + "/" + cut.txId + "/" + n,
            cut: sealCut,
            roster: members,
            release,
            world: (id) => byId.get(id)!,
            onPage: (rows) => {
              for (const row of rows) {
                const i = this.firstSubject + n + row.ordinal;
                assert.equal(row.subject, W0.placementId(i));
                lines.push(
                  JSON.stringify([
                    i,
                    hash(canonical(worlds.get(i)!)),
                    hash(W0.outputJson(row.output)),
                  ]) + "\n",
                );
                records.push(W0.recordOf(row.output));
              }
            },
          });
          assert.equal(page.subjects, group.length);
          selection.candidates += page.candidates;
          selection.excluded += page.excluded;
          selection.full += page.full;
          fs.unlinkSync(checkpoint);
          if (index) fs.unlinkSync(file);
        } else {
          const page = await comp.sweepPage(group.map(ids.placement), basis);
          assert.deepEqual(page.reportedBasis, basis);
          const rows = indexRows(page.rows);
          for (const i of group) {
            const world = policyWorld(i, rows.get(i) ?? [], cut);
            const result = W0.sweepSubject(world, release, policyBasis);
            if ("error" in result) throw Error(name + " evaluation failed: " + result.error);
            lines.push(JSON.stringify([i, hash(canonical(world)), hash(result.json)]) + "\n");
            records.push(result.record);
          }
        }
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
      projection?.close();
      fs.closeSync(fd);
    }
    // [DX-SCALE1] Why: ACT1's page claims must bind a range to the entire independently ordered account roster, release and cut. Rejected: treating each 32-person gateway read as a separate complete release.
    const result = await publishChanged(observed, records, {
      layout: "page-cut",
      frameSize: 256,
      inflight: 1,
      roster: {
        subjects: roster,
        release: release.hash,
        basis: { tx: BigInt(cut.position), validTime: businessTime(cut.validAt) },
      },
    });
    if (projection)
      assert.equal(selection.full + selection.candidates + selection.excluded, this.subjects);
    const coverage = result.coverage;
    assert(
      coverage &&
        coverage.size === this.subjects &&
        coverage.pages === new Set(roster.map((s) => pageAddress(s).page)).size &&
        coverage.roster === hash(canonical(roster)),
    );
    assert(
      result.commits === coverage.pages &&
        result.responses.every(
          (r) =>
            r.committed &&
            !r.retry &&
            r.txId &&
            Number.isSafeInteger(r.position) &&
            r.position > cut.position,
        ),
    );
    const claims = result.responses.map((r) => {
      assert(r.committed && "span" in r && r.span, "Missing immutable page range");
      return {
        span: r.span,
        input: r.input,
        txId: r.txId,
        position: r.position,
        members: r.members,
      };
    });
    assert.equal(
      hash(
        canonical(
          claims.map((r) => hash(canonical([r.span, r.input, r.txId, r.position, r.members]))),
        ),
      ),
      coverage.receipts,
    );
    fs.writeFileSync(
      path.join(this.directory, "deep-" + name + "-page-claims.json"),
      canonical(claims),
      { flag: "wx" },
    );
    const publicationPosition = Math.max(...claims.map((r) => Number(r.position)));
    const endedAt = Date.now(),
      mutations = await mutation;
    return {
      release: release.hash,
      cut,
      subjects: this.subjects,
      publications: result.commits,
      publicationPosition,
      layout: "page-cut",
      ...(projection
        ? { selection, projection: changes, sourceWorldPulls: projection.sourceWorldPulls }
        : {}),
      coverage,
      changed: result.changed,
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
          rows[0]!.value.value === [W0.R1.hash, this.nextRelease.hash][k],
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
            subject >= this.firstSubject &&
            subject < this.firstSubject + this.subjects &&
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
    const oracleFile =
      this.nextRelease.hash === W0.R2.hash
        ? new URL("./w0-oracle.py", import.meta.url).pathname
        : selectorOracle(this.directory, this.nextRelease);
    const oracle = new DomainOraclePool(oracleFile, 2);
    let checked = 0,
      itemChanges = 0;
    const changed = [0, 0];
    try {
      for (let n = 0; n < this.subjects; n += pageSize) {
        const group = Array.from(
          { length: Math.min(pageSize, this.subjects - n) },
          (_, j) => this.firstSubject + n + j,
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
            comp.sweepPage(pageRoots(group.map((i) => W0.placementId(i))), {
              position: result.publicationPosition,
              validAt: sourceCuts[k]!.validAt,
            }),
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
              const line = JSON.parse(logs[k]![i - this.firstSubject]!);
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
              assert.equal(JSON.parse(logs[k]![i - this.firstSubject]!)[2], hash(output));
              const published = JSON.parse(
                await oracle.call("publish", {
                  state: previous,
                  evaluations: [{ basis, subject, workItems, release: releaseHash }],
                }),
              );
              assert(Array.isArray(published.deliveries) && published.state.subjects.length === 1);
              const address = pageAddress(subject),
                rows = states[k]!.rows;
              const markers = rows.filter((row) => row.entityId === address.page);
              assert(
                markers.length === 1 &&
                  markers[0]!.position > sourceCuts[k]!.position &&
                  markers[0]!.position <= results[k]!.publicationPosition,
              );
              const actual = pageWireState(rows, subject);
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
      releaseHashes: [W0.R1.hash, this.nextRelease.hash],
    };
  }
}
