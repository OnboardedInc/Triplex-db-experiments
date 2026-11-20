import assert from "node:assert/strict";
import test from "node:test";
import { AccountAdmission, type AdmissionKind } from "./admission.ts";

for (const policy of ["fifo", "priority"] as const) {
  test(`${policy} preserves the active save and orders only waiting work`, async () => {
    const lane = new AccountAdmission(policy),
      entered: string[] = [],
      hold = Promise.withResolvers<void>();
    const first = lane.run("save", async () => {
      entered.push("active");
      await hold.promise;
    });
    const capture = (kind: AdmissionKind, name: string) =>
      lane.run(kind, async (turn) => {
        entered.push(name);
        return turn;
      });
    const next = capture("save", "waiting"),
      publish = capture("publish", "publish");
    assert.deepEqual(entered, ["active"]);
    hold.resolve();
    const [, , timing] = await Promise.all([first, next, publish]);
    assert.deepEqual(entered, [
      "active",
      ...(policy === "fifo" ? ["waiting", "publish"] : ["publish", "waiting"]),
    ]);
    assert(timing.waitingSaves === 2 && timing.waitingForSavesMs > 0);
  });
}

test("a stream of publishes grants a waiting save after eight turns", async () => {
  const lane = new AccountAdmission("priority"),
    hold = Promise.withResolvers<void>(),
    entered: string[] = [];
  const active = lane.run("save", () => hold.promise);
  const save = lane.run("save", async () => {
    entered.push("save");
  });
  const publishes = Array.from({ length: 12 }, (_, i) =>
    lane.run("publish", async () => {
      entered.push(String(i));
    }),
  );
  hold.resolve();
  await Promise.all([active, save, ...publishes]);
  assert.equal(entered.indexOf("save"), 8);
  assert.deepEqual(
    entered.filter((x) => x !== "save"),
    Array.from({ length: 12 }, (_, i) => String(i)),
  );
});
