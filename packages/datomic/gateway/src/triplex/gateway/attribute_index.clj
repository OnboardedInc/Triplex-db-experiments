(ns triplex.gateway.attribute-index
  "[DX-XQ2] Spike, default off: a value index by account, attribute and value, written in the same commit as the facts.
  TX2_ATTRIBUTE_INDEX is a comma-separated list of attributes (\":status,:start-date\"); the token @type adds one
  marker per (account, entity type, entity). Each current row of a listed attribute owns one tuple datom on the row's
  own entity, asserted with the row and retracted with it, so Datomic's AVET holds
  [account attribute value entity valid-from valid-to row-id] and its as-of view is the index at any past position.
  Nothing here is the final design."
  (:require [clojure.string :as str] [clojure.walk :as walk] [clojure.data.json :as json]
            [datomic.api :as d] [triplex.gateway.slim :as slim])
  (:import [java.security MessageDigest] [java.util Base64]))

(def listed
  (let [raw (System/getenv "TX2_ATTRIBUTE_INDEX")]
    (into (sorted-set) (remove empty?) (map str/trim (str/split (or raw "") #",")))))
(def types? (contains? listed "@type"))
(def attrs (disj listed "@type"))
(def enabled (boolean (seq listed)))

;; ---- schema: one tuple attribute per value family (Datomic orders each family natively) ----
(def families
  {:triplex.xq/s :db.type/string :triplex.xq/r :db.type/string :triplex.xq/i :db.type/long
   :triplex.xq/x :db.type/string :triplex.xq/n :db.type/double :triplex.xq/d :db.type/double
   :triplex.xq/b :db.type/boolean})
(def family-of {"string" :triplex.xq/s "ref" :triplex.xq/r "integer" :triplex.xq/i "number" :triplex.xq/n
                "datetime" :triplex.xq/d "boolean" :triplex.xq/b})
(def schema
  (concat
    (for [[ident t] families]
      {:db/ident ident :db/valueType :db.type/tuple :db/cardinality :db.cardinality/many :db/index true
       :db/tupleTypes [:db.type/string :db.type/string t :db.type/string :db.type/double :db.type/double :db.type/string]})
    [{:db/ident :triplex.xq/type :db/valueType :db.type/tuple :db/cardinality :db.cardinality/many :db/index true
      :db/tupleTypes [:db.type/string :db.type/string :db.type/string]}
     ;; Rows the tuple cannot hold (an element over 256 characters, or a json or blob value): one marker each, so a
     ;; query that could match them is refused instead of answered without them.
     {:db/ident :triplex.xq/long :db/valueType :db.type/tuple :db/cardinality :db.cardinality/many :db/index true
      :db/tupleTypes [:db.type/string :db.type/string :db.type/string :db.type/string :db.type/string]}]))
(def all-idents (into (conj (set (keys families)) :triplex.xq/type) [:triplex.xq/long]))

(defn install! [conn db]
  (if (or (not enabled) (every? #(d/entid db %) all-idents))
    db
    (:db-after @(d/transact conn (vec schema)))))

;; ---- the one key function, evaluated on the peer and embedded in the general writer's installed function ----
;; cols is the row's positional column vector (lean/columns order, as slim/row-columns returns it).
(def key-code-template
  '(fn [cols]
     (let [attr (nth cols 3) etype (nth cols 14)]
       (when (and (contains? xq-attrs attr) (not= "_Transaction" etype))
         (let [^String entity (nth cols 2)
               account (when (string? entity) (second (re-matches (re-pattern "acct/([A-Za-z0-9_-]{1,64})/.+") entity)))]
           (when account
             (let [num (fn [x] (if (= "-0" x) -0.0 (double x)))
                   ^String id (nth cols 1) kind (nth cols 4)
                   from (num (nth cols 11)) to (when (some? (nth cols 12)) (num (nth cols 12)))
                   ;; Datomic 1.0.7745 refuses tuple strings over 256 characters (probe); bytes are checked too.
                   short? (fn [^String s] (and (<= (.length s) 256) (<= (alength (.getBytes s "UTF-8")) 256)))
                   digest (fn [^String s] (if (short? s) s
                                            (str "sha256:" (apply str (map #(format "%02x" %)
                                              (.digest (java.security.MessageDigest/getInstance "SHA-256")
                                                       (.getBytes s "UTF-8")))))))
                   [a v] (case kind
                           "string" [:triplex.xq/s (nth cols 5)]
                           "ref" [:triplex.xq/r (nth cols 5)]
                           "integer" (let [b (java.math.BigInteger. ^String (nth cols 5))]
                                       (if (< (.bitLength b) 64) [:triplex.xq/i (.longValue b)] [:triplex.xq/x (nth cols 5)]))
                           "number" [:triplex.xq/n (num (nth cols 6))]
                           "datetime" [:triplex.xq/d (num (nth cols 8))]
                           "boolean" [:triplex.xq/b (not (zero? (nth cols 7)))]
                           [nil nil])
                   ids-short (and (short? entity) (short? id))]
               (cond
                 (and a ids-short (or (not (string? v)) (short? v))) [a [account attr v entity from to id]]
                 :else [:triplex.xq/long [account attr (cond (not ids-short) "identity" a "value" :else "family")
                                          (digest entity) (digest id)]]))))))))
(def key-code (walk/postwalk-replace {'xq-attrs attrs} key-code-template))
(def key-of (eval key-code))

;; In the general writer (transactor side): the retired row's stored text decides its index datom.
(def retract-code
  (walk/postwalk-replace {'row-columns-code slim/row-columns-code 'xq-key-code key-code}
    '(fn [e ^String text]
       (when-let [[a v] (xq-key-code (row-columns-code text))] [[:db/retract e a v]]))))

(defn text-columns [^String text] (slim/row-columns text))
(defn add-op [entity ^String text]
  (when-let [[a v] (key-of (text-columns text))] [:db/add entity a v]))
(defn retract-op [entity ^String text]
  (when-let [[a v] (key-of (text-columns text))] [:db/retract entity a v]))

(defn type-key [account etype entity]
  (let [short? (fn [^String s] (and (<= (.length s) 256) (<= (alength (.getBytes s "UTF-8")) 256)))]
    (if (and (short? etype) (short? entity)) [:triplex.xq/type [account etype entity]]
      [:triplex.xq/long [account "@type" "identity" etype entity]])))
(defn account-of [entity] (when (string? entity) (second (re-matches #"acct/([A-Za-z0-9_-]{1,64})/.+" entity))))

(defn tx-adds
  "Peer side, from the request's own row texts: index assertions for the fresh current rows of listed attributes
  (protected attributes never), and a type marker for each entity this peer sees as new."
  [db input fresh protected]
  (when enabled
    (vec (concat
           (keep (fn [row]
                   (when (and (nil? (:retracted_at row)) (attrs (:attribute row)) (not (contains? protected (:attribute row))))
                     (when-let [text (get-in input ["rowTexts" (:id row)])]
                       (add-op (str "e:" (:entity_id row)) text))))
                 fresh)
           (when types?
             (for [[entity etype] (distinct (keep (fn [r] (when (and (:entity_type r) (not= "_Transaction" (:entity_type r)))
                                                           [(:entity_id r) (:entity_type r)])) fresh))
                   :let [account (account-of entity)]
                   :when (and account (nil? (d/entid db [:triplex.entity/id entity])))]
               (let [[a v] (type-key account etype entity)] [:db/add (str "e:" entity) a v])))))))

;; ---- the read route: one account, bounded, with a cursor ----
(defn- fail! [code message] (throw (ex-info message {:status 400 :code code})))
(defn- bounded [x lo hi default name]
  (cond (nil? x) default
        (and (integer? x) (<= lo x hi)) (long x)
        :else (fail! "InvalidQuery" (str name " must be an integer from " lo " to " hi))))
(defn- typed [{:strs [type value] :as wire}]
  (case type
    "string" [:triplex.xq/s value]
    "ref" [:triplex.xq/r value]
    "integer" (let [b (java.math.BigInteger. (str value))]
                (if (< (.bitLength b) 64) [:triplex.xq/i (.longValue b)] [:triplex.xq/x (str value)]))
    "number" [:triplex.xq/n (double value)]
    "datetime" [:triplex.xq/d (double value)]
    "boolean" [:triplex.xq/b (boolean value)]
    (fail! "InvalidQuery" (str "Unsupported value type " (pr-str wire)))))
(defn- successor [family v]
  (case family
    (:triplex.xq/s :triplex.xq/r :triplex.xq/x) (str v "\u0000")
    (:triplex.xq/n :triplex.xq/d) (Math/nextUp (double v))
    :triplex.xq/i (when (< v Long/MAX_VALUE) (inc v))
    :triplex.xq/b (when (false? v) true)))
(defn encode-cursor [x] (.encodeToString (Base64/getUrlEncoder) (.getBytes ^String (json/write-str x) "UTF-8")))
(defn decode-cursor [^String s]
  (try (json/read-str (String. (.decode (Base64/getUrlDecoder) s) "UTF-8"))
       (catch Exception _ (fail! "InvalidQuery" "Invalid cursor"))))

(defn- long-markers [db account attr]
  (let [end [account (str attr "\u0000")]]
    (frequencies (map #(nth (:v %) 2) (take 64 (d/index-range db :triplex.xq/long [account attr] end))))))

(defn- clause-plan [db account clause protected]
  (let [attr (get clause "attribute")]
    (when-not (and (string? attr) (attrs attr)) (fail! "AttributeNotIndexed" (str "Attribute is not indexed: " attr)))
    (when (contains? protected attr) (fail! "ProtectedAttribute" "Protected values are never looked up by value"))
    (let [markers (long-markers db account attr)
          op (get clause "op" "eq")]
      (when (pos? (get markers "identity" 0))
        (fail! "IndexIncomplete" "Rows with identifiers over 256 characters cannot be answered from this index"))
      (case op
        "eq" (let [[family v] (typed (get clause "value"))
                   _ (when (and (= family :triplex.xq/s) (pos? (get markers "value" 0))
                                (> (.length ^String v) 256))
                       (fail! "IndexIncomplete" "Equality on a value over 256 characters"))
                   nxt (successor family v)]
               {:attr attr :family family :start [account attr v] :end (if (some? nxt) [account attr nxt] [account (str attr "\u0000")])
                :eq true :test (constantly true)})
        "range" (let [lower (some-> (get clause "lower") typed) upper (some-> (get clause "upper") typed)
                      family (or (first lower) (first upper))]
                  (when-not family (fail! "InvalidQuery" "A range needs a lower or an upper bound"))
                  (when (and lower upper (not= (first lower) (first upper))) (fail! "InvalidQuery" "Bounds of different types"))
                  (when (or (pos? (get markers "value" 0)) (pos? (get markers "family" 0)))
                    (fail! "IndexIncomplete" "Some rows of this attribute are not in the tuple index"))
                  (when (#{:triplex.xq/i :triplex.xq/x} family)
                    (when (seq (d/index-range db :triplex.xq/x [account attr] [account (str attr "\u0000")]))
                      (fail! "IndexIncomplete" "Integer values beyond 64 bits have no order here")))
                  {:attr attr :family family
                   :start (if lower [account attr (second lower)] [account attr])
                   :end (if upper [account attr (second upper)] [account (str attr "\u0000")])
                   :eq false :test (constantly true)})
        (fail! "InvalidQuery" (str "Unknown clause op " op))))))

(defn tuple-compare
  "Datomic's tuple order on a full tuple against a bound: element by element, a shorter bound first on a tie."
  [a b]
  (loop [i 0]
    (cond (and (= i (count a)) (= i (count b))) 0
          (= i (count a)) -1
          (= i (count b)) 1
          :else (let [c (compare (nth a i) (nth b i))] (if (zero? c) (recur (inc i)) c)))))
(defn- valid-at? [t v] (let [from (nth v 4) to (nth v 5)] (and (<= from t) (or (nil? to) (> to t)))))

(defn- scan
  "Lazy datoms of one plan from start (exclusive of after-value when given), as-of view included."
  [db {:keys [family start end]} after]
  (let [s (seq (d/index-range db family (or after start) end))]
    (if after (drop-while #(= (:v %) after) s) s)))

(defn- entry [d] (let [v (:v d)] {"entityId" (nth v 3) "value" (nth v 2) "validFrom" (nth v 4) "validTo" (nth v 5) "rowId" (nth v 6)}))

(defn query
  "input: account, shape (eq | range | count | and | type), clause fields, validAt, limit, cursor, maxExamined."
  [db input protected]
  (when-not enabled (throw (ex-info "Attribute index is off" {:status 409 :code "AttributeIndexOff"})))
  (let [account (get input "account") shape (get input "shape")
        _ (when-not (and (string? account) (re-matches #"[A-Za-z0-9_-]{1,64}" account)) (fail! "InvalidQuery" "account"))
        limit (bounded (get input "limit") 1 10000 100 "limit")
        budget (bounded (get input "maxExamined") 1 10000000 100000 "maxExamined")
        t (let [v (get input "validAt")] (if (nil? v) (double (System/currentTimeMillis)) (double v)))
        cursor (some-> (get input "cursor") decode-cursor)
        examined (volatile! 0)
        within? #(< @examined budget)
        tick! #(vswap! examined inc)]
    (case shape
      ("eq" "range" "count")
      (let [plan (clause-plan db account (assoc input "op" (if (= shape "count") (get input "op" "eq") shape)) protected)
            counting (= shape "count")
            after (when cursor (vec cursor))]
        (loop [s (scan db plan after) out (transient []) n 0 entities (transient #{}) last-v nil]
          (cond
            (empty? s) (cond-> {"complete" true "examined" @examined}
                         counting (assoc "count" n "entities" (count (persistent! entities)))
                         (not counting) (assoc "rows" (persistent! out)))
            (or (not (within?)) (and (not counting) (>= (count out) limit)))
            (cond-> {"complete" false "examined" @examined "cursor" (encode-cursor last-v)}
              counting (assoc "count" n "entities" (count (persistent! entities)))
              (not counting) (assoc "rows" (persistent! out)))
            :else (let [d (first s) v (:v d)]
                    (tick!)
                    (if (valid-at? t v)
                      (if counting
                        (recur (rest s) out (inc n) (conj! entities (nth v 3)) v)
                        (recur (rest s) (conj! out (entry d)) n entities v))
                      (recur (rest s) out n entities v))))))
      "and"
      (let [[c1 c2 :as clauses] (get input "clauses")
            _ (when-not (= 2 (count clauses)) (fail! "InvalidQuery" "and takes two clauses"))
            p1 (clause-plan db account c1 protected) p2 (clause-plan db account c2 protected)
            after-entity (when cursor (str cursor))]
        (if (and (:eq p1) (:eq p2))
          ;; Merge join: within one value, entries are ordered by entity.
          (let [from (fn [p] (if after-entity (assoc p :start (conj (:start p) (str after-entity "\u0000"))) p))
                valid (fn [s] (filter #(do (tick!) (valid-at? t (:v %))) s))]
            (loop [a (valid (scan db (from p1) nil)) b (valid (scan db (from p2) nil)) out (transient []) last-e nil]
              (cond
                (or (empty? a) (empty? b)) {"complete" true "examined" @examined "entities" (persistent! out)}
                (or (not (within?)) (>= (count out) limit))
                {"complete" false "examined" @examined "entities" (persistent! out) "cursor" (encode-cursor last-e)}
                :else (let [ea (nth (:v (first a)) 3) eb (nth (:v (first b)) 3) c (compare ea eb)]
                        (cond (neg? c) (recur (rest a) b out ea)
                              (pos? c) (recur a (rest b) out eb)
                              :else (recur (drop-while #(= ea (nth (:v %) 3)) a) (drop-while #(= ea (nth (:v %) 3)) b)
                                           (if (= ea last-e) out (conj! out ea)) ea))))))
          ;; Drive by the first clause; check the second on the candidate's own index datoms (EAVT of that entity).
          (let [[drive probe] (if (:eq p2) [p2 p1] [p1 p2])
                matches? (fn [e]
                           (some (fn [x] (tick!)
                                   (let [v (:v x)]
                                     (and (= (:attr probe) (nth v 1)) (valid-at? t v)
                                          (not (neg? (tuple-compare v (:start probe))))
                                          (neg? (tuple-compare v (:end probe))))))
                                 (d/datoms db :eavt e (:family probe))))
                after (when cursor (vec cursor))]
            (loop [s (scan db drive after) out (transient []) seen (transient #{}) last-v nil]
              (cond
                (empty? s) {"complete" true "examined" @examined "entities" (persistent! out)}
                (or (not (within?)) (>= (count out) limit))
                {"complete" false "examined" @examined "entities" (persistent! out) "cursor" (encode-cursor last-v)}
                :else (let [d (first s) v (:v d) ent (nth v 3)]
                        (tick!)
                        (if (and (valid-at? t v) (not (contains? seen ent)) (matches? (:e d)))
                          (recur (rest s) (conj! out ent) (conj! seen ent) v)
                          (recur (rest s) out seen v))))))))
      "type"
      (let [etype (get input "type")
            _ (when-not (and types? (string? etype)) (fail! "InvalidQuery" "type markers are off or type missing"))
            _ (when (seq (d/index-range db :triplex.xq/long [account "@type"] [account "@type\u0000"]))
                (fail! "IndexIncomplete" "Type markers over 256 characters"))
            start (if cursor [account etype (str cursor "\u0000")] [account etype])
            end [account (str etype "\u0000")]]
        (loop [s (seq (d/index-range db :triplex.xq/type start end)) out (transient [])]
          (cond (empty? s) {"complete" true "examined" @examined "entities" (persistent! out)}
                (or (not (within?)) (>= (count out) limit))
                (let [entities (persistent! out)]
                  {"complete" false "examined" @examined "entities" entities "cursor" (encode-cursor (peek entities))})
                :else (do (tick!) (recur (rest s) (conj! out (nth (:v (first s)) 2)))))))
      (fail! "InvalidQuery" (str "Unknown shape " shape)))))
