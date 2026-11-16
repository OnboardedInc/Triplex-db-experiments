---
"@triplex-build/triplex": patch
---

Retain the backend-assigned record time once per receipt so adapters can release consumed clock entries. Nested receipts and all asserted triples continue to expose the same final record time without changing valid time.
