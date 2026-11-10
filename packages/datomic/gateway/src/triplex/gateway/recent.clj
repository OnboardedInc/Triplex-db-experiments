(ns triplex.gateway.recent
  (:refer-clojure :exclude [bytes])
  (:require [datomic.api :as d] [triplex.gateway.entity-cache :as cache])
  (:import [java.util.concurrent ConcurrentHashMap ConcurrentLinkedQueue]
           [java.util.concurrent.atomic AtomicLong AtomicBoolean LongAdder]
           [java.util.function Predicate]))
;; [DX-B8-C] Why: a report-updated revision witness survives selected-cut changes; misses retain exact DB reads.
;; Rejected: using a revision observed at an older cut as the current revision after reconnect or eviction.
 ;; [DX-B9-A] Why: paired repeats still lose at64 readers; notification-only writes and exact cut memos stay default.
;; Rejected: enabling a report-fed optimization whose complete read/write path is not at least the old gateway's speed.
(def enabled (or (= "1" (System/getenv "TX2_RECENT_REVISIONS"))
                 (= "true" (System/getProperty "triplex.recentRevisions"))))
(def ^Object allocation-lock (Object.))
(def ^ConcurrentLinkedQueue order (ConcurrentLinkedQueue.))
(def ^AtomicLong bytes (AtomicLong. 0))
(def ^AtomicLong states (AtomicLong. 0))
(def ^LongAdder hits (LongAdder.))
(def ^LongAdder misses (LongAdder.))
(def ^LongAdder lag-fallbacks (LongAdder.))
(def ^LongAdder verified (LongAdder.))
(def ^LongAdder reports (LongAdder.))
(def ^LongAdder changes (LongAdder.))
(def state-bytes 2048)
(def entry-bytes 384)
(defn budget [] (quot cache/budget 16))
(defn stripe [state eid] (nth (:stripes state) (mod (long eid) 64)))
(defn room! [size]
  (loop []
    (if (<= (+ (.get bytes) size) (budget)) true
      (when-let [[state eid] (.poll order)]
        (locking (stripe state eid)
          (when (.remove ^ConcurrentHashMap (:entries state) eid) (.addAndGet bytes (- entry-bytes))))
        (recur)))))
;; [DX-B8-C] Why: the initial snapshot is a floor, not a replay of transactions predating this connection.
;; Rejected: installing an older historical revision after reconnect without knowing intervening changes.
(defn make-state [basis]
  (locking allocation-lock
    (when (room! state-bytes)
      (.addAndGet bytes state-bytes) (.incrementAndGet states)
      {:floor basis :watermark (AtomicLong. basis) :closed (AtomicBoolean. false)
       :stripes (vec (repeatedly 64 #(Object.))) :entries (ConcurrentHashMap.)})))
(defn close! [state]
  (when (and state (.compareAndSet ^AtomicBoolean (:closed state) false true))
    (locking allocation-lock
      (doseq [eid (.keySet ^ConcurrentHashMap (:entries state))]
        (locking (stripe state eid)
          (when (.remove ^ConcurrentHashMap (:entries state) eid) (.addAndGet bytes (- entry-bytes)))))
      (.removeIf order (reify Predicate (test [_ item] (identical? state (first item)))))
      (.addAndGet bytes (- state-bytes)) (.decrementAndGet states))))
(defn with-stripes [state ids f]
  (let [indices (vec (sort (distinct (map #(mod (long %) 64) ids))))]
    (letfn [(step [i] (if (= i (count indices)) (f)
                        (locking (nth (:stripes state) (nth indices i)) (step (inc i)))))]
      (step 0))))
;; [DX-B8-C] Why: a narrow publication seam makes the absent-entry race deterministic in the concurrency test.
;; Rejected: timing a sleep and hoping it lands between map update and watermark publication.
(defn publish! [state t] (.set ^AtomicLong (:watermark state) t))
(defn apply-report! [state report]
  (when (and state (not (.get ^AtomicBoolean (:closed state))))
    (let [db (:db-after report) t (d/basis-t db) a (d/entid db :triplex.entity/rev)]
      (when (> t (:floor state))
        (let [updates (if a (filterv #(and (:added %) (= a (:a %))) (:tx-data report)) [])]
          ;; [DX-B8-C] Why: publish the watermark before releasing every changed entity's stripe, even absent entries.
          ;; Rejected: releasing a stripe before publication (an old lazy fill could race a dropped absent-entry update).
          (with-stripes state (map :e updates)
            (fn []
              (when (and (not (.get ^AtomicBoolean (:closed state))) (> t (.get ^AtomicLong (:watermark state))))
                (doseq [datom updates]
                  (let [eid (:e datom)]
                    (when-let [old (.get ^ConcurrentHashMap (:entries state) eid)]
                      (when (> t (:through old))
                        (.put ^ConcurrentHashMap (:entries state) eid
                          {:rev (long (:v datom)) :te (d/tx->t (:tx datom)) :through t :safe false})
                        (.increment changes)))))
                (publish! state t) (.increment reports)))))))))
(defn lookup [state eid cut read-datom]
  (when (and state (not (.get ^AtomicBoolean (:closed state))))
    (let [tw (.get ^AtomicLong (:watermark state)) entry (.get ^ConcurrentHashMap (:entries state) eid)]
      (if (and entry (:safe entry) (<= cut tw) (<= (:te entry) cut))
        (do (.increment hits)
            (when cache/verify-enabled
              (cache/check! [:recent eid cut] {:revision (:rev entry)} {:revision (or (:v (read-datom)) 0)})
              (.increment verified))
            entry)
        (do (.increment misses) (when (> cut tw) (.increment lag-fallbacks)) nil)))))
(defn install! [state eid cut datom safe]
  (when (and state (not (.get ^AtomicBoolean (:closed state))) safe datom (pos? (long (:v datom))) (>= cut (:floor state)))
    (let [te (d/tx->t (:tx datom))]
      (when (<= te cut)
        (locking allocation-lock
          ;; [DX-B8-C] Why: evict before taking the fill stripe; the consumer can hold several stripes together.
          ;; Rejected: holding a fill stripe while evicting another stripe (lock-order cycle with a report).
          (when (or (.containsKey ^ConcurrentHashMap (:entries state) eid) (room! entry-bytes))
            (locking (stripe state eid)
              ;; [DX-B8-C] Why: an evicted entry has no tombstone; only a fill at/after the watermark proves currentness.
              ;; Rejected: filling an absent entry from an older cut after its newer report was discarded.
              (when (and (not (.get ^AtomicBoolean (:closed state))) (>= cut (.get ^AtomicLong (:watermark state))))
                (let [old (.get ^ConcurrentHashMap (:entries state) eid)]
                  (when (and (or (nil? old) (<= (:through old) cut)) (or (nil? old) (<= (:te old) te)))
                    (when-not old (.addAndGet bytes entry-bytes) (.add order [state eid]))
                    (.put ^ConcurrentHashMap (:entries state) eid
                      {:rev (long (:v datom)) :te te :through cut :safe true})))))))))))
(defn stats [] {:recentHits (.sum hits) :recentMisses (.sum misses) :recentLagFallbacks (.sum lag-fallbacks)
               :recentVerified (.sum verified) :recentReports (.sum reports) :recentChanges (.sum changes)
               :recentBytes (.get bytes) :recentBudgetBytes (budget) :recentStates (.get states)})
