(require '[clojure.edn :as edn] '[datomic.api :as d]
         '[triplex.gateway.main :as main] '[triplex.gateway.feed :as feed])
(import '[java.util.concurrent TimeUnit])
;; [EXP-DF01] Why: leave a genuine report queued when this Peer process exits, then resume in another JVM. Rejected: claiming queue loss when no queue was opened.
(let [file "/data/df01-attempt-002.edn"
      state (edn/read-string (slurp file))
      conn (main/connection (str main/base-uri (:db state)))
      queue (d/tx-report-queue conn)
      report @(d/transact conn [])
      t (str (d/basis-t (:db-after report)))
      queued (.poll queue 5000 TimeUnit/MILLISECONDS)]
  (assert queued "Real report queue did not receive the transaction")
  (.put queue queued)
  (assert (pos? (.size queue)) "No report retained at process exit")
  (let [page (feed/log-page conn {"fromT" (:fromT state)})]
    (assert (some #(= {:t t :kind "skipped" :reason "non-triplex"} %) (:rows page)))
    (assert (= (first (:rows (:page state))) (first (:rows page))) "Original excised identity changed")
    (spit file (pr-str (assoc state :page page :queuedT t :queuedCount (.size queue))))
    (println (pr-str {:label "DIAGNOSTIC" :stage "queued-before-peer-exit" :db (:db state) :queuedT t :queuedCount (.size queue) :page page}))))
(shutdown-agents)
