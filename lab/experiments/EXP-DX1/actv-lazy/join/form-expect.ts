import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { W0 } from "../../../../bench/lib/w0-world.ts";

// [DX-ACT4] Why: the synthetic forms and policies were added to the TypeScript kernel and the Python oracle in one change
// by one author, so their agreement does not show either is right. This is a third statement of the rule, written from
// its text in large-release.ts (policy k makes a subject owe form k when the first eight hex digits of SHA-256 of the
// subject, mod 1000, are below the permille; due at the end of the start date plus the form's business days, Monday to
// Friday; one notice work item per policy with notice set) and SPEC 8.2/8.3 (overdue at or after the due instant; a due
// obligation while before it). It uses neither implementation: its own hash, its own calendar walk, its own key and value
// shapes. It checks the stored changed values and recorded notices of a release that only adds forms and policies to a
// document that had none, so every change and every notice of that release must be one it predicts, and nothing else.
// Rejected: a third full implementation of W0 (the eleven base rules are already checked against the oracle).
export type Expected = { changes: Map<string, string | null>; deliveries: Map<string, unknown> };

const bucket = (subject: string) =>
  parseInt(createHash("sha256").update(subject).digest("hex").slice(0, 8), 16) % 1000;
function dueAt(startDate: string, businessDays: number) {
  assert(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(startDate), "start date " + startDate);
  const day = new Date(startDate + "T00:00:00Z");
  for (let counted = 0; counted < businessDays; ) {
    day.setUTCDate(day.getUTCDate() + 1);
    const weekday = day.getUTCDay();
    if (weekday >= 1 && weekday <= 5) counted++;
  }
  day.setUTCDate(day.getUTCDate() + 1); // due by the end of that day: the next midnight
  return day.toISOString().slice(0, 10) + "T00:00:00.000000Z";
}
const instant = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{6}Z$/;

/** What a release that adds `doc.forms` and `doc.policies` to a form-free predecessor changes for one subject. */
export function expectForms(world: W0.World, doc: W0.ReleaseDoc, validTime: string): Expected {
  assert(instant.test(validTime));
  const S = world.subject,
    changes = new Map<string, string | null>(),
    deliveries = new Map<string, unknown>();
  const starts = world.facts.filter((f) => f.e === S && f.a === "startDate");
  assert(starts.length <= 1, "one start date at the basis");
  if (!starts.length) return { changes, deliveries };
  const start = String(starts[0]!.v);
  const forms = new Map((doc.forms ?? []).map((f) => [f.id, f]));
  for (const p of doc.policies ?? []) {
    if (bucket(S) >= p.permille) continue;
    const form = forms.get(p.form)!,
      due = dueAt(start, form.dueBusinessDays),
      overdue = validTime >= due,
      task = S + "#form.owed#" + p.form;
    changes.set(
      "tasks " + task,
      JSON.stringify({ dueAt: due, id: task, kind: "form.owed", overdue, rule: p.id }),
    );
    if (!overdue)
      changes.set(
        "obligations " + task + "@due",
        JSON.stringify({ boundary: due, id: task + "@due", kind: "due", rule: p.id }),
      );
    if (p.notice) {
      const payload = { dueAt: due, form: p.form };
      changes.set(
        "work " + p.id + " " + p.form,
        JSON.stringify({ key: p.form, kind: "notify.form-owed", payload, rule: p.id }),
      );
      deliveries.set(p.id + " " + p.form, payload);
    }
  }
  return { changes, deliveries };
}

/** Compares one subject's stored changes and recorded notices with the prediction; returns the counts checked. */
export function checkForms(
  expected: Expected,
  subject: string,
  changes: readonly [string, string | null][],
  deliveries: readonly { subject: string; key: string; kind: string; rule: string; payload: unknown }[],
  onlyAdded = false,
) {
  // onlyAdded: the predecessor differs in more than the forms (for example a first release from nothing); only the
  // changes of the added policies and the form notices are compared, and the rest is left to the oracle.
  const seen = new Map<string, string | null>();
  for (const [k, v] of changes) {
    const key = JSON.parse(k) as string[];
    assert.equal(key[0], subject, "change of another subject");
    const [, rule, , kind, id] = key;
    if (onlyAdded && !rule?.startsWith("pol:")) continue;
    assert(rule?.startsWith("pol:"), "a change outside the added policies: " + k);
    const name = kind === "work" ? "work " + rule + " " + key[2] : kind + " " + id;
    assert(!seen.has(name), "duplicate change " + name);
    // Values are compared as parsed JSON: the stored text is canonical JSON, the prediction plain JSON.stringify.
    seen.set(name, v === null ? null : JSON.stringify(sortKeys(JSON.parse(v))));
  }
  const want = new Map([...expected.changes].map(([k, v]) => [k, v === null ? null : JSON.stringify(sortKeys(JSON.parse(v)))]));
  assert.deepEqual(
    new Map([...seen].sort()),
    new Map([...want].sort()),
    "changed values differ from the rule for " + subject,
  );
  const got = new Map<string, unknown>();
  for (const d of deliveries) {
    assert.equal(d.subject, subject);
    if (onlyAdded && d.kind !== "notify.form-owed") continue;
    assert.equal(d.kind, "notify.form-owed", "a notice outside the added policies");
    const name = d.rule + " " + d.key;
    assert(!got.has(name), "duplicate notice " + name);
    got.set(name, typeof d.payload === "string" ? JSON.parse(d.payload) : d.payload);
  }
  assert.deepEqual(new Map([...got].sort()), new Map([...expected.deliveries].sort()), "notices differ for " + subject);
  return { changes: seen.size, notices: got.size };
}
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object")
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]));
  return v;
}
