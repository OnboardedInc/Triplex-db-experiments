// [EXP-OBS01-R16] Tests for the IR dump reader (lab/bin/ir-dump.mjs) against the REAL golden dump (lab/observer/golden/), and the golden file's own hash checks.
// Why: the round 12 structured parser looked for disassembly that bpftrace 0.20.2 `-d` never prints; round 15's review (R15-N1, item 4) asked for a golden extraction/hash check and an IR reader
// tested on the real file. The reader stays DIAGNOSTIC (Q109a): every crafted case below also asserts that `pass` (the gate) is decided only by the forbidden-name-token scan.
// Rejected: constructing a whole dump by hand (the real one is the only authority on bpftrace's spelling); mutating the golden in place on disk (every variant is built in memory).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), GOLDEN = path.join(HERE, 'golden');
const proof = await import('../bin/clock-proof.mjs');
const {parseIrDump, IR_INTRINSIC_ALLOW} = await import('../bin/ir-dump.mjs');
const {buildKernelLikeBtf} = await import('./btf_fixture.mjs');

const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(GOLDEN, 'MANIFEST.json'), 'utf8'));
const dumpBytes = fs.readFileSync(path.join(GOLDEN, manifest.dumpFile));
const enumDoc = JSON.parse(fs.readFileSync(path.join(GOLDEN, manifest.enumFile), 'utf8'));
const pinned = fs.readFileSync(path.join(HERE, 'vm_syncwitness.bt'));
const okRun = {exitCode: 0, signal: null, timedOut: false, error: null};

/** The documented layout: "--- stdout ---\n" + stdout + "\n--- stderr ---\n" + stderr + "\n". Anything else fails here, before a parser is judged against the file. */
function split(bytes) {
  const m = /^--- stdout ---\n([\s\S]*)\n--- stderr ---\n([\s\S]*)\n$/.exec(bytes.toString('utf8'));
  assert.ok(m, 'golden file does not have the documented layout');
  return {stdout: m[1], stderr: m[2]};
}
const golden = split(dumpBytes);
const ids = Object.fromEntries(Object.entries(enumDoc.ids).filter(([n]) => n !== 'bpf_unspec'));
const nameById = new Map(Object.entries(enumDoc.ids).map(([n, i]) => [i, n]));
const btf = buildKernelLikeBtf({ids});   // CONSTRUCTED container, but holding the golden's real enum values

const facts = (stdout, stderr = golden.stderr, over = {}) => ({expectedSourceSha256: sha(pinned), mountedSourceSha256: sha(pinned), sourceText: pinned.toString('utf8'),
  versionOutput: 'bpftrace v0.20.2\n', versionRun: okRun, hashRun: okRun, btf: {...okRun, bytes: btf}, compiled: {stdout, stderr, ...okRun}, ...over});
const verdict = (stdout, stderr, over) => proof.clockPrimitiveVerdict(facts(stdout, stderr, over));
/** Diagnostic must refuse with a reason matching `pattern`; the GATE must follow only the forbidden-name-token scan (Q109a). */
const refused = (stdout, pattern, stderr) => {
  const v = verdict(stdout, stderr), tokens = proof.forbiddenClockTokens([stdout, stderr ?? golden.stderr].join('\n')).length > 0;
  assert.equal(v.diagnostic.pass, false, 'diagnostic passed on a crafted variant');
  assert.match(v.diagnostic.reasons.join(' | '), pattern);
  assert.equal(v.pass, !tokens, 'the gate must not depend on the IR reader');
  return v;
};
/** Inserts `lines` right after the `entry:` label of the n-th (0-based) probe function. */
function insertInFunction(text, n, lines) {
  const L = text.split('\n');
  let seen = -1;
  for (let i = 0; i < L.length; i++) if (/^define\b/.test(L[i]) && ++seen === n) { const at = L.findIndex((l, k) => k > i && /^entry:/.test(l)); L.splice(at + 1, 0, ...lines); return L.join('\n'); }
  throw new Error('no such function');
}
const KT = '  %x = call i64 inttoptr (i64 5 to ptr)()';
const call = id => `  %x = call i64 inttoptr (i64 ${id} to ptr)()`;

