(require '[datomic.api :as d] '[triplex.gateway.main :as main] '[triplex.gateway.feed :as feed])
(import '[java.util UUID] '[java.util.concurrent TimeUnit])
(def results (atom []))
(def file "/data/df01-deadlines-002.edn")
(defn check! [v message] (when-not v (throw (ex-info message {}))))
(defn record! [case data]
  (swap! results conj (assoc data :case case :label "DIAGNOSTIC"))
  (spit file (pr-str @results))
  (println (pr-str (last @results))))
(defn skipped [report] {:t (str (d/basis-t (:db-after report))) :kind "skipped" :reason "non-triplex"})
(defn check-page! [page report]
  (check! (= [(skipped report)] (:rows page)) "Wrong transaction content")
  (check! (= (str (inc (d/basis-t (:db-after report)))) (:nextT page)) "Wrong nextT"))
(try
  (let [scope (str "[\"triplex-scope-v1\",\"test\",\"df01-deadlines\",\"" (UUID/randomUUID) "\",0]")
        created (main/create-scope! main/base-uri scope)
        conn (main/connection (str main/base-uri (:db created)))
        original-db d/db]
    (spit file (pr-str {:scope scope :db (:db created) :stage "started"}))
    ;; [EXP-DF01] Why: genuine older reports may coexist with a newer visible transaction. Rejected: manufactured report maps (would not exercise Datomic's real queue).
    (let [queue (d/tx-report-queue conn)
          older @(d/transact conn []) newer @(d/transact conn [])
          page (feed/log-page conn {"fromT" (:t (skipped newer)) "waitMs" "2000"})]
      (check-page! page newer)
      (record! "stale-report-new-log-entry" {:olderT (:t (skipped older)) :page page}))
    (let [queue (d/tx-report-queue conn) older @(d/transact conn [])
          from (str (inc (d/basis-t (:db-after older)))) start (System/nanoTime)
          page (feed/log-page conn {"fromT" from "waitMs" "100"}) elapsed (/ (- (System/nanoTime) start) 1000000.0)]
      (check! (and (= [] (:rows page)) (= from (:nextT page)) (>= elapsed 100)) "Older report caused early empty")
      (record! "older-report-no-new-entry" {:page page :elapsedMs elapsed}))
    ;; [EXP-DF01] Why: use real immutable Datomic cuts to delay readability while reports are real. Rejected: replacing tx-range or queue APIs with recorded data.
    (let [old (original-db conn) from (str (inc (d/basis-t old))) reads (atom []) ready (promise)
          publisher (future (check! (not= ::timeout (deref ready 5000 ::timeout)) "No initial cut") @(d/transact conn []))
          page (with-redefs [d/db (fn [c] (let [n (count @reads) db (if (< n 2) old (original-db c))]
                                          (swap! reads conj (d/basis-t db)) (deliver ready true) db))]
                 (feed/log-page conn {"fromT" from "waitMs" "250"}))
          report (deref publisher 5000 ::timeout)]
      (check! (not= ::timeout report) "Publication timeout")
      (check-page! page report)
      (check! (>= (count @reads) 3) "Did not reread after an unreadable report")
      (record! "report-before-readable-cut" {:page page :bases @reads}))
    (let [old (original-db conn) from (str (inc (d/basis-t old))) reads (atom []) ready (promise)
          publisher (future (check! (not= ::timeout (deref ready 5000 ::timeout)) "No initial cut") @(d/transact conn []))
          start (System/nanoTime)
          page (with-redefs [d/db (fn [c] (let [first? (empty? @reads) db (if first? old (original-db c))]
                                          (when first? (d/remove-tx-report-queue conn))
                                          (swap! reads conj (d/basis-t db)) (deliver ready true) db))]
                 (feed/log-page conn {"fromT" from "waitMs" "250"}))
          report (deref publisher 5000 ::timeout) elapsed (/ (- (System/nanoTime) start) 1000000.0)]
      (check! (not= ::timeout report) "Publication timeout")
      (check-page! page report)
      (check! (>= elapsed 250) "No-report case woke unexpectedly")
      (record! "no-report-new-log-entry" {:page page :bases @reads :elapsedMs elapsed}))
    ;; [EXP-DF01] Why: exact logical boundaries pair real Peer cuts/tx-range/reports with the clock seam. Rejected: claiming physically exact nanosecond publication from wall-clock scheduling.
    (doseq [before [1 0]]
      (let [queue (d/tx-report-queue conn) old (original-db conn) from (inc (d/basis-t old))
            clock (atom 0) captures (atom []) publication (atom nil)
            read-page (fn [start limit]
                        (let [first? (empty? @captures) db (if first? old (original-db conn))]
                          (swap! captures conj {:clock @clock :basis (d/basis-t db)})
                          (when first?
                            (let [report @(d/transact conn []) queued (.poll queue 5000 TimeUnit/MILLISECONDS)]
                              (check! queued "No real report at boundary")
                              (check! (= (d/basis-t (:db-after report)) (d/basis-t (:db-after queued))) "Report binding mismatch")
                              (.put queue queued)
                              (reset! publication report)
                              (reset! clock (- 5000000 before))
                              (reset! clock 5000000)))
                          (let [end (inc (d/basis-t db))]
                            (if (>= start end) []
                              (mapv #(feed/project db %) (take limit (d/tx-range (d/log conn) start end)))))))
            rows (#'feed/poll-log-with-clock from 100 5 read-page
                    (fn [] (fn [ns] (.poll queue (long ns) TimeUnit/NANOSECONDS))) #(deref clock))]
        (check! (= [(skipped @publication)] rows) "Boundary read missed published transaction")
        (check! (and (= 2 (count @captures)) (= 5000000 (:clock (last @captures)))) "Final cut not at deadline")
        (d/remove-tx-report-queue conn)
        (record! (if (zero? before) "logical-exact-deadline" "logical-one-ns-before-deadline")
                 {:rows rows :captures @captures :publicationLogicalNs (- 5000000 before)})))
    (check! (empty? @feed/wakeups) "Subscription leaked")
    (check! (:deleted (main/delete-scope! main/base-uri scope)) "Scratch cleanup failed")
    (record! "cleanup" {:db (:db created) :deleted true}))
  (shutdown-agents)
  (System/exit 0)
  (catch Throwable e
    (spit (str file ".failure") (pr-str {:completed @results :error (str e)}))
    (.printStackTrace e) (shutdown-agents) (System/exit 1)))
