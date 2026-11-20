import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync, gunzipSync } from "node:zlib";

export type Edit = { validAt: number; changes: Record<string, string> };
export type Person = { id: string; name: string; edits: Edit[] };
export type Account = { id: string; name: string; shape: "deep" | "wide" | "small"; people: Person[] };
export type Fixture = ReturnType<typeof generate>;
const blob = new URL("./people.json.gz", import.meta.url);
const sums = new URL("./SHA256SUMS", import.meta.url);
const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

export const attrs = {
  name: ":person/name",
  account: ":person/account",
  role: ":person/role",
  status: ":person/status",
  note: ":person/note",
  protected: ":person/protected-code",
  release: ":playground/release",
  answer: ":playground/release-answer",
} as const;
export const editable = [attrs.role, attrs.status, attrs.note] as const;

export function expected(person: Person, validAt: number): Record<string, string> {
  return Object.assign({}, ...person.edits.filter((edit) => edit.validAt <= validAt).map((edit) => edit.changes));
}

export function generate(larger = false) {
  const seed = 0x51ac09;
  let state = seed;
  // [DX-PLAY1] Why: fixed integer arithmetic and invented tokens make every input reproducible.
  // Rejected: local clock, Math.random or a corpus of names.
  const token = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0).toString(36).padStart(7, "0");
  };
  const months = [1, 2, 3, 4].map((m) => Date.UTC(2040, m - 1, 12));
  const earlyAt = months[0]!;
  const currentAt = months[3]!;
  const shapes = ["deep", "wide", "small", "small", "small"] as const;
  const counts = larger ? [96, 1400, 20, 24, 30] : [16, 160, 4, 5, 7];
  const accounts: Account[] = shapes.map((shape, i) => {
    const id = `${shape}-${i + 1}`;
    const people: Person[] = Array.from({ length: counts[i]! }, (_, n) => {
      const personId = `person:${id}:${String(n + 1).padStart(4, "0")}`;
      const name = "Vexari " + token().toUpperCase();
      const changes: Record<string, string> = {
        [attrs.name]: name,
        [attrs.account]: id,
        [attrs.role]: "Crew-" + token(),
        [attrs.status]: n % 3 ? "Active" : "Review",
        [attrs.note]: "Log-" + token(),
        ...(shape === "wide" ? {} : { [attrs.protected]: "Code-" + token() }),
      };
      if (shape === "deep") {
        for (let a = 1; a <= 154; a++) changes[`:profile/field-${String(a).padStart(3, "0")}`] = "Datum-" + token();
      }
      const edits = [{ validAt: earlyAt, changes }];
      if (shape !== "wide" || n % 8 === 0) {
        for (const [m, validAt] of months.slice(1).entries()) {
          const update: Record<string, string> = {
            [attrs.note]: "Log-" + token(),
            [attrs.status]: (m + n) % 2 ? "Active" : "Review",
          };
          if (shape !== "wide") update[attrs.role] = "Crew-" + token();
          if (shape === "deep") update[":profile/field-001"] = "Datum-" + token();
          edits.push({ validAt, changes: update });
        }
      }
      return { id: personId, name, edits };
    });
    return { id, name: "Quorvex " + String(i + 1).padStart(2, "0"), shape, people };
  });
  return {
    version: 1, seed, earlyAt, currentAt, accounts,
    release: { label: "Circuit 1", reviewStatus: "Review" },
  };
}

export function fixtureBytes(fixture: Fixture) {
  return gzipSync(JSON.stringify(fixture) + "\n", { level: 9 });
}

export function loadFixture(larger = false) {
  if (larger) {
    const fixture = generate(true);
    return { fixture, checksum: sha256(fixtureBytes(fixture)) };
  }
  const bytes = readFileSync(blob);
  const checksum = sha256(bytes);
  if (checksum !== readFileSync(sums, "utf8").split(/\s/)[0] || bytes.length > 25_000_000)
    throw new Error("Playground fixture checksum or size mismatch");
  return { fixture: JSON.parse(gunzipSync(bytes).toString("utf8")) as Fixture, checksum };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [option, output, ...rest] = process.argv.slice(2);
  if (rest.length || (option !== undefined && (option !== "--larger" || !output)))
    throw new Error("Usage: node examples/playground/fixture.ts [--larger OUTPUT.json.gz]");
  const bytes = fixtureBytes(generate(option === "--larger"));
  if (output) {
    writeFileSync(output, bytes, { flag: "wx" });
    console.log(`${sha256(bytes)}  ${output}`);
  } else {
    writeFileSync(blob, bytes);
    writeFileSync(sums, `${sha256(bytes)}  people.json.gz\n`);
  }
}
