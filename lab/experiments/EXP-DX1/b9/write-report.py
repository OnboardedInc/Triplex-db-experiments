# [DX-B9] Why: tables copy retained fresh observations, with explicit missing holds rather than invented values.
# Rejected: hand-transcribing a rounded best repeat or promoting diagnostic summaries to acceptance.
import json,pathlib
here=pathlib.Path(__file__).resolve().parent
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9')
def table(name):
 p=root/name/'summary.json'
 if not p.exists():return '\nPENDING: '+name+' has no verified summary.\n'
 v=json.loads(p.read_text());out=['','| Arm | Phase | Pulls/s | Read p50 / p99 ms | Read gateway cores | Pulls/CPU-s | Commit p50 / p99 ms | keepAwake |','|---|---|---:|---:|---:|---:|---:|---|']
 def n(r,k):return f'{r[k]:.2f}' if k in r else '—'
 for r in v['rows']:
  out.append(f"| {r['arm']} | {r['phase']} | {n(r,'pullsPerSecond')} | {n(r,'readP50')} / {n(r,'readP99')} | {n(r,'gatewayCores')} | {n(r,'pullsPerCpuSecond')} | {n(r,'commitP50')} / {n(r,'commitP99')} | false |")
 out.append(f"\nHold: {v['holdOutcome']['heldSeconds']} seconds; exit {v['holdOutcome']['exit']}; diagnostic, not acceptance.\n")
 return '\n'.join(out)
def hosts(name):
 out=['\nHost observations (complete wait samples stay in evidence):','```json']
 for file in ['host-before.jsonl','host-lock-acquired.jsonl','host-after.jsonl']:
  p=root/name/file
  if p.exists():
   out.append('// '+file)
   lines=p.read_text().strip().splitlines()
   if file=='host-before.jsonl' and len(lines)>2:out.extend([lines[0],lines[-1]])
   else:out.extend(lines)
 out.append('```\n');return '\n'.join(out)
