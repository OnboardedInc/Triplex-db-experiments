const seed = 430e6;
const specs = {
  EAVT: { population: (n) => n, datoms: 3000, fanout: 2400, bytes: 30 },
  AEVT: { population: (n) => n, datoms: 2740, fanout: 2400, bytes: 24 },
  AVET: { population: (n) => 0.99 * Math.min(n, seed) + 0.90 * Math.max(0, n - seed), datoms: 2510, fanout: 1000, bytes: 28 },
  VAET: { population: (n) => 0.00040 * Math.min(n, seed), datoms: 2600, fanout: 2400, bytes: 32 },
};

export function predict(n) {
  return Object.fromEntries(Object.entries(specs).map(([index, s]) => {
    const leaves = Math.ceil(s.population(n) / s.datoms);
    const dirs = Math.ceil(leaves / s.fanout);
    // [DX-AGE1] Why: the pinned Pro implementation keeps a flat root directory array.
    // Rejected: pretending a root with many boundaries recursively gains levels.
    const directoryBytes = leaves * s.bytes + dirs * (s.bytes + 88) + 88;
    return [index, { levels: 3, leaves, dirs, directoryBytes }];
  }));
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  for (const n of [0.16e9, 0.82e9, 1e9, 2e9, 4e9, 8e9]) {
    const columns = Object.values(predict(n)).map((x) =>
      [x.levels, x.leaves, x.dirs, (x.directoryBytes / 1e6).toFixed(x.directoryBytes < 10000 ? 4 : 2)].join(" / "));
    console.log("|", [n / 1e9, ...columns].join(" | "), "|");
  }
}
