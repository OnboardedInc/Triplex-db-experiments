(ns triplex.gateway.owner-layout
  (:require [clojure.edn :as edn]
            [datomic.api :as d]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.scope :as scope]
            [triplex.gateway.schema :as schema]
            [triplex.gateway.subject-save :as subject]))

(def page-size 32)
(def page-limit 8)
(def root-attr :triplex.owner/root)
(def owner-attr :triplex.owner/version-owner)
(def page-key-attr :triplex.owner/page-key)
(def page-attr :triplex.owner/page-ids)
(def version "owner-layout-version")

(defn root-text [position clock pages] (pr-str [1 position clock pages]))
(defn- read-root [db owner]
  (when-let [raw (scope/value db owner root-attr)]
    (let [[version position clock keys] (edn/read-string raw)]
      (when-not (and (= 1 version) (integer? position) (number? clock)
                     (vector? keys) (<= (count keys) page-limit) (every? string? keys))
        (throw (ex-info "Invalid owner projection root" {})))
      {:raw raw :position position :clock clock :keys keys})))

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

(defn live-datoms [db owner]
  ;; [DX-W1] Why: the selected durable basis defines the root and every referenced row together.
  ;; Rejected: reading the latest root for a historical cut or scanning the owner's growing version log.
  (if-let [{:keys [keys]} (read-root db owner)]
    (mapv (fn [id] (or (owned-row db owner id)
                       (throw (ex-info "Missing projected assertion" {:id id}))))
          (mapcat #(page db %) keys))
    (vec (lean/live-texts db owner))))

(defn revision [db owner]
  (or (:position (read-root db owner)) (scope/value db owner :triplex.entity/rev)))

(defn- predecessor [db owner id]
  (if-let [{:keys [keys]} (read-root db owner)]
    (when (some #(some #{id} (page db %)) keys)
      (:v (owned-row db owner id)))
    (subject/retirement db owner id)))

(def ^:private update-code
  ;; [DX-W1] Why: two preparations at the same basis compete on one exact root, including a first-touch migration.
  ;; Rejected: comparing a cached peer's root or writing new versions after a legacy save won the migration race.
  '(let [{:keys [before-root pages]} (:owner-layout plan)
         actual-root (value owner :triplex.owner/root)]
     (when (or (not= before-root actual-root)
               (and (nil? actual-root) (not= revision (value owner :triplex.entity/rev))))
       (throw (ex-info "TRIPLEX_CONFLICT" {})))
     [[:db/add owner :triplex.owner/root (pr-str [1 final clock pages])]
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

(defn- pages-after [db owner page-keys replacements journal]
  (let [pages (if (some? page-keys)
                (mapv #(page db %) page-keys)
                (let [prior (take (inc (* page-size page-limit)) (lean/live-texts db owner))]
                  (when (> (count prior) (* page-size page-limit))
                    (throw (ex-info "Owner migration exceeds page budget" {})))
                  (mapv vec (partition-all page-size (map (comp :id lean/decode :v) prior)))))
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

(defn prepare [db [[_ payload] :as data] input]
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
          pages (pages-after db owner (:keys root) replacement journal)
          tx (d/entid db ident)]
      (when-not tx (throw (ex-info "Owner layout function missing" {})))
      (assoc (dissoc plan :head-ids :retirement-prefixes)
             :function [ident (:tx (first (d/datoms db :eavt tx :db/fn)))]
             :owner-layout {:before-root (:raw root) :pages (:keys pages)}
             :ops (into (version-ops owner journal provisional ops) (:writes pages))
             :written-pages (:writes pages)
             :retired-ids (set (vals old)) :added-ids (set (vals fresh))))))

(defn verify-report [report {:keys [owner journal retired-ids added-ids] :as plan}]
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
        target-root (root-text position clock (get-in plan [:owner-layout :pages]))
        page-a (d/entid db page-attr)
        page-key-a (d/entid db page-key-attr)
        written (into {} (keep (fn [x]
                                (when (= page-key-a (:a x))
                                  [(:v x) (:v (some #(when (and (= (:e x) (:e %)) (= page-a (:a %))) %) added))])))
                      added)]
    (when-not (and (= 1 (count versions))
                   (some #(and (= owner (:e %)) (= root-a (:a %)) (= target-root (:v %))) added)
                   (= written (into {} (map (juxt page-key-attr page-attr)) (:written-pages plan)))
                   (= added-ids (into #{} (comp (filter #(= row-a (:a %))) (map (comp :id lean/decode :v))) data))
                   (= (set (map #(subject/retirement-text (lean/prefix %) position clock journal) retired-ids))
                      (into #{} (comp (filter #(= retired-a (:a %))) (map :v)) data)))
      (throw (ex-info "Owner layout durable report unavailable" {:status 503 :code "OutcomeUnknown"})))
    (assoc (subject/verify-report-at report plan revision) :subject-save (str ident))))
