(ns triplex.gateway.feed-test
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.feed :as feed] [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.feed-live]))

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
    (is (= pages (feed/poll-log 100 3 100 (fn [_ _] (if (= 1 (swap! calls inc)) [] pages)) (fn [] (fn [_] (swap! wakes inc))))))
    (is (= 1 @wakes))
    (is (= pages (feed/poll-log 100 3 100 (fn [_ _] pages) (fn [] (fn [_] (throw (Exception. "queue lost")))))))))
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

;; [EXP-DF01-R2] Why: notifications and the immutable read view can disagree during publication.
;; Rejected: favorable-only fixtures that make data readable before their sole notification (F1).
(deftest early-report-before-readable-cut
  (fake-peer
    (let [queue (java.util.concurrent.LinkedBlockingQueue.) visible (atom 100)
          ready (promise) second-read (promise) reads (atom 0) removed (atom 0)]
      (with-redefs [d/tx-report-queue (constantly queue) d/remove-tx-report-queue (fn [_] (swap! removed inc))
                    d/db (fn [_] (let [cut @visible n (swap! reads inc)]
                                  (if (= n 1) (deliver ready true) (deliver second-read true)) {:t cut}))
                    d/basis-t :t]
        (let [started (System/nanoTime)
              result (future (feed/log-page :early {"fromT" "105" "waitMs" "180"}))]
          (is (= true (deref ready 2000 false)))
          (.put queue {:t 105})
          (is (= true (deref second-read 2000 false)))
          (is (= ::pending (deref result 20 ::pending)))
          (reset! visible 105)
          ;; No further report: the deadline itself must trigger the final log read.
          (let [page (deref result 2000 ::timeout)]
            (is (= ["105"] (mapv :t (:rows page))))
            (is (= "106" (:nextT page)))
            (is (>= (/ (- (System/nanoTime) started) 1e6) 180)))
          (is (<= @reads 5))
          (is (= 1 @removed))
          (is (empty? @feed/wakeups)))))))

(deftest old-report-with-empty-log-keeps-deadline-and-rearms
  (fake-peer
    (let [queue (java.util.concurrent.LinkedBlockingQueue.) ready (promise) reads (atom 0)]
      (with-redefs [d/tx-report-queue (constantly queue) d/remove-tx-report-queue (fn [_] nil)
                    d/db (fn [_] (swap! reads inc) (deliver ready true) {:t 100}) d/basis-t :t]
        (let [started (System/nanoTime)
              result (future (feed/log-page :old {"fromT" "105" "waitMs" "150"}))]
          (is (= true (deref ready 2000 false)))
          (.put queue {:t 99})
          (is (= ::pending (deref result 20 ::pending)))
          (is (= {:fromT "105" :nextT "105" :rows []} (deref result 2000 ::timeout)))
          (is (>= (/ (- (System/nanoTime) started) 1e6) 150))
          (is (<= @reads 5) "A consumed signal must not cause a busy loop")
          (is (empty? @feed/wakeups)))))))

(deftest no-report-with-new-log-entry-still-delivers
  (fake-peer
    (let [queue (java.util.concurrent.LinkedBlockingQueue.) ready (promise) visible (atom 100)]
      (with-redefs [d/tx-report-queue (constantly queue) d/remove-tx-report-queue (fn [_] nil)
                    d/db (fn [_] (let [cut @visible] (deliver ready true) {:t cut})) d/basis-t :t]
        (let [result (future (feed/log-page :silent {"fromT" "105" "waitMs" "100"}))]
          (is (= true (deref ready 2000 false)))
          (reset! visible 105)
          (let [page (deref result 2000 ::timeout)]
            (is (= ["105"] (mapv :t (:rows page))))
            (is (= "106" (:nextT page))))
          (is (.isEmpty queue))
          (is (empty? @feed/wakeups)))))))

