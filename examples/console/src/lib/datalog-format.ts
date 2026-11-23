// [DX-CON1] Format Datalog JSON the way it is read: each pattern on one line, nested clauses indented.
const scalar = (v: unknown) => v === null || typeof v !== "object";
const flat = (v: unknown): boolean => scalar(v) || (Array.isArray(v) && v.every(scalar));

export function formatDatalog(value: unknown, indent = ""): string {
  const next = indent + "  ";
  if (scalar(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (flat(value)) return "[" + value.map((x) => JSON.stringify(x)).join(", ") + "]";
    const oneLine = "[" + value.map((x) => formatDatalog(x, next)).join(", ") + "]";
    if (oneLine.length <= 72 && !oneLine.includes("\n")) return oneLine;
    return (
      "[\n" + value.map((x) => next + formatDatalog(x, next)).join(",\n") + "\n" + indent + "]"
    );
  }
  const entries = Object.entries(value as Record<string, unknown>);
  const oneLine =
    "{ " +
    entries.map(([k, v]) => `${JSON.stringify(k)}: ${formatDatalog(v, next)}`).join(", ") +
    " }";
  if (indent && oneLine.length <= 72 && !oneLine.includes("\n")) return oneLine;
  return (
    "{\n" +
    entries.map(([k, v]) => `${next}${JSON.stringify(k)}: ${formatDatalog(v, next)}`).join(",\n") +
    "\n" +
    indent +
    "}"
  );
}
