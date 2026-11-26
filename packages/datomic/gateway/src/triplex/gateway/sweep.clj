(ns triplex.gateway.sweep
  "[DX-XQ6] The exact sweep: questions across subjects answered by listing the IDs of one kind in one account (the ID
  list route's own walk, ids/scan!), reading each listed subject with the pinned read's own code (storage/read-rows at
  one commit position and one valid-time instant), and testing the question's conditions on that subject's visible
  facts, in bounded pages with a signed cursor. Every question names one account; the answer states the position, the
  valid time and whether the sweep is complete. Nothing is written per save and nothing is built in advance, so it
  answers every position and every attribute, slowly. Behind TX2_SWEEP=1 (default off: the route is then absent).
  Contract and gates: lab/experiments/EXP-DX1/xq6/EXACT-SWEEP.md."
  (:require [datomic.api :as d] [datomic.measure.io-stats :as io] [clojure.data.json :as json] [clojure.string :as str] [clojure.walk :as walk]
            [triplex.gateway.codec :as codec] [triplex.gateway.storage :as storage] [triplex.gateway.ids :as ids]
            [triplex.gateway.admission :as admission] [triplex.gateway.stats :as stats] [triplex.gateway.trace :as trace])
  (:import [java.util ArrayList Base64 HashMap LinkedHashMap] [java.util.concurrent Semaphore TimeUnit ConcurrentHashMap]
           [java.nio.charset StandardCharsets] [java.lang.management ManagementFactory]))

(set! *warn-on-reflection* false)

(def enabled (= "1" (System/getenv "TX2_SWEEP")))

