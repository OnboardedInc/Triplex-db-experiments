(ns triplex.gateway.group-cut
  (:require [datomic.api :as d] [triplex.gateway.scope :as scope]))
;; [DX-W1] Why: one physical t can contain multiple distinct strict clocks and positions.
;; Rejected: using the end of that physical transaction for a pull or feed page at its first receipt.
(defn value [db e a] (:v (first (d/datoms db :eavt e a))))
(defn interior [db p r]
  (when (and (or p r) (d/entid db :triplex.group/position))
    (let [boundary (when r (first (d/index-range db :triplex.tx/max-recorded-at (Math/nextUp (double r)) nil)))
          time-p (when boundary
                   (let [tx (:e boundary)
                         eligible (for [link (d/datoms db :eavt tx :triplex.group/members)
                                        :let [e (:v link)] :when (<= (value db e :triplex.tx/recorded-at) r)]
                                    (value db e :triplex.group/position))]
                     (if (seq eligible) (reduce max eligible)
                       (let [before (d/as-of db (dec (d/tx->t tx)))]
                         (scope/head-position before (scope/entity db))))))]
      (when-let [cut (if (and p time-p) (min p time-p) (or p time-p))]
        (when-let [e (d/entid db [:triplex.group/position cut])]
          (let [physical (value db e :triplex.group/physical)]
            (when (not= e physical)
              (let [t (d/tx->t physical) after (d/as-of db t)]
                {:position cut :t t :after after :before (d/as-of db (dec t))
                 :members (for [link (d/datoms after :eavt physical :triplex.group/members)
                                :let [m (:v link) pos (value after m :triplex.group/position)] :when (<= pos cut)]
                            [m pos])}))))))))
(defn prefix-end [^String text] (+ 5 (Integer/parseInt text 1 5 16)))
(defn entity-slice [{:keys [position before after members]} eid]
  (let [revision (reduce (fn [rev [m p]] (if (first (d/datoms after :eavt m :triplex.group/touched eid)) (max rev p) rev))
                         (or (value before eid :triplex.entity/rev) 0) members)
        retired (into #{} (keep (fn [x] (let [^String marker (:v x) i (prefix-end marker)]
                                         (when (<= (Long/parseLong marker i (+ i 16) 10) position) (subs marker 0 i)))))
                             (d/datoms after :eavt eid :triplex.entity/retired))
        old (d/datoms before :eavt eid :triplex.entity/row)
        ;; New rows carry the final server-assigned position in their fixed-width prefix. A born-and-retired
        ;; group row remains in the after set with its own marker; an older removed row remains in the before set.
        rows (reduce (fn [acc x]
                      (let [^String v (:v x) end (prefix-end v) ref (+ end 32)
                            off (+ ref 5 (Integer/parseInt v ref (+ ref 4) 16) 2)]
                        (if (or (retired (subs v 0 end)) (> (Long/parseLong v off (+ off 16) 10) position))
                          acc (assoc acc v x)))) (sorted-map) (concat old (d/datoms after :eavt eid :triplex.entity/row)))]
    {:rev revision :datoms (vec (vals rows))}))
