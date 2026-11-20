# DX-PLAY1 plan

**North star** P1/P4 exact current and earlier records, P2 save and retry receipts, P3 resumable live observations, and P5 release activation with first-answer and background progress. Laptop timing is diagnostic. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md).

Target command from the repository root

```sh
pnpm playground start
pnpm playground stop
```

1. Package a portable local bootstrap. Reuse the split Datomic/SQL topology and vendor SQL initialization from `stack/up.sh`, the checked distribution pin in `lab/config/datomic`, and the existing Clojure gateway entrypoints. The bench launcher assumes an image, lab socket, CPU placement and measurement host tools. Share the new small-stack launch between the portable CLI and an `engine.mjs` exclusive-slot adapter for the lab gate. Publish only loopback ports. Track and remove the resources created for this run.
2. Commit one reproducible, checksummed, compressed synthetic fixture and its TypeScript generator. Use one Datomic scope with account-qualified person identities, several months of edits and an initial published release. A larger fixture can be generated locally.
3. Use the public TypeScript Datomic client, its tracing, native-query grammar, exact-position reads, journal, write receipts and feed. Preserve the existing erasure guard. Expose a clear unavailable result if the base cannot enforce erasure on all playground routes. Reuse the merged release evaluator and outbox writer where the demo domain calls for them.
4. Follow the existing dashboard's JSON-backed workbench, temporal view and loopback origin checks, the HTTP example's served contract, the CLI's stable JSON action envelope, and the demo's deterministic seed. The old dashboard's composition points at the original Triples model and its learning fixture. Build the playground view under its own host using the single action table for the browser, OpenAPI and both MCP transports.
5. Run the product API gate with the pool-admitted stack and the browser journey through Playwright. Inspect the raw values, timestamps, operation identities, status and resource inventory. Retain gate evidence and record individual limitations.

Use existing workspace Effect, Datomic and HTTP dependencies and existing TypeScript and Playwright tooling. Reuse the HTTP package to derive the Person schema descriptor directly from the published snapshot. The browser UI and local HTTP host can use the platform, with no additional runtime dependencies. Keep Clojure and acceptance pins intact. Push each completed slice on the playground branch.

## Revised data requirements

The owner kept the local command and API and requested two tiers with one model. The small archive stays in Git. The full generator emits separately checksummed objects and a manifest for a local directory or R2 base URL. This branch will not provision or upload to a bucket. Build the accounts from schema relationships and synthetic values only. Measure a small native load and PostgreSQL dump/restore before forecasting the full build. The full layout has a 100,000-person deep account, a 4-million-person thin account, and smaller accounts. The wide interpretation holds total current fact count roughly equal to the deep account. Retain five weeks and the observed save-rate distribution in the generator. Continuous compliance has a reserved scenario entry.
