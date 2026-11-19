import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";

export const root = path.resolve(import.meta.dirname, "../../../..");
export const loopback = Object.values(os.networkInterfaces())
  .flat()
  .find((i) => i?.internal && i.family === "IPv4")!.address;
export const hash = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");
export const head = () =>
  execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
export const runFile = promisify(execFile);
export const clock = () => performance.now();
export { sleep };
export const modes = ["failures", "move", "replication"] as const;
export type Mode = (typeof modes)[number];
export const roles = {
  pg: 192,
  target: 192,
  active: 560,
  standby: 560,
  write: 672,
  read: 672,
  tool: 640,
} as const;
export type Role = keyof typeof roles;
export function modeOf(s: string): Mode {
  assert(modes.includes(s as Mode), "Choose failures, move or replication");
  return s as Mode;
}
export async function until<T>(label: string, fn: () => Promise<T | undefined>, ms = 120000) {
  const end = clock() + ms;
  for (;;) {
    const value = await fn();
    if (value !== undefined) return value;
    if (clock() > end) throw Error("Deadline waiting for " + label);
    await sleep(250);
  }
}
export function tree(dir: string) {
  const files = fs
    .readdirSync(dir, { recursive: true, encoding: "utf8" })
    .sort()
    .filter((f) => fs.statSync(path.join(dir, f)).isFile());
  return hash(JSON.stringify(files.map((f) => [f, hash(fs.readFileSync(path.join(dir, f)))])));
}
export function inputs() {
  return {
    git: head(),
    experiment: treeCode(),
    gateway: tree(path.join(root, "packages/datomic/gateway/src")),
    codec: hash(fs.readFileSync(path.join(root, "packages/datomic/src/codec-spec.json"))),
    client: tree(path.join(root, "packages/datomic/dist")),
    core: tree(path.join(root, "packages/core/dist")),
  };
}
function treeCode() {
  const paths = fs
    .readdirSync(import.meta.dirname)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => path.join(import.meta.dirname, f));
  paths.push(
    ...["lab/bin/engine.mjs", "lab/bin/lib.mjs", "packages/datomic/test/ha1-account.ts"].map((f) =>
      path.join(root, f),
    ),
  );
  return hash(
    JSON.stringify(paths.sort().map((f) => [path.relative(root, f), hash(fs.readFileSync(f))])),
  );
}
export class Evidence {
  readonly nonce = randomUUID();
  readonly prefix = "tx2-ha1-" + this.nonce.slice(0, 8);
  readonly source = inputs();
  readonly dir: string;
  readonly start = clock();
  constructor(
    parent: string,
    readonly mode: Mode,
    readonly slot: string,
  ) {
    fs.mkdirSync(parent, { recursive: true });
    this.dir = path.join(parent, mode + "-" + this.nonce);
    fs.mkdirSync(this.dir);
    this.write("attempt", {
      nonce: this.nonce,
      mode,
      slot,
      source: this.source,
      utc: new Date().toISOString(),
    });
  }
  write(name: string, data: unknown) {
    fs.writeFileSync(path.join(this.dir, name + ".json"), JSON.stringify(data, null, 2) + "\n", {
      flag: "wx",
    });
  }
  log(type: string, data: unknown) {
    fs.appendFileSync(
      path.join(this.dir, "events.jsonl"),
      JSON.stringify({ nonce: this.nonce, ms: clock() - this.start, type, data }) + "\n",
    );
  }
}
