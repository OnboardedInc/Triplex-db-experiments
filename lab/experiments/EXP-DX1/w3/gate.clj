(ns w3-gate
  "[DX-W3] Native toy gate for general-writer hints (TX2_GENERAL_PREFETCH), on real SQL storage and a real transactor.
  Phases run in separate JVMs from container.sh: seed (both databases identically), arm off, arm on (each after a
  transactor restart, so both start cold), compare (byte-identical logs and receipts), tests (stale, wrong and
  failing hints, identity refusals). Timings are diagnostic; the counts are the result."
  (:require [clojure.data.json :as json] [clojure.java.io :as io] [clojure.test :refer [deftest is testing]]
            [datomic.api :as d] [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.general-prefetch :as general] [triplex.gateway.selftest :as selftest]
            [triplex.gateway.scope :as scope])
  (:import [java.io ByteArrayInputStream] [java.nio.charset StandardCharsets] [java.sql DriverManager]
           [java.util.concurrent Executors TimeUnit]))

(def out (or (System/getenv "W3_OUT") "/out"))
(def subjects (parse-long (or (System/getenv "W3_SUBJECTS") "1200")))
(def edits (parse-long (or (System/getenv "W3_EDITS") "120")))
(def in-flight (parse-long (or (System/getenv "W3_IN_FLIGHT") "8")))
(def fields 16)
(def clock 1000.0)

(defn emit! [file value] (spit (io/file out file) (str (json/write-str value) "\n")))
(defn slurp-json [file] (json/read-str (slurp (io/file out file))))

;; ---- requests through the real route handler (the same code as HTTP, without Jetty) ----
(defn route [name version action input]
  (let [{:keys [status body]} (main/route-handler
        {:request-method (if (nil? input) :get :post) :uri (str "/" version "/db/" name "/" action)
         :body (when input (ByteArrayInputStream. (.getBytes ^String (json/write-str input) StandardCharsets/UTF_8)))})]
    {:status status :body (json/read-str (if (string? body) body (String. ^bytes body StandardCharsets/UTF_8)))}))
(defn send! [name input] (route name "v1" "transact" input))
(defn outcome [reply] [(:status reply) (get-in reply [:body "code"])])

;; ---- the toy's saves: one subject per commit, as the product sends them ----
(defn subject [n] (format "acct/w3/subject/%05d" n))
(defn row [id e attr value tx]
  {:id id :entity_id e :entity_type (when (.startsWith ^String e "_tx/") "_Transaction") :attribute attr
   :value_type "string" :value_string value :valid_from 0.0 :recorded_at clock :recorded_position 1 :schema_version 1
   :tx_id tx})
(defn save [{:keys [op owner adds retires source]}]
  (let [tx (str "_tx/" op)
        fresh (mapv (fn [[id a v]] (row id owner a v tx)) adds)
        retired (mapv (fn [[id a v]] (assoc (row id owner a v "earlier") :retracted_at clock :retracted_position 1
                                            :retract_tx_id tx)) retires)
        j (fn [suffix attr value] (row (str op "/" suffix) tx attr value tx))
        journal [(assoc (j "p" ":_tx/position" nil) :value_type "number" :value_number 1.0)
                 (assoc (j "t" ":_tx/instant" nil) :value_type "datetime" :value_datetime clock)
                 (j "owner" ":_tx/changed-entity" owner) (j "cmd" ":_tx/command-id" op)]
        rows (into journal fresh)]
    (selftest/row-input {"sourceK" source "span" 1 "position" 1 "scopeWide" false "entities" [owner]
                         "operationId" op "rows" (mapv storage/wire-row (into rows retired))
                         "newIds" (mapv :id rows) "claims" [{"commandId" op "txId" tx "timestamp" clock}]})))
