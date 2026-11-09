# Driver grants and runtime exceptions

North star: integrity of P1–P5 measurements, under `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.
This is the round 5 offline launch profile, superseding round 4's appended output wildcard and host PATH.
The hook remains secondary. No acceptance contract is changed.

## All application permission grants

| Setting                     | Exact scope                                                                                                         | Reason                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--permission`              | Native Node permission checks enabled                                                                               | Enforce the offline application filesystem envelope.                                                                                                                                      |
| `--allow-fs-read=<layout>`  | One fresh inventoried directory; no `*` in any component                                                            | Load the closed artifact, startup audit, secondary guard, metadata, config and run key. Node's directory grant includes descendants; the audit rejects extra files/directories and links. |
| `--allow-fs-write=<output>` | One exact canonical directory, exclusively created by this launch; no appended wildcard and no `*` in any component | Write exclusive HR chunks and `seal.json`. There is no output read grant. Parent and sibling writes are denied; actual sibling-write regression checks the denial.                        |

These are the only `--allow-*` flags. Both exact grants and their reasons are recorded in each layout receipt.
The startup audit checks the actual read and write argv, actual permission state and inventory. It refuses
extra read/write grants, stars in grant paths, host PATH, or undeclared environment keys. Output reuse is
refused even when the existing directory is empty; callers supply a new absent leaf, not a precreated one.
There are no child-process, worker, native-addon, WASI, or inspector grants. `--import` loads the inventoried
audit and guard, in that order; these flags select startup modules, not additional filesystem grants.

## Explicit minimal child environment

Each receipt records the exact environment supplied to `spawn`. A fresh child fixture prints its actual
`process.env`; the test requires exact equality with that receipt, under a parent PATH and sentinel that
must not propagate. No parent environment object is spread or inherited.

| Variable                             | Value / reason                                                                                                                                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PATH`                               | Empty. Node is invoked by absolute path and subprocess creation is denied.                                                                                                                                                                                         |
| `NSR_BUNDLE_MANIFEST`                | In-layout manifest path, used by the secondary guard.                                                                                                                                                                                                              |
| `NSR_LAYOUT_SHA256`                  | External inventory hash anchor, checked by the startup audit.                                                                                                                                                                                                      |
| `NSR_LAYOUT_ROOT`                    | Canonical in-layout CWD and only readable directory.                                                                                                                                                                                                               |
| `NSR_FRESH_OUTPUT`                   | The exact separate write-only directory; lets HR avoid requiring a read grant for its freshness check, already performed by exclusive parent creation.                                                                                                             |
| `NSR_DARWIN_BOOT_ID` (Mac only)      | Trusted parent captures sysctl boot identity before restriction; diagnostic clock domain.                                                                                                                                                                          |
| `__CF_USER_TEXT_ENCODING` (Mac only) | Canonical `0x<runtime UID in uppercase hex>:0x0:0x0` setting, derived through `process.getuid()`. macOS forces this runtime identity even over a conflicting supplied UID. This makes the actual child environment explicit and reproducible; it is not inherited. |
| `NSR_LINUX_CLOCK` (Linux only)       | Trusted parent's boot ID, time-namespace inode and CLOCK_MONOTONIC domain, inherited by the child; avoids a /proc application read grant.                                                                                                                          |

## Exceptions to a literal whole-process filesystem claim

The boundary claim is about application filesystem access through Node's permission model, with the
inventoried layout and separate output. These explicit runtime/observation exceptions answer the review's
open question; they do not certify whole-OS closure:

- **Trusted runtime/base:** absolute `process.execPath` (also external argv[0]), Node executable and its native
  libraries, OS runtime facilities and native startup accesses are outside the JS input inventory. The receipt
  records executable path and Node version. Review observed macOS logging preferences and native text-encoding
  access. This round does not retrace native opens or claim those dependencies disappeared. G03 must pin and
  isolate its actual trusted Node/base image; the Mac directory test does not establish that image's closure.
- **Output:** the separately owned directory is intentionally outside the read layout. Its exact write flag,
  absolute config/env path and receipt path identify it. Parent creates it; child can write but cannot read it.
- **Stdio:** spawn uses `ignore/pipe/pipe`: fd 0 is `/dev/null`; stdout and stderr are explicit evaluator-owned
  observation channels. No arbitrary parent regular-file descriptors are forwarded. Node/libuv/OS internal
  queues, pipes and runtime descriptors are runtime facilities, not candidate/input file grants. This is launch
  option inspection, not an exhaustive native descriptor trace.
- **Network:** candidate RPC needs TCP sockets to the evaluator-configured endpoints. This Node profile has no
  network restriction; no filesystem grant follows from TCP. G03 networking remains a separate integration
  obligation. Offline regressions use local TCP fixtures only.

Config is evaluator-owned data, not authority for candidate-provided grants. Receipt creation records the
intended profile; the startup audit and actual-child regression check execution. Neither constitutes NS
semantic acceptance or verification of Linux/G03/container behavior.
