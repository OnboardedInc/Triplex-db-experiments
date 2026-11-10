#!/usr/bin/env python3
"""[DX-H3] Why: publish actual saved values without promoting diagnostic predicates. Rejected: hand-transcribed verdicts."""
import json,pathlib,sys,datetime
base=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3')
real_name=sys.argv[1]
runs=[('Medium',base/'tx2-dxh3-m5'),('10k',base/real_name)]
loaded=[(name,p,json.loads((p/'driver/ns-report.json').read_text())) for name,p in runs]
here=pathlib.Path(__file__).resolve().parent
out=[]
def w(s=''):out.append(s)
def val(x):
 if x is None:return 'unavailable'
 if isinstance(x,(dict,list)):return json.dumps(x,separators=(',',':')).replace('|','\\|')
 if isinstance(x,float):return f'{x:.3f}'
 return str(x).replace('|','\\|').replace('\n',' ')
def table(headers,rows):
 w('| '+' | '.join(headers)+' |');w('|'+'|'.join('---' for _ in headers)+'|')
 for row in rows:w('| '+' | '.join(val(x) for x in row)+' |')
 w()
def get(x,*ks):
 for k in ks:
  if not isinstance(x,dict):return None
  x=x.get(k)
 return x
w('# DX-H3 — in-VM north-star benchmark')
w()
w('North star: P1–P5 under `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`. PROTOCOL 0b spike. These are diagnostic smoke observations; no acceptance contract, scorecard or promotion changed.')
w()
w('## Result')
w()
for name,p,r in loaded:
 w(f"{name}: **{r['status']}**, {len(r.get('phases',[]))} phases and {sum(len(v.get('bars',[])) for v in r.get('priorities',{}).values())} printed bars; {len(r.get('engineSamples',[]))} engine cgroup samples. Oracle: `{get(r,'oracle','status')}`. Client saturation flag: `{get(r,'client','invalid')}`. Source-bound raw report: `{p}/driver/ns-report.json`.")
 w()
