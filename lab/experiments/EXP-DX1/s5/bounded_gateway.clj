(ns bounded-gateway
 (:require [triplex.gateway.main :as main] [triplex.gateway.reach :as reach]
           [clojure.data.json :as json])
 (:import [java.util.concurrent ConcurrentHashMap] [java.util.concurrent.atomic LongAdder]))
;; [DX-S5] Why: reach.clj's id-map retains every resolved public ID for the connection generation.
;; At 100k the old 2 GiB peer spends full GCs retaining ~1980 MiB (readback100k-jvm-a.log).
;; Rejected: raising engine memory into the 11 GiB driver's reservation or changing the gateway commit function.
(def limit (Long/parseLong (or (System/getenv "TX2_S5_ID_CACHE_ENTRIES") "131072")))
(when-not (<= 1 limit 1048576) (throw (IllegalArgumentException. "Invalid S5 ID memo bound")))
(def ^LongAdder evictions (LongAdder.))
(def ^LongAdder inserts (LongAdder.))
(defn memo [bound]
 (proxy [ConcurrentHashMap] []
  (putIfAbsent [key value]
   ;; [DX-S5] Why: evict only the positive-ID accelerator; an eviction goes through unchanged d/entid on the exact db.
   ;; Rejected: evicting facts, reusing another scope/epoch's IDs, or an approximate unbounded concurrent insertion race.
   (locking this
    (if-let [old (.get ^ConcurrentHashMap this key)] old
     (do
      (when (>= (.size ^ConcurrentHashMap this) bound)
       (.clear ^ConcurrentHashMap this) (.increment evictions))
      (.increment inserts)
      ;; [DX-S5] Why: the monitor already established absence; the plain parent put keeps interception active.
      ;; Rejected: proxy-super putIfAbsent (concurrent insertions bypassed its accounting in the first native run).
      (.put ^ConcurrentHashMap this key value)))))))
(defn id-map [key]
 (or (.get reach/ids key)
     (let [m (memo limit)] (or (.putIfAbsent reach/ids key m) m))))
(defn stats []
 {:event "s5-id-memo" :limit limit :maps (.size reach/ids)
  :entries (reduce + 0 (map #(.size ^ConcurrentHashMap %) (.values reach/ids)))
  :maximumMapEntries (reduce max 0 (map #(.size ^ConcurrentHashMap %) (.values reach/ids)))
  :inserts (.sum inserts) :evictions (.sum evictions)
  :heapUsed (- (.totalMemory (Runtime/getRuntime)) (.freeMemory (Runtime/getRuntime)))})
(defn install! [] (alter-var-root #'reach/id-map (constantly id-map)))
(defn -main [& args]
 (install!)
 (let [t (Thread. (fn [] (loop [] (Thread/sleep 10000) (println (json/write-str (stats))) (flush) (recur))) "s5-id-memo-metrics")]
  (.setDaemon t true) (.start t))
 (apply main/-main args))
