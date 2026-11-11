(ns triplex.gateway.journal
  (:require [clojure.data.json :as json] [datomic.api :as d] [triplex.gateway.lean :as lean] [triplex.gateway.feed :as feed] [triplex.gateway.admission :as admission] [triplex.gateway.stats :as stats] [triplex.gateway.reach :as reach] [triplex.gateway.storage :as storage]))
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
;; [DX-R2] Why: replacement rows must come from the journal cut, including retired entities and new reference closures.
;; Rejected: current-head rows (two journals in a page may change the same entity).
(defn replica-supported! [db name]
  (supported! db name false)
  (let [scope (:scope (reach/config name db))]
    (when-not (= 3 (value db scope :triplex.scope/rows-version)) (reach/decline! "replica-layout"))
    (when-not (true? (value db scope :triplex.scope/position-regular)) (reach/decline! "replica-positions"))))
(defn page [conn name input]
  (try
    (let [after (storage/safe-position (get input "after")) limit (get input "limit") wait-ms (get input "waitMs" 0)
          _ (when-not (and (integer? limit) (<= 1 limit 1000) (integer? wait-ms) (<= 0 wait-ms 30000))
              (throw (ex-info "Invalid journal page bounds" {:status 400})))
          deadline (+ (System/nanoTime) (* wait-ms 1000000))
          initial (storage/await-record-time name conn
                    (storage/await-position (d/db conn) (get-in input ["basis" "recordedPosition"])
                      (get input "basisWaitMs") (fn [_] (d/db conn)) conn) input)
          _ (supported! initial name false)
          _ (when (true? (get input "replicaRows")) (replica-supported! initial name))
          current (if (and (pos? wait-ms) (<= (storage/head-position name initial) after))
                    (feed/await-db conn (fn [db] (supported! db name false)
                                         (> (storage/head-position name db) after)) deadline) initial)]
      (admission/execute admission/journals (fn []
        (let [;; [DX-B6-5] Why: an explicit basis selects a cut after freshness, rather than exposing later journals.
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
        (.append out "]")
        (when (true? (get input "replicaRows"))
          (let [rows (map #(lean/decode (:v %)) (d/datoms db :eavt e :triplex.entity/row))
                changed (vec (map :value_string (filter #(and (= "_Transaction" (:entity_type %)) (= ":_tx/changed-entity" (:attribute %))) rows)))
                changes (for [row rows :when (and (= "_Transaction" (:entity_type row)) (= ":_tx/change" (:attribute row)))] (json/read-str (:value_json row)))
                new-refs (set (for [c changes :when (and (= "assert" (get c "op")) (= "ref" (get-in c ["value" "type"])))] (get-in c ["value" "value"])))
                _ (when-not (every? string? new-refs) (reach/decline! "invalid-reference"))
                roots (vec (distinct (concat changed new-refs)))
                payload (if (empty? changed)
                          (str "{\"position\":" p ",\"t\":\"" (d/basis-t db) "\",\"reset\":false,\"entities\":[],\"closures\":[]}")
                          (let [body (reach/build-response name db {"roots" roots "basis" {"recordedPosition" p "validAt" (get input "validAt")}
                            "shallowRoots" (vec (remove new-refs changed)) "closureRoots" changed "replicaPage" true "rowPage" true "full" true})]
                            (str "{\"incremental\":true," (subs body 1))))]
            (.append out ",") (.append out payload)))
        (.append out "]"))
      (.append out "]}") (str out)))))
    (catch Exception e (declined e))))
;; [DX-B4-T3] Why: command identity and current receipt bodies do not depend on record-time monotonicity.
;; Rejected: sharing the feed's timestamp guard (causes whole-store retry scans after parallel commits).
(defn build-command [db name input]
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
(defn build-entity [db name input]
  (try
    (supported! db name false)
    (let [e (d/entid db [:triplex.entity/id (get input "txId")]) out (StringBuilder.)]
      (when (and e (value db e :triplex.entity/row-overflow)) (reach/decline! "row-overflow"))
      (.append out "{\"rows\":[")
      (doseq [[i row] (map-indexed vector (if e (d/datoms db :eavt e :triplex.entity/row) []))]
        (when (pos? i) (.append out ",")) (reach/append-string! out (:v row)))
      (.append out "]}") (str out))
    (catch Exception e (declined e))))

(defn command [db name input]
  (admission/execute admission/journals #(build-command db name input)))
(defn entity [db name input]
  (admission/execute admission/journals #(build-entity db name input)))
