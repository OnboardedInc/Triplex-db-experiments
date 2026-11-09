---
"@triplex-build/triplex": minor
"@triplex-build/triplex-sql": patch
"@triplex-build/triplex-sqlite": patch
"@triplex-build/triplex-postgres": patch
"@triplex-build/triplex-foundationdb": patch
---

Declare exact adapter value domains and reject values outside them with InvalidTripleError before transaction claims. Reject nonfinite numbers, malformed Unicode and lossy JSON; enforce QLever's signed 60-bit integer bound. Store canonical signed 64-bit integers exactly in KV compositions.

Reject decorated sparse arrays, apply XTDB journal nesting limits symmetrically, enforce PostgreSQL whole-millisecond datetime admission, and check FoundationDB encoded META/index/journal mutation budgets before claims are flushed.
