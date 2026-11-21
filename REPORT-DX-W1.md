# DX-W1 part 10

Step 1 is an optional compact witness in each eligible save. It holds the save's position, clock and new assertion identities. Enable it with `TX2_SUBJECT_OWNER_HEAD=1` on the numeric ordered writer.
The legacy revision, predecessor and identity checks still decide. The witness is never read to answer a query. Untouched people have no witness, and eligible replacements initialize it without a rewrite.
A native one-field save wrote 24 records on first touch and 25 subsequently, one and two extra. A sealed first replacement wrote 29. The ordered witness was 54 UTF-8 bytes.
The Mac checked exact results before and after the switch. The SQL recovery gate and all 13 sealed removal routes passed in both credit modes. The read timings are diagnostic.
Step 2 would move facts to fresh entities and make the compact current record authoritative. That is the part expected to flatten storage reads.
The fresh rolling6 baseline stored about 454 saves per second at 620 offered. The 8B prediction of 0.36 fetches and 1.21 ms per save applies to the completed design only.
[Design, forecasts, and gate details](lab/experiments/EXP-DX1/w1/OWNER-HEAD.md)

## Audit

- The new ACK field measures the witness only after its exact owner, native transaction, logical position, clock and assertion identities appear in that save's durable native report. The operation, claim, committed revision and journal still own acceptance of the save.
- The native gate compares reference and witness scopes and binds exact rows, prior cuts, stored journal, conflicts, physical retirement and witness bytes to the new scopes. It counts witness datoms at the native t returned by each save.
- The SQL gate checks the actual option and exact witness ACKs, same-person order, exact pinned values and operation and journal receipts after restart. Its parser checks staged and built source bytes, image and attempt, zero-drop append streams, exact native t and database, and append completion before reply. A real appended transaction is required for every checked receipt and no operation exists for a refused append.
- The targeted sealed-removal case checks both exact cuts before and after deletion, the held cut and the stored journal. It binds the exact removal markers, generation and ordering to the fresh protected scope and append t in each credit mode.
- The thirteen-route suite uses the exact sealed assertion written by the head-enabled ordered writer under the named credit policy. Each route has a positive control followed by fresh content or refusal checks at that assertion identity. The runner binds the current source, slot, image, attempt, writer, authority scope, and actual backup and restore. The removal integration is based on `3669bee41`, which carries `db88af534`.
- No acceptance files changed. The owner-head format movement and updated reader remain Step 2. The three-way server command is withheld until that code passes gates.
