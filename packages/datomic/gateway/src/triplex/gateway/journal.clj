(ns triplex.gateway.journal
  (:require [triplex.gateway.privacy :as privacy] [triplex.gateway.slim :as slim] [triplex.gateway.trace :as trace] [clojure.data.json :as json] [datomic.api :as d] [triplex.gateway.lean :as lean] [triplex.gateway.feed :as feed] [triplex.gateway.admission :as admission] [triplex.gateway.stats :as stats] [triplex.gateway.reach :as reach] [triplex.gateway.storage :as storage] [triplex.gateway.save-ledger :as ledger]
            [triplex.gateway.packed-journal :as packed]))
(set! *warn-on-reflection* false)
;; [DX-B4-T1] Why: these reads use only immutable indexes; a scope without the write-side proof declines.
;; Rejected: reconstructing journals through entity/pull/query or guessing legacy completeness.
(defn value [db e a] (:v (first (d/datoms db :eavt e a))))
(defn row-texts [db e]
  (let [stored (map :v (d/datoms db :eavt e :triplex.entity/row))
        restored (when (d/entid db :triplex.journal/packed) (packed/rows db e))]
    (map slim/row-text (if (seq restored) (sort (concat stored restored)) stored))))
(defn supported! [db name time-order?]
  (let [scope (:scope (reach/config name db))]
    (when-not (#{2 3 4} (value db scope :triplex.scope/rows-version)) (reach/decline! "rows-version"))
    (when-not (= 2 (value db scope :triplex.scope/feed-version)) (reach/decline! "feed-version"))
    (when (or (and time-order? (value db scope :triplex.scope/irregular)) (value db scope :triplex.scope/feed-irregular))
      (reach/decline! "irregular"))))
(defn declined [e]
  (if-let [reason (:declined (ex-data e))]
    (let [out (StringBuilder.)] (stats/bump! [:journalDeclines reason] 1) (.append out "{\"declined\":") (reach/append-string! out reason) (.append out "}") (str out))
    (throw e)))
(defn recorded-only! [db input]
  (let [requested (true? (get input "recordedOnly"))]
    ;; [DX-W1] Why: a recorded-only journal still uses the current verified frontier for every body.
    ;; Rejected: treating a historical recorded cut as a historical erasure sequence.
    (when (and requested (nil? privacy/*cut*) (lean/erasure-protected? db))
      (throw (ex-info "Recorded journal needs current erasure-aware values"
                      {:status 409 :code "ErasureQueryUnsupported"})))
    requested))
;; [DX-R2] Why: replacement rows must come from the journal cut, including retired entities and new reference closures.
;; Rejected: current-head rows (two journals in a page may change the same entity).
(defn replica-supported! [db name]
  (supported! db name false)
  (let [scope (:scope (reach/config name db))]
    (when-not (contains? #{3 4} (value db scope :triplex.scope/rows-version)) (reach/decline! "replica-layout"))
    (when-not (true? (value db scope :triplex.scope/position-regular)) (reach/decline! "replica-positions"))))
;; [DX-JRN1] Why: a page that asks for more journals than its cut holds, or whose range holds a long run of position entries
;; that yield no journal (the bulk loader's 28 million on the 1 billion copy), walked the position index to its end under
;; the single journal permit. A request that sends "bounded": true examines at most examineEntries position entries and
;; examineMs milliseconds (each capped by TX2_JOURNAL_EXAMINE_ENTRIES / TX2_JOURNAL_EXAMINE_MS) and returns "next", the
;; position to pass as `after`, with "stopped" naming the bound. Requests without it are answered exactly as before.
;; Rejected: bounding every request (a reader that does not follow "next" would repeat the same page forever) and a
;; server-side loop that re-takes the permit (the request itself would still have no bound).
(defn- setting [k default]
  (let [n (Long/parseLong (or (System/getenv k) (str default)))]
    (when-not (<= 1 n 1000000) (throw (IllegalArgumentException. (str k " must be 1..1000000")))) n))
(def examine-entries (setting "TX2_JOURNAL_EXAMINE_ENTRIES" 4096))
(def examine-ms (setting "TX2_JOURNAL_EXAMINE_MS" 100))
(defn examine-bounds [input]
  (when (true? (get input "bounded"))
    (let [e (get input "examineEntries" examine-entries) m (get input "examineMs" examine-ms)]
      (when-not (and (integer? e) (pos? e) (integer? m) (pos? m))
        (throw (ex-info "Invalid journal examine bounds" {:status 400})))
      {:entries (min e examine-entries) :ms (min m examine-ms)})))
(defn- counted [^longs n xs] (map (fn [x] (aset n 0 (inc (aget n 0))) x) xs))
(defn- note-examined! [route n]
  (stats/bump! [:journalExamined route :calls] 1)
  (stats/bump! [:journalExamined route :entries] n)
  (swap! stats/counts update-in [:journalExamined route :max] (fnil max 0) n))
(defn position-end
  ;; [DX-JRN1] Why: a physical commit holds the journals after the previous physical position up to its own, so the first
  ;; physical commit at or after the cut is the last one that can hold a journal at or below it (an interior cut's own).
  ;; Rejected: stopping at the cut position itself (would drop an interior cut's earlier members).
  [db cut-head]
  (let [a (d/entid db :triplex.tx/position) x (first (d/seek-datoms db :avet :triplex.tx/position cut-head))]
    (when (and x (= a (:a x))) (inc (long (:v x))))))
(defn bounded-journals [db after cut-head limit {:keys [entries ms]}]
  (let [deadline (+ (System/nanoTime) (* ms 1000000)) group? (some? (d/entid db :triplex.group/position))]
    (loop [s (seq (d/index-range db :triplex.tx/position (inc after) (position-end db cut-head))) n 0 out [] scanned after]
      (let [finish (fn [stopped next] {:journals (if (> (count out) limit) (subvec out 0 limit) out) :examined n :stopped stopped :next next})]
        (cond
          (>= (count out) limit) (finish "limit" (second (nth out (dec limit))))
          ;; Every journal at or below min(scanned, cut) was considered, so the reader may resume after it.
          (nil? s) (finish "end" (max after (min scanned cut-head) (or (second (peek out)) 0)))
          (and (pos? n) (>= n entries)) (finish "entries" scanned)
          (and (pos? n) (> (System/nanoTime) deadline)) (finish "time" scanned)
          :else (let [tx (first s)]
                  (recur (next s) (inc n)
                         (into out (sort-by second (for [[e p] (ledger/journals db (:e tx)) :when (< after p (inc cut-head))]
                                                     [e p (if (and group? (d/entid db [:triplex.group/position p])) p (:v tx))])))
                         (long (:v tx)))))))))
(defn page [conn name input]
  (try
    (let [after (storage/safe-position (get input "after")) limit (get input "limit") wait-ms (get input "waitMs" 0)
          _ (when-not (and (integer? limit) (<= 1 limit 1000) (integer? wait-ms) (<= 0 wait-ms 30000))
              (throw (ex-info "Invalid journal page bounds" {:status 400})))
          bounds (examine-bounds input)
          deadline (+ (System/nanoTime) (* wait-ms 1000000))
          initial (trace/span "storage/await-record-time" "gateway" (storage/await-record-time name conn
                    (trace/span "storage/await-position" "gateway" (storage/await-position (trace/span "d/db" "peer-call" (d/db conn)) (get-in input ["basis" "recordedPosition"])
                      (get input "basisWaitMs") (fn [_] (trace/span "d/db" "peer-call" (d/db conn))) conn)) input))
          _ (supported! initial name false)
          _ (when (true? (get input "replicaRows")) (replica-supported! initial name))
          current (if (and (pos? wait-ms) (<= (storage/head-position name initial) after))
                    (feed/await-db conn (fn [db] (supported! db name false)
                                         (> (storage/head-position name db) after)) deadline) initial)
          ;; [DX-R2] Why: a scope can become unsupported while a long poll waits, even without a new public journal.
          ;; Rejected: trusting only the eligibility proof from before the wait.
          _ (when (true? (get input "replicaRows")) (replica-supported! current name))]
      (admission/execute admission/journals (fn []
        (let [;; [DX-B6-5] Why: an explicit basis selects a cut after freshness, rather than exposing later journals.
          ;; Rejected: waiting for R and then enumerating the current head unconditionally.
          [db _ _ _ inner] (if-let [basis (get input "basis")] (reach/select-db name current basis) [current])
          cut-head (or (:position inner) (storage/head-position name db))
          examined (long-array 1)
          ;; Physical positions are monotonic; nested logical journals are sorted within each physical commit.
          journals (fn [] (mapcat (fn [tx]
                             (sort-by second
                               (for [[e p] (ledger/journals db (:e tx))
                                     :when (< after p (inc cut-head))]
                                 [e p (if (and (d/entid db :triplex.group/position) (d/entid db [:triplex.group/position p])) p (:v tx))])))
                           (counted examined (d/index-range db :triplex.tx/position (inc after) nil))))
          bounded (when bounds (bounded-journals db after cut-head limit bounds))
          selected (if bounded (:journals bounded) (take limit (journals)))
          out (StringBuilder.)]
      (.append out "{\"availableAt\":") (.append out (System/currentTimeMillis)) (.append out ",\"head\":") (.append out (str cut-head)) (.append out ",\"transactions\":[")
      (doseq [[i [e p]] (map-indexed vector selected)]
        (when (value db e :triplex.entity/row-overflow) (reach/decline! "row-overflow"))
        (when (pos? i) (.append out ","))
        (.append out "[") (reach/append-string! out (value db e :triplex.entity/id)) (.append out ",") (.append out (str p)) (.append out ",[")
        ;; Current rows are exact: supported scopes have never retired or extended a published journal.
        (doseq [[j text] (map-indexed vector (row-texts db e))]
          (when (pos? j) (.append out ",")) (reach/append-string! out (privacy/text text)))
        (.append out "]")
        (when (true? (get input "replicaRows"))
          (let [rows (map lean/decode (row-texts db e))
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
      ;; [DX-R3-P8] Why: a clock cut closes at the physical commit's final position, even across feed pages.
      ;; Rejected: treating the last journal in a response as a transaction boundary.
      (.append out "],\"clockEnds\":[")
      (doseq [[i [_ p end]] (map-indexed vector selected)]
        (when (pos? i) (.append out ","))
        (.append out (str "[" p "," end "]")))
      (.append out "]")
      (if bounded
        (do (note-examined! "transactions-bounded" (:examined bounded))
            (.append out (str ",\"examined\":" (:examined bounded) ",\"next\":" (:next bounded) ",\"stopped\":\"" (:stopped bounded) "\"")))
        (note-examined! "transactions" (aget examined 0)))
      (.append out "}") (str out)))))
    (catch Exception e (declined e))))
;; [DX-B4-T3] Why: command identity and current receipt bodies do not depend on record-time monotonicity.
;; Rejected: sharing the feed's timestamp guard (causes whole-store retry scans after parallel commits).
(defn build-command [db name input]
  (try
    (supported! db name false)
    ;; [DX-S6] TX2_ACCOUNT_CLAIMS=1 with the caller's account: the account's claim only (s6 account_claims.clj).
    (let [claim (if (= "1" (System/getenv "TX2_ACCOUNT_CLAIMS"))
                  ((requiring-resolve 'triplex.gateway.account-claims/find-claim) (:conn (meta input)) db (get input "commandId") (get input "account"))
                  (d/entid db [:triplex.claim/command-id (get input "commandId")]))
          id (when claim (ledger/claim-tx-id db claim)) out (StringBuilder.)]
      (.append out "{\"txId\":")
      (if id (reach/append-string! out id) (.append out "null"))
      (.append out "}") (str out))
    (catch Exception e (declined e))))

;; [DX-B4-T2] Why: entity identity is an indexed lookup and journal rows are immutable in supported scopes.
;; Rejected: passing receipt reads through read-rows' entity reconstruction.
(defn build-entity [current name input]
  (try
    (supported! current name false)
    (let [basis (if (recorded-only! current input)
                  (select-keys (get input "basis") ["recordedPosition"])
                  (get input "basis"))
          [db _ _ _ inner] (if basis (reach/select-db name current basis) [current])
          e (d/entid db [:triplex.entity/id (get input "txId")])
          cut (if inner (assoc basis "recordedPosition" (:position inner)) basis)
          pos (when (and inner e) (or (ledger/implicit-position db e) (value db e :triplex.journal/position)))
          texts (when (and e (not (and pos (> pos (:position inner))))) (row-texts db e))
          texts (if cut (filter #(storage/visible? (lean/decode %) cut false) texts) texts)
          out (StringBuilder.)]
      (when (and e (value db e :triplex.entity/row-overflow)) (reach/decline! "row-overflow"))
      (.append out "{\"rows\":[")
      (doseq [[i text] (map-indexed vector texts)]
        (when (pos? i) (.append out ",")) (reach/append-string! out (privacy/text text)))
      (.append out "]}") (str out))
    (catch Exception e (declined e))))

(defn classic-entity-positions [db owner cut p before]
  ;; [DX-W1] Why: classic already indexes the actual changed-entity reference.
  ;; Rejected: searching row text or inferring journal membership from unrelated application writes.
  (when-let [owner-id (d/entid db [:triplex.entity/id owner])]
    (let [attribute (d/entid db [:triplex.attr/key ":_tx/changed-entity"])]
      (for [x (d/datoms db :vaet owner-id :f.v/ref)
            :when (= attribute (value db (:e x) :f/attr))
            :let [r (storage/row db (:e x)) pos (:recorded_position r)]
            :when (and (= "_Transaction" (:entity_type r)) (<= pos p) (< pos before)
                       (storage/visible? r cut false))]
        [(:entity_id r) pos]))))

;; [DX-JRN1] Why: on the lean layout an entity's journal is found by reading each journal's changed-entity rows; walking
;; from the newest position down, with the same examine bounds as a feed page, returns the newest matches first and stops
;; on the bound with "nextBefore", the beforePosition to send next.
;; Rejected: the old oldest-first walk with a sliding window (it must read every transaction before answering).
(defn bounded-entity-positions [db owner cut p before limit {:keys [entries ms]}]
  (let [deadline (+ (System/nanoTime) (* ms 1000000))
        a (d/entid db :triplex.tx/position)
        top (min p (dec before))
        found (first (d/seek-datoms db :avet :triplex.tx/position top))
        start (if (and found (= a (:a found))) (:v found) top)
        owns? (fn [e] (some (fn [text] (let [r (lean/decode text)]
                                         (and (= "_Transaction" (:entity_type r)) (= ":_tx/changed-entity" (:attribute r))
                                              (= "ref" (:value_type r)) (= owner (:value_string r)) (storage/visible? r cut false))))
                            (row-texts db e)))]
    (loop [s (seq (take-while #(= a (:a %)) (d/rseek-datoms db :avet :triplex.tx/position start))) n 0 out [] floor nil]
      (let [finish (fn [stopped extra] (merge {:positions (if (> (count out) limit) (subvec out 0 limit) out) :examined n :stopped stopped} extra))]
        (cond
          (>= (count out) limit) (finish "limit" nil)
          (nil? s) (finish "end" nil)
          (and (pos? n) (>= n entries)) (finish "entries" {:nextBefore floor})
          (and (pos? n) (> (System/nanoTime) deadline)) (finish "time" {:nextBefore floor})
          :else (let [tx (first s) js (ledger/journals db (:e tx))]
                  (recur (next s) (inc n)
                         (into out (for [[e position] (sort-by second > js)
                                         :when (and (<= position p) (< position before) (owns? e))]
                                     [(value db e :triplex.entity/id) position]))
                         (reduce min (long (:v tx)) (map second js)))))))))
(defn entity-positions [current name input]
  ;; [DX-W1] Why: the typed history checks actual journal ownership in a pinned mixed layout.
  ;; Rejected: approximating imported journal ownership from the current business rows.
  (try
    (supported! current name false)
    (let [lean? (lean/enabled? current) recorded? (recorded-only! current input)]
      (when-not (or lean? recorded?) (reach/decline! "rows-version"))
      (admission/execute admission/journals
        (fn []
          (let [limit (get input "limit") owner (get input "entityId") before (get input "beforePosition" Long/MAX_VALUE)
                bounds (examine-bounds input)
                cut (cond-> (get input "basis") recorded? (select-keys ["recordedPosition"]))
                p (storage/safe-position (get cut "recordedPosition"))
                _ (when-not (and (integer? limit) (<= 1 limit 1001) (string? owner)) (throw (ex-info "Invalid journal history request" {})))]
            (if (and recorded? (zero? p))
              (json/write-str {:positions []})
              (let [[db _ _ _ inner] (reach/select-db name current cut)
                    p (or (:position inner) p)]
                (cond
                  (not lean?)
                  (json/write-str {:positions (vec (take limit (sort-by second > (distinct (classic-entity-positions db owner cut p before)))))})
                  bounds
                  (let [page (bounded-entity-positions db owner cut p before limit bounds)]
                    (note-examined! "entity-transactions-bounded" (:examined page))
                    (json/write-str page))
                  :else
                  (let [kept (java.util.ArrayDeque.) examined (long-array 1)]
                    (doseq [tx (counted examined (d/index-range db :triplex.tx/position 1 nil))
                            [e position] (sort-by second (ledger/journals db (:e tx)))
                            :when (and (<= position p) (< position before)
                                       (some (fn [text] (let [r (lean/decode text)]
                                                (and (= "_Transaction" (:entity_type r)) (= ":_tx/changed-entity" (:attribute r))
                                                     (= "ref" (:value_type r))
                                                     (= owner (:value_string r)) (storage/visible? r cut false)))) (row-texts db e)))]
                      (.addLast kept [(value db e :triplex.entity/id) position])
                      (when (> (.size kept) limit) (.removeFirst kept)))
                    (note-examined! "entity-transactions" (aget examined 0))
                    (json/write-str {:positions (vec (reverse (seq kept)))})))))))))
    (catch Exception e (declined e))))

(defn command [db name input]
  (admission/execute admission/journals #(build-command db name input)))
(defn entity [db name input]
  (admission/execute admission/journals #(build-entity db name input)))
