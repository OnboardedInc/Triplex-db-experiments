import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

// [DX-THIN1] Why: the second machine's driver found two launchers that the first-offer dry run could not reach.
// Rejected: trusting each wrapper's environment by reading it once; a later edit to `env -i` would drop them again.
const read = (file: string) => fs.readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("wrappers that clear the environment pass every dry-run variable through when it is set", () => {
  for (const wrapper of ["jvm1/cold-server.sh", "jvm1/startup-server.sh"]) {
    const text = read(wrapper);
    assert.match(text, /exec env -i /, wrapper);
    for (const name of ["DX_DRY_RUN_FIRST_OFFER", "DX_DRY_RUN_LOG", "DX_DRY_RUN_DOCKER", "DX_DRY_RUN_FAKE"])
      assert(text.includes("${" + name + ":+" + name + "=$" + name + "}"), wrapper + " " + name);
  }
});

test("the restart campaign and the import launcher stop at their first offer in a dry run", () => {
  assert.match(read("jvm1/startup-server.ts"), /firstOffer\("startup-read " \+ arm\);\n\s+const preStart = now\(\)/);
  assert.match(read("load1/fair-campaign.ts"), /firstOffer\("fair-import " \+ label \+ " " \+ cell\);\n\s+const \[writes, reads\] = await Promise\.all\(\[\n\s+play\(/);
});