text='''# DX-B9 report

**A: REGRESSION by the requested non-overlapping-repeat rule, with a busy-host causal limitation.**
The original da77a50a gateway loses frozen 4/64-reader goodput and dense commit p50 versus 19f5422d.
The historical twofold loss/1.7s sparse tail is not consistently reproduced. The optimized report-map-on
prototype still loses at 64 readers; therefore TX2_RECENT_REVISIONS is **off by default**.
The selected default-off frozen repeats overlap the old gateway at every reader count. Absolute quiet-host
bars are not established. All rows have `keepAwake:false`; no keep-awake helper was used.

**B MISSED:** zero fresh 10k ordered-commit executions; zero W0 window16/32/64 throughput/fingerprint runs.
**C MISSED:** zero fresh 64-subject publication replays/profiles; no measured≤30ms result.
**D MISSED:** zero fresh recorded-page CPU replays; no compact form or≤3µs/row result.
Unexecuted B proposals are retained separately from package code. This run does not qualify P5.

## A: original paired comparison

A=19f5422d; B=base e0e6fa6e (gateway file contents equal da77a50a). Both arms use the same
built TypeScript driver, lean layout,2,000-subject graph and 50,000 fill commits, with no manual index
job request. Each 30s phase runs A1 B1 A2 B2 in one lock hold. This is not an hour-apart comparison.
Gateway source manifests can have different serialized hashes across holds; their path→digest contents
are retained and identify the actual bytes. Both repeats of each arm follow.
'''
for name in ['frozen-2','mixed-2']:text+='\n### '+name+'\n'+table(name)+hosts(name)
text+='''
The original frozen4-reader A range is4818–4933 pulls/s versus B3332–4754;64-reader A6342–6542
versus B4375–5750. Dense commit p50 A6.97–7.89ms versus B8.80–9.05ms. Those ranges do not overlap.
256-reader and moving-read ranges overlap; do not label those rows regressions. Sparse Poisson p99
also overlaps. Busy-host variation within a hold limits causal attribution even with alternation.
The original moving hold had a quiet precheck before lock contention but an immediate busy sample;
it did not repeat the full20-minute wait at lock acquisition. That deviation is retained, not called quiet.
Sparse rows include the known8–10ms/hop VM wake penalty; back-to-back numbers are shown alongside.

## A: diagnosis and selected implementation

Frozen B1 at256 readers has1,440 execution samples,112 without a gateway caller:

| Leaf | Gateway caller | Samples |
|---|---|---:|
| PersistentArrayMap.indexOfObject | reach/read-entity |152|
| Util.equals | entity-cache/lookup |94|
| HashMap.putVal | reach/build-response |85|
| AbstractStringBuilder.append | reach/append-string! |51|

Raw JFR and stack-depth128 compressed JSON, with phase boundaries and omitted/truncated-stack counts,
are in profiles-frozen-2 and profiles-mixed-2. Both read/write gateways and the transactor were
recorded in B1. Mixed write samples are sparse:127 dense,29 quiet,84 loaded. They do not prove
an added consumer wait on writes. storage/commit! does not wait for its own report consumer after
transact returns. Transactor samples have no captured gateway caller; do not invent one.
Dense B1 write-gateway phase:127 samples,49 without a gateway caller,zero truncated stacks.
Leading captured pairs are json/read_escaped_char→main/request_json (3),
PersistentVector$ChunkedSeq.next→lean/decode (3), and storage/tx_data$fn__856→itself (2).
This small count cannot identify a write-tail cause. Dense transactor phase:303 samples,all303
without gateway frames,zero truncated; top leaves compare_ex (15),Util.equiv (13),ConcurrentHashMap.get (12).
No publication workload was profiled, so these are A profiles, not C attribution.

Changes:

- Fixed-field ReadConfig replaces linear hot map lookup. ParsedKey uses a captured config-generation
  identity and primitive long entity/revision equality; historical cuts and recreated scopes remain distinct.
  It remains a ConcurrentHashMap with exact equality, not an unverified eid-only primitive map.
- The report-fed revision map is opt-in (`TX2_RECENT_REVISIONS=1`, or JVM
  `triplex.recentRevisions=true`). Default feed notification remains; no recent state is allocated.
  Default reads use the exact cut-memo path without report-witness volatile/closure/miss overhead.
- Mandatory gates exposed an H6 W0 fixture with no backend URL, then a real multi-root ordering
  mismatch. The fixture now observes the actual built client and fallback; all old row/order/basis,
  one-request and65-row assertions remain. sweepRows restores portable root-frontier BFS order and
  rejects unreachable nonempty bodies. This compatibility repair adds traversal cost; it is not D's
  compact-row optimization and must be accounted for in a future P5 end-to-end measurement.

The enabled prototype's final-frozen-1 had64-reader A6072–6535 versus B5031–6062 pulls/s;
p99 A26.66–29.17 versus B29.86–40.66ms. Therefore the requested every-row bar was not met.
That attempt remains a rejected optimization; its passing development gates are not substituted for
fresh selected-default gates.

'''
text+='\n### Rejected report-map-on prototype (final-frozen-1)\n'+table('final-frozen-1')+hosts('final-frozen-1')
text+='''
## A: selected-default paired comparison

A is19f5422d; B is stage-default1/B. Every arm clones one sealed 207MB B9 seed volume, checks
identical physical file-name sets and SHA256s before startup, and starts with logical head 52,039.
A gateway may install metadata transactions, so native t can advance (B's extra2 retained in driver
reports); this is not relabelled as business commits. Every worker hashes all 2,000 warm root JSON
answers and B1/A2/B2 must match fresh A1 counts, bytes and digest. This proves those returned JSON
answers, not arbitrary native metadata equality. Different metadata may affect head-read cost; this
is a limit on attributing tiny residual differences. No manual index request was issued; absence of
all automatic index work was not independently established.
'''
for name in ['default-frozen-1','default-mixed-1']:text+='\n### '+name+'\n'+table(name)+hosts(name)
mixed_summary=root/'default-mixed-1/summary.json'
if mixed_summary.exists():
 v=json.loads(mixed_summary.read_text()); selected=[r for r in v['rows'] if r['arm'].startswith('B')]
 text+='\nSelected B ranges (service latency, busy-host classification follows host lines):\n'
 for phase,metric,bar in [('backToBack','commitP50',4),('quietPoisson','commitP99',50),('readPoisson','readP99',100)]:
  values=[r[metric] for r in selected if r['phase']==phase]
  assert len(values)==2
  text+=f'- {phase} {metric}: {min(values):.2f}–{max(values):.2f}ms; ≤{bar}ms observed in both repeats: {max(values)<=bar}.\n'
