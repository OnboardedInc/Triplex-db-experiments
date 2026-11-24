(ns triplex.gateway.uncached
  (:require [datomic.api :as d])
  (:import [java.util.concurrent ExecutorService Executors Future ThreadFactory]
           [java.util.concurrent.atomic AtomicLong LongAdder]))

;; [DX-RD5] Why: a pinned read of eight random subjects made 14.1 storage round trips one after another inside its read
;; permit (rd5/UNCACHED-READ.md). Touching every named subject's identity and EAVT rows on a small pool first lets those
;; loads overlap; the read itself then runs exactly as before on the same database values and finds them cached.
;; Rejected: changing what the read computes (the answer must come from the unchanged route), more read permits alone
;; (12 permits queued on PostgreSQL: 13 to 14 ms of SQL per exchange), and a prefetch that can fail the read (any
;; failure here is ignored; the read then loads what it needs itself).
(def prefetch? (= "1" (System/getenv "TX2_READ_PREFETCH")))
(def prefetch-threads
  (let [n (Integer/parseInt (or (System/getenv "TX2_READ_PREFETCH_THREADS") "16"))]
    (when-not (<= 1 n 256) (throw (IllegalArgumentException. "TX2_READ_PREFETCH_THREADS must be 1..256"))) n))

(def ^:private pool
  (delay (let [counter (AtomicLong.)]
           (Executors/newFixedThreadPool
             prefetch-threads
             (reify ThreadFactory
               (newThread [_ r]
                 (doto (Thread. ^Runnable r (str "triplex-read-prefetch-" (.incrementAndGet counter)))
                   (.setDaemon true))))))))

(def ^LongAdder batches (LongAdder.))
(def ^LongAdder subjects (LongAdder.))
(def ^LongAdder failures (LongAdder.))
(def last-failure (atom nil))
(defn stats [] {:prefetch prefetch? :threads prefetch-threads :batches (.sum batches) :subjects (.sum subjects)
                :failures (.sum failures) :lastFailure @last-failure
                ;; The JVM property the launcher sets for a reader without Datomic's index read-ahead.
                :readAheadPool (System/getProperty "datomic.readAheadPool")})

(defn- touch!
  "Load what a read of subject `id` at `db` will load first: its identity lookup and its EAVT rows."
  [db id]
  (when-let [e (d/entid db [:triplex.entity/id id])]
    ;; d/datoms is an Iterable without count; walking it realizes every leaf the subject's rows sit in.
    (reduce (fn [n _] (inc n)) 0 (d/datoms db :eavt e))))

(defn- touch-first!
  "Load the segment that holds the start of subject `id`'s rows (its identity lookup and one EAVT seek).
  [DX-API1] Why: walking a subject's whole EAVT range costs a warm batch a fifth of its CPU (api1/API-CALL-READS.md
  section 2); the first seek loads the leaf the read needs first, and almost every entity's rows fit in it."
  [db id]
  (when-let [e (d/entid db [:triplex.entity/id id])]
    (first (d/datoms db :eavt e :triplex.entity/row))))

(defn touch-all!
  "Touch each subject of `ids` at `db` concurrently on the prefetch pool (the calling thread takes the first) and wait for
  all, whatever TX2_READ_PREFETCH says. Returns nil; never throws. Loads keep the caller's io-stats bindings.
  [DX-API1] Why: the batched read (batch.clj) prefetches a whole batch's subjects with the same pool and touch.
  Rejected: a second pool (two pools would let one batch take twice the overlap)."
  ([db ids] (touch-all! db ids false))
  ([db ids first-only?]
  (when (and db (seq ids))
    (let [task (fn [id] (bound-fn* (fn [] (try (if first-only? (touch-first! db id) (touch! db id)) (catch Throwable t (.increment failures) (reset! last-failure (str t)) nil)))))
          futures (mapv #(.submit ^ExecutorService @pool ^Callable (task %)) (rest ids))]
      ((task (first ids)))
      (doseq [^Future f futures]
        (try (.get f) (catch Throwable _ (.increment failures))))
      nil))))

(defn prefetch!
  "With TX2_READ_PREFETCH=1 and more than one subject, touch each subject of `ids` at `db` concurrently (the calling
  thread takes the first) and wait for all. Returns nil; never throws. Loads keep the caller's io-stats bindings, so a
  sampled exchange still counts every storage read it caused."
  [db ids]
  (when (and prefetch? db (next ids))
    (.increment batches)
    (.add subjects (count ids))
    (touch-all! db ids)))
