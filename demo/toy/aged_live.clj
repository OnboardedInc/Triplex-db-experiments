;; [DX-DEMO1] Copied unchanged from PREP1 prep1/aged-live/aged_live.clj (fb751f994). [DX-PREP1] Why: age a live toy seed with AGE1's own adoption and save code at its load pin.
;; Rejected: synthesising aged rows outside the database, which cannot show what a gateway returns.
(ns aged-live
  (:require [clojure.data.json :as json]
            [datomic.api :as d]
            [triplex.age.adopt :as adopt]
            [triplex.age.tape :as tape]
            [triplex.gateway.scope :as scope]
            [triplex.gateway.storage :as storage]))

(defn -main [name seed-head-text people-text per-account-text saves-text out]
  (let [seed-head (Long/parseLong seed-head-text) people (Long/parseLong people-text)
        per-account (Long/parseLong per-account-text) saves (Long/parseLong saves-text)
        {:keys [conn]} (adopt/scope-db name name)
        db (deref (d/sync conn) 60000 nil)
        clock (scope/max-recorded-at db (scope/entity db))
        ;; AGE1's ledger order: interleaved active sample, then one probe and one idle person per account.
        actives (for [j (range per-account), account (range 10)]
                  (adopt/subject! db seed-head clock account (quot (* j (- people 2)) per-account)))
        probes (map #(adopt/subject! db seed-head clock % (- people 2)) (range 10))
        idle (map #(adopt/subject! db seed-head clock % (dec people)) (range 10))
        active (* 10 per-account)
        pop {:seed-head seed-head :origin-clock clock :active active :people (+ active 20)
             :adopted (vec (concat actives probes idle)) :round-ms (quot tape/day-ms 3)
             :probes {7 {:owner (+ active 3) :width 2 :fields {} :prior nil}}}]
    (doseq [n (range saves)]
      (let [command (tape/command pop n)
            reply (storage/commit! name conn (d/db conn) (tape/input command))]
        (when-not (= [(:operation command) (str (:position command))]
                     [(:operationId reply) (get-in reply [:position "v"])])
          (throw (ex-info "AGE1 save receipt differs" {:n n :reply (str reply)})))))
    (let [last-command (tape/command pop (dec saves))]
      (spit out (json/write-str {:active active :people people :seedHead seed-head :saves saves
                                 :lastOperation (:operation last-command) :lastTransaction (:tx last-command)
                                 :lastRecordedAt (:clock last-command)
                                 :owners (map (fn [s] {:account (:account s) :person (:local s)}) (:adopted pop))})))
    (println "aged-live saves" saves)
    (shutdown-agents)
    (System/exit 0)))
