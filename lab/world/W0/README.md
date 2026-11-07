# W0: the frozen synthetic world definition

W0 stands in for Onboarded's real world definition in every Triplex test: the P5 release sweep, the P3 dependency rules and
the domain expectations of the golden scenarios. `SPEC.md` is the only normative text. Everything else here is data or tooling.

## What is in this folder

| Path | Contents |
| --- | --- |
| `SPEC.md` | types, entities, the eleven rules as decision tables with read sets, output assembly, canonical JSON, the sweep population and its coverage floors, the self-review of remaining ambiguities |
| `schema.json` | the attribute and release-parameter tables of `SPEC.md` sections 3 and 5, as data |
| `releases/R1.json`, `releases/R2.json` | the two releases; R2 changes `I9S2`, `DOCEXP` and `MINWAGE` |
| `releases/index.json` | `R1 = sha256:fc4b2c1b...0a2b`, `R2 = sha256:4fe8c3fa...7f98` (full hashes in the file) |
| `cases/` | 45 hand-derived golden cases (`SPEC.md` section 11.2 lists them) |
| `validate.py` | stdlib-only shape validator; it holds no rule logic |

## How to check the folder

```
python3 -I lab/world/W0/validate.py
```

It checks JSON shape and value types, recomputes both release hashes and every work item id and version, checks payload keys, the ordering and
assembly rules of `SPEC.md` section 8 (overdue flags, due obligations, trace order, inputs), confirms each case's declared
positive and negative checks against its expected output, and requires a positive and a negative case for every rule. It never
decides which tasks, obligations, work items or flags a world produces; that is the kernel's and O-DOMAIN's job.

## How implementers use it

1. Read `SPEC.md` only. Do not read the other implementation.
2. For each case, run `op` on `input` and compare `canonicalJson(output)` byte for byte with `canonicalJson(expected)`
   (`SPEC.md` section 9).
3. A mismatch is either a bug in the implementation or an ambiguity in `SPEC.md`. Name the ambiguity against section 14.

W0 is frozen. A change of meaning makes a new world (`W1`) with new releases, hashes and cases.
