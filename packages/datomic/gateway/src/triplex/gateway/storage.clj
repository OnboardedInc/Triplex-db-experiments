(ns triplex.gateway.storage
  (:require [triplex.gateway.privacy :as privacy] [triplex.gateway.envelope :as envelope] [clojure.edn] [triplex.gateway.group :as group] [triplex.gateway.commit :as commit] [triplex.gateway.predecessor :as pred] [triplex.gateway.write-policy :as policy] [triplex.gateway.trace :as trace] [triplex.gateway.schema :as schema] [triplex.gateway.commit-order :as order] [triplex.gateway.scope :as scope] [triplex.gateway.feed :as feed] [triplex.gateway.admission :as admission] [triplex.gateway.lean :as lean] [triplex.gateway.stats :as stats] [datomic.api :as d] [triplex.gateway.codec :as codec] [triplex.gateway.reach :as reach])
  (:require [triplex.gateway.replay-capture :as replay-capture] [triplex.gateway.small-row :as small-row]
            [triplex.gateway.save-ledger :as ledger] [triplex.gateway.packed-journal :as packed]
            [triplex.gateway.subject-save :as subject] [clojure.data.json :as json]
            [triplex.gateway.owner-layout :as owner-layout] [triplex.gateway.owner-root :as owner-root]
            [triplex.gateway.pinned :as pinned] [triplex.gateway.general-prefetch :as general-prefetch]
            [triplex.gateway.subject-hints :as subject-hints])
  (:import [java.util UUID]))

(set! *warn-on-reflection* false)

;; [EXP-DA01] Why: hold an unfiltered immutable db for speculative reads. Rejected: d/with on as-of (filtered db unsupported).
(def snapshots (atom {}))
(def ttl-ms 120000)
(defn begin! [name db]
  (let [handle (str (UUID/randomUUID)) now (System/currentTimeMillis)]
    (swap! snapshots #(assoc (into {} (filter (fn [[_ v]] (> (:expires v) now)) %)) handle
                            {:name name :db db :expires (+ now ttl-ms)}))
    {:handle handle :position (codec/encode-value "long" (scope/head-position db (scope/entity db)))}))
(defn release! [name handle]
  (when (= name (:name (@snapshots handle))) (swap! snapshots dissoc handle))
  {:released true})
(defn held-db [name handle]
  (let [entry (@snapshots handle)]
    (when-not (and (= name (:name entry)) (> (:expires entry 0) (System/currentTimeMillis)))
      (throw (ex-info "Snapshot expired or belongs to another database" {:status 409 :code "SnapshotExpired"})))
    (:db entry)))
(defn decode-row [row] (into {} (map (fn [[k v]] [(keyword k) (when (some? v) (codec/decode-value v))]) row)))
(def ^:private direct-row-decode? (= "1" (System/getenv "TX2_TAIL1_ROW_DECODE")))
;; [DX-B5-L6] Why: fresh lean rows already carry every column in their canonical text.
;; Rejected: decoding a second full tagged map per row after the client encoded both copies.
(defn input-rows [input lean new-ids]
  (if-not (= "texts" (get input "rowMode"))
    (mapv decode-row (get input "rows"))
    (do
      (when-not lean (codec/invalid "Compact row mode requires a lean scope"))
      (let [order (get input "rowOrder") texts (get input "rowTexts")
            retired (mapv decode-row (get input "rows"))
            by-id (into {} (map (juxt :id identity) retired))]
        (when-not (and (vector? order) (every? string? order) (map? texts)
                       (= (count order) (count (set order)))
                       (= (count retired) (count by-id))
                       (= new-ids (set (keys texts)))
                       (= (set order) (set (concat new-ids (keys by-id))))
                       (every? #(and (string? (:id %)) (string? (:entity_id %))
                                     (some? (:retracted_at %)) (some? (:retracted_position %))
                                     (string? (:retract_tx_id %))) retired))
          (codec/invalid "Invalid compact row identities or retirements"))
        (mapv (fn [id]
                (if (new-ids id)
                  (let [text (get texts id) _ (when-not (string? text) (codec/invalid "Missing compact row text"))
                        row (update (lean/decode text direct-row-decode?) :recorded_at double) retirement (get by-id id)]
                    (when-not (and (= id (:id row))
                                   (or (nil? retirement) (and (= (:entity_id row) (:entity_id retirement))
                                                              (= (:entity_type row) (:entity_type retirement)))))
                      (codec/invalid "Compact row binding mismatch"))
                    (merge row (select-keys retirement [:retracted_at :retracted_position :retract_tx_id])))
                  (get by-id id))) order)))))
