(ns triplex.gateway.group-test
  (:require [clojure.test :refer :all] [clojure.walk] [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.group :as group] [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.journal :as journal] [triplex.gateway.reach :as reach] [triplex.gateway.selftest :as fixture]))

;; [DX-W1] Why: freeze calls, errors and intermediate worlds before running either implementation.
;; Rejected: predicting logical cuts from the shared physical t or using gateway output as the oracle.
(def stages
  [{:id "seed" :add "s"}
   {:id "first" :add "a"}
   {:id "second" :add "b"}
   {:id "stale" :add "never" :source 0}
   {:id "remove" :remove "a"}
   {:id "duplicate" :add "unused" :claim "first"}
   {:id "reuse" :add "a"}
   {:id "last" :add "c"}
   {:id "retire-old" :remove "s"}])
(def expected [:ok :ok :ok "CasConflict" :ok "CommandConflict" "IdentityConflict" :ok :ok])
(def worlds [#{} #{"s"} #{"s" "a"} #{"s" "a" "b"} #{"s" "b"} #{"s" "b" "c"} #{"b" "c"}])
(def root "acct/test/person")
(defn row [id e attr val tx]
  {:id id :entity_id e :entity_type (when (not= e root) "_Transaction") :attribute attr
   :value_type "string" :value_string val :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})
(defn input [{:keys [id add remove claim source]}]
  (let [tx (str "_tx/" id) fact (when add (row add root ":v" add tx))
        retired (when remove (assoc (row remove root ":v" remove "earlier")
                                 :retracted_at 1000.0 :retracted_position 1 :retract_tx_id tx))
        j (fn [suffix attr val] (row (str id "/" suffix) tx attr val tx))
        journal [(assoc (j "p" ":_tx/position" nil) :value_type "number" :value_number 1.0)
                 (assoc (j "t" ":_tx/instant" nil) :value_type "datetime" :value_datetime 1000.0)
                 (j "owner" ":_tx/changed-entity" root) (j "cmd" ":_tx/command-id" (or claim id))]
        fresh (cond-> journal fact (conj fact))]
    (fixture/row-input {"sourceK" source "span" 1 "position" 1 "scopeWide" false "entities" [root]
      "operationId" id "rows" (mapv storage/wire-row (cond-> fresh retired (conj retired)))
      "newIds" (mapv :id fresh) "claims" [{"commandId" (or claim id) "txId" tx "timestamp" 1000.0}]})))
(defn wait-until [f]
  (let [deadline (+ (System/nanoTime) 5000000000)]
    (loop [] (when-not (f) (assert (< (System/nanoTime) deadline) "test barrier timeout") (Thread/sleep 1) (recur)))))
(defn invoke [name conn in]
  (try (let [r (storage/commit! name conn (d/db conn) in)]
         {:outcome :ok :position (Long/parseLong (get-in r [:position "v"]))
          :clock (get-in r [:recordedAt "v"]) :size (or (:groupSize r) 1) :t (get-in r [:t "v"])})
       (catch Exception e {:outcome (:code (ex-data e)) :diagnostic (mapv str (take-while some? (iterate #(when % (ex-cause %)) e)))})))
(defn run-arm [many?]
  (let [scope (json/write-str ["triplex-scope-v1" "test" "test" (str (java.util.UUID/randomUUID)) 0])]
    (with-redefs [group/enabled many?]
      (let [name (:db (main/create-scope! nil scope "lean" true true)) uri (main/db-uri name) conn (main/connection uri)
            ins (mapv input stages) submit #(invoke name conn %)
            result (if-not many? (mapv submit ins)
                     (let [entered (promise) release (promise) original group/execute! lane (group/lane-for conn)]
                       (with-redefs [group/execute! (fn [c batch]
                                                     (when (= "seed" (:id (first batch))) (deliver entered true) @release)
                                                     (original c batch))]
                         (let [first-call (future (submit (first ins)))]
                           (try (assert (= true (deref entered 5000 false)))
                             (let [pending (mapv (fn [index]
                                                  (let [f (future (submit (nth ins index)))]
                                                    (wait-until #(= index (count (:queue @lane)))) f))
                                                (range 1 (count ins)))]
                               (is (= 0 (storage/head-position (d/db conn))))
                               (is (not-any? realized? (cons first-call pending)))
                               (deliver release true)
                               (into [@first-call] (map deref pending)))
                             (finally (deliver release true)))))))]
        (try
          (is (= expected (mapv :outcome result)) (pr-str result))
          (let [good (filterv #(= :ok (:outcome %)) result) db (d/db conn)]
            (is (= (vec (range 1 7)) (mapv :position good)))
            (is (= (mapv double (range 1000 1006)) (mapv :clock good)))
            (when many? (is (= [1 5 5 5 5 5] (mapv :size good))) (is (= 2 (count (distinct (map :t good))))))
            (doseq [[i r] (map-indexed vector result)]
              (let [id (:id (stages i)) found (storage/operation db id)]
                (if (= :ok (:outcome r))
                  (do (is (= (str (:position r)) (get-in found [:position "v"])))
                      (is (= (:clock r) (get-in found [:recordedAt "v"])))
                      (is (= (:t r) (get-in found [:t "v"]))))
                  (is (= "absent" (:status found))))))
            (doseq [p (range 1 7) basis [{"recordedPosition" p "validAt" 1.0}
                                         {"recordedAt" (+ 999.0 p) "validAt" 1.0}
                                         {"recordedAt" (+ 999.0 p) "recordedPosition" 6 "validAt" 1.0}]]
              (let [read (json/read-str (reach/build-response name db {"roots" [root] "basis" basis "full" true}))
                    found (set (map #(nth % 1) (get-in read ["entities" 0 2])))
                    generic (storage/read-rows name db {"entityIds" [root] "basis" basis "pattern" {}})]
                (is (= (worlds p) found))
                (is (= (worlds p) (set (map #(get-in % ["id" "v"]) (:rows generic)))))))
            (doseq [r (range 999 1006) p (range 1 7)]
              (let [read (json/read-str (reach/build-response name db {"roots" [root] "basis" {"recordedPosition" p "recordedAt" (double r) "validAt" 1.0} "full" true}))]
                (is (= (worlds (min p (- r 999))) (set (map #(nth % 1) (get-in read ["entities" 0 2])))))))
            (doseq [p (range 1 7)]
              (let [page (json/read-str (journal/page conn name {"after" (dec p) "limit" 1 "validAt" 1.0 "replicaRows" true}))
                    row (first (get page "transactions"))]
                (is (= [[p p]] (get page "clockEnds")))
                (is (= p (nth row 1))) (is (= (worlds p) (set (map #(nth % 1) (get-in row [3 "entities" 0 2])))))
                (let [pinned (json/read-str (journal/page conn name {"after" 0 "limit" 100 "basis" {"recordedPosition" p}}))]
                  (is (= (vec (range 1 (inc p))) (mapv second (get pinned "transactions")))))))
            (is (= "OperationDuplicate" (:outcome (submit (ins 1)))))
            (is (= 6 (storage/head-position (d/db conn))))
            (mapv #(dissoc % :size :t :diagnostic) result))
          (finally (main/delete-scope! nil scope)))))))
(deftest actual-serial-and-group
  (with-redefs [main/uri-template (or (System/getenv "W1_PROOF_URI") "datomic:mem://{db}")]
    (is (= (run-arm false) (run-arm true)))))
(deftest competing-peer-and-lost-ack
  ;; [DX-W1] Why: racing a real foreign native write invalidates the checked basis, while a lost durable reply is ambiguous.
  ;; Rejected: replaying a possibly committed batch or acknowledging a speculative result before native completion.
  (doseq [mode [:race :lost]]
    (with-redefs [group/enabled true main/uri-template (or (System/getenv "W1_PROOF_URI") "datomic:mem://{db}")]
      (let [scope (json/write-str ["triplex-scope-v1" "test" "test" (str (java.util.UUID/randomUUID)) 0])
            name (:db (main/create-scope! nil scope "lean" true true)) conn (main/connection (main/db-uri name))
            native d/transact-async submit #(invoke name conn (input %)) entered (promise) release (promise)
            initial group/execute! count-group (atom 0)]
        (try
          (with-redefs [group/execute! (fn [c batch] (when (= "seed" (:id (first batch))) (deliver entered true) @release) (initial c batch))
                        d/transact-async (fn [c data & opts]
                         (if (not-any? #(= :triplex.group/apply-v1 (first %)) data) (apply native c data opts)
                           (do (swap! count-group inc)
                             (case mode
                               :race (do @(native c [[:db/add "datomic.tx" :db/doc "external write"]]) (apply native c data opts))
                               :lost (do @(apply native c data opts) (delay (throw (ex-info "Reply lost after durability while reporting TRIPLEX_GROUP_STALE" {}))))))))]
            (let [leader (future (submit (stages 0)))]
              (try
                (assert (deref entered 5000 false))
                (let [a (future (submit (stages 1))) lane (group/lane-for conn)
                      _ (wait-until #(= 1 (count (:queue @lane))))
                      b (future (submit (stages 2))) _ (wait-until #(= 2 (count (:queue @lane))))]
                  (deliver release true)
                  (is (= :ok (:outcome @leader)))
                  (is (= (if (= mode :lost) ["OutcomeUnknown" "OutcomeUnknown"] [:ok :ok]) (mapv :outcome [@a @b])) (pr-str [@a @b]))
                  (let [saved (mapv #(storage/operation (d/db conn) %) ["first" "second"])]
                    (is (= ["2" "3"] (mapv #(get-in % [:position "v"]) saved)))
                    (is (= [1001.0 1002.0] (mapv #(get-in % [:recordedAt "v"]) saved)))
                    (is (= (= mode :lost) (apply = (map :t saved)))))
                  (is (= 1 @count-group)))
                (finally (deliver release true)))))
          (finally (main/delete-scope! nil scope)))))))
(deftest contended-accounts-share-a-physical-batch
  (with-redefs [group/enabled true main/uri-template (or (System/getenv "W1_PROOF_URI") "datomic:mem://{db}")]
    (let [key (json/write-str ["triplex-scope-v1" "test" "test" (str (java.util.UUID/randomUUID)) 0])
          name (:db (main/create-scope! nil key "lean" true true)) conn (main/connection (main/db-uri name))
          entered (promise) release (promise) worker group/execute! lane (group/lane-for conn)
          ids (concat (for [i (range 16)] ["busy" i]) [["quiet" 0] ["third" 0]])
          send (fn [a i]
                 (let [id (str a i) body (clojure.walk/postwalk-replace {root (str "acct/" a "/subject")} (input {:id id :add id}))]
                   ;; The packed text contains the same owner as its decoded wire row.
                   (invoke name conn (fixture/row-input (assoc body "groupAccount" a)))))]
      (try
        (with-redefs [group/execute! (fn [c batch] (when (= "seed" (:id (first batch))) (deliver entered true) @release) (worker c batch))]
          (let [first-call (future (invoke name conn (input (stages 0))))]
            (try
              (assert (deref entered 5000 false))
              (let [calls (mapv (fn [[index [a i]]] (let [f (future (send a i))]
                              (wait-until #(= (inc index) (count (:queue @lane)))) f)) (map-indexed vector ids))]
                (deliver release true)
                (is (= :ok (:outcome @first-call)))
                (let [rs (mapv deref calls) first-batch (:t (rs 0))]
                  (is (every? #(= :ok (:outcome %)) rs) (pr-str rs))
                  (is (= [2 3 4] (mapv :position [(rs 0) (rs 16) (rs 17)])))
                  (is (= [first-batch first-batch] (mapv :t [(rs 16) (rs 17)])))
                  (is (= (sort (map :position (take 16 rs))) (map :position (take 16 rs))))))
              (finally (deliver release true)))))
        (finally (main/delete-scope! nil key))))))
(deftest fair-with-causality
  (let [e (fn [a id predecessors] {:account a :id id :eligible true :keys #{} :predecessors predecessors :token (promise)})
        a (e "a" "a0" []) b (e "b" "b0" [(:token a)])
        entries (vec (concat [a] (for [i (range 1 16)] (e "a" (str "a" i) [])) [b (e "c" "c0" [])]))
        [left picked] (group/choose {:queue entries :accounts ["b" "c" "a"] :tails {}})]
    (is (= ["c0" "a0" "b0"] (mapv :id (take 3 picked))))
    (is (= 8 (count picked))) (is (= 10 (count (:queue left))))))
(defn -main [& [nonce]]
  (let [r (run-tests 'triplex.gateway.group-test)]
    (println "W1_NATIVE" (json/write-str (assoc r :attempt nonce)))
    (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
