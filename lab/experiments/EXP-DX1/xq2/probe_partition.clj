(ns xq2-partition
  "[DX-XQ2] Datomic 1.0.7745: string tempids into a named partition (:db/force-partition), upsert of a twin entity
  there, and adding and retracting the same datom in one transaction."
  (:require [datomic.api :as d]))
(defn try* [label f]
  (try (let [r (f)] (println "XQ2_PART" label "OK" (pr-str r)) r)
       (catch Throwable e (println "XQ2_PART" label "FAIL" (.getMessage (or (.getCause e) e))) nil)))
(let [uri (str "datomic:mem://xq2-" (java.util.UUID/randomUUID)) _ (d/create-database uri) conn (d/connect uri)]
  @(d/transact conn [{:db/id "np" :db/ident :p/part} [:db/add :db.part/db :db.install/partition "np"]])
  @(d/transact conn [{:db/ident :p/twin :db/valueType :db.type/string :db/unique :db.unique/identity :db/cardinality :db.cardinality/one}
                     {:db/ident :p/e :db/valueType :db.type/string :db/cardinality :db.cardinality/many :db/index true}])
  (let [r0 (try* "force-partition-standalone" #(let [r @(d/transact conn [{:db/force-partition {"q" :p/part}} {:db/id "q" :p/twin "acct/a/s/0"}])] (d/part (get (:tempids r) "q"))))
        r (try* "force-partition-map" #(let [r @(d/transact conn [{:db/id "t" :db/force-partition {"t" :p/part} :p/twin "acct/a/s/1"}
                                                                  [:db/add "t" :p/e "k1"]])]
                                           (let [e (get (:tempids r) "t")] [e (d/part e) (d/ident (:db-after r) (d/part e))])))]
    (try* "upsert-again" #(let [r @(d/transact conn [{:db/id "t" :db/force-partition {"t" :p/part} :p/twin "acct/a/s/1"} [:db/add "t" :p/e "k2"]])]
                            [(get (:tempids r) "t") (count (:tx-data r))]))
    (try* "lookup-ref-retract" #(count (:tx-data @(d/transact conn [[:db/retract [:p/twin "acct/a/s/1"] :p/e "k1"]]))))
    (try* "plain-string-tempid-part" #(let [r @(d/transact conn [[:db/add "u" :p/e "z"]])] (d/part (get (:tempids r) "u")))))
  (try* "add-and-retract-same-datom" #(let [e (:e (first (d/datoms (d/db conn) :avet :p/e "k2")))]
                                         (count (:tx-data @(d/transact conn [[:db/add e :p/e "k2"] [:db/retract e :p/e "k2"]])))))
  (try* "add-and-retract-new-datom" #(let [e (:e (first (d/datoms (d/db conn) :avet :p/e "k2")))]
                                        (count (:tx-data @(d/transact conn [[:db/add e :p/e "k9"] [:db/retract e :p/e "k9"]])))))
  (d/delete-database uri))
(shutdown-agents) (System/exit 0)
