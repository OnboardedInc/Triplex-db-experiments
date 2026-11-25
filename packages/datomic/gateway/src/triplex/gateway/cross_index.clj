(ns triplex.gateway.cross-index
  "[DX-XQ4] Step 1 of questions across subjects (design 2026-11-24, option A): an index written in the same commit as
  the facts, for the attributes and entity types a declaration names. Each entry is one datom
  [entity :triplex.ix/entry key] on the Datomic entity that holds the fact's row; the key sorts by account, attribute
  code, value, open or closed valid interval, entity and fact. Everything is behind TX2_CROSS_INDEX=1 (default off):
  with the option off no function here is reached and no save changes. The transactor's stored functions do not change:
  the write gateway adds plain :db/add, :db/retract and :db/cas operations to the transaction data it prepares."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.lean :as lean] [triplex.gateway.schema :as schema] [triplex.gateway.pinned :as pinned]
            [triplex.gateway.subject-save :as subject] [triplex.gateway.group-prepare :as prepared]))

(set! *warn-on-reflection* false)

(def enabled (= "1" (System/getenv "TX2_CROSS_INDEX")))

;; ---------------------------------------------------------------------------------------------------------------
;; Schema. Installed by the declaration route only (never added to schema/schema: schema-hash pins existing scopes and
;; the per-subject writer checks it).
(def declaration-id "_triplex/index/declaration")
(def schema-ops
  [(schema/attr :triplex.ix/declaration :db.type/string)
   (schema/attr :triplex.ix/seq :db.type/long)
   (assoc (schema/attr :triplex.ix/entry :db.type/string nil true) :db/cardinality :db.cardinality/many)
   (assoc (schema/attr :triplex.ix/epoch :db.type/string) :db/cardinality :db.cardinality/many)
   ;; [DX-XQ4] Review B1: attributes a release has written (write class "activation"), on the declaration entity.
   (assoc (schema/attr :triplex.ix/release-attribute :db.type/string) :db/cardinality :db.cardinality/many)])
(defn installed? [db] (some? (d/entid db :triplex.ix/entry)))
(defn release-installed? [db] (some? (d/entid db :triplex.ix/release-attribute)))

;; ---------------------------------------------------------------------------------------------------------------
;; Key encoding. The separator is U+0001; U+0000 to U+0002 inside a text are written as U+0002 followed by the character
;; plus 3, so the separator never appears inside a field and byte order equals text order (a prefix still sorts before
;; its extensions because every escaped or plain character is above the separator).
(def sep "\u0001")
(def ^:const sep-char \u0001)
(defn esc ^String [^String s]
  (if (loop [i 0] (cond (= i (.length s)) false (< (int (.charAt s i)) 3) true :else (recur (inc i))))
    (let [out (StringBuilder.)]
      (dotimes [i (.length s)]
        (let [c (int (.charAt s i))]
          (if (< c 3) (doto out (.append \u0002) (.append (char (+ c 3)))) (.append out (char c)))))
      (.toString out))
    s))
(defn unesc ^String [^String s]
  (if (neg? (.indexOf s (int 2))) s
    (let [out (StringBuilder.)]
      (loop [i 0]
        (when (< i (.length s))
          (let [c (.charAt s i)]
            (if (= c \u0002)
              (do (.append out (char (- (int (.charAt s (inc i))) 3))) (recur (+ i 2)))
              (do (.append out c) (recur (inc i)))))))
      (.toString out))))

;; Order-preserving 16 hex digits of an IEEE double; -0.0 is written as 0.0 (query/compare-op treats them as equal).
(defn hex16 ^String [x]
  (let [x (double x) x (if (== x 0.0) 0.0 x)
        bits (Double/doubleToRawLongBits x)
        k (if (neg? bits) (bit-not bits) (bit-xor bits Long/MIN_VALUE))
        h (Long/toHexString k)]
    (str (subs "0000000000000000" (.length h)) h)))
(defn unhex16 ^double [^String h]
  (let [k (Long/parseUnsignedLong h 16)
        bits (if (neg? k) (bit-xor k Long/MIN_VALUE) (bit-not k))]
    (Double/longBitsToDouble bits)))

