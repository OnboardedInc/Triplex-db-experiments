(ns xq2-limits
  "[DX-XQ2] Tuple element limits in Datomic 1.0.7745: string length, boolean, long, negative zero."
  (:require [datomic.api :as d]))
(defn try* [label f]
  (try (let [r (f)] (println "XQ2_LIMIT" label "OK" (pr-str r)) r)
       (catch Throwable e (println "XQ2_LIMIT" label "FAIL" (.getMessage (or (.getCause e) e))) nil)))
(let [uri (str "datomic:mem://xq2-" (java.util.UUID/randomUUID)) _ (d/create-database uri) conn (d/connect uri)]
  (try* "schema" #(count (:tx-data @(d/transact conn [{:db/ident :p/ts :db/valueType :db.type/tuple :db/index true
     :db/tupleTypes [:db.type/string :db.type/string :db.type/string] :db/cardinality :db.cardinality/many}
    {:db/ident :p/tb :db/valueType :db.type/tuple :db/tupleTypes [:db.type/string :db.type/boolean :db.type/long :db.type/double]
     :db/cardinality :db.cardinality/many :db/index true}
    {:db/ident :p/plain :db/valueType :db.type/string :db/cardinality :db.cardinality/many :db/index true}]))))
  (doseq [n [255 256 257 1000 5000]]
    (try* (str "string-" n) #(count (:tx-data @(d/transact conn [[:db/add "x" :p/ts ["a" "b" (apply str (repeat n "x"))]]])))))
  (try* "plain-string-5000" #(count (:tx-data @(d/transact conn [[:db/add "x" :p/plain (apply str (repeat 5000 "x"))]]))))
  (try* "boolean-long-double" #(count (:tx-data @(d/transact conn [[:db/add "y" :p/tb ["a" true 9223372036854775807 -0.0]]
                                                                     [:db/add "y" :p/tb ["a" false -1 0.0]]]))))
  (try* "read-back" #(mapv :v (d/datoms (d/db conn) :avet :p/tb)))
  (try* "redundant" #(count (:tx-data @(d/transact conn [[:db/add (:e (first (d/datoms (d/db conn) :avet :p/tb))) :p/tb ["a" false -1 0.0]]]))))
  (try* "retract-absent-tuple" #(count (:tx-data @(d/transact conn [[:db/retract (:e (first (d/datoms (d/db conn) :avet :p/tb))) :p/tb ["zz" true 1 1.0]]]))))
  (try* "multibyte-200-chars" #(count (:tx-data @(d/transact conn [[:db/add "z" :p/ts ["a" "b" (apply str (repeat 200 "\u00e9"))]]]))))
  (try* "multibyte-256-chars" #(count (:tx-data @(d/transact conn [[:db/add "z" :p/ts ["a" "b" (apply str (repeat 256 "\u00e9"))]]]))))
  (d/delete-database uri))
(shutdown-agents) (System/exit 0)
