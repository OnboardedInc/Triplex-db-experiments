import assert from "node:assert/strict";
export const tests: { name: string; run: () => Promise<void>; timeout: number }[] = [];
// [DX-R1] Why: run the unchanged Vitest corpus inside the Linux generator without downloading native test tooling.
// Rejected: rewriting its RNG/scenarios or weakening its equality assertions; these matchers use Node strict equality.
export const describe = Object.assign((_name: string, run: () => void) => run(), {
  skipIf: (skip: boolean) => (_name: string, run: () => void) => {
    if (!skip) run();
  },
});
export const it = (name: string, run: () => Promise<void>, timeout = 900000) =>
  tests.push({ name, run, timeout });
export const expect = (actual: any) => ({
  toEqual: (expected: any) => assert.deepStrictEqual(actual, expected),
  toBe: (expected: any) => assert.strictEqual(actual, expected),
  toBeGreaterThan: (expected: number) => assert(actual > expected),
  toHaveLength: (expected: number) => assert.strictEqual(actual.length, expected),
  toMatchObject: (_expected: any) => {
    throw new Error("Subset matcher belongs to the excluded neighbor test");
  },
});
