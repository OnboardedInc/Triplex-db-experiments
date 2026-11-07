# Operating policy

Tags: status:observed, problem:development-loop, goal:6, goal:7, goal:10

Root orchestrates; three max-effort workers rotate implementation, integration
and independent verification. Two or three candidates per lane address the same
measured bottleneck. Aged ready-lane selection and resource vectors admit at
most three heavy trials; no blanket global serial policy applies.

The pool is10GiB plus explicit CPU/disk reservations. Local resident engine/VM
owners count before client jobs. Every production expensive run uses the shared
queue; isolated controller test states are not another capacity pool. The Mac
process-group watchdog observes requested work, but does not prove allocator or
whole-machine memory containment. Co-runner/resource profiles belong in every
comparison. Do not combine timings from different contention regimes.

Process-group ownership was selected to reach actual process execution early;
it does not establish backend ACK, cancellation, history or recovery semantics.
The START handshake prevents command execution before the worker PID is durable.
Parent death closes its control pipe; ordinary cancel/deadline/denial waits for
group termination. Unknown owners retain reservations and forensic data.

First failures are immutable. New attempts may fix identified setup defects or
provide planned replication, with reasons and earlier receipts retained. Changed
source/contract gets a new job id. A different threshold is a new prospective
experiment and cannot pass an earlier failure retroactively.

Promotion is scoped to exact inputs, built artifacts, oracle bytes, public path
and integrated checks. Exit0, model results, a ready server,44 foundation cases
and historical source receipts are distinct from all-five-path qualification.
The comparator uses conservative separation beyond three-run observed variation;
it makes no formal95% confidence or production SLA claim.

Source inspiration in code/query comments includes a pinned reference, the
mechanism, why it fits, adaptation/semantic limits and experiment/wiki id.
Equivalent mechanisms already present are not claimed as new adoption.
