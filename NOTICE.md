# Notice

This repository is owned by Onboarded. It holds Onboarded's database experiments, which are built on
a modified copy of Triplex.

## Triplex (Ben Jacobson, MIT License)

[Triplex](https://github.com/bjacobso/triplex) is by Ben Jacobson and is released under the MIT
License. This repository contains a copy of the Triplex monorepo that Onboarded changed in place. It
is a copy, not a dependency, and it is not synchronized with the upstream repository.

The Triplex-derived parts are:

- `packages/cli`, `packages/cloudflare`, `packages/core`, `packages/dashboard`,
  `packages/foundationdb`, `packages/host`, `packages/http`, `packages/postgres`, `packages/sql`,
  `packages/sqlite` and `packages/testkit`
- `docs/`, `examples/`, `assets/`, `e2e/`, `scripts/` and `test/`
- the root documentation and build configuration that came with Triplex, including the Triplex
  sections of `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `SECURITY.md` and
  `CODE_OF_CONDUCT.md`

These parts remain under the MIT License, Copyright (c) 2026 Ben Jacobson. The licence text and
copyright notice are in [`licenses/TRIPLEX-MIT.txt`](licenses/TRIPLEX-MIT.txt) and in the `LICENSE`
file of each Triplex package. Onboarded's changes to these parts are Copyright (c) 2026 Onboarded and
carry no licence yet.

The inherited Triplex documents describe the upstream project's contribution, release and security
process. They do not describe a process for this repository.

## Onboarded's work (no licence yet)

Everything else is Copyright (c) 2026 Onboarded, all rights reserved. No licence is granted yet. This
covers:

- `lab/`, `qualification/`, `experiments/`, `wiki/`, `handoffs/`, `provenance/`, `tools/` and the
  root reports and compose files
- `packages/datomic`, `packages/duckdb`, `packages/qlever`, `packages/qualification`, `packages/w0`
  and `packages/xtdb`

Where these files adapt code from Triplex, the adapted portions remain under the MIT terms in
`licenses/TRIPLEX-MIT.txt`.

## Other third-party material

Material under `vendor/` keeps its own licence. The licence files sit next to the material they
cover, for example `vendor/duckdb-temporal/runtime/native/vendor/LICENSE.duckdb-v2`.