;; Exact integers of any size: sign, length, digits (negative values by complement, so byte order is numeric order).
(defn int-enc ^String [text]
  (let [n (biginteger (BigInteger. (str/trim (str text))))
        digits (.toString (.abs n))
        len (.length digits)]
    (if (neg? (.signum n))
      (str "m" (format "%04x" (- 0xffff len))
           (apply str (map #(char (- (+ 48 57) (int %))) digits)))
      (str "p" (format "%04x" len) digits))))
(defn int-dec ^String [^String e]
  (let [digits (subs e 5)]
    (if (= \m (.charAt e 0))
      (str "-" (apply str (map #(char (- (+ 48 57) (int %))) digits)))
      digits)))

(def long-limit 200)
(defn truncate ^String [^String s]
  (if (<= (.length s) long-limit) s
    (let [n (if (Character/isHighSurrogate (.charAt s (dec long-limit))) (dec long-limit) long-limit)] (subs s 0 n))))

(def families #{"string" "integer" "number" "datetime" "boolean" "ref"})
(def family-letter {"string" "s" "integer" "i" "number" "n" "datetime" "d" "boolean" "b" "ref" "r" "json" "j" "blob" "x"})

(defn value-field
  "[field long?] for a decoded row; `full?` skips the truncation of long texts (used to confirm a marked entry)."
  ([row] (value-field row false))
  ([row full?]
   (let [kind (:value_type row)]
     (case kind
       ("string" "ref") (let [^String v (or (:value_string row) "") t (if full? v (truncate v))]
                          [(str (family-letter kind) (esc t)) (not= (.length t) (.length v))])
       "integer" [(str "i" (int-enc (:value_string row))) false]
       "number" [(str "n" (hex16 (:value_number row))) false]
       "datetime" [(str "d" (hex16 (:value_datetime row))) false]
       "boolean" [(str "b" (if (== 1 (double (:value_boolean row))) "1" "0")) false]
       "json" ["j" false]
       "blob" ["x" false]
       nil))))

(def account-re #"[A-Za-z0-9_-]{1,64}")
(def system-token ":system")
(defn token+local
  "[account-token local-part] of an entity ID, or nil when it has no account prefix (no entry is written)."
  [^String entity]
  (cond
    (.startsWith entity "acct/")
    (let [i (.indexOf entity "/" 5)]
      (when (pos? i)
        (let [account (subs entity 5 i)]
          (when (re-matches account-re account) [account (subs entity (inc i))]))))
    (.startsWith entity "_triplex/") [system-token (subs entity 9)]
    :else nil))
(defn account-token [account] (if (= account "_system") system-token account))
(defn entity-id [token ^String local] (if (= token system-token) (str "_triplex/" local) (str "acct/" token "/" local)))

(defn value-key [token code field local fact vf vt long?]
  (str token sep code sep field sep
       (if (some? vt) (str "C" sep (hex16 vt) sep) (str "O" sep))
       (esc local) sep (esc fact) sep (hex16 vf) (when long? (str sep "L"))))
(defn type-key [token entity-type local] (str token sep "T" sep (esc entity-type) sep (esc local)))

(defn- split-key
  "The fields of a key, split at U+0001 by hand (a regular expression cost about ten times more per entry)."
  [^String k]
  (let [out (java.util.ArrayList. 10)]
    (loop [start 0]
      (let [i (.indexOf k (int 1) (int start))]
        (if (neg? i)
          (do (.add out (.substring k start)) out)
          (do (.add out (.substring k start i)) (recur (inc i))))))))
(defn parse-key
  "A value entry as {:token :code :field :vt :local :fact :vf :long?}; a type entry as {:token :type :local}."
  [^String k]
  (let [parts (vec (split-key k))
        [token code] parts]
    (if (= code "T")
      {:token token :type (unesc (nth parts 2)) :local (unesc (nth parts 3))}
      (let [[_ _ field state & more] parts]
        (if (= state "O")
          (let [[local fact vf l] more]
            {:token token :code code :field field :vt nil :local (unesc local) :fact (unesc fact) :vf vf :long? (= l "L")})
          (let [[vt local fact vf l] more]
            {:token token :code code :field field :vt vt :local (unesc local) :fact (unesc fact) :vf vf :long? (= l "L")}))))))

(defn valid-at? [{:keys [vf vt]} ^String v16]
  (and (<= (compare vf v16) 0) (or (nil? vt) (pos? (compare vt v16)))))

;; ---------------------------------------------------------------------------------------------------------------
;; The declaration (one system entity; its JSON text and a fence sequence).
(defn declaration-eid [db]
  (when (installed? db) (d/entid db [:triplex.entity/id declaration-id])))
(defn parse-declaration [^String text]
  (let [m (json/read-str text)
        attributes (get m "attributes" [])
        types (get m "types" [])]
    {:text text
     :attributes attributes
     :types types
     :codes (into {} (map (fn [a] [(get a "attribute") (get a "code")])) attributes)
     :families (into {} (map (fn [a] [(get a "code") (get a "family")])) attributes)
     :by-code (into {} (map (fn [a] [(get a "code") (get a "attribute")])) attributes)
     :entry-types (into #{} (keep #(when (= "entries" (get % "list")) (get % "entityType"))) types)
     :id-types (into {} (keep #(when (= "idPattern" (get % "list")) [(get % "entityType") (get % "idPattern")])) types)}))
(def ^:private parsed (atom {}))
(defn declaration
  "The declaration in force at `db`: nil when none, else the parsed map with :eid and :seq."
  [db]
  (when-let [e (declaration-eid db)]
    (let [text (:v (first (d/datoms db :eavt e :triplex.ix/declaration)))
          s (:v (first (d/datoms db :eavt e :triplex.ix/seq)))]
      (when s
        (if-not text
          ;; Installed with the option but nothing declared yet: only the fence (sequence 0).
          {:eid e :seq s :text nil :codes {} :families {} :by-code {} :entry-types #{} :id-types {} :attributes [] :types []}
          (let [p (or (get @parsed text)
                      (let [p (parse-declaration text)]
                        (swap! parsed #(if (> (count %) 64) {text p} (assoc % text p))) p))]
            (assoc p :eid e :seq s)))))))
(def ^:private ensured (java.util.concurrent.ConcurrentHashMap.))
(defn ensure-installed!
  "[DX-XQ4] With the option on, the fence exists before any declaration: the schema and the declaration entity with
  sequence 0, so a save prepared before the first declaration cannot commit after it. Returns the db to prepare on."
  [conn db]
  (if (or (not enabled) (and (declaration-eid db) (release-installed? db))) db
    (let [db (if (and (installed? db) (release-installed? db)) db (:db-after @(d/transact conn schema-ops)))]
      (if (declaration-eid db) db
        (try (:db-after @(d/transact conn [{:db/id "declaration" :triplex.entity/id declaration-id :triplex.ix/seq 0}]))
             (catch Exception _ (d/db conn)))))))
(defn epochs
  "{code {:position p :t t}} from the completion datoms the backfill writes (type lists use the code \"T:<type>\")."
  [db e]
  (into {} (map (fn [datom]
                  (let [[code p] (str/split (:v datom) #" ")]
                    [code {:position (Long/parseLong p) :t (d/tx->t (:tx datom))}])))
        (d/datoms db :eavt e :triplex.ix/epoch)))

;; ---------------------------------------------------------------------------------------------------------------
;; Entries of one decoded row under a declaration.
(defn row-entries
  "The value entry (and type entry) a live row owns, or nil. Protected attributes are never keyed."
  [decl protected row]
  (when-let [[token local] (token+local (:entity_id row))]
    (let [code (get (:codes decl) (:attribute row))
          value (when (and code (not (contains? protected (:attribute row))))
                  (when-let [[field long?] (value-field row)]
                    (value-key token code field local (:id row) (:valid_from row) (:valid_to row) long?)))
          typed (when (contains? (:entry-types decl) (:entity_type row))
                  (type-key token (:entity_type row) local))]
      (when (or value typed) {:value value :type typed}))))

;; [DX-XQ4] Why (review D3): the bulk frame bound (96 rows, write_policy and group/bound-frame!) counts fresh and retired
;; rows; with the index on, a frame of declared values carries up to one value entry per fresh row, one retraction per
;; retired row and one type entry per new entity, all applied by the single writer. With the option on, a non-live
;; frame that carries entries counts them beside its rows against the same limit. Rejected: a separate, larger entry
;; limit (it would never bind: entries are at most twice the rows), and changing the bound with the option off.
(defn entry-datoms [p]
  (count (filter #(and (vector? %) (#{:db/add :db/retract} (first %)) (= :triplex.ix/entry (nth % 2 nil))) (:ops p))))
(defn bound-frame! [p input limit]
  (when (and enabled (not= "live" (get input "writeClass" (if (seq (get input "claims")) "live" "import"))))
    (let [entries (entry-datoms p)
          rows (+ (count (:new-ids p)) (count (filter #(and (vector? %) (= :triplex/retract (first %))) (:ops p))))]
      (when (and (pos? entries) (> (+ rows entries) limit))
        (throw (ex-info (str "Atomic bulk frame exceeds its limit of " limit " rows and index entries (" rows " rows, "
                             entries " index entries)")
                        {:code "BulkFrameTooLarge" :status 413 :maximum limit}))))))

;; [DX-XQ4] Why (review B1, the smallest safe rule): a release writes its values in the background (settlement), so an
;; index answer on such an attribute would be stale while it settles and would still say trailingBy 0. With the option
;; on, a save of write class "activation" (a release's settlement) records each attribute it writes on the
;; declaration entity (only those not yet recorded), and is refused when it writes a declared attribute; a
;; declaration naming a recorded attribute is refused (cross_find.clj). Rejected for now: the full rule (an answer that
;; names the release in force and the account's settlement state, refusing SettlementInProgress), which needs the
;; settlement writer's state on this branch.
(defn release-attributes [db]
  (if-let [e (and (release-installed? db) (declaration-eid db))]
    (into #{} (map :v) (d/datoms db :eavt e :triplex.ix/release-attribute))
    #{}))
(defn release-ops [db decl fresh input]
  (when (and enabled (:eid decl) (= "activation" (get input "writeClass")))
    (let [attrs (into (sorted-set) (comp (filter #(nil? (:retracted_at %))) (map :attribute)
                                         (filter #(and (string? %) (not (.startsWith ^String % ":_")))))
                      fresh)
          declared (filter #(contains? (:codes decl) %) attrs)]
      (when (seq declared)
        (throw (ex-info (str "A release may not write an attribute declared for questions across subjects ("
                             (str/join ", " declared) "): its answers would be stale while the release settles")
                        {:status 409 :code "ReleaseWritesDeclaredAttribute"})))
      ;; Recording a new attribute moves the declaration's sequence (the save's fence becomes s -> s+1), so a
      ;; declaration checked against the set before this save fails its own cas and is checked again.
      (let [known (release-attributes db)
            new (vec (for [a attrs :when (not (contains? known a))] [:db/add (:eid decl) :triplex.ix/release-attribute a]))]
        (when (seq new) {:ops new :fence [:db/cas (:eid decl) :triplex.ix/seq (:seq decl) (inc (:seq decl))]})))))

(defn op? [op]
  (and (vector? op)
       (case (first op)
         (:db/add :db/retract) (= :triplex.ix/entry (nth op 2 nil))
         :db/cas (= :triplex.ix/seq (nth op 2 nil))
         false)))

(defn peer-behind! [id]
  (throw (ex-info (str "The write gateway's peer does not hold the retired fact " id " yet")
                  {:status 503 :code "IndexPeerBehind" :index-peer-behind true})))
(defn peer-behind? [e]
  (some #(true? (:index-peer-behind (ex-data %))) (take-while some? (iterate ex-cause e))))

(defn- retired-text
  "The stored row text of a retired fact, read on the write gateway's peer (EAVT of its entity, then by ID)."
  [db id entity]
  (let [prefix (lean/prefix id)
        eid (d/entid db [:triplex.entity/id entity])
        on-entity (when eid
                    (let [x (first (d/seek-datoms db :eavt eid :triplex.entity/row prefix))]
                      (when (and x (= eid (:e x)) (= (d/entid db :triplex.entity/row) (:a x))
                                 (.startsWith ^String (:v x) prefix)) x)))]
    (or on-entity (lean/by-id (d/history db) id))))

(defn tx-ops
  "Index operations for one prepared save: an assertion per fresh live row of a declared attribute, a retraction per
  retired fact's entry (its key is computed from the fact's own stored text, which never changes for an ID), a type
  entry when the peer's view lacks it, and the declaration fence on every save. [ops counts]"
  [db decl protected fresh old & [lenient?]]
  (let [ix-a (d/entid db :triplex.ix/entry)
        adds (for [row fresh :when (nil? (:retracted_at row))
                   :let [e (row-entries decl protected row)] :when e]
               [row e])
        typed (distinct (for [[row e] adds :when (:type e)] [(:entity_id row) (:type e)]))
        type-ops (keep (fn [[entity k]]
                         (let [eid (d/entid db [:triplex.entity/id entity])]
                           (when-not (and eid (first (d/datoms db :eavt eid ix-a k)))
                             [:db/add (str "e:" entity) :triplex.ix/entry k])))
                       typed)
        value-ops (for [[row e] adds :when (:value e)] [:db/add (str "e:" (:entity_id row)) :triplex.ix/entry (:value e)])
        retract-ops (keep (fn [row]
                            (let [datom (retired-text db (:id row) (:entity_id row))]
                              ;; After one catch-up a fact that still is not there never existed: no index operation,
                              ;; and the commit function refuses the retirement as it always did (409).
                              (when-not (or datom lenient?) (peer-behind! (:id row)))
                              (when datom
                                (let [stored (lean/decode (:v datom))]
                                  (when-let [k (:value (row-entries decl protected stored))]
                                    [:db/retract (:e datom) :triplex.ix/entry k])))))
                          (distinct old))]
    (vec (concat [[:db/cas (:eid decl) :triplex.ix/seq (:seq decl) (:seq decl)]]
                 value-ops type-ops retract-ops))))

;; [DX-XQ4] Why: an index entry (a writer's or the backfill's) never changes a row, so it must not send a pinned read of
;; an unchanged subject to as-of (pinned/unchanged-since? sends any datom newer than the pin there). The check is
;; installed from here, after the stored functions are compiled: editing pinned.clj itself shifted the generated symbol
;; numbers inside the stored commit and per-subject functions, whose identity hashes their text. Identical to the
;; original when a database holds no entry (the attribute is then absent). Rejected: an option (a copy that holds
;; entries is read by gateways with the index off too, as in the S-2 off arm).
(defn unchanged-since? [current eid t p]
  (when (and eid t p)
    (let [rev-a (d/entid current :triplex.entity/rev)
          rev (when rev-a (:v (first (d/datoms current :eavt eid rev-a))))
          last-tx (d/t->tx t)
          ix-a (d/entid current :triplex.ix/entry)]
      (and (some? rev) (<= (long rev) (long p))
           (every? (fn [^datomic.Datom datom] (or (<= (.tx datom) last-tx) (and ix-a (= ix-a (.a datom)))))
                   (d/datoms current :eavt eid))))))
(alter-var-root #'pinned/unchanged-since? (constantly unchanged-since?))

;; [DX-XQ4, moved by DX-XQ10] The per-subject writer and index entries, installed from here with the option on (as the
;; pinned check above), so subject_save.clj carries no index code and no stored function's identity moves with it off:
;; (1) the writer's eligibility admits entry operations beside the prepared path's small operations; (2) an entry for
;; the subject goes to the same numeric owner as its rows (render-ops drops the owner's upsert map, so a tempid would
;; mint an entity). render-ops passes entry operations through unchanged, so readdressing them after it is the same.
(when enabled
  (alter-var-root #'subject/small-op (constantly (fn [op] (or (prepared/small-op? op) (op? op)))))
  (alter-var-root #'subject/render-ops
    (fn [render]
      (fn [ops owner subject prior prior-rows new-ids marker]
        (let [temp-owner (str "e:" subject)]
          (mapv (fn [op] (if (and subject/numeric-owner? (vector? op) (= :triplex.ix/entry (nth op 2 nil)) (= temp-owner (second op)))
                           (assoc op 1 owner) op))
                (render ops owner subject prior prior-rows new-ids marker)))))))
