(ns id-memo-test (:require [triplex.gateway.reach :as r]
                          [datomic.api :as d] [clojure.data.json :as json]))
;; [DX-S5] Why: compare actual native rows after repeated/concurrent cache eviction, including old cuts and two epochs.
;; Rejected: count-only cache tests or substituting this memory test for the full SQL/world fingerprint gate.
(def schema [{:db/ident :triplex.entity/id :db/valueType :db.type/string :db/cardinality :db.cardinality/one :db/unique :db.unique/identity}
             {:db/ident :triplex.entity/row :db/valueType :db.type/string :db/cardinality :db.cardinality/many}])
(defn setup [tag padding]
 (let [uri (str "datomic:mem://dxs5-memo-" tag "-" (java.util.UUID/randomUUID))
       _ (assert (d/create-database uri)) c (d/connect uri)]
  @(d/transact c schema)
  (when (pos? padding) @(d/transact c (mapv (fn [i] {:db/id (d/tempid :db.part/user) :triplex.entity/id (str "padding-" i)}) (range padding))))
  @(d/transact c (mapv (fn [i] {:db/id (d/tempid :db.part/user) :triplex.entity/id (str "e" i) :triplex.entity/row (str tag i)}) (range 1024)))
  c))
(defn rows [db eid] (if eid (mapv :v (d/datoms db :eavt eid :triplex.entity/row)) []))
(defn -main [& _]
 (let [a (setup "left" 0) z (setup "right" 17) old (d/db a)
       _ @(d/transact a [[:db/retract (d/entid old [:triplex.entity/id "e5"]) :triplex.entity/row "left5"]
                        [:db/add (d/entid old [:triplex.entity/id "e5"]) :triplex.entity/row "new-left5"]
                        {:db/id (d/tempid :db.part/user) :triplex.entity/id "late" :triplex.entity/row "late-value"}])
       current (d/db a) right (d/db z) ea (Object.) ez (Object.)
       ma (r/id-map ["same-name" ea]) mz (r/id-map ["same-name" ez]) high (atom 0)]
  (assert (not (identical? ma mz)))
  (assert (not= (d/entid old [:triplex.entity/id "e0"]) (d/entid right [:triplex.entity/id "e0"])))
  (let [jobs (doall (for [worker (range 8)]
               (future (doseq [i (range 2048)]
                (let [[db cache identity-db] (nth [[old ma current] [current ma current] [right mz right]] (mod (+ i worker) 3))
                      id (if (zero? (mod i 101)) "late" (str "e" (mod (+ i (* worker 127)) 1024)))
                      expected (rows db (d/entid db [:triplex.entity/id id]))
                      actual (rows db (r/entity-id db "same-name" id {:entity-ids cache :identity-db identity-db}))]
                 (assert (= expected actual) (str "native rows differ " id))
                 (swap! high max (.size ma) (.size mz)))))))]
   (doseq [job jobs] @job))
  (assert (<= (.size ma) r/id-memo-limit)) (assert (<= (.size mz) r/id-memo-limit))
  (assert (pos? (.sum r/id-memo-evictions)))
  (assert (<= @high r/id-memo-limit))
  (assert (= (.sum r/id-memo-inserts) (+ (* r/id-memo-limit (.sum r/id-memo-evictions)) (.size ma) (.size mz)))
          "concurrent insertion bypassed the cache bound/accounting")
  (let [native-stats (r/id-memo-stats) tiny (r/bounded-id-map 128 1024)]
   (doseq [i (range 1024)] (.putIfAbsent tiny (str "long-key-" i) i))
   (assert (<= (reduce + (map r/id-entry-bytes (.keySet tiny))) 1024))
   (.putIfAbsent tiny (apply str (repeat 1024 "x")) 1)
   (assert (nil? (.get tiny (apply str (repeat 1024 "x")))))
  (println (json/write-str (assoc native-stats :byteBoundTest true :event "id-memo-native-unit" :comparisons (* 8 2048) :epochs 2 :cuts 3 :mismatches 0 :memoryOnly true :observedHigh @high :accountingExact true))))
  (d/release a) (d/release z))
 (d/shutdown true) (shutdown-agents))
