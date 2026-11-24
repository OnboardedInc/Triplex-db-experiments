;; [DX-XQ1] Read-only probe (in-memory Datomic 1.0.7745): what a retraction of an index entry that does not exist does,
;; and whether a transaction function can find and retract an entity's entries by a suffix (the fact ID).
(require '[datomic.api :as d])
(defn show [label f]
  (println (str "== " label))
  (try (println "   " (pr-str (f))) (catch Throwable e (println "    THREW" (.getName (class e)) (.getMessage e)))))
(def uri "datomic:mem://xq1-retract")
(d/create-database uri)
(def conn (d/connect uri))
@(d/transact conn [{:db/ident :t/id :db/valueType :db.type/string :db/cardinality :db.cardinality/one :db/unique :db.unique/identity}
                   {:db/ident :t/ix :db/valueType :db.type/string :db/cardinality :db.cardinality/many :db/index true}])
@(d/transact conn [{:t/id "e1" :t/ix ["a3|x|v1|e1|f1" "a3|y|v2|e1|f2"]}])
(show "1. Retract an entry that was never asserted (datoms in the transaction; 1 = only the transaction instant)"
      #(mapv (juxt :v :added) (:tx-data @(d/transact conn [[:db/retract [:t/id "e1"] :t/ix "a3|x|zz|e1|f9"]]))))
@(d/transact conn [{:db/ident :t/retract-fact
                    :db/fn (d/function {:lang :clojure :params '[db e fact]
                                        :code '(let [eid (d/entid db e)]
                                                 (vec (for [x (d/datoms db :eavt eid :t/ix)
                                                            :when (.endsWith ^String (:v x) (str "|" fact))]
                                                        [:db/retract eid :t/ix (:v x)])))})}])
(show "2. A transaction function retracts the entity's entry whose key ends with the fact ID"
      #(mapv (juxt :v :added) (:tx-data @(d/transact conn [[:t/retract-fact [:t/id "e1"] "f2"]]))))
(show "3. Remaining entries" #(mapv :v (d/datoms (d/db conn) :eavt (d/entid (d/db conn) [:t/id "e1"]) :t/ix)))
(show "4. Assert and retract the same entry in one transaction"
      #(mapv (juxt :v :added) (:tx-data @(d/transact conn [[:db/add [:t/id "e1"] :t/ix "a3|z|v|e1|f5"] [:db/retract [:t/id "e1"] :t/ix "a3|z|v|e1|f5"]]))))
(shutdown-agents)
(System/exit 0)
