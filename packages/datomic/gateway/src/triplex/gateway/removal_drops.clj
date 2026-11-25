(ns triplex.gateway.removal-drops
  "[DX-API1] Parsed entities named by a newly published removal on request are dropped from the entity cache, so no
  entry parsed before a removal outlives it (api1/API-CALL-READS.md). [DX-INT5] API1 wrote this inline in privacy.clj
  and entity_cache.clj, which compile before commit.clj; there it moved every stored function's identity with every
  option off (READINESS.md, step 0). Here it fills privacy/drop-hook from a namespace main.clj loads after commit.clj;
  the behaviour is API1's, unchanged. Rejected: leaving it behind an option (the cache would hold rows a removal names)."
  (:require [datomic.api :as d] [triplex.gateway.privacy :as privacy] [triplex.gateway.entity-cache :as entity-cache])
  (:import [triplex.gateway.entity_cache ParsedKey] [java.util.function Predicate]))

(defn forget-entities!
  "Drop every parsed entry of database `name` whose entity ID is in `eids`."
  [name eids]
  (let [eids (set (map long eids))]
    (.increment entity-cache/removal-drop-calls) (.add entity-cache/removal-drop-named (count eids))
    (when (seq eids)
      (let [named? (fn [key] (and (instance? ParsedKey key) (= name (.-name ^ParsedKey key)) (contains? eids (.-eid ^ParsedKey key))))]
        (locking entity-cache/entries
          (doseq [key (.keySet entity-cache/entries) :when (named? key)]
            (when-let [removed (.remove entity-cache/entries key)]
              (.addAndGet entity-cache/bytes (- (long (:bytes removed)))) (.increment entity-cache/removal-drops)))
          (.removeIf entity-cache/order (reify Predicate (test [_ key] (named? key)))))))))

;; Entities named by removals this process has applied but not yet dropped: a frontier advanced without a database (the
;; key shred worker's `(cut name nil)`) is dropped by the next call that has one.
(def ^:private undropped (atom {}))

(defn- drain-drops! [name db]
  (let [[old _] (swap-vals! undropped dissoc name)]
    (when-let [ids (seq (get old name))]
      (forget-entities! name (keep #(try (d/entid db [:triplex.entity/id %]) (catch Exception _ nil)) ids)))))

(defn on-cut!
  "privacy/cut calls this with base and next nil at every cut, and with both when it accepts a newer frontier."
  [name db base next]
  (if next
    (let [named (distinct (for [entry (vals (:commands next)) :when (> (long (get entry "seq")) (long (:seq base)))
                                identity (get entry "identities")] (get identity "entity")))]
      (when (seq named) (swap! undropped update name (fnil into #{}) named))
      (when db (drain-drops! name db)))
    (when (and db (seq (get @undropped name))) (drain-drops! name db))))

(alter-var-root #'privacy/drop-hook (constantly on-cut!))
