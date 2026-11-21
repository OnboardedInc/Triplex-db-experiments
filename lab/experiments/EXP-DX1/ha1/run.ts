import assert from "node:assert/strict";
import { Evidence, inputs } from "./common.ts";
import { Stack, type Site } from "./stack.ts";
import { replication } from "./replication.ts";
import { move } from "./move.ts";
import { oneBackup } from "./one-backup.ts";
import { oneAccount } from "./one-account.ts";
import { oneWhole } from "./one-whole.ts";
import { oneFailover } from "./one-failover.ts";
import { failures } from "./failures.ts";
import type { Checkpoint } from "../hasync1/seed.ts";
import { fleetCaps, fleetMode } from "../hasync1/v2/fleet-config.ts";

async function gatewayChecks(s: Stack) {
  await s.tool();
  const before = await s.view("tool");
  const witnessPath = "/tmp/" + s.e.prefix + "-recorded-feed.json";
  const evidence = { nonce: s.e.nonce, role: before.Id, source: s.e.source };
  const result = [];
  const failed: string[] = [];
  for (const name of [
    "selftest",
    "feed-test",
    "commit-order-test",
    "group-test",
    "cache-key-test",
    "recent-test",
    "trace-test",
  ]) {
    // [DX-HA1] Why: run the gates against the exact mounted integration source in one small reservation.
    // Rejected: borrowing another builder's image-only selftest output.
    try {
      const stdout = await s
        .exec(
          "tool",
          "env",
          "DATOMIC_JAVA_OPTS=-Xms96m -Xmx768m -XX:ActiveProcessorCount=2",
          "DF01_RECORDED_PAGE=" + witnessPath,
          "bin/run",
          "-m",
          "triplex.gateway." + name,
          s.e.nonce,
        )
        .catch((error: { stdout?: string; stderr?: string }) => {
          s.e.write("native-" + name, {
            ...evidence,
            stdout: s.redact(error.stdout ?? ""),
            stderr: s.redact(error.stderr ?? ""),
          });
          throw error;
        });
      s.e.write("native-" + name, { ...evidence, stdout });
      if (name === "feed-test") {
        // [DX-HA1] Why: prove the emitted fixture belongs to this role and covers its exact feed cut.
        // Rejected: treating stdout alone as evidence of the required feed output.
        const witness = await s.exec("tool", "cat", witnessPath);
        const page = JSON.parse(witness);
        assert.deepEqual([page.database, page.fromT, page.nextT], ["s2-Zg", "100", "106"]);
        assert.deepEqual(
          page.rows.map((row: { t: string; kind: string }) => [row.t, row.kind]),
          [
            ["100", "commit"],
            ["101", "skipped"],
            ["105", "commit"],
          ],
        );
        s.e.write("native-feed-witness", { ...evidence, witness });
      }
      const counts = /Ran (\d+) tests containing (\d+) assertions\./.exec(stdout);
      assert(
        counts && Number(counts[1]) >= (name === "selftest" ? 27 : 1) && Number(counts[2]) > 0,
      );
      assert.match(stdout, /0 failures, 0 errors\./);
      result.push({ name, tests: Number(counts[1]), assertions: Number(counts[2]) });
    } catch (error) {
      // [DX-HA1] Why: collect independent failures within the one owned stack. Rejected: skipping every later namespace after an early red result.
      failed.push(name + ": " + s.redact(String(error)));
    }
  }
  assert.equal((await s.view("tool")).Id, before.Id);
  assert.equal(failed.length, 0, failed.join("\n"));
  return result;
}

