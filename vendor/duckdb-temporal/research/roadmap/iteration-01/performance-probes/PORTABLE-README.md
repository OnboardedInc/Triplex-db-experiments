# Portable dictionary research evidence

These are standalone research probes, not an implementation patch or native-query speedup. See ../performance.md for the controlled setup, exclusions and interpretation.

PORTABLE-SHA256SUMS covers the retained text sources and raw evidence. The original SHA256SUMS is historical provenance and also records local executable hashes; executables are deliberately not committed. Use sha256sum -c PORTABLE-SHA256SUMS for this portable text set. Empty historical outputs/stderr are retained as evidence, not passed leak checks.

The balanced experiment has 315 exact-checked records per process, 630 total. Reproduce the source with g++ C++17 and the documented flags; timing values will vary on a shared host. The JSON SQL probes include the exact statements and pinned runtime/binary identity. Any future rerun should retain its new raw evidence separately rather than overwrite this captured baseline.

LeakSanitizer is blocked by this runtime's ptrace incompatibility. Address/undefined sanitizer runs explicitly disabled leak detection and passed their limited small-case corpus. No leak-certification claim follows.
