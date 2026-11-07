# Process birth observations across timezones

`processIdentity` previously inherited the caller's timezone when asking `ps`
for `lstart`. A local-time outer controller and a UTC worker could therefore
observe different birth strings for the same live PID and refuse its admission.
This was an identity-observation defect, not evidence that the controller died.

The current [owning call](../../qualification/devloop/io.mjs) supplies UTC and
the C locale to that `ps` child. PID validation, zombie refusal, state handling,
owner schemas and reservation rules are unchanged. The ordinary entrypoint now
works without an outer `TZ=UTC` workaround:

```sh
tools/bootstrap/with-env.sh node --max-old-space-size=256 scripts/triplex-devloop.mjs execute --job JOB --executor OPERATOR
```

The isolated [six real owned-PID controls](../../qualification/reviews/controller-process-identity-utc-v1-independent.json)
retain the old UTC/New_York/Tokyo discrepancy and prove the new observation is
stable across those caller environments and locale changes. The integrated
[independent review](../../qualification/reviews/controller-process-identity-utc-integrated-independent.json)
verifies all 42 prior controller cases plus six portable controls, including an
actual New_York outer controller admitted with its UTC worker. Attempt
`devloop-process-identity-utc-integrated-v1/0001` passed all 48 checks; its
terminal hash is `f19571d1056c54b399ffd14b4958882dc1e9ea19aba5b13909f8ae8e803c0fc6`.

Before integration there were no active clients, held Mac owners or canonical
lock. All 187 pre-existing job records, owner reservations, old event prefix,
released registry record and stale-lock bytes were retained. Historical birth
strings contain no timezone; none was converted or retrospectively accepted.
The isolated patch, original source and read-only audit remain under
[the draft](../../.artifacts/controller-process-identity-utc-v1/CONTRACT.md), and
the preserved pre-integration journal/source remain under
[the integration record](../../.artifacts/controller-process-identity-utc-integration-v1/quiescence-before.json).
Earlier failed admissions and instructions using explicit outer UTC remain
evidence of their own as-run environments. Docker identity proofs are separate.

This was a finite controller maintenance gate. It proves no backend transaction,
native cancellation, capacity or performance result, and establishes no serial
performance policy.
