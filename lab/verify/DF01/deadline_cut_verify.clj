(ns deadline-cut-verify
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.feed :as feed] [triplex.gateway.feed-test :as original]))

;; [CX-VDF01-R2] Why: publication can overlap an immutable empty cut whose return straddles expiry.
;; Rejected: testing only a final read that starts after the timer fires (misses this F1 deadline interleaving).
(defn until-ns [target]
  (loop []
    (let [remaining (- target (System/nanoTime))]
      (when (pos? remaining)
        (if (> remaining 10000000)
          (Thread/sleep (long (max 1 (- (quot remaining 1000000) 9))))
          (Thread/onSpinWait))
        (recur)))))
(deftest empty-cut-straddles-deadline-after-predeadline-publication
  (original/fake-peer
    (let [queue (java.util.concurrent.LinkedBlockingQueue.) lower (atom nil) upper (atom nil)
          visible (atom 100) publication (atom nil) captures (atom []) ready (promise)
          real-poll feed/poll-log]
      (with-redefs [d/tx-report-queue (constantly queue) d/remove-tx-report-queue (fn [_] nil)
                    d/basis-t :t
                    d/db (fn [_]
                           (let [cut @visible n (count (swap! captures conj cut))]
                             (when (= n 1) (deliver ready true))
                             (when (= n 2)
                               (until-ns (- @lower 1000000))
                               (reset! visible 105)
                               (reset! publication (System/nanoTime))
                               (.put queue {:db-before {:t 100} :db-after {:t 105} :tx-data []})
                               (until-ns (+ @upper 2000000)))
                             {:t cut}))
                    feed/poll-log (fn [from limit ms read-page arm]
                                    (reset! lower (+ (System/nanoTime) (* ms 1000000)))
                                    (real-poll from limit ms read-page
                                      (fn []
                                        (when (nil? @upper) (reset! upper (+ (System/nanoTime) (* ms 1000000))))
                                        (arm))))]
        (let [start (System/nanoTime)
              result (future (feed/log-page :expiry-cut {"fromT" "105" "waitMs" "100"}))]
          (is (= true (deref ready 2000 false)))
          (.put queue {:db-before {:t 99} :db-after {:t 100} :tx-data []})
          (let [page (deref result 2000 ::timeout)
                lead-min (/ (- @lower @publication) 1e6) lead-max (/ (- @upper @publication) 1e6)]
            (when (= page ::timeout) (future-cancel result))
            (is (<= 0.7 lead-min lead-max 1.3) "Fixture must publish approximately 1 ms before the real deadline")
            (is (= 105 @visible))
            (println (json/write-str {:probe "predeadline-publication-old-cut" :observed
                                      {:leadMinMs lead-min :leadMaxMs lead-max :captures @captures
                                       :visibleT @visible :elapsedMs (/ (- (System/nanoTime) start) 1e6) :page page}}))
            (is (= ["105"] (mapv :t (:rows page))) "A predeadline transaction must be observed after an empty cut crosses expiry")
            (is (= "106" (:nextT page)))
            (is (empty? @feed/wakeups))))))))
(defn -main [& _]
  (let [result (run-tests 'deadline-cut-verify)]
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail result) (:error result))) 0 1))))
