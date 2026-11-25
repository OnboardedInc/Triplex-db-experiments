(ns triplex.gateway.subject-owners
  "[DX-S3] One subject's save that writes two to four owners (a form page that also updates the subject's profile) on
  the per-subject writer, committing exactly what the general writer would commit. Default off:
  TX2_SUBJECT_SEVERAL_OWNERS=1, with TX2_SUBJECT_SAVE=1 and TX2_SUBJECT_WIDE=1, not beside TX2_SUBJECT_OWNER_HEAD=1.
  Design and gates: lab/experiments/EXP-DX1/s3/SEVERAL-OWNERS.md."
  (:require [datomic.api :as d]
            [triplex.gateway.commit :as commit]
            [triplex.gateway.group-prepare :as prepared]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.schema :as schema]
            [triplex.gateway.scope :as scope]
            [triplex.gateway.small-row :as small-row]
            [triplex.gateway.subject-hints :as subject-hints]
            [triplex.gateway.subject-save :as subject]
            [triplex.gateway.trace :as trace]))

;; [DX-S3] Why: this namespace is loaded after subject-save, owner-layout and subject-hints (storage requires it last),
;; so nothing here can move the stored code or the auto-generated names of any existing stored function; with the
;; option off nothing is installed and every existing function keeps its identity (s3/idents.sh proves it).
;; Rejected: editing subject-save/body or compile-code (every scope's per-subject function would change identity) and
;; a namespace required before subject-save (its compiled functions would shift the gensym counter the body embeds).
(def requested (= "1" (System/getenv "TX2_SUBJECT_SEVERAL_OWNERS")))
(def enabled (and requested subject/enabled subject/wide? (not subject/owner-head?)))
(when (and requested (not enabled))
  (throw (IllegalStateException.
           "TX2_SUBJECT_SEVERAL_OWNERS=1 needs TX2_SUBJECT_SAVE=1 and TX2_SUBJECT_WIDE=1, and not TX2_SUBJECT_OWNER_HEAD=1")))
(def max-owners 4)

;; [DX-S3] Why: the one-owner body checks the first owner's public ID (numeric owner); this head update checks every
;; owner's public ID and compare-and-sets every owner's revision against the revision the gateway read, so a change
;; to any owner after the plan refuses the whole save, as the general writer's per-entity revision check would.
;; Rejected: a check of owners 2..n only (one uniform rule is easier to audit; the extra seek is the cached first one).
(def owners-update
  (list 'into '[[:db/add "datomic.tx" :triplex.tx/max-recorded-at clock]]
        (list 'map (list 'fn '[[o r k]]
                         '(when (and k (not= k (value o :triplex.entity/id)))
                            (throw (ex-info "TRIPLEX_CONFLICT" {:triplex.subject/stale true})))
                         (if subject/narrow-revision?
                           '(let [datom (first (d/datoms db :aevt :triplex.entity/rev o))]
                              (when-not (= r (:v datom)) (throw (ex-info "TRIPLEX_CONFLICT" {})))
                              [:db/add o :triplex.entity/rev final])
                           '[:db/cas o :triplex.entity/rev r final])))
        '(:owners plan)))
(def code (subject/compile-code owners-update))
(def source-hash (schema/sha256 (pr-str code)))
(def ident (keyword "triplex.subject" (str "owners-" (subs source-hash 0 24))))

(defn installed [db]
  (when-let [eid (d/entid db ident)]
    (:tx (first (d/datoms db :eavt eid :db/fn)))))

(defn install! [conn db]
  (if (or (not enabled) (installed db))
    db
    (:db-after @(d/transact conn [{:db/ident ident :db/fn (d/function
                                    {:lang :clojure :params '[db plan]
                                     :requires '[[datomic.api :as d] [clojure.data.json :as json]] :code code})}]))))

;; [DX-S3] Why: an account is a subject's namespace (acct/<account>/...), as group/classify reads it; a save across
;; accounts is not one subject's save. Rejected: reading :subject/account here (a storage read per owner on the plan path).
(defn- account [id] (second (re-matches #"acct/([A-Za-z0-9_-]{1,64})/.+" id)))
(defn one-account? [owners]
  (let [accounts (map account owners)]
    (or (every? nil? accounts) (and (not-any? nil? accounts) (apply = accounts)))))

(defn render-ops
  "subject-save/render-ops for several owners: each owner's tempid becomes its numeric entity, each retraction goes to
  the owner whose row it retires."
  [ops eids prior prior-rows new-ids marker]
  (let [temp->eid (into {} (map (fn [[s e]] [(str "e:" s) e])) eids)
        rewrite #(commit/rewrite-change %1 %2 new-ids prior-rows)]
    (into []
      (keep (fn [op]
              (cond
                (and subject/numeric-owner? (map? op) (contains? temp->eid (:db/id op))
                     (= (:db/id op) (str "e:" (:triplex.entity/id op)))) nil
                (and (vector? op) (= :triplex/assert (first op)))
                (let [[_ eid attr [tag text position offset kind]] op]
                  [:db/add (if subject/numeric-owner? (get temp->eid eid eid) eid)
                   attr [tag (subs text 0 offset) position offset kind
                         (small-row/ordinary-plan text offset rewrite)]])
                (and (vector? op) (= :triplex/retract (first op)))
                (let [owner (get eids (second op))]
                  (if marker
                    (let [[position journal] marker prefix (lean/prefix (nth op 2))]
                      [:db/add owner :triplex.entity/retired
                       [:triplex/row (subject/retirement-text prefix position 0.0 journal)
                        position (count prefix) :retirement]])
                    [:db/retract owner :triplex.entity/row (prior (nth op 2))]))
                (and (vector? op) (= :triplex.entity/rev (nth op 2)) (contains? temp->eid (second op))) nil
                :else op)))
      ops)))

(defn- decline [reason] {:declined reason})

;; [DX-S3] Why: the per-subject writer proves, for one owner, "these predecessors were current, these IDs were never
;; used, nothing changed the owner after the gateway read it"; for several owners each clause is proved per owner and
;; the history interval once for the whole block. Every rule the one-owner plan applies to the frame applies here.
;; Rejected: owners the save only reads (their absence or change would need a second kind of check), new owners (an
;; absence proof of a public ID inside the function), references and protected values (outside the certified shapes).
(defn plan
  "A plan for the several-owners function, {:declined reason} for a save of two or more owners it refuses (the general
  writer takes it), or nil for a save of fewer than two owners."
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
         owner-set (set owners)]
     (cond
       (or (not enabled) (< (count owners) 2)) nil
       (> (count owners) max-owners) (decline "over-owner-bound")
       (not (every? string? owners)) (decline "frame")
       (some #(.startsWith ^String % "_") owners) (decline "system-entity")
       (not (one-account? owners)) (decline "several-accounts")
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
       (let [[fn-tx flags eids revisions]
             (trace/span "owners.plan-witnesses" "gateway"
               (let [fn-tx (installed db) flags (when fn-tx (subject/scope-witness db scope))
                     eids (into {} (map (fn [o] [o (d/entid db [:triplex.entity/id o])])) owners)]
                 [fn-tx flags eids (into {} (map (fn [[o e]] [o (when e (revision-at db e))])) eids)]))
             f (into {} flags)
             asserted (filterv #(and (vector? %) (= :triplex/assert (first %))) ops)
             retired (filterv #(and (vector? %) (= :triplex/retract (first %))) ops)
             temps (into #{} (map #(str "e:" %)) owners)
             business (filterv #(temps (second %)) asserted)
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
           (some nil? (vals eids)) (decline "new-owner")
           (not (every? integer? (vals revisions))) (decline "new-owner")
           (not (every? #(<= % source head) (vals revisions))) (decline "stale-source")
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
                     (every? #(owner-set (second %)) retired)))
           (decline "retired-not-current")
           :else
           (let [owner-of (into {} (map (fn [op] [(nth op 2) (second op)])) retired)
                 prior (trace/span "owners.plan-predecessors" "gateway"
                         (into {} (keep (fn [id] (when-let [text (predecessor db (eids (owner-of id)) id)] [id text])))
                               live))
                 decoded (when subject/reuse-predecessor?
                           (try (subject/decode-predecessors prior) (catch Exception _ nil)))
                 before (if decoded
                          (map #(subject/field {:attribute (get % "attribute") :entity_type (get % "entityType")
                                                :value_type (get-in % ["value" "type"])}) (vals decoded))
                          (map (comp subject/field lean/decode) (vals prior)))
                 after (map (comp subject/field lean/decode second #(nth % 3)) business)]
             (cond
               (not= (count live) (count prior)) (decline "retired-not-current")
               (some nil? before) (decline "reference-or-system-field")
               (some nil? after) (decline "reference-or-system-field")
               :else
               (let [prefixes (vec (sort (map lean/prefix new-ids)))
                     mark? (and subject/append-retirement? (nil? expected-erasure)
                                (not-any? #(and (vector? %) (= :triplex.entity/retired (nth % 2 nil))) ops))
                     keyed (mapv (fn [o] [(eids o) (revisions o) (when subject/numeric-owner? o)]) owners)]
                 (cond-> {:scope scope :flags flags :function [ident fn-tx]
                          :owner (eids (first owners)) :revision (revisions (first owners)) :owners keyed
                          :journal journal :operation (:triplex.tx/operation-id op-header) :command claim
                          :provisional provisional :submitted-clock (reduce max (map double clocks))
                          :prefixes prefixes :expected-erasure expected-erasure
                          :ops (trace/span "owners.plan-render" "gateway"
                                 (render-ops ops eids prior (or decoded (subject/decode-predecessors prior)) (set new-ids)
                                             (when mark? [provisional journal])))}
                   mark? (assoc :owner-retirements (mapv (fn [id] [(eids (owner-of id)) (lean/prefix id)]) live))
                   subject/numeric-owner? (assoc :owner-key (first owners))
                   subject/ordered-ids? (assoc :ordered-bounds (subject/ordered-bounds journal prefixes))))))))))))

;; [DX-S3] Why: the per-subject hint function names one owner's reads; one d/with of one call per owner names every
;; owner's, with the hint function unchanged. Rejected: a second hint function (another identity to install and gate).
(defn lookup-hints [db plan]
  (:hints (d/with db (mapv (fn [[o]] [subject-hints/ident (subject-hints/from-plan (assoc plan :owner o))]) (:owners plan))
                  :return-hints true)))

(defn verify-report
  "subject-save/verify-report for several owners: the one-owner checks on the first owner, then every other owner's
  revision is the commit's position and every retirement marker is the expected one on its own owner."
  [report plan]
  (let [revision-at #(scope/value %1 %2 :triplex.entity/rev)
        checked (subject/verify-report-at report (dissoc plan :retirement-prefixes) revision-at)
        db (:db-after report) tx (d/t->tx (d/basis-t db))
        position (scope/value db tx :triplex.tx/position)
        clock (scope/value db tx :triplex.tx/recorded-at)
        markers (:owner-retirements plan)]
    (when-not (and (every? (fn [[o]] (= position (revision-at db o))) (:owners plan))
                   (or (nil? markers)
                       (let [attr (d/entid db :triplex.entity/retired)
                             expected (set (map (fn [[o prefix]] [o (subject/retirement-text prefix position clock (:journal plan))])
                                                markers))
                             actual (into #{} (keep #(when (and (= attr (:a %)) (:added %) (= tx (:tx %))) [(:e %) (:v %)]))
                                          (:tx-data report))]
                         (= expected actual))))
      (throw (ex-info "Prepared subject receipt unavailable" {:status 503 :code "OutcomeUnknown"})))
    (cond-> (assoc checked :subject-save (str ident) :subject-owners (count (:owners plan)))
      markers (assoc :subject-append-retirement true))))
