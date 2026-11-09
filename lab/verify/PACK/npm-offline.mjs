#!/usr/bin/env node
// [CX-VPACK] Why: seed a new attempt cache from retained registry bytes and force offline
// resolution. Rejected: reusing a consumer/node_modules (would conceal install defects).
import { cpSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const cache = readFileSync(".npmrc", "utf8")
  .trim()
  .replace(/^cache=/, "");
mkdirSync(cache, { recursive: true });
cpSync(join(process.env.CX_VPACK_CACHE, "_cacache"), join(cache, "_cacache"), { recursive: true });
console.log("[CX-VPACK] npm offline; fresh consumer; seeded registry cache only");
const result = spawnSync(process.env.CX_VPACK_NPM, process.argv.slice(2), {
  stdio: "inherit",
  env: { ...process.env, npm_config_offline: "true", npm_config_update_notifier: "false" },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
