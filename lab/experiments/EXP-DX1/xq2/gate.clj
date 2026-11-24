(ns xq2-gate
  "[DX-XQ2] Spike gate for the attribute index (TX2_ATTRIBUTE_INDEX), on real SQL storage and a real transactor, with
  the server's writer switches (per-subject ordered writer for one-to-three-fact replacements, general writer for the
  rest). Phases run in separate JVMs from container.sh. Timings are diagnostic (Mac); counts are the result."
  (:require [clojure.data.json :as json] [clojure.java.io :as io] [clojure.set :as set]
            [datomic.api :as d] [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.selftest :as selftest] [triplex.gateway.attribute-index :as xq])
  (:import [java.io ByteArrayInputStream] [java.nio.charset StandardCharsets] [java.sql DriverManager]))

(def out (or (System/getenv "XQ2_OUT") "/out"))
(def clock 1000.0)
(defn emit! [file value] (spit (io/file out file) (str (json/write-str value) "\n")))
(defn slurp-json [file] (json/read-str (slurp (io/file out file))))
(defn env-long [k default] (parse-long (or (System/getenv k) (str default))))

;; ---- requests through the real route handler (the same code as HTTP, without Jetty) ----
(defn route [name version action input]
  (let [{:keys [status body]} (main/route-handler
        {:request-method (if (nil? input) :get :post) :uri (str "/" version "/db/" name "/" action)
         :body (when input (ByteArrayInputStream. (.getBytes ^String (json/write-str input) StandardCharsets/UTF_8)))})]
    {:status status :body (json/read-str (if (string? body) body (String. ^bytes body StandardCharsets/UTF_8)))}))
(defn commit! [name input]
  (let [reply (route name "v1" "transact" input)]
    (when-not (= 200 (:status reply)) (throw (ex-info "XQ2 commit refused" {:reply reply :op (get input "operationId")})))
    (:body reply)))
(defn head [name conn] (storage/head-position name (d/db conn)))
(defn scope-key [label] (json/write-str ["triplex-scope-v1" "test" "xq2-attribute-index" label 0]))
(defn open! [label]
  (let [name (:db (main/create-scope! nil (scope-key label) "lean" true true))]
    [name (main/connection (main/db-uri name))]))

