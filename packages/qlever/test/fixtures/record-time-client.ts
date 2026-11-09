// [EXP-RT01] Why: reuse review fdbcbb7's emitted-SPARQL transport to test actual read paths. Rejected: returning RQ01 reference answers from a fake route.
import { decodeRow, metaIri, numericOrderKey } from "../../src/rdf.js";
const lit = (value: string) => ({ type: "literal" as const, value });
export function makeRecordTimeClient() {
  const records = new Map<string, Map<string, string>>();
  const calls: string[] = [];
  let lost = false;
  const client: any = {
    query: async (query: string) => {
      calls.push(query);
      const meta = records.get(metaIri);
      if (query.startsWith("SELECT ?position"))
        return meta
          ? [{ position: lit(meta.get("position")!), stamp: lit(meta.get("stamp")!) }]
          : [];
      const op = /(<urn:triplex:operation:[^>]+>)/.exec(query)?.[1];
      if (op) {
        const r = records.get(op);
        return r
          ? [
              {
                attempt: lit(r.get("attempt_id")!),
                position: lit(r.get("position")!),
                stamp: lit(r.get("stamp")!),
              },
            ]
          : [];
      }
      if (query.includes("SELECT ?tx WHERE")) {
        const claim = /(<urn:triplex:claim:[^>]+>)/.exec(query)?.[1];
        const record = claim ? records.get(claim) : undefined;
        return record ? [{ tx: lit(record.get("tx_id")!) }] : [];
      }
      if (!query.startsWith("SELECT ?row"))
        throw new Error("Unsupported verifier transport SPARQL: " + query);
      let rows = [...records.entries()].filter(([, r]) => r.has("_row"));
      const subject = /VALUES \?subject \{ (<[^>]+>) \}/.exec(query)?.[1];
      if (subject) rows = rows.filter(([s]) => s === subject);
      for (const m of query.matchAll(
        /\?subject <urn:triplex:field:(entity_id|attribute|entity_type|value_type|value_string)> ("(?:[^"\\]|\\.)*") \./g,
      ))
        rows = rows.filter(([, r]) => r.get(m[1]!) === JSON.parse(m[2]!));
      const decoded = rows.map(([, r]) => decodeRow(r.get("_row")!));
      const bound = (v: string) => new RegExp("\\?" + v + ' <= "([0-9a-f]+)"').exec(query)?.[1];
      const p = bound("recordedOrder"),
        t = bound("recordedTime"),
        v = bound("validFrom");
      const result = decoded.filter(
        (r) =>
          (!p || numericOrderKey(r.recorded_position) <= p) &&
          (!t || numericOrderKey(r.recorded_at) <= t) &&
          (!query.includes("!BOUND(?retractedTime)") ||
            r.retracted_at === null ||
            (p !== undefined && numericOrderKey(r.retracted_position!) > p) ||
            (t !== undefined && numericOrderKey(r.retracted_at) > t)) &&
          (!v ||
            (numericOrderKey(r.valid_from) <= v &&
              (r.valid_to === null || numericOrderKey(r.valid_to) > v))),
      );
      return result.map((r) => ({ row: lit(JSON.stringify(r)) }));
    },
    update: async (update: string) => {
      calls.push(update);
      const meta = records.get(metaIri);
      const guard = update.split("VALUES (?s ?p ?new)")[0]!;
      // [CX-VRT01] Why: apply the emitted complete-cut CAS before any tuple. Rejected: an always-success update stub (cannot reproduce competing decisions).
      if (meta) {
        if (
          !guard.includes(
            `${metaIri} <urn:triplex:field:position> "${meta.get("position")}" ; <urn:triplex:field:stamp> "${meta.get("stamp")}"`,
          )
        )
          return;
      } else if (!guard.includes("FILTER NOT EXISTS")) throw new Error("Missing initial guard");
      for (const m of update.matchAll(
        /\((<urn:triplex:[^>]+>) <urn:triplex:field:([^>]+)> ("(?:[^"\\]|\\.)*")\)/g,
      )) {
        const r = records.get(m[1]!) ?? new Map();
        r.set(m[2]!, JSON.parse(m[3]!));
        records.set(m[1]!, r);
      }
      if (lost) {
        lost = false;
        throw new Error("verifier lost ACK");
      }
    },
    command: async () => {},
    cancel: async () => {},
    close: async () => {},
  };
  return {
    client,
    records,
    calls,
    lose: () => {
      lost = true;
    },
  };
}
