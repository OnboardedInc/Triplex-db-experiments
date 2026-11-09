#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// [EXP-CHECKJS] Why: legacy per-file type-noise directives must never mask a missing
// binding in an unexecuted branch. Rejected: import smoke tests (bodies stay unresolved).
const bindingCodes = new Set([2304, 2305, 2306, 2459, 2460, 2503, 2552, 2614, 2686, 2693, 2694, 2708, 2724, 18004]);

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

/** @param {string} project */
export function checkProject(project) {
  const config = ts.readConfigFile(project, ts.sys.readFile);
  if (config.error) return { files: [], diagnostics: [config.error] };
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(project));
  const options = { ...parsed.options, allowJs: true, checkJs: true, noEmit: true, noCheck: false };
  const program = ts.createProgram(parsed.fileNames, options);
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
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
  const project = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, '../tsconfig.checkjs.json'));
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
