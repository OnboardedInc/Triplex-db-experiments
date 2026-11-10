# Short matched design

North star: P1 frozen reads and P2 sparse versus dense atomic commits. Diagnostic only, no acceptance.

`prepare-matched.py` derives the B6 and B7 clients, retaining their original code and a hash manifest. Both arms run exactly
those derived files. B6 runs 200 back-to-back commits, 10 commits at 1/s, then 10 seconds of seeded open-loop Poisson 15/s.
The cold-sparse phase is omitted. B7 retains its 2,000 subjects and warmup; runs random frozen-basis pulls at 4, 64, and 256
logical readers for 5 seconds each. Durations are deliberately small so four fresh stacks fit one 20-minute lease. These
short tails are descriptive, not stable latency estimates. Each seed and final basis assertion is retained.

Native CPU is cumulative `ps time` with the same process identity bound at startup. PostgreSQL descendants are sampled
by the north-star driver; the B7 comparison reports only read-gateway CPU, as its VM original does. Exited short-lived PG
workers can be missed. No quota denominator is used natively. Native and Linux listener settings necessarily differ.