;; [EXP-DF01-R3] Why: a controlled monotonic clock specifies the exact expiry nanosecond without scheduler guesses.
;; Rejected: labeling an approximate wall-clock publication as an exact-deadline regression.
(deftest final-cut-at-and-after-deadline
  (doseq [publication-time [999999 1000000] present [true false]]
    (let [clock (atom 0) visible (atom []) captures (atom []) arms (atom 0) waits (atom 0)
          rows [{:t "105" :kind "skipped" :reason "non-triplex"}]
          read-page (fn [from limit]
                      (is (= [105 1] [from limit]))
                      (let [cut @visible]
                        (swap! captures conj {:at @clock :rows cut})
                        (when (= 1 (count @captures))
                          (reset! clock publication-time)
                          (when present (reset! visible rows))
                          ;; Return the captured empty cut only after the deadline, as in review F1.
                          (reset! clock 1000001))
                        cut))
          result (#'feed/poll-log-with-clock 105 1 1 read-page
                   (fn [] (swap! arms inc) (fn [_] (swap! waits inc))) #(deref clock))]
      (is (= (if present rows []) result))
      (is (= [{:at 0 :rows []} {:at 1000001 :rows (if present rows [])}] @captures))
      (is (= 1 @arms))
      (is (= 0 @waits)))))

(deftest zero-wait-still-captures-exactly-one-db
  (fake-peer
    (let [captures (atom [])]
      (with-redefs [d/tx-report-queue (fn [_] (throw (Exception. "Zero wait subscribed")))
                    d/remove-tx-report-queue (fn [_] (throw (Exception. "Zero wait removed a queue")))
                    d/basis-t :t]
        (doseq [cut [100 105]]
          (reset! captures [])
          (with-redefs [d/db (fn [_] (swap! captures conj cut) {:t cut})]
            (let [page (feed/log-page :zero {"fromT" "105" "waitMs" "0"})]
              (is (= [cut] @captures))
              (is (= (if (= cut 105) ["105"] []) (mapv :t (:rows page))))
              (is (= (if (= cut 105) "106" "105") (:nextT page))))))
      (is (empty? @feed/wakeups))))))

;; [EXP-DF01-R4] Why: R47-c / Q107c. A Datomic feed change is an application change; journal facts (type "_Transaction", subject = the
;; fact's own tx id) are excluded exactly as the broker feed and P2X exclude them. Position, id, stamp and skipped listing are unchanged.
;; Rejected: asserting against a mocked projection only (it would not run the schema attribute :f/entity-type that decides exclusion);
;; the real-peer test below runs datomic:mem:// through storage/commit! and feed/log-page.
(deftest journal-predicate
  (let [journal {:f/entity-type "_Transaction" :f/subject {:triplex.entity/id "_tx/t1"} :f/asserted-in {:triplex.tx/id "_tx/t1"}}]
    (is (true? (feed/journal-fact? journal)))
    (is (true? (feed/journal-fact? (assoc journal :f/tx-id "_tx/t1" :f/asserted-in {:triplex.tx/id "other"}))) "an explicit row tx id wins")
    ;; user attribute / entity that merely starts with _tx: type decides, never the prefix
    (is (not (feed/journal-fact? {:f/entity-type "Order" :f/subject {:triplex.entity/id "_tx/t1"} :f/attr {:triplex.attr/key ":_tx/change"}
                                  :f/asserted-in {:triplex.tx/id "_tx/t1"}})))
    (is (not (feed/journal-fact? {:f/subject {:triplex.entity/id "_tx/t1"} :f/attr {:triplex.attr/key "_txNote"} :f/asserted-in {:triplex.tx/id "_tx/t1"}})))
    ;; the broker predicate also needs entity id = tx id, and a null tx id never matches
    (is (not (feed/journal-fact? (assoc journal :f/subject {:triplex.entity/id "_tx/other"}))))
    (is (not (feed/journal-fact? (assoc journal :f/null-tx-id true))))
    (is (not (feed/journal-fact? {:f/entity-type "_Transaction" :f/asserted-in {:triplex.tx/id ""}})))))

(def journal-tx {:triplex.tx/position 8 :triplex.tx/id "_tx/t8" :triplex.tx/operation-id "op8" :triplex.tx/recorded-at 8000.0})
(defn mk-fact [id subject attr extra]
  (merge {:f/id id :f/subject {:triplex.entity/id subject} :f/attr {:triplex.attr/key attr} :f/valid-from 0.0
          :f/asserted-in journal-tx} extra))
(deftest journal-facts-are-not-changes-fake-peer
  (let [facts {1 (mk-fact "user-1" "order-1" "status" {:f/entity-type "Order"})
               2 (mk-fact "user-2" "order-1" "_txNote" {:f/entity-type "Order"})
               3 (mk-fact "j-pos" "_tx/t8" ":_tx/position" {:f/entity-type "_Transaction"})
               4 (mk-fact "j-chg" "_tx/t8" ":_tx/change" {:f/entity-type "_Transaction" :f/position 5})
               5 (mk-fact "old-1" "order-0" "status" {:f/entity-type "Order" :f/retracted-position 8 :f/retract-tx-id "_tx/t8" :f/tx-id "_tx/t2"})}
        data (fn [& es] [{:t 200 :data (mapv (fn [[e a]] {:e e :a a :added true}) es)}])
        page (fn [& es]
               (with-redefs [d/entity (fn [_ id] (if (= id 200) journal-tx (get facts id {}))) d/as-of (fn [db _] db) d/t->tx (fn [^long x] x)
                             d/entid (fn [_ id] id) d/q (fn [& _] []) ]
                 (feed/project {} (first (apply data es)))))]
    (let [row (page [1 :f/asserted-in] [2 :f/asserted-in] [3 :f/asserted-in] [4 :f/asserted-in] [5 :f/retracted-in])
          tx (:transaction row)]
      (is (= "commit" (:kind row)))
      (is (= [["retract" "old-1"] ["assert" "user-1"] ["assert" "user-2"]] (mapv (juxt :op :assertionId) (:changes tx)))
          "only application changes; the _txNote user attribute survives")
      (is (= ["_txNote" "status" "status"] (sort (map :attribute (:changes tx)))))
      (is (= ["5" "8"] (:positions tx)) "a journal fact's own position is still a transaction position")
      (is (= ["_tx/t8"] (:txIds tx)))
      (is (= {:stamp "8000" :stampStatus "decided"} (select-keys tx [:stamp :stampStatus]))))
    (let [tx (:transaction (page [3 :f/asserted-in] [4 :f/asserted-in]))]
      (is (= [] (:changes tx)) "a journal-only commit has no application change but is still a commit")
      (is (= ["5" "8"] (:positions tx))))
    (let [tx (:transaction (page [5 :f/retracted-in] [3 :f/asserted-in]))]
      (is (= [["retract" "old-1"]] (mapv (juxt :op :assertionId) (:changes tx))))
      (is (= ["8"] (:positions tx)) "a retract-only commit keeps its position")
      (is (= ["_tx/t8"] (:txIds tx))))
    (with-redefs [d/entity (fn [_ id] (if (= id 200) (dissoc journal-tx :triplex.tx/position) (get facts id {}))) d/as-of (fn [db _] db) d/t->tx (fn [^long x] x) d/entid (fn [_ id] id)]
      (is (= {:t "200" :kind "skipped" :reason "non-triplex"} (feed/project {} {:t 200 :data [{:e 3 :a :f/asserted-in :added true}]}))
          "the skipped listing is unchanged"))))

(defn row-of [m] (merge {:schema_version 1 :valid_from 0.0 :recorded_at 1000.0} m))
(defn wire [rows] (mapv storage/wire-row rows))
(deftest journal-facts-are-not-changes-real-peer
  (let [base "datomic:mem://" scope "[\"triplex-scope-v1\",\"test\",\"tenant\",\"df01-r4\",1]"
        name (:db (main/create-scope! base scope)) uri (str base name) conn (main/connection uri)
        journal (fn [tx pos & more]
                  (map-indexed (fn [i [attr kind k v]]
                                 (row-of (merge {:id (str tx "-j" i) :entity_id tx :attribute attr :value_type kind :entity_type "_Transaction"
                                                 :recorded_position pos :tx_id tx} {k v})))
                               (concat [[":_tx/position" "number" :value_number (double pos)]
                                        [":_tx/changed-entity" "ref" :value_string "order-1"]
                                        [":_tx/change" "json" :value_json "{\"op\":\"assert\"}"]] more)))
        commit! (fn [source position op rows new-ids claims]
                  (storage/commit! conn (main/sync-db uri)
                                   {"sourceK" source "position" position "operationId" op "rows" (wire rows) "newIds" new-ids "claims" claims}))
        ids (fn [rows] (mapv :id rows))]
    (try
      ;; 1. a Triplex transaction: three application facts (one with a _tx-prefixed attribute, one on a _tx/-prefixed entity) plus journal
      (let [app [(row-of {:id "u1" :entity_id "order-1" :attribute "status" :value_type "string" :value_string "open" :entity_type "Order"
                          :recorded_position 1 :tx_id "_tx/t1"})
                 (row-of {:id "u2" :entity_id "order-1" :attribute "_txNote" :value_type "string" :value_string "n" :entity_type "Order"
                          :recorded_position 1 :tx_id "_tx/t1"})
                 (row-of {:id "u3" :entity_id "_tx/custom" :attribute "label" :value_type "string" :value_string "l" :entity_type "Label"
                          :recorded_position 1 :tx_id "_tx/t1"})
                 (row-of {:id "u4" :entity_id "order-1" :attribute ":_tx/change" :value_type "string" :value_string "user" :entity_type "Order"
                          :recorded_position 1 :tx_id "_tx/t1"})]
            rows (concat app (journal "_tx/t1" 1 [":_tx/command-id" "string" :value_string "cmd-1"]))]
        (commit! 0 1 "op1" rows (ids rows) [{"commandId" "cmd-1" "txId" "_tx/t1" "timestamp" 1000.0}]))
      ;; 2. a retract-only application commit (the journal rows are fresh, the application fact is only retracted)
      (let [retract (row-of {:id "u1" :entity_id "order-1" :attribute "status" :value_type "string" :value_string "open" :entity_type "Order"
                             :recorded_position 1 :tx_id "_tx/t1" :retracted_at 2000.0 :retracted_position 2 :retract_tx_id "_tx/t2"})
            jr (map #(assoc % :recorded_at 2000.0) (journal "_tx/t2" 2))]
        (commit! 1 2 "op2" (concat [retract] jr) (ids jr) []))
      ;; 3. a commit with no application change at all
      (let [jr (map #(assoc % :recorded_at 3000.0) (journal "_tx/t3" 3))]
        (commit! 2 3 "op3" jr (ids jr) []))
      ;; 4. a member group: the journal rows carry the earlier position 3 inside the commit at position 5
      (let [jr (map #(assoc % :recorded_at 5000.0) (journal "_tx/t5" 4))
            app (row-of {:id "u5" :entity_id "order-2" :attribute "status" :value_type "string" :value_string "new" :entity_type "Order"
                         :recorded_position 5 :recorded_at 5000.0 :tx_id "_tx/t5"})]
        (commit! 3 5 "op5" (concat [app] jr) (ids (concat [app] jr)) []))
      (let [page (feed/log-page conn {"fromT" "0"})
            commits (filter #(= "commit" (:kind %)) (:rows page))
            skipped (filter #(= "skipped" (:kind %)) (:rows page))
            summary (fn [row] (let [t (:transaction row)]
                                {:positions (:positions t) :txIds (:txIds t) :commandIds (:commandIds t) :stamp (:stamp t)
                                 :changes (mapv (juxt :op :entity :attribute :assertionId :position) (:changes t))}))]
        (is (= 4 (count commits)))
        (is (pos? (count skipped)) "scope and schema transactions are still listed as skipped")
        (is (every? #(= "non-triplex" (:reason %)) skipped))
        (is (= {:positions ["1"] :txIds ["_tx/t1"] :commandIds ["cmd-1"] :stamp "1000"
                :changes [["assert" "order-1" "status" "u1" "1"] ["assert" "order-1" "_txNote" "u2" "1"]
                          ["assert" "_tx/custom" "label" "u3" "1"] ["assert" "order-1" ":_tx/change" "u4" "1"]]}
               (summary (nth commits 0)))
            "only application changes; user attributes and entities that start with _tx are kept")
        (is (not-any? #(.startsWith ^String (:assertionId %) "_tx/") (mapcat #(get-in % [:transaction :changes]) commits)))
        (is (= {:positions ["2"] :txIds ["_tx/t2"] :commandIds [] :stamp "2000"
                :changes [["retract" "order-1" "status" "u1" "2"]]}
               (summary (nth commits 1)))
            "a retract-only commit keeps its position, id and stamp")
        (is (= {:positions ["3"] :txIds ["_tx/t3"] :commandIds [] :stamp "3000" :changes []} (summary (nth commits 2))))
        (is (= {:positions ["4" "5"] :txIds ["_tx/t5"] :commandIds [] :stamp "5000"
                :changes [["assert" "order-2" "status" "u5" "5"]]}
               (summary (nth commits 3)))
            "a journal fact's own position still appears in positions")
        (is (= page (feed/log-page conn {"fromT" "0"})) "reading the feed again is byte-identical"))
      (finally (main/delete-scope! base scope)))))
