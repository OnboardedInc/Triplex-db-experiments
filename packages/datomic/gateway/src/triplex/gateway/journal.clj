(ns triplex.gateway.journal
  (:require [datomic.api :as d] [triplex.gateway.stats :as stats] [triplex.gateway.reach :as reach] [triplex.gateway.storage :as storage]))
(set! *warn-on-reflection* false)
;; [DX-B4-T1] Why: these reads use only immutable indexes; a scope without the write-side proof declines.
;; Rejected: reconstructing journals through entity/pull/query or guessing legacy completeness.
(defn value [db e a] (:v (first (d/datoms db :eavt e a))))
(defn supported! [db name time-order?]
  (let [scope (:scope (reach/config name db))]
    (when-not (#{2 3} (value db scope :triplex.scope/rows-version)) (reach/decline! "rows-version"))
    (when-not (= 2 (value db scope :triplex.scope/feed-version)) (reach/decline! "feed-version"))
    (when (or (and time-order? (value db scope :triplex.scope/irregular)) (value db scope :triplex.scope/feed-irregular))
      (reach/decline! "irregular"))))
(defn declined [e]
  (if-let [reason (:declined (ex-data e))]
    (let [out (StringBuilder.)] (stats/bump! [:journalDeclines reason] 1) (.append out "{\"declined\":") (reach/append-string! out reason) (.append out "}") (str out))
    (throw e)))
(defn page [conn name input]
  (try
    (let [after (storage/safe-position (get input "after")) limit (get input "limit") wait-ms (get input "waitMs" 0)
          _ (when-not (and (integer? limit) (<= 1 limit 1000) (integer? wait-ms) (<= 0 wait-ms 30000))
              (throw (ex-info "Invalid journal page bounds" {:status 400})))
          deadline (+ (System/nanoTime) (* wait-ms 1000000))
          current (loop [db (storage/await-record-time name conn
                    (storage/await-position (d/db conn) (get-in input ["basis" "recordedPosition"])
                      (get input "basisWaitMs") (fn [_] (d/db conn))) input)]
               ;; [DX-B6-5] Why: this index is ordered by logical position, not by the physical commit's record-time cut.
               ;; Rejected: declining exact position feeds after multi-instant nested commits or raw timestamp regressions.
               (supported! db name false)
               (if (and (pos? wait-ms) (<= (storage/head-position name db) after) (< (System/nanoTime) deadline))
                 (do (Thread/sleep 1) (recur (d/db conn))) db))
          ;; [DX-B6-5] Why: an explicit basis selects a cut after freshness, rather than exposing later journals.
          ;; Rejected: waiting for R and then enumerating the current head unconditionally.
          db (if-let [basis (get input "basis")] (first (reach/select-db name current basis)) current)
          ;; Physical positions are monotonic; nested logical journals are sorted within each physical commit.
          journals (mapcat (fn [tx]
                             (let [links (vec (d/datoms db :eavt (:e tx) :triplex.tx/journals))]
                               (sort-by second
                                 (for [link links
                                       :let [e (:v link) p (value db e :triplex.journal/position)]
                                       :when (> p after)] [e p]))))
                           (d/index-range db :triplex.tx/position (inc after) nil))
          out (StringBuilder.)]
      (.append out "{\"head\":") (.append out (str (storage/head-position name db))) (.append out ",\"transactions\":[")
      (doseq [[i [e p]] (map-indexed vector (take limit journals))]
        (when (value db e :triplex.entity/row-overflow) (reach/decline! "row-overflow"))
        (when (pos? i) (.append out ","))
        (.append out "[") (reach/append-string! out (value db e :triplex.entity/id)) (.append out ",") (.append out (str p)) (.append out ",[")
        ;; Current rows are exact: supported scopes have never retired or extended a published journal.
        (doseq [[j row] (map-indexed vector (d/datoms db :eavt e :triplex.entity/row))]
          (when (pos? j) (.append out ",")) (reach/append-string! out (:v row)))
        (.append out "]]"))
      (.append out "]}") (str out))
    (catch Exception e (declined e))))
;; [DX-B4-T3] Why: command identity and current receipt bodies do not depend on record-time monotonicity.
;; Rejected: sharing the feed's timestamp guard (causes whole-store retry scans after parallel commits).
(defn command [db name input]
  (try
    (supported! db name false)
    (let [claim (d/entid db [:triplex.claim/command-id (get input "commandId")])
          id (when claim (value db claim :triplex.claim/tx-id)) out (StringBuilder.)]
      (.append out "{\"txId\":")
      (if id (reach/append-string! out id) (.append out "null"))
      (.append out "}") (str out))
    (catch Exception e (declined e))))

;; [DX-B4-T2] Why: entity identity is an indexed lookup and journal rows are immutable in supported scopes.
;; Rejected: passing receipt reads through read-rows' entity reconstruction.
(defn entity [db name input]
  (try
    (supported! db name false)
    (let [e (d/entid db [:triplex.entity/id (get input "txId")]) out (StringBuilder.)]
      (when (and e (value db e :triplex.entity/row-overflow)) (reach/decline! "row-overflow"))
      (.append out "{\"rows\":[")
      (doseq [[i row] (map-indexed vector (if e (d/datoms db :eavt e :triplex.entity/row) []))]
        (when (pos? i) (.append out ",")) (reach/append-string! out (:v row)))
      (.append out "]}") (str out))
    (catch Exception e (declined e))))
