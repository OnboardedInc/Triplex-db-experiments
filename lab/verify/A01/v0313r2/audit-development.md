# Reviewer auditor corrections

Before source-audit adoption, two assumptions in the new independent audit were corrected. Neither changed reviewed code or a child test outcome.

1. The raw added Q96/Q97 rows have explanatory labels in the first cell (for example `Q96a composition`), rather than a bare ID. The initial ID-plus-pipe matcher failed. The final matcher admits the actual labels while still requiring exactly six added complete rows, literal equality to main, and no removed older row or duplicate.
2. An overbroad assertion initially required claim.mjs itself to equal both parents. The already reviewed contract candidate intentionally carries its GS admission change, so that assertion failed. The final audit requires the merged claim.mjs to equal the accepted candidate byte-for-byte; both evaluator test files must equal both parents byte-for-byte. No claim.mjs hunk is added in this round.

The final source audit was rerun successfully. These were reviewer audit-development checks, not required-gate failures or builder code fixes. All required command observations are retained separately in the new durable attempt directory.

The first new boundary suite passed 4/5; its extra `XTDB_SOURCE_PLAN` key was incorrectly expected to be removed. Neither parent removes that unused key, and rg found no consumer. The corrected check keeps the key and compares its retention with both parents; it still requires every actual cleanup key from both parents and arbitrary QLever planner keys to be cleared, with explicit overrides applied last. The original failed TAP and nonzero final command metadata remain durable; only a separately named fresh recheck can satisfy the added boundary gate. Reviewed assertions were never edited.
