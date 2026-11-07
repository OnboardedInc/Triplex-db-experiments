---
"@triplex-build/triplex": patch
"@triplex-build/triplex-sql": patch
---

Preserve exact integer result families for explicitly capable SQL adapters,
including unknown and optional value projections, without changing legacy
dialect admission. Decode canonical int64 text and bigint carriers losslessly;
malformed or unsafe driver results fail through the typed read error channel.
