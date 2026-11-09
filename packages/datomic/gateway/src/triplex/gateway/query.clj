(ns triplex.gateway.query
  (:require [datomic.api :as d] [clojure.edn :as edn] [triplex.gateway.codec :as codec]
            [triplex.gateway.storage :as storage]))

;; [EXP-DA01] Why: scalar channels preserve Triplex families without numeric text coercion. Rejected: native recursive rules and unrestricted classpath functions.
(defn scalar [db eid]
  (let [f (d/entity db eid)]
    (case (:f/type f)
      :string (:f.v/string f) :ref (:triplex.entity/id (:f.v/ref f))
      :json (:f.v/json f) :blob (String. ^bytes (:f.v/blob f) "UTF-8")
      :integer (:f.v/long f) :number (:value_number (storage/row db eid)) :datetime (:value_datetime (storage/row db eid))
      :boolean (:f.v/boolean f))))
(defn visible [db eid valid recorded position]
  (storage/visible? (storage/row db eid) {"validAt" valid "recordedAt" recorded "recordedPosition" position} false))
(defn family [v] (cond (instance? Double v) :number (integer? v) :integer (string? v) :text (boolean? v) :boolean :else :null))
(defn compare-op [op a b]
  (let [same (= (family a) (family b)) eq (and same (= a b))]
    (case op "=" eq "!=" (not eq)
      ">" (and same (number? a) (> a b)) ">=" (and same (number? a) (>= a b))
      "<" (and same (number? a) (< a b)) "<=" (and same (number? a) (<= a b)) false)))
(defn transaction-id [db eid] (:tx_id (storage/row db eid)))
(def allowed '#{triplex.gateway.query/transaction-id triplex.gateway.query/scalar triplex.gateway.query/visible triplex.gateway.query/compare-op ground})
(defn check-query! [q]
  (doseq [form (tree-seq coll? seq q)]
    (when (and (seq? form) (symbol? (first form)) (not (contains? '#{not-join or-join and} (first form)))
               (not (allowed (first form))))
      (codec/invalid "Query function is not allowlisted"))))
(defn encode [v]
  (codec/encode-value (cond (integer? v) "long" (number? v) "double" (boolean? v) "bool" :else "string") v))
(defn run [name current input]
  (let [query (edn/read-string {:readers {} :default (fn [& _] (codec/invalid "Tagged EDN is not allowed"))} (get input "edn"))
        _ (check-query! query) timeout (long (get input "timeoutMs" 5000))
        _ (when-not (<= 1 timeout 30000) (codec/invalid "Query timeout out of bounds"))
        db (storage/read-db name current input)
        ;; [EXP-DA01] Why: trusted native EDN can also select the retired-by-position index; its basis eligibility must match pulls (Q89b). Rejected: guarding only the pull route.
        _ (when (some #(and (vector? %) (= :f/live (second %))) (tree-seq coll? seq query))
            (storage/assert-subject-route! db (get input "basis") :f/live))
        result (d/query {:query query :args [db (get input "relations" [])] :timeout timeout})]
    (when (> (count result) 100000) (codec/invalid "Query row budget exceeded"))
    {:rows (mapv #(mapv encode %) result)}))
