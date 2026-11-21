(ns triplex.gateway.owner-layout
  (:require [clojure.edn :as edn]
            [datomic.api :as d] [triplex.gateway.commit :as commit]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.scope :as scope]
            [triplex.gateway.schema :as schema]
            [triplex.gateway.subject-save :as subject]))

(def page-size 32)
(def page-limit 8)
(def cover-limit 8)
(def root-attr :triplex.owner/root)
(def owner-attr :triplex.owner/version-owner)
(def page-key-attr :triplex.owner/page-key)
(def page-attr :triplex.owner/page-ids)
(def version "owner-layout-version")

(defn root-text [position clock pages] (pr-str [1 position clock pages]))
(defn- decode-root [raw]
  (when raw
    (let [[version position clock a b] (edn/read-string raw)]
      (when-not (and (integer? position) (number? clock) (vector? a) (every? string? a)
                     (case version
                       1 (<= (count a) page-limit)
                       2 (and (<= (count a) cover-limit) (vector? b) (<= (count b) cover-limit) (every? string? b))
                       false))
        (throw (ex-info "Invalid owner projection root" {})))
      (cond-> {:raw raw :position position :clock clock}
        (= 1 version) (assoc :keys a)
        (= 2 version) (assoc :mask a :texts b)))))

(defn- read-root [db owner] (decode-root (scope/value db owner root-attr)))

(defn- page [db key]
  (let [eid (d/entid db [page-key-attr key])
        raw (when eid (scope/value db eid page-attr))
        ids (when raw (edn/read-string raw))]
    (when-not (and (vector? ids) (<= 1 (count ids) page-size) (every? string? ids))
      (throw (ex-info "Invalid owner projection page" {:key key})))
    ids))

(defn- owned-row [db owner id]
  (let [datom (lean/by-id db id)]
    (when (and datom (or (= owner (:e datom)) (= owner (scope/value db (:e datom) owner-attr))))
      datom)))

(defn- row-id [datom]
  (let [^String text (:v datom)]
    (subs text 5 (+ 5 (Integer/parseInt text 1 5 16)))))

