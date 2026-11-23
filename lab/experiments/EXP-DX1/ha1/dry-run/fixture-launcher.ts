import assert from "node:assert/strict";
import { firstOffer } from "../first-offer.ts";

// [DX-INT1] A stand-in launcher for first-offer-dry-run.sh's own test: it passes or fails one check, then would offer.
const [mode] = process.argv.slice(2);
let cleaned = false;
try {
  assert.equal(mode === "refuse" ? "copy-a" : "copy-b", "copy-b", "Held copy differs");
  firstOffer("fixture-" + mode);
  console.log("OFFERED");
} finally {
  cleaned = true;
  console.log("CLEANUP " + cleaned);
}
