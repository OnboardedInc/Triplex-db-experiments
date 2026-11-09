// [EXP-SQL01] Why: verify builder bytes, all route observations, fresh receipts and retained fixture identities.
// Rejected: accepting summary counts without re-reading their complete comparison table and source bindings.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
const root = 'lab/verify/SQL01', dir = root + '/evidence';
const output = process.env.SQL01_ATTEMPT ?? 'qa2-audit-final';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = async file => { const h = createHash('sha256'); for await (const chunk of fs.createReadStream(file)) h.update(chunk); return { bytes: fs.statSync(file).size, sha256: h.digest('hex') }; };
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d,e.name)) : e.isFile() ? [path.join(d,e.name)] : []) : [];
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const errors = [], builder = JSON.parse(fs.readFileSync('lab/experiments/EXP-SQL01/MANIFEST-round2.json'));
const builderChecks = [], mutableCacheEntries = [];
for (const [file, expected] of Object.entries(builder.entries)) {
  const actual = fs.existsSync(file) ? await digest(file) : null;
  const mutableCache = /^lab\/verify\/SQL01\/node_modules\/\.vite\/vitest\/[^/]+\/results\.json$/.test(file);
  const check = { file, expected, actual, mutableCache };
  builderChecks.push(check);
  if (mutableCache) {
    // [EXP-SQL01] Why: a test runner's ignored result cache is recreated by independent reruns.
    // Rejected: ignoring any authored source/receipt mismatch, or claiming all manifest entries match.
    const origin = path.join('/Users/sam/projects/triplex-db-2/.claude/worktrees/sql01', file);
    const builderOrigin = fs.existsSync(origin) ? await digest(origin) : null;
    mutableCacheEntries.push({ ...check, builderOrigin, builderOriginMatches: builderOrigin?.sha256 === expected.sha256 });
  } else if (!actual || actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) errors.push({ builderFile: file });
}
fs.writeFileSync(dir + '/' + output + '-builder-manifest-check.json', JSON.stringify({ checked: builderChecks.length, immutableChecked: builderChecks.length-mutableCacheEntries.length, mutableCacheEntries, builderChecks, errors }, null, 2) + '\n');
const generated = JSON.parse(fs.readFileSync(dir + '/qa2-generated-routes-generated.json'));
const archive = fs.readFileSync(dir + '/' + generated.observationArchive);
const observations = JSON.parse(gunzipSync(archive));
if (hash(archive) !== generated.observationArchiveSha256 || observations.length !== generated.observationCount) errors.push({ observationArchive: 'identity mismatch' });
const pairs = new Map(), routes = {}, shapes = {}, phases = {};
for (const row of observations) {
  if (row.actual !== row.expected) errors.push({ observation: row });
  routes[row.arm + '/' + row.route] = (routes[row.arm + '/' + row.route] ?? 0) + 1;
  shapes[row.shape] = (shapes[row.shape] ?? 0) + 1; phases[row.phase] = (phases[row.phase] ?? 0) + 1;
  const k = [row.seed,row.phase,row.cut,row.selection].join('/');
  const values = pairs.get(k) ?? []; values.push(row); pairs.set(k, values);
  const basis = generated.histories.find(h => h.seed === row.seed).cuts[row.cut].basis;
  if (basis?.recordedAt !== undefined && row.pulls !== 0) errors.push({ timeCutUsedH1: row });
}
for (const [key, rows] of pairs) if (rows.length !== 2 || rows[0].actual !== rows[1].actual || new Set(rows.map(r => r.arm)).size !== 2) errors.push({ pair: key });
const kills = JSON.parse(fs.readFileSync(dir + '/qa2-kill50-results.json'));
if (kills.errors.length || kills.rounds.length !== 51 || kills.feedSeen.some((p,i) => i && p <= kills.feedSeen[i-1]) || [...kills.acks].some(([,p]) => !kills.feedSeen.includes(p)) || kills.feedSeen.length !== kills.rounds.at(-1).recovered) errors.push({ crashResume: 'denominator/order/recovery mismatch' });
const receipts = [];
for (const label of ['qa2-baseline','qa2-generated','qa2-kill50']) {
  const r = JSON.parse(fs.readFileSync(`${dir}/${label}.json`));
  if (r.result.code !== 0 || !r.sourceStillMatches || hash(fs.readFileSync(`${dir}/${label}.log`)) !== r.logSha256) errors.push({ receipt: label });
  for (const [f,h] of Object.entries(r.inputs)) if (hash(fs.readFileSync(f)) !== h) errors.push({ changedGateInput: label, file: f });
  receipts.push({ label, head: r.head, result: r.result, sourceStillMatches: r.sourceStillMatches, start:r.start, end:r.end });
}
const require = createRequire(path.resolve('packages/qlever/package.json')), D = require('better-sqlite3'), db = new D(':memory:');
const sqlite = db.prepare('SELECT sqlite_version() version, sqlite_source_id() source').get(); db.close();
const nativePath = require.resolve('better-sqlite3/build/Release/better_sqlite3.node');
const productDiff = git('diff','4863a8e','--','packages','pnpm-lock.yaml'); if (productDiff) errors.push({ productDiff });
const raw = {};
for (const file of walk(root + '/data')) raw[file] = await digest(file);
fs.writeFileSync(dir + '/' + output + '-raw-data.json', JSON.stringify({ retained: true, files: raw, totalBytes: Object.values(raw).reduce((n,v) => n + v.bytes,0) }, null, 2) + '\n');
const result = { reviewer:'CX-VSQL01-2', head:git('rev-parse','HEAD'), branch:git('branch','--show-current'), builderHead:git('rev-parse','4863a8e'), implementationHead:builder.head, productUnchanged:!productDiff, builderManifestChecked:builderChecks.length, immutableBuilderEntries:builderChecks.length-mutableCacheEntries.length, mutableCacheEntries, node:process.version, platform:process.platform, arch:process.arch, sqlite, betterSqlite3:require('better-sqlite3/package.json').version, native:await digest(nativePath), lockfile:await digest('pnpm-lock.yaml'), coreBuild:Object.fromEntries(await Promise.all(walk('packages/core/dist').map(async f => [f,await digest(f)]))), generated:{ totals:generated.totals, archiveSha256:hash(archive), observations:observations.length, pairs:pairs.size, routes,shapes,phases }, crashes:{ stops:50, acknowledged:kills.acknowledged, positions:kills.feedSeen.length, recoveredOperations:kills.rounds.at(-1).recovered, strictlyIncreasing:true }, receipts, rawFiles:Object.keys(raw).length, rawBytes:Object.values(raw).reduce((n,v) => n+v.bytes,0), disk:execFileSync('df',['-k','.'],{encoding:'utf8'}), errors };
fs.writeFileSync(dir + '/' + output + '-summary.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({ builderManifestChecked:builderChecks.length, immutableBuilderEntries:builderChecks.length-mutableCacheEntries.length, mutableCacheEntries, pairs:pairs.size, observations:observations.length, acknowledged:kills.acknowledged, positions:kills.feedSeen.length, rawFiles:Object.keys(raw).length, errors }));
if (errors.length) process.exitCode = 1;
