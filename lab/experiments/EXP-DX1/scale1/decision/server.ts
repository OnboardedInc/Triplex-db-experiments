import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { withStack } from "../../w1/bench.ts";
import { fieldPolicy } from "../../w1/field/bench-check.ts";
import {
  density,
  profileFor,
  workloadPins,
  populationPins,
  type Density,
  type Layout,
} from "./plan.ts";
import { ingest, restore, seal, read, write, update, type Destination } from "./seed.ts";
import { nativeProbe } from "./gate.ts";

type Mode = "individual" | "bounded" | "prepared";
export type Request = {
  tag: string;
  source: string;
  nonce: string;
  phase: "seed" | "cells";
  people: Density;
  layout: Layout;
  mode: Mode;
  from?: string;
  fromTransfer?: string;
  review: string;
  withReaders?: boolean;
};
const checkout = path.resolve(import.meta.dirname, "../../../../..");
const outputRoot = "/var/tmp/triplex-scale1/decision/attempts";
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: checkout, encoding: "utf8", timeout: 60000 }).trim();

async function main(dir: string) {
  assert(process.platform === "linux" && process.getuid?.() === 0);
  assert.equal(process.env.DOCKER_HOST, "unix:///var/run/docker.sock");
  const p = read<Request>(path.join(dir, "request.json"));
  assert(path.dirname(dir) === outputRoot && path.basename(dir) === p.tag);
  assert.match(p.tag, /^arm-d7-[a-z0-9-]{2,24}$/);
  assert.match(p.source, /^[a-f0-9]{40}$/);
  assert.match(p.nonce, /^[a-f0-9-]{36}$/);
  assert.match(p.review, /^[a-f0-9]{64}$/);
  assert(density.includes(p.people) && ["pooled", "split5", "single"].includes(p.layout));
  if (p.layout === "single") assert(p.people === 100000 && p.mode === "individual");
  assert((typeof p.withReaders === "boolean") === (p.layout === "single" && p.phase === "cells"));
  assert(["individual", "bounded", "prepared"].includes(p.mode));
  assert(["seed", "cells"].includes(p.phase));
  if (p.fromTransfer) {
    assert(p.phase === "cells" && p.layout === "single");
    assert.match(p.fromTransfer, /^[a-f0-9]{64}$/);
  }
  assert(
    (p.phase === "seed" && !p.from && p.mode === "individual") ||
      (p.phase === "cells" &&
        p.from &&
        /^arm-d7-[a-z0-9-]{2,24}$/.test(p.from) &&
        p.from !== p.tag),
  );
  assert.equal(git("rev-parse", "HEAD"), p.source);
  assert.equal(git("status", "--porcelain", "--untracked-files=no"), "");

  const assets = read(
    path.join(import.meta.dirname, p.layout === "single" ? "single-pins.json" : "pins.json"),
  );
  assert.equal(assets.profile, profileFor(p.layout));
  const pin = assets.items.find((x: any) => x.seed.people === p.people);
  assert(pin && /^[a-f0-9]{64}$/.test(pin.seed.digest));
  assert.deepEqual(pin.tapes, workloadPins(p.people, p.layout));
  const slot = "tx2-dxscale1-" + p.tag;
  const id: Destination = {
    source: p.source,
    slot,
    nonce: p.nonce,
    people: p.people,
    layout: p.layout,
    population: pin.seed.digest,
  };
  const storage = fs.statfsSync(dir);
  const free = storage.bavail * storage.bsize;
  const floorGiB =
    p.layout === "single"
      ? 160
      : p.people === 100000 && p.phase === "seed"
        ? 350
        : p.people === 100000
          ? 190
          : 60;
  write(path.join(dir, "admission.json"), {
    ...id,
    free,
    floorGiB,
    policy: fieldPolicy(p.mode, true),
    at: Date.now(),
  });
  assert(free >= floorGiB * 1024 ** 3, "Free disk is below the actual layout's scratch forecast");
  const refs = [
    "exp/DX-WFIX1-write-path-fixes",
    "exp/DX-W1-commit-tail-reads",
    "exp/DX-BM1-bare-metal",
    "exp/DX-HA1-failover-move",
  ];
  const heads = Object.fromEntries(
    refs.map((ref) => {
      git(
        "-c",
        "credential.helper=",
        "-c",
        "http.extraHeader=",
        "fetch",
        "origin",
        "refs/heads/" + ref,
      );
      return [ref, git("rev-parse", "FETCH_HEAD")];
    }),
  );
  git("merge-base", "--is-ancestor", "cd2151749", p.source);
  git("merge-base", "--is-ancestor", "cd2151749", heads[refs[0]!]!);
  write(path.join(dir, "upstream.json"), {
    ...id,
    heads,
    matchedRevision: p.source,
    at: Date.now(),
  });
  const status = (stage: string) =>
    update(path.join(dir, "STATUS.json"), { stage, ...id, at: Date.now() });
  status("starting owned native stack");
  try {
    await withStack(
      dir,
      {
        source: p.source,
        slot,
        nonce: p.nonce,
        population: "deep",
        lookup: "individual",
        readers: p.phase === "cells",
      },
      async (env) => {
        // [DX-SCALE1] Why: pin all sender threads after native CPU admission. Rejected: retaining the setup process's wide affinity during measurement.
        execFileSync("taskset", ["-a", "-pc", "3", String(process.pid)], { timeout: 5000 });
        const writeUrl = env.DATOMIC_URL!,
          readUrl = env.DATOMIC_READ_URLS!;
        assert(writeUrl !== readUrl && writeUrl && readUrl);
        process.env.TRIPLEX_DATOMIC_LAYOUT = "lean";
        process.env.DX_STRICT_RECORD_CLOCKS = "1";
        process.env.DX_SERVER_RECORD_TIME = "1";
        // [DX-SCALE1] Why: observer workers import the current SDK in fresh processes.
        // Rejected: passing the retired fresh-texts flag from the seed harness to the observers.
        process.env.TRIPLEX_DATOMIC_FAST_PATHS = env.TRIPLEX_DATOMIC_FAST_PATHS ?? "";
        process.env.DATOMIC_URL = readUrl;
        const binding = env.DX_W1_WRITER_EXPECTATION;
        assert(binding);
        status("checking fresh native field and feed preflight");
        write(path.join(dir, "preflight.json"), await nativeProbe(id, writeUrl, readUrl, binding));
        if (p.phase === "seed") {
          status("verifying canonical population bytes");
          assert.deepEqual(populationPins(p.people, p.layout), pin.seed);
          status("running two-frame loader");
          const seed = await ingest(dir, id, readUrl);
          status("sealing immutable PostgreSQL image");
          await seal(dir, seed);
        } else {
          status("restoring verified seed");
          const restored = await restore(dir, path.join(outputRoot, p.from!), id, p.fromTransfer);
          const { runCells } = await import("./traffic.ts");
          await runCells(
            dir,
            p,
            id,
            restored.scopes,
            restored.urls[0]!,
            restored.urls[1]!,
            binding,
            status,
          );
        }
      },
      fieldPolicy(p.mode, true).grouping,
      p.mode,
      true,
      "4,8",
    );
    status("arm ended");
  } catch (e) {
    if (!fs.existsSync(path.join(dir, "error.json")))
      write(path.join(dir, "error.json"), { ...id, at: Date.now(), reason: String(e) });
    throw e;
  }
}
if (process.argv[1] === import.meta.filename) await main(process.argv[2]!);
