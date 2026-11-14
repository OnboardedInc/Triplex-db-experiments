(ns triplex.gateway.selftest
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.admission :as admission] [triplex.gateway.reach :as reach] [triplex.gateway.entity-cache :as entity-cache] [triplex.gateway.lean :as lean] [triplex.gateway.canonical :as canonical] [triplex.gateway.scope :as scope] [triplex.gateway.storage :as storage] [triplex.gateway.query :as query] [triplex.gateway.main :as gateway] [triplex.gateway.codec :as codec] [triplex.gateway.schema :as schema]))

 ;; [DX-B7] Why: old selftests predate mandatory row texts and the explicit layout/name parameters.
;; Rejected: bypassing the current commit API or removing the existing signed-zero/speculative assertions.
(defn row-text [row]
  (let [id (:id row) ref (if (= "ref" (:value_type row)) (:value_string row) "")
        bits #(format "%016x" (Double/doubleToRawLongBits (double %)))]
    (str "2" (format "%04x" (.length ^String id)) id (bits (:valid_from row))
         (if-let [to (:valid_to row)] (bits to) "----------------")
         (format "%04x" (.length ^String ref)) ref "-"
         (json/write-str (mapv (fn [column]
                                (let [v (get row column)]
                                  (cond (= column :recorded_position) (format "%016d" v)
                                        (storage/negative-zero? v) "-0" :else v))) lean/columns)))))
(defn row-input [input]
  (assoc input "rowTexts" (into {} (map (fn [wire]
                                        (let [row (storage/decode-row wire)] [(:id row) (row-text row)]))
                                      (get input "rows")))))
;; [EXP-DA00] Why: execute actual Peer API and codec offline. Rejected: mocked Datomic (cannot prove schema installation).
(deftest codec-vectors
  (doseq [wire (json/read-str (slurp "/opt/gateway/codec-vectors.json"))]
    (let [decoded (codec/decode-value wire) encoded (codec/encode-value (get wire "t") decoded)]
      (is (= wire encoded))
      (when (and (= "double" (get wire "t")) (zero? (get wire "v")))
        (is (= (Double/doubleToRawLongBits (double (get wire "v"))) (Double/doubleToRawLongBits (double (get encoded "v"))))))))
  (doseq [x [Double/NaN Double/POSITIVE_INFINITY Double/NEGATIVE_INFINITY]]
    (is (thrown? Exception (codec/decode-value {"t" "double" "v" x}))))
  (doseq [wire [{"t" "long" "v" "9223372036854775808"} {"t" "long" "v" 1} {"t" "bool" "v" "true"} {"t" "ref" "v" "01"}]]
    (is (thrown? Exception (codec/decode-value wire)))))
(deftest shared-codec-acceptance
  (doseq [{:strs [wire expected]} (json/read-str (slurp "/opt/gateway/codec-cases.json"))]
    (if (= expected "reject")
      (is (thrown? Exception (codec/decode-value wire)) (str wire))
      (let [value (codec/decode-value wire) again (codec/decode-value (codec/encode-value (get wire "t") value))]
        (is (= value again) (str wire))
        (when (= "bigdec" (get wire "t")) (is (= (.scale value) (.scale again))))))))

;; [EXP-DA01] Why: deterministic reviewer interleaving on actual Peer transactions. Rejected: sequential late-create alone (does not prove both creators overlap).
;; [DX-B8] Why: this fixture advances the legacy scope attribute directly, so opt into its legacy storage contract.
;; Rejected: changing its expected public head (would weaken the initialization race assertion).
(deftest concurrent-initialization
  (let [base "datomic:mem://" scope "[\"triplex-scope-v1\",\"test\",\"verifier\",\"da01-race\",1]"
        paused (promise) release (promise) slow-thread (atom nil) transact d/transact]
    (with-redefs [d/transact (fn [conn tx]
      (when (and (= @slow-thread (Thread/currentThread)) (some #(and (map? %) (= 0 (:triplex.scope/position %))) tx))
        (deliver paused true)
        (when-not (deref release 10000 false) (throw (Exception. "Release timeout"))))
      (transact conn tx))]
      (let [slow (future (reset! slow-thread (Thread/currentThread)) (gateway/create-scope! base scope "legacy" false))]
        (try
          (is (deref paused 10000 false))
          (let [fast (gateway/create-scope! base scope "legacy" false) name (:db fast) conn (gateway/connection (str base name))]
            @(d/transact conn [{:triplex.scope/key scope :triplex.scope/position 7}])
            (deliver release true)
            (let [late (deref slow 10000 ::timeout)]
              (is (not= ::timeout late))
              (is (= name (:db late))))
            (is (= {"t" "long" "v" "7"} (:position (gateway/basis base name)))))
          (finally (deliver release true) (is (:deleted (gateway/delete-scope! base scope)))))))))

(deftest reversible-public-scope-names
  (doseq [text ["[\"triplex-scope-v1\",\"prod\",\"租户\",\"db/with space\",9007199254740991]"
                "[\"triplex-scope-v1\",\"test\",\"test\",\"cx-vda00\",0]"]]
    (let [name (gateway/scope-name text)]
      (is (= text (scope/scope-for name)))
      (is (= name (:db (gateway/create-scope! "datomic:mem://" text "legacy"))))
      (is (:deleted (gateway/delete-scope! "datomic:mem://" text))))))
(deftest database-lifecycle
  (let [base "datomic:mem://" scope "[\"triplex-scope-v1\",\"test\",\"tenant\",\"da00\",1]"
        result (gateway/create-scope! base scope "legacy" false) name (:db result) db (d/db (gateway/connection (str base name)))]
    (is (= schema/schema-hash (:schemaHash result)))
    (is (= scope (gateway/stored-scope db)))
    (is (= :db.type/long (:db/valueType (d/entity db :triplex.tx/position))) )
    (is (false? (:created (gateway/create-scope! base scope "legacy" false))))
    (is (= {"t" "long" "v" "0"} (:position (gateway/basis base name))))
    @(d/transact (gateway/connection (str base name)) [{:triplex.scope/key scope :triplex.scope/position 7}])
    (is (false? (:created (gateway/create-scope! base scope "legacy" false))))
    (is (= {"t" "long" "v" "7"} (:position (gateway/basis base name))))
    ;; [EXP-DA01] Why: replay the actual late initializer transaction after a writer advances. Rejected: sequential create alone (never enters its stale initialization branch).
    (gateway/initialize-scope! (str base name) scope "legacy" false)
    (is (= {"t" "long" "v" "7"} (:position (gateway/basis base name))))
    (is (thrown? Exception (gateway/initialize-scope! (str base name) "different-scope" "legacy" false)))
    (is (thrown? Exception (gateway/assert-scope db "other")))
    (is (:deleted (gateway/delete-scope! base scope)))
    (is (thrown? Exception (gateway/scope-name "[\"triplex-scope-v1\",\"test\",\"t\",\"d\",\"1\"]")))))
(deftest speculative-fact-store
  (let [base "datomic:mem://" scope "[\"triplex-scope-v1\",\"test\",\"tenant\",\"da01-speculation\",1]"
        name (:db (gateway/create-scope! base scope "legacy")) uri (str base name) conn (gateway/connection uri)
        db (d/db conn) handle (:handle (storage/begin! name db))
        row {:id "support-1" :entity_id "subject" :attribute ":value" :value_type "number"
             :value_number -0.0 :recorded_at 1.5 :recorded_position 1 :valid_from 1.0 :schema_version 1 :tx_id "tx-1"}
        input (row-input {"sourceK" 0 "position" 1 "operationId" "operation-1" "rows" [(storage/wire-row row)] "newIds" ["support-1"] "claims" []})]
    (try
      (let [speculative (:db-after (d/with db (storage/tx-data db input)))]
        (is (some? (d/entid speculative [:f/id "support-1"])))
        (is (nil? (d/entid (d/db conn) [:f/id "support-1"])))
        (is (= Long/MIN_VALUE (Double/doubleToRawLongBits (double (query/scalar speculative (d/entid speculative [:f/id "support-1"])))))))
      (is (= 1 (count (:rows (storage/read-rows name db {"handle" handle "staged" input "pattern" {} "basis" {"validAt" 2.0}})))))
      (let [commit (storage/commit! name conn db input) current (gateway/sync-db uri)]
        (is (pos? (:datoms commit)))
        (is (= "committed" (:status (storage/operation current "operation-1"))))
        (is (= 1 (count (:rows (query/run name current {"edn" "[:find ?id :in $ $rules :where [?f :f/id ?id] [(triplex.gateway.query/visible $ ?f 2.0 nil nil)]]" "relations" [] "timeoutMs" 1000}))))))
      (let [current (gateway/sync-db uri)
            claim-input {"sourceK" 1 "position" 2 "operationId" "claim-operation" "rows" [] "newIds" []
                         "claims" [{"commandId" "claim-only" "txId" "claim-tx" "timestamp" 7.25}]}]
        (storage/commit! name conn current claim-input)
        (let [tx (d/entity (gateway/sync-db uri) [:triplex.tx/operation-id "claim-operation"])]
          (is (= "claim-tx" (:triplex.tx/id tx)))
          (is (= 7.25 (:triplex.tx/recorded-at tx)))))
      (is (thrown? Exception (canonical/normalize '[:find ?x :in $ $rules :where [(clojure.core/slurp "/etc/passwd") ?x]])))
      (finally (storage/release! name handle) (gateway/delete-scope! base scope)))))
;; [EXP-DA01] Why: instrument actual Peer index calls so a correct row answer cannot hide a scope/commit scan (D-D4/D-D5). Rejected: asserting generated query text without exercising the engine.
(deftest indexed-read-routes
  (let [base "datomic:mem://" scope "[\"triplex-scope-v1\",\"test\",\"test\",\"r3-index-routes\",0]"
        name (:db (gateway/create-scope! base scope "legacy")) uri (str base name) conn (gateway/connection uri)
        make-row (fn [i] {:id (str "f" i) :entity_id (if (< i 3) "selected" "unrelated") :attribute ":v"
                          :value_type "number" :value_number (double i) :recorded_at 10.0 :recorded_position 1
                          :valid_from 0.0 :schema_version 1 :tx_id "tx1"})
        rows (mapv make-row (range 100))]
    (try
      (storage/commit! name conn (gateway/sync-db uri) (row-input {"sourceK" 0 "position" 2 "operationId" "first" "rows" (mapv storage/wire-row rows) "newIds" (mapv :id rows) "claims" []}))
      (storage/commit! name conn (gateway/sync-db uri) {"sourceK" 2 "position" 3 "operationId" "empty" "rows" [] "newIds" [] "claims" []})
      (let [db (gateway/sync-db uri) datoms d/datoms index-range d/index-range seeks (atom []) subject-seeks (atom [])]
        (with-redefs [d/datoms (fn [db index & components]
                                ;; [DX-B7] Why: modern facts use an entity-bound f/id seek for their asserting tx.
                                ;; Rejected: allowing attribute-wide scans; retain the no-scope-scan assertion.
                                (when (and (some #{:f/id :triplex.tx/position} components)
                                           (not (and (= :eavt index) (= 2 (count components)) (integer? (first components)))))
                                  (throw (Exception. "Forbidden scope or position scan")))
                                (when (= index :vaet) (swap! subject-seeks conj components))
                                (apply datoms db index components))
                      d/index-range (fn [db attr start end] (swap! seeks conj [attr start end]) (index-range db attr start end))]
          (doseq [p [1 2 0]] (is (some? (storage/at-position db p))))
          (is (= [[:triplex.tx/position 1 nil] [:triplex.tx/position 2 nil]] @seeks))
          (let [result (storage/read-rows name db {"entityIds" ["selected" "missing" "selected"] "basis" {"validAt" 30.0 "recordedPosition" 1}})]
            (is (= 3 (count (:rows result))))
            (is (= "as-of" (:route result)))
            (is (= 1 (count @subject-seeks))))
          (is (empty? (:rows (storage/read-rows name db {"entityIds" [] "basis" {"validAt" 30.0}})))))
        (doseq [p [0 1 2 3]]
          (is (<= (d/basis-t (storage/at-position db p)) (d/basis-t db))))
        (doseq [basis [{"validAt" 30.0 "recordedAt" 10.0} {"validAt" 30.0 "recordedAt" 10.0 "recordedPosition" 3} {"validAt" 30.0 "recordedPosition" 1}]]
          (try (storage/read-rows name db {"route" "live" "entityIds" ["selected"] "basis" basis})
               (is false "Position-retired route should refuse")
               (catch clojure.lang.ExceptionInfo e (is (= "BasisNotAvailable" (:code (ex-data e)))))))
        (try (query/run name db {"edn" "[:find ?f :in $ $rules :where [?f :f/live _]]" "relations" [] "basis" {"validAt" 30.0 "recordedAt" 10.0} "timeoutMs" 1000})
             (is false "Native live index must refuse record time")
             (catch clojure.lang.ExceptionInfo e (is (= "BasisNotAvailable" (:code (ex-data e))))))
        (let [calls (atom 0) deadline (System/nanoTime)]
          (try (storage/await-position db 4 40 (fn [_] (swap! calls inc) db)) (is false "Future should refuse")
               (catch clojure.lang.ExceptionInfo e (is (= "BasisNotAvailable" (:code (ex-data e))))))
          (is (pos? @calls))
          (is (>= (- (System/nanoTime) deadline) 35000000)))
        (let [waiting (promise) release (promise)
              reader (future (storage/await-position db 4 2000 (fn [_] (deliver waiting true) (deref release 1500 nil) (gateway/sync-db uri))))]
          (is (deref waiting 1000 false))
          (storage/commit! name conn (gateway/sync-db uri) {"sourceK" 3 "position" 4 "operationId" "caught-up" "rows" [] "newIds" [] "claims" []})
          (deliver release true)
          (is (= 4 (storage/head-position (deref reader 2000 nil))))))
      (finally (is (:deleted (gateway/delete-scope! base scope)))))))

;; [EXP-DA01] Why: classify the native grammar rather than two known attribute bindings; historical eligibility is checked by the shared storage route guard. Rejected: a growing string blacklist.
(deftest native-route-classification
  (doseq [q '[[:find ?id :in $ $rules :where [?f :f/subject ?s] [?f :f/id ?id]]
              [:find ?x :in $ $rules :where [$rules "r" ?s ?x]]
              [:find ?x :in $ $rules :where (not-join [?x] [?f :f/id ?x])]
              {:find [?x] :in [$ $rules] :where [[?f :f/id ?x]]}]]
    (is (= :f/subject (query/query-route (canonical/normalize q)))))
  (doseq [q '[[:find ?f :in $ $rules :where [?f :f/live _]]
              [:find ?f :in $ $rules :where [(ground :f/live) ?a] [?f ?a _]]
              [:find ?f :in $ $rules :where [?a :db/ident :f/live] [?f ?a _]]
              [:find ?f :in $ $rules :where [$ ?f ?a _]]
              [:find ?f :in $ $rules :where [?f 123 _]]
              [:find ?f :in $ $rules :where [?f [:db/ident :f/live] _]]
              [:find ?f :in $ $rules :where [?f]]
              [:find ?f :in $ $rules :where (not-join [?f] [?f ?a _])]
              [:find ?f :in $ $rules :where (or-join [?f] (and [?f ?a _]))]
              {:find [?f] :in [$ $rules] :where [[(ground :f/live) ?a] [?f ?a _]]}]]
    (is (= :f/live (query/query-route (canonical/normalize q))))))

;; [EXP-DA01] Why: generated equivalent section layouts must have one canonical execution map and route proof; ambiguous inputs, rule calls and pull patterns refuse before Peer execution. Rejected: enumerating only the review's two duplicate strings.
(deftest canonical-query-properties
  (doseq [seed (range 96) attribute [:f/subject :f/live]]
    (let [f (symbol (str "?fact" seed)) id (symbol (str "?id" seed))
          patterns (if (even? seed) [[f :f/id id] [f attribute '_]] [[f attribute '_] [f :f/id id]])
          clauses (conj (vec patterns) (list 'not-join [f] [f :f/id "never"]))
          base {:find [id] :in '[$ $rules] :where clauses}
          surfaces [base (update base :where #(apply list %))
                    (vec (concat [:find id :in '$ '$rules :where] clauses))
                    (vec (concat [:find id :in '$ '$rules :where (first clauses) :in '$ '$rules :find id :where] (rest clauses)))]]
      (doseq [surface surfaces]
        (let [q (canonical/parse (pr-str surface))]
          (is (= (canonical/normalize base) q))
          (is (= q (canonical/normalize q)))
          (is (= attribute (query/query-route q)))))))
  (doseq [text ["[:find ?id :in $ $rules :where [?f :f/id ?id] :where [?f :f/live _]]"
                "[:find ?id :in $ $rules :where [?f :f/id ?id] :find ?id :where [?f :f/live _]]"]]
    (is (= :f/live (query/query-route (canonical/parse text)))))
  (doseq [text ["[:find ?id :in $ $rules :where [?f :f/id ?id] :in $rules $]"
                "[:find ?id :in $ $rules :where [?f :f/id ?id] :find ?f]"
                "[:find ?id :in $ $rules :rules [[(r ?f) [?f :f/live _]]] :where (r ?id)]"
                "[:find (pull ?f [:f/live]) :in $ $rules :where [?f :f/id ?id]]"
                "[:find ?id :in $ % :where (r ?id)]"
                "[:find ?id :in $ $rules :where [?f :f/id ?id]] [:find ?other]"
                "{:find [?id] :in [$ $rules] :where [[?f :f/id ?id]] :unknown []}"]]
    (try (canonical/parse text) (is false "Unsupported/ambiguous query must refuse")
         (catch clojure.lang.ExceptionInfo e (is (= "InvalidValue" (:code (ex-data e))))))))

 ;; [DX-B7-S3] Why: verification must detect two visible row sets with one revision on both layouts.
;; Rejected: comparing cache counts only, or exercising only ordinary revision-incrementing commits.
(deftest parsed-revision-cache-verification
  (doseq [layout ["legacy" "lean"]]
    (let [scope (str "[\"triplex-scope-v1\",\"test\",\"b7\",\"cache-" layout "\",0]")
          name (:db (gateway/create-scope! "datomic:mem://" scope layout))
          uri (gateway/db-uri name) conn (gateway/connection uri)
          row {:id "b7-live" :entity_id "root" :attribute ":v" :value_type "string"
               :value_string "line\nΩ" :recorded_at 10.0 :recorded_position 1 :valid_from 0.0 :schema_version 1 :tx_id "tx1"}]
      (try
        (storage/commit! name conn (gateway/sync-db uri)
          (row-input {"sourceK" 0 "position" 1 "operationId" "b7-original"
                      "rows" [(storage/wire-row row)] "newIds" ["b7-live"] "claims" []}))
        (with-redefs [entity-cache/verify-enabled true]
          (let [db (gateway/sync-db uri) cfg (reach/config name db)
                first-answer (reach/read-entity name db cfg "root" 10.0 (long-array 1))
                cached (reach/read-entity name db cfg "root" 10.0 (long-array 1))
                eid (d/entid db [:triplex.entity/id "root"])]
            (is (= first-answer cached))
            (is (pos? (:verified (entity-cache/stats))))
            ;; Deliberately bypass the gateway's revision invariant as a negative fixture.
            @(d/transact conn [[:db/add eid :triplex.entity/row (row-text (assoc row :id "b7-extra" :value_string "different"))]])
            (let [changed (gateway/sync-db uri)]
              (is (= 1 (storage/value changed eid :triplex.entity/rev)))
              (is (thrown-with-msg? clojure.lang.ExceptionInfo #"Different entity bytes"
                    (reach/read-entity name changed cfg "root" 10.0 (long-array 1)))))))
        (finally (gateway/delete-scope! "datomic:mem://" scope))))))

;; [DX-B7-S3] Why: byte eviction and oversize bypass must be exercised independently of a warm fixture's size.
;; Rejected: declaring a byte bound from an entry count or silently retaining oversize entries.
(deftest parsed-cache-byte-budget
  (let [name "b7-budget" key #(vector name % 1) value #(hash-map :bytes 600 :texts [%] :json (str %))]
    (try
      (with-redefs [entity-cache/budget 1024 entity-cache/verify-enabled true]
        (is (= (value "a") (entity-cache/lookup (key 1) #(value "a"))))
        (is (= (value "b") (entity-cache/lookup (key 2) #(value "b"))))
        (is (<= (:bytes (entity-cache/stats)) 1024))
        (is (nil? (.get entity-cache/entries (key 1))))
        (is (= (value "b") (entity-cache/lookup (key 2) #(value "b"))))
        (is (thrown-with-msg? clojure.lang.ExceptionInfo #"Different entity bytes"
              (entity-cache/lookup (key 2) #(value "wrong"))))
        (entity-cache/lookup (key 3) #(assoc (value "large") :bytes 2048))
        (is (nil? (.get entity-cache/entries (key 3)))))
      (finally (entity-cache/forget! name)))))

;; [DX-B7-S2] Why: force generation rotation while concurrent responses and repairs use the same session.
;; Rejected: only testing a million-entry session that never resets, or checking only response counts.
(deftest concurrent-session-generations
  (let [scope "[\"triplex-scope-v1\",\"test\",\"b7\",\"session-reset\",0]"
        name (:db (gateway/create-scope! "datomic:mem://" scope "legacy")) uri (gateway/db-uri name)
        conn (gateway/connection uri)
        rows (vec (mapcat (fn [i]
                           [{:id (str "r" i) :entity_id (str "root-" i) :attribute ":v" :value_type "ref"
                             :value_string (str "leaf-" i) :recorded_at 10.0 :recorded_position 1 :valid_from 0.0 :schema_version 1 :tx_id "tx1"}
                            {:id (str "l" i) :entity_id (str "leaf-" i) :attribute ":v" :value_type "string"
                             :value_string (str "value-" i) :recorded_at 10.0 :recorded_position 1 :valid_from 0.0 :schema_version 1 :tx_id "tx1"}]) (range 4)))
        expected (into {} (map (fn [r] (let [text (row-text r)]
                                        [(:entity_id r) [(json/read-str (subs text (.indexOf ^String text "[")))]])) rows))]
    (try
      (storage/commit! name conn (gateway/sync-db uri)
        (row-input {"sourceK" 0 "position" 1 "operationId" "b7-session-seed"
                    "rows" (mapv storage/wire-row rows) "newIds" (mapv :id rows) "claims" []}))
      (with-redefs [reach/session-entry-limit 2 admission/reads (java.util.concurrent.Semaphore. 2 true)]
        (let [db (gateway/sync-db uri) basis {"validAt" 10.0 "recordedPosition" 1}
              input #(hash-map "roots" [%] "basis" basis "session" "b7-rotations")
              _ (reach/response name db (input "root-0"))
              state (reach/session-map name "b7-rotations") old @state
              old-entries (into {} (:entries old))]
          (doseq [round (range 20)]
            (let [requests (mapv (fn [i]
                                   (future
                                     (let [root (str "root-" (mod (+ i round) 4))
                                           body (json/read-str (reach/response name db (input root)))]
                                       (is (= 1 (get body "position")))
                                       (is (= (str (d/basis-t db)) (get body "t")))
                                       (is (= #{root (str "leaf-" (mod (+ i round) 4))} (set (map first (get body "entities")))))
                                       (is (= [[root [root (str "leaf-" (mod (+ i round) 4))]]] (get body "closures")))
                                       (is (= 2 (count (get body "entities"))))
                                       (doseq [entity (get body "entities")]
                                         (let [[id rev inline] entity
                                               repaired (when-not inline
                                                          (json/read-str (reach/response name db (assoc (input root) "need" [id]))))
                                               entry (if inline entity (first (get repaired "entities")))]
                                           (is (= 1 rev))
                                           (is (= [id 1 (expected id)] entry))))))) (range 256))]
              (doseq [request requests] (is (not= ::timeout (deref request 30000 ::timeout))))))
          (is (= old-entries (into {} (:entries old))) "An old generation is never cleared under its in-flight builders")
          (is (not (identical? old @state)))
          (is (<= (.size ^java.util.concurrent.ConcurrentHashMap (:entries @state)) 2))
          (println (json/write-str {:sessionResetRounds 20 :concurrentResponses 5120 :entryLimit 2}))))
      (finally (gateway/delete-scope! "datomic:mem://" scope)))))

 ;; [DX-B7-S3] Why: a late old-generation cache insertion must not poison a recreated database with the same eid/revision.
;; Rejected: relying on database names or lazy config recreation for identity.
(deftest cache-connection-generations
  (let [scope "[\"triplex-scope-v1\",\"test\",\"b7\",\"connection-generation\",0]"
        name (:db (gateway/create-scope! "datomic:mem://" scope "legacy")) uri (gateway/db-uri name)
        old-view (gateway/connection-view uri)
        row {:id "b7-generation" :entity_id "root" :attribute ":v" :value_type "string" :value_string "before"
             :recorded_at 10.0 :recorded_position 1 :valid_from 0.0 :schema_version 1 :tx_id "tx1"}
        seed! (fn [view row] (storage/commit! name (:conn view) (gateway/sync-db uri)
                              (row-input {"sourceK" 0 "position" 1 "operationId" "generation-seed"
                                          "rows" [(storage/wire-row row)] "newIds" [(:id row)] "claims" []})))]
    (try
      (seed! old-view row)
      (let [old-db (gateway/sync-db uri) cfg (reach/config name old-db) eid (d/entid old-db [:triplex.entity/id "root"])
            old-value (reach/parse-entity old-db cfg eid 1 100000)]
        (gateway/delete-scope! "datomic:mem://" scope)
        (gateway/create-scope! "datomic:mem://" scope "legacy")
        (let [view (gateway/connection-view uri) row (assoc row :value_string "after")]
          (is (not (identical? (:generation old-view) (:generation view))))
          (seed! view row)
          (let [db (gateway/sync-db uri) cfg (reach/config name db)
                expected (json/read-str (subs (row-text row) (.indexOf ^String (row-text row) "[")))]
            ;; [DX-B7-S3] Why: model the late builder after config removal, with an intentionally old parsed value.
            ;; Rejected: only checking that a token changed without observing the resulting answer bytes.
            (with-redefs [reach/parse-entity (fn [& _] old-value) entity-cache/verify-enabled false]
              (reach/read-entity name db (assoc cfg :connection-generation (:generation old-view)) "root" 10.0 (long-array 1)))
            (let [body (json/read-str (reach/response name db {"roots" ["root"] "basis" {"validAt" 10.0} "full" true} (:generation view)))]
              (is (= [["root" 1 [expected]]] (get body "entities")))))))
      (finally (gateway/delete-scope! "datomic:mem://" scope)))))

 ;; [DX-B7-S4] Why: revision aliases are cut-bound, byte-bounded and re-read in verification mode.
;; Rejected: reusing head revisions at old cuts or repopulating a detached memo view.
(deftest revision-memo-cuts-and-budget
  (let [name "b7-revisions" epoch (Object.) cfg (Object.) reads (atom 0)]
    (try
      (with-redefs [entity-cache/budget 8192 entity-cache/verify-enabled false]
        (let [a (entity-cache/revision-view [name epoch cfg 100])]
          (is (= 1 (entity-cache/revision a 10 #(do (swap! reads inc) 1)) ))
          (is (= 1 (entity-cache/revision a 10 #(do (swap! reads inc) 1)) ))
          (is (= 1 @reads) "An immutable-cut hit performs no second index seek")
          (let [b (entity-cache/revision-view [name epoch cfg 101])]
            (is (= 2 (entity-cache/revision b 10 (constantly 2))))
            (is (<= (:revisionBytes (entity-cache/stats)) 1024))
            (is (<= (:bytes (entity-cache/stats)) 8192))
            (is (= 9 (entity-cache/revision a 99 (constantly 9))))
            (is (not (.containsKey ^java.util.concurrent.ConcurrentHashMap (:entries a) 99)))
            (with-redefs [entity-cache/verify-enabled true]
              (is (= 2 (entity-cache/revision b 10 #(do (swap! reads inc) 2))))
              (is (= 2 @reads))
              (is (thrown-with-msg? clojure.lang.ExceptionInfo #"Different entity bytes"
                    (entity-cache/revision b 10 (constantly 3))))))))
      (finally (entity-cache/forget! name)))))

 ;; [DX-R3] Why: exercise non-replay-safe SPI commits at the native serial point, in both head layouts.
;; Rejected: mocking peer clock validation (cannot reject a late optimistic writer).
(deftest strict-record-clock-policy
  (doseq [head-v2 [false true] strict [false true]]
    (let [scope-text (str "[\"triplex-scope-v1\",\"test\",\"dxr3\",\"strict-" head-v2 "-" strict "\",0]")
          base "datomic:mem://"
          created (gateway/create-scope! base scope-text "lean" head-v2 strict)
          name (:db created) uri (gateway/db-uri name) conn (gateway/connection uri)
          write! (fn [p clock]
                   (storage/commit! name conn (gateway/sync-db uri)
                     (row-input {"sourceK" (dec p) "position" p "operationId" (str "strict-" p)
                                 "rows" [(storage/wire-row {:id (str "strict-row-" p) :entity_id "root" :attribute ":v"
                                           :value_type "string" :value_string (str p) :recorded_at clock
                                           :recorded_position p :valid_from 0.0 :schema_version 1 :tx_id (str "tx-" p)})]
                                 "newIds" [(str "strict-row-" p)]
                                 "claims" [{"commandId" (str "command-" p) "txId" (str "tx-" p) "timestamp" (long clock)}]
                                 "replaySafe" false "assignRecordTime" false})))]
      (try
        (is (= strict (:strictRecordClocks created)))
        (is (= strict (:strictRecordClocks (gateway/create-scope! base scope-text "lean" head-v2 (not strict))))
            "Reopening cannot enable or disable the immutable policy")
        (gateway/initialize-scope! uri scope-text "lean" head-v2 (not strict))
        (is (= strict (:strictRecordClocks (gateway/create-scope! base scope-text "lean" head-v2 strict)))
            "A stale bootstrap transaction cannot alter the policy")
        (write! 1 100.0)
        (write! 2 101.0)
        (let [cap (json/read-str (reach/replica-capability name (gateway/sync-db uri) {"basis" {"validAt" 0.0}}))]
          (is (true? (get cap "supported")))
          (is (= strict (get cap "strictRecordClocks"))))
        (if strict
          (do
            (doseq [clock [100.0 101.0]]
              (let [error (try (write! 3 clock) nil (catch clojure.lang.ExceptionInfo e e))]
                (is (some? error))
                (is (= "ClockConflict" (:code (ex-data error))))
                (is (.contains (str (.getMessage error)) "strictRecordClocks"))
                (is (.contains (str (.getMessage error)) "fresh non-strict scope"))
                (is (= 2 (storage/head-position name (gateway/sync-db uri))))))
            (is (thrown? clojure.lang.ExceptionInfo
                  (storage/commit! name conn (gateway/sync-db uri)
                    (row-input {"sourceK" 2 "position" 3 "operationId" "mixed-clocks" "assignRecordTime" false "newIds" ["mixed-a" "mixed-b"] "claims" []
                                "rows" (mapv (fn [[id clock]] (storage/wire-row
                                         {:id id :entity_id "root" :attribute ":v" :value_type "string" :value_string id
                                          :recorded_at clock :recorded_position 3 :valid_from 0.0 :schema_version 1 :tx_id "mixed"}))
                                         [["mixed-a" 102.0] ["mixed-b" 103.0]])}))))
            (is (= 2 (storage/head-position name (gateway/sync-db uri))))
            (storage/commit! name conn (gateway/sync-db uri)
              (row-input {"sourceK" 2 "position" 3 "operationId" "claim-only" "assignRecordTime" false "rows" [] "newIds" []
                          "claims" [{"commandId" "claim-only" "txId" "claim-tx" "timestamp" 102.0}]}))
            (is (= 102.0 (scope/max-recorded-at (gateway/sync-db uri) (scope/entity (gateway/sync-db uri)))))
            (is (thrown? clojure.lang.ExceptionInfo (write! 4 102.0))))
          (do (write! 3 100.0) (is (= 3 (storage/head-position name (gateway/sync-db uri))))))
        (finally (gateway/delete-scope! base scope-text))))))

;; [DX-T1-5] Why: default strict writes allocate at the actual serial point in both stored layouts/head versions.
;; Rejected: proving assignment through a mock client, or treating valid time as the assigned record clock.
(deftest server-assigned-record-clock
  (doseq [layout ["lean" "legacy"] head-v2 [false true] strict [false true]]
    (let [scope-text (str "[\"triplex-scope-v1\",\"test\",\"dxt1\",\"server-clock-" layout "-" head-v2 "-" strict "\",0]")
          base "datomic:mem://" created (gateway/create-scope! base scope-text layout head-v2 strict)
          name (:db created) uri (gateway/db-uri name) conn (gateway/connection uri)
          write! (fn [p clock & [extra]]
                   (storage/commit! name conn (gateway/sync-db uri)
                     (row-input {"sourceK" (dec p) "position" p "operationId" (str "server-" p) "replaySafe" false
                       "newIds" [(str "row-" p)] "claims" []
                       "rows" [(storage/wire-row (merge {:id (str "row-" p) :entity_id "root" :attribute ":v" :value_type "string"
                          :value_string "v" :recorded_at clock :recorded_position p :valid_from -500.0 :valid_to 5000.0
                          :schema_version 1 :tx_id (str "tx-" p)} extra))]})))]
      (try
        (is (= 100.0 (codec/decode-value (:recordedAt (write! 1 100.0)))))
        (is (= (if strict 101.0 7.0) (codec/decode-value (:recordedAt (write! 2 7.0)))))
        (let [db (gateway/sync-db uri) rows (map storage/decode-row (:rows (storage/read-rows name db {"history" true})))
              second (first (filter #(= "row-2" (:id %)) rows))]
          (is (= (if strict 101.0 7.0) (:recorded_at second)))
          (is (= -500.0 (:valid_from second))) (is (= 5000.0 (:valid_to second)))
          (is (= (if strict 101.0 7.0) (codec/decode-value (:recordedAt (storage/operation db "server-2"))))))
        (write! 3 1.0 {:attribute ":_tx/instant" :value_type "datetime" :value_string nil :value_datetime 42.0})
        (let [row (first (map storage/decode-row (:rows (storage/read-rows name (gateway/sync-db uri) {"id" "row-3" "history" true}))))]
          (is (= (if strict 102.0 1.0) (:recorded_at row)))
          (is (= 42.0 (:value_datetime row)) "Untyped journal-looking values remain application data"))
        (when strict
          (write! 4 1.0e20)
          (is (> (codec/decode-value (:recordedAt (write! 5 1.0e20))) 1.0e20))
          (write! 6 Double/MAX_VALUE)
          (let [error (try (write! 7 0.0) nil (catch clojure.lang.ExceptionInfo e e))]
            (is (= "ClockExhausted" (:code (ex-data error))))
            (is (= 6 (storage/head-position name (gateway/sync-db uri))))))
        (finally (gateway/delete-scope! base scope-text))))))

(defn -main [& _]
  (let [{:keys [fail error] :as result} (with-redefs [gateway/uri-template "datomic:mem://{db}"] (run-tests 'triplex.gateway.selftest))]
    (println (json/write-str result))
    (shutdown-agents)
    (System/exit (if (zero? (+ fail error)) 0 1))))
