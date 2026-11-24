;; [DX-W4] Record that Datomic's prefetch (which serves hints) is enabled in this transactor JVM. Read it after the
;; launcher has initialized its configuration (reading it first would initialize it early and stop the launcher).
(doto (Thread. (fn []
                 (Thread/sleep 20000)
                 (println "W4_TX_PREFETCH" (pr-str {:setting (System/getProperty "datomic.prefetchProbes")
                                                    :enabled (boolean ((requiring-resolve 'datomic.config/prefetch-enabled?)))}))
                 (flush)))
  (.setDaemon true) (.start))
