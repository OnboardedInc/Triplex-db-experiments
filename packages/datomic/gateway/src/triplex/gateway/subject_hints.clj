(ns triplex.gateway.subject-hints
  (:require [datomic.api :as d]
            [triplex.gateway.schema :as schema]))

;; [DX-W4] Why: a first touch of a subject costs the per-subject writer about two segment loads inside its serial
;; apply (EAVT and AEVT of the owner). Datomic hints let the transactor load them before apply. The older
;; TX2_SUBJECT_PREFETCH names only the revision and the legacy history probe and is refused with ordered IDs by the
;; launchers; this option names every read of the native function and of Datomic's own checks, for ordered and
;; unordered IDs alike. Default off.
;; Rejected: changing TX2_SUBJECT_PREFETCH or its guard (an existing option keeps its meaning); modifying Datomic.
(def enabled (= "1" (System/getenv "TX2_SUBJECT_HINTS")))
;; [DX-W4] Why: the lookups of subject-save/body and of Datomic's identity, redundancy and cardinality checks for the
;; ops it returns, and nothing else. It returns no datoms and decides nothing; every check runs again in the
;; transaction on its own db-before. A failing lookup (an ID already used, a missing owner) is swallowed so that the
;; segments read before it are still named. Rejected: reusing the commit's guard code, whose refusal would abort the
;; d/with and lose every hint.
(def code
  '(let [{:keys [scope subject owner journal operation command live fresh ordered-bounds]} payload
         a (fn [k] (d/entid db k))
         touch (fn [rows] (first rows))
         safe (fn [f] (try (f) (catch Exception _ nil)))
         row-a (a :triplex.entity/row) retired-a (a :triplex.entity/retired) rev-a (a :triplex.entity/rev)
         id-a (a :triplex.entity/id)
         owner (or owner (when (string? subject) (safe #(d/entid db [:triplex.entity/id subject]))))]
     ;; Point checks of the native function: operation, command claim, journal entity (current AVET).
     (doseq [[k v] [[:triplex.tx/operation-id operation] [:triplex.claim/command-id command] [:triplex.entity/id journal]]]
       (when (and (string? v) (a k)) (safe #(d/entid db [k v]))))
     (when scope (touch (d/datoms db :eavt scope)))
     (safe #(touch (d/datoms db :aevt :db/excise)))
     (when-let [p (a :triplex.tx/position)] (touch (d/rseek-datoms db :aevt p)))
     (when owner
       ;; The owner witness and the revision check (EAVT), the cardinality-one replacement of the revision (AEVT).
       (touch (d/datoms db :eavt owner id-a))
       (touch (d/datoms db :eavt owner rev-a))
       (touch (d/seek-datoms db :aevt rev-a owner))
       ;; Retired and new rows of this owner: the retraction's and the redundancy check's lookups (EAVT, AEVT),
       ;; and the retirement markers when the writer appends them.
       (doseq [p (concat live fresh)]
         (touch (d/seek-datoms db :eavt owner row-a p))
         (touch (d/seek-datoms db :aevt row-a owner p))
         (when retired-a
           (touch (d/seek-datoms db :eavt owner retired-a p))
           (touch (d/seek-datoms db :aevt retired-a owner p)))))
     ;; New assertion IDs: the history guard (one containing interval for ordered IDs, else one probe per ID) and the
     ;; indexed attribute's current AVET neighbourhood.
     (if-let [[start end] ordered-bounds]
       (touch (d/index-range (d/history db) :triplex.entity/row start end))
       (doseq [p fresh] (touch (d/index-range (d/history db) :triplex.entity/row p nil))))
     (doseq [p fresh] (touch (d/index-range db :triplex.entity/row p nil)))
     []))

(def ident (keyword "triplex.subject" (str "hints-" (subs (schema/sha256 (pr-str code)) 0 24))))

(defn installed? [db] (some? (d/entid db ident)))

(defn install! [conn db]
  (if (or (not enabled) (installed? db))
    db
    (:db-after @(d/transact conn [{:db/ident ident
                                   :db/fn (d/function {:lang :clojure :params '[db payload]
                                                       :requires '[[datomic.api :as d]] :code code})}]))))

(defn- row-text [v]
  (cond (string? v) v
        (and (instance? java.util.List v) (string? (second v))) (second v)))

(defn from-plan
  "The payload for a prepared per-subject plan (subject-save/plan): its owner, journal, claims, retired rows and the
  prefixes of its new rows, with the ordered interval when the plan has one."
  [plan]
  (let [ops (:ops plan) owner (:owner plan)
        mine (filter #(and (vector? %) (= owner (second %))) ops)
        texts (fn [kind attrs] (into [] (keep (fn [op] (when (and (= kind (first op)) (attrs (nth op 2 nil)))
                                                         (row-text (nth op 3 nil))))) mine))]
    {:scope (:scope plan) :owner owner :journal (:journal plan) :operation (:operation plan) :command (:command plan)
     :live (into (texts :db/retract #{:triplex.entity/row})
                 (texts :db/add #{:triplex.entity/retired}))
     :fresh (or (seq (texts :db/add #{:triplex.entity/row})) (:prefixes plan))
     :ordered-bounds (:ordered-bounds plan)}))

(defn lookup-hints [db payload]
  (:hints (d/with db [[ident payload]] :return-hints true)))
