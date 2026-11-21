(ns triplex.gateway.selftest
  (:require [clojure.test :refer :all] [triplex.gateway.transaction-shape :as tx-shape] [clojure.data.json :as json] [datomic.api :as d]
            [ring.core.protocols :as protocols] [triplex.gateway.trace :as trace]
            [triplex.gateway.jfr :as jfr] [triplex.gateway.slim :as slim] [triplex.gateway.admission :as admission] [triplex.gateway.reach :as reach] [triplex.gateway.entity-cache :as entity-cache] [triplex.gateway.lean :as lean] [triplex.gateway.canonical :as canonical] [triplex.gateway.scope :as scope] [triplex.gateway.storage :as storage] [triplex.gateway.query :as query] [triplex.gateway.main :as gateway] [triplex.gateway.codec :as codec] [triplex.gateway.schema :as schema] [triplex.gateway.layout-replay :as replay]))

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
;; [DX-T1-15] Why: a real initialized scope can reopen with exactly one sync and no metadata transaction.
;; Rejected: inferring this from a mocked database or exercising only the new-scope path.
(deftest initialized-scope-reopen-uses-one-peer-cut
  (let [base "datomic:mem://"
        scope "[\"triplex-scope-v1\",\"test\",\"tenant\",\"single-reopen\",1]"
        created (gateway/create-scope! base scope "lean" true true)
        name (:db created)
        sync-db gateway/sync-db
        syncs (atom 0)]
    (try
      (let [conn (gateway/connection (str base name))
            before (d/basis-t (d/db conn))]
        (with-redefs [gateway/sync-db (fn [uri]
                                      (when (> (swap! syncs inc) 1) (throw (Exception. "Repeated sync")))
                                      (sync-db uri))
                      d/transact (fn [& _] (throw (Exception. "Reopen attempted a metadata write")))]
          (is (= (assoc created :created false) (gateway/create-scope! base scope "legacy" false false))))
        (is (= 1 @syncs))
        (is (= before (d/basis-t (d/db conn)))))
      (finally (gateway/delete-scope! base scope)))))

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
  (doseq [compressed [false true] layout ["lean" "legacy"] head-v2 [false true] strict [false true]]
    (let [scope-text (str "[\"triplex-scope-v1\",\"test\",\"dxt1\",\"server-clock-" compressed "-" layout "-" head-v2 "-" strict "\",0]")
          base "datomic:mem://" created (with-redefs [gateway/slim-rows? compressed] (gateway/create-scope! base scope-text layout head-v2 strict))
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


;; [DX-T1-5] Why: a byte census must inspect real immutable log datoms and refuse a foreign position/operation.
;; Rejected: proving only a JSON aggregation helper on fabricated output.
(deftest transaction-shape-binding
  (let [scope-text "[\"triplex-scope-v1\",\"test\",\"dxt1\",\"census\",0]"
        base "datomic:mem://" name (:db (gateway/create-scope! base scope-text "lean"))
        uri (gateway/db-uri name) conn (gateway/connection uri)]
    (try
      (let [report @(d/transact conn [{:db/id "datomic.tx" :triplex.tx/operation-id "census-op" :triplex.tx/position 1}
                                     {:triplex.entity/id "census-e" :triplex.entity/rev 1}])
            db (:db-after report) actual (tx-shape/transaction db (d/log conn) {"operationId" "census-op" "position" 1})]
        (is (= 1 (:position actual)))
        (is (= "census-op" (:operationId actual)))
        (is (= (:datoms actual) (reduce + (map :datoms (:attributes actual)))))
        (is (= (:valueUtf8Bytes actual) (reduce + (map :valueUtf8Bytes (:attributes actual)))))
        (is (pos? (:ednUtf8Bytes actual)))
        (is (thrown? Exception (tx-shape/transaction db (d/log conn) {"operationId" "census-op" "position" 2})))
        (is (thrown? Exception (tx-shape/transaction db (d/log conn) {"operationId" "foreign-op" "position" 1}))))
      (finally (gateway/delete-scope! base scope-text)))))

;; [DX-T1-6] Why: both revision indexes must produce identical real Peer transactions and reject the same stale source.
;; Rejected: testing an index-name string or changing the native row layout to make the lookup cheaper.
(deftest revision-index-equivalence
  (doseq [layout ["lean" "legacy"] head-v2 [true false]]
    (let [base "datomic:mem://" scope-text (str "[\"triplex-scope-v1\",\"test\",\"test\",\"rev-index-" layout "-" head-v2 "\",0]")
          name (:db (gateway/create-scope! base scope-text layout head-v2 false)) conn (gateway/connection (gateway/db-uri name))
          input (fn [source p]
                  (row-input {"sourceK" source "position" p "operationId" (str "rev-index-" p)
                              "rows" [(storage/wire-row {:id (str "rev-row-" p) :entity_id "subject" :attribute ":v"
                                        :value_type "number" :value_number (double p) :recorded_at (double p)
                                        :recorded_position p :valid_from 0.0 :schema_version 1 :tx_id (str "rev-tx-" p)})]
                              "newIds" [(str "rev-row-" p)] "claims" []}))]
      (try
        (storage/commit! name conn (gateway/sync-db (gateway/db-uri name)) (input 0 1))
        (let [db (gateway/sync-db (gateway/db-uri name))
              variants (fn [source flag]
                         (let [data (storage/tx-data db (input source 2))]
                           [(update-in (first data) [1] assoc :rev-aevt flag)]))
              a (d/with db (variants 1 false)) b (d/with db (variants 1 true))
              canonical (fn [report]
                          (set (for [d (:tx-data report) :when (not= (:a d) (d/entid db :db/txInstant))]
                                 [(:e d) (:a d) (:v d) (:added d)])))]
          (is (= (canonical a) (canonical b)))
          (is (thrown? Exception (d/with db (variants 0 false))))
          (is (thrown? Exception (d/with db (variants 0 true)))))
        (finally (gateway/delete-scope! base scope-text))))))

;; [DX-T1-8] Why: physical compression must preserve every code unit and fail on corrupt storage before yielding a row.
;; Rejected: checking a size ratio alone or replacing signed-zero, Unicode or pinned history assertions.
(deftest slim-row-codec
  (doseq [suffix [(apply str (repeat 200 "duplicate row metadata"))
                  (str (apply str (repeat 200 "日本語🙂")) (char 0xd800) "separate" (char 0xdcff))
                  "[null,\"-0\",123,true,false]" ""]]
    (let [header "indexed-prefix" encoded (slim/encode (str header suffix) (+ 2 (count header)))]
      (is (.startsWith ^String encoded header))
      (is (= suffix (slim/body (subs encoded (count header)))))))
  (let [frame (subs (slim/encode (str "prefix" (apply str (repeat 1000 "a"))) 8) 6)]
    (is (.startsWith ^String frame "Z1"))
    (is (thrown? Exception (slim/body (subs frame 0 (- (count frame) 4)))))
    (is (thrown? Exception (slim/body (str frame "AAAA")))))
  (doseq [frame ["Z1" "Z1ffffffffAAAA" "Z100000001AAAA" "Z100000001!!!!"]]
    (is (thrown? Exception (slim/body frame)))))

(deftest slim-layout-is-immutable-and-opt-in
  (let [base "datomic:mem://" scope-text "[\"triplex-scope-v1\",\"test\",\"dxt1\",\"slim-layout\",0]"
        created (with-redefs [gateway/slim-rows? true] (gateway/create-scope! base scope-text "lean"))
        name (:db created) conn (gateway/connection (str base name))
        text (apply str (repeat 200 "repeated exact value"))
        row {:id "slim-row" :entity_id "root" :attribute ":v" :value_type "string" :value_string text
             :recorded_at 1.0 :recorded_position 1 :valid_from -5.0 :schema_version 1 :tx_id "slim-tx"}]
    (try
      (storage/commit! name conn (gateway/sync-db (str base name))
        (row-input {"sourceK" 0 "position" 1 "operationId" "slim-op" "newIds" ["slim-row"] "claims" [] "rows" [(storage/wire-row row)]}))
      (let [db (gateway/sync-db (str base name)) datom (lean/by-id db "slim-row")]
        (is (= 4 (storage/value db (d/entid db [:triplex.scope/key scope-text]) :triplex.scope/rows-version)))
        (is (< (.length ^String (:v datom)) (count text)))
        (is (= text (:value_string (lean/decode (:v datom))))))
      (with-redefs [gateway/slim-rows? false] (gateway/create-scope! base scope-text "lean"))
      (is (= 4 (storage/value (gateway/sync-db (str base name)) (d/entid (gateway/sync-db (str base name)) [:triplex.scope/key scope-text]) :triplex.scope/rows-version)))
      (finally (gateway/delete-scope! base scope-text)))))

;; [DX-T1-11] Why: pure layout pricing must preserve original row values including escaped JSON and server clock assignment.
;; Rejected: infer exactness from a smaller datom count or let a hypothetical layout write the real connection.
(deftest speculative-layout-pricing
  (let [scope-text "[\"triplex-scope-v1\",\"test\",\"dxt1\",\"layout-replay\",0]"
        base "datomic:mem://" name (:db (gateway/create-scope! base scope-text "lean" true true))
        uri (gateway/db-uri name) conn (gateway/connection uri)]
    (try
      (let [raw (d/db conn) before (d/basis-t raw)
            db (:db-after (d/with raw (vec (concat replay/replay-schema (replay/functions)))))
            fact {:id "fact-a" :entity_id "root" :attribute ":v" :value_type "string"
                  :value_string "quotes \" and , commas [arrays] / slashes \\ and unicode λ" :recorded_at 100.0
                  :recorded_position 1 :valid_from -500.0 :valid_to 5000.0 :schema_version 1 :tx_id "journal"}
            change (assoc fact :id "change-a" :entity_id "journal" :entity_type "_Transaction"
                              :attribute ":_tx/change" :value_type "json" :value_string nil
                              :value_json (json/write-str {"tripleId" "fact-a" "recordedAt" 1.0 "text" "[,]\""}))
            input (row-input {"sourceK" 0 "scopeWide" false "position" 1 "operationId" "replay-op"
                              "newIds" ["fact-a" "change-a"] "claims" []
                              "rows" (mapv storage/wire-row [fact change])})
            payload (assoc (get-in (storage/tx-data raw input) [0 1]) :replay/head nil)
            a (replay/apply-one db "A" payload) expected (replay/logical-delta (:report a))]
        (doseq [shape replay/shapes]
          (let [result (replay/apply-one db shape payload) delta (replay/logical-delta (:report result))]
            (is (pos? (get-in result [:stats :fressianBytes])))
            (is (map? (get-in result [:stats :txStats])))
            (if (= shape "D") (is (= 1 (count delta))) (is (= expected delta)))))
        (is (= before (d/basis-t (d/db conn))))
        (is (= 0 (storage/head-position name (d/db conn))))
        (is (nil? (d/entid (d/db conn) :triplex.replay/packed))))
      (finally (gateway/delete-scope! base scope-text)))))

;; [DX-T1-12] Why: native normal tests must cover bounded identity lookup and quiet metrics before a 100k reading.
;; Rejected: a textual port counted as a scale/exactness PASS; these checks still owe a fresh JVM execution.
(deftest bounded-id-memo-and-current-identity-cut
  (let [m (reach/bounded-id-map 2 1024) calls (atom []) current (Object.) historical (Object.)]
    (.putIfAbsent m "a" 1) (.putIfAbsent m "b" 2)
    (is (= 2 (.size m))) (is (= 324 @m))
    (.putIfAbsent m "c" 3) (is (= 1 (.size m))) (is (nil? (.get m "a")))
    (is (= 162 @m))
    (.clear m) (is (zero? @m))
    (let [memo (reach/bounded-id-map 10 4096) cfg {:entity-ids memo :identity-db current}]
      (with-redefs [d/entid (fn [db [_ id]] (swap! calls conj [db id]) (when (= id "present") 42))]
        (is (= 42 (reach/entity-id historical "test" "present" cfg)))
        (is (= 42 (reach/entity-id historical "test" "present" cfg)))
        (is (nil? (reach/entity-id historical "test" "missing" cfg)))
        (is (nil? (reach/entity-id historical "test" "missing" cfg)))
        (is (= [[current "present"] [current "missing"] [current "missing"]] @calls))))))
(deftest quiet-metrics-and-native-io-context
  (let [rows (atom []) calls (atom [])]
    (with-redefs [triplex.gateway.trace/enabled true triplex.gateway.trace/native-enabled false
                  triplex.gateway.trace/emit! #(swap! rows conj %)
                  storage/transaction-hints (fn [& _] nil)
                  d/transact-async (fn [_ _ & opts] (swap! calls conj opts) (delay {}))]
      (triplex.gateway.trace/metrics {:ObjectCacheMisses 2})
      (is (= {:ObjectCacheMisses 2} (:metrics (first @rows))))
      (storage/submit! nil [] {} (atom {}))
      (is (= '(:io-context :triplex.gateway/commit) (first @calls))))))
(deftest object-cache-metric-shapes-do-not-invent-a-hit-rate
  (let [summary (triplex.gateway.trace/counter-summary {:ObjectCache {:sum 9 :count 10} :UnknownMetric 3})]
    (is (= 0.9 (get-in summary [:objectCache :hitRate])))
    (is (= 1 (get-in summary [:objectCache :misses])))
    (is (string? (get-in summary [:indexAdoptions :status]))))
  (doseq [value [nil 0.9 {:sum 0 :count 0} {:sum 11 :count 10} {:sum 1 :count Double/POSITIVE_INFINITY}]]
    (is (nil? (get-in (triplex.gateway.trace/counter-summary {:ObjectCache value}) [:objectCache :hitRate])))))

;; [DX-W1] Why: the installed transaction function must see used identities on the exact serialized basis.
;; Rejected: testing only a fresh ordered seed or accepting equality between two erroneous results.
(deftest one-history-range
  (let [base "datomic:mem://"
        scope (json/write-str ["triplex-scope-v1" "test" "test" (str (java.util.UUID/randomUUID)) 0])
        name (:db (gateway/create-scope! base scope "lean" true))
        conn (gateway/connection (str base name))
        id (fn [c] (str (apply str (repeat 25 "W")) c))
        row (fn [i entity] {:id i :entity_id entity :attribute ":value" :value_type "string" :value_string i
                            :recorded_at 100.0 :recorded_position 1 :valid_from 0.0 :schema_version 1 :tx_id "tx"})
        input (fn [items new-ids op]
                (row-input {"sourceK" nil "scopeWide" false "span" 1 "position" 1
                            "operationId" op "rows" (mapv storage/wire-row items) "newIds" new-ids
                            "claims" [{"commandId" op "txId" op "timestamp" 100.0}]}))
        fresh (fn [ids op] (input (mapv #(row % "owner") ids) ids op))
        retired (fn [r] (assoc r :retracted_at 101.0 :retracted_position 1 :retract_tx_id "retire"))
        commit! (fn [db in] (storage/commit! name conn db in))
        outcome (fn [db in] (try (commit! db in) :committed
                                 (catch Exception e (select-keys (ex-data e) [:status :code]))))
        conflict {:status 400 :code "IdentityConflict"}
        with-bounds (fn [in lo hi] (assoc in "historyIdentityBounds" [lo hi]))]
    (try
      (let [current (id "5") gone (id "8") born (id "B") legacy "imported/old"
            _ (commit! (d/db conn) (fresh [current gone legacy] "seed"))
            before-retire (d/db conn)
            _ (commit! before-retire (input [(retired (row gone "owner")) (retired (row born "owner"))] [born] "retire"))
            db (d/db conn)
            seek d/index-range
            ;; [DX-W1] Why: count actual lookups against the immutable history, including fallbacks in op order.
            ;; Rejected: asserting a branch flag without seeing the bounded and per-ID index calls.
            observe (fn [in]
                      (let [p (second (first (storage/tx-data db in))) calls (atom [])]
                        (with-redefs [d/index-range (fn [db a lo hi]
                                                     (when (= a :triplex.entity/row) (swap! calls conj [lo hi]))
                                                     (seek db a lo hi))]
                          (try (@replay/expand-a db p) (catch Exception e
                                                       (when-not (re-find #"TRIPLEX_IDENTITY f/id" (str e)) (throw e)))))
                        @calls))
            pfx storage/row-prefix]
        (is (seq (d/index-range before-retire :triplex.entity/row (pfx gone) (str (pfx gone) "~"))))
        (is (empty? (d/index-range db :triplex.entity/row (pfx gone) (str (pfx gone) "~"))))
        (is (seq (d/index-range (d/history db) :triplex.entity/row (pfx gone) (str (pfx gone) "~"))))
        (doseq [[label ids bounds expected]
                [["empty range" [(id "4") (id "2") (id "3")] [(id "2") (id "4")] 1]
                 ["adjacent occupied range" [(id "4") (id "6")] [(id "4") (id "6")] 3]
                 ["only a retracted neighbor lies inside" [(id "7") (id "9")] [(id "7") (id "9")] 3]
                 ["highest ASCII endpoint" [(id "Z") (id "Y")] [(id "Y") (id "Z")] 1]
                 ["interleaved writers" [(id "A") (id "C") (id "9")] [(id "9") (id "C")] 4]
                 ["mixed input" [(id "2") "odd"] [(id "2") (id "3")] 2]
                 ["client bounds omit actual operation" [(id "1") (id "2") (id "3")] [(id "2") (id "3")] 3]
                 ["singleton" [(id "2")] [(id "2") (id "3")] 1]
                 ["empty command" [] [(id "2") (id "3")] 0]]]
          (testing label
            (let [a (fresh ids label) b (assoc a "historyIdentityBounds" bounds)
                  apply-db (fn [in] (d/with db (storage/tx-data db in)))
                  delta (fn [r] (mapv (fn [d] [(:e d) (:a d) (:v d) (:added d)])
                                       (remove #(= (:a %) (d/entid db :db/txInstant)) (:tx-data r))))
                  old (apply-db a) candidate (apply-db b) calls (observe b)]
              (is (= (count ids) (count (observe a))))
              (is (= expected (count calls)))
              (when (and (= 1 expected) (> (count ids) 1))
                (is (= [[(pfx (first bounds))
                         (str (subs (pfx (second bounds)) 0 30) (char (inc (int (last (second bounds))))))]] calls)))
              (is (= (delta old) (delta candidate)))
              (let [owner-id (d/entid db [:triplex.entity/id "owner"])
                    expected (set (map #(vector owner-id (row-text (assoc (row % "owner") :recorded_position 3)) true) ids))
                    actual (set (for [datom (:tx-data candidate) :when (= (:a datom) (d/entid db :triplex.entity/row))]
                                  [(:e datom) (:v datom) (:added datom)]))]
                (is (= expected actual)))
              (is (= (set ids) (set (for [d (:tx-data candidate)
                                          :when (and (:added d) (= (:a d) (d/entid db :triplex.entity/row)))]
                                      (:id (lean/decode (:v d))))))))))
        ;; [DX-W1] Why: bench denominators require the JFR decision from this installed function call.
        ;; Rejected: labeling all offered bounds as empty or testing only the speculative expansion.
        (let [trace {:run scope :slot scope :source "fixture" :traceId (apply str (repeat 32 "1"))
                     :parent (apply str (repeat 16 "2"))}
              tmp (java.nio.file.Files/createTempFile "history-range" ".jfr" (make-array java.nio.file.attribute.FileAttribute 0))]
          (try
            (with-redefs [jfr/installed (atom (assoc trace :process "tx"))]
              @jfr/transaction-factory
              (with-open [rec (jdk.jfr.Recording.)]
                (.enable rec "triplex.TransactionFunction") (.start rec)
                (doseq [[lo hi] [[(id "1") (id "3")] [(id "4") (id "6")]]]
                  (let [in (with-bounds (fresh [lo hi] "jfr") lo hi)
                        [op payload] (first (storage/tx-data db in))]
                    (d/with db [[op (assoc payload :triplex-trace trace)]])))
                (.stop rec) (.dump rec tmp))
              (let [observed (for [ev (jdk.jfr.consumer.RecordingFile/readAllEvents tmp)
                                   :when (= "triplex.TransactionFunction" (.getName (.getEventType ev)))]
                               [(.getString ev "traceId") (.getString ev "parentSpanId") (.getString ev "historyRange")])]
                (is (= (mapv #(vector (:traceId trace) (:parent trace) %) ["empty" "occupied"]) observed))))
            (finally (java.nio.file.Files/deleteIfExists tmp))))
        (doseq [[used lo hi] [[current (id "3") current] [gone (id "7") gone] [born born (id "C")]
                              [legacy (id "1") (id "3")] [current (id "1") (id "3")]]]
          (let [ids (vec (distinct [lo hi used])) in (fresh ids (str "reuse-" used))]
            (is (= conflict (outcome db in) (outcome db (with-bounds in lo hi))))))
        (let [in (input [(retired (row current "owner")) (row (id "6") "owner")]
                        [current (id "6")] "reassert-and-retire")]
          (is (= conflict (outcome db in) (outcome db (with-bounds in current (id "6")))))
          (let [stale (assoc in "sourceK" 0 "scopeWide" true)]
            (is (= {:status 409 :code "CasConflict"} (outcome db stale) (outcome db (with-bounds stale current (id "6"))))))
          (let [missing (assoc in "live" [(id "Z")])]
            (is (= {:status 409 :code "CasConflict"} (outcome db missing) (outcome db (with-bounds missing current (id "6")))))))
        (let [in (input [(retired (row current "owner")) (row (id "E") "owner") (row (id "F") "owner")]
                        [(id "E") (id "F")] "valid-retract")
              b (with-bounds in (id "E") (id "F"))]
          (is (= (replay/logical-delta (d/with db (storage/tx-data db in)))
                 (replay/logical-delta (d/with db (storage/tx-data db b))))))
        (let [ids [(id "1") (id "1")] in (assoc (fresh ids "duplicate") "rowMode" "texts" "rowOrder" ids "rows" [])]
          (is (= (outcome db in) (outcome db (with-bounds in (id "1") (id "2"))) {:status 400 :code "TransactionRejected"})))
        (doseq [flag [false true]]
          (let [same (if flag (id "N") (id "H"))
                other (if flag (id "P") (id "J"))
                go (promise)
                ;; Both clients stage from the same stale view and use different owners.
                submit (fn [owner]
                         (future @go (let [in (input [(row same owner) (row other owner)] [same other] (str "race-" same owner))]
                                       (outcome db (if flag (with-bounds in same other) in)))))
                left (submit "left") right (submit "right")]
            (deliver go true)
            (is (= {:committed 1 conflict 1} (frequencies [@left @right])))
            (is (= 1 (count (seq (d/index-range (d/db conn) :triplex.entity/row (pfx same) (str (pfx same) "~"))))))))
        ;; [DX-THIN1] Why: drive the same immutable pre-ACK view into the real serial commit after a replacement.
        ;; Rejected: a duplicate observed only by ingress or a write with a still-live predecessor.
        (let [old (id "Q") next (id "R")
              _ (commit! (d/db conn) (input [(row old "retry-owner")] [old] "retry-seed"))
              stale (d/db conn)
              replacement (input [(retired (row old "retry-owner")) (row next "retry-owner")]
                                 [next] "retry-original")
              original (commit! stale replacement)
              fresh-operation (assoc replacement "operationId" "retry-fresh-operation")
              distinct-command (assoc fresh-operation "claims" [{"commandId" "never-committed" "txId" "never-committed" "timestamp" 100.0}])]
          (is (= {:status 409 :code "OperationDuplicate"} (outcome stale replacement)))
          (is (= {:status 409 :code "CommandConflict"} (outcome stale fresh-operation)))
          (is (= {:status 409 :code "CasConflict"} (outcome stale distinct-command)))
          (is (= (select-keys original [:position :recordedAt :operationId :t])
                 (select-keys (storage/operation (d/db conn) "retry-original") [:position :recordedAt :operationId :t])))
          (is (= (get-in original [:position "v"]) (str (storage/head-position (d/db conn)))))))
      (finally (gateway/delete-scope! base scope)))))

;; [DX-W1] Why: exercise the compact bytes emitted by the public TS client through the gateway's normal request parser.
;; Rejected: testing only internal expanded operations or treating a receipt alone as proof of the stored rows.
(deftest compact-identity-range-route
  (let [text (slurp "/opt/gateway/history-range-case.json") in (json/read-str text)]
    (doseq [enabled [false true]]
      (let [scope (json/write-str ["triplex-scope-v1" "test" "test" (str (java.util.UUID/randomUUID)) 0])
            base "datomic:mem://" db-name (:db (gateway/create-scope! base scope "lean"))
            route (str "/v1/db/" db-name "/transact")
            send (fn [^String body]
                   (let [r (gateway/route-handler {:request-method :post :uri route
                                                   :body (java.io.ByteArrayInputStream. (.getBytes body "UTF-8"))})
                         data (:body r)]
                     [(:status r) (json/read-str (if (string? data) data (String. ^bytes data "UTF-8")))]))]
        (try
          (let [wire (if enabled in (dissoc in "historyIdentityBounds"))
                [status ack] (send (if enabled text (json/write-str wire)))
                db (gateway/sync-db (str base db-name)) owner (d/entid db [:triplex.entity/id "subject"])]
            (is (= 200 status))
            (is (= ["save" "1"] [(get ack "operationId") (get-in ack ["position" "v"])]))
            (is (= (set (vals (get wire "rowTexts"))) (set (map :v (d/datoms db :eavt owner :triplex.entity/row)))))
            (let [[status err] (send (json/write-str (assoc wire "operationId" "reused" "sourceK" 1 "position" 2)))]
              (is (= 400 status))
              (is (= "IdentityConflict" (get err "code")))
              (is (= (d/basis-t db) (d/basis-t (gateway/sync-db (str base db-name)))))))
          (finally (gateway/delete-scope! base scope)))))))

;; [DX-RD1] Why: use one real as-of peer for both request shapes and check the sampled wire body.
;; Rejected: equating two empty results or inferring native timings from the response header.
(deftest sampled-pinned-field-reads
  (let [base "datomic:mem://" scope (json/write-str ["triplex-scope-v1" "test" "test" (str (java.util.UUID/randomUUID)) 0])
        name (:db (gateway/create-scope! base scope "lean" true true))
        uri (str base name) conn (gateway/connection uri)
        row (fn [owner attr value p]
              {:id (str owner attr p) :entity_id owner :attribute attr :value_type "string" :value_string value
               :recorded_at (double p) :recorded_position p :valid_from 0.0 :schema_version 1 :tx_id (str "tx" p)})
        commit (fn [p rs] (storage/commit! name conn (gateway/sync-db uri)
                           (row-input {"sourceK" (dec p) "position" p "operationId" (str "commit-" p)
                                       "rows" (mapv storage/wire-row rs) "newIds" (mapv :id rs) "claims" []})))
        mark "123456789012345678901234567890ab" emit (atom [])
        read (fn [enabled cut]
               (let [input {"entityIds" ["a" "b" "a" "missing"] "pattern" {"attribute" ":v"}
                            "basis" {"validAt" 10.0 "recordedPosition" cut}}
                     request {:request-method :post :uri (str "/v1/db/" name "/read")
                              :headers {"x-triplex-read-profile" mark}
                              :body (java.io.ByteArrayInputStream. (.getBytes (json/write-str input) "UTF-8"))}
                     out (java.io.ByteArrayOutputStream.)]
                 (with-redefs [lean/early-attribute-filter enabled trace/read-profile-enabled true trace/emit! #(swap! emit conj (json/read-str (json/write-str %)))]
                   (let [response (trace/handler gateway/route-handler request)]
                     (is (= 200 (:status response)))
                     (is (= mark (get-in response [:headers "x-triplex-read-profile"])))
                     (protocols/write-body-to-stream (:body response) response out)
                     (mapv storage/decode-row (get (json/read-str (.toString out "UTF-8")) "rows"))))))]
    (try
      (commit 1 [(row "a" ":v" "old" 1) (row "a" ":other" "ignore" 1)])
      (commit 2 [(row "b" ":v" "new" 2) (row "b" ":other" "ignore" 2)])
      (doseq [[cut expected] [[1 #{["a" "old"]}] [2 #{["a" "old"] ["b" "new"]}]]]
        (let [before (read false cut) after (read true cut)]
          (is (= before after))
          (is (= expected (set (map (juxt :entity_id :value_string) after))))
          (is (= (count expected) (count after)))))
      (is (= 4 (count @emit)))
      (doseq [sample @emit]
        (is (= mark (get sample "readProfileId")))
        (is (pos? (get-in sample ["attributes" "responseBytes"])))
        (is (map? (get-in sample ["attributes" "peerIoStats"])))
        (is (every? (set (map #(get % "name") (get sample "spans")))
                    ["read.resolve-position" "gateway.admission-wait" "read.row-decode" "gateway.response-write"])))
      (finally (gateway/delete-scope! base scope)))))

(defn -main [& _]
  (let [{:keys [fail error] :as result} (with-redefs [gateway/uri-template "datomic:mem://{db}"] (run-tests 'triplex.gateway.selftest))]
    (println (json/write-str result))
    (shutdown-agents)
    (System/exit (if (zero? (+ fail error)) 0 1))))
