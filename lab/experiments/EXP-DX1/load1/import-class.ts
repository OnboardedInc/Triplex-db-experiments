import { DatomicClient } from "../../../../packages/datomic/dist/index.js";

// [DX-IMP2] Why: with the gateway's whole-subject import bound on (TX2_IMPORT_WHOLE_SUBJECT=1), the snapshot
// importer's frames must be import-class commits so the bound applies; through the SDK composition they carry a
// command claim and no write class, so the gateway would count them as live saves, unbounded.
// Rejected: a client-wide write class on the composition (it would also class the process's live saves as import).
export const importWholeSubject = () => process.env["TX2_IMPORT_WHOLE_SUBJECT"] === "1";
const snapshotCommand = (id: unknown) => typeof id === "string" && id.startsWith("load1/");

type Wire = { claims: readonly { commandId: string }[]; writeClass?: string };
export function importClassFor<T extends Wire>(input: T): T {
  if (!importWholeSubject() || input.writeClass !== undefined || input.claims.length !== 1) return input;
  if (!snapshotCommand(input.claims[0]!.commandId)) return input;
  return { ...input, writeClass: "import" };
}

// Each import entry point installs it (file-proof, split-import, live). The toy fixture's pinned seed loader
// (age1/scale1-fixture.mjs) does not: it is set-up, not an import under test, and its frames of 16 deep subjects
// (about 1,900 facts) are about three times the bound, so with the class they are refused whole, as they must be.
let installed = false;
export function installSnapshotImportClass() {
  if (installed || !importWholeSubject()) return;
  installed = true;
  const original = DatomicClient.prototype.transact;
  DatomicClient.prototype.transact = function (db, input, onSent) {
    return original.call(this, db, importClassFor(input), onSent);
  };
}

/** A frame of whole subjects that the gateway refused whole because it exceeds the import bound. Never split. */
export class ImportFrameTooLarge extends Error {
  readonly first: number;
  readonly end: number;
  readonly facts: number;
  readonly limitUs: number | undefined;
  constructor(first: number, end: number, facts: number, limitUs: number | undefined) {
    super(
      `Import frame of subjects ${first} to ${end - 1} (${facts} facts) exceeds the import bound` +
        (limitUs === undefined ? "" : ` of ${limitUs} us`) +
        (end - first === 1 ? "; the subject is refused, never split" : "; frame fewer subjects"),
    );
    this.first = first;
    this.end = end;
    this.facts = facts;
    this.limitUs = limitUs;
  }
}

/** The gateway's ImportCommitTooLarge refusal anywhere in a failed result's causes, with its limit. */
export function importRefusal(x: unknown, depth = 0): { maximum?: number } | undefined {
  if (!x || typeof x !== "object" || depth > 6) return;
  const o = x as Record<string, unknown>;
  if (o["code"] === "ImportCommitTooLarge")
    return typeof o["maximum"] === "number" ? { maximum: o["maximum"] } : {};
  for (const key of ["cause", "error", "value", "failure", "errors"]) {
    const found = importRefusal(o[key], depth + 1);
    if (found) return found;
  }
  if (Array.isArray(x)) for (const item of x) { const f = importRefusal(item, depth + 1); if (f) return f; }
}
