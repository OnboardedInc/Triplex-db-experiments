# CX-VOBS7 round 15 recorded-live evidence review

Reviewed head: `cd56cd9c1587ef5aa4501c266db467ec1beed873`. All work here is offline; no container/VM operation.

- `RUN.json`, `*.stdout`, `*.stderr`: original source-bound suite/replay execution. Existing Python/Node suites pass; the initial golden audit retains its failing stdout-only hash assertion.
- `manifest-audit.json`: verified 311 durable files and 256 pre-resize entries; raw evidence remains under `/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01-W/`.
- `replay-input-binding-audit.json`: all 112 consumed input digests match the independently verified manifest.
- `w0-attach-replay.json`, `w1-replay.json`: clean W0 attach replay and all eleven exact W1 refusal sets/per-commit results, tied to source/file/cgroup inputs.
- `w2-replay.json`: all three independently recomputed cost summaries and their exact input hashes; interval-mean and coverage limits stated.
- `w3-replay.json`: fresh full streaming scans, writer counts, hashes and retained-summary limitations.
- `stdout-hash-finding.json`: Low golden stdout-only metadata mismatch. Full-file and scanned-text hashes match.
- `golden-audit.json`: remaining IR/hash/gate checks. `golden-audit.emitted.json` preserves the continuation's original summary, whose stdout hash was copied from the bad manifest field; the final summary labels the recorded claim and actual hash separately. Other audit fields are unchanged.
- `continuation-observed.json`: separately observed 2/2 continuation result and exact source transformation. Its stdout was not redirected; the initial failing TAP is preserved above.
- `harness-pure-controls.json`: exact generated arguments/capabilities/limits; no container created.
- `copy-and-environment-audit.json`: identical primary report copies and current-versus-branch VM configuration labels; does not claim a historical MemTotal observation.
- `SHA256SUMS`: all other files here; check with `shasum -a 256 -c SHA256SUMS` from this directory.

Full findings, acceptance limits and verdict/receipt audit: `lab/experiments/EXP-OBS01/VERIFY-round15.md`.
