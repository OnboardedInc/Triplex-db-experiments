(ns triplex.gateway.commit
  (:require [clojure.walk :as walk] [triplex.gateway.slim :as slim] [datomic.api :as d] [triplex.gateway.schema :as schema]
            [triplex.gateway.trace :as trace] [triplex.gateway.predecessor :as pred]
            [triplex.gateway.save-ledger :as ledger] [triplex.gateway.packed-journal :as packed]))

;; [DX-W1] Why: only the serialized db-before can prove a whole interval of historical prefixes empty.
;; Rejected: trusting client bounds, checking current rows, or stopping at the largest bare prefix (its suffixes sort later).
(def history-range-code
  '(fn [db ops bounds]
     (when (and (instance? java.util.List bounds) (= 2 (count bounds)))
       (let [[low high] bounds pattern (re-pattern "[0-9A-Z]{26}")
             supported? (fn [id] (and (string? id) (= 26 (.length ^String id)) (re-matches pattern id)))]
         (when (and (supported? low) (supported? high) (neg? (compare low high)))
           (loop [remaining (seq ops) seen #{}]
             (if (seq remaining)
               (let [op (first remaining)]
                 (cond
                   (and (instance? java.util.List op) (= :triplex/assert (first op)))
                   (let [wrapped (nth op 3 nil)
                         raw (when (and (= :triplex.entity/row (nth op 2 nil))
                                        (instance? java.util.List wrapped) (= :triplex/row (first wrapped))
                                        (= :row (nth wrapped 4 nil))) (second wrapped))
                         id (when (and (string? raw) (> (.length ^String raw) 31)
                                       (.startsWith ^String raw "2001a")) (subs raw 5 31))]
                     (when (and (supported? id) (not (contains? seen id))
                                (not (neg? (compare id low))) (not (pos? (compare id high))))
                       (recur (next remaining) (conj seen id))))
                   (or (map? op) (instance? java.util.List op)) (recur (next remaining) seen)
                   :else nil))
               (when (and (contains? seen low) (contains? seen high))
                 (let [start (str "2001a" low)
                       end (str "2001a" (subs high 0 25) (char (inc (int (.charAt ^String high 25)))))]
                   (nil? (read-at :w1/new-range (first (d/index-range (d/history db) :triplex.entity/row start end)))))))))))))