text+='''
Selected frozen ranges overlap at 4/64/256; no measured default-off speedup or regression under
the supplied rule. Busy-host absolute256-reader goodput4339–5464 pulls/s and p99115.7–168.9ms
miss7,500/100ms. This is not a quiet-host capacity claim. Quiet Poisson≤50ms, moving p99≤100ms
and dense p50≤4ms are assessed only from the selected mixed table, not borrowed from historical runs.

CPU columns are the measured read-gateway cgroup CPU. Dense/sparse no-reader columns therefore
show mostly idle read-gateway work, not the write gateway's CPU cost. The inherited B7 mixed harness
did not retain per-phase write-gateway CPU; that requested metric is missing. Writer request diagnostics
and JFR remain available, but are not a substitute for that counter.

## Developer gates and exactness

'''
gate=root/'tx2-dxb9-a-default1-short-gate-union.json'
if gate.exists():
 g=json.loads(gate.read_text());text+=f'''Fresh selected-source developer gates passed (not lab acceptance):

- Full package suite both layouts:24 short files,184 legacy tests;182 lean tests plus2 preexisting expected skips.
- Four long files per layout,9 tests each: existing concurrent commits (including3,200 commands), reach,
  clock order and record-time peer cases. No strict per-client10k test claim.
- All300 layout-differential scenarios: {g['comparisons']:,} comparisons and {g['rowClosures']:,} row closures;
  three contiguous RNG shards with retained states.
- {g['nativeAssertions']:,} native assertions, including8 new cache-key assertions and unchanged head/feed/selftest,
  recent/lifecycle/hot checks. Recent-specific native suites opt in; package/default native tests do not.
- TX2_ENTITY_CACHE_VERIFY equivalent JVM property enabled: positive hits, all hits verified, zero errors,
  bounded budgets and zero recent-cache hits/bytes on default. Cache statistics are in the gate union.
- Exact captured gateway plus {g['sdkAndTestFilesVerified']} SDK/build/test files checked against current bytes.
  Child exits, independent short/long cleanups, source preimages and proxy≤64 physical connections checked.

Short hold {g['cleanup']['heldSeconds']}s; long hold {g['longAttempt']['cleanup']['heldSeconds']}s.
Build and TypeScript checks passed (final-a-build.log, final-a-typecheck.log; SDK order repair build retained).
These are builder development checks; independent reviewer qualification remains outstanding.
'''
else:text+='PENDING selected-source gate union. No step-A promotion is authorized by this report yet.\n'
text+='''
PASS/verdict/receipt sites and their content/freshness/binding checks are listed in [PASS-AUDIT.md](PASS-AUDIT.md).
Cleanup receipts use semanticVerdict:null. A successful command is never treated as semantic acceptance.
Failed early runs and rerun reasons are in [FAILURES.md](FAILURES.md), with all raw failures retained.

## B, C, D and the remaining P5 wall

B's package code is unchanged. draft/ and apply-step-b.py are unexecuted proposals for per-client
bounded buffering, deadline suffix failure and explicit retry; strict-order.test.ts.draft proposes10k real
commits with64 in flight and random delayed arrivals. No observed positions or fresh W0 fingerprint
were produced. They require review and integration before running, including avoiding proxy-induced
gap deadlock when64 blocked requests compete for32 upstream sockets. Do not merge them as a fix.

C's per-entity checks, prefix lookups, journal copies, outbox/identity preconditions, payload and
Postgres costs were not attributed or changed. Historical165ms/64-subject publication still means
about2.58 transactor seconds per second at1,000 subjects/s, not fresh B9 evidence. No optimal batch
size or alternate exact route was established. D still lacks recorded-page replay, raised root bound
and compact projection; historical17µs/row and64-root cap remain unresolved. BFS order compatibility
adds work that the next P5 measurement must include. Ordering, publication and row encoding therefore
still stand between this lane and1,000 subjects/s. No answer/precondition/test was intentionally weakened.

The budget went to A's paired runs, failed-harness diagnosis, immutable clone proof, preexisting W0
integration failures, and repeated full source-bound gates. B–D are incomplete, not accepted by proxy
from A. No full north-star/acceptance run, quiet-host target qualification,10m/100m scale run or P5
publication fingerprint was performed. No merge, push, deployment or release was attempted.

## Reproduction, evidence, ownership

Evidence root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9/`.
See [EVIDENCE.md](EVIDENCE.md) and SHA256SUMS for final size, immutable captures, commands,
failures, profiles, cleanup and manifests. Raw files stay outside git (including any file>1MB or raw
directory>5MB). No downloads; existing pinned image tx2-datomic:1.0.7745-da00 and local Postgres
image were used. Offline frozen install used the owned pnpm store. No global cache/config, colima,
shared resident, forbidden port, original H5 seed volume or unrelated directory was modified.

SOURCE-CHANGES.json records every changed package path with old/new SHA256 against base e0e6fa6e.
PIN-CHANGES.json and the literal pin-path search record no matching changed path under lab/acceptance;
no acceptance file or pin was edited. Stage-default1 holds actual working-tree/source/build bytes,
not a forged claim that a later commit existed at measurement time. Engine/container/image, mount,
resource, CPU and durability observations remain in stack metadata. keepAwake:false throughout.
'''
(here/'REPORT.md').write_text(text)
print(here/'REPORT.md')
