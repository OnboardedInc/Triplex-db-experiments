(ns triplex.gateway.write-policy
  (:require [clojure.data.json :as json]))
(def priority? (= "1" (System/getenv "TX2_LIVE_PRIORITY")))
(def field-only? (= "1" (System/getenv "TX2_FIELD_COALESCE")))
(defn limit [env default upper]
  (let [n (Long/parseLong (or (System/getenv env) (str default)))]
    (when-not (<= 1 n upper) (throw (IllegalArgumentException. (str "Invalid " env)))) n))
(def bulk-rows (limit "TX2_BULK_ROWS" 96 4096))
(def bulk-bytes (limit "TX2_BULK_BYTES" 65536 4194304))
(def budget-us (when (System/getenv "TX2_WRITE_BUDGET_US") (limit "TX2_WRITE_BUDGET_US" 0 1000000)))
(def fixed-us 2400)
(defn request-size [input]
  (or (:wire-bytes (meta input)) (alength (.getBytes ^String (json/write-str input) "UTF-8"))))
(defn variable-us [ops bytes]
  ;; [DX-W1] Why: price indexing/validation and bytes separately. Byte price rounds up from the matched durable Mac probe.
  ;; Rejected: a constant row count for equally sized rows carrying very different amounts of data.
  (+ 1100 (* 45 ops) (quot (+ (* 70 bytes) 1023) 1024)))
(defn fits? [variable]
  (or (nil? budget-us) (<= (+ fixed-us variable) budget-us)))
;; [DX-IMP2] Why: an import commit carries whole subjects, so its one bound is how long it may hold the sole writer
;; (the same estimate as the live budget), checked in every writer mode by import_bound.clj. A subject is never split.
;; Rejected: the bulk class's 96 rows and 64 KiB (refuses any subject of more than 46 facts, and only under live
;; priority), splitting a subject across frames (a reader sees it half imported), and no bound (today's v0.1 writer).
;; Only plain values here: a new function in this file renumbers the commit function's generated names (commit.clj
;; loads after it) and so changes its stored hash, and the option-off log must stay byte-identical to the base's.
(def import-whole? (= "1" (System/getenv "TX2_IMPORT_WHOLE_SUBJECT")))
(def import-commit-us (when import-whole? (limit "TX2_IMPORT_COMMIT_US" 40000 1000000)))
(defn work [p input]
  ;; [DX-W1] Why: count actual new and retired rows, including receipts, before handing the frame to the sole writer.
  ;; Rejected: splitting an acknowledged transaction invisibly or promising preemption once Datomic has accepted it.
  (let [kind (get input "writeClass" (if (seq (get input "claims")) "live" "import"))
        bulk? (not= "live" kind)
        bytes (when (or budget-us bulk?) (request-size input))
        variable (when budget-us (variable-us (count (:ops p)) bytes))]
    (when-not (#{"live" "import" "activation" "notice"} kind)
      (throw (ex-info "Unknown write class" {:code "InvalidValue" :status 400 :write-policy true})))
    (when (and budget-us (not (fits? variable)))
      (when-not (if import-whole? (= "import" kind) false)
      (throw (ex-info "Atomic write exceeds the estimated service budget"
                      {:code "WriteBudgetExceeded" :status 413 :write-policy true}))))
    (when (and bulk? (nil? budget-us))
      (when-not (if import-whole? (= "import" kind) false)
      (let [rows (+ (count (:new-ids p)) (count (filter #(and (vector? %) (= :triplex/retract (first %))) (:ops p))))]
        (when (or (> rows bulk-rows) (> bytes bulk-bytes))
          (throw (ex-info "Atomic bulk frame exceeds the configured row or byte limit" {:code "BulkFrameTooLarge" :status 413}))))))
    (cond-> {:rank (if bulk? :bulk :live) :write-class kind}
      budget-us (assoc :variable-us variable))))
