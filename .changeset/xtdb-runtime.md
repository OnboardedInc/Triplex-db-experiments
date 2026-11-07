---
"@triplex-build/triplex": minor
"@triplex-build/triplex-sql": patch
"@triplex-build/triplex-http": minor
---

Add lossless signed 64-bit fact values and schema primitives, typed Datalog arithmetic and exact aggregate channels for capable backends, and replay-safety transaction options with recoverable unknown-outcome metadata for non-interactive commit boundaries. Keep the existing number and integer schema semantics. Legacy backends explicitly reject unsupported extensions instead of coercing values. The HTTP schema bridge carries exact integers as tagged canonical decimal-text objects and retains their digits in request validation, responses and OpenAPI.

Align portable constraint projection with actual JSON pattern-retraction matching while retaining canonical uniqueness identity. Existing adapters may ignore the optional transaction argument. The independent XTDB and QLever backend packages remain private and experimental; their qualification ledger records the open operational, semantic and capacity gates.

Apply constraints through each union branch so exact integer bounds stay lossless alongside legacy numbers, including nested constrained unions.

Preserve recoverable operation and attempt identities in HTTP unknown-outcome errors. The HTTP StorageFamily public union adds integer; exhaustive consumers must handle this new variant.
