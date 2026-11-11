(ns maintain (:require [datomic.api :as d] [clojure.data.json :as json]) (:import [java.util Date]))
;; [DX-S5] Why: reuse S4 completed-index/GC procedure, with no export or extra database writes. Rejected: VACUUM without collecting unreachable blocks.
(defn emit [x] (println (json/write-str x)) (flush))
(defn maintain [conn]
 
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
