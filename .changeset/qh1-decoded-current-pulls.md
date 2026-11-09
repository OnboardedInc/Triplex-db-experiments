---
"@triplex-build/triplex": minor
---

Allow columnar adapters to decode exact current entity reads directly to Triples, validate decoder-constructed primitive values with an equivalent fast domain check, and add `Triples.reach` (the closure of one subject pull at one basis) with an optional `StorageAdapter.getReachTriples` that a store may answer in one operation.
