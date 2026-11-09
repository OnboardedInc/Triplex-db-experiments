(ns triplex.gateway.canonical
  (:require [clojure.edn :as edn] [triplex.gateway.codec :as codec])
  (:import [java.io PushbackReader StringReader]))

;; [EXP-DA01] Why: route proof and Peer execution must consume exactly one parsed structure (V-DA01 R2-F1). Rejected: inspecting a first section while executing the original vector with later sections.
(def sections #{:find :in :where :with})
(def functions '#{triplex.gateway.query/transaction-id triplex.gateway.query/scalar triplex.gateway.query/visible triplex.gateway.query/compare-op ground})
(defn variable? [x] (and (symbol? x) (.startsWith (str x) "?")))
(defn variable-list [xs]
  (when-not (and (sequential? xs) (every? variable? xs)) (codec/invalid "Expected variable bindings"))
  (vec xs))
(defn term [x depth]
  (when (> depth 64) (codec/invalid "Query nesting budget exceeded"))
  (cond
    (or (nil? x) (string? x) (number? x) (boolean? x) (keyword? x) (symbol? x)) x
    (vector? x) (mapv #(term % (inc depth)) x)
    :else (codec/invalid "Unsupported query term; native rule bodies and pull patterns are not supported")))
(declare clause)
(defn clause [x depth]
  (when (> depth 64) (codec/invalid "Query nesting budget exceeded"))
  (cond
    (vector? x)
    (if (seq? (first x))
      (let [call (first x)]
        (when-not (and (functions (first call)) (<= 1 (count x) 2))
          (codec/invalid "Unsupported query function or native pull projection"))
        (into [(apply list (first call) (map #(term % (inc depth)) (rest call)))]
              (when (= 2 (count x)) [(term (second x) (inc depth))])))
      (do (when-not (<= 1 (count x) 6) (codec/invalid "Invalid data pattern"))
          (mapv #(term % (inc depth)) x)))
    (seq? x)
    (case (first x)
      and (apply list 'and (map #(clause % (inc depth)) (rest x)))
      not-join (apply list 'not-join (variable-list (second x)) (map #(clause % (inc depth)) (drop 2 x)))
      or-join (apply list 'or-join (variable-list (second x)) (map #(clause % (inc depth)) (drop 2 x)))
      (codec/invalid "Unsupported logical clause or native rule invocation"))
    :else (codec/invalid "Unsupported query clause")))
(defn section-pairs [q]
  (cond
    (map? q) (mapv (fn [[k v]] [k v]) q)
    (vector? q)
    (loop [xs (seq q) result []]
      (if-not xs result
        (let [section (first xs) [values remaining] (split-with (complement keyword?) (rest xs))]
          (when-not (sections section) (codec/invalid "Unknown query section"))
          (recur (seq remaining) (conj result [section (vec values)])))))
    :else (codec/invalid "Query must be a vector or map")))
(defn normalize [q]
  (let [pairs (section-pairs q)
        combined (reduce (fn [m [k values]]
                           (when-not (and (sections k) (sequential? values)) (codec/invalid "Unsupported query section"))
                           (let [v (vec values)]
                             (cond
                               (= k :where) (update m k (fnil into []) v)
                               (= k :with) (update m k (fnil into []) (variable-list v))
                               (and (contains? m k) (not= (get m k) v)) (codec/invalid "Conflicting repeated query section")
                               :else (assoc m k v)))) {} pairs)
        find (:find combined) in (:in combined) where (:where combined)]
    ;; [EXP-DA01] Why: the second argument is a relation, never a database or native rule set; normalize duplicate bindings before enforcing that invariant. Rejected: source aliases or % interpreted differently by the classifier and Peer.
    (when-not (= '[$ $rules] in) (codec/invalid "Query inputs must be $ and $rules, in that order"))
    (when-not (and (seq find) (every? variable? find))
      (codec/invalid "Only variable projections are supported; native pull patterns and aggregates are refused"))
    (when-not (and (some? where) (<= (count where) 4096)) (codec/invalid "Missing where section or query clause budget exceeded"))
    (cond-> {:find (vec find) :in '[$ $rules] :where (mapv #(clause % 0) where)}
      (contains? combined :with) (assoc :with (vec (distinct (:with combined)))))))
(defn parse [text]
  (let [q (try
            (with-open [reader (PushbackReader. (StringReader. text))]
              (let [options {:readers {} :default (fn [& _] (codec/invalid "Tagged EDN is not allowed")) :eof ::eof}
                    q (edn/read options reader)]
                (when (or (= q ::eof) (not= ::eof (edn/read options reader))) (codec/invalid "Expected exactly one query")) q))
            (catch Exception e (codec/invalid (str "Invalid query EDN: " (.getMessage e)))))]
    (normalize q)))
