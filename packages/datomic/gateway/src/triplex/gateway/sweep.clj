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
(defn open-cursor [text]
  (when-not (and (string? text) (<= (count text) 65536)) (codec/invalid "Malformed cursor"))
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

(defn compile-condition [protected c]
  (when-not (map? c) (codec/invalid "Each condition is an object"))
  (doseq [k (keys c)]
    (when-not (#{"attribute" "op" "value" "values" "from" "fromExclusive" "to" "toExclusive"} k) (codec/invalid (str "Unknown condition field " k))))
  (let [attribute (check-attribute! protected "attribute" (get c "attribute")) op (get c "op")]
    (when-not (contains? ops op)
      (refuse! 400 "UnsupportedOperation" (str "op must be one of eq, in, range, prefix, exists, missing (not " op ")")))
    (case op
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
      ("exists" "missing") {:op op :attribute attribute})))

(defn holds? [c values]
  (case (:op c)
    "exists" (boolean (seq values))
    "missing" (empty? values)
    (boolean (some (:test c) values))))

;; ---------------------------------------------------------------------------------------------------------------
(def request-keys #{"account" "from" "where" "project" "result" "of" "limit" "cursor" "basis" "atLeastPosition" "basisWaitMs" "bounds"})

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
        result (get input "result" "ids")
        _ (when-not (#{"ids" "count" "countByValue"} result) (refuse! 400 "UnsupportedOperation" "result is ids, count or countByValue"))
        of (when (= result "countByValue") (check-attribute! protected "of" (get input "of")))
        _ (when (and (not= result "countByValue") (contains? input "of")) (codec/invalid "of applies to countByValue"))
        project (get input "project" [])
        _ (when-not (and (vector? project) (<= (count project) 8) (= (count project) (count (distinct project))))
            (refuse! 400 "UnsupportedOperation" "project takes up to eight distinct attributes"))
        _ (doseq [a project] (check-attribute! protected "project" a))
        _ (when (and (seq project) (not= result "ids")) (codec/invalid "project applies to result ids"))
        limit (get input "limit" 100)
        _ (when-not (and (integer? limit) (<= 1 limit 1000)) (codec/invalid "limit must be 1..1000"))]
    {:account account :base base :start (str base prefix) :prefix prefix :shape shape :shape-re shape-re :conds conds
     :result result :of of :project project :limit (long limit)
     ;; Key order inside the request's objects does not change the question.
     :req (ids/sha256 (json/write-str (walk/postwalk #(if (map? %) (into (sorted-map) %) %)
                                                     [account base prefix shape where result of project])))}))

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

(defn- value-key [[family value]] [family (if (instance? BigInteger value) (str value) value)])
(defn- wire-value [[family value]] {"type" family "value" (if (instance? BigInteger value) (str value) value)})

(defn evaluate
  "Test one subject's visible rows. Returns nil when the ID is not a subject at this cut (no visible fact), else
  {:match bool :values {attribute [[family value] ...]}} for the attributes the question reads."
  [q rows]
  (when (seq rows)
    (let [needed (set (concat (map :attribute (:conds q)) (:project q) (when (:of q) [(:of q)])))
          values (HashMap.)]
      (doseq [row rows]
        (let [a (tagged row "attribute")]
          (when (contains? needed a)
            (.put values a (conj (or (.get values a) []) (row-value row))))))
      {:match (every? #(holds? % (or (.get values (:attribute %)) [])) (:conds q)) :values values})))

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
  (doseq [k (keys input)] (when-not (request-keys k) (codec/invalid (str "Unknown field " k))))
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
            group-key (fn [v] (json/write-str (if v (value-key v) nil)))]
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
                    t2 (System/nanoTime)]
                (doseq [^String id batch] (when-not (.startsWith id base) (throw (ex-info "ID outside the account" {:status 500 :code "AccountLeak"}))))
                (vswap! state #(-> % (update :listed + (:examined listed)) (update :rows + n-rows)
                                   (update :list-micros + (quot (- t1 t0) 1000)) (update :read-micros + (quot (- t2 t1) 1000))
                                   (update :reads merge-reads (:reads listed))))
                ;; Evaluate in ID order; stop exactly at the subject that fills the page, so the cursor resumes after it.
                (let [stopped-at
                      (reduce (fn [_ id]
                                (let [{:keys [ids]} @state]
                                  (if (and (= result "ids") (>= (count ids) limit)) (reduced id)
                                    (let [answer (evaluate q (.get ^HashMap by id))]
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
                                                (refuse! 422 "GroupLimitExceeded" (str "countByValue keeps at most " group-limit " distinct values")))))))
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
                           (sign-cursor {"v" 1 "db" name "account" account "req" req "t" t "position" position
                                         "validAt" valid-at "last" last "count" (:count s) "groups" (vec (:groups s))}))}
            (= result "ids") (assoc :ids ids)
            (and (= result "ids") (seq (:project q))) (assoc :projected projected)
            (= result "count") (assoc :count (:count s) :countComplete complete)
            (= result "countByValue") (assoc :groups (mapv (fn [[k n]] {:value (some-> (json/read-str k) (#(hash-map "type" (first %) "value" (second %)))) :count n})
                                                         (sort-by first (:groups s)))
                                             :countComplete complete))))
      (finally (release)))))
