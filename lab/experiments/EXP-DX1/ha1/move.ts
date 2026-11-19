import assert from "node:assert/strict";
import {
  Account,
  DatomicClient,
  errorCode,
  immutable,
} from "../../../../packages/datomic/test/ha1-account.ts";
import { ackProxy } from "./ack-proxy.ts";
import { clock, hash, sleep, until } from "./common.ts";
import type { Stack } from "./stack.ts";

export function backupCut(list: string, floor: string) {
  // [DX-HA1] Why: the pinned CLI prints an EDN list of native t values. Rejected: scraping arbitrary numbers from warnings or segment counts.
  const match = /^\(\s*(\d+(?:[\s,]+\d+)*)\s*\)$/.exec(list.trim());
  assert(match, "Unrecognized list-backups output");
  const cuts = match[1]!.split(/[\s,]+/).map(BigInt);
  const t = cuts.reduce((a, b) => (a > b ? a : b));
  assert(t >= BigInt(floor), "Backup precedes acknowledged source cut");
  return String(t);
}
export function vendorResult(action: string, output: string, args: string[], db: string) {
  if (action === "list-backups") return;
  if (action === "verify-backup") {
    const record = output.trim().split("\n").at(-1)!;
    assert(
      record.includes(":event :verify-backup/complete") &&
        /:missing-segments #\{\}/.test(record) &&
        /:unreadable-segments \(\)/.test(record),
      "Incomplete or unreadable backup",
    );
    assert.equal(record.match(/:t (\d+)(?=[,}])/)?.[1], args.at(-1));
    assert(Number(record.match(/:total-segments (\d+)/)?.[1]) > 0);
    assert.equal(args[1], "true");
    return;
  }
  assert(output.split("\n").includes(":succeeded"), "Vendor command did not confirm success");
  if (action === "restore-db") {
    const record = output.trim().split("\n").at(-1)!;
    assert(
      record.includes(":event :restore") &&
        record.match(/:db ([a-zA-Z0-9_-]+)(?=[,}])/)?.[1] === db,
    );
    assert.equal(record.match(/:basis-t (\d+)(?=[,}])/)?.[1], args.at(-1));
  }
}
export async function move(s: Stack, people: number) {
  await s.tool();
  await Promise.all([s.postgres("pg", s.a), s.postgres("target", s.b)]);
  await s.database("pg", "moving");
  await s.database("pg", "neighbor");
  await s.database("target", "moving");
  await s.sql("pg", "CREATE ROLE backupreader LOGIN PASSWORD '" + s.secret + "'");
  await s.sql("pg", "GRANT SELECT ON datomic_kvs TO backupreader", "moving");
  await Promise.all([s.tx("active", s.a, "pg", "moving"), s.tx("standby", s.a, "pg", "neighbor")]);
  for (const r of ["active", "standby"] as const)
    await until("source broker", async () => (await s.broker(r)) || undefined);
  await Promise.all([
    s.gateway("write", s.a, "pg", "moving"),
    s.gateway("read", s.a, "pg", "neighbor"),
  ]);
  const w = await s.ready("write"),
    n = await s.ready("read");
  const a = new Account(s.e.prefix + "-account", w, w),
    b = new Account(s.e.prefix + "-neighbor", n, n);
  let running = true;
  let work: Promise<void> | undefined;
  try {
    await Promise.all([a.open(), b.open()]);
    const bpin = await b.send(b.intent("opening"));
    let counter = 0;
    work = (async () => {
      while (running) {
        await b.send(b.intent("live-" + ++counter, 1, "near-" + counter));
        await b.pinned(bpin);
        await sleep(300);
      }
    })();
    work.catch(() => {});
    for (let i = 0; i < people; i++) await a.send(a.intent("seed-" + i, 160, "person-" + i));
    const old = await a.send(a.intent("past"));
    await a.pinned(old);
    await a.pinned(a.receipts.get(a.inputs[0]!.operationId)!);
    const cursor = String(BigInt(old.t.v) + 1n);
    const backup = "file:/tmp/ha1-backup";
    const stages: { action: string; elapsedMs: number; output: string }[] = [];
    const cli = async (action: string, ...args: string[]) => {
      const start = clock();
      const stdout = await s.exec(
        "tool",
        "/opt/datomic/bin/datomic",
        "-Xms96m",
        "-Xmx320m",
        "-XX:ActiveProcessorCount=2",
        action,
        ...args,
      );
      const clean = s.redact(stdout);
      vendorResult(action, clean, args, a.db);
      stages.push({ action, elapsedMs: clock() - start, output: clean });
      s.e.log("vendor", stages.at(-1));
      return stdout;
    };
    const source = s.uri("pg", "moving", a.db, s.a, "backupreader"),
      dest = s.uri("target", "moving", a.db, s.a);
    const size = async () =>
      Number((await s.exec("tool", "du", "-sb", "/tmp/ha1-backup")).split(/\s/)[0]);
    const storageBytes = async () =>
      Number(await s.sql("pg", "SELECT pg_total_relation_size('datomic_kvs')", "moving"));
    const before = clock(),
      sourceBytes = await storageBytes();
    await cli("backup-db", source, backup);
    const baseline = backupCut(await cli("list-backups", backup), old.t.v),
      baseBytes = await size();
    await cli("verify-backup", backup, "true", baseline);
    await cli("restore-db", backup, dest, baseline);
    const tail = await a.send(a.intent("after-precopy"));
    const p = await ackProxy(w),
      client = new DatomicClient(p.url, 20000);
    let withheld;
    const pending = a.intent("lost");
    try {
      const failure = client.transact(a.db, pending).then(
        () => {
          throw Error("Lost ACK reached caller");
        },
        (err) => {
          assert.equal(errorCode(err), "Transport");
        },
      );
      await p.wait([pending.operationId], true);
      const raw = p.requests.get(pending.operationId)!;
      assert.equal(raw.status, 200);
      withheld = immutable(raw.reply);
      p.drop();
      await failure;
    } finally {
      p.close();
      client.close();
    }
    const cut = await a.w.basis(a.db);
    assert.equal(cut.position.v, withheld.position.v);
    const fenceAt = clock(),
      nBefore = counter;
    // [DX-HA1] Why: a committed NOLOGIN plus termination of the old SQL sessions fences every producer for this account's store. Rejected: changing a routing map while an old peer can still publish.
    await s.sql("pg", "ALTER ROLE moving NOLOGIN");
    await s.sql(
      "pg",
      "REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON datomic_kvs FROM moving",
      "moving",
    );
    await s.sql(
      "pg",
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename='moving'",
    );
    await until(
      "source sessions drained",
      async () =>
        (await s.sql("pg", "SELECT count(*) FROM pg_stat_activity WHERE usename='moving'")) ===
          "0" || undefined,
    );
    const stale = {
      ...pending,
      operationId: a.key + "-stale",
      attemptId: a.key + "-stale",
      rows: [],
      newIds: [],
      claims: [{ commandId: a.key + "-stale", txId: a.key + "-stale", timestamp: 2000000 }],
    };
    let rejected: string | undefined;
    try {
      await a.w.transact(a.db, stale);
    } catch (err) {
      rejected = errorCode(err);
    }
    assert(rejected, "Old gateway accepted a write after the fence");
    let denied = false;
    try {
      await s.exec(
        "pg",
        "env",
        "PGPASSWORD=" + s.secret,
        "psql",
        "-h",
        "localhost",
        "-U",
        "moving",
        "-d",
        "moving",
        "-c",
        "select 1",
      );
    } catch (err: any) {
      denied = /not permitted to log in/.test(String(err.stderr ?? err.message));
    }
    assert(denied, "A fresh source writer could authenticate");
    await s.remove("write");
    await s.remove("active");
    await cli("backup-db", source, backup);
    const final = backupCut(await cli("list-backups", backup), String(cut.t.v)),
      finalBytes = await size();
    assert(BigInt(final) > BigInt(baseline));
    await cli("verify-backup", backup, "true", final);
    await cli("restore-db", backup, dest, final);
    await s.tx("active", s.b, "target", "moving");
    await until("new broker", async () => (await s.broker("active")) || undefined);
    await s.gateway("write", s.b, "target", "moving");
    const newUrl = await s.ready("write");
    a.changeEndpoint(newUrl, newUrl);
    // [DX-HA1] Why: validate the restored DB without create(), which would initialize a missing account. Rejected: a new store accepting its first write as a restore witness.
    const target = await a.r.basis(a.db);
    assert.equal(target.schemaHash, a.schema);
    assert.equal(target.position.v, cut.position.v);
    assert(BigInt(target.t.v) >= BigInt(final));
    assert.equal((await a.r.operation(a.db, stale.operationId)).status, "absent");
    assert.deepEqual(immutable(await a.r.operation(a.db, tail.operationId)), tail);
    await a.pinned(old);
    const original = await a.send(pending);
    assert.deepEqual(original, withheld);
    const auditStart = clock();
    const openingAudit = await a.verify(cursor);
    const auditMs = clock() - auditStart;
    assert.equal(openingAudit.seedAudit.subjects, people);
    assert.equal(openingAudit.seedAudit.facts, people * 160);
    const newReceipt = await a.send(a.intent("destination-only"));
    const firstNew = a.arrivals.get(newReceipt.operationId)!;
    await a.pinned(old);
    await a.pinned(newReceipt);
    const suffix = await a.verify(cursor),
      full = await a.verify();
    assert.equal(await s.sql("pg", "SELECT rolcanlogin FROM pg_roles WHERE rolname='moving'"), "f");
    running = false;
    await work;
    const neighbors = await b.verify();
    const neighborDuring = b.attempts.filter(
      (x) => x.result === "ack" && x.start >= fenceAt && x.end <= firstNew,
    );
    assert(neighborDuring.length > 0 && counter > nBefore);
    const report = {
      nonce: s.e.nonce,
      people,
      seedFacts: people * 160,
      sourceBytes,
      baseBytes,
      finalBytes,
      baseline,
      final,
      cut,
      target,
      old,
      original,
      newReceipt,
      beforeFirstWriteAudit: { auditMs, ...openingAudit.seedAudit },
      staleRejected: rejected,
      freshLoginDenied: denied,
      full,
      suffix,
      neighbors,
      neighborCommitsDuringPause: neighborDuring.length,
      neighborAcks: b.attempts,
      stages,
      setupThroughCutoverMs: firstNew - before,
      pauseMs: firstNew - fenceAt,
      lastAckGapMs: firstNew - a.arrivals.get(tail.operationId)!,
      cursor,
      identity: hash(a.db),
    };
    s.e.write("move", report);
    return {
      people,
      pauseMs: report.pauseMs,
      totalMs: report.setupThroughCutoverMs,
      backupBytes: finalBytes,
    };
  } finally {
    running = false;
    await work?.catch(() => {});
    a.close();
    b.close();
  }
}
