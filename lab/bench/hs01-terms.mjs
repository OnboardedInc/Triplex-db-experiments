// [EXP-HS01-R3] Why: one definition of the per-term byte table for round 2 / round 3 seed manifests (dbstat per object, B per asserted fact).
// usage: node lab/bench/hs01-terms.mjs <seed-manifest.json>...   Rejected: hand-summed tables (terms must come from the manifest's dbstat).
import fs from "node:fs";
const term = (name) => {
  if (/^(facts|facts_id)$/.test(name)) return "facts + id index";
  if (/^(history|history_id)$/.test(name)) return "history + id index";
  if (/^(journal|journal_id)$/.test(name)) return "journal rows + id index";
  if (/^(jrec|jrec_id|txs_tx)$/.test(name)) return "journal records + indexes";
  if (/^(ents|entkey|sqlite_autoindex_ents_1)$/.test(name)) return "entity dictionary + lookup";
  if (
    /^(attrs|strs|hds|sqlite_autoindex_attrs_1|sqlite_autoindex_strs_1|sqlite_autoindex_hds_1)$/.test(
      name,
    )
  )
    return "attribute/type/actor/head dictionaries";
  if (name === "txs") return "transaction dictionary";
  if (
    /^(heads|claims|operations)$/.test(name) ||
    /^sqlite_autoindex_(heads|claims|operations)_1$/.test(name)
  )
    return "heads, claims, operations";
  if (/^(frames|frames_commits)$/.test(name)) return "retained frames + index";
  return "marker, pins, retention, epochs, schema, other";
};
for (const file of process.argv.slice(2)) {
  const m = JSON.parse(fs.readFileSync(file, "utf8"));
  const terms = new Map();
  for (const o of m.dbstat) terms.set(term(o.name), (terms.get(term(o.name)) ?? 0) + o.bytes);
  const used = [...terms.values()].reduce((a, b) => a + b, 0);
  const free = m.logicalBytes - used;
  console.log(
    `\n${file}\nassertions ${m.assertions}, logical ${m.logicalBytes}, B per fact ${m.bytesPerAssertion.toFixed(2)}, journal records ${m.round3?.journalRecords}, ids ${m.round3?.ids}`,
  );
  for (const [t, b] of [...terms].sort((a, b) => b[1] - a[1]))
    console.log(
      `${t.padEnd(46)} ${String(b).padStart(13)}  ${(b / m.assertions).toFixed(2).padStart(8)}`,
    );
  console.log(
    `${"free/unallocated pages".padEnd(46)} ${String(free).padStart(13)}  ${(free / m.assertions).toFixed(2).padStart(8)}`,
  );
}
