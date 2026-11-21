import assert from "node:assert/strict";
import {
  orderedSaveIdentity,
  type DatomicClient,
} from "../../../../../packages/datomic/dist/index.js";
import type { Fact } from "../../../../bench/lib/world.ts";
import { command } from "../../w1/group/workload.ts";
import { keyFor, sha, task, type Write } from "./plan.ts";

export type Row = Parameters<DatomicClient["transact"]>[1]["rows"][number];
type SaveIdentity = { id: string; account: number; subject: number; orderedToken?: string };
type FieldChange = Pick<Write, "width" | "version">;

// [DX-HASYNC1] Why: use the SCALE1 field payload and journal in failure drills. Rejected: inventing a second writer for the availability load.
export function expectedSave(o: SaveIdentity, e: FieldChange, prior: readonly Row[]) {
  const entity = task(o.account, o.subject);
  const old = prior.slice(0, e.width);
  assert(old.length === e.width && old.every((r) => r.entity_id === entity));
  const facts: Fact[] = old.map((row, i) => ({
    e: entity,
    a: row.attribute,
    v: { type: "string", value: sha([e.version, i]).slice(0, 57) },
  }));
  const input = {
    ...command(
      o.id,
      facts,
      old,
      true,
      false,
      o.orderedToken === undefined ? undefined : orderedSaveIdentity(o.orderedToken),
    ),
    live: old.map((r) => r.id),
    groupAccount: keyFor(o.account),
    writeClass: "live" as const,
  };
  return { input, entity };
}
