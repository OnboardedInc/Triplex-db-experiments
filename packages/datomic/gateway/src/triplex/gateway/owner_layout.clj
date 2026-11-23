(ns triplex.gateway.owner-layout
  (:require [clojure.walk :as walk]
            [datomic.api :as d] [triplex.gateway.commit :as commit]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.owner-root :as root]
            [triplex.gateway.scope :as scope]
            [triplex.gateway.schema :as schema]
            [triplex.gateway.subject-save :as subject]))

;; [Opus W1] Why: the covering root is the product option behind TX2_SUBJECT_OWNER_HEAD=1; default off.
;; Rejected: the paged spill (30-48% slower reads, 26 records) and the step 1 witness (saved no reads).
(def enabled subject/owner-head?)
(def root-attr root/root-attr)
(def owner-attr root/owner-attr)
(def cover-limit root/text-limit)
(def version "owner-layout-version")

(def ^:dynamic *read-stages* nil)
(defmacro read-stage [phase & body]
  `(if *read-stages*
     (let [at# (System/nanoTime) value# (do ~@body)]
       (vswap! *read-stages* update ~phase (fnil + 0) (- (System/nanoTime) at#))
       value#)
     (do ~@body)))

(defn live-datoms [db owner] (read-stage :owner-range (root/live db owner nil)))
(def covered-live-datoms live-datoms)

(defn revision [db owner] (scope/value db owner :triplex.entity/rev))

(defn- predecessor [db owner id]
  (if-let [{:keys [mask texts]} (root/root db owner)]
    (or (some #(when (= id (root/row-id %)) %) texts)
        (when-not (some #{id} mask) (subject/retirement db owner id)))
    (subject/retirement db owner id)))

(def ^:private update-code
  ;; [DX-W1] Why: two preparations at the same basis compete on one exact root, including a first-touch migration.
  ;; Rejected: comparing a cached peer's root or writing new versions after a legacy save won the migration race.
  ;; [Opus W1] Why: the revision still advances, so every reader cache, group cut and other writer keyed on it stays exact.
  ;; Rejected: leaving the revision behind the root (reach sessions and the other writers' fences would read a stale person).
  '(let [{:keys [before-root cover]} (:owner-layout plan)]
     (when (or (not= before-root (value owner :triplex.owner/root))
               (not= revision (value owner :triplex.entity/rev)))
       (throw (ex-info "TRIPLEX_CONFLICT" {})))
     (let [[mask retained] cover
           fresh (keep (fn [op]
                         (when (and (= :db/add (first op)) (= "owner-layout-version" (second op))
                                    (= :triplex.entity/row (nth op 2 nil)))
                           (nth (stamp op) 3))) (filter #(instance? java.util.List %) ops))]
       ;; [DX-W1] Why: Datomic supplies the wire collections as Java lists.
       ;; Rejected: appending to the native list (it is not a persistent collection).
       [[:db/add owner :triplex.owner/root (cover-root-encoder final clock mask (into (vec retained) fresh))]
        [:db/add owner :triplex.entity/rev final]
        [:db/add "datomic.tx" :triplex.tx/max-recorded-at clock]])))

(def code (subject/compile-code (walk/postwalk-replace {'cover-root-encoder root/encode-code} update-code)))
(def ident (keyword "triplex.owner" (str "v-" (subs (schema/sha256 (pr-str code)) 0 24))))

;; [Opus W1] Why: a fold returns a person to plain rows without changing any logical row, position or clock.
;; Rejected: a fold inside a save (the feed would see moved rows as changes) and spilling into pages.
(def fold-code
  '(let [{:keys [owner before-root revision moves masked]} plan
         value (fn [e a] (:v (first (d/datoms db :eavt e a))))]
     (when (or (nil? before-root) (not= before-root (value owner :triplex.owner/root))
               (not= revision (value owner :triplex.entity/rev)))
       (throw (ex-info "TRIPLEX_CONFLICT" {})))
     (into [[:db/retract owner :triplex.owner/root before-root]
            [:db/add "datomic.tx" :triplex.owner/folded owner]]
           (concat (mapcat (fn [[v text]] [[:db/retract v :triplex.entity/row text]
                                          [:db/add owner :triplex.entity/row text]]) moves)
                   (map (fn [text] [:db/retract owner :triplex.entity/row text]) masked)))))
(def fold-ident (keyword "triplex.owner" (str "fold-" (subs (schema/sha256 (pr-str fold-code)) 0 24))))

(defn installed? [db] (and (d/entid db ident) (d/entid db fold-ident)))

(defn install! [conn db]
  ;; [Opus W1] Why: only a writer started with the option installs the format; readers detect it from the attribute.
  ;; Rejected: installing the attributes in every scope (each reader would then scan for roots it can never find).
  (if (or (not enabled) (installed? db))
    db
    (let [definitions [(schema/attr root-attr :db.type/string)
                       (schema/attr owner-attr :db.type/ref)
                       (schema/attr :triplex.owner/folded :db.type/ref)
                       {:db/ident ident :db/fn (d/function
                         {:lang :clojure :params '[db plan]
                          :requires '[[datomic.api :as d] [clojure.data.json :as json]]
                          :code code})}
                       {:db/ident fold-ident :db/fn (d/function
                         {:lang :clojure :params '[db plan] :requires '[[datomic.api :as d]] :code fold-code})}]
          missing (remove #(d/entid db (:db/ident %)) definitions)]
      (if (seq missing) (:db-after @(d/transact conn missing)) db))))

(defn install-fixture! [conn]
  (with-redefs [enabled true] (install! conn (d/db conn))))

(defn fold-plan [db owner]
  (when-let [{:keys [raw mask texts]} (root/root db owner)]
    (let [row-a (d/entid db :triplex.entity/row)
          moves (mapv (fn [text]
                        (let [holders (into [] (comp (map :e) (filter #(= owner (root/owner-of db %))))
                                            (d/datoms db :avet row-a text))]
                          (when-not (= 1 (count holders))
                            (throw (ex-info "Covered row has no single version" {:status 503 :code "OutcomeUnknown"})))
                          [(first holders) text]))
                      texts)
          masked (into [] (keep (fn [id]
                                  (let [p (root/id-prefix id) x (first (d/seek-datoms db :eavt owner row-a p))]
                                    (when (and x (= owner (:e x)) (= row-a (:a x)) (.startsWith ^String (:v x) p))
                                      (:v x)))))
                       mask)]
      {:owner owner :before-root raw :revision (revision db owner) :moves moves :masked masked})))

(defn fold! [conn db owner]
  ;; [Opus W1] Why: the fold's own durable report must show the root gone, every move and every masked row retired.
  ;; Rejected: trusting the transaction to have applied the planned moves.
  (if-let [plan (fold-plan db owner)]
    (let [report (try (deref (d/transact-async conn [[fold-ident plan]]) 5000 ::timeout)
                      (catch Exception e
                        ;; [Opus W1] Why: another gateway may have folded the same person first; that is the goal.
                        ;; Rejected: failing the caller's save on a fold someone else already published.
                        (let [synced (deref (d/sync conn) 5000 ::timeout)]
                          (if (and (not= ::timeout synced) (nil? (root/raw synced owner)))
                            {:db-after synced ::already true}
                            (throw e)))))
          _ (when (= ::timeout report) (throw (ex-info "Owner fold outcome unknown" {:status 503 :code "OutcomeUnknown"})))
          after (:db-after report)]
      (when-not (or (::already report) (and (nil? (root/raw after owner))
                     (= (revision after owner) (:revision plan))
                     (every? (fn [[v text]] (and (d/datoms after :eavt owner (d/entid after :triplex.entity/row) text)
                                                 (empty? (d/datoms after :eavt v (d/entid after :triplex.entity/row) text))))
                             (:moves plan))))
        (throw (ex-info "Owner fold durable report unavailable" {:status 503 :code "OutcomeUnknown"})))
      after)
    db))

(defn- version-ops [owner journal provisional ops]
  (into [[:db/add version owner-attr owner]]
        (map (fn [op]
               (cond
                 (and (vector? op) (= [:db/add owner :triplex.entity/row] (subvec op 0 (min 3 (count op)))))
                 (assoc op 1 version)
                 (and (vector? op) (= [:db/retract owner :triplex.entity/row] (subvec op 0 (min 3 (count op)))))
                 (let [prefix (lean/prefix (:id (lean/decode (nth op 3))))]
                   [:db/add version :triplex.entity/retired
                    [:triplex/row (subject/retirement-text prefix provisional 0.0 journal)
                     provisional (count prefix) :retirement]])
                 :else op)))
        ops))

(defn- cover-after [root old-ids width]
  (let [prior (group-by #(contains? old-ids (root/row-id %)) (:texts root))
        replaced (into #{} (map root/row-id) (prior true))
        mask (into (set (:mask root)) (remove replaced old-ids))
        retained (vec (prior false))]
    (when (and (<= (count mask) cover-limit) (<= 1 (+ (count retained) width) cover-limit))
      [(vec (sort mask)) retained])))

(defn prepare
  "A covering-root plan, {:fold owner} when the cover is full, or nil when the save does not qualify."
  ([db data input] (prepare db data input nil))
  ([db [[_ payload] :as data] input expected-erasure]
  ;; [DX-W1] Why: the legacy compiler proves command shape, retractions and exact journal bytes.
  ;; Rejected: a second parser for ordinary and ordered IDs, or treating a customer's packed payload as a page.
  (when-let [{:keys [owner journal provisional ops] :as plan}
             (when (d/entid db ident)
               (binding [subject/*covering* true]
                 (subject/plan db data input expected-erasure predecessor revision)))]
    (let [root (root/root db owner)
          row-entry (fn [text] (let [row (lean/decode text)] [(:attribute row) (:id row)]))
          old (into {} (keep (fn [[kind eid attr text :as op]]
                              (when (and (vector? op) (= :db/retract kind) (= owner eid) (= :triplex.entity/row attr))
                                (row-entry text)))) (filter vector? ops))
          fresh (into {} (keep (fn [[kind eid attr row]]
                                (when (and (= :triplex/assert kind) (= (str "e:" (:owner-key plan)) eid)
                                           (= :triplex.entity/row attr))
                                  (row-entry (second row))))) (filter vector? (:ops payload)))]
      ;; [Opus W1] Why: only exact field replacements keep the root's masked and covered sets one to one.
      ;; Rejected: throwing (the save is valid; the plain subject writer or the reference writer takes it).
      (when (and (seq old) (= (set (keys old)) (set (keys fresh))) (:owner-key plan))
        (if-let [cover (cover-after root (set (vals old)) (count fresh))]
          (let [tx (d/entid db ident)]
            (assoc (dissoc plan :head-ids :retirement-prefixes)
                   :function [ident (:tx (first (d/datoms db :eavt tx :db/fn)))]
                   :owner-layout {:before-root (:raw root) :cover cover}
                   :ops (version-ops owner journal provisional ops)
                   :retired-ids (set (vals old))))
          (when root {:fold owner})))))))

(defn verify-report [report {:keys [owner journal retired-ids ops provisional] :as plan}]
  (let [db (:db-after report)
        tx (d/t->tx (d/basis-t db))
        position (scope/value db tx :triplex.tx/position)
        clock (scope/value db tx :triplex.tx/recorded-at)
        row-a (d/entid db :triplex.entity/row)
        retired-a (d/entid db :triplex.entity/retired)
        root-a (d/entid db root-attr)
        version-a (d/entid db owner-attr)
        added (filter #(and (:added %) (= tx (:tx %))) (:tx-data report))
        [version-datom :as versions] (filter #(and (= version-a (:a %)) (= owner (:v %))) added)
        data (filter #(= (:e version-datom) (:e %)) added)
        stamp (commit/stamp true clock #{} (dec provisional) provisional position false nil)
        expected-rows (into [] (keep (fn [op]
                                       (when (and (vector? op) (= :db/add (first op))
                                                  (= version (second op)) (= :triplex.entity/row (nth op 2 nil)))
                                         (peek (stamp op)))))
                            ops)
        [mask retained] (get-in plan [:owner-layout :cover])
        target-root (root/encode position clock mask (into retained expected-rows))
        checks {:owner (= 1 (count versions))
                :root (boolean (some #(and (= owner (:e %)) (= root-a (:a %)) (= target-root (:v %))) added))
                :rows (= (set expected-rows) (into #{} (comp (filter #(= row-a (:a %))) (map :v)) data))
                :retirements (= (set (map #(subject/retirement-text (lean/prefix %) position clock journal) retired-ids))
                                (into #{} (comp (filter #(= retired-a (:a %))) (map :v)) data))}]
    (when-not (every? true? (vals checks))
      (throw (ex-info (str "Owner layout durable report unavailable " (pr-str checks))
                      {:status 503 :code "OutcomeUnknown"})))
    (assoc (subject/verify-report-at report plan revision)
           :subject-save (str ident) :subject-owner-head-bytes (alength (.getBytes ^String target-root "UTF-8")))))
