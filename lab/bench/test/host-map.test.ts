// [EXP-P5B-R2] Why: exercise Q101a through product writes and actual SQLite readback. Rejected: only testing a toy numeric map.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { openMappedHost } from "../lib/host-store.ts";
import { V_W0, W0, canonical } from "../lib/w0-world.ts";
import { TrafficOracle } from "../lib/w0-traffic-oracle.ts";
import { spawnSync } from "node:child_process";
import { requireFingerprint } from "../lib/w0-gates.ts";
import { readW0Fingerprint } from "../lib/w0-fingerprint.ts";
test(
  "host grouped seed maps sparse receipts, reads logical worlds and refuses changed map",
  { timeout: 120000 },
  async () => {
    const dir = path.resolve("runs/P5B-tests", randomUUID());
    fs.mkdirSync(dir, { recursive: true });
    const h = await openMappedHost(path.join(dir, "store"), "p5b-map-test:" + randomUUID());
    try {
      const seed = await h.seed(50, dir);
      assert.equal(h.map.native(1), 2048);
      assert.equal(seed.basis.tx, h.map.size);
      const P = seed.basis.tx,
        page = await h.comp.sweepPage([W0.placementId(0)], { position: P, validAt: V_W0 });
      assert.equal(page.position, P);
      assert.ok(page.rows.every((r) => r.position <= P));
      const fingerprint = await readW0Fingerprint(
        h.comp,
        50,
        { position: P, validAt: V_W0 },
        new AbortController().signal,
      );
      assert.equal(fingerprint.basisTx, P);
      assert.ok(fingerprint.facts > 0);
      const fp = path.join(dir, "oracle.json"),
        oracleResult = spawnSync(
          "python3",
          [
            "-I",
            "lab/oracles/domain/cli.py",
            "--population",
            "--rung",
            "50",
            "--fingerprint",
            "--no-stats",
            "--out",
            fp,
          ],
          { encoding: "utf8" },
        );
      assert.equal(oracleResult.status, 0, oracleResult.stderr);
      requireFingerprint(fingerprint, JSON.parse(fs.readFileSync(fp, "utf8")), 50);

      const activation = await h.comp.transact(
        [
          {
            op: "assert",
            entityId: "tenant",
            attribute: "activation",
            value: { type: "string", value: "R2" },
            validFrom: V_W0,
          },
        ],
        { commandId: "activation" },
      );
      assert.equal(activation.ok, true);
      if (!activation.ok) throw Error("activation refused");
      assert.equal(activation.value.position, P + 1);
      let replayed = 0;
      for await (const c of h.comp.commandStream!()) {
        replayed++;
        assert.equal(c.receipt.position, replayed);
      }
      assert.equal(replayed, P + 1);
      const recovered = await h.comp.transactionByCommand("p5:seed:1");
      assert.ok(recovered.ok);
      if (recovered.ok) assert.equal(recovered.value.position, 1);
      const feed = await h.comp.feedPage(P, 10);
      assert.equal(feed.transactions[0].position, P + 1);
      assert.equal(feed.next, P + 1);
      const oracle = new TrafficOracle(h.comp, path.join(dir, "live-intent.ndjson"));
      try {
        await oracle.init();
        const snapshot = await h.comp.sweepPage([W0.placementId(0)], {
          position: P,
          validAt: V_W0,
        });
        await oracle.checkWorld(W0.placementId(0), snapshot.rows, { position: P, validAt: V_W0 });
      } finally {
        oracle.close();
      }
      const journal = await h.historyAt(activation.value.txId, P + 1);
      assert.equal(journal.find((r: any) => r.attribute === ":_tx/position")!.value_number, P + 1);
      const journalPage = await h.comp.sweepPage([activation.value.txId], {
        position: P + 1,
        validAt: V_W0,
      });
      assert.equal(
        journalPage.rows.find((r) => r.attribute === ":_tx/position")!.value.value,
        P + 1,
      );
      const history = await h.historyAt(W0.placementId(0), P);
      assert.ok(history.every((r: any) => r.recorded_position <= P));
      const data = JSON.parse(fs.readFileSync(seed.mapFile, "utf8"));
      data.entries[0][1]++;
      fs.writeFileSync(seed.mapFile, canonical(data));
      await assert.rejects(
        h.comp.sweepPage([W0.placementId(0)], { position: P, validAt: V_W0 }),
        /map changed/,
      );
    } finally {
      await h.comp.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },
);

test(
  "host seed refuses actual readback value and actor-byte changes",
  { timeout: 120000 },
  async () => {
    for (const field of ["value_string", "created_by"]) {
      const dir = path.resolve("runs/P5B-tests", randomUUID());
      fs.mkdirSync(dir, { recursive: true });
      const h = await openMappedHost(path.join(dir, "store"), "p5b-byte-test:" + randomUUID());
      const actual = h.broker.readback.bind(h.broker);
      h.broker.readback = async (ids) =>
        (await actual(ids)).map((r, i) =>
          i ? r : { ...r, [field]: field === "value_string" ? "9999" : "changed-actor" },
        );
      try {
        await assert.rejects(h.seed(50, dir), /bytes differ/);
        assert.equal(h.map.size, 0);
      } finally {
        await h.comp.close();
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  },
);
