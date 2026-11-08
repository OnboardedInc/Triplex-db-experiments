# W0: the frozen synthetic world definition

W0 stands in for Onboarded's real world definition in every Triplex test: the P5 release sweep, the P3 dependency rules and
the domain expectations of the golden scenarios. `SPEC.md` is the only normative text. Everything else here is data or tooling.
The current version is W0-1.1.2.

## What is in this folder

| Path | Contents |
| --- | --- |
| `SPEC.md` | types, entities, the eleven rules as decision tables with read sets, output assembly, canonical JSON, the sweep population and its coverage floors, the self-review of remaining ambiguities |
| `schema.json` | the attribute and release-parameter tables of `SPEC.md` sections 3 and 5, as data |
| `releases/R1.json`, `releases/R2.json`, `releases/R3.json` | the three releases; R2 changes `I9S2`, `DOCEXP` and `MINWAGE`; R3 changes only `OT`, scoped to ten listed jurisdictions |
| `releases/index.json` | `R1 = sha256:fd57551a...b031`, `R2 = sha256:7d2f4008...07a9`, `R3 = sha256:f345d9fe...312e` (full hashes in the file) |
| `cases/` | 136 hand-derived golden cases (`SPEC.md` section 11.2 lists them; 11.1 gives the file forms) |
| `expected-sha256.json` | the SHA-256 of `canonicalJson(expected)` for every case |
| `validate.py` | stdlib-only shape validator; it holds no rule logic |
| `SHA256SUMS` | the SHA-256 of every other file here (`shasum -a 256 -c SHA256SUMS` from the repository root) |

## How to check the folder

```
python3 -I lab/world/W0/validate.py
```

It checks JSON shape and value types, recomputes the three release hashes and checks R3's scope, recomputes every work item id
and version, matches every delivery, item state and projection entry to a record's work item, asserts the raw token text of
every case whose tokens a JSON round trip would rewrite, checks payload keys, the ordering and assembly rules of `SPEC.md`
section 8 (overdue flags, due obligations, trace order, inputs), confirms each case's declared positive and negative checks
against its expected output, requires a positive and a negative case for every rule, and recomputes `expected-sha256.json`.
For `synthetic` cases it checks shapes and output order only, and for `inputBase64` cases that the bytes are not a JSON text.
It never decides which tasks, obligations, work items or flags a world produces; that is the kernel's and O-DOMAIN's job.

## How implementers use it

1. Read `SPEC.md` only. Do not read the other implementation.
2. For each case, hand `op` the input bytes as written in the case file (or the decoded `inputBase64` bytes), and compare the
   SHA-256 of the output bytes with the case's entry in `expected-sha256.json`. Comparing against `expected` re-serialized by
   your own writer hides a writer defect (`SPEC.md` 11.1).
3. A mismatch is either a bug in the implementation or an ambiguity in `SPEC.md`. Name the ambiguity against section 14.

W0 is frozen. A change of meaning makes a new world (`W1`) with new releases, hashes and cases.

## Changes

| Version | What changed | Cases |
| --- | --- | --- |
| W0-1.1.2 | No change of meaning. Readings A01 to A15 written in (RULINGS Q53, Q57), with O-DOMAIN's reading that `publish` and `receive` integers have no upper bound; the canonical writer for values that are not W0 values (SPEC 9 item 7); code point order for strings (8.7); V-D01 notes N1, N2, N5 (Q48c); the `inputBase64` and `synthetic` case forms and `expected-sha256.json`; `validate.py` reads integer tokens of any length and values of any depth. C01 to C87, the releases and the 100k fingerprint are byte-identical to W0-1.1.1. | C88 to C136 added |
| W0-1.1.1 | R3 scoped to ten listed jurisdictions (Q44b); re-review fixes (Q44a, Q44c, Q44d). Pinned in contract 0.3.8. | C83 to C87 added; C54, C55, C68, C76 changed |
| W0-1.1.0 | Ballast to P4's world sizes, the two-hop wage floor, `publish` and `receive`, R3, the seeded population (Q40, Q42). | C46 to C82 added |
| W0-1.0.0 | First version: eleven rules, R1 and R2. | C01 to C45 |
