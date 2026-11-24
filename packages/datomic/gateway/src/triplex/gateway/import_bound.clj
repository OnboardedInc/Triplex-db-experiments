(ns triplex.gateway.import-bound
  "[DX-IMP2] The import commit bound (TX2_IMPORT_WHOLE_SUBJECT=1, TX2_IMPORT_COMMIT_US). Loaded only when the
  option is on, at the first import commit, so with it off every native function and its stored hash stay
  byte-identical to the base's."
  (:require [triplex.gateway.write-policy :as policy]))

(defn import-class? [input]
  (= "import" (get input "writeClass" (if (seq (get input "claims")) "live" "import"))))
(defn estimate-us
  "The writer's estimate of a commit: the live budget's fixed and variable prices (write_policy.clj)."
  [p input] (+ policy/fixed-us (policy/variable-us (count (:ops p)) (policy/request-size input))))
(defn bound!
  "Refuse an import commit whose estimate exceeds the import bound, whole, naming the limit and the estimate.
  A subject is never split to fit: the importer frames whole subjects and refuses a subject that alone exceeds it."
  [p input]
  (when (and policy/import-whole? (import-class? input))
    (let [estimate (estimate-us p input)]
      (when (> estimate policy/import-commit-us)
        (throw (ex-info (str "Import commit exceeds the import bound (" estimate " us estimated, " policy/import-commit-us
                             " us allowed, " (count (:ops p)) " operations, " (policy/request-size input)
                             " bytes); whole subjects only, never split")
                        {:code "ImportCommitTooLarge" :status 413 :write-policy true
                         :maximum policy/import-commit-us :estimatedMicros estimate}))))))
