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
;; [DX-B9-A] Why: the config token uniquely binds scope and captured connection generation;
;; primitive eid/revision equality avoids vector hashing and boxed/composite equality on every entity.
;; Rejected: an eid-only map (historical revisions and recreated scopes must remain distinct).
(deftype ParsedKey [name generation ^long eid ^long revision ^int hash]
  Object
  (hashCode [_] hash)
  (equals [_ other]
    (and (instance? ParsedKey other)
         (identical? generation (.-generation ^ParsedKey other))
         (= eid (.-eid ^ParsedKey other))
         (= revision (.-revision ^ParsedKey other)))))
(defn parsed-key [name generation ^long eid ^long revision]
  (ParsedKey. name generation eid revision
    (unchecked-int (bit-xor (System/identityHashCode generation)
                            (Long/hashCode eid) (Integer/rotateLeft (Long/hashCode revision) 16)))))
(defn key-name [key] (if (instance? ParsedKey key) (.-name ^ParsedKey key) (first key)))
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
;; [DX-B7-S4] Why: a revision is immutable at an exact selected physical t; the profile still spends most CPU re-seeking it.
;; Rejected: caching by unfiltered basis-t on an as-of db (different cuts can share that basis), or an unbounded cut index.
(def ^ConcurrentHashMap revision-views (ConcurrentHashMap.))
(def ^ConcurrentLinkedQueue revision-order (ConcurrentLinkedQueue.))
(def ^AtomicLong revision-bytes (AtomicLong. 0))
(def ^LongAdder revision-hits (LongAdder.))
(def ^LongAdder revision-misses (LongAdder.))
(def ^LongAdder revision-evictions (LongAdder.))
(defn revision-budget [] (quot budget 8))
;; [DX-B8-C] Why: reserve one sixteenth from parsed entities for report-fed revisions within the same total budget.
;; Rejected: adding an unaccounted recent map on top of the existing 256 MiB cache.
(defn entity-budget [] (- budget (revision-budget) (quot budget 16)))
(defn remove-revision-view! [key]
  (when-let [view (.remove revision-views key)]
    (.addAndGet revision-bytes (- (.get ^AtomicLong (:bytes view)))) true))
(defn revision-space! [size]
  (while (> (+ (.get revision-bytes) size) (revision-budget))
    (let [old (.poll revision-order)]
      (when-not old (throw (IllegalStateException. "Revision memo accounting lost its view")))
      (when (remove-revision-view! old) (.increment revision-evictions)))))
(defn revision-view [key]
  (when (>= (revision-budget) 768)
    (or (.get revision-views key)
        (locking revision-views
          (or (.get revision-views key)
              (do (revision-space! 768)
                  (let [view {:key key :entries (ConcurrentHashMap.) :bytes (AtomicLong. 768)}]
                    (.put revision-views key view) (.add revision-order key)
                    (.addAndGet revision-bytes 768) view)))))))
(defn revision [view eid read-revision]
  (if-let [cached (when view (.get ^ConcurrentHashMap (:entries view) eid))]
    (do (.increment revision-hits)
        (when verify-enabled (check! (:key view) {:revision cached} {:revision (read-revision)})) cached)
    (let [_ (.increment revision-misses) rev (read-revision)]
      (when view
        (locking revision-views
          (when (identical? view (.get revision-views (:key view)))
            (if-let [previous (.get ^ConcurrentHashMap (:entries view) eid)]
              (check! (:key view) {:revision previous} {:revision rev})
              (do
                (revision-space! 96)
                ;; [DX-B7-S4] Why: eviction may detach this view while making room; never repopulate it.
                ;; Rejected: an unaccounted write into an old memo generation.
                (when (identical? view (.get revision-views (:key view)))
                  (.put ^ConcurrentHashMap (:entries view) eid rev)
                  (.addAndGet ^AtomicLong (:bytes view) 96) (.addAndGet revision-bytes 96))))))) rev)))

(defn lookup [key build]
  (if-let [value (.get entries key)]
    (do (.increment hits)
        (when verify-enabled (check! key value (build))) value)
    (let [_ (.increment misses) value (build) size (long (:bytes value))]
      (when (<= size (entity-budget))
        ;; [DX-B7-S3] Why: only insert/evict needs exclusion; every hit is a CHM lookup plus local counters.
        ;; Rejected: approximate unbounded byte counters or a recency queue entry on every hit.
        (locking entries
          (if-let [previous (.get entries key)]
            (check! key previous value)
            (do
              (while (> (+ (.get bytes) size) (entity-budget))
                (let [old (.poll order)]
                  (when-not old (throw (IllegalStateException. "Entity cache accounting lost eviction key")))
                  (when-let [removed (.remove entries old)]
                    (.addAndGet bytes (- (long (:bytes removed)))) (.increment evictions))))
              (.put entries key value) (.add order key) (.addAndGet bytes size)))))
      value)))
(defn forget! [name]
  (locking entries
    (doseq [key (.keySet entries) :when (= name (key-name key))]
      (when-let [removed (.remove entries key)] (.addAndGet bytes (- (long (:bytes removed))))))
    (.removeIf order (reify Predicate (test [_ key] (= name (key-name key))))))
  (locking revision-views
    (doseq [key (.keySet revision-views) :when (= name (key-name key))] (remove-revision-view! key))
    (.removeIf revision-order (reify Predicate (test [_ key] (= name (key-name key)))))))
(defn stats []
  {:hits (.sum hits) :misses (.sum misses) :evictions (.sum evictions)
   :bytes (+ (.get bytes) (.get revision-bytes)) :entityBytes (.get bytes) :revisionBytes (.get revision-bytes)
   :revisionHits (.sum revision-hits) :revisionMisses (.sum revision-misses) :revisionViews (.size revision-views)
   :revisionEvictions (.sum revision-evictions) :entityBudgetBytes (entity-budget) :revisionBudgetBytes (revision-budget)
   :verificationErrors (.sum mismatches) :budgetBytes budget :entries (.size entries)
   :verified (.sum verified) :verify verify-enabled :policy "insertion-order; oldest-cut revision eviction"})
