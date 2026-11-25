// [DX-CON1] The sentence an assistant would be told for the call on screen. Each template reads only the call's input,
// so the sentence and the tool call shown beside it always describe the same thing.
import type { ToolCall } from "@/hooks/use-tool";

const subj = (i: Record<string, unknown>) => `subject ${i["subject"]} of ${i["account"]}`;
const basisWords = (b: unknown) => {
  if (!b || typeof b !== "object") return "";
  const x = b as Record<string, unknown>;
  const parts: string[] = [];
  if (x["position"] !== undefined)
    parts.push(`at position ${Number(x["position"]).toLocaleString("en-US")}`);
  if (x["recordedAt"] !== undefined)
    parts.push(`as recorded at ${String(x["recordedAt"]).slice(0, 16).replace("T", " ")}`);
  if (x["validAt"] !== undefined) parts.push(`as true on ${String(x["validAt"]).slice(0, 10)}`);
  return parts.length ? ", " + parts.join(", ") : "";
};

const templates: Record<string, (i: Record<string, unknown>) => string> = {
  database_summary: () => "How big is the database and where is its head?",
  list_accounts: () => "List the accounts.",
  find_subjects: (i) =>
    `Show ${i["count"] ?? 10} subjects of ${i["account"]} starting at number ${i["from"] ?? 0}.`,
  read_subject: (i) =>
    i["root"]
      ? `Read everything about the subject rooted at ${i["root"]}${basisWords(i["basis"])}.`
      : `Read everything about ${subj(i)}${i["attribute"] ? `, only ${i["attribute"]}` : ""}${basisWords(i["basis"])}.`,
  read_many_subjects: (i) =>
    `Read subjects ${(i["subjects"] as number[] | undefined)?.join(", ")} of ${i["account"]} at one position.`,
  read_subject_at: (i) =>
    `What did we believe about ${subj(i)} on ${String(i["at"]).slice(0, 10)}${i["attribute"] ? ` for ${i["attribute"]}` : ""}${i["position"] !== undefined ? ` as recorded at position ${i["position"]}` : ""}, and what do we know now?`,
  field_history: (i) =>
    `Show the full history of ${i["attribute"]} on ${i["entity"] ?? `${subj(i)}'s ${i["kind"] ?? "task"}`}.`,
  save_facts: (i) =>
    `On ${i["entity"] ?? `${subj(i)}'s ${i["kind"] ?? "task"}`}, set ${Object.entries(
      (i["changes"] as Record<string, string>) ?? {},
    )
      .map(([a, v]) => `${a} to ${v}`)
      .join(" and ")} from now on.`,
  correct_past_value: (i) =>
    `We learned ${i["attribute"]} on ${i["entity"] ?? `${subj(i)}'s ${i["kind"] ?? "task"}`} was ${i["value"]} from ${String(i["validFrom"]).slice(0, 10)}. Record that.`,
  retire_fact: (i) =>
    `Retire ${i["attribute"]} on ${i["entity"] ?? `${subj(i)}'s ${i["kind"] ?? "task"}`}.`,
  change_feed: (i) =>
    i["summary"]
      ? `Who changed since position ${Number(i["after"] ?? 0).toLocaleString("en-US")}?`
      : `Show the journal${i["after"] !== undefined ? ` after position ${Number(i["after"]).toLocaleString("en-US")}` : ""}${i["account"] ? ` for ${i["account"]}` : ""}${i["entity"] ? ` for ${i["entity"]}` : ""}.`,
  remove_on_request: (i) => `Remove ${subj(i)}'s protected values.`,
  list_entity_types: () => "What entity types are there?",
  describe_entity_type: (i) => `Describe the ${i["name"]} type.`,
  define_entity_type: (i) =>
    `Define an entity type called ${i["name"]} with ${(
      (i["attributes"] as { key: string; valueType: string; required?: boolean }[]) ?? []
    )
      .map((a) => `${a.key} (${a.valueType}${a.required ? ", required" : ""})`)
      .join(", ")}.`,
  list_releases: () => "Show the configuration releases and where live points.",
  move_live: (i) => `Move live to release ${String(i["snapshotId"]).slice(0, 16)}.`,
  list_entities: (i) => `List the ${i["type"]} entities in ${i["account"]}.`,
  read_entity: (i) =>
    `Read ${i["entity"]}${i["asSubject"] ? " as a subject" : ""}${basisWords(i["basis"])}.`,
  create_entity: (i) =>
    `Add a ${i["type"]} in ${i["account"]} with ${Object.entries(
      (i["attributes"] as Record<string, unknown>) ?? {},
    )
      .map(([a, v]) => `${a} ${Array.isArray(v) ? v.join(", ") : String(v)}`)
      .join(", ")}.`,
  query: () => "Answer this Triplex Datalog question.",
  evaluate_derivation: (i) =>
    `Evaluate the derivation ${(i["derivation"] as { name?: string })?.name ?? ""} for this subject.`,
  // [DX-XQ8] Questions across subjects.
  list_kinds: (i) => `What kinds of entity does ${i["account"]} hold, and how many of each?`,
  describe_kind: (i) => `What attributes do the ${i["prefix"]} entities of ${i["account"]} have?`,
  list_ids: (i) =>
    i["result"] === "count"
      ? `How many ${i["prefix"] || "IDs"} does ${i["account"]} have${basisWords(i["basis"])}?`
      : `List the ${i["prefix"] || ""} IDs of ${i["account"]}${basisWords(i["basis"])}.`,
  ask_across_subjects: (i) => {
    const kind = (i["kind"] as { prefix?: string })?.prefix ?? "";
    const where = (i["where"] as { attribute: string; op: string; value?: unknown; values?: unknown[]; from?: unknown; to?: unknown }[]) ?? [];
    const words = where
      .map((c) =>
        c.op === "eq" ? `${c.attribute} is ${String(c.value)}`
        : c.op === "in" ? `${c.attribute} is one of ${(c.values ?? []).map(String).join(", ")}`
        : c.op === "range" ? `${c.attribute} is between ${c.from ?? "any"} and ${c.to ?? "any"}`
        : c.op === "prefix" ? `${c.attribute} starts with ${String(c.value)}`
        : c.op === "exists" ? `${c.attribute} has a value`
        : `${c.attribute} has no value`)
      .join(" and ");
    const what = i["result"] === "count" ? "How many" : i["result"] === "countByValue" ? `Count per ${i["of"]} the` : "Which";
    return `${what} ${kind} entities in ${i["account"]}${words ? ` where ${words}` : ""}${basisWords(i["basis"])}?`;
  },
};

export function sentenceFor(call: ToolCall, fallback?: string) {
  const t = templates[call.name];
  try {
    if (t) return t(call.input);
  } catch {
    /* fall through */
  }
  return fallback ?? `Run ${call.name} with these inputs.`;
}
