;; [DX-ACT7] Why: the miniature of the 1 billion settlement run needs a database aged the way the 1 billion copy was:
;; AGE1's own adoption (`adopt/subject!` in its ledger order), its probe entries (`rung/add-probes`, as its measurement
;; windows add them), its single native saves (`native/age!`) and its bulk loader's grouped renders
;; (`native/grouped-age!`), all at AGE1's load pin with its transactor functions. It then writes the two replay ledgers
;; as AGE1 persists them (`pr-str`: the population without probes, the checkpoint with the final offset and the probe
;; map) and, for the TypeScript replay's cross-check, AGE1's own `tape/expected-adopted` rows of every adopted subject.
;; Rejected: synthesising aged rows outside the database (the run must read rows the aging tool wrote) or a population
;; without probes (the 1 billion ledger has them, and the replay must follow them).
(ns aged-toy
  (:require [clojure.data.json :as json]
            [datomic.api :as d]
            [triplex.age.adopt :as adopt]
            [triplex.age.native :as native]
            [triplex.age.rung :as rung]
            [triplex.age.tape :as tape]
            [triplex.gateway.group :as group]
            [triplex.gateway.scope :as scope]))

(defn -main [name seed-head-text people-text per-account-text singles-text saves-text group-text out]
  (let [seed-head (Long/parseLong seed-head-text) people (Long/parseLong people-text)
        per-account (Long/parseLong per-account-text) singles (Long/parseLong singles-text)
        saves (Long/parseLong saves-text) size (Long/parseLong group-text)
        {:keys [conn]} (adopt/scope-db name name)
        db (deref (d/sync conn) 60000 nil)
        clock (scope/max-recorded-at db (scope/entity db))
        actives (for [j (range per-account), account (range 10)]
                  (adopt/subject! db seed-head clock account (quot (* j (- people 2)) per-account)))
        probe-subjects (map #(adopt/subject! db seed-head clock % (- people 2)) (range 10))
        idle (map #(adopt/subject! db seed-head clock % (dec people)) (range 10))
        active (* 10 per-account)
        population {:seed-head seed-head :origin-clock clock :active active :people (+ active 20)
                    :adopted (vec (concat actives probe-subjects idle)) :round-ms (quot tape/day-ms 3)}
        ;; Probes inside the single phase, as AGE1's windows add them: accounts 0, 1, 0 again (a second probe save of the
        ;; same subject, so its earlier fields come from the probe map) and 2.
        pop (rung/add-probes population 5 [{:account 0 :width 2} {:account 1 :width 3} {:account 0 :width 1}
                                           {:account 2 :width 1}])
        single (native/age! {:conn conn} pop 0 singles 1)
        missing (filterv #(not (d/entid (d/db conn) (:db/ident %))) group/group-schema)
        _ (when (seq missing) @(d/transact conn missing))
        grouped (native/grouped-age! {:conn conn} pop singles saves size)
        last-command (tape/command pop (dec saves))
        final (d/db conn)]
    (spit (str out "/population.edn") (str (pr-str population) "\n"))
    (spit (str out "/checkpoint.edn") (str (pr-str {:observed saves :probes (:probes pop) :t (d/basis-t final)}) "\n"))
    (spit (str out "/aged.json")
          (json/write-str {:active active :people people :seedHead seed-head :saves saves :singles singles :group size
                           :physicalT (d/basis-t final) :datoms (:datoms (d/db-stats final))
                           :lastOperation (:operation last-command) :lastTransaction (:tx last-command)
                           :lastRecordedAt (:clock last-command)
                           :single (select-keys single [:seconds :records]) :grouped (select-keys grouped [:seconds :records])
                           :expected (vec (for [k (range (+ active 20))]
                                            (let [s (nth (:adopted pop) k)]
                                              {:k k :account (:account s) :local (:local s)
                                               :rows (mapv #(select-keys % [:id :attribute :value_string :recorded_position])
                                                           (tape/expected-adopted pop k saves))})))}))
    (println "aged-toy saves" saves "singles" singles "group" size "probes" (count (:probes pop)))
    (shutdown-agents)
    (System/exit 0)))
