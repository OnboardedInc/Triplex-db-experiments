(require '[datomic.api :as d] '[datomic.index-direct-metrics :as index] '[clojure.data.json :as json] '[clojure.string :as str])
(let [[db-name] *command-line-args*
      conn (d/connect (str/replace (System/getenv "DATOMIC_URI_TEMPLATE") "{db}" db-name))
      t (d/basis-t (d/db conn))]
  (d/request-index conn)
  (let [db (deref (d/sync-index conn t) 120000 nil)]
    (assert (and db (>= (.-indexBasisT ^datomic.db.Db db) t)))
    (println "DX-W1_CACHE_INDEX" (json/write-str (assoc (select-keys (index/direct-metrics db)
                 [:IndexSegments :IndexDatoms]) :t t :db db-name)))))
(shutdown-agents)
