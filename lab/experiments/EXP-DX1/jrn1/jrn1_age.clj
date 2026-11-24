;; [DX-JRN1] Why: age a live toy seed the way the bulk loader aged the 1 billion copy: AGE1's own native single and
;; grouped renders at its load pin (the path that wrote the 28 million non-canonical position rows), nothing from this branch.
;; Rejected: synthesising journal rows outside the database (cannot show what the gateway's walk examines).
(ns jrn1-age
  (:require [clojure.data.json :as json]
            [datomic.api :as d]
            [triplex.age.adopt :as adopt]
            [triplex.age.native :as native]
            [triplex.age.tape :as tape]
            [triplex.gateway.group :as group]
            [triplex.gateway.scope :as scope]))

(defn filler-run! [conn from count]
  ;; [DX-JRN1] Why: a run of position entries that yield no journal, in the header shape AGE1's native seed frames write
  ;; (a position, a transaction ID and a record clock, no journal); every one fails the feed's journal filter.
  ;; Rejected: deleting or rewriting the aged saves' journals (would change rows the gate reads back).
  (let [db (d/db conn) clock (scope/max-recorded-at db (scope/entity db))]
    (doseq [i (range count) :let [p (+ from i 1)]]
      @(d/transact conn [{:db/id "datomic.tx" :triplex.tx/id (str "jrn1-run-" p) :triplex.tx/position p
                          :triplex.tx/max-recorded-at (+ clock i 1.0)}
                         {:db/id "e:run" :triplex.entity/id (str "jrn1/run/" p)}]))
    (+ from count)))

(defn -main [name seed-head-text people-text per-account-text singles-text saves-text group-text run-text out]
  (let [seed-head (Long/parseLong seed-head-text) people (Long/parseLong people-text)
        per-account (Long/parseLong per-account-text) singles (Long/parseLong singles-text)
        saves (Long/parseLong saves-text) group (Long/parseLong group-text) run (Long/parseLong run-text)
        {:keys [conn]} (adopt/scope-db name name)
        db (deref (d/sync conn) 60000 nil)
        clock (scope/max-recorded-at db (scope/entity db))
        ;; AGE1's ledger order (as PREP1's aged-live): interleaved active sample, then one probe and one idle subject per account.
        actives (for [j (range per-account), account (range 10)]
                  (adopt/subject! db seed-head clock account (quot (* j (- people 2)) per-account)))
        probes (map #(adopt/subject! db seed-head clock % (- people 2)) (range 10))
        idle (map #(adopt/subject! db seed-head clock % (dec people)) (range 10))
        active (* 10 per-account)
        pop {:seed-head seed-head :origin-clock clock :active active :people (+ active 20)
             :adopted (vec (concat actives probes idle)) :round-ms (quot tape/day-ms 3)
             :probes {7 {:owner (+ active 3) :width 2 :fields {} :prior nil}}}
        single (native/age! {:conn conn} pop 0 singles 1)
        ;; As the bulk loader does before its grouped phase: enroll the group schema the toy lacks.
        missing (filterv #(not (d/entid (d/db conn) (:db/ident %))) group/group-schema)
        _ (when (seq missing) @(d/transact conn missing))
        grouped (native/grouped-age! {:conn conn} pop singles saves group)
        last-command (tape/command pop (dec saves))
        aged-head (+ seed-head saves)
        head (filler-run! conn aged-head run)
        heavy (frequencies (map #(:owner (tape/command pop %)) (range saves)))]
    (spit out (json/write-str {:active active :people people :seedHead seed-head :saves saves :singles singles :group group
                               :agedHead aged-head :run run :head head
                               :single (select-keys single [:seconds]) :grouped (select-keys grouped [:seconds :records])
                               :lastOperation (:operation last-command) :lastTransaction (:tx last-command)
                               :saveCounts (sort-by (comp - val) heavy)}))
    (println "jrn1-age saves" saves "singles" singles "group" group)
    (shutdown-agents)
    (System/exit 0)))
