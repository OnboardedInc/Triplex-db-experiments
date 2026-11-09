// [EXP-OBS01-R12] Why: round 11 review A1 (failed compiler status must not yield a proof), A2 (the proof must be fail-closed by construction) and the UAPI gap (helper ids read from
// the running kernel's BTF). Every compiled dump and every BTF blob here is CONSTRUCTED (dump_fixture.mjs, btf_fixture.mjs); none is a recording of bpftrace or of a kernel.
// Rejected: asserting on counts alone, and testing the parser only on the spellings the builder expects.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
process.env.TX2_ENGINE_DIR ??= path.resolve('runs/OBS01/test-engines');
const witness = await import('../bin/sync-witness.mjs');
const proof = await import('../bin/clock-proof.mjs');
const {parseBtfEnums, deriveHelperIds, BtfError} = await import('../bin/btf-helpers.mjs');
const {buildBtf, buildKernelLikeBtf, REFERENCE_FUNC_IDS} = await import('./btf_fixture.mjs');
const {sectionedDump, callInsn, EXIT_INSN, MOV_INSN} = await import('./dump_fixture.mjs');

const pinned = fs.readFileSync(witness.PROGRAM);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const okRun = {exitCode: 0, signal: null, timedOut: false, error: null};
const names = proof.REQUIRED_HELPER_NAMES;
const facts = (text = sectionedDump(), over = {}) => ({expectedSourceSha256: sha(pinned), mountedSourceSha256: sha(pinned), sourceText: pinned.toString('utf8'), versionOutput: 'bpftrace v0.20.2\n',
  versionRun: okRun, hashRun: okRun, btf: {...okRun, bytes: buildKernelLikeBtf()}, compiled: {stdout: text, stderr: '', ...okRun}, ...over});
const verdict = (text, over) => proof.clockPrimitiveVerdict(facts(text, over));
const refuses = (text, pattern, over) => {const v = verdict(text, over); assert.equal(v.pass, false, 'proof passed: ' + String(JSON.stringify(text)).slice(0, 200)); if (pattern) assert.match(v.reasons.join(';'), pattern); return v;};
function w0(clockProgram) {
  const samples = Array.from({length: 20}, (_, i) => ({monotonicNs: 1e9 + i * 2e7, bootNs: 1e9 + i * 2e7, receivedNs: 1e9 + 1e5 + i * 2e7, receivedBootNs: 1e9 + 1e5 + i * 2e7, receivedAfterNs: 1e9 + 100001 + i * 2e7}));
  return witness.judgeW0({clockProgram, clockSamples: samples, paranoid: 4, tracepointAttach: {ok: true}, ext4BtfPresent: false, listing: {'fexit:vmlinux:ext4_file_write_iter': 'fexit:vmlinux:ext4_file_write_iter'},
    attach: {pass: true, witnessCgroup: {memoryPeakBytes: 90 * 2 ** 20, oomKills: 0, maxMapKeys: 65536}}});
}
const sec = (name, calls = [1, 5, 8], extra = [], endsWithExit = true) => ({name, calls, extra, endsWithExit});
const fifteen = (over = {}) => Array.from({length: 15}, (_, i) => sec('s_probe_' + (i + 1), ...(over[i] ? [over[i].calls, over[i].extra, over[i].endsWithExit] : [])));

test('control: the constructed complete dump passes the proof and W0', () => {
  const v = verdict(); assert.deepEqual(v.reasons, []); assert.equal(v.pass, true); assert.equal(w0(facts()).pass, true);
  assert.equal(v.sections.length, 15); assert.ok(v.sections.every(s => s.complete)); assert.equal(v.monotonicCalls, 15); assert.equal(v.helperIds.bpf_ktime_get_ns, 5);
  assert.deepEqual(v.referenceNote, []);                                                                                            // informational: kernel ids equal the reference table
  assert.match(v.representation, /^dis:/);
});

