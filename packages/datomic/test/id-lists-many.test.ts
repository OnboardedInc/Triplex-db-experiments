import { afterEach, describe, expect, it } from "vitest";
import { validateIdListOptions, type IdListSource } from "../src/idLists.js";

// [DX-SCALE2] TRIPLEX_DATOMIC_ID_LISTS_MANY_ACCOUNTS: the range check by sorting accepts and refuses exactly what the
// pairwise check does, and takes O(A log A) instead of A squared comparisons for a type listed per account.
const flag = "TRIPLEX_DATOMIC_ID_LISTS_MANY_ACCOUNTS";
const decide = (sources: IdListSource[], many: boolean) => {
  if (many) process.env[flag] = "1";
  else delete process.env[flag];
  try {
    validateIdListOptions({ types: { Subject: sources } });
    return "ok";
  } catch (e) {
    return (e as Error).message.includes("is inside range") ? "inside" : "other";
  }
};
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
afterEach(() => delete process.env[flag]);

describe("ID list ranges for many accounts", () => {
  it("decides every random roster the same way with and without the option", () => {
    const alphabet = ["a", "b", "ab", "a-1", "a_1", "b0", "c"];
    let inside = 0;
    for (let n = 0; n < 2000; n++) {
      const k = 1 + Math.floor(rnd() * 6);
      const sources = Array.from({ length: k }, () => ({
        account: alphabet[Math.floor(rnd() * alphabet.length)]!,
        prefix: ["", "pl:", "pl:0", "p", "x/"][Math.floor(rnd() * 5)]!,
      }));
      const a = decide(sources, false), b = decide(sources, true);
      expect(b).toBe(a);
      if (a === "inside") inside++;
    }
    expect(inside).toBeGreaterThan(100); // the matrix can fail
  });

  it("checks 100,000 account ranges quickly with the option", () => {
    const sources = Array.from({ length: 100_000 }, (_, i) => ({ account: "account-" + i, prefix: "pl:" }));
    const started = performance.now();
    expect(decide(sources, true)).toBe("ok");
    expect(performance.now() - started).toBeLessThan(5_000);
    // One overlap among them is still found.
    expect(decide([...sources, { account: "account-5", prefix: "pl:0" }], true)).toBe("inside");
  });
});
