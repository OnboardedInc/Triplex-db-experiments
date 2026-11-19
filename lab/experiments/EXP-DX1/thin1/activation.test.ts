import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { W0 } from "../../../bench/lib/w0-world.ts";
import {
  ThinRoster,
  rosterDigest,
  type ImportJournal,
} from "../../../bench/lib/thin-activation.ts";
import { fixtureRows, intent, person } from "./population.ts";

const files: string[] = [];
afterEach(() => {
  for (const file of files.splice(0)) fs.rmSync(file, { recursive: true, force: true });
});
const subject = person(0),
  binding = "slot/source/scope-A";
const make = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "thin-roster-"));
  files.push(dir);
  const file = path.join(dir, "roster.db");
  return { file, roster: new ThinRoster(file, binding) };
};
const tx = (p: number, updated = false): ImportJournal => ({
  position: p,
  txId: "id-" + p,
  instant: p,
  changes: fixtureRows(0, p, updated).map((r) => ({ ...r, tripleId: r.id })),
});
const options = (at: number) => ({
  binding,
  mode: "dependencies" as const,
  expected: rosterDigest([subject]),
  release: W0.R2,
  basis: { tx: at, validTime: W0.POPULATION_VALID_TIME },
  world: async () => {
    throw Error("Unexpected full read");
  },
  publish: async (records: readonly W0.EvaluationRecord[]) => {
    expect(records[0]!.subject).toBe(subject);
  },
});
describe("pinned import certificates", () => {
  it("matches the complete independent output of all eligible releases for answer-only projections", () => {
    const basis = { tx: 9, validTime: W0.POPULATION_VALID_TIME };
    const releases = [W0.R1, W0.R2, W0.R3];
    const oracle = fileURLToPath(new URL("../../../bench/lib/w0-oracle-batch.py", import.meta.url));
    const facts = intent(0).map((op) => ({
      e: op.entityId,
      a: op.attribute,
      v: op.value.value,
      tx: 1,
    }));
    for (const rows of [[], facts.slice(0, 1), facts]) {
      const input = {
        op: "evaluate-many",
        input: {
          world: { subject, facts: rows },
          requests: releases.map((release) => ({ release: release.name, basis })),
        },
      };
      const expected = JSON.parse(
        execFileSync("python3", ["-I", "-B", oracle], {
          encoding: "utf8",
          input: JSON.stringify(input) + "\n",
        }),
      );
      expect(expected).toHaveLength(releases.length);
      for (const [i, release] of releases.entries()) {
        const projected = W0.sweepSubject({ subject, facts: [] }, release, basis);
        if ("error" in projected) throw Error(projected.error);
        expect(projected.json).toEqual(expected[i]);
      }
    }
  });
  it("fully evaluates an unfamiliar release even when the imported subject is certified", async () => {
    const { roster } = make();
    try {
      roster.apply(binding, tx(1));
      const doc = structuredClone(W0.R2.doc);
      const ot = doc.rules.find((rule) => rule.id === "OT")!;
      Object.assign(ot.params, { thresholdMinutes: 2000 });
      const release = W0.compileRelease(doc);
      expect(W0.RELEASES_BY_HASH.has(release.hash)).toBe(false);
      await expect(roster.activate({ ...options(1), release })).rejects.toThrow("full read");
    } finally {
      roster.close();
    }
  });
  it("retains the original basis across a later write and restart; absence still creates work", async () => {
    const { file, roster } = make();
    const initial = tx(1),
      update = tx(2, true);
    roster.apply(binding, initial);
    roster.apply(binding, update);
    roster.apply(binding, initial);
    roster.close();
    const reopened = new ThinRoster(file, binding, false);
    try {
      const old = await reopened.activate({
        ...options(1),
        publish: async (records) => {
          expect(records[0]!.workItems[0]!.kind).toBe("bgc.order");
        },
      });
      expect(old.dismissed).toBe(1);
      const full = await reopened.activate({
        ...options(2),
        world: async () => ({
          subject,
          facts: intent(0, true).map((r) => ({
            e: r.entityId,
            a: r.attribute,
            v: r.value.value,
            tx: 2,
          })),
        }),
        publish: async (records) => {
          expect(records[0]!.workItems.length).toBe(0);
        },
      });
      expect(full.evaluated).toBe(1);
    } finally {
      reopened.close();
    }
    expect(() => new ThinRoster(file, "scope-B", false)).toThrow("binding");
  });
  it("rejects an incomplete or altered prefix and checks coverage and release before any publication", async () => {
    const { roster } = make();
    try {
      expect(() => roster.apply(binding, tx(2, true))).toThrow("gap");
      expect(() => roster.apply("scope-B", tx(1))).toThrow("scoped");
      roster.apply(binding, tx(1));
      expect(() => roster.apply(binding, { ...tx(1), instant: 2 })).toThrow("differs");
      let publications = 0;
      const input = {
        ...options(1),
        publish: async () => {
          publications++;
        },
      };
      await expect(
        roster.activate({ ...input, expected: rosterDigest([person(1)]) }),
      ).rejects.toThrow("coverage");
      await expect(
        roster.activate({ ...input, release: { ...W0.R2, hash: W0.R1.hash } }),
      ).rejects.toThrow("hash");
      await expect(roster.activate({ ...input, basis: { ...input.basis, tx: 2 } })).rejects.toThrow(
        "cut",
      );
      expect(publications).toBe(0);
    } finally {
      roster.close();
    }
  });
  it("requires a full evaluation for a shared dependency or a previously written owned answer", async () => {
    const { roster } = make();
    try {
      const changes = tx(1).changes;
      roster.apply(binding, { ...tx(1), changes: [changes[1]!] });
      roster.apply(binding, { ...tx(2), changes });
      const opts = options(2);
      await expect(roster.activate(opts)).rejects.toThrow("full read");
      const other = person(1);
      roster.apply(binding, {
        ...tx(3),
        changes: [
          {
            op: "assert",
            entityId: other,
            attribute: "location",
            tripleId: "L",
            value: { type: "ref", value: "loc:x" },
          },
        ],
      });
      const found: string[] = [];
      const result = await roster.activate({
        ...options(3),
        expected: rosterDigest([subject, other]),
        world: async (id) => {
          found.push(id);
          return { subject: id, facts: [] };
        },
        publish: async () => {},
      });
      expect(result.evaluated).toBe(2);
      expect(found).toEqual([subject, other]);
    } finally {
      roster.close();
    }
  });
});
