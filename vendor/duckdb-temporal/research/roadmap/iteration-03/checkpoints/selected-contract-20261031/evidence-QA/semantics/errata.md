# Recovery QA errata — originals preserved

2026-10-31 UTC. These annotations apply only when reading the immutable recovered
IR/safety drafts. No original or snapshot was edited.

1. **Safety `hazards.md`, H02:** “four inactive NULL slots” should read **three
   inactive payload slots**. The carrier is `tag` plus four payload fields;
   exactly one payload is selected/non-NULL and the other three are NULL.
   Evidence: source `storage/typed_store.py:158–167` and `schema_v2.sql:23–48`,
   independently hash-checked against the IR lane receipt. This does not change
   H02's substantive warning: inactive NULLs are not language NULL values, and
   ordinary per-field `=` conjunction is not a correct whole-carrier identity.

2. **Safety `research.md`, Scope and provenance:** the draft names
   `inspected-source.json`, but that file is **not present in the recovered
   input manifest**. Do not cite it as a delivered artifact. The recovered IR
   `local-source-receipts.json` does exist; this QA independently verified its
   17 listed project files, including the supplied export-manifest SHA, and
   records that work in `project-source-verification.json`. This is a new QA
   check, not a claim that the missing safety receipt was recovered or written.

3. **Freeze status:** original audit prose anticipates final lane manifests,
   but no original lane final manifest is part of these inputs. The actual
   continuation input is the coordinator's `recovery-0359/SNAPSHOT-MANIFEST.json`
   (SHA256 `849c98fee64ca679ca70d6fbe1ddd133708dc8c1639d4d8d4e5fc28125f59123`).
   Use that identity, plus this QA's own closed-output manifest; do not infer
   an unavailable original freeze succeeded.

The earlier keyed-only `recurring` statement was already corrected throughout
the recovered substantive IR and safety reports. It is history, **not** a
remaining architecture claim: the pinned binder independently binds ordinary
`recurring` references too. No new corpus-expectation contradiction was identified
by this source-text review; every proposed case remains unexecuted.
