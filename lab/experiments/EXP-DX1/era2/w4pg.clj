(ns era2-w4pg
  "[DX-ERA2 sixth pass, owed by the fifth review (W4 ran on the file authority)] What the worker's passes cost on the
  PostgreSQL authority with no removals: the completion pass (removal-commit/complete-stale!) and the key pass
  (envelope/shred-published!), each timed 15 times, with the authority queries each pass makes counted, for 1, 25 and
  100 databases guarded per account, and for one database holding 1,000 accounts (2,000 subjects). Loaded after
  wfix1/regression.clj; run by era2/inproc-pg.sh with TX2_REMOVAL_PER_ACCOUNT=1. Prints ERA2_W4PG lines. Times are
  diagnostic (the Mac's lab VM, shared)."
  (:require [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.authority-sql :as sql] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.main :as main] [triplex.gateway.removal-commit :as rc] [triplex.gateway.selftest :as selftest]
            [triplex.gateway.storage :as storage] [wfix1-regression :as offers])
  (:import [java.util UUID]))

(defn- frame [command owner value]
  (let [tx (str "_tx/" command)
        row (fn [id e a v & [type]] {:id id :entity_id e :entity_type type :attribute a :value_type "string" :value_string v
                                     :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})
        j (fn [suffix a] (row (str command "/" suffix) tx a nil "_Transaction"))
        fact (row command owner ":v" value)
        change (json/write-str {"op" "assert" "tripleId" command "entityId" owner "attribute" ":v" "value" {"type" "string" "value" value}
                                "validFrom" 0.0 "recordedAt" 1000.0 "assertionTxId" tx})
        rows [(assoc (j "p" ":_tx/position") :value_type "number" :value_number 1.0)
              (assoc (j "t" ":_tx/instant") :value_type "datetime" :value_datetime 1000.0)
              (assoc (j "owner" ":_tx/changed-entity") :value_string owner)
              (assoc (j "cmd" ":_tx/command-id") :value_string command)
              (assoc (j "assert" ":_tx/change") :value_type "json" :value_json change) fact]]
    (selftest/row-input {"span" 1 "position" 1 "scopeWide" false "entities" [owner] "operationId" command
                         "rows" (mapv storage/wire-row rows) "newIds" (mapv :id rows) "live" []
                         "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]})))

(def queries (atom 0))
(defn- counted [f] (fn [& args] (swap! queries inc) (apply f args)))
(defn- time-pass [f]
  (let [samples (vec (for [_ (range 15)]
                       (let [q0 @queries t (System/nanoTime)] (f) [(/ (- (System/nanoTime) t) 1.0e6) (- @queries q0)])))
        ms (sort (map first samples))]
    {:median-ms (nth ms 7) :max-ms (last ms) :queries-per-pass (frequencies (map second samples))}))

(defn- make! [made]
  (let [sc (json/write-str ["triplex-scope-v1" "test" "w4pg" (str (UUID/randomUUID)) 0])
        nm (:db (main/create-scope! nil sc "lean" true true))]
    (swap! made conj sc)
    (offers/route nm "v2" "protection" {"attributes" [":v"] "sealed" true})
    (offers/route nm "v2" "removal-per-account" {})
    nm))

(defn main []
  (with-redefs [main/uri-template "datomic:mem://{db}"
                sql/read-record (counted sql/read-record) sql/read-frontier (counted sql/read-frontier) sql/scopes (counted sql/scopes)]
    (let [made (atom [])]
      (try
        (doseq [n [1 25 100]]
          (while (< (count @made) n) (make! made))
          (println "ERA2_W4PG" (pr-str {:databases n :authority-scopes (count (@#'envelope/authority-scopes))
                                        :completion-pass (time-pass rc/complete-stale!)
                                        :key-pass (time-pass @#'envelope/shred-published!)})))
        (doseq [sc @made] (main/delete-scope! nil sc))
        (reset! made [])
        ;; one database, many accounts, no removals
        (let [nm (make! made)]
          (doseq [k (range 2000)]
            (offers/send nm (frame (str "w4-" k) (str "acct/a" (mod k 1000) "/s" k) (str "value-" k))))
          (println "ERA2_W4PG" (pr-str {:databases 1 :accounts 1000 :subjects 2000
                                        :completion-pass (time-pass rc/complete-stale!)
                                        :key-pass (time-pass @#'envelope/shred-published!)})))
        (finally (doseq [sc @made] (try (main/delete-scope! nil sc) (catch Exception _ nil))))))
    (shutdown-agents)
    (System/exit 0)))
