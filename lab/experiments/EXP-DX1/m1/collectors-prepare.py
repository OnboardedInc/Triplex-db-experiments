from pathlib import Path
import subprocess
p=Path('lab/experiments/EXP-DX1/m1')
subprocess.run(['python3',str(p/'prepare.py')],check=True)
s=(p/'driver.ts').read_text().replace('import fs from', 'import { AsyncLocalStorage } from \"node:async_hooks\";\nimport fs from')
# [DX-M1] Why: preserve gateway error codes without changing retry policy or synchronously logging each commit. Rejected: inferring conflict causes from HTTP status alone.
s=s.replace('const m1Phases: any[] = [];', '''const m1Context = new AsyncLocalStorage();
const m1Errors: any[] = [];
const m1Phases: any[] = [];''')
s=s.replace('const m1Transact =', '''const m1Request = m1Api.DatomicClient.prototype.request;
m1Api.DatomicClient.prototype.request = async function(...args: any[]) {
 try { const result = await m1Request.apply(this, args); m1Errors.push({at:Date.now(), method:args[0], path:args[1], operationId:args[2]?.operationId, status:200, m1Job:m1Context.getStore()}); return result; }
 catch (e: any) { m1Errors.push({at:Date.now(), method:args[0], path:args[1], operationId:args[2]?.operationId, status:e.status, code:e.code, message:e.message, maximum:e.maximum, route:e.route,m1Job:m1Context.getStore()}); throw e; }
};
process.on('exit', () => fs.writeFileSync('/driver/http-errors.jsonl',m1Errors.map(s=>JSON.stringify(s)).join('\\n')+'\\n'));
const m1Transact =''')
s=s.replace('epochOrigin:performance.timeOrigin, ...s','epochOrigin:performance.timeOrigin, m1Job:m1Context.getStore(), ...s')
s=s.replace('await writer.transact(cmd.operations, meta);', 'await m1Context.run({stream:ev.stream,seq:ev.seq,resend:ev.resend}, () => writer.transact(cmd.operations, meta));',1)
s=s.replace('await writer.transact(orig.operations, orig.meta);', 'await m1Context.run({stream:job.ev.stream,seq:job.ev.seq,resend:job.ev.resend}, () => writer.transact(orig.operations, orig.meta));')
(p/'driver.ts').write_text(s)
s=Path('lab/experiments/EXP-DX1/stack/up.sh').read_text()
s=s.replace('repo=$(cd "$(dirname "$0")/../../../.." && pwd)', 'repo=$(pwd)')
s=s.replace('  docker run -d --pull never --restart on-failure:10', '''  extra_role_env=()
  if [[ $role == w ]]; then
    role_java=$M1_GW_WRITE_JAVA_OPTS
    if [[ ${M1_SMALL:-0} == 1 ]]; then extra_role_env=(-e TX2_ENTITY_CACHE_BYTES=0 -e TX2_REACH_SESSION_ENTRIES=0); fi
  fi
  docker run -d --pull never --restart on-failure:10''')
s=s.replace('${ports[@]+"${ports[@]}"} -e', '${ports[@]+"${ports[@]}"} ${extra_role_env[@]+"${extra_role_env[@]}"} -e')
(p/'collectors-up.sh').write_text(s)
