(ns triplex.gateway.import-bound
  "[DX-IMP2] The import commit bound (TX2_IMPORT_WHOLE_SUBJECT=1, TX2_IMPORT_COMMIT_US). Loaded only when the
  option is on, at the first import commit, so with it off every native function and its stored hash stay
  byte-identical to the base's."
  (:require [triplex.gateway.write-policy :as policy]))

(defn import-class? [input]
  (= "import" (get input "writeClass" (if (seq (get input "claims")) "live" "import"))))
(def lookup-us
  "[DX-S6] The price of one index lookup the general writer makes per entity in the read set, per live predecessor
  and per command ID (commit.clj 177-256). From the S5 attack on the memory toy: 1.5 to 2.1 us per absent name, 8 to
  11 us per existing name or live ID, warm; rounded up. A cold segment read costs more, which is why the read set is
  also capped (read-set!) rather than only priced."
  12)
(defn lookups [p] (+ (count (:entities p)) (count (:live p)) (count (:command-ids p))))
(defn estimate-us
  "The writer's estimate of a commit: the live budget's fixed and variable prices (write_policy.clj), plus [DX-S6]
  one lookup price per entity read, live predecessor and command ID."
  [p input] (+ policy/fixed-us (policy/variable-us (count (:ops p)) (policy/request-size input)) (* lookup-us (lookups p))))

(def read-set-limit
  "[DX-S6] TX2_READ_SET_BOUND=1: the most entities and the most live predecessors one save of any class may name (the
  SDK's save limit is 4,096 facts)."
  4096)
(defn- refuse! [code message p]
  (throw (ex-info message {:code code :status 400 :write-policy true :maximum read-set-limit
                           :estimatedMicros (* lookup-us (lookups p))})))
(defn- retired-ids [p]
  (into #{} (keep (fn [op] (when (and (vector? op) (= :triplex/retract (first op))) (nth op 2 nil)))) (:ops p)))
(defn read-set!
  "[DX-S6] Refuse, whole and by type, a save whose read set the writer would spend unpriced time on.
  Every class (TX2_READ_SET_BOUND=1, and import frames under the import bound): a name repeated in the read set
  (ReadSetDuplicate); more than read-set-limit entities or live predecessors (ReadSetTooLarge).
  Import frames under the import bound (TX2_IMPORT_WHOLE_SUBJECT=1) also: an entity in the read set the frame does
  not write (ImportReadSetNotWritten), and a live predecessor the frame does not retire (ImportReadOnlyPredecessor);
  an import frame carries whole subjects, so it has nothing to read that it does not write.
  Rejected: pricing alone (one cold lookup at 1 billion records can be a segment read, which no price bounds)."
  [p input]
  (let [entities (:entities p) live (vec (get input "live" []))]
    (when-not (= (count entities) (count (distinct entities)))
      (refuse! "ReadSetDuplicate" "A save names an entity in its read set more than once" p))
    (when (or (> (count entities) read-set-limit) (> (count live) read-set-limit))
      (refuse! "ReadSetTooLarge" (str "A save's read set exceeds " read-set-limit " entities or live predecessors") p))
    (when (and policy/import-whole? (import-class? input))
      (let [written (set (concat (:owners p) (:journal-entities p)))]
        (when-not (every? written entities)
          (refuse! "ImportReadSetNotWritten" "An import frame's read set names an entity the frame does not write" p))
        (when-not (every? (retired-ids p) live)
          (refuse! "ImportReadOnlyPredecessor" "An import frame names a live predecessor it does not retire" p))))))
(defn bound!
  "Refuse an import commit whose estimate exceeds the import bound, whole, naming the limit and the estimate.
  A subject is never split to fit: the importer frames whole subjects and refuses a subject that alone exceeds it."
  [p input]
  (when (and policy/import-whole? (import-class? input))
    (read-set! p input)
    (let [estimate (estimate-us p input)]
      (when (> estimate policy/import-commit-us)
        (throw (ex-info (str "Import commit exceeds the import bound (" estimate " us estimated, " policy/import-commit-us
                             " us allowed, " (count (:ops p)) " operations, " (policy/request-size input)
                             " bytes); whole subjects only, never split")
                        {:code "ImportCommitTooLarge" :status 413 :write-policy true
                         :maximum policy/import-commit-us :estimatedMicros estimate}))))))

(defn removal-families
  "[DX-IMP2] The protected (entity, attribute) families a removal's entity selectors name, whether or not any row
  exists yet. An importing write of one of them is then declined (ErasureReplayDeclined), so an import that was
  framed before the removal can never bring a removed value back."
  [state selectors]
  (vec (distinct (for [s selectors :let [e (get s "entityId") a (get s "attribute")] :when e
                       attr (if a [a] (sort (:attrs state))) :when ((:attrs state) attr)]
                   [e attr]))))