test('golden file: the documented extraction reproduces every hash in MANIFEST.json (R15-N1)', () => {
  assert.equal(sha(dumpBytes), manifest.dumpFileSha256);
  assert.equal(dumpBytes.length, manifest.dumpFileBytes);
  assert.equal(sha(golden.stdout), manifest.stdoutSha256);
  assert.equal(Buffer.byteLength(golden.stdout), manifest.stdoutBytes);
  assert.equal(sha(golden.stderr), manifest.stderrSha256);
  assert.equal(Buffer.byteLength(golden.stderr), manifest.stderrBytes);
  assert.equal(sha([golden.stdout, golden.stderr].filter(s => s.length).join('\n')), manifest.compiledSha256_scanned_by_verdict);
  assert.equal(sha(pinned), manifest.pinnedProgramSha256);
  assert.equal(sha(fs.readFileSync(path.join(GOLDEN, manifest.enumFile))), manifest.enumFileSha256);
});

test('golden dump: the IR reader accounts for every call, 15 bpf_ktime_get_ns sites and exactly the allow-listed helpers (diagnostic passes)', () => {
  const v = verdict(golden.stdout);
  assert.equal(v.pass, true); assert.deepEqual(v.reasons, []);
  assert.equal(v.diagnostic.pass, true, v.diagnostic.reasons.join('; '));
  assert.equal(v.diagnostic.format, 'llvm-ir'); assert.equal(v.diagnostic.adopted, true);
  assert.equal(v.monotonicCalls, 15); assert.equal(v.sourceMonotonicSites, 15);
  assert.deepEqual(v.unparsedCalls, []); assert.deepEqual(v.forbidden, []);
  assert.equal(v.sections.length, 15); assert.equal(v.diagnostic.ir.modules, 1); assert.equal(v.diagnostic.ir.astNsecs, 15);
  // the helper histogram equals what the manifest recorded from the dump with an independent count
  const byName = {};
  for (const [k, n] of Object.entries(manifest.helperIdsInIR)) byName[k.replace(/^\d+ /, '')] = n;
  assert.deepEqual(v.helperCalls, byName);
  for (const name of Object.keys(v.helperCalls)) assert.ok(proof.ALLOWED_HELPER_NAMES.includes(name), name + ' is not allow-listed');
  // each function carries exactly its source block's count: BEGIN has one, ext4_file_write_iter none, the sync probes one or two
  const perProbe = Object.fromEntries(v.sections.map(s => [s.name, s.ktime])), blocks = proof.sourceProbeBlocks(pinned.toString('utf8'));
  assert.equal(blocks.length, 15); assert.equal(blocks.reduce((a, b) => a + b.monotonic, 0), 15);
  for (const b of blocks) assert.equal(perProbe[b.head.replace(/^fentry:/, 'kfunc:').replace(/^fexit:/, 'kretfunc:')], b.monotonic, b.head);
  assert.deepEqual(Object.keys(v.diagnostic.ir.intrinsics).sort(), [...IR_INTRINSIC_ALLOW].sort());
  for (const [id, name] of [[118, 'bpf_jiffies64'], [125, 'bpf_ktime_get_boot_ns'], [160, 'bpf_ktime_get_coarse_ns'], [208, 'bpf_ktime_get_tai_ns']]) assert.equal(nameById.get(id), name);
});

test('the golden dump is the "-d" shape the reader expects: one module, five ASTs, and `-dd` (two modules) is refused', () => {
  assert.equal((golden.stdout.match(/^; ModuleID = /gm) ?? []).length, 1);
  assert.deepEqual(golden.stdout.match(/^AST after: .*$/gm), ['AST after: parser', 'AST after: ConfigAnalyser', 'AST after: Semantic', 'AST after: NodeCounter', 'AST after: ResourceAnalyser']);
  const ir = golden.stdout.slice(golden.stdout.indexOf('; ModuleID')), dd = golden.stdout + '\n' + ir;
  refused(dd, /exactly one LLVM IR module .* found 2/);
  refused(golden.stdout.slice(0, golden.stdout.indexOf('; ModuleID')), /exactly one LLVM IR module .* found 0|structured parse not attempted|compiled program section not found/);
});

