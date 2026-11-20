(ns triplex.gateway.predecessor
  (:require [clojure.walk :as walk]))
(def enabled (= "1" (System/getenv "TX2_PREDECESSOR_LOOKUP")))
(def diagnostic (= "1" (System/getenv "TX2_READ_ATTRIBUTION")))
;; [DX-W1] Why: memoize only the current authoritative function call. Resolve an existing subject once, validate the actual row and marker, and reuse the checked datom.
;; Rejected: a cross-basis cache or an unverified client row (a concurrent retraction could invalidate either).
(def bindings
  '[owners (into {} (keep (fn [op] (when (and (instance? java.util.List op) (= :triplex/retract (first op))) [(nth op 2) (second op)])) (:ops payload)))
    owner-eid (memoize (fn [owner] (read-at :w1/owner (d/entid db [:triplex.entity/id owner]))))
    checked (volatile! {})])
(defn expand [form optimized? measured?]
  (walk/postwalk
    (fn [x]
      (cond
        (and (seq? x) (= 'choose-read (first x))) (nth x (if optimized? 2 1))
        (and (seq? x) (= 'read-at (first x)))
        (if measured?
          (list :ret (list 'datomic.measure.io-stats/throw-if-ex!
            (list 'datomic.measure.io-stats/with-io-stats
              (list 'fn [] (list 'datomic.measure.io-stats/inc! :w1-calls) (nth x 2))
              {:io-context (second x) :api :lookup})))
          (nth x 2))
        :else x)) (if optimized? (list 'let bindings form) form)))
(def normalization
  '(fn [expanded]
     ;; Existing lean entity maps contain only their unique id. Rewrite the known positional refs, never an arbitrary string value.
     (let [ids (into {} (keep (fn [op]
                    (when (and (map? op) (= #{:db/id :triplex.entity/id} (set (keys op)))
                               (= (:db/id op) (str "e:" (:triplex.entity/id op))))
                      (when-let [e (owner-eid (:triplex.entity/id op))] [(:db/id op) e]))) expanded))]
       (into [] (keep (fn [op]
         (cond (and (map? op) (contains? ids (:db/id op)) (= #{:db/id :triplex.entity/id} (set (keys op)))) nil
               (and (vector? op) (#{:db/add :db/retract} (first op)))
               (cond-> (update op 1 #(get ids % %)) (= :triplex.tx/journals (nth op 2)) (update 3 #(get ids % %)))
               :else op))) expanded))))
