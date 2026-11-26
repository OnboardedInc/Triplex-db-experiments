// [DX-SRV2] The held account's compiler stamp (actv-lazy/join/index.ts `selector`: a hash over the classifier, the
// world mapping and the notice code's source bytes). A held account can be published and settled only by a build whose
// stamp equals the one stored at its enrolment (account.ts asserts `m.compiler === selector` before Publish and
// settlement), so a build that edited any listed file refuses accounts enrolled by another build.
//   stamp.ts build                      prints this checkout's stamp
//   stamp.ts check HELD_SETUP_JSON      prints the stamp stored at enrolment (held-setup.json `meta.compiler`) and this
//                                       checkout's; exits 1 when they differ
// The 1 billion archive holds no enrolled account (it is AGE1's sealed cut, head 28,309,866 = the handoff's head); each
// held run enrols on its own prepared copy with the build under test, and the held runner's aged check refuses a copy
// whose head differs from the bundle's before it enrols. session.sh prints the stamp before A5 and A6 and checks it after.
import fs from "node:fs";

const [mode, file] = process.argv.slice(2);
const { selector } = await import("../actv-lazy/join/index.ts");
if (mode === "build") console.log("build stamp " + selector);
else if (mode === "check" && file) {
  const stored = JSON.parse(fs.readFileSync(file, "utf8"))?.meta?.compiler;
  console.log(`stored stamp ${stored ?? "none"}; build stamp ${selector}`);
  if (stored !== selector) { console.error("STAMP DIFFERS: this build cannot Publish or settle the held account; enrol afresh with this build"); process.exit(1); }
  console.log("stamps equal");
} else { console.error("stamp.ts build | check HELD_SETUP_JSON"); process.exit(2); }
