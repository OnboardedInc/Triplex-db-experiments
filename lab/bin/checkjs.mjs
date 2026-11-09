#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// [EXP-CHECKJS] Why: legacy per-file type-noise directives must never mask a missing
// binding in an unexecuted branch. Rejected: import smoke tests (bodies stay unresolved).
const bindingCodes = new Set([2304, 2305, 2306, 2459, 2460, 2503, 2552, 2614, 2686, 2693, 2694, 2708, 2724, 18004]);
const defaultProject = path.resolve(import.meta.dirname, '../tsconfig.checkjs.json');

/** @param {string} repository @param {string} exclusionsFile */
export function trackedCoverage(repository, exclusionsFile) {
  // [EXP-CHECKJS] Why: subprocess and TS-to-JS edges evade directory/import inventories.
  // Rejected: another directory allowlist (the GS launcher and docs/pack checks fell outside it).
  const tracked = execFileSync('git', ['ls-files', '-z', '--', '*.js', '*.mjs', '*.cjs'], { cwd: repository, encoding: 'utf8' }).split('\0').filter(Boolean);
  const policy = JSON.parse(fs.readFileSync(exclusionsFile, 'utf8'));
  if (policy.format !== 'triplex-checkjs-exclusions/1' || !Array.isArray(policy.exclusions)) throw new Error('invalid checkjs exclusion policy');
  const generated = tracked.filter(file => file.split('/').some(part => part === 'node_modules' || part === 'dist'));
  const candidates = new Set(tracked.filter(file => !generated.includes(file)));
  /** @type {Map<string, string>} */
  const excluded = new Map();
  for (const entry of policy.exclusions) {
    if (!entry || typeof entry.path !== 'string' || typeof entry.reason !== 'string' || !entry.reason.trim()
      || !candidates.has(entry.path) || excluded.has(entry.path)) throw new Error(`invalid, duplicate, or stale checkjs exclusion: ${JSON.stringify(entry)}`);
    excluded.set(entry.path, entry.reason);
  }
  return { tracked, generated, excluded, checked: [...candidates].filter(file => !excluded.has(file)) };
}

/** @param {string[]} roots @param {ReturnType<typeof trackedCoverage>} inventory @param {string} repository */
export function coverageDiagnostics(roots, inventory, repository) {
  const actual = new Set(roots.map(file => path.relative(repository, file).split(path.sep).join('/')));
  const expected = new Set(inventory.checked);
  return [
    ...inventory.checked.filter(file => !actual.has(file)).map(file => `tracked JavaScript is neither checked nor excluded: ${file}`),
    ...[...actual].filter(file => !expected.has(file)).map(file => `project root is not an eligible tracked JavaScript file: ${file}`),
  ].map(messageText => ({ category: ts.DiagnosticCategory.Error, code: 90001, messageText, file: undefined, start: undefined, length: undefined }));
}

/** @param {string} source */
export function withoutDirectives(source) {
  // [EXP-CHECKJS] Why: parsed trivia distinguishes comments from strings/templates;
  // blank only directive text, preserving all diagnostic line/column coordinates.
  // Rejected: a regex over source (would also alter runtime string literals).
  const tree = ts.createSourceFile('check.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  /** @type {Map<number, ts.CommentRange>} */
  const comments = new Map();
  /** @param {ts.Node} node */
  function visit(node) {
    for (const range of [...ts.getLeadingCommentRanges(source, node.pos) ?? [], ...ts.getTrailingCommentRanges(source, node.end) ?? []]) comments.set(range.pos, range);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  let result = '', end = 0;
  for (const { pos: start, end: stop } of [...comments.values()].sort((a, b) => a.pos - b.pos)) {
    result += source.slice(end, start) + source.slice(start, stop).replace(/@ts-(?:nocheck|check|ignore|expect-error)\b/g, text => ' '.repeat(text.length));
    end = stop;
  }
  return result + source.slice(end);
}

/** @param {string} project @param {{ repository: string, exclusionsFile: string } | undefined} [coverage] */
export function checkProject(project, coverage = path.resolve(project) === defaultProject ? {
  repository: path.resolve(import.meta.dirname, '../..'), exclusionsFile: path.resolve(import.meta.dirname, '../checkjs-exclusions.json'),
} : undefined) {
  const config = ts.readConfigFile(project, ts.sys.readFile);
  if (config.error) return { files: [], diagnostics: [config.error] };
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(project));
  const options = { ...parsed.options, allowJs: true, checkJs: true, noEmit: true, noCheck: false };
  const program = ts.createProgram(parsed.fileNames, options);
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
  if (coverage) diagnostics.push(...coverageDiagnostics(parsed.fileNames, trackedCoverage(coverage.repository, coverage.exclusionsFile), coverage.repository));
  const host = ts.createCompilerHost(options);
  const read = host.readFile.bind(host);
  host.readFile = file => {
    const source = read(file);
    return source === undefined || !/\.[cm]?js$/.test(file) ? source : withoutDirectives(source);
  };
  const unsuppressed = ts.createProgram(parsed.fileNames, options, host);
  diagnostics.push(...ts.getPreEmitDiagnostics(unsuppressed).filter(d => bindingCodes.has(d.code)));
  const unique = new Map(diagnostics.map(d => [`${d.file?.fileName}:${d.start}:${d.code}`, d]));
  return { files: parsed.fileNames, diagnostics: [...unique.values()] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv[2] === '--update-files') {
    // [EXP-CHECKJS] Why: keep plain tsc and the mandatory Git coverage check on the
    // same inspectable roots. Rejected: silently treating a stale project list as complete.
    const config = ts.readConfigFile(defaultProject, ts.sys.readFile);
    if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
    config.config.files = trackedCoverage(path.resolve(import.meta.dirname, '../..'), path.resolve(import.meta.dirname, '../checkjs-exclusions.json'))
      .checked.map(file => `../${file}`);
    fs.writeFileSync(defaultProject, JSON.stringify(config.config, null, 2) + '\n');
    console.log('Updated tracked JavaScript roots; run lab:check to validate them.');
  } else {
  const project = path.resolve(process.argv[2] ?? defaultProject);
  const { files, diagnostics } = checkProject(project);
  if (!files.length || diagnostics.length) {
    process.stderr.write(ts.formatDiagnostics(diagnostics, {
      getCanonicalFileName: file => file,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => '\n',
    }));
    if (!files.length) process.stderr.write('checkjs: project contains no files\n');
    process.exitCode = 1;
  } else console.log(`checkjs: ${files.length} JavaScript roots checked; no diagnostics or suppressed binding errors`);
  }
}
