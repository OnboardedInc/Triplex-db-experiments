import type { TraceEvent } from "./trace.ts";
import { W0, V_W0, triplexValue } from "./w0-world.ts";
export function mapW0Trace(ev: TraceEvent) {
  const S = W0.placementId(ev.subject),
    id = `${S}/ans:t${ev.seq}`;
  const validFrom = V_W0 + Math.floor(ev.atMs) - (ev.correction ? 30 * 86400000 : 0);
  // [EXP-P5] Why: ballast answer chains preserve the frozen fact count without introducing unknown attributes or shared writes. Rejected: changing a location (round A has no shared-entity fanout).
  const rows: [string, string, any][] = [];
  if (ev.kind === "system")
    rows.push([S, "everifySubmitResult", ev.seq % 2 ? "accepted" : "rejected"]);
  else if (ev.kind === "runtime") rows.push([S, "bgcStatus", ev.seq % 2 ? "clear" : "consider"]);
  else if (ev.kind === "agent") {
    const d = `${S}/dec:t${ev.seq}`;
    rows.push(
      [S, "decisions", d],
      [d, "target", "bgc.adjudication"],
      [d, "verdict", "approve"],
      [d, "author", "agent"],
    );
  } else rows.push([S, "weeklyMinutes", ev.seq % 2 ? 3000 : 1200]);
  // Each remaining fact is a distinct reachable answers edge (then field/value facts when room remains).
  let k = 0;
  while (rows.length < ev.facts) {
    const a = id + "-" + k++;
    rows.push([S, "answers", a]);
    if (rows.length < ev.facts) rows.push([a, "field", "trace"]);
    if (rows.length < ev.facts) rows.push([a, "value", String(ev.seq)]);
  }
  return {
    commandId: `p5:trace:${ev.seq}`,
    validFrom,
    rows,
    operations: rows.map(([entityId, attribute, v]) => ({
      op: "assert",
      entityId,
      attribute,
      value: triplexValue(attribute, v),
      validFrom,
    })),
  };
}
