(ns maintain (:require [datomic.api :as d] [clojure.data.json :as json]) (:import [java.util Date]))
;; [DX-S5] Why: reuse S4 completed-index/GC procedure, with no export or extra database writes. Rejected: VACUUM without collecting unreachable blocks.
(defn emit [x] (println (json/write-str x)) (flush))
(defn maintain [conn]
 ;; [DX-S4] Why: physical clones can return a connection while their transactor is still loading the database. Rejected: a fixed startup sleep (anatomy3 observed request-index/no database).
 (let [synced (deref (d/sync conn) 120000 ::timeout)
       _ (when (= ::timeout synced) (throw (ex-info "transactor sync timeout" {})))
       t (d/basis-t synced)]
  (loop [i 0]
   (let [result (try {:requested (d/request-index conn)} (catch Throwable e {:error e}))]
    (if (:error result)
     (if (< i 30) (do (emit {:event "index-retry" :attempt i :error (str (:error result))}) (Thread/sleep 1000) (recur (inc i))) (throw (:error result)))
     (emit {:event "request-index" :t t :requested (:requested result)}))))
  (let [db (deref (d/sync-index conn t) 180000 ::timeout)]
   (when (= ::timeout db) (throw (ex-info "index timeout" {:t t})))
   (emit {:event "index-complete" :basis-t (d/basis-t db)}))
  (Thread/sleep 2000)
  (let [cutoff (Date.) result (d/gc-storage conn cutoff)
        done (if (instance? clojure.lang.IDeref result) (deref result 180000 ::timeout) result)]
   (when (= ::timeout done) (throw (ex-info "gc timeout" {})))
   (emit {:event "gc-scheduled" :older-than (str cutoff) :result (str done)}))))
;; [DX-S5] Why: hash every stored row (including journal rows and retired history) before and after maintenance.
;; Rejected: using only table sizes or synthetic command counts to infer preservation.
(defn rows-proof [db]
 (let [md (java.security.MessageDigest/getInstance "SHA-256") n (atom 0)]
  (when (d/entid db :triplex.entity/row)
   (doseq [x (d/datoms db :aevt :triplex.entity/row)]
    (.update md (.getBytes (str (:e x) "|" (:tx x) "|" (:added x) "|" (:v x) "\n") "UTF-8"))
    (swap! n inc)))
  {:rows @n :sha256 (.formatHex (java.util.HexFormat/of) (.digest md))}))
(defn proof [conn]
 ;; [DX-S5] Why: current/history scans are independent immutable views; hash both completely using idle maintenance CPUs.
 ;; Rejected: skipping either history or current rows, or changing their datom/digest order.
 (let [db (d/db conn) a (future (rows-proof db)) b (future (rows-proof (d/history db)))
       current @a history @b]
  (when (or (zero? (:rows current)) (< (:rows history) (:rows current)))
   (throw (ex-info "missing native scope rows" {})))
  {:basis (d/basis-t db) :current current :history history}))
(defn -main [uri mode]
 (if (= mode "parallel-test")
  ;; [DX-S5] Why: compare serial and parallel bytes on the same fresh native snapshot, including a retraction.
  ;; Rejected: count-only parity or using this memory test as SQL/scale acceptance.
  (let [u (str "datomic:mem://dxs5-proof-" (java.util.UUID/randomUUID))
        _ (assert (d/create-database u)) conn (d/connect u)]
   @(d/transact conn [{:db/ident :triplex.entity/row :db/valueType :db.type/string :db/cardinality :db.cardinality/one}])
   @(d/transact conn (mapv (fn [i] {:db/id (d/tempid :db.part/user) :triplex.entity/row (str i)}) (range 1000)))
   (let [e (d/q '[:find ?e . :where [?e :triplex.entity/row "500"]] (d/db conn))]
    @(d/transact conn [[:db/retract e :triplex.entity/row "500"] [:db/add e :triplex.entity/row "changed"]]))
   (let [db (d/db conn) serial {:basis (d/basis-t db) :current (rows-proof db) :history (rows-proof (d/history db))}
         parallel (proof conn)]
    (assert (= 1000 (get-in serial [:current :rows])))
    (assert (= 1002 (get-in serial [:history :rows])))
    (assert (= serial parallel))
    (emit {:event "parallel-proof-unit-parity" :serial serial :parallel parallel :memory-only true}))
   (d/release conn))
  (let [conn (d/connect uri) _ @(d/sync conn) started (System/nanoTime)]
  ;; [DX-S5] Why: compare one fresh pre-maintenance image with one fresh post-vacuum image, not duplicate hashes in the same peer.
  ;; Rejected: eight full datom scans per chunk (the redundant checks add no preservation evidence).
  (if (= mode "proof")
   (emit {:event "native-after" :proof (proof conn) :elapsedMs (/ (- (System/nanoTime) started) 1000000.0)})
   (do
    (emit {:event "native-before" :proof (proof conn) :elapsedMs (/ (- (System/nanoTime) started) 1000000.0)})
    (maintain conn)))
  (d/release conn)))
 (d/shutdown true)
 (shutdown-agents))