w('DONE means reporting completed, not that the bars pass. MET below means only that the stored local predicate was true. A failed feed, incomplete history, missing oracle/head or client saturation prevents acceptance regardless of individual predicates.')
w()
table(['Run','Seeded subjects','Reads','Correct','Model violations','Read errors','Feed checkpoint','Feed unreached','Oracle reads / mismatches','Saturated phases'],[[name,get(r,'seed','seededSubjects'),get(r,'correctness','reads'),get(r,'correctness','correct'),get(r,'correctness','violations'),get(r,'correctness','errors'),get(r,'priorities','P3','cursor','position','offset'),get(r,'priorities','P3','notReachedAtStop','count'),[get(r,'oracle','reads'),get(r,'oracle','mismatchCount')],get(r,'client','saturatedPhases')] for name,p,r in loaded])
w('## Implementation and step status')
w()
w('1. VM runner implemented and exercised: `stack/run-in-vm.sh PREFIX [--cpus LIST] [--memory SIZE] -- COMMAND`. Local Node 22.23.2 Linux arm64, same absolute worktree/evidence mounts, stack Docker network, direct write/read gateway URLs. `up.sh --no-publish` exposes no gateway port; the runner refuses published gateways. No workload request crosses Lima SSH forwarding.')
w('2. Engine sampling uses the exact inspected container IDs to resolve host cgroup paths. Read-only `cpu.stat/usage_usec` deltas and `memory.current` retain each container and the sum. The client has no Docker socket or Docker CLI. Datomic maintenance uses request-index/sync-index jobs; driver log collection says not collected in VM mode. The host retains actual Docker stdout logs after the run.')
w('3. Both SQLite databases and every driver output live on `<prefix>-driver`, mounted at `/driver` and the lexical worktree path `runs/DX-H3-vm`. This satisfies the output-path check while using VM disk fsync. All output files are copied to durable evidence even on command failure. A failed copy retains the volume/container.')
w('4. Publication witnesses validate tagged final position, safe integer delta, `final = submitted + delta` and response operation ID. The observer publishes the final position before the caller ACK. Driver model/ACK/RYOW/lost-ACK/oracle maps name commits with `receipt.position`. The shifted-response unit test passes.')
w('5. Functional f3 and f5 reached DONE. The final medium and real-size profiles are above. Every actual error, incomplete phase, missing prerequisite and bar miss remains a finding; no package source was edited.')
w()
w('Additional harness fixes were necessary: wait up to five seconds for the actual publication witness when a feed response wins the HTTP race; bound individual stalled polls and consecutive failed polls at the existing 120-second catch-up budget; retain nested source errors; retain seed ancestry for every member of a recorded history batch and late-growth receipts; reject oracle cases with unknown retractions; report an unavailable final source head as null and invalidate the run rather than discard its measurements; refuse history flatness without complete depth growth; require real post-capture mutation receipts, not unchanged worlds alone.')
w()
w('## Exact commands and resources')
w()
w('```sh\npnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store\nnode lab/bin/heavy.mjs --label DX-H3-build -- node_modules/.bin/turbo run build \\\n  --filter=@triplex-build/triplex-datomic... --filter=@triplex-build/triplex-qualification... \\\n  --filter=@triplex-build/w0... --filter=@triplex-build/triplex-host... \\\n  --filter=@triplex-build/triplex-xtdb... --filter=@triplex-build/triplex-qlever...\ngit archive --format=tar exp/O01-replay-oracle lab/oracles/replay > /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3/oracle.tar\ntar -xf /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3/oracle.tar -C /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3/oracle\nnode lab/bin/heavy.mjs --label DX-H3-functional5 -- bash lab/experiments/EXP-DX1/h3/attempt.sh functional tx2-dxh3-f5 --subjects 400 --level-s 10 --max-readers 16 --sweep-max 400 --history-sample 50\nnode lab/bin/heavy.mjs --label DX-H3-medium5 -- bash lab/experiments/EXP-DX1/h3/attempt.sh medium tx2-dxh3-m5 --subjects 2000 --level-s 20 --max-readers 256 --sweep-max 2000 --history-sample 200')
w(f'node lab/bin/heavy.mjs --label DX-H3-real4 -- bash lab/experiments/EXP-DX1/h3/attempt.sh real {real_name} --rung 10k\n```')
w()
w('The wrapper supplies `--lane datomic --composition reach --profile smoke --reader-threads 2 --oracle-root .../DX-H3/oracle --output runs/DX-H3-vm/ns-report.json`. Functional history sample 50 is capped at 40 by the driver. Medium nominal L1024 is capped to 256 actual readers; real size uses all 1024.')
w()
table(['Role','CPUs','Real container / heap'],[['Postgres','0','2 GiB / vendor default'],['Transactor','0,1','5 GiB / Xmx4g'],['Write gateway','2','2500 MiB / Xmx2g'],['Read gateway','3,4','3500 MiB / Xmx3g'],['Driver','6,7','5 GiB']])
w('Real transactor configuration is object-cache-max=1g, memory-index-threshold=256m, memory-index-max=1g. `s3/REPORT.md` was absent on this branch, so the task configuration was used. Engine quota denominator is five distinct VM CPUs. The client has two assigned CPUs; os.cpus/hostCores=8 describes VM visibility, not client allocation. Functional engines use CPU 6, transactor Xmx1g, gateways Xmx768m. Medium uses the same CPU assignment as real with stack defaults (transactor Xmx2g, gateways Xmx1g).')
w()
w('The real run held the measurement lock for its entire duration, including startup, offline verification, copy-out and cleanup, as authorized by the task. Its hold exceeded 15 minutes under the explicit real-run exception. Medium holds remained below 15 minutes. Disk >=5 GiB and estimated VM free memory >=8 GiB are checked from actual Docker MemUsage sums against 20 GiB, both before waiting and again after lock acquisition. r1 refused before creating any container when memory was below the floor. The successful real admission is retained in `stats-admitted.jsonl`.')
w()
w('The local Node image has no Python. A fresh-UUID file bridge invokes the exact extracted O-REPLAY Python on the host only after measurement. It binds input SHA-256, output SHA-256 and actual exit status, copies exact bytes, and leaves world comparisons unchanged. The archive embeds commit `03d86f3346cccd6794487b77293fb56077dd020e`; all 12 Python source hashes match the medium expected output. This is not host load generation. See `ORACLE-PROVENANCE.json`.')
w()
for name,p,r in loaded:
 companion='MEDIUM-TABLES.md' if name=='Medium' else 'REAL-TABLES.md'
 text=(here/companion).read_text();bars=text[text.index('## Every bar'):text.index('## Writer pending')]
 w(f'## {name}: every bar\n');w(bars.replace('## Every bar\n','',1))
 w(f'Full latency bands, reader ladder, writer pending at every phase, P3 counters, P4 mix/buckets/history/throughput, fetch-only sweep, every correctness counter, oracle result, invalidity and scan snapshots: [{companion}]({companion}).\n')
