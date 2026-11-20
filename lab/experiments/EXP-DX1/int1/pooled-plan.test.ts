import assert from "node:assert/strict";
import test from "node:test";
import { frozenDeep } from "../../../bench/lib/deep-profile.ts";
import { V3_OFFER_SECONDS } from "../../../bench/lib/phases.ts";
import { campaignCases, campaignTenant, treatment } from "./everything-plan.ts";
import { importFrames, legacyFrameFacts } from "./pooled-import.ts";
import { campaignWindows, tenantPlan } from "../scale1/tenant-traffic.ts";

test("the legacy import splits at complete subjects within the campaign frame limit", () => {
  const people = 256;
  const frames = [...importFrames(people)];
  assert(frames.length > 1);
  const roots = frames.flatMap((frame) => {
    assert(frame.length > 0 && frame.length <= legacyFrameFacts);
    return frame.filter((r) => r.attribute === ":subject/account").map((r) => r.entityId);
  });
  assert.equal(roots.length, people);
  assert.equal(new Set(roots).size, people);
});

test("the overnight frozen arm keeps the original events in one database with ten accounts", () => {
  const [zero, loaded] = campaignCases([10_000]);
  const a = tenantPlan(campaignTenant(zero!, false), "zero");
  const b = tenantPlan(campaignTenant(loaded!, false), "reader");
  assert.equal(a.sha256, b.sha256);
  assert.equal(a.accounts.length, 10);
  assert.equal(
    a.accounts.reduce((n, x) => n + x.people, 0),
    100_000,
  );
  const original = frozenDeep(0, 10_000).events.filter((e) => e.atMs < V3_OFFER_SECONDS * 1000);
  assert.deepEqual(
    a.events.map(({ tenant, localSubject, localSeq, ...e }) => {
      assert.equal(tenant, 0);
      assert.equal(localSubject, e.subject);
      assert.equal(localSeq, e.seq);
      return e;
    }),
    original,
  );
  assert.equal(treatment.TRIPLEX_DATOMIC_LAYOUT, "legacy");
});

test("the saved proof tapes bind all ten accounts and keep quiet offer slots and seats matched", () => {
  const [, , zero, loaded] = campaignCases([4]);
  const campaign = campaignTenant(loaded!, true);
  const b = tenantPlan(campaign, "reader");
  assert.equal(b.sha256, tenantPlan(campaignTenant(zero!, true), "zero").sha256);
  assert.deepEqual(
    b.accounts.map((a) => a.people),
    Array(10).fill(4),
  );
  const windows = campaignWindows(campaign, "reader");
  const offsets = (name: string) => {
    const w = windows.find((v) => v.name === name)!;
    return b.events
      .filter(
        (e) =>
          e.tenant === 0 &&
          !e.resend &&
          e.atMs >= w.from * 1000 &&
          e.atMs < (w.from + w.seconds) * 1000,
      )
      .map((e) => Math.round((e.atMs - w.from * 1000) * 1000));
  };
  for (const [base, loaded] of [
    ["quiet-alone", "neighbors-64"],
    ["quiet-alone", "neighbors-256"],
    ["publish-control", "publish"],
    ["import-control", "import"],
  ]) {
    assert.deepEqual(offsets(base!), offsets(loaded!));
    assert.equal(
      windows.find((w) => w.name === base)!.seats![0],
      windows.find((w) => w.name === loaded)!.seats![0],
    );
  }
  assert.equal(
    new Set(b.events.filter((e) => !e.resend).map((e) => e.seq)).size,
    b.events.filter((e) => !e.resend).length,
  );
});
