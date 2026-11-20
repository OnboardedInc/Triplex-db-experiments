(ns triplex.gateway.subject-save
  (:require [clojure.walk :as walk]
            [datomic.api :as d]
            [triplex.gateway.commit :as commit]
            [triplex.gateway.group-prepare :as prepared]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.schema :as schema]
            [triplex.gateway.small-row :as small-row]
            [triplex.gateway.scope :as scope]))

(def enabled (= "1" (System/getenv "TX2_SUBJECT_SAVE")))
(def numeric-owner? (= "1" (System/getenv "TX2_SUBJECT_NUMERIC_OWNER")))
(def prefetch? (= "1" (System/getenv "TX2_SUBJECT_PREFETCH")))
(def ordered-ids? (= "1" (System/getenv "TX2_SUBJECT_ORDERED_IDS")))
(def erase-generation :triplex.scope/erasure-seq)
(def mutable-flags #{:triplex.scope/feed-irregular :triplex.scope/position-regular
                     :triplex.scope/irregular :triplex.scope/packed-journals})

;; [DX-PREP1] Why: owner CAS protects predecessor bytes, but an assertion identity is global, including retired rows.
;; Rejected: owner revision or a present-only index for new IDs (another owner can consume the ID).
(def history-guard
  '(let [history (d/history db)
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
      (throw (ex-info "TRIPLEX_SUBJECT_REPLAN" {})))))

;; [DX-PREP1] Why: one containing interval proves global absence for the whole ordered save.
;; Rejected: skipping history (another owner may have used a supplied ID) or rejecting unrelated IDs in the interval.
(def ordered-history-guard
  (walk/postwalk-replace {'legacy-check history-guard}
    '(if-let [[start end] (:ordered-bounds plan)]
       (let [wanted (set prefixes) width (count start)]
         (loop [rows (seq (d/index-range (d/history db) :triplex.entity/row start end)) inspected 0]
           (when-let [datom (first rows)]
             (if (= inspected 128)
               legacy-check
               (let [^String text (:v datom)]
                 (when (and (>= (.length text) width) (contains? wanted (subs text 0 width)))
                   (throw (ex-info "TRIPLEX_SUBJECT_REPLAN" {})))
                 (recur (next rows) (inc inspected)))))))
       legacy-check)))

(defn ordered-bounds [journal prefixes]
  (when-let [[_ token] (re-matches #"_tx/([0-7][0-9A-HJKMNP-TV-Z]{25})" journal)]
    (let [base (str "2001c" token) n (count prefixes)]
      (when (and (<= 1 n 256)
                 (= prefixes (mapv #(str base (.charAt "0123456789ABCDEF" (quot % 16))
                                                (.charAt "0123456789ABCDEF" (rem % 16))) (range n))))
        (let [hi (peek prefixes)]
          [(first prefixes) (str (subs hi 0 (dec (count hi))) (char (inc (int (last hi)))))])))))

(def body
  '(let [{:keys [scope flags function owner revision journal operation command ops provisional
                 submitted-clock prefixes]} plan
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
               owner-witness-check
               (not= installed-at (:tx (first (d/datoms db :eavt (d/entid db ident) :db/fn))))
               (when-let [a (d/entid db :triplex.scope/erasure-ledger)] (value scope a))
               (seq (d/datoms db :aevt :db/excise)))
       (throw (ex-info "TRIPLEX_CONFLICT" {:triplex.subject/stale true})))
     (when (or (seq changed) (d/entid db [:triplex.entity/id journal]))
       (throw (ex-info "TRIPLEX_SUBJECT_REPLAN" {})))
     check-history
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
  (walk/postwalk-replace {'stamp-rows commit/compiled-stamp-code
                          'mutable-flags mutable-flags
                          'check-history (if ordered-ids? ordered-history-guard history-guard)
                          ;; [DX-PREP1] Why: the numeric owner must still own this public ID in db-before.
                          ;; Rejected: trusting the peer's lookup alone (an ID change can leave its revision intact).
                          'owner-witness-check (when numeric-owner?
                                                 '(not= (:owner-key plan) (value owner :triplex.entity/id)))}
                         body))
(def source-hash (schema/sha256 (pr-str code)))
(def ident (keyword "triplex.subject" (str "v-" (subs source-hash 0 24))))

;; [DX-PREP1] Why: capture the two dominant segment keys without evaluating or stamping a command again.
;; Rejected: speculative apply of the whole save (duplicates normalization and produces an unused draft).
(def prefetch-code
  (walk/postwalk-replace {'check-history history-guard}
    '(do (first (d/datoms db :eavt owner :triplex.entity/rev))
         check-history
         [])))
(def prefetch-ident
  (keyword "triplex.subject" (str "prefetch-" (subs (schema/sha256 (pr-str prefetch-code)) 0 24))))

(defn installed [db]
  (when-let [eid (d/entid db ident)]
    (:tx (first (d/datoms db :eavt eid :db/fn)))))

