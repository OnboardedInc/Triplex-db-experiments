(ns maintain (:require [datomic.api :as d] [clojure.data.json :as json]) (:import [java.util Date]))
;; [DX-S5] Why: reuse S4 completed-index/GC procedure, with no export or extra database writes. Rejected: VACUUM without collecting unreachable blocks.
(defn emit [x] (println (json/write-str x)) (flush))
(defn maintain [conn]
 
(defn -main [uri]
 (let [conn (d/connect uri)] (maintain conn) (d/release conn))
 (d/shutdown true))
