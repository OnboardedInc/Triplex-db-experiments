(ns xq4-gate
  "[DX-XQ4] Toy gates G1 to G8 for the commit-time index (TX2_CROSS_INDEX), on real SQL storage and a real transactor,
  with the server's writer switches. Phases run in separate JVMs from container.sh (a JVM restart is a gateway restart).
  Every time printed here is diagnostic (Mac lab VM); counts and differences are the result."
  (:require [clojure.data.json :as json] [clojure.java.io :as io] [clojure.set :as set] [clojure.string :as str]
            [datomic.api :as d] [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.selftest :as selftest]
            [triplex.gateway.group :as group] [triplex.gateway.lean :as lean] [triplex.gateway.write-policy :as policy])
  (:import [java.io ByteArrayInputStream] [java.nio.charset StandardCharsets] [java.sql DriverManager]
           [java.util Random] [java.util.concurrent Executors Callable]))

(def out (or (System/getenv "XQ4_OUT") "/out"))
;; The index namespaces are resolved at call time, so G8's log hash also runs on the base gateway (which lacks them).
(defn xcall [sym & args] (apply (requiring-resolve (symbol "triplex.gateway.cross-index" (name sym))) args))
(defn xcall-find [sym & args] (apply (requiring-resolve (symbol "triplex.gateway.cross-find" (name sym))) args))
(def clock 1000.0)
(defn emit! [file value] (spit (io/file out file) (str (json/write-str value) "\n")))
(defn slurp-json [file] (json/read-str (slurp (io/file out file))))
(defn append! [file value] (spit (io/file out file) (str (json/write-str value) "\n") :append true))
(defn env-long [k default] (parse-long (or (System/getenv k) (str default))))
(defn say [tag value] (println tag (json/write-str value)) (flush))

;; ---- requests through the real route handler (the same code as HTTP, without Jetty) ----
(defn route [name version action input & [method]]
  (let [{:keys [status body]} (main/route-handler
        {:request-method (or method (if (nil? input) :get :post)) :uri (str "/" version "/db/" name "/" action)
         :body (when input (ByteArrayInputStream. (.getBytes ^String (json/write-str input) StandardCharsets/UTF_8)))})]
    {:status status :body (json/read-str (if (string? body) body (String. ^bytes body StandardCharsets/UTF_8)))}))
(defn commit! [name input]
  (let [reply (route name "v1" "transact" input)]
    (when-not (= 200 (:status reply)) (throw (ex-info "XQ4 commit refused" {:reply reply :op (get input "operationId")})))
    (:body reply)))
(defn head [name conn] (storage/head-position name (d/db conn)))
(defn scope-key [label] (json/write-str ["triplex-scope-v1" "test" "xq4-cross-index" label 0]))
(defn open! [label]
  (let [name (:db (main/create-scope! nil (scope-key label) "lean" true true))]
    [name (main/connection (main/db-uri name))]))
(defn reopen [name] (let [conn (main/connection (main/db-uri name))] (main/sync-db (main/db-uri name)) conn))

