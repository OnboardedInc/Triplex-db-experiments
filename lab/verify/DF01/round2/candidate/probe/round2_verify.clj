(ns round2-verify
  (:require [clojure.test :refer :all] [clojure.data.json :as json]
            [datomic.api :as d] [triplex.gateway.feed :as feed]
            [triplex.gateway.feed-test :as original] [offline-verify :as prior]))

;; [CX-VDF01-R2] Why: test F1's deadline and rearming under legal stale-report delivery.
;; Rejected: modifying the production loop or weakening the unchanged original reviewer probe.
(defn emit [name value] (println (json/write-str {:probe name :observed value})))
(defn until-ns [target]
  (loop []
    (let [remaining (- target (System/nanoTime))]
      (when (pos? remaining)
        (if (> remaining 2000000)
          (Thread/sleep (long (max 1 (dec (quot remaining 1000000)))))
          (Thread/onSpinWait))
        (recur)))))

(deftest stale-report-storm-keeps-one-deadline
  (original/fake-peer
    (let [queue (java.util.concurrent.LinkedBlockingQueue.) ready (promise)
          reads (atom 0) removed (atom 0)]
      (with-redefs [d/tx-report-queue (constantly queue)
                    d/remove-tx-report-queue (fn [_] (swap! removed inc))
                    d/db (fn [_] (swap! reads inc) (deliver ready true) {:t 100}) d/basis-t :t]
        (let [start (System/nanoTime)
              result (future (feed/log-page :storm {"fromT" "105" "waitMs" "120"}))]
          (is (= true (deref ready 2000 false)))
          (let [sent (System/nanoTime)]
            (dotimes [_ 1000] (.put queue {:db-before {:t 99} :db-after {:t 100} :tx-data []}))
            (let [burst-ms (/ (- (System/nanoTime) sent) 1e6)]
              (is (< burst-ms 10) "Fixture must send all 1000 stale reports within 10 ms")
              (is (= ::pending (deref result 15 ::pending)))
              (let [page (deref result 2000 ::timeout) elapsed (/ (- (System/nanoTime) start) 1e6)]
                (when (= page ::timeout) (future-cancel result))
                (is (= {:fromT "105" :nextT "105" :rows []} page))
                (is (>= elapsed 120))
                (is (< @reads 1005) "Reusing a delivered promise would spin after the report burst")
                (is (= 1 @removed))
                (is (empty? @feed/wakeups))
                (emit "1000-stale-reports" {:reports 1000 :burstMs burst-ms :elapsedMs elapsed
                                             :reads @reads :removed @removed :page page})))))))))

(deftest stale-storm-does-not-hide-new-data
  (original/fake-peer
    (let [queue (java.util.concurrent.LinkedBlockingQueue.) ready (promise) visible (atom 100) reads (atom 0)]
      (with-redefs [d/tx-report-queue (constantly queue) d/remove-tx-report-queue (fn [_] nil)
                    d/db (fn [_] (swap! reads inc) (deliver ready true) {:t @visible}) d/basis-t :t]
        (let [result (future (feed/log-page :storm-data {"fromT" "105" "waitMs" "2000"}))]
          (is (= true (deref ready 2000 false)))
          (dotimes [_ 1000] (.put queue {:db-before {:t 99} :db-after {:t 100} :tx-data []}))
          (reset! visible 105)
          (.put queue {:db-before {:t 100} :db-after {:t 105} :tx-data []})
          (let [page (deref result 2500 ::timeout)]
            (when (= page ::timeout) (future-cancel result))
            (is (= ["105"] (mapv :t (:rows page))))
            (is (= "106" (:nextT page)))
            (is (empty? @feed/wakeups))
            (emit "storm-then-visible-t105" {:reads @reads :page page})))))))

(deftest zero-wait-never-subscribes-or-waits
  (original/fake-peer
    (let [reads (atom 0) visible (atom 100)]
      (with-redefs [d/tx-report-queue (fn [_] (throw (Exception. "Zero wait must not subscribe")))
                    d/remove-tx-report-queue (fn [_] (throw (Exception. "Zero wait must not unsubscribe")))
                    d/db (fn [_] (swap! reads inc) {:t @visible}) d/basis-t :t]
        (let [empty-page (feed/log-page :zero {"fromT" "105" "waitMs" "0"})]
          (is (= {:fromT "105" :nextT "105" :rows []} empty-page))
          (is (= 1 @reads))
          (reset! visible 105)
          (let [page (feed/log-page :zero {"fromT" "105" "waitMs" "0"})]
            (is (= ["105"] (mapv :t (:rows page))))
            (is (= "106" (:nextT page)))
            (is (= 2 @reads))
            (is (empty? @feed/wakeups))
            (emit "waitMs-zero" {:empty empty-page :populated page :reads @reads})))))))

(deftest publication-one-millisecond-before-deadline
  (original/fake-peer
    ;; [CX-VDF01-R2] Why: bracket the real internal deadline without replacing its clock or wait.
    ;; Rejected: claiming a precise last-millisecond schedule from Thread/sleep alone (scheduler jitter).
    (doseq [attempt (range 3)]
      (let [queue (java.util.concurrent.LinkedBlockingQueue.) visible (atom 100)
            real-poll feed/poll-log lower (atom nil) upper (atom nil) publication (atom nil)
            publisher (atom nil) reads (atom 0)]
        (with-redefs [d/tx-report-queue (constantly queue) d/remove-tx-report-queue (fn [_] nil)
                      d/db (fn [_] (swap! reads inc) {:t @visible}) d/basis-t :t
                      feed/poll-log
                      (fn [from limit ms read-page arm-wait]
                        (reset! lower (+ (System/nanoTime) (* ms 1000000)))
                        (real-poll from limit ms read-page
                          (fn []
                            (when (nil? @upper)
                              (reset! upper (+ (System/nanoTime) (* ms 1000000)))
                              (reset! publisher
                                (future
                                  (until-ns (- @lower 1000000))
                                  (reset! visible 105)
                                  (reset! publication (System/nanoTime))
                                  (.put queue {:db-before {:t 100} :db-after {:t 105} :tx-data []}))))
                            (arm-wait)))))]
          (let [result (future (feed/log-page (keyword (str "edge-" attempt)) {"fromT" "105" "waitMs" "100"}))
                page (deref result 2000 ::timeout)]
            (when (= page ::timeout) (future-cancel result))
            (when @publisher (deref @publisher 2000 ::timeout))
            (is (number? @publication))
            (when (number? @publication)
              (let [lead-min (/ (- @lower @publication) 1e6)
                    lead-max (/ (- @upper @publication) 1e6)]
                (is (<= 0.7 lead-min lead-max 1.3)
                    "Measured publication must be in the final approximately 1 ms, before the actual deadline")
                (is (= ["105"] (mapv :t (:rows page))))
                (is (= "106" (:nextT page)))
                (is (empty? @feed/wakeups))
                (emit "last-millisecond-publication" {:attempt attempt :leadMinMs lead-min :leadMaxMs lead-max
                                                        :reads @reads :page page})))))))))

(defn -main [& _]
  (try
    (let [baseline (run-tests 'triplex.gateway.feed-test)
          original-probe (run-tests 'offline-verify)
          edge-cases (run-tests 'round2-verify)
          results [baseline original-probe edge-cases]]
      (emit "round2-counts" {:baseline baseline :originalProbe original-probe :edgeCases edge-cases})
      (shutdown-agents)
      (System/exit (if (every? #(zero? (+ (:fail %) (:error %))) results) 0 1)))
    (catch Throwable e (.printStackTrace e) (shutdown-agents) (System/exit 2))))
