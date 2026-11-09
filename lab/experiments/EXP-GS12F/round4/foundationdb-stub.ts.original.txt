// [CX-VGS12F-R2] Why: replace only the unavailable native transport, retaining the actual wrapper's limits.
// Rejected: installing a native library or starting an unreserved cluster for a pure local guard test.
export const observed = { transactions: 0, claimSets: 0, sets: 0 };
export const setAPIVersion = () => {};
export const open = () => ({
  at() {
    return this;
  },
  rawCreateTransaction() {
    const values = new Map<string, Buffer>();
    const tx: any = {
      rawOnError: async () => {},
      rawCancel: () => {},
      _exec: async (fn: any) => {
        observed.transactions++;
        return fn(tx);
      },
      snapshot: () => tx,
      get: async (k: Buffer) => values.get(k.toString("hex")),
      getRangeAll: async () => [],
      set: (k: Buffer, v: Buffer) => {
        observed.sets++;
        if (k[0] === 0x22) observed.claimSets++;
        values.set(k.toString("hex"), v);
      },
      clear: (k: Buffer) => values.delete(k.toString("hex")),
      clearRange: () => {},
    };
    return tx;
  },
});
