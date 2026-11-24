// [DX-CON1] Number and time formatting. Positions and counts are whole numbers with thousands separators; times keep
// two decimals as the tools report them. Nothing here invents a number.
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const two = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const n = (value: number | string | null | undefined) =>
  value === null || value === undefined || value === ""
    ? ""
    : typeof value === "string" && !/^-?\d+$/.test(value)
      ? value
      : whole.format(Number(value));
export const ms = (value: number | null | undefined) =>
  value === null || value === undefined ? "n/a" : `${two.format(value)} ms`;

/** "2027-11-25 10:31:02" in UTC: record time is the store's clock, shown as the store wrote it. */
export function time(iso: string | number | null | undefined, withSeconds = true) {
  if (iso === null || iso === undefined || iso === "") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const s = d.toISOString().replace("T", " ");
  return withSeconds ? s.slice(0, 19) : s.slice(0, 16);
}
export function day(iso: string | number | null | undefined) {
  if (iso === null || iso === undefined || iso === "") return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toISOString().slice(0, 10);
}
export const plural = (count: number, one: string, many = one + "s") =>
  `${n(count)} ${count === 1 ? one : many}`;

/** Short form of an entity ID: drop the account namespace when it is given. */
export function shortId(id: string, namespace?: string) {
  if (namespace && id.startsWith(namespace)) return id.slice(namespace.length);
  return id.replace(/^acct\/account-\d+\//, "");
}

/** The kind of a loader-built entity, read from its ID (loader facts carry no entity type). */
export function kindOf(id: string): string {
  const local = id.replace(/^acct\/[^/]+\//, "");
  if (/^pl:\d+$/.test(local)) return "root";
  if (/^pl:\d+:p\d+$/.test(local)) return "placement";
  const prefix = local.split(":")[0] ?? "";
  return (
    (
      {
        wk: "profile",
        i9: "task",
        sec: "subtask",
        doc: "file",
        page: "page",
        directory: "directory",
      } as Record<string, string>
    )[prefix] ?? (prefix.includes("/") ? "entity" : prefix || "entity")
  );
}

/** Parse a loader-built entity ID into its account and subject number. */
export function parseLoaderId(
  id: string,
): { account: string; subject: number; local: string } | null {
  const m = /^acct\/(account-\d+)\/(?:pl|wk|i9|sec|doc|page):(\d{8})/.exec(id);
  return m
    ? { account: m[1]!, subject: Number(m[2]), local: id.slice(`acct/${m[1]}/`.length) }
    : null;
}

export const json = (value: unknown) =>
  JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);

/** Record time to the millisecond, so commits in the same second still show their order. */
export function timeMs(iso: string | number | null | undefined) {
  if (iso === null || iso === undefined || iso === "") return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toISOString().replace("T", " ").slice(0, 23);
}
