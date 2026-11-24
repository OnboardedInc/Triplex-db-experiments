;; [DX-XQ1] Read-only probe of Datomic 1.0.7745 index features on an in-memory database.
;; Run inside the lab image: java -cp "/opt/datomic/peer-1.0.7745.jar:/opt/datomic/lib/*" clojure.main datomic_index_probe.clj
;; It never connects to storage or a transactor; it answers what the peer library does, not what it costs.
(require '[datomic.api :as d])
(defn show [label f]
  (println (str "== " label))
  (try (println "   " (pr-str (f)))
       (catch Throwable e (println "    THREW" (.getName (class e)) (.getMessage e)))))
(def uri "datomic:mem://xq1-probe")
(d/create-database uri)
(def conn (d/connect uri))
@(d/transact conn
  [{:db/ident :t/id :db/valueType :db.type/string :db/cardinality :db.cardinality/one :db/unique :db.unique/identity}
   {:db/ident :t/plain :db/valueType :db.type/string :db/cardinality :db.cardinality/many}
   {:db/ident :t/ix :db/valueType :db.type/string :db/cardinality :db.cardinality/many :db/index true}
   {:db/ident :t/ixt :db/valueType :db.type/tuple :db/tupleTypes [:db.type/string :db.type/string :db.type/string :db.type/string]
    :db/cardinality :db.cardinality/many :db/index true}
   {:db/ident :t/ixn :db/valueType :db.type/string :db/cardinality :db.cardinality/many :db/index true :db/noHistory true}])
(def sep "\u0001")
(defn k [& parts] (apply str (interpose sep parts)))
(def t1 (:db-after @(d/transact conn
  [{:db/id "a" :t/id "acct/a3/wk:1" :t/plain "x" :t/ix [(k "a3" ":bg" "pending" "acct/a3/wk:1" "f1") (k "a3" ":start" "2026-11-05" "acct/a3/wk:1" "f2")]
    :t/ixt [["a3" ":bg" "pending" "acct/a3/wk:1"]] :t/ixn [(k "a3" ":bg" "pending" "acct/a3/wk:1")]}
   {:db/id "b" :t/id "acct/a3/wk:2" :t/ix [(k "a3" ":bg" "clear" "acct/a3/wk:2" "f3") (k "a3" ":start" "2026-11-09" "acct/a3/wk:2" "f4")]
    :t/ixt [["a3" ":bg" "clear" "acct/a3/wk:2"]] :t/ixn [(k "a3" ":bg" "clear" "acct/a3/wk:2")]}
   {:db/id "c" :t/id "acct/a4/wk:1" :t/ix [(k "a4" ":bg" "pending" "acct/a4/wk:1" "f5")]
    :t/ixt [["a4" ":bg" "pending" "acct/a4/wk:1"]] :t/ixn [(k "a4" ":bg" "pending" "acct/a4/wk:1")]}])))
(def tx1 (d/basis-t t1))
(def db1 (d/db conn))
(show "1. AVET datoms on a non-indexed attribute" #(vec (d/datoms db1 :avet :t/plain)))
(show "2. AVET datoms on an indexed string, account a3 and attribute :bg (prefix via index-range)"
      #(mapv :v (d/index-range db1 :t/ix (k "a3" ":bg" "") (k "a3" ":bg\u0002"))))
(show "3. Range on :start within a3 between 2026-11-04 and 2026-11-08"
      #(mapv :v (d/index-range db1 :t/ix (k "a3" ":start" "2026-11-04") (k "a3" ":start" "2026-11-08"))))
(show "4. Heterogeneous tuple, cardinality many, indexed: datoms by prefix [a3 :bg pending]"
      #(mapv :v (d/datoms db1 :avet :t/ixt ["a3" ":bg" "pending"])))
(show "4b. Tuple index-range with trailing nil lower bound"
      #(mapv :v (d/index-range db1 :t/ixt ["a3" ":bg" nil nil] ["a3" ":bh" nil nil])))
(show "4c. A tuple string over 256 characters"
      #(:tx-data @(d/transact conn [[:db/add [:t/id "acct/a3/wk:1"] :t/ixt ["a3" ":bg" (apply str (repeat 300 "x")) "e"]]])))
(show "5. index-pull on AVET from [:t/ix prefix]"
      #(vec (take 3 (d/index-pull db1 {:index :avet :selector [:t/id] :start [:t/ix (k "a3" ":bg" "")]}))))
(show "6. Re-asserting an existing datom adds nothing (datom count of the transaction)"
      #(count (:tx-data @(d/transact conn [[:db/add [:t/id "acct/a3/wk:1"] :t/ix (k "a3" ":bg" "pending" "acct/a3/wk:1" "f1")]]))))
;; retract one entry and add a new one; then check as-of views
(def t2 (:db-after @(d/transact conn [[:db/retract [:t/id "acct/a3/wk:1"] :t/ix (k "a3" ":bg" "pending" "acct/a3/wk:1" "f1")]
                                      [:db/add [:t/id "acct/a3/wk:1"] :t/ix (k "a3" ":bg" "clear" "acct/a3/wk:1" "f6")]
                                      [:db/retract [:t/id "acct/a3/wk:1"] :t/ixn (k "a3" ":bg" "pending" "acct/a3/wk:1")]
                                      [:db/add [:t/id "acct/a3/wk:1"] :t/ixn (k "a3" ":bg" "clear" "acct/a3/wk:1")]])))
(show "7. Head: a3 :bg entries after the change" #(mapv :v (d/index-range t2 :t/ix (k "a3" ":bg" "") (k "a3" ":bg\u0002"))))
(show "8. As-of the first commit's t: a3 :bg entries (exact past position)"
      #(mapv :v (d/index-range (d/as-of (d/db conn) tx1) :t/ix (k "a3" ":bg" "") (k "a3" ":bg\u0002"))))
(show "9. History view of the same range (assertions and retractions with :added)"
      #(mapv (juxt :v :added :tx) (d/index-range (d/history (d/db conn)) :t/ix (k "a3" ":bg" "") (k "a3" ":bg\u0002"))))
(show "10. noHistory attribute as-of the first t (memory database; history not guaranteed in storage)"
      #(mapv :v (d/index-range (d/as-of (d/db conn) tx1) :t/ixn (k "a3" ":bg" "") (k "a3" ":bg\u0002"))))
(show "11. Isolation by prefix: a range for a3 never returns a4 rows"
      #(every? (fn [v] (.startsWith ^String v (str "a3" sep))) (map :v (d/index-range (d/db conn) :t/ix (k "a3" "") (k "a3\u0002")))))
(show "12. Adding :db/index to an existing non-indexed attribute, then reading its AVET"
      #(do @(d/transact conn [{:db/id :t/plain :db/index true}])
           (d/sync-index conn (d/basis-t (d/db conn)))
           (vec (map :v (d/datoms (d/db conn) :avet :t/plain)))))
(show "13. seek-datoms AVET from a prefix, first 2" #(mapv :v (take 2 (d/seek-datoms (d/db conn) :avet :t/ix (k "a3" ":start" "")))))
(show "14. rseek-datoms AVET (reverse, newest values first) from the end of a3 :start"
      #(mapv :v (take 2 (d/rseek-datoms (d/db conn) :avet :t/ix (k "a3" ":start\u0002")))))
(show "15. Datalog with a variable entity over the indexed attribute (native query, not the gateway)"
      #(d/q '[:find ?id :in $ ?lo ?hi :where [(>= ?v ?lo)] [?e :t/ix ?v] [(< ?v ?hi)] [?e :t/id ?id]] (d/db conn) (k "a3" ":bg" "") (k "a3" ":bg\u0002")))
(show "16. String datom value length 4000 on an indexed attribute"
      #(count (:tx-data @(d/transact conn [[:db/add [:t/id "acct/a3/wk:2"] :t/ix (apply str (repeat 4000 "y"))]]))))
(show "17. Unique value with cardinality many"
      #(:db-after @(d/transact conn [{:db/ident :t/u :db/valueType :db.type/string :db/cardinality :db.cardinality/many :db/unique :db.unique/value}])))
(shutdown-agents)
(System/exit 0)
