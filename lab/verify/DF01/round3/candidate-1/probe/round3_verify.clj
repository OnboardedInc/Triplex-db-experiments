(ns round3-verify
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.feed :as feed] [triplex.gateway.feed-test :as original]
            [offline-verify] [deadline-cut-verify]))

;; [CX-VDF01-R3] Why: separate exact logical-clock boundary claims from the unchanged real-clock counterexample.
;; Rejected: claiming exact physical nanosecond scheduling on a contended host.
(def expected-row
  {:t "105" :kind "commit"
   :transaction {:positions ["9"] :txIds ["tx9"] :operationId "op9" :commandIds []
                 :stamp "9000" :stampStatus "decided"
                 :changes [{:op "retract" :entity "subject" :attribute "status" :assertionId "fact-1"
                            :validFrom 0.0 :validTo 20.0 :position "9"}]}})
(defn emit [name value] (println (json/write-str {:probe name :observed value})))

(deftest exactly-at-deadline-with-old-cut
  (doseq [present [true false]]
    (let [clock (atom 0) visible (atom []) captures (atom []) waits (atom 0) arms (atom 0)
          deadline 5000000
          read-page (fn [from limit]
                      (is (= [105 1] [from limit]))
                      (let [cut @visible]
                        (swap! captures conj {:at @clock :rows cut})
                        (when (= 1 (count @captures))
                          (reset! clock deadline)
                          (when present (reset! visible [expected-row])))
                        cut))
          page (#'feed/poll-log-with-clock 105 1 5 read-page
                 (fn [] (swap! arms inc) (fn [_] (swap! waits inc))) #(deref clock))]
      (is (= (if present [expected-row] []) page))
      (is (= [{:at 0 :rows []} {:at deadline :rows (if present [expected-row] [])}] @captures))
      (is (= 1 @arms))
      (is (zero? @waits))
      (emit "publication-exactly-at-deadline-old-cut" {:present present :deadlineNs deadline
                                                       :captures @captures :rows page :arms @arms :waits @waits}))))

(deftest exactly-at-deadline-on-wakeup
  (doseq [present [true false]]
    (let [clock (atom 0) visible (atom []) captures (atom []) arms (atom 0) waits (atom [])
          deadline 5000000
          page (#'feed/poll-log-with-clock 105 1 5
                 (fn [from limit]
                   (is (= [105 1] [from limit]))
                   (swap! captures conj {:at @clock :rows @visible}) @visible)
                 (fn [] (swap! arms inc)
                   (fn [remaining]
                     (swap! waits conj remaining)
                     (reset! clock deadline)
                     (when present (reset! visible [expected-row]))))
                 #(deref clock))]
      (is (= (if present [expected-row] []) page))
      (is (= (if present [0 deadline] [0 deadline deadline]) (mapv :at @captures)))
      (is (= [deadline] @waits))
      (is (= 2 @arms))
      (emit "publication-exactly-at-deadline-wakeup" {:present present :deadlineNs deadline
                                                     :captures @captures :rows page :arms @arms :waits @waits}))))

(deftest slow-final-route-read-is-one-read-even-after-budget
  (original/fake-peer
    ;; [CX-VDF01-R3] Why: the real route must finish one slow final read without restarting its wait budget.
    ;; Rejected: testing only a fast synthetic callback (cannot establish the actual final-read/cleanup behavior).
    (doseq [present [true false]]
      (let [queue (java.util.concurrent.LinkedBlockingQueue.) visible (atom 100)
            captures (atom []) removed (atom 0) final-duration (atom nil)]
        (with-redefs [d/tx-report-queue (constantly queue) d/remove-tx-report-queue (fn [_] (swap! removed inc))
                      d/basis-t :t
                      d/db (fn [_]
                             (let [cut @visible n (count (swap! captures conj cut))]
                               (when (and (= n 2) present) (reset! visible 105))
                               (when (= n 3)
                                 (let [start (System/nanoTime)]
                                   (Thread/sleep 75)
                                   (reset! final-duration (/ (- (System/nanoTime) start) 1e6))))
                               (when (> n 3) (throw (Exception. "Repeated final read")))
                               {:t cut}))]
          (let [start (System/nanoTime)
                pending (future (feed/log-page (if present :slow-data :slow-empty)
                                  {"fromT" "105" "limit" "1" "waitMs" "20"}))
                page (deref pending 2000 ::timeout)
                elapsed (/ (- (System/nanoTime) start) 1e6)]
            (when (= page ::timeout) (future-cancel pending))
            (is (= {:fromT "105" :nextT (if present "106" "105") :rows (if present [expected-row] [])} page))
            (is (= [100 100 (if present 105 100)] @captures))
            (is (and (number? @final-duration) (>= @final-duration 75)))
            (is (>= elapsed 95))
            (is (= 1 @removed))
            (is (.isEmpty queue))
            (is (empty? @feed/wakeups))
            (emit "slow-final-route-read" {:present present :waitMs 20 :finalReadMs @final-duration
                                            :elapsedMs elapsed :captures @captures :removed @removed :page page})))))))

(defn -main [& _]
  (try
    (let [baseline (run-tests 'triplex.gateway.feed-test)
          original-probe (run-tests 'offline-verify)
          deadline-probe (run-tests 'deadline-cut-verify)
          edge-cases (run-tests 'round3-verify)
          results [baseline original-probe deadline-probe edge-cases]]
      (emit "round3-counts" {:baseline baseline :originalProbe original-probe :deadlineProbe deadline-probe :edgeCases edge-cases})
      (shutdown-agents)
      (System/exit (if (every? #(zero? (+ (:fail %) (:error %))) results) 0 1)))
    (catch Throwable e (.printStackTrace e) (shutdown-agents) (System/exit 2))))
