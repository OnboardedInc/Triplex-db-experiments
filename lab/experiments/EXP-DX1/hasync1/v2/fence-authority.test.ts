import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { FenceAuthority, type IndependentInterlock } from "./fence-authority.ts";

test("persistent outlet isolation survives management restart and opposite host wall clocks", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hasync-fence-"));
  try {
    const journal = path.join(dir, "authority");
    const relay = path.join(dir, "independent-relay");
    const owner = {
      cluster: "cluster",
      epoch: "epoch-a",
      primary: "old-disk",
      transactor: "old-tx",
    };
    let crash = true,
      link = true;
    const authority = () => {
      const interlock: IndependentInterlock = {
        async trip(cut) {
          fs.writeFileSync(relay, JSON.stringify({ ...cut, power: "off", restartLatched: true }));
          if (crash) throw Error("management lost power after physically opening relay");
        },
        async readBack() {
          assert(link, "independent readback unreachable");
          return JSON.parse(fs.readFileSync(relay, "utf8"));
        },
      };
      return new FenceAuthority(journal, interlock);
    };
    FenceAuthority.armNew(journal, owner, 19);
    assert(await authority().boot(owner, 19));
    assert.equal(await authority().boot({ ...owner, primary: "different-disk" }, 19), false);
    const first = { ...owner, challenge: randomUUID() };
    await assert.rejects(authority().fence(first), /management lost power/);
    const now = Date.now;
    try {
      Date.now = () => now() - 86400000;
      assert.equal(await authority().boot(owner, 19), false);
      crash = false;
      Date.now = () => now() + 86400000;
      const second = { ...owner, challenge: randomUUID() };
      const accepted = await authority().fence(second);
      assert.equal(await authority().boot(owner, 18), false);
      assert.equal(await authority().boot(owner, 19), false);
      assert.equal(await authority().boot(owner, 20), false);
      await assert.rejects(authority().observe({ ...first, ticket: accepted.ticket }));
      await assert.rejects(authority().observe({ ...second, ticket: "other" }));
      const proof = { ...second, ticket: accepted.ticket };
      assert.deepEqual(await authority().observe(proof), {
        ...proof,
        state: "isolated",
        restartLatched: true,
      });
      link = false;
      await assert.rejects(authority().observe(proof), /readback unreachable/);
      fs.writeFileSync(journal, "{malformed");
      assert.equal(await authority().boot(owner, 19), false);
      await assert.rejects(authority().fence(second));
    } finally {
      Date.now = now;
    }
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
