(ns dxb8.hot-test
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.reach :as reach] [triplex.gateway.feed :as feed]
            [triplex.gateway.entity-cache :as cache] [triplex.gateway.recent :as recent]
            [triplex.gateway.selftest :as fixtures]))
;; [DX-B8-C] Why: test the entire warm pull while entity datom/identity seeks are forbidden, on both physical layouts.
;; Rejected: counting only map hits without proving the row parser and ID cache also avoid Datomic.
(deftest hot-pull-does-not-seek-entities
  (with-redefs [main/uri-template "datomic:mem://{db}" cache/verify-enabled false]
    (doseq [layout ["legacy" "lean"]]
      (let [scope (str "[\"triplex-scope-v1\",\"test\",\"test\",\"b8-hot-" layout "-" (java.util.UUID/randomUUID) "\",0]")
            name (:db (main/create-scope! main/uri-template scope layout)) uri (main/db-uri name)
            view (main/connection-view uri) conn (:conn view)
            row (fn [id entity type value] {:id id :entity_id entity :attribute ":b8/value" :value_type type
                                          :value_string value :recorded_at 10.0 :recorded_position 1
                                          :valid_from 0.0 :schema_version 1 :tx_id "hot-tx"})]
        (try
          (storage/commit! name conn (main/sync-db uri)
            (fixtures/row-input {"sourceK" 0 "position" 1 "operationId" "hot-seed"
                                "rows" (mapv storage/wire-row [(row "root-ref" "root" "ref" "shared")
                                                               (row "shared-value" "shared" "string" "value")])
                                "newIds" ["root-ref" "shared-value"] "claims" []}))
          (let [db (main/sync-db uri) t (d/basis-t db) state (:recent view)
                ready? (fn [_] (>= (.get ^java.util.concurrent.atomic.AtomicLong (:watermark state)) t))
                _ (feed/await-db conn ready? (+ (System/nanoTime) 2000000000))
                input {"roots" ["root"] "basis" {"validAt" 0.0} "full" true}
                body #(reach/response name db input (:generation view) state)
                expected (body) before (:recentHits (recent/stats))
                eids (set (map #(d/entid db [:triplex.entity/id %]) ["root" "shared"]))
                datoms d/datoms entid d/entid]
            (is (ready? db))
            (is (= 2 (count (get (json/read-str expected) "entities"))))
            (with-redefs [d/datoms (fn [db index & components]
                                    (when (and (= index :eavt) (eids (first components)))
                                      (throw (Exception. "Hot pull sought entity datoms")))
                                    (apply datoms db index components))
                          d/entid (fn [db id]
                                    (when (and (vector? id) (= :triplex.entity/id (first id)))
                                      (throw (Exception. "Hot pull sought entity identity")))
                                    (entid db id))]
              (is (= expected (body))))
            (is (>= (- (:recentHits (recent/stats)) before) 2)))
          (finally (main/delete-scope! main/uri-template scope)))))))
(defn -main [& _]
  (let [{:keys [fail error] :as result} (run-tests 'dxb8.hot-test)]
    (println (json/write-str result)) (shutdown-agents)
    (System/exit (if (zero? (+ fail error)) 0 1))))