(defn cell [n i v] [(str "w3-" n "-f" i "-v" v) (str ":f" i) (str "value-" n "-" i "-" v)])
(defn seed-save [n] (save {:op (str "seed-" n) :owner (subject n) :adds (mapv #(cell n % 0) (range fields))}))
;; A production-sized general commit: 12 replaced values and 4 first writes (16 facts, 12 retirements).
(defn edit-save [n source]
  (save {:op (str "edit-" n) :owner (subject n) :source source
         :adds (into (mapv #(cell n % 1) (range 12)) (mapv #(cell n % 1) (range fields (+ fields 4))))
         :retires (mapv #(cell n % 0) (range 12))}))
;; The same subject again, warm: version 1 values replaced by version 2 (nothing cold left to name).
(defn warm-save [n source]
  (save {:op (str "warm-" n) :owner (subject n) :source source
         :adds (into (mapv #(cell n % 2) (range 12)) (mapv #(cell n % 2) (range fields (+ fields 4))))
         :retires (into (mapv #(cell n % 1) (range 12)) (mapv #(cell n % 1) (range fields (+ fields 4))))}))
;; A one-fact replacement, which the per-subject writer takes (hints do not apply to it).
(defn small-save [n source]
  (save {:op (str "small-" n) :owner (subject n) :source source :adds [(cell n 12 1)] :retires [(cell n 12 0)]}))

(defn head [name conn] (storage/head-position name (d/db conn)))
(defn scope-key [label] (json/write-str ["triplex-scope-v1" "test" "w3-general-hints" label 0]))
(defn open! [label]
  (let [name (:db (main/create-scope! nil (scope-key label) "lean" true true))]
    [name (main/connection (main/db-uri name))]))

;; Sequential set A (deterministic: compared byte for byte) and concurrent set B (compared by final state).
(def stride 7919)
(defn set-a [] (mapv #(mod (* stride %) subjects) (range edits)))
(defn set-b [] (let [a (set (set-a))] (vec (take edits (remove a (map #(mod (* 104729 %) subjects) (range subjects)))))))

;; ---- storage reads: inside apply (the transaction's own io-stats) and every read by role (PostgreSQL) ----
(defn stats-conn []
  (DriverManager/getConnection (System/getenv "W3_STATS_JDBC")))
(defn pg-reads []
  ;; Every SELECT on the storage table, by role and statement text (segment reads and the log's own bookkeeping
  ;; differ in text, so the breakdown keeps them apart).
  (with-open [c (stats-conn) s (.createStatement c)
              r (.executeQuery s (str "select r.rolname, s.query, sum(s.calls)::bigint from pg_stat_statements s join pg_roles r on r.oid = s.userid"
                                      " where s.query ilike 'select%' and s.query ilike '%datomic_kvs%' group by 1, 2"))]
    (loop [m {}] (if (.next r) (recur (assoc-in m [(.getString r 1) (.getString r 2)] (.getLong r 3))) m))))
(defn pg-reset! [] (with-open [c (stats-conn) s (.createStatement c)] (.execute s "select pg_stat_statements_reset()")))
(defn sql-reads [receipt] (or (get-in receipt ["nativeIoStats" "reads" "sql"]) 0))
(defn index-loads [receipts]
  ;; Every io-stats read counter summed: index loads, sql, ocache hits and the time apply waited on in-flight lookups.
  (apply merge-with + {} (for [r receipts] (into {} (filter (fn [[_ v]] (number? v)))
                                                (get-in r ["nativeIoStats" "reads"])))))

(defn summarize [receipts]
  (let [general (remove #(get % "subjectSave") receipts)
        reads (map sql-reads general)]
    {:commits (count receipts) :general (count general)
     :generalHintsAttached (count (filter #(get % "generalHintsAttached") general))
     :subjectPath (count (filter #(get % "subjectSave") receipts))
     :subjectHintsAttached (count (filter #(get % "generalHintsAttached") (filter #(get % "subjectSave") receipts)))
     :readsInsideApply (reduce + reads) :generalWithReadInsideApply (count (filter pos? reads))
     :ioStatsInsideApply (index-loads general)
     :readsInsideApplyPerGeneral (when (seq general) (double (/ (reduce + reads) (count general))))
     :applyMsMedian (let [xs (sort (keep #(get-in % ["nativeIoStats" "api-ms"]) general))]
                      (when (seq xs) (nth xs (quot (count xs) 2))))
     ;; The gateway's own cost of naming the segments (diagnostic microseconds on the Mac).
     :hintLookupMicros (let [xs (sort (keep #(let [t (get % "timeline") a (get t "generalHintsStarted")
                                                   b (get t "generalHintsFinished")]
                                               (when (and a b) (- b a))) general))]
                         (when (seq xs) {:p50 (nth xs (quot (count xs) 2)) :p90 (nth xs (quot (* 9 (count xs)) 10))
                                         :max (last xs)}))}))

(defn receipt-core [r] (select-keys r ["position" "recordedAt" "t" "datoms" "operationId" "subjectSave"]))

(defn commit-checked! [name input]
  (let [reply (send! name input)]
    (when-not (= 200 (:status reply)) (throw (ex-info "W3 commit refused" {:reply reply :op (get input "operationId")})))
    (:body reply)))

(def seed-batch (parse-long (or (System/getenv "W3_SEED_BATCH") "1")))
(defn seed-batch-save [ns]
  ;; Several subjects in one seeding commit, so a toy of tens of thousands of subjects seeds in minutes.
  (let [one (map seed-save ns) op (str "seed-batch-" (first ns))]
    (if (= 1 (count ns)) (first one)
      (let [tx (str "_tx/" op) owners (mapv subject ns)
            facts (for [n ns i (range fields)] (let [[id a v] (cell n i 0)] (row id (subject n) a v tx)))
            j (fn [suffix attr value] (row (str op "/" suffix) tx attr value tx))
            journal (concat [(assoc (j "p" ":_tx/position" nil) :value_type "number" :value_number 1.0)
                             (assoc (j "t" ":_tx/instant" nil) :value_type "datetime" :value_datetime clock)
                             (j "cmd" ":_tx/command-id" op)]
                            (map-indexed (fn [k o] (j (str "owner-" k) ":_tx/changed-entity" o)) owners))
            rows (vec (concat journal facts))]
        (selftest/row-input {"span" 1 "position" 1 "scopeWide" false "entities" owners
                             "operationId" op "rows" (mapv storage/wire-row rows)
                             "newIds" (mapv :id rows) "claims" [{"commandId" op "txId" tx "timestamp" clock}]})))))

(defn seed! []
  ;; Both databases receive the same commits in the same order, with the hint function installed in both
  ;; (this JVM runs with the option on), so their logs differ only in the scope key.
  (assert general/enabled "seed runs with TX2_GENERAL_PREFETCH=1 so both databases hold the hint function")
  (let [result (into {} (for [label ["off" "on" "full"]]
                          (let [[name conn] (open! label)]
                            (doseq [ns (partition-all seed-batch (range subjects))] (commit-checked! name (seed-batch-save ns)))
                            (let [t (d/basis-t (d/db conn))]
                              (d/request-index conn)
                              (assert (not= ::timeout (deref (d/sync-index conn t) 300000 ::timeout)) "index did not finish"))
                            [label {:db name :head (head name conn) :t (d/basis-t (d/db conn))}])))]
    (emit! "seed.json" result)
    (println "W3_SEED" (json/write-str result))))

(defn data-for [conn input] (let [db (d/db conn)] [db (storage/tx-data db input (scope/entity db))]))

(defn seed-one! [label n]
  ;; For the read-queue reproduction: one database the HTTP gateway then serves.
  (let [[name conn] (open! label)]
    (doseq [i (range n)] (commit-checked! name (seed-save i)))
    (emit! (str label ".json") {:db name :head (head name conn) :subjects (mapv subject (range n))})
    (println "W3_SEED_ONE" label name n)))

(defn arm! [label]
  (let [seed (get (slurp-json "seed.json") label)
        name (get seed "db") conn (main/connection (main/db-uri name))
        _ (main/sync-db (main/db-uri name))
        options (:body (route name "v1" "write-options" nil))
        _ (pg-reset!)
        ;; Sequential: one commit at a time, a small one after every tenth large one.
        sequential (vec (mapcat (fn [i n]
                                  (let [big (commit-checked! name (edit-save n (head name conn)))]
                                    (if (zero? (mod i 10))
                                      [big (commit-checked! name (small-save (mod (+ n 1) subjects) (head name conn)))]
                                      [big])))
                                (range) (set-a)))
        sequential-reads (pg-reads)
        sequential-t (d/basis-t (d/db conn))
        _ (pg-reset!)
        pool (Executors/newFixedThreadPool in-flight)
        futures (mapv (fn [n] (.submit pool ^Callable (fn [] (commit-checked! name (edit-save n nil))))) (set-b))
        concurrent (mapv #(.get ^java.util.concurrent.Future %) futures)
        _ (.shutdown pool)
        concurrent-reads (pg-reads)
        _ (pg-reset!)
        ;; The gateway's cost of naming the segments when nothing is cold: the same lookup twice, the second timed.
        warm-lookup (when general/enabled
                      (vec (for [n (take 50 (set-a))]
                             (let [[db data] (data-for conn (warm-save n (head name conn)))]
                               (general/lookup-hints db data)
                               (let [t (System/nanoTime)] (general/lookup-hints db data) (quot (- (System/nanoTime) t) 1000))))))
        warm (mapv (fn [n] (commit-checked! name (warm-save n (head name conn)))) (set-a))
        warm-reads (pg-reads)
        result {:label label :db name :options (get options "options") :generalPrefetchOption general/enabled
                :commitHintsOption storage/commit-hints?
                :sequential (assoc (summarize sequential) :pgReadsByRole sequential-reads :endT sequential-t)
                :concurrent (assoc (summarize concurrent) :pgReadsByRole concurrent-reads :inFlight in-flight)
                :warm (assoc (summarize warm) :pgReadsByRole warm-reads
                             :hintLookupMicrosRepeated (when warm-lookup (let [xs (sort warm-lookup)]
                                                          {:n (count xs) :p50 (nth xs (quot (count xs) 2))
                                                           :p90 (nth xs (quot (* 9 (count xs)) 10)) :max (last xs)})))
                :receipts (mapv receipt-core sequential)
                :rawIoStatsExample (get (first (remove #(get % "subjectSave") sequential)) "nativeIoStats")}]
    (emit! (str "arm-" label ".json") result)
    (println "W3_ARM" label (json/write-str (dissoc result :receipts)))))

;; ---- exactness: byte-identical datoms (log prefix through the sequential phase) and receipts ----
(defn log-texts
  "The printed form of every datom through end-t, txInstant left out and the scope key normalized (lazy)."
  [conn end-t]
  (let [db (d/db conn) ident #(d/ident db %) key-attr (d/entid db :triplex.scope/key)
        instant (d/entid db :db/txInstant)]
    (for [{:keys [t data]} (d/tx-range (d/log conn) nil (inc end-t)) datom data
          :when (not= instant (:a datom))]
      (pr-str [t (:e datom) (ident (:a datom)) (if (= key-attr (:a datom)) "SCOPE" (:v datom)) (:added datom)]))))
(defn compare-logs [conn-a conn-b end-t]
  ;; Streamed in lockstep: a 20,000-subject toy's log does not fit in a small heap twice.
  (let [digest-a (java.security.MessageDigest/getInstance "SHA-256") digest-b (java.security.MessageDigest/getInstance "SHA-256")]
    (loop [a (seq (log-texts conn-a end-t)) b (seq (log-texts conn-b end-t)) n 0 differing 0 first-diff nil]
      (if (or a b)
        (let [x (first a) y (first b) same (= x y)]
          (when x (.update digest-a (.getBytes ^String x "UTF-8")))
          (when y (.update digest-b (.getBytes ^String y "UTF-8")))
          (recur (next a) (next b) (inc n) (if same differing (inc differing)) (or first-diff (when-not same [n x y]))))
        {:logDatoms n :logDatomsDiffering differing :firstDifference first-diff
         :logSha256Off (format "%064x" (java.math.BigInteger. 1 (.digest digest-a)))
         :logSha256On (format "%064x" (java.math.BigInteger. 1 (.digest digest-b)))}))))
(defn live-state [name conn owners]
  (set (for [o owners r (get-in (route name "v1" "read" {"entityIds" [o]}) [:body "rows"])]
         [(get r "entity_id") (get r "id") (get r "attribute") (get-in r ["value_string" "v"])])))
(defn compare! []
  (let [off (slurp-json "arm-off.json") on (slurp-json "arm-on.json") full (slurp-json "arm-full.json")
        conn-of #(main/connection (main/db-uri (get % "db")))
        end-t (get-in off ["sequential" "endT"])
        same-end (= end-t (get-in on ["sequential" "endT"]))
        logs (compare-logs (conn-of off) (conn-of on) end-t)
        logs-full (compare-logs (conn-of off) (conn-of full) end-t)
        owners (mapv subject (set-b))
        state-off (live-state (get off "db") (conn-of off) owners)
        state-on (live-state (get on "db") (conn-of on) owners)
        ;; Printed form: function values compare by identity in Clojure, so the text of each datom is compared.
        result {:sequentialEndTEqual same-end :logs logs
                :logIdentical (and (zero? (:logDatomsDiffering logs)) (= (:logSha256Off logs) (:logSha256On logs)))
                :fullHintsLogIdentical (and (zero? (:logDatomsDiffering logs-full)) (= (:logSha256Off logs-full) (:logSha256On logs-full)))
                :fullHintsReceiptsIdentical (= (get off "receipts") (get full "receipts"))
                :receiptsIdentical (= (get off "receipts") (get on "receipts")) :receipts (count (get off "receipts"))
                :concurrentLiveRows (count state-off) :concurrentStateIdentical (= state-off state-on)}]
    (emit! "compare.json" result)
    (println "W3_COMPARE" (json/write-str result))
    (System/exit (if (and same-end (:logIdentical result) (:receiptsIdentical result) (:concurrentStateIdentical result)
                          (pos? (:logDatoms logs)) (pos? (count state-off))) 0 1))))

;; ---- correctness of hints that are stale, wrong or missing (option on) ----
(defn in-test-scope [f]
  (let [label (str "test-" (java.util.UUID/randomUUID)) [name conn] (open! label)]
    (try (f name conn) (finally (main/delete-scope! nil (scope-key label))))))
(defn signature [db report]
  (let [instant (d/entid db :db/txInstant)]
    (mapv #(vector (:e %) (:a %) (:v %) (:added %)) (remove #(= instant (:a %)) (:tx-data report)))))

(deftest hints-are-real-and-attached
  (is general/enabled)
  (in-test-scope
    (fn [name conn]
      (commit-checked! name (seed-save 1))
      (let [[db data] (data-for conn (edit-save 1 (head name conn)))
            hints (general/lookup-hints db data)]
        (is (general/eligible? db data))
        (is (some? hints) "the lookup-only function must produce Datomic hints")
        (is (= (signature db (d/with db data)) (signature db (d/with db data :return-hints true)))))
      (let [receipt (commit-checked! name (edit-save 1 (head name conn)))]
        ;; a replay of the same edit is a duplicate; the first one above was only speculative
        (is (true? (get receipt "generalHintsAttached")))
        (is (nil? (get receipt "subjectSave")))))))

(deftest wrong-hints-change-nothing
  (in-test-scope
    (fn [name conn]
      (commit-checked! name (seed-save 1)) (commit-checked! name (seed-save 2))
      (let [[db data] (data-for conn (edit-save 1 (head name conn)))
            [_ other] (data-for conn (edit-save 2 (head name conn)))
            wrong (general/lookup-hints db other)
            expected (signature db (d/with db data))
            report @(d/transact-async conn data :hints wrong)]
        (is (some? wrong))
        (is (= (d/basis-t db) (d/basis-t (:db-before report))))
        (is (= expected (signature db report)) "the datoms do not depend on which segments were named")))))

(deftest stale-hints-keep-the-serial-decision
  (in-test-scope
    (fn [name conn]
      (commit-checked! name (seed-save 1)) (commit-checked! name (seed-save 2))
      ;; Hints for edit A are taken; then B retires the same values first. A must be refused exactly as without hints.
      (let [a (edit-save 1 nil) [db data] (data-for conn a) stale (general/lookup-hints db data)
            _ (commit-checked! name (save {:op "race-b" :owner (subject 1) :adds [(cell 1 0 9)] :retires [(cell 1 0 0)]}))
            before (head name conn)
            refused (with-redefs [general/lookup-hints (fn [& _] stale)] (send! name a))
            ;; the control: the same race on subject 2, with the option's hints simply absent
            control (do (commit-checked! name (save {:op "race-c" :owner (subject 2) :adds [(cell 2 0 9)]
                                                     :retires [(cell 2 0 0)]}))
                        (with-redefs [general/enabled false] (send! name (edit-save 2 nil))))]
        (is (some? stale))
        (is (= (outcome control) (outcome refused)))
        (is (= 409 (:status refused)))
        (is (= {"status" "absent"} (:body (route name "v1" (str "operation/" "edit-1") nil))))
        (is (= (inc before) (head name conn)) "only the control's racing commit was added")))))

(deftest failing-hint-lookup-still-commits
  (in-test-scope
    (fn [name conn]
      (commit-checked! name (seed-save 1))
      (let [reply (with-redefs [general/lookup-hints (fn [& _] (throw (ex-info "lookup failed" {})))]
                    (send! name (edit-save 1 (head name conn))))]
        (is (= 200 (:status reply)))
        (is (nil? (get-in reply [:body "generalHintsAttached"])))
        (is (number? (get-in reply [:body "timeline" "hintsDeclined"])))))))

(deftest identity-refusals-with-hints
  (in-test-scope
    (fn [name conn]
      (commit-checked! name (seed-save 1)) (commit-checked! name (seed-save 2))
      (commit-checked! name (edit-save 1 (head name conn)))
      (let [before (head name conn)
            retired-id (first (cell 1 0 0))      ; retired by edit-1
            active-id (first (cell 1 13 0))      ; still live on subject 1
            ;; five facts, so the general writer (not the per-subject one) makes the decision
            reuse (fn [op id] (save {:op op :owner (subject 2)
                                     :adds (into [[id ":f13" "reused"]] (mapv #(cell 2 % 1) (range 20 24)))
                                     :retires [(cell 2 13 0)] :source (head name conn)}))]
        (doseq [[op id] [["reuse-retired" retired-id] ["reuse-active" active-id]]]
          (let [reply (send! name (reuse op id))]
            (is (= [400 "IdentityConflict"] (outcome reply)) op)
            (is (= {"status" "absent"} (:body (route name "v1" (str "operation/" op) nil))))))
        (is (= before (head name conn)))))))

(defn run-tests! []
  (let [r (clojure.test/run-tests 'w3-gate)]
    (println "W3_TESTS" (json/write-str (select-keys r [:test :pass :fail :error])))
    r))