// ---------------- A1: a completed compilation is required, for the compile, --version, sha256sum and BTF read ----------------
const badRuns = [['exit 1', {exitCode: 1}], ['exit 2', {exitCode: 2}], ['exit 137', {exitCode: 137}], ['null status', {exitCode: null}], ['missing status', {exitCode: undefined}], ['string status', {exitCode: '0'}],
  ['fractional status', {exitCode: 0.5}], ['signal with null status', {exitCode: null, signal: 'SIGSEGV'}], ['signal with status 0', {exitCode: 0, signal: 'SIGKILL'}], ['timeout', {exitCode: null, timedOut: true}],
  ['timeout status 0', {exitCode: 0, timedOut: true}], ['timeout flag missing', {timedOut: undefined}], ['spawn error', {exitCode: 0, error: 'ENOENT'}]];
test('A1: a failed, killed, timed out or unrecorded compile is never adopted, even after printing a complete valid dump (proof and W0)', () => {
  for (const [label, patch] of badRuns) {
    const compiled = {stdout: sectionedDump(), stderr: 'compilation failed after code generation', ...okRun, ...patch};
    const v = verdict(undefined, {compiled}), w = w0(facts(undefined, {compiled}));
    assert.equal(v.pass, false, label); assert.equal(w.pass, false, label); assert.equal(v.processes.compile.ok, false, label);
    assert.deepEqual(v.sections, [], label + ': the dump was adopted'); assert.equal(v.monotonicCalls, 0, label + ': calls from a failed compile were counted');
    assert.match(w.reasons.join(';'), /^clock: compile dump/, label);
  }
  assert.equal(verdict(undefined, {compiled: undefined}).pass, false);
  assert.match(refuses(undefined, /compile dump status was not recorded/, {compiled: undefined}).reasons.join(';'), /not recorded/);
});
test('A1: partial output with a failure status refuses, and so does a partial (truncated) dump with status 0', () => {
  const full = sectionedDump(), half = full.slice(0, Math.floor(full.length / 2));
  for (const exitCode of [1, 2, null]) {refuses(half, /compile dump/, {compiled: {stdout: half, stderr: '', ...okRun, exitCode}}); refuses(full, /compile dump/, {compiled: {stdout: full, stderr: '', ...okRun, exitCode}});}
  refuses(half, /incomplete|probe sections|exit instruction/);
});
test('A1: the --version, sha256sum and BTF-read statuses are checked, not just recorded (proof and W0)', () => {
  for (const key of ['versionRun', 'hashRun']) for (const [label, patch] of badRuns) {
    const v = verdict(undefined, {[key]: {...okRun, ...patch}}), w = w0(facts(undefined, {[key]: {...okRun, ...patch}}));
    assert.equal(v.pass, false, key + ' ' + label); assert.equal(w.pass, false, key + ' ' + label);
  }
  for (const [label, patch] of badRuns) {const over = {btf: {...okRun, ...patch, bytes: buildKernelLikeBtf()}}; assert.equal(verdict(undefined, over).pass, false, 'btf ' + label); assert.equal(w0(facts(undefined, over)).pass, false, 'btf ' + label);}
  for (const key of ['versionRun', 'hashRun', 'btf']) {const over = {[key]: undefined}; assert.equal(verdict(undefined, over).pass, false, key + ' missing'); assert.equal(w0(facts(undefined, over)).pass, false);}
  assert.match(refuses(undefined, /bpftrace --version exited with status 3/, {versionRun: {...okRun, exitCode: 3}}).reasons.join(';'), /exited with status 3/);
  assert.match(refuses(undefined, /sha256sum of the program exited with status 1/, {hashRun: {...okRun, exitCode: 1}}).reasons.join(';'), /sha256sum/);
});