(def long-fields #{:recorded_position :retracted_position :schema_version})
(defn wire-row [row]
  (into {} (map (fn [[k v]] [(name k) (when (some? v) (codec/encode-value (cond (long-fields k) "long" (number? v) "double" :else "string") v))]) row)))
(defn finite! [x] (when-not (and (number? x) (Double/isFinite (double x))) (codec/invalid "Expected finite double")) (double x))
(defn safe-position [x] (when-not (and (integer? x) (<= 0 x 9007199254740991)) (codec/invalid "Unsafe position")) (long x))
;; [DX-B5-L1] Why: the scope version is immutable; only lean scopes omit reified facts.
;; Rejected: migrating existing scopes in place (changes legacy read/storage contracts).
(defn value [db e a] (:v (first (d/datoms db :eavt e a))))
(defn lean? [db] (contains? #{3 4} (value db (:e (first (d/datoms db :aevt :triplex.scope/key))) :triplex.scope/rows-version)))
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
            :f/valid-from (finite! (:valid_from row))}
           ;; [DX-B2-N5] Why: schema 1 is the default, and the immutable f/id datom already names its asserting tx.
           ;; Rejected: duplicate attributes on every fact (measured d/transact median 7.46 ms).
           (when (not= 1 (:schema_version row)) {:f/schema-version (long (:schema_version row))})
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
(defn row-prefix [^String id]
  ;; [DX-TAIL1] Why: a fixed hex length prefix only needs left padding.
  ;; Rejected: allocating a Formatter per row or truncating a length greater than four digits.
  (let [n (.length id)]
    (str "2" (if direct-row-decode?
               (let [digits (Integer/toHexString n)]
                 (str (subs "0000" 0 (max 0 (- 4 (.length ^String digits)))) digits))
               (format "%04x" n)) id)))
(defn ordered-row-texts [input]
  ;; [DX-W1] Why: the frame order and encoded identity provide both index keys from one wire array.
  ;; Rejected: inferring order from a JSON object or changing the meaning of an irregular SPI request.
  (if (= "assertions-first-v1" (get input "rowOrder"))
    (let [texts (get input "rowTexts") retired (get input "rows")]
      (when-not (and (= "texts" (get input "rowMode")) (vector? texts) (vector? retired) (not (contains? input "newIds")))
        (codec/invalid "Invalid ordered row frame"))
      (let [ids (mapv (fn [^String text]
                       (when-not (and (string? text) (> (.length text) 5) (.startsWith text "2"))
                         (codec/invalid "Invalid ordered row text"))
                       (let [end (+ 5 (Integer/parseInt text 1 5 16))]
                         (subs text 5 end))) texts)
            tail (mapv #(codec/decode-value (get % "id")) retired)]
        (assoc input "newIds" ids "rowTexts" (zipmap ids texts) "rowOrder" (into ids tail))))
    input))
(defn row-datom [db eid ^String prefix]
  (let [datom (first (d/seek-datoms db :eavt eid :triplex.entity/row prefix))]
    (when (and datom (= eid (:e datom)) (= (d/entid db :triplex.entity/row) (:a datom))
               (.startsWith ^String (:v datom) prefix)) (:v datom))))
(defn timed-retraction [row]
  (when (and (= "_Transaction" (:entity_type row)) (= ":_tx/change" (:attribute row)))
    (let [change (try (json/read-str (:value_json row)) (catch Exception _ nil))]
      (when (and (= "retract" (get change "op"))
                 (some #(contains? change %) ["recordedAt" "validFrom" "validTo"]))
        (get change "tripleId")))))
 ;; [DX-B3-M2] Why: prepare all row encoding and fact maps off the transactor's serial point.
;; Rejected: resolving row retractions in the gateway (stale exact row text after another commit).
(def ^:dynamic *load-timing* nil)
;; [DX-LOAD1] Why: decode and validation happen before constructing native ops on the peer. Rejected: counting the entire peer wait as validation.
(defn timed-input-rows [input lean new-ids]
  (if-not *load-timing* (input-rows input lean new-ids)
    (let [start (System/nanoTime) rows (input-rows input lean new-ids)]
      (vreset! *load-timing* (- (System/nanoTime) start)) rows)))
(defn expand-fresh [input lean]
  (if-not (contains? input "freshTexts") input
    (let [texts (get input "freshTexts")]
      (when-not (and lean (= "texts" (get input "rowMode")) (vector? texts) (seq texts)
                     (not-any? #(contains? input %) ["rows" "newIds" "rowOrder" "rowTexts"]))
        (codec/invalid "Mixed fresh batch encodings"))
      (let [ids (mapv (fn [s]
                        (when-not (and (string? s) (> (.length ^String s) 5) (= \2 (.charAt ^String s 0)))
                          (codec/invalid "Invalid fresh row prefix"))
                        (subs s 5 (+ 5 (Integer/parseInt s 1 5 16)))) texts)]
        (when-not (= (count ids) (count (set ids))) (codec/invalid "Duplicate fresh row ID"))
        ;; [DX-LOAD1] Why: ordinary compact validation compares each decoded row ID with the actual prefix. Rejected: a client assertion of empty history or a second source of row order.
        (assoc input "rowMode" "texts" "newIds" ids "rowOrder" ids "rowTexts" (zipmap ids texts) "rows" [])))))
(def import-pipeline? (= "1" (System/getenv "TX2_IMPORT_PIPELINE")))
(defn import-predecessor [claims]
  (when import-pipeline?
    (let [ids (filter #(and (string? %) (.startsWith ^String % "load1/pipeline-")) (keep #(get % "commandId") claims))]
      (when (seq ids)
        (let [[_ stream ordinal] (re-matches #"load1/(pipeline-[a-f0-9]{64})/(0|[1-9][0-9]{0,14})" (first ids))]
          (when-not (and stream (= 1 (count claims))) (codec/invalid "Invalid ordered import claim"))
          (let [n (Long/parseLong ordinal)]
            (if (zero? n) "load1/manifest/import" (str "load1/" stream "/" (dec n)))))))))
(defn tx-data
  ([db input] (tx-data db input (:e (first (d/datoms db :aevt :triplex.scope/key)))))
  ([db input scope]
   (let [lean (lean? db)
         input (ordered-row-texts (expand-fresh input lean))
         new-ids (set (get input "newIds")) rows (timed-input-rows input lean new-ids)
         _ (trace/span "privacy/validate-rows" "gateway" (privacy/validate-write! privacy/*cut* input rows))
         protected (trace/span "privacy/prepare-envelopes" "gateway"
                     (envelope/protect privacy/*database* privacy/*cut* input rows))
         input (:input protected) rows (:rows protected)
         fresh (filter #(new-ids (:id %)) rows) old (remove #(new-ids (:id %)) rows)
         timed-rows (when (seq old) (into {} (keep (fn [r] (when-let [id (timed-retraction r)] [(:id r) id]))) fresh))
         source (when-some [p (get input "sourceK")] (safe-position p)) position (safe-position (get input "position"))
         span (safe-position (or (get input "span") (when source (- position source))))
         lower (- position span) claims (get input "claims") sample (or (first fresh) (first old))
         rows-version (value db scope :triplex.scope/rows-version)
         small-save (and (or small-row/enabled packed/enabled) (= rows-version 3) (= span 1) (= 1 (count claims))
                          (not= false (get input "assignRecordTime")) (true? (value db scope :triplex.scope/strict-record-clocks))
                          (<= (count old) 3) (<= 1 (count (remove #(= "_Transaction" (:entity_type %)) fresh)) 3))
         packed-rows (and small-row/enabled small-save)
         packed-journal-ids (when (and packed/enabled small-save)
                              (packed/identity-run (keep (fn [r] (when (and (= "_Transaction" (:entity_type r))
                                                                           (#{":_tx/change" ":_tx/changed-entity"} (:attribute r))) (:id r))) fresh)))
         packed-journal-set (set packed-journal-ids)
         predecessor (import-predecessor claims)
         metadata {:position position
                   :recorded-at (cond (seq fresh) (:recorded_at sample) (seq old) (:retracted_at sample)
                                      (seq claims) (get (first claims) "timestamp") :else (double (System/currentTimeMillis)))
                   :id (cond (seq fresh) (:tx_id sample) (seq old) (:retract_tx_id sample)
                             (seq claims) (get (first claims) "txId") :else (get input "operationId"))}
         marker (fn [p] [:triplex/position (safe-position p)])
         times (vec (mapcat (fn [row] (concat (when (new-ids (:id row)) [(:recorded_at row)])
                                             (when (:retracted_at row) [(:retracted_at row)]))) rows))
         irregular (boolean (some (fn [p] (not (< lower p (inc position))))
                                  (concat (map :recorded_position fresh) (keep :retracted_position rows))))
         ops (vec (remove nil? (concat
               [{:db/id "datomic.tx" :triplex.tx/position (marker position)
                 :triplex.tx/operation-id (get input "operationId") :triplex.tx/id (or (:id metadata) "")
                 :triplex.tx/recorded-at [:triplex/record-time (finite! (:recorded-at metadata))]}]
               (:bodies protected)
               ;; [DX-ERASE1] Why: a late native write is fenced even if its peer request timed out.
               ;; Rejected: releasing the gateway lock and trusting the delayed transactor outcome.
               (when-let [seq (:seq privacy/*cut*)]
                 [[:db/cas scope :triplex.scope/erasure-seq seq seq]])
               ;; [DX-B4-T1] Why: one physical commit can contain several logical journals.
               ;; Rejected: using only tx/id (drops nested transacts at interior cursors).
               (mapcat (fn [[entity rs]]
                         (let [existing (d/entid db [:triplex.entity/id entity])
                               position-row (first (filter #(= ":_tx/position" (:attribute %)) rs))
                               instant-row (first (filter #(= ":_tx/instant" (:attribute %)) rs))
                               commands (filter #(= ":_tx/command-id" (:attribute %)) rs)
                               claims-valid (every? (fn [r] (some #(and (= entity (get % "txId")) (= (:value_string r) (get % "commandId"))) claims)) commands)]
                           (if (and position-row (= "datetime" (:value_type instant-row))
                                    (= 1 (count (filter #(= ":_tx/position" (:attribute %)) rs)))
                                    (= 1 (count (filter #(= ":_tx/instant" (:attribute %)) rs)))
                                    claims-valid (nil? existing))
                             [[:db/add "datomic.tx" :triplex.tx/journals (str "e:" entity)]
                              [:db/add (str "e:" entity) :triplex.journal/position (marker (:recorded_position position-row))]]
                             [[:db/add scope :triplex.scope/feed-irregular true]])))
                       (group-by :entity_id (filter #(= "_Transaction" (:entity_type %)) fresh)))
               ;; [DX-B4-T1] Why: malformed SPI journals can share a position; their portable tie order is not the tx-link order.
               ;; Rejected: accepting duplicate journal positions and guessing their order.
               (let [ps (map :recorded_position (filter #(and (= "_Transaction" (:entity_type %)) (= ":_tx/position" (:attribute %))) fresh))]
                 (when (not= (count ps) (count (distinct ps))) [[:db/add scope :triplex.scope/feed-irregular true]]))
               ;; [DX-B4-T2] Why: the portable command query also sees untyped SPI rows.
               ;; Rejected: proving claim completeness only for rows tagged _Transaction.
               (when (some (fn [r]
                             (and (= ":_tx/command-id" (:attribute r))
                                  (not (some #(and (= (:entity_id r) (get % "txId"))
                                                   (= (:value_string r) (get % "commandId"))) claims)))) fresh)
                 [[:db/add scope :triplex.scope/feed-irregular true]])
               ;; Retiring or extending a published journal invalidates the append-only proof.
               (when (some #(= "_Transaction" (:entity_type %)) old)
                 [[:db/add scope :triplex.scope/feed-irregular true]])
               (if lean
                 (map (fn [entity] {:db/id (str "e:" entity) :triplex.entity/id entity}) (distinct (map :entity_id fresh)))
                 (upserts fresh))
               (map (fn [row]
                      (cond-> (reduce (fn [m k] (if (contains? m k) (update m k #(vector :triplex/record-time %)) m))
                                      (fact-map row metadata) [:f/recorded-at :f/retracted-at])
                        (and (= "_Transaction" (:entity_type row)) (= ":_tx/instant" (:attribute row))) (assoc :f.v/double [:triplex/record-time (:value_datetime row)])
                        (and (= "_Transaction" (:entity_type row)) (= ":_tx/change" (:attribute row))) (assoc :f.v/json [:triplex/change (:value_json row)])
                        (seq (zero-signs row)) (assoc :f/negative-zero [:triplex/negative-zeros (zero-signs row)])
                        (not= (:recorded_position row) position) (assoc :f/position (marker (:recorded_position row)))
                        (= ":_tx/position" (:attribute row)) (assoc :f.v/double [:triplex/double-position (:recorded_position row)])
                        (:retracted_position row) (assoc :f/retracted-position (marker (:retracted_position row))))) (if lean [] fresh))
               (mapcat (fn [row]
                         (when (or lean (nil? (:retracted_at row)))
                           (let [text (get-in input ["rowTexts" (:id row)])]
                             (when-not (and (string? text) (.startsWith ^String text (row-prefix (:id row))))
                               (codec/invalid "Missing or mismatched row text"))
                             (if (and (not lean) (> (.length ^String text) 8000))
                               [[:db/add (str "e:" (:entity_id row)) :triplex.entity/row-overflow true]]
                                (let [offset (+ 44 (.length ^String (:id row)) (if (= "ref" (:value_type row)) (.length ^String (:value_string row)) 0))
                                      plan (when (and packed-rows (not (packed-journal-set (:id row))))
                                             (small-row/prepare text offset (:recorded_position row) new-ids))]
                                  [[(if lean :triplex/assert :db/add) (str "e:" (:entity_id row)) :triplex.entity/row
                                   (if plan [:triplex/row (subs text 0 offset) (:recorded_position row) offset :row plan]
                                     [:triplex/row text (:recorded_position row) offset :row])]]))))) fresh)
               ;; [DX-B5-L2] Why: Datomic cancels add/retract pairs in one physical tx; preserve born-retired rows with a marker.
               ;; Rejected: dropping their history, or assigning their retirement to a later synthetic transaction.
               (when lean
                 (for [row fresh :when (:retracted_at row)]
                   [:db/add (str "e:" (:entity_id row)) :triplex.entity/retired
                    [:triplex/row (str (row-prefix (:id row)) (format "%016d" (:retracted_position row))
                                      (format "%016x" (Double/doubleToRawLongBits (double (:retracted_at row))))
                                      (or (:retract_tx_id row) ""))
                     (:retracted_position row) (.length ^String (row-prefix (:id row))) :retirement]]))
               (mapcat (fn [row]
                         (when-not (:retracted_at row) (codec/invalid "Invalid retraction"))
                         (let [eid [:f/id (:id row)] subject [:triplex.entity/id (:entity_id row)]]
                           (if lean
                             [[:triplex/retract (:entity_id row) (:id row)]
                              (when (or (negative-zero? (:retracted_at row))
                                        (not= (:retracted_at row) (:recorded-at metadata))
                                        (not= (:retracted_position row) position)
                                        (not= (:retract_tx_id row) (:id metadata)))
                                [:db/add (str "e:" (:entity_id row)) :triplex.entity/retired
                                 [:triplex/row (str (row-prefix (:id row)) (format "%016d" (:retracted_position row))
                                                   (format "%016x" (Double/doubleToRawLongBits (double (:retracted_at row))))
                                                   (or (:retract_tx_id row) ""))
                                  (:retracted_position row) (.length ^String (row-prefix (:id row))) :retirement]])]
                           [[:triplex/retract (:entity_id row) (:id row)]
                            [:db/retract eid :f/live subject]
                            [:db/add eid :f/retracted-in "datomic.tx"]
                            [:db/add eid :f/retracted-at [:triplex/record-time (finite! (:retracted_at row))]]
                            [:db/add eid :f/retracted-position (marker (:retracted_position row))]
                            [:db/add eid :f/retract-tx-id (:retract_tx_id row)]
                            (when (negative-zero? (:retracted_at row)) [:triplex/retracted-zero eid])]))) old)
               (map (fn [entity] [:db/add (str "e:" entity) :triplex.entity/rev (marker position)]) (distinct (map :entity_id rows)))
               ;; Existing-only subjects need their identity tempids too (retractions can contain no assertions).
               (map (fn [entity] {:db/id (str "e:" entity) :triplex.entity/id entity}) (distinct (map :entity_id old)))
               (map (fn [claim] {:db/id (str "c:" (get claim "commandId"))
                                :triplex.claim/command-id (get claim "commandId") :triplex.claim/tx "datomic.tx"
                                :triplex.claim/tx-id (get claim "txId")}) claims))))
         journals (vec (distinct (map :entity_id (filter #(= "_Transaction" (:entity_type %)) fresh))))
         [claim] claims
         command (get claim "commandId")
         journal (:id metadata)
         merge-ledger (and (or ledger/enabled packed/enabled) (= rows-version 3) (= 1 span (count claims) (count journals))
                           (= journal (first journals) (get claim "txId")) (string? command)
                           (not irregular) (not-any? #(= journal (:entity_id %)) old)
                           (not-any? #(and (= journal (:entity_id %)) (not= "_Transaction" (:entity_type %))) fresh)
                           (some #(= [:db/add "datomic.tx" :triplex.tx/journals (str "e:" journal)] %) ops)
                           (not-any? #(and (vector? %) (= :triplex.scope/feed-irregular (nth % 2 nil))) ops))]
     [[(commit/entry db input lean) (cond-> {:scope scope :source source :provisional position :span span
                       :scope-wide (get input "scopeWide" true) :entities (get input "entities" [])
                       :live (vec (distinct (concat (get input "live" []) (map :id old))))
                       :rev-aevt (= "1" (System/getenv "TX2_REV_AEVT"))
                       :lean lean :slim-row (= 4 rows-version) :ops ops :times times :new-ids (vec new-ids) :assign-record-time (not= false (get input "assignRecordTime"))
                       :command-ids (mapv #(get % "commandId") claims)
                       :owners (vec (distinct (map :entity_id rows)))
                       ;; [DX-R3] Why: strict scopes also order empty/claim-only commits and every imported claim clock.
                       ;; Rejected: checking row timestamps only (a supported SPI commit can have no rows).
                       :record-clocks (vec (cons (:recorded-at metadata) (map #(get % "timestamp") claims)))
                       :replay-safe (true? (get input "replaySafe")) :irregular irregular :position-irregular irregular
                       :journal-entities journals}
                       merge-ledger (assoc :save-ledger command)
                       (and merge-ledger (seq packed-journal-ids)) (assoc :packed-journal packed-journal-ids)
                       (seq timed-rows) (assoc :timed-retractions (vec (distinct (vals timed-rows))))
                       (and group/bulk-priority
                         (some (fn [r] (and (= "_Transaction" (:entity_type r)) (= ":_tx/actor" (:attribute r))
                                            (#{"bulk-import" "bulk-seed"} (:value_string r))
                                            (some #(= (:entity_id r) (get % "txId")) claims))) fresh))
                       (assoc :bulk true)
                       predecessor (assoc :import-predecessor predecessor)
                       (and lean (get input "historyIdentityBounds"))
                       (assoc :identity-bounds (get input "historyIdentityBounds")))]])))
;; [DX-B10] Why: only contiguous client sequences enter Datomic, even when HTTP arrivals reorder.
;; Rejected: a twenty-millisecond wait followed by overtaking.
;; [DX-M2] Why: hints prefetch the opaque commit function's reads before its serial turn.
;; Source: https://docs.datomic.com/reference/hints.html. Rejected: submitting d/with's
;; expanded data (would move invariant checks off the authoritative transaction).
(def commit-hints? (= "true" (System/getenv "TX2_COMMIT_HINTS")))
(def writer-readback (= "1" (System/getenv "TX2_INT1_WRITE_READBACK")))
(def subject-profile (= "1" (System/getenv "TX2_SUBJECT_PROFILE")))
(defn transaction-hints [conn data timeline]
  (cond
    commit-hints?
    (try
      (:hints (trace/span "d/with" "peer-call" (d/with (trace/span "d/db" "peer-call" (d/db conn)) data :return-hints true)))
      ;; A stale speculative basis can reject an otherwise valid ordered commit.
      ;; Hints are optional; only the transactor may make the definitive decision.
      (catch Exception _ (swap! timeline assoc :hintsDeclined (System/nanoTime)) nil))
    ;; [DX-W3] Why: name the general commit's cold segments with a lookup-only function, off the serial path.
    ;; Rejected: using the hint result as proof of anything (the native function re-checks on its own db-before).
    ;; Grouped commits are submitted by the group worker, which does not take hints (left as it is).
    (and general-prefetch/enabled (not (group/scheduling?)))
    (let [db (d/db conn)]
      (when (general-prefetch/eligible? db data)
        (swap! timeline assoc :generalHintsStarted (System/nanoTime))
        (let [hints (try (trace/span "general.lookup-hints" "peer-call" (general-prefetch/lookup-hints db data))
                         (catch Exception _ (swap! timeline assoc :hintsDeclined (System/nanoTime)) nil))]
          (swap! timeline assoc :generalHintsFinished (System/nanoTime))
          (when hints (swap! timeline assoc :generalHintsAttached (System/nanoTime)))
          (stats/bump! [:generalHints (if hints :attached :none)] 1)
          hints)))))
(defn prepared-for [data input p]
  (let [journals (:journal-entities p)
        safe (and group/reuse-prepared (:lean p) (seq journals)
                  (not-any? #(and (vector? %) (= :triplex.scope/feed-irregular (nth % 2 nil))) (:ops p)))]
    ;; [DX-INT1] Why: the installed writer stamps predecessor clocks and validity from each speculative db-before.
    ;; Rejected: rewriting peer row texts, which can be ordered, packed or forwarded without a map.
    ;; [DX-ERASE1] Why: group workers rebuild protected rows under the same verified erasure and envelope bindings.
    ;; Rejected: capturing just the input frame (a fallback could rebuild unsealed rows on a different thread).
    (bound-fn [view]
      (if (and safe
               (= (if (:slim-row p) 4 3) (value view (:scope p) :triplex.scope/rows-version))
               (= (ffirst data) (commit/entry view input (:lean p)))
               (not-any? #(d/entid view [:triplex.entity/id %]) journals))
        data
        (tx-data view input (:scope p))))))
(defn submit-reference! [conn data input timeline]
  (let [hints (transaction-hints conn data timeline)
        solo (bound-fn []
                 (swap! timeline assoc :predecessorReady (System/nanoTime))
                 (trace/attribute! :submittedAt (trace/clock))
                 (let [context (trace/transaction-context)
                       data (if context (assoc-in data [0 1 :triplex-trace] context) data)
                       _ (replay-capture/capture! conn data input)
                       ;; [DX-T1-12] Why: return native tx-with reads on this exact report without synchronous logging; the map is not peer-storage I/O.
                       ;; Source: https://docs.datomic.com/clojure/index.html#datomic.api/transact-async
                       ;; Rejected: infer per-commit storage reads from a concurrent process-wide cache delta.
                       options (concat (when hints [:hints hints]) (when (or trace/enabled group/stage-clock (and pred/diagnostic (true? (get input "readProfile")))) [:io-context :triplex.gateway/commit]))
                       future (try (trace/span "d/transact-async" "peer-call" (apply d/transact-async conn (group/instrument data) options))
                                   ;; [DX-R3-P7] Why: a definitive synchronous clock refusal resolves this turn,
                                   ;; just like a failed transaction future; the retry owns the next sequence.
                                   ;; Rejected: leaving next unchanged while the adapter has consumed the send.
                                   (catch Exception e
                                     (if (re-find #"TRIPLEX_CLOCK" (str e))
                                       ;; [DX-R3-P7] Why: commit! dereferences with a deadline.
                                       ;; Rejected: Delay (plain deref only; masks the clock error on timed deref).
                                       (reify
                                         clojure.lang.IDeref (deref [_] (throw e))
                                         clojure.lang.IBlockingDeref (deref [_ _ _] (throw e)))
                                       (throw e))))]
                   (swap! timeline assoc :submitted (System/nanoTime)) future))
        submit (if-not (group/scheduling?) solo
                 (fn [] (try (let [p (second (first data)) current (d/db conn) work (when (or policy/priority? policy/budget-us) (policy/work p input)) class (group/classify current p input)]
                   (group/submit! conn (merge class work {:id (get input "operationId") :params p :eligible (and (not (:bulk p)) (not (and pred/diagnostic (true? (get input "readProfile")))) (group/eligible? current p))
                     :prepare (prepared-for data input p) :data data
                     :original-data (when group/stage-clock data) :solo solo})))
                   (catch Exception e (group/outcome-future (deliver (promise) {:error e}))))))]
    (if-let [client (get input "clientId")]
      (order/enqueue! client (get input "sendSequence") (get input "operationId") submit order/gap-ms order/buffer-limit [conn input])
      (submit))))

(defn submit!
  ([conn data input timeline] (submit-reference! conn data input timeline))
  ([conn data input timeline subject-plan]
   (if-not subject-plan
     (submit-reference! conn data input timeline)
     (let [hints (cond
                   ;; [DX-W4] Why: name every read of the per-subject commit, ordered IDs included (TX2_SUBJECT_HINTS).
                   ;; Rejected: using the hint or its database value as proof of anything (the native function and
                   ;; Datomic re-check on the serial db-before); hinting the covering writer (owner head, kept off).
                   (and subject-hints/enabled (not (:owner-layout subject-plan)))
                   (let [_ (swap! timeline assoc :subjectHintsStarted (System/nanoTime))
                         h (try (trace/span "subject.lookup-hints" "peer-call"
                                  (subject-hints/lookup-hints (d/db conn) (subject-hints/from-plan subject-plan)))
                                (catch Exception _ (swap! timeline assoc :hintsDeclined (System/nanoTime)) nil))]
                     (swap! timeline assoc :subjectHintsFinished (System/nanoTime))
                     (stats/bump! [:subjectHints (if h :attached :none)] 1)
                     h)
                   subject/prefetch?
                   (do
                   (swap! timeline assoc :subjectHintsStarted (System/nanoTime))
                   ;; [DX-PREP1] Why: Datomic prefetch can move cold reads, while the native guards own the decision.
                   ;; Rejected: using the hint result or its database value as proof of absence or revision.
                   (try (trace/span "subject.lookup-hints" "peer-call" (subject/lookup-hints (d/db conn) subject-plan))
                        (catch Exception _ nil)
                        (finally (swap! timeline assoc :subjectHintsFinished (System/nanoTime))))))
           native-data (group/instrument [[(first (:function subject-plan)) subject-plan]])
           options (concat (when hints [:hints hints])
                           (when (or group/stage-clock trace/enabled (= "1" (System/getenv "TX2_REMOVAL_COST_READBACK"))) [:io-context :triplex.gateway/subject]))
           _ (swap! timeline assoc :predecessorReady (System/nanoTime))
           tx (trace/span "d/transact-async" "peer-call"
                (apply d/transact-async conn native-data options))]
       (swap! timeline assoc :submitted (System/nanoTime))
       (reify
         clojure.lang.IBlockingDeref
         (deref [_ ms timeout]
           (let [start (System/nanoTime)
                 remaining #(max 0 (- ms (quot (- (System/nanoTime) start) 1000000)))
                 result (try (deref tx ms timeout)
                             (catch Exception e (if (subject/replan? e) ::subject-replan (throw e))))]
             (cond
               (= result ::subject-replan)
               ;; [DX-PREP1] Why: a definite refusal can only be retried from a fresh authoritative view.
               ;; Rejected: resubmitting a timed-out write or using the peer frame that the serial check rejected.
               (let [db (deref (d/sync conn) (remaining) timeout)]
                 (cond
                   (identical? timeout db) timeout
                   (not (subject/retry-safe? db subject-plan)) (throw (ex-info "TRIPLEX_CONFLICT" {}))
                   :else (let [_ (when (:owner-layout subject-plan)
                                   ;; [Opus W1] Why: the reference writer refuses a person with a covering root.
                                   ;; Rejected: refusing the retry (an identity conflict must keep its legacy outcome).
                                   (owner-layout/fold! conn db (:owner subject-plan)))
                               retry (deref (submit-reference! conn (tx-data db input) input timeline) (remaining) timeout)]
                           (if (identical? timeout retry) timeout (assoc retry :subject-replan true)))))
               (identical? timeout result) timeout
               :else (cond-> (if (:owner-layout subject-plan)
                               (owner-layout/verify-report result subject-plan)
                               (subject/verify-report result subject-plan))
                       hints (assoc :subject-hints-attached true))))))))))
;; [DX-B10] Why: a definitive preflight rejection resolves its sequence without a database write.
;; Rejected: skipping that turn (strands all later valid commands behind a permanent gap).
(defn reject-ordered! [conn input error]
  (when-let [client (get input "clientId")]
    (order/enqueue! client (get input "sendSequence") (get input "operationId")
                    #(delay nil) order/gap-ms order/buffer-limit [conn input]))
  (throw error))
 ;; [DX-R3-P6] Why: a clock fence needs an actionable policy/import explanation at the adapter boundary.
;; Rejected: exposing only the transactor's numeric TRIPLEX_CLOCK marker (does not explain immutable strict scopes).
(defn clock-conflict-message [message]
  (str message " Record-clock policy: replay-safe writes, and every gateway commit in strictRecordClocks scopes, must advance the scope maximum."
       " Use a greater commit time. To preserve old history times, use a fresh non-strict scope, or load a strict scope in increasing commit times, one clock per commit."))
;; [Opus W1] Why: one place decides between the covering root, a fold, and the existing writers.
;; Rejected: letting the plain subject or reference writer act on a migrated person (they read legacy rows only).
(defn- touched-roots [db data]
  (when (owner-root/installed? db)
    (into [] (keep (fn [id] (when-let [e (d/entid db [:triplex.entity/id id])] (when (owner-root/raw db e) e))))
          (distinct (:owners (second (first data)))))))
(defn- fold-touched! [conn _ data]
  ;; [Opus W1] Why: fold against the newest view this peer holds; a fold it already made must not run twice.
  (let [db (d/db conn)]
    (reduce (fn [db e] (owner-layout/fold! conn db e)) db (touched-roots db data))))
(defn- subject-prepare [conn db data input expected]
  (if-not owner-layout/enabled
    (if (some? expected) (subject/plan db data input expected) (subject/plan db data input))
    (let [plan (owner-layout/prepare db data input expected)]
      (if (and plan (not (:fold plan)))
        plan
        (let [db (fold-touched! conn db data)]
          (or (owner-layout/prepare db data input expected)
              (subject/plan db data input expected)))))))
(defn commit! [name conn db input]
  (when trace/tx-jfr-enabled (trace/attribute! :databaseHash (schema/sha256 name)))
  (when (and (not owner-layout/enabled) (owner-root/installed? db))
    (throw (ex-info "This database stores covering owner roots; start the writer with TX2_SUBJECT_OWNER_HEAD=1"
                    {:status 409 :code "OwnerLayoutRequired"})))
  (when group/load-timing (trace/attribute! :operationId (get input "operationId")))
  (when (d/entid db [:triplex.tx/operation-id (get input "operationId")])
    (reject-ordered! conn input (ex-info "Operation already committed" {:status 409 :code "OperationDuplicate"})))
  (try
    (let [parsed (System/nanoTime)
          load-timing (when commit/load-profile (volatile! 0))
          data (try (binding [*load-timing* load-timing] (trace/span "commit.prepare-and-validate" "gateway" (tx-data db input (scope/entity db))))
                    (catch Exception e (reject-ordered! conn input e)))
          validated (when (= "1" (System/getenv "TX2_SUBJECT_RETIREMENT_TRACE")) (System/nanoTime))
          frame-size (group/frame-measurement (second (first data)) input)
          _ (try (group/bound-frame! frame-size) (catch Exception e (reject-ordered! conn input e)))
          ;; [DX-PREP1] Why: the unordered subject arm submits one native transaction and uses its actual durable report.
          ;; Rejected: bypassing protected-scope erasure or live/import admission, or applying the draft speculatively.
          subject-plan (when (and subject/enabled
                                  (or (not (:sealed privacy/*cut*)) (envelope/shared?))
                                  (not (or policy/priority? policy/field-only? policy/budget-us replay-capture/enabled)))
                         (trace/span "subject.prepare" "gateway"
                           (subject-prepare conn db data input (when privacy/*cut* (:seq privacy/*cut*)))))
          ;; [Opus W1] Why: a save the covering writer cannot take must not reach legacy rows under a root.
          _ (when (and owner-layout/enabled (nil? subject-plan)) (fold-touched! conn db data))
          start (System/nanoTime)
          ready-ms (when group/queue-clock (System/currentTimeMillis))
          timeline (atom (cond-> {:requestParsed parsed :payloadPrepared start}
                           validated (assoc :payloadValidated validated)))
          report (trace/span "peer.transact-await (includes order/network/storage)" "peer-wait" (deref (submit! conn data input timeline subject-plan) 5000 ::timeout))
          completed (System/nanoTime)
          transact-micros (quot (- completed start) 1000)
          stamp (when (and group/queue-clock (not= report ::timeout))
                  (let [db (:db-after report) text (value db (d/t->tx (d/basis-t db)) :triplex.diagnostic/native-entry)]
                    (when text (mapv #(Long/parseLong %) (clojure.string/split text #"/")))))]
      (when (= report ::timeout) (throw (ex-info "Commit outcome unknown" {:status 503 :code "OutcomeUnknown"})))
      (replay-capture/completed! report input)
      (trace/attribute! :datomicT (str (d/basis-t (:db-after report))))
      (trace/attribute! :transactionIoStats (:io-stats report))
      (trace/attribute! :peerStorageReadsStatus "not exposed: transaction io-stats describe transactor tx-with, not independent peer reads")
      (cond-> {:t (codec/encode-value "long" (d/basis-t (:db-after report)))
       :recordedAt (codec/encode-value "double" (or (get-in report [:member :clock]) (ledger/clock (:db-after report) (d/t->tx (d/basis-t (:db-after report))))))
       :transactMicros transact-micros
       :timeline (into {} (map (fn [[k v]] [k (/ (- v parsed) 1000.0)])
                              (assoc @timeline :completed completed :responsePrepared (System/nanoTime))))
       :operationId (get input "operationId")
       :position (codec/encode-value "long" (or (get-in report [:member :position]) (:v (first (filter #(= (:a %) (d/entid (:db-after report) :triplex.tx/position)) (:tx-data report))))))
       :delta (- (or (get-in report [:member :position]) (:v (first (filter #(= (:a %) (d/entid (:db-after report) :triplex.tx/position)) (:tx-data report))))) (get input "position"))
       :datoms (count (:tx-data report))}
        ;; [DX-THIN1] Why: report the selected installed function and real packed frames on this receipt.
        ;; Rejected: claiming a treatment from the requested environment alone.
        writer-readback (assoc :writePath (let [[ident params] (first data)]
                                          {:function (or (:subject-save report) (str ident)) :historyRange (boolean (:identity-bounds params))
                                           :scheduling (boolean (group/scheduling?))
                                           :packedRows (count (filter (fn [op] (and (vector? op) (= :triplex/assert (first op))
                                                                              (vector? (nth op 3 nil)) (= 6 (count (nth op 3))))) (:ops params)))}))
        ;; [DX-ERASE2] Why: report Datomic's transaction application counter on the exact acknowledged save.
        ;; Rejected: using gateway wait or HTTP latency as a transaction-thread measurement.
        (and (= "1" (System/getenv "TX2_REMOVAL_COST_READBACK")) (number? (get-in report [:io-stats :api-ms])))
        (assoc :nativeApplyMs (get-in report [:io-stats :api-ms]))
        (:subject-save report) (assoc :subjectSave (:subject-save report))
        (:subject-ordered-ids report) (assoc :subjectOrderedIds true)
        (:subject-append-retirement report) (assoc :subjectAppendRetirement true)
        (:subject-owner-head-bytes report) (assoc :subjectOwnerHeadBytes (:subject-owner-head-bytes report))
        (:subject-hints-attached report) (assoc :subjectHintsAttached true)
        (and (not (:subject-save report)) (:generalHintsAttached @timeline)) (assoc :generalHintsAttached true)
        (:subject-replan report) (assoc :subjectReplan true)
        (and load-timing (not (:subject-save report))) (assoc :loadProfile {:rowNs @load-timing :applyMs (get-in report [:io-stats :api-ms])
                       :tx (clojure.edn/read-string (value (:db-after report) (d/t->tx (d/basis-t (:db-after report))) :triplex.load/metrics))})
        group/bulk-priority (assoc :bulkGrant (:bulk-grant report))
        (:serial-hold report) (assoc :serialHold (:serial-hold report))
        frame-size (assoc :frameSize frame-size)
        (and pred/diagnostic (true? (get input "readProfile"))) (assoc :readProfile (:io-stats report))
        group/stage-clock (assoc :nativeComputeMs (get-in report [:io-stats :api-ms]) :groupStages (:group-stages report)
                                 :preparedStats (:prepared-stats report)
                                 :writerFunction (or (:subject-save report) (str (ffirst data))))
        (and group/stage-clock subject-profile) (assoc :nativeIoStats (:io-stats report))
        stamp (assoc :requestBytes (policy/request-size input) :preparedOps (count (:ops (second (first data)))) :submitToNativeEntryMs (- (second stamp) (first stamp)) :readyToNativeEntryMs (- (second stamp) ready-ms))
        (:group-size report) (assoc :groupSize (:group-size report) :groupQueueMicros (quot (:group-wait-ns report) 1000))))
    (catch Exception e
      (replay-capture/discard! input)
      (let [text (str e)]
        ;; [DX-THIN1] Why: preserve explicitly typed policy errors and the established transaction rejection for malformed row ordering.
        ;; Rejected: treating every codec InvalidValue as a policy error before checking the transaction result.
        (when (or (:write-policy (ex-data e)) (#{"OutcomeUnknown" "WriteQueueFull" "BulkFrameTooLarge" "ErasureFrontierChanged" "ErasureReplayDeclined" "ErasedAssertionIdentity" "ProtectedTypeUnsupported"} (:code (ex-data e))) (.startsWith (str (:code (ex-data e))) "CommitOrder")) (throw e))
        (throw (ex-info (if (re-find #"TRIPLEX_CLOCK" text) (clock-conflict-message (.getMessage e)) (.getMessage e))
                       {:status (if (re-find #"TRIPLEX_IMPORT_PREDECESSOR|TRIPLEX_CLOCK|TRIPLEX_CONFLICT|TRIPLEX_ERASURE_FRONTIER|TRIPLEX_(?:OPERATION|COMMAND)_DUPLICATE|cas-failed|unique-conflict" text) 409 400)
                        :maximum (when-let [[_ maximum] (re-find #"TRIPLEX_CLOCK ([0-9.Ee+-]+)" text)] (Double/parseDouble maximum))
                        :code (cond (re-find #"TRIPLEX_ERASURE_FRONTIER" text) "ErasureFrontierChanged"
                                    (re-find #"TRIPLEX_OPERATION_DUPLICATE" text) "OperationDuplicate"
                                    (re-find #"TRIPLEX_COMMAND_DUPLICATE" text) "CommandConflict"
                                    (re-find #"TRIPLEX_IMPORT_PREDECESSOR" text) "ImportPredecessorMissing"
                                    (re-find #"TRIPLEX_CLOCK_EXHAUSTED" text) "ClockExhausted"
                                    (re-find #"TRIPLEX_CLOCK" text) "ClockConflict"
                                    (re-find #"TRIPLEX_CONFLICT|cas-failed|triplex.tx/position" text) "CasConflict"
                                    (re-find #"triplex.claim/command-id" text) "CommandConflict"
                                    (re-find #"triplex.tx/operation-id" text) "OperationDuplicate"
                                    (re-find #"f/id" text) "IdentityConflict" :else "TransactionRejected")} e))))))
(defn operation [db id]
  (if-let [{:keys [position t clock]} (group/receipt db id)]
    (if (nil? position) {:status "absent"} {:status "committed" :operationId id :position (codec/encode-value "long" position)
     :t (codec/encode-value "long" t) :recordedAt (codec/encode-value "double" clock)})
    {:status "absent"}))
(defn head-position
  ([db]
   (scope/head-position db (:e (first (d/datoms db :aevt :triplex.scope/key)))))
  ([name db]
   (scope/head-position db (scope/entity db))))
(defn unavailable! [message]
  (throw (ex-info message {:status 409 :code "BasisNotAvailable"})))
;; [EXP-DA01] Why: future cuts must wait for publication, never silently answer from the head (Q89c/d). Rejected: treating P >= head as latest.
(defn await-position [db p wait-ms refresh & [conn]]
  (if (nil? p) db
    (let [p (safe-position p) wait-ms (or wait-ms 500)
          _ (when-not (and (integer? wait-ms) (<= 1 wait-ms 2000)) (codec/invalid "Basis wait must be 1..2000 ms"))
          deadline (+ (System/nanoTime) (* wait-ms 1000000))
          ready? #(<= p (head-position %))]
      (if (ready? db) db
        (let [next (refresh (max 1 (quot (- deadline (System/nanoTime)) 1000000)))]
          (when (= next ::timeout) (unavailable! "Requested position did not become available before the deadline"))
          (let [current (cond (ready? next) next
                              conn (feed/await-db conn ready? deadline)
                              ;; A held db cannot advance; wait only for its deadline, never replace its cut.
                              :else (let [remaining (- deadline (System/nanoTime)) waiter (Object.)]
                                      (when (pos? remaining)
                                        (locking waiter (.wait waiter (quot (+ remaining 999999) 1000000))))
                                      (refresh 1)))]
            (when (or (= current ::timeout) (not (ready? current)))
              (unavailable! "Requested position is beyond the available snapshot"))
            current))))))
;; [EXP-DA01] Why: sparse logical positions map to the first containing physical transaction in logarithmic index work (Q89d). Rejected: rebuilding an O(commits) host map at each basis.
(defn at-position [db p]
  (if (nil? p) db
    (let [p (safe-position p) head (head-position db)]
      (when (> p head) (unavailable! "Requested position is beyond the available snapshot"))
      (if (= p head) db
        (let [tx (if (zero? p)
                   (:tx (first (d/datoms db :aevt :triplex.scope/key)))
                   (:e (first (d/index-range db :triplex.tx/position p nil))))]
          (when-not tx (unavailable! "No physical transaction covers the requested position"))
          (d/as-of db (d/tx->t tx)))))))
(defn read-db [name current input]
  (when (and (:sealed privacy/*cut*) (contains? input "staged"))
    (privacy/failure! 409 "ProtectedPreviewUnavailable" "A protected row preview requires a guarded save"))
  (let [db (if-let [handle (get input "handle")]
             (let [held (held-db name handle)]
               (if-let [staged (get input "staged")] (:db-after (admission/execute admission/reads #(trace/span "d/with" "peer-call" (d/with held (tx-data held staged))))) held))
             current)
        p (get-in input ["basis" "recordedPosition"])]
    ;; [EXP-DA01] Why: a held value cannot advance even if another writer commits; refuse future requests against that exact pin. Rejected: replacing a held db with a newer one mid-query.
    (at-position (await-position db p (get input "basisWaitMs") (fn [_] db)) p)))
(defn raw-row [db eid]
  (let [f (d/entity db eid)
        tx (or (:f/asserted-in f)
               (let [^datomic.Datom identity (first (d/datoms db :eavt eid :f/id))]
                 (when identity (d/entity db (.tx identity)))))
        rtx (:f/retracted-in f) kind (name (:f/type f))]
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
     :created_by (:f/created-by f) :entity_type (:f/entity-type f) :schema_version (or (:f/schema-version f) 1)
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
      (when (and (pos? p) (nil? (d/entid db [:triplex.tx/position p]))
                 (not (and (d/entid db :triplex.group/position) (d/entid db [:triplex.group/position p]))))
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
(defn legacy-read-rows [name current input]
  (let [db (read-db name current input)]
    (admission/execute-for input admission/reads (fn []
  (let [basis (get input "basis") history (get input "history")
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
        branch (cond id "id" (some? entities) "entities" (get pattern "entityId") "entity" :else "scan")
        _ (stats/bump! [:branches branch :calls] 1)
        visited (volatile! 0)
        scan-key (pr-str (select-keys pattern ["attribute" "entityType"]))
        rows (map #(do (when (= branch "scan") (vswap! visited inc) (stats/bump! [:branches branch :datoms] 1)) (row db %)) ids)
        result {:route (cond (= route "live") "live" (get input "staged") "staged" (get input "handle") "held"
                  (and (some? (get basis "recordedPosition")) (< (get basis "recordedPosition") (head-position current))) "as-of" :else "source")
     :basis basis :subjectAttribute (str attribute)
     :rows (mapv #(wire-row (privacy/masked (mask-retirement % basis)))
                 (filter (fn [r] (and (visible? r basis history)
                                     (or (not= route "live") (nil? (:retracted_at r)))
                                     (or (nil? entities) (some #{(:entity_id r)} entities))
                                     (every? (fn [[k field]] (or (nil? (get pattern k)) (.startsWith ^String (str (get pattern k)) "?")
                                                               (= (get pattern k) (get r field))))
                                             [["entityId" :entity_id] ["attribute" :attribute] ["entityType" :entity_type]]))) rows))}]
    (when (= branch "scan")
      (stats/bump! [:scanPatterns scan-key :calls] 1)
      (stats/bump! [:scanPatterns scan-key :datoms] @visited)
      (swap! stats/counts update-in [:scanPatterns scan-key :maxDatoms] (fnil max 0) @visited))
    result)))))

;; [DX-JRN1] Why: a field's history of a heavily saved entity should not return (or decode) every row the entity ever had.
;; "historyPage" {"attribute", "limit", "before"} on a lean history read of one entity decodes only that attribute's rows,
;; orders them newest first by (recorded position, row ID), skips rows at or after the "before" cursor and returns
;; "limit" of them with "historyNext", the cursor for the next page (null on the last). Without it nothing changes.
;; Rejected: a limit before the visibility filter (a page could come back short at an older basis).
(defn history-page-input [input]
  (when-let [page (get input "historyPage")]
    (let [attribute (get page "attribute") limit (get page "limit") before (get page "before")
          entities (get input "entityIds") entity (get-in input ["pattern" "entityId"])]
      (when-not (and (map? page) (string? attribute) (not (.startsWith ^String attribute "?"))
                     (integer? limit) (<= 1 limit 10000) (true? (get input "history"))
                     (or (nil? before) (and (map? before) (integer? (get before "position")) (string? (get before "id"))))
                     (or (and (= 1 (count entities)) (nil? entity))
                         (and (nil? entities) (string? entity) (not (.startsWith ^String entity "?")))))
        (codec/invalid "historyPage needs history, one entity, an attribute, a limit of 1..10000 and an optional before {position, id}"))
      {:attribute attribute :limit limit
       :before (when before [(long (get before "position")) (get before "id")])})))
(defn newest-first [a b] (compare [(:recorded_position b) (:id b)] [(:recorded_position a) (:id a)]))
(defn history-page [rows {:keys [limit before]}]
  (let [ordered (sort newest-first rows)
        after-cursor (if before
                       (drop-while #(not (neg? (compare [(:recorded_position %) (:id %)] before))) ordered)
                       ordered)
        taken (vec (take (inc limit) after-cursor))
        shown (if (> (count taken) limit) (subvec taken 0 limit) taken)]
    {:rows shown
     :next (when (> (count taken) limit) (let [r (peek shown)] {:position (:recorded_position r) :id (:id r)}))}))

;; [DX-B5-L2] Why: retain one visibility/masking rule for both physical layouts.
;; Rejected: interpreting interior logical positions as physical transaction cuts.
(defn read-rows [name current input]
  (when (and (:sealed privacy/*cut*) (contains? input "staged"))
    (privacy/failure! 409 "ProtectedPreviewUnavailable" "A protected row preview requires a guarded save"))
  (let [db (if-let [handle (get input "handle")]
             (let [held (held-db name handle)]
               (if-let [staged (get input "staged")] (:db-after (admission/execute admission/reads #(trace/span "d/with" "peer-call" (d/with held (tx-data held staged))))) held)) current)]
    (if-not (lean/enabled? db)
      (if (get input "historyPage") (lean/unsupported! "historyPage") (legacy-read-rows name current input))
      (let [page (history-page-input input)
            input (if page (assoc input "historyAttribute" (:attribute page)) input)
            basis (get input "basis") history (get input "history") route (get input "route" "history")
            pattern (get input "pattern") entities (when-let [ids (get input "entityIds")] (set ids))
            _ (when-not (#{"history" "live"} route) (codec/invalid "Unknown read route"))
            _ (assert-subject-route! db basis (if (= route "live") :f/live :f/subject))
            _ (when (and (= route "live") history) (unavailable! "Position-retired route cannot enumerate history"))
            _ (trace/read-span "read.confirm-position" "peer-call" (await-position db (get basis "recordedPosition") (get input "basisWaitMs") (fn [_] db)))]
        ;; [DX-RPT1] "omitProtected": true reads protected rows without their values (privacy/*omit-protected*).
        (binding [privacy/*omit-protected* (true? (get input "omitProtected"))]
        (admission/execute-for input admission/reads (fn []
        (let [paged (fn [rows] (if page (history-page rows page) {:rows rows}))
              {rows :rows more :next} (paged
                     (filter (fn [row]
                               (and (visible? row basis history)
                                    (or (not= route "live") (nil? (:retracted_at row)))
                                    (or (nil? entities) (entities (:entity_id row)))
                                    (every? (fn [[key column]]
                                              (let [v (get pattern key)]
                                                (or (nil? v) (.startsWith ^String (str v) "?") (= v (get row column)))))
                                            [["entityId" :entity_id] ["attribute" :attribute] ["entityType" :entity_type]])))
                             ;; [DX-B5-L2] Why: an explicit imported row position cannot move its physical publication into an older snapshot.
                             ;; Rejected: filtering full head history only by row position (differs from legacy read-db).
                             ;; [DX-RD2] Why: the pinned short-cut compares each named subject with this request's own current database.
                             ;; Rejected: a newer database (it would need a revision check against a cut the request never saw).
                             (binding [pinned/*current* (when-not (or (get input "handle") (get input "staged")) db)]
                               (doall (lean/rows name (trace/read-span "read.resolve-position" "peer-call" (at-position db (get basis "recordedPosition"))) input)))))]
        (cond-> {:route (cond (= route "live") "live" (get input "staged") "staged" (get input "handle") "held"
                              (and (some? (get basis "recordedPosition")) (< (get basis "recordedPosition") (head-position current))) "as-of" :else "source") :basis basis
                 :subjectAttribute (str (if (= route "live") :f/live :f/subject))
                 :rows (mapv #(wire-row (privacy/masked (mask-retirement % basis))) rows)}
          page (assoc :historyNext more)
          privacy/*omit-protected* (assoc :omittedProtected true))))))))))

;; [EXP-DX1] Why: snapshot, claim and known by-id rows share one immutable prefetch cut.
;; Rejected: separate claim/read HTTP calls (R51's six-round-trip commit).
(defn begin-command! [name db input]
  (let [snapshot (begin! name db) command (get input "commandId") ids (get input "ids" [])]
    (try
      (merge snapshot
        {:t (codec/encode-value "long" (d/basis-t db))
         :claim (when command (when-let [eid (d/entid db [:triplex.claim/command-id command])] (ledger/claim-tx-id db eid)))
         :rows (if (lean/enabled? db)
                 (vec (mapcat #(:rows (read-rows name db {"id" %})) ids))
                 (mapv wire-row
                 (keep (fn [id]
                         (when-let [eid (d/entid db [:f/id id])]
                           (let [r (row db eid)] (when (visible? r nil false) r)))) ids)))})
      (catch Exception e (release! name (:handle snapshot)) (throw e)))))

;; [DX-B6-5] Why: an ahead record time cannot prove peer freshness. Rejected: serving a stale local cut.
(defn await-record-time [name conn db input]
  (let [r (get-in input ["basis" "recordedAt"])
        maximum (fn [db] (or (scope/max-recorded-at db (:e (first (d/datoms db :aevt :triplex.scope/key)))) Double/NEGATIVE_INFINITY))]
    (if (or (nil? r) (get input "handle") (<= r (maximum db))) db
      (let [wait-ms (get input "basisWaitMs" 50)
            _ (when-not (and (number? wait-ms) (<= 0 wait-ms 2000))
                (throw (ex-info "Invalid basisWaitMs" {:status 400})))
            deadline (+ (System/nanoTime) (* wait-ms 1000000))]
        (stats/bump! [:recordTimeWaits] 1)
        (let [current (feed/await-db conn #(<= r (maximum %)) deadline)]
          (if (<= r (maximum current)) current
            (do (stats/bump! [:recordTimeSyncs] 1)
                (let [synced (trace/span "d/sync" "peer-wait" (deref (d/sync conn) 2000 ::timeout))]
                  (when (= ::timeout synced)
                    (throw (ex-info "Record-time sync timed out" {:status 503 :code "BasisNotAvailable"})))
                  synced))))))))
