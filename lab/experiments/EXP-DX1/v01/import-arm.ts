import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AdoptedSeed } from "./adopt.ts";
import type { Peer } from "./adopted.ts";
import { budget, selectedWriter, type Writer } from "./profile.ts";

export function runImport(out: string, source: string, peer: Peer, seed: AdoptedSeed, writer: Writer, toy: boolean, cut: number) {
  // [DX-V01] Why: isolate the published runner's client environment and bound its drain and exact audit.
  // Rejected: setting global client choices while another scorecard stage is still live.
  const folder = path.join(out, "p8");
  fs.mkdirSync(folder);
  execFileSync(process.execPath, ["--no-warnings", "--experimental-transform-types",
    fileURLToPath(new URL("./import-worker.ts", import.meta.url)), folder, seed.scope.name,
    String(cut), selectedWriter(writer).TX2_GROUP_MAX_MEMBERS, toy ? "toy" : "server", writer], {
    env: { ...process.env, DATOMIC_URL: peer.write, DX_SERVER_RECORD_TIME: "1",
      TRIPLEX_DATOMIC_LAYOUT: "lean", TRIPLEX_DATOMIC_FAST_PATHS: selectedWriter(writer).TRIPLEX_DATOMIC_FAST_PATHS,
      TRIPLEX_TRACE_RUN: peer.attempt, TRIPLEX_TRACE_SOURCE: source, TRIPLEX_TRACE_SLOT: peer.slot,
      TX2_W0_POINT_JOURNAL: "1",
    }, timeout: (toy ? 3 : budget.P8) * 60_000, stdio: "inherit",
  });
}