// ---------------- A2: complete section, every call accounted for, allow-list, nothing rescues the section ----------------
test('A2: the reviewer mixed-format fixture (a numeric parenthesized-opcode call to a forbidden clock) refuses wherever it lands', () => {
  const good = sectionedDump();
  for (const [label, text] of [['appended', good + '\n  99: (85) call 125\n'], ['inside the last section', sectionedDump({sections: fifteen({14: {extra: ['  @@: (85) call 125']}})})],
    ['inside the first section', sectionedDump({sections: fifteen({0: {extra: ['  @@: (85) call 125']}})})], ['after a blank line, outside', good + '\n\n  99: (85) call 125\n']]) {
    const v = verdict(text); assert.equal(v.pass, false, label); assert.equal(w0(facts(text)).pass, false, label); assert.match(v.reasons.join(';'), /another clock: bpf_ktime_get_boot_ns#125/, label);
  }
});
test('A2: a call-like line that does not parse refuses (UNPARSED-CALL), in every odd spelling', () => {
  const odd = ['  @@: call pc+5', '  @@: callx r1', '  @@: (8d) callx r1', '  @@: (85) call', '  @@: (85) call r1', '  @@: call 5 ; call 125', '  @@: tail_call', '  @@: r0 = bpf_ktime_get_boot_ns()',
    '  @@: call helper_five', '  @@:\t85 10 00 00 7d 00 00 00\tcall 125', '  @@: (85) bpf_ktime_get_ns', '  @@: CALL 5 5', '  @@:\t8d 00 00 00 05 00 00 00', '  @@:\tb7 01 00 00 05 00 00 00\tcall 5', '  @@: call 5,5'];
  for (const line of odd) {const v = refuses(sectionedDump({sections: fifteen({14: {extra: [line]}})}), /UNPARSED-CALL in section s_probe_15/); assert.ok(v.unparsedCalls.length >= 1, line); assert.equal(w0(facts(sectionedDump({sections: fifteen({14: {extra: [line]}})}))).pass, false);}
  // an LLVM call and a verifier-style call glued to the end of a section, with no blank line between, are call-like non-instruction lines
  refuses(sectionedDump({sections: fifteen()}).replace(/\n$/, '') + '\n  %t = call i64 inttoptr (i64 5 to i64 ()*)()\n', /UNPARSED-CALL|incomplete|another clock/);
  refuses(sectionedDump({sections: fifteen({14: {endsWithExit: false}})}) + '  %x = call void @llvm.dbg.value(metadata i64 0)\n', /UNPARSED-CALL|incomplete/);
});
test('A2: the unknown-spelling mix cannot be rescued by recognised monotonic calls (raw bytes, mnemonic, opcode disagree)', () => {
  refuses(sectionedDump({sections: fifteen({14: {extra: ['  @@:\t85 00 00 00 7d 00 00 00\tcall 5']}})}), /different helper ids/);              // bytes say 125, text says 5
  refuses(sectionedDump({sections: fifteen({14: {extra: ['  @@:\t85 00 00 00 7d 00 00 00']}})}), /another clock: bpf_ktime_get_boot_ns#125/);   // bytes only
  refuses(sectionedDump({sections: fifteen({14: {extra: ['  @@:\t85 00 00 00 7d 00 00 00 (85) call 5']}})}), /./);
  refuses(sectionedDump({sections: fifteen({14: {extra: ['  @@: (85) call 5 # call 125']}})}), /UNPARSED-CALL/);
});
test('A2: truncated dumps, a missing probe section, empty and duplicate sections refuse', () => {
  const full = sectionedDump(), lines = full.split('\n');
  for (const cut of [lines.findIndex(l => l.includes('s_probe_15')) , lines.findIndex(l => l.includes('s_probe_15')) + 2, full.length - 40, Math.floor(lines.length / 2), 3]) {
    const text = cut > lines.length ? full.slice(0, cut) : lines.slice(0, cut).join('\n'); refuses(text, /probe sections|incomplete|section not found/); assert.equal(w0(facts(text)).pass, false);
  }
  refuses(full.slice(0, full.lastIndexOf('\n', full.length - 3)), /incomplete|exit instruction/);                                            // the last exit instruction cut off
  refuses(sectionedDump({sections: fifteen().filter((_, i) => i !== 6)}), /14 probe sections, the source has 15 probes/);                // one probe section missing
  refuses(sectionedDump({sections: fifteen().slice(0, 1)}), /1 probe sections/);
  refuses(sectionedDump({sections: fifteen({3: {endsWithExit: false}})}), /probe section s_probe_4 is incomplete/);
  refuses(sectionedDump({sections: fifteen({3: {calls: [], endsWithExit: false}})}).replace(/Disassembly of section s_probe_4:\n[^\n]*\n/, 'Disassembly of section s_probe_4:\n'), /probe section s_probe_4 has no instructions|incomplete/);
  refuses(sectionedDump({sections: [...fifteen(), sec('s_probe_3')]}), /appears twice/);
  refuses('', /compile dump is empty/); refuses('no sections here\n  1: call 5\n', /section not found/);
});
test('A2: calls in other stages never rescue or substitute for the chosen section', () => {
  const otherStages = Array.from({length: 40}, () => '  %t = call i64 inttoptr (i64 5 to i64 ()*)()').join('\n') + '\n' + Array.from({length: 40}, () => '12: (85) call bpf_ktime_get_ns#5').join('\n');
  refuses(otherStages, /section not found/);
  refuses(otherStages + '\n' + sectionedDump({sections: fifteen().map(s => ({...s, calls: [1, 8]}))}), /fewer bpf_ktime_get_ns calls \(0\)/);               // sections without ktime reads, stages full of them
  refuses(otherStages + '\n' + sectionedDump({sections: fifteen().slice(0, 9)}), /9 probe sections/);
  refuses(sectionedDump() + '\nverifier stage:\n%t = call i64 inttoptr (i64 125 to i64 ()*)()\n', /another clock: bpf_ktime_get_boot_ns#125 x1 \(outside the chosen section/);   // a forbidden read anywhere still refuses
  assert.equal(verdict(sectionedDump() + '\n' + otherStages).pass, true);                                                          // harmless extra stages do not break a complete section
});
test('A2: every helper id must be on the allow-list; ktime variants, jiffies, timers and any other helper refuse', () => {
  const id = n => REFERENCE_FUNC_IDS[n];
  for (const name of ['bpf_jiffies64', 'bpf_ktime_get_boot_ns', 'bpf_ktime_get_coarse_ns', 'bpf_ktime_get_tai_ns']) for (const form of ['numeric', 'bytes', 'paren', 'bytes-only', 'named', 'name'])
    refuses(sectionedDump({sections: fifteen({14: {calls: [5, id(name)], form: undefined}}), form}), /another clock/, undefined);
  for (const name of ['bpf_get_prandom_u32', 'bpf_get_current_comm', 'bpf_timer_start']) { const v = refuses(sectionedDump({sections: fifteen({7: {calls: [5, id(name)]}})}), /not on the allow-list/); assert.match(v.reasons.join(';'), new RegExp(name)); }
  refuses(sectionedDump({sections: fifteen({7: {calls: [5, 9999]}})}), /id 9999 .* is not in the kernel bpf_func_id enum/);
  refuses(sectionedDump({sections: fifteen({7: {extra: ['  @@: (85) call bpf_no_such_helper']}})}), /has no id in the kernel enum/);
  for (const name of proof.ALLOWED_HELPER_NAMES) {
    const ids = {...REFERENCE_FUNC_IDS}; ids[name] ??= 1;
    assert.equal(verdict(sectionedDump({sections: fifteen({7: {calls: [5, id(name) ?? 1]}})})).pass, true, name);
  }
});
test('A2: ktime helpers other than bpf_ktime_get_ns are classed as clocks by the kernel enum itself (a future name the table does not know)', () => {
  const btf = buildKernelLikeBtf({extra: {bpf_ktime_get_realtime_ns: 300, bpf_my_clock_ns: 301}});
  refuses(sectionedDump({sections: fifteen({3: {calls: [5, 300]}})}), /another clock: bpf_ktime_get_realtime_ns#300/, {btf: {...okRun, bytes: btf}});
  refuses(sectionedDump({sections: fifteen({3: {calls: [5, 301]}})}), /not on the allow-list: ?|bpf_my_clock_ns/, {btf: {...okRun, bytes: btf}});
});
test('A2: the secondary per-site count never substitutes for completeness, and a lower count still refuses', () => {
  refuses(sectionedDump({sections: fifteen({2: {calls: [1, 8]}, 5: {calls: [1, 8]}})}), /fewer bpf_ktime_get_ns calls \(13\) than the 15/);
  assert.equal(verdict(sectionedDump({sections: fifteen().map(s => ({...s, calls: [5, 5, 1]}))})).pass, true);
});

// ---------------- allow-list derived from the source ----------------
test('the allow-list is exactly the helpers the pinned source needs; a source with an unmodeled construct refuses', () => {
  const needs = proof.sourceHelperNeeds(pinned.toString('utf8'));
  assert.deepEqual(needs.unmodeled, []); assert.deepEqual(needs.needs, [...proof.ALLOWED_HELPER_NAMES].sort());
  assert.equal(proof.sourceProbes(pinned.toString('utf8')).length, 15); assert.equal(proof.sourceTimeSites(pinned.toString('utf8')).monotonic, 15);
  for (const extra of ['BEGIN { @c = count(); }', 'BEGIN { printf("%s", comm); }', 'BEGIN { printf("%d", pid); }', 'BEGIN { @x = hist(1); }', 'BEGIN { printf("%s", str(arg0)); }', 'BEGIN { printf("%d", rand); }', 'BEGIN { system("x"); }']) {
    const text = pinned.toString('utf8') + '\n' + extra + '\n', over = {sourceText: text, expectedSourceSha256: sha(Buffer.from(text)), mountedSourceSha256: sha(Buffer.from(text))};
    assert.ok(proof.sourceHelperNeeds(text).unmodeled.length >= 1, extra); refuses(undefined, /outside the allow-list derivation/, over);
  }
  assert.deepEqual(proof.sourceHelperNeeds('BEGIN { printf("comm pid str count"); }').unmodeled, []);                              // words inside a string are not constructs
  assert.deepEqual(proof.sourceHelperNeeds('fexit:vmlinux:f { $x = args->pid; }').unmodeled, []);                                   // a field named pid is not the builtin
  const commaList = pinned.toString('utf8') + '\nfentry:vmlinux:a, fentry:vmlinux:b { @x = 1; }\n';
  refuses(undefined, /comma list of attach points/, {sourceText: commaList, expectedSourceSha256: sha(Buffer.from(commaList)), mountedSourceSha256: sha(Buffer.from(commaList))});
});

// ---------------- UAPI gap: the helper ids come from the kernel BTF ----------------
test('BTF reader: a constructed blob yields the helper ids (ENUM and ENUM64), ignoring unrelated types and __BPF_FUNC_MAX_ID', () => {
  for (const kind of ['enum', 'enum64']) {
    const r = deriveHelperIds(buildKernelLikeBtf({kind}), names);
    assert.equal(r.ok, true, r.reasons.join(';')); assert.equal(r.enumKind, kind === 'enum' ? 'ENUM' : 'ENUM64'); assert.equal(r.btfBytes > 100, true); assert.match(r.btfSha256, /^[0-9a-f]{64}$/);
    for (const [n, i] of Object.entries(REFERENCE_FUNC_IDS)) assert.equal(r.ids[n], i, kind + ' ' + n);
    assert.equal(r.ids.bpf_unspec, 0); assert.equal('bpf___BPF_FUNC_MAX_ID' in r.ids, false);
  }
  const parsed = parseBtfEnums(buildKernelLikeBtf()); assert.equal(parsed.typeCount, 9); assert.equal(parsed.enums.length, 1); assert.equal(parsed.enums[0].values.find(v => v.name === 'BPF_FUNC_ktime_get_ns').value, 5n);
  const big = deriveHelperIds(buildBtf({types: [{kind: 'enum64', name: 'bpf_func_id', values: [['BPF_FUNC_ktime_get_ns', 5], ['BPF_FUNC_x', 2 ** 40]]}]}), ['bpf_ktime_get_ns']); assert.equal(big.ok, false); assert.match(big.reasons.join(';'), /outside 0\.\.65535/ );
  assert.equal(deriveHelperIds(buildKernelLikeBtf({extraEnums: [{kind: 'enum', name: 'other', values: [['A', 1]]}]}), names).ok, true);
  assert.equal(deriveHelperIds(buildKernelLikeBtf({extraEnums: [{kind: 'enum', name: 'bpf_func_id', values: [['BPF_FUNC_ktime_get_ns', 77]]}]}), names).ok, false);   // a second bpf_func_id enum
});
test('BTF reader: the clock proof uses the ids the kernel states, not remembered ones', () => {
  const ids = {...REFERENCE_FUNC_IDS, bpf_ktime_get_ns: 77, bpf_ktime_get_boot_ns: 78};
  const btf = {...okRun, bytes: buildKernelLikeBtf({ids})};
  assert.equal(verdict(sectionedDump({sections: fifteen().map(s => ({...s, calls: [77, 1, 8]}))}), {btf}).pass, true);
  const stale = refuses(sectionedDump(), /./, {btf}); assert.ok(stale.reasons.length >= 1);                                          // `call 5` is no longer ktime_get_ns on this kernel: refuses
  refuses(sectionedDump({sections: fifteen({4: {calls: [77, 78]}})}), /another clock: bpf_ktime_get_boot_ns#78/, {btf});
  const note = verdict(sectionedDump({sections: fifteen().map(s => ({...s, calls: [77, 1, 8]}))}), {btf}).referenceNote; assert.deepEqual(note.sort(), ['bpf_ktime_get_boot_ns: kernel 78, reference 125', 'bpf_ktime_get_ns: kernel 77, reference 5']);
});
test('BTF reader: W0 refuses when the enum is missing, a needed name is absent, ids collide, or the blob is absent (proof and W0)', () => {
  const run = bytes => ({...okRun, bytes});
  const cases = [['no enum', buildKernelLikeBtf({enumName: 'other_enum'}), /has 0 non-empty enum bpf_func_id/], ['empty enum', buildBtf({types: [{kind: 'enum', name: 'bpf_func_id', values: []}]}), /has 0 non-empty enum bpf_func_id/],
    ['tai missing', buildKernelLikeBtf({omit: ['bpf_ktime_get_tai_ns']}), /no entry for: bpf_ktime_get_tai_ns/], ['ktime missing', buildKernelLikeBtf({omit: ['bpf_ktime_get_ns']}), /no entry for: bpf_ktime_get_ns/],
    ['allow-listed name missing', buildKernelLikeBtf({omit: ['bpf_ringbuf_discard']}), /no entry for: bpf_ringbuf_discard/], ['id collision', buildKernelLikeBtf({extra: {bpf_ktime_get_boot_ns: 5}}), /share id 5/],
    ['duplicate enumerator', buildBtf({types: [{kind: 'enum', name: 'bpf_func_id', values: [['BPF_FUNC_ktime_get_ns', 5], ['BPF_FUNC_ktime_get_ns', 6]]}]}), /lists BPF_FUNC_ktime_get_ns twice/]];
  for (const [label, blob, pattern] of cases) {const over = {btf: run(blob)}; refuses(undefined, pattern, over); assert.equal(w0(facts(undefined, over)).pass, false, label);}
  for (const bytes of [undefined, null, Buffer.alloc(0), 'text']) {refuses(undefined, /kernel BTF unreadable|shorter than its header/, {btf: run(bytes)});}
  assert.equal(refuses(undefined, /./, {btf: run(buildKernelLikeBtf({omit: ['bpf_ktime_get_tai_ns']}))}).helperIds, null);
});
test('BTF reader negatives: truncation at every offset, bad magic, version, header and section bounds, strings, kinds and records', () => {
  const blob = buildKernelLikeBtf(), refuse = (bytes, pattern) => {const r = deriveHelperIds(bytes, names); assert.equal(r.ok, false); assert.match(r.reasons.join(';'), pattern); return r;};
  for (let n = 0; n < blob.length; n += 1) assert.equal(deriveHelperIds(blob.subarray(0, n), names).ok, false, 'prefix ' + n);                  // every strict prefix refuses, none throws
  refuse(Buffer.concat([blob, Buffer.from([0])]), /not contiguous/);                                                                  // trailing byte
  const withHeader = (edit) => {const b = Buffer.from(blob); edit(b); return b;};
  refuse(withHeader(b => b.writeUInt16LE(0xdead, 0)), /magic is 0xdead/); refuse(withHeader(b => b.writeUInt16LE(0x9feb, 0)), /byte-swapped/);
  refuse(withHeader(b => {b[2] = 2;}), /version 2/); refuse(withHeader(b => b.writeUInt32LE(8, 4)), /header length 8/); refuse(withHeader(b => b.writeUInt32LE(blob.length + 1, 4)), /header length/);
  refuse(withHeader(b => b.writeUInt32LE(b.readUInt32LE(12) + 4, 12)), /beyond the blob|contiguous|overruns/); refuse(withHeader(b => b.writeUInt32LE(b.readUInt32LE(20) + 4, 20)), /beyond the blob|contiguous/);
  refuse(withHeader(b => b.writeUInt32LE(b.readUInt32LE(16) + 4, 16)), /contiguous|beyond/);                                           // gap before the strings
  refuse(withHeader(b => b.writeUInt32LE(b.readUInt32LE(16) - 4, 16)), /contiguous/);                                                  // overlap
  refuse(withHeader(b => b.writeUInt32LE(0, 20)), /string section must start and end with NUL|contiguous/);
  refuse(withHeader(b => {b[b.length - 1] = 0x41;}), /start and end with NUL/); refuse(withHeader(b => {b[24 + b.readUInt32LE(16)] = 0x41;}), /start and end with NUL/);
  refuse(withHeader(b => b.writeUInt32LE(b.readUInt32LE(12) - 1, 12)), /multiple of 4|contiguous/);
  refuse(withHeader(b => b.writeUInt32LE(0xffff, 24)), /name offset|string at/);                                                      // first type's name offset (the int) outside the strings
  refuse(buildBtf({types: [{kind: 'raw', bytes: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0x1f << 0, 0, 0, 0, 0])}]}), /unknown kind/);          // kind 0 / unknown
  const kind20 = Buffer.alloc(12); kind20.writeUInt32LE(20 << 24, 4); refuse(buildBtf({types: [{kind: 'raw', bytes: kind20}]}), /unknown kind 20/);
  const overrun = Buffer.alloc(12); overrun.writeUInt32LE((6 << 24) | 5, 4); overrun.writeUInt32LE(4, 8); refuse(buildBtf({types: [{kind: 'raw', bytes: overrun}]}), /overruns the type section/);   // enum claiming 5 values, none present
  const badSize = Buffer.alloc(12); badSize.writeUInt32LE((6 << 24) | 0, 4); badSize.writeUInt32LE(3, 8); refuse(buildBtf({types: [{kind: 'raw', bytes: badSize}]}), /has size 3/);
  const shortRec = Buffer.alloc(8); refuse(buildBtf({types: [{kind: 'raw', bytes: shortRec}]}), /overruns the type section|multiple of 4/);
  assert.throws(() => parseBtfEnums('nope'), BtfError); assert.throws(() => parseBtfEnums(Buffer.alloc(10)), /shorter than its header/);
  assert.equal(deriveHelperIds(buildBtf({hdrLen: 32, types: [{kind: 'enum', name: 'bpf_func_id', values: [['BPF_FUNC_ktime_get_ns', 5]]}]}), ['bpf_ktime_get_ns']).ok, true);   // a longer header (hdr_len) is honoured
  const negative = deriveHelperIds(buildBtf({types: [{kind: 'enum', name: 'bpf_func_id', signed: true, values: [['BPF_FUNC_ktime_get_ns', -5]]}]}), ['bpf_ktime_get_ns']); assert.equal(negative.ok, false);
});
test('harness wiring (static): every process status reaches the verdict and the ids come from a BTF read by the same image', () => {
  const text = fs.readFileSync(witness.PROGRAM.replace('lab/observer/vm_syncwitness.bt', 'lab/bin/sync-witness.mjs'), 'utf8');
  for (const piece of ["versionRun:status(version)", "hashRun:status(hashed)", "btf:{...status(btfRun),bytes:btfBytes}", "entrypoint:'base64'", '/sys/kernel/btf/vmlinux', 'signal:done.signal', 'REQUIRED_HELPER_NAMES']) assert.ok(text.includes(piece), piece);
});
