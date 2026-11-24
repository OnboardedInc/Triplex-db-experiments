// [DX-S2] The save-identity rule and the save-size errors, without a gateway (the product-path gates in
// lab/experiments/EXP-DX1/s2 run them end to end against the per-subject writer and a general-writer control).
import { describe, expect, it } from "vitest";
import {
  orderedSaveShape,
  SaveRequestTooLarge,
  SaveTooLarge,
  SAVE_LIMIT_FACTS,
  SUBJECT_SAVE_FACTS,
  SUBJECT_SAVE_OWNERS,
} from "../src/DatomicStorageAdapter.js";

const assert = (entityId: string, attribute: string, value: unknown = { type: "string", value: "v" }) =>
  ({ op: "assert", entityId, attribute, value }) as never;
const retract = (id: string) => ({ op: "retract", id }) as never;
const meta = { commandId: "c" };

describe("orderedSaveShape", () => {
  it("gives one subject's save with a command a one-byte block, and a larger one a wide block", () => {
    expect(orderedSaveShape([assert("task/1", ":task/a")], meta)).toEqual({ block: "one-byte", reason: "ordered" });
    expect(orderedSaveShape([retract("X"), assert("task/1", ":task/a")], meta).block).toBe("one-byte");
    expect(orderedSaveShape([retract("X")], meta).block).toBe("one-byte");
    // 64 replacements: 64 facts plus 3 + 65 + 128 journal rows = 260 new IDs, over the one-byte block's 256.
    const replace64 = Array.from({ length: 64 }, (_, i) => [retract(`R${i}`), assert("task/1", `:task/f${i}`)]).flat();
    expect(orderedSaveShape(replace64, meta).block).toBe("wide");
    // A field asserted twice (kept true until now, then the new value) is still one subject's save.
    expect(orderedSaveShape([retract("X"), assert("task/1", ":task/a"), assert("task/1", ":task/a")], meta).block).toBe("one-byte");
  });
  it("keeps the runtime's IDs, and says why, for every save the per-subject writer cannot take", () => {
    expect(orderedSaveShape([assert("task/1", ":task/a")], undefined).reason).toBe("no-command-id");
    expect(orderedSaveShape([assert("task/1", ":task/a")], { ...meta, enforce: { constraints: [] } }).reason).toBe("constraints");
    expect(orderedSaveShape([assert("task/1", ":task/a"), assert("task/2", ":task/a")], meta).reason).toBe("several-entities");
    expect(orderedSaveShape([assert("_tx/1", ":task/a")], meta).reason).toBe("system-entity");
    expect(orderedSaveShape([assert("task/1", ":_tx/a")], meta).reason).toBe("system-attribute");
    expect(orderedSaveShape([assert("task/1", ":task/a", { type: "ref", value: "task/2" })], meta).reason).toBe("reference-value");
    expect(orderedSaveShape([{ op: "retract-pattern", pattern: { entityId: "task/1" } } as never], meta).reason).toBe("pattern-retraction");
    expect(orderedSaveShape([], meta).reason).toBe("empty");
    const over = Array.from({ length: SUBJECT_SAVE_FACTS + 1 }, (_, i) => assert("task/1", `:task/f${i}`));
    expect(orderedSaveShape(over, meta)).toEqual({ reason: "over-subject-bound" });
    expect(orderedSaveShape(over.slice(1), meta).block).toBe("wide");
  });
});

describe("orderedSaveShape with several owners (DX-S3)", () => {
  it("gives a save of two to four owners of one account one block spanning them, and refuses more or mixed accounts", () => {
    const two = [retract("X"), assert("acct/a/task/1", ":task/a"), assert("acct/a/profile/1", ":employee/name")];
    expect(orderedSaveShape(two, meta)).toEqual({ reason: "several-entities" });
    expect(orderedSaveShape(two, meta, SUBJECT_SAVE_OWNERS)).toEqual({ block: "one-byte", reason: "ordered", owners: 2 });
    const four = ["t1", "t2", "p", "q"].map((e) => assert(`acct/a/${e}`, ":x/a"));
    expect(orderedSaveShape(four, meta, SUBJECT_SAVE_OWNERS)).toEqual({ block: "one-byte", reason: "ordered", owners: 4 });
    expect(orderedSaveShape([...four, assert("acct/a/r", ":x/a")], meta, SUBJECT_SAVE_OWNERS).reason).toBe("over-owner-bound");
    expect(orderedSaveShape([assert("acct/a/t", ":x/a"), assert("acct/b/p", ":x/a")], meta, SUBJECT_SAVE_OWNERS).reason).toBe("several-accounts");
    expect(orderedSaveShape([assert("acct/a/t", ":x/a"), assert("profile/p", ":x/a")], meta, SUBJECT_SAVE_OWNERS).reason).toBe("several-accounts");
    // Test scopes without account namespaces: one implicit account.
    expect(orderedSaveShape([assert("task/t", ":x/a"), assert("profile/p", ":x/a")], meta, SUBJECT_SAVE_OWNERS).block).toBe("one-byte");
    // A reference between the owners stays on the runtime's IDs, as for one owner.
    expect(orderedSaveShape([assert("task/t", ":x/a"), assert("profile/p", ":x/t", { type: "ref", value: "task/t" })], meta, SUBJECT_SAVE_OWNERS).reason).toBe("reference-value");
    // The block counts one changed-entity row per owner: 64 replacements over two owners are 64 facts and
    // 3 + (2 + 64) + 128 journal rows = 261 new IDs, over the one-byte block's 256.
    const wide = Array.from({ length: 64 }, (_, i) => [retract(`R${i}`), assert(i % 2 ? "task/t" : "profile/p", `:x/f${i}`)]).flat();
    expect(orderedSaveShape(wide, meta, SUBJECT_SAVE_OWNERS).block).toBe("wide");
  });
});

describe("save-size errors", () => {
  it("name the facts, the bytes and the limit", () => {
    const facts = new SaveTooLarge(1001, 1_227_103);
    expect([facts.reason, facts.facts, facts.bytes, facts.limitFacts, facts._tag]).toEqual(["save-too-large", 1001, 1_227_103, SAVE_LIMIT_FACTS, "WriteError"]);
    const bytes = new SaveRequestTooLarge(900, 10_002_679);
    expect([bytes.reason, bytes.facts, bytes.bytes, bytes.limitBytes]).toEqual(["save-request-too-large", 900, 10_002_679, 4 * 1024 * 1024]);
  });
});