test('crafted IR: a ktime-like helper other than bpf_ktime_get_ns, by id, is refused (the gate is untouched: no name token)', () => {
  for (const id of [118, 125, 160, 208]) {
    const v = refused(insertInFunction(golden.stdout, 1, [call(id)]), new RegExp('another clock: ' + nameById.get(id)));
    assert.equal(v.pass, true, 'a numeric call with no name token passes the gate (Q109a): the diagnostic is what reports it');
    assert.deepEqual(v.forbidden.map(f => f.split('#')[0]), [nameById.get(id)]);
  }
  refused(golden.stdout.replace('call i64 inttoptr (i64 5 to ptr)', 'call i64 inttoptr (i64 125 to ptr)'), /another clock: bpf_ktime_get_boot_ns/);
  refused(insertInFunction(golden.stdout, 2, ['  %x = tail call i64 inttoptr (i64 208 to ptr)()']), /another clock: bpf_ktime_get_tai_ns/);
});

test('crafted IR: the count of bpf_ktime_get_ns calls must equal the source and the AST, per probe and in total', () => {
  refused(insertInFunction(golden.stdout, 1, [KT]), /has 1 bpf_ktime_get_ns calls, the source block has 0|has 16 bpf_ktime_get_ns calls, the source has 15/);
  refused(golden.stdout.replace('call i64 inttoptr (i64 5 to ptr)', 'call i64 inttoptr (i64 1 to ptr)'), /has 14 bpf_ktime_get_ns calls, the source has 15|source block has 1/);
  // the AST of the LAST pass is the one that is checked: mutate only that block (String.replace on the whole text would hit the first pass)
  const lastAst = golden.stdout.lastIndexOf('AST after: '), head = golden.stdout.slice(0, lastAst), tail = golden.stdout.slice(lastAst);
  refused(head + tail.replace('identifier: monotonic', 'identifier: boot'), /AST nsecs call .* is not nsecs\(monotonic\)/);
  refused(head + tail.replace(/ +identifier: monotonic[^\n]*\n/, ''), /AST nsecs call .* is not nsecs\(monotonic\)/);
  refused(head + tail.replace('call: nsecs', 'call: nsecs_x'), /AST has 14 nsecs\(monotonic\) calls, the source has 15/);
});

test('crafted IR: every call form that is not a constant helper or an allow-listed intrinsic is UNPARSED-CALL', () => {
  for (const [label, line] of [
    ['register callee', '  %x = call i64 %fn(i64 1)'], ['tail register callee', '  %x = tail call i64 %fn(i64 1)'],
    ['inline asm', '  call void asm sideeffect "nop", ""()'], ['named function', '  call void @helper_not_an_intrinsic()'],
    ['unknown intrinsic', '  call void @llvm.dbg.value(metadata i64 0, metadata !1, metadata !DIExpression())'],
    ['invoke', '  %x = invoke i64 inttoptr (i64 5 to ptr)() to label %a unwind label %b'], ['callbr', '  callbr void asm "", ""() to label %a []'],
    ['bitcast callee', '  %x = call i64 bitcast (ptr inttoptr (i64 125 to ptr) to ptr)()'], ['non-constant inttoptr', '  %x = call i64 inttoptr (i64 %reg to ptr)()'],
    ['old pointer spelling', '  %x = call i64 inttoptr (i64 125 to i64 ()*)()'], ['quoted callee', '  call void @"llvm.lifetime.start.p0"(i64 -1, ptr nonnull %k)'],
    ['hex id', '  %x = call i64 inttoptr (i64 0x7d to ptr)()'], ['indirect through a loaded pointer', '  %x = call i64 %0(i64 1)'],
  ]) { const v = refused(insertInFunction(golden.stdout, 3, [line]), /UNPARSED-CALL in /); assert.ok(v.unparsedCalls.length >= 1, label); assert.equal(v.pass, true, label + ': gate untouched'); }
  // a hidden call after a trailing quote or comment on the same line is still a call line
  refused(insertInFunction(golden.stdout, 3, ['  call void @llvm.lifetime.end.p0(i64 -1, ptr nonnull %k) call i64 %fn()']), /UNPARSED-CALL in /);
});

