(ns bounded-gateway
 (:require [triplex.gateway.main :as main] [triplex.gateway.reach :as reach]
           [clojure.data.json :as json]))
;; [DX-S5] Why: old seed commands retain metrics while the default gateway now owns its bounded ID memo.
;; Rejected: continuing an S5-only alter-var-root override after the gateway fix.
(defn stats [] (assoc (reach/id-memo-stats) :event "s5-id-memo"))
(defn -main [& args]
 (let [t (Thread. (fn [] (loop [] (Thread/sleep 10000) (println (json/write-str (stats))) (flush) (recur))) "s5-id-memo-metrics")]
  (.setDaemon t true) (.start t))
 (apply main/-main args))
