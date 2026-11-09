# CX-VDF01 source references

Reviewed 2026-11-09; source under review: `bc8a5edb1701ee92b42b8249fbe14ce5f17f652d`.

- Local authoritative scope: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; operating rules: `lab/PROTOCOL.md`.
- Local design: `lab/research/R29-datomic-lane-design.md`, section 4.2 identity mapping and section 6 P3 (queue loss on restart).
  The older Datomic consumer-checkpoint proposal is superseded for DF01 by FD01's host SQLite store, as stated in the brief.
- [Datomic Peer API: tx-report-queue](https://docs.datomic.com/clojure/index.html#datomic.api/tx-report-queue):
  one queue per connection; producers do not block; unconsumed reports use memory. Report delivery follows database update,
  and an originating transaction's future completes before its report is queued. Delivery can therefore lag publication.
- [Datomic Peer API: remove-tx-report-queue](https://docs.datomic.com/clojure/index.html#datomic.api/remove-tx-report-queue):
  removes the connection's queue.
- [Datomic Peer API: db](https://docs.datomic.com/clojure/index.html#datomic.api/db):
  obtains a database value without contacting the transactor or waiting.
- [Datomic Peer API: tx-range](https://docs.datomic.com/clojure/index.html#datomic.api/tx-range) and
  [Log API](https://docs.datomic.com/reference/log.html): inclusive start, exclusive end, transactions carry physical t and datoms;
  the log is available independently of the report queue.

Inference tested here: a delayed report for a transaction before `fromT` is a legal wakeup with no new requested rows. The API
does not guarantee that the first report consumed by a newly waiting HTTP request represents a transaction at or after its cursor.
The existing fake queue is a suitable blocking-queue primitive, but its single scripted ordering does not test this case.
No claim about observed scheduling inside a running Datomic process is made.
