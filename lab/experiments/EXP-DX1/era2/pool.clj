(ns era2-pool
  "[DX-ERA2 sixth pass, found by the SDK end-to-end stack] On the PostgreSQL authority a gateway fills a database's key
  pool when it serves that database's protection declaration, and its worker refills only the pools it already holds.
  A gateway that did not serve it (or restarted) has no pool for the database: its first sealed save found no key and
  was answered 400 TransactionRejected (the typed 503 EnvelopeKeyPoolEmpty was rewrapped). Emulated here by emptying
  the gateway's pools after the declaration (as a restart would); the save must be stored. Run by era2/inproc-pg.sh,
  with the option off and on. Prints ERA2_POOL; exits 1 when a check fails."
  (:require [clojure.data.json :as json] [triplex.gateway.envelope :as envelope] [triplex.gateway.main :as main]
            [triplex.gateway.selftest :as selftest] [triplex.gateway.storage :as storage] [wfix1-regression :as offers])
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

(defn main []
  (let [results (atom [])]
    (offers/in-scope
      (fn [name _]
        (let [p (offers/route name "v2" "protection" {"attributes" [":v"] "sealed" true})
              m (when (System/getenv "TX2_REMOVAL_PER_ACCOUNT") (offers/route name "v2" "removal-per-account" {}))
              _ (.clear ^java.util.Map @#'envelope/batches)
              first-save (offers/send name (frame "pool-1" "acct/a/one" "SECRET-pool-1"))
              second-save (offers/send name (frame "pool-2" "acct/b/one" "SECRET-pool-2"))
              read (offers/route name "v1" "read" {"entityIds" ["acct/a/one"]})]
          (println "ERA2_POOL" (pr-str {:protection (offers/outcome p) :moved (some-> m offers/outcome)
                                        :first-save-with-no-pool (offers/outcome first-save) :second (offers/outcome second-save)
                                        :read (offers/outcome read) :answers-value (.contains (json/write-str (:body read)) "SECRET-pool-1")}))
          (swap! results conj (= [200 nil] (offers/outcome first-save)) (= [200 nil] (offers/outcome second-save))
                 (.contains (json/write-str (:body read)) "SECRET-pool-1")))))
    (shutdown-agents)
    (System/exit (if (every? true? @results) 0 1))))
