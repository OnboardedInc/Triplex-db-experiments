# Carrier codec research handoff

**Recommendation:** coordinator trial of (C1) a shared after-key payload leaf with public key gate unchanged, plus (C2) immutable private schema-name frozensets. No production patch or timing claim.

Read `RESEARCH.md` for the exact call-graph proof, CPython/DuckDB/paper citations, per-cell mechanism, compatibility limits, negative fixtures, and deferred alternatives.

Evidence:
- `notes/AST-ALIGNMENT.json`: all six source/model alignment checks PASS.
- `notes/preferred-split-prototype-results.json`: all-order/null/domain/late-error/GC-model mechanism checks PASS.
- `notes/public-protocol-audit-results.json`: 72 raising/mutating public-key protocol comparisons PASS.
- `notes/immutable-metadata-hoist-results.json`: all 144 key orders plus 4,320 malformed-key and 1,152 wrong-key cases PASS.
- `notes/profile-summary.json`: derived read-only summary of 42 original diagnostic profiles.
- `SOURCE-INDEX.json`: exact upstream refs, Git blob IDs and verified source SHA-256 hashes.
- `EXPORT-MANIFEST.json` + sidecar: complete UTF-8 source-only inventory; verify with the owned stdlib verifier.

Scope excludes application imports/compilation, native/DB execution, FP-control changes, production edits, Codex launches, user-computer access, Git/Page/PR writes, and timings. Toy guard/GC models do not replace actual FP/store acceptance. DuckDB's V2 C API remains unstable and version-tied.

No additional worker was spawned.
