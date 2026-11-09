(ns triplex.gateway.storage
  (:require [datomic.api :as d] [triplex.gateway.codec :as codec])
  (:import [java.util UUID]))

(set! *warn-on-reflection* true)

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
 ;; [EXP-DX1] Why: live row datoms are exact write-time wire values. Rejected: rebuilding values on every pull.
(defn row-prefix [^String id] (str "1" (format "%04x" (.length id)) id))
(defn row-datom [db eid ^String prefix]
  (let [datom (first (d/seek-datoms db :eavt eid :triplex.entity/row prefix))]
    (when (and datom (= eid (:e datom)) (= (d/entid db :triplex.entity/row) (:a datom))
               (.startsWith ^String (:v datom) prefix)) (:v datom))))
(defn row-updates [db rows new-ids texts scope source position]
  (let [out (java.util.ArrayList.) times (java.util.ArrayList.) prior (:triplex.scope/max-recorded-at (d/entity db scope))
        irregular (volatile! false)]
    (doseq [row rows]
      (let [fresh (contains? new-ids (:id row)) stamp (if fresh (:recorded_at row) (:retracted_at row))]
        (when fresh
          (.add times (double (:recorded_at row)))
          (when (or (<= (:recorded_position row) source) (> (:recorded_position row) position)) (vreset! irregular true)))
        (when (some? (:retracted_at row))
          (.add times (double (:retracted_at row)))
          (when (or (<= (:retracted_position row) source) (> (:retracted_position row) position)) (vreset! irregular true)))
        (if fresh
          (when (nil? (:retracted_at row))
            (let [text (get texts (:id row)) prefix (row-prefix (:id row))]
              (when-not (and (string? text) (.startsWith ^String text prefix)) (codec/invalid "Missing or mismatched row text"))
              (.add out (if (or (> (.length ^String text) 8000) (and (= "ref" (:value_type row)) (= "" (:value_string row))))
                          [:db/add (str "e:" (:entity_id row)) :triplex.entity/row-overflow true]
                          [:db/add (str "e:" (:entity_id row)) :triplex.entity/row text]))))
          (let [eid (d/entid db [:triplex.entity/id (:entity_id row)]) text (row-datom db eid (row-prefix (:id row)))]
            (when (and (= 2 (:triplex.scope/rows-version (d/entity db scope)))
                       (not (:triplex.entity/row-overflow (d/entity db eid))) (nil? text))
              (codec/invalid "Missing live row datom"))
            (when text (.add out [:db/retract eid :triplex.entity/row text]))))))
    ;; [DX-B2-N2] Why: retractions change the complete row set too. Rejected: assertion-only revisions (stale cache hits).
    (doseq [entity (distinct (map :entity_id rows))]
      (.add out [:db/add (or (d/entid db [:triplex.entity/id entity]) (str "e:" entity)) :triplex.entity/rev position]))
    (when (pos? (.size times))
      (let [first-time (double (.get times 0)) maximum (volatile! (double (or prior first-time)))]
        (doseq [time times]
          (let [v (double time)]
            (when (or (not= v first-time) (and prior (< v (double prior)))) (vreset! irregular true))
            (vswap! maximum max v)))
        (.add out [:db/add scope :triplex.scope/max-recorded-at @maximum])
        (.add out [:db/add "datomic.tx" :triplex.tx/max-recorded-at @maximum])))
    (when @irregular (.add out [:db/add scope :triplex.scope/irregular true]))
    out))
