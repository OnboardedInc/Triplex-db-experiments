# EXP-F02 wire exactness: report (saved by the orchestrator from the agent's hand-back, 2026-11-07)

**Result: partly falsified.** The ProjectionSpec rules mostly hold, but several paths change values silently where the spec says the
value is exact, one of them in the ledger itself.

- Branch `exp/F02-wire-exactness`, commit 4c12234 on main 26b3b9d; merged to main (lab files only) as 7247c82.
- Falsifier: `lab/falsifiers/wire/{domain,lib,run}.mjs`, 123 values over 10 kinds on both engines (ledger, projection encodings, native
  decode and parameters, ordering). Records: `results.json` in this folder (1,744 records).
- Run note: another agent recreated `tx2-qlever-dev` during the first run, so QLever ledger reads came back empty; QLever was rerun alone
  and came back clean; the XTDB records are from the first run.

## Critical silent changes
1. **JSON loses -0 on both engines, ledger included.** `packValue` uses `JSON.stringify`, and `CanonicalJson` normalizes -0. Other floats
   inside JSON stay exact (R01 open item 2 settled).
2. **XTDB card-many DOUBLE sent as a JSON parameter turns -0 into 0** (R01 open item 1). Writing `ARRAY[CAST(? AS DOUBLE PRECISION) ...]`
   keeps -0 through both reads. The JSON parameter also cannot carry int64.
3. **instant -0 becomes 0 on both engines.**
4. **XTDB TIMESTAMPTZ read with the driver defaults turns year 0001 into 2001 and drops microseconds.** Reading text is exact.
5. **QLever ledger `_native` shadows are flagged exact but export changed values** (-0, `%.13g` rounding, 1731000000123.5 read back as
   ...124). Cause: `numericShadowIsExact` (packages/qlever/src/rdf.ts:83) repeats the F1 bug.

Typed rejections: native reads of date and instant fail on both engines; a typed rejection is acceptable under Sam's rule.

## ProjectionSpec rules wrong or missing
1. json has no rules: it needs "finite, no -0 inside the value", and `approximateNumbers: "reject"` misses binary64 inside List and Struct.
2. instant needs `NoNegativeZero`.
3. XTDB list rules are correct only with array-cast writes; the spec should pin that encoding.
4. XTDB date and instant rules hold only with text reads; the spec should pin that too.
5. The `integer` range rule is wider than its safe-integer domain (harmless).

## Confirmed correct
- `native` ordering for number, integer, int64, date and instant on both engines; `order-key` text ordering is needed on both.
- XTDB valid-time rules; full int64 on XTDB; the QLever 60-bit and double rules (conservative but needed: QLever equality collides on
  values outside them).

## Orchestrator follow-up
Rulings Q30a to Q30e in `lab/acceptance/RULINGS.md`; fixes dispatched as EXP-F02b.
