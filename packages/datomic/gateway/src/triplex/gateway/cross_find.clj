(ns triplex.gateway.cross-find
  "[DX-XQ4] The declaration route, the offline backfill with its epoch, and POST /v2/db/{db}/find over the commit-time
  index of triplex.gateway.cross-index. Every route refuses with 409 IndexOff unless TX2_CROSS_INDEX=1. Permits, bounds,
  cursor fields and refusal codes follow the ID route of step 0 (exp/DX-XQ3-id-lists); when that namespace is on the
  classpath the two routes share one permit pool and one per-account running set."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [datomic.measure.io-stats :as io]
            [triplex.gateway.codec :as codec] [triplex.gateway.cross-index :as x] [triplex.gateway.lean :as lean]
            [triplex.gateway.owner-layout :as owner-layout] [triplex.gateway.reach :as reach]
            [triplex.gateway.scope :as scope] [triplex.gateway.stats :as stats] [triplex.gateway.storage :as storage]
            [triplex.gateway.trace :as trace] [triplex.gateway.ids :as ids])
  (:import [java.util Base64] [java.util.concurrent Semaphore TimeUnit ConcurrentHashMap]
           [java.security MessageDigest] [java.nio.charset StandardCharsets]))

(set! *warn-on-reflection* false)

(defn refuse! [status code message & [extra]]
  (throw (ex-info message (merge {:status status :code code} extra))))
(defn- off! [] (refuse! 409 "IndexOff" "Questions across subjects need TX2_CROSS_INDEX=1 on this gateway"))

;; ---------------------------------------------------------------------------------------------------------------
;; Step 0's pool and running set (exp/DX-XQ3-id-lists): one question per account at a time across both routes.
(def ^Semaphore permits ids/permits)
(def ^ConcurrentHashMap running ids/running)
(def bound-defaults ids/bound-defaults)
(def bound-caps ids/bound-caps)

(defn- bounds [input]
  (let [given (get input "bounds" {})]
    (when-not (map? given) (codec/invalid "bounds must be an object"))
    (doseq [k (keys given)] (when-not (contains? bound-defaults k) (codec/invalid (str "Unknown bound " k))))
    (into {} (for [[k default] bound-defaults]
               (let [v (get given k default)]
                 (when-not (and (integer? v) (<= 1 v (get bound-caps k)))
                   (codec/invalid (str "bounds." k " must be 1.." (get bound-caps k))))
                 [k (long v)])))))
