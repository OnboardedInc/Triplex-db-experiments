import { readFileSync, writeFileSync } from "node:fs";
// [EXP-C8-R4] Why: retain inspectable timing comparisons and distinguish write/read timeout events.
// Rejected: reporting every sibling cancellation as an independent timeout.
const out = "lab/experiments/EXP-C8-read-only-frontier/round4";
const json = (file) => JSON.parse(readFileSync(`${out}/${file}`, "utf8"));
const lines = (file) => readFileSync(`${out}/${file}`, "utf8").trim().split("\n").map(JSON.parse);
const timed = lines("paired/measure-events.jsonl");
const pairs = timed
  .filter((e) => e.event === "logical-end")
  .map((e) => ({
    label: e.label,
    ms: e.ms,
    result: e.result,
    requests: timed.filter((r) => r.event === "end" && r.id.startsWith(e.label + "-")),
  }));
const control = lines("control/events.jsonl");
const requests = control
  .filter((e) => e.event === "start")
  .map((e) => {
    let query = "";
    try {
      query = readFileSync(`${out}/control/${e.id}.rq`, "utf8");
    } catch {}
    const end = control.find((r) => r.id === e.id && r.event !== "start");
    const kind =
      e.contentType === "application/sparql-update"
        ? "write"
        : query.startsWith("SELECT ?position")
          ? "basis"
          : query.startsWith("SELECT DISTINCT ?v0_value")
            ? query.includes(":c8/same")
              ? "self-source"
              : "parent-source"
            : query.includes("__triplex_native_")
              ? "native"
              : query.match(/VALUES \(\?a/g)?.length === 2
                ? "shared-ancestor-main"
                : query.includes("VALUES (?a")
                  ? "rule-main"
                  : "other";
    return {
      ...e,
      kind,
      ...(end
        ? { outcome: end.event, ms: end.ms, error: end.error, status: end.status }
        : { outcome: "missing" }),
    };
  });
const profiles = [];
for (const variant of ["original", "dataset", "unscoped"]) {
  const p = json(`paired/profile-${variant}.json`);
  const root = p.runtimeInformation.query_execution_tree;
  const nodes = [];
  const walk = (n) => {
    nodes.push({
      description: n.description,
      rows: n.result_rows,
      totalMs: n.total_time,
      operationMs: n.operation_time,
      cache: n.cache_status,
      details: n.details,
    });
    for (const child of n.children ?? []) walk(child);
  };
  walk(root);
  profiles.push({ variant, status: p.status, results: p.resultSizeTotal, time: p.time, nodes });
}
writeFileSync(
  `${out}/summary.json`,
  JSON.stringify(
    {
      paired: pairs,
      profiles,
      control: { requests, errors: requests.filter((r) => r.outcome === "error") },
      hostRounds: json("host-rounds.json"),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    {
      paired: pairs.map((p) => ({ label: p.label, ms: p.ms })),
      controlRequests: requests.length,
      errors: requests
        .filter((r) => r.outcome === "error")
        .map(({ id, kind, ms, error }) => ({ id, kind, ms, error })),
    },
    null,
    2,
  ),
);
