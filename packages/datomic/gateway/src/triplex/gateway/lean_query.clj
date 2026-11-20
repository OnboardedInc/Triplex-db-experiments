(ns triplex.gateway.lean-query
  (:require [datomic.api :as d] [triplex.gateway.canonical :as canonical]
            [triplex.gateway.codec :as codec] [triplex.gateway.lean :as lean]
            [triplex.gateway.storage :as storage]))

(def enabled (= "1" (System/getenv "TX2_LEAN_NATIVE_QUERY")))
(def identifiers #{:f/id :triplex.entity/id :triplex.attr/key})
(def fact-attributes
  #{:f/id :f/subject :f/live :f/attr :f/type :f/valid-from :f/valid-to :f/created-by :f/entity-type
    :f.v/string :f.v/long :f.v/ref :f.v/double :f.v/boolean :f.v/json :f.v/blob-meta})
(def reference-attributes #{:f/subject :f/live :f/attr :f.v/ref})
(defn unsupported! [reason]
  (throw (ex-info (str "Lean query requires " reason) {:status 409 :code "LayoutUnsupported" :route "q"})))
(defn logical-id? [x]
  (and (vector? x) (= 2 (count x)) (identifiers (first x)) (string? (second x))))
(defn assert-unprotected! [db]
  ;; [DX-W1] Why: old pins can still own plaintext after a native excision.
  ;; Rejected: assuming row absence at the selected data cut is current erasure evidence.
  (when (lean/erasure-protected? db)
    (throw (ex-info "Lean queries need current erasure-aware value semantics"
                    {:status 409 :code "ErasureQueryUnsupported" :route "q"}))))
(defn binding? [x] (or (= '_ x) (canonical/variable? x)))
(defn join-key? [x] (or (canonical/variable? x) (logical-id? x)))
(defn data-pattern [form] (if (= '$ (first form)) (subvec form 1) form))
(defn rule-pattern? [form] (= '$rules (first form)))

(defn visible-row [row valid recorded position]
  (storage/visible? row {"validAt" valid "recordedAt" recorded "recordedPosition" position} false))

;; [DX-W1] Why: execute the existing closed EDN grammar over an immutable logical source built from stored rows.
;; Rejected: synthesizing durable fact entities on writes or using d/with to extend a Datomic as-of value.
(defn prepare [query]
  (let [used (set (filter symbol? (tree-seq coll? seq query)))
        counter (volatile! 0)
        fresh #(first (drop-while used (repeatedly (fn [] (symbol (str "?leanRow" (vswap! counter inc)))))))
        physical #(unsupported! "an application attribute and a stable Triplex identity, or a classic scope for physical datoms")]
    (letfn [(reference [value]
              ;; [DX-W1] Why: the relation source resolves lookup refs through their stable unique attributes.
              ;; Rejected: treating lookup-ref vectors as native DB eids in an ordinary tuple relation.
              (if (logical-id? value)
                (let [binding (fresh)] [binding [[binding (first value) (second value)]]])
                [value []]))
            (rewrite [form]
              (cond
                (seq? form)
                (let [op (first form) n (case op (not-join or-join) 2 1)
                      parts (map rewrite (drop n form))
                      ;; [DX-W1] Why: lookup bindings belong to their disjunct's conjunction.
                      ;; Rejected: flattening alternatives, which admits facts from unrelated owners.
                      clauses (if (= 'or-join op)
                                (map #(if (next %) (cons 'and %) (first %)) parts)
                                (mapcat identity parts))]
                  [(apply list (concat (take n form) clauses))])
                (seq? (first form))
                (let [[[f source fact & args] target] form]
                  (case f
                    (triplex.gateway.query/scalar triplex.gateway.query/transaction-id)
                    (do (when-not (and (= '$ source) (empty? args) (= 2 (count form))
                                       (or (canonical/variable? fact) (logical-id? fact)))
                          (codec/invalid "Invalid fact function arguments"))
                        (let [[entity bind] (reference fact)]
                          (conj bind [entity (if (= f 'triplex.gateway.query/scalar) ::scalar ::transaction) target])))
                    triplex.gateway.query/visible
                    (do (when-not (and (= '$ source) (= 3 (count args)) (= 1 (count form))
                                       (or (canonical/variable? fact) (logical-id? fact)))
                          (codec/invalid "Invalid visible function arguments"))
                        (let [[entity bind] (reference fact) row (fresh)]
                          (conj bind [entity ::row row] [(apply list 'triplex.gateway.lean-query/visible-row row args)])))
                    [form]))
                (rule-pattern? form) [form]
                :else
                (let [[e a v :as pattern] (data-pattern form)]
                  (when-not (and (<= 2 (count pattern) 3)
                                 (or (fact-attributes a) (#{:triplex.entity/id :triplex.attr/key} a))
                                 (or (binding? e) (logical-id? e))
                                 (or (not (reference-attributes a)) (< (count pattern) 3)
                                     (binding? v) (logical-id? v)))
                    (physical))
                  (let [[entity bind] (reference e)
                        [value refs] (if (reference-attributes a) (reference v) [v []])]
                    (conj (into bind refs) (if (= 2 (count pattern)) [entity a] [entity a value]))))))]
      (update query :where #(into [] (mapcat rewrite) %)))))

(defn literal-lookup [e a]
  (when (and (logical-id? e) (= a (first e))) (second e)))

;; [DX-W1] Why: a point query should seek only its proven subject or assertion IDs.
;; Rejected: using a constraint from one disjunct to narrow the relation for the rest of the query.
(defn point-demands [where]
  (when (every? vector? where)
    (let [patterns (mapv data-pattern (remove #(rule-pattern? %) where))
          names (into {} (keep (fn [[e a v]] (when (and (= a :triplex.entity/id) (join-key? e) (string? v)) [e v]))) patterns)
          subjects (into {} (keep (fn [[e a v]]
                                    (when (and (join-key? e) (#{:f/subject :f/live} a))
                                      (when-let [owner (or (literal-lookup v :triplex.entity/id) (get names v))]
                                        [e owner])))) patterns)
          ids (into {} (keep (fn [[e a v]]
                               (when-let [id (or (literal-lookup e :f/id)
                                                 (when (and (join-key? e) (= a :f/id) (string? v)) v))]
                                 [e id]))) patterns)
          facts (into (set (keys subjects)) (keys ids))
          owners (into #{} (keep (fn [[e a v]] (when (and (facts e) (join-key? v) (#{:f/subject :f/live :f.v/ref} a)) v))) patterns)
          attrs (into #{} (keep (fn [[e a v]] (when (and (facts e) (join-key? v) (= :f/attr a)) v))) patterns)]
      (when (and (seq facts)
                 (every? (fn [[e a]]
                           (cond (= a :triplex.entity/id) (owners e)
                                 (= a :triplex.attr/key) (attrs e)
                                 (#{::scalar ::row ::transaction} a) (facts e)
                                 (fact-attributes a) (facts e)
                                 :else true)) patterns))
        {:subjects (set (vals subjects)) :ids (set (vals ids))}))))

(defn scalar-value [{:keys [value_type value_string value_number value_datetime value_boolean value_json]}]
  (case value_type
    ("string" "ref" "blob") value_string
    "integer" (codec/decode-value {"t" "long" "v" value_string})
    "number" (double value_number)
    "datetime" (double value_datetime)
    "boolean" (== 1 value_boolean)
    "json" value_json
    (codec/invalid "Unknown value family")))

(defn facts [row]
  (let [{:keys [id entity_id attribute tx_id value_type value_string]} row
        fact [:f/id id] subject [:triplex.entity/id entity_id] attr [:triplex.attr/key attribute]
        reference (when (= value_type "ref") [:triplex.entity/id value_string])
        fields (-> (select-keys (storage/fact-map row {}) fact-attributes)
                   (assoc :f/subject subject :f/attr attr ::row row ::scalar (scalar-value row) ::transaction tx_id)
                   (cond-> (nil? (:retracted_at row)) (assoc :f/live subject)
                     reference (assoc :f.v/ref reference)))]
    (concat [[subject :triplex.entity/id entity_id] [attr :triplex.attr/key attribute]]
            (when reference [[reference :triplex.entity/id value_string]])
            (keep (fn [[k v]] (when (some? v) [fact k v])) fields))))

(defn input-budget! []
  (throw (ex-info "Lean query exceeded the row source budget" {:status 422 :code "QueryInputBudgetExceeded" :route "q"})))
(defn relation [name db query basis deadline]
  (let [point (point-demands (:where query)) p (select-keys basis ["recordedPosition"])
        n (volatile! 0) text (volatile! 0)
        ;; [DX-W1] Why: check the budget as the index is consumed, before grouping one owner's history.
        ;; Rejected: counting the decoded results after a single large history could exhaust the peer.
        visit! (fn [^String value]
                 (when (or (> (vswap! n inc) 100000)
                           (> (vswap! text + (.length value)) (* 16 1024 1024))
                           (>= (System/nanoTime) deadline)) (input-budget!)))
        all-rows (if point
                   ;; [DX-W1] Why: the shared reader receives a vector of entity IDs, as it does on the wire.
                   ;; Rejected: a hash set, which the pinned Clojure distinct implementation cannot destructure.
                   (concat (lean/rows name db {"history" true "entityIds" (vec (:subjects point))} visit!)
                           (mapcat #(lean/rows name db {"history" true "id" %} visit!) (:ids point)))
                   (lean/rows name db {"history" true} visit!))
        rows (keep #(when (storage/visible? % p true) (storage/mask-retirement % p)) all-rows)
        ;; Entity stubs created by reference upserts are application identities even when they have no facts.
        identities (when-not point
                     (map (fn [x]
                            (visit! (:v x))
                            [[:triplex.entity/id (:v x)] :triplex.entity/id (:v x)])
                          (d/datoms db :aevt :triplex.entity/id)))]
    (into #{} (concat (mapcat facts rows) identities))))
