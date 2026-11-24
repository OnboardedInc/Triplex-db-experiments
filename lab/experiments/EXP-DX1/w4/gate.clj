(ns w4-gate
  "[DX-W4] Native toy gate for the per-subject writer's hints with ordered IDs (TX2_SUBJECT_HINTS, and
  TX2_SUBJECT_HINTS_EARLY), on real SQL storage and a real transactor. Phases run in separate JVMs from container.sh:
  seed (three databases identically), probe (what a hint names), arms off / late / early (each after a transactor
  restart, so each starts cold), compare (byte-identical logs and receipts), tests (stale, wrong, failing hints,
  refusals, concurrent saves of one subject). Timings are diagnostic; the counts are the result."
  (:require [clojure.data.json :as json] [clojure.java.io :as io] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.subject-save :as subject] [triplex.gateway.subject-hints :as hints]
            [triplex.gateway.selftest :as selftest] [triplex.gateway.scope :as scope])
  (:import [java.io ByteArrayInputStream] [java.nio.charset StandardCharsets] [java.sql DriverManager]
           [java.util.concurrent Executors]))

(def out (or (System/getenv "W4_OUT") "/out"))
(def subjects (parse-long (or (System/getenv "W4_SUBJECTS") "2000")))
(def edits (parse-long (or (System/getenv "W4_EDITS") "200")))
(def in-flight (parse-long (or (System/getenv "W4_IN_FLIGHT") "8")))
(def seed-batch (parse-long (or (System/getenv "W4_SEED_BATCH") "1")))
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
(defn commit-checked! [name input]
  (let [reply (send! name input)]
    (when-not (= 200 (:status reply)) (throw (ex-info "W4 commit refused" {:reply reply :op (get input "operationId")})))
    (:body reply)))

;; ---- the toy's saves ----
(defn subject-id [n] (format "acct/w4/subject/%05d" n))
(defn row [id e attr value tx]
  {:id id :entity_id e :entity_type (when (.startsWith ^String e "_tx/") "_Transaction") :attribute attr
   :value_type "string" :value_string value :valid_from 0.0 :recorded_at clock :recorded_position 1 :schema_version 1
   :tx_id tx})
;; A save token as the SDK mints it (orderedSaveIdentity.ts): 24 characters, increasing with seq.
(defn token [seq] (format "01K%021d" seq))
(defn ordered-save
  "One subject's save with ordered IDs: the journal entity _tx/<token>00 and every new row <token><ordinal>, journal
  rows first. adds: [[attr value]]; retires: [[id attr value]] (the rows it replaces)."
  [{:keys [seq owner adds retires source]}]
  (let [tk (token seq) tx (str "_tx/" tk "00") op (str "w4-op-" seq)
        id (fn [k] (str tk (format "%02X" k)))
        journal [(assoc (row (id 0) tx ":_tx/position" nil tx) :value_type "number" :value_number 1.0)
                 (assoc (row (id 1) tx ":_tx/instant" nil tx) :value_type "datetime" :value_datetime clock)
                 (row (id 2) tx ":_tx/changed-entity" owner tx) (row (id 3) tx ":_tx/command-id" op tx)]
        fresh (vec (map-indexed (fn [k [a v]] (row (id (+ 4 k)) owner a v tx)) adds))
        retired (mapv (fn [[rid a v]] (assoc (row rid owner a v "earlier") :retracted_at clock :retracted_position 1
                                             :retract_tx_id tx)) retires)
        rows (into journal fresh)]
    (selftest/row-input {"sourceK" source "span" 1 "position" 1 "scopeWide" false "entities" [owner]
                         "operationId" op "rows" (mapv storage/wire-row (into rows retired))
                         "newIds" (mapv :id rows) "claims" [{"commandId" op "txId" tx "timestamp" clock}]})))
