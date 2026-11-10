# DX-S4 storage measurement spike

North star: supporting cost research for P1–P5; storage size is not a replacement for their latency or correctness bars.
Goals remain in `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

`REPORT.md` is the result. All measurements are diagnostic, not acceptance or a product change.
The canonical complete corpus is under `input-all/`; the current-only control is under `input/`.
Raw data stays at `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4/`; `SHA256SUMS` is relative to that directory.

## Repeat a stopped PostgreSQL footprint

```sh
lab/experiments/EXP-DX1/s4/footprint.sh \
  tx2-dxh5-seed-1000-pg-data 1000 42775 442410 89655069
```

The five arguments are volume, business-subject count, command count, row count and canonical-export bytes.
Counts are caller supplied and explicitly labelled; they are not inferred from PostgreSQL key-value row counts.
The authorized input names are the sealed seed above and `tx2-dxs4-*` volumes. The script requires the local
`postgres:17-alpine` image, Node and Python, but does not start or require a Datomic stack.
It refuses a source attached to a running container or not cleanly shut down. It mounts the source read-only,
clones it, obtains SQL sizes on the clone, stops the clone cleanly and removes it.

JSON on stdout distinguishes the source's allocated bytes from the clone's post-stop bytes. Table bytes include
main, index, TOAST and relation auxiliaries; WAL is separate. Both volume and table denominators are printed.
The original sealed volume is never opened by PostgreSQL.

## Other runners

All container commands go through `window.sh`, itself wrapped by `lab/bin/heavy.mjs`. A window acquires the lab
measurement lock, records an owner, enforces a deadline below ten minutes, checks host free space, records source
copies/image identities, cleans up its own resources, and leaves two minutes between this agent's holds.
Use a fresh attempt prefix every time. `window.sh` is internal; only the command patterns below are intended.

```sh
S4_INPUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4/input-all \
  bash lab/experiments/EXP-DX1/s4/launch.sh tx2-dxs4-unique datomic.sh clone
S4_INPUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4/input-all \
  bash lab/experiments/EXP-DX1/s4/launch.sh tx2-dxs4-other batch.sh a b d e xtdb
```

Replace each example prefix with a fresh lowercase name. Variants: `a` indexed row text, `b` unindexed row text,
`c` H6 eight-cell metadata-dropping projection, `c-full` lossless 17-cell row array, `d` dictionary-coded typed bytes,
`e` per-entity aggregate rewritten with each command, `e-nohistory` the same with `:db/noHistory`, and
`f` indexed row text plus a copy per journal. Binary variants include their dictionary in the database.

**`e-nohistory` changes historical query guarantees.** Removing the row index requires replacement lookup and
identity checks. No variant is a ready-to-use gateway layout. **The H6 wire projection removes metadata and changes full-row answers without a replacement metadata channel.**

The clone runner's old-name aliases resolve only to its own containers on its own isolated network; they do not
attach to or contact an original stack. GC is scheduled through the Peer API and storage quiescence is observed;
that observation must not be described as a formal proof that all garbage was reclaimed. The task's `GC older
than now` is for this isolated spike, not a production maintenance recommendation.

Implementation references: the lab XN1/P2X2 pgwire probe (adapted locally as `wire.mjs`),
`packages/datomic/src/rowText.ts` (row encoding), and the installed Datomic Peer API docstrings.
The report links the official Datomic documentation used to interpret the observations.

## Frozen complete-corpus runs

The recorded pages contain 442,196 current assertions. `retired-only.sh` extracts the 214 retracted assertion values from a
fresh SQL clone using a read-only peer. `prepare.py SUPPLEMENT OUTPUT-DIR` creates the full 442,410-row corpus without
rewriting the current-only control. `verify-corpus.py CLONE-EVIDENCE CORPUS-DIR` checks both populations against native bytes.
`verify-archives.py CORPUS-DIR` verifies archive restoration, and `check-input.py CORPUS-DIR` verifies all source hashes.

Use the launcher for new container runs; it retains immutable source copies before waiting for scheduler admission:

```sh
S4_INPUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4/input-all \
  bash lab/experiments/EXP-DX1/s4/launch.sh tx2-dxs4-UNIQUE batch.sh a b d e xtdb
```

A batch runs stores sequentially, cleans each immediately, and explicitly lists items not started within its hold budget.
Individual component exit/content/inventory records determine which measurements are usable. A partial batch exit is not
acceptance. The public `footprint.sh` also delegates through the frozen launcher.

The complete canonical JSONL is 89,655,069 bytes. The original 97,654,944-byte gateway responses include wrappers and repeated
shared rows and cover current data; choose the intended export denominator explicitly. The script reports it as caller supplied.
