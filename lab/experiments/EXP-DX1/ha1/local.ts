import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  admission,
  appendEvent,
  dockerArgs,
  DOCKER_HOST,
  listTx2Containers,
  readOwner,
  slotInfo,
  vmDisk,
  withPool,
} from "../../../bin/lib.mjs";
import { Evidence, modeOf, roles, root, runFile, sleep } from "./common.ts";
import { drill } from "./run.ts";
import type { Site } from "./stack.ts";

export async function localDrill(opts: any, config: any, manager: any) {
  assert.equal(process.platform, "darwin");
  assert.equal(opts.holder, "DX-HA1");
  assert.equal(dockerArgs([])[1], DOCKER_HOST);
  assert(["auto", "s1", "s2", "s3"].includes(opts.slot));
  const mode = modeOf(opts.experiment);
  const slots = (opts.slot === "auto" ? ["s2", "s3", "s1"] : [opts.slot]).map((id) =>
    slotInfo(config, "datomic", id),
  );
  let info = slots[0],
    e: Evidence;
  const folder = path.join(os.homedir(), "Claude", "Projects", "triplex-db-2");
  function declare(slot: string) {
    const shape = opts["population-shape"] ?? "deep";
    assert(shape === "deep" || shape === "mixed");
    const attempt = new Evidence(path.join(folder, "evidence", "DX-HA1"), mode, slot, shape);
    console.log(attempt.dir);
    return attempt;
  }
  // [DX-HA1] Why: each child cap has a matching live reservation and unique name. Rejected: reusing a retained slot volume or double-counting a single opaque stack.
  const wanted = Object.entries(roles).filter(([r]) =>
    mode === "replication"
      ? ["pg", "target", "tool", "active", "write"].includes(r)
      : mode === "move" || mode.startsWith("one-") || r !== "target",
  );
  const bytes = wanted.reduce((n, [, mb]) => n + mb * 2 ** 20, 0);
  assert(bytes <= info.memBytes);
  let acquired = false,
    reserved = false,
    clean = false;
  const parentLease = path.join(folder, "locks", "measure");
  let measured = false;
  try {
    for (;;) {
      const disk = fs.statfsSync(root);
      if (disk.bavail * disk.bsize < 5 * 2 ** 30) {
        e = declare(opts.slot);
        e.write("admission-refused", {
          nonce: e.nonce,
          freeBytes: disk.bavail * disk.bsize,
          floorBytes: 5 * 2 ** 30,
          rolesStarted: 0,
        });
        throw Error("Host disk floor");
      }
      if (slots.some((slot) => !fs.existsSync(slot.lockDir)) && !fs.existsSync(parentLease)) {
        try {
          await withPool((ledger: any) => {
            manager.assertMeasureAdmission(opts.holder);
            if (fs.existsSync(parentLease)) return;
            const live = listTx2Containers({ all: true });
            const candidate = slots.find(
              (slot) =>
                !fs.existsSync(slot.lockDir) && !live.some((c: any) => c.name === slot.container),
            );
            if (!candidate) return;
            info = candidate;
            const req = {
              container: "tx2-ha1-admission",
              memBytes: bytes,
              diskForecastBytes: (mode.startsWith("one-") ? 3 : 1) * 2 ** 30,
            };
            const pol = {
              ...config,
              pool: {
                ...config.pool,
                memLimitBytes: Math.min(config.pool.memLimitBytes, 15 * 2 ** 30),
              },
            };
            if (
              !admission({
                config: pol,
                reservations: ledger.reservations,
                running: live,
                request: req,
                diskUsedBytes: vmDisk(config).usedBytes,
              }).ok
            )
              return;
            try {
              fs.mkdirSync(parentLease);
            } catch (err: any) {
              if (err.code === "EEXIST") return;
              throw err;
            }
            measured = true;
            e = declare(info.slot);
            fs.writeFileSync(
              path.join(parentLease, "owner.json"),
              JSON.stringify({
                id: "DX-HA1",
                pid: process.pid,
                nonce: e.nonce,
                slot: info.slot,
                at: new Date().toISOString(),
              }),
              { flag: "wx" },
            );
            const slot = manager.acquireSlot(info, opts.holder, "DX-HA1");
            assert(slot.created);
            acquired = true;
            for (const [role, mb] of wanted)
              ledger.reservations.push({
                container: e.prefix + "-" + role,
                holder: opts.holder,
                lane: "datomic",
                slot: info.slot,
                pid: process.pid,
                state: "drill",
                memBytes: mb * 2 ** 20,
                cpus: 1.5,
                diskForecastBytes: role === "pg" ? req.diskForecastBytes : 0,
              });
            reserved = true;
          });
        } catch (err: any) {
          if (err.code !== "REFUSED" || measured) throw err;
        }
      }
      if (reserved) break;
      await sleep(5000);
    }
    const site: Site = {
      key: "local",
      repo: root,
      datomicId: config.lanes.datomic.imageId,
      docker: async (args, options = {}) => {
        const out = await runFile("docker", dockerArgs(args), {
          encoding: "utf8",
          maxBuffer: 16 * 2 ** 20,
          timeout: 120000,
          ...options,
        });
        return (out.stdout + (args[0] === "logs" ? out.stderr : "")).trim();
      },
    };
    await drill(
      e!,
      site,
      site,
      { people: Number(opts.people ?? 4), scopes: 3, capacity: "local" },
      () => {
        clean = true;
      },
    );
  } finally {
    if (measured) {
      const f = path.join(parentLease, "owner.json");
      assert.equal(JSON.parse(fs.readFileSync(f, "utf8")).nonce, e!.nonce);
      fs.unlinkSync(f);
      fs.rmdirSync(parentLease);
    }
    if (reserved && clean)
      await withPool((ledger: any) => {
        ledger.reservations = ledger.reservations.filter(
          (v: any) =>
            !wanted.some(
              ([r]) =>
                v.container === e.prefix + "-" + r &&
                v.holder === opts.holder &&
                v.pid === process.pid,
            ),
        );
        appendEvent({ event: "ha1-released", holder: opts.holder, prefix: e.prefix });
      });
    if (acquired && (!reserved || clean) && readOwner(info)?.pid === process.pid)
      manager.releaseSlot(info);
  }
}