(defn sha256 [^String text]
  (let [bytes (.digest (MessageDigest/getInstance "SHA-256") (.getBytes text StandardCharsets/UTF_8))]
    (apply str (map #(format "%02x" (bit-and % 0xff)) bytes))))
(defn encode-cursor [m]
  (.encodeToString (.withoutPadding (Base64/getUrlEncoder)) (.getBytes ^String (json/write-str m) StandardCharsets/UTF_8)))
(defn decode-cursor [text]
  (let [m (try (json/read-str (String. (.decode (Base64/getUrlDecoder) ^String text) StandardCharsets/UTF_8))
               (catch Exception _ (codec/invalid "Malformed cursor")))]
    (when-not (and (map? m) (= 1 (get m "v")) (string? (get m "db")) (string? (get m "account")) (string? (get m "req"))
                   (integer? (get m "t")) (integer? (get m "position")) (number? (get m "validAt")) (map? (get m "state")))
      (codec/invalid "Malformed cursor"))
    m))
(defn- segment-loads [reads]
  (reduce + 0 (keep (fn [[k v]] (when (and (number? v) (str/ends-with? (name k) "-load")) (long v))) reads)))
(defn- merge-reads [a b] (merge-with (fn [p q] (if (and (number? p) (number? q)) (+ p q) q)) a b))

;; ---------------------------------------------------------------------------------------------------------------
;; The declaration route.
(def code-re #"[a-z][a-z0-9]{0,7}")
(defn- validate-declaration! [input protected]
  (when-not (map? input) (codec/invalid "Expected a declaration object"))
  (doseq [k (keys input)] (when-not (#{"version" "attributes" "types"} k) (codec/invalid (str "Unknown declaration field " k))))
  (when-not (= 1 (get input "version")) (codec/invalid "Declaration version must be 1"))
  (let [attrs (get input "attributes" []) types (get input "types" [])]
    (when-not (and (vector? attrs) (<= (count attrs) 64) (vector? types) (<= (count types) 64))
      (codec/invalid "attributes and types are arrays of at most 64"))
    (doseq [a attrs]
      (when-not (and (map? a) (= #{"attribute" "code" "family"} (set (keys a))))
        (codec/invalid "Each attribute is {attribute, code, family}"))
      (let [attr (get a "attribute") code (get a "code") family (get a "family")]
        (when-not (and (string? attr) (<= 1 (count attr) 512) (not (.startsWith ^String attr ":_")))
          (codec/invalid "attribute must be a key of at most 512 characters outside the reserved :_ namespace"))
        (when-not (and (string? code) (re-matches code-re code)) (codec/invalid "code must match [a-z][a-z0-9]{0,7}"))
        (when (#{"json" "blob"} family)
          (refuse! 400 "ValueFamilyNotIndexable" (str attr " has the " family " family, which cannot be indexed")))
        (when-not (x/families family) (codec/invalid (str "Unknown value family " family)))
        (when (contains? protected attr)
          (refuse! 409 "ProtectedValueLookup" (str attr " is protected; a protected value is never looked up")))))
    (when-not (and (apply distinct? (cons ::none (map #(get % "attribute") attrs)))
                   (apply distinct? (cons ::none (map #(get % "code") attrs))))
      (refuse! 409 "DeclarationConflict" "Each attribute and each code may appear once"))
    (doseq [t types]
      (let [list (get t "list") et (get t "entityType")]
        (when-not (and (map? t) (string? et) (<= 1 (count et) 256)
                       (or (and (= list "entries") (= #{"entityType" "list"} (set (keys t))))
                           (and (= list "idPattern") (= #{"entityType" "list" "idPattern"} (set (keys t)))
                                (string? (get t "idPattern")) (<= 1 (count (get t "idPattern")) 256))))
          (codec/invalid "Each type is {entityType, list: \"entries\"} or {entityType, list: \"idPattern\", idPattern}"))))
    (when-not (apply distinct? (cons ::none (map #(get % "entityType") types)))
      (refuse! 409 "DeclarationConflict" "Each entity type may appear once"))))

(defn- grows? [old new]
  ;; The first version only adds: every attribute keeps its code and family, every type its list.
  (and (every? (fn [a] (some #(= a %) (:attributes new))) (:attributes old))
       (every? (fn [t] (some #(= t %) (:types new))) (:types old))
       (every? (fn [a] (or (some #(= a %) (:attributes old))
                           (not-any? #(= (get a "code") (get % "code")) (:attributes old)))) (:attributes new))))

(defn declare! [name conn protected input]
  (when-not x/enabled (off!))
  (when owner-layout/enabled
    (refuse! 409 "OwnerLayoutUnsupported" "The cross-subject index does not support the covering owner head"))
  (validate-declaration! input protected)
  (let [text (json/write-str {"version" 1 "attributes" (mapv #(into (sorted-map) %) (get input "attributes" []))
                              "types" (mapv #(into (sorted-map) %) (get input "types" []))})
        db (deref (d/sync conn) 5000 ::timeout)
        _ (when (= ::timeout db) (refuse! 503 "SyncTimeout" "The gateway's peer did not catch up"))
        db (if (x/installed? db) db (:db-after @(d/transact conn x/schema-ops)))
        current (x/declaration db)]
    (if (= text (:text current))
      {:database name :seq (:seq current) :declaration (json/read-str text) :changed false
       :epochs (x/epochs db (:eid current))}
      (do
        (when (and current (not (grows? current (x/parse-declaration text))))
          (refuse! 409 "DeclarationConflict" "A declaration may only add attributes and types; codes are never reused"))
        (let [after (:db-after @(d/transact conn
                                  (if current
                                    [[:db/cas (:eid current) :triplex.ix/seq (:seq current) (inc (:seq current))]
                                     [:db/add (:eid current) :triplex.ix/declaration text]]
                                    [{:db/id "declaration" :triplex.entity/id x/declaration-id
                                      :triplex.ix/declaration text :triplex.ix/seq 1}])))
              decl (x/declaration after)]
          {:database name :seq (:seq decl) :declaration (json/read-str text) :changed true
           :epochs (x/epochs after (:eid decl))
           :note "Codes without an epoch answer nothing until the offline backfill completes"})))))

(defn declaration-view [name conn]
  (when-not x/enabled (off!))
  (let [db (d/db conn) decl (x/declaration db)]
    (if decl
      {:database name :seq (:seq decl) :declaration (json/read-str (:text decl)) :epochs (x/epochs db (:eid decl))}
      {:database name :seq 0 :declaration nil :epochs {}})))

;; ---------------------------------------------------------------------------------------------------------------
;; The offline backfill: a reconciliation of every entity's entries with its live rows, restartable, then the epoch.
(defn- desired [decl protected db eid]
  (let [rows (keep (fn [datom] (lean/decode (:v datom))) (lean/legacy-live-texts db eid))
        es (keep #(x/row-entries decl protected %) rows)]
    [(into #{} (keep :value) es) (into #{} (keep :type) es)]))
(defn- owned? [decl k]
  (let [p (x/parse-key k)]
    (if (:type p) (contains? (:entry-types decl) (:type p)) (contains? (:by-code decl) (:code p)))))
(defn- reconcile [decl protected db ix-a eid]
  (let [[values types] (desired decl protected db eid)
        actual (into #{} (comp (map :v) (filter #(owned? decl %))) (d/datoms db :eavt eid ix-a))
        actual-types (into #{} (filter #(:type (x/parse-key %))) actual)
        actual-values (into #{} (remove actual-types) actual)]
    {:add (concat (remove actual-values values) (remove actual-types types))
     :retract (remove values actual-values)}))

(defn- merge-sorted [a b]
  (lazy-seq
    (cond (empty? a) b (empty? b) a
          :else (let [x (first a) y (first b)]
                  (cond (< x y) (cons x (merge-sorted (rest a) b))
                        (> x y) (cons y (merge-sorted a (rest b)))
                        :else (cons x (merge-sorted (rest a) (rest b))))))))

(defn backfill! [name conn protected input]
  (when-not x/enabled (off!))
  (when-not (or (nil? input) (map? input)) (codec/invalid "Expected an object"))
  (let [batch (get input "batchDatoms" 4000) dry? (true? (get input "dryRun"))
        _ (when-not (and (integer? batch) (<= 1 batch 20000)) (codec/invalid "batchDatoms must be 1..20000"))
        db (deref (d/sync conn) 5000 ::timeout)
        _ (when (= ::timeout db) (refuse! 503 "SyncTimeout" "The gateway's peer did not catch up"))
        decl (or (x/declaration db) (refuse! 409 "AttributeNotIndexed" "No declaration; nothing to build"))
        head0 (storage/head-position name db)
        expect (get input "expectHead")
        _ (when (and (some? expect) (not= expect head0))
            (refuse! 409 "BackfillRaced" (str "The head is " head0 ", not " expect) {:maximum head0}))
        ix-a (d/entid db :triplex.ix/entry) row-a (d/entid db :triplex.entity/row)
        entities (merge-sorted (dedupe (map :e (d/datoms db :aevt row-a))) (dedupe (map :e (d/datoms db :aevt ix-a))))
        started (System/nanoTime)
        totals (volatile! {:entities 0 :added 0 :retracted 0 :batches 0 :typeEntries 0})
        pending (java.util.ArrayList.)
        flush! (fn []
                 (when (pos? (.size pending))
                   (when-not dry?
                     (let [now (d/db conn)]
                       (when (not= head0 (storage/head-position name now))
                         (refuse! 409 "BackfillRaced" "A save was admitted during the backfill; run it again in a quiet window"
                                  {:maximum (storage/head-position name now)})))
                     @(d/transact conn (into [[:db/cas (:eid decl) :triplex.ix/seq (:seq decl) (:seq decl)]] pending)))
                   (vswap! totals update :batches inc)
                   (.clear pending)))]
    (doseq [eid entities]
      (let [{:keys [add retract]} (reconcile decl protected db ix-a eid)
            rev (:v (first (d/datoms db :eavt eid :triplex.entity/rev)))]
        (vswap! totals update :entities inc)
        (when (or (seq add) (seq retract))
          (vswap! totals #(-> % (update :added + (count add)) (update :retracted + (count retract))
                              (update :typeEntries + (count (filter (fn [k] (:type (x/parse-key k))) add)))))
          ;; Each entity's changes go with a fence on its revision, so a save that touched it after the scan refuses the batch.
          (when rev (.add pending [:db/cas eid :triplex.entity/rev rev rev]))
          (doseq [k add] (.add pending [:db/add eid :triplex.ix/entry k]))
          (doseq [k retract] (.add pending [:db/retract eid :triplex.ix/entry k]))
          (when (>= (.size pending) batch) (flush!)))))
    (flush!)
    (let [after (d/db conn) head1 (storage/head-position name after)]
      (cond
        dry? (assoc @totals :database name :dryRun true :head head0 :sealed false)
        (not= head0 head1)
        (refuse! 409 "BackfillRaced" "A save was admitted during the backfill; run it again in a quiet window" {:maximum head1})
        :else
        (let [have (x/epochs after (:eid decl))
              codes (concat (vals (:codes decl)) (map #(str "T:" %) (:entry-types decl)))
              missing (remove #(contains? have %) codes)
              report (when (seq missing)
                       @(d/transact conn (into [[:db/cas (:eid decl) :triplex.ix/seq (:seq decl) (:seq decl)]]
                                               (map (fn [c] [:db/add (:eid decl) :triplex.ix/epoch (str c " " head0)]) missing))))
              final (if report (:db-after report) after)]
          (assoc @totals :database name :dryRun false :sealed true :head head0
                 :epochs (x/epochs final (:eid decl)) :seconds (/ (- (System/nanoTime) started) 1e9)))))))

;; ---------------------------------------------------------------------------------------------------------------
;; The find route.
(def ops #{"eq" "in" "range" "prefix" "exists" "missing"})

(defn- encode-value
  "The key field of a condition's value; refuses a value whose family differs from the declaration."
  [family v attribute]
  (when-not (and (map? v) (string? (get v "type")) (contains? v "value"))
    (codec/invalid "A value is {type, value}"))
  (when-not (= family (get v "type"))
    (refuse! 400 "ValueFamilyMismatch" (str attribute " is declared " family ", not " (get v "type"))))
  (let [value (get v "value")]
    (case family
      "string" (if (string? value) (str "s" (x/esc value)) (codec/invalid "A string value is a string"))
      "ref" (if (string? value) (str "r" (x/esc value)) (codec/invalid "A reference value is an entity ID"))
      "integer" (str "i" (try (x/int-enc (if (string? value) value (str (biginteger value))))
                              (catch Exception _ (codec/invalid "An integer value is a decimal text"))))
      ("number" "datetime") (if (and (number? value) (Double/isFinite (double value)))
                              (str (x/family-letter family) (x/hex16 value))
                              (codec/invalid "A number or datetime value is a finite number"))
      "boolean" (if (boolean? value) (str "b" (if value "1" "0")) (codec/invalid "A boolean value is true or false")))))
(defn decode-field [^String field]
  (let [tail (subs field 1)]
    (case (.charAt field 0)
      \s {"type" "string" "value" (x/unesc tail)}
      \r {"type" "ref" "value" (x/unesc tail)}
      \i {"type" "integer" "value" (x/int-dec tail)}
      \n {"type" "number" "value" (x/unhex16 tail)}
      \d {"type" "datetime" "value" (x/unhex16 tail)}
      \b {"type" "boolean" "value" (= tail "1")}
      \j {"type" "json"}
      \x {"type" "blob"})))

(defn- scan-field
  "The key field a scan starts from: a text longer than the key keeps is keyed by its first 200 characters (marked),
  so a scan for it starts at the truncated text and every marked entry is confirmed against its row."
  [family v]
  (if (and (#{"string" "ref"} family) (string? (get v "value")))
    (str (x/family-letter family) (x/esc (x/truncate (get v "value"))))
    nil))
(defn- compile-condition [decl protected c]
  (when-not (map? c) (codec/invalid "Each condition is an object"))
  (let [attribute (get c "attribute") op (get c "op")
        _ (when-not (contains? ops op)
            (refuse! 400 "UnsupportedOperation" (str "op must be one of eq, in, range, prefix, exists, missing (not " op ")")))
        _ (when (contains? protected attribute)
            (refuse! 409 "ProtectedValueLookup" (str attribute " is protected; a protected value is never looked up")))
        code (or (get (:codes decl) attribute) (refuse! 409 "AttributeNotIndexed" (str attribute " is not declared")))
        family (get (:families decl) code)
        letter (x/family-letter family)]
    (case op
      "eq" (let [f (encode-value family (get c "value") attribute)]
             {:op op :attribute attribute :code code :fields #{f} :scan #{(or (scan-field family (get c "value")) f)}})
      "in" (let [vs (get c "values")]
             (when-not (and (vector? vs) (<= 1 (count vs) 64)) (codec/invalid "in takes 1 to 64 values"))
             {:op op :attribute attribute :code code :fields (into (sorted-set) (map #(encode-value family % attribute) vs))
              :scan (into (sorted-set) (map #(or (scan-field family %) (encode-value family % attribute)) vs))})
      "range" (do (when-not (#{"string" "integer" "number" "datetime"} family)
                    (refuse! 400 "UnsupportedOperation" (str "range needs a string, integer, number or datetime attribute; "
                                                             attribute " is " family)))
                  (let [from (get c "from") to (get c "to") to-ex (get c "toExclusive") from-ex (get c "fromExclusive")]
                    (when (and (some? to) (some? to-ex)) (codec/invalid "Give to or toExclusive, not both"))
                    (when (and (some? from) (some? from-ex)) (codec/invalid "Give from or fromExclusive, not both"))
                    {:op op :attribute attribute :code code :letter letter
                     :lo (some-> (or from from-ex) (#(encode-value family % attribute))) :lo-ex (some? from-ex)
                     :scan-lo (some-> (or from from-ex) (#(or (scan-field family %) (encode-value family % attribute))))
                     :hi (some-> (or to to-ex) (#(encode-value family % attribute))) :hi-ex (some? to-ex)}))
      "prefix" (do (when-not (= family "string")
                     (refuse! 400 "UnsupportedOperation" "prefix needs a string attribute"))
                   (let [p (get c "value")]
                     (when-not (string? p) (codec/invalid "prefix takes a string value"))
                     {:op op :attribute attribute :code code :pfx (str "s" (x/esc p)) :scan-pfx (str "s" (x/esc (x/truncate p)))}))
      ("exists" "missing") {:op op :attribute attribute :code code})))

(defn- field-ok? [c ^String field]
  (case (:op c)
    ("eq" "in") (contains? (:fields c) field)
    "range" (and (.startsWith field ^String (:letter c))
                 (or (nil? (:lo c)) (let [k (compare field (:lo c))] (if (:lo-ex c) (pos? k) (not (neg? k)))))
                 (or (nil? (:hi c)) (let [k (compare field (:hi c))] (if (:hi-ex c) (neg? k) (not (pos? k))))))
    "prefix" (.startsWith field ^String (:pfx c))
    ("exists" "missing") true))

(defn- full-field
  "The untruncated key field of a marked (long) entry, from its fact's row at this view."
  [view fact]
  (when-let [datom (lean/by-id view fact)]
    (first (x/value-field (lean/decode (:v datom)) true))))
(defn- entry-ok? [view c e]
  (if (:long? e)
    (when-let [f (full-field view (:fact e))] (field-ok? c f))
    (field-ok? c (:field e))))

(defn- entity-entries [view eid ix-a ^longs work]
  (let [es (mapv (fn [datom] (assoc (x/parse-key (:v datom)) :key (:v datom))) (d/datoms view :eavt eid ix-a))]
    (aset work 0 (+ (aget work 0) (count es)))
    es))

(defn- matches? [view c es v16]
  (let [mine (filter #(and (= (:code c) (:code %)) (x/valid-at? % v16)) es)]
    (if (= "missing" (:op c))
      (empty? mine)
      (boolean (some #(entry-ok? view c %) mine)))))

(defn- type-visible? [view eid entity-type valid]
  (some (fn [datom]
          (let [r (lean/decode (:v datom))]
            (and (= entity-type (:entity_type r)) (<= (double (:valid_from r)) valid)
                 (or (nil? (:valid_to r)) (> (double (:valid_to r)) valid)))))
        (lean/legacy-live-texts view eid)))

;; Shape grammar of step 0 (exp/DX-XQ3-id-lists): {N digits}, {digits}, {segment}; every other character literal.
(def shape-pattern ids/shape-pattern)

;; ---- driver streams. Entity-ordered streams yield local parts in order; value-ordered streams yield [key local].
(defn- after-filter [desc? after s]
  (if (nil? after) s (drop-while #(let [k (compare % after)] (if desc? (>= k 0) (<= k 0))) s)))
(defn- dedupe-sorted [s] (dedupe s))
(defn- merge-locals [desc? streams]
  (let [cmp (if desc? #(compare %2 %1) compare)
        step (fn step [streams]
               (lazy-seq
                 (let [live (filter seq streams)]
                   (when (seq live)
                     (let [m (reduce (fn [a b] (if (neg? (cmp b a)) b a)) (map first live))]
                       (cons m (step (map (fn [s] (if (and (seq s) (= m (first s))) (rest s) s)) live))))))))]
    (step streams)))

(defn successor
  "The least string greater than every string that starts with `s`."
  [^String s]
  (loop [i (dec (.length s))]
    (cond (neg? i) nil
          (< (int (.charAt s i)) 0xffff) (str (subs s 0 i) (char (inc (int (.charAt s i)))))
          :else (recur (dec i)))))
(defn- avet-range
  "Datoms of `a` whose value starts with `prefix`: ascending from `from` (inclusive), or descending strictly below
  `from` (or from the end of the prefix)."
  [view a ^String prefix from desc?]
  (let [in? (fn [datom] (and (= a (:a datom)) (string? (:v datom)) (.startsWith ^String (:v datom) prefix)))]
    (if desc?
      (let [top (or from (successor prefix))]
        (if-not top []
          (take-while in? (drop-while #(and (= a (:a %)) (string? (:v %)) (>= (compare (:v %) top) 0))
                                      (d/rseek-datoms view :avet a top)))))
      (take-while in? (d/index-range view a (or from prefix) nil)))))

(defn- counted [^longs work s] (map (fn [x] (aset work 0 (inc (aget work 0))) x) s))

(defn- eq-stream [view ix-a work token code field v16 desc? after]
  (let [base (str token x/sep code x/sep field x/sep)
        o-prefix (str base "O" x/sep)
        o (->> (avet-range view ix-a o-prefix (when after (str o-prefix (x/esc after))) desc?)
               (counted work) (map (comp x/parse-key :v)) (filter #(x/valid-at? % v16)) (map :local))
        c-prefix (str base "C" x/sep)
        c (->> (take-while #(.startsWith ^String (:v %) c-prefix) (d/index-range view ix-a (str c-prefix v16) nil))
               (counted work) (map (comp x/parse-key :v)) (filter #(x/valid-at? % v16)) (map :local)
               (into (sorted-set)))
        c (cond->> (if (nil? after) c (filter #(let [k (compare % after)] (if desc? (neg? k) (pos? k))) c))
            desc? reverse)]
    (dedupe (merge-locals desc? [(after-filter desc? after o) c]))))

(defn- type-stream [view ix-a work token entity-type desc? after]
  (let [prefix (str token x/sep "T" x/sep (x/esc entity-type) x/sep)]
    (->> (avet-range view ix-a prefix (when after (str prefix (x/esc after) (if desc? "" "\u0000"))) desc?)
         (counted work) (map (comp :local x/parse-key :v)) (after-filter desc? after))))

(defn- id-stream [view work token ^String prefix shape-re desc? after]
  (let [base (if (= token x/system-token) "_triplex/" (str "acct/" token "/"))
        start (str base prefix) id-a (d/entid view :triplex.entity/id)]
    (->> (avet-range view id-a start (when after (str base after (if desc? "" "\u0000"))) desc?)
         (counted work) (map #(subs ^String (:v %) (count base)))
         (filter #(or (nil? shape-re) (re-matches shape-re (subs ^String % (count prefix)))))
         (after-filter desc? after))))

(defn- value-stream
  "[key local] of every entry of `code` from the condition's lower bound (or after `after-key`), value order."
  [view ix-a work token c v16 after-key]
  (let [base (str token x/sep (:code c) x/sep)
        start (case (:op c)
                "range" (str base (or (:scan-lo c) (:letter c)))
                "prefix" (str base (:scan-pfx c))
                base)
        stop? (case (:op c)
                "range" (fn [^String field] (or (not (.startsWith field ^String (:letter c)))
                                                (and (:hi c) (pos? (compare field (:hi c))))))
                "prefix" (fn [^String field] (and (not (.startsWith field ^String (:scan-pfx c)))
                                                  (pos? (compare field (:scan-pfx c)))))
                (fn [_] false))]
    (->> (d/index-range view ix-a (or after-key start) nil)
         (take-while #(.startsWith ^String (:v %) base))
         (drop-while #(and after-key (= after-key (:v %))))
         (counted work)
         (map (fn [datom] [(:v datom) (x/parse-key (:v datom))]))
         (take-while (fn [[_ p]] (not (stop? (:field p)))))
         (filter (fn [[_ p]] (and (x/valid-at? p v16) (or (:long? p) (field-ok? c (:field p))))))
         (map (fn [[k p]] [k (:local p)])))))

;; ---- the basis.
(defn- local-at-least [name conn db position wait-ms]
  (if (<= position (storage/head-position name db)) db
    (try (storage/await-position db position wait-ms (fn [_] (d/db conn)) conn)
         (catch clojure.lang.ExceptionInfo e
           (if (= "BasisNotAvailable" (:code (ex-data e)))
             (let [head (storage/head-position name (d/db conn))]
               (refuse! 409 "AtLeastTimeout" (str "The gateway's peer did not reach position " position " within " wait-ms " ms")
                        {:maximum head}))
             (throw e))))))
(def ^:private at-least-await
  (try (requiring-resolve 'triplex.gateway.at-least/await!) (catch Throwable _ nil)))
;; [DX-XQ4] Step 0's own wait is the same local wait as below; this route keeps its own copy for the refusal shape.

(defn- resolve-view [name conn input]
  (let [basis (get input "basis") wait (get input "basisWaitMs")
        _ (when-not (or (nil? basis) (map? basis)) (codec/invalid "basis must be an object"))
        p (get basis "recordedPosition") r (get basis "recordedAt") v (get basis "validAt")
        _ (when-not (or (nil? v) (and (number? v) (Double/isFinite (double v)))) (codec/invalid "validAt must be a finite number"))
        _ (when-not (or (nil? r) (and (number? r) (Double/isFinite (double r)))) (codec/invalid "recordedAt must be a finite number"))
        _ (when (some? wait) (when-not (and (integer? wait) (<= 1 wait 2000)) (codec/invalid "Basis wait must be 1..2000 ms")))
        at-least (get input "atLeastPosition")
        initial (d/db conn)]
    (when (and (some? at-least) (or (some? p) (some? r)))
      (codec/invalid "atLeastPosition applies only to a read at the head (no recordedPosition or recordedAt)"))
    (if (or (some? p) (some? r))
      (let [db (if (and (some? p) (> (storage/safe-position p) (storage/head-position name initial)))
                 (storage/await-position initial p wait (fn [_] (d/db conn)) conn) initial)
            db (storage/await-record-time name conn db input)
            [view _ t _ inner] (try (reach/select-db name db basis)
                                    (catch clojure.lang.ExceptionInfo e
                                      (case (:declined (ex-data e))
                                        "irregular" (refuse! 409 "IrregularScope" "This scope's positions are irregular; it cannot answer this basis")
                                        "interior-position" (refuse! 409 "InteriorPosition" "The position is inside a multi-position transaction; ask for a commit boundary")
                                        "rows-version" (refuse! 409 "LayoutUnsupported" "This scope's layout has no index")
                                        (throw e))))]
        (when inner (refuse! 409 "InteriorPosition" "The position is inside a group commit; ask for a commit boundary"))
        {:db db :view view :t t :position (scope/head-position view (scope/entity view)) :valid v})
      (let [db (if (some? at-least)
                 (let [p (storage/safe-position at-least) w (long (or wait 500))]
                   (if at-least-await (:db (at-least-await name conn initial {:position p :waitMs w}))
                     (local-at-least name conn initial p w)))
                 initial)]
        {:db db :view db :t (d/basis-t db) :position (scope/head-position db (scope/entity db)) :valid v}))))

(defn- view-at-t [conn t]
  (let [db (d/db conn)
        db (if (<= t (d/basis-t db)) db
             (let [synced (deref (d/sync conn t) 2000 ::timeout)]
               (when (= synced ::timeout) (refuse! 409 "BasisNotAvailable" "The cursor's database value is not on this gateway's peer yet"))
               synced))]
    (if (= t (d/basis-t db)) db (d/as-of db t))))

(defn- with-epoch
  "Applies the epoch rule: the view must be at or after the completion of every code used. A position equal to the
  epoch's position (the head when the backfill sealed) reads the database as of the epoch, which holds the same rows."
  [conn view t position codes epochs]
  (let [needed (map #(get epochs %) codes)]
    (when-let [missing (first (filter #(nil? (get epochs %)) codes))]
      (refuse! 409 "IndexNotAvailableAtPosition" (str "The index for " missing " has not been built (no epoch)")))
    (let [epoch-t (reduce max 0 (map :t needed)) epoch-p (reduce max 0 (map :position needed))]
      (cond
        (>= t epoch-t) [view t epoch-p]
        (>= position epoch-p) [(d/as-of (d/db conn) epoch-t) epoch-t epoch-p]
        :else (refuse! 409 "IndexNotAvailableAtPosition"
                       (str "The index answers from position " epoch-p "; position " position " is before it")
                       {:maximum epoch-p})))))

(def ^:private find-keys
  #{"account" "basis" "atLeastPosition" "basisWaitMs" "from" "where" "project" "result" "of" "order" "limit" "cursor" "bounds"})

(defn- request-hash [input]
  (sha256 (json/write-str (into (sorted-map) (dissoc input "cursor" "bounds" "limit" "atLeastPosition" "basisWaitMs")))))

(defn find! [name conn protected input]
  (when-not x/enabled (off!))
  (when-not (map? input) (codec/invalid "Expected a JSON object"))
  (doseq [k (keys input)] (when-not (find-keys k) (codec/invalid (str "Unknown field " k))))
  (when owner-layout/enabled (refuse! 409 "OwnerLayoutUnsupported" "The cross-subject index does not support the covering owner head"))
  (let [account (get input "account")
        _ (cond (nil? account) (refuse! 400 "AccountRequired" "Name the account to ask about")
                (not (and (string? account) (re-matches x/account-re account))) (codec/invalid "account must match [A-Za-z0-9_-]{1,64}"))
        token (x/account-token account)
        id-base (if (= token x/system-token) "_triplex/" (str "acct/" account "/"))
        current (d/db conn)
        decl (or (x/declaration current) (refuse! 409 "AttributeNotIndexed" "Nothing is declared in this database"))
        where (get input "where" [])
        _ (when-not (and (vector? where) (<= (count where) 4))
            (refuse! 400 "UnsupportedOperation" "where takes at most four conditions, all required (AND)"))
        conds (mapv #(compile-condition decl protected %) where)
        from (get input "from")
        _ (when-not (or (nil? from) (and (map? from) (= #{"type"} (set (keys from))) (string? (get from "type")))
                        (and (map? from) (#{#{"prefix"} #{"prefix" "shape"}} (set (keys from))) (string? (get from "prefix"))))
            (codec/invalid "from is {type} or {prefix, shape?}"))
        from-type (get from "type")
        _ (when (and from-type (not (or (contains? (:entry-types decl) from-type) (contains? (:id-types decl) from-type))))
            (refuse! 409 "AttributeNotIndexed" (str "Entity type " from-type " is not declared")))
        id-pattern (when from-type (get (:id-types decl) from-type))
        [id-prefix shape] (cond id-pattern (let [i (.indexOf ^String id-pattern "{")]
                                             (if (neg? i) [id-pattern nil] [(subs id-pattern 0 i) (subs id-pattern i)]))
                                (get from "prefix") [(get from "prefix") (get from "shape")])
        shape-re (shape-pattern shape)
        _ (when (and (empty? conds) (nil? from)) (refuse! 400 "UnsupportedOperation" "Give from or at least one condition"))
        project (get input "project" [])
        _ (when-not (and (vector? project) (<= (count project) 4) (every? string? project))
            (refuse! 400 "UnsupportedOperation" "project takes up to four declared reference attributes"))
        project-codes (mapv (fn [a]
                              (when (contains? protected a) (refuse! 409 "ProtectedValueLookup" (str a " is protected")))
                              (let [code (or (get (:codes decl) a) (refuse! 409 "AttributeNotIndexed" (str a " is not declared")))]
                                (when-not (= "ref" (get (:families decl) code))
                                  (refuse! 400 "UnsupportedOperation" (str "project takes reference attributes; " a " is not one")))
                                [a code])) project)
        result (get input "result" "ids")
        _ (when-not (#{"ids" "count" "countByValue" "countDistinct"} result)
            (refuse! 400 "UnsupportedOperation" "result is ids, count, countByValue or countDistinct"))
        of (get input "of")
        of-code (when (#{"countByValue" "countDistinct"} result)
                  (when-not (string? of) (codec/invalid (str result " needs of: the attribute to count by")))
                  (when (contains? protected of) (refuse! 409 "ProtectedValueLookup" (str of " is protected")))
                  (let [code (or (get (:codes decl) of) (refuse! 409 "AttributeNotIndexed" (str of " is not declared")))]
                    (when (and (= result "countDistinct") (not= "ref" (get (:families decl) code)))
                      (refuse! 400 "UnsupportedOperation" "countDistinct counts the distinct targets of a reference attribute"))
                    code))
        limit (get input "limit" 100)
        _ (when-not (and (integer? limit) (<= 1 limit 1000)) (codec/invalid "limit must be 1..1000"))
        order (get input "order")
        _ (when-not (or (nil? order) (and (map? order) (string? (get order "by"))
                                          (#{nil "asc" "desc"} (get order "direction"))))
            (codec/invalid "order is {by: \"entity\" or the range attribute, direction}"))
        desc? (= "desc" (get order "direction"))
        by (get order "by" "entity")
        range-c (when-not (= by "entity")
                  (or (first (filter #(and (= by (:attribute %)) (= "range" (:op %))) conds))
                      (refuse! 400 "UnsupportedOperation" "order by takes entity or the attribute of the one range condition")))
        _ (when (and range-c desc?) (refuse! 400 "UnsupportedOperation" "order by a range attribute is ascending (index order)"))
        ;; The driver: the range when ordering by it; else from; else eq/in; else a value-ordered condition.
        driver (cond range-c [:value range-c]
                     from [:from]
                     :else (if-let [c (first (filter #(#{"eq" "in"} (:op %)) conds))] [:eq c]
                             (if-let [c (first (filter #(#{"range" "prefix" "exists"} (:op %)) conds))] [:value c]
                               (refuse! 400 "UnsupportedOperation" "missing needs from or another condition"))))
        _ (when (and (= :value (first driver)) (nil? range-c) (= result "ids") (some? order))
            (refuse! 400 "UnsupportedOperation" "order by entity needs from or an eq/in condition; order by the range attribute instead"))
        entity-order? (not= :value (first driver))
        limits (bounds input)
        req (request-hash input)
        cursor (some-> (get input "cursor") decode-cursor)
        _ (when cursor
            (when-not (and (= name (get cursor "db")) (= account (get cursor "account")) (= req (get cursor "req")))
              (refuse! 409 "CursorMismatch" "The cursor belongs to another database, account or request")))
        codes (distinct (concat (map :code conds) (map second project-codes) (when of-code [of-code])
                                (when (and from-type (contains? (:entry-types decl) from-type)) [(str "T:" from-type)])))
        {:keys [view t position valid]} (if cursor
                                          {:view (view-at-t conn (get cursor "t")) :t (get cursor "t")
                                           :position (get cursor "position") :valid (get cursor "validAt")}
                                          (resolve-view name conn input))
        valid (double (or valid (System/currentTimeMillis)))
        epochs (x/epochs current (:eid decl))
        [view t epoch-p] (with-epoch conn view t position codes epochs)
        v16 (x/hex16 valid)
        ix-a (d/entid view :triplex.ix/entry)
        state (get cursor "state" {})
        work (long-array 1)]
    (when (some? (.putIfAbsent running account true))
      (stats/bump! [:crossFind :busy] 1)
      (refuse! 503 "IndexBusy" "Another question of this account is running" {:retryAfterMs (get limits "ms")}))
    (try
      (when-not (.tryAcquire permits (get limits "ms") TimeUnit/MILLISECONDS)
        (stats/bump! [:crossFind :busy] 1)
        (refuse! 503 "IndexBusy" "Every index question permit is in use" {:retryAfterMs (get limits "ms")}))
      (try
        (let [started (System/nanoTime)
              deadline (+ started (* (get limits "ms") 1000000))
              after (get state "after")
              candidates (case (first driver)
                           :from (if from-type
                                   (if id-pattern
                                     (map (fn [l] [l l]) (id-stream view work token id-prefix shape-re desc? after))
                                     (map (fn [l] [l l]) (type-stream view ix-a work token from-type desc? after)))
                                   (map (fn [l] [l l]) (id-stream view work token id-prefix shape-re desc? after)))
                           :eq (let [c (second driver)]
                                 (map (fn [l] [l l]) (merge-locals desc? (map #(eq-stream view ix-a work token (:code c) % v16 desc? after) (:scan c)))))
                           :value (value-stream view ix-a work token (second driver) v16 after))
              ids (java.util.ArrayList.) projected (java.util.LinkedHashMap.)
              acc (volatile! {:count (get state "count" 0)
                              :counts (into {} (get state "counts" {}))
                              :distinct (into #{} (get state "distinct" []))})
              reads (volatile! {}) stopped (volatile! nil) last-key (volatile! after)
              it (.iterator ^Iterable candidates)
              evaluate (fn [[k ^String local]]
                         (let [id (x/entity-id token local)
                               eid (d/entid view [:triplex.entity/id id])
                               es (when eid (entity-entries view eid ix-a work))]
                           (when (and eid
                                      (every? #(matches? view % es v16) conds)
                                      (or (nil? from-type) (type-visible? view eid from-type valid))
                                      ;; A value-ordered driver lists an entity once: at its least matching key.
                                      (or entity-order?
                                          (let [c (second driver)
                                                mine (sort (keep (fn [e] (when (and (= (:code c) (:code e)) (x/valid-at? e v16) (entry-ok? view c e))
                                                                           (:key e)))
                                                                 es))]
                                            (= k (first mine)))))
                             (when-not (.startsWith ^String id ^String id-base)
                               (throw (ex-info "ID outside the account" {:status 500 :code "AccountLeak"})))
                             (let [values (fn [code] (sort (distinct (keep (fn [e] (when (and (= code (:code e)) (x/valid-at? e v16))
                                                                                     (if (:long? e) (full-field view (:fact e)) (:field e))))
                                                                           es))))]
                               (case result
                                 "ids" (do (.add ids id)
                                           (when (seq project-codes)
                                             (.put projected id (into {} (map (fn [[a code]] [a (mapv #(x/unesc (subs % 1)) (values code))]) project-codes)))))
                                 "count" nil
                                 "countByValue" (vswap! acc update :counts #(reduce (fn [m f] (update m f (fnil inc 0))) % (values of-code)))
                                 "countDistinct" (vswap! acc update :distinct into (map #(x/unesc (subs % 1)) (values of-code))))
                               (vswap! acc update :count inc)))))]
          (loop []
            (let [measured (io/throw-if-ex!
                             (io/with-io-stats
                               (fn []
                                 (loop [n 0]
                                   (when (< n 64)
                                     (if-not (.hasNext it)
                                       (vreset! stopped "end")
                                       (let [cand (.next it)]
                                         (evaluate cand)
                                         (vreset! last-key (first cand))
                                         (if (and (= result "ids") (>= (.size ids) limit))
                                           (vreset! stopped (if (.hasNext it) "limit" "end"))
                                           (recur (inc n))))))))
                               {:io-context :triplex/cross-find :api :lookup}))]
              (vswap! reads merge-reads (:reads (:io-stats measured)))
              (cond @stopped nil
                    (>= (aget work 0) (get limits "entries")) (vreset! stopped "entries")
                    (>= (segment-loads @reads) (get limits "segments")) (vreset! stopped "segments")
                    (>= (System/nanoTime) deadline) (vreset! stopped "time")
                    (and (= result "countDistinct") (> (count (:distinct @acc)) 100000)) (vreset! stopped "limit")
                    (and (= result "countByValue") (> (count (:counts @acc)) 10000)) (vreset! stopped "limit")
                    :else (recur))))
          (let [more? (not= @stopped "end")
                {n-count :count counts :counts dset :distinct} @acc
                micros (quot (- (System/nanoTime) started) 1000)]
            (stats/bump! [:crossFind :requests] 1)
            (stats/bump! [:crossFind :examined] (aget work 0))
            (cond-> {:database name :account account :position position :t (str t) :validAt valid
                     :head (storage/head-position name current) :indexEpoch epoch-p :trailingBy 0 :result result
                     :order (if (= :value (first driver)) {:by (:attribute (second driver)) :direction "asc"}
                              {:by "entity" :direction (if desc? "desc" "asc")})
                     :examined (aget work 0) :segmentsLoaded (segment-loads @reads) :queryMicros micros
                     :stopped @stopped
                     :next (when more?
                             (encode-cursor {"v" 1 "db" name "account" account "req" req "t" t "position" position
                                             "validAt" valid
                                             "state" (cond-> {"after" @last-key "count" n-count}
                                                       (= result "countByValue") (assoc "counts" counts)
                                                       (= result "countDistinct") (assoc "distinct" (vec dset)))}))}
              (= result "ids") (assoc :ids (vec ids) :count (.size ids))
              (seq project-codes) (assoc :projected projected)
              (= result "count") (assoc :count n-count :countExact (not more?))
              (= result "countByValue") (assoc :counts (mapv (fn [[f n]] {:value (decode-field f) :count n}) (sort-by key counts))
                                               :count n-count :countExact (not more?))
              (= result "countDistinct") (assoc :count (count dset) :matched n-count :countExact (not more?)))))
        (finally (.release permits)))
      (finally (.remove running account)))))
