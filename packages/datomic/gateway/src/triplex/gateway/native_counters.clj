(ns triplex.gateway.native-counters
  (:import [java.util.concurrent ArrayBlockingQueue]
           [java.util.concurrent.atomic AtomicLong]))
;; [DX-T1-13] Why: observe the pinned processor's real adoption call without changing logger levels, querying the engine or blocking its serial thread on output.
;; Rejected: index-job completion or a periodic basis poll as an exact adoption timestamp.
(def pending (ArrayBlockingQueue. 256))
(def dropped (AtomicLong. 0))
(def installation (atom {:status "waiting for pinned datomic.update/process-new-index"}))
(defn database-hash [value]
  (when value
    (let [digest (.digest (java.security.MessageDigest/getInstance "SHA-256") (.getBytes (str value) "UTF-8"))]
      (format "%064x" (java.math.BigInteger. 1 digest)))))
(defn basis [context]
  (try (when-let [ref (:db-ref context)] (:indexBasisT @ref)) (catch Throwable _ nil)))
(defn observe-adoption [original clock offer]
  (fn [update context]
    (let [start (try (clock) (catch Throwable _ nil)) before (basis context)
          success (volatile! false)]
      (try
        (let [result (original update context)] (vreset! success true) result)
        (finally
          (try
            (offer {:type "index-adoption" :name "datomic.process-new-index" :layer "transactor"
                    :start start :end (clock) :thread (.getId (Thread/currentThread))
                    :databaseHash (database-hash (:db-id context)) :indexBasisBefore before
                    :indexBasisAfter (basis context) :completed @success
                    :boundary "processor process-new-index entry/return; not index-job completion"})
            (catch Throwable _ nil)))))))
(defn install! [clock]
  (when-not (= "installed" (:status @installation))
    (when-let [space (find-ns 'datomic.update)]
      (when-let [v (ns-resolve space 'process-new-index)]
        (when (bound? v)
          (locking v
            (when-not (::observed (meta v))
              (alter-var-root v #(observe-adoption % clock (fn [row] (when-not (.offer pending row) (.incrementAndGet dropped)))))
              (alter-meta! v assoc ::observed true))
            (reset! installation {:status "installed" :installedAt (clock) :target "datomic.update/process-new-index" :method "var observer; original called exactly once"}))))))
  @installation)
(defn drain! [emit]
  (loop [] (when-let [row (.poll pending)] (emit row) (recur))))
(defn status [] (assoc @installation :dropped (.get dropped)))
