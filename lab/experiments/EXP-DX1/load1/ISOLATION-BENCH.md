# Import isolation forecasts and bench commands

The forecasts below precede any server run. The 108-second windows replay 50 or 100 offered saves/s across ten accounts, plus five saves/s from the quiet account. Each account also offers five pinned reads/s in the pacing and placement campaigns. The allowance campaign includes a quiet-account-only reference to price the 0.5× allowance. The tail replication uses the original quiet-only read tape. All arms include durable receipts and end before their full feed and stored-row verification.

The one-host controller uses the assigned primary alone. The two-host controller installs the same published revision at both sites. Configure the assigned endpoints as in the [HA1 bench guide](../ha1/BENCH.md). Use a unique campaign tag each time. Both forms acquire the dedicated lease and refuse an unexpected checkout, host allocation or residual stack. In the pair, the live gateway, transactor and PostgreSQL are on A. Isolation puts the importer’s gateway and transactor on B. The shared PostgreSQL stays on A. The separate PostgreSQL is on B. On one host, both stacks share the same host storage device.

| Campaign | One-host command suffix | Two-host command suffix | Predicted server result |
|---|---|---|---|
| Fixed frame explanation at 50/s | `load-tail single-tail one-host` | Use one host for the clock join | 1,700/3,200/4,500 facts/s at 128/500/2,000. Quiet save p99 about 1.3/1.7/3.3×. Allow read p99 about 1.25/1.55/2.1×. |
| Pacing, 1/4/8 ms | `load-frontier-low single-low one-host` | Use one host for the shared lane | At 50/s forecast 0–1,600 facts/s, 1.1–1.4× read and 1.15–1.5× save. At 100/s forecast 0–800 facts/s with any available writer headroom. |
| Pacing, 16/32 ms | `load-frontier-high single-high one-host` | Use one host for the shared lane | At 50/s forecast 1,800–2,500 facts/s, 1.15–1.45× read and 1.3–1.75× save. At 100/s forecast 600–1,300 facts/s. |
| Pacing, half the quiet-alone p99 | `load-frontier-allowance single-allowance one-host` | Use one host for the shared lane | Expect 0–1,500 facts/s at 50/s and 0–800 at 100/s, with abrupt stops if the indivisible minimum stalls. |
| Distinct Datomic writers, one PostgreSQL | `load-split-sql single-shared-sql one-host` | `load-split-sql pair-shared-sql two-host` | 4,200–5,100 facts/s and read/save p99 up to 1.4/1.65× on one host. 5,000–5,800 facts/s and up to 1.25/1.45× on two. |
| Distinct Datomic writers and PostgreSQL | `load-split-pg single-separate-sql one-host` | `load-split-pg pair-separate-sql two-host` | 4,500–5,500 facts/s and read/save p99 up to 1.35/1.55× on one host. 5,400–6,500 facts/s and up to 1.15/1.2× on two. |

Prefix each suffix with `node --import tsx lab/experiments/EXP-DX1/ha1/control.ts`. For example:

```sh
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts load-split-pg single-separate-sql one-host
node --import tsx lab/experiments/EXP-DX1/ha1/control.ts load-split-pg pair-separate-sql two-host
```

For the fixed-width forecast, use 72 ms of native apply at 2,000 business facts from the archived server trace and a 5 ms fixed allowance. Estimated hold is 9.6, 23 and 77 ms. Given a 30.4 ms quiet-only save p99 and uniform arrivals, importing at 3,000 facts/s yields residual-service p99 estimates of about 9, 21 and 70 ms. The original 2,000-fact server trace also saw about 13 ms in a log-writer park, 100 ms for its native envelope and 413 ms for the public cycle. The shorter fixed cost assumes the redesigned compact path and little peer delay. Log bursts, GC and correlated index work can raise those ratios. Read ratios are estimates from shared peer and storage pressure, since pinned reads do not enter the commit queue.

Compare both control bookends. Retain p99 in milliseconds, offered and verified counts, every account's ratio, and import facts acknowledged within the window. A control that misses traffic or a sharp shift between bookends prevents pricing isolation with one pooled number. These small synthetic cells do not exercise the P8 full deep and wide populations. A full-load decision also needs the same open-loop tapes over a verified resident population, with index jobs active.
