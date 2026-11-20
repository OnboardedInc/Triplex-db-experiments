(ns triplex.compact.journal-rows
  (:require [clojure.data.json :as json]))

(def columns [:recorded_position :id :entity_id :attribute :value_type :value_string :value_number
              :value_boolean :value_datetime :value_json :recorded_at :valid_from :valid_to
              :created_by :entity_type :schema_version :tx_id])

(def schema [{:db/ident :triplex.entity/id :db/valueType :db.type/string
              :db/cardinality :db.cardinality/one :db/unique :db.unique/identity}
             {:db/ident :triplex.entity/row :db/valueType :db.type/string
              :db/cardinality :db.cardinality/many :db/index true}])

(defn tx-id [account p] (str "_tx/compact/" account "/" p))
(defn fact-id [account [p i]] (str account "/" p "/" i))
(defn millis [micros] (/ (double micros) 1000.0))

(defn row-text [id tx attr type column value p clock]
  ;; [DX-COMPACT1] Why: use the existing lean row prefix and column contract for raw journal queries.
  ;; Rejected: synthesizing rows only in the typed journal reader.
  (let [ref (if (= type "ref") value "")
        row {:id id :entity_id tx :attribute attr :value_type type column value
             :recorded_position (format "%016d" p) :recorded_at (millis clock)
             :valid_from 0.0 :entity_type "_Transaction" :schema_version 1 :tx_id tx}]
    (str "2" (format "%04x" (count id)) id "0000000000000000----------------"
         (format "%04x" (count ref)) ref "-" (json/write-str (mapv row columns)))))

(defn change [account p clock op {:keys [id entity entityType attribute value from to recorded]}]
  (cond-> {:op op :tripleId (fact-id account id) :entityId entity :entityType entityType :attribute attribute
           :value value :assertionTxId (tx-id account (first id))
           :recordedAt (millis (or recorded clock)) :validFrom (or from 0.0)}
    to (assoc :validTo to)
    (= op "retract") (assoc :retractedAt (millis clock) :retractionTxId (tx-id account p))))

(defn transaction [account command p clock {:keys [adds retires erases]}]
  (let [tx (tx-id account p)
        changes (into (mapv (fn [i row] (change account p clock "assert" (assoc row :id [p i]))) (range) adds)
                      (concat (map #(change account p clock "retract" %) retires)
                              (for [{:keys [id e a]} erases]
                                {:op "erase" :tripleId (fact-id account id)
                                 :entityId (str "acct/" account "/" e) :attribute a})))
        entities (sort (into #{} (map :entityId) changes))
        payload (concat [[":_tx/position" "number" :value_number (double p)]
                         [":_tx/instant" "datetime" :value_datetime (millis clock)]
                         [":_tx/command-id" "string" :value_string command]]
                        (map #(vector ":_tx/changed-entity" "ref" :value_string %) entities)
                        (map #(vector ":_tx/change" "json" :value_json (json/write-str %)) changes))]
    {:triplex.entity/id tx
     :triplex.entity/row (mapv (fn [i [attr type column value]]
                                (row-text (str tx "/" i) tx attr type column value p clock))
                              (range) payload)}))
