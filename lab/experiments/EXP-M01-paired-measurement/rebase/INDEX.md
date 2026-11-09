# CX-M01R evidence

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-M01R/`. SHA256SUMS paths resolve from that root. It contains the raw attempts, gate receipts, content-addressed source/build objects, logs and recompute outputs. No dependency caches.

- `PAIR-xtdb-20261109T065415Z-3e0054`: first failure, EPERM host probe and missing W0 build.
- `PAIR-xtdb-20261109T070024Z-70518f`: interrupted controller retry while replacing nested permit handling. Its raced build/duet finished to raw DONE; no terminal gate receipt. Unqualified; not adopted as PASS.
- `PAIR-xtdb-20261109T070418Z-f081c3`: fresh complete memory A/A; expected gate FAIL; 8 rounds; recompute MATCH.
- Historical receipt `PAIR-xtdb-20261108T010440Z-7fcef1` remains at ../receipts; recompute MATCH is a fresh arithmetic check only.
- `complete-offline-tests.tap`: 50/50 passing. `typecheck.log`: corrected explicit Node types command exited zero (only permit-wait lines). Original optional typecheck invocation omitted --types node and failed; preserved as m01-typecheck.log in durable evidence.