export async function drill(
  e: Evidence,
  a: Site,
  b: Site,
  profile: {
    people: number;
    scopes: number;
    capacity: string;
    pooled?: true;
    timing?: "diagnostic";
  },
  release: () => void,
  sync?: {
    path: string;
    checkpoint?: Checkpoint;
    deadline: number;
    credentials: { secret: string; admin: string };
    ownerUid?: number;
    ownerGid?: number;
  },
) {
  const s = new Stack(
    e,
    a,
    b,
    sync?.credentials,
    fleetMode(e.mode) ? fleetCaps(e.mode, profile.scopes, a !== b) : undefined,
  );
  let cleanupShared: (() => Promise<void>) | undefined;
  let result: unknown;
  try {
    assert(
      Number.isSafeInteger(profile.people) &&
        profile.people > 0 &&
        profile.people <=
          (profile.pooled || e.mode.startsWith("one-") || e.mode === "load-quiet"
            ? 1500000
            : 100000),
    );
    await s.open();
    if (e.mode.startsWith("hasync-")) {
      const { SyncPair } = await import("../hasync1/pair.ts");
      const pair = new SyncPair(s, sync);
      cleanupShared = () => pair.cleanup();
      if (e.mode === "hasync-cold") {
        const { checkStoppedPair } = await import("../hasync1/sunday-toy.ts");
        result = await checkStoppedPair(s);
      } else if (fleetMode(e.mode)) {
        result = await (await import("../hasync1/v2/fleet.ts")).fleet(s, pair, profile.scopes);
      } else if (e.mode.startsWith("hasync-seed-")) {
        assert(sync);
        const { buildCheckpoint } = await import("../hasync1/seed.ts");
        result = await buildCheckpoint(
          pair,
          e.mode === "hasync-seed-lean" ? "lean" : "legacy",
          profile.people,
          sync.deadline,
          e.mode === "hasync-seed-edited",
        );
      } else if (e.mode === "hasync-smoke") {
        const { smoke } = await import("../hasync1/smoke.ts");
        result = await smoke(pair, profile.people);
      } else if (e.mode === "hasync-cost-plain" || e.mode === "hasync-cost-group") {
        const { costDrill } = await import("../hasync1/cost.ts");
        result = await costDrill(
          pair,
          profile.people,
          e.mode === "hasync-cost-group",
          sync ? { blockSize: 512 } : {},
        );
      } else if (e.mode === "hasync-move") {
        const { moveDrill } = await import("../hasync1/move.ts");
        result = await moveDrill(pair, profile.people, {
          auditSeed: !sync,
          pooled: profile.pooled === true,
        });
      } else {
        const { faultDrill } = await import("../hasync1/faults.ts");
        result = await faultDrill(pair, profile.people, e.mode, {
          auditSeed: !sync,
          pooled: profile.pooled === true,
        });
      }
    } else if (e.mode.startsWith("load-"))
      result = await (await import("../load1/run.ts")).load(s, profile.people);
    else if (e.mode === "failures")
      result = await failures(
        s,
        profile.scopes,
        profile.capacity === "two-host" ? profile.people : 0,
      );
    else if (e.mode === "native-checks") result = await gatewayChecks(s);
    else if (e.mode === "move") result = await move(s, profile.people);
    else if (e.mode === "replication") result = await replication(s);
    else if (e.mode === "one-failover") result = await oneFailover(s, profile.people);
    else if (e.mode === "one-backup") result = await oneBackup(s, profile.people);
    else if (e.mode === "one-whole" || e.mode === "one-sync")
      result = await oneWhole(s, profile.people, e.mode === "one-sync");
    else if (e.mode === "one-account") result = await oneAccount(s, profile.people);
    else throw Error("One-database experiment not installed");
  } catch (err: any) {
    e.write("failure", {
      name: err.name,
      message: s.redact(String(err.message)),
      stack: s.redact(String(err.stack)),
    });
    throw Error(s.redact(String(err.message)));
  } finally {
    try {
      await s.capture();
    } finally {
      await s.cleanup();
      await cleanupShared?.();
      release();
      e.write("cleanup", { nonce: e.nonce, containers: 0, networks: 0 });
    }
  }
  assert.deepEqual(inputs(e.mode), e.source, "Executed inputs changed during drill");
  e.write("observations", {
    nonce: e.nonce,
    source: e.source,
    slot: e.slot,
    profile: e.mode.startsWith("one-")
      ? {
          people: profile.people,
          capacity: profile.capacity,
          ...(profile.timing ? { timing: profile.timing } : {}),
          seedShape: e.shape,
          sourceDatabases: 1,
        }
      : profile,
    result,
  });
  return result;
}
