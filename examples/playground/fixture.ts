import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync, gunzipSync } from "node:zlib";
import {
  accountSeed,
  catalogs,
  ownedSubjects,
  personId,
  personName,
  profiles,
  seed,
  token,
  type Profile,
  type Subject,
} from "./model.ts";

export type Edit = { validAt: number; changes: Record<string, string> };
export type Person = { id: string; name: string; edits: Edit[]; owned: Subject[] };
export type Account = Profile & { people: Person[]; catalog: Subject[] };
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
const dayMs = 24 * 60 * 60 * 1000;
export const earlyAt = Date.UTC(2020, 0, 6);
export const currentAt = earlyAt + 36 * dayMs;

export function expected(person: Person, validAt: number): Record<string, string> {
  return Object.assign(
    {},
    ...person.edits.filter((edit) => edit.validAt <= validAt).map((edit) => edit.changes),
  );
}

export function personAt(account: Profile, n: number, smallHistory = false): Person {
  const key = accountSeed(account) + n;
  const id = personId(account, n);
  const name = personName(account, n);
  const changes: Record<string, string> = {
    [attrs.name]: name,
    [attrs.account]: account.id,
    [attrs.note]: "Log-" + token(key + 2),
    [attrs.status]: n % 3 ? "Active" : "Review",
    ...(account.shape === "wide"
      ? {}
      : {
          [attrs.role]: "Crew-" + token(key + 3),
          [attrs.protected]: "SYNTHETIC-PRIVATE-" + token(key + 4),
          ":person/first-name": "Vexari",
          ":person/last-name": token(key).toUpperCase(),
        }),
  };
  const edits = [{ validAt: earlyAt, changes }];
  if (smallHistory && (account.shape !== "wide" || n % 8 === 0)) {
    for (let d = 1; d <= 35; d++) {
      if (d !== 35 && (d + n) % 7 !== 0) continue;
      edits.push({
        validAt: earlyAt + d * dayMs,
        changes: {
          [attrs.note]: "Log-" + token(key + d * 128),
          ...(d === 35 ? { [attrs.status]: n % 3 ? "Review" : "Active" } : {}),
        },
      });
    }
  }
  return { id, name, edits, owned: [...ownedSubjects(account, n)] };
}

export function generate(larger = false) {
  return {
    version: 2,
    seed,
    earlyAt,
    currentAt,
    accounts: profiles(false, larger).map(
      (a): Account => ({
        ...a,
        catalog: [...catalogs(a)],
        people: Array.from({ length: a.count }, (_, i) => personAt(a, i, true)),
      }),
    ),
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
