(ns offline-verify
  (:require [clojure.test :refer :all] [clojure.data.json :as json]
            [datomic.api :as d] [triplex.gateway.feed :as feed]
            [triplex.gateway.feed-test :as original]))

;; [CX-VDF01] Why: execute the reviewed gateway with explicit Datomic-compatible cuts and queue causality.
;; Rejected: live mem/dev database (this review is offline and must not acquire the Datomic slot).
(defn emit [label value]
  (println (json/write-str {:probe label :observed value})))

(deftest annotation-wins-over-wall-clock
  (original/fake-peer
    (with-redefs [d/entity (fn [db id]
                            (cond-> (original/entity db id)
                              (= id 100) (assoc :db/txInstant (java.util.Date. 999999999))))]
      (let [row (feed/project {} (first original/pages))]
        (is (= "7000" (get-in row [:transaction :stamp])))
        (is (= "decided" (get-in row [:transaction :stampStatus])))
        (emit "different-txInstant" row)))
    (with-redefs [d/entity (fn [db id]
                            (cond-> (original/entity db id)
                              (= id 100) (-> (dissoc :triplex.tx/recorded-at)
                                            (assoc :db/txInstant (java.util.Date. 999999999)))))]
      (is (thrown-with-msg? Exception #"Incomplete" (feed/project {} (first original/pages)))))))

(deftest inclusive-pages-and-skipped-interior
  (original/fake-peer
    (let [physical (vec (concat (take 2 original/pages)
                               [{:t 103 :data []} {:t 104 :data []}]
                               (drop 2 original/pages)))
          calls (atom [])]
      (with-redefs [d/tx-range (fn [_ start end]
                                (swap! calls conj [start end])
                                (filter #(<= start (:t %) (dec end)) physical))]
        (doseq [start (range 100 107) limit [1 2 3]]
          (let [want (mapv (comp str :t) (filter #(>= (:t %) start) physical))
                pages (loop [from start result [] attempts 0]
                        (is (< attempts 10))
                        (let [p (feed/log-page :pages {"fromT" (str from) "limit" (str limit)})]
                          (if (empty? (:rows p)) result
                            (recur (parse-long (:nextT p)) (conj result p) (inc attempts)))))
                delivered (mapv :t (mapcat :rows pages))]
            (is (= want delivered))
            (is (= (count delivered) (count (distinct delivered))))))
        (is (every? #(= 106 (second %)) @calls))
        (let [skip (feed/log-page :pages {"fromT" "102" "limit" "1"})]
          (is (= [{:t "103" :kind "skipped" :reason "non-triplex"}] (:rows skip)))
          (is (= "104" (:nextT skip)))
          (emit "inside-skipped-range" skip))))))

(deftest excision-keeps-wire-bytes
  (original/fake-peer
    (reset! original/excised false)
    (let [before (json/write-str (feed/log-page :before {"fromT" "100"}))]
      (reset! original/excised true)
      (let [after (json/write-str (feed/log-page :after {"fromT" "100"}))]
        (is (= before after))
        (is (not (.contains after "protected")))
        (spit (str (System/getenv "CX_VDF01_OUTPUT") "/before-excision.json") before)
        (spit (str (System/getenv "CX_VDF01_OUTPUT") "/after-excision.json") after)
        (emit "excision-wire-equality" {:equal (= before after) :bytes (count before)})))))

(deftest empty-new-queue-replays-log-without-waiting
  (original/fake-peer
    (let [created (atom 0) removed (atom 0) queues (atom [])]
      (with-redefs [d/tx-report-queue (fn [_]
                                      (swap! created inc)
                                      (let [q (java.util.concurrent.LinkedBlockingQueue.)]
                                        (swap! queues conj q) q))
                    d/remove-tx-report-queue (fn [_] (swap! removed inc))]
        (let [first (feed/log-page :peer-before {"fromT" "100" "waitMs" "30000"})
              pending (future (feed/log-page :peer-after {"fromT" "100" "waitMs" "30000"}))
              replay (deref pending 2000 ::timeout)]
          (when (= replay ::timeout) (future-cancel pending))
          (is (= first replay))
          (is (= 2 @created @removed))
          (is (every? #(.isEmpty %) @queues))
          (is (empty? @feed/wakeups))
          (emit "restart-empty-queue" {:equal (= first replay) :created @created :removed @removed}))))))

(deftest absent-notification-still-bounded
  (original/fake-peer
    (let [queue (java.util.concurrent.LinkedBlockingQueue.) calls (atom 0)]
      (with-redefs [d/tx-report-queue (constantly queue) d/remove-tx-report-queue (fn [_] nil)
                    d/db (fn [_] {:t (if (= 1 (swap! calls inc)) 99 105)})
                    d/basis-t :t
                    d/tx-range (fn [_ start end]
                                 (filter #(<= start (:t %) (dec end)) original/pages))]
        (let [start (System/nanoTime)
              page (feed/log-page :no-report {"fromT" "100" "waitMs" "150"})
              elapsed (/ (- (System/nanoTime) start) 1e6)]
          (is (= "106" (:nextT page)))
          (is (>= elapsed 125))
          (is (empty? @feed/wakeups))
          (emit "notification-lost" {:elapsedMs elapsed :nextT (:nextT page)}))))))

(deftest delayed-old-report-must-not-finish-empty-before-deadline
  (original/fake-peer
    ;; [CX-VDF01] Why: Datomic reports may arrive after db publication; a delayed old report is legal.
    ;; Rejected: report-before-db fake (the official API explicitly rules that ordering out).
    (let [queue (java.util.concurrent.LinkedBlockingQueue.) visible (atom 100)
          calls (atom 0) events (atom []) ready (promise)]
      (with-redefs [d/tx-report-queue (constantly queue) d/remove-tx-report-queue (fn [_] nil)
                    d/db (fn [_]
                           (let [cut @visible n (swap! calls inc)]
                             (swap! events conj {:event "capture-db" :cut cut :read n})
                             (if (= n 1) (deliver ready true)
                               (when (= n 2)
                                 ;; The new tx becomes visible after the second captured cut, before return.
                                 (reset! visible 105)
                                 (swap! events conj {:event "new-db-published" :t 105})
                                 (.put queue {:db-before {:t 100} :db-after {:t 105} :tx-data []})))
                             {:t cut}))
                    d/basis-t :t
                    d/tx-range (fn [_ start end]
                                 (filter #(<= start (:t %) (dec end)) original/pages))]
        (let [start (System/nanoTime)
              pending (future (feed/log-page :delayed {"fromT" "105" "waitMs" "2000"}))]
          (is (= true (deref ready 2000 false)))
          (swap! events conj {:event "old-report-enqueued" :t 100})
          (.put queue {:db-before {:t 99} :db-after {:t 100} :tx-data []})
          (let [page (deref pending 3000 ::timeout)
                elapsed (/ (- (System/nanoTime) start) 1e6)]
            (when (= page ::timeout) (future-cancel pending))
            (is (not= ::timeout page))
            (is (= 105 @visible))
            (emit "delayed-old-report" {:page page :elapsedMs elapsed :visibleT @visible :events @events})
            ;; This is the desired long-poll property, expected to fail on reviewed bc8a5edb.
            (is (or (seq (:rows page)) (>= elapsed 1900))
                "A stale notification must not end an empty long-poll before its deadline")))))))

(defn -main [& _]
  (try
    (println "Original DF01 suite (fresh):")
    (let [baseline (run-tests 'triplex.gateway.feed-test)
          _ (println "CX-VDF01 adversarial suite (desired behavior):")
          result (run-tests 'offline-verify)]
      (emit "test-counts" {:baseline baseline :adversarial result})
      (shutdown-agents)
      (System/exit (if (zero? (+ (:fail baseline) (:error baseline) (:fail result) (:error result))) 0 1)))
    (catch Throwable e (.printStackTrace e) (shutdown-agents) (System/exit 2))))
