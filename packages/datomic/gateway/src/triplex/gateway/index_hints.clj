(ns triplex.gateway.index-hints
  "[DX-XQ10] The hint fix for the commit-time index (TX2_INDEX_HINTS=1, default off; it acts with TX2_CROSS_INDEX=1
  and the hint options it extends, TX2_SUBJECT_HINTS=1 and TX2_GENERAL_PREFETCH=1).
  The index branch measured (xq4/COMMIT-INDEX.md, follow-up item 5) that index entries are not hinted: on a 32 MB
  transactor cache, index on minus off added +0.17, +0.25 and +0.45 storage reads inside apply per first-touch save at
  1, 3 and 6 replaced declared values, with both hint options on; neither lookup function names the entries.
  With this option on, both lookup functions also touch, after their own reads, the AEVT neighbourhood of
  :triplex.ix/entry for each entry the save asserts or retracts (its owner, and each key): the apply's io-stats show
  that the index's excess storage reads are AEVT loads of that attribute (Datomic's own lookups for the entry datoms).
  Measured (xq10/QUESTIONS-CONNECTED.md section 8b, item 4; 2,700 first-touch saves a cell): index on minus off +0.18
  without and +0.11 with on a 32 MB cache, +0.12 without and +0.05 with on 256 MB. The first form touched EAVT (the
  owner's range and each key) and AVET (each key) and the declaration's sequence datom: none of them is read by the
  apply, and on 32 MB the extra segments raised the excess to +0.30 (they evict), so they were removed. The index
  branch's proposal (the range start only) removed none of it. The touches stay lookup-only (no datoms, no decision).
  Stored-function identity: the two functions get NEW code and so new idents, installed once per database only when
  this option is on; with it off this namespace changes no var and nothing is installed, so every existing identity
  is unchanged (checked by xq10/idents.sh). Rejected: editing subject_hints.clj and general_prefetch.clj (their
  functions' identities belong to their builders and would move for everyone); editing storage.clj's call sites
  (the swap below keeps them calling the same vars)."
  (:require [datomic.api :as d] [triplex.gateway.schema :as schema]
            [triplex.gateway.subject-hints :as subject-hints] [triplex.gateway.general-prefetch :as general-prefetch]))

(def enabled (= "1" (System/getenv "TX2_INDEX_HINTS")))

(defn- extend-code
  "The lookup function's code with `touches` before its final [] (the function's return value)."
  [code touches]
  (assert (and (seq? code) (= 'let (first code)) (= [] (last code))) "a lookup function is (let [...] ... [])")
  (apply list (concat (butlast code) touches [[]])))

(def subject-code
  ;; The per-subject writer addresses entries to the numeric owner (`owner` in the function's bindings): the owner's
  ;; AEVT neighbourhood of :triplex.ix/entry and each entry key the save asserts or retracts there.
  (extend-code subject-hints/code
               '[(when-let [ix (d/entid db :triplex.ix/entry)]
                   (when owner
                     (first (d/seek-datoms db :aevt ix owner))
                     (doseq [k (:ix-keys payload)] (first (d/seek-datoms db :aevt ix owner k)))))]))
(def subject-ident (keyword "triplex.subject" (str "hints-" (subs (schema/sha256 (pr-str subject-code)) 0 24))))

(def general-code
  ;; The general writer: each entry operation of the save, on its owner (`owner` and `public` are the function's own
  ;; bindings), in AEVT.
  (extend-code general-prefetch/code
               '[(when-let [ix (d/entid db :triplex.ix/entry)]
                   (doseq [op ops :when (and (list? op) (= :triplex.ix/entry (nth op 2 nil)))]
                     (let [x (second op) k (nth op 3 nil)
                           e (cond (number? x) x (string? x) (owner (public x)))]
                       (when (and e (string? k)) (first (d/seek-datoms db :aevt ix e k))))))]))
(def general-ident (keyword "triplex.write" (str "prefetch-" (subs (schema/sha256 (pr-str general-code)) 0 24))))

;; With the option on, the hint namespaces install and call the extended functions under their new idents.
;; The per-subject payload also carries the save's entry keys (from the plan's operations).
(defn- entry-keys [ops]
  (into [] (keep (fn [op] (when (and (vector? op) (= :triplex.ix/entry (nth op 2 nil)) (string? (nth op 3 nil))) (nth op 3)))) ops))
(when enabled
  (alter-var-root #'subject-hints/from-plan (fn [from-plan] (fn [plan] (assoc (from-plan plan) :ix-keys (entry-keys (:ops plan))))))
  (alter-var-root #'subject-hints/code (constantly subject-code))
  (alter-var-root #'subject-hints/ident (constantly subject-ident))
  (alter-var-root #'general-prefetch/code (constantly general-code))
  (alter-var-root #'general-prefetch/ident (constantly general-ident)))
