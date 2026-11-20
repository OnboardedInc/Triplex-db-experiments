# Second activation review

The first reviewer summary arrived before the full findings. It identified two launch changes for the six-cell collector.

- Every recorded offer now writes a separate terminal record, including a handled Publish, traffic or observer error. The records carry the exact offer digest and attempt nonce. A process stop can still leave an unmatched durable offer, which precludes a complete observation ledger.
- The deadline probe remains independent of the publisher. A fresh process separately reads three subjects from the current route and at the observed deadline cut. The controller selects the cut and independently authors and evaluates the inputs. The report distinguishes subjects that actually changed from witnesses for an unchanged release. The native preflight exercises both all-change and unchanged releases.
- A receipt records the notice recipe. The stored mode also records concrete changed values. The individual notice clock is separate. The original collector records no value for that clock while the receiver is offline.
