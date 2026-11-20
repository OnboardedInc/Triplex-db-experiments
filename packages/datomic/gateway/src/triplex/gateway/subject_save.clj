(ns triplex.gateway.subject-save
  (:require [clojure.walk :as walk]
            [datomic.api :as d]
            [triplex.gateway.commit :as commit]
            [triplex.gateway.envelope :as envelope]
            [triplex.gateway.group-prepare :as prepared]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.schema :as schema]
            [triplex.gateway.small-row :as small-row]
            [triplex.gateway.scope :as scope]))

(def enabled (= "1" (System/getenv "TX2_SUBJECT_SAVE")))
(def erase-generation :triplex.scope/erasure-seq)
(def mutable-flags #{:triplex.scope/feed-irregular :triplex.scope/position-regular
                     :triplex.scope/irregular :triplex.scope/packed-journals})

;; [DX-ERASE1] Why: the value body has its own entity, so removing just that attribute cannot change a prepared predecessor.
;; Rejected: assuming every native excision is either harmless or a reason to stop unrelated people.
(defmacro changes-application-rows? [view]
  `(let [db# ~view body# (d/entid db# :triplex.private/body)]
     (some (fn [datom#]
             (let [attrs# (mapv :v (d/datoms db# :eavt (:e datom#) :db.excise/attrs))]
               (not (and body# (= [body#] attrs#)))))
           (d/datoms db# :aevt :db/excise))))

;; The same expression is expanded in the installed native function below.
(def body
  '(let [{:keys [scope flags function owner revision journal operation command ops provisional
                 submitted-clock prefixes expected-erasure]} plan
         value (fn [e a] (:v (first (d/datoms db :eavt e a))))
         [ident installed-at] function
         changed (into #{} (keep (fn [[a v]] (when (not= v (value scope a)) a))) flags)]
     (when (d/entid db [:triplex.tx/operation-id operation])
       (throw (ex-info "TRIPLEX_OPERATION_DUPLICATE" {})))
     (when (d/entid db [:triplex.claim/command-id command])
       (throw (ex-info "TRIPLEX_COMMAND_DUPLICATE" {})))
     ;; [DX-PREP1] Why: excision can remove a predecessor without updating its owner revision.
     ;; Rejected: trusting even a recently synced peer after an erase has been requested.
     (when (or (some #(not (mutable-flags %)) changed)
               (not= installed-at (:tx (first (d/datoms db :eavt (d/entid db ident) :db/fn))))
               (let [seen (reduce (fn [out [a v]] (assoc out a v)) {} flags)]
                 (if (:triplex.scope/erasure-ledger seen)
                   (not (and (integer? expected-erasure)
                             (= expected-erasure (get seen :triplex.scope/erasure-seq))))
                   (some? expected-erasure)))
               (changes-application-rows? db))
       (throw (ex-info "TRIPLEX_CONFLICT" {:triplex.subject/stale true})))
     (when (or (seq changed) (d/entid db [:triplex.entity/id journal]))
       (throw (ex-info "TRIPLEX_SUBJECT_REPLAN" {})))
     ;; [DX-PREP1] Why: owner CAS protects predecessor bytes, but an assertion identity is global, including retired rows.
     ;; Rejected: owner revision or a present-only index for new IDs (another owner can consume the ID).
     (let [history (d/history db)
           lo (first prefixes) hi (last prefixes)
           empty-range (and (= (subs lo 0 5) (subs hi 0 5)) (< (int (last hi)) 127)
                            (let [end (str (subs hi 0 (dec (count hi))) (char (inc (int (last hi)))))]
                              (nil? (first (d/index-range history :triplex.entity/row lo end)))))]
       (when (and (not empty-range)
                  (some (fn [^String prefix]
                          (when-let [datom (first (d/index-range history :triplex.entity/row prefix nil))]
                            (.startsWith ^String (:v datom) prefix)))
                        prefixes))
         ;; The reference establishes error precedence if a predecessor also changed.
         (throw (ex-info "TRIPLEX_SUBJECT_REPLAN" {}))))
     (let [native-tx (d/t->tx (d/basis-t db))
           latest (if (value native-tx :triplex.tx/position)
                    native-tx
                    (let [datom (first (d/rseek-datoms db :aevt :triplex.tx/position native-tx))]
                      (when (= (:a datom) (d/entid db :triplex.tx/position)) (:e datom))))
           final (inc (or (when latest (value latest :triplex.tx/position)) 0))
           prior (when latest (value latest :triplex.tx/max-recorded-at))
           clock (double (if prior (max submitted-clock (+ (double prior) 1.0) (Math/nextUp (double prior)))
                             submitted-clock))]
       (when (> final 9007199254740991) (throw (ex-info "Invalid commit span" {})))
       (when-not (Double/isFinite clock) (throw (ex-info "TRIPLEX_CLOCK_EXHAUSTED" {})))
       (let [stamp (stamp-rows true clock #{} (dec provisional) provisional final false nil)]
         (into [[:db/cas owner :triplex.entity/rev revision final]
                [:db/add "datomic.tx" :triplex.tx/max-recorded-at clock]]
               (map stamp) ops)))))

(def code
  (walk/postwalk
    (fn [node]
      (if (and (seq? node) (= 'changes-application-rows? (first node)))
        (macroexpand-1 (cons `changes-application-rows? (rest node)))
        node))
    (walk/postwalk-replace {'stamp-rows commit/compiled-stamp-code 'mutable-flags mutable-flags} body)))
