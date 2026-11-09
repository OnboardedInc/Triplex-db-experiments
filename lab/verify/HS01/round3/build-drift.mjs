// [CX-VHS01-R3] Why: investigate a build hash mismatch without accepting an arbitrary differing artifact. Rejected: ignoring mismatches as presumed build nondeterminism.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const out = process.env.VHS01_OUT;
if (!out) throw Error("bound runner required");
const base =
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-HS01/r3-final-f7afc1d0-0ccb-4e23-9582-b90be0771d8b-w0-10000-off";
const manifest = JSON.parse(fs.readFileSync(path.join(base, "seed-manifest.json")));
const sha = (x) => createHash("sha256").update(x).digest("hex");
const results = [];
for (const file of [
  "packages/core/dist/runtime/Runtime.js",
  "packages/core/dist/runtime/index.js",
]) {
  const bytes = fs.readFileSync(file, "utf8"),
    lines = bytes.split("\n");
  const imports = lines.filter((l) => l.startsWith("import "));
  const tail = lines.slice(imports.length).join("\n"),
    target = manifest.builds[file];
  let found,
    attempts = 0;
  const check = (a) => {
    attempts++;
    const s = a.join("\n") + "\n" + tail;
    if (sha(s) === target) {
      found = s;
      return true;
    }
    return false;
  };
  if (imports.length <= 9) {
    const permute = (a, n) => {
      if (n === a.length) return check(a);
      for (let i = n; i < a.length; i++) {
        [a[n], a[i]] = [a[i], a[n]];
        if (permute(a, n + 1)) return true;
        [a[n], a[i]] = [a[i], a[n]];
      }
      return false;
    };
    permute(imports.slice(), 0);
  } else {
    check(imports);
    for (let i = 0; i < imports.length && !found; i++)
      for (let j = i + 1; j < imports.length && !found; j++) {
        const a = imports.slice();
        [a[i], a[j]] = [a[j], a[i]];
        if (check(a)) break;
        for (let k = 0; k < a.length && !found; k++)
          for (let l = k + 1; l < a.length && !found; l++) {
            const b = a.slice();
            [b[k], b[l]] = [b[l], b[k]];
            check(b);
          }
      }
    const move = (a, i, j) => {
      const b = a.slice(),
        [x] = b.splice(i, 1);
      b.splice(j, 0, x);
      return b;
    };
    for (let i = 0; i < imports.length && !found; i++)
      for (let j = 0; j < imports.length && !found; j++) {
        const a = move(imports, i, j);
        if (check(a)) break;
        for (let k = 0; k < a.length && !found; k++)
          for (let l = 0; l < a.length && !found; l++) check(move(a, k, l));
      }
    const special = imports.filter((l) =>
      [
        "../Error.js",
        "./DatabaseScope.js",
        "./Capabilities.js",
        "../native/NativeQuery.js",
        "../store/ChangeEmitter.js",
        "../snapshots/SnapshotService.js",
      ].some((p) => l.endsWith('from "' + p + '";')),
    );
    let fixed = imports.filter((l) => !special.includes(l));
    const interleave = (prefix, n, remaining) => {
      if (found) return;
      if (prefix.length === imports.length) {
        check(prefix);
        return;
      }
      if (n < fixed.length) interleave([...prefix, fixed[n]], n + 1, remaining);
      for (let i = 0; i < remaining.length && !found; i++)
        interleave(
          [...prefix, remaining[i]],
          n,
          remaining.filter((_, j) => j !== i),
        );
    };
    if (!found) interleave([], 0, special);
    if (!found && process.argv[2])
      for (let n = 0; n < 3 && !found; n++) {
        const base = fs
          .readFileSync(path.join(process.argv[2], "order-" + n, "runtime/index.js"), "utf8")
          .split("\n")
          .filter((l) => l.startsWith("import "));
        if (JSON.stringify(base.slice().sort()) !== JSON.stringify(imports.slice().sort()))
          throw Error("different import set");
        fixed = base.filter((l) => !special.includes(l));
        interleave([], 0, special);
      }
  }
  if (found) fs.writeFileSync(path.join(out, path.basename(file) + ".seed-build"), found);
  results.push({
    file,
    current: sha(bytes),
    target,
    attempts,
    importLines: imports.length,
    matchedImportReordering: !!found,
  });
}
fs.writeFileSync(path.join(out, "drift.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