;; ---- rows ----
(defn row [id e attr [kind v] tx & {:keys [from to etype]}]
  (cond-> {:id id :entity_id e :entity_type (or etype (when (.startsWith ^String e "_tx/") "_Transaction") "Subject")
           :attribute attr :value_type kind :valid_from (double (or from 0.0)) :recorded_at clock :recorded_position 1
           :schema_version 1 :tx_id tx}
    (#{"string" "ref" "integer"} kind) (assoc :value_string v)
    (= kind "number") (assoc :value_number (double v))
    (= kind "datetime") (assoc :value_datetime (double v))
    (= kind "boolean") (assoc :value_boolean (if v 1 0))
    to (assoc :valid_to (double to))))
(defn token [seq] (format "01K%021d" seq))
(defn journal-rows [id tx op owners]
  (concat [(row (id 0) tx ":_tx/position" ["number" 1.0] tx) (row (id 1) tx ":_tx/instant" ["datetime" clock] tx)
           (row (id 2) tx ":_tx/command-id" ["string" op] tx)]
          (map-indexed (fn [k o] (row (str (id 3) "-" k) tx ":_tx/changed-entity" ["string" o] tx)) owners)))
(defn save-input
  "One save: adds [[entity attr [kind v] opts]] and retires [[row-id entity attr]] under ordered IDs (token seq)."
  [{:keys [seq adds retires source]}]
  (let [tk (token seq) tx (str "_tx/" tk "00") op (str "xq2-op-" seq)
        id (fn [k] (str tk (format "%02X" k)))
        owners (vec (distinct (concat (map first adds) (map second retires))))
        journal [(row (id 0) tx ":_tx/position" ["number" 1.0] tx) (row (id 1) tx ":_tx/instant" ["datetime" clock] tx)
                 (row (id 2) tx ":_tx/changed-entity" ["string" (first owners)] tx) (row (id 3) tx ":_tx/command-id" ["string" op] tx)]
        fresh (vec (map-indexed (fn [k [e a v opts]] (apply row (id (+ 4 k)) e a v tx (mapcat identity opts))) adds))
        retired (mapv (fn [[rid e a]] (assoc (row rid e a ["string" "earlier"] "earlier") :retracted_at clock
                                             :retracted_position 1 :retract_tx_id tx)) retires)
        rows (into journal fresh)]
    {:input (selftest/row-input {"sourceK" source "span" 1 "position" 1 "scopeWide" false "entities" owners
                                 "operationId" op "rows" (mapv storage/wire-row (into rows retired))
                                 "newIds" (mapv :id rows) "claims" [{"commandId" op "txId" tx "timestamp" clock}]})
     :ids (mapv :id fresh)}))
(defn batch-input
  "A general save of many entities' new rows (seed or import): facts [[id entity attr [kind v] opts]]."
  [op facts]
  (let [tx (str "_tx/" op) owners (vec (distinct (map second facts)))
        j (fn [suffix attr value] (row (str op "/" suffix) tx attr value tx))
        journal (concat [(j "p" ":_tx/position" ["number" 1.0]) (j "t" ":_tx/instant" ["datetime" clock]) (j "cmd" ":_tx/command-id" ["string" op])]
                        (map-indexed (fn [k o] (j (str "o" k) ":_tx/changed-entity" ["string" o])) owners))
        rows (vec (concat journal (map (fn [[id e a v opts]] (apply row id e a v tx (mapcat identity opts))) facts)))]
    (selftest/row-input {"span" 1 "position" 1 "scopeWide" false "entities" owners "operationId" op
                         "rows" (mapv storage/wire-row rows) "newIds" (mapv :id rows)
                         "claims" [{"commandId" op "txId" tx "timestamp" clock}]})))

;; ---- storage measurements ----
(defn stats-conn [] (DriverManager/getConnection (System/getenv "XQ2_STATS_JDBC")))
(defn sql-one [q] (with-open [c (stats-conn) s (.createStatement c) r (.executeQuery s q)] (.next r) (vec (for [i (range 1 (inc (.getColumnCount (.getMetaData r))))] (.getObject r (int i))))))
(defn kvs [] (let [[n b] (sql-one "select count(*), coalesce(sum(octet_length(id)+coalesce(octet_length(map),0)+coalesce(octet_length(val),0)),0) from datomic_kvs")]
               {:rows (long n) :bytes (long b)}))
(defn wal [] (str (first (sql-one "select pg_current_wal_lsn()::text"))))
(defn wal-bytes [a b] (long (first (sql-one (str "select pg_wal_lsn_diff('" b "','" a "')")))))
(defn pg-reads []
  (with-open [c (stats-conn) s (.createStatement c)
              r (.executeQuery s (str "select r.rolname, sum(s.calls)::bigint from pg_stat_statements s join pg_roles r on r.oid = s.userid"
                                      " where s.query ilike 'select%' and s.query ilike '%datomic_kvs%' group by 1"))]
    (loop [m {}] (if (.next r) (recur (assoc m (.getString r 1) (.getLong r 2))) m))))
(defn pg-reset! [] (with-open [c (stats-conn) s (.createStatement c)] (.execute s "select pg_stat_statements_reset()")))
(defn sql-reads [receipt] (or (get-in receipt ["nativeIoStats" "reads" "sql"]) 0))
(defn quantiles [xs]
  (let [xs (vec (sort xs))]
    (when (seq xs) {:n (count xs) :p50 (nth xs (quot (count xs) 2)) :p90 (nth xs (quot (* 9 (count xs)) 10)) :max (peek xs)})))
(defn summarize [receipts]
  (let [reads (map sql-reads receipts)]
    {:commits (count receipts) :subjectWriter (count (filter #(get % "subjectSave") receipts))
     :datomsPerSave (when (seq receipts) (double (/ (reduce + (keep #(get % "datoms") receipts)) (count receipts))))
     :readsInsideApplyPerSave (when (seq receipts) (double (/ (reduce + reads) (count receipts))))
     :savesWithReadInsideApply (count (filter pos? reads))
     :applyMs (quantiles (keep #(get-in % ["nativeIoStats" "api-ms"]) receipts))}))
(defn measured [f]
  (let [k0 (kvs) w0 (wal) receipts (vec (f)) k1 (kvs) w1 (wal) n (max 1 (count receipts))]
    (assoc (summarize receipts) :kvsBytesPerSave (double (/ (- (:bytes k1) (:bytes k0)) n))
           :kvsRowsDelta (- (:rows k1) (:rows k0)) :walBytesPerSave (double (/ (wal-bytes w0 w1) n)))))
(defn index-now! [conn]
  (let [t (d/basis-t (d/db conn))]
    (d/request-index conn)
    (assert (not= ::timeout (deref (d/sync-index conn t) 600000 ::timeout)) "index did not finish")
    (d/gc-storage conn (java.util.Date.))))
(defn xq-datoms [db]
  (into {} (for [a xq/all-idents :when (d/entid db a)] [(str a) (count (seq (d/datoms db :aevt a)))])))

;; ================= cost arms (N indexed attributes: 0, 1, 5, 20) =================
(def fields 24)
(defn fattr [i] (str ":f" i))
(defn cost-subject [n] (format "acct/xq/subject/%05d" n))
(defn cost-cell [n i v] [(str "c-" n "-f" i "-v" v) (cost-subject n) (fattr i) ["string" (str "value-" n "-" i "-" v)]])
(def cost-subjects (env-long "XQ2_COST_SUBJECTS" 5000))
(def per-batch 40)
(defn cost-seed! [label]
  (let [[name conn] (open! label)
        t0 (System/nanoTime)]
    (doseq [ns (partition-all per-batch (range cost-subjects))]
      (commit! name (batch-input (str "seed-" (first ns)) (for [n ns i (range fields)] (cost-cell n i 0)))))
    (let [before (kvs)] (index-now! conn)
      (let [db (d/db conn) after (kvs)
            result {:label label :db name :list (vec xq/listed) :head (head name conn) :t (d/basis-t db)
                    :seedSeconds (/ (- (System/nanoTime) t0) 1e9) :kvsAfterIndexGc after :kvsBeforeIndex before
                    :xqDatoms (xq-datoms db) :rowDatoms (count (seq (d/datoms db :aevt :triplex.entity/row)))}]
        (emit! (str "cost-seed-" label ".json") result)
        (println "XQ2_COST_SEED" (json/write-str result))))))
(defn first-touch [n seq source]
  (save-input {:seq seq :source source :adds [[(cost-subject n) ":f12" ["string" (str "first-" n)]]]
               :retires [[(first (cost-cell n 12 0)) (cost-subject n) ":f12"]]}))
(defn cost-measure! [label]
  (let [seed (slurp-json (str "cost-seed-" label ".json")) name (get seed "db") conn (main/connection (main/db-uri name))
        _ (main/sync-db (main/db-uri name))
        each (env-long "XQ2_COST_EACH" 200)
        a (vec (take each (map #(mod (* 7919 %) cost-subjects) (range))))
        b (vec (take each (remove (set a) (map #(mod (* 104729 %) cost-subjects) (range cost-subjects)))))
        second-ids (atom {})
        _ (pg-reset!)
        ft (measured #(vec (for [n a] (let [{:keys [input ids]} (first-touch n (+ 1000000 n) (head name conn))]
                                         (swap! second-ids assoc n (first ids)) (commit! name input)))))
        ss (measured #(vec (for [n a] (commit! name (:input (save-input {:seq (+ 2000000 n) :source (head name conn)
                                                                        :adds [[(cost-subject n) ":f12" ["string" (str "second-" n)]]]
                                                                        :retires [[(@second-ids n) (cost-subject n) ":f12"]]}))))))
        ;; A form save: 17 fields replaced in one commit (general writer), first touch then again.
        form (fn [n seq v prior]
               (save-input {:seq seq :source (head name conn)
                            :adds (for [i (range 17)] [(cost-subject n) (fattr i) ["string" (str "form" v "-" n "-" i)]])
                            :retires (for [i (range 17)] [(prior n i) (cost-subject n) (fattr i)])}))
        form-ids (atom {})
        g1 (measured #(vec (for [n b] (let [{:keys [input ids]} (form n (+ 3000000 n) 1 (fn [n i] (first (cost-cell n i 0))))]
                                         (swap! form-ids assoc n ids) (commit! name input)))))
        g2 (measured #(vec (for [n b] (commit! name (:input (form n (+ 4000000 n) 2 (fn [n i] (nth (@form-ids n) i))))))))
        ;; An import of new subjects: 100 subjects x 24 fields in one general commit, five times.
        imp (measured #(vec (for [k (range 5)]
                              (commit! name (batch-input (str "import-" k)
                                              (for [n (range (+ 100000 (* k 100)) (+ 100000 (* (inc k) 100))) i (range fields)]
                                                (cost-cell n i 0)))))))
        result {:label label :list (vec xq/listed) :firstTouch ft :secondSave ss :formFirst g1 :formSecond g2 :import100x24 imp
                :pgReadsByRole (pg-reads) :xqDatoms (xq-datoms (d/db conn))}]
    (emit! (str "cost-measure-" label ".json") result)
    (println "XQ2_COST_MEASURE" (json/write-str result))))

;; ================= exactness gate: 20,000 subjects, two accounts =================
(def gate-subjects (env-long "XQ2_GATE_SUBJECTS" 20000))
(def day 86400000.0)
(defn scaled [k] (max 2 (long (* k (/ gate-subjects 20000.0)))))
(def year0 1767225600000.0)   ; 2026-01-01T00:00:00Z
(def statuses ["active" "pending" "onboarding" "inactive" "terminated"])
(defn gsubject [acct n] (format "acct/%s/subject/%05d" acct n))
(defn placement [acct n] (format "acct/%s/placement/%05d" acct n))
(defn status-of [n] (let [r (mod (* 2654435761 (inc n)) 100)] (cond (< r 55) "active" (< r 75) "pending" (< r 88) "onboarding" (< r 96) "inactive" :else "terminated")))
(defn date-of [n] (+ year0 (* day (mod (* 40503 (inc n)) 365))))
(defn flag-of [n] (zero? (mod (* 7 (inc n)) 97)))   ; about 1 in 97
(defn gate-facts [acct n]
  (let [e (gsubject acct n) p (str acct "-" n)]
    (concat [[(str "g-" p "-status") e ":status" ["string" (status-of n)]]
             [(str "g-" p "-start") e ":start-date" ["datetime" (date-of n)]]
             [(str "g-" p "-name") e ":name" ["string" (str "Subject " n)]]
             [(str "g-" p "-score") e ":score" ["number" (mod (* n 37) 1000)]]]
            (when (flag-of n) [[(str "g-" p "-flag") e ":flag" ["boolean" true]]])
            (when (zero? (mod n 10)) [[(str "g-" p "-ssn") e ":ssn" ["string" (format "900-%02d-%04d" (mod n 100) n)]]])
            (when (zero? (mod n 20))
              [[(str "g-" p "-pl") (placement acct n) ":status" ["string" (status-of (+ n 7))] {:etype "Placement"}]]))))

(defn gate-seed! []
  (let [[name conn] (open! (str "gate-" (System/getenv "XQ2_RUN")))
        declared (route name "v1" "protection" {"attributes" [":ssn"] "sealed" false})
        refused (route name "v1" "protection" {"attributes" [":status"] "sealed" false})
        t0 (System/nanoTime)]
    (doseq [acct ["a" "b"] ns (partition-all 100 (range (if (= acct "a") gate-subjects (quot gate-subjects 10))))]
      (commit! name (batch-input (str "seed-" acct "-" (first ns)) (mapcat #(gate-facts acct %) ns))))
    (index-now! conn)
    (let [result {:db name :head (head name conn) :declared declared :refusedIndexedProtection refused
                  :seedSeconds (/ (- (System/nanoTime) t0) 1e9) :xqDatoms (xq-datoms (d/db conn))}]
      (emit! "gate-seed.json" result)
      (println "XQ2_GATE_SEED" (json/write-str (dissoc result :declared))))))

;; The workload: the model holds each subject's current row ID per attribute (the oracle never uses it).
(defn gate-workload! []
  (let [seed (slurp-json "gate-seed.json") name (get seed "db") conn (main/connection (main/db-uri name))
        _ (main/sync-db (main/db-uri name))
        n-a gate-subjects
        cur (atom {})   ; [entity attr] -> current row id (one per attribute; corrections keep two)
        ;; seed IDs: g-<acct>-<n>-<status|start|name|score|flag|ssn>
        seed-id (fn [e a] (let [[_ acct n] (re-matches #"acct/(\w+)/subject/(\d+)" e)]
                            (str "g-" acct "-" (parse-long n) "-" ({":status" "status" ":start-date" "start" ":name" "name"
                                                                     ":score" "score" ":flag" "flag" ":ssn" "ssn"} a))))
        rid (fn [e a] (or (get @cur [e a]) (seed-id e a)))
        seqn (atom 10000000)
        receipts (atom [])
        save! (fn [adds retires]
                (let [{:keys [input ids]} (save-input {:seq (swap! seqn inc) :source (head name conn) :adds adds :retires retires})
                      r (commit! name input)]
                  (swap! receipts conj r)
                  (doseq [[[e a] id] (map vector (map (juxt first second) adds) ids)] (swap! cur assoc [e a] id))
                  ids))
        pick (fn [k salt] (mod (* (+ k salt) 7919) n-a))
        counts (atom {})
        bump! (fn [k] (swap! counts update k (fnil inc 0)))
        positions (atom {})]
    ;; 1. status changes (per-subject writer), twice on some subjects
    (doseq [k (range (scaled 1500))]
      (let [n (pick k 1) e (gsubject "a" n) v (nth statuses (mod (+ k n) 5))]
        (save! [[e ":status" ["string" v]]] [[(rid e ":status") e ":status"]]) (bump! :statusSaves)))
    (swap! positions assoc :mid (head name conn))
    ;; 2. form saves: status, start date and score together, plus a new flag (general writer)
    (doseq [k (range (scaled 600))]
      (let [n (pick k 3) e (gsubject "a" n)]
        (save! [[e ":status" ["string" (nth statuses (mod k 5))]] [e ":start-date" ["datetime" (+ year0 (* day (mod (* k 13) 365)))]]
                [e ":score" ["number" (* 1.5 k)]] [e ":flag" ["boolean" (odd? k)]]]
               (concat [[(rid e ":status") e ":status"] [(rid e ":start-date") e ":start-date"] [(rid e ":score") e ":score"]]
                       (when (get @cur [e ":flag"]) [[(rid e ":flag") e ":flag"]])
                       (when (and (nil? (get @cur [e ":flag"])) (flag-of n)) [[(seed-id e ":flag") e ":flag"]])))
        (bump! :formSaves)))
    ;; 3. corrections with a past valid time: the old value until T0, the new value from T0 (general writer)
    (doseq [k (range (scaled 400))]
      (let [n (pick k 5) e (gsubject "a" n) t0 (+ year0 (* day (+ 30 (mod k 200))))
            old (get-in (route name "v1" "read" {"entityIds" [e]}) [:body "rows"])
            cur-row (first (filter #(= ":status" (get-in % ["attribute" "v"])) old))
            old-v (get-in cur-row ["value_string" "v"]) old-from (get-in cur-row ["valid_from" "v"])
            ids (save! [[e ":status" ["string" old-v] {:from old-from :to t0}] [e ":status" ["string" (nth statuses (mod (inc k) 5))] {:from t0}]]
                       [[(get-in cur-row ["id" "v"]) e ":status"]])]
        (swap! cur assoc [e ":status"] (second ids)) (bump! :corrections)))
    ;; 4. retirements: flags retracted with nothing in their place (general writer)
    (doseq [k (range (scaled 300))]
      (let [n (pick k 7) e (gsubject "a" n)
            rows (get-in (route name "v1" "read" {"entityIds" [e]}) [:body "rows"])
            flag (first (filter #(= ":flag" (get-in % ["attribute" "v"])) rows))]
        (when flag
          (save! [] [[(get-in flag ["id" "v"]) e ":flag"]]) (swap! cur dissoc [e ":flag"]) (bump! :retirements))))
    ;; 5. account b changes (isolation), and an import of new subjects into account a
    (doseq [k (range (scaled 200))]
      (let [n (mod (* k 31) (quot gate-subjects 10)) e (gsubject "b" n)]
        (save! [[e ":status" ["string" "active"]]] [[(rid e ":status") e ":status"]]) (bump! :accountB)))
    (doseq [k (range 5)]
      (swap! receipts conj (commit! name (batch-input (str "import-" k) (mapcat #(gate-facts "a" %) (range (+ n-a (* k 200)) (+ n-a (* (inc k) 200)))))))
      (bump! :imports))
    ;; 6. removal on request of protected values (and one more status save on each removed subject)
    (let [removed (vec (for [k (range (scaled 40))] (* 10 (pick k 11))))
          _ (doseq [n removed]
              (let [e (gsubject "a" (mod n n-a))
                    r (route name "v1" "erase" {"commandId" (str "erase-" n) "selectors" [{"entityId" e "attribute" ":ssn"}]})]
                (when-not (= 200 (:status r)) (throw (ex-info "erase refused" {:r r})))
                (bump! :removals)))]
      (swap! positions assoc :removedSubjects (mapv #(gsubject "a" (mod % n-a)) removed)))
    (doseq [k (range (scaled 100))]
      (let [n (pick k 13) e (gsubject "a" n)]
        (save! [[e ":status" ["string" "pending"]]] [[(rid e ":status") e ":status"]]) (bump! :statusSavesAfterRemoval)))
    (swap! positions assoc :head (head name conn))
    (let [result {:counts @counts :positions @positions :subjectWriter (count (filter #(get % "subjectSave") @receipts))
                  :generalWriter (count (remove #(get % "subjectSave") @receipts)) :xqDatoms (xq-datoms (d/db conn))}]
      (emit! "gate-workload.json" result)
      (println "XQ2_GATE_WORKLOAD" (json/write-str (dissoc result :positions))))))

;; ---- the oracle: every subject of the account through the existing read route ----
(defn w [x] (if (map? x) (get x "v") x))
(defn plain-row [r] (into {} (map (fn [[k v]] [(keyword k) (w v)]) r)))
(defn oracle-rows [name acct basis]
  (let [entities (concat (map #(gsubject acct %) (range (+ gate-subjects 1000)))
                         (map #(placement acct %) (range 0 (+ gate-subjects 1000) 20)))]
    (vec (mapcat (fn [batch] (map plain-row (get-in (route name "v1" "read" (cond-> {"entityIds" (vec batch)} basis (assoc "basis" basis))) [:body "rows"])))
                 (partition-all 250 entities)))))
(defn row-value [r] (case (:value_type r) ("string" "ref") (:value_string r) "number" (double (:value_number r))
                      "datetime" (double (:value_datetime r)) "boolean" (== 1 (:value_boolean r)) nil))
(defn valid? [r t] (and (<= (:valid_from r) t) (or (nil? (:valid_to r)) (> (:valid_to r) t))))

;; Structural check: every entity's index datoms equal the key function applied to its current rows.
(defn structural [db rows]
  (let [expected (into #{} (keep (fn [r] (when-let [[a v] (xq/key-of (vec (map r [:recorded_position :id :entity_id :attribute :value_type :value_string :value_number
                                                                                     :value_boolean :value_datetime :value_json :recorded_at :valid_from :valid_to
                                                                                     :created_by :entity_type :schema_version :tx_id])))]
                                                   [(str a) v]))) rows)
        entities (distinct (map :entity_id rows))
        actual (into #{} (for [e entities :let [eid (d/entid db [:triplex.entity/id e])] :when eid
                               a (keys xq/families) d (d/datoms db :eavt eid a)]
                           [(str a) (:v d)]))]
    {:expected (count expected) :actual (count actual)
     :missing (count (set/difference expected actual)) :extra (count (set/difference actual expected))
     :missingSample (take 3 (set/difference expected actual)) :extraSample (take 3 (set/difference actual expected))}))

(defn xq! [name input] (let [r (route name "v1" "xq" input)] (when-not (= 200 (:status r)) (throw (ex-info "xq refused" {:r r :input input}))) (:body r)))
(defn all-pages [name input]
  (loop [cursor nil acc [] calls 0 examined 0]
    (let [b (xq! name (cond-> (assoc input "limit" 500) cursor (assoc "cursor" cursor)))
          acc (into acc (or (get b "rows") (get b "entities")))]
      (if (get b "complete") {:items acc :calls (inc calls) :examined (+ examined (get b "examined")) :position (get b "position")}
        (recur (get b "cursor") acc (inc calls) (+ examined (get b "examined")))))))

(defn check-queries [name acct basis t rows]
  (let [cur (filter #(valid? % t) rows)
        by (fn [a] (filter #(= a (:attribute %)) cur))
        base (cond-> {"account" acct "validAt" t} basis (assoc "basis" basis))
        results (atom [])
        check! (fn [label expected actual extra]
                 (swap! results conj (merge {:query label :expected (count expected) :actual (count actual) :equal (= expected actual)} extra)))]
    (doseq [s statuses]
      (let [exp (set (map :entity_id (filter #(= s (:value_string %)) (by ":status"))))
            {:keys [items calls examined]} (all-pages name (assoc base "shape" "eq" "attribute" ":status" "value" {"type" "string" "value" s}))]
        (check! (str "eq status=" s) exp (set (map #(get % "entityId") items)) {:calls calls :examined examined})
        (let [c (xq! name (assoc base "shape" "count" "attribute" ":status" "value" {"type" "string" "value" s} "maxExamined" 10000000))]
          (check! (str "count status=" s) #{(count exp)} #{(get c "entities")} {:examined (get c "examined") :rowsCounted (get c "count")}))))
    (let [lo (+ year0 (* 90 day)) hi (+ year0 (* 120 day))
          exp (set (map :entity_id (filter #(and (<= lo (:value_datetime %)) (< (:value_datetime %) hi)) (by ":start-date"))))
          {:keys [items calls examined]} (all-pages name (assoc base "shape" "range" "attribute" ":start-date"
                                                              "lower" {"type" "datetime" "value" lo} "upper" {"type" "datetime" "value" hi}))]
      (check! "range start-date 30 days" exp (set (map #(get % "entityId") items)) {:calls calls :examined examined}))
    (let [exp (set (map :entity_id (filter #(true? (row-value %)) (by ":flag"))))
          {:keys [items calls examined]} (all-pages name (assoc base "shape" "eq" "attribute" ":flag" "value" {"type" "boolean" "value" true}))]
      (check! "eq flag=true (rare)" exp (set (map #(get % "entityId") items)) {:calls calls :examined examined}))
    (let [act (set (map :entity_id (filter #(= "active" (:value_string %)) (by ":status"))))
          fl (set (map :entity_id (filter #(true? (row-value %)) (by ":flag"))))
          dt (set (map :entity_id (filter #(< (:value_datetime %) (+ year0 (* 60 day))) (by ":start-date"))))
          a1 (all-pages name (assoc base "shape" "and" "clauses" [{"attribute" ":status" "op" "eq" "value" {"type" "string" "value" "active"}}
                                                                {"attribute" ":flag" "op" "eq" "value" {"type" "boolean" "value" true}}]))
          a2 (all-pages name (assoc base "shape" "and" "clauses" [{"attribute" ":status" "op" "eq" "value" {"type" "string" "value" "active"}}
                                                                {"attribute" ":start-date" "op" "range" "upper" {"type" "datetime" "value" (+ year0 (* 60 day))}}]))]
      (check! "and status=active & flag=true (merge join)" (set/intersection act fl) (set (:items a1)) {:calls (:calls a1) :examined (:examined a1)})
      (check! "and status=active & start-date<60d (probe)" (set/intersection act dt) (set (:items a2)) {:calls (:calls a2) :examined (:examined a2)}))
    (doseq [ty ["Subject" "Placement"]]
      (when (nil? basis)
        (let [exp (set (map :entity_id (filter #(= ty (:entity_type %)) rows)))
              {:keys [items calls examined]} (all-pages name (assoc base "shape" "type" "type" ty))]
          (check! (str "type " ty) exp (set items) {:calls calls :examined examined}))))
    @results))

(defn gate-check! []
  (let [seed (slurp-json "gate-seed.json") name (get seed "db") conn (main/connection (main/db-uri name))
        _ (main/sync-db (main/db-uri name))
        wl (slurp-json "gate-workload.json") mid (get-in wl ["positions" "mid"])
        db (d/db conn)
        now (+ year0 (* 400 day)) past (+ year0 (* 20 day))
        results (atom {})]
    (doseq [[label acct basis] [["head-a" "a" nil] ["mid-a" "a" {"recordedPosition" mid}] ["head-b" "b" nil]]]
      (let [rows (oracle-rows name acct basis)
            view (storage/at-position db (get basis "recordedPosition"))
            st (structural view rows)]
        (swap! results assoc label
               {:oracleRows (count rows) :structural st
                :queries (vec (concat (map #(assoc % :validAt "now+") (check-queries name acct basis now rows))
                                      (map #(assoc % :validAt "past") (check-queries name acct basis past rows))))})))
    ;; Every index datom, current or retracted, sits on the entity its tuple names (no orphan entity holds one).
    (let [hist (d/history db) id-a (d/entid db :triplex.entity/id)
          owner (memoize (fn [e] (:v (first (d/datoms db :eavt e id-a)))))
          checked (for [a (conj (keys xq/families) :triplex.xq/type) d (d/datoms hist :aevt a)]
                    (= (owner (:e d)) (nth (:v d) (if (= a :triplex.xq/type) 2 3))))]
      (swap! results assoc :orphans {:datomsChecked (count checked) :onWrongEntity (count (remove true? checked))}))
    ;; Removal on request: nothing protected in the index, now or in its history; :ssn queries refused.
    (let [hist (d/history db)
          protected-in-index (count (for [a (keys xq/families) d (d/datoms hist :aevt a) :when (= ":ssn" (nth (:v d) 1))] d))
          ssn-values (count (for [a (keys xq/families) d (d/datoms hist :aevt a) :when (and (string? (nth (:v d) 2)) (.startsWith ^String (nth (:v d) 2) "900-"))] d))
          refused (route name "v1" "xq" {"account" "a" "shape" "eq" "attribute" ":ssn" "value" {"type" "string" "value" "900-00-0000"}})
          cross (xq! name {"account" "b" "shape" "eq" "attribute" ":status" "value" {"type" "string" "value" "active"} "limit" 10000 "maxExamined" 10000000})]
      (swap! results assoc :removal {:protectedTuplesEverInIndex protected-in-index :protectedValuesEverInIndex ssn-values
                                      :ssnQuery [(:status refused) (get-in refused [:body "code"])]}
             :isolation {:accountBRows (count (get cross "rows"))
                         :foreignRows (count (remove #(.startsWith ^String (get % "entityId") "acct/b/") (get cross "rows")))}))
    (let [r @results
          all-q (mapcat :queries (vals (select-keys r ["head-a" "mid-a" "head-b"])))
          ok (and (every? :equal all-q)
                  (every? #(and (zero? (get-in % [:structural :missing])) (zero? (get-in % [:structural :extra])))
                          (vals (select-keys r ["head-a" "mid-a" "head-b"])))
                  (zero? (get-in r [:removal :protectedTuplesEverInIndex])) (zero? (get-in r [:removal :protectedValuesEverInIndex]))
                  (= 400 (first (get-in r [:removal :ssnQuery]))) (zero? (get-in r [:isolation :foreignRows]))
                  (zero? (get-in r [:orphans :onWrongEntity])))
          summary {:pass ok :queries (count all-q) :equal (count (filter :equal all-q)) :orphans (:orphans r)
                   :removal (:removal r) :isolation (:isolation r)
                   :structural (into {} (for [k ["head-a" "mid-a" "head-b"]] [k (dissoc (get-in r [k :structural]) :missingSample :extraSample)]))}]
      (emit! (str "gate-check-" (or (System/getenv "XQ2_CHECK_LABEL") "first") ".json") (assoc r :summary summary))
      (println "XQ2_GATE_CHECK" (json/write-str summary))
      (doseq [q (remove :equal all-q)] (println "XQ2_GATE_DIFF" (json/write-str q)))
      (System/exit (if ok 0 1)))))

;; ---- query cost: each shape cold (first in this JVM, after a transactor restart) and warm (again) ----
(defn query-cost! []
  (let [seed (slurp-json "gate-seed.json") name (get seed "db") conn (main/connection (main/db-uri name))
        wl (slurp-json "gate-workload.json") mid (get-in wl ["positions" "mid"])
        now (+ year0 (* 400 day))
        shapes [["eq status=active (55%)" {"shape" "eq" "attribute" ":status" "value" {"type" "string" "value" "active"}}]
                ["eq status=terminated (4%)" {"shape" "eq" "attribute" ":status" "value" {"type" "string" "value" "terminated"}}]
                ["eq flag=true (1%)" {"shape" "eq" "attribute" ":flag" "value" {"type" "boolean" "value" true}}]
                ["range start-date 30 days" {"shape" "range" "attribute" ":start-date" "lower" {"type" "datetime" "value" (+ year0 (* 90 day))}
                                             "upper" {"type" "datetime" "value" (+ year0 (* 120 day))}}]
                ["count status=active" {"shape" "count" "attribute" ":status" "value" {"type" "string" "value" "active"}}]
                ["and active & flag (merge)" {"shape" "and" "clauses" [{"attribute" ":status" "op" "eq" "value" {"type" "string" "value" "active"}}
                                                                       {"attribute" ":flag" "op" "eq" "value" {"type" "boolean" "value" true}}]}]
                ["and active & date<60d (probe)" {"shape" "and" "clauses" [{"attribute" ":status" "op" "eq" "value" {"type" "string" "value" "active"}}
                                                                           {"attribute" ":start-date" "op" "range" "upper" {"type" "datetime" "value" (+ year0 (* 60 day))}}]}]
                ["type Subject" {"shape" "type" "type" "Subject"}]]
        run (fn [label q basis]
              (pg-reset!)
              (let [t0 (System/nanoTime)
                    b (xq! name (cond-> (merge {"account" "a" "validAt" now "limit" 10000 "maxExamined" 10000000} q) basis (assoc "basis" basis)))
                    ms (/ (- (System/nanoTime) t0) 1e6)]
                {:shape label :asOf (some? basis) :ms ms :examined (get b "examined") :complete (get b "complete")
                 :answer (or (get b "count") (count (or (get b "rows") (get b "entities")))) :peerReads (get (pg-reads) "datomic" 0)}))
        _ (main/sync-db (main/db-uri name))
        result (vec (for [[label q] shapes basis [nil {"recordedPosition" mid}] pass ["cold" "warm"]]
                      (assoc (run label q basis) :pass pass)))]
    (emit! "query-cost.json" result)
    (doseq [r result] (println "XQ2_QUERY" (json/write-str r)))))

;; ================= what goes wrong =================
;; Run with TX2_ATTRIBUTE_INDEX=":common,:unique,:g0,...,:g99".
(defn edge! []
  (let [[name conn] (open! (str "edge-" (System/getenv "XQ2_RUN")))
        n (env-long "XQ2_EDGE_SUBJECTS" 100000)
        e (fn [k] (format "acct/edge/subject/%06d" k))
        t0 (System/nanoTime)
        _ (doseq [ks (partition-all 500 (range n))]
            (commit! name (batch-input (str "seed-" (first ks))
                            (mapcat (fn [k] [[(str "x-" k "-c") (e k) ":common" ["string" (if (< k (* 0.9 n)) "yes" "no")]]
                                             [(str "x-" k "-u") (e k) ":unique" ["string" (format "unique-%06d-%s" k (apply str (repeat 20 "x")))]]]) ks))))
        seed-s (/ (- (System/nanoTime) t0) 1e9)
        _ (index-now! conn)
        db (d/db conn)
        count-common (fn [basis]
                       (pg-reset!)
                       (let [t (System/nanoTime)
                             r (xq! name (cond-> {"account" "edge" "shape" "count" "attribute" ":common" "value" {"type" "string" "value" "yes"}
                                                  "validAt" 1.0 "maxExamined" 10000000} basis (assoc "basis" basis)))]
                         {:count (get r "count") :examined (get r "examined") :ms (/ (- (System/nanoTime) t) 1e6) :peerReads (get (pg-reads) "datomic" 0)}))
        c-cold (count-common nil) c-warm (count-common nil)
        bounded (xq! name {"account" "edge" "shape" "count" "attribute" ":common" "value" {"type" "string" "value" "yes"} "validAt" 1.0 "maxExamined" 10000})
        uniq (let [t (System/nanoTime) r (xq! name {"account" "edge" "shape" "eq" "attribute" ":unique" "validAt" 1.0
                                                    "value" {"type" "string" "value" (format "unique-%06d-%s" 777 (apply str (repeat 20 "x")))}})]
               {:rows (count (get r "rows")) :examined (get r "examined") :ms (/ (- (System/nanoTime) t) 1e6)})
        uniq-range (xq! name {"account" "edge" "shape" "range" "attribute" ":unique" "validAt" 1.0 "lower" {"type" "string" "value" "unique-0"}
                              "upper" {"type" "string" "value" "unique-1"} "limit" 100 "maxExamined" 1000})
        ;; One subject with 100 indexed attributes and 100 unindexed ones; one general save replaces all of one set.
        wide (e 999999)
        _ (commit! name (batch-input "wide-seed" (concat (for [i (range 100)] [(str "w-g" i) wide (str ":g" i) ["string" (str "g0-" i)]])
                                                        (for [i (range 100)] [(str "w-h" i) wide (str ":h" i) ["string" (str "h0-" i)]]))))
        hundred (fn [prefix seq]
                  (save-input {:seq seq :source (head name conn)
                               :adds (for [i (range 100)] [wide (str prefix i) ["string" (str prefix "1-" i)]])
                               :retires (for [i (range 100)] [(str "w-" (subs prefix 1) i) wide (str prefix i)])}))
        indexed100 (measured #(vec [(commit! name (:input (hundred ":g" 50000001)))]))
        plain100 (measured #(vec [(commit! name (:input (hundred ":h" 50000002)))]))
        ;; A long value: the tuple cannot hold it; the row is marked and a range over the attribute is refused.
        long-v (apply str (repeat 300 "y"))
        _ (commit! name (:input (save-input {:seq 50000003 :source (head name conn) :adds [[(e 5) ":unique" ["string" long-v]]]
                                            :retires [[(str "x-5-u") (e 5) ":unique"]]})))
        long-range (route name "v1" "xq" {"account" "edge" "shape" "range" "attribute" ":unique" "lower" {"type" "string" "value" "a"}})
        long-eq (route name "v1" "xq" {"account" "edge" "shape" "eq" "attribute" ":unique" "value" {"type" "string" "value" "unique-000777-xxxxxxxxxxxxxxxxxxxx"} "validAt" 1.0})
        result {:subjects n :seedSeconds seed-s :xqDatoms (xq-datoms db) :kvs (kvs)
                :count90pct {:cold c-cold :warm c-warm :boundedAt10000 (select-keys bounded ["count" "complete" "examined"])}
                :highCardinality {:eq uniq :rangeBounded (select-keys uniq-range ["complete" "examined"])}
                :save100Indexed indexed100 :save100Plain plain100
                :longValue {:range [(:status long-range) (get-in long-range [:body "code"])]
                            :eqShort [(:status long-eq) (count (get-in long-eq [:body "rows"]))]}}]
    (emit! "edge.json" result)
    (println "XQ2_EDGE" (json/write-str result))))
