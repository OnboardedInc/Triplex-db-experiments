import assert from "node:assert/strict";
import { W0 } from "../../../../bench/lib/w0-world.ts";

// [DX-ACT3] Why: the owner asked what a release of many new forms and policies costs. W0's eleven rules cannot express
// one, so the kernel and the independent oracle both gained optional synthetic forms and policies; this file makes a
// deterministic release of a given shape from one of the W0 documents.
// Rejected: padding the document with unread bytes (it would price the record but not the reads or the background work).
export type ReleaseShape = { forms: number; policies: number; permille: number; fields: number };

/** Parses "forms=20,policies=20,permille=1000[,fields=12]". */
export function parseShape(text: string): ReleaseShape {
  const parts = Object.fromEntries(
    text.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      assert(k && v && /^[0-9]+$/.test(v), "Release shape is forms=N,policies=N,permille=N[,fields=N]");
      return [k, Number(v)];
    }),
  );
  assert(Object.keys(parts).every((k) => ["forms", "policies", "permille", "fields"].includes(k)));
  const shape = {
    forms: parts.forms ?? 0,
    policies: parts.policies ?? 0,
    permille: parts.permille ?? 1000,
    fields: parts.fields ?? 12,
  };
  assert(shape.forms >= 1 && shape.forms <= 512 && shape.policies >= 0 && shape.policies <= shape.forms);
  assert(shape.permille >= 0 && shape.permille <= 1000 && shape.fields >= 1 && shape.fields <= 64);
  return shape;
}
export const shapeName = (s: ReleaseShape) =>
  "f" + s.forms + "-p" + s.policies + "-m" + s.permille + "-x" + s.fields;

const pad = (n: number) => String(n).padStart(3, "0");
/**
 * The base document plus `forms` forms and `policies` policies; policy k makes a subject owe form k and sends a notice
 * when the subject's bucket is below `permille`. Buckets depend on the subject only, so `permille` is the share of
 * subjects affected and each affected subject owes all `policies` forms.
 */
export function largeRelease(base: W0.ReleaseDoc, shape: ReleaseShape): W0.ReleaseDoc {
  assert(!base.forms && !base.policies);
  const forms = Array.from({ length: shape.forms }, (_, k) => ({
    dueBusinessDays: 1 + (k % 10),
    fields: Array.from({ length: shape.fields }, (_, j) => "field-" + pad(j + 1)),
    id: "form:f" + pad(k + 1),
  }));
  const policies = Array.from({ length: shape.policies }, (_, k) => ({
    form: "form:f" + pad(k + 1),
    id: "pol:p" + pad(k + 1),
    notice: true,
    permille: shape.permille,
  }));
  const doc: W0.ReleaseDoc = { ...structuredClone(base), forms, policies };
  W0.compileRelease(doc);
  return doc;
}
