;; [DX-DEMO1] Why: read the live head, native t and stored record count from a fresh peer, the way the AGE1 seal counts records.
;; Rejected: trusting the handoff file or a gateway reply as proof of what PostgreSQL holds.
(ns demo.identity
  (:require [datomic.api :as d] [clojure.data.json :as json] [triplex.gateway.scope :as scope]))

(defn -main [uri database]
  (try
    (let [conn (d/connect uri)
          db (d/db conn)
          e (scope/entity db)]
      (println (str "DEMO_IDENTITY "
                    (json/write-str {:database database
                                     :physicalT (d/basis-t db)
                                     :logicalHead (scope/head-position db e)
                                     :records (:datoms (d/db-stats db))
                                     :lastRecordedAt (scope/max-recorded-at db e)})))
      (shutdown-agents)
      (System/exit 0))
    (catch Throwable t (.printStackTrace t) (System/exit 1))))
