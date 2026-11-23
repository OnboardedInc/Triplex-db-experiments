(ns triplex.gateway.group-cut
  (:require [datomic.api :as d] [triplex.gateway.owner-root :as owner-root] [triplex.gateway.scope :as scope]
            [triplex.gateway.save-ledger :as ledger] [triplex.gateway.pinned :as pinned]))
;; [DX-W1] Why: one physical t can contain multiple distinct strict clocks and positions.
;; Rejected: using the end of that physical transaction for a pull or feed page at its first receipt.
(defn value [db e a] (:v (first (d/datoms db :eavt e a))))
;; [DX-RD2] Why: on an as-of view, resolving a group position the view does not hold makes Datomic's filtered AVET
;; iterator walk every :triplex.group/position datom asserted after the pin (31.86 ms and about 70 MB per pinned read at
;; 1 billion, rd1/PINNED-1B.md). Group positions are unique and only ever asserted, so the view holds a member exactly
;; when the current database holds it with an assertion at or before the view's t. Behind TX2_PINNED_CUT_LOOKUP.
;; Rejected: the lookup ref on the view (the walk), and caching absence (a later group could take the position).
(def current-lookup (= "1" (System/getenv "TX2_PINNED_CUT_LOOKUP")))
(defn member-at [db cut]
  (let [t (d/as-of-t db) current pinned/*current*]
    (if (and current-lookup t current)
      (when-let [a (d/entid current :triplex.group/position)]
        (let [^datomic.Datom x (first (d/datoms current :avet a cut))]
          (when (and x (= cut (.v x)) (<= (.tx x) (d/t->tx t))) (.e x))))
      (d/entid db [:triplex.group/position cut]))))
(defn interior [db p r]
  (when (and (or p r) (d/entid db :triplex.group/position))
    (let [boundary (when r (first (d/index-range db :triplex.tx/max-recorded-at (Math/nextUp (double r)) nil)))
          time-p (when boundary
                   (let [tx (:e boundary)
                         eligible (for [link (d/datoms db :eavt tx :triplex.group/members)
                                        :let [e (:v link)] :when (<= (ledger/clock db e) r)]
                                    (value db e :triplex.group/position))]
                     (if (seq eligible) (reduce max eligible)
                       (let [before (d/as-of db (dec (d/tx->t tx)))]
                         (scope/head-position before (scope/entity db))))))]
      (when-let [cut (if (and p time-p) (min p time-p) (or p time-p))]
        (when-let [e (member-at db cut)]
          (let [physical (value db e :triplex.group/physical)]
            (when (not= e physical)
              (let [t (d/tx->t physical) after (d/as-of db t)]
                {:position cut :t t :after after :before (d/as-of db (dec t))
                 :members (for [link (d/datoms after :eavt physical :triplex.group/members)
                                :let [m (:v link) pos (value after m :triplex.group/position)] :when (<= pos cut)]
                            [m pos])}))))))))
(declare legacy-slice)
(defn prefix-end [^String text] (+ 5 (Integer/parseInt text 1 5 16)))
(defn entity-slice [{:keys [position before after members] :as cut} eid]
  ;; [Opus W1] Why: no grouped save can touch a person with a covering root, so the group's interior equals its end.
  ;; Rejected: slicing a migrated owner's legacy rows (they omit the covered rows and keep the masked ones).
  (if (owner-root/raw before eid)
    {:rev (or (value before eid :triplex.entity/rev) 0) :root-db after}
    (legacy-slice cut eid)))
(defn legacy-slice [{:keys [position before after members]} eid]
  (let [revision (reduce (fn [rev [m p]] (if (first (d/datoms after :eavt m :triplex.group/touched eid)) (max rev p) rev))
                         (or (value before eid :triplex.entity/rev) (ledger/implicit-position before eid) 0) members)
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