;; [DX-XQ9] Why: the question shapes the sweep refused until now (questions over a subject's related entities, "is not",
;; "any of these groups", top N by an attribute, text "contains", sums) are each named in one option, TX2_SWEEP_SHAPES,
;; a comma list of `related`, `ne`, `or`, `top`, `contains`, `sum` (or `all`); default empty. Unset, every request is
;; parsed, answered and refused exactly as before (xq9/QUESTION-SHAPES.md, gate 9k); each name only accepts requests
;; that were refused before, so each is a strict superset that the index route (find) can adopt or refuse by name.
;; Rejected: one switch for all six (a server run must be able to turn one cost on without the others); a separate
;; route (the console and the agent tools send one question grammar).
(def shape-names #{"related" "ne" "or" "top" "contains" "sum"})
(def shapes
  (let [text (str/trim (or (System/getenv "TX2_SWEEP_SHAPES") ""))
        names (cond (= text "") #{} (= text "all") shape-names :else (set (map str/trim (str/split text #","))))]
    (when-let [bad (seq (remove shape-names names))]
      (throw (IllegalArgumentException. (str "TX2_SWEEP_SHAPES names unknown shapes: " (str/join "," bad)))))
    names))
(defn shape? [n] (contains? shapes n))

(defn- env-long [name default lo hi]
  (let [n (Long/parseLong (or (not-empty (System/getenv name)) (str default)))]
    (when-not (<= lo n hi) (throw (IllegalArgumentException. (str name " must be " lo ".." hi)))) n))

;; [DX-XQ6] Why: a sweep reads many subjects; it takes its own small permit pool, beside admission/reads (pinned and
;; current reads), admission/journals and the ID list pool, so a sweep never holds a read permit and the read classes
;; keep their capacity. One sweep per account runs at a time; the others of that account wait in a fair queue (one
;; Semaphore per account), and accounts wait for the pool in a fair queue, so a busy account cannot overtake a quiet one.
;; After TX2_SWEEP_QUEUE_MS (default 200) without a permit the request is refused with 503 SweepBusy and retryAfterMs.
;; TX2_SWEEP_PER_ACCOUNT (default 1) lets one account run that many sweeps at once, so a client can split one question
;; by ID prefix (the SDK's sweepCount `split`) and use several permits for it.
;; Rejected: the read permits (one sweep would hold a pinned reader's permit for its whole page); refusing at once when
;; the account is busy (a list screen asks for a page and a total together; review finding D7).
(def permit-count (env-long "TX2_SWEEP_PERMITS" 1 1 16))
(def queue-ms (env-long "TX2_SWEEP_QUEUE_MS" 200 1 5000))
(def per-account (env-long "TX2_SWEEP_PER_ACCOUNT" 1 1 16))
(def ^Semaphore permits (Semaphore. (int permit-count) true))
(def ^ConcurrentHashMap account-gates (ConcurrentHashMap.))
(defn- account-gate ^Semaphore [account]
  (.computeIfAbsent account-gates account (reify java.util.function.Function (apply [_ _] (Semaphore. (int per-account) true)))))
;; [DX-SCALE2] Why: the map above keeps one fair semaphore for every account that has ever been swept, so with many
;; small accounts it only grows (about 200 bytes per account: the map node, the account string, the semaphore and its
;; fair queue head). With TX2_SWEEP_GATE_EVICT=1 (default off: the map above, unchanged) an account's gate lives only
;; while a sweep of that account runs or waits: each entry is [semaphore users], `users` counts the requests that
;; joined it (waiting or holding), and the last one to leave removes it, both inside ConcurrentHashMap's per-key
;; compute, so an account never has two gates at once and the one-per-account rule is the same.
;; Rejected: removing the entry when its semaphore shows every permit free (a request that has fetched the gate but
;; not yet called tryAcquire would then wait on a semaphore no longer in the map, and a second gate could be made).
(def ^:dynamic *evict-gates* (= "1" (System/getenv "TX2_SWEEP_GATE_EVICT")))
(def ^ConcurrentHashMap evicting-gates (ConcurrentHashMap.))
(defn- join-gate ^Semaphore [account]
  (first (.compute evicting-gates account
           (reify java.util.function.BiFunction
             (apply [_ _ old] (if old [(first old) (inc (long (second old)))] [(Semaphore. (int per-account) true) 1]))))))
(defn- leave-gate! [account]
  (.computeIfPresent evicting-gates account
    (reify java.util.function.BiFunction
      (apply [_ _ old] (let [n (dec (long (second old)))] (when (pos? n) [(first old) n]))))))
(defn gate-count
  "Accounts holding a sweep gate now (both maps; for the per-account inventory)."
  [] (+ (.size account-gates) (.size evicting-gates)))

(def bound-defaults {"subjects" 256 "ms" 200})
(def bound-caps {"subjects" 10000 "ms" 2000})
(def batch-size 16)
(def group-limit 1000)

(defn refuse! [status code message & [extra]]
  (throw (ex-info message (merge {:status status :code code} extra))))

;; ---------------------------------------------------------------------------------------------------------------
;; The signed cursor. [DX-XQ6] Why: the cursor carries the position, the database time, the valid time, the last ID
;; examined and the running count; a client must not be able to change any of them (review finding B8), nor move a
;; cursor to another account or question. HMAC-SHA256 under TX2_SWEEP_CURSOR_SECRET (give every gateway that serves
;; one client the same secret, so a cursor survives a restart), else a key made at start (a cursor then works only on
;; the gateway process that issued it, and is refused with CursorMismatch after a restart).
(def ^:private cursor-key
  (let [secret (System/getenv "TX2_SWEEP_CURSOR_SECRET")
        bytes (if (seq secret) (.getBytes ^String secret StandardCharsets/UTF_8)
                (let [b (byte-array 32)] (.nextBytes (java.security.SecureRandom.) b) b))]
    (javax.crypto.spec.SecretKeySpec. bytes "HmacSHA256")))
(defn- b64 [^bytes b] (.encodeToString (.withoutPadding (Base64/getUrlEncoder)) b))
(defn- mac [^String text]
  (let [m (javax.crypto.Mac/getInstance "HmacSHA256")]
    (.init m cursor-key)
    (b64 (.doFinal m (.getBytes text StandardCharsets/UTF_8)))))
(defn sign-cursor [m] (let [body (b64 (.getBytes ^String (json/write-str m) StandardCharsets/UTF_8))] (str body "." (mac body))))
;; [DX-XQ9] A top-N cursor carries up to 1,000 kept entries (gzip inside the signed body), so it may be longer.
(def cursor-max (if (shape? "top") 1048576 65536))
(defn open-cursor [text]
  (when-not (and (string? text) (<= (count text) cursor-max)) (codec/invalid "Malformed cursor"))
  (let [^String text text i (.lastIndexOf text ".")]
    (when-not (and (pos? i)
                   (java.security.MessageDigest/isEqual (.getBytes ^String (mac (subs text 0 i)) StandardCharsets/UTF_8)
                                                        (.getBytes (subs text (inc i)) StandardCharsets/UTF_8)))
      (refuse! 409 "CursorMismatch" "The cursor was not issued by this gateway or was changed"))
    (let [m (try (json/read-str (String. (.decode (Base64/getUrlDecoder) (subs text 0 i)) StandardCharsets/UTF_8))
                 (catch Exception _ (codec/invalid "Malformed cursor")))]
      (when-not (and (map? m) (= 1 (get m "v"))) (codec/invalid "Malformed cursor"))
      m)))

;; ---------------------------------------------------------------------------------------------------------------
;; The question. [DX-XQ6] Why: the conditions are the find route's grammar (exp/DX-XQ4-commit-index: eq, in, range,
;; prefix, exists, missing on {type, value}), all required (AND), so a question the index refuses can be sent here
;; unchanged; here any attribute may be named, declared or not, except a protected one. A condition holds for a subject
;; when one of its facts of that attribute visible at the position and valid time satisfies it (exists: at least one
;; such fact; missing: none). A subject is a listed entity with at least one visible fact at that position and valid
;; time (Triples.entityPage's rule); a listed ID whose facts are all retired or not yet valid is not a subject there.
;; Rejected: Datalog per subject (a Datomic query per subject costs more than the read it filters, and its protected
;; value rules are the q route's, which refuses protected scopes outright); OR, not-equal, text search, sums.
(def ops #{"eq" "in" "range" "prefix" "exists" "missing"})
(def families #{"string" "ref" "integer" "number" "datetime" "boolean"})
(def max-conditions 8)

(defn- check-attribute! [protected what a]
  (when-not (and (string? a) (<= 1 (count a) 512)) (codec/invalid (str what " must name an attribute")))
  (when (contains? protected a)
    (refuse! 409 "ProtectedValueLookup" (str a " is protected; a protected value is never filtered, grouped or listed")))
  a)

(defn- compile-value [v]
  (when-not (and (map? v) (string? (get v "type")) (contains? v "value")) (codec/invalid "A value is {type, value}"))
  (let [family (get v "type") value (get v "value")]
    (when-not (families family)
      (refuse! 400 "UnsupportedOperation" (str "A value's type is one of string, ref, integer, number, datetime, boolean (not " family ")")))
    [family (case family
              ("string" "ref") (if (string? value) value (codec/invalid "A string or reference value is a string"))
              "integer" (try (BigInteger. (str (if (string? value) value (if (integer? value) value (throw (Exception.))))))
                             (catch Exception _ (codec/invalid "An integer value is a decimal text or an integer")))
              ("number" "datetime") (if (and (number? value) (Double/isFinite (double value))) (double value)
                                      (codec/invalid "A number or datetime value is a finite number"))
              "boolean" (if (boolean? value) value (codec/invalid "A boolean value is true or false")))]))

(defn- tagged [row k] (when-let [x (get row k)] (get x "v")))
(defn row-value
  "[family value] of a wire row as the read route returns it, comparable with compile-value's form."
  [row]
  (let [family (tagged row "value_type")]
    [family (case family
              ("string" "ref") (tagged row "value_string")
              "integer" (BigInteger. ^String (tagged row "value_string"))
              "number" (double (tagged row "value_number"))
              "datetime" (double (tagged row "value_datetime"))
              "boolean" (== 1 (double (tagged row "value_boolean")))
              nil)]))
(defn- cmp [family a b] (if (#{"string" "ref"} family) (compare ^String a ^String b) (compare a b)))
(defn- same? [[fa va] [fb vb]] (and (= fa fb) (some? va) (zero? (cmp fa va vb))))

;; [DX-XQ9] The additions, each behind its name in TX2_SWEEP_SHAPES (xq9/QUESTION-SHAPES.md section 2 states each meaning):
;;   ne        "is not": no visible value of the attribute equals the value. A subject with no value matches (it is
;;             not that value), so `eq v` and `ne v` split every subject in two, and "has a value other than v" is
;;             `ne v` with `exists`. The console's words: "is not (a subject with no value counts as not)".
;;   contains  text "contains": a visible text value contains the needle (1 to 256 characters), optionally after both
;;             are lower-cased with Java's root-locale rule. Values are searched whole, up to 65,536 characters; a
;;             longer value refuses the question (422 ContainsValueTooLong) rather than answer from part of it.
;;   has       one level of "has related entities of kind K where conditions", with some, none or a count comparison;
;;             the related entities are found by the ID scheme (`link "key"`: same key after the kind) or by a
;;             reference attribute on the swept entity (`link {"ref": attr}`). Related to related is refused by type.
(def contains-needle-max 256)
(def contains-value-max 65536)
(def related-cap 1000)
(def related-kind-pattern #"[A-Za-z0-9_.-]{1,64}:")
(def quantifier-ops #{"gte" "gt" "lte" "lt" "eq"})

(defn- enabled-ops []
  (cond-> ops (shape? "ne") (conj "ne") (shape? "contains") (conj "contains") (shape? "related") (conj "has")))
(defn- condition-fields []
  (cond-> #{"attribute" "op" "value" "values" "from" "fromExclusive" "to" "toExclusive"}
    (shape? "contains") (conj "caseInsensitive")
    (shape? "related") (into #{"related" "where" "quantifier"})))

(defn- lower ^String [^String s] (.toLowerCase s java.util.Locale/ROOT))

(declare compile-condition)
(defn- compile-has
  "One level of \"has related entities of kind K where conditions\" (TX2_SWEEP_SHAPES related)."
  [protected c depth]
  (when (pos? depth)
    (refuse! 400 "NestedRelatedUnsupported" "A condition on related entities cannot itself name related entities (one level only)"))
  (when (contains? c "attribute") (codec/invalid "A has condition names related entities, not an attribute"))
  (let [r (get c "related")
        _ (when-not (and (map? r) (every? #{"prefix" "shape" "link"} (keys r))) (codec/invalid "related is {prefix, shape, link}"))
        prefix (get r "prefix")
        _ (when-not (and (string? prefix) (re-matches related-kind-pattern prefix))
            (codec/invalid "related.prefix is one ID kind ending in a colon, e.g. i9: or tk:"))
        shape-re (ids/shape-pattern (get r "shape"))
        link (get r "link" "key")
        link (cond (= link "key") {:by :key}
                   (and (map? link) (= ["ref"] (vec (keys link)))) {:by :ref :attribute (check-attribute! protected "related.link.ref" (get link "ref"))}
                   (and (map? link) (contains? link "refBack"))
                   (refuse! 400 "ReverseLinkUnsupported"
                            (str "Finding entities that point at each subject needs an index; ask the reverse question (sweep the related kind "
                                 "with a has condition on link {\"ref\": attribute}) or use the index route's reverse join"))
                   :else (codec/invalid "related.link is \"key\" or {\"ref\": attribute}"))
        where (get c "where" [])
        _ (when-not (vector? where) (codec/invalid "A has condition's where is a list of conditions"))
        conds (mapv #(compile-condition protected % (inc depth)) where)
        quantifier (get c "quantifier" "some")
        quant (cond (= quantifier "some") (fn [n] (pos? n))
                    (= quantifier "none") (fn [n] (zero? n))
                    (and (map? quantifier) (= #{"op" "value"} (set (keys quantifier))) (quantifier-ops (get quantifier "op"))
                         (integer? (get quantifier "value")) (<= 0 (get quantifier "value") related-cap))
                    (let [v (long (get quantifier "value"))]
                      (case (get quantifier "op") "gte" #(>= % v) "gt" #(> % v) "lte" #(<= % v) "lt" #(< % v) "eq" #(== % v)))
                    :else (codec/invalid (str "quantifier is \"some\", \"none\" or {op: gte|gt|lte|lt|eq, value: 0.." related-cap "}")))]
    {:op "has" :prefix prefix :shape-re shape-re :link link :conds conds :quant quant :size (inc (count conds))}))

(defn compile-condition
  ([protected c] (compile-condition protected c 0))
  ([protected c depth]
  (when-not (map? c) (codec/invalid "Each condition is an object"))
  (let [fields (condition-fields)]
    (doseq [k (keys c)]
      (when-not (fields k) (codec/invalid (str "Unknown condition field " k)))))
  (if (and (shape? "related") (= "has" (get c "op")))
    (compile-has protected c depth)
  (let [attribute (check-attribute! protected "attribute" (get c "attribute")) op (get c "op")
        enabled-ops (enabled-ops)]
    (when-not (contains? enabled-ops op)
      (refuse! 400 "UnsupportedOperation"
               (if (empty? shapes)
                 (str "op must be one of eq, in, range, prefix, exists, missing (not " op ")")
                 (str "op must be one of " (str/join ", " (sort enabled-ops)) " (not " op ")"))))
    (when (and (contains? c "caseInsensitive") (not= op "contains")) (codec/invalid "caseInsensitive applies to contains"))
    (case op
      "ne" (let [v (compile-value (get c "value"))] {:op op :attribute attribute :size 1 :test #(same? % v)})
      "contains" (let [p (get c "value") ci (get c "caseInsensitive" false)]
                   (when-not (and (map? p) (= "string" (get p "type")) (string? (get p "value"))
                                  (<= 1 (count (get p "value")) contains-needle-max))
                     (refuse! 400 "UnsupportedOperation" (str "contains takes a string value {type: string, value} of 1 to " contains-needle-max " characters")))
                   (when-not (boolean? ci) (codec/invalid "caseInsensitive is true or false"))
                   (let [^String needle (if ci (lower (get p "value")) (get p "value"))]
                     {:op op :attribute attribute :size 1
                      :test (fn [[f v]]
                              (and (= f "string") (string? v)
                                   (do (when (> (.length ^String v) contains-value-max)
                                         (refuse! 422 "ContainsValueTooLong"
                                                  (str "A value of " attribute " is longer than " contains-value-max " characters; contains searches whole values only")))
                                       (.contains (if ci (lower v) ^String v) needle))))}))
      "eq" (let [v (compile-value (get c "value"))] {:op op :attribute attribute :test #(same? % v)})
      "in" (let [vs (get c "values")]
             (when-not (and (vector? vs) (<= 1 (count vs) 64)) (codec/invalid "in takes 1 to 64 values"))
             (let [vs (mapv compile-value vs)] {:op op :attribute attribute :test (fn [x] (some #(same? x %) vs))}))
      "range" (let [ends (into {} (keep (fn [k] (when (some? (get c k)) [k (compile-value (get c k))])) ["from" "fromExclusive" "to" "toExclusive"]))
                    fam (set (map first (vals ends)))]
                (when (and (contains? ends "from") (contains? ends "fromExclusive")) (codec/invalid "Give from or fromExclusive, not both"))
                (when (and (contains? ends "to") (contains? ends "toExclusive")) (codec/invalid "Give to or toExclusive, not both"))
                (when-not (and (= 1 (count fam)) (#{"string" "integer" "number" "datetime"} (first fam)))
                  (refuse! 400 "UnsupportedOperation" "range takes one or two ends of one family: string, integer, number or datetime"))
                (let [family (first fam) lo (or (get ends "from") (get ends "fromExclusive")) lo-ex (contains? ends "fromExclusive")
                      hi (or (get ends "to") (get ends "toExclusive")) hi-ex (contains? ends "toExclusive")]
                  {:op op :attribute attribute
                   :test (fn [[f v]]
                           (and (= f family) (some? v)
                                (or (nil? lo) (let [k (cmp family v (second lo))] (if lo-ex (pos? k) (not (neg? k)))))
                                (or (nil? hi) (let [k (cmp family v (second hi))] (if hi-ex (neg? k) (not (pos? k)))))))}))
      "prefix" (let [p (get c "value")]
                 (when-not (and (map? p) (= "string" (get p "type")) (string? (get p "value")))
                   (refuse! 400 "UnsupportedOperation" "prefix takes a string value {type: string, value}"))
                 (let [^String p (get p "value")]
                   {:op op :attribute attribute :test (fn [[f v]] (and (= f "string") (string? v) (.startsWith ^String v p)))}))
      ("exists" "missing") {:op op :attribute attribute})))))

(defn holds? [c values]
  (case (:op c)
    "exists" (boolean (seq values))
    "missing" (empty? values)
    "ne" (not-any? (:test c) values)
    (boolean (some (:test c) values))))

(defn- size [c] (or (:size c) 1))
(defn- plain? [c] (not= "has" (:op c)))

;; ---------------------------------------------------------------------------------------------------------------
(def request-keys #{"account" "from" "where" "project" "result" "of" "limit" "cursor" "basis" "atLeastPosition" "basisWaitMs" "bounds"})
(defn- request-keys-now [] (cond-> request-keys (shape? "or") (conj "anyOf") (shape? "top") (conj "order")))
(def or-groups-max 4)
(def top-max 1000)
(def order-families #{"string" "integer" "number" "datetime"})

(defn- bounds [input]
  (let [given (get input "bounds" {})]
    (when-not (map? given) (codec/invalid "bounds must be an object"))
    (doseq [k (keys given)] (when-not (contains? bound-defaults k) (codec/invalid (str "Unknown bound " k))))
    (into {} (for [[k default] bound-defaults]
               (let [v (get given k default)]
                 (when-not (and (integer? v) (<= 1 v (get bound-caps k))) (codec/invalid (str "bounds." k " must be 1.." (get bound-caps k))))
                 [k (long v)])))))

(defn- question
  "The parts of a request that define the question (everything a cursor must keep), validated and compiled."
  [protected input]
  (let [account (get input "account")
        base (ids/base-for account)
        from (get input "from" {})
        _ (when-not (and (map? from) (every? #{"prefix" "shape"} (keys from))) (codec/invalid "from is {prefix, shape}"))
        prefix (get from "prefix" "")
        _ (when-not (and (string? prefix) (<= (count prefix) 512) (not-any? #(< (int %) 32) prefix)) (codec/invalid "from.prefix must be printable text"))
        shape (get from "shape")
        shape-re (ids/shape-pattern shape)
        where (get input "where" [])
        _ (when-not (and (vector? where) (<= (count where) max-conditions))
            (refuse! 400 "UnsupportedOperation" (str "where takes at most " max-conditions " conditions, all required (AND)")))
        conds (mapv #(compile-condition protected %) where)
        ;; [DX-XQ9] OR: anyOf is 1 to 4 groups, each a list of conditions that must all hold; the question matches a
        ;; subject when every where condition holds and at least one group does. All conditions together (a has
        ;; condition counts as one plus its own) stay within the bound of 8.
        any-of (get input "anyOf")
        groups (when (some? any-of)
                 (when-not (and (vector? any-of) (<= 1 (count any-of) or-groups-max) (every? #(and (vector? %) (seq %)) any-of))
                   (refuse! 400 "UnsupportedOperation" (str "anyOf takes 1 to " or-groups-max " groups, each a non-empty list of conditions")))
                 (mapv (fn [g] (mapv #(compile-condition protected %) g)) any-of))
        total (+ (reduce + 0 (map size conds)) (reduce + 0 (map size (apply concat groups))))
        _ (when (> total max-conditions)
            (refuse! 400 "UnsupportedOperation" (str "where and anyOf take at most " max-conditions " conditions in total (a has condition counts as one plus its own)")))
        result (get input "result" "ids")
        results (cond-> #{"ids" "count" "countByValue"} (shape? "top") (conj "top") (shape? "sum") (conj "sum"))
        _ (when-not (results result)
            (refuse! 400 "UnsupportedOperation" (if (= 3 (count results)) "result is ids, count or countByValue"
                                                  (str "result is one of " (str/join ", " (sort results))))))
        of-results (cond-> #{"countByValue"} (shape? "sum") (conj "sum"))
        of (when (of-results result) (check-attribute! protected "of" (get input "of")))
        _ (when (and (not (of-results result)) (contains? input "of"))
            (codec/invalid (if (shape? "sum") "of applies to countByValue and sum" "of applies to countByValue")))
        project (get input "project" [])
        _ (when-not (and (vector? project) (<= (count project) 8) (= (count project) (count (distinct project))))
            (refuse! 400 "UnsupportedOperation" "project takes up to eight distinct attributes"))
        _ (doseq [a project] (check-attribute! protected "project" a))
        _ (when (and (seq project) (not= result "ids")) (codec/invalid "project applies to result ids"))
        ;; [DX-XQ9] Top N: a whole sweep of the kind keeping the N best in the signed cursor. Pages in value order
        ;; beyond that are the index route's (it reads in value order); the sweep refuses them by type.
        order (get input "order")
        _ (when (and (some? order) (not= result "top"))
            (refuse! 400 "OrderedPagingNeedsIndex"
                     (str "A sweep cannot return pages in value order without reading the whole kind; ask for result top (N up to " top-max
                          "), or use the index route (find), which reads in value order")))
        order (when (= result "top")
                (when-not (and (map? order) (every? #{"by" "type" "direction"} (keys order)) (order-families (get order "type"))
                               (#{"asc" "desc"} (get order "direction" "asc")))
                  (codec/invalid "top needs order {by: attribute, type: string|integer|number|datetime, direction: asc|desc}"))
                {:by (check-attribute! protected "order.by" (get order "by")) :type (get order "type") :desc (= "desc" (get order "direction" "asc"))})
        limit (get input "limit" 100)
        _ (when (and (= result "top") (integer? limit) (> limit top-max))
            (refuse! 400 "OrderedPagingNeedsIndex" (str "top keeps at most " top-max " entities; more in value order is the index route's (find)")))
        _ (when-not (and (integer? limit) (<= 1 limit 1000)) (codec/invalid "limit must be 1..1000"))
        has-conds (vec (filter #(= "has" (:op %)) (concat conds (apply concat groups))))]
    (cond-> {:account account :base base :start (str base prefix) :prefix prefix :shape shape :shape-re shape-re :conds conds
             :result result :of of :project project :limit (long limit)
             ;; Key order inside the request's objects does not change the question.
             :req (ids/sha256 (json/write-str (walk/postwalk #(if (map? %) (into (sorted-map) %) %)
                                                             (cond-> [account base prefix shape where result of project]
                                                               (some? any-of) (conj {"anyOf" any-of})
                                                               (some? order) (conj {"order" (get input "order")})))))}
      groups (assoc :groups groups)
      order (assoc :order order)
      (seq has-conds) (assoc :has has-conds))))

(defn- view-at
  "[current view] for a cursor's database time t: the peer's database (synced to t when behind) and its value at t."
  [conn t]
  (let [db (d/db conn)
        db (if (<= t (d/basis-t db)) db
             (let [synced (deref (d/sync conn t) 2000 ::timeout)]
               (when (= synced ::timeout) (refuse! 409 "BasisNotAvailable" "The cursor's database value is not on this gateway's peer yet"))
               synced))]
    [db (if (= t (d/basis-t db)) db (d/as-of db t))]))

(defn- admit!
  "Wait (fair, at most queue-ms) for this account's turn and then for a pool permit; return the release function."
  [account]
  (let [started (System/nanoTime) evict *evict-gates*
        ^Semaphore gate (if evict (join-gate account) (account-gate account))
        leave! (fn [] (when evict (leave-gate! account)))]
    (when-not (try (.tryAcquire gate queue-ms TimeUnit/MILLISECONDS) (catch Throwable t (leave!) (throw t)))
      (leave!)
      (stats/bump! [:sweep :busy] 1)
      (refuse! 503 "SweepBusy" "Another sweep of this account is running" {:retryAfterMs queue-ms}))
    (let [left (max 0 (- queue-ms (quot (- (System/nanoTime) started) 1000000)))]
      (when-not (try (.tryAcquire permits left TimeUnit/MILLISECONDS) (catch Throwable t (.release gate) (leave!) (throw t)))
        (.release gate)
        (leave!)
        (stats/bump! [:sweep :busy] 1)
        (refuse! 503 "SweepBusy" "Every sweep permit is in use" {:retryAfterMs queue-ms})))
    {:queueMicros (quot (- (System/nanoTime) started) 1000)
     :release (fn [] (.release permits) (.release gate) (leave!))}))
;; [DX-SCALE2] For the gate test only (admission is private).
(defn admit-for-test! [account] (admit! account))

;; [DX-XQ10] A count per value groups -0.0 with 0.0, as every comparison here does (Clojure's compare uses < on
;; doubles), as find's key does (cross_index.clj writes -0.0 as 0.0) and as Triplex core does (JavaScript ===). Found by
;; the agreement gate between the two routes: before, a subject holding -0.0 was counted under its own group "-0.0".
;; Rejected: telling -0.0 from 0.0 in find instead (eq and range here already treat them as one value).
(defn- value-key [[family value]]
  [family (cond (instance? BigInteger value) (str value)
                (and (instance? Double value) (#{"number" "datetime"} family)) (+ 0.0 (double value))
                :else value)])
(defn- wire-value [[family value]] {"type" family "value" (if (instance? BigInteger value) (str value) value)})

(defn- attribute-values ^HashMap [needed rows]
  (let [values (HashMap.)]
    (doseq [row rows]
      (let [a (tagged row "attribute")]
        (when (contains? needed a)
          (.put values a (conj (or (.get values a) []) (row-value row))))))
    values))
(defn- vals-of [^HashMap values a] (or (.get values a) []))

(defn- needed-attributes [q]
  (set (concat (map :attribute (filter plain? (:conds q)))
               (map :attribute (filter plain? (apply concat (:groups q))))
               (keep #(get-in % [:link :attribute]) (:has q))
               (:project q) (when (:of q) [(:of q)]) (when-let [o (:order q)] [(:by o)]))))

(defn evaluate
  "Test one subject's visible rows. Returns nil when the ID is not a subject at this cut (no visible fact), else
  {:match bool :values {attribute [[family value] ...]}} for the attributes the question reads. [DX-XQ9] `related`
  gives, for each has condition, how many of this subject's related entities satisfy its conditions; plain
  conditions are tested first, so it is asked only for a subject whose plain where conditions all hold."
  ([q rows] (evaluate q rows nil))
  ([q rows related]
   (when (seq rows)
     (let [values (attribute-values (needed-attributes q) rows)
           ok? (fn [c] (if (plain? c) (holds? c (vals-of values (:attribute c))) ((:quant c) (long (related c)))))
           all? (fn [cs] (and (every? ok? (filter plain? cs)) (every? ok? (remove plain? cs))))]
       {:match (and (all? (:conds q)) (or (nil? (:groups q)) (boolean (some all? (:groups q))))) :values values}))))

;; [DX-XQ9] How a related entity is tied to its subject, in the lean layout and the ID scheme
;; (xq9/QUESTION-SHAPES.md section 1). Every entity is its own Datomic entity carrying its own row texts, so a subject's
;; read never contains its children's facts; a child is found either by the ID scheme or by a reference.
;;   key  IDs are `acct/<account>/<kind>:<key>[:<more>]`; the key is the text after the kind's colon up to the next
;;        colon (`pl:00000005` -> 00000005, `i9:00000005:t3` -> 00000005). The related entities of a subject are the
;;        IDs of the related kind whose key is the subject's key: one ID list walk of `<kind>:<key>`, keeping IDs that
;;        end there or continue with a colon, exact at the question's position.
;;   ref  the subject's visible values of a reference attribute (e.g. :person/placement), kept when they are IDs of the
;;        related kind inside the same account; a reference to another account is never read.
;; Either way each related entity is read with the pinned read's own code at the question's position and valid time,
;; and counts only when it has a visible fact there (the subject rule). More than 1,000 related entities of one subject
;; refuses the question (422 RelatedLimitExceeded) rather than count part of them.
(defn subject-key [^String base ^String id]
  (let [local (subs id (count base)) i (.indexOf local ":")]
    (when (pos? i)
      (let [more (subs local (inc i)) j (.indexOf more ":") k (if (neg? j) more (subs more 0 j))]
        (when (seq k) k)))))

(defn- related-ids [view ^String base ^String id values c]
  (let [{:keys [prefix shape-re link]} c
        kind-start (str base prefix)
        found (case (:by link)
                :key (if-let [k (subject-key base id)]
                       (let [start (str kind-start k)
                             walk (ids/scan! view base start nil false "asc" shape-re "ids" (inc related-cap)
                                             {"entries" 100000 "ms" 2000 "segments" 4096})]
                         (when-not (= "end" (:stopped walk))
                           (refuse! 422 "RelatedLimitExceeded" (str id " has more than " related-cap " related entities of kind " prefix)))
                         (filterv (fn [^String x] (let [more (subs x (count start))] (or (= "" more) (.startsWith more ":")))) (:ids walk)))
                       [])
                :ref (vec (distinct (keep (fn [[f v]]
                                            (when (and (= f "ref") (string? v) (.startsWith ^String v kind-start)
                                                       (or (nil? shape-re) (re-matches shape-re (subs v (count base)))))
                                              v))
                                          (vals-of values (:attribute link))))))]
    (when (> (count found) related-cap)
      (refuse! 422 "RelatedLimitExceeded" (str id " has more than " related-cap " related entities of kind " prefix)))
    found))

(declare read-batch)
(defn- related-counts
  "For one batch: for each subject whose plain where conditions hold, and each has condition of the question, how many
  related entities satisfy that condition's own conditions. Returns {:counts {id IdentityHashMap} :entities n :rows n}."
  [name current view base q batch ^HashMap by basis]
  (let [needed (needed-attributes q)
        inner-needed (set (mapcat (fn [c] (map :attribute (:conds c))) (:has q)))
        links (HashMap.)]
    (doseq [id batch]
      (let [rows (.get by id)]
        (when (seq rows)
          (let [values (attribute-values needed rows)]
            (when (every? #(holds? % (vals-of values (:attribute %))) (filter plain? (:conds q)))
              (let [m (java.util.IdentityHashMap.)]
                (doseq [c (:has q)] (.put m c (related-ids view base id values c)))
                (.put links id m)))))))
    (let [wanted (vec (distinct (mapcat (fn [^java.util.IdentityHashMap m] (apply concat (.values m))) (.values links))))
          rel-by (HashMap.)
          n-rows (reduce + 0 (for [chunk (partition-all 256 wanted)]
                               (let [[by-chunk n] (read-batch name current chunk basis)]
                                 (.putAll rel-by by-chunk) n)))
          inner (HashMap.)
          inner-values (fn [rid] (or (.get inner rid) (let [v (attribute-values inner-needed (.get rel-by rid))] (.put inner rid v) v)))
          counts (HashMap.)]
      (doseq [[id ^java.util.IdentityHashMap m] links]
        (let [out (java.util.IdentityHashMap.)]
          (doseq [[c rids] m]
            (.put out c (count (filter (fn [rid] (and (seq (.get rel-by rid))
                                                      (let [vs (inner-values rid)]
                                                        (every? #(holds? % (vals-of vs (:attribute %))) (:conds c)))))
                                       rids))))
          (.put counts id out)))
      {:counts counts :entities (count (filter #(seq (.get rel-by %)) wanted)) :listed (count wanted) :rows n-rows})))

;; [DX-XQ9] Top N (xq9/QUESTION-SHAPES.md section 2): a subject's order value is its least visible value of the order
;; attribute in the order's family (ascending) or its greatest (descending); values of other families do not count.
;; Subjects with no such value come last, in ID order; ties break by ID ascending in both directions.
(defn- order-value [{:keys [type desc]} vs]
  (let [xs (keep (fn [[f v]] (when (and (= f type) (some? v)) v)) vs)]
    (when (seq xs)
      (reduce (fn [a b] (let [k (cmp type a b)] (if desc (if (neg? k) b a) (if (pos? k) b a)))) xs))))
(defn- top-comparator ^java.util.Comparator [{:keys [type desc]}]
  (reify java.util.Comparator
    (compare [_ x y]
      (let [[ix vx] x [iy vy] y]
        (cond (and (nil? vx) (nil? vy)) (compare ^String ix ^String iy)
              (nil? vx) 1
              (nil? vy) -1
              :else (let [k (Integer/signum (int (cmp type vx vy))) k (if desc (- k) k)]
                      (if (zero? k) (compare ^String ix ^String iy) k)))))))
(defn- gzip-b64 [^String s]
  (let [bo (java.io.ByteArrayOutputStream.)]
    (with-open [z (java.util.zip.GZIPOutputStream. bo)] (.write z (.getBytes s StandardCharsets/UTF_8)))
    (b64 (.toByteArray bo))))
(defn- gunzip-b64 ^String [^String s]
  (with-open [z (java.util.zip.GZIPInputStream. (java.io.ByteArrayInputStream. (.decode (Base64/getUrlDecoder) s)))]
    (String. (.readAllBytes z) StandardCharsets/UTF_8)))
(defn- heap-in [{:keys [type] :as order} text]
  (let [heap (java.util.TreeSet. (top-comparator order))]
    (when text
      (doseq [[id v] (json/read-str (gunzip-b64 text))]
        (.add heap [id (cond (nil? v) nil (= type "integer") (BigInteger. ^String v) (#{"number" "datetime"} type) (double v) :else v)])))
    heap))
(defn- heap-out [^java.util.TreeSet heap]
  (gzip-b64 (json/write-str (mapv (fn [[id v]] [id (if (instance? BigInteger v) (str v) v)]) heap))))

;; [DX-XQ9] Sum and average of an integer attribute (xq9/QUESTION-SHAPES.md section 2): every visible integer value of
;; the attribute on every matching subject is added in arbitrary precision (java.math.BigInteger), so nothing
;; overflows; the running sum travels in the signed cursor as decimal text. Values of other families are not added and
;; are counted in `skipped`. The average is sum / values, given exactly as a reduced fraction and rounded to 6 places
;; (half to even) as decimal text.
(defn- average [^BigInteger total n]
  (when (pos? n)
    (let [d (BigInteger/valueOf n) g (.gcd total d)]
      {:numerator (str (.divide total g)) :denominator (str (.divide d g))
       :decimal (.toPlainString (.divide (java.math.BigDecimal. total) (java.math.BigDecimal. d) 6 java.math.RoundingMode/HALF_EVEN))
       :rounding "6 decimal places, half to even"})))

(defn- read-batch
  "The pinned read's own code (storage/read-rows), at the question's position and valid time, without a read permit
  (this request holds a sweep permit). Rows grouped by entity in the order asked."
  [name current batch basis]
  (let [rows (:rows (binding [admission/*own-pool* (fn [f] (trace/span "gateway.admitted-work" "gateway" (f)))]
                      (storage/read-rows name current {"entityIds" (vec batch) "basis" basis})))
        by (HashMap.) wanted (set batch)]
    (doseq [row rows]
      (let [e (tagged row "entity_id")]
        ;; Every row belongs to an ID that was asked for (an error, never a filter).
        (when-not (contains? wanted e) (throw (ex-info "Row outside the batch" {:status 500 :code "AccountLeak"})))
        (.put by e (conj (or (.get by e) []) row))))
    [by (count rows)]))

(defn- cpu-nanos [] (.getCurrentThreadCpuTime (ManagementFactory/getThreadMXBean)))
(defn- segment-loads [reads]
  (reduce + 0 (keep (fn [[k v]] (when (and (number? v) (str/ends-with? (name k) "-load")) (long v))) reads)))
(defn- merge-reads [a b] (merge-with (fn [x y] (if (and (number? x) (number? y)) (+ x y) y)) a b))

(defn page
  "POST /v2/db/{db}/sweep. See lab/experiments/EXP-DX1/xq6/EXACT-SWEEP.md for the contract."
  [name conn protected input]
  (when-not (map? input) (codec/invalid "Expected a JSON object"))
  (let [allowed (request-keys-now)]
    (doseq [k (keys input)] (when-not (allowed k) (codec/invalid (str "Unknown field " k)))))
  (let [q (question protected input)
        {:keys [account base start conds result limit req]} q
        limits (bounds input)
        cursor (some-> (get input "cursor") open-cursor)
        _ (when cursor
            (when-not (and (= name (get cursor "db")) (= account (get cursor "account")) (= req (get cursor "req")))
              (refuse! 409 "CursorMismatch" "The cursor belongs to another database, account or question"))
            (let [b (get input "basis")]
              (when (or (some? (get input "atLeastPosition")) (some? (get b "recordedAt"))
                        (and (some? (get b "recordedPosition")) (not= (get b "recordedPosition") (get cursor "position")))
                        (and (some? (get b "validAt")) (not= (double (get b "validAt")) (double (get cursor "validAt")))))
                (refuse! 409 "CursorMismatch" "A cursor keeps its first page's position and valid time")))
            (when-let [^String last (get cursor "last")]
              (when-not (.startsWith last start) (refuse! 409 "CursorMismatch" "The cursor's key is outside this question's range"))))
        ;; The position, database time and valid time of the whole sweep: from the cursor, else resolved by the ID
        ;; list route's own rules (head, recordedPosition, recordedAt, atLeastPosition; interior positions refused).
        [current view position t valid-at]
        (if cursor
          (let [[current view] (view-at conn (get cursor "t"))]
            [current view (get cursor "position") (get cursor "t") (double (get cursor "validAt"))])
          (let [[view position t v] (@#'ids/resolve-view name conn input)]
            [(d/db conn) view position t (double (or v (System/currentTimeMillis)))]))
        basis {"recordedPosition" position "validAt" valid-at}
        head (storage/head-position name (d/db conn))
        {:keys [queueMicros release]} (admit! account)]
    (try
      (let [started (System/nanoTime) cpu0 (cpu-nanos)
            deadline (+ started (* (get limits "ms") 1000000))
            subject-bound (get limits "subjects")
            state (volatile! {:last (get cursor "last") :examined 0 :listed 0 :subjects 0 :matched 0 :rows 0
                              :count (long (get cursor "count" 0)) :groups (into {} (get cursor "groups" []))
                              :ids [] :projected [] :stopped nil :reads {} :list-micros 0 :read-micros 0 :eval-micros 0})
            group-key (fn [v] (json/write-str (if v (value-key v) nil)))
            ;; [DX-XQ9] Top N keeps its entries in the signed cursor; sums carry their running totals there.
            ^java.util.TreeSet heap (when (= result "top") (heap-in (:order q) (get cursor "heap")))
            _ (when (= result "sum")
                (vswap! state assoc :sum (BigInteger. ^String (get cursor "sum" "0")) :sum-values (long (get cursor "sumValues" 0))
                        :sum-subjects (long (get cursor "sumSubjects" 0)) :sum-skipped (long (get cursor "sumSkipped" 0))))
            _ (when (:has q) (vswap! state assoc :related 0 :related-listed 0 :related-rows 0 :related-micros 0))]
        (loop []
          (let [{:keys [examined last ids]} @state]
            (cond
              (>= examined subject-bound) (vswap! state assoc :stopped "subjects")
              (and (= result "ids") (>= (count ids) limit)) (vswap! state assoc :stopped "limit")
              (>= (System/nanoTime) deadline) (vswap! state assoc :stopped "time")
              :else
              (let [want (min batch-size (- subject-bound examined))
                    t0 (System/nanoTime)
                    ;; The ID list route's own walk (ids/scan!), at this question's database value, from the last key.
                    listed (ids/scan! view base start last (some? last) "asc" (:shape-re q) "ids" want
                                      {"entries" 100000 "ms" (max 1 (quot (- deadline (System/nanoTime)) 1000000)) "segments" 4096})
                    t1 (System/nanoTime)
                    batch (:ids listed)
                    [by n-rows] (if (seq batch) (read-batch name current batch basis) [(HashMap.) 0])
                    t15 (System/nanoTime)
                    ;; [DX-XQ9] The batch's related entities, read at the same position and valid time.
                    rel (when (and (:has q) (seq batch)) (related-counts name current view base q batch by basis))
                    t2 (System/nanoTime)]
                (doseq [^String id batch] (when-not (.startsWith id base) (throw (ex-info "ID outside the account" {:status 500 :code "AccountLeak"}))))
                (when rel
                  (vswap! state #(-> % (update :related + (:entities rel)) (update :related-listed + (:listed rel))
                                     (update :related-rows + (:rows rel)) (update :related-micros + (quot (- t2 t15) 1000)))))
                (vswap! state #(-> % (update :listed + (:examined listed)) (update :rows + n-rows)
                                   (update :list-micros + (quot (- t1 t0) 1000)) (update :read-micros + (quot (- t2 t1) 1000))
                                   (update :reads merge-reads (:reads listed))))
                ;; Evaluate in ID order; stop exactly at the subject that fills the page, so the cursor resumes after it.
                (let [stopped-at
                      (reduce (fn [_ id]
                                (let [{:keys [ids]} @state]
                                  (if (and (= result "ids") (>= (count ids) limit)) (reduced id)
                                    (let [answer (if rel
                                                   (evaluate q (.get ^HashMap by id)
                                                             (fn [c] (or (some-> ^HashMap (:counts rel) (.get id) (.get c)) 0)))
                                                   (evaluate q (.get ^HashMap by id)))]
                                      (vswap! state #(-> % (update :examined inc) (assoc :last id)))
                                      (when answer
                                        (vswap! state update :subjects inc)
                                        (when (:match answer)
                                          (vswap! state update :matched inc)
                                          (case result
                                            "ids" (vswap! state #(-> % (update :ids conj id)
                                                                     (cond-> (seq (:project q))
                                                                       (update :projected conj
                                                                               (into {} (for [a (:project q)]
                                                                                          [a (mapv wire-value (or (.get ^HashMap (:values answer) a) []))]))))))
                                            "count" (vswap! state update :count inc)
                                            "countByValue"
                                            (let [vs (distinct (map value-key (or (.get ^HashMap (:values answer) (:of q)) [])))]
                                              (doseq [k (if (seq vs) (map group-key vs) [(group-key nil)])]
                                                (vswap! state update-in [:groups k] (fnil inc 0)))
                                              (when (> (count (:groups @state)) group-limit)
                                                (refuse! 422 "GroupLimitExceeded" (str "countByValue keeps at most " group-limit " distinct values"))))
                                            "top"
                                            (do (.add heap [id (order-value (:order q) (vals-of (:values answer) (:by (:order q))))])
                                                (when (> (.size heap) limit) (.pollLast heap)))
                                            "sum"
                                            (let [vs (vals-of (:values answer) (:of q))
                                                  ints (keep (fn [[f v]] (when (and (= f "integer") (some? v)) v)) vs)]
                                              (vswap! state #(-> % (update :sum (fn [^BigInteger a] (reduce (fn [^BigInteger x ^BigInteger y] (.add x y)) a ints)))
                                                                 (update :sum-values + (count ints))
                                                                 (update :sum-subjects + (if (seq ints) 1 0))
                                                                 (update :sum-skipped + (- (count vs) (count ints)))))))))
                                      nil))))
                              nil batch)]
                  (vswap! state update :eval-micros + (quot (- (System/nanoTime) t2) 1000))
                  (cond
                    stopped-at (vswap! state assoc :stopped "limit")
                    ;; The listing ended inside this walk: every listed ID was examined.
                    (= "end" (:stopped listed)) (vswap! state assoc :stopped "end")
                    :else (do
                            ;; Every ID of this walk was examined (IDs the shape skipped included): resume after the walk.
                            (when (:last listed) (vswap! state assoc :last (:last listed)))
                            (recur))))))))
        (let [{:keys [stopped last examined listed subjects matched rows ids projected reads] :as s} @state
              ;; A walk that stopped on "limit" with a full page may still be at the end; the next page then says so.
              complete (= stopped "end")
              micros (quot (- (System/nanoTime) started) 1000)
              cpu (quot (- (cpu-nanos) cpu0) 1000)]
          (stats/bump! [:sweep :requests] 1)
          (stats/bump! [:sweep :subjects] examined)
          (stats/bump! [:sweep :rows] rows)
          (stats/bump! [:sweep :micros] micros)
          (stats/bump! [:sweep :cpuMicros] cpu)
          (cond-> {:database name :account account :position position :t (str t) :head head :validAt valid-at
                   :facts "stored" :result result :complete complete :stopped stopped
                   :examined examined :listed listed :subjects subjects :matched matched :rows rows
                   :segmentsLoaded (segment-loads reads) :ioReads reads
                   :micros {:total micros :list (:list-micros s) :read (:read-micros s) :evaluate (:eval-micros s) :queue queueMicros}
                   :cpuMicros cpu
                   :next (when-not complete
                           (sign-cursor (cond-> {"v" 1 "db" name "account" account "req" req "t" t "position" position
                                                 "validAt" valid-at "last" last "count" (:count s) "groups" (vec (:groups s))}
                                          heap (assoc "heap" (heap-out heap))
                                          (= result "sum") (assoc "sum" (str (:sum s)) "sumValues" (:sum-values s)
                                                                  "sumSubjects" (:sum-subjects s) "sumSkipped" (:sum-skipped s)))))}
            (= result "ids") (assoc :ids ids)
            (and (= result "ids") (seq (:project q))) (assoc :projected projected)
            (= result "count") (assoc :count (:count s) :countComplete complete)
            (= result "countByValue") (assoc :groups (mapv (fn [[k n]] {:value (some-> (json/read-str k) (#(hash-map "type" (first %) "value" (second %)))) :count n})
                                                         (sort-by first (:groups s)))
                                             :countComplete complete)
            ;; [DX-XQ9] Keys added only for the new shapes, so every earlier question's answer is unchanged.
            (:has q) (assoc :related (:related s) :relatedListed (:related-listed s) :relatedRows (:related-rows s)
                            :relatedMicros (:related-micros s))
            (= result "top") (assoc :order {:by (:by (:order q)) :type (:type (:order q)) :direction (if (:desc (:order q)) "desc" "asc")}
                                    :kept (.size heap) :countComplete complete
                                    :ids (if complete (mapv first heap) [])
                                    :values (if complete (mapv (fn [[_ v]] (when (some? v) (wire-value [(:type (:order q)) v]))) heap) []))
            (= result "sum") (assoc :of (:of q) :sum (str (:sum s)) :valuesAdded (:sum-values s) :subjectsWithValue (:sum-subjects s)
                                    :skipped (:sum-skipped s) :countComplete complete
                                    :average (when complete (average (:sum s) (:sum-values s)))))))
      (finally (release)))))
