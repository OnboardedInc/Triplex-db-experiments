from pathlib import Path
import hashlib
# [DX-H6] Why: apply the recorded-byte-proven candidate only after current source-bound engine attempts finish.
# Rejected: mutating source while a queued or running attempt claims its prior hashes.
assert Path.cwd().name == 'dx-h6'
p=Path('packages/datomic/src/sweepRows.ts')
s=p.read_text();assert hashlib.sha256(p.read_bytes()).hexdigest()=='0f17a24958b1042ae230f0ae5ea5545ae6175b6d1b4e03817651ba6f45ca3ee7'
c=Path('lab/experiments/EXP-DX1/h6/decoder-candidate.ts').read_text()
a=s.index('        for (const i of stringColumns)');b=s.index('        position = Number(values[0]);',a)
ca=c.index('        // [DX-H6] Why: 99.98%');cb=c.index('        position = Number(values[0]);',ca)
s=s[:a]+c[ca:cb]+s[b:]
a=s.index('        result.push({');b=s.index('\n      }',a)
ca=c.index('        const row:SweepRow=');cb=c.index('\n      }',ca)
s=s[:a]+c[ca:cb]+s[b:];p.write_text(s)
p=Path('lab/bench/lib/sweep.ts');s=p.read_text().replace('  beforePublish?: () => Promise<void>;','  beforePublish?: () => Promise<void>;\n  beforeTimedWindow?: () => Promise<void>;')
s=s.replace('  let sweepStarted = startupStarted;','  let sweepStarted = startupStarted;\n  let workersReadyAt = startupStarted;')
s=s.replace('''        if (++readyCount === o.workers) {
          sweepStarted = performance.now();
          start();
        }''','''        if (++readyCount === o.workers) {
          workersReadyAt=performance.now();
          // [DX-H6] Why: a long-lived sweep pool exists before paired baseline/live traffic starts.
          // Rejected: excluding startup from P5 wall while letting it distort the live latency arm.
          try {await o.beforeTimedWindow?.();sweepStarted=performance.now();start();}
          catch(error){fail(error);throw error;}
        }''')
s=s.replace('      workerStartupMs: sweepStarted - startupStarted,','      workerStartupMs: workersReadyAt - startupStarted,\n      preTimedWindowHookMs: sweepStarted - workersReadyAt,')
p.write_text(s)
p=Path('lab/bench/w0-driver.ts');s=p.read_text();a=s.index('    if (argv.includes("--live")) {',s.index('const activationPage'))
b=s.index('    console.error("[P5] activation and publication");',a)
block=s[a:b]
s=s[:a]+'''    const beforeTimedWindow=async()=>{
'''+block+'''      console.error("[P5] activation and publication");
    };
    console.error("[P5] preparing sweep workers before live baseline");
'''+s[b+len('    console.error("[P5] activation and publication");\n'):]
s=s.replace('      metricsFile: path.join(dir, "activation-pages.ndjson"),','      metricsFile: path.join(dir, "activation-pages.ndjson"),\n      beforeTimedWindow,')
p.write_text(s)
