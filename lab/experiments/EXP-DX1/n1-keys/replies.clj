(ns n1-replies
  "[DX-N1, N3] Nothing an exception carries reaches a caller. In process, through main/handler (the whole HTTP handler),
  every option off. Run with n1-keys/run.sh on the file and the PostgreSQL authority (the gate's lines phase).
    D  (PostgreSQL) the authority refuses the key batch of a protection declaration (a trigger refuses every insert into
       triplex_removal.keys, the B2 review's technique): the answer is the typed 503 EnvelopeKeyPoolEmpty, and its body
       and headers hold no hex run of 32 or more characters, no SQL text and no key handle; once the authority accepts,
       the declaration sent again is answered 200 and a sealed save is stored.
    W  every route of the handler (each route of main.clj, GET and POST, v1 and v2, admin routes, an unknown route),
       three times, each with an exception injected where the routes reach storage, a driver or Datomic, its message
       holding a marker, an SQL statement and a 64-character hex run:
         W1 an SQLException from the connection, the database value, the catalog, the transaction calls and the removal
            authority's calls;
         W2 an ExceptionInfo as Datomic raises it (no :code; :db/error unique-conflict) from the transaction calls only,
            so a save reaches storage/commit!'s refusal;
         W3 an SQLException from the removal authority's calls only (protection, removal, frontier, sealed reads).
       No answer may hold the marker, the statement or the hex run, in its body or its headers; an untyped refusal
       answers code GatewayError with the fixed text.
  Prints N1_REPLY ok / N1_REPLY FAIL and N1_REPLY_SUMMARY."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.authority-sql :as sql] [triplex.gateway.main :as main]
            [triplex.gateway.selftest :as selftest] [triplex.gateway.storage :as storage] [wfix1-regression :as offers])
  (:import [java.io ByteArrayInputStream] [java.util UUID]))

(def pg? (some? sql/url))
(def results (atom []))
(defn check! [label ok detail]
  (swap! results conj {:label label :ok (boolean ok)})
  (println "N1_REPLY" (if ok "ok  " "FAIL") label (pr-str detail)))

(def marker "ZQLEAKMARKER7731")
(def hex64 (apply str (repeat 4 "0123456789abcdef")))
(def statement (str "Batch entry 0 INSERT INTO triplex_removal.keys(scope,id,wrapped) VALUES (('" marker "'),('\\x" hex64 "')) was aborted"))

(defn call [method uri body]
  (let [r (main/handler {:request-method method :uri uri :headers {} :query-string nil
                         :body (when body (ByteArrayInputStream. (.getBytes ^String (json/write-str body) "UTF-8")))})
        b (:body r)]
    {:status (:status r) :headers (:headers r)
     :body (cond (string? b) b (bytes? b) (String. ^bytes b "UTF-8") (nil? b) "" :else (slurp b))}))

(defn code-of [r] (try (get (json/read-str (:body r)) "code") (catch Exception _ nil)))
(defn message-of [r] (try (get (json/read-str (:body r)) "message") (catch Exception _ nil)))
(defn text-of [r] (str (:body r) " " (pr-str (:headers r))))

(defn frame [command owner value]
  (let [tx (str "_tx/" command)
        row (fn [id e a v & [type]] {:id id :entity_id e :entity_type type :attribute a :value_type "string" :value_string v
                                     :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})
        j (fn [suffix a] (row (str command "/" suffix) tx a nil "_Transaction"))
        change (json/write-str {"op" "assert" "tripleId" command "entityId" owner "attribute" ":v" "value" {"type" "string" "value" value}
                                "validFrom" 0.0 "recordedAt" 1000.0 "assertionTxId" tx})
        rows [(assoc (j "p" ":_tx/position") :value_type "number" :value_number 1.0)
              (assoc (j "t" ":_tx/instant") :value_type "datetime" :value_datetime 1000.0)
              (assoc (j "owner" ":_tx/changed-entity") :value_string owner)
              (assoc (j "cmd" ":_tx/command-id") :value_string command)
              (assoc (j "assert" ":_tx/change") :value_type "json" :value_json change) (row command owner ":v" value)]]
    (selftest/row-input {"span" 1 "position" 1 "scopeWide" false "entities" [owner] "operationId" command
                         "rows" (mapv storage/wire-row rows) "newIds" (mapv :id rows) "live" []
                         "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]})))

(defn scope-text [] (json/write-str ["triplex-scope-v1" "test" "n1-replies" (str (UUID/randomUUID)) 0]))

(defn routes
  "Every route of main.clj's handler on database `db`: [method uri body]."
  [db]
  (let [s (fn [action] (str "/v2/db/" db "/" action)) v1 (fn [action] (str "/v1/db/" db "/" action))
        save (frame (str "w-" (UUID/randomUUID)) "acct/a/one" "secret-w")]
    (concat
      [[:get "/health" nil] [:get "/v2/admin/threads" nil] [:post "/v2/admin/threads/reset" {}]
       [:get "/v2/admin/scan-stats" nil] [:post "/v2/admin/scan-stats/reset" {}]
       [:post "/v1/db/create" {"scope" (scope-text) "layout" "lean" "strictRecordClocks" true}]
       [:post "/v1/db/delete" {"scope" (scope-text)}]
       [:get "/v1/not-a-route" nil]
       [:get (s "write-options") nil] [:get (v1 "write-options") nil] [:get (v1 "basis") nil] [:get (v1 "log") nil]
       [:post (v1 "log") {}] [:get (s "erasure-frontier") nil] [:get (v1 "operation/x") nil]
       [:post (s "transactions") {"after" 0 "limit" 5}] [:post (s "command") {"commandId" "x"}]
       [:post (s "journal") {"entityId" "acct/a/one"}] [:post (s "entity-transactions") {"entityId" "acct/a/one"}]
       [:post (s "request-index") {}] [:post (s "begin") {}]
       [:post (s "reach") {"entityId" "acct/a/one"}] [:post (s "reach-many") {"entityIds" ["acct/a/one"]}]
       [:post (v1 "snapshot") {}] [:post (v1 "release") {"handle" "x"}]
       [:post (v1 "transact") save] [:post (s "transact") save]
       [:post (v1 "read") {"entityIds" ["acct/a/one"] "history" true}] [:post (v1 "q") {"query" "[:find ?e :where [?e :x]]"}]
       [:post (v1 "claim") {"commandId" "x" "receipt" true}] [:post (s "ids") {}] [:post (s "sweep") {}]
       [:post (s "protection") {"attributes" [":v"] "sealed" true}]
       [:post (s "erase") {"commandId" (str "w-erase-" (UUID/randomUUID)) "selectors" [{"entityId" "acct/a/one" "attribute" ":v"}]}]
       [:post (s "restore-erasure") {}]]
      ;; every route with the other method too
      (for [[m u b] [[:get (v1 "transact") nil] [:get (v1 "read") nil] [:get (s "protection") nil] [:post (s "erasure-frontier") {}]]] [m u b]))))

(defn walk [label injected-vars ex least]
  (offers/in-scope
    (fn [db _]
      (offers/route db "v2" "protection" {"attributes" [":v"] "sealed" true})
      (offers/send db (frame (str "seed-" (UUID/randomUUID)) "acct/a/one" "secret-seed"))
      (let [thrower (fn [& _] (throw (ex)))
            replies (with-redefs-fn (into {} (for [v injected-vars] [v thrower]))
                      #(vec (for [[m u b] (routes db)] [m u (call m u b)])))
            leaks (vec (for [[m u r] replies :let [t (text-of r)]
                             :when (or (str/includes? t marker) (str/includes? t hex64) (re-find #"(?i)insert into|triplex_removal" t))]
                         [m u (:status r) (subs t 0 (min 200 (count t)))]))
            untyped (filter (fn [[_ _ r]] (= "GatewayError" (code-of r))) replies)
            not-fixed (vec (for [[m u r] untyped :when (not= "The gateway could not complete the request" (message-of r))] [m u (message-of r)]))]
        (println "N1_REPLY_WALK" label (pr-str {:routes (count replies) :answers (frequencies (map (fn [[_ _ r]] [(:status r) (code-of r)]) replies))}))
        (check! (str label ": no answer holds the injected message (marker, statement, hex run), body or headers") (empty? leaks) leaks)
        (check! (str label ": every untyped refusal answers the fixed text") (empty? not-fixed) not-fixed)
        (check! (str label ": the injection reached the routes (refusals answered)") (<= least (count (filter (fn [[_ _ r]] (<= 400 (:status r))) replies)))
                (count (filter (fn [[_ _ r]] (<= 400 (:status r))) replies)))))))

(defn declaration []
  (let [c (java.sql.DriverManager/getConnection sql/url)
        exec! (fn [s] (with-open [st (.createStatement c)] (.execute st s)))]
    ;; the authority's schema is created on its first use
    (offers/in-scope (fn [db _] (offers/route db "v2" "protection" {"attributes" [":v"] "sealed" true})))
    (try
      (offers/in-scope
        (fn [db _]
          (exec! "CREATE OR REPLACE FUNCTION n1r_block() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'n1r blocked'; END $$ LANGUAGE plpgsql")
          (exec! "CREATE TRIGGER n1r_no_insert BEFORE INSERT ON triplex_removal.keys FOR EACH ROW EXECUTE FUNCTION n1r_block()")
          (let [r (call :post (str "/v2/db/" db "/protection") {"attributes" [":v"] "sealed" true})
                t (text-of r)]
            (exec! "DROP TRIGGER IF EXISTS n1r_no_insert ON triplex_removal.keys")
            (let [again (call :post (str "/v2/db/" db "/protection") {"attributes" [":v"] "sealed" true})
                  saved (call :post (str "/v1/db/" db "/transact") (frame (str "d-" (UUID/randomUUID)) "acct/a/one" "secret-d"))]
              (println "N1_REPLY_DECLARATION" (pr-str {:refused [(:status r) (code-of r)] :message (message-of r)
                                                       :again [(:status again) (code-of again)] :save [(:status saved) (code-of saved)]}))
              (check! "D the refused key batch of a declaration answers the typed 503" (= [503 "EnvelopeKeyPoolEmpty"] [(:status r) (code-of r)]) [(:status r) (code-of r)])
              (check! "D no hex run of 32 or more characters (body, headers)" (not (re-find #"(?i)[0-9a-f]{32,}" t)) (re-find #"(?i)[0-9a-f]{32,}" t))
              (check! "D no SQL text (body, headers)" (not (re-find #"(?i)insert into|select .+ from|delete from|values \(|triplex_removal" t)) (subs t 0 (min 200 (count t))))
              (check! "D no key handle (body, headers)" (not (re-find #"(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|sql/" t)) nil)
              (check! "D once the authority accepts, the declaration sent again: 200" (= 200 (:status again)) [(:status again) (code-of again)])
              (check! "D and a sealed save is stored" (= 200 (:status saved)) [(:status saved) (code-of saved)])))))
      (finally (try (exec! "DROP TRIGGER IF EXISTS n1r_no_insert ON triplex_removal.keys") (catch Exception _ nil)) (.close c)))))

(defn main []
  (let [sqlex #(java.sql.SQLException. statement "23505")
        datomic-ex #(ex-info (str ":db.error/unique-conflict Unique conflict: :triplex.claim/command-id, value: " marker " " hex64)
                             {:db/error :db.error/unique-conflict})
        authority [#'sql/read-record #'sql/read-frontier #'sql/scopes #'sql/issue! #'sql/key-by-id #'sql/put! #'sql/publish! #'sql/delete!]
        storage-calls [#'main/connection #'main/sync-db #'d/db #'d/get-database-names #'d/create-database #'d/delete-database
                       #'d/transact #'d/transact-async]]
    (when pg? (try (declaration) (catch Throwable t (check! "D ran" false (str (class t))))))
    (doseq [[label vars ex least] [["W1 SQLException, storage and authority" (concat storage-calls authority) sqlex 10]
                                   ["W2 Datomic's ExceptionInfo, transactions" [#'d/transact #'d/transact-async] datomic-ex 2]
                                   ["W3 SQLException, the removal authority" authority sqlex (if pg? 3 0)]]]
      (try (walk label vars ex least) (catch Throwable t (check! (str label " ran") false (str (class t) " " (.getMessage t))))))
    (let [failed (remove :ok @results)]
      (println "N1_REPLY_SUMMARY" (pr-str {:checks (count @results) :failed (count failed) :authority (if pg? "postgresql" "file")
                                           :source (System/getenv "B2R_SOURCE")}))
      (shutdown-agents)
      (System/exit (if (empty? failed) 0 1)))))
