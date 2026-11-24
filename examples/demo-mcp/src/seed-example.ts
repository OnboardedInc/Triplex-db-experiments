// [DX-CON1] Prepare the example a visitor first sees on a fresh toy: the design's Review type in release reviews-1 and
// a handful of reviews in the default account (the third, account-003), one of them corrected from a past date so
// Both time axes has something to show. Idempotent: it does nothing when Review is already in the live release.
//   node examples/demo-mcp/src/seed-example.ts [--count 6]
// Why: the owner opens a clean database with one worked example, not an empty sidebar or test types.
// Rejected: seeding inside up.sh's shell (the tools already validate, number and journal every write).
import { Demo } from "./store.ts";
import { runTool } from "./tools.ts";

const count = Number(process.argv[process.argv.indexOf("--count") + 1] || 6) || 6;
const demo = new Demo();
const call = (name: string, input: object) => runTool(name, input, "console", demo) as Promise<Record<string, any>>;

const types = await call("list_entity_types", {});
if (types["types"].some((t: { name: string }) => t.name === "Review")) {
  console.log("SEED SKIPPED: Review is already in the live release");
} else {
  const defined = await call("define_entity_type", {
    name: "Review",
    label: "reviews-1",
    attributes: [
      { key: ":review/outcome", valueType: "enumOf", enumValues: ["pending", "approved", "rejected"], required: true },
      { key: ":review/note", valueType: "text" },
      { key: ":review/of", valueType: "ref", refTarget: "Subject", required: true },
      { key: ":review/decided-on", valueType: "date" },
    ],
  });
  const accounts = (await call("list_accounts", {}))["accounts"] as { account: string; subjects: number; subjectNumbers: string }[];
  const a = accounts[2] ?? accounts[0]!;
  const first = Number(/^(\d+)/.exec(a.subjectNumbers)?.[1] ?? 0);
  const middle = first + Math.floor(a.subjects / 2);
  const outcomes = ["pending", "approved", "pending", "rejected", "approved", "pending"];
  const created: string[] = [];
  for (let i = 0; i < count; i++) {
    const subject = Math.min(first + a.subjects - 1, middle + i);
    const outcome = outcomes[i % outcomes.length]!;
    const out = await call("create_entity", {
      type: "Review",
      account: a.account,
      validFrom: "2026-11-09T00:00:00.000Z",
      attributes: {
        ":review/outcome": outcome,
        ":review/of": `acct/${a.account}/pl:${String(subject).padStart(8, "0")}`,
        ":review/note": i === 0 ? "first look at the documents" : `review of subject ${subject}`,
        ...(outcome === "pending" ? {} : { ":review/decided-on": "2026-11-16" }),
      },
    });
    created.push(out["entity"]);
  }
  // The first review is corrected: approved from Monday 16 November, so Both time axes shows two beliefs.
  await call("correct_past_value", { entity: created[0], attribute: ":review/outcome", value: "approved", validFrom: "2026-11-16T00:00:00.000Z" });
  console.log(`SEED DONE: Review in release ${defined["release"].label}; ${created.length} reviews in ${a.account} (${created[0]} corrected from 2026-11-16)`);
}
demo.close();
process.exit(0);
