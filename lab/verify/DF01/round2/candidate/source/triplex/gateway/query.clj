(ns triplex.gateway.query
  (:require [datomic.api :as d] [triplex.gateway.canonical :as canonical] [triplex.gateway.codec :as codec]
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
(defn query-route [query]
  ;; [EXP-DA01] Why: only proven history attributes may bypass live eligibility; variable, numeric, lookup-ref and omitted attributes can select :f/live indirectly (V-DA01 F1). Rejected: enumerating ground/ident spellings, which leaves equivalent bindings open.
  (let [where (:where query)
        safe-clause? (fn safe-clause? [clause]
                       (cond
                         (seq? clause) (case (first clause)
                                         and (every? safe-clause? (rest clause))
                                         not-join (every? safe-clause? (drop 2 clause))
                                         or-join (every? safe-clause? (drop 2 clause))
                                         false)
                         (vector? clause)
                         (let [source (first clause)
                               pattern (if (= source '$) (rest clause) clause)
                               attribute (second pattern)]
                           (or (seq? source)
                               (= source '$rules)
                               (and (keyword? attribute) (not= attribute :f/live))))
                         :else false))]
    (if (every? safe-clause? where) :f/subject :f/live)))
(defn encode [v]
  (codec/encode-value (cond (integer? v) "long" (number? v) "double" (boolean? v) "bool" :else "string") v))
(defn run [name current input]
  (let [query (canonical/parse (get input "edn"))
        timeout (long (get input "timeoutMs" 5000))
        _ (when-not (<= 1 timeout 30000) (codec/invalid "Query timeout out of bounds"))
        db (storage/read-db name current input)
        route (query-route query)
        _ (storage/assert-subject-route! db (get input "basis") route)
        result (d/query {:query query :args [db (get input "relations" [])] :timeout timeout})]
    (when (> (count result) 100000) (codec/invalid "Query row budget exceeded"))
    {:route (if (= route :f/live) "live" "history") :rows (mapv #(mapv encode %) result)}))
