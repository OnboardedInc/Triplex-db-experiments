(ns size-ladder
  "[DX-S1] How one subject's save grows with its size, on PostgreSQL storage at toy size (Mac, diagnostic).
  Saves of 5, 10, 17, 50, 100, 340 and 1,000 facts, each one commit on one subject, cold (first save of the subject
  after a transactor restart, from an indexed seed) and warm (the same fields replaced again at once). Two arms:
  `general` (TX2_SUBJECT_WIDE off: today's writer choice, so every save of four facts or more takes the general writer)
  and `subject-wide` (TX2_SUBJECT_WIDE on: the per-subject writer up to 128 facts, the general writer above).
  Per commit: datoms, added text bytes, PostgreSQL WAL bytes written during the commit, storage reads inside apply
  (Datomic io-stats of the transaction), serial apply, which writer and which identity took it. Then a limit probe:
  general-writer saves of 2,000 and 4,000 facts on one subject, to see what the transactor accepts.
  Reuses the W2 frame builder (wide_gate.clj), which mirrors the SDK's framing."
  (:require [clojure.data.json :as json] [clojure.edn :as edn]
            [datomic.api :as d] [datomic.measure.io-stats :as io]
            [triplex.gateway.group :as group] [triplex.gateway.lean :as lean] [triplex.gateway.main :as main]
            [triplex.gateway.scope :as scope] [triplex.gateway.selftest :as rows] [triplex.gateway.storage :as storage]
            [triplex.gateway.subject-save :as subject] [triplex.gateway.write-policy :as policy]
            [wfix1-regression :as reference] [wide-gate :as wg]))

(def sizes [5 10 17 50 100 340 1000])
(def per-size 6)
(def arms ["general" "subject-wide"])
(def limit-sizes [2000 4000])
(defn width [size] (max 160 size))
(defn subject-id [size k] (str "acct/test/ladder-" size "-" k))
(defn fields [n] (mapv #(str ":seed/f" %) (range n)))
(defn seed-state [size k]
  (into {} (map (fn [j f] [f {:id (str "s" size "-" k "-" j) :value (str "seed-" size "-" k "-" j)}])
                (range) (fields (width size)))))

(defn- row [id e entity-type attr value tx]
  {:id id :entity_id e :entity_type entity-type :attribute attr :value_type "string" :value_string value
   :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})

(defn seed-input [subject command state]
  (let [tx (str "_tx/" command)
        business (mapv (fn [[f {:keys [id value]}]] (row id subject nil f value tx)) (sort-by key state))
        journal [(assoc (row (str command "/p") tx "_Transaction" ":_tx/position" nil tx) :value_type "number" :value_number 1.0)
                 (assoc (row (str command "/t") tx "_Transaction" ":_tx/instant" nil tx) :value_type "datetime" :value_datetime 1000.0)
                 (row (str command "/e") tx "_Transaction" ":_tx/changed-entity" subject tx)
                 (row (str command "/c") tx "_Transaction" ":_tx/command-id" command tx)]
        fresh (into business journal)]
    (rows/row-input {"span" 1 "position" 1 "scopeWide" false "entities" [subject] "operationId" command
                     "rows" (mapv storage/wire-row fresh) "newIds" (mapv :id fresh)
                     "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]})))

(defn- with-writer [wide? f]
  (with-redefs [subject/enabled true subject/wide? wide? group/enabled false
                policy/priority? false policy/field-only? false policy/budget-us nil]
    (f)))

;; PostgreSQL WAL position, read through the transactor's own storage URL (the peer's DATOMIC_URI_TEMPLATE).
(def jdbc-url (let [t (System/getenv "DATOMIC_URI_TEMPLATE")] (subs t (inc (.indexOf ^String t "?")))))
(def pg (delay (java.sql.DriverManager/getConnection jdbc-url)))
(defn wal-lsn []
  (with-open [s (.createStatement ^java.sql.Connection @pg)
              r (.executeQuery s "select pg_wal_lsn_diff(pg_current_wal_insert_lsn(), '0/0')::bigint")]
    (.next r) (.getLong r 1)))

(defn- text-bytes [report]
  (reduce + (map #(if (and (:added %) (string? (:v %))) (alength (.getBytes ^String (:v %) java.nio.charset.StandardCharsets/UTF_8)) 0)
                 (:tx-data report))))
(defn- reads [stats] (select-keys (:reads stats) [:sql :eavt-load :aevt-load :avet-load :vaet-load :ocache :dev]))

(defn commit!
  "One save, as the gateway would send it: the per-subject plan when the arm is subject-wide and the plan accepts it,
  otherwise the general writer's transaction data."
  [arm conn input]
  (let [db (d/db conn)
        started (System/nanoTime)
        prepared (io/throw-if-ex!
                   (io/with-io-stats
                     #(let [data (storage/tx-data db input)
                            plan (when (= arm "subject-wide") (subject/plan db data input))]
                        (if plan [[subject/ident plan] plan] [data nil]))
                     {:io-context :s1/prepare :api :lookup}))
        [tx-data plan] (:ret prepared)
        wal-before (wal-lsn)
        report @(d/transact-async conn (if plan [tx-data] tx-data) :io-context (keyword "s1" arm))
        wal-after (wal-lsn)
        report (if plan (subject/verify-report report plan) report)]
    {:report report :wallMs (/ (- (System/nanoTime) started) 1e6) :walBytes (- wal-after wal-before)
     :peer (reads (:io-stats prepared)) :tx (reads (:io-stats report)) :applyMs (get-in report [:io-stats :api-ms])
     :writer (if plan "per-subject" "general")}))

(defn seed! [path]
  (let [attempt (System/getenv "PREP1_ATTEMPT")
        scopes (into {} (for [arm arms]
                          (let [wire (json/write-str ["triplex-scope-v1" "test" "save-ladder" (str attempt "-" arm) 0])
                                {:keys [db created]} (main/create-scope! nil wire "lean" true true)
                                conn (main/connection (main/db-uri db))]
                            (assert created)
                            (subject/install! conn (d/db conn))
                            (with-writer false
                              #(doseq [size (concat sizes limit-sizes) k (range (if (some #{size} sizes) per-size 1))]
                                 (let [reply (reference/send db (seed-input (subject-id size k) (str "seed-" size "-" k) (seed-state size k)))]
                                   (assert (= [200 nil] (reference/outcome reply)) (pr-str (:body reply))))))
                            (let [t (d/basis-t (d/db conn))]
                              (d/request-index conn)
                              @(d/sync-index conn t)
                              [arm {:db db :seedT t :position (wg/head conn)}]))))]
    (spit path (pr-str {:attempt attempt :scopes scopes}))
    (println "DX-S1_SEED" (json/write-str {:attempt attempt :sizes sizes :perSize per-size :scopes scopes}))))

(defn- block [arm size n]
  ;; The wide block (4,096 ordinals) for every save that fits it, in both arms, so both arms write identical records;
  ;; above it, plain 26-character IDs (the general writer checks each one).
  (let [assertions (+ (* 3 size) 4)]
    (if (<= assertions 4096)
      (wg/identity-block :wide n)
      (let [t (str "03" (format "%019d" n))] {:tx (str "_tx/" t "XW00") :id #(str t (format "%05d" %))}))))

(defn run-arm! [path arm]
  (let [{:keys [attempt scopes]} (edn/read-string (slurp path))
        {:keys [db]} (get scopes arm)
        conn (main/connection (main/db-uri db))
        out (with-writer (= arm "subject-wide")
              #(vec (for [size (concat sizes limit-sizes) k (range (if (some #{size} sizes) per-size 1))
                          :let [subj (subject-id size k) seed (seed-state size k) tag (str "l-" size "-" k)
                                fs (fields (width size))
                                facts (vec (for [f (take size fs)] {:field f :value (str tag "a|" f "|🧭") :pred (seed f)}))
                                a-input (wg/frame {:subject subj :command (str tag "a") :block (block arm size (+ (* size 1000) (* 2 k)))
                                                   :facts facts :retires [] :source (wg/head conn)})
                                a-ids (vec (take size (get a-input "newIds")))
                                after-a (wg/apply-model seed {:facts facts :retires []} a-ids)
                                b-facts (mapv (fn [{:keys [field]}] {:field field :value (str tag "b|" field) :pred (after-a field)}) facts)
                                b-input (wg/frame {:subject subj :command (str tag "b") :block (block arm size (+ (* size 1000) (* 2 k) 1))
                                                   :facts b-facts :retires [] :source nil})
                                run (fn [phase input fs model]
                                      (let [input (assoc input "sourceK" (wg/head conn))
                                            {:keys [report] :as m} (commit! arm conn input)
                                            after (:db-after report)
                                            owner (d/entid after [:triplex.entity/id subj])
                                            current (into {} (map (comp (juxt :attribute :value_string) lean/decode :v)) (lean/live-texts after owner))]
                                        (assert (= current (into {} (map (fn [[f {:keys [value]}]] [f value])) model))
                                                (str "exact current readback after " (get input "operationId")))
                                        (merge (dissoc m :report)
                                               {:arm arm :size size :subject k :phase phase :facts (count fs) :retired (count fs)
                                                :assertions (count (get input "newIds"))
                                                :wideBlock (<= (+ (* 3 size) 4) 4096)
                                                :position (scope/value after (d/t->tx (d/basis-t after)) :triplex.tx/position)
                                                :datoms (count (:tx-data report)) :addedTextBytes (text-bytes report)})))]
                          phase-row [(run "cold" a-input facts after-a)
                                     (run "warm" b-input b-facts (wg/apply-model after-a {:facts b-facts :retires []}
                                                                                  (vec (take size (get b-input "newIds")))))]]
                      phase-row)))]
    (assert (= attempt (System/getenv "PREP1_ATTEMPT")))
    (doseq [pair out r pair] (println "DX-S1_COMMIT" (json/write-str r)))))