;; [DX-B3-M2] Why: the serial point belongs in Datomic, after parallel client staging.
;; Rejected: scope CAS in the peer (unrelated subjects conflict and queue).
(def operation-code
  '(let [checked (volatile! {})]
     (letfn [(value [e a]
             ;; [DX-T1-6] Why: the rev check can warm the same AEVT segment native cardinality-one replacement reads.
             ;; Rejected: changing stored identities or bypassing the serial revision conflict check.
             (:v (first (if (and (:rev-aevt payload) (= a :triplex.entity/rev))
                          (d/datoms db :aevt a e) (d/datoms db :eavt e a)))))
           ;; [DX-B8] Why: immutable transaction values avoid the per-commit scope retraction merge.
           ;; Rejected: a peer-cached head (allocation must remain atomic on the transactor).
           (newest-commit []
             (let [tx (d/t->tx (d/basis-t db))]
               (if (some? (value tx :triplex.tx/position)) tx
                 ;; [DX-B8] Why: one AEVT seek skips any suffix of non-commit transactions.
                 ;; Rejected: walking the log backwards (unbounded marker suffix).
                 (let [datom (first (d/rseek-datoms db :aevt :triplex.tx/position tx))]
                   (when (and datom (= (:a datom) (d/entid db :triplex.tx/position))) (:e datom))))))
           (digits [p] (let [s (str p)] (str (subs "0000000000000000" (count s)) s)))
           (row-id [id]
             (let [prefix (str "2" (format "%04x" (.length ^String id)) id)
                   datom (read-at :w1/old-live
                     (choose-read (first (d/index-range db :triplex.entity/row prefix nil))
                       (or (when-let [owner (get owners id)]
                             (when-let [e (owner-eid owner)]
                               (let [x (first (d/seek-datoms db :eavt e :triplex.entity/row prefix))]
                                 (when (and (= e (:e x)) (= (d/entid db :triplex.entity/row) (:a x))
                                            (.startsWith ^String (:v x) prefix)) x))))
                           (first (d/index-range db :triplex.entity/row prefix nil)))))]
               (when (and datom (.startsWith ^String (:v datom) prefix))
                 (let [marker (read-at :w1/retirement (first (d/seek-datoms db :eavt (:e datom) :triplex.entity/retired prefix)))]
                   (when-not (and marker (= (:a marker) (d/entid db :triplex.entity/retired))
                                  (.startsWith ^String (:v marker) prefix))
                     (vswap! checked assoc id datom)
                     datom)))))
           ;; [DX-B5-L1] Why: legacy assertion identities remain reserved after retirement.
           ;; Rejected: accepting a reused retired ID (history would contain two incompatible rows for one identity).
           (identity-row [id]
             (let [prefix (str "2" (format "%04x" (.length ^String id)) id)
                   datom (read-at :w1/new-id (first (d/index-range (d/history db) :triplex.entity/row prefix nil)))]
               (when (and datom (.startsWith ^String (:v datom) prefix)) datom)))
           (number-field [x] (if (= "-0" x) -0.0 x))
           (assertion-meta [change datom]
             ;; [DX-WFIX1] Why: the checked assertion can have been created by the last logical member.
             ;; Rejected: copying the client's provisional clock, range or value into a durable retraction.
             (let [[_ _ entity attr kind string number bool datetime data recorded from to _ entity-type _ tx]
                   (lean-columns-code (:v datom))
                   value {"type" kind "value" (case kind
                           ("ref" "integer" "string" "blob") string
                           "number" (number-field number)
                           "boolean" (not (zero? bool))
                           "datetime" (number-field datetime)
                           "json" (json/read-str data))}
                   value (if (= "blob" kind) (merge (json/read-str data) value) value)]
               (cond-> (assoc (dissoc change "validTo" "entityType" "assertionTxId")
                              "entityId" entity "attribute" attr "value" value
                              "recordedAt" (number-field recorded) "validFrom" (number-field from))
                 (some? to) (assoc "validTo" (number-field to))
                 entity-type (assoc "entityType" entity-type)
                 tx (assoc "assertionTxId" tx))))
           (assign-change [text clock new-ids prior-rows]
             (let [change (json/read-str text)
                   id (get change "tripleId")
                   retract (= "retract" (get change "op"))
                   predecessor (when (and retract (not (new-ids id))) (get @checked id))
                   legacy (when (and retract (not predecessor)) (get prior-rows id))
                   change (cond-> change
                            predecessor (assertion-meta predecessor)
                            legacy (merge (select-keys legacy (keys change)))
                            (new-ids id) (assoc "recordedAt" clock)
                            (or predecessor (contains? change "retractedAt")) (assoc "retractedAt" clock))]
               (json/write-str change)))
           (assign-row [text offset clock new-ids prior-rows]
             (let [start (- offset 2) values (json/read-str (subs text start))
                   attr (nth values 3) journal (= "_Transaction" (nth values 14))
                   values (cond-> (assoc values 10 clock)
                            (and journal (= attr ":_tx/instant")) (assoc 8 clock)
                            (and journal (= attr ":_tx/change")) (assoc 9 (assign-change (nth values 9) clock new-ids prior-rows)))]
               (str (subs text 0 start) (json/write-str values))))
           (conflict [] (throw (ex-info "TRIPLEX_CONFLICT" {})))]
     (let [{:keys [scope source provisional span lean live entities scope-wide ops times record-clocks replay-safe irregular position-irregular journal-entities assign-record-time new-ids slim-row]} payload
           operation-id (or (:triplex.tx/operation-id (first ops)) (some :triplex.tx/operation-id ops))
           command-ids (or (:command-ids payload) (keep :triplex.claim/command-id ops))
           ;; [DX-WFIX1] Why: a committed retry can name a predecessor it already retired.
           ;; Rejected: checking identities only at ingress (a queued request can hold a stale basis).
           _ (when (and operation-id (d/entid db [:triplex.tx/operation-id operation-id]))
               (throw (ex-info "TRIPLEX_OPERATION_DUPLICATE" {})))
           _ (when (some #(d/entid db [:triplex.claim/command-id %]) command-ids)
               (throw (ex-info "TRIPLEX_COMMAND_DUPLICATE" {})))
           head-v2 (= 2 (value scope :triplex.scope/head-version))
           latest (when head-v2 (newest-commit))
           h (if head-v2 (or (when latest (value latest :triplex.tx/position)) 0)
                 (value scope :triplex.scope/position)) final (+ h span) final-digits (digits final) delta (- final provisional)
           lower (- provisional span)
           shifted (fn [p] (if (< lower p (inc provisional)) (+ p delta) p))
           row-a (d/entid db :triplex.entity/row)
           prior (if head-v2 (when latest (value latest :triplex.tx/max-recorded-at))
                     (value scope :triplex.scope/max-recorded-at))
           strict-clocks (and (d/entid db :triplex.scope/strict-record-clocks)
                              (true? (value scope :triplex.scope/strict-record-clocks)))
           server-clock (and strict-clocks (not= false assign-record-time))
           journal-exists (some #(d/entid db [:triplex.entity/id %]) journal-entities)
           merge-ledger (and save-ledger head-v2 server-clock (not journal-exists))
           has-packed (and (d/entid db :triplex.scope/packed-journals) (value scope :triplex.scope/packed-journals))
           ops (if merge-ledger
                 (save-ledger-code ops (first journal-entities) save-ledger) ops)
           _ (when (not= (boolean slim-row) (= 4 (value scope :triplex.scope/rows-version)))
               (throw (ex-info "TRIPLEX_SLIM_LAYOUT_MISMATCH" {})))
           _ (when (and strict-clocks (some #(or (not (number? %)) (not (Double/isFinite (double %)))) (concat times record-clocks)))
               (throw (ex-info "Invalid strict record clock" {})))
           checked-times (if strict-clocks (map double (concat times record-clocks)) times)
           ;; [DX-T1-5] Why: the serialized transaction owns the scope's next finite record clock; valid time stays submitted.
           ;; Rejected: peer allocation and clock-conflict replay (two clients can race the same maximum).
           clock (when server-clock
                   (let [submitted (if (seq checked-times) (reduce max checked-times) (double (System/currentTimeMillis)))
                         next (when prior (max (+ (double prior) 1.0) (Math/nextUp (double prior))))
                         assigned (if next (max submitted next) submitted)]
                     (when-not (Double/isFinite (double assigned))
                       (throw (ex-info "TRIPLEX_CLOCK_EXHAUSTED" {})))
                     (double assigned)))
           new-id-set (set new-ids) timed (when server-clock (set timed-retractions))
           prior-rows (volatile! {})]
       (when (or (not (pos? span)) (> final 9007199254740991))
         (throw (ex-info "Invalid commit span" {})))
       (when (and scope-wide (not= h source)) (conflict))
       (doseq [id live]
         (if lean
           (when-not (row-id id) (conflict))
           (if-let [e (d/entid db [:f/id id])]
             (do
               (when-not (value e :f/live) (conflict))
               (when (and timed (timed id))
                 (let [negative (into #{} (map :v) (d/datoms db :eavt e :f/negative-zero))
                       number (fn [field v] (if (negative field) -0.0 v))]
                   (vswap! prior-rows assoc id
                     {"recordedAt" (number :recorded_at (or (value e :f/recorded-at)
                                                           (value (value e :f/asserted-in) :triplex.tx/recorded-at)))
                      "validFrom" (number :valid_from (value e :f/valid-from))
                      "validTo" (number :valid_to (value e :f/valid-to))}))))
             (conflict))))
       (when source
         (doseq [id entities]
           (when-let [e (choose-read (d/entid db [:triplex.entity/id id]) (owner-eid id))]
             (when (> (or (read-at :w1/revision (value e :triplex.entity/rev))
                          (when (and (value e :triplex.tx/operation-id) (not (value e :triplex.tx/id)))
                            (or (when (d/entid db :triplex.group/position) (value e :triplex.group/position))
                                (value e :triplex.tx/position)))
                          0) source) (conflict)))))
       (letfn [(replace-value [x]
                 (cond
                   (and (instance? java.util.List x) (= :triplex/record-time (first x))) (if server-clock clock (second x))
                   (and (instance? java.util.List x) (= :triplex/change (first x))) (if server-clock (assign-change (second x) clock new-id-set @prior-rows) (second x))
                   (and (instance? java.util.List x) (= :triplex/negative-zeros (first x)))
                   (if (and server-clock (not= Long/MIN_VALUE (Double/doubleToRawLongBits clock)))
                     (disj (second x) :recorded_at :retracted_at) (second x))
                   (and (instance? java.util.List x) (= :triplex/position (first x))) (shifted (second x))
                   (and (instance? java.util.List x) (= :triplex/double-position (first x))) (double (shifted (second x)))
                   (and (instance? java.util.List x) (= :triplex/row (first x)))
                   (let [[_ text p offset kind packed] x]
                     (if packed
                       (do
                         (when-not server-clock (throw (ex-info "Packed row requires server clock" {})))
                         (let [clock-text (Double/toString (double clock))
                               fill #(apply str (interpose clock-text %))]
                           (str text (if (= p provisional) final-digits (digits (shifted p)))
                                (if (map? packed)
                                  (str (fill (:before packed))
                                       (json/write-str (assign-change (:change packed) clock new-id-set @prior-rows))
                                       (fill (:after packed)))
                                  (fill packed)))))
                       (let [text (if (and (not= 0 delta) (< lower p (inc provisional)))
                                    (str (subs text 0 offset) (if (= p provisional) final-digits (digits (shifted p)))
                                         (subs text (+ offset 16))) text)
                             assigned (if-not server-clock text
                                      (case kind
                                        :row (assign-row text offset clock new-id-set @prior-rows)
                                        :retirement (str (subs text 0 (+ offset 16))
                                                         (format "%016x" (Double/doubleToRawLongBits clock))
                                                         (subs text (+ offset 32)))
                                        text))]
                         (if (and slim-row (= kind :row)) (slim-row-code assigned offset) assigned))))
                   (instance? java.util.Map x) (into {} (map (fn [[k v]] [k (replace-value v)]) x))
                   (instance? java.util.List x) (mapv replace-value x)
                   :else x))]
         (let [empty-history (when (and lean (:identity-bounds payload))
                               (let [empty? (history-range-code db ops (:identity-bounds payload))]
                                 (record-range-result empty?) empty?))
               prepared
               (mapcat (fn [op]
                         (cond
                           (= :triplex/assert (first op))
                           (let [[_ entity a text] op raw (second text)
                                 id (subs raw 5 (+ 5 (Integer/parseInt raw 1 5 16)))]
                             (when (or (and (not empty-history) (identity-row id))
                                       (and has-packed (packed-identity-code db id)))
                               (throw (ex-info "TRIPLEX_IDENTITY f/id" {})))
                             [(replace-value [:db/add entity a text])])
                           (= :triplex/retracted-zero (first op))
                           (if (and server-clock (not= Long/MIN_VALUE (Double/doubleToRawLongBits clock)))
                             [] [[:db/add (second op) :f/negative-zero :retracted_at]])
                           (= :triplex/retract (first op))
                           (let [[_ entity id] op e (choose-read (d/entid db [:triplex.entity/id entity]) (owner-eid entity))
                                 suffix (str (format "%04x" (.length ^String id)) id)
                                 ;; [DX-B5-L1] Why: a hot subject's other rows must not make stamp retirement linear.
                                 ;; Rejected: scanning every row on the touched entity; legacy retains its original path.
                                 text (if lean
                                        (let [prefix (str "2" suffix) datom (choose-read (read-at :w1/retract (first (d/seek-datoms db :eavt e row-a prefix)))
                                          (let [seen (get @checked id)] (if (and seen (= e (:e seen))) seen
                                            (read-at :w1/retract (first (d/seek-datoms db :eavt e row-a prefix))))))]
                                          (when (and datom (= e (:e datom)) (= row-a (:a datom))
                                                     (.startsWith ^String (:v datom) prefix)) (:v datom)))
                                        (some (fn [datom]
                                                (let [v (:v datom)]
                                                  (when (and (= e (:e datom)) (= row-a (:a datom))
                                                             (or (.startsWith ^String v (str "2" suffix))
                                                                 (.startsWith ^String v (str "1" suffix)))) v)))
                                              (d/datoms db :eavt e row-a)))]
                             (when (and (nil? text) (not (value e :triplex.entity/row-overflow)))
                               (throw (ex-info "Missing live row datom" {})))
                             (if text [[:db/retract e :triplex.entity/row text]] []))
                           :else [(replace-value op)])) ops)
               prepared (if (and merge-ledger packed-journal)
                          (let [ops (vec prepared)]
                            (try (packed-encode-code ops packed-journal) (catch Exception _ ops)))
                          prepared)
               packed-written (and merge-ledger packed-journal
                                   (= :triplex.journal/packed (nth (peek prepared) 2 nil)))

               ;; [DX-R3] Why: one physical commit can span feed pages; its journals cannot close then regress a cut.
               ;; Rejected: checking only the previous physical maximum (misses mixed clocks inside this commit).
               _ (when (and strict-clocks (not server-clock) (seq checked-times) (some #(not (== (double (first checked-times)) (double %))) checked-times))
                   (throw (ex-info "Strict scopes require one record clock per commit" {})))
               maximum (if server-clock clock (if (seq checked-times) (reduce max (or prior (first checked-times)) checked-times) (when head-v2 prior)))
               _ (when (and (not server-clock) (or replay-safe strict-clocks) prior (some #(<= % prior) checked-times))
                   (throw (ex-info (str "TRIPLEX_CLOCK " prior) {:maximum prior})))
               irregular (or irregular
                             (and (not server-clock) (seq times)
                                  (or (some #(not= (first times) %) times)
                                      (and prior (some #(< % prior) times)))))]
           (vec (concat prepared
                        (when (and packed-written (not has-packed))
                          [[:db/add scope :triplex.scope/packed-journals true]])
                        (when-not head-v2 [[:db/add scope :triplex.scope/position final]])
                        ;; [DX-B8] Why: carry the prefix maximum even for commits without row timestamps.
                        ;; Rejected: reading scope/max-recorded-at (the second hot cardinality-one datom).
                        (when maximum
                          (concat (when-not head-v2 [[:db/add scope :triplex.scope/max-recorded-at maximum]])
                                  [[:db/add "datomic.tx" :triplex.tx/max-recorded-at maximum]]))
                        ;; [DX-B4-T1] Why: append-only eligibility is decided at the serial point, including a lagging optimistic peer.
                        ;; Rejected: trusting a pre-transaction entity-absence observation.
                        (when journal-exists
                          [[:db/add scope :triplex.scope/feed-irregular true]])
                        (when irregular [[:db/add scope :triplex.scope/irregular true]])
                        (when position-irregular [[:db/add scope :triplex.scope/position-regular false]])))))))))
 ;; [DX-T1-4] Why: the authored transaction function is observable even though Datomic's surrounding pipeline is closed.
;; Rejected: native DEBUG logs on the serial path, or requiring a tracing namespace on ordinary transactors.
(defn instrument-code [operation]
  (list 'let '[triplex-trace-event
               (try (when (and (:triplex-trace payload) (find-ns 'triplex.gateway.jfr))
                      (when-let [start (ns-resolve 'triplex.gateway.jfr 'start-transaction!)]
                        (start (:triplex-trace payload))))
                    (catch Throwable _ nil))]
        (list 'try operation
              '(finally (when triplex-trace-event
                          (try (.commit triplex-trace-event) (catch Throwable _ nil)))))))
;; [DX-T1-8] Why: embed the exact codec in the installed function hash; the transactor needs no gateway namespace.
;; Rejected: an unversioned remote helper or compressing before server clock assignment.
(defn expand-code
  ([observe] (expand-code observe false false))
  ([observe optimized? measured?]
   (let [expanded (walk/postwalk-replace {'slim-row-code slim/encoder-code 'history-range-code history-range-code
                                          'save-ledger-code ledger/rewrite-code
                                          'packed-identity-code packed/identity-code
                                          'packed-encode-code packed/compiled-encode
                                          'lean-columns-code slim/row-columns-code
                                          'record-range-result observe} operation-code)
         op (if optimized? (list pred/normalization expanded) expanded)]
     (pred/expand (list 'read-at :w1/function op) optimized? measured?))))
(def observe-range
  '(fn [result] (when triplex-trace-event
                  (try (.set triplex-trace-event 3 (cond (true? result) "empty" (false? result) "occupied" :else "ineligible"))
                       (catch Throwable _ nil)))))
(def code (instrument-code (expand-code observe-range)))
(def variants
  (into {} (for [[opt profile] [[true false] [false true] [true true]]
                 :let [body (instrument-code (expand-code observe-range opt profile))]]
             [[opt profile] [(keyword "triplex.write" (str "v-" (subs (schema/sha256 (pr-str body)) 0 24))) body]])))
(defn entry [db input lean]
  (let [opt (boolean (and lean (if (and pred/diagnostic (contains? input "predecessorLookup"))
                                 (true? (get input "predecessorLookup")) pred/enabled)))
        profile (boolean (and pred/diagnostic (true? (get input "readProfile"))))
        ident (first (variants [opt profile]))]
    ;; [DX-W1] Why: an existing scope can receive a save before it is reopened to install the option.
    ;; Rejected: failing healthy writes on rollout or recording an unprofiled write as an attribution sample.
    (cond (and ident (d/entid db ident)) ident
          profile (throw (ex-info "Read attribution function is not installed in this scope" {:code "ReadProfileUnavailable" :status 409}))
          :else :triplex/commit)))
(def source-hash (schema/sha256 (pr-str code)))
(defn install-base!
  ([conn scope] (install-base! conn scope (d/db conn)))
  ([conn scope observed]
   (let [entity (d/entid observed [:triplex.scope/key scope])]
     (if (= source-hash (:v (first (d/datoms observed :eavt entity :triplex.scope/commit-fn-hash))))
       observed
       (:db-after
        (trace/span "d/transact" "peer-wait"
          @(d/transact conn [{:db/ident :triplex/commit
                             :db/fn (d/function {:lang :clojure :params '[db payload]
                                                :requires '[[datomic.api :as d] [clojure.data.json :as json]] :code code})}
                            [:db/add entity :triplex.scope/commit-fn-hash source-hash]])))))))

(defn install!
  ([conn scope] (install! conn scope (d/db conn)))
  ([conn scope observed]
   (let [db (install-base! conn scope observed)
         ops (for [[[opt profile] [ident body]] variants
                   :when (and (or pred/diagnostic (and pred/enabled opt (not profile))) (not (d/entid db ident)))]
               {:db/ident ident :db/fn (d/function {:lang :clojure :params '[db payload]
                 :requires (cond-> '[[datomic.api :as d] [clojure.data.json :as json]] profile (conj '[datomic.measure.io-stats]))
                 :code body})})]
     (if (seq ops) (:db-after @(d/transact conn (vec ops))) db))))
