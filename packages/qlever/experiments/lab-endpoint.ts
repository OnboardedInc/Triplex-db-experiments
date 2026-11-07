/** Endpoint and token for QLever experiment entries, read from the environment.
 * [EXP-000] Why: every entry here hard-coded the homebase tunnel http://127.0.0.1:17019 and
 * the token file .runtime/engines/qlever-main/access-token. The lab runs engines in the
 * triplex2 VM on slot ports (lab/config/slots.json), and lab/bin/engine.mjs prints QLEVER_URL.
 * The lab QLever server runs with --no-access-check, so the token is optional.
 * Rejected: keeping 17019 as a default (a silent default could hit the other checkout's tunnel).
 */
import { readFileSync } from "node:fs";

export const labQleverUrl = (): string => {
  const url = process.env["QLEVER_URL"];
  if (!url) throw new Error("QLEVER_URL is required (lab/bin/engine.mjs up prints it)");
  return url;
};

export const labQleverAccessToken = (): string | undefined => {
  const direct = process.env["QLEVER_ACCESS_TOKEN"];
  if (direct) return direct;
  const file = process.env["QLEVER_ACCESS_TOKEN_FILE"];
  if (!file) return undefined;
  const value = readFileSync(file, "utf8").trim();
  if (!value || /[\r\n]/.test(value)) throw new TypeError("Invalid QLEVER_ACCESS_TOKEN_FILE");
  return value;
};
