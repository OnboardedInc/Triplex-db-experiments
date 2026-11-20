import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import type { DeepIdentity } from "../../../bench/lib/deep-profile.ts";
import type { Receipt } from "../../../bench/lib/composition.ts";
import type { WorldRow } from "../../../bench/lib/w0-world.ts";

export class MembershipProof {
  private readonly digest = Buffer.alloc(32);
  count = 0;
  add(row: Pick<WorldRow, "id" | "entityId" | "attribute" | "value" | "position" | "validFrom">) {
    if (![":tenant/account", ":tenant/shard", ":tenant/member"].includes(row.attribute)) return;
    assert(
      row.id &&
        row.value.type === "string" &&
        Number.isSafeInteger(row.position) &&
        row.position > 0,
    );
    const bytes = createHash("sha256")
      .update(
        JSON.stringify([
          row.id,
          row.entityId,
          row.attribute,
          row.value.value,
          row.position,
          row.validFrom,
        ]),
      )
      .digest();
    for (let i = 0; i < 32; i++) this.digest[i] = this.digest[i]! ^ bytes[i]!;
    this.count++;
  }
  bind(receipt: Receipt) {
    for (const r of receipt.triples)
      if (r.attribute.startsWith(":tenant/"))
        this.add({ ...r, position: receipt.position, validFrom: r.validFrom! });
  }
  value() {
    return { rows: this.count, sha256Xor: this.digest.toString("hex") };
  }
}

// [DX-SCALE1] Why: only the second account publishes a release, and every other writer, feed and reader stays on until that account acknowledges its last guarded page. Rejected: completing all ten releases or making quiet traffic run a fixed extra hour.
export async function tenantRelease(
  dir: string,
  id: DeepIdentity,
  phaseStart: number,
  ceiling: number,
  r2?: {
    cut: { position: number; txId: string };
    endedAt: number;
    publicationPosition: number;
    coverage: unknown;
  },
) {
  const plan = JSON.parse(fs.readFileSync(path.join(dir, "release.json"), "utf8"));
  const slot = "s" + (id.tenant!.topology === "pooled" ? 0 : 1);
  assert.deepEqual(plan.armed["s" + id.account].identity, id);
  assert(plan.nonce === id.nonce && plan.source === id.source && plan.slot === id.slot);
  const filename = path.join(dir, "tenant-release.json");
  if (r2) {
    assert.deepEqual(plan.armed[slot].identity, id);
    const row = {
      identity: id,
      account: "account-002",
      database: plan.armed[slot].database,
      phaseStart,
      endedAt: r2.endedAt,
      cut: r2.cut,
      publicationPosition: r2.publicationPosition,
      coverage: r2.coverage,
    };
    fs.writeFileSync(filename + ".tmp", JSON.stringify(row), { flag: "wx" });
    fs.renameSync(filename + ".tmp", filename);
  }
  while (Date.now() < ceiling) {
    if (fs.existsSync(filename)) {
      const result = JSON.parse(fs.readFileSync(filename, "utf8"));
      assert.deepEqual(result.identity, plan.armed[slot].identity);
      assert(
        result.account === "account-002" &&
          result.database === plan.armed[slot].database &&
          result.phaseStart === phaseStart &&
          result.endedAt >= phaseStart &&
          result.endedAt <= Date.now() &&
          result.cut.txId &&
          result.cut.position > 0 &&
          result.publicationPosition > result.cut.position &&
          result.coverage?.pages > 0,
      );
      return result;
    }
    await sleep(100);
  }
  throw Error("Account activation exceeded its frozen offer window");
}
