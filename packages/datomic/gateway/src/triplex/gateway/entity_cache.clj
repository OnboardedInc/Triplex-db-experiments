(ns triplex.gateway.entity-cache
  (:refer-clojure :exclude [bytes])
  (:import [java.util.concurrent ConcurrentHashMap ConcurrentLinkedQueue]
           [java.util.concurrent.atomic AtomicLong LongAdder]
           [java.util.function Predicate]))
;; [DX-B7-S3] Why: immutable parsed revisions can be reused across sessions and historical cuts.
;; Rejected: an entity-only key (old cuts differ), and a global LRU hit lock (recreates session contention).
(def budget
  (let [n (Long/parseLong (or (System/getenv "TX2_ENTITY_CACHE_BYTES")
                            (System/getProperty "triplex.entityCacheBytes") "268435456"))]
    (when (neg? n) (throw (IllegalArgumentException. "Negative entity cache budget"))) n))
(def verify-enabled (or (= "1" (System/getenv "TX2_ENTITY_CACHE_VERIFY"))
                        (= "true" (System/getProperty "triplex.entityCacheVerify"))))
(def ^ConcurrentHashMap entries (ConcurrentHashMap.))
(def ^ConcurrentLinkedQueue order (ConcurrentLinkedQueue.))
(def ^AtomicLong bytes (AtomicLong. 0))
(def ^LongAdder hits (LongAdder.))
(def ^LongAdder misses (LongAdder.))
(def ^LongAdder evictions (LongAdder.))
(def ^LongAdder mismatches (LongAdder.))
(def ^LongAdder verified (LongAdder.))
;; [DX-B7-S3] Why: verification compares reference interval bits as well as exact row/JSON strings.
;; Rejected: numeric equality alone (signed zero and NaN have distinct bit behavior).
(defn reference-bits [refs]
  (mapv (fn [[id from to]] [id (Double/doubleToRawLongBits (double from))
                             (Double/doubleToRawLongBits (double to))]) refs))
(defn check! [key cached fresh]
  (when-not (and (= (dissoc cached :refs) (dissoc fresh :refs))
                 (= (reference-bits (:refs cached)) (reference-bits (:refs fresh))))
    (.increment mismatches)
    (throw (ex-info "Different entity bytes at the same database/eid/revision" {:status 500 :code "EntityCacheMismatch" :key (str key)})))
  (.increment verified))
(defn lookup [key build]
  (if-let [value (.get entries key)]
    (do (.increment hits)
        (when verify-enabled (check! key value (build))) value)
    (let [_ (.increment misses) value (build) size (long (:bytes value))]
      (when (<= size budget)
        ;; [DX-B7-S3] Why: only insert/evict needs exclusion; every hit is a CHM lookup plus local counters.
        ;; Rejected: approximate unbounded byte counters or a recency queue entry on every hit.
        (locking entries
          (if-let [previous (.get entries key)]
            (check! key previous value)
            (do
              (while (> (+ (.get bytes) size) budget)
                (let [old (.poll order)]
                  (when-not old (throw (IllegalStateException. "Entity cache accounting lost eviction key")))
                  (when-let [removed (.remove entries old)]
                    (.addAndGet bytes (- (long (:bytes removed)))) (.increment evictions))))
              (.put entries key value) (.add order key) (.addAndGet bytes size)))))
      value)))
(defn forget! [name]
  (locking entries
    (doseq [key (.keySet entries) :when (= name (first key))]
      (when-let [removed (.remove entries key)] (.addAndGet bytes (- (long (:bytes removed))))))
    (.removeIf order (reify Predicate (test [_ key] (= name (first key)))))))
(defn stats []
  {:hits (.sum hits) :misses (.sum misses) :evictions (.sum evictions) :bytes (.get bytes)
   :verificationErrors (.sum mismatches) :budgetBytes budget :entries (.size entries) :verified (.sum verified) :verify verify-enabled :policy "insertion-order"})
