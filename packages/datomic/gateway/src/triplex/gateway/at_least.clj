(ns triplex.gateway.at-least
  (:require [datomic.api :as d] [triplex.gateway.storage :as storage] [triplex.gateway.codec :as codec]
            [triplex.gateway.stats :as stats] [triplex.gateway.trace :as trace]))

;; [DX-RD4] Why: a reader that holds a write receipt can ask any gateway for "at least" the receipt's position on an
;; unpinned read. The gateway waits on its own peer (the pinned reads' `storage/await-position`: a local d/db check, then
;; the peer's transaction-report wakeups, never a transactor round trip) until the peer has that position, and then
;; answers at its own head, which is at or after it. Without the parameter nothing changes.
;; Rejected: d/sync on every unpinned read (one transactor round trip per read for every caller, receipt or not);
;; answering at the asked position (that is a pinned read, and a later head is the better answer); an unbounded wait.
(def default-wait-ms 500)

(defn- wait-ms [w]
  (when-not (or (nil? w) (and (integer? w) (<= 1 w 2000))) (codec/invalid "Basis wait must be 1..2000 ms"))
  (long (or w default-wait-ms)))

(defn from-body
  "The at-least request of a POST read body, or nil. Refused on a pinned read: a pin already names its position."
  [input]
  (when (and (map? input) (contains? input "atLeastPosition"))
    (let [basis (get input "basis")]
      (when (or (some? (get basis "recordedPosition")) (some? (get basis "recordedAt")) (some? (get input "handle")))
        (codec/invalid "atLeastPosition applies only to an unpinned read (no recordedPosition, recordedAt or handle)"))
      {:position (storage/safe-position (get input "atLeastPosition")) :waitMs (wait-ms (get input "basisWaitMs"))})))

(defn- natural [s]
  (when-not (and (string? s) (re-matches #"0|[1-9][0-9]{0,15}" s)) (codec/invalid "Invalid at-least parameter"))
  (Long/parseLong s))

(defn from-query
  "The at-least request of `GET /v1/db/{db}/basis?atLeast=P[&waitMs=W]`, or nil without `atLeast`."
  [query-string]
  (let [params (into {} (map #(let [[k v] (.split ^String % "=" 2)] [k v]))
                     (remove empty? (.split ^String (or query-string "") "&")))]
    (when (and (contains? params "waitMs") (not (contains? params "atLeast")))
      (codec/invalid "waitMs needs atLeast"))
    (when (contains? params "atLeast")
      {:position (storage/safe-position (natural (get params "atLeast")))
       :waitMs (wait-ms (some-> (get params "waitMs") natural))})))

(defn await!
  "The peer's database at a head at or after `position`, waiting at most `waitMs`; {:db :waitMicros}.
  Throws 409 AtLeastTimeout (with the peer's head as :maximum) when the peer does not reach it in time."
  [name conn db {:keys [position waitMs]}]
  (stats/bump! [:atLeast :requests] 1)
  (if (<= position (storage/head-position name db))
    {:db db :waitMicros 0}
    (let [start (System/nanoTime)]
      (try
        (let [ready (trace/span "storage/await-position" "gateway"
                      (storage/await-position db position waitMs
                                              (fn [_] (trace/span "d/db" "peer-call" (d/db conn))) conn))
              micros (quot (- (System/nanoTime) start) 1000)]
          (stats/bump! [:atLeast :waited] 1)
          (stats/bump! [:atLeast :waitMicros] micros)
          {:db ready :waitMicros micros})
        (catch clojure.lang.ExceptionInfo e
          (if (= "BasisNotAvailable" (:code (ex-data e)))
            (let [head (storage/head-position name (d/db conn))]
              (stats/bump! [:atLeast :timeouts] 1)
              (throw (ex-info (str "The gateway's peer did not reach position " position " within " waitMs
                                   " ms (its head is " head ")")
                              {:status 409 :code "AtLeastTimeout" :maximum head})))
            (throw e)))))))
