(ns triplex.gateway.storage
  (:require [datomic.api :as d] [triplex.gateway.codec :as codec])
  (:import [java.util UUID]))

;; [EXP-DA01] Why: hold an unfiltered immutable db for speculative reads. Rejected: d/with on as-of (filtered db unsupported).
(def snapshots (atom {}))
(def ttl-ms 120000)
(defn begin! [name db]
  (let [handle (str (UUID/randomUUID)) now (System/currentTimeMillis)]
    (swap! snapshots #(assoc (into {} (filter (fn [[_ v]] (> (:expires v) now)) %)) handle
                            {:name name :db db :expires (+ now ttl-ms)}))
    {:handle handle :position (codec/encode-value "long" (:triplex.scope/position (d/entity db (d/q '[:find ?s . :where [?s :triplex.scope/key]] db))))}))
(defn release! [name handle]
  (when (= name (:name (@snapshots handle))) (swap! snapshots dissoc handle))
  {:released true})
(defn held-db [name handle]
  (let [entry (@snapshots handle)]
    (when-not (and (= name (:name entry)) (> (:expires entry 0) (System/currentTimeMillis)))
      (throw (ex-info "Snapshot expired or belongs to another database" {:status 409 :code "SnapshotExpired"})))
    (:db entry)))
(defn decode-row [row] (into {} (map (fn [[k v]] [(keyword k) (when (some? v) (codec/decode-value v))]) row)))
(def long-fields #{:recorded_position :retracted_position :schema_version})
(defn wire-row [row]
  (into {} (map (fn [[k v]] [(name k) (when (some? v) (codec/encode-value (cond (long-fields k) "long" (number? v) "double" :else "string") v))]) row)))
(defn finite! [x] (when-not (and (number? x) (Double/isFinite (double x))) (codec/invalid "Expected finite double")) (double x))
(defn safe-position [x] (when-not (and (integer? x) (<= 0 x 9007199254740991)) (codec/invalid "Unsafe position")) (long x))
(defn upserts [rows]
  (let [subjects (set (concat (map :entity_id rows) (keep #(when (= "ref" (:value_type %)) (:value_string %)) rows)))
        attributes (set (map :attribute rows))]
    (concat (map (fn [s] {:db/id (str "e:" s) :triplex.entity/id s}) subjects)
            (map (fn [a] {:db/id (str "a:" a) :triplex.attr/key a}) attributes))))
;; [EXP-DA01] Why: the dev transactor normalizes signed zero on persistence (live-2). Rejected: silent +0 conversion (AMB-04).
(defn negative-zero? [v] (and (number? v) (= Long/MIN_VALUE (Double/doubleToRawLongBits (double v)))))
(defn zero-signs [row] (set (keep (fn [[k v]] (when (negative-zero? v) k)) row)))
(defn fact-map [row metadata]
  (let [kind (:value_type row) subject (str "e:" (:entity_id row))
        value (case kind
                "string" {:f.v/string (:value_string row)}
                "integer" {:f.v/long (codec/decode-value {"t" "long" "v" (:value_string row)})}
                "ref" {:f.v/ref (str "e:" (:value_string row))}
                "number" {:f.v/double (finite! (:value_number row))}
                "datetime" {:f.v/double (finite! (:value_datetime row))}
                "boolean" {:f.v/boolean (== 1 (:value_boolean row))}
                "json" {:f.v/json (:value_json row)}
                "blob" {:f.v/blob (.getBytes ^String (:value_string row) "UTF-8") :f.v/blob-meta (:value_json row)}
                (codec/invalid "Unknown value family"))]
    (merge {:db/id (str "f:" (:id row)) :f/id (:id row) :f/subject subject
            :f/attr (str "a:" (:attribute row)) :f/type (keyword kind)
            :f/valid-from (finite! (:valid_from row)) :f/schema-version (long (:schema_version row))
            :f/asserted-in "datomic.tx"}
           (when (not= (:recorded_at row) (:recorded-at metadata)) {:f/recorded-at (finite! (:recorded_at row))})
           (when (not= (:recorded_position row) (:position metadata)) {:f/position (safe-position (:recorded_position row))})
           (when (and (nil? (:tx_id row)) (:id metadata)) {:f/null-tx-id true})
           (when (seq (zero-signs row)) {:f/negative-zero (zero-signs row)})
           (when (nil? (:retracted_at row)) {:f/live subject})
           (when (:retracted_at row) {:f/retracted-in "datomic.tx" :f/retracted-at (finite! (:retracted_at row))
                                      :f/retracted-position (safe-position (:retracted_position row)) :f/retract-tx-id (:retract_tx_id row)})
           (when (and (:tx_id row) (not= (:tx_id row) (:id metadata))) {:f/tx-id (:tx_id row)})
           (when (:valid_to row) {:f/valid-to (finite! (:valid_to row))})
           (when (:created_by row) {:f/created-by (:created_by row)})
           (when (:entity_type row) {:f/entity-type (:entity_type row)}) value)))
(defn tx-data [db input]
  (let [rows (mapv decode-row (get input "rows")) new-ids (set (get input "newIds"))
        fresh (filter #(new-ids (:id %)) rows) old (remove #(new-ids (:id %)) rows)
        source (safe-position (get input "sourceK")) position (safe-position (get input "position"))
        scope (d/q '[:find ?s . :where [?s :triplex.scope/key]] db)
        claims (get input "claims")
        sample (or (first fresh) (first old))
        metadata {:position position :recorded-at (if (seq fresh) (:recorded_at sample) (:retracted_at sample))
                  :id (if (seq fresh) (:tx_id sample) (:retract_tx_id sample))}]
    (when-not (> position source) (codec/invalid "Commit position must advance"))
    (vec (remove nil? (concat [[:db/cas scope :triplex.scope/position source position]
                  (cond-> {:db/id "datomic.tx" :triplex.tx/position position
                           :triplex.tx/operation-id (get input "operationId")}
                    (seq rows) (assoc :triplex.tx/id (or (:id metadata) "")
                                      :triplex.tx/recorded-at (finite! (:recorded-at metadata))))]
                 (upserts fresh) (map #(fact-map % metadata) fresh)
                 (mapcat (fn [row]
                           (let [eid (d/entid db [:f/id (:id row)]) entity (when eid (d/entity db eid))]
                             (when-not (and eid (:f/live entity) (:retracted_at row)) (codec/invalid "Invalid retraction"))
                             [[:db/retract eid :f/live (:db/id (:f/subject entity))]
                              [:db/add eid :f/retracted-in "datomic.tx"]
                              [:db/add eid :f/retracted-at (finite! (:retracted_at row))]
                              [:db/add eid :f/retracted-position (safe-position (:retracted_position row))]
                              [:db/add eid :f/retract-tx-id (:retract_tx_id row)]
                              (when (negative-zero? (:retracted_at row)) [:db/add eid :f/negative-zero :retracted_at]) ])) old)
                 (map (fn [claim] {:db/id (str "c:" (get claim "commandId"))
                                  :triplex.claim/command-id (get claim "commandId")
                                  :triplex.claim/tx "datomic.tx"
                                  :triplex.claim/tx-id (get claim "txId")}) claims))))))
(defn commit! [conn db input]
  (when (d/entid db [:triplex.tx/operation-id (get input "operationId")])
    (throw (ex-info "Operation already committed" {:status 409 :code "OperationDuplicate"})))
  (let [scope (d/q '[:find ?s . :where [?s :triplex.scope/key]] db)]
    (when-not (= (:triplex.scope/position (d/entity db scope)) (get input "sourceK"))
      (throw (ex-info "Source cut changed" {:status 409 :code "CasConflict"}))))
  (try
    (let [report (deref (d/transact conn (tx-data db input)) 5000 ::timeout)]
      (when (= report ::timeout) (throw (ex-info "Commit outcome unknown" {:status 503 :code "OutcomeUnknown"})))
      {:t (codec/encode-value "long" (d/basis-t (:db-after report)))
       :position (codec/encode-value "long" (get input "position")) :datoms (count (:tx-data report))})
    (catch Exception e
      (let [text (str e)]
        (when (= "OutcomeUnknown" (:code (ex-data e))) (throw e))
        (throw (ex-info (.getMessage e)
                       {:status (if (re-find #"cas-failed|unique-conflict" text) 409 400)
                        :code (cond (re-find #"cas-failed|triplex.tx/position" text) "CasConflict"
                                    (re-find #"triplex.claim/command-id" text) "CommandConflict"
                                    (re-find #"triplex.tx/operation-id" text) "OperationDuplicate"
                                    (re-find #"f/id" text) "IdentityConflict" :else "TransactionRejected")} e))))))
(defn operation [db id]
  (if-let [entity (d/entity db [:triplex.tx/operation-id id])]
    (if-let [p (:triplex.tx/position entity)]
      {:status "committed" :position (codec/encode-value "long" p) :t (codec/encode-value "long" (d/tx->t (:db/id entity)))}
      {:status "absent"}) {:status "absent"}))
(def positions (atom {}))
(defn forget! [scope] (swap! positions dissoc scope))
;; [EXP-DA01] Why: rebuild each opened database's durable P-to-t map from AVET, and cache it at its peer basis. Rejected: wall-clock as-of (nonmonotonic recorded times).
(defn at-position [db p]
  (if (nil? p) db
      (let [p (safe-position p) scope (d/q '[:find ?s . :where [_ :triplex.scope/key ?s]] db)
            basis (d/basis-t db) cached (@positions scope)
            mapping (if (= basis (:basis cached)) (:mapping cached)
                      (let [initial (:tx (first (d/datoms db :avet :triplex.scope/key scope)))
                            result (into (sorted-map 0 (d/tx->t initial))
                                         (map (fn [datom] [(:v datom) (d/tx->t (:e datom))])
                                              (d/datoms db :avet :triplex.tx/position)))]
                        (swap! positions assoc scope {:basis basis :mapping result}) result))]
        (if (>= p (key (last mapping))) db
            (d/as-of db (val (first (subseq mapping >= p))))))))
(defn raw-row [db eid]
  (let [f (d/entity db eid) tx (:f/asserted-in f) rtx (:f/retracted-in f) kind (name (:f/type f))]
    {:id (:f/id f) :entity_id (:triplex.entity/id (:f/subject f)) :attribute (:triplex.attr/key (:f/attr f))
     :value_type kind
     :value_string (case kind "integer" (str (:f.v/long f)) "ref" (:triplex.entity/id (:f.v/ref f))
                         "blob" (String. ^bytes (:f.v/blob f) "UTF-8") "string" (:f.v/string f) nil)
     :value_number (when (= kind "number") (:f.v/double f))
     :value_datetime (when (= kind "datetime") (:f.v/double f))
     :value_boolean (when (= kind "boolean") (if (:f.v/boolean f) 1.0 0.0))
     :value_json (case kind "json" (:f.v/json f) "blob" (:f.v/blob-meta f) nil)
     :recorded_at (or (:f/recorded-at f) (:triplex.tx/recorded-at tx)) :recorded_position (or (:f/position f) (:triplex.tx/position tx))
     :tx_id (when-not (:f/null-tx-id f) (or (:f/tx-id f) (not-empty (:triplex.tx/id tx)))) :valid_from (:f/valid-from f) :valid_to (:f/valid-to f)
     :created_by (:f/created-by f) :entity_type (:f/entity-type f) :schema_version (:f/schema-version f)
     :retracted_at (:f/retracted-at f) :retracted_position (:f/retracted-position f) :retract_tx_id (:f/retract-tx-id f)}))
(defn row [db eid]
  (let [r (raw-row db eid) signs (:f/negative-zero (d/entity db eid))]
    (reduce (fn [result field] (if (contains? result field) (assoc result field -0.0) result)) r signs)))
(defn visible? [row basis history]
  (let [p (get basis "recordedPosition") r (get basis "recordedAt") v (get basis "validAt")]
    (and (or (nil? p) (<= (:recorded_position row) p)) (or (nil? r) (<= (:recorded_at row) r))
         (or history
             (and (not (and (:retracted_at row) (or (nil? p) (<= (:retracted_position row) p))
                            (or (nil? r) (<= (:retracted_at row) r))))
                  (or (nil? v) (and (<= (:valid_from row) v) (or (nil? (:valid_to row)) (> (:valid_to row) v)))))))))
(defn read-rows [name current input]
  (let [basis (get input "basis") history (get input "history")
        db (if-let [handle (get input "handle")]
             (let [held (held-db name handle)] (if-let [staged (get input "staged")] (:db-after (d/with held (tx-data held staged))) held))
             (at-position current (get basis "recordedPosition")))
        pattern (into {} (remove (fn [[_ v]] (and (string? v) (.startsWith ^String v "?"))) (get input "pattern"))) id (get input "id") entities (get input "entityIds")
        ids (cond id (if-let [eid (d/entid db [:f/id id])] [eid] [])
                  (get pattern "entityId") (if-let [subject (d/entid db [:triplex.entity/id (get pattern "entityId")])]
                                              (map :e (d/datoms db :vaet subject :f/subject)) [])
                  :else (map :e (d/datoms db :avet :f/id)))
        rows (map #(row db %) ids)]
    {:rows (mapv wire-row
                 (filter (fn [r] (and (visible? r basis history)
                                     (or (nil? entities) (some #{(:entity_id r)} entities))
                                     (every? (fn [[k field]] (or (nil? (get pattern k)) (.startsWith ^String (str (get pattern k)) "?")
                                                               (= (get pattern k) (get r field))))
                                             [["entityId" :entity_id] ["attribute" :attribute] ["entityType" :entity_type]]))) rows))}))
