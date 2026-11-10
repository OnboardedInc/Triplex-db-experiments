# Large-sweep admission audit

North star: P5 at 10k, no acceptance inferred.

`attempt-large-sweep.sh` preserves `attempt.sh`'s exact owned prefix, fresh arguments, source/build and stack captures, 15/45-minute independent guard, own-container stats, disk observer, and cleanup. Before cloning it reads the stopped qualified source volume read-only and requires two copies plus a 3.5 GB driver/tools reservation to fit 20,000,000,000 bytes. Failure exits before clone allocation and grants no semantic result. The source seed is never modified or removed. No acceptance file changes. The source gate for its launch requires the fresh 10k G0 receipt, exact scope/N/lane/composition, matching current mapper/source hashes, and the sealing receipt/volume identity. All activation gates remain in the original controller; only fully completed post-ACK comparisons permit their PASS entries. Resource admission is not semantic acceptance.
