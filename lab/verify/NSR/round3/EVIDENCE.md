# CX-VNSR round 3 evidence

Target: `46b3f361d5f0aefe51f0f28af030ba8e56b18a53`.
Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VNSR/round3/`.
`SHA256SUMS` is relative to that root. Raw outputs remain outside git; previous rounds are unchanged.
Retention indexes **536 files / 4,485,958 bytes**, all copied bytes read back, with 22 target-source files
verified before copying. `retention-summary.json` binds exact reviewer tools and the rebuilt host artifacts.

| Evidence                                                                        | Meaning                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `artifacts-2.log`, `artifacts-2b5d2718-fc44-41bf-a065-8148b3df7227/`            | Primary 13-case independent runtime study. Three cases execute candidate marker code: VM evaluation of readable data, later-hook file-module loading and later-hook data-module loading. Ordinary readable-file import and direct data import are refused. |
| `artifacts-1.log`, `artifacts-50977ad4-2f61-46ab-bc82-4d90d3b9d7e3/`            | Earlier 12-case study, preserved; the second study adds the matched readable-file constructor negative control.                                                                                                                                            |
| `checks-1.log`, `check-results.json`, `step-0.*`, `step-1.*`                    | Changed host JS/declaration build and actual command exits.                                                                                                                                                                                                |
| `step-2.stdout`, `step-2.stderr`, `source-observations/`, `F3-*-refused-*.json` | 14 source controls pass: nine builder tests and five independent adapted storage tests. Original cross-device DB and unchecked-WAL cases now refuse before calibration.                                                                                    |
| `later-WAL-*.json`                                                              | Earlier layout snapshot with no WAL; later-created modeled cross-device WAL is refused on a fresh check. The earlier result is explicitly not continuous revalidation.                                                                                     |
| `step-3.stdout`, `step-3.stderr`, `nsr-fresh/`, `p3m-fresh/`                    | Fresh 14/14 guarded NSR/P3M regressions, including the builder runtime controls. Diagnostic fixture receipts remain diagnostic.                                                                                                                            |
| `audit-1.log`, `main-artifact-65095341-dd82-4212-9b26-7b18a5aeee7a/`            | 1,044 retained builder files / 16,873,104 bytes verified. All 21 listed source files equal target. Fresh main executable matches builder SHA256 `ae4dccc256283d8d3078016f5efaa80b8dcaaf8c1869fb84747c6705882761f0`. Changed pinned paths: none.            |

Every executing marker is read back and compared with the expected literal bytes. Negative loader cases require
the relevant graph/permission error, not merely nonzero exit. Each fixture has fresh directories, actual
artifact/support/metafile hashes, retained config/data/candidate bytes and process output. No launcher flags
or support files are changed to make the executing cases succeed.

`vm.Module` and `vm.SourceTextModule` are unavailable in the exact launcher profile; this is recorded as
unexercised VM-module construction, not a successful guard test. `process.dlopen` is refused before the fake
addon loads; no real addon was built. Storage-device changes are modeled on real Mac files, not real Linux
mounts. The report distinguishes the F2 counterexamples from the stock driver's normal RPC behavior.

Reproduction with Node 24.18.0 and installed frozen dependencies:

```sh
node lab/bin/heavy.mjs --label CX-VNSR-r3-repro-artifact -- node lab/verify/NSR/round3/reviewer-artifacts.mjs
node lab/bin/heavy.mjs --label CX-VNSR-r3-repro-checks -- node lab/verify/NSR/round3/reviewer-checks.mjs
node lab/bin/heavy.mjs --label CX-VNSR-r3-repro-audit -- node lab/verify/NSR/round3/reviewer-audit.mjs
```

The runtime launcher and fixture parity require local TCP/boot-identity permissions outside the default
sandbox. Use fresh evidence directory strings for a second `reviewer-checks.mjs` run; its fixed paths preserve
the original attempt. Artifact probes use new UUID roots. No full G0, engine, Docker, actual Linux startup,
VM qualification or release/consumer acceptance is implied.