test('crafted IR: a call outside a probe function, and a call hidden after the last function, are refused', () => {
  refused(golden.stdout.replace(/\n!0 = /, '\n  %x = call i64 inttoptr (i64 125 to ptr)()\n!0 = '), /UNPARSED-CALL outside a probe function/);
  refused(golden.stdout.replace('\ndeclare i64 @llvm.bpf.pseudo', '\n  call void @llvm.lifetime.end.p0(i64 -1, ptr nonnull %k)\ndeclare i64 @llvm.bpf.pseudo'), /UNPARSED-CALL outside a probe function/);
});

test('crafted IR: helper ids outside the kernel enum or the allow-list, and a missing, extra or truncated function, are refused', () => {
  refused(insertInFunction(golden.stdout, 4, [call(9999)]), /helper id 9999 .* is not in the kernel bpf_func_id enum/);
  refused(insertInFunction(golden.stdout, 4, [call(7)]), /helper bpf_get_prandom_u32#7 .* is not on the allow-list/);
  refused(insertInFunction(golden.stdout, 4, [call(16)]), /bpf_get_current_comm#16 .* is not on the allow-list/);
  const at = golden.stdout.indexOf('define noundef i64 @END(');
  refused(golden.stdout.slice(0, at) + '\n' + golden.stdout.slice(golden.stdout.indexOf('\n!0 = ')), /14 probe functions, the source has 15|source probe END has no compiled function/);
  refused(golden.stdout.slice(0, golden.stdout.indexOf('section "s_END_15"')) + '\n', /is not closed|14 probe functions|has no compiled function/);
  refused(golden.stdout.replace('@"tracepoint:ext4:ext4_punch_hole"', '@"tracepoint:ext4:ext4_not_in_source"'), /matches no source probe/);
  refused(golden.stdout.replace('@"tracepoint:ext4:ext4_zero_range"', '@"tracepoint:ext4:ext4_punch_hole"'), /defined twice/);
  refused(golden.stdout.slice(0, Math.floor(golden.stdout.length / 2)), /probe functions|is not closed|AST has|exactly one LLVM IR module/);
});

test('crafted IR: an ERROR line in stderr, and an empty or AST-only dump, are refused', () => {
  refused(golden.stdout, /stderr has an error line/, 'ERROR: Unknown error -1: couldn\'t set RLIMIT_MEMLOCK for bpftrace.\n' + golden.stderr);
  refused('', /structured parse not attempted|exactly one LLVM IR module|compiled program section not found/);
});

test('controls: calls inside comments, metadata and declare lines are not calls; the real program is unchanged by them', () => {
  const noisy = insertInFunction(golden.stdout, 5, ['  ; call i64 inttoptr (i64 125 to ptr)() in a comment', '  %y = add i64 0, 1 ; tail call i64 %fn()']);
  const v = verdict(noisy); assert.equal(v.diagnostic.pass, true, v.diagnostic.reasons.join('; ')); assert.equal(v.monotonicCalls, 15);
  // a tail call of an allow-listed helper by id is parsed like any other call
  const tail = golden.stdout.replace(/(%[\w.]+) = call i64 inttoptr \(i64 2 to ptr\)/, '$1 = tail call i64 inttoptr (i64 2 to ptr)');
  const t = verdict(tail); assert.equal(t.diagnostic.pass, true, t.diagnostic.reasons.join('; ')); assert.equal(t.helperCalls.bpf_map_update_elem, 25);
  // direct use of the reader with a different name map: id 5 absent from the enum is refused, not skipped
  const bare = parseIrDump(golden.stdout, {nameById: new Map([[1, 'bpf_map_lookup_elem']]), allowedNames: ['bpf_map_lookup_elem'], isClockName: () => false, monotonicName: 'bpf_ktime_get_ns', probes: [], monotonicSites: 15});
  assert.equal(bare.pass, false); assert.match(bare.reasons.join(' '), /is not in the kernel bpf_func_id enum/);
});

test('legacy disassembly samples still go through the legacy reader (constructed fixtures of rounds 11 to 14 are unchanged)', async () => {
  const {sectionedDump} = await import('./dump_fixture.mjs');
  const v = proof.clockPrimitiveVerdict({...facts(''), btf: {...okRun, bytes: buildKernelLikeBtf()}, compiled: {stdout: sectionedDump(), stderr: '', ...okRun}});
  assert.equal(v.pass, true); assert.equal(v.diagnostic.format, null); assert.equal(v.sections.length, 15);
});
