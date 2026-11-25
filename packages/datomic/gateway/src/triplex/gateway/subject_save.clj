(ns triplex.gateway.subject-save
  (:require [clojure.walk :as walk]
            [datomic.api :as d]
            [triplex.gateway.commit :as commit]
            [triplex.gateway.envelope :as envelope]
            [triplex.gateway.group-prepare :as prepared]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.schema :as schema]
            [triplex.gateway.small-row :as small-row]
            [triplex.gateway.scope :as scope]
            [triplex.gateway.trace :as trace]))

(def enabled (= "1" (System/getenv "TX2_SUBJECT_SAVE")))
(def numeric-owner? (= "1" (System/getenv "TX2_SUBJECT_NUMERIC_OWNER")))
(def prefetch? (= "1" (System/getenv "TX2_SUBJECT_PREFETCH")))
(def ordered-ids? (= "1" (System/getenv "TX2_SUBJECT_ORDERED_IDS")))
(def narrow-revision? (and numeric-owner? (= "1" (System/getenv "TX2_SUBJECT_NARROW_REVISION"))))
(def reuse-predecessor? (= "1" (System/getenv "TX2_SUBJECT_REUSE_PREDECESSOR")))
(def append-retirement? (and numeric-owner? (= "1" (System/getenv "TX2_SUBJECT_APPEND_RETIREMENT"))))
(def owner-head? (and enabled numeric-owner? (= "1" (System/getenv "TX2_SUBJECT_OWNER_HEAD"))))
;; [Opus W2] Why: one commit per form save carries 6 facts at the median and up to about 120, with first writes and
;; retirements; the native function has no size or shape dependency, only this plan's eligibility did.
;; Rejected: a second native function (more moving parts) and an unbounded save (one commit would hold the serial point).
(def wide? (and enabled (= "1" (System/getenv "TX2_SUBJECT_WIDE"))))
(def wide-facts 128)
(def wide-ops 1024)
;; [Opus W1] Why: the covering writer reads the plain plan's retractions; it writes its own markers on the version.
(def ^:dynamic *covering* false)
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

(defn- block-bounds [prefixes]
  (let [hi (peek prefixes)]
    [(first prefixes) (str (subs hi 0 (dec (count hi))) (char (inc (int (last hi)))))]))

