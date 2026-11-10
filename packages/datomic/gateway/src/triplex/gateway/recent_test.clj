(ns triplex.gateway.recent-test
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.main] [triplex.gateway.reach :as reach] [triplex.gateway.schema :as schema] [triplex.gateway.recent :as recent] [triplex.gateway.entity-cache :as cache]))
;; [DX-B8-C] Why: test real revision datom transaction IDs and exact publication interleavings.
;; Rejected: a numeric fake watermark without the selected DB's actual revision witness.
(defn fixture [f]
  (let [uri (str "datomic:mem://b8-recent-" (java.util.UUID/randomUUID))]
    (d/create-database uri)
    (let [conn (d/connect uri)]
      (try @(d/transact conn schema/schema) (f conn)
        (finally (d/delete-database uri) (d/release conn))))))
(defn revision [db eid] (first (d/datoms db :eavt eid :triplex.entity/rev)))
(deftest witnesses-across-cuts-and-lag
  (fixture (fn [conn]
    (let [state (recent/make-state (d/basis-t (d/db conn)))]
      (try
        (let [first-report @(d/transact conn [{:triplex.entity/id "root" :triplex.entity/rev 1}])
              first-db (:db-after first-report) eid (d/entid first-db [:triplex.entity/id "root"]) t1 (d/basis-t first-db)
              read1 #(revision first-db eid)]
          (recent/apply-report! state first-report)
          (recent/install! state eid t1 (read1) true)
          (is (= 1 (:rev (recent/lookup state eid t1 read1))))
          (with-redefs [cache/verify-enabled false]
            (is (= 1 (:rev (recent/lookup state eid t1 #(throw (Exception. "Hot witness read Datomic")))))))
          (let [marker @(d/transact conn [[:db/add eid :triplex.entity/rev 1]])]
            (recent/apply-report! state marker)
            (is (= 1 (:rev (recent/lookup state eid t1 read1)))))
          (let [second-report @(d/transact conn [[:db/add eid :triplex.entity/rev 2]])
                db2 (:db-after second-report) t2 (d/basis-t db2) read2 #(revision db2 eid)]
            (is (nil? (recent/lookup state eid t2 read2)))
            (with-redefs [cache/verify-enabled true]
              (is (thrown? clojure.lang.ExceptionInfo (recent/lookup state eid t1 read2))))
            ;; A lazy fill can include a report the consumer has not applied yet.
            (recent/install! state eid t2 (read2) true)
            (recent/apply-report! state second-report)
            (is (= 2 (:rev (recent/lookup state eid t2 read2))))
            (is (nil? (recent/lookup state eid t1 read1)))
            (recent/close! state)
            (recent/install! state eid t2 (read2) true)
            (is (nil? (recent/lookup state eid t2 read2)))))
        (finally (recent/close! state)))))))
(deftest absent-entry-publication-race
  (fixture (fn [conn]
    (let [first-report @(d/transact conn [{:triplex.entity/id "root" :triplex.entity/rev 1}])
          db1 (:db-after first-report) eid (d/entid db1 [:triplex.entity/id "root"]) t1 (d/basis-t db1)
          state (recent/make-state t1)
          next-report @(d/transact conn [[:db/add eid :triplex.entity/rev 2]]) t2 (d/basis-t (:db-after next-report))
          paused (promise) release (promise) entered (promise) publish recent/publish!]
      (try
        (with-redefs [recent/publish! (fn [s t] (deliver paused true)
                                      (when-not (deref release 5000 false) (throw (Exception. "Publication release timeout")))
                                      (publish s t))]
          (let [consumer (future (recent/apply-report! state next-report))]
            (is (deref paused 5000 false))
            (let [filler (future (deliver entered true) (recent/install! state eid t1 (revision db1 eid) true))]
              (is (deref entered 5000 false))
              (is (= ::blocked (deref filler 50 ::blocked)))
              (deliver release true)
              (is (not= ::timeout (deref consumer 5000 ::timeout)))
              (is (not= ::timeout (deref filler 5000 ::timeout)))
              (is (nil? (recent/lookup state eid t2 #(revision (:db-after next-report) eid)))))))
        (finally (deliver release true) (recent/close! state)))))))
(deftest floor-budget-and-unsafe-entities
  (fixture (fn [conn]
    (let [report @(d/transact conn (mapv #(hash-map :triplex.entity/id (str "e" %) :triplex.entity/rev 1) (range 10)))
          db (:db-after report) t (d/basis-t db)]
      (with-redefs [cache/budget 65536]
        (let [state (recent/make-state t) eid #(d/entid db [:triplex.entity/id (str "e" %)])]
          (try
            (recent/install! state (eid 0) (dec t) (revision db (eid 0)) true)
            (is (nil? (recent/lookup state (eid 0) t #(revision db (eid 0)))))
            (doseq [i (range 10)] (recent/install! state (eid i) t (revision db (eid i)) true))
            (is (<= (:recentBytes (recent/stats)) (:recentBudgetBytes (recent/stats))))
            (is (nil? (recent/lookup state (eid 0) t #(revision db (eid 0)))))
            (is (= 1 (:rev (recent/lookup state (eid 9) t #(revision db (eid 9))))))
            (recent/close! state)
            (let [fresh (recent/make-state t)]
              (try (recent/install! fresh (eid 9) t (revision db (eid 9)) false)
                   (is (nil? (recent/lookup fresh (eid 9) t #(revision db (eid 9)))))
                (finally (recent/close! fresh))))
            (finally (recent/close! state)))))))))
(deftest late-old-generation-does-not-poison-recreated-name
  (fixture (fn [old]
    (fixture (fn [fresh]
      (let [name (str "b8-generation-" (java.util.UUID/randomUUID)) old-epoch (Object.) fresh-epoch (Object.)]
        @(d/transact old [{:triplex.scope/key "old" :triplex.scope/position 0} {:triplex.entity/id "root" :triplex.entity/rev 1}])
        @(d/transact fresh (mapv #(hash-map :triplex.entity/id (str "padding" %)) (range 20)))
        @(d/transact fresh [{:triplex.scope/key "fresh" :triplex.scope/position 0} {:triplex.entity/id "root" :triplex.entity/rev 1}])
        (let [old-db (d/db old) fresh-db (d/db fresh) old-cfg (reach/config name old-db old-epoch)
              old-id (reach/entity-id old-db name "root" old-cfg)
              old-session (reach/session-map name "same-session" old-epoch)]
          (reach/forget! name)
          (let [fresh-cfg (reach/config name fresh-db fresh-epoch) fresh-id (reach/entity-id fresh-db name "root" fresh-cfg)]
            (is (not= old-id fresh-id))
            (is (not (identical? old-session (reach/session-map name "same-session" fresh-epoch))))
            (is (= old-id (reach/entity-id old-db name "root" old-cfg)))
            (is (= old-id (reach/entity-id old-db name "root" (reach/config name old-db old-epoch))))
            (is (= fresh-id (reach/entity-id fresh-db name "root" fresh-cfg)))
            (is (= (:scope fresh-cfg) (d/entid fresh-db [:triplex.scope/key "fresh"])))
            (is (= fresh-cfg (reach/config name fresh-db fresh-epoch))))
          (reach/forget! name))))))))
(defn -main [& _]
  (let [{:keys [fail error] :as result} (run-tests 'triplex.gateway.recent-test)]
    (println (json/write-str result)) (shutdown-agents)
    (System/exit (if (zero? (+ fail error)) 0 1))))