(def source-hash (schema/sha256 (pr-str code)))
(def ident (keyword "triplex.subject" (str "v-" (subs source-hash 0 24))))

(defn installed [db]
  (when-let [eid (d/entid db ident)]
    (:tx (first (d/datoms db :eavt eid :db/fn)))))

(defn install! [conn db]
  (if (and enabled (not (and (installed db) (d/entid db erase-generation))))
    (:db-after @(d/transact conn (cond-> []
      (not (d/entid db erase-generation)) (conj (schema/attr erase-generation :db.type/long))
      (not (installed db)) (conj {:db/ident ident :db/fn (d/function
        {:lang :clojure :params '[db plan] :requires '[[datomic.api :as d] [clojure.data.json :as json]]
         :code code})}))))
    db))

(defn scope-witness [db scope-id]
  (into (prepared/scope-flags db scope-id)
        (for [a [erase-generation :triplex.scope/erasure-ledger] :when (d/entid db a)]
          [a (scope/value db scope-id a)])))

(defn retirement [db owner id]
  (let [prefix (lean/prefix id)
        read-at (fn [a]
                  (let [datom (first (d/seek-datoms db :eavt owner a prefix))]
                    (when (and (= owner (:e datom)) (= (d/entid db a) (:a datom))
                               (.startsWith ^String (:v datom) prefix))
                      (:v datom))))]
    (when-not (read-at :triplex.entity/retired)
      (read-at :triplex.entity/row))))

(defn field [row]
  (when (and (not= "_Transaction" (:entity_type row))
             (not= "ref" (:value_type row))
             (string? (:attribute row)) (not (.startsWith ^String (:attribute row) ":_")))
    (:attribute row)))

(defn render-ops [ops owner subject prior new-ids]
  (let [prior-rows (into {} (map (fn [[id text]] [id (commit/recorded-row text)])) prior)
        rewrite #(commit/rewrite-change %1 %2 new-ids prior-rows)]
    (into []
      (keep (fn [op]
              (cond
                (and (vector? op) (= :triplex/assert (first op)))
                (let [[_ eid attr [tag text position offset kind]] op]
                  [:db/add eid attr [tag (subs text 0 offset) position offset kind
                                     (small-row/ordinary-plan text offset rewrite)]])
                (and (vector? op) (= :triplex/retract (first op)))
                [:db/retract owner :triplex.entity/row (prior (nth op 2))]
                (and (vector? op) (= :triplex.entity/rev (nth op 2)) (= (str "e:" subject) (second op))) nil
                :else op)))
      ops)))

(def ^:private envelope-fields
  #{:db/id :triplex.private/id :triplex.private/entity :triplex.private/attribute
    :triplex.private/validity :triplex.private/body})

