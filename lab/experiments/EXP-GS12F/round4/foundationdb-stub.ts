// [EXP-GS12F-R4] Why: substitute only native transport and retain committed bytes for positive controls.
// Rejected: assuming raw buffer size means the public META/journal/index path committed exactly.
export const observed = { transactions: 0, claimSets: 0, sets: 0, maxKey: 0, maxValue: 0 };
export const setAPIVersion = () => {};
export const open = () => {
  let committed = new Map<string, Buffer>();
  return {
    at() {
      return this;
    },
    rawCreateTransaction() {
      const values = new Map(committed);
      const tx: any = {
        rawOnError: async () => {},
        rawCancel: () => {},
        _exec: async (fn: any) => {
          observed.transactions++;
          const result = await fn(tx);
          committed = new Map(values);
          return result;
        },
        snapshot: () => tx,
        get: async (k: Buffer) => values.get(k.toString("hex")),
        getRangeAll: async (start: Buffer, end: Buffer, opts: any = {}) => {
          let rows = [...values]
            .map(([k, v]) => [Buffer.from(k, "hex"), v] as const)
            .filter(([k]) => Buffer.compare(k, start) >= 0 && Buffer.compare(k, end) < 0)
            .sort((a, b) => Buffer.compare(a[0], b[0]));
          if (opts.reverse) rows.reverse();
          return opts.limit ? rows.slice(0, opts.limit) : rows;
        },
        set: (k: Buffer, v: Buffer) => {
          observed.sets++;
          if (k[0] === 0x22) observed.claimSets++;
          observed.maxKey = Math.max(observed.maxKey, k.length);
          observed.maxValue = Math.max(observed.maxValue, v.length);
          values.set(k.toString("hex"), Buffer.from(v));
        },
        clear: (k: Buffer) => values.delete(k.toString("hex")),
        clearRange: () => {},
      };
      return tx;
    },
  };
};
