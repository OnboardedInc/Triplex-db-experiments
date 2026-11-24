(ns triplex.gateway.index-hints
  "[DX-XQ10] The hint fix for the commit-time index (TX2_INDEX_HINTS=1, default off; it acts with TX2_CROSS_INDEX=1
  and the hint options it extends, TX2_SUBJECT_HINTS=1 and TX2_GENERAL_PREFETCH=1).
  The index branch measured (xq4/COMMIT-INDEX.md, follow-up item 5) that index entries are not hinted: on a 32 MB
  transactor cache, index on minus off added +0.17, +0.25 and +0.45 storage reads inside apply per first-touch save at
  1, 3 and 6 replaced declared values, with both hint options on. Datomic's redundancy check of each entry assertion
  and retraction reads the owner's EAVT range of :triplex.ix/entry, and the declaration fence's cas reads the
  declaration entity's sequence datom; neither lookup function named them.
  With this option on, both lookup functions also touch, after their own reads, the owner's :triplex.ix/entry range
  (EAVT) and the declaration's sequence datom (EAVT and AEVT). They stay lookup-only (no datoms, no decision).
  Stored-function identity: the two functions get NEW code and so new idents, installed once per database only when
  this option is on; with it off this namespace changes no var and nothing is installed, so every existing identity
  is unchanged (checked by xq10/idents.sh). Rejected: editing subject_hints.clj and general_prefetch.clj (their
  functions' identities belong to their builders and would move for everyone); editing storage.clj's call sites
  (the swap below keeps them calling the same vars)."
  (:require [datomic.api :as d] [triplex.gateway.schema :as schema]
            [triplex.gateway.subject-hints :as subject-hints] [triplex.gateway.general-prefetch :as general-prefetch]))

(def enabled (= "1" (System/getenv "TX2_INDEX_HINTS")))

(def ^:private declaration-touches
  ;; The fence's cas reads the declaration entity's :triplex.ix/seq (EAVT); its AEVT neighbourhood is named too.
  '[(when-let [ix-seq (d/entid db :triplex.ix/seq)]
      (when-let [decl (try (d/entid db [:triplex.entity/id "_triplex/index/declaration"]) (catch Exception _ nil))]
        (first (d/datoms db :eavt decl ix-seq)))
      (first (d/datoms db :aevt ix-seq)))])

(defn- extend-code
  "The lookup function's code with `touches` before its final [] (the function's return value)."
  [code touches]
  (assert (and (seq? code) (= 'let (first code)) (= [] (last code))) "a lookup function is (let [...] ... [])")
  (apply list (concat (butlast code) touches [[]])))

(def subject-code
  ;; The per-subject writer addresses entries to the numeric owner (`owner` in the function's bindings).
  (extend-code subject-hints/code
               (into '[(when owner
                         (when-let [ix (d/entid db :triplex.ix/entry)]
                           (first (d/datoms db :eavt owner ix))))]
                     declaration-touches)))
(def subject-ident (keyword "triplex.subject" (str "hints-" (subs (schema/sha256 (pr-str subject-code)) 0 24))))

(def general-code
  ;; The general writer's owners: every entity the save names and every owner of a retired row (`entities`, `owners`
  ;; and the memoized `owner` lookup are the function's own bindings).
  (extend-code general-prefetch/code
               (into '[(when-let [ix (d/entid db :triplex.ix/entry)]
                         (doseq [id (distinct (concat entities (vals owners)))]
                           (when-let [e (owner id)]
                             (first (d/datoms db :eavt e ix)))))]
                     declaration-touches)))
(def general-ident (keyword "triplex.write" (str "prefetch-" (subs (schema/sha256 (pr-str general-code)) 0 24))))

;; With the option on, the hint namespaces install and call the extended functions under their new idents.
(when enabled
  (alter-var-root #'subject-hints/code (constantly subject-code))
  (alter-var-root #'subject-hints/ident (constantly subject-ident))
  (alter-var-root #'general-prefetch/code (constantly general-code))
  (alter-var-root #'general-prefetch/ident (constantly general-ident)))