w('## Measured failures and limits')
w()
for name,p,r in loaded:
 w(f'**{name}:**')
 for key in ['feedFailure','error','invalidReasons','finalizationErrors']:
  if r.get(key):w(f'- `{key}`: {val(r[key])}')
 w(f"- Client: {val(r.get('client'))}")
 w(f"- Actual history growth: {val(get(r,'priorities','P4','history','growth'))}")
 w(f"- P5 sweep completion and mutation receipts: {val({k:get(r,'priorities','P5','sweep',k) for k in ['completed','pulled','subjects','exactCoverage','mutationPositions','mutationsCommittedAfterCapture']})}")
 w()
w('The real retained error cause is DatomicTransportError caused by `Gateway deadline exceeded` at `packages/datomic/src/DatomicClient.ts:200`; SPI wrapping occurs at `packages/datomic/src/DatomicStorageAdapter.ts:71-74` and `readErrors.ts:12`. The feed fast path explicitly declines irregular scopes (`packages/datomic/gateway/src/triplex/gateway/journal.clj:11-12`), and counters record actual portable scans. These observations do not establish which internal engine activity caused each latency tail. No package rewrite or raised transport limit was used to turn a failed read into a pass.')
w()
w('P1 writer ratios are UNMATCHED comparisons with the in-run zero-reader phase (different trace segment), not a causal reader/writer isolation result; no matched external zero-reader run was made. P4 engine bytes read are unmeasured. P5 is fetch-only: the release evaluator, outbox publication and throttled compaction variant remain absent (`driver.ts`, P5 bars). A history phase label never establishes actual depth; the actual growth records and qualification flag govern the comparison. An unchanged world does not establish mutation isolation without post-capture receipts.')
w()
w('### Real oracle receipt-capture gap and post-run fix\n')
w('The real oracle result remains FAIL: receipt consistency R-RCP-4, first divergent command 1351 (journal position 1352). The captured case has eight missing assertion identities, all blobs, despite zero sampled-world mismatches. The former driver matcher compared JSON object serialization, while SDK/row decoding can reorder blob keys. The delivered matcher now reuses the canonical fact-member representation used by the world model and seed path. A reordered-blob fixture binds the actual supplied ID, and different/missing content still refuses. This is a post-run code fix, tested 22/22 in Linux; **the 10k run was not repeated after it**. Original receipt bytes sufficient to reconstruct those eight IDs were not retained, so no IDs were guessed and the failed report was not rewritten as PASS. A fresh native run must verify the fix.')
w()
w('## Retained attempts, checks and cleanup')
w()
w('f1 retained a Bash-3 empty-array startup failure; f2 retained the publication race; f3 reached DONE but Python was absent; f4 exercised the 30-second poll failure report; f5 reached DONE with the final 120-second budget but exposed missing oracle seed ancestry. m1 and m4 completed phases but were stopped within their leases after reporting stalled on source failures; their original RUNNING files remain unqualified. m2/m3 and r3 were cancelled while queued, before resource ownership, to bind corrected source in fresh attempts. r1 refused memory admission. r2 completed 1024 readers but its write gateway stopped answering admin probes and history growth failed six times; it was stopped before the unguarded old finalizer could discard the measured data. No old report was retroactively relabelled as a fresh run. Fresh final medium/real attempts are the ones reported above.')
w()
w('Validation: offline builds 10/10; Linux arm64 driver imports and native node:sqlite; TypeScript stripping; focused Linux delivery tests 22/22 (including post-capture receipt and canonical blob-ID binding regressions). The broad bench TypeScript check still fails in unchanged audit-traffic.ts, hs01-seed.ts, round2.ts and other diagnostics; no diagnostic names a changed driver/feed/oracle/completion file. Full root pnpm check, package pack checks, production acceptance, independent review, power-loss durability, 100k W0 activation and a matched baseline were not performed.')
w()
w('Mac clock tests were refused by sandbox sysctl; overlay-backed durable-store tests correctly refused that filesystem. Their disk-volume Linux retries passed; failures remain in evidence. Native addon inventory includes macOS build tooling, FoundationDB, DuckDB and better-sqlite3, but the exercised Datomic driver imports none of those addons. Host feed storage uses Node SQLite on a Docker disk volume.')
w()
w('All owned containers, networks and volumes are removed before releasing owned leases. Final empty inventories and SHA256SUMS are indexed by [EVIDENCE.md](EVIDENCE.md). Bulky raw output remains only under the durable evidence path. No packages, w0-public.ts, Datomic runtime construction, acceptance files, main checkout, unrelated container, forbidden port or global Docker context was changed. No merge or push was made.')
w()
w('## Observation-to-verdict audit')
w()
for line in [
'Publication observer: exact tagged position bytes, safe submitted/delta/final arithmetic and returned operation ID precede the witness; a fresh scope and sidecar bind this attempt. Unit fixtures reject mismatches and observe a shifted result once before ACK.',
'Feed: bound producer record/key/domain/digest checks remain; the witness wait never manufactures a time. Stalls and repeated errors retain their actual error and cannot advance the checkpoint. Fresh disk-volume tests verify delayed, absent, stalled and repeatedly failed cases.',
'Head/history/mutation completion: invalid or failed source heads remain null with an error; no ACK floor is substituted as a head. Requested history depths must be reached on the full sample. Post-capture isolation requires actual committed positions past capture. Positive and refusing fixtures validate those distinctions.',
'Driver: frozen trace and exact expected-world checks retain wrong answers, errors and unaccounted commands; only correct reads are goodput. Cgroup samples bind current exact container IDs. Smoke completion and numeric predicates do not imply acceptance.',
'Oracle: missing parent assertions reject the case; recorded seed, trace and history inputs include every retained history member and late receipt. Actual frozen Python exit and exact per-entity sampled-world equality decide its status. Missing final source position leaves the oracle NOT-RUN rather than inventing a head.',
'Receipt alignment: canonical blob fields and entity/attribute content bind only IDs present in the supplied receipt; missing or different content stays missing. The actual real oracle FAIL remains unchanged after the fix. Bridge/integrity: fresh UUID and input/output SHA-256 bind the actual offline invocation and returned bytes. ORACLE-PROVENANCE compares the extracted files with the actual expected-output source hashes. SHA256SUMS validates retained bytes only, not semantics.',
'Stack/cleanup: health source hash and Postgres fsync/synchronous_commit/full_page_writes readbacks compare actual content; exact IDs/cpusets/memory and source/build hashes are retained. Only empty current owned-resource inventories release the lease; absence of an uncreated volume is not a cleanup failure.',
'Report renderers: copied stored bar values/verdicts are displayed unchanged, with explicit global invalidity and prerequisites. Derived threshold distances are arithmetic only; missing values remain unavailable. No output is promoted to a scorecard PASS.'
]:w('- '+line)
w()
w('`lab/acceptance/` is unchanged. [HASH-CHANGES.json](HASH-CHANGES.json) contains old/new SHA-256 for changed existing files and identifies pin matches; no re-pinning occurred. Runtime source/build hashes are observations of this attempt; historical/aborted attempts are not adopted as fresh semantic evidence.')
(here/'REPORT.md').write_text('\n'.join(out)+'\n')
print(here/'REPORT.md')