(defn- envelope-op? [op]
  (and (map? op) (= envelope-fields (set (keys op)))))

(defn- envelope-for? [subject business op]
  (let [id (:triplex.private/id op) row (business id)]
    (and row (= subject (:triplex.private/entity op))
         (= subject (:entity_id row))
         (= (:attribute row) (:triplex.private/attribute op))
         (= (envelope/token id) (:value_string row))
         (= (str "protected:" id) (:db/id op))
         (some? (envelope/body-key-handle (:triplex.private/body op))))))

(defn- plan-with-erasure [db [[commit-ident p]] input expected-erasure]
  (let [{:keys [scope source entities live new-ids times record-clocks journal-entities provisional]} p
        redundant-fence [:db/cas scope erase-generation expected-erasure expected-erasure]
        matching (when (some? expected-erasure) (filter #{redundant-fence} (:ops p)))
        ops (if (some? expected-erasure) (vec (remove #{redundant-fence} (:ops p))) (:ops p))
        ids (into #{} (keep :triplex.entity/id) (filter map? ops))
        journal (first journal-entities)
        subject (first (disj ids journal))]
    ;; [DX-PREP1] Why: this certifies the canonical storage frame and the complete typed read set.
    ;; Rejected: inferring dependencies from the changed entity alone (absence, broad predicates and shared targets can race).
    (when (and (= 2 (count ids)) (ids journal) (= 1 (count journal-entities))
               (string? subject) (not= subject journal)
               (= #{subject} (set entities))
               (integer? source)
               (nil? (get input "clientId")) (not (true? (get input "readProfile")))
               (#{:triplex/commit (first (commit/variants [true false]))} commit-ident)
               (:lean p) (not (:slim-row p)) (= 1 (:span p)) (:assign-record-time p)
               (not-any? p [:scope-wide :position-irregular :irregular :save-ledger :packed-journal :bulk])
               (<= (count ops) 256)
               (every? #(or (prepared/small-op? %) (and (some? expected-erasure) (envelope-op? %))) ops))
      (let [fn-tx (installed db) flags (when fn-tx (scope-witness db scope)) f (into {} flags)
            owner (d/entid db [:triplex.entity/id subject]) revision (when owner (scope/value db owner :triplex.entity/rev))
            asserted (filterv #(and (vector? %) (= :triplex/assert (first %))) ops)
            retired (filterv #(and (vector? %) (= :triplex/retract (first %))) ops)
            business (filterv #(= (str "e:" subject) (second %)) asserted)
            claim (first (:command-ids p)) clocks (concat times record-clocks)
            op-header (first ops)
            envelopes (filter envelope-op? ops)]
        (when (and fn-tx (some? (:triplex.scope/key f))
                   (= schema/schema-hash (:triplex.scope/schema-hash f))
                   (= commit/source-hash (:triplex.scope/commit-fn-hash f))
                   (= 3 (:triplex.scope/rows-version f)) (= 2 (:triplex.scope/head-version f))
                   (= true (:triplex.scope/strict-record-clocks f)) (= true (:triplex.scope/position-regular f))
                   (= 2 (:triplex.scope/feed-version f))
                   (not-any? f [:triplex.scope/feed-irregular :triplex.scope/irregular :triplex.scope/packed-journals])
                   (if (some? expected-erasure)
                     (and (= 1 (count matching)) (:triplex.scope/erasure-ledger f)
                          (= expected-erasure (get f erase-generation)))
                     (not (:triplex.scope/erasure-ledger f)))
                   (not (changes-application-rows? db))
                   (not (d/entid db [:triplex.entity/id journal]))
                   (integer? revision) (<= revision source (scope/head-position db scope))
                   (= 1 (count (:command-ids p))) (string? claim)
                   (= journal (:triplex.tx/id op-header))
                   (string? (:triplex.tx/operation-id op-header))
                   (some #(= [:db/add "datomic.tx" :triplex.tx/journals (str "e:" journal)] %) ops)
                   (<= 1 (count business) 3) (= (count business) (count retired) (count live))
                   (= (set live) (into #{} (map #(nth % 2)) retired)) (every? #(= subject (second %)) retired)
                   (= (count asserted) (count new-ids)) (= (set new-ids) (into #{} (map prepared/row-id) asserted))
                   (every? #(= 5 (count (nth % 3))) asserted)
                   (seq clocks) (every? #(and (number? %) (Double/isFinite (double %))) clocks))
          (let [prior (into {} (keep (fn [id] (when-let [text (retirement db owner id)] [id text]))) live)
                before (into #{} (map (comp field lean/decode)) (vals prior))
                after (into #{} (map (comp field lean/decode second #(nth % 3))) business)]
            (when (and (= (count live) (count prior) (count before) (count after))
                       (= before after) (not (contains? before nil))
                       ;; [DX-ERASE1] Why: encrypted bodies must belong to these same fresh owner rows.
                       ;; Rejected: accepting any secondary entity map in a per-person frame.
                       (or (empty? envelopes)
                           (let [by-id (into {} (map (juxt :id identity)
                                                  (map (comp lean/decode second #(nth % 3)) business)))]
                             (and (= (count envelopes) (count (set (map :triplex.private/id envelopes))))
                                  (every? #(envelope-for? subject by-id %) envelopes)))))
              {:scope scope :flags flags :function [ident fn-tx] :owner owner :revision revision
               :journal journal :operation (:triplex.tx/operation-id op-header) :command claim
               :provisional provisional :submitted-clock (reduce max (map double clocks))
               :prefixes (vec (sort (map lean/prefix new-ids)))
               :expected-erasure expected-erasure
               :ops (render-ops ops owner subject prior (set new-ids))})))))))

(defn plan
  ([db data input] (plan-with-erasure db data input nil))
  ([db data input expected-erasure] (plan-with-erasure db data input expected-erasure)))

(defn replan? [failure]
  (some (fn [cause]
          (and (instance? clojure.lang.ExceptionInfo cause) (= "TRIPLEX_SUBJECT_REPLAN" (ex-message cause))))
        (take-while some? (iterate ex-cause failure))))

(defn retry-safe? [db plan]
  (let [durable-flags #(remove (comp mutable-flags first) %)]
    (and (= (durable-flags (:flags plan)) (durable-flags (scope-witness db (:scope plan))))
         (= (second (:function plan)) (installed db))
         (not (changes-application-rows? db)))))

(defn verify-report [report {:keys [operation command journal owner]}]
  (let [db (:db-after report) t (d/basis-t db) tx (d/t->tx t)
        cmd (d/entid db [:triplex.claim/command-id command])
        journal-eid (d/entid db [:triplex.entity/id journal])
        position (scope/value db tx :triplex.tx/position)]
    ;; [DX-PREP1] Why: only the matching native report can acknowledge a prepared save.
    ;; Rejected: publishing the peer's draft, or resolving the receipt on a newer database value.
    (when-not (and (= operation (scope/value db tx :triplex.tx/operation-id))
                   (= journal (scope/value db tx :triplex.tx/id))
                   (integer? position) (= position (scope/value db owner :triplex.entity/rev))
                   (some? (scope/value db tx :triplex.tx/recorded-at))
                   cmd (= tx (scope/value db cmd :triplex.claim/tx))
                   (= journal (scope/value db cmd :triplex.claim/tx-id))
                   journal-eid (= journal-eid (scope/value db tx :triplex.tx/journals))
                   (= position (scope/value db journal-eid :triplex.journal/position)))
      (throw (ex-info "Prepared subject receipt unavailable" {:status 503 :code "OutcomeUnknown"})))
    (assoc report :subject-save (str ident))))
