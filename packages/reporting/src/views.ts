// [DX-RPT1] One generated view per kind in schema `report`: one row per entity with at least one visible fact, one
// column per (attribute, value type), each a scalar subquery on rpt.facts so PostgreSQL evaluates only the columns a
// query names. Exact at rpt.at_position() and rpt.at_valid(). A new column only ever goes at the end, so
// CREATE OR REPLACE VIEW changes metadata only and never rewrites a table under a reporting query.
// Rejected: materialised wide tables (a value valid until a date goes stale with no save; ALTER TABLE plus backfill per
// attribute); erroring on several visible values (the store allows them; the narrow view keeps all of them).

export const MAX_COLUMNS = 1000;
const RESERVED = new Set(["entity", "account"]);

export const quoteIdent = (name: string) => `"${name.replaceAll('"', '""')}"`;
export const quoteLiteral = (text: string) => `'${text.replaceAll("'", "''")}'`;

/** A lower-case SQL name from a store name: ":task/status" -> "status", "Subject" -> "subject". */
export function snake(name: string): string {
  const local = name.includes("/") ? name.slice(name.lastIndexOf("/") + 1) : name.replace(/^:/, "");
  let out = local
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (out === "") out = "value";
  if (/^[0-9]/.test(out)) out = `a_${out}`;
  return out.slice(0, 50);
}
/** The namespace-qualified fallback when two attributes of one kind share a local name. */
export function qualified(attribute: string): string {
  const parts = attribute.replace(/^:/, "").split("/");
  return snake(parts.join("_").replaceAll(".", "_")).slice(0, 50);
}

/** Picks a column name not yet used in the kind. Deterministic given the order columns are added. */
export function columnName(attribute: string, valueType: string, used: ReadonlySet<string>, sameAttribute: boolean) {
  let base = snake(attribute);
  if (RESERVED.has(base)) base = `${base}_value`;
  if (sameAttribute) base = `${base}__${valueType}`;
  else if (used.has(base)) base = qualified(attribute);
  let name = base;
  for (let i = 2; used.has(name); i++) name = `${base}_${i}`;
  return name;
}

const typed = (valueType: string): string => {
  switch (valueType) {
    case "string":
    case "ref":
    case "blob":
      return "f.value_string";
    case "integer":
      return "f.value_string::numeric";
    case "number":
      return "f.value_number";
    case "boolean":
      return "f.value_boolean";
    case "datetime":
      return "to_timestamp(f.value_datetime / 1000.0)";
    case "json":
      return "f.value_json";
    default:
      throw new TypeError(`Unknown value type ${valueType}`);
  }
};

const visible = (alias: string) =>
  `${alias}.recorded_position <= b.p AND (${alias}.retracted_position IS NULL OR ${alias}.retracted_position > b.p) ` +
  `AND ${alias}.valid_from <= b.v AND (${alias}.valid_to IS NULL OR ${alias}.valid_to > b.v)`;

export interface ColumnSpec {
  readonly attribute: string;
  readonly valueType: string;
  readonly columnName: string;
}

export function viewSql(kind: string, viewName: string, columns: readonly ColumnSpec[]): string[] {
  const select = columns.map((c) => {
    if (c.valueType === "protected") return `NULL::text AS ${quoteIdent(c.columnName)}`;
    return (
      `(SELECT ${typed(c.valueType)} FROM rpt.facts f WHERE f.account = e.account AND f.entity = e.entity ` +
      `AND f.attribute = ${quoteLiteral(c.attribute)} AND f.value_type = ${quoteLiteral(c.valueType)} AND ${visible("f")} ` +
      `ORDER BY f.recorded_position DESC, f.assertion_id COLLATE "C" DESC LIMIT 1) AS ${quoteIdent(c.columnName)}`
    );
  });
  const view = `report.${quoteIdent(viewName)}`;
  return [
    `CREATE OR REPLACE VIEW ${view} WITH (security_invoker = true) AS SELECT e.entity, e.account` +
      select.map((s) => `,\n  ${s}`).join("") +
      `\nFROM rpt.entities e CROSS JOIN (SELECT rpt.at_position() AS p, rpt.at_valid() AS v OFFSET 0) b` +
      `\nWHERE e.kind = ${quoteLiteral(kind)} AND EXISTS (SELECT 1 FROM rpt.facts g WHERE g.account = e.account ` +
      `AND g.entity = e.entity AND ${visible("g")})`,
    `GRANT SELECT ON ${view} TO rpt_reader`,
    `COMMENT ON VIEW ${view} IS ${quoteLiteral(`Entities of kind ${kind}, one column per attribute, at rpt.at_position() and rpt.at_valid()`)}`,
    ...columns.map(
      (c) =>
        `COMMENT ON COLUMN ${view}.${quoteIdent(c.columnName)} IS ${quoteLiteral(
          c.valueType === "protected" ? `${c.attribute}: protected, not copied` : `${c.attribute} (${c.valueType})`,
        )}`,
    ),
  ];
}
