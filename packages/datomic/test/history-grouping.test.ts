import { describe, it, expect } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// [DX-T1-12] Why: compare actual gateway and replica bytes, plus semantic E/A/V worlds across grouping, after the same frozen primary prefix.
// Rejected: comparing receipt counts alone, or requiring equal generated assertion IDs/record times across different transaction groupings.
describe.skipIf(process.env.DATOMIC_INTEGRATION !== "1")("native history grouping", () => {
  it("keeps 1,000 worlds and pinned cuts exact at depths 1, 3 and 10 for four versus 500 subjects", async () => {
    const sourceFile = new URL(import.meta.url),
      sourceBytes = fs.readFileSync(sourceFile);
    const { openComposition } = await import("../../../lab/bench/lib/composition.ts");
    const { seedRung } = await import("../../../lab/bench/lib/seed.ts");
    const { buildTraceCommand, buildHistoryGrowth } =
      await import("../../../lab/bench/lib/commands.ts");
    const { generateTrace, traceDigest } = await import("../../../lab/bench/lib/trace.ts");
    const { ids, memberOf, versioned, SEED_VALID_FROM } =
      await import("../../../lab/bench/lib/world.ts");
    const { canonicalWorld } = await import("../../../lab/bench/lib/canonical.ts");
    const { ReplicaReadHost, ReplicaReader } =
      await import("../../../lab/bench/lib/replica-reads.ts");
    const { DatomicClient } = await import("../src/DatomicClient.js");
    const { runtimeApi } = await import("../../../lab/bench/lib/triplex.ts");
    const { requestIndex } = await import("../../../lab/bench/lib/maintenance.ts");
    const subjects = 1000,
      list = Array.from({ length: subjects }, (_, i) => i),
      trace = generateTrace({ seed: "ns-v2", subjects, durationS: 7200 }),
      primary = trace.filter((e) => e.atMs < 200000 && !e.resend);
    const hash = (text: string) => createHash("sha256").update(text).digest("hex"),
      attempt = randomUUID(),
      results: any[] = [];
    const validAt = SEED_VALID_FROM + 365 * 86400000 + 200001;
    for (const group of [4, 500]) {
      const scope = `dxt1-history-${attempt}-${group}`,
        comp = await openComposition("reach", "datomic", scope),
        client = new DatomicClient(process.env.DATOMIC_URL!);
      let host: InstanceType<typeof ReplicaReadHost> | undefined;
      try {
        const seed = await seedRung({
          comp,
          subjects,
          runTag: scope,
          batchFacts: 2000,
          budgetMs: 600000,
          recordSubjects: new Set(),
          recordAccounts: new Set(),
          historySubjects: new Set(list),
          log: console.log,
        });
        expect(seed.complete).toBe(true);
        expect(seed.failures).toHaveLength(0);
        let head = { position: seed.lastPosition, instant: seed.lastInstant };
        const seeded: string[] = [];
        let seedNext = 0;
        await Promise.all(
          Array.from({ length: 8 }, async () => {
            while (seedNext < subjects) {
              const i = seedNext++,
                body = await comp.pull(ids.placement(i), {
                  recordedAt: head.instant,
                  recordedPosition: head.position,
                  validAt,
                });
              seeded[i] = hash(
                JSON.stringify(
                  body.triples.map((t) => memberOf(t.entityId, t.attribute, t.value)).sort(),
                ),
              );
            }
          }),
        );
        for (const event of primary) {
          const state = seed.state.get(event.subject)!,
            cmd = buildTraceCommand({
              runTag: scope,
              event,
              state,
              scheduledAbsMs: SEED_VALID_FROM + 365 * 86400000 + event.atMs,
            }),
            out = await comp.transact(cmd.operations, {
              commandId: cmd.commandId,
              actor: event.kind,
              preconditions: cmd.preconditions,
            });
          if (!out.ok) throw Error(`Primary prefix failed: ${out.tag}`);
          head = { position: out.value.position, instant: out.value.instant };
          state.stamp = cmd.newStamp;
          state.stampId = out.value.triples.find(
            (t) =>
              t.entityId === ids.placement(event.subject) && t.attribute === ":placement/stamp",
          )!.id;
          state.stampValidFrom = SEED_VALID_FROM + 365 * 86400000 + event.atMs;
          if (cmd.newAddress) {
            state.address = cmd.newAddress;
            state.addressId = out.value.triples.find(
              (t) => t.entityId === ids.worker(event.subject) && t.attribute === ":worker/address",
            )!.id;
            state.addressValidFrom = cmd.validRange.from;
          }
        }
        host = await ReplicaReadHost.open(
          scope,
          list.map(ids.placement),
          comp,
          head,
          "inline",
          192 * 1024 ** 2,
        );
        const reader = new ReplicaReader();
        reader.install(host.index.image());
        host.subscribe((delta) => reader.apply(delta));
        const db = await client.create(runtimeApi.DatabaseScope.test(scope), "lean", true),
          snapshots: any[] = [],
          growth: any[] = [];
        let version = 0,
          local = 0,
          fallback = 0;
        for (const depth of [1, 3, 10]) {
          let commands = 0,
            assertions = 0;
          for (; version < depth - 1; version++)
            for (let k = 0; k < subjects; k += group) {
              const cmd = buildHistoryGrowth({
                  runTag: scope,
                  label: `v${version + 1}.${k}`,
                  subjects: list.slice(k, k + group),
                  version: version + 1,
                  ids: seed.versionIds,
                }),
                out = await comp.transact(cmd.operations, {
                  commandId: cmd.commandId,
                  actor: "p4-history",
                  preconditions: cmd.preconditions,
                });
              if (!out.ok) throw Error(`History failed: ${out.tag}`);
              const receipt = out.value,
                index = new Map(
                  receipt.triples.map((t) => [JSON.stringify([t.entityId, t.attribute]), t]),
                );
              expect(index.size).toBe(cmd.perSubject.length * 2);
              for (const s of cmd.perSubject)
                seed.versionIds.set(
                  s.subject,
                  s.added.map((f) => {
                    const row = index.get(JSON.stringify([f.e, f.a]));
                    expect(row && memberOf(row.entityId, row.attribute, row.value)).toBe(
                      memberOf(f.e, f.a, f.v),
                    );
                    return row!.id;
                  }),
                );
              head = { position: receipt.position, instant: receipt.instant };
              commands++;
              assertions += receipt.triples.length;
            }
          const indexJob = await requestIndex(
            client,
            db.db,
            `history-${depth}`,
            () => performance.timeOrigin + performance.now(),
            60000,
          );
          expect(indexJob.completed).toBe(true);
          await reader.wait(head.position, 30000);
          const basis = { recordedAt: head.instant, recordedPosition: head.position, validAt },
            semantic: string[] = [],
            full: string[] = [];
          let next = 0,
            pulls = 0;
          await Promise.all(
            Array.from({ length: 8 }, async () => {
              while (next < subjects * 10) {
                const n = next++,
                  subject = n % subjects,
                  root = ids.placement(subject),
                  gateway = () => comp.pull(root, basis),
                  actual = await gateway(),
                  replica = await reader.pullAt(root, basis, gateway, undefined, true);
                expect(canonicalWorld(replica.triples)).toBe(canonicalWorld(actual.triples));
                replica.route === "replica" ? local++ : fallback++;
                pulls++;
                if (n < subjects) {
                  for (const f of versioned(subject, depth - 1)) {
                    const rows = actual.triples.filter(
                      (t) => t.entityId === f.e && t.attribute === f.a,
                    );
                    expect(rows).toHaveLength(1);
                    expect(memberOf(rows[0]!.entityId, rows[0]!.attribute, rows[0]!.value)).toBe(
                      memberOf(f.e, f.a, f.v),
                    );
                  }
                  semantic[subject] = hash(
                    JSON.stringify(
                      actual.triples.map((t) => memberOf(t.entityId, t.attribute, t.value)).sort(),
                    ),
                  );
                  full[subject] = hash(canonicalWorld(actual.triples));
                }
              }
            }),
          );
          expect(pulls).toBe(10000);
          expect(semantic.filter(Boolean)).toHaveLength(subjects);
          snapshots.push({
            depth,
            basis,
            semantic,
            full,
            fingerprint: hash(JSON.stringify(semantic)),
            pulls,
            indexCompleted: indexJob.completed,
          });
          growth.push({ depth, commands, assertions });
        }
        for (const snapshot of snapshots)
          for (const subject of list) {
            const actual = await comp.pull(ids.placement(subject), snapshot.basis);
            expect(hash(canonicalWorld(actual.triples))).toBe(snapshot.full[subject]);
          }
        expect(growth.map((x) => x.commands)).toEqual(group === 4 ? [0, 500, 1750] : [0, 4, 14]);
        expect(growth.map((x) => x.assertions)).toEqual([0, 4000, 14000]);
        results.push({
          group,
          scope,
          subjects,
          traceDigest: traceDigest(trace),
          primaryRowsSha256: hash(JSON.stringify(primary)),
          seedAssertions: seed.assertions,
          seedFingerprint: hash(JSON.stringify(seeded)),
          growth,
          local,
          fallback,
          snapshots: snapshots.map(({ full, ...s }) => s),
        });
      } finally {
        await host?.close();
        client.close();
        await comp.close();
      }
    }
    expect(results[0].primaryRowsSha256).toBe(results[1].primaryRowsSha256);
    expect(results[0].seedAssertions).toBe(results[1].seedAssertions);
    expect(results[0].seedFingerprint).toBe(results[1].seedFingerprint);
    expect(results[0].snapshots.map((s: any) => s.fingerprint)).toEqual(
      results[1].snapshots.map((s: any) => s.fingerprint),
    );
    const directory = process.env.DX_CLOCK_EVIDENCE_DIR;
    if (directory) {
      expect(process.env.TRIPLEX_TRACE_SOURCE).toMatch(/^[a-f0-9]{40}$/);
      expect(process.env.TRIPLEX_TRACE_SLOT).toMatch(/^tx2-dxt1-/);
      expect(fs.readFileSync(sourceFile).equals(sourceBytes)).toBe(true);
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(
        path.join(directory, `history-${attempt}.json`),
        JSON.stringify(
          {
            attempt,
            source: process.env.TRIPLEX_TRACE_SOURCE,
            slot: process.env.TRIPLEX_TRACE_SLOT,
            testSourceSha256: createHash("sha256").update(sourceBytes).digest("hex"),
            scope:
              "Actual E/A/V fingerprints across grouping; complete canonical row bytes within each pinned gateway/replica comparison. Independent oracle is a separate driver gate.",
            results,
          },
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
    }
  }, 900000);
});
