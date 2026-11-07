import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { makeXtdbClient } from "../../src/XtdbClient.js";

// Independent tiny oracle only. Production query execution never evaluates rows here.
const edges = [
  ["a", "b"],
  ["a", "c"],
  ["b", "d"],
  ["c", "d"],
  ["d", "b"],
  ["e", "f"],
] as const;
const pairs = new Set(edges.map(([a, b]) => `${a}/${b}`));
for (let round = 1; round <= 3; round++) {
  for (const [a, next] of edges)
    for (const pair of [...pairs]) {
      const [from, to] = pair.split("/");
      if (next === from) pairs.add(`${a}/${to}`);
    }
}
const expected = [...pairs].sort();
const id = randomUUID();
const client = makeXtdbClient(process.env.XTDB_URL ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb", {
  maxConnections: 4,
});
const observations: unknown[] = [];
try {
  const tables = await client.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables",
  );
  const known = new Set(tables.map(({ table_name }) => table_name));
  for (const [table, columns] of [
    ["tx_query_probe_edges", "_id, run_id, arg1, arg2"],
    ["tx_query_probe_closure", "_id, run_id, arg1, arg2, depth"],
  ]) {
    if (!known.has(table!)) await client.submit([{ sql: `CREATE TABLE ${table} (${columns})` }]);
  }
  await client.submit(
    edges.map(([a, b], index) => ({
      sql: "INSERT INTO tx_query_probe_edges (_id, run_id, arg1, arg2) VALUES (?, ?, ?, ?)",
      params: [`${id}/${index}`, id, a, b],
    })),
  );
  const unrolled = async () => {
    const started = performance.now();
    const alternatives = Array.from({ length: 4 }, (_, depth) => {
      const joins = Array.from(
        { length: depth },
        (_unused, offset) => `JOIN edges e${offset + 1} ON e${offset}.arg2 = e${offset + 1}.arg1`,
      ).join(" ");
      return `SELECT e0.arg1, e${depth}.arg2 FROM edges e0 ${joins}`;
    });
    const rows = await client.query<{ arg1: string; arg2: string }>(
      `WITH edges AS (SELECT arg1,arg2 FROM tx_query_probe_edges WHERE run_id = ?) ${alternatives.join(" UNION ")}`,
      [id],
    );
    const actual = rows.map(({ arg1, arg2 }) => `${arg1}/${arg2}`).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(`Unrolled SQL mismatch ${JSON.stringify(actual)}`);
    return {
      experiment: "bounded-unrolled-sql",
      passed: true,
      rows: actual,
      elapsedMs: performance.now() - started,
    };
  };
  const scratch = async () => {
    const started = performance.now();
    await client.submit([
      {
        sql: "INSERT INTO tx_query_probe_closure (_id,run_id,arg1,arg2,depth) SELECT _id,run_id,arg1,arg2,0 FROM tx_query_probe_edges WHERE run_id = ?",
        params: [id],
      },
    ]);
    for (let depth = 1; depth <= 3; depth++)
      await client.submit([
        {
          sql: `INSERT INTO tx_query_probe_closure (_id,run_id,arg1,arg2,depth)
SELECT ? || ':' || e.arg1 || '/' || c.arg2, ?, e.arg1, c.arg2, ?
FROM tx_query_probe_edges e JOIN tx_query_probe_closure c ON e.arg2 = c.arg1
WHERE e.run_id = ? AND c.run_id = ? AND c.depth < ?
AND NOT EXISTS (SELECT 1 FROM tx_query_probe_closure s WHERE s.run_id = ? AND s.arg1 = e.arg1 AND s.arg2 = c.arg2)`,
          params: [id, id, depth, id, id, depth, id],
        },
      ]);
    const rows = await client.query<{ arg1: string; arg2: string }>(
      "SELECT DISTINCT arg1,arg2 FROM tx_query_probe_closure WHERE run_id = ?",
      [id],
    );
    const actual = rows.map(({ arg1, arg2 }) => `${arg1}/${arg2}`).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(`Scratch SQL mismatch ${JSON.stringify(actual)}`);
    return {
      experiment: "server-fixed-point",
      passed: true,
      rows: actual,
      elapsedMs: performance.now() - started,
    };
  };
  observations.push(...(await Promise.all([unrolled(), scratch()])));
  const antiJoins = await Promise.all([
    client.query(
      "SELECT DISTINCT e.arg1 FROM tx_query_probe_edges e WHERE e.run_id = ? AND NOT EXISTS (SELECT 1 FROM tx_query_probe_edges n WHERE n.run_id = ? AND n.arg1 = e.arg2 AND n.arg2 = 'd') ORDER BY e.arg1",
      [id, id],
    ),
    client.query(
      "SELECT DISTINCT e.arg1 FROM tx_query_probe_edges e LEFT JOIN tx_query_probe_edges n ON n.run_id = ? AND n.arg1 = e.arg2 AND n.arg2 = 'd' WHERE e.run_id = ? AND n._id IS NULL ORDER BY e.arg1",
      [id, id],
    ),
  ]);
  if (JSON.stringify(antiJoins[0]) !== JSON.stringify(antiJoins[1]))
    throw new Error("Anti-join strategy mismatch");
  observations.push({
    experiment: "parallel-negation-shapes",
    passed: true,
    answers: antiJoins[0],
  });
  const evidence = {
    version: 1,
    runId: id,
    kind: "correctness-feasibility-not-benchmark",
    concurrentCandidates: 2,
    independentExpectedPairs: expected,
    observations,
  };
  const path = new URL(`./evidence-${id}.json`, import.meta.url);
  await writeFile(path, JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify({ evidence: path.pathname, observations }));
} finally {
  await client.close();
}