(defn ordered-bounds [journal prefixes]
  (or
    (when-let [[_ token] (re-matches #"_tx/([0-7][0-9A-HJKMNP-TV-Z]{23})00" journal)]
      (let [base (str "2001a" token) n (count prefixes)]
        (when (and (<= 1 n 256)
                   (= prefixes (mapv #(str base (.charAt "0123456789ABCDEF" (quot % 16))
                                                  (.charAt "0123456789ABCDEF" (rem % 16))) (range n))))
          (block-bounds prefixes))))
    ;; [Opus W2] Why: a 23-character token with a three-hex-digit ordinal keeps the 26-character TripleId and numbers
    ;; 4,096 assertions; its journal "_tx/<token>W00" cannot match a one-byte block (W is not a hex digit).
    ;; Rejected: a 27-character ID (the core TripleId brand drops it) and base-32 ordinals (they would not sort with old blocks).
    (when wide?
      (when-let [[_ token] (re-matches #"_tx/([0-7][0-9A-HJKMNP-TV-Z]{22})W00" journal)]
        (let [base (str "2001a" token) n (count prefixes)]
          (when (and (<= 1 n 4096) (= prefixes (mapv #(str base (format "%03X" %)) (range n))))
            (block-bounds prefixes)))))))

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
               owner-witness-check
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
         (into head-update
               (map stamp) ops)))))

(defn compile-code [layout-update]
  (walk/postwalk
    (fn [node]
      (if (and (seq? node) (= 'changes-application-rows? (first node)))
        (macroexpand-1 (cons `changes-application-rows? (rest node)))
        node))
    (walk/postwalk-replace {'stamp-rows commit/compiled-stamp-code
                          'mutable-flags mutable-flags
                          'check-history (if ordered-ids? ordered-history-guard history-guard)
                          ;; [DX-W1] Why: this standalone native function can check the same db-before revision
                          ;; through the revision attribute's narrow index. Rejected: trusting the gateway's old revision.
                          'revision-update (if narrow-revision?
                                             '(let [datom (first (d/datoms db :aevt :triplex.entity/rev owner))]
                                                (when-not (= revision (:v datom))
                                                  (throw (ex-info "TRIPLEX_CONFLICT" {})))
                                                [:db/add owner :triplex.entity/rev final])
                                             '[:db/cas owner :triplex.entity/rev revision final])
                          ;; [DX-PREP1] Why: the numeric owner must still own this public ID in db-before.
                          ;; Rejected: trusting the peer's lookup alone (an ID change can leave its revision intact).
                          'owner-witness-check (when numeric-owner?
                                                 '(not= (:owner-key plan) (value owner :triplex.entity/id)))}
                         (walk/postwalk-replace
                           ;; [Opus W1] Why: TX2_SUBJECT_OWNER_HEAD=1 now selects the covering root writer (owner-layout).
                           ;; Rejected: keeping the step 1 witness beside it (it saved no reads and cost a record per save).
                           {'head-update (or layout-update
                                           '[revision-update [:db/add "datomic.tx" :triplex.tx/max-recorded-at clock]])}
                           body))))
(def code (compile-code nil))
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

(defn decode-predecessors [prior]
  (into {} (map (fn [[id text]] [id (commit/recorded-row text)])) prior))

(defn retirement-text [prefix position clock journal]
  (str prefix (format "%016d" position)
       (format "%016x" (Double/doubleToRawLongBits (double clock))) journal))

(defn render-ops [ops owner subject prior prior-rows new-ids marker]
  (let [temp-owner (str "e:" subject)
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
                (if marker
                  (let [[position journal] marker
                        prefix (lean/prefix (nth op 2))]
                    ;; [DX-W1] Why: the serial revision checks the certified predecessor while an exact cut marker records its retirement.
                    ;; Rejected: asking Datomic to re-find the old row solely to physically retract it.
                    [:db/add owner :triplex.entity/retired
                     [:triplex/row (retirement-text prefix position 0.0 journal)
                      position (count prefix) :retirement]])
                  [:db/retract owner :triplex.entity/row (prior (nth op 2))])
                (and (vector? op) (= :triplex.entity/rev (nth op 2)) (= temp-owner (second op))) nil
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

(defn- plan-with-erasure [db [[commit-ident p]] input expected-erasure predecessor revision-at]
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
               ;; [Opus W2] Why: an ordered import frame must find its predecessor claim at the serial point, which only
               ;; the general writer checks; a wide frame of one subject could otherwise qualify. Rejected: changing the
               ;; narrow rule here (the option stays default-off and leaves today's plans byte for byte).
               (not (and wide? (:import-predecessor p)))
               (<= (count ops) (if wide? wide-ops 256))
               (every? #(or (prepared/small-op? %) (and (some? expected-erasure) (envelope-op? %))) ops))
      (let [[fn-tx flags owner revision]
            (trace/span "subject.plan-witnesses" "gateway"
              (let [fn-tx (installed db) flags (when fn-tx (scope-witness db scope))
                    owner (d/entid db [:triplex.entity/id subject])]
                [fn-tx flags owner (when owner (revision-at db owner))]))
            f (into {} flags)
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
                   (if wide?
                     ;; [Opus W2] Why: first writes and retirements are the same native work as replacements; the
                     ;; revision compare-and-set covers every predecessor the gateway read. Rejected: unbounded saves.
                     (and (<= (count business) wide-facts) (<= (count retired) wide-facts)
                          (pos? (+ (count business) (count retired))) (= (count retired) (count live)))
                     (and (<= 1 (count business) 3) (= (count business) (count retired) (count live))))
                   (= (set live) (into #{} (map #(nth % 2)) retired)) (every? #(= subject (second %)) retired)
                   (= (count asserted) (count new-ids)) (= (set new-ids) (into #{} (map prepared/row-id) asserted))
                   (every? #(= 5 (count (nth % 3))) asserted)
                   (seq clocks) (every? #(and (number? %) (Double/isFinite (double %))) clocks))
          (let [prior (trace/span "subject.plan-predecessors" "gateway"
                        (into {} (keep (fn [id] (when-let [text (predecessor db owner id)] [id text]))) live))
                ;; [DX-W1] Why: the journal already needs exact typed predecessor values.
                ;; Rejected: decoding the same physical text again to validate the field.
                decoded (when reuse-predecessor?
                          (try (decode-predecessors prior) (catch Exception _ nil)))
                before (if decoded
                         (into #{} (map #(field {:attribute (get % "attribute")
                                                :entity_type (get % "entityType")
                                                :value_type (get-in % ["value" "type"])})) (vals decoded))
                         (into #{} (map (comp field lean/decode)) (vals prior)))
                after (into #{} (map (comp field lean/decode second #(nth % 3))) business)]
            (when (and (if wide?
                         ;; [Opus W2] Why: plain fields on each side; a field may be replaced, first written or retired.
                         ;; Rejected: references and system attributes (they widen the read set).
                         ;; [DX-S2] Why: a save "from now on" keeps the old value true until now as a bounded row, so it
                         ;; asserts two rows of one field (the bounded old value and the new one); every predecessor
                         ;; is still read here and covered by the revision compare-and-set, and nothing below or in
                         ;; the native function is keyed by field. Rejected: W2's distinct-field count on each side,
                         ;; which sent every such product save to the general writer.
                         (and (= (count live) (count prior))
                              (not (contains? after nil)))
                         (and (= (count live) (count prior) (count before) (count after)) (= before after)))
                       (not (contains? before nil))
                       ;; [DX-ERASE1] Why: encrypted bodies must belong to these same fresh owner rows.
                       ;; Rejected: accepting any secondary entity map in a per-person frame.
                       (or (empty? envelopes)
                           (let [by-id (into {} (map (juxt :id identity)
                                                  (map (comp lean/decode second #(nth % 3)) business)))]
                             (and (= (count envelopes) (count (set (map :triplex.private/id envelopes))))
                                  (every? #(envelope-for? subject by-id %) envelopes)))))
              (let [prefixes (vec (sort (map lean/prefix new-ids)))
                    mark? (and append-retirement? (not *covering*) (nil? expected-erasure) (empty? envelopes)
                               (not-any? #(and (vector? %) (= :triplex.entity/retired (nth % 2 nil))) ops))]
                (cond-> {:scope scope :flags flags :function [ident fn-tx] :owner owner :revision revision
                         :journal journal :operation (:triplex.tx/operation-id op-header) :command claim
                         :provisional provisional :submitted-clock (reduce max (map double clocks))
                         :prefixes prefixes
                         :expected-erasure expected-erasure
                         :ops (trace/span "subject.plan-render" "gateway"
                                (render-ops ops owner subject prior (or decoded (decode-predecessors prior)) (set new-ids)
                                  (when mark? [provisional journal])))}
                  mark? (assoc :retirement-prefixes (mapv lean/prefix live))
                  numeric-owner? (assoc :owner-key subject)
                  ordered-ids? (assoc :ordered-bounds (ordered-bounds journal prefixes)))))))))))

;; [DX-S6] F6: the S2 edit above removed one term of an `and`, so one generated name fewer, and every namespace loaded
;; after this one (the covering writer, the general hint function) embedded shifted names in its quoted code: 5 stored
;; values differed from the base (`23b7df344`). Taking back exactly that one name restores them (s4/idents.sh).
;; Rejected: hashing renamed code (changes every identity, options off included), and removing generated names from
;; the two functions' quoted code (changes both identities again, away from the base).
(gensym)

(defn plan
  ([db data input]
   (plan-with-erasure db data input nil retirement #(scope/value %1 %2 :triplex.entity/rev)))
  ([db data input expected-erasure]
   (plan-with-erasure db data input expected-erasure retirement #(scope/value %1 %2 :triplex.entity/rev)))
  ([db data input expected-erasure predecessor revision-at]
   (plan-with-erasure db data input expected-erasure predecessor revision-at)))

(defn replan? [failure]
  (some (fn [cause]
          (and (instance? clojure.lang.ExceptionInfo cause) (= "TRIPLEX_SUBJECT_REPLAN" (ex-message cause))))
        (take-while some? (iterate ex-cause failure))))

(defn retry-safe? [db plan]
  (let [durable-flags #(remove (comp mutable-flags first) %)]
    (and (= (durable-flags (:flags plan)) (durable-flags (scope-witness db (:scope plan))))
         (= (second (:function plan))
            (when-let [eid (d/entid db (first (:function plan)))] (:tx (first (d/datoms db :eavt eid :db/fn)))))
         (not (changes-application-rows? db)))))

(defn verify-report-at [report {:keys [operation command journal owner ordered-bounds retirement-prefixes]} revision-at]
  (let [db (:db-after report) t (d/basis-t db) tx (d/t->tx t)
        cmd (d/entid db [:triplex.claim/command-id command])
        journal-eid (d/entid db [:triplex.entity/id journal])
        position (scope/value db tx :triplex.tx/position)
        clock (scope/value db tx :triplex.tx/recorded-at)]
    ;; [DX-PREP1] Why: only the matching native report can acknowledge a prepared save.
    ;; Rejected: publishing the peer's draft, or resolving the receipt on a newer database value.
    (when-not (and (= operation (scope/value db tx :triplex.tx/operation-id))
                   (= journal (scope/value db tx :triplex.tx/id))
                   (integer? position) (= position (revision-at db owner))
                   (some? clock)
                   cmd (= tx (scope/value db cmd :triplex.claim/tx))
                   (= journal (scope/value db cmd :triplex.claim/tx-id))
                   journal-eid (= journal-eid (scope/value db tx :triplex.tx/journals))
                   (= position (scope/value db journal-eid :triplex.journal/position))
                   ;; [DX-W1] Why: a marker ACK must name the exact accepted owner, cut, clock and predecessor.
                   ;; Rejected: accepting the draft or seeking the old row again after commit.
                   (or (nil? retirement-prefixes)
                       (let [attr (d/entid db :triplex.entity/retired)
                             expected (set (map #(retirement-text % position clock journal) retirement-prefixes))
                             actual (into #{} (keep #(when (and (= attr (:a %)) (= owner (:e %))
                                                                       (:added %) (= tx (:tx %))) (:v %)))
                                          (:tx-data report))]
                         (= expected actual))))
      (throw (ex-info "Prepared subject receipt unavailable" {:status 503 :code "OutcomeUnknown"})))
    (cond-> (assoc report :subject-save (str ident))
      ordered-bounds (assoc :subject-ordered-ids true)
      retirement-prefixes (assoc :subject-append-retirement true))))

(defn verify-report [report plan]
  (verify-report-at report plan #(scope/value %1 %2 :triplex.entity/rev)))
