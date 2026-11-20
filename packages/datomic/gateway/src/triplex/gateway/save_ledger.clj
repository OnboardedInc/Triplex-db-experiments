(ns triplex.gateway.save-ledger
  (:require [datomic.api :as d]))

(def enabled (= "1" (System/getenv "TX2_SAVE_LEDGER")))

(defn value [db e a] (:v (first (d/datoms db :eavt e a))))
(defn tx-id [db e] (or (value db e :triplex.tx/id) (value db e :triplex.entity/id)))
(defn clock [db e] (or (value db e :triplex.tx/recorded-at) (value db e :triplex.tx/max-recorded-at)))
(defn claim-tx [db e] (or (value db e :triplex.claim/tx) e))
(defn claim-tx-id [db e] (or (value db e :triplex.claim/tx-id) (tx-id db e)))

(defn implicit-position [db e]
  (when (and (value db e :triplex.entity/id) (value db e :triplex.tx/operation-id)
             (not (value db e :triplex.tx/id)))
    (or (when (d/entid db :triplex.group/position) (value db e :triplex.group/position))
        (value db e :triplex.tx/position))))

(defn journals [db tx]
  (concat
    (map (fn [x] (let [e (:v x)] [e (value db e :triplex.journal/position)]))
         (d/datoms db :eavt tx :triplex.tx/journals))
    (let [members (when (d/entid db :triplex.group/members) (seq (d/datoms db :eavt tx :triplex.group/members)))]
      (keep (fn [e] (when-let [p (implicit-position db e)] [e p]))
            (if members (map :v members) [tx])))))

;; [DX-W1] Why: the immutable logical transaction already identifies the journal and command.
;; Rejected: dropping ordinary journal triples or moving the identity-absence check to an optimistic peer.
(def rewrite-code
  '(fn [ops journal command]
     (let [owner (str "e:" journal) claim (str "c:" command)]
       (into [] (keep (fn [op]
                        (if (instance? java.util.Map op)
                          (case (:db/id op)
                            "datomic.tx" (-> (into {} op)
                                             (dissoc :triplex.tx/id :triplex.tx/recorded-at)
                                             (assoc :triplex.entity/id journal :triplex.claim/command-id command))
                            (when-not (#{owner claim} (:db/id op)) op))
                          (let [[_ e a v] op]
                            (cond
                              (and (= e "datomic.tx") (= a :triplex.tx/journals) (= v owner)) nil
                              (and (= e owner) (#{:triplex.journal/position :triplex.entity/rev} a)) nil
                              (= e owner) (assoc (vec op) 1 "datomic.tx")
                              :else op))))) ops))))
