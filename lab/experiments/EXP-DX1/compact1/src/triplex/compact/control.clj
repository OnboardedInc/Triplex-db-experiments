(ns triplex.compact.control
  (:require [clojure.data.json :as json]
            [datomic.api :as d]
            [triplex.compact.floor :as floor]
            [triplex.compact.store :as store]
            [triplex.gateway.group :as group]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.storage :as storage]))

(defn option [namespace symbol]
  (or (ns-resolve namespace symbol) (store/reject :MissingIncumbentOption)))

(defn read-options! [{:keys [name conn]}]
  (let [status ((option 'triplex.gateway.main 'write-options) name)
        opts (:options status)
        db (d/db conn)
        variants @(option 'triplex.gateway.commit 'variants)
        selected (first (variants [true false]))
        witness (store/function-spec (store/value db (d/entid db :triplex.group/apply-v1) :db/fn))]
    (assert (= floor/attempt (:attempt status)))
    (assert (= floor/source (:gatewaySourceHash status)))
    (assert (and (:strictRecordClocks status) (:commitFunctionInstalled status)))
    (assert (= (str selected) (:commitFunction status)))
    (assert (= (:code witness) group/guard))
    (assert (= 3 (:rowsVersion status)))
    (assert (every? true? ((juxt :predecessorLookup :groupCommit :stageClock :smallRows :reusePrepared :livePriority) opts)))
    (assert (= 8 (:maxMembers opts)))
    (assoc opts :function (:commitFunction status))))

(defn journal-rows [db id]
  (let [eid (d/entid db [:triplex.entity/id id])]
    (assert eid)
    (mapv #(lean/decode (:v %)) (d/datoms db :eavt eid :triplex.entity/row))))

(defn check-receipt! [db request expected native]
  (let [op (get request "operationId")
        tx (get-in request ["claims" 0 "txId"])
        receipt (group/receipt db op)
        rows (group-by :attribute (journal-rows db tx))
        changes (map #(json/read-str (:value_json %)) (rows ":_tx/change"))
        offered (mapv storage/decode-row (get request "rows"))
        business (remove #(= "_Transaction" (:entity_type %)) offered)
        asserted (set (get request "newIds"))
        by-id (into {} (map (juxt :id identity)) business)
        expected-entities (set (map :entity_id business))]
    (assert (= expected (:position receipt)))
    (assert (= native (:t receipt)))
    (assert (= [op] (mapv :value_string (rows ":_tx/command-id"))))
    (assert (= expected-entities (set (map :value_string (rows ":_tx/changed-entity")))))
    (assert (= (set (keys by-id)) (set (map #(get % "tripleId") changes))))
    (assert (= (count business) (count changes)))
    (doseq [change changes
            :let [r (by-id (get change "tripleId"))
                  new? (asserted (:id r))]]
      (assert (= (:entity_id r) (get change "entityId")))
      (assert (= (:attribute r) (get change "attribute")))
      (assert (== (:valid_from r) (get change "validFrom")))
      (assert (= (:value_string r) (get-in change ["value" "value"])))
      (assert (= (:value_type r) (get-in change ["value" "type"])))
      (assert (= (if new? "assert" "retract") (get change "op")))
      (assert (== (if new? (:clock receipt) (:recorded_at r)) (get change "recordedAt")))
      (when-not new?
        (assert (== (:clock receipt) (get change "retractedAt")))
        (assert (= (:tx_id r) (get change "assertionTxId")))))
    receipt))

(defn stage [view inputs]
  (let [prepared-for (option 'triplex.gateway.storage 'prepared-for)]
    (mapv (fn [request]
            (let [data (storage/tx-data view request)
                  params (second (first data))]
              (assert (group/eligible? view params))
              {:id (get request "operationId") :params params :original-data data
               :prepare (prepared-for data request params)}))
          inputs)))
