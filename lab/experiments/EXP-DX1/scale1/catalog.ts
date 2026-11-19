import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileHash } from "./measurements.ts";
const esc = (s: unknown) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
// [DX-SCALE1] Why: the shared trace index is generated from its registry. Rejected: appending a Markdown row that the next lab collector silently removes.
export async function catalog(
  evidence: string,
  dir: string,
  terminal: any,
  entry: any,
  repo: string,
) {
  const summary = path.join(dir, "summaries"),
    attempt = JSON.parse(fs.readFileSync(path.join(summary, "attempt.json"), "utf8"));
  assert(
    attempt.nonce === terminal.nonce &&
      attempt.source === terminal.source &&
      attempt.slot === terminal.slot,
  );
  const raw = path.join(dir, "trace", "raw");
  fs.mkdirSync(raw, { recursive: true });
  fs.writeFileSync(
    path.join(raw, "location.json"),
    JSON.stringify(
      {
        source: terminal.source,
        nonce: terminal.nonce,
        serverTag: terminal.tag,
        archive: entry.raw,
      },
      null,
      2,
    ),
  );
  if (
    entry.raw &&
    fs.existsSync(path.join(dir, entry.raw.name)) &&
    !fs.existsSync(path.join(raw, entry.raw.name))
  )
    fs.linkSync(path.join(dir, entry.raw.name), path.join(raw, entry.raw.name));
  const cohort = fs.existsSync(path.join(summary, "summary.json"))
    ? JSON.parse(fs.readFileSync(path.join(summary, "summary.json"), "utf8"))
    : null;
  const finding = `${attempt.spec.scopes} × ${attempt.spec.people} deep people, ${attempt.mode}, ${terminal.scopeReports} complete scope reports, ${cohort?.invalid.length ?? "unknown"} invalid observations, service ${terminal.service}`;
  const rows: string[] = [];
  for (const s of cohort?.perScope ?? []) {
    const f = path.join(summary, `s${s.account}`, "ns-report.json");
    assert.equal(await fileHash(f), s.hashes.report);
    const r = JSON.parse(fs.readFileSync(f, "utf8"));
    for (const p of r.phases ?? [])
      rows.push(
        `<tr><td>${esc(s.account)}</td><td>${esc(p.name)}</td><td>${esc(new Date(p.start).toISOString())}</td><td>${esc(((p.end - p.start) / 1000).toFixed(2))}</td><td>${esc(p.readers)}</td><td>${esc(p.stats?.correct ?? "—")}</td></tr>`,
      );
  }
  fs.writeFileSync(
    path.join(dir, "trace.html"),
    `<!doctype html><meta charset=utf-8><title>${esc(terminal.tag)}</title><h1>${esc(terminal.tag)}</h1><p>${esc(finding)}</p><p>Source <code>${esc(terminal.source)}</code>. <a href="summaries/terminal.json">Terminal evidence</a></p><table><thead><tr><th>Account</th><th>Phase</th><th>UTC start</th><th>Seconds</th><th>Readers</th><th>Correct reads</th></tr></thead><tbody>${rows.join("")}</tbody></table>`,
  );
  fs.writeFileSync(
    path.join(dir, "trace-summary.json"),
    JSON.stringify({
      tag: terminal.tag,
      source: terminal.source,
      nonce: terminal.nonce,
      finding,
      scopeCount: attempt.spec.scopes,
      peoplePerScope: attempt.spec.people,
    }),
  );
  execFileSync(process.execPath, [path.join(repo, "lab/bin/trace-store.mjs"), "register", dir], {
    env: { ...process.env, TRIPLEX_TRACE_EVIDENCE: evidence },
  });
  assert(
    fs
      .readFileSync(path.join(evidence, "TRACE-INDEX.md"), "utf8")
      .includes(path.join(dir, "trace.html")),
  );
}
