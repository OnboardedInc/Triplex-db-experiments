(ns triplex.gateway.ids
  (:require [datomic.api :as d] [datomic.measure.io-stats :as io] [clojure.data.json :as json] [clojure.string :as str]
            [triplex.gateway.codec :as codec] [triplex.gateway.storage :as storage] [triplex.gateway.reach :as reach]
            [triplex.gateway.scope :as scope] [triplex.gateway.stats :as stats] [triplex.gateway.trace :as trace])
  (:import [java.util Base64 Iterator] [java.util.concurrent Semaphore TimeUnit ConcurrentHashMap]
           [java.security MessageDigest] [java.nio.charset StandardCharsets]))

;; [DX-XQ3] Step 0 of questions across subjects (design 2026-11-24, option E1): the entities of one ID kind in one
;; account, listed from the AVET index Datomic already keeps for the unique `:triplex.entity/id`. Every deep-account
;; entity ID starts with `acct/<account>/<kind>:`, so one `index-range` from that prefix lists exactly the IDs of that
;; kind in that account, in ID order, at any database value: the head, a pinned position, a record time. Nothing is
;; written; nothing is backfilled. Behind TX2_ID_LISTS=1 (default off: the route is then absent, as before).
;; An answer means "an entity with this ID existed at the stated position". In the lean layout an entity gets its ID
;; datom with its first row (storage/tx-data), so that is "an entity that had a fact recorded at or before the
;; position", retired or not; the legacy layout also gives reference targets an ID (storage/upserts). A subject whose
;; protected values were removed on request keeps its ID (an ID is never a protected value). Callers that need "has a
;; fact of type T visible at the basis" read the rows of the page (Triples.entityPage does).
;; Rejected: a scan of `:triplex.entity/row` by type (every entity, no bound); an index written per save (step 1).
(def enabled (= "1" (System/getenv "TX2_ID_LISTS")))

;; [DX-XQ3] Why: an ID list has its own permit pool beside admission/reads and admission/journals, and at most one
;; running request per account, so a long listing in one account never takes a pinned read's permit or a second
;; account's turn. Rejected: the read permits (a listing would queue the 256 pinned readers behind it).
(def permit-count
  (let [n (Integer/parseInt (or (System/getenv "TX2_INDEX_QUERY_PERMITS") "1"))]
    (when-not (<= 1 n 64) (throw (IllegalArgumentException. "TX2_INDEX_QUERY_PERMITS must be 1..64"))) n))
(def ^Semaphore permits (Semaphore. permit-count true))
(def ^ConcurrentHashMap running (ConcurrentHashMap.))

(def bound-defaults {"entries" 100000 "ms" 100 "segments" 512})
(def bound-caps {"entries" 1000000 "ms" 1000 "segments" 4096})
(def chunk-size 256)

(defn refuse! [status code message & [extra]]
  (throw (ex-info message (merge {:status status :code code :ids-refusal true} extra))))