(defn tx-data [db input]
  (let [rows (mapv decode-row (get input "rows")) new-ids (set (get input "newIds"))
        fresh (filter #(new-ids (:id %)) rows) old (remove #(new-ids (:id %)) rows)
        source (safe-position (get input "sourceK")) position (safe-position (get input "position"))
        scope (d/q '[:find ?s . :where [?s :triplex.scope/key]] db)
        claims (get input "claims")
        sample (or (first fresh) (first old))
        ;; [EXP-DA01] Why: claims-only and position-only commits still require complete tx annotations. Rejected: deriving metadata only from assertion rows (loses claim receipts).
        metadata {:position position
                  :recorded-at (cond (seq fresh) (:recorded_at sample) (seq old) (:retracted_at sample)
                                     (seq claims) (get (first claims) "timestamp") :else (double (System/currentTimeMillis)))
                  :id (cond (seq fresh) (:tx_id sample) (seq old) (:retract_tx_id sample)
                            (seq claims) (get (first claims) "txId") :else (get input "operationId"))}]
    (when-not (> position source) (codec/invalid "Commit position must advance"))
    (vec (remove nil? (concat [[:db/cas scope :triplex.scope/position source position]
                  {:db/id "datomic.tx" :triplex.tx/position position
                   :triplex.tx/operation-id (get input "operationId")
                   :triplex.tx/id (or (:id metadata) "") :triplex.tx/recorded-at (finite! (:recorded-at metadata))}]
                 (upserts fresh) (map #(fact-map % metadata) fresh)
                 (row-updates db rows new-ids (get input "rowTexts") scope source position)
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
       :operationId (get input "operationId")
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
(defn head-position [db]
  (let [^datomic.Datom scope (first (d/datoms db :aevt :triplex.scope/key))
        ^datomic.Datom position (first (d/datoms db :eavt (.e scope) :triplex.scope/position))]
    (.v position)))
(defn unavailable! [message]
  (throw (ex-info message {:status 409 :code "BasisNotAvailable"})))
;; [EXP-DA01] Why: future cuts must wait for publication, never silently answer from the head (Q89c/d). Rejected: treating P >= head as latest.
(defn await-position [db p wait-ms refresh]
  (if (nil? p) db
    (let [p (safe-position p) wait-ms (or wait-ms 500)
          _ (when-not (and (integer? wait-ms) (<= 1 wait-ms 2000)) (codec/invalid "Basis wait must be 1..2000 ms"))
          deadline (+ (System/nanoTime) (* wait-ms 1000000))]
      (loop [current db]
        (if (<= p (head-position current)) current
          (let [remaining (quot (- deadline (System/nanoTime)) 1000000)]
            (when (<= remaining 0) (unavailable! "Requested position is beyond the available snapshot"))
            (Thread/sleep 1)
            (let [remaining (max 1 (quot (- deadline (System/nanoTime)) 1000000)) next (refresh remaining)]
              (when (= next ::timeout) (unavailable! "Requested position did not become available before the deadline"))
              (recur next))))))))
;; [EXP-DA01] Why: sparse logical positions map to the first containing physical transaction in logarithmic index work (Q89d). Rejected: rebuilding an O(commits) host map at each basis.
(defn at-position [db p]
  (if (nil? p) db
    (let [p (safe-position p) head (head-position db)]
      (when (> p head) (unavailable! "Requested position is beyond the available snapshot"))
      (if (= p head) db
        (let [tx (if (zero? p)
                   (:tx (first (d/datoms db :avet :triplex.scope/key
                             (d/q '[:find ?s . :where [_ :triplex.scope/key ?s]] db))))
                   (:e (first (d/index-range db :triplex.tx/position p nil))))]
          (when-not tx (unavailable! "No physical transaction covers the requested position"))
          (d/as-of db (d/tx->t tx)))))))
(defn read-db [name current input]
  (let [db (if-let [handle (get input "handle")]
             (let [held (held-db name handle)]
               (if-let [staged (get input "staged")] (:db-after (d/with held (tx-data held staged))) held))
             current)
        p (get-in input ["basis" "recordedPosition"])]
    ;; [EXP-DA01] Why: a held value cannot advance even if another writer commits; refuse future requests against that exact pin. Rejected: replacing a held db with a newer one mid-query.
    (at-position (await-position db p (get input "basisWaitMs") (fn [_] db)) p)))
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
(defn assert-subject-route! [db basis attribute]
  ;; [EXP-DA01] Why: position retirement loses T-shaped rows and interior logical cuts of a multi-position transaction (Q89b). Rejected: filtering after :f/live has already omitted eligible facts.
  (when-not (#{:f/subject :f/live} attribute) (codec/invalid "Unknown subject route"))
  (when (= attribute :f/live)
    (when (some? (get basis "recordedAt"))
      (unavailable! "Position-retired subject route cannot answer a record-time basis"))
    (when-let [p (get basis "recordedPosition")]
      (when (and (pos? p) (nil? (d/entid db [:triplex.tx/position p])))
        (unavailable! "Position-retired subject route cannot answer an interior logical cut")))))
(defn subject-facts [db entity-id basis attribute]
  (assert-subject-route! db basis attribute)
  (if-let [subject (d/entid db [:triplex.entity/id entity-id])]
    (map :e (d/datoms db :vaet subject attribute)) []))
(defn mask-retirement [r basis]
  ;; [EXP-DA01] Why: native row metadata must describe the requested cut on every route (R31 HE-1). Rejected: exposing future retirement fields from a held or record-time source read.
  (if (and (:retracted_at r)
           (or (and (some? (get basis "recordedPosition")) (> (:retracted_position r) (get basis "recordedPosition")))
               (and (some? (get basis "recordedAt")) (> (:retracted_at r) (get basis "recordedAt")))))
    (assoc r :retracted_at nil :retracted_position nil :retract_tx_id nil) r))
(defn read-rows [name current input]
  (let [basis (get input "basis") history (get input "history")
        db (read-db name current input)
        route (get input "route" "history")
        _ (when-not (#{"history" "live"} route) (codec/invalid "Unknown read route"))
        attribute (if (= route "live") :f/live :f/subject)
        _ (assert-subject-route! db basis attribute)
        _ (when (and (= route "live") history) (unavailable! "Position-retired route cannot enumerate history"))
        pattern (into {} (remove (fn [[_ v]] (and (string? v) (.startsWith ^String v "?"))) (get input "pattern"))) id (get input "id") entities (get input "entityIds")
        subject-ids #(subject-facts db % basis attribute)
        ids (cond id (if-let [eid (d/entid db [:f/id id])] [eid] [])
                  (some? entities) (mapcat subject-ids (distinct entities))
                  (get pattern "entityId") (subject-ids (get pattern "entityId"))
                  ;; [EXP-DA01] Why: refs have VAET and AEVT but no AVET without an explicit index; whole live scans must enumerate the actual attribute index. Rejected: a shape-dependent attribute-not-indexed failure hidden by subject-only fixtures.
                  :else (map :e (if (= route "live") (d/datoms db :aevt :f/live) (d/datoms db :avet :f/id))))
        rows (map #(row db %) ids)]
    {:route (cond (= route "live") "live" (get input "staged") "staged" (get input "handle") "held"
                  (and (some? (get basis "recordedPosition")) (< (get basis "recordedPosition") (head-position current))) "as-of" :else "source")
     :basis basis :subjectAttribute (str attribute)
     :rows (mapv #(wire-row (mask-retirement % basis))
                 (filter (fn [r] (and (visible? r basis history)
                                     (or (not= route "live") (nil? (:retracted_at r)))
                                     (or (nil? entities) (some #{(:entity_id r)} entities))
                                     (every? (fn [[k field]] (or (nil? (get pattern k)) (.startsWith ^String (str (get pattern k)) "?")
                                                               (= (get pattern k) (get r field))))
                                             [["entityId" :entity_id] ["attribute" :attribute] ["entityType" :entity_type]]))) rows))}))

;; [EXP-DX1] Why: snapshot, claim and known by-id rows share one immutable prefetch cut.
;; Rejected: separate claim/read HTTP calls (R51's six-round-trip commit).
(defn begin-command! [name db input]
  (let [snapshot (begin! name db) command (get input "commandId") ids (get input "ids" [])]
    (try
      (merge snapshot
        {:t (codec/encode-value "long" (d/basis-t db))
         :claim (when command (:triplex.claim/tx-id (d/entity db [:triplex.claim/command-id command])))
         :rows (mapv wire-row
                 (keep (fn [id]
                         (when-let [eid (d/entid db [:f/id id])]
                           (let [r (row db eid)] (when (visible? r nil false) r)))) ids))})
      (catch Exception e (release! name (:handle snapshot)) (throw e)))))
