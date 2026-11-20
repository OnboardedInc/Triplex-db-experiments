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
  const population = attempt.layout
    ? attempt.spec.accounts +
      " accounts in " +
      attempt.spec.scopes +
      " databases, " +
      attempt.spec.scopes * attempt.spec.people +
      " deep people"
    : attempt.spec.scopes + " × " + attempt.spec.people + " deep people";
  let finding = `${population}, ${attempt.mode}, ${terminal.scopeReports} complete scope reports, ${cohort ? cohort.invalid.length + " invalid observations" : "no terminal traffic measurement"}, service ${terminal.service}`;
  if (attempt.study === "decision") {
    const filename = attempt.phase === "seed" ? "seed.json" : "measurement.json";
    const result = path.join(summary, filename);
    if (terminal.service === "success") {
      const measured = JSON.parse(fs.readFileSync(result, "utf8"));
      assert(
        measured.source === attempt.source &&
          measured.nonce === attempt.nonce &&
          measured.slot === attempt.slot,
      );
      assert(measured.layout === attempt.layout && measured.people === attempt.people);
      const metric =
        attempt.phase === "seed"
          ? measured.facts + " witnessed seed facts"
          : measured.cells.length + " independently rechecked open-loop cells";
      finding = population + ", " + attempt.mode + ", " + metric;
    } else {
      finding =
        population +
        ", " +
        attempt.mode +
        ", " +
        terminal.timedFiles +
        " retained writer ledgers, service " +
        terminal.service;
    }
  }
  const rows: string[] = [];
  const physicalSeeds: { database: string; people: number; reportSha256: string }[] = [];
  for (const s of cohort?.perScope ?? []) {
    const f = path.join(summary, `s${s.account}`, "ns-report.json");
    assert.equal(await fileHash(f), s.hashes.report);
    const r = JSON.parse(fs.readFileSync(f, "utf8"));
    assert.deepEqual(r.deep.identity, {
      ...r.deep.identity,
      nonce: attempt.nonce,
      source: attempt.source,
      slot: attempt.slot,
      account: s.account,
    });
    assert(r.seed.complete && r.seed.seededSubjects === r.deep.seed.people);
    physicalSeeds.push({
      database: s.database,
      people: r.seed.seededSubjects,
      reportSha256: s.hashes.report,
    });
    for (const p of r.phases ?? [])
      rows.push(
        `<tr><td>${esc(s.account)}</td><td>${esc(p.name)}</td><td>${esc(new Date(p.start).toISOString())}</td><td>${esc(((p.end - p.start) / 1000).toFixed(2))}</td><td>${esc(p.readers)}</td><td>${esc(p.stats?.correct ?? "—")}</td></tr>`,
      );
  }
  if (physicalSeeds.length) {
    assert(
      physicalSeeds.length === terminal.scopeReports &&
        new Set(physicalSeeds.map((s) => s.database)).size === physicalSeeds.length,
    );
    const dest = path.join(dir, "driver", "ns-report.json");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    // [DX-SCALE1] Why: the shared trace index reads its subject denominator from this filename. Rejected: a blank count or the planned population when only part of a cohort was verified.
    if (physicalSeeds.length === 1) {
      const original = path.join(summary, "s0/ns-report.json");
      if (!fs.existsSync(dest)) fs.linkSync(original, dest);
      assert.equal(await fileHash(dest), physicalSeeds[0]!.reportSha256);
    } else {
      const index = {
        format: "DX-SCALE1/collected-scope-count/1",
        source: attempt.source,
        slot: attempt.slot,
        nonce: attempt.nonce,
        physicalSeeds,
        seed: { seededSubjects: physicalSeeds.reduce((n, s) => n + s.people, 0) },
      };
      const bytes = JSON.stringify(index) + "\n";
      if (!fs.existsSync(dest)) fs.writeFileSync(dest, bytes, { flag: "wx" });
      else assert.equal(fs.readFileSync(dest, "utf8"), bytes);
    }
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
