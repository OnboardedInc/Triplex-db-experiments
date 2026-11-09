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
// [EXP-OBS01-R13] Why (Q109a): the structured parser is DIAGNOSTIC, not gating. `diagnoses` asserts that the diagnostic reports the problem while the gate's verdict (and W0's) is decided only by the
// forbidden clock helper NAME token scan of the dump: it passes unless the dump text contains such a token. Rejected: asserting the old refusals (they are no longer the gate).
const hasToken = text => proof.forbiddenClockTokens(text ?? sectionedDump()).length > 0;
const diagnoses = (text, pattern, over) => {
  const v = verdict(text, over), gate = !hasToken(over?.compiled?.stdout ?? text);
  assert.equal(v.pass, gate, 'gate verdict: ' + String(JSON.stringify(text)).slice(0, 160) + ' ' + v.reasons.join(';')); assert.equal(v.diagnostic.pass, false, 'diagnostic passed: ' + String(JSON.stringify(text)).slice(0, 200));
  if (pattern) assert.match(v.diagnostic.reasons.join(';'), pattern); assert.equal(w0(facts(text, over)).pass, gate, 'W0 follows the gate'); return v;
};
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
  diagnoses(half, /incomplete|probe sections|exit instruction/);
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
    diagnoses(text, /another clock: bpf_ktime_get_boot_ns#125/);
  }
});
test('A2: a call-like line that does not parse refuses (UNPARSED-CALL), in every odd spelling', () => {
  const odd = ['  @@: call pc+5', '  @@: callx r1', '  @@: (8d) callx r1', '  @@: (85) call', '  @@: (85) call r1', '  @@: call 5 ; call 125', '  @@: tail_call', '  @@: r0 = bpf_ktime_get_boot_ns()',
    '  @@: call helper_five', '  @@:\t85 10 00 00 7d 00 00 00\tcall 125', '  @@: (85) bpf_ktime_get_ns', '  @@: CALL 5 5', '  @@:\t8d 00 00 00 05 00 00 00', '  @@:\tb7 01 00 00 05 00 00 00\tcall 5', '  @@: call 5,5'];
  for (const line of odd) {const v = diagnoses(sectionedDump({sections: fifteen({14: {extra: [line]}})}), /UNPARSED-CALL in section s_probe_15/); assert.ok(v.unparsedCalls.length >= 1, line);}
  // an LLVM call and a verifier-style call glued to the end of a section, with no blank line between, are call-like non-instruction lines
  diagnoses(sectionedDump({sections: fifteen()}).replace(/\n$/, '') + '\n  %t = call i64 inttoptr (i64 5 to i64 ()*)()\n', /UNPARSED-CALL|incomplete|another clock/);
  diagnoses(sectionedDump({sections: fifteen({14: {endsWithExit: false}})}) + '  %x = call void @llvm.dbg.value(metadata i64 0)\n', /UNPARSED-CALL|incomplete/);
});
test('A2: the unknown-spelling mix cannot be rescued by recognised monotonic calls (raw bytes, mnemonic, opcode disagree)', () => {
  diagnoses(sectionedDump({sections: fifteen({14: {extra: ['  @@:\t85 00 00 00 7d 00 00 00\tcall 5']}})}), /different helper ids/);              // bytes say 125, text says 5
  diagnoses(sectionedDump({sections: fifteen({14: {extra: ['  @@:\t85 00 00 00 7d 00 00 00']}})}), /another clock: bpf_ktime_get_boot_ns#125/);   // bytes only
  diagnoses(sectionedDump({sections: fifteen({14: {extra: ['  @@:\t85 00 00 00 7d 00 00 00 (85) call 5']}})}), /./);
  diagnoses(sectionedDump({sections: fifteen({14: {extra: ['  @@: (85) call 5 # call 125']}})}), /UNPARSED-CALL/);
});
test('A2: truncated dumps, a missing probe section, empty and duplicate sections refuse', () => {
  const full = sectionedDump(), lines = full.split('\n');
  for (const cut of [lines.findIndex(l => l.includes('s_probe_15')) , lines.findIndex(l => l.includes('s_probe_15')) + 2, full.length - 40, Math.floor(lines.length / 2), 3]) {
    const text = cut > lines.length ? full.slice(0, cut) : lines.slice(0, cut).join('\n'); diagnoses(text, /probe sections|incomplete|section not found/);
  }
  diagnoses(full.slice(0, full.lastIndexOf('\n', full.length - 3)), /incomplete|exit instruction/);                                            // the last exit instruction cut off
  diagnoses(sectionedDump({sections: fifteen().filter((_, i) => i !== 6)}), /14 probe sections, the source has 15 probes/);                // one probe section missing
  diagnoses(sectionedDump({sections: fifteen().slice(0, 1)}), /1 probe sections/);
  diagnoses(sectionedDump({sections: fifteen({3: {endsWithExit: false}})}), /probe section s_probe_4 is incomplete/);
  diagnoses(sectionedDump({sections: fifteen({3: {calls: [], endsWithExit: false}})}).replace(/Disassembly of section s_probe_4:\n[^\n]*\n/, 'Disassembly of section s_probe_4:\n'), /probe section s_probe_4 has no instructions|incomplete/);
  diagnoses(sectionedDump({sections: [...fifteen(), sec('s_probe_3')]}), /appears twice/);
  refuses('', /compile dump is empty/); diagnoses('no sections here\n  1: call 5\n', /section not found/);
});
test('A2: calls in other stages never rescue or substitute for the chosen section', () => {
  const otherStages = Array.from({length: 40}, () => '  %t = call i64 inttoptr (i64 5 to i64 ()*)()').join('\n') + '\n' + Array.from({length: 40}, () => '12: (85) call bpf_ktime_get_ns#5').join('\n');
  diagnoses(otherStages, /section not found/);
  diagnoses(otherStages + '\n' + sectionedDump({sections: fifteen().map(s => ({...s, calls: [1, 8]}))}), /fewer bpf_ktime_get_ns calls \(0\)/);               // sections without ktime reads, stages full of them
  diagnoses(otherStages + '\n' + sectionedDump({sections: fifteen().slice(0, 9)}), /9 probe sections/);
  diagnoses(sectionedDump() + '\nverifier stage:\n%t = call i64 inttoptr (i64 125 to i64 ()*)()\n', /another clock: bpf_ktime_get_boot_ns#125 x1 \(outside the chosen section/);   // a forbidden read anywhere still refuses
  assert.equal(verdict(sectionedDump() + '\n' + otherStages).pass, true);                                                          // harmless extra stages do not break a complete section
});
test('A2: every helper id must be on the allow-list; ktime variants, jiffies, timers and any other helper refuse', () => {
  const id = n => REFERENCE_FUNC_IDS[n];
  for (const name of ['bpf_jiffies64', 'bpf_ktime_get_boot_ns', 'bpf_ktime_get_coarse_ns', 'bpf_ktime_get_tai_ns']) for (const form of ['numeric', 'bytes', 'paren', 'bytes-only', 'named', 'name'])
    diagnoses(sectionedDump({sections: fifteen({14: {calls: [5, id(name)], form: undefined}}), form}), /another clock/, undefined);
  for (const name of ['bpf_get_prandom_u32', 'bpf_get_current_comm', 'bpf_timer_start']) { const v = diagnoses(sectionedDump({sections: fifteen({7: {calls: [5, id(name)]}})}), /not on the allow-list/); assert.match(v.diagnostic.reasons.join(';'), new RegExp(name)); }
  diagnoses(sectionedDump({sections: fifteen({7: {calls: [5, 9999]}})}), /id 9999 .* is not in the kernel bpf_func_id enum/);
  diagnoses(sectionedDump({sections: fifteen({7: {extra: ['  @@: (85) call bpf_no_such_helper']}})}), /has no id in the kernel enum/);
  for (const name of proof.ALLOWED_HELPER_NAMES) {
    const ids = {...REFERENCE_FUNC_IDS}; ids[name] ??= 1;
    assert.equal(verdict(sectionedDump({sections: fifteen({7: {calls: [5, id(name) ?? 1]}})})).pass, true, name);
  }
});
test('A2: ktime helpers other than bpf_ktime_get_ns are classed as clocks by the kernel enum itself (a future name the table does not know)', () => {
  const btf = buildKernelLikeBtf({extra: {bpf_ktime_get_realtime_ns: 300, bpf_my_clock_ns: 301}});
  diagnoses(sectionedDump({sections: fifteen({3: {calls: [5, 300]}})}), /another clock: bpf_ktime_get_realtime_ns#300/, {btf: {...okRun, bytes: btf}});
  diagnoses(sectionedDump({sections: fifteen({3: {calls: [5, 301]}})}), /not on the allow-list: ?|bpf_my_clock_ns/, {btf: {...okRun, bytes: btf}});
});
test('A2: the secondary per-site count never substitutes for completeness, and a lower count still refuses', () => {
  diagnoses(sectionedDump({sections: fifteen({2: {calls: [1, 8]}, 5: {calls: [1, 8]}})}), /fewer bpf_ktime_get_ns calls \(13\) than the 15/);
  assert.equal(verdict(sectionedDump({sections: fifteen().map(s => ({...s, calls: [5, 5, 1]}))})).pass, true);
});

// ---------------- allow-list derived from the source ----------------
test('the allow-list is exactly the helpers the pinned source needs; a source with an unmodeled construct refuses', () => {
  const needs = proof.sourceHelperNeeds(pinned.toString('utf8'));
  assert.deepEqual(needs.unmodeled, []); assert.deepEqual(needs.needs, [...proof.ALLOWED_HELPER_NAMES].sort());
  assert.equal(proof.sourceProbes(pinned.toString('utf8')).length, 15); assert.equal(proof.sourceTimeSites(pinned.toString('utf8')).monotonic, 15);
  for (const extra of ['BEGIN { @c = count(); }', 'BEGIN { printf("%s", comm); }', 'BEGIN { printf("%d", pid); }', 'BEGIN { @x = hist(1); }', 'BEGIN { printf("%s", str(arg0)); }', 'BEGIN { printf("%d", rand); }', 'BEGIN { system("x"); }']) {
    const text = pinned.toString('utf8') + '\n' + extra + '\n', over = {sourceText: text, expectedSourceSha256: sha(Buffer.from(text)), mountedSourceSha256: sha(Buffer.from(text))};
    assert.ok(proof.sourceHelperNeeds(text).unmodeled.length >= 1, extra); diagnoses(undefined, /outside the allow-list derivation/, over);
  }
  assert.deepEqual(proof.sourceHelperNeeds('BEGIN { printf("comm pid str count"); }').unmodeled, []);                              // words inside a string are not constructs
  assert.deepEqual(proof.sourceHelperNeeds('fexit:vmlinux:f { $x = args->pid; }').unmodeled, []);                                   // a field named pid is not the builtin
  const commaList = pinned.toString('utf8') + '\nfentry:vmlinux:a, fentry:vmlinux:b { @x = 1; }\n';
  diagnoses(undefined, /comma list of attach points/, {sourceText: commaList, expectedSourceSha256: sha(Buffer.from(commaList)), mountedSourceSha256: sha(Buffer.from(commaList))});
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
  const stale = diagnoses(sectionedDump(), /./, {btf}); assert.ok(stale.diagnostic.reasons.length >= 1);                                          // `call 5` is no longer ktime_get_ns on this kernel: refuses
  diagnoses(sectionedDump({sections: fifteen({4: {calls: [77, 78]}})}), /another clock: bpf_ktime_get_boot_ns#78/, {btf});
  const note = verdict(sectionedDump({sections: fifteen().map(s => ({...s, calls: [77, 1, 8]}))}), {btf}).referenceNote; assert.deepEqual(note.sort(), ['bpf_ktime_get_boot_ns: kernel 78, reference 125', 'bpf_ktime_get_ns: kernel 77, reference 5']);
});
test('BTF reader: W0 refuses when the enum is missing, a needed name is absent, ids collide, or the blob is absent (proof and W0)', () => {
  const run = bytes => ({...okRun, bytes});
  const cases = [['no enum', buildKernelLikeBtf({enumName: 'other_enum'}), /has 0 enum bpf_func_id/], ['empty enum', buildBtf({types: [{kind: 'enum', name: 'bpf_func_id', values: []}]}), /enum bpf_func_id is empty/],
    ['tai missing', buildKernelLikeBtf({omit: ['bpf_ktime_get_tai_ns']}), /no entry for: bpf_ktime_get_tai_ns/], ['ktime missing', buildKernelLikeBtf({omit: ['bpf_ktime_get_ns']}), /no entry for: bpf_ktime_get_ns/],
    ['allow-listed name missing', buildKernelLikeBtf({omit: ['bpf_ringbuf_discard']}), /no entry for: bpf_ringbuf_discard/], ['id collision', buildKernelLikeBtf({extra: {bpf_ktime_get_boot_ns: 5}}), /share id 5/],
    ['duplicate enumerator', buildBtf({types: [{kind: 'enum', name: 'bpf_func_id', values: [['BPF_FUNC_ktime_get_ns', 5], ['BPF_FUNC_ktime_get_ns', 6]]}]}), /lists BPF_FUNC_ktime_get_ns twice/]];
  for (const [label, blob, pattern] of cases) {const over = {btf: run(blob)}; diagnoses(undefined, pattern, over);}
  for (const bytes of [undefined, null, Buffer.alloc(0), 'text']) {diagnoses(undefined, /kernel BTF unreadable|shorter than its header/, {btf: run(bytes)});}
  assert.equal(diagnoses(undefined, /./, {btf: run(buildKernelLikeBtf({omit: ['bpf_ktime_get_tai_ns']}))}).helperIds, null);
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

// ---------------- [EXP-OBS01-R13] Q109a: the three gates, and the demoted structured parser ----------------
const srcOver = text => ({sourceText: text, expectedSourceSha256: sha(Buffer.from(text)), mountedSourceSha256: sha(Buffer.from(text))});
test('R13 gate (1): the static source check refuses every clock builtin other than nsecs(monotonic), with an otherwise clean dump (proof and W0)', () => {
  for (const extra of ['BEGIN { @t = nsecs; }', 'BEGIN { @t = nsecs(boot); }', 'BEGIN { @t = nsecs(tai); }', 'BEGIN { @t = nsecs (sw_tai); }', 'BEGIN { @t = jiffies; }', 'BEGIN { @t = elapsed; }',
    'BEGIN { printf("%s", strftime("%H", nsecs(monotonic))); }', 'BEGIN { time("%H"); }', 'BEGIN { @t = nsecs_boot; }', 'BEGIN { @t = ktime_get_boot_ns; }']) {
    const text = pinned.toString('utf8') + '\n' + extra + '\n', v = verdict(undefined, srcOver(text));
    assert.equal(v.pass, false, extra); assert.match(v.reasons.join(';'), /reads a clock other than nsecs\(monotonic\)/, extra); assert.equal(w0(facts(undefined, srcOver(text))).pass, false, extra);
  }
  assert.equal(verdict(undefined, srcOver('BEGIN { @t = 1; }\n')).pass, false);                                                      // no nsecs(monotonic) at all
  for (const harmless of ['// nsecs boot jiffies elapsed', '/* nsecs(boot) */ BEGIN { @t = nsecs(monotonic); }', 'BEGIN { printf("nsecs elapsed jiffies time(", nsecs(monotonic)); }']) assert.equal(proof.sourceTimeSites(harmless).other.length, 0, harmless);
  assert.deepEqual(proof.sourceTimeSites(pinned.toString('utf8')).other, []);                                                       // the pinned source is clean
});
test('R13 gate (3): any forbidden clock helper NAME token anywhere in the dump refuses (stdout, stderr, any stage, comments, BPF_FUNC_ forms, any case); numeric ids alone do not', () => {
  const tokens = ['bpf_ktime_get_boot_ns', 'ktime_get_boot', 'bpf_ktime_get_coarse_ns', 'bpf_ktime_get_tai_ns', 'bpf_jiffies64', 'BPF_FUNC_ktime_get_boot_ns', 'BPF_FUNC_ktime_get_coarse_ns', 'BPF_FUNC_ktime_get_tai_ns', 'BPF_FUNC_jiffies64'];
  assert.deepEqual(proof.FORBIDDEN_CLOCK_TOKENS, tokens);
  const good = sectionedDump();
  for (const token of tokens) for (const [where, text, stderr] of [['stdout stage', good + '\nLLVM IR stage:\n; ' + token + '\n', ''], ['mid-line', good + '\nx' + token + 'y\n', ''], ['stderr', good, 'warning: ' + token], ['upper case', good + '\n' + token.toUpperCase() + '\n', ''],
    ['before sections', token + '\n' + good, ''], ['inside a section', good.replace('Disassembly of section s_probe_2:', 'Disassembly of section s_probe_2: ' + token), '']]) {
    const over = {compiled: {stdout: text, stderr, ...okRun}}, v = verdict(undefined, over);
    assert.equal(v.pass, false, token + ' ' + where); assert.match(v.reasons.join(';'), /names a forbidden clock helper/, token + ' ' + where); assert.ok(v.gate.forbiddenTokenHits.length >= 1); assert.equal(w0(facts(undefined, over)).pass, false, token + ' ' + where);
  }
  // numeric-only and the monotonic helper are not tokens; the gate passes and the structured diagnostic is what reports the numeric clock read (R12-F1 fixture, now DIAGNOSTIC)
  assert.equal(verdict(good + '\n  99: (85) call 125\n').pass, true); assert.equal(verdict(good + '\nbpf_ktime_get_ns BPF_FUNC_ktime_get_ns\n').pass, true);
  assert.equal(verdict(undefined, {compiled: {stdout: '', stderr: '', ...okRun}}).pass, false);                                      // an empty dump is not "no forbidden token"
});
test('R13 gate (2) and the diagnostic split: the diagnostic is recorded, never gating, and the dump is recorded in full with its hash', () => {
  const good = sectionedDump(), v = verdict(good);
  assert.equal(v.pass, true); assert.equal(v.diagnostic.pass, true); assert.match(v.diagnostic.role, /DIAGNOSTIC, not gating/); assert.equal(v.diagnostic.adopted, true); assert.equal(v.compiledSha256, sha(Buffer.from(good))); assert.equal(v.compiledBytes, Buffer.byteLength(good));
  assert.equal(v.gate.checks.length, 6); assert.deepEqual(v.gate.forbiddenTokenHits, []); assert.match(v.claim, /diagnostic until a golden dump is reviewed/);
  const noisy = good + '\n  99: (85) call 125\n', n = verdict(noisy);
  assert.equal(n.pass, true); assert.equal(n.diagnostic.pass, false); assert.match(n.diagnostic.reasons.join(';'), /another clock: bpf_ktime_get_boot_ns#125/); assert.deepEqual(n.reasons, []);   // the gate lists nothing, the diagnostic lists the problem
  assert.equal(w0(facts(noisy)).pass, true); assert.equal(w0(facts(noisy)).checks.clock.diagnostic.pass, false);
  // a failed process still blocks everything and keeps the diagnostic un-adopted (A1: all four, not only compile and BTF)
  for (const key of ['versionRun', 'hashRun']) {const x = verdict(undefined, {[key]: {...okRun, exitCode: 1}}); assert.equal(x.pass, false); assert.equal(x.diagnostic.adopted, false); assert.deepEqual(x.sections, []);}
  refuses(undefined, /different program than the pinned source/, {mountedSourceSha256: '0'.repeat(64)}); refuses(undefined, /not exactly v0.20.2/, {versionOutput: 'bpftrace v0.20.1'}); refuses(undefined, /source text analysed is not the pinned source/, {sourceText: pinned.toString('utf8') + ' '});
});
test('R13 R12-F1/F2 fixtures: the structured parser still REPORTS the unparsed call outside a section and the contradictory exit, as DIAGNOSTIC', () => {
  const good = sectionedDump(), line = '%t = call i64 inttoptr (i64 125 to i64 ()*)() ; comment: call site';
  const outside = diagnoses(good + '\nLLVM IR stage:\n' + line + '\n', /UNPARSED-CALL outside a chosen section/); assert.equal(outside.pass, true);
  diagnoses(good + '\n  ' + line + '\n', /UNPARSED-CALL outside a chosen section/);                                                 // after a blank line, at the end of the section
  const contradictory = good.slice(0, good.lastIndexOf('  4:')) + '  4:\t85 00 00 00 05 00 00 00\texit\n';
  diagnoses(contradictory, /probe section s_probe_15 is incomplete/);
  const prefix = sectionedDump({count: 14}) + '\nDisassembly of section s_probe_15:\n' + callInsn(0, 5) + '\n  1:\t15 00 01 00 00 00 00 00\tif r0 == 0 goto +1\n' + EXIT_INSN(2) + '\n';
  const truncated = verdict(prefix); assert.equal(truncated.pass, true); assert.equal(truncated.diagnostic.pass, true);          // KNOWN diagnostic gap (R12-F2): an early exit followed by EOF is not detected as truncated
});
test('R13 R12-F3: BTF validation rejects id aliases across all entries, counts empty duplicate enums, and refuses reserved header flags and type-info bits', () => {
  const alias = deriveHelperIds(buildKernelLikeBtf({ids: {bpf_ktime_get_realtime_ns: 5, ...REFERENCE_FUNC_IDS}}), names);
  assert.equal(alias.ok, false); assert.match(alias.reasons.join(';'), /gives id 5 more than one name: bpf_ktime_get_realtime_ns, bpf_ktime_get_ns/);
  const aliasLater = deriveHelperIds(buildKernelLikeBtf({extra: {bpf_ktime_get_realtime_ns: 5}}), names); assert.equal(aliasLater.ok, false); assert.match(aliasLater.reasons.join(';'), /more than one name/);   // order does not matter
  const dupEmpty = deriveHelperIds(buildKernelLikeBtf({extraEnums: [{kind: 'enum', name: 'bpf_func_id', values: []}]}), names); assert.equal(dupEmpty.ok, false); assert.match(dupEmpty.reasons.join(';'), /has 2 enum bpf_func_id/);
  const dupEmptyFirst = deriveHelperIds(buildBtf({types: [{kind: 'enum', name: 'bpf_func_id', values: []}, {kind: 'enum', name: 'bpf_func_id', values: [['BPF_FUNC_ktime_get_ns', 5]]}]}), ['bpf_ktime_get_ns']); assert.equal(dupEmptyFirst.ok, false);
  const blob = buildKernelLikeBtf(), flagged = Buffer.from(blob); flagged[3] = 255;
  assert.match(deriveHelperIds(flagged, names).reasons.join(';'), /header flags are 0xff/);
  for (const bit of [16, 23, 29, 30]) {const b = Buffer.from(blob); b.writeUInt32LE((b.readUInt32LE(28) | (1 << bit)) >>> 0, 28); const r = deriveHelperIds(b, names); assert.equal(r.ok, false, 'bit ' + bit); assert.match(r.reasons.join(';'), /reserved type-info bits/, 'bit ' + bit);}
  assert.equal(deriveHelperIds(blob, names).ok, true);                                                                                  // the unmodified blob, and kind_flag (bit 31) on an enum, stay valid
  assert.equal(deriveHelperIds(buildBtf({types: [{kind: 'enum', name: 'bpf_func_id', signed: true, values: [['BPF_FUNC_ktime_get_ns', 5]]}]}), ['bpf_ktime_get_ns']).ok, true);
  // the same defects reach the proof as DIAGNOSTIC only; W0 still passes because the gate does not read the BTF content (its exit status is gated)
  for (const bytes of [buildKernelLikeBtf({ids: {bpf_ktime_get_realtime_ns: 5, ...REFERENCE_FUNC_IDS}}), flagged]) diagnoses(undefined, /more than one name|header flags/, {btf: {...okRun, bytes}});
});
test('R13 harness wiring (static): the dump file and its hash are recorded by the W0 step', () => {
  const text = fs.readFileSync(witness.PROGRAM.replace('lab/observer/vm_syncwitness.bt', 'lab/bin/sync-witness.mjs'), 'utf8');
  for (const piece of ['dumpFileSha256', "'w0-compiled-program.txt'", 'fs.writeFileSync(dumpPath,dumpFile)']) assert.ok(text.includes(piece), piece);
});

// ---------------- [EXP-OBS01-R14] R13-F1: the source check lexes strings and comments together ----------------
test('R14 R13-F1: comment delimiters inside string literals cannot hide a time read; unterminated strings and comments refuse (proof and W0)', () => {
  const src = pinned.toString('utf8'), at = s => src.replace('BEGIN\n{', 'BEGIN\n{\n  ' + s + '\n');
  const bad = ['printf("https://clock"); @c = nsecs(boot);', 'printf("/*"); @c = nsecs(boot); printf("*/");', 'printf("//"); @c = nsecs;', 'printf("\\"//"); @c = jiffies;', 'printf("/*"); @c = elapsed; printf("*/"); @d = 1;',
    "printf('\"'); @c = nsecs(tai);", 'printf("x"); /* "y */ @c = nsecs(boot);', '@c = nsecs(boot); // "unbalanced', '@c = 1; /* never closed @d = nsecs(monotonic);', 'printf("never closed); @c = nsecs(monotonic);',
    'printf("ends with backslash\\', "printf('x); @c = nsecs(monotonic);", '@c = nsecs(monotonic); "'];
  for (const stmt of bad) {const text = at(stmt), v = verdict(undefined, srcOver(text)); assert.equal(v.pass, false, stmt); assert.match(v.reasons.join(';'), /reads a clock other than nsecs\(monotonic\)/, stmt); assert.equal(w0(facts(undefined, srcOver(text))).pass, false, stmt);}
  assert.match(proof.sourceTimeSites(at('@c = 1; /* never closed')).other.join(';'), /unterminated block comment starting at line \d+/);
  assert.match(proof.sourceTimeSites(at('printf("never closed);')).other.join(';'), /unterminated string literal starting at line \d+/);
  assert.match(proof.sourceTimeSites(at("printf('x);")).other.join(';'), /unterminated character literal/);
  // harmless and real comments still work, so the pinned source and ordinary code are not refused
  for (const ok of ['printf("https://clock %s", "/* */");', 'printf("\\"//"); @c = nsecs(monotonic);', '// @c = nsecs(boot);', '/* @c = nsecs(boot); */ @c = 1;', '/* a // b */ @c = nsecs(monotonic); // "', 'printf("a\\\\"); @c = 1;', "printf('\"');"]) {
    const sites = proof.sourceTimeSites(at(ok)); assert.deepEqual(sites.other, [], ok); assert.equal(verdict(undefined, srcOver(at(ok))).pass, true, ok);
  }
  assert.deepEqual(proof.sourceTimeSites(src), {monotonic: 15, other: []});
  assert.equal(proof.lexBt('a // b\n"c//d" /* e\nf */ g').code, 'a \n"" \n  g');
});