(defn install! [conn db]
  (if-not enabled
    db
    (let [missing (cond-> []
                    (not (d/entid db erase-generation))
                    (conj (schema/attr erase-generation :db.type/long))
                    (not (installed db))
                    (conj {:db/ident ident :db/fn (d/function
                      {:lang :clojure :params '[db plan] :requires '[[datomic.api :as d] [clojure.data.json :as json]]
                       :code code})})
                    (and prefetch? (not (d/entid db prefetch-ident)))
                    (conj {:db/ident prefetch-ident :db/fn (d/function
                      {:lang :clojure :params '[db owner prefixes] :requires '[[datomic.api :as d]]
                       :code prefetch-code})}))]
      (if (seq missing) (:db-after @(d/transact conn missing)) db))))

(defn lookup-hints [db {:keys [owner prefixes]}]
  (:hints (d/with db [[prefetch-ident owner prefixes]] :return-hints true)))

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
  (let [temp-owner (str "e:" subject)
        prior-rows (into {} (map (fn [[id text]] [id (commit/recorded-row text)])) prior)
        rewrite #(commit/rewrite-change %1 %2 new-ids prior-rows)]
    (into []
      (keep (fn [op]
              (cond
                ;; [DX-PREP1] Why: business rows can use the existing number guarded by identity and revision.
                ;; Rejected: resolving a unique upsert again inside Datomic. The new journal still uses its tempid.
                (and numeric-owner? (map? op) (= temp-owner (:db/id op)) (= subject (:triplex.entity/id op))) nil
                (and (vector? op) (= :triplex/assert (first op)))
                (let [[_ eid attr [tag text position offset kind]] op]
                  [:db/add (if (and numeric-owner? (= eid temp-owner)) owner eid)
                   attr [tag (subs text 0 offset) position offset kind
                                     (small-row/ordinary-plan text offset rewrite)]])
                (and (vector? op) (= :triplex/retract (first op)))
                [:db/retract owner :triplex.entity/row (prior (nth op 2))]
                (and (vector? op) (= :triplex.entity/rev (nth op 2)) (= temp-owner (second op))) nil
                :else op)))
      ops)))

(defn plan [db [[commit-ident p]] input]
  (let [{:keys [scope source entities live ops new-ids times record-clocks journal-entities provisional]} p
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
               (<= (count ops) 256) (every? prepared/small-op? ops))
      (let [fn-tx (installed db) flags (when fn-tx (scope-witness db scope)) f (into {} flags)
            owner (d/entid db [:triplex.entity/id subject]) revision (when owner (scope/value db owner :triplex.entity/rev))
            asserted (filterv #(and (vector? %) (= :triplex/assert (first %))) ops)
            retired (filterv #(and (vector? %) (= :triplex/retract (first %))) ops)
            business (filterv #(= (str "e:" subject) (second %)) asserted)
            claim (first (:command-ids p)) clocks (concat times record-clocks)
            op-header (first ops)]
        (when (and fn-tx (some? (:triplex.scope/key f))
                   (= schema/schema-hash (:triplex.scope/schema-hash f))
                   (= commit/source-hash (:triplex.scope/commit-fn-hash f))
                   (= 3 (:triplex.scope/rows-version f)) (= 2 (:triplex.scope/head-version f))
                   (= true (:triplex.scope/strict-record-clocks f)) (= true (:triplex.scope/position-regular f))
                   (= 2 (:triplex.scope/feed-version f))
                   (not-any? f [:triplex.scope/feed-irregular :triplex.scope/irregular :triplex.scope/packed-journals])
                   (not (:triplex.scope/erasure-ledger f))
                   (not (seq (d/datoms db :aevt :db/excise)))
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
                       (= before after) (not (contains? before nil)))
              (let [prefixes (vec (sort (map lean/prefix new-ids)))]
                (cond-> {:scope scope :flags flags :function [ident fn-tx] :owner owner :revision revision
                         :journal journal :operation (:triplex.tx/operation-id op-header) :command claim
                         :provisional provisional :submitted-clock (reduce max (map double clocks))
                         :prefixes prefixes
                         :ops (render-ops ops owner subject prior (set new-ids))}
                  numeric-owner? (assoc :owner-key subject)
                  ordered-ids? (assoc :ordered-bounds (ordered-bounds journal prefixes)))))))))))

(defn replan? [failure]
  (some (fn [cause]
          (and (instance? clojure.lang.ExceptionInfo cause) (= "TRIPLEX_SUBJECT_REPLAN" (ex-message cause))))
        (take-while some? (iterate ex-cause failure))))

(defn retry-safe? [db plan]
  (let [durable-flags #(remove (comp mutable-flags first) %)]
    (and (= (durable-flags (:flags plan)) (durable-flags (scope-witness db (:scope plan))))
         (= (second (:function plan)) (installed db))
         (not (seq (d/datoms db :aevt :db/excise))))))

(defn verify-report [report {:keys [operation command journal owner ordered-bounds]}]
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
    (cond-> (assoc report :subject-save (str ident))
      ordered-bounds (assoc :subject-ordered-ids true))))
