import assert from "node:assert/strict";
import fs from "node:fs";
import { density, populationPins, profile, workloadPins } from "./plan.ts";
const defaultPin = new URL("./pins.json", import.meta.url);
const pinned = {
  profile,
  items: density.map((n) => ({ seed: populationPins(n), tapes: workloadPins(n) })),
};
if (process.argv[2] === "create") {
  fs.writeFileSync(defaultPin, JSON.stringify(pinned, null, 2) + "\n", { flag: "wx" });
} else {
  assert.deepEqual(JSON.parse(fs.readFileSync(defaultPin, "utf8")), pinned);
}
