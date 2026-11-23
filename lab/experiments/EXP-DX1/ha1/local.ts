import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  admission,
  appendEvent,
  docker,
  dockerArgs,
  DOCKER_HOST,
  LabError,
  LOCKS,
  listTx2Containers,
  pidAlive,
  readOwner,
  slotInfo,
  vmDisk,
  withPool,
} from "../../../bin/lib.mjs";
import {
  Evidence,
  head,
  loadRoles,
  localRoleMiB,
  microLoad,
  modeOf,
  splitLoad,
  roles,
  root,
  runFile,
  sleep,
  type Role,
} from "./common.ts";
import { drill } from "./run.ts";
import { localCheckpoint } from "../hasync1/v2/local-checkpoint.ts";
import { fleetCaps, fleetMode } from "../hasync1/v2/fleet-config.ts";
import type { Site } from "./stack.ts";

async function recoverLoad(nonce: string, config: any, manager: any, folder: string) {
  assert.match(nonce, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
  const parent = path.join(folder, "locks", "measure");
  const leaseFile = path.join(parent, "owner.json");
  const lease = JSON.parse(fs.readFileSync(leaseFile, "utf8"));
  assert(lease.id === "DX-HA1" && lease.nonce === nonce && !pidAlive(lease.pid));
  assert(["s1", "s2", "s3"].includes(lease.slot));
  const slot = slotInfo(config, "datomic", lease.slot);
  const prefix = "tx2-ha1-" + nonce.slice(0, 8);
  const evidence = path.join(folder, "evidence", "DX-HA1", "load1");
  const attempts = fs.readdirSync(evidence).filter((d) => d.endsWith("-" + nonce));
  assert.equal(attempts.length, 1);
  const dir = path.join(evidence, attempts[0]!);
  const attempt = JSON.parse(fs.readFileSync(path.join(dir, "attempt.json"), "utf8"));
  assert(
    attempt.nonce === nonce && attempt.slot === lease.slot && attempt.mode.startsWith("load-"),
  );
  assert(!fs.existsSync(path.join(dir, "observations.json")));
  // [DX-LOAD1] Why: a killed controller can leave a timed lease and its private stack alive. Rejected: clearing the lease by age or stopping the usual slot container.
  await withPool((ledger: any) => {
    const owner = readOwner(slot);
    assert(owner?.holder === "DX-HA1" && owner.pid === lease.pid && owner.worktree === root);
    assert.deepEqual(JSON.parse(fs.readFileSync(leaseFile, "utf8")), lease);
    const events = fs
      .readFileSync(path.join(dir, "events.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    const roles = events.filter((r) => r.nonce === nonce && r.type === "role").map((r) => r.data);
    const names = loadRoles(modeOf(attempt.mode)).map((role) => prefix + "-" + role);
    const reservations = ledger.reservations.filter((r: any) => names.includes(r.container));
    assert.equal(reservations.length, names.length);
    assert(
      reservations.every(
        (r: any) => r.holder === "DX-HA1" && r.slot === lease.slot && r.pid === lease.pid,
      ),
    );
    const live = listTx2Containers({ all: true }).filter(
      (r: any) => r.labels["ha1.attempt"] === nonce,
    );
    const objects = live.map((r: any) => {
      assert(names.includes(r.name) && r.labels["tx2.holder"] === "DX-HA1");
      assert.equal(r.labels["tx2.managed-by"], "lab/bin/engine.mjs");
      const inspected = docker(["inspect", "--type", "container", r.name]);
      assert(inspected);
      const view = JSON.parse(inspected)[0];
      const expected = roles.find((v: any) => prefix + "-" + v.role === r.name);
      assert(expected && view.Id === expected.id && view.Image === expected.image);
      assert(
        view.Mounts.filter((m: any) => m.Type === "volume").every((m: any) =>
          expected.volumes.includes(m.Name),
        ),
      );
      return { id: view.Id, name: r.name, volumes: expected.volumes, running: view.State.Running };
    });
    const networkIds = docker([
      "network",
      "ls",
      "-q",
      "--no-trunc",
      "--filter",
      "label=ha1.attempt=" + nonce,
    ]);
    assert(networkIds !== null && !networkIds.includes("\n"));
    if (networkIds) {
      const inspected = docker(["network", "inspect", networkIds]);
      assert(inspected);
      const network = JSON.parse(inspected)[0];
      assert.equal(network.Name, prefix);
      assert.equal(network.Labels["ha1.attempt"], nonce);
      assert(
        Object.keys(network.Containers ?? {}).every((id) => objects.some((o: any) => o.id === id)),
      );
    }
    fs.writeFileSync(
      path.join(dir, "abandoned.json"),
      JSON.stringify({ nonce, lease, objects, networkIds }, null, 2) + "\n",
      { flag: "wx" },
    );
    for (const o of objects) docker(["rm", "-fv", o.id]);
    if (networkIds) docker(["network", "rm", networkIds]);
    assert.equal(docker(["ps", "-aq", "--filter", "label=ha1.attempt=" + nonce]), "");
    assert.equal(docker(["network", "ls", "-q", "--filter", "label=ha1.attempt=" + nonce]), "");
    for (const o of objects)
      for (const volume of o.volumes)
        assert.equal(docker(["volume", "ls", "-q", "--filter", "name=^" + volume + "$"]), "");
    ledger.reservations = ledger.reservations.filter((r: any) => !reservations.includes(r));
    manager.releaseSlot(slot);
    fs.unlinkSync(leaseFile);
    fs.rmdirSync(parent);
    fs.writeFileSync(
      path.join(dir, "cleanup.json"),
      JSON.stringify({ nonce, containers: 0, networks: 0, recovered: true }) + "\n",
      { flag: "wx" },
    );
  });
}

export async function localDrill(opts: any, config: any, manager: any) {
  assert.equal(process.platform, "darwin");
  const mode = modeOf(opts.experiment);
  const syncMode = mode.startsWith("hasync-");
  const owner = syncMode ? "DX-HASYNC1" : "DX-HA1";
  const holder = opts.holder as string;
  const diagnostic = syncMode || opts.diagnostic === true;
  const pooled = opts.pooled === true;
  assert(!pooled || ["hasync-ack", "hasync-move", "hasync-restart"].includes(mode));
  // [DX-INT1] Why: recheck the merged loader and recovery with this builder's diagnostic slot.
  // Rejected: borrowing another builder's live reservation.
  const combined = opts.combined;
  const cells = mode === "load-fair" ? ["fair", "read", "cold", "real-fair"] : ["failover"];
  const ownedCombination = ["DX-CHK1", "DX-THIN1"].includes(holder) && diagnostic && cells.includes(combined) &&
    (mode === "load-fair" || mode === "hasync-ack");
  const scorecard = holder === "DX-V01" && opts.diagnostic === true && pooled &&
    ["hasync-ack", "hasync-move"].includes(mode) && opts.people === "10";
  // [DX-LOAD2] Why: the import-neighbours builder gates its importer change on its own diagnostic slot.
  const importNeighbours = holder === "DX-LOAD2" && diagnostic && mode === "load-fair" && combined === undefined;
  assert(holder === owner || (holder === "DX-THIN1" && diagnostic) || ownedCombination || scorecard || importNeighbours);
  assert(combined === undefined || ownedCombination);
  if (mode === "load-fair") {
    const { cleanSource } = await import("../v01/source.ts");
    cleanSource(head());
  }
  assert.equal(dockerArgs([])[1], DOCKER_HOST);
  const folder = path.join(os.homedir(), "Claude", "Projects", "triplex-db-2");
  if (typeof opts.recover === "string") {
    assert.equal(opts.holder, "DX-HA1");
    return recoverLoad(opts.recover, config, manager, folder);
  }
  assert(["auto", "s1", "s2", "s3"].includes(opts.slot));
  assert(
    !(microLoad(mode) || mode === "native-checks") || diagnostic,
    "Use --diagnostic for Mac correctness trials",
  );
  const previousPg = opts["prepare-postgres"];
  assert(
    previousPg === undefined ||
      (diagnostic &&
        (microLoad(mode) || mode.startsWith("one-")) &&
        typeof previousPg === "string" &&
        /^sha256:[a-f0-9]{64}$/.test(previousPg)),
    "--prepare-postgres expects the prior image ID for a local diagnostic import or recovery check",
  );
  const slots = (opts.slot === "auto" ? ["s2", "s3", "s1"] : [opts.slot]).map((id) =>
    slotInfo(config, "datomic", id),
  );
  let info = slots[0],
    e: Evidence;
  const acquiredSlots: typeof slots = [];
  function declare(slot: string) {
    const shape = opts["population-shape"] ?? "deep";
    assert(shape === "deep" || shape === "mixed");
    const faultCell = opts["fault-cell"] ?? "all";
    assert(faultCell === "all" || (mode === "one-failover" && faultCell === "tail-burst"));
    const attempt = new Evidence(
      path.join(folder, "evidence", holder, ...(mode.startsWith("load-") ? ["load1"] : [])),
      mode,
      slot,
      shape,
      faultCell,
      opts.holder,
    );
    if (diagnostic)
      attempt.write("diagnostic", {
        nonce: attempt.nonce,
        slot,
        source: attempt.source,
        mode,
        timing: "diagnostic",
      });
    console.log(attempt.dir);
    return attempt;
  }
  // [DX-HA1] Why: each child cap has a matching live reservation and unique name. Rejected: reusing a retained slot volume or double-counting a single opaque stack.
  const scopes = fleetMode(mode)
    ? Number(opts.systems ?? 1)
    : mode.startsWith("load-") || pooled
      ? 1
      : 3;
  const wanted = fleetMode(mode)
    ? [...fleetCaps(mode, scopes, false)]
    : Object.entries(roles)
        .filter(([r]) =>
          mode === "hasync-cold"
            ? ["pg", "target"].includes(r)
            : mode === "native-checks"
              ? r === "tool"
              : mode.startsWith("load-")
                ? loadRoles(mode).includes(r as Role)
                : mode === "replication"
                  ? ["pg", "target", "tool", "active", "write"].includes(r)
                  : mode === "move" ||
                    mode.startsWith("one-") ||
                    mode.startsWith("hasync-") ||
                    r !== "target",
        )
        .map(([r]) => [r, localRoleMiB(mode, r as Role)] as const);
  const people = Number(opts.people ?? (pooled ? 10 : 4));
  const smallLogicalCopy =
    mode === "one-account" && Number.isSafeInteger(people) && people > 0 && people <= 256;
  const checkpointRun = opts.checkpoint !== undefined || mode === "hasync-seed-edited";
  const forecastRole = fleetMode(mode) ? "fleet-a-pg0" : "pg";
  const forecastBytes =
    (fleetMode(mode)
      ? mode === "hasync-fleet-dedicated"
        ? Math.max(1, Math.ceil(scopes / 2))
        : 2
      : checkpointRun
        ? Math.max(2, Math.ceil(people / 2500))
        : smallLogicalCopy
          ? 1.5
          : mode.startsWith("one-") || splitLoad(mode) || mode === "load-volume"
            ? 3
            : mode === "load-tail"
              ? 2
              : 1) *
    2 ** 30;
  const bytes = wanted.reduce((n, [, mb]) => n + mb * 2 ** 20, 0);
  const slotsNeeded = Math.ceil(bytes / info.memBytes);
  assert(
    slots.length >= slotsNeeded,
    "Requested fleet needs more than one admitted slot; use --slot auto",
  );
  let reserved = false,
    clean = false;
  // [DX-HASYNC1] Why: correctness only needs the owned slot and one heavy token. Rejected: taking a measurement lock for Mac diagnostic clocks.
  const parentLease = diagnostic ? undefined : path.join(folder, "locks", "measure");
  try {
    for (;;) {
      // [DX-HASYNC1] Why: a queued exclusive lab window needs this process's heavy token to drain. Rejected: holding the token while waiting for that same window to finish.
      if (diagnostic) manager.assertMeasureAdmission(opts.holder);
      const disk = fs.statfsSync(root);
      const floorBytes = (holder === "DX-THIN1" || mode === "load-fair" || scorecard ? 10 : 5) * 2 ** 30;
      if (disk.bavail * disk.bsize < floorBytes) {
        e = declare(opts.slot);
        e.write("admission-refused", {
          nonce: e.nonce,
          freeBytes: disk.bavail * disk.bsize,
          floorBytes,
          rolesStarted: 0,
        });
        throw Error("Host disk floor");
      }
      if (
        slots.filter((slot) => !fs.existsSync(slot.lockDir)).length >= slotsNeeded &&
        (!parentLease || !fs.existsSync(parentLease))
      ) {
        try {
          await withPool((ledger: any) => {
            manager.assertMeasureAdmission(opts.holder);
            if (parentLease) {
              try {
                fs.mkdirSync(parentLease);
              } catch (err: any) {
                if (err.code === "EEXIST") return;
                throw err;
              }
            }
            // [DX-HA1] Why: hold the measurement timer while checking capacity and binding the winning slot. Rejected: hashing a candidate before mkdir while a competing run can claim the timer.
            const inode = parentLease && fs.statSync(parentLease).ino;
            let ownedFile = false;
            try {
              const live = listTx2Containers({ all: true });
              const nominated = slots
                .filter(
                  (slot) =>
                    !fs.existsSync(slot.lockDir) &&
                    !live.some((c: any) => c.name === slot.container),
                )
                .slice(0, slotsNeeded);
              if (nominated.length < slotsNeeded) return;
              info = nominated[0];
              const available = nominated.map((slot) => slot.memBytes);
              const assigned = new Map<string, string>();
              for (const [role, mb] of [...wanted].sort((a, b) => b[1] - a[1])) {
                const index = available.findIndex((room) => room >= mb * 2 ** 20);
                assert(index >= 0, "Fleet roles do not fit admitted slots");
                available[index] -= mb * 2 ** 20;
                assigned.set(role, nominated[index].slot);
              }
              const req = {
                container: "tx2-ha1-admission",
                memBytes: bytes,
                diskForecastBytes: forecastBytes,
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
              e = declare(nominated.map((slot) => slot.slot).join("+"));
              if (parentLease) {
                fs.writeFileSync(
                  path.join(parentLease, "owner.json"),
                  JSON.stringify({
                    id: holder,
                    pid: process.pid,
                    nonce: e.nonce,
                    slot: info.slot,
                    at: new Date().toISOString(),
                  }),
                  { flag: "wx" },
                );
                ownedFile = true;
              }
              for (const candidate of nominated) {
                const slot = manager.acquireSlot(candidate, opts.holder, holder);
                assert(slot.created);
                acquiredSlots.push(candidate);
              }
              for (const [role, mb] of wanted)
                ledger.reservations.push({
                  container: e.prefix + "-" + role,
                  holder: opts.holder,
                  lane: "datomic",
                  slot: assigned.get(role),
                  pid: process.pid,
                  state: "drill",
                  memBytes: mb * 2 ** 20,
                  cpus: 1.5,
                  diskForecastBytes: role === forecastRole ? req.diskForecastBytes : 0,
                });
              reserved = true;
            } finally {
              if (parentLease && !reserved) {
                assert.equal(fs.statSync(parentLease).ino, inode);
                if (ownedFile) {
                  const file = path.join(parentLease, "owner.json");
                  assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).nonce, e!.nonce);
                  fs.unlinkSync(file);
                }
                fs.rmdirSync(parentLease);
              }
            }
          });
        } catch (err: any) {
          if (err.code !== "REFUSED" || reserved || diagnostic) throw err;
        }
      }
      if (reserved) break;
      if (diagnostic)
        throw new LabError(
          "REFUSED",
          "Diagnostic slot unavailable. Release the ordinary heavy token before retrying.",
        );
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
    if (diagnostic || mode.startsWith("load-") || mode.startsWith("hasync-")) {
      try {
        // [DX-LOAD1] Why: the shared VM rotates built images; bind the immutable digest to the engine's build event and image label. Rejected: running a mutable tag or changing the shared config for another builder.
        const builds = fs
          .readFileSync(path.join(LOCKS, "events.jsonl"), "utf8")
          .trim()
          .split("\n")
          .map((l) => JSON.parse(l))
          .filter((x) => x.event === "datomic-build")
          .reverse();
        let chosen;
        for (const b of builds) {
          assert(
            /^sha256:[0-9a-f]{64}$/.test(b.imageId) && /^[0-9a-f]{64}$/.test(b.buildInputsSha256),
          );
          const exists = await site
            .docker([
              "image",
              "inspect",
              b.imageId,
              "--format",
              '{{.Id}} {{index .Config.Labels "tx2.build-inputs-sha256"}}',
            ])
            .catch(() => undefined);
          if (exists === undefined) continue;
          assert.equal(exists, b.imageId + " " + b.buildInputsSha256);
          chosen = b;
          break;
        }
        assert(chosen, "No locally present engine-built Datomic distribution");
        site.datomicId = chosen.imageId;
        e!.write("image", {
          nonce: e!.nonce,
          image: chosen.imageId,
          buildInputs: chosen.buildInputsSha256,
        });
      } catch (error) {
        clean = true;
        throw error;
      }
    }
    if (previousPg) {
      try {
        const inspect = (ref: string) =>
          site.docker(["image", "inspect", ref, "--format", "{{.Id}}"]).catch((error: Error) => {
            if (/No such image/.test(error.message)) return undefined;
            throw error;
          });
        const tag = "postgres:17-alpine";
        const retained = await inspect(previousPg);
        let current = retained ?? (await inspect(tag));
        if (!current) {
          // [DX-LOAD3] Why: restore the official dependency through the engine using an anonymous client.
          // Rejected: an implicit container pull or binding the historical image ID to a newer build.
          const config = fs.mkdtempSync(path.join(os.tmpdir(), "ha1-registry-"));
          try {
            await runFile("docker", ["--config", config, ...dockerArgs(["pull", "--quiet", tag])], {
              encoding: "utf8",
              timeout: 120000,
            });
            current = await inspect(tag);
          } finally {
            fs.rmSync(config, { recursive: true, force: true });
          }
        }
        assert(current && /^sha256:[a-f0-9]{64}$/.test(current));
        site.postgresImage = current;
        e!.log("postgres-image", { previous: previousPg, current, retained: retained === current });
      } catch (error) {
        clean = true;
        throw error;
      }
    }
    clean = true;
    const sync = localCheckpoint(e!, folder, opts.checkpoint, people);
    clean = false;
    await drill(
      e!,
      site,
      site,
      {
        people,
        scopes,
        capacity: diagnostic ? "local-diagnostic" : "local",
        ...(pooled ? { pooled: true as const } : {}),
        ...(combined ? { combined } : {}),
        ...(diagnostic ? { timing: "diagnostic" as const } : {}),
      },
      () => {
        clean = true;
      },
      sync,
    );
  } finally {
    if (parentLease && reserved) {
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
        appendEvent({ event: "ha1-released", holder, prefix: e.prefix });
      });
    if (!reserved || clean)
      for (const slot of acquiredSlots)
        if (readOwner(slot)?.pid === process.pid) manager.releaseSlot(slot);
  }
}
