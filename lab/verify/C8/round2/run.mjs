import { spawnSync } from "node:child_process";
import { copyFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// [CX-VC8-2] Why: bind all reruns to the extracted target and retain outputs separately. Rejected: overwriting round-one logs.
const output = path.dirname(fileURLToPath(import.meta.url));
const sut = path.join(output, "sut");
const vitest = path.join(sut, "node_modules/vitest/vitest.mjs");
const mode = process.argv[2] ?? "offline";
const results = [];
const run = (name, cwd, args, overrides = {}) => {
  const started = new Date().toISOString();
  const env = {
    XTDB_INTEGRATION: "0",
    QLEVER_INTEGRATION: "0",
    TRIPLEX_INTEGRATION: "0",
    TRIPLEX_DUCKDB: "0",
    ...overrides,
  };
  const result = spawnSync(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  writeFileSync(path.join(output, `${name}.log`), result.stdout + result.stderr);
  results.push({
    name,
    cwd,
    command: [process.execPath, ...args],
    env,
    started,
    finished: new Date().toISOString(),
    status: result.status,
    signal: result.signal,
    error: String(result.error ?? ""),
  });
  writeFileSync(path.join(output, `${mode}-runs.json`), JSON.stringify(results, null, 2) + "\n");
  console.log(name, result.status, (result.stdout + result.stderr).slice(-1600));
};
if (mode === "original") {
  run("source-binding", output, [path.join(output, "prepare.mjs")]);
  run("original", sut, [
    vitest,
    "run",
    "--config",
    "lab/verify/C8/vitest.config.ts",
    "lab/verify/C8/adversarial.test.ts",
    "--reporter=verbose",
    "--reporter=json",
    `--outputFile=${path.join(output, "original-results.json")}`,
  ]);
} else if (mode === "offline") {
  for (const name of ["core", "xtdb", "qlever", "qualification"])
    run(`offline-${name}`, path.join(sut, "packages", name), [
      vitest,
      "run",
      "--maxWorkers=1",
      "--no-file-parallelism",
    ]);
  run("offline-node", path.join(sut, "packages/qualification"), [
    "--test",
    "../../qualification/compare.test.mjs",
    "load/dispatch.test.ts",
    "load/model.test.ts",
  ]);
} else if (mode === "delta") {
  copyFileSync(path.join(output, "delta.test.ts"), path.join(sut, "lab/verify/C8/delta.test.ts"));
  run("delta", sut, [
    vitest,
    "run",
    "--config",
    "lab/verify/C8/vitest.config.ts",
    "lab/verify/C8/delta.test.ts",
    "--reporter=verbose",
    "--reporter=json",
    `--outputFile=${path.join(output, "delta-results.json")}`,
  ]);
} else if (mode === "live") {
  run(
    "light-live",
    sut,
    [
      vitest,
      "run",
      "--config",
      "lab/verify/C8/vitest.config.ts",
      "lab/verify/C8/light-live.test.ts",
      "--reporter=verbose",
    ],
    { C8_LIGHT_LIVE: "1" },
  );
  run(
    "counter-live",
    path.join(sut, "packages/qualification"),
    [
      vitest,
      "run",
      "test/engine-write-counter.test.ts",
      "-t",
      "QLever write counter \\(live\\)",
      "--reporter=verbose",
    ],
    { QLEVER_INTEGRATION: "1", QLEVER_URL: "http://127.0.0.1:7070" },
  );
  run(
    "c8-live",
    path.join(sut, "packages/qualification"),
    [vitest, "run", "test/c8-reads-never-write.test.ts", "--reporter=verbose"],
    {
      QLEVER_INTEGRATION: "1",
      QLEVER_URL: "http://127.0.0.1:7070",
      C8_READERS: "1",
      C8_LOAD_MS: "2000",
    },
  );
} else throw new Error(`Unknown mode ${mode}`);
process.exitCode = results.some((result) => result.status !== 0) ? 1 : 0;
