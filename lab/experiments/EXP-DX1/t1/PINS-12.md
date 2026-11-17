Acceptance is unchanged. Changed pinned paths are identified by path in the authority JSON, even when the authority hash already lagged the branch. The contract builder must re-pin them; no generated authority file was edited.

| Path | Authority / pinned SHA256 | Part-11 base SHA256 | Current SHA256 |
| --- | --- | --- | --- |
| `lab/TARGETS.md` | `lab/acceptance/obligations.json` / `cb30ffeb776a7deb0c885be2968872bcebd7dc05cca1b2cfb5913b809a804d95` | `fd89c0e1885802e496423be0f242ee0ee6d39f9b213012a1015fba7dbca63e7e` | `0200ad2b15f19e8b4bce72e6d78c0de2a33f94ba27b056a21dad6b873cdcf513` |

Explicitly authorized scope wording `lab/TARGETS.md`: old `fd89c0e1885802e496423be0f242ee0ee6d39f9b213012a1015fba7dbca63e7e`; new `0200ad2b15f19e8b4bce72e6d78c0de2a33f94ba27b056a21dad6b873cdcf513`. This is not an acceptance-contract edit. Full changed-path audit: `p12/pinned-paths-12.json`.
