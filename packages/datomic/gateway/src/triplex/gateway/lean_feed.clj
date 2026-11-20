(ns triplex.gateway.lean-feed
  (:require [datomic.api :as d] [triplex.gateway.feed :as feed] [triplex.gateway.lean :as lean]
            [triplex.gateway.save-ledger :as ledger]))

(def enabled (= "1" (System/getenv "TX2_LEAN_NATIVE_LOG")))

(defn application [row op p]
  (when-not (= "_Transaction" (:entity_type row))
    {:op op :entity (:entity_id row) :attribute (:attribute row) :assertionId (:id row)
     :validFrom (:valid_from row) :validTo (:valid_to row) :position (str p)}))

;; [DX-W1] Why: the native replay scans physical t once and decodes only identity and interval fields for delivery.
;; Rejected: replaying journal payloads, losing an interior retraction or emitting it twice from the marker and the native retract.
(defn project [db {:keys [t data]}]
  (let [cut (d/as-of db t) tx (d/t->tx t) p (ledger/value cut tx :triplex.tx/position)
        raw-excision (d/entid cut :db/excise)]
    (when (and raw-excision (some #(= raw-excision (:a %)) data))
      (throw (ex-info "Native erasure requires a published sequence" {:status 409 :code "FeedErasureUnsupported"})))
    (if (nil? p)
      {:t (str t) :kind "skipped" :reason "non-triplex"}
      (let [row-a (d/entid cut :triplex.entity/row) retired-a (d/entid cut :triplex.entity/retired)
            row-data (for [x data :when (= row-a (:a x))] [x (lean/decode (:v x))])
            in-tx (into {} (map (fn [[_ row]] [(:id row) row])) row-data)
            markers (into {} (for [x data :when (and (:added x) (= retired-a (:a x)))
                                   :let [r (lean/retirement (:v x))]] [(:id r) [x r]]))
            changes (concat
                      (keep (fn [[x row]]
                              (if (:added x) (application row "assert" (:recorded_position row))
                                (when-not (markers (:id row)) (application row "retract" p)))) row-data)
                      (keep (fn [[id [marker r]]]
                              (let [row (or (in-tx id)
                                            (when-let [x (lean/by-id (d/history cut) id)]
                                              (when (= (:e marker) (:e x)) (lean/decode (:v x)))))]
                                (application (feed/required row) "retract" (:retracted_position r)))) markers))
            ordered (vec (sort-by (juxt #(Long/parseLong ^String (:position %)) :assertionId :op) (distinct changes)))
            journals (ledger/journals cut tx)
            claims-a (d/entid cut :triplex.claim/command-id)
            commands (sort (distinct (for [x data :when (and (= claims-a (:a x)) (:added x))] (:v x))))
            txids (sort (distinct (remove nil? (concat [(ledger/tx-id cut tx)]
                    (map #(ledger/value cut (first %) :triplex.entity/id) journals)
                    (map (comp :tx_id second) (filter (fn [[x r]] (and (:added x) (not= "_Transaction" (:entity_type r)))) row-data))
                    (map (comp :retract_tx_id second val) markers)))))
            positions (mapv str (sort (distinct (concat [p] (map second journals) (map #(Long/parseLong ^String (:position %)) ordered)))))]
        {:t (str t) :kind "commit"
         :transaction (merge {:positions positions :changes ordered :txIds (vec txids) :commandIds (vec commands)
                              :operationId (feed/required (ledger/value cut tx :triplex.tx/operation-id))}
                             (feed/stamp (feed/required (ledger/clock cut tx))))}))))
