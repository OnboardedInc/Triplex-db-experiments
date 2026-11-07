/** Tiny `--key value` argument reader for the two runners. */
export function args(argv: readonly string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k]!;
    if (!a.startsWith("--")) throw new Error(`unexpected argument ${a}`);
    const v = argv[k + 1];
    if (v === undefined || v.startsWith("--")) m.set(a.slice(2), "true");
    else {
      m.set(a.slice(2), v);
      k++;
    }
  }
  return m;
}

export const intArg = (m: Map<string, string>, k: string, d: number): number => {
  const v = m.get(k);
  if (v === undefined) return d;
  if (!/^[0-9]+$/.test(v)) throw new Error(`--${k} must be a non-negative integer`);
  return Number(v);
};
