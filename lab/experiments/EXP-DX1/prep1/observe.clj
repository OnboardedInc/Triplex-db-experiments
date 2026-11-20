(ns triplex.prep1.observe
  (:require [clojure.data.json :as json]
            [datomic.io :as dio]
            [datomic.log :as log]
            [datomic.transaction :as tx])
  (:import [java.util.concurrent ArrayBlockingQueue]
           [java.util.concurrent.atomic AtomicLong]))

;; [DX-PREP1] Why: the pinned writer calls append and then reports the same block's transaction metadata.
;; Rejected: attributing all non-apply peer time or cluster-wide WAL time to the log write.
(def pending (ArrayBlockingQueue. 16384))
(def dropped (AtomicLong. 0))
(def appended (ThreadLocal.))
(def attempt (System/getenv "PREP1_ATTEMPT"))

(alter-var-root #'log/append
  (fn [append]
    (fn [log cluster block]
      (let [sizes (mapv #(dio/remaining (:fressianed-tx %)) block)
            start (System/nanoTime)
            result (append log cluster block)
            end (System/nanoTime)]
        (.set appended {:bytes sizes :start start :end end})
        result))))

(alter-var-root #'tx/transactions-completed!
  (fn [complete]
    (fn [metadata]
      (let [append (.get appended)
            thread (.getName (Thread/currentThread))
            db (second (re-matches #"writer-(.+)-[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}" thread))]
        (.remove appended)
        (when (and db append)
          (let [members (mapv (fn [m]
                                (let [m (if (seq? m) (apply hash-map (next m)) m)]
                                  (select-keys m [:t :read-at :started-at :applied-at :datom-count])))
                              metadata)
                event (assoc append :attempt attempt :db db :members members)]
            (when-not (.offer pending event) (.incrementAndGet dropped))))
        (complete metadata)))))

(.addShutdownHook
  (Runtime/getRuntime)
  (Thread.
    (fn []
      (loop []
        (when-let [event (.poll pending)]
          (println "PREP1_NATIVE" (json/write-str event))
          (recur)))
      (println "PREP1_NATIVE_END" (json/write-str {:attempt attempt :dropped (.get dropped)}))
      (flush))))
