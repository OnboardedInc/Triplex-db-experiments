(ns triplex.gateway.write-policy
  (:require [clojure.data.json :as json]))
(def priority? (= "1" (System/getenv "TX2_LIVE_PRIORITY")))
(def field-only? (= "1" (System/getenv "TX2_FIELD_COALESCE")))
(defn limit [env default upper]
  (let [n (Long/parseLong (or (System/getenv env) (str default)))]
    (when-not (<= 1 n upper) (throw (IllegalArgumentException. (str "Invalid " env)))) n))
(def bulk-rows (limit "TX2_BULK_ROWS" 96 4096))
(def bulk-bytes (limit "TX2_BULK_BYTES" 65536 4194304))
(defn request-size [input]
  (or (:wire-bytes (meta input)) (alength (.getBytes ^String (json/write-str input) "UTF-8"))))
(defn work [p input]
  ;; [DX-W1] Why: count actual new and retired rows, including receipts, before handing the frame to the sole writer.
  ;; Rejected: splitting an acknowledged transaction invisibly or promising preemption once Datomic has accepted it.
  (let [kind (get input "writeClass" (if (seq (get input "claims")) "live" "import"))
        bulk? (not= "live" kind)]
    (when-not (#{"live" "import" "activation" "notice"} kind)
      (throw (ex-info "Unknown write class" {:code "InvalidValue" :status 400})))
    (when bulk?
      (let [rows (+ (count (:new-ids p)) (count (filter #(and (vector? %) (= :triplex/retract (first %))) (:ops p))))]
        (when (or (> rows bulk-rows) (> (request-size input) bulk-bytes))
          (throw (ex-info "Atomic bulk frame exceeds the configured row or byte limit" {:code "BulkFrameTooLarge" :status 413})))))
    {:rank (if bulk? :bulk :live) :write-class kind}))
