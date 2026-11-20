import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { W0 } from "../../../bench/lib/w0-world.ts";
import type { Account } from "./account.ts";
import { auditOffers } from "./audit-offers.ts";
import type { Admission } from "./service.ts";

test("a stalled seal and slow verifier cannot move later offer times or erase the deadline probe", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "delta-open-loop-")),
    savedLock = process.env.DELTA_MEASURE_LOCK,
    validTime = W0.POPULATION_VALID_TIME,
    roster = Array.from({ length: 500 }, (_, i) => W0.placementId(i)),
    receipts: Admission[] = [];
  process.env.DELTA_MEASURE_LOCK = path.join(dir, "lock");
  let seq = 0,
    rel = W0.R1;
  const account = {
    db: { entity: (id: string) => id },
    seal: async (id: string, doc: W0.CompiledRelease) => {
      if (!seq) await delay(1300);
      rel = doc;
      seq++;
      for (const kind of ["fence", "event"])
        receipts.push({
          command: "cmd:" + kind + ":" + id,
          ok: true,
          queueMs: 0,
          queuedForSaveMs: 0,
          serviceMs: 1,
        });
      return { seq, position: seq + 1, txId: "native-" + seq, retry: false };
    },
  } as unknown as Account;
  const x = async (subject: string) => {
    await delay(40);
    const position = seq + 1,
      output = W0.evaluateWorld({ subject, facts: [] }, rel, { tx: position, validTime });
    assert(!W0.isFailure(output));
    return { output, position, seq, releaseSeq: seq };
  };
  try {
    const r = await auditOffers(
      account,
      [
        { name: "public", read: x },
        { name: "fresh", read: x },
      ],
      roster,
      [],
      receipts,
      4,
      "record",
      dir,
      { nonce: "local-control" },
      async () => {},
      async (offers, raw) => {
        await delay(1200);
        assert(offers[1]!.ingress < offers[0]!.ack!.at);
        assert(raw.some((r) => r.offer === 3 && r.phase === "deadline" && r.route === "fresh"));
        return {};
      },
    );
    assert(r.misses >= 1 && r.stale >= 1);
    assert(r.all[0]!.ack!.at - r.all[0]!.scheduled >= 1300);
  } finally {
    if (savedLock === undefined) delete process.env.DELTA_MEASURE_LOCK;
    else process.env.DELTA_MEASURE_LOCK = savedLock;
    fs.rmSync(dir, { recursive: true });
  }
});
