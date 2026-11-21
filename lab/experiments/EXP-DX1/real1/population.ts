import assert from "node:assert/strict";
import { seedOps } from "../../../bench/lib/commands.ts";
import { deepPopulation } from "../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM, type Fact } from "../../../bench/lib/world.ts";
import type { SnapshotData } from "../load1/source.ts";
import { accounts, keyFor, person, root, sha } from "../scale1/decision/plan.ts";
import { smallPeople } from "../scale1/small-plan.ts";
import { intent, person as thinPerson } from "../thin1/population.ts";

export const namespace = "acct/real1/";
export const width = 2000;
export type Account = { id: number; kind: "deep" | "thin" | "small"; people: number };
export type Profile = "toy" | "first" | "full";

export function roster(profile: Profile): Account[] {
  return [
    ...accounts.map(
      (id): Account => ({ id, kind: "deep", people: profile === "toy" ? 50 : 100_000 }),
    ),
    {
      id: 10,
      kind: "thin",
      people: profile === "toy" ? 5_000 : profile === "first" ? 1_000_000 : 4_500_000,
    },
    ...Array.from(
      { length: profile === "toy" ? 10 : 100 },
      (_, i): Account => ({
        id: 11 + i,
        kind: "small",
        people: profile === "toy" ? 10 : smallPeople(i),
      }),
    ),
  ];
}

const qualify = (id: string) => namespace + id.slice("acct/".length);
export function subject(a: Account, i: number) {
  return a.kind === "deep"
    ? root(a.id, i)
    : a.kind === "small"
      ? qualify(root(a.id, i))
      : namespace + keyFor(a.id) + "/" + thinPerson(i);
}

export function facts(a: Account, i: number): Fact[] {
  if (a.kind === "deep") return person(a.id, i);
  if (a.kind === "small")
    return person(a.id, i).map(({ e, a, v }) => ({
      e: qualify(e),
      a,
      v: v.type === "ref" ? { ...v, value: qualify(v.value) } : v,
    }));
  const prefix = namespace + keyFor(a.id) + "/";
  const e = subject(a, i);
  return [
    ...intent(i).map(
      (op): Fact => ({
        e: prefix + op.entityId,
        a: op.attribute,
        v:
          op.value.type === "ref"
            ? { type: "ref", value: prefix + op.value.value }
            : { type: "string", value: op.value.value },
      }),
    ),
    { e, a: ":subject/account", v: { type: "string", value: keyFor(a.id) } },
    { e, a: ":subject/member", v: { type: "string", value: String(i) } },
  ];
}

export function addedFacts(a: Account) {
  if (a.kind === "thin") return a.people * 10;
  return deepPopulation(a.people).facts + a.people * 2 + Math.ceil(a.people / 256) + 1;
}

// [DX-REAL1] Why: regenerate each complete subject and keep every new reference under a disjoint account prefix.
// Rejected: extending the existing SCALE1 import namespace and reusing its manifest key.
export function source(
  selected: Account[],
  parentImage: string,
  revision: string,
  toyBase = false,
): SnapshotData {
  assert(selected.length > 0 && (toyBase || selected.every((a) => a.kind !== "deep")));
  const groups = selected.reduce((sum, a) => sum + a.people, 0);
  const validAt = SEED_VALID_FROM;
  const dataNamespace = toyBase ? "acct/" : namespace;
  return {
    groups,
    validAt,
    namespace: dataNamespace,
    seal: sha([
      "real1/population/1",
      revision,
      parentImage,
      selected,
      width,
      validAt,
      dataNamespace,
    ]),
    *batches(first = 0) {
      assert(Number.isSafeInteger(first) && first >= 0 && first <= groups);
      let at = 0,
        start = first;
      let rows: Fact[] = [];
      for (const a of selected) {
        const skip = Math.max(0, first - at);
        for (let i = skip; i < a.people; i++) {
          const next = facts(a, i);
          assert(next.length <= width);
          if (rows.length && rows.length + next.length > width) {
            yield { first: start, end: at + i, operations: seedOps(rows) };
            start = at + i;
            rows = [];
          }
          rows.push(...next);
        }
        at += a.people;
      }
      if (rows.length) yield { first: start, end: groups, operations: seedOps(rows) };
    },
  };
}
