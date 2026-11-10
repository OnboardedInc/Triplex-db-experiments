# DX-B6 execution notes

North star: P1 exact record-time cuts and scalable pulls, P2 sparse commit latency,
P3 journal decoding, P4 bounded caches. Goals and targets: lab/SCOPE.md,
lab/NORTH-STAR.md, lab/TARGETS.md.

Correctness runs use the Mac runner against isolated published gateways, with no
more than 64 live published-port connections. Linux Rolldown is unavailable in the
offline dependency cache. Performance runs use built package JavaScript inside
the VM, three reader workers, engine CPUs 0–3 and driver CPUs 4–7. No downloads.

Each gate invocation must run an immutable copy of gates.sh. Never edit a script
already waiting on the lock: Bash may seek its next command at the old byte offset.
The retained lone-a failure demonstrated that mistake. New runner copies, source
preimages, stack manifests and original failures stay in durable evidence.

Use bounded-command.mjs for the test/driver process group. The original g5b run
reached its window limit and removed the stack while test children were still
running; its aggregate result is failed, including downstream transport errors.
It cannot qualify production source. Final gate batches isolate the expensive
concurrent, differential and peer-lag checks from the package suite.
