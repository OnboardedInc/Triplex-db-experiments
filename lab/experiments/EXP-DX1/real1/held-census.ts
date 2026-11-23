import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import type { Census } from "./seal.ts";

// [DX-INT1] The native census of the held SCALE1 copy, before and after this build opens its scope.
const peer = (slot: string, program: string) => execFileSync("docker", ["exec", "-i", "-e",
  "DATOMIC_JAVA_OPTS=-Xms128m -Xmx512m -XX:+UseSerialGC", slot + "-gw-w", "/opt/datomic/bin/run", "/dev/stdin"],
{ input: program, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const sqlBytes = (slot: string) => Number(execFileSync("docker", ["exec", slot + "-pg", "psql", "-XAtq", "-v", "ON_ERROR_STOP=1",
  "-U", "postgres", "-d", "datomic", "-c", "select pg_database_size(current_database())"], { encoding: "utf8" }).trim());

export function census(slot: string, db: string, index = false): Census {
  assert.match(db, /^s2-[a-zA-Z0-9_-]+$/);
  const raw = peer(slot, `(require '[datomic.api :as d] '[triplex.gateway.main :as g] '[triplex.gateway.storage :as s])
(let [conn (d/connect (g/db-uri "${db}"))
      t (d/basis-t (d/db conn))]
  ${index ? "(d/request-index conn) (assert (deref (d/sync-index conn t) 900000 nil))" : ""}
  (let [view (d/db conn)]
    (println "DX_REAL1_CENSUS" (s/head-position view) (d/basis-t view) (:datoms (d/db-stats view)))))
(shutdown-agents)
(System/exit 0)`);
  const m = /^DX_REAL1_CENSUS (\d+) (\d+) (\d+)$/m.exec(raw);
  assert(m, "Missing native Datomic census");
  return { head: Number(m[1]), nativeT: Number(m[2]), nativeRecords: Number(m[3]), sqlBytes: sqlBytes(slot) };
}

export type Installed = { t: number; attribute: string; added: boolean; entity: string; ident?: string };

// Every native record a scope open may write: schema attributes, database functions, their idents and the two scope
// fields that name the installed schema and commit function, plus each transaction's own time.
const installAttributes = new Set([":db/ident", ":db/fn", ":db/valueType", ":db/cardinality", ":db/unique", ":db/index",
  ":db/doc", ":db/noHistory", ":db/isComponent", ":db/fulltext", ":db.install/attribute", ":db.install/function",
  ":db.alter/attribute", ":db/txInstant", ":triplex.scope/schema-hash", ":triplex.scope/commit-fn-hash"]);

// Lists every native record written after native t `after`, by attribute and entity name.
export function installsSince(slot: string, db: string, after: number): Installed[] {
  assert.match(db, /^s2-[a-zA-Z0-9_-]+$/);
  assert(Number.isSafeInteger(after) && after > 0);
  const raw = peer(slot, `(require '[datomic.api :as d] '[triplex.gateway.main :as g])
(let [conn (d/connect (g/db-uri "${db}")) view (d/db conn) history (d/history view)
      name (fn [e] (let [i (d/ident view e)] (if i (pr-str i) (str e))))]
  (doseq [{:keys [t data]} (d/tx-range (d/log conn) ${after + 1} nil) datom data]
    (let [a (d/ident view (:a datom))]
      (println "DX_REAL1_INSTALL" t (pr-str a) (:added datom) (name (:e datom))
        (if (= a :db/ident) (pr-str (:v datom)) "-"))))
  (println "DX_REAL1_INSTALL_END" (d/basis-t view)))
(shutdown-agents)
(System/exit 0)`);
  assert.match(raw, /^DX_REAL1_INSTALL_END \d+$/m, "Missing native install listing");
  return [...raw.matchAll(/^DX_REAL1_INSTALL (\d+) (\S+) (true|false) (\S+) (\S+)$/gm)].map((m) => ({
    t: Number(m[1]), attribute: m[2]!, added: m[3] === "true", entity: m[4]!, ...(m[5] !== "-" ? { ident: m[5] } : {}),
  }));
}

// [DX-INT1] Why: the census expected 429,778,659 native records, the count of the held copy as SCALE1 sealed it, but
// was taken after checkAdoptedPeer had opened the scope, and that open installs this build's schema and functions.
// The 63 extra records on bench 3 at 8597e3ef7 are reproduced exactly on a toy copy sealed by the same seed gateway
// (int1/LAUNCH-FIXES.md): four transactions that add twelve erasure, private-value and group attributes, the group
// apply function and this build's commit function, and replace the scope's schema and commit-function hashes.
// Count the held copy before the open, then name every record the open wrote.
// Rejected: widening the expected count, or taking the expected count from whatever the open happens to write.
export function checkScopeOpen(sealed: Census, opened: Census, installed: Installed[]) {
  assert.equal(opened.head, sealed.head, "Opening the scope moved the logical head");
  assert(opened.nativeT >= sealed.nativeT);
  const foreign = installed.filter((r) => !installAttributes.has(r.attribute));
  assert.deepEqual(foreign, [], "Opening the scope wrote native records other than schema, functions and scope names");
  const transactions = new Set(installed.map((r) => r.t));
  assert.equal(installed.filter((r) => r.attribute === ":db/txInstant").length, transactions.size);
  assert(installed.every((r) => r.t > sealed.nativeT && r.t <= opened.nativeT));
  const added = installed.filter((r) => r.added).length, retracted = installed.length - added;
  // Datomic's db-stats counts retractions as records too, so the census difference is exactly the listed records.
  assert.equal(opened.nativeRecords - sealed.nativeRecords, installed.length, "Native records outside the listed scope open");
  return { sealed, opened, transactions: transactions.size, added, retracted, records: opened.nativeRecords - sealed.nativeRecords,
    idents: installed.flatMap((r) => r.ident && r.added ? [r.ident] : []), installed };
}