(defn new-row-id [seq k] (str (token seq) (format "%02X" (+ 4 k))))
(defn cell [n i v] [(str "w4-" n "-f" i "-v" v) (str ":f" i) (str "value-" n "-" i "-" v)])
(defn seed-batch-save [ns]
  (let [op (str "seed-batch-" (first ns)) tx (str "_tx/" op) owners (mapv subject-id ns)
        facts (for [n ns i (range fields)] (let [[id a v] (cell n i 0)] (row id (subject-id n) a v tx)))
        j (fn [suffix attr value] (row (str op "/" suffix) tx attr value tx))
        journal (concat [(assoc (j "p" ":_tx/position" nil) :value_type "number" :value_number 1.0)
                         (assoc (j "t" ":_tx/instant" nil) :value_type "datetime" :value_datetime clock)
                         (j "cmd" ":_tx/command-id" op)]
                        (map-indexed (fn [k o] (j (str "owner-" k) ":_tx/changed-entity" o)) owners))
        rows (vec (concat journal facts))]
    (selftest/row-input {"span" 1 "position" 1 "scopeWide" false "entities" owners
                         "operationId" op "rows" (mapv storage/wire-row rows)
                         "newIds" (mapv :id rows) "claims" [{"commandId" op "txId" tx "timestamp" clock}]})))

(defn head [name conn] (storage/head-position name (d/db conn)))
(defn scope-key [label] (json/write-str ["triplex-scope-v1" "test" "w4-subject-hints" label 0]))
(defn open! [label]
  (let [name (:db (main/create-scope! nil (scope-key label) "lean" true true))]
    [name (main/connection (main/db-uri name))]))

;; First touches: one field replaced on a subject not saved since the seed (seq 1,000,000 + n); then the same
;; subject's second save, which replaces the first touch's row (seq 2,000,000 + n).
(defn first-touch [n source]
  (ordered-save {:seq (+ 1000000 n) :owner (subject-id n) :source source
                 :adds [[":f12" (str "first-" n)]] :retires [(cell n 12 0)]}))
(defn second-save [n source]
  (ordered-save {:seq (+ 2000000 n) :owner (subject-id n) :source source
                 :adds [[":f12" (str "second-" n)]] :retires [[(new-row-id (+ 1000000 n) 0) ":f12" (str "first-" n)]]}))
