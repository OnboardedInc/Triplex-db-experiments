(ns triplex.gateway.subject-create
  "[DX-S4] One subject's save that creates an entity (a new enrolment of an existing subject, a new subject with its
  profile, a new owed form) or writes a reference value, on the per-subject writer, committing exactly what the general
  writer would commit. Default off: TX2_SUBJECT_CREATE=1, with TX2_SUBJECT_SAVE=1 and TX2_SUBJECT_WIDE=1, not beside
  TX2_SUBJECT_OWNER_HEAD=1. Design and gates: lab/experiments/EXP-DX1/s4/CREATION-SAVES.md."
  (:require [clojure.walk :as walk]
            [datomic.api :as d]
            [triplex.gateway.commit :as commit]
            [triplex.gateway.group-prepare :as prepared]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.privacy :as privacy]
            [triplex.gateway.schema :as schema]
            [triplex.gateway.scope :as scope]
            [triplex.gateway.subject-hints :as subject-hints]
            [triplex.gateway.subject-owners :as owners]
            [triplex.gateway.subject-save :as subject]
            [triplex.gateway.trace :as trace]
            [triplex.gateway.write-policy :as policy]))

;; [DX-S4] Why: this namespace is loaded after subject-owners (storage requires it last), so nothing here can move the
;; stored code or the generated names of any existing stored function; with the option off nothing is installed and
;; every existing function keeps its identity (s3/idents.sh, s4 settings, proves it).
;; Rejected: editing subject-save/body, compile-code or subject-owners (each would change an installed function's
;; identity on every scope).
(def requested (= "1" (System/getenv "TX2_SUBJECT_CREATE")))
(def enabled (and requested subject/enabled subject/wide? (not subject/owner-head?)))
(when (and requested (not enabled))
  (throw (IllegalStateException.
           "TX2_SUBJECT_CREATE=1 needs TX2_SUBJECT_SAVE=1 and TX2_SUBJECT_WIDE=1, and not TX2_SUBJECT_OWNER_HEAD=1")))
(def max-owners 4)

