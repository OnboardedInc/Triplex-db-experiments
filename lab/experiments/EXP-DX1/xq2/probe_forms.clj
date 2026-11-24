(ns xq2-probe
  "[DX-XQ2] What Datomic 1.0.7745 supports for a value index scoped by account: a heterogeneous tuple on AVET and a
  composed string on AVET. In-memory database; checks support, nil handling, range scans, sort order, and as-of."
  (:require [datomic.api :as d] [clojure.data.json :as json]))

(defn try* [label f]
  (try (let [r (f)] (println "XQ2_PROBE" label "OK" (pr-str r)) r)
       (catch Throwable e (println "XQ2_PROBE" label "FAIL" (.getName (class e)) (.getMessage e)) nil)))

(defn run []
  (let [uri (str "datomic:mem://xq2-" (java.util.UUID/randomUUID))
        _ (d/create-database uri) conn (d/connect uri)]
    (try* "schema-string" #(count (:tx-data @(d/transact conn [{:db/ident :p/s :db/valueType :db.type/string
                                                               :db/cardinality :db.cardinality/many :db/index true}]))))
    (try* "schema-tuple-string-value"
          #(count (:tx-data @(d/transact conn [{:db/ident :p/ts :db/valueType :db.type/tuple
                                                :db/tupleTypes [:db.type/string :db.type/string :db.type/string
                                                                :db.type/string :db.type/double :db.type/double :db.type/string]
                                                :db/cardinality :db.cardinality/many :db/index true}]))))
    (try* "schema-tuple-double-value"
          #(count (:tx-data @(d/transact conn [{:db/ident :p/tn :db/valueType :db.type/tuple
                                                :db/tupleTypes [:db.type/string :db.type/string :db.type/double
                                                                :db.type/string :db.type/double :db.type/double :db.type/string]
                                                :db/cardinality :db.cardinality/many :db/index true}]))))
    (try* "schema-tuple-8-elements"
          #(count (:tx-data @(d/transact conn [{:db/ident :p/t8 :db/valueType :db.type/tuple
                                                :db/tupleTypes (vec (repeat 9 :db.type/string))
                                                :db/cardinality :db.cardinality/many}]))))
    (try* "schema-tuple-ref"
          #(count (:tx-data @(d/transact conn [{:db/ident :p/tr :db/valueType :db.type/tuple
                                                :db/tupleTypes [:db.type/string :db.type/ref]
                                                :db/cardinality :db.cardinality/many :db/index true}]))))
    (let [e1 "e1" ops (concat
                        (for [[acct attr v ent] [["a" ":status" "open" "acct/a/s/1"] ["a" ":status" "closed" "acct/a/s/2"]
                                                 ["a" ":status" "open" "acct/a/s/3"] ["ab" ":status" "open" "acct/ab/s/1"]
                                                 ["a" ":status1" "open" "acct/a/s/4"] ["a" ":status" "open\u0001x" "acct/a/s/5"]]]
                          [:db/add (str "t-" ent) :p/s (str acct "\u0001" attr "\u0001s" v "\u0001" ent)])
                        [[:db/add "t1" :p/ts ["a" ":status" "open" "acct/a/s/1" 0.0 nil "r1"]]
                         [:db/add "t2" :p/ts ["a" ":status" "open" "acct/a/s/2" 0.0 5.0 "r2"]]
                         [:db/add "t3" :p/ts ["a" ":status" "closed" "acct/a/s/3" 0.0 nil "r3"]]
                         [:db/add "t4" :p/ts ["ab" ":status" "open" "acct/ab/s/1" 0.0 nil "r4"]]
                         [:db/add "t5" :p/tn ["a" ":date" 1.5 "acct/a/s/1" 0.0 nil "r5"]]
                         [:db/add "t6" :p/tn ["a" ":date" -2.0 "acct/a/s/2" 0.0 nil "r6"]]
                         [:db/add "t7" :p/tn ["a" ":date" 100.0 "acct/a/s/3" 0.0 nil "r7"]]])
          r (try* "assert" #(count (:tx-data @(d/transact conn (vec ops)))))
          db (d/db conn)]
      (try* "string-range-eq-open" #(mapv :v (d/index-range db :p/s "a\u0001:status\u0001sopen\u0001" "a\u0001:status\u0001sopen\u0002")))
      (try* "string-range-attr" #(mapv :v (d/index-range db :p/s "a\u0001:status\u0001" "a\u0001:status\u0002")))
      (try* "string-order-compareTo" #(let [vs (mapv :v (d/datoms db :avet :p/s))] [(= vs (sort vs)) vs]))
      (try* "tuple-range-partial-start" #(mapv :v (d/index-range db :p/ts ["a" ":status" "open"] ["a" ":status" "open\u0000"])))
      (try* "tuple-range-nil-padded" #(mapv :v (d/index-range db :p/ts ["a" ":status" "open" nil nil nil nil]
                                                                ["a" ":status" "open\u0000" nil nil nil nil])))
      (try* "tuple-range-attr" #(mapv :v (d/index-range db :p/ts ["a" ":status"] ["a" ":status\u0000"])))
      (try* "tuple-double-range" #(mapv :v (d/index-range db :p/tn ["a" ":date" -10.0] ["a" ":date" 50.0])))
      (try* "tuple-all-order" #(mapv :v (d/datoms db :avet :p/ts)))
      (try* "tuple-seek" #(mapv :v (take 2 (d/seek-datoms db :avet :p/ts ["a" ":status" "open"]))))
      (try* "tuple-retract" #(count (:tx-data @(d/transact conn [[:db/retract (:e (first (d/datoms db :avet :p/ts))) :p/ts
                                                                   (:v (first (d/datoms db :avet :p/ts)))]]))))
      (let [t (d/basis-t db) now (d/db conn)]
        (try* "as-of-string" #(count (seq (d/index-range (d/as-of now t) :p/s "a\u0001" "a\u0002"))))
        (try* "as-of-tuple" #(mapv :v (d/index-range (d/as-of now t) :p/ts ["a" ":status"] ["a" ":status\u0000"])))
        (try* "now-tuple" #(mapv :v (d/index-range now :p/ts ["a" ":status"] ["a" ":status\u0000"])))
        (try* "history-tuple" #(count (seq (d/datoms (d/history now) :avet :p/ts))))))
    (d/delete-database uri)))
(run)
(shutdown-agents)
(System/exit 0)