(def stride 7919)
(defn set-a [] (vec (distinct (map #(mod (* stride %) subjects) (range edits)))))
(defn set-b [] (let [a (set (set-a))] (vec (take edits (remove a (map #(mod (* 104729 %) subjects) (range subjects)))))))
(defn set-probe [] (let [used (into (set (set-a)) (set-b))] (vec (take 40 (remove used (range subjects))))))

;; ---- storage reads: inside apply (the transaction's own io-stats) and by role (PostgreSQL) ----
(defn stats-conn [] (DriverManager/getConnection (System/getenv "W4_STATS_JDBC")))
(defn pg-reads []
  (with-open [c (stats-conn) s (.createStatement c)
              r (.executeQuery s (str "select r.rolname, sum(s.calls)::bigint from pg_stat_statements s join pg_roles r on r.oid = s.userid"
                                      " where s.query ilike 'select%' and s.query ilike '%datomic_kvs%' group by 1"))]
    (loop [m {}] (if (.next r) (recur (assoc m (.getString r 1) (.getLong r 2))) m))))
(defn pg-reset! [] (with-open [c (stats-conn) s (.createStatement c)] (.execute s "select pg_stat_statements_reset()")))
(defn sql-reads [receipt] (or (get-in receipt ["nativeIoStats" "reads" "sql"]) 0))
(defn index-loads [receipts]
  (apply merge-with + {} (for [r receipts] (into {} (filter (fn [[_ v]] (number? v))) (get-in r ["nativeIoStats" "reads"])))))
(defn quantiles [xs]
  (let [xs (vec (sort xs))]
    (when (seq xs) {:n (count xs) :p50 (nth xs (quot (count xs) 2)) :p90 (nth xs (quot (* 9 (count xs)) 10)) :max (peek xs)})))
(defn summarize [receipts]
  (let [subject (filter #(get % "subjectSave") receipts) reads (map sql-reads subject)]
    {:commits (count receipts) :subjectPath (count subject)
     :orderedIds (count (filter #(get % "subjectOrderedIds") subject))
     :hintsAttached (count (filter #(get % "subjectHintsAttached") subject))
     :readsInsideApply (reduce + reads)
     :readsInsideApplyPerSave (when (seq subject) (double (/ (reduce + reads) (count subject))))
     :savesWithReadInsideApply (count (filter pos? reads))
     :ioStatsInsideApply (index-loads subject)
     :applyMsMedian (:p50 (quantiles (keep #(get-in % ["nativeIoStats" "api-ms"]) subject)))
     ;; The gateway's own cost of naming the segments (timeline microseconds; diagnostic on the Mac).
     :hintMicros (quantiles (keep #(let [t (get % "timeline") a (get t "subjectHintsStarted") b (get t "subjectHintsFinished")]
                                     (when (and a b) (- b a))) subject))}))
(defn receipt-core [r] (select-keys r ["position" "recordedAt" "t" "datoms" "operationId" "subjectSave" "subjectOrderedIds"]))

(defn seed! []
  ;; Every database gets the same commits in the same order, with the hint function installed in all of them (this
  ;; JVM runs with the option on), so their logs differ only in the scope key.
  (assert hints/enabled "seed runs with TX2_SUBJECT_HINTS=1 so every database holds the hint function")
  (let [result (into {} (for [label ["off" "late" "early"]]
                          (let [[name conn] (open! label)]
                            (doseq [ns (partition-all seed-batch (range subjects))] (commit-checked! name (seed-batch-save ns)))
                            (let [t (d/basis-t (d/db conn))]
                              (d/request-index conn)
                              (assert (not= ::timeout (deref (d/sync-index conn t) 300000 ::timeout)) "index did not finish"))
                            [label {:db name :head (head name conn) :t (d/basis-t (d/db conn))}])))]
    (emit! "seed.json" result)
    (println "W4_SEED" (json/write-str result))))

;; ---- what a hint names: a lookup on a cold peer against the same lookup after the peer read the owner ----
(defn hint-size [h] (if (map? h) (count (:segments h)) -1))
(defn probe! []
  (let [seed (get (slurp-json "seed.json") "off") name (get seed "db") conn (main/connection (main/db-uri name))
        db (d/db conn)
        rows-of (fn [input] (map storage/decode-row (get input "rows")))
        payload (fn [n] (hints/from-input (first-touch n (head name conn)) (rows-of (first-touch n 0)) subject/ordered-bounds))
        owner-read! (fn [n] (let [e (d/entid db [:triplex.entity/id (subject-id n)])] (dorun (d/datoms db :eavt e)) e))
        [a-set b-set] (split-at 20 (set-probe))
        _ (pg-reset!)
        ;; A: hint on a cold peer, then the same hint again (now the peer holds what the first one loaded).
        cold (vec (for [n a-set] (let [p (payload n) h1 (hints/lookup-hints db p) h2 (hints/lookup-hints db p)]
                                   [(hint-size h1) (hint-size h2)])))
        ;; B: the peer reads the owner's EAVT first (as the plan does), then the hint.
        after-owner (vec (for [n b-set] (do (owner-read! n) (hint-size (hints/lookup-hints db (payload n))))))
        sample (hints/lookup-hints db (payload (first (set-a))))
        result {:coldThenRepeat cold :afterOwnerRead after-owner :peerReads (pg-reads)
                :hintType (str (type sample)) :hintSample (let [s (pr-str sample)] (subs s 0 (min 1200 (count s))))}]
    (emit! "probe.json" result)
    (println "W4_PROBE" (json/write-str result))))

(defn arm! [label]
  (let [seed (get (slurp-json "seed.json") label)
        name (get seed "db") conn (main/connection (main/db-uri name))
        _ (main/sync-db (main/db-uri name))
        options (:body (route name "v1" "write-options" nil))
        _ (pg-reset!)
        ;; One at a time: each subject's first touch, then its second save.
        pairs (vec (for [n (set-a)] [(commit-checked! name (first-touch n (head name conn)))
                                     (commit-checked! name (second-save n (head name conn)))]))
        sequential-reads (pg-reads)
        sequential-t (d/basis-t (d/db conn))
        _ (pg-reset!)
        ;; Eight in flight: first touches of other subjects (the writer queues, so a prefetch can overlap).
        pool (Executors/newFixedThreadPool in-flight)
        source (head name conn)
        futures (mapv (fn [n] (.submit pool ^Callable (fn [] (commit-checked! name (first-touch n source))))) (set-b))
        concurrent (mapv #(.get ^java.util.concurrent.Future %) futures)
        _ (.shutdown pool)
        concurrent-reads (pg-reads)
        result {:label label :db name :options (get options "options")
                :hintsOption hints/enabled :earlyOption hints/early?
                :firstTouch (assoc (summarize (map first pairs)) :pgReadsByRole sequential-reads :endT sequential-t)
                :secondSave (summarize (map second pairs))
                :concurrent (assoc (summarize concurrent) :pgReadsByRole concurrent-reads :inFlight in-flight)
                :receipts (mapv receipt-core (mapcat identity pairs))
                :rawIoStatsExample (get (ffirst pairs) "nativeIoStats")}]
    (emit! (str "arm-" label ".json") result)
    (println "W4_ARM" label (json/write-str (dissoc result :receipts)))))

;; ---- exactness: byte-identical datoms (log through the one-at-a-time phase) and receipts ----
(defn log-texts [conn end-t]
  (let [db (d/db conn) ident #(d/ident db %) key-attr (d/entid db :triplex.scope/key) instant (d/entid db :db/txInstant)]
    (for [{:keys [t data]} (d/tx-range (d/log conn) nil (inc end-t)) datom data :when (not= instant (:a datom))]
      (pr-str [t (:e datom) (ident (:a datom)) (if (= key-attr (:a datom)) "SCOPE" (:v datom)) (:added datom)]))))
(defn compare-logs [conn-a conn-b end-t]
  (let [da (java.security.MessageDigest/getInstance "SHA-256") db (java.security.MessageDigest/getInstance "SHA-256")]
    (loop [a (seq (log-texts conn-a end-t)) b (seq (log-texts conn-b end-t)) n 0 differing 0 first-diff nil]
      (if (or a b)
        (let [x (first a) y (first b) same (= x y)]
          (when x (.update da (.getBytes ^String x "UTF-8")))
          (when y (.update db (.getBytes ^String y "UTF-8")))
          (recur (next a) (next b) (inc n) (if same differing (inc differing)) (or first-diff (when-not same [n x y]))))
        {:logDatoms n :logDatomsDiffering differing :firstDifference first-diff
         :sha256A (format "%064x" (java.math.BigInteger. 1 (.digest da)))
         :sha256B (format "%064x" (java.math.BigInteger. 1 (.digest db)))}))))
(defn live-state [name owners]
  (set (for [o owners r (get-in (route name "v1" "read" {"entityIds" [o]}) [:body "rows"])]
         (let [v (get r "value_string")] [(get r "entity_id") (get r "id") (get r "attribute") (if (map? v) (get v "v") v)]))))
(defn compare! []
  (let [arms (into {} (for [l ["off" "late" "early"]] [l (slurp-json (str "arm-" l ".json"))]))
        conn-of #(main/connection (main/db-uri (get % "db")))
        off (arms "off") end-t (get-in off ["firstTouch" "endT"])
        owners (mapv subject-id (concat (set-a) (set-b)))
        state-off (live-state (get off "db") owners)
        per (into {} (for [l ["late" "early"] :let [arm (arms l) logs (compare-logs (conn-of off) (conn-of arm) end-t)]]
                       [l {:sameEndT (= end-t (get-in arm ["firstTouch" "endT"])) :logs logs
                           :logIdentical (and (pos? (:logDatoms logs)) (zero? (:logDatomsDiffering logs))
                                              (= (:sha256A logs) (:sha256B logs)))
                           :receiptsIdentical (= (get off "receipts") (get arm "receipts"))
                           :liveStateIdentical (= state-off (live-state (get arm "db") owners))}]))
        result {:receipts (count (get off "receipts")) :liveRows (count state-off) :arms per}
        ok (every? (fn [[_ v]] (and (:sameEndT v) (:logIdentical v) (:receiptsIdentical v) (:liveStateIdentical v))) per)]
    (emit! "compare.json" result)
    (println "W4_COMPARE" (json/write-str result))
    (System/exit (if (and ok (pos? (count state-off))) 0 1))))

;; ---- hints that are stale, wrong, missing, or meet concurrent saves of the same subject ----
(defn in-test-scope [f]
  (let [label (str "test-" (java.util.UUID/randomUUID)) [name conn] (open! label)]
    (try (f name conn) (finally (main/delete-scope! nil (scope-key label))))))
(defn seed-two! [name] (commit-checked! name (seed-batch-save [1 2])))
(defn plan-of [conn input]
  (let [db (d/db conn) data (storage/tx-data db input (scope/entity db))] [db (subject/plan db data input)]))
(defn signature [db report]
  (let [instant (d/entid db :db/txInstant)]
    (mapv #(vector (:e %) (:a %) (:v %) (:added %)) (remove #(= instant (:a %)) (:tx-data report)))))
(defn native [plan] [[(first (:function plan)) plan]])

(deftest hints-are-real-and-attached-with-ordered-ids
  (is hints/enabled)
  (is subject/ordered-ids?)
  (in-test-scope
    (fn [name conn]
      (seed-two! name)
      (let [input (first-touch 1 (head name conn)) [db plan] (plan-of conn input)
            h (hints/lookup-hints db (hints/from-plan plan))]
        (is (some? plan) "the save takes the per-subject writer")
        (is (vector? (:ordered-bounds plan)) "with ordered IDs")
        (is (some? h) "the lookup-only function produces Datomic hints")
        (is (= (signature db (d/with db (native plan))) (signature db (d/with db (native plan) :return-hints true)))))
      (let [receipt (commit-checked! name (first-touch 1 (head name conn)))]
        (is (= "1" (System/getenv "TX2_SUBJECT_HINTS")))
        (is (string? (get receipt "subjectSave")))
        (is (true? (get receipt "subjectOrderedIds")))
        (is (true? (get receipt "subjectHintsAttached")))))))

(deftest wrong-hints-change-nothing
  (in-test-scope
    (fn [name conn]
      (seed-two! name)
      (let [[db plan] (plan-of conn (first-touch 1 (head name conn)))
            [_ other] (plan-of conn (first-touch 2 (head name conn)))
            wrong (hints/lookup-hints db (hints/from-plan other))
            expected (signature db (d/with db (native plan)))
            report @(d/transact-async conn (native plan) :hints wrong)]
        (is (some? wrong))
        (is (= (d/basis-t db) (d/basis-t (:db-before report))))
        (is (= expected (signature db report)) "the datoms do not depend on which segments were named")))))

(defn native-outcome [conn plan & options]
  (try (let [r @(apply d/transact-async conn (native plan) options)] [:committed (count (:tx-data r))])
       (catch Exception e [:refused (some #(when (instance? clojure.lang.ExceptionInfo %) (ex-message %))
                                          (take-while some? (iterate ex-cause e)))])))

(deftest stale-hints-keep-the-serial-decision
  (in-test-scope
    (fn [name conn]
      (seed-two! name)
      ;; Plan and hints for save A of subject n are taken; then a racing save replaces the same value; then A's
      ;; native transaction is sent, with those stale hints (subject 1) or without hints (subject 2, the control).
      (let [race (fn [n seq] (ordered-save {:seq seq :owner (subject-id n) :source (head name conn)
                                            :adds [[":f12" "racer"]] :retires [(cell n 12 0)]}))
            stale-run (fn [n with-hints]
                        (let [[db plan] (plan-of conn (first-touch n (head name conn)))
                              h (hints/lookup-hints db (hints/from-plan plan))
                              _ (commit-checked! name (race n (+ 3000000 n)))
                              before (head name conn)
                              result (if with-hints (native-outcome conn plan :hints h) (native-outcome conn plan))]
                          [(some? h) result (= before (head name conn))]))
            [h1 hinted unchanged1] (stale-run 1 true)
            [_ control unchanged2] (stale-run 2 false)]
        (is h1)
        (is (= :refused (first hinted)))
        (is (= control hinted) "the same refusal with stale hints as without hints")
        (is (and unchanged1 unchanged2))
        ;; Through the route: the save planned after the race does not take the per-subject writer and is refused.
        (let [reply (send! name (first-touch 1 nil))]
          (is (= 409 (:status reply)))
          (is (= {"status" "absent"} (:body (route name "v1" (str "operation/" (get (first-touch 1 nil) "operationId")) nil)))))))))

(deftest failing-hint-lookup-still-commits
  (in-test-scope
    (fn [name conn]
      (seed-two! name)
      (let [reply (with-redefs [hints/lookup-hints (fn [& _] (throw (ex-info "lookup failed" {})))]
                    (send! name (first-touch 1 (head name conn))))]
        (is (= 200 (:status reply)))
        (is (string? (get-in reply [:body "subjectSave"])))
        (is (nil? (get-in reply [:body "subjectHintsAttached"])))))))

(defn legacy-save
  "A general save that writes one row with a chosen ID on subject n (the journal keeps its own IDs)."
  [op n row-id source]
  (let [tx (str "_tx/" op) j (fn [suffix attr value] (row (str op "/" suffix) tx attr value tx))
        rows [(assoc (j "p" ":_tx/position" nil) :value_type "number" :value_number 1.0)
              (assoc (j "t" ":_tx/instant" nil) :value_type "datetime" :value_datetime clock)
              (j "owner" ":_tx/changed-entity" (subject-id n)) (j "cmd" ":_tx/command-id" op)
              (row row-id (subject-id n) ":f40" "occupied" tx)]]
    (selftest/row-input {"sourceK" source "span" 1 "position" 1 "scopeWide" false "entities" [(subject-id n)]
                         "operationId" op "rows" (mapv storage/wire-row rows)
                         "newIds" (mapv :id rows) "claims" [{"commandId" op "txId" tx "timestamp" clock}]})))

(deftest used-ordered-id-refused-with-hints
  ;; A legacy save occupies <token>04 on subject 1; a save of subject 2 under that token must be refused (the
  ;; ordered interval finds the used ID), with hints exactly as without.
  (doseq [[on seq] [[true 5000001] [false 5000002]]]
    (in-test-scope
      (fn [name conn]
        (seed-two! name)
        (commit-checked! name (legacy-save (str "occupy-" seq) 1 (new-row-id seq 0) (head name conn)))
        (let [before (head name conn)
              input (ordered-save {:seq seq :owner (subject-id 2) :source (head name conn)
                                   :adds [[":f12" "reuse"]] :retires [(cell 2 12 0)]})
              [_ plan] (plan-of conn input)
              reply (with-redefs [hints/enabled on] (send! name input))]
          (is (vector? (:ordered-bounds plan)) "the refused save is an ordered per-subject plan")
          (is (= [400 "IdentityConflict"] (outcome reply)) (str "hints " on))
          (is (= {"status" "absent"} (:body (route name "v1" (str "operation/" (get input "operationId")) nil))))
          (is (= before (head name conn))))))))

(deftest concurrent-saves-of-one-subject
  ;; Eight saves of subject 1 in flight, each replacing the same seeded value: exactly one may commit, with hints
  ;; exactly as without them; the survivor's value is the live one and the revision is its position.
  (doseq [on [true false]]
    (in-test-scope
      (fn [name conn]
        (seed-two! name)
        (let [source (head name conn)
              saves (mapv (fn [k] (ordered-save {:seq (+ 4000000 k) :owner (subject-id 1) :source source
                                                 :adds [[":f12" (str "racer-" k)]] :retires [(cell 1 12 0)]})) (range 8))
              pool (Executors/newFixedThreadPool 8)
              replies (with-redefs [hints/enabled on]
                        (mapv #(.get ^java.util.concurrent.Future %)
                              (mapv (fn [s] (.submit pool ^Callable (fn [] (send! name s)))) saves)))
              _ (.shutdown pool)
              ok (filter #(= 200 (:status %)) replies)
              live (live-state name [(subject-id 1)])
              f12 (filter #(.endsWith (str (nth % 2)) "f12") live)]
          (is (= 1 (count ok)) (str "hints " on ": " (frequencies (map outcome replies))))
          (is (every? #(<= 400 (:status %) 499) (remove #(= 200 (:status %)) replies)))
          (println "W4_RACE" on (json/write-str (frequencies (map outcome replies))))
          (is (= 1 (count f12)))
          (is (= (inc source) (head name conn)))
          (when (= 1 (count ok))
            (is (= (str "racer-" (- (Long/parseLong (subs (get-in (first ok) [:body "operationId"]) 6)) 4000000))
                   (nth (first f12) 3)))
            (when on (is (true? (get-in (first ok) [:body "subjectHintsAttached"]))))))))))