;; [DX-S4] Why: the general writer proves a new owner by its serial-point check of every entity the save names: an
;; entity that exists must have a revision at or before the save's source. The plan proved the owner absent on a
;; database value at or after the source, so any entity with that public ID at the serial point was created after the
;; source and the general writer would refuse; this function refuses it too (absent here, or CasConflict). Existing
;; owners get the several-owners writer's checks (public ID, revision compare-and-set). A new owner's revision is the
;; save's own stamped revision row, as the general writer writes it.
;; Rejected: an upsert without the absence check (two creations of one ID would merge silently where the general
;; writer refuses the second) and a check of the new rows only (another save may have created the entity with other
;; rows).
(def create-update
  (list 'into '[[:db/add "datomic.tx" :triplex.tx/max-recorded-at clock]]
        (list 'keep (list 'fn '[[o r k]]
                          (list 'if '(nil? o)
                                '(when (d/entid db [:triplex.entity/id k])
                                   (throw (ex-info "TRIPLEX_CONFLICT" {:triplex.subject/created true})))
                                (list 'do
                                      '(when (and k (not= k (value o :triplex.entity/id)))
                                         (throw (ex-info "TRIPLEX_CONFLICT" {:triplex.subject/stale true})))
                                      (if subject/narrow-revision?
                                        '(let [datom (first (d/datoms db :aevt :triplex.entity/rev o))]
                                           (when-not (= r (:v datom)) (throw (ex-info "TRIPLEX_CONFLICT" {})))
                                           [:db/add o :triplex.entity/rev final])
                                        '[:db/cas o :triplex.entity/rev r final]))))
              '(:owners plan))))
;; [DX-S4] Why: the one-owner body's owner witness reads the first owner's public ID; a save whose owners are all new
;; has no first existing owner, and create-update checks every existing owner's public ID anyway.
;; Rejected: a placeholder owner (a read of an unrelated entity at the serial point).
(def code (walk/postwalk-replace
            {'(not= (:owner-key plan) (value owner :triplex.entity/id)) false}
            (subject/compile-code create-update)))
(def source-hash (schema/sha256 (pr-str code)))
(def ident (keyword "triplex.subject" (str "create-" (subs source-hash 0 24))))

;; [DX-S4] Why: a removal on request that names a subject being created matches no row, so it must be recorded as the
;; families it names (DX-IMP2's record), or the creation's resend would bring the removed value back.
(defn record-families? [] (boolean (or policy/import-whole? enabled)))

(defn removed-creation?
  "[DX-S4] With the option on: does this new row write a removed (entity, attribute) family onto an entity that does
  not exist yet? Such a creation was framed before the removal (the removal named an entity with no rows), so it is
  refused whole (ErasureReplayDeclined) on every writer, as an import of a removed family is."
  [state row]
  (boolean (and enabled state ((:families state) [(:entity_id row) (:attribute row)])
                privacy/*data* (nil? (d/entid privacy/*data* [:triplex.entity/id (:entity_id row)])))))

(defn installed [db]
  (when-let [eid (d/entid db ident)]
    (:tx (first (d/datoms db :eavt eid :db/fn)))))

(defn install! [conn db]
  (if (or (not enabled) (installed db))
    db
    (:db-after @(d/transact conn [{:db/ident ident :db/fn (d/function
                                    {:lang :clojure :params '[db plan]
                                     :requires '[[datomic.api :as d] [clojure.data.json :as json]] :code code})}]))))

;; [DX-S4] A plain or reference value on an application attribute (not a journal row, not a `:_` attribute).
;; Why: in the lean layout a reference is the target's public ID inside the row text; the general writer neither reads
;; nor writes the target, so the read set is the save's owners either way. Rejected: reading the target (a read the
;; general writer does not make).
(defn- value-field [row]
  (when (and (not= "_Transaction" (:entity_type row))
             (string? (:attribute row)) (not (.startsWith ^String (:attribute row) ":_")))
    (:attribute row)))

(defn- decline [reason] {:declined reason})

(defn plan
  "A plan for the creation function, {:declined reason} for a creation (or reference) save it refuses (the general
  writer takes it), or nil for a save that creates nothing and writes no reference."
  ([db data input expected-erasure]
   (plan db data input expected-erasure subject/retirement #(scope/value %1 %2 :triplex.entity/rev)))
  ([db [[commit-ident p]] input expected-erasure predecessor revision-at]
   (let [{:keys [scope source entities live new-ids times record-clocks journal-entities provisional]} p
         fence [:db/cas scope subject/erase-generation expected-erasure expected-erasure]
         matching (when (some? expected-erasure) (filter #{fence} (:ops p)))
         ops (if (some? expected-erasure) (vec (remove #{fence} (:ops p))) (:ops p))
         ids (into #{} (keep :triplex.entity/id) (filter map? ops))
         journal (first journal-entities)
         owners (vec (sort (disj ids journal)))
         owner-set (set owners)
         asserted (filterv #(and (vector? %) (= :triplex/assert (first %))) ops)
         temps (into #{} (map #(str "e:" %)) owners)
         business (filterv #(temps (second %)) asserted)
         decoded (mapv (comp lean/decode second #(nth % 3)) business)
         eids (into {} (map (fn [o] [o (when (string? o) (d/entid db [:triplex.entity/id o]))])) owners)
         new-owners (filterv #(nil? (eids %)) owners)
         refs? (some #(= "ref" (:value_type %)) decoded)]
     (cond
       (not enabled) nil
       (empty? owners) nil
       (not (or (seq new-owners) refs?)) nil
       (> (count owners) max-owners) (decline "over-owner-bound")
       (not (every? string? owners)) (decline "frame")
       (some #(.startsWith ^String % "_") owners) (decline "system-entity")
       (not (owners/one-account? owners)) (decline "several-accounts")
       (not= owner-set (set entities)) (decline "read-only-entity")
       (not (and (ids journal) (= 1 (count journal-entities))
                 (integer? source)
                 (nil? (get input "clientId")) (not (true? (get input "readProfile")))
                 (#{:triplex/commit (first (commit/variants [true false]))} commit-ident)
                 (:lean p) (not (:slim-row p)) (= 1 (:span p)) (:assign-record-time p)
                 (not-any? p [:scope-wide :position-irregular :irregular :save-ledger :packed-journal :bulk
                              :import-predecessor])))
       (decline "frame")
       (> (count ops) subject/wide-ops) (decline "over-subject-bound")
       (not-every? prepared/small-op? ops) (decline "protected-values-or-frame")
       :else
       (let [existing (filterv eids owners)
             [fn-tx flags revisions]
             (trace/span "create.plan-witnesses" "gateway"
               (let [fn-tx (installed db) flags (when fn-tx (subject/scope-witness db scope))]
                 [fn-tx flags (into {} (map (fn [o] [o (revision-at db (eids o))])) existing)]))
             f (into {} flags)
             retired (filterv #(and (vector? %) (= :triplex/retract (first %))) ops)
             claim (first (:command-ids p)) clocks (concat times record-clocks)
             op-header (first ops)
             head (scope/head-position db scope)]
         (cond
           (not (and fn-tx (some? (:triplex.scope/key f))
                     (= schema/schema-hash (:triplex.scope/schema-hash f))
                     (= commit/source-hash (:triplex.scope/commit-fn-hash f))
                     (= 3 (:triplex.scope/rows-version f)) (= 2 (:triplex.scope/head-version f))
                     (= true (:triplex.scope/strict-record-clocks f)) (= true (:triplex.scope/position-regular f))
                     (= 2 (:triplex.scope/feed-version f))
                     (not-any? f [:triplex.scope/feed-irregular :triplex.scope/irregular :triplex.scope/packed-journals])
                     (if (some? expected-erasure)
                       (and (= 1 (count matching)) (:triplex.scope/erasure-ledger f)
                            (= expected-erasure (get f subject/erase-generation)))
                       (not (:triplex.scope/erasure-ledger f)))
                     (not (subject/changes-application-rows? db))
                     (not (d/entid db [:triplex.entity/id journal]))))
           (decline "scope")
           (not (every? integer? (vals revisions))) (decline "unrevisioned-owner")
           (not (and (integer? head) (<= source head) (every? #(<= % source) (vals revisions)))) (decline "stale-source")
           (not (and (= 1 (count (:command-ids p))) (string? claim)
                     (= journal (:triplex.tx/id op-header))
                     (string? (:triplex.tx/operation-id op-header))
                     (some #(= [:db/add "datomic.tx" :triplex.tx/journals (str "e:" journal)] %) ops)
                     (= (count asserted) (count new-ids)) (= (set new-ids) (into #{} (map prepared/row-id) asserted))
                     (every? #(= 5 (count (nth % 3))) asserted)
                     (every? #(or (temps (second %)) (= (str "e:" journal) (second %))) asserted)
                     (seq clocks) (every? #(and (number? %) (Double/isFinite (double %))) clocks)))
           (decline "frame")
           (not (and (<= (count business) subject/wide-facts) (<= (count retired) subject/wide-facts)))
           (decline "over-subject-bound")
           (not (and (pos? (+ (count business) (count retired))) (= (count retired) (count live))
                     (= (set live) (into #{} (map #(nth % 2)) retired))
                     ;; A new owner has nothing to retire.
                     (every? #(eids (second %)) retired)))
           (decline "retired-not-current")
           :else
           (let [owner-of (into {} (map (fn [op] [(nth op 2) (second op)])) retired)
                 prior (trace/span "create.plan-predecessors" "gateway"
                         (into {} (keep (fn [id] (when-let [text (predecessor db (eids (owner-of id)) id)] [id text])))
                               live))
                 before (map (comp value-field lean/decode) (vals prior))
                 after (map value-field decoded)]
             (cond
               (not= (count live) (count prior)) (decline "retired-not-current")
               (some nil? before) (decline "system-field")
               (some nil? after) (decline "system-field")
               :else
               (let [prefixes (vec (sort (map lean/prefix new-ids)))
                     mark? (and subject/append-retirement? (nil? expected-erasure) (seq retired)
                                (not-any? #(and (vector? %) (= :triplex.entity/retired (nth % 2 nil))) ops))
                     keyed (mapv (fn [o] (if-let [e (eids o)]
                                           [e (revisions o) (when subject/numeric-owner? o)]
                                           [nil nil o]))
                                 owners)
                     present (into {} (filter val) eids)
                     first-existing (first existing)]
                 (cond-> {:scope scope :flags flags :function [ident fn-tx] :creation true
                          :owner (when first-existing (eids first-existing))
                          :revision (when first-existing (revisions first-existing))
                          :owners keyed :new-owners (count new-owners)
                          :journal journal :operation (:triplex.tx/operation-id op-header) :command claim
                          :provisional provisional :submitted-clock (reduce max (map double clocks))
                          :prefixes prefixes :expected-erasure expected-erasure
                          :ops (trace/span "create.plan-render" "gateway"
                                 (owners/render-ops ops present prior (subject/decode-predecessors prior) (set new-ids)
                                                    (when mark? [provisional journal])))}
                   mark? (assoc :owner-retirements (mapv (fn [id] [(eids (owner-of id)) (lean/prefix id)]) live))
                   subject/ordered-ids? (assoc :ordered-bounds (subject/ordered-bounds journal prefixes))))))))))))

;; [DX-S4] Hints name the existing owners' reads (the several-owners way); a new owner has nothing to read but its
;; public ID's absence, one unique-index seek at the serial point. Rejected: hinting the absence (a hint proves nothing).
(defn lookup-hints [db plan]
  (when-let [present (seq (filter first (:owners plan)))]
    (:hints (d/with db (mapv (fn [[o]] [subject-hints/ident (subject-hints/from-plan (assoc plan :owner o))]) present)
                    :return-hints true))))

(defn verify-report
  "subject-owners/verify-report for a creation: each new owner is found by its public ID in the committed database,
  then every owner's revision must be the commit's position and every retirement marker the expected one."
  [report plan]
  (let [db (:db-after report)
        eids (mapv (fn [[o _ k]] (or o (d/entid db [:triplex.entity/id k]))) (:owners plan))]
    (when (some nil? eids)
      (throw (ex-info "Prepared subject receipt unavailable" {:status 503 :code "OutcomeUnknown"})))
    (assoc (owners/verify-report report (assoc plan :owner (first eids)
                                                    :owners (mapv (fn [e [_ r k]] [e r k]) eids (:owners plan))))
           :subject-save (str ident) :subject-owners (count eids) :subject-created (:new-owners plan))))
