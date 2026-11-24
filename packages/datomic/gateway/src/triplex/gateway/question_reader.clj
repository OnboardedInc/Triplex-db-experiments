(ns triplex.gateway.question-reader
  "[DX-XQ7] A separate reader for questions across subjects. A question (an ID list page, a sweep page, and the
  commit-time index's find page once that route is on the branch) reads many subjects once each; on the main reader
  those loads pass through the object cache that pinned and current reads depend on and evict what they had cached
  (xq6/EXACT-SWEEP.md section 4.2). With this namespace a second read gateway process, with its own Datomic peer, object
  cache, cores and permit pools, serves only the question routes, and the other gateways refuse them with a typed
  answer that names where they are served. Both options default off: unset, `guard` answers nil for every request and
  the routes are exactly as before.
    TX2_QUESTION_READER=1      this gateway is the question reader: it serves the question routes and refuses every
                               other route except health, admin and basis (421 QuestionReaderOnly).
    TX2_QUESTIONS_AT=<url>     this gateway is a main gateway beside a question reader: it refuses the question routes
                               with 421 QuestionReaderRoute and the URL in `questionReader`.
    TX2_QUESTION_ROUTES        the route names that are questions (default ids,sweep,find).
  Contract, gates and sizing: lab/experiments/EXP-DX1/xq7/QUESTION-READER.md."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.measure.io-stats :as io]))

;; [DX-XQ7] Why: the question routes are named by their last path segment (POST /v2/db/{db}/<name>), so a route another
;; builder adds (find, exp/DX-XQ4-commit-index) is served here by naming it in this list, with no other change.
;; Rejected: matching each route's handler (every new question route would need an edit here).
(def routes
  (let [text (or (not-empty (System/getenv "TX2_QUESTION_ROUTES")) "ids,sweep,find")
        names (set (map str/trim (str/split text #",")))]
    (when-not (and (seq names) (every? #(re-matches #"[a-z][a-z0-9-]{0,31}" %) names))
      (throw (IllegalArgumentException. "TX2_QUESTION_ROUTES is a comma-separated list of route names")))
    names))

(def question-reader? (= "1" (System/getenv "TX2_QUESTION_READER")))
(def questions-at
  (let [url (not-empty (System/getenv "TX2_QUESTIONS_AT"))]
    (when (and url (not (re-matches #"https?://[A-Za-z0-9._-]+(:[0-9]{1,5})?/?" url)))
      (throw (IllegalArgumentException. "TX2_QUESTIONS_AT must be http(s)://host[:port]")))
    (when (and url question-reader?)
      (throw (IllegalArgumentException. "A gateway is either the question reader or refers to one, not both")))
    url))
(def enabled (or question-reader? (some? questions-at)))

(def ^:private db-route #"/v[12]/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/([A-Za-z0-9-]+)")

(defn question-route
  "The question route a request names (POST /v2/db/{db}/<route> with <route> in `routes`), else nil."
  [{:keys [request-method uri]}]
  (when (and (= :post request-method) (string? uri) (str/starts-with? uri "/v2/db/"))
    (when-let [[_ action] (re-matches db-route uri)]
      (when (contains? routes action) action))))

;; [DX-XQ7] Why: the question reader still answers its own health, its admin counters and the basis route (a client
;; waits on it for a receipt's position, and the gates read its head there); none of them reads subjects.
;; Rejected: serving reads by entity on the question reader too (it would fill its cache with what the main reader's
;; clients read, and a misrouted client would never notice).
(defn- always-served? [{:keys [request-method uri]}]
  (or (= uri "/health")
      (str/starts-with? (or uri "") "/v2/admin/")
      (and (= :get request-method) (some? (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/basis" (or uri ""))))))

(defn- refuse [code message extra]
  {:status 421 :headers {"Content-Type" "application/json; charset=utf-8"}
   :body (json/write-str (merge {:code code :message message} extra))})

(def counts (atom {}))
(defn stats [] (assoc @counts :questionReader question-reader? :questionsAt questions-at :routes (sort routes)))

(defn guard
  "nil when this gateway serves the request (always, when both options are unset), else the typed refusal.
  [DX-XQ7] Why 421 Misdirected Request: the request is valid and would be answered, by another gateway; a client that
  is not configured for the question reader learns its URL from the answer. Rejected: proxying from the main reader to
  the question reader (the main reader would hold a web thread and a connection for every sweep page, up to 2 s each,
  and add a hop to every question; the SDK's one option routes the calls instead)."
  [request]
  (when enabled
    (let [route (question-route request)]
      (cond
        (and questions-at route)
        (do (swap! counts update-in [:refusedQuestion route] (fnil inc 0))
            (refuse "QuestionReaderRoute" (str "Questions across subjects (" route ") are served by the question reader")
                    {:route route :questionReader questions-at}))
        (and question-reader? (nil? route) (not (always-served? request)))
        (do (swap! counts update :refusedOther (fnil inc 0))
            (refuse "QuestionReaderOnly" "This gateway is the question reader; it serves only questions across subjects"
                    {:routes (sort routes)}))
        :else (do (when route (swap! counts update-in [:served route] (fnil inc 0))) nil)))))

;; ---------------------------------------------------------------------------------------------------------------
;; [DX-XQ7] Counters of what the reads by entity (POST /v1/db/{db}/read) took from this peer's object cache and from
;; storage, so a gate can show whether a question displaced the cache the pinned readers use. Datomic's io-stats per
;; read: `:ocache` object cache hits, `:dev` segments read from storage, `:<index>` segment requests and `:<index>-load`
;; loads per index; summed over every read since the last reset. Behind TX2_READ_IO_COUNTERS=1 (default off: reads run
;; exactly as before and /v2/admin/scan-stats carries no `readIo`). A read already sampled by the read profile
;; (TX2_READ_PROFILE) keeps its own io-stats and is not counted here.
;; Rejected: PostgreSQL's index-scan count alone (it sums every peer of the database, the question reader's included).
(def read-io-enabled (= "1" (System/getenv "TX2_READ_IO_COUNTERS")))
(def read-io (atom {}))
(defn- add-reads [acc reads]
  (reduce-kv (fn [m k v] (if (number? v) (update m (name k) (fnil + 0) v) m)) acc reads))
(defn count-read-io
  "Run (f) and add its io-stats to the read counters."
  [f]
  (let [measured (io/throw-if-ex! (io/with-io-stats f {:io-context :triplex/read-counters :api :lookup}))]
    (swap! read-io (fn [m] (-> m (update "reads" (fnil inc 0)) (add-reads (get-in measured [:io-stats :reads])))))
    (:ret measured)))
(defn reset-read-io! [] (reset! read-io {}))