(def account-pattern #"[A-Za-z0-9_-]{1,64}")
(defn base-for
  "The ID prefix an account may read. `_system` reads Triplex's reserved `_triplex/` entities (ConfigStore)."
  [account]
  (cond (nil? account) (refuse! 400 "AccountRequired" "Name the account whose IDs to list")
        (not (and (string? account) (re-matches account-pattern account)))
        (codec/invalid "account must match [A-Za-z0-9_-]{1,64}")
        (= account "_system") "_triplex/"
        :else (str "acct/" account "/")))

(defn- printable! [what ^String s max-length]
  (when-not (and (string? s) (<= (.length s) max-length)) (codec/invalid (str what " must be a string of at most " max-length " characters")))
  (dotimes [i (.length s)]
    (let [c (int (.charAt s i))] (when (or (< c 32) (= c 127)) (codec/invalid (str what " may not contain control characters")))))
  s)

;; [DX-XQ3] Why: the loader's subject roots `pl:00000001` share their prefix with placements `pl:00000001:p0`, so a
;; shape keeps only IDs of one exact form. The grammar is closed: `{N digits}` (N from 1 to 32), `{digits}`,
;; `{segment}` (one or more characters other than `:` and `/`); every other character is literal.
;; Rejected: a caller's regular expression (unbounded backtracking on a request thread).
(defn shape-pattern [shape]
  (when (some? shape)
    (printable! "shape" shape 256)
    (loop [i 0 out (StringBuilder.)]
      (if (>= i (count shape))
        (re-pattern (str out))
        (if (= \{ (.charAt ^String shape i))
          (let [end (.indexOf ^String shape "}" (int i))
                token (when (pos? end) (subs shape (inc i) end))]
            (cond (nil? token) (codec/invalid "shape has an unclosed {")
                  (= token "digits") (recur (inc end) (.append out "[0-9]+"))
                  (= token "segment") (recur (inc end) (.append out "[^:/]+"))
                  :else (if-let [[_ n] (re-matches #"([1-9][0-9]?) digits" token)]
                          (let [n (Long/parseLong n)]
                            (when (> n 32) (codec/invalid "shape digits must be 1..32"))
                            (recur (inc end) (.append out (str "[0-9]{" n "}"))))
                          (codec/invalid (str "Unknown shape token {" token "}")))))
          (recur (inc i) (.append out (java.util.regex.Pattern/quote (str (.charAt ^String shape i))))))))))

(defn- bounds [input]
  (let [given (get input "bounds" {})]
    (when-not (map? given) (codec/invalid "bounds must be an object"))
    (doseq [k (keys given)] (when-not (contains? bound-defaults k) (codec/invalid (str "Unknown bound " k))))
    (into {} (for [[k default] bound-defaults]
               (let [v (get given k default)]
                 (when-not (and (integer? v) (<= 1 v (get bound-caps k))) (codec/invalid (str "bounds." k " must be 1.." (get bound-caps k))))
                 [k (long v)])))))

(defn sha256 [^String text]
  (let [bytes (.digest (MessageDigest/getInstance "SHA-256") (.getBytes text StandardCharsets/UTF_8))]
    (apply str (map #(format "%02x" (bit-and % 0xff)) bytes))))
(defn request-hash [base prefix shape order result]
  (sha256 (json/write-str [base prefix shape order result])))
(defn encode-cursor [m]
  (.encodeToString (.withoutPadding (Base64/getUrlEncoder)) (.getBytes ^String (json/write-str m) StandardCharsets/UTF_8)))
(defn decode-cursor [text]
  (let [m (try (json/read-str (String. (.decode (Base64/getUrlDecoder) ^String text) StandardCharsets/UTF_8))
               (catch Exception _ (codec/invalid "Malformed cursor")))]
    (when-not (and (map? m) (= 1 (get m "v")) (string? (get m "db")) (string? (get m "account")) (string? (get m "req"))
                   (integer? (get m "t")) (integer? (get m "position")) (or (nil? (get m "last")) (string? (get m "last"))) (integer? (get m "count"))
                   (or (nil? (get m "validAt")) (number? (get m "validAt"))))
      (codec/invalid "Malformed cursor"))
    m))

(defn successor
  "The least string greater than every string that starts with `s` (for a descending start)."
  [^String s]
  (loop [i (dec (.length s))]
    (cond (neg? i) nil
          (< (int (.charAt s i)) 0xffff) (str (subs s 0 i) (char (inc (int (.charAt s i)))))
          :else (recur (dec i)))))

(defn- local-at-least [name conn db {:keys [position waitMs]}]
  (if (<= position (storage/head-position name db)) {:db db :waitMicros 0}
    (let [start (System/nanoTime)]
      (try {:db (storage/await-position db position waitMs (fn [_] (d/db conn)) conn)
            :waitMicros (quot (- (System/nanoTime) start) 1000)}
           (catch clojure.lang.ExceptionInfo e
             (if (= "BasisNotAvailable" (:code (ex-data e)))
               (let [head (storage/head-position name (d/db conn))]
                 (throw (ex-info (str "The gateway's peer did not reach position " position " within " waitMs " ms (its head is " head ")")
                                 {:status 409 :code "AtLeastTimeout" :maximum head})))
               (throw e)))))))
;; [DX-XQ3] Why: the "at least my receipt" wait is the one of exp/DX-RD4-at-least-read (`at-least/await!`) once that
;; namespace is on the branch; until then the same wait (storage/await-position on the peer's own wakeups) is local.
;; Rejected: a second contract for the same promise.
(def at-least-await
  (or (try (requiring-resolve 'triplex.gateway.at-least/await!) (catch Throwable _ nil)) local-at-least))

(defn- segment-loads [io-stats]
  (reduce + 0 (keep (fn [[k v]] (when (and (number? v) (str/ends-with? (name k) "-load")) (long v))) (:reads io-stats))))
(defn- merge-reads [a b]
  (merge-with (fn [x y] (if (and (number? x) (number? y)) (+ x y) y)) a b))

(defn- resolve-view
  "[view position t validAt] for a first page. Every refusal names the rule."
  [name conn input]
  (let [basis (get input "basis") wait (get input "basisWaitMs")
        _ (when-not (or (nil? basis) (map? basis)) (codec/invalid "basis must be an object"))
        p (get basis "recordedPosition") r (get basis "recordedAt") v (get basis "validAt")
        _ (when-not (or (nil? v) (and (number? v) (Double/isFinite (double v)))) (codec/invalid "validAt must be a finite number"))
        _ (when-not (or (nil? r) (and (number? r) (Double/isFinite (double r)))) (codec/invalid "recordedAt must be a finite number"))
        at-least (get input "atLeastPosition")
        initial (d/db conn)]
    (when (and (some? at-least) (or (some? p) (some? r)))
      (codec/invalid "atLeastPosition applies only to a read at the head (no recordedPosition or recordedAt)"))
    (if (or (some? p) (some? r))
      (let [db (if (and (some? p) (> (storage/safe-position p) (storage/head-position name initial)))
                 (storage/await-position initial p wait (fn [_] (d/db conn)) conn) initial)
            db (storage/await-record-time name conn db input)
            ;; Position 0 is the scope before its first commit (storage/at-position's rule); select-db has no row for it.
            [view _ t _ inner] (try (if (and (= 0 p) (nil? r))
                                      (let [view (storage/at-position db 0)] [view 0 (or (d/as-of-t view) (d/basis-t view)) true nil])
                                      (reach/select-db name db basis))
                                    (catch clojure.lang.ExceptionInfo e
                                      (case (:declined (ex-data e))
                                        "irregular" (refuse! 409 "IrregularScope" "This scope's positions are irregular; it cannot answer this basis")
                                        "interior-position" (refuse! 409 "InteriorPosition" "The position is inside a multi-position transaction; ask for a commit boundary")
                                        "rows-version" (refuse! 409 "LayoutUnsupported" "This scope's layout has no ID list")
                                        (throw e))))]
        (when inner
          (refuse! 409 "InteriorPosition" "The position is inside a group commit; ask for a commit boundary"
                   {:maximum (:position inner)}))
        [view (scope/head-position view (scope/entity view)) t v])
      (let [db (if (some? at-least)
                 (:db (at-least-await name conn initial {:position (storage/safe-position at-least)
                                                         :waitMs (long (or wait 500))}))
                 initial)]
        (when (some? wait) (when-not (and (integer? wait) (<= 1 wait 2000)) (codec/invalid "Basis wait must be 1..2000 ms")))
        [db (scope/head-position db (scope/entity db)) (d/basis-t db) v]))))

(defn- view-at-t [conn t]
  (let [db (d/db conn)
        db (if (<= t (d/basis-t db)) db
             (let [synced (deref (d/sync conn t) 2000 ::timeout)]
               (when (= synced ::timeout) (refuse! 409 "BasisNotAvailable" "The cursor's database value is not on this gateway's peer yet"))
               synced))]
    (if (= t (d/basis-t db)) db (d/as-of db t))))

(defn scan!
  "Walk the ID index from `from` (exclusive when `skip`), in `order`, inside `start`. Returns the page's work.
  A shape is matched against the ID after the account's base (`acct/<account>/`), as the prefix is."
  [view ^String base ^String start ^String from skip order shape-re result limit {:strs [entries ms segments]}]
  (let [attr (d/entid view :triplex.entity/id)
        ;; A descending walk starts at the least string above the range and skips that string itself.
        [from skip] (if (and (= order "desc") (nil? from)) [(successor start) true] [from skip])
        ^Iterable source (if (= order "desc")
                           (if from (d/rseek-datoms view :avet attr from) [])
                           (d/index-range view attr (or from start) nil))
        ^Iterator it (.iterator source)
        deadline (+ (System/nanoTime) (* ms 1000000))
        ids (java.util.ArrayList.)
        state (volatile! {:examined 0 :found 0 :last nil :stopped nil :reads {}})
        in-range? (fn [^datomic.Datom x] (and (= attr (.a x)) (.startsWith ^String (.v x) start)))
        take-one (fn []
                   (loop []
                     (if-not (.hasNext it) nil
                       (let [^datomic.Datom x (.next it)]
                         (if (and skip from (= (.v x) from)) (recur) x)))))]
    (loop []
      (let [{:keys [examined]} @state
            budget (min chunk-size (- entries examined))
            measured (io/throw-if-ex!
                       (io/with-io-stats
                         (fn []
                           (loop [n 0]
                             (when (< n budget)
                               (if-let [^datomic.Datom x (take-one)]
                                 (if-not (in-range? x)
                                   (vswap! state assoc :stopped "end")
                                   (let [id ^String (.v x)]
                                     (vswap! state #(-> % (update :examined inc) (assoc :last id)))
                                     (when (or (nil? shape-re) (re-matches shape-re (subs id (.length base))))
                                       (vswap! state update :found inc)
                                       (when (= result "ids") (.add ids id)))
                                     (if (and (= result "ids") (>= (.size ids) limit))
                                       ;; Peek: when nothing in range follows, this page is the end (no cursor).
                                       (if (< (:examined @state) entries)
                                         (let [nx (take-one)]
                                           (if (and nx (in-range? nx))
                                             (vswap! state assoc :stopped "limit")
                                             (vswap! state assoc :stopped "end")))
                                         (vswap! state assoc :stopped "entries"))
                                       (recur (inc n)))))
                                 (vswap! state assoc :stopped "end")))))
                         {:io-context :triplex/id-list :api :lookup}))]
        (vswap! state update :reads merge-reads (:reads (:io-stats measured)))
        (let [{:keys [stopped examined reads]} @state]
          (cond stopped nil
                (>= examined entries) (vswap! state assoc :stopped "entries")
                (>= (segment-loads {:reads reads}) segments) (vswap! state assoc :stopped "segments")
                (>= (System/nanoTime) deadline) (vswap! state assoc :stopped "time")
                :else (recur)))))
    (assoc @state :ids (vec ids))))

(defn page
  "POST /v2/db/{db}/ids. See lab/experiments/EXP-DX1/xq3/ID-LISTS.md for the contract."
  [name conn input]
  (when-not (map? input) (codec/invalid "Expected a JSON object"))
  (doseq [k (keys input)]
    (when-not (#{"account" "prefix" "shape" "basis" "atLeastPosition" "basisWaitMs" "result" "limit" "cursor" "order" "after" "bounds"} k)
      (codec/invalid (str "Unknown field " k))))
  (let [account (get input "account")
        base (base-for account)
        prefix (printable! "prefix" (get input "prefix" "") 512)
        shape (get input "shape") shape-re (shape-pattern shape)
        order (get input "order" "asc")
        _ (when-not (#{"asc" "desc"} order) (codec/invalid "order must be asc or desc"))
        result (get input "result" "ids")
        _ (when-not (#{"ids" "count"} result) (refuse! 400 "UnsupportedOperation" "result must be ids or count on this route"))
        limit (get input "limit" 100)
        _ (when-not (and (integer? limit) (<= 1 limit 1000)) (codec/invalid "limit must be 1..1000"))
        limits (bounds input)
        start (str base prefix)
        req (request-hash base prefix shape order result)
        cursor (some-> (get input "cursor") decode-cursor)
        after (get input "after")
        _ (when (and cursor after) (codec/invalid "Give cursor or after, not both"))
        _ (when (some? after)
            (printable! "after" after 4096)
            (when-not (.startsWith ^String after base)
              (refuse! 409 "AccountMismatch" "after names an entity outside the account"))
            (when-not (.startsWith ^String after start) (codec/invalid "after must start with the account's prefix")))
        _ (when cursor
            (when-not (and (= name (get cursor "db")) (= account (get cursor "account")) (= req (get cursor "req")))
              (refuse! 409 "CursorMismatch" "The cursor belongs to another database, account or request"))
            (let [b (get input "basis")]
              (when (or (some? (get input "atLeastPosition"))
                        (and (some? (get b "recordedPosition")) (not= (get b "recordedPosition") (get cursor "position")))
                        (some? (get b "recordedAt"))
                        (and (some? (get b "validAt")) (not= (double (get b "validAt")) (some-> (get cursor "validAt") double))))
                (refuse! 409 "CursorMismatch" "A cursor keeps its first page's basis"))))
        [view position t valid-at] (if cursor
                                     (let [view (view-at-t conn (get cursor "t"))]
                                       [view (get cursor "position") (get cursor "t") (get cursor "validAt")])
                                     (resolve-view name conn input))
        head (storage/head-position name (d/db conn))
        last-key (if cursor (get cursor "last") after)
        _ (when (and last-key (not (.startsWith ^String last-key start)))
            (refuse! 409 "CursorMismatch" "The cursor's key is outside this request's range"))
        prior (if cursor (get cursor "count") 0)]
    ;; Admission after the basis is resolved, so a wait for a position never holds a permit.
    (when (some? (.putIfAbsent running account true))
      (stats/bump! [:idLists :busy] 1)
      (refuse! 503 "IndexBusy" "Another ID list of this account is running" {:retryAfterMs (get limits "ms")}))
    (try
      (when-not (.tryAcquire permits (get limits "ms") TimeUnit/MILLISECONDS)
        (stats/bump! [:idLists :busy] 1)
        (refuse! 503 "IndexBusy" "Every ID list permit is in use" {:retryAfterMs (get limits "ms")}))
      (try
        (let [started (System/nanoTime)
              work (trace/span "ids/scan" "gateway" (scan! view base start last-key (some? last-key) order shape-re result limit limits))
              micros (quot (- (System/nanoTime) started) 1000)
              {:keys [examined found stopped last reads ids]} work
              total (+ prior found)
              more? (not= stopped "end")]
          (stats/bump! [:idLists :requests] 1)
          (stats/bump! [:idLists :examined] examined)
          ;; Every returned ID is checked against the account (cheap; a failure is an error, never a filter).
          (doseq [^String id ids] (when-not (.startsWith id base) (throw (ex-info "ID outside the account" {:status 500 :code "AccountLeak"}))))
          (cond-> {:database name :account account :position position :t (str t) :head head
                   :validAt valid-at :trailingBy 0 :result result
                   :examined examined :segmentsLoaded (segment-loads {:reads reads}) :ioReads reads :scanMicros micros
                   :stopped stopped
                   :next (when more?
                           (encode-cursor {"v" 1 "db" name "account" account "req" req "t" t "position" position
                                           "validAt" valid-at "last" (or last last-key) "count" total}))}
            (= result "ids") (assoc :ids ids)
            (= result "count") (assoc :count total :countExact (not more?))))
        (finally (.release permits)))
      (finally (.remove running account)))))
