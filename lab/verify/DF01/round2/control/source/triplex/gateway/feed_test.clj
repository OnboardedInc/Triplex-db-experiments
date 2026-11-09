(ns triplex.gateway.feed-test
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.feed :as feed] [triplex.gateway.main :as main] [triplex.gateway.feed-live]))

;; [EXP-DF01] Why: replay fixed identity datoms with deliberately different value bytes after excision.
;; Rejected: mocking projected JSON alone (would never execute the gateway's identity selection).
(def tx {:triplex.tx/position 7 :triplex.tx/id "tx7" :triplex.tx/operation-id "op7" :triplex.tx/recorded-at 7000.0})
(def fact {:f/id "fact-1" :f/subject {:triplex.entity/id "subject"} :f/attr {:triplex.attr/key "status"}
           :f/valid-from 0.0 :f/valid-to 20.0 :f/position 3 :f/tx-id "tx3" :f.v/string "protected"})
(def pages [{:t 100 :data [{:e 1 :a :f/asserted-in :added true} {:e 1 :a :f.v/string :added true}]}
            {:t 101 :data [{:e 2 :a :db/excise :added true}]}
            {:t 105 :data [{:e 1 :a :f/retracted-in :added true}]}])
(def excised (atom false))
(defn entity [_ id]
  (cond (= id 100) tx (= id 105) (assoc tx :triplex.tx/position 9 :triplex.tx/id "tx9" :triplex.tx/operation-id "op9" :triplex.tx/recorded-at 9000.0)
        (or (= id 1) (= id [:f/id "fact-1"])) (cond-> (assoc fact :f/retracted-position 9 :f/retract-tx-id "tx9") @excised (dissoc :f.v/string))
        :else {}))
(defn fake-q [_ _ id] (if (= id 100) ["cmd7"] []))
(defmacro fake-peer [& body]
  `(with-redefs [d/entity entity d/as-of (fn [db# _#] db#) d/t->tx (fn [^long x#] (identity x#))
                 d/entid (fn [_# id#] id#) d/q fake-q
                 d/db (constantly {}) d/basis-t (constantly 105) d/log identity
                 d/tx-range (fn [_# start# end#] (filter #(<= start# (:t %) (dec end#)) pages))]
     ~@body))
(deftest recorded-projection
  (fake-peer
    (reset! excised false)
    (let [first (feed/log-page :fake {"fromT" "100" "limit" "2"})]
      (is (= "102" (:nextT first)))
      (is (= ["commit" "skipped"] (mapv :kind (:rows first))))
      (is (= ["3" "7"] (get-in first [:rows 0 :transaction :positions])))
      (is (= "7000" (get-in first [:rows 0 :transaction :stamp])))
      (is (= ["tx3" "tx7"] (get-in first [:rows 0 :transaction :txIds])))
      (is (not (.contains (json/write-str first) "protected")))
      (reset! excised true)
      (is (= first (feed/log-page :new-peer {"fromT" "100" "limit" "2"})))
      (is (= "retract" (get-in (feed/log-page :new-peer {"fromT" "102"}) [:rows 0 :transaction :changes 0 :op])))
      (is (= {:fromT "106" :nextT "106" :rows []} (feed/log-page :fake {"fromT" "106"})))
      (spit (System/getenv "DF01_RECORDED_PAGE") (json/write-str (assoc (feed/log-page :fake {"fromT" "100"}) :database "s2-Zg"))))))
(deftest legacy-stamp
  (fake-peer
    (with-redefs [d/entity (fn [db id] (let [e (entity db id)] (if (= id 100) (assoc e :triplex.tx/recorded-at 7.25) e)))]
      (is (= {:stamp nil :stampStatus "pending-RT01"}
             (select-keys (:transaction (feed/project {} (first pages))) [:stamp :stampStatus]))))))
(deftest bounded-requests
  (doseq [input [{"fromT" "-1"} {"fromT" "01"} {"fromT" "9223372036854775808"} {"limit" "0"} {"limit" "1001"} {"waitMs" "30001"}]]
    (is (thrown? Exception (feed/log-page :fake input)))))
(deftest wait-and-restart
  (let [calls (atom 0) wakes (atom 0)]
    (is (= pages (feed/poll-log 100 3 100 (fn [_ _] (if (= 1 (swap! calls inc)) [] pages)) (fn [_] (swap! wakes inc)))))
    (is (= 1 @wakes))
    (is (= pages (feed/poll-log 100 3 100 (fn [_ _] pages) (fn [_] (throw (Exception. "queue lost"))))))))
(deftest broadcast-and-cleanup
  (let [queue (java.util.concurrent.LinkedBlockingQueue.) removed (atom 0)]
    (with-redefs [d/tx-report-queue (constantly queue) d/remove-tx-report-queue (fn [_] (swap! removed inc))]
      (let [a (feed/subscribe! :fake) signal @(:signal a) b (feed/subscribe! :fake)]
        (is (identical? (:signal a) (:signal b)))
        (.put queue :report)
        (is (= true (deref signal 2000 false)))
        (feed/unsubscribe! :fake)
        (is (= 0 @removed))
        (feed/unsubscribe! :fake)
        (is (= 1 @removed))
        (is (empty? @feed/wakeups))))))
(deftest http-route
  (fake-peer
    (with-redefs [main/connection (constantly :fake)]
      (let [response (main/handler {:request-method :get :uri "/v1/db/s2-Zg/log" :query-string "fromT=100&limit=2&waitMs=0"})
            body (json/read-str (:body response))]
        (is (= 200 (:status response)))
        (is (= "s2-Zg" (get body "database")))
        (is (= "102" (get body "nextT")))))))
(defn -main [& _]
  (let [result (run-tests 'triplex.gateway.feed-test)]
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail result) (:error result))) 0 1))))

(deftest route-wakeup-and-unsupported-erasure
  (fake-peer
    (let [queue (java.util.concurrent.LinkedBlockingQueue.) ready (promise) available (atom false)]
      (with-redefs [d/tx-report-queue (constantly queue) d/remove-tx-report-queue (fn [_] nil)
                    d/tx-range (fn [_ start end] (if @available (filter #(<= start (:t %) (dec end)) pages) (do (deliver ready true) [])))]
        (let [result (future (feed/log-page :wake {"fromT" "100" "waitMs" "1000"}))]
          (is (= true (deref ready 2000 false)))
          (reset! available true)
          (.put queue :report)
          (is (= "106" (:nextT (deref result 2000 {}))))
          (is (empty? @feed/wakeups)))))
    (is (thrown-with-msg? Exception #"Erasure sequence" (feed/project {} {:t 100 :data [{:e 1 :a :f/erased-in :added true}]})))
    (with-redefs [d/entity (fn [db id] (let [e (entity db id)] (if (= id 100) (dissoc e :triplex.tx/recorded-at) e)))]
      (is (thrown-with-msg? Exception #"Incomplete" (feed/project {} (first pages)))))))
