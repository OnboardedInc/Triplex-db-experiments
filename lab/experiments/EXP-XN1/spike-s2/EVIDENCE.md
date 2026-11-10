# XN-S2 durable evidence index

Root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/`.
43 files, 92,838,963 bytes. All files are covered by the adjacent `SHA256SUMS`, with paths relative to that root.
The shipped `xtdb.jar` is 92,716,839 bytes and intentionally stays outside Git. No acceptance evidence is claimed.

| Files | What they establish |
| --- | --- |
| `images.json`, `image-files.txt`, `xtdb.jar`, `copy-lib.log` | Local image identities, effective image filesystem and copied shipped classpath; no `lib/` directory |
| `jar-inspection.json`, `jar-inspection-console.txt` | All 50,941 jar entries inspected for Kafka/object-store names and XTDB ServiceLoader registrations |
| `config-container-id.txt`, `config-container.json`, `kafka-config-start.log`, `kafka-config-start.exit` | Fresh writer config parse fails on missing `!Kafka`; exact container/image/caps and exit 1 |
| `inspection-window.json`, `inspection-window-ended.txt` | First owned hold's timestamps and keep-awake flag |
| `source-binding.json` | Inspection scripts/YAML hashes at preparation commit `444e1f668046025b4a61701eb03ec24a11b20946` |
| `cooldown-attempt1.json`, `source-binding-2.json` | Pre-admission runner defect retained and corrected runner source at commit `44edb2e7` |
| `kafka-container-id.txt`, `kafka-container.json`, `kafka.log`, `kafka-ready.txt`, `kafka-topics.txt` | Broker-only startup, final identity/caps/mounts/environment, ready log and empty topic metadata |
| `kafka-window-started.txt`, `kafka-window-ended.txt` | Second owned hold, 82 seconds |
| `kafka-sample-{0..6}.txt`, `kafka-sample-{0..6}-time.txt` | Seven raw cgroup CPU/memory and log-directory-size samples across 60 seconds |
| `kafka-summary.json`, `summary-console.txt`, `analysis-binding.json` | Diagnostic arithmetic, exact analysis helper hash and container/source binding; no PASS |
| `cleanup-containers.txt`, `cleanup-volumes.txt`, `cleanup-networks.txt`, `cleanup-observed-at.txt` | Empty task-prefix resource listings after exit-trap cleanup |

Verify from the worktree:

```sh
node lab/bin/heavy.mjs --label XN-S2-manifest-verify -- bash -c 'cd /Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2 && shasum -a 256 -c /Users/sam/projects/triplex-db-2/.claude/worktrees/xn-s2/lab/experiments/EXP-XN1/spike-s2/SHA256SUMS'
```

The report contains the measured limitations and observation audit. Source files in this directory are the standalone probes; no shared engine or lab tools were modified.
