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
 (let [db (d/db conn)] {:basis (d/basis-t db) :current (rows-proof db) :history (rows-proof (d/history db))}))
(defn -main [uri]
 (let [conn (d/connect uri) _ @(d/sync conn) before (proof conn)]
  (emit {:event "native-before" :proof before})
  (maintain conn)
  (let [after (proof conn)]
   (emit {:event "native-after" :proof after})
   (when (not= before after) (throw (ex-info "maintenance changed stored rows" {}))))
  (d/release conn))
 (d/shutdown true))
