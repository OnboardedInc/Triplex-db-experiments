// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-W02] Why: an oracle process computes expectations; only fresh, source-bound observed
// bytes can satisfy a named claim. Rejected: an oracle exit code or a prose description as evidence.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { REPO } from './triplex.mjs';
export const O_DOMAIN_CLI = path.join(REPO, 'lab/oracles/domain/cli.py');
export const oDomainAvailable = () => fs.existsSync(O_DOMAIN_CLI);
export const DOMAIN_OPS = ['reconcile', 'affected', 'publish', 'receive'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function domainIdentity() {
  const files = [];
  for (const dir of ['lab/oracles/domain', 'lab/world/W0']) {
    const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory() && e.name !== '__pycache__') walk(f);
      else if (e.isFile() && /\.(py|json|md)$/.test(f)) files.push(path.relative(REPO, f));
    } };
    walk(path.join(REPO, dir));
  }
  return hash(JSON.stringify(files.sort().map(f => [f, hash(fs.readFileSync(path.join(REPO, f)))])));
}
export function runDomain(op, input) {
  if (!DOMAIN_OPS.includes(op)) throw Error(`O-DOMAIN unsupported operation: ${op}`);
  const inputBytes = typeof input === 'string' ? input : JSON.stringify(input);
  const identity = domainIdentity();
  const r = spawnSync('python3', ['-I', O_DOMAIN_CLI, op, '-'], {
    input: inputBytes, encoding: 'utf8', timeout: 30_000, maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  if (r.error || r.status !== 0) throw Error(`O-DOMAIN ${op}: ${r.error ?? r.stderr}`);
  const outputBytes = r.stdout.trimEnd();
  const output = JSON.parse(outputBytes);
  if (output?.error) throw Error(`O-DOMAIN refused input: ${output.error}`);
  if (domainIdentity() !== identity) throw Error('O-DOMAIN sources changed during evaluation');
  return { outputBytes, inputSha256: hash(inputBytes), outputSha256: hash(outputBytes), identity };
}
/** request.observation is a driver-created binding to the actual read, never an engine echo. */
export function expectDomain(ctx, request) {
  const item = { id: request.id, kind: request.kind, claims: request.claims ?? [], status: 'FAIL' };
  (ctx.domainRequests ??= []).push(item);
  try {
    const b = request.observation;
    const endpoint = ctx.comp.endpoint ?? ctx.comp.backend?.url;
    if (!b || b.runTag !== ctx.opts.runTag || b.endpoint !== endpoint || b.scope !== ctx.opts.scope ||
        !Number.isSafeInteger(b.recordedPosition) || b.recordedPosition < 0 ||
        b.sourceSha256 !== ctx.opts.sourceSha256 || !b.sourceSha256 || typeof request.observedBytes !== 'string')
      throw Error('missing fresh run/source/endpoint/scope/position binding or observed bytes');
    if (request.input?.basis && request.input.basis.tx !== b.recordedPosition)
      throw Error('domain input basis differs from driver-recorded position');
    const result = runDomain(request.op, request.input);
    Object.assign(item, result, { outputBytes: undefined, observation: b });
    if (request.observedBytes !== result.outputBytes) throw Error('observed bytes differ from O-DOMAIN');
    item.status = 'PASS';
    return ctx.check(`domain:${request.id}`, true, null, { counts: 'domain' });
  } catch (error) {
    item.reason = String(error.message ?? error);
    return ctx.check(`domain:${request.id}`, false, item.reason, { counts: 'domain' });
  }
}
export function requireDomainClaims(ctx) {
  for (const [index, claim] of (ctx.spec.domain ?? []).entries()) {
    const checked = (ctx.domainRequests ?? []).some(r => r.status === 'PASS' && r.claims.includes(index));
    ctx.check(`domain:claim-${index}`, checked, claim, { counts: 'domain' });
  }
}
