// [CX-VP2Q-4-R7] Why: run the actual dependency guard against a simulated installed-source addition.
// Rejected: editing node_modules or testing only a copied missing-code helper (neither safely proves the guard).
import fs from "node:fs";
import path from "node:path";
import { vi } from "vitest";
const original = fs.readFileSync;
const addedCode = "UND_ERR_QA_ADDED_TRANSPORT";
const receipt = path.join(process.env.V_P2Q_OUT!, "guard-mutation-readback.json");
vi.spyOn(fs, "readFileSync").mockImplementation(((file: any, options: any) => {
  const value = (original as any)(file, options);
  if (String(file).endsWith("undici@7.29.0/node_modules/undici/lib/core/errors.js")) {
    fs.writeFileSync(receipt, JSON.stringify({ addedCode, module: String(file), modifiedOnDisk: false, intercepted: true }) + "\n");
    const extra = `\nclass QaAddedTransportError extends Error { constructor() { super(); this.code = '${addedCode}'; } }\n`;
    return typeof value === "string" ? value + extra : Buffer.concat([value, Buffer.from(extra)]);
  }
  return value;
}) as any);