;; ---- rows ----
(defn row [id e attr [kind v] tx & {:keys [from to etype]}]
  (cond-> {:id id :entity_id e :entity_type (or etype (when (.startsWith ^String e "_tx/") "_Transaction") "Subject")
           :attribute attr :value_type kind :valid_from (double (or from 0.0)) :recorded_at clock :recorded_position 1
           :schema_version 1 :tx_id tx}
    (#{"string" "ref" "integer"} kind) (assoc :value_string (str v))
    (= kind "number") (assoc :value_number (double v))
    (= kind "datetime") (assoc :value_datetime (double v))
    (= kind "boolean") (assoc :value_boolean (if v 1 0))
    (= kind "json") (assoc :value_json (str v))
    to (assoc :valid_to (double to))))
(defn token [seq] (format "01K%021d" seq))
(defn save-input
  "One save under ordered IDs (token seq): adds [[entity attr [kind v] opts]] and retires [[row-id entity attr]].
  One entity, one to three replaced values: the per-subject writer; otherwise the general writer."
  [{:keys [seq adds retires source]}]
  (let [tk (token seq) tx (str "_tx/" tk "00") op (str "xq4-op-" seq)
        id (fn [k] (str tk (format "%02X" k)))
        owners (vec (distinct (concat (map first adds) (map second retires))))
        journal (concat [(row (id 0) tx ":_tx/position" ["number" 1.0] tx) (row (id 1) tx ":_tx/instant" ["datetime" clock] tx)
                         (row (id 2) tx ":_tx/command-id" ["string" op] tx)]
                        (map-indexed (fn [k o] (row (id (+ 3 k)) tx ":_tx/changed-entity" ["string" o] tx)) owners))
        base (+ 3 (count owners))
        fresh (vec (map-indexed (fn [k [e a v opts]] (apply row (id (+ base k)) e a v tx (mapcat identity opts))) adds))
        ;; The retired rows' values are the client's copies and deliberately wrong: the index must use the stored text.
        retired (mapv (fn [[rid e a]] (assoc (row rid e a ["string" "client-copy"] "earlier") :retracted_at clock
                                             :retracted_position 1 :retract_tx_id tx)) retires)
        rows (vec (concat journal fresh))]
    {:input (selftest/row-input {"sourceK" source "span" 1 "position" 1 "scopeWide" false "entities" owners
                                 "operationId" op "rows" (mapv storage/wire-row (into rows retired))
                                 "newIds" (mapv :id rows) "claims" [{"commandId" op "txId" tx "timestamp" clock}]})
     :ids (mapv :id fresh)}))
(defn batch-input
  "A general save of many entities' new rows (seed): facts [[id entity attr [kind v] opts]]."
  [op facts]
  (let [tx (str "_tx/" op) owners (vec (distinct (map second facts)))
        j (fn [suffix attr value] (row (str op "/" suffix) tx attr value tx))
        journal (concat [(j "p" ":_tx/position" ["number" 1.0]) (j "t" ":_tx/instant" ["datetime" clock]) (j "cmd" ":_tx/command-id" ["string" op])]
                        (map-indexed (fn [k o] (j (str "o" k) ":_tx/changed-entity" ["string" o])) owners))
        rows (vec (concat journal (map (fn [[id e a v opts]] (apply row id e a v tx (mapcat identity opts))) facts)))]
    (selftest/row-input {"span" 1 "position" 1 "scopeWide" false "entities" owners "operationId" op
                         "rows" (mapv storage/wire-row rows) "newIds" (mapv :id rows)
                         "claims" [{"commandId" op "txId" tx "timestamp" clock}]})))
(defn import-input
  "The same batch through the import encoding (freshTexts: every row a fresh text, storage/expand-fresh)."
  [op facts]
  (let [input (batch-input op facts) order (get input "newIds")]
    (-> input (dissoc "rows" "newIds" "rowTexts") (assoc "rowMode" "texts" "freshTexts" (mapv #(get-in input ["rowTexts" %]) order)))))

;; ---- storage measurements ----
(defn stats-conn [] (DriverManager/getConnection (System/getenv "XQ4_STATS_JDBC")))
(defn sql-one [q] (with-open [c (stats-conn) s (.createStatement c) r (.executeQuery s q)] (.next r) (vec (for [i (range 1 (inc (.getColumnCount (.getMetaData r))))] (.getObject r (int i))))))
(defn wal [] (str (first (sql-one "select pg_current_wal_lsn()::text"))))
(defn wal-bytes [a b] (long (first (sql-one (str "select pg_wal_lsn_diff('" b "','" a "')")))))
(defn sql-reads [receipt] (or (get-in receipt ["nativeIoStats" "reads" "sql"]) 0))
(defn log-bytes
  "Bytes of the values of the transaction's datoms in Datomic's log (strings by UTF-8 length, others 8), and the count."
  [conn t]
  (let [tx (first (d/tx-range (d/log conn) t (inc t)))
        data (:data tx)]
    {:datoms (count data)
     :valueBytes (reduce + 0 (map (fn [x] (let [v (:v x)] (if (string? v) (alength (.getBytes ^String v "UTF-8")) 8))) data))
     :ixDatoms (count (filter #(= (:a %) (d/entid (d/db conn) :triplex.ix/entry)) data))
     :ixBytes (reduce + 0 (keep (fn [x] (when (= (:a x) (d/entid (d/db conn) :triplex.ix/entry)) (alength (.getBytes ^String (:v x) "UTF-8")))) data))}))

;; =====================================================================================================
;; The toy world: three accounts; accounts a and b share every local ID and value (isolation, G4).
(def accounts ["acc-a" "acc-b" "acc-c"])
(def subjects-per-account (env-long "XQ4_SUBJECTS" 6667))
(def v0 1.70e12) (def day 8.64e7)
(def deep6
  {"version" 1
   "attributes" [{"attribute" ":person/custom-background" "code" "a1" "family" "string"}
                 {"attribute" ":person/custom-start" "code" "a2" "family" "string"}
                 {"attribute" ":task/status" "code" "a3" "family" "string"}
                 {"attribute" ":task/progress" "code" "a4" "family" "integer"}
                 {"attribute" ":person/profile" "code" "a5" "family" "ref"}
                 {"attribute" ":placement/task" "code" "a6" "family" "ref"}]
   "types" [{"entityType" "Review" "list" "entries"}
            {"entityType" "Profile" "list" "entries"}
            {"entityType" "Subject" "list" "idPattern" "idPattern" "pl:{8 digits}"}]})
(def declaration-2
  (-> deep6
      (update "attributes" into [{"attribute" ":task/score" "code" "a7" "family" "number"}
                                 {"attribute" ":task/due" "code" "a8" "family" "datetime"}
                                 {"attribute" ":task/flag" "code" "a9" "family" "boolean"}
                                 {"attribute" ":odd/\u0001key\u0002" "code" "b1" "family" "string"}])))
(def long-a (apply str "L" (repeat 230 "x")))
(def long-b (str (subs long-a 0 205) "yyyyyyyyyy"))
(def backgrounds ["pending" "clear" "review" "x\u0001y" "\u0000zero" "\u0002esc" long-a long-b "pend" "pending-2"])
(def statuses ["pending" "complete" "blocked" "complete"])
(defn subj [acct n] (format "acct/%s/pl:%08d" acct n))
(defn task [acct n k] (format "acct/%s/pl:%08d:t%d" acct n k))
(defn prof [acct n] (format "acct/%s/pr:%08d" acct n))
(defn h [& xs] (Math/abs (long (hash xs))))
(defn vf-of [n] (+ v0 (* day (mod (h n 1) 300))))
(defn seed-facts [acct n]
  ;; Local IDs and values depend on n only, so acc-a and acc-b hold the same locals and values.
  (let [p (format "%s-%d" acct n) vf (vf-of n) tasks (inc (mod (h n 2) 3))]
    (concat
      [[(str "s-" p "-start") (subj acct n) ":person/custom-start" ["string" (format "2026-%02d-%02d" (inc (mod n 12)) (inc (mod (h n 3) 28)))] {:from vf}]
       [(str "s-" p "-prof") (subj acct n) ":person/profile" ["ref" (prof acct n)] {:from vf}]
       [(str "s-" p "-name") (subj acct n) ":person/name" ["string" (str "Subject " n)] {:from vf}]
       [(str "s-" p "-bg") (prof acct n) ":person/custom-background" ["string" (nth backgrounds (mod (h n 4) (count backgrounds)))] {:from vf :etype "Profile"}]]
      (when (zero? (mod n 7)) [[(str "s-" p "-json") (subj acct n) ":person/custom-start" ["json" "{\"x\":1}"] {:from vf}]])
      (mapcat (fn [k]
                [[(str "s-" p "-t" k "-status") (task acct n k) ":task/status" ["string" (nth statuses (mod (h n k 5) 4))] {:from vf :etype "Review"}]
                 [(str "s-" p "-t" k "-prog") (task acct n k) ":task/progress" ["integer" (- (mod (h n k 6) 130) 10)] {:from vf :etype "Review"}]
                 [(str "s-" p "-t" k "-link") (subj acct n) ":placement/task" ["ref" (task acct n k)] {:from vf}]])
              (range tasks)))))

;; Ledger of live declared facts the workload can replace: [entity attr] -> fact id.
(def ledger (atom {}))
(defn remember! [facts] (doseq [[id e a] facts] (swap! ledger assoc [e a] id)))

(defn positions-file [label] (str "positions-" label ".json"))
(defn mark! [label name conn tag]
  (let [p (head name conn)]
    (append! (positions-file label) {"tag" tag "position" p "t" (d/basis-t (d/db conn))})
    p))

(defn seed! [label name conn]
  (doseq [acct accounts]
    (let [facts-by (partition-all 40 (for [n (range subjects-per-account)] n))]
      (doseq [ns facts-by]
        (let [facts (mapcat #(seed-facts acct %) ns)
              op (str "seed-" acct "-" (first ns))]
          ;; One batch per account through the import encoding (freshTexts), the rest through the general writer.
          (commit! name (if (and (= acct "acc-c") (< (first ns) 400)) (import-input op facts) (batch-input op facts)))
          (remember! (map (fn [[id e a]] [id e a]) facts))))))
  (mark! label name conn "seeded"))

(def seqs (atom 1000))
(defn next-seq [] (swap! seqs inc))
(defn replace! [name conn adds-retires]
  (let [{:keys [input ids]} (save-input (assoc adds-retires :seq (or (:seq adds-retires) (next-seq)) :source (head name conn)))
        r (commit! name input)]
    (remember! (map (fn [id [e a]] [id e a]) ids (:adds adds-retires)))
    r))
(defn live-id [e a] (get @ledger [e a]))

(defn mixed! [label name conn ^Random rnd rounds]
  ;; Per-subject replacements (one to three values of one entity), general saves of several declared values,
  ;; "change from now" edits, past-valid corrections, retirements without replacement, and ref changes.
  (dotimes [r rounds]
    (let [acct (nth accounts (.nextInt rnd 3)) n (.nextInt rnd subjects-per-account)
          k 0 t (task acct n k) s (subj acct n) now (+ v0 (* day (+ 300 r)))
          kind (.nextInt rnd 7)]
      (try
        (case kind
          ;; per-subject writer: replace status (and progress) of one task
          0 (when-let [sid (live-id t ":task/status")]
              (replace! name conn {:adds [[t ":task/status" ["string" (nth statuses (.nextInt rnd 4))] {:from (vf-of n) :etype "Review"}]]
                                   :retires [[sid t ":task/status"]]}))
          1 (when-let [[sid pid] (seq (keep #(live-id t %) [":task/status" ":task/progress"]))]
              (when (and sid pid)
                (replace! name conn {:adds [[t ":task/status" ["string" (nth statuses (.nextInt rnd 4))] {:from (vf-of n) :etype "Review"}]
                                            [t ":task/progress" ["integer" (.nextInt rnd 101)] {:from (vf-of n) :etype "Review"}]]
                                     :retires [[sid t ":task/status"] [pid t ":task/progress"]]})))
          ;; general writer: several declared values across entities in one commit
          2 (let [p (prof acct n) bid (live-id p ":person/custom-background") sid (live-id t ":task/status") st (live-id s ":person/custom-start")]
              (when (and bid sid st)
                (replace! name conn {:adds [[p ":person/custom-background" ["string" (nth backgrounds (.nextInt rnd (count backgrounds)))] {:from (vf-of n) :etype "Profile"}]
                                            [t ":task/status" ["string" (nth statuses (.nextInt rnd 4))] {:from (vf-of n) :etype "Review"}]
                                            [s ":person/custom-start" ["string" (format "2027-%02d-01" (inc (.nextInt rnd 12)))] {:from (vf-of n)}]]
                                     :retires [[bid p ":person/custom-background"] [sid t ":task/status"] [st s ":person/custom-start"]]})))
          ;; change from now: the old value closed at `now`, the new value open from `now` (general writer)
          3 (when-let [sid (live-id t ":task/status")]
              (let [old-row (lean/decode (:v (lean/by-id (d/db conn) sid)))]
                (replace! name conn {:adds [[t ":task/status" ["string" (:value_string old-row)] {:from (:valid_from old-row) :to now :etype "Review"}]
                                            [t ":task/status" ["string" (nth statuses (.nextInt rnd 4))] {:from now :etype "Review"}]]
                                     :retires [[sid t ":task/status"]]})))
          ;; past-valid correction: a value valid in a closed past interval, beside the current one
          4 (replace! name conn {:adds [[t ":task/progress" ["integer" (- 500 (.nextInt rnd 1000))] {:from (- v0 (* day 30)) :to (- v0 (* day 10)) :etype "Review"}]]
                                 :retires []})
          ;; retirement without replacement (physical on the general writer)
          5 (when-let [lid (live-id s ":placement/task")]
              (replace! name conn {:adds [] :retires [[lid s ":placement/task"]]})
              (swap! ledger dissoc [s ":placement/task"]))
          ;; a reference changed (general writer: refs never take the per-subject writer)
          6 (when-let [pid (live-id s ":person/profile")]
              (replace! name conn {:adds [[s ":person/profile" ["ref" (prof (nth accounts (.nextInt rnd 3)) (.nextInt rnd subjects-per-account))] {:from (vf-of n)}]]
                                   :retires [[pid s ":person/profile"]]})))
        (catch clojure.lang.ExceptionInfo e
          ;; A replaced fact the ledger still lists after a lost race is skipped, not hidden: count it.
          (swap! ledger assoc :refused (inc (get @ledger :refused 0)))
          (say "XQ4_REFUSED" {:kind kind :error (get-in (ex-data e) [:reply :body "code"])})))))
  (mark! label name conn (str "mixed-" rounds)))

(defn save-ledger! [label] (emit! (str "ledger-" label ".json") {"facts" (mapv (fn [[[e a] id]] [e a id]) (dissoc @ledger :refused)) "seq" @seqs}))
(defn load-ledger! [label]
  (let [m (slurp-json (str "ledger-" label ".json"))]
    (reset! ledger (into {} (map (fn [[e a id]] [[e a] id]) (get m "facts"))))
    (reset! seqs (get m "seq"))))

;; =====================================================================================================
;; Brute force: every row of the scope at (position, validAt) through storage/read-rows, evaluated with plain values.
(defn typed [r]
  (case (:value_type r)
    "string" ["string" (:value_string r)] "ref" ["ref" (:value_string r)]
    "integer" ["integer" (biginteger (BigInteger. ^String (:value_string r)))]
    "number" ["number" (let [x (double (:value_number r))] (if (== x 0.0) 0.0 x))]
    "datetime" ["datetime" (let [x (double (:value_datetime r))] (if (== x 0.0) 0.0 x))]
    "boolean" ["boolean" (== 1 (double (:value_boolean r)))]
    [(:value_type r) nil]))
(defn world-at [name conn position valid]
  (let [db (d/db conn)
        rows (:rows (storage/read-rows name db {"basis" {"recordedPosition" position "validAt" valid}}))
        rows (map storage/decode-row rows)
        by (reduce (fn [m r] (if (= "_Transaction" (:entity_type r)) m
                               (-> m (update-in [(:entity_id r) :attrs (:attribute r)] (fnil conj #{}) (typed r))
                                     (update-in [(:entity_id r) :types] (fnil conj #{}) (:entity_type r)))))
                   {} rows)
        view (storage/at-position db position)
        ids (into (sorted-set) (comp (map :v) (filter #(.startsWith ^String % "acct/")))
                  (d/datoms view :avet :triplex.entity/id))]
    {:entities by :ids ids}))
(defn tv [v] [(get v "type") (let [x (get v "value")]
                               (case (get v "type")
                                 "integer" (biginteger (BigInteger. (str x)))
                                 ("number" "datetime") (let [y (double x)] (if (== y 0.0) 0.0 y))
                                 x))])
(defn cmp-typed [[_ a] [_ b]] (compare a b))
(defn cond-holds? [entity c]
  (let [vals (get-in entity [:attrs (get c "attribute")] #{})
        fam (fn [v] (first v))]
    (case (get c "op")
      "eq" (contains? vals (tv (get c "value")))
      "in" (boolean (some #(contains? vals (tv %)) (get c "values")))
      "range" (let [lo (or (get c "from") (get c "fromExclusive")) hi (or (get c "to") (get c "toExclusive"))
                    f (first (tv (or lo hi)))]
                (boolean (some (fn [v] (and (= f (fam v))
                                            (or (nil? lo) (let [k (cmp-typed v (tv lo))] (if (get c "fromExclusive") (pos? k) (>= k 0))))
                                            (or (nil? hi) (let [k (cmp-typed v (tv hi))] (if (get c "toExclusive") (neg? k) (<= k 0))))))
                               vals)))
      "prefix" (boolean (some (fn [[f v]] (and (= f "string") (.startsWith ^String v ^String (get c "value")))) vals))
      "exists" (seq vals)
      "missing" (empty? vals))))
(defn brute [world account q]
  (let [base (str "acct/" account "/")
        from (get q "from")
        ;; entityPage's rule: an ID is a subject at the basis only when it has a visible fact (`:entities` holds exactly those).
        candidates (cond
                     (get from "prefix") (filter #(and (.startsWith ^String % (str base (get from "prefix"))) (contains? (:entities world) %)) (:ids world))
                     (= (get from "type") "Subject") (filter #(and (re-matches #"pl:[0-9]{8}" (subs % (count base)))
                                                                   (contains? (get-in world [:entities % :types]) "Subject"))
                                                             (filter #(.startsWith ^String % base) (:ids world)))
                     (get from "type") (filter #(contains? (get-in world [:entities % :types]) (get from "type"))
                                               (filter #(.startsWith ^String % base) (:ids world)))
                     :else (filter #(and (.startsWith ^String % base) (contains? (:entities world) %)) (:ids world)))
        matched (filter (fn [id] (every? #(cond-holds? (get-in world [:entities id]) %) (get q "where"))) candidates)
        values (fn [id attr] (get-in world [:entities id :attrs attr] #{}))]
    {:ids (vec (sort matched))
     :projected (into {} (for [id matched] [id (into {} (for [a (get q "project" [])] [a (vec (sort (keep (fn [[f v]] (when (= f "ref") v)) (values id a))))]))]))
     :counts (when (= "countByValue" (get q "result"))
               (frequencies (mapcat (fn [id] (values id (get q "of"))) matched)))
     :distinct (when (= "countDistinct" (get q "result"))
                 (count (into #{} (mapcat (fn [id] (keep (fn [[f v]] (when (= f "ref") v)) (values id (get q "of")))) matched))))}))

(defn run-find
  "Every page of a question, with small pages and bounds to force cursors. Returns the concatenation."
  [name q page-limit bounds]
  (loop [cursor nil pages [] ids [] projected {} guard 0 bounds bounds raises 0]
    (let [input (cond-> (assoc q "limit" page-limit "bounds" bounds) cursor (assoc "cursor" cursor))
          r (route name "v2" "find" input)
          small? (and (= 413 (:status r)) (= "BoundTooSmall" (get-in r [:body "code"])) (< (get bounds "entries") 1000000))]
      ;; A client told its entry bound is too small for one candidate raises it (x10, to the cap) and asks the same page.
      (when-not (or (= 200 (:status r)) small?) (throw (ex-info "find refused" {:q q :reply r})))
      (if small?
        (recur cursor pages ids projected (inc guard) (update bounds "entries" #(min 1000000 (* 10 %))) (inc raises))
      (let [b (:body r) ids (into ids (get b "ids" [])) projected (merge projected (get b "projected" {}))
            pages (conj pages (select-keys b ["stopped" "examined" "segmentsLoaded" "count" "countExact" "position" "indexEpoch" "entityReads" "indexOnly"]))]
        (if (and (get b "next") (< guard 100000))
          (recur (get b "next") pages ids projected (inc guard) bounds raises)
          {:ids ids :projected projected :last b :pages (count pages) :stops (frequencies (map #(get % "stopped") pages))
           :raises raises
           :entityReads (reduce + (map #(get % "entityReads" 0) pages))
           :firstPageIndexOnly (get (first pages) "indexOnly") :firstPageEntityReads (get (first pages) "entityReads")}))))))

(def attrs-by-family
  {"string" [":person/custom-background" ":person/custom-start" ":task/status"]
   "integer" [":task/progress"] "ref" [":person/profile" ":placement/task"]})
(defn random-value [^Random rnd attr]
  (case attr
    ":person/custom-background" {"type" "string" "value" (nth backgrounds (.nextInt rnd (count backgrounds)))}
    ":person/custom-start" {"type" "string" "value" (format "2026-%02d-%02d" (inc (.nextInt rnd 12)) (inc (.nextInt rnd 28)))}
    ":task/status" {"type" "string" "value" (nth statuses (.nextInt rnd 4))}
    ":task/progress" {"type" "integer" "value" (str (- (.nextInt rnd 140) 20))}
    ":task/score" {"type" "number" "value" (- (.nextDouble rnd) 0.5)}
    ":task/due" {"type" "datetime" "value" (+ v0 (* day (.nextInt rnd 400)))}
    ":task/flag" {"type" "boolean" "value" (.nextBoolean rnd)}
    ":person/profile" {"type" "ref" "value" (prof (nth accounts (.nextInt rnd 3)) (.nextInt rnd (min 200 subjects-per-account)))}
    ":placement/task" {"type" "ref" "value" (task "acc-a" (.nextInt rnd (min 200 subjects-per-account)) 0)}))
(defn random-condition [^Random rnd extra?]
  (let [pool (cond-> [":person/custom-background" ":person/custom-start" ":task/status" ":task/progress" ":person/profile" ":placement/task"]
               extra? (into [":task/score" ":task/due" ":task/flag"]))
        attr (nth pool (.nextInt rnd (count pool)))
        family (get {":task/progress" "integer" ":person/profile" "ref" ":placement/task" "ref" ":task/score" "number"
                     ":task/due" "datetime" ":task/flag" "boolean"} attr "string")
        ops (case family ("ref" "boolean") ["eq" "in" "exists" "missing"]
                  "string" ["eq" "in" "range" "prefix" "exists" "missing"]
                  ["eq" "in" "range" "exists" "missing"])
        op (nth ops (.nextInt rnd (count ops)))]
    (case op
      "eq" {"attribute" attr "op" "eq" "value" (random-value rnd attr)}
      "in" {"attribute" attr "op" "in" "values" (vec (repeatedly (inc (.nextInt rnd 3)) #(random-value rnd attr)))}
      "range" (let [a (random-value rnd attr) b (random-value rnd attr) lo? (.nextBoolean rnd)
                    [lo hi] (sort-by #(let [v (get % "value")] (if (string? v) v (str v))) [a b])
                    [lo hi] (if (#{"integer"} family) (sort-by #(BigInteger. (str (get % "value"))) [a b])
                              (if (#{"number" "datetime"} family) (sort-by #(double (get % "value")) [a b]) [lo hi]))]
                (cond-> {"attribute" attr "op" "range"}
                  lo? (assoc (if (.nextBoolean rnd) "from" "fromExclusive") lo)
                  (or (not lo?) (.nextBoolean rnd)) (assoc (if (.nextBoolean rnd) "to" "toExclusive") hi)))
      "prefix" {"attribute" attr "op" "prefix" "value" (let [v (get (random-value rnd attr) "value")] (subs v 0 (min (count v) (inc (.nextInt rnd 4)))))}
      "exists" {"attribute" attr "op" "exists"}
      "missing" {"attribute" attr "op" "missing"})))
(defn random-question [^Random rnd extra?]
  (let [n (.nextInt rnd 5)
        from (case (.nextInt rnd 5) 0 {"type" "Review"} 1 {"type" "Subject"} 2 {"prefix" "pl:"} 3 {"type" "Profile"} nil)
        where (vec (repeatedly n #(random-condition rnd extra?)))
        where (if (and (nil? from) (every? #(= "missing" (get % "op")) where))
                (conj where {"attribute" ":task/status" "op" "exists"}) where)
        result (nth ["ids" "ids" "count" "countByValue" "countDistinct"] (.nextInt rnd 5))]
    (cond-> {"account" (nth accounts (.nextInt rnd 3)) "where" where "result" result}
      from (assoc "from" from)
      (= result "ids") (assoc "project" (vec (take (.nextInt rnd 3) [":placement/task" ":person/profile"])))
      (and (= result "ids") (.nextBoolean rnd) (or from (some #(#{"eq" "in"} (get % "op")) where)))
      (assoc "order" {"by" "entity" "direction" (if (.nextBoolean rnd) "asc" "desc")})
      ;; Sometimes order by the one range condition, either direction (with or without from).
      (and (= 1 (count (filter #(= "range" (get % "op")) where))) (zero? (.nextInt rnd 3)))
      (assoc "order" {"by" (get (first (filter #(= "range" (get % "op")) where)) "attribute")
                      "direction" (if (.nextBoolean rnd) "asc" "desc")})
      (= result "countByValue") (assoc "of" (nth [":task/status" ":task/progress" ":person/custom-background"] (.nextInt rnd 3)))
      (= result "countDistinct") (assoc "of" (nth [":placement/task" ":person/profile"] (.nextInt rnd 2))))))

(defn check-question [name world q page-limit bounds]
  (let [expected (brute world (get q "account") q)
        got (run-find name q page-limit bounds)
        b (:last got)
        order (get b "order")
        same (case (get q "result")
               "ids" (and (if (= "entity" (get order "by"))
                            (= (:ids got) (if (= "desc" (get order "direction")) (vec (reverse (:ids expected))) (:ids expected)))
                            (and (= (count (:ids got)) (count (set (:ids got)))) (= (set (:ids got)) (set (:ids expected)))))
                          (or (empty? (get q "project")) (= (:projected got) (select-keys (:projected expected) (:ids got)))))
               "count" (and (= (get b "count") (count (:ids expected))) (get b "countExact"))
               "countByValue" (and (= (get b "count") (count (:ids expected)))
                                   (= (into {} (map (fn [c] [(tv (get c "value")) (get c "count")]) (get b "counts")))
                                      (into {} (map (fn [[k v]] [(if (= "json" (first k)) ["json" nil] k) v]) (:counts expected)))))
               "countDistinct" (and (= (get b "count") (:distinct expected)) (= (get b "matched") (count (:ids expected)))))]
    {:same (boolean same) :expected (count (:ids expected)) :pages (:pages got) :stops (:stops got) :raises (:raises got)
     :entityReads (:entityReads got) :firstPageIndexOnly (:firstPageIndexOnly got) :firstPageEntityReads (:firstPageEntityReads got)
     :long (boolean (re-find #"Lxxxx" (json/write-str q)))
     :detail (when-not same {:q q :got (select-keys b ["count" "counts" "matched" "order"]) :gotIds (take 20 (:ids got))
                             :expectedIds (take 20 (:ids expected)) :expectedCounts (:counts expected) :expectedDistinct (:distinct expected)
                             :missing (take 10 (set/difference (set (:ids expected)) (set (:ids got))))
                             :extra (take 10 (set/difference (set (:ids got)) (set (:ids expected))))})}))

;; =====================================================================================================
;; Phases. `label` names a database and its files; `indexed?` says whether this run declares the index (run A) or
;; replays the same saves with the option off and builds the index afterwards (run B, gate G2).
(defn db-name [label] (get (slurp-json (str "db-" label ".json")) "db"))
(defn ok! [what r] (when-not (= 200 (:status r)) (throw (ex-info (str what " refused") {:reply r}))) (:body r))
(defn backfill! [name & [opts]] (ok! "backfill" (route name "v2" "index-backfill" (merge {"batchDatoms" 4000} opts))))

(defn phase-seed! [label indexed?]
  (let [[name conn] (open! label) half (quot subjects-per-account 2)]
    (emit! (str "db-" label ".json") {"db" name})
    (spit (io/file out (positions-file label)) "")
    ;; First half without a declaration: these rows get their entries from the backfill.
    (doseq [acct accounts ns (partition-all 40 (range half))]
      (let [facts (mapcat #(seed-facts acct %) ns) op (str "seed-" acct "-" (first ns))]
        (commit! name (if (and (= acct "acc-c") (< (first ns) 400)) (import-input op facts) (batch-input op facts)))
        (remember! facts)))
    (let [p1 (mark! label name conn "seeded-1")]
      (when indexed?
        (ok! "declaration" (route name "v2" "index-declaration" deep6))
        ;; G7: no epoch yet, so every question is refused.
        (let [r (route name "v2" "find" {"account" "acc-a" "where" [{"attribute" ":task/status" "op" "exists"}] "result" "count"})]
          (say "XQ4_G7_BEFORE_BACKFILL" {:status (:status r) :code (get-in r [:body "code"]) :fallback (get-in r [:body "fallback"])
                                         :pass (and (= "IndexNotAvailableAtPosition" (get-in r [:body "code"])) (= "sweep" (get-in r [:body "fallback"])))}))))
    ;; Second half: the writers now emit entries (behind the fence) when the index is declared.
    (doseq [acct accounts ns (partition-all 40 (range half subjects-per-account))]
      (let [facts (mapcat #(seed-facts acct %) ns) op (str "seed-" acct "-" (first ns))]
        (commit! name (batch-input op facts))
        (remember! facts)))
    (mark! label name conn "seeded")
    (when indexed?
      (let [b (backfill! name)] (say "XQ4_BACKFILL" b))
      (let [p (mark! label name conn "backfilled")
            before (route name "v2" "find" {"account" "acc-a" "basis" {"recordedPosition" (long (quot (head name conn) 3))}
                                            "where" [{"attribute" ":task/status" "op" "exists"}] "result" "count"})
            at (route name "v2" "find" {"account" "acc-a" "basis" {"recordedPosition" p} "where" [{"attribute" ":task/status" "op" "exists"}] "result" "count"})]
        (say "XQ4_G7_AFTER_BACKFILL" {:before {:status (:status before) :code (get-in before [:body "code"]) :firstAnswerable (get-in before [:body "maximum"])}
                                      :at {:status (:status at) :count (get-in at [:body "count"])}
                                      :pass (and (= "IndexNotAvailableAtPosition" (get-in before [:body "code"])) (= 200 (:status at)))})))
    (mixed! label name conn (Random. 11) (env-long "XQ4_MIXED" 3000))
    (save-ledger! label)))

(defn declare2-saves! [label name conn]
  ;; Saves writing the attributes the second declaration adds (number, datetime, boolean, an odd key).
  (let [rnd (Random. 23)]
    (doseq [acct accounts i (range 0 subjects-per-account (max 1 (quot subjects-per-account 400)))]
      (let [t (task acct i 0)]
        (replace! name conn {:adds [[t ":task/score" ["number" (if (zero? (mod i 50)) -0.0 (- (.nextDouble rnd) 0.5))] {:from (vf-of i) :etype "Review"}]
                                    [t ":task/due" ["datetime" (+ v0 (* day (.nextInt rnd 400)))] {:from (vf-of i) :etype "Review"}]
                                    [t ":task/flag" ["boolean" (.nextBoolean rnd)] {:from (vf-of i) :etype "Review"}]
                                    [t ":odd/\u0001key\u0002" ["string" (str "odd\u0000" (mod i 5))] {:from (vf-of i) :etype "Review"}]]
                             :retires []}))))
  (mark! label name conn "declare2-saves"))

(defn phase-declare2! [label indexed?]
  (load-ledger! label)
  (let [name (db-name label) conn (reopen name)]
    (when indexed?
      ;; Fence: a save prepared under declaration 1 cannot commit once declaration 2 is in force.
      (let [t (task "acc-a" 1 0)
            {:keys [input]} (save-input {:seq 9000001 :source (head name conn) :retires []
                                         :adds [[t ":task/status" ["string" "fenced"] {:from v0 :etype "Review"}]]})
            prepared (storage/tx-data (d/db conn) input)
            _ (ok! "declaration 2" (route name "v2" "index-declaration" declaration-2))
            outcome (try @(d/transact conn prepared) "committed" (catch Exception e (str e)))
            r (route name "v2" "find" {"account" "acc-a" "where" [{"attribute" ":task/flag" "op" "exists"}] "result" "count"})]
        (say "XQ4_FENCE" {:outcome (subs outcome 0 (min 160 (count outcome))) :pass (boolean (re-find #"cas" outcome))})
        (say "XQ4_G7_NEW_CODE" {:status (:status r) :code (get-in r [:body "code"]) :pass (= "IndexNotAvailableAtPosition" (get-in r [:body "code"]))})))
    (declare2-saves! label name conn)
    (when indexed?
      (say "XQ4_BACKFILL_2" (backfill! name))
      (mark! label name conn "backfilled-2"))
    (mixed! label name conn (Random. 31) (env-long "XQ4_MIXED" 3000))
    (save-ledger! label)))

(defn phase-group! [label indexed?]
  ;; TX2_GROUP_COMMIT=1 in this JVM: eight threads of general-writer saves on disjoint subjects form groups.
  (load-ledger! label)
  (let [name (db-name label) conn (reopen name)
        _ (group/install! conn (d/db conn))
        pool (Executors/newFixedThreadPool 8)
        receipts (atom [])
        work (fn [w]
               (fn []
                 (let [rnd (Random. (+ 100 w))]
                   (dotimes [r 120]
                     (let [acct (nth accounts (mod (+ w r) 3)) n (+ (* w 800) (mod (* r 7) 800)) n (mod n subjects-per-account)
                           s (subj acct n) p (prof acct n) t (task acct n 0)]
                       (try
                         (let [bid (live-id p ":person/custom-background") st (live-id s ":person/custom-start")]
                           (when (and bid st)
                             (swap! receipts conj
                               (replace! name conn {:seq (+ 5000000 (* w 1000) r)
                                                    :adds [[p ":person/custom-background" ["string" (nth backgrounds (.nextInt rnd (count backgrounds)))] {:from (vf-of n) :etype "Profile"}]
                                                           [s ":person/custom-start" ["string" (format "2028-%02d-01" (inc (.nextInt rnd 12)))] {:from (vf-of n)}]]
                                                    :retires [[bid p ":person/custom-background"] [st s ":person/custom-start"]]}))))
                         (catch Exception e (say "XQ4_GROUP_REFUSED" {:error (str (get-in (ex-data e) [:reply :body "code"]))}))))))))]
    (doseq [f (.invokeAll pool (map (fn [w] ^Callable (work w)) (range 8)))] (.get f))
    (.shutdown pool)
    (let [grouped (filter #(> (get % "groupSize" 1) 1) @receipts)]
      (emit! (str "grouped-" label ".json") (mapv #(Long/parseLong (str (get-in % ["position" "v"]))) grouped))
      (say "XQ4_GROUPS" {:saves (count @receipts) :inGroups (count grouped) :maxGroup (reduce max 1 (map #(get % "groupSize" 1) @receipts))}))
    ;; One physical transaction that asserts and retracts the same entry: both must be dropped before Datomic sees them.
    (when indexed?
      (let [t (task "acc-c" 5 0) base (d/db conn)
            first-save (save-input {:seq 9000002 :source (head name conn) :retires []
                                    :adds [[t ":task/status" ["string" "transient"] {:from v0 :etype "Review"}]]})
            fact (first (:ids first-save))
            ;; No source position: the first member's revision of the task would refuse it (the client pipelines it).
            second-save (save-input {:seq 9000003 :source nil :adds [] :retires [[fact t ":task/status"]]})
            entries [{:id (get (:input first-save) "operationId") :prepare (fn [view] (storage/tx-data view (:input first-save)))}
                     {:id (get (:input second-save) "operationId") :prepare (fn [view] (storage/tx-data view (:input second-save)))}]
            members (group/evaluate base entries)
            member-entries (map (fn [m] (count (filter #(= (:a %) (d/entid base :triplex.ix/entry)) (:tx-data (:report m))))) members)
            data (group/materialize base (vec (remove :error members)))
            report @(d/transact conn [[:triplex.group/apply-v1 (d/basis-t base) data]])
            ix (d/entid base :triplex.ix/entry)
            in-tx (count (filter #(= ix (:a %)) (:tx-data report)))
            key-live (seq (filter #(.contains ^String (:v %) fact) (d/datoms (:db-after report) :aevt ix)))]
        (say "XQ4_GROUP_CANCEL" {:memberEntryDatoms member-entries :errors (count (filter :error members))
                                 :memberError (some-> (some :error members) str (subs 0 200))
                                 :entryDatomsInPhysicalTx in-tx :entryLive (boolean key-live)
                                 :pass (and (= [1 1] member-entries) (zero? in-tx) (not key-live))})))
    (mark! label name conn "grouped")
    (save-ledger! label)))

(defn phase-more! [label]
  ;; After a transactor restart and in a new gateway JVM: more of the mixed workload.
  (load-ledger! label)
  (let [name (db-name label) conn (reopen name)]
    (mixed! label name conn (Random. 47) (env-long "XQ4_MIXED" 3000))
    (save-ledger! label)))

(defn phase-replay-index! [label]
  ;; Run B: the same saves were replayed with the option off; now declare both declarations and backfill.
  (let [name (db-name label) conn (reopen name)]
    (ok! "declaration" (route name "v2" "index-declaration" deep6))
    (ok! "declaration 2" (route name "v2" "index-declaration" declaration-2))
    (say "XQ4_REPLAY_BACKFILL" (backfill! name))))

(defn entry-set [conn]
  (let [db (d/db conn) ix (d/entid db :triplex.ix/entry)]
    (into #{} (map (fn [x] [(:triplex.entity/id (d/entity db (:e x))) (:v x)])) (d/datoms db :aevt ix))))

(defn phase-g2! [a b]
  (let [ca (reopen (db-name a)) cb (reopen (db-name b))
        dry (backfill! (db-name a) {"dryRun" true})
        ea (entry-set ca) eb (entry-set cb)
        value? (fn [[_ k]] (not (:type (xcall 'parse-key k))))
        va (into #{} (filter value?) ea) vb (into #{} (filter value?) eb)
        ta (into #{} (remove value?) ea) tb (into #{} (remove value?) eb)]
    (say "XQ4_G2" {:dryRunAdds (get dry "added") :dryRunRetracts (get dry "retracted")
                   :valueEntriesWriters (count va) :valueEntriesBackfill (count vb)
                   :onlyWriters (count (set/difference va vb)) :onlyBackfill (count (set/difference vb va))
                   :typeEntriesWriters (count ta) :typeEntriesBackfill (count tb)
                   :typeOnlyBackfill (count (set/difference tb ta)) :typeOnlyWriters (count (set/difference ta tb))
                   :sampleDifference (take 3 (concat (set/difference va vb) (set/difference vb va)))
                   :pass (and (zero? (get dry "added")) (zero? (get dry "retracted")) (= va vb) (set/subset? tb ta))})))

(defn record-time-of [conn p]
  (let [db (d/db conn) tx (:e (first (d/index-range db :triplex.tx/position p nil)))]
    (when (and tx (= p (:v (first (d/datoms db :eavt tx :triplex.tx/position)))))
      (:v (first (d/datoms db :eavt tx :triplex.tx/max-recorded-at))))))
(defn valid-times []
  [1.79e12 (+ v0 (* day 150)) 1.5e12 2.0e12 (vf-of 3) (vf-of 10) (+ v0 (* day 300)) (+ v0 (* day 301)) (- v0 (* day 10))])

(defn phase-check! [label]
  (let [name (db-name label) conn (reopen name)
        marks (map json/read-str (str/split-lines (slurp (io/file out (positions-file label)))))
        by-tag (into {} (map (juxt #(get % "tag") #(get % "position")) marks))
        epoch (get by-tag "backfilled")
        positions (distinct (filter #(and % (>= % epoch)) (concat (map #(get % "position") marks) [(head name conn)])))
        seed (env-long "XQ4_QUESTION_SEED" 20261124)
        rnd (Random. seed)
        per (env-long "XQ4_QUESTIONS" 25)
        results (atom [])
        fixed (fn [p2] (let [extra? (>= p2 (get by-tag "backfilled-2" Long/MAX_VALUE))]
                         (cond-> [{"account" "acc-a" "where" [{"attribute" ":person/custom-background" "op" "eq" "value" {"type" "string" "value" "pending"}}] "result" "ids" "from" {"type" "Profile"}}
                                  {"account" "acc-b" "where" [{"attribute" ":person/custom-start" "op" "range" "from" {"type" "string" "value" "2026-03-01"} "toExclusive" {"type" "string" "value" "2026-03-03"}}] "result" "count"}
                                  {"account" "acc-c" "from" {"type" "Subject"} "result" "count"}
                                  {"account" "acc-a" "where" [{"attribute" ":task/status" "op" "eq" "value" {"type" "string" "value" "complete"}}
                                                              {"attribute" ":task/progress" "op" "range" "from" {"type" "integer" "value" "10"}}] "result" "ids"}
                                  {"account" "acc-b" "where" [{"attribute" ":task/status" "op" "exists"}] "result" "countByValue" "of" ":task/status"}
                                  {"account" "acc-a" "where" [{"attribute" ":person/custom-background" "op" "eq" "value" {"type" "string" "value" long-a}}] "result" "ids"}
                                  {"account" "acc-a" "where" [{"attribute" ":person/custom-background" "op" "prefix" "value" (subs long-a 0 210)}] "result" "ids"}
                                  {"account" "acc-a" "where" [{"attribute" ":person/custom-background" "op" "range" "from" {"type" "string" "value" (subs long-b 0 206)}}] "result" "count"}
                                  {"account" "acc-c" "from" {"prefix" "pl:"} "where" [{"attribute" ":placement/task" "op" "missing"}] "result" "ids" "project" [":person/profile"]}
                                  {"account" "acc-a" "where" [{"attribute" ":person/custom-background" "op" "in" "values" [{"type" "string" "value" "x\u0001y"} {"type" "string" "value" "\u0000zero"} {"type" "string" "value" "\u0002esc"}]}] "result" "ids" "from" {"type" "Profile"}}]
                           extra? (into [{"account" "acc-a" "where" [{"attribute" ":task/score" "op" "range" "from" {"type" "number" "value" -0.0} "to" {"type" "number" "value" 0.2}}] "result" "ids"}
                                         {"account" "acc-b" "where" [{"attribute" ":task/flag" "op" "eq" "value" {"type" "boolean" "value" true}}] "result" "count"}
                                         {"account" "acc-c" "where" [{"attribute" ":task/due" "op" "range" "toExclusive" {"type" "datetime" "value" (+ v0 (* day 100))}}] "result" "count"}
                                         {"account" "acc-a" "where" [{"attribute" ":odd/\u0001key\u0002" "op" "prefix" "value" "odd\u0000"}] "result" "countByValue" "of" ":odd/\u0001key\u0002"}]))))]
    (doseq [p positions v (valid-times)]
      (let [world (world-at name conn p v)
            extra? (>= p (get by-tag "backfilled-2" Long/MAX_VALUE))
            qs (concat (fixed p) (repeatedly per #(random-question rnd extra?)))]
        (doseq [q (concat qs
                          ;; The same fixed questions on the record-time axis: the record time of position p's commit.
                          (when-let [r (record-time-of conn p)]
                            (map #(assoc % "recordedAt" r) (fixed p))))]
          (let [q (if-let [r (get q "recordedAt")]
                    (assoc (dissoc q "recordedAt") "basis" {"recordedAt" r "validAt" v})
                    (assoc q "basis" {"recordedPosition" p "validAt" v}))
                page (nth [7 50 1000] (.nextInt rnd 3))
                bounds {"entries" (nth [300 5000 100000] (.nextInt rnd 3)) "ms" 1000 "segments" 4096}
                r (try (check-question name world q page bounds)
                       (catch Exception e {:same false :detail {:q q :error (str e) :data (ex-data e)}}))]
            (swap! results conj (assoc r :position p :validAt v))
            (when-not (:same r) (say "XQ4_G1_DIFF" (:detail r)))))))
    (let [rs @results]
      (emit! (str "g1-" label ".json") {:questions (count rs) :differences (count (remove :same rs)) :seed seed
                                        :positions positions :validTimes (valid-times)
                                        :stops (apply merge-with + (map :stops rs)) :pages (reduce + (map :pages rs))})
      (say "XQ4_G1" {:questions (count rs) :differences (count (remove :same rs)) :seed seed :positions (count positions)
                     :validTimes (count (valid-times)) :pages (reduce + (map :pages rs)) :stops (apply merge-with + (map :stops rs))
                     :boundRaises (reduce + (keep :raises rs))
                     :matchesTotal (reduce + (map :expected rs))
                     :entityReadsTotal (reduce + (keep :entityReads rs))
                     :indexOnlyFirstPages (count (filter :firstPageIndexOnly rs))
                     :indexOnlyFirstPageEntityReads (reduce + (keep #(when (and (:firstPageIndexOnly %) (not (:long %))) (:firstPageEntityReads %)) rs))}))
    (say "XQ4_PLACEMENT" ((resolve 'xq4-gate/placement-check) conn))
    ;; Interior positions of group commits are refused with the enclosing boundaries.
    (let [grouped (try (slurp-json (str "grouped-" label ".json")) (catch Exception _ []))
          codes (frequencies (for [p (take 40 grouped)]
                               (get-in (route name "v2" "find" {"account" "acc-a" "basis" {"recordedPosition" p}
                                                                "where" [{"attribute" ":task/status" "op" "exists"}] "result" "count"})
                                       [:body "code"] "answered")))]
      (say "XQ4_INTERIOR" {:tried (min 40 (count grouped)) :codes codes}))))

;; ---- Two independent paths: find against the exact sweep (XQ6), on the same toy, positions and valid times. Runs only
;; on a gateway source that carries the sweep (xq4/sweep-src.sh) with XQ4_SWEEP=1; the sweep's files are not edited.
(defn run-sweep [name q]
  (loop [cursor nil ids [] pages 0]
    (let [r (route name "v2" "sweep" (cond-> (assoc q "limit" 1000 "bounds" {"subjects" 10000 "ms" 2000}) cursor (assoc "cursor" cursor)))]
      (when-not (= 200 (:status r)) (throw (ex-info "sweep refused" {:reply (:body r)})))
      (let [b (:body r) ids (into ids (get b "ids" []))]
        (if (and (get b "next") (< pages 100000))
          (recur (get b "next") ids (inc pages))
          {:ids ids :last b :pages (inc pages)})))))
(defn sweep-shaped [q]
  ;; The question as the sweep takes it: find's order, bounds and cursor removed (ID order is the sweep's).
  ;; Prefix values go as {type: "string", value}, the form both routes take.
  (when (= "sweep" (xcall-find 'sweep-fallback q))
    (-> (dissoc q "order")
        (update "where" (fn [w] (mapv #(if (and (= "prefix" (get % "op")) (string? (get % "value")))
                                          (assoc % "value" {"type" "string" "value" (get % "value")}) %)
                                      (or w [])))))))
(defn phase-sweep! [label]
  (let [name (db-name label) conn (reopen name)
        marks (map json/read-str (str/split-lines (slurp (io/file out (positions-file label)))))
        by-tag (into {} (map (juxt #(get % "tag") #(get % "position")) marks))
        epoch (get by-tag "backfilled")
        all (vec (sort (distinct (filter #(and % (>= % epoch)) (concat (map #(get % "position") marks) [(head name conn)])))))
        positions (distinct [(first all) (nth all (quot (count all) 2)) (peek all)])
        valid [1.79e12 (+ v0 (* day 150)) (- v0 (* day 10))]
        rnd (Random. (+ 7 (env-long "XQ4_QUESTION_SEED" 20261124)))
        per (env-long "XQ4_SWEEP_QUESTIONS" 8)
        fixed [{"account" "acc-a" "where" [{"attribute" ":person/custom-background" "op" "eq" "value" {"type" "string" "value" long-a}}] "result" "ids"}
               {"account" "acc-a" "where" [{"attribute" ":person/custom-background" "op" "prefix" "value" (subs long-a 0 210)}] "result" "count"}
               {"account" "acc-a" "where" [{"attribute" ":person/custom-background" "op" "in" "values" [{"type" "string" "value" "x\u0001y"} {"type" "string" "value" "\u0000zero"} {"type" "string" "value" "\u0002esc"}]}] "result" "ids"}
               {"account" "acc-b" "where" [{"attribute" ":task/status" "op" "exists"}] "result" "countByValue" "of" ":task/status"}
               {"account" "acc-c" "from" {"prefix" "pl:"} "where" [{"attribute" ":placement/task" "op" "missing"}] "result" "ids"}]
        norm-groups (fn [gs] (into {} (keep (fn [g] (when-let [v (get g "value")] [(tv v) (get g "count")]))) gs))
        results (atom [])]
    (doseq [p positions v valid
            q (concat fixed (repeatedly per #(random-question rnd false)))
            :let [sq (sweep-shaped q)] :when sq]
      (let [q (assoc q "basis" {"recordedPosition" p "validAt" v}) sq (assoc sq "basis" {"recordedPosition" p "validAt" v})
            r (try
                (let [f (run-find name q 1000 {"entries" 1000000 "ms" 1000 "segments" 4096})
                      w (run-sweep name sq)
                      fb (:last f) wb (:last w)
                      same (case (get q "result" "ids")
                             "ids" (and (= (count (:ids w)) (count (set (:ids w)))) (= (set (:ids f)) (set (:ids w))))
                             "count" (and (get fb "countExact") (get wb "countComplete") (= (get fb "count") (get wb "count")))
                             "countByValue" (and (get fb "countExact") (get wb "countComplete")
                                                 (= (into {} (map (fn [c] [(tv (get c "value")) (get c "count")]) (get fb "counts")))
                                                    (norm-groups (get wb "groups")))))]
                  {:same (boolean same) :result (get q "result" "ids") :n (or (get fb "count") (count (:ids f)))
                   :detail (when-not same {:q q :find (select-keys fb ["count" "counts"]) :findIds (take 10 (sort (:ids f)))
                                           :sweep (select-keys wb ["count" "groups"]) :sweepIds (take 10 (sort (:ids w)))
                                           :onlyFind (take 5 (remove (set (:ids w)) (:ids f))) :onlySweep (take 5 (remove (set (:ids f)) (:ids w)))})})
                (catch Exception e
                  (let [reply (:reply (ex-data e))]
                    ;; find refusing a shape (missing alone) is not a difference; anything else is.
                    (if (and (= 400 (:status reply)) (= "UnsupportedOperation" (get-in reply [:body "code"])))
                      {:same true :skipped true}
                      {:same false :detail {:q q :error (str e) :data (ex-data e)}}))))]
        (swap! results conj r)
        (when-not (:same r) (say "XQ4_SWEEP_DIFF" (:detail r)))))
    (let [rs (remove :skipped @results)]
      (say "XQ4_SWEEP_AGREE" {:compared (count rs) :differences (count (remove :same rs))
                              :skippedFindRefused (count (filter :skipped @results))
                              :byResult (frequencies (keep :result rs)) :nonEmpty (count (filter #(pos? (or (:n %) 0)) rs))
                              :positions positions :validTimes valid
                              :pass (and (seq rs) (every? :same rs))}))))

(defn phase-g4! [label]
  ;; Accounts a and b hold the same local IDs and values up to the epoch position: identical answers by local part.
  (let [name (db-name label) conn (reopen name)
        marks (map json/read-str (str/split-lines (slurp (io/file out (positions-file label)))))
        p (get (into {} (map (juxt #(get % "tag") #(get % "position")) marks)) "backfilled")
        rnd (Random. 77)
        local #(subs % (inc (.indexOf ^String % "/" 5)))
        diffs (atom 0) leaks (atom 0) n (atom 0)]
    (dotimes [_ 40]
      (let [q (assoc (random-question rnd false) "basis" {"recordedPosition" p "validAt" 1.79e12} "result" "ids")
            ;; Reference values name the asking account's own entities, so both accounts ask the same question.
            own (fn [acct] (json/read-str (str/replace (json/write-str (assoc q "account" acct) :escape-slash false) #"acct/acc-[abc]/" (str "acct/" acct "/"))))
            a (run-find name (own "acc-a") 1000 {"entries" 1000000 "ms" 1000 "segments" 4096})
            b (run-find name (own "acc-b") 1000 {"entries" 1000000 "ms" 1000 "segments" 4096})]
        (swap! n inc)
        (swap! leaks + (count (remove #(.startsWith ^String % "acct/acc-a/") (:ids a))) (count (remove #(.startsWith ^String % "acct/acc-b/") (:ids b))))
        (when-not (= (map local (:ids a)) (map local (:ids b)))
          (swap! diffs inc)
          (say "XQ4_G4_DIFF" {:q q :onlyA (take 5 (remove (set (map local (:ids b))) (map local (:ids a))))
                              :onlyB (take 5 (remove (set (map local (:ids a))) (map local (:ids b))))
                              :a (count (:ids a)) :b (count (:ids b))}))))
    (let [q {"account" "acc-a" "where" [{"attribute" ":task/status" "op" "exists"}] "result" "ids" "limit" 5}
          first-page (ok! "find" (route name "v2" "find" q))
          replay (route name "v2" "find" (assoc q "account" "acc-b" "cursor" (get first-page "next")))
          other (route name "v2" "find" (assoc q "where" [{"attribute" ":task/status" "op" "missing"}] "from" {"prefix" "pl:"} "cursor" (get first-page "next")))
          bad-account (route name "v2" "find" (assoc q "account" "acc/x"))
          no-account (route name "v2" "find" (dissoc q "account"))]
      (say "XQ4_G4" {:questions @n :answersDiffering @diffs :idsOutsideAccount @leaks
                     :cursorOtherAccount (get-in replay [:body "code"]) :cursorOtherRequest (get-in other [:body "code"])
                     :badAccount (get-in bad-account [:body "code"]) :noAccount (get-in no-account [:body "code"])
                     :pass (and (zero? @diffs) (zero? @leaks) (= "CursorMismatch" (get-in replay [:body "code"]))
                                (= "CursorMismatch" (get-in other [:body "code"])) (= "AccountRequired" (get-in no-account [:body "code"])))}))))

(defn phase-g5! [label]
  (let [name (db-name label) conn (reopen name)
        q {"account" "acc-a" "where" [{"attribute" ":task/status" "op" "exists"}] "result" "count"}
        world (world-at name conn (head name conn) 1.79e12)
        expected (count (:ids (brute world "acc-a" q)))
        paged (run-find name (assoc q "basis" {"validAt" 1.79e12}) 1000 {"entries" 1000 "ms" 1000 "segments" 4096})
        timed (run-find name (assoc q "basis" {"validAt" 1.79e12}) 1000 {"entries" 1000000 "ms" 1 "segments" 4096})
        pool (Executors/newFixedThreadPool 64)
        heavy (fn [i] (fn [] (let [t0 (System/nanoTime)
                                   r (route name "v2" "find" (assoc q "account" (nth accounts (mod i 3)) "bounds" {"entries" 1000000 "ms" 50 "segments" 4096}))]
                               {:status (:status r) :code (get-in r [:body "code"]) :micros (get-in r [:body "queryMicros"])
                                :wallMs (/ (- (System/nanoTime) t0) 1e6)})))
        reads (future (vec (for [i (range 200)]
                             (:status (route name "v1" "read" {"entityIds" [(subj "acc-b" i)] "basis" {"recordedPosition" (head name conn)}})))))
        outcomes (mapv #(.get %) (.invokeAll pool (map (fn [i] ^Callable (heavy i)) (range 64))))]
    (.shutdown pool)
    (say "XQ4_G5" {:expected expected
                   :pagedByEntries {:count (get (:last paged) "count") :pages (:pages paged) :stops (:stops paged)}
                   :pagedByTime {:count (get (:last timed) "count") :pages (:pages timed) :stops (:stops timed)}
                   :concurrent (frequencies (map (juxt :status :code) outcomes))
                   :maxQueryMicrosAnswered (reduce max 0 (keep :micros outcomes))
                   :pinnedReadsDuring (frequencies @reads)
                   :pass (and (= expected (get (:last paged) "count") (get (:last timed) "count"))
                              (every? #(#{200 503} (:status %)) outcomes)
                              (<= (reduce max 0 (keep :micros outcomes)) 60000)
                              (every? #(= 200 %) @reads))})))

(defn phase-g3! []
  ;; Removal on request: a protected attribute cannot be declared; after removal no entry, its history or the log holds
  ;; the removed value or its token; the subject's other entries stay exact.
  (let [[name conn] (open! "g3")
        subject "acct/acc-p/pl:00000001" secret "123-45-6789"
        prot (route name "v2" "protection" {"attributes" [":person/ssn"] "sealed" (= "1" (System/getenv "XQ4_G3_SEALED"))})
        bad (route name "v2" "index-declaration" {"version" 1 "attributes" [{"attribute" ":person/ssn" "code" "p1" "family" "string"}]})
        good (route name "v2" "index-declaration" {"version" 1 "attributes" [{"attribute" ":person/name" "code" "n1" "family" "string"}]
                                                     "types" [{"entityType" "Subject" "list" "entries"}]})
        _ (backfill! name)
        saved (route name "v1" "transact" (batch-input "g3-seed" [["g3-ssn" subject ":person/ssn" ["string" secret]]
                                                                   ["g3-name" subject ":person/name" ["string" "Alice"]]]))
        protect-declared (route name "v2" "protection" {"attributes" [":person/name"] "sealed" false})
        ask-protected (route name "v2" "find" {"account" "acc-p" "where" [{"attribute" ":person/ssn" "op" "eq" "value" {"type" "string" "value" secret}}]})
        erased (route name "v2" "erase" {"commandId" "g3-erase-1" "selectors" [{"entityId" subject "attribute" ":person/ssn"}]})
        db (d/db conn) ix (d/entid db :triplex.ix/entry)
        entry-texts (map :v (d/datoms (d/history db) :aevt ix))
        log-texts (for [tx (d/tx-range (d/log conn) nil nil) x (:data tx) :when (= ix (:a x))] (:v x))
        hits (count (filter #(.contains ^String % secret) (concat entry-texts log-texts)))
        tokens (count (filter #(re-find #"protected:|tok:" %) (concat entry-texts log-texts)))
        alice (route name "v2" "find" {"account" "acc-p" "where" [{"attribute" ":person/name" "op" "eq" "value" {"type" "string" "value" "Alice"}}]})]
    (let [[odd-name _] (open! "g3-odd")]
      (commit! odd-name (batch-input "odd-seed" [["odd-1" "plain/0001" ":person/name" ["string" "x"]]]))
      (let [r (route odd-name "v2" "index-declaration" {"version" 1 "attributes" [{"attribute" ":person/name" "code" "n1" "family" "string"}]})]
        (say "XQ4_B5" {:status (:status r) :code (get-in r [:body "code"]) :pass (= "AccountNotInEntityId" (get-in r [:body "code"]))})))
    ;; The coordinator's item: each refusal says whether the exact sweep (XQ6) answers the same question unchanged.
    (let [ask (fn [q] (let [r (route name "v2" "find" (merge {"account" "acc-p"} q))]
                        [(:status r) (get-in r [:body "code"]) (get-in r [:body "fallback"])]))
          cases [["undeclared attribute, count" {"where" [{"attribute" ":person/email" "op" "exists"}] "result" "count"} [409 "AttributeNotIndexed" "sweep"]]
                 ["undeclared attribute, countDistinct" {"where" [{"attribute" ":person/name" "op" "exists"}] "result" "countDistinct" "of" ":person/email"} [409 "AttributeNotIndexed" "none"]]
                 ["undeclared type" {"from" {"type" "Review"} "result" "count"} [409 "AttributeNotIndexed" "none"]]
                 ["five conditions" {"where" (vec (repeat 5 {"attribute" ":person/name" "op" "exists"})) "result" "count"} [400 "UnsupportedOperation" "sweep"]]
                 ["missing alone" {"where" [{"attribute" ":person/name" "op" "missing"}] "result" "count"} [400 "UnsupportedOperation" "sweep"]]
                 ["nine conditions" {"where" (vec (repeat 9 {"attribute" ":person/name" "op" "exists"})) "result" "count"} [400 "UnsupportedOperation" "none"]]
                 ["protected attribute" {"where" [{"attribute" ":person/ssn" "op" "exists"}] "result" "count"} [409 "ProtectedValueLookup" nil]]]
          got (mapv (fn [[label q want]] {:case label :got (ask q) :want want}) cases)]
      (say "XQ4_FALLBACK" {:cases got :pass (every? #(= (:got %) (:want %)) got)}))
    (say "XQ4_G3" {:protection (:status prot) :declareProtected [(:status bad) (get-in bad [:body "code"])]
                   :declareOther (:status good) :save (:status saved) :saveCode (get-in saved [:body "code"])
                   :protectDeclared [(:status protect-declared) (get-in protect-declared [:body "code"])]
                   :askProtected [(:status ask-protected) (get-in ask-protected [:body "code"])]
                   :erase [(:status erased) (get-in erased [:body "code"])]
                   :entryDatomsInHistory (count entry-texts) :entryDatomsInLog (count log-texts)
                   :occurrencesOfRemovedValue hits :tokenLikeEntries tokens
                   :otherEntriesAfter (get-in alice [:body "ids"])
                   :pass (and (= 409 (:status bad)) (= "ProtectedValueLookup" (get-in bad [:body "code"]))
                              (= "ProtectedValueLookup" (get-in protect-declared [:body "code"]))
                              (= "ProtectedValueLookup" (get-in ask-protected [:body "code"]))
                              (zero? hits) (zero? tokens) (= [subject] (get-in alice [:body "ids"])))})))

;; ---- G6 and the cost table: twin scopes, the same saves, one declared and one not.
(def g6-subjects (env-long "XQ4_G6_SUBJECTS" 1500))
(defn g6-facts [n]
  (let [t (format "acct/acc-g/pl:%08d:t0" n) vf (vf-of n)]
    [[(str "g-" n "-st") t ":task/status" ["string" "pending"] {:from vf :etype "Review"}]
     [(str "g-" n "-pr") t ":task/progress" ["integer" n] {:from vf :etype "Review"}]
     [(str "g-" n "-sc") t ":task/score" ["number" 0.5] {:from vf :etype "Review"}]
     [(str "g-" n "-du") t ":task/due" ["datetime" vf] {:from vf :etype "Review"}]
     [(str "g-" n "-fl") t ":task/flag" ["boolean" false] {:from vf :etype "Review"}]
     [(str "g-" n "-od") t ":odd/\u0001key\u0002" ["string" "odd"] {:from vf :etype "Review"}]
     [(str "g-" n "-no") t ":task/note" ["string" "undeclared"] {:from vf :etype "Review"}]]))
(defn big-entity [b] (format "acct/acc-g/big:%04d" b))
(defn big-facts [b] (for [i (range 100)] [(format "big-%d-%03d" b i) (big-entity b) ":task/status" ["string" (str "b" i)] {:from v0 :etype "Review"}]))
(def g6-attrs [":task/status" ":task/progress" ":task/score" ":task/due" ":task/flag" ":odd/\u0001key\u0002"])
(defn g6-value [attr n r]
  (case attr ":task/status" ["string" (str "s" r)] ":task/progress" ["integer" (+ n r)] ":task/score" ["number" (+ 0.25 r)]
    ":task/due" ["datetime" (+ v0 r)] ":task/flag" ["boolean" (odd? r)] ":odd/\u0001key\u0002" ["string" (str "o" r)]
    ":task/note" ["string" (str "n" r)]))

(defn phase-g6-seed! []
  (let [scopes (for [side ["on" "off"]] (let [[name conn] (open! (str "g6-" side))] [side name conn]))]
    (doseq [[side name conn] scopes]
      (emit! (str "db-g6-" side ".json") {"db" name})
      (when (= side "on")
        (ok! "declaration" (route name "v2" "index-declaration" declaration-2))
        (backfill! name))
      (doseq [ns (partition-all 40 (range g6-subjects))]
        (commit! name (batch-input (str "g6-" (first ns)) (mapcat g6-facts ns))))
      ;; Fifteen entities with 100 facts of one declared attribute each (very large saves, k = 20, 50, 100).
      (doseq [b (range 15)]
        (commit! name (batch-input (str "g6-big-" b) (big-facts b)))))
    (reset! ledger (into {} (concat (for [n (range g6-subjects) [id e a] (g6-facts n)] [[e a] id])
                                    (for [b (range 15) [id e a v] (big-facts b)] [[e (str a "#" (second v))] id]))))
    (save-ledger! "g6")
    (say "XQ4_G6_SEEDED" {:subjects g6-subjects})))

(defn twin-save!
  "The same save on both scopes, alternating which goes first. Returns {side receipt+log}."
  [names conns spec flip?]
  (let [s (next-seq)
        one (fn [side]
              (let [name (names side) conn (conns side)
                    {:keys [input ids]} (save-input (assoc spec :seq s :source (head name conn)))
                    r (commit! name input)]
                [side (assoc (log-bytes conn (Long/parseLong (str (get-in r ["t" "v"])))) :reads (sql-reads r)
                             :writer (if (get r "subjectSave") "subject" "general")
                             :applyMs (get-in r ["nativeIoStats" "api-ms"]) :ids ids)]))
        result (into {} (map one (if flip? ["off" "on"] ["on" "off"])))]
    (remember! (map (fn [id [e a]] [id e a]) (get-in result ["on" :ids]) (:adds spec)))
    result))

(defn replace-spec [n attrs r]
  (let [t (format "acct/acc-g/pl:%08d:t0" n)]
    {:adds (for [a attrs] [t a (g6-value a n r) {:from (vf-of n) :etype "Review"}])
     :retires (for [a attrs] [(live-id t a) t a])}))

(defn phase-g6-measure! []
  (load-ledger! "g6")
  (let [names {"on" (db-name "g6-on") "off" (db-name "g6-off")}
        conns (into {} (map (fn [[k v]] [k (reopen v)]) names))
        delta (fn [res] (- (get-in res ["on" :datoms]) (get-in res ["off" :datoms])))
        shapes (atom [])
        shape! (fn [label expected res]
                 (swap! shapes conj {:shape label :expected expected :on (get-in res ["on" :datoms]) :off (get-in res ["off" :datoms])
                                     :delta (delta res) :writer (get-in res ["on" :writer]) :writerOff (get-in res ["off" :writer])
                                     :pass (= expected (delta res))}))
        cohort (fn [start k] (range start (+ start k)))
        ;; Cost cohorts (first touch after the transactor restart, then a second save of the same subjects).
        per (env-long "XQ4_COST_PER" 100)
        sets {1 [":task/status"] 3 [":task/status" ":task/progress" ":task/score"] 6 g6-attrs}
        starts {1 0 3 per 6 (* 2 per)}
        summarize (fn [rs side]
                    (let [xs (map #(get % side) rs) n (max 1 (count xs))]
                      {:saves (count xs) :writer (frequencies (map :writer xs))
                       :datomsPerSave (double (/ (reduce + (map :datoms xs)) n))
                       :logValueBytesPerSave (double (/ (reduce + (map :valueBytes xs)) n))
                       :ixDatomsPerSave (double (/ (reduce + (map :ixDatoms xs)) n))
                       :ixBytesPerSave (double (/ (reduce + (map :ixBytes xs)) n))
                       :readsInsideApplyPerSave (double (/ (reduce + (map :reads xs)) n))
                       :applyMsMedian (let [v (vec (sort (keep :applyMs xs)))] (when (seq v) (nth v (quot (count v) 2))))}))
        cost (into {}
               (for [[k attrs] sets]
                 (let [w0 (wal)
                       first-touch (vec (for [[i n] (map-indexed vector (cohort (starts k) per))]
                                          (twin-save! names conns (replace-spec n attrs 1) (odd? i))))
                       second (vec (for [[i n] (map-indexed vector (cohort (starts k) per))]
                                     (twin-save! names conns (replace-spec n attrs 2) (odd? i))))]
                   [k {:attributes attrs
                       :firstTouch {:on (summarize first-touch "on") :off (summarize first-touch "off")}
                       :secondSave {:on (summarize second "on") :off (summarize second "off")}
                       :walBytesBothScopes (wal-bytes w0 (wal))}])))
        base (* 3 per)
        ;; Very large saves first, on a writer cold since the transactor restart: k of an entity's 100 values replaced.
        big (into {} (for [[j k] (map-indexed vector [20 50 100])]
                       [k (vec (for [b (range (* j 5) (* (inc j) 5))]
                                 (let [e (big-entity b)
                                       r (twin-save! names conns {:adds (for [i (range k)] [e ":task/status" ["string" (str "n" i)] {:from v0 :etype "Review"}])
                                                                  :retires (for [i (range k)] [(live-id e (str ":task/status#b" i)) e ":task/status"])}
                                                     (odd? b))]
                                   {:datoms [(get-in r ["on" :datoms]) (get-in r ["off" :datoms])]
                                    :reads [(get-in r ["on" :reads]) (get-in r ["off" :reads])]
                                    :applyMs [(get-in r ["on" :applyMs]) (get-in r ["off" :applyMs])]
                                    :writer (get-in r ["on" :writer])})))]))]
    ;; G6: exact datom counts per save shape (index on minus index off), against the design's formula.
    (shape! "replace 1 declared value (per-subject writer)" 2 (twin-save! names conns (replace-spec base [":task/status"] 3) false))
    (shape! "replace 3 declared values (per-subject writer)" 6 (twin-save! names conns (replace-spec (+ base 1) (sets 3) 3) false))
    (shape! "replace 6 declared values (general writer)" 12 (twin-save! names conns (replace-spec (+ base 2) g6-attrs 3) false))
    (shape! "replace 1 undeclared value (k = 0)" 0 (twin-save! names conns (replace-spec (+ base 3) [":task/note"] 3) false))
    (let [n (+ base 4) t (format "acct/acc-g/pl:%08d:t0" n) id (live-id t ":task/status") now (+ v0 (* day 400))]
      (shape! "change from now of 1 declared value" 3
              (twin-save! names conns {:adds [[t ":task/status" ["string" "pending"] {:from (vf-of n) :to now :etype "Review"}]
                                              [t ":task/status" ["string" "complete"] {:from now :etype "Review"}]]
                                       :retires [[id t ":task/status"]]} false)))
    (let [t "acct/acc-g/pl:99999999:t0"]
      (shape! "new entity with 5 declared values and a type entry" 6
              (twin-save! names conns {:adds (concat (for [a (take 5 g6-attrs)] [t a (g6-value a 1 1) {:from v0 :etype "Review"}])
                                                     [[t ":task/note" ["string" "x"] {:from v0 :etype "Review"}]])
                                       :retires []} false)))
    (let [n (+ base 5) t (format "acct/acc-g/pl:%08d:t0" n)]
      (shape! "retire 1 declared value without replacement" 1
              (twin-save! names conns {:adds [] :retires [[(live-id t ":task/progress") t ":task/progress"]]} false)))
    ;; The write budget estimator prices (count (:ops p)); entry operations ride in :ops, so it counts them.
    (let [spec (replace-spec (+ base 6) g6-attrs 4)
          ops-of (fn [side] (let [conn (conns side)
                                  {:keys [input]} (save-input (assoc spec :seq 9100000 :source (head (names side) conn)))
                                  [[_ p]] (storage/tx-data (d/db conn) input)
                                  n (count (:ops p))]
                              {:ops n :variableUs (policy/variable-us n 0)
                               :rows (+ (count (:new-ids p)) (count (filter #(and (vector? %) (= :triplex/retract (first %))) (:ops p))))}))
          on (ops-of "on") off (ops-of "off")]
      ;; Both scopes carry the fence (sequence 0 is installed with the option); the declared one adds 6 + 6 entry ops.
      (say "XQ4_BUDGET" {:on on :off off :extraOps (- (:ops on) (:ops off)) :expectedExtraOps 12
                         :extraVariableUs (- (:variableUs on) (:variableUs off)) :rowsSame (= (:rows on) (:rows off))
                         :pass (and (= 12 (- (:ops on) (:ops off))) (= (:rows on) (:rows off)))}))
    (say "XQ4_LARGE_SAVES" (into {} (for [[k rs] big]
                                     [k {:datomsOnOff (first (map :datoms rs)) :extraDatoms (distinct (map #(apply - (:datoms %)) rs))
                                         :readsInsideApplyOn (mapv #(first (:reads %)) rs) :readsInsideApplyOff (mapv #(second (:reads %)) rs)
                                         :applyMsOn (mapv #(first (:applyMs %)) rs) :applyMsOff (mapv #(second (:applyMs %)) rs)
                                         :writer (distinct (map :writer rs)) :pass (= [(* 2 k)] (distinct (map #(apply - (:datoms %)) rs)))}])))
    (emit! "g6.json" {:shapes @shapes :cost cost :large big})
    (say "XQ4_G6" {:shapes @shapes :pass (every? :pass @shapes)})
    (say "XQ4_PLACEMENT_G6" ((resolve 'xq4-gate/placement-check) (conns "on")))
    (say "XQ4_COST" cost)))

;; ---- G8: a deterministic sequential workload whose whole log is hashed (run once on the base gateway, once here).
(defn phase-loghash! []
  (let [[name conn] (open! "loghash")
        n 300]
    (doseq [acct accounts ns (partition-all 40 (range n))]
      (let [facts (mapcat #(seed-facts acct %) ns)]
        (commit! name (batch-input (str "lh-" acct "-" (first ns)) facts)) (remember! facts)))
    (with-redefs [subjects-per-account n] (mixed! "loghash" name conn (Random. 5) 600))
    (let [db (d/db conn) instant (d/entid db :db/txInstant)
          lines (for [tx (d/tx-range (d/log conn) nil nil) x (:data tx) :when (not= instant (:a x))]
                  (str (:e x) " " (:a x) " " (pr-str (:v x)) " " (:added x) " " (:tx x)))
          digest (java.security.MessageDigest/getInstance "SHA-256")]
      (doseq [l lines] (.update digest (.getBytes ^String l "UTF-8")))
      (spit (io/file out "loghash.txt") (str/join "\n" lines))
      (say "XQ4_LOGHASH" {:datoms (count lines) :head (head name conn)
                          :sha256 (apply str (map #(format "%02x" (bit-and % 0xff)) (.digest digest)))}))))

(defn placement-check
  "Every index entry sits on the entity that holds its row (value entries: the entity whose ID the key names and
  which holds the fact's row text; type entries: the entity whose ID the key names); no entity holds only entries."
  [conn]
  (let [db (d/db conn) ix (d/entid db :triplex.ix/entry) row-a (d/entid db :triplex.entity/row)
        hist (d/history db)
        bad (atom []) n (atom 0) orphans (atom #{})]
    (doseq [x (d/datoms db :aevt ix)]
      (swap! n inc)
      (let [p (xcall 'parse-key (:v x)) want (xcall 'entity-id (:token p) (:local p))
            have (:v (first (d/datoms db :eavt (:e x) :triplex.entity/id)))
            row-ok (or (:type p) (let [r (lean/by-id hist (:fact p))] (and r (= (:e x) (:e r)))))]
        (when (nil? have) (swap! orphans conj (:e x)))
        (when-not (and (= want have) row-ok)
          (swap! bad conj {:e (:e x) :want want :have have :rowOk (boolean row-ok)}))))
    (let [only-entries (count (filter #(nil? (first (d/datoms db :eavt % row-a))) (distinct (map :e (d/datoms db :aevt ix)))))
          ;; entities with entries but no rows are allowed only when all their rows were retired; count them separately
          ]
      {:entries @n :misplaced (count @bad) :orphanEntities (count @orphans) :entitiesWithoutLiveRows only-entries
       :sample (take 3 @bad) :pass (and (zero? (count @bad)) (empty? @orphans))})))


(defn phase-e1! [label]
  ;; Index-only answers: counts and filters the merge can answer read no entity (entityReads 0).
  (let [name (db-name label) conn (reopen name)
        big {"entries" 1000000 "ms" 1000 "segments" 4096}
        ask (fn [tag q] (let [r (route name "v2" "find" (assoc q "bounds" big "limit" 1000 "basis" {"validAt" 1.79e12}))
                              b (:body r)]
                          [tag {:status (:status r) :count (get b "count") :indexOnly (get b "indexOnly") :entityReads (get b "entityReads")
                                :examined (get b "examined") :stopped (get b "stopped") :queryMicros (get b "queryMicros")}]))
        rows (into {} [(ask "count eq" {"account" "acc-a" "where" [{"attribute" ":task/status" "op" "eq" "value" {"type" "string" "value" "complete"}}] "result" "count"})
                       (ask "count two eq merged" {"account" "acc-a" "where" [{"attribute" ":task/status" "op" "eq" "value" {"type" "string" "value" "complete"}}
                                                                              {"attribute" ":task/flag" "op" "eq" "value" {"type" "boolean" "value" true}}] "result" "count"})
                       (ask "ids eq and in merged" {"account" "acc-b" "where" [{"attribute" ":task/status" "op" "in" "values" [{"type" "string" "value" "pending"} {"type" "string" "value" "blocked"}]}
                                                                               {"attribute" ":task/flag" "op" "eq" "value" {"type" "boolean" "value" false}}] "result" "ids"})
                       (ask "count range (one page)" {"account" "acc-c" "where" [{"attribute" ":task/progress" "op" "range" "from" {"type" "integer" "value" "10"} "to" {"type" "integer" "value" "90"}}] "result" "count"})
                       (ask "count exists (one page)" {"account" "acc-a" "where" [{"attribute" ":task/status" "op" "exists"}] "result" "count"})
                       (ask "from prefix and shape with eq" {"account" "acc-a" "from" {"prefix" "pl:" "shape" "{8 digits}"} "where" [{"attribute" ":person/custom-start" "op" "eq" "value" {"type" "string" "value" "2026-03-03"}}] "result" "count"})
                       (ask "range descending (most recent first)" {"account" "acc-a" "where" [{"attribute" ":task/due" "op" "range" "from" {"type" "datetime" "value" 1.7e12}}] "order" {"by" ":task/due" "direction" "desc"} "result" "ids"})
                       (ask "range ordered by value inside from prefix" {"account" "acc-b" "from" {"prefix" "pl:00000"} "where" [{"attribute" ":task/progress" "op" "range" "from" {"type" "integer" "value" "50"}}] "order" {"by" ":task/progress"} "result" "count"})
                       (ask "eq with missing (entity read per candidate)" {"account" "acc-a" "where" [{"attribute" ":task/status" "op" "eq" "value" {"type" "string" "value" "complete"}} {"attribute" ":task/flag" "op" "missing"}] "result" "count"})])
        world (world-at name conn (head name conn) 1.79e12)
        expect (fn [q] (count (:ids (brute world (get q "account") q))))
        desc-q {"account" "acc-a" "where" [{"attribute" ":task/due" "op" "range" "from" {"type" "datetime" "value" 1.7e12}}] "order" {"by" ":task/due" "direction" "desc"} "result" "ids"}
        desc-pages (try (run-find name (assoc desc-q "basis" {"validAt" 1.79e12}) 7 {"entries" 300 "ms" 1000 "segments" 4096})
                         (catch Exception e (say "XQ4_E1_REFUSED" {:q desc-q :reply (:reply (ex-data e))}) {:ids [:refused]}))
        desc-ok (= (set (:ids desc-pages)) (set (:ids (brute world "acc-a" desc-q))))
        from-q {"account" "acc-b" "from" {"prefix" "pl:00000"} "where" [{"attribute" ":task/progress" "op" "range" "from" {"type" "integer" "value" "50"}}] "order" {"by" ":task/progress"} "result" "ids"}
        from-pages (try (run-find name (assoc from-q "basis" {"validAt" 1.79e12}) 7 {"entries" 300 "ms" 1000 "segments" 4096})
                         (catch Exception e (say "XQ4_E1_REFUSED" {:q from-q :reply (:reply (ex-data e))}) {:ids [:refused]}))
        from-ok (= (set (:ids from-pages)) (set (:ids (brute world "acc-b" from-q))))
        index-only (filter (fn [[k v]] (:indexOnly v)) rows)]
    (say "XQ4_E1" {:answers rows :descPagedSameAsBrute desc-ok :descPages (:pages desc-pages)
                   :rangeOrderInsidePrefixSameAsBrute from-ok :fromPages (:pages from-pages)
                   :pass (and desc-ok from-ok (every? (fn [[_ v]] (= 0 (:entityReads v))) index-only) (>= (count index-only) 6))})))

(defn phase-pinned! []
  ;; D1: a pinned read taken before a backfill keeps the current-database short-cut after it (TX2_PINNED_SHORTCUT=1).
  (let [[name conn] (open! "pinned")
        n 200]
    (doseq [ns (partition-all 40 (range n))]
      (commit! name (batch-input (str "pin-" (first ns)) (mapcat #(seed-facts "acc-a" %) ns))))
    (let [p (head name conn)
          _ (commit! name (batch-input "pin-later" [["pin-later-1" "acct/acc-a/other:1" ":person/name" ["string" "later"]]]))
          stats #(triplex.gateway.pinned/stats)
          read-all (fn [] (vec (for [i (range n)]
                                 (get-in (route name "v1" "read" {"entityIds" [(subj "acc-a" i)] "basis" {"recordedPosition" p}}) [:body "rows"]))))
          s0 (stats) before (read-all) s1 (stats)
          _ (ok! "declaration" (route name "v2" "index-declaration" deep6))
          bf (backfill! name)
          s2 (stats) after (read-all) s3 (stats)
          delta (fn [a b k] (- (get b k) (get a k)))
          ;; The original check (every datom of the subject older than the pin) on the same subjects after the backfill.
          db (d/db conn) t (d/as-of-t (storage/at-position db p))
          original (count (filter (fn [i] (let [e (d/entid db [:triplex.entity/id (subj "acc-a" i)])]
                                            (every? #(<= (:tx %) (d/t->tx t)) (d/datoms db :eavt e)))) (range n)))]
      (say "XQ4_D1" {:subjects n :backfillAdded (get bf "added")
                     :beforeCurrent (delta s0 s1 :currentAnswers) :beforeAsOf (delta s0 s1 :asOfAnswers)
                     :afterCurrent (delta s2 s3 :currentAnswers) :afterAsOf (delta s2 s3 :asOfAnswers)
                     :sameRows (= before after) :originalCheckWouldKeep original
                     :pass (and (= before after) (= n (delta s0 s1 :currentAnswers)) (= n (delta s2 s3 :currentAnswers)))}))))
