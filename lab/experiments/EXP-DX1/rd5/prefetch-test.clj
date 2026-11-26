;; [DX-RD5] Unit check of uncached/prefetch! on an in-memory database (run with TX2_READ_PREFETCH=1):
;;   docker run --rm -e TX2_READ_PREFETCH=1 -v <repo>/packages/datomic/gateway/src:/opt/gateway/src:ro -v <rd5>:/t:ro \
;;     --entrypoint /bin/bash tx2-datomic:1.0.7745-da00 -c 'cd /opt/datomic && java -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /t/prefetch-test.clj'
;; A batch with known and unknown subjects touches each once, fails none, returns nil and leaves the database value as it was.
(require '[datomic.api :as d] '[triplex.gateway.uncached :as u])
(let [uri "datomic:mem://rd5-prefetch" _ (d/create-database uri) conn (d/connect uri)]
  @(d/transact conn [{:db/ident :triplex.entity/id :db/valueType :db.type/string :db/cardinality :db.cardinality/one :db/unique :db.unique/identity}])
  @(d/transact conn (for [i (range 100)] {:triplex.entity/id (str "s" i)}))
  (let [db (d/db conn) before (vec (d/datoms db :eavt))]
    (assert u/prefetch? "run with TX2_READ_PREFETCH=1")
    (assert (nil? (u/prefetch! db (mapv #(str "s" %) (range 0 100 7)))))
    (assert (nil? (u/prefetch! db ["s1" "missing" "s2"])))
    (assert (nil? (u/prefetch! db ["s3"])) "one subject is not prefetched")
    (assert (nil? (u/prefetch! nil ["s1" "s2"])))
    (assert (= before (vec (d/datoms db :eavt))))
    (let [s (u/stats)]
      (assert (= [2 18 0] [(:batches s) (:subjects s) (:failures s)]) (pr-str s))
      (println "RD5_PREFETCH_TEST passed" (pr-str s))))
  (shutdown-agents) (System/exit 0))
