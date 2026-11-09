import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../../..");
const work = await fs.mkdtemp(path.join(import.meta.dirname, "evidence/changed-pack-"));
const tarDir = path.join(work, "tarballs"),
  consumer = path.join(work, "consumer");
await fs.mkdir(tarDir);
await fs.mkdir(consumer);
const commands = [];
const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 ** 2,
    timeout: 180000,
  });
  commands.push({
    command,
    args,
    cwd,
    exit: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  });
  if (result.status !== 0) throw new Error(`Consumer command failed: ${command}`);
  return result.stdout;
};
const smoke = `import assert from 'node:assert/strict';
import { Effect } from 'effect';
import { ReadError, BasisNotAvailable, instantOf, nextStamp } from '@triplex-build/triplex';
import { makeControllableRecordClock } from '@triplex-build/triplex-testkit';
import { decideRouteCommit } from '@triplex-build/triplex-testkit/route';
assert.equal(instantOf(nextStamp(1000000,1000)),1000.001);
assert.equal(ReadError.name,'ReadError');
assert.equal(new ReadError({message:'normal'})._tag,'ReadError');
const basis = new BasisNotAvailable({axis:'recordedAt',required:2,observed:1,waitedMs:0,surface:'consumer',message:'future'});
assert.equal(await Effect.runPromise(Effect.fail(basis).pipe(Effect.catchTag('BasisNotAvailable',error=>Effect.succeed(error.axis)))),'recordedAt');
const clock = makeControllableRecordClock(1); clock.set(2); assert.equal(clock.get(),2);
assert.equal(decideRouteCommit({position:1,stagedAt:1000,writes:[]},undefined).instant,1000);
console.log('public packed exports and tagged failures checked');
`;
const types = `import { Effect } from 'effect';
import { ReadError, BasisNotAvailable, type CommitStamp, type RecordCut } from '@triplex-build/triplex';
const stamp: CommitStamp = {instant:1,decided:true}; const cut: RecordCut = {position:1,recordedAt:1};
const read: Effect.Effect<never, ReadError> = Effect.fail(new ReadError({message:'normal'}));
const handled = read.pipe(Effect.catchTag('ReadError',error=>Effect.succeed(error.message)),Effect.catchTag('BasisNotAvailable',error=>Effect.succeed(error.axis)));
const basis: ReadError = new BasisNotAvailable({axis:'recordedAt',required:2,observed:1,waitedMs:0,surface:'consumer',message:'future'});
void [stamp,cut,handled,basis];
`;
let error;
try {
  for (const name of ["@triplex-build/triplex", "@triplex-build/triplex-testkit"])
    run("/opt/homebrew/bin/pnpm", [
      "--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store",
      "--filter",
      name,
      "pack",
      "--pack-destination",
      tarDir,
    ]);
  const tarballs = (await fs.readdir(tarDir)).filter((file) => file.endsWith(".tgz"));
  if (tarballs.length !== 2) throw new Error("Expected exactly two changed-package tarballs");
  const dependencies = { effect: "4.0.3" };
  const artifacts = [];
  for (const file of tarballs) {
    const full = path.join(tarDir, file),
      entries = run("tar", ["-tzf", full]).trim().split("\n");
    for (const needed of [
      "package/package.json",
      "package/dist/index.js",
      "package/dist/index.d.ts",
    ])
      if (!entries.includes(needed)) throw new Error(`Missing ${needed}`);
    if (
      entries.some(
        (file) =>
          !["package/package.json", "package/README.md", "package/LICENSE"].includes(file) &&
          !file.startsWith("package/dist/"),
      )
    )
      throw new Error("Non-distribution source in tarball");
    const manifest = JSON.parse(run("tar", ["-xOzf", full, "package/package.json"]));
    dependencies[manifest.name] = `file:${full}`;
    artifacts.push({
      file,
      name: manifest.name,
      sha256: createHash("sha256")
        .update(await fs.readFile(full))
        .digest("hex"),
      entries,
    });
  }
  await fs.writeFile(
    path.join(consumer, "package.json"),
    JSON.stringify(
      { name: "record-time-public-consumer", private: true, type: "module", dependencies },
      null,
      2,
    ),
  );
  await fs.writeFile(path.join(consumer, ".npmrc"), `cache=${path.join(work, "npm-cache")}\n`);
  await fs.writeFile(path.join(consumer, "smoke.mjs"), smoke);
  await fs.writeFile(path.join(consumer, "types.ts"), types);
  await fs.writeFile(
    path.join(consumer, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ESNext",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        noEmit: true,
        types: [],
        lib: ["ESNext", "DOM"],
      },
      include: ["types.ts"],
    }),
  );
  run(
    "npm",
    [
      "--userconfig",
      path.join(consumer, ".npmrc"),
      "--registry",
      "https://registry.npmjs.org",
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    consumer,
  );
  run(path.join(root, "node_modules/.bin/tsc"), ["-p", "tsconfig.json"], consumer);
  run(process.execPath, ["smoke.mjs"], consumer);
  await fs.writeFile(path.join(work, "artifacts.json"), JSON.stringify(artifacts, null, 2) + "\n");
} catch (cause) {
  error = String(cause);
}
await fs.writeFile(
  path.join(work, "execution.json"),
  JSON.stringify(
    { head: run("git", ["rev-parse", "HEAD"]).trim(), work, commands, error: error ?? null },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ work, error: error ?? null }));
process.exitCode = error ? 1 : 0;
