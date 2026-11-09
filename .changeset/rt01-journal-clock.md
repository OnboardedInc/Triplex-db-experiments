---
"@triplex-build/triplex": patch
"@triplex-build/triplex-sqlite": patch
"@triplex-build/triplex-postgres": patch
---

Read transaction journals across all valid time at their committed record-position cut, preserving fixed journal pages when the runtime clock moves backward or behind a transaction's staging time.