(def ^:dynamic *read-stages* nil)
(defmacro read-stage [phase & body]
  `(if *read-stages*
     (let [at# (System/nanoTime) value# (do ~@body)]
       (vswap! *read-stages* update ~phase (fnil + 0) (- (System/nanoTime) at#))
       value#)
     (do ~@body)))

(defn covered-live-datoms [db owner]
  ;; [DX-W1] Why: the covering root and legacy rows share one owner range at the selected basis.
  ;; Rejected: opening a page and then the public-ID and owner indexes for each edited row.
  (let [[root-a row-a retired-a] (mapv #(d/entid db %) [root-attr :triplex.entity/row :triplex.entity/retired])
        {:keys [raw legacy retired]}
        (read-stage :owner-range
          (reduce (fn [out datom]
                    (let [a (:a datom)]
                      (cond (= a row-a) (update out :legacy conj datom)
                            (= a root-a) (assoc out :raw (:v datom))
                            (= a retired-a) (update out :retired conj (row-id datom))
                            :else out)))
                  {:legacy [] :retired #{}} (d/datoms db :eavt owner)))
        root (read-stage :root-decode (decode-root raw))]
    (when (or (nil? root) (:texts root))
      (read-stage :mask
        (let [masked (into retired (:mask root))]
          (into (filterv #(not (contains? masked (row-id %))) legacy)
                (map #(hash-map :v %)) (:texts root)))))))

(defn live-datoms [db owner]
  ;; [DX-W1] Why: the selected durable basis defines the root and every referenced row together.
  ;; Rejected: reading the latest root for a historical cut or scanning the owner's growing version log.
  (if-let [{:keys [keys texts]} (read-stage :root (read-root db owner))]
    (if texts
      (covered-live-datoms db owner)
      (let [legacy (read-stage :legacy-range
                     (into {} (map (juxt row-id identity)) (d/datoms db :eavt owner :triplex.entity/row)))
            ids (read-stage :pages (into [] (mapcat #(page db %)) keys))]
        (read-stage :resolve
          (mapv (fn [id] (or (legacy id) (owned-row db owner id)
                             (throw (ex-info "Missing projected assertion" {:id id})))) ids))))
    (read-stage :legacy-range (vec (lean/live-texts db owner)))))

(defn revision [db owner]
  (or (:position (read-root db owner)) (scope/value db owner :triplex.entity/rev)))

(defn- predecessor [db owner id]
  (if-let [{:keys [keys mask texts]} (read-root db owner)]
    (if texts
      (or (some #(let [row {:v %}] (when (= id (row-id row)) %)) texts)
          (when-not (some #{id} mask) (subject/retirement db owner id)))
      (when (some #(some #{id} (page db %)) keys)
        (:v (owned-row db owner id))))
    (subject/retirement db owner id)))

(def ^:private update-code
  ;; [DX-W1] Why: two preparations at the same basis compete on one exact root, including a first-touch migration.
  ;; Rejected: comparing a cached peer's root or writing new versions after a legacy save won the migration race.
  '(let [{:keys [before-root pages cover]} (:owner-layout plan)
         actual-root (value owner :triplex.owner/root)]
     (when (or (not= before-root actual-root)
               (and (nil? actual-root) (not= revision (value owner :triplex.entity/rev))))
       (throw (ex-info "TRIPLEX_CONFLICT" {})))
     [[:db/add owner :triplex.owner/root
       (if cover
         (let [[mask retained] cover
               fresh (keep (fn [op]
                             (when (and (= :db/add (first op)) (= "owner-layout-version" (second op))
                                        (= :triplex.entity/row (nth op 2 nil)))
                               (nth (stamp op) 3))) (filter #(instance? java.util.List %) ops))]
           ;; [DX-W1] Why: Datomic supplies the wire collections as Java lists.
           ;; Rejected: appending to the native list (it is not a persistent collection).
           (pr-str [2 final clock (vec mask) (into (vec retained) fresh)]))
         (pr-str [1 final clock pages]))]
      [:db/add "datomic.tx" :triplex.tx/max-recorded-at clock]]))

(def code (subject/compile-code update-code))
(def ident (keyword "triplex.owner" (str "v-" (subs (schema/sha256 (pr-str code)) 0 24))))

(defn install-fixture! [conn]
  ;; [DX-W1] Why: limit authoritative writes to the gate until all other mutators fence this layout.
  ;; Rejected: activating a format that existing application routes can still misread or overwrite.
  (let [db (d/db conn)
        definitions [(schema/attr root-attr :db.type/string)
                     (schema/attr owner-attr :db.type/ref)
                     (schema/attr page-key-attr :db.type/string :db.unique/value)
                     (schema/attr page-attr :db.type/string)
                     {:db/ident ident :db/fn (d/function
                       {:lang :clojure :params '[db plan]
                        :requires '[[datomic.api :as d] [clojure.data.json :as json]]
                        :code code})}]
        missing (remove #(d/entid db (:db/ident %)) definitions)]
    (if (seq missing) (:db-after @(d/transact conn missing)) db)))

(defn- pages-after [db owner page-keys existing replacements journal]
  (let [pages (if (some? page-keys)
                (mapv #(page db %) page-keys)
                (let [limit (* page-size page-limit)
                      native (take (inc limit) (d/datoms db :eavt owner :triplex.entity/row))]
                  (when (> (count native) limit)
                    (throw (ex-info "Owner migration exceeds page budget" {})))
                  (mapv vec (partition-all page-size (or existing (map row-id (lean/live-texts db owner)))))))
        wanted (set (mapcat identity pages))]
    (when-not (every? wanted (keys replacements))
      (throw (ex-info "Owner predecessor is absent from the selected pages" {})))
    (reduce-kv
      (fn [result i ids]
        (let [after (mapv #(get replacements % %) ids)
              prior-key (get page-keys i)
              key (if (and prior-key (= after ids)) prior-key (str journal "/owner-page/" i))]
          (cond-> (update result :keys conj key)
            (not= key prior-key)
            (update :writes conj {:db/id (str "owner-page-" i) page-key-attr key page-attr (pr-str after)}))))
      {:keys [] :writes []} pages)))

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
  (let [prior (group-by #(contains? old-ids (row-id {:v %})) (:texts root))
        replaced (into #{} (map #(row-id {:v %})) (prior true))
        mask (into (set (:mask root)) (remove replaced old-ids))
        retained (vec (prior false))]
    (when (and (<= (count mask) cover-limit) (<= (+ (count retained) width) cover-limit))
      [(vec (sort mask)) retained])))

(defn prepare
  ([db data input] (prepare db data input false))
  ([db [[_ payload] :as data] input cover?]
  ;; [DX-W1] Why: the legacy compiler proves command shape, retractions and exact journal bytes.
  ;; Rejected: a second parser for ordinary and ordered IDs, or treating a customer's packed payload as a page.
  (when-let [{:keys [owner journal provisional ops] :as plan}
             (subject/plan db data input nil predecessor revision)]
    (let [root (read-root db owner)
          row-entry (fn [text] (let [row (lean/decode text)] [(:attribute row) (:id row)]))
          old (into {} (keep (fn [[kind eid attr text :as op]]
                              (when (and (vector? op) (= :db/retract kind) (= owner eid) (= :triplex.entity/row attr))
                                (row-entry text)))) (filter vector? ops))
          fresh (into {} (keep (fn [[kind eid attr row]]
                                (when (and (= :triplex/assert kind) (= (str "e:" (:owner-key plan)) eid)
                                           (= :triplex.entity/row attr))
                                  (row-entry (second row))))) (filter vector? (:ops payload)))
          _ (when-not (= (set (keys old)) (set (keys fresh)))
              (throw (ex-info "Owner layout requires exact field replacements" {})))
          replacement (into {} (map (fn [[attribute id]] [id (fresh attribute)])) old)
          old-ids (set (vals old))
          cover (when (and cover? (nil? (:keys root))) (cover-after root old-ids (count fresh)))
          existing (when (and (not cover) (:texts root)) (mapv row-id (covered-live-datoms db owner)))
          pages (when-not cover (pages-after db owner (:keys root) existing replacement journal))
          tx (d/entid db ident)]
      (when-not tx (throw (ex-info "Owner layout function missing" {})))
      (assoc (dissoc plan :head-ids :retirement-prefixes)
             :function [ident (:tx (first (d/datoms db :eavt tx :db/fn)))]
             :owner-layout {:before-root (:raw root) :pages (:keys pages) :cover cover}
             :ops (into (version-ops owner journal provisional ops) (:writes pages))
             :written-pages (:writes pages)
             :retired-ids old-ids)))))

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
        page-a (d/entid db page-attr)
        page-key-a (d/entid db page-key-attr)
        stamp (commit/stamp true clock #{} (dec provisional) provisional position false nil)
        expected-rows (into [] (keep (fn [op]
                                       (when (and (vector? op) (= :db/add (first op))
                                                  (= version (second op)) (= :triplex.entity/row (nth op 2 nil)))
                                         (peek (stamp op)))))
                            ops)
        target-root (if-let [[mask retained] (get-in plan [:owner-layout :cover])]
                      (pr-str [2 position clock mask (into retained expected-rows)])
                      (root-text position clock (get-in plan [:owner-layout :pages])))
        written (into {} (keep (fn [x]
                                (when (= page-key-a (:a x))
                                  [(:v x) (:v (some #(when (and (= (:e x) (:e %)) (= page-a (:a %))) %) added))])))
                      added)]
    (let [checks {:owner (= 1 (count versions))
                  :root (boolean (some #(and (= owner (:e %)) (= root-a (:a %)) (= target-root (:v %))) added))
                  :pages (= written (into {} (map (juxt page-key-attr page-attr)) (:written-pages plan)))
                  :rows (= (set expected-rows) (into #{} (comp (filter #(= row-a (:a %))) (map :v)) data))
                  :retirements (= (set (map #(subject/retirement-text (lean/prefix %) position clock journal) retired-ids))
                                  (into #{} (comp (filter #(= retired-a (:a %))) (map :v)) data))}]
      (when-not (every? true? (vals checks))
        (throw (ex-info (str "Owner layout durable report unavailable " (pr-str checks))
                        {:status 503 :code "OutcomeUnknown"}))))
    (assoc (subject/verify-report-at report plan revision) :subject-save (str ident))))
