(ns readiness (:require [datomic.api :as d] [clojure.data.json :as json]
                       [triplex.gateway.scope :as scope]))
;; [DX-S5] Why: readiness must connect/sync/read this database, not the unrelated health database.
;; Rejected: System started, TCP listen or an HTTP health response as a target-database readiness verdict.
(defn emit [x] (println (json/write-str x)) (flush))
(defn -main [uri expected]
 (let [started (System/nanoTime)]
  (emit {:event "target-connect-start" :uri uri :expectedHead (Long/parseLong expected)})
  (let [conn (d/connect uri)]
   (emit {:event "target-connected" :elapsedMs (/ (- (System/nanoTime) started) 1e6)})
   (let [db (deref (d/sync conn) 600000 ::timeout)]
    (when (= db ::timeout) (throw (ex-info "target sync timeout" {})))
    (let [e (:e (first (d/datoms db :aevt :triplex.scope/key)))
          head (scope/head-position db e)]
     (assert (= head (Long/parseLong expected)) "target head differs")
     (emit {:event "target-head-equal" :head head :basis (d/basis-t db)
            :elapsedMs (/ (- (System/nanoTime) started) 1e6)
            :heapUsed (- (.totalMemory (Runtime/getRuntime)) (.freeMemory (Runtime/getRuntime)))})))
   (d/release conn)))
 (d/shutdown true) (shutdown-agents))
