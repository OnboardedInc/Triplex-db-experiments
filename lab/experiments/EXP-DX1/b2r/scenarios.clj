(ns b2r-scenarios
  "[DX-B2R] Deterministic in-process scenarios through the gateway's own routes (in-memory Datomic, a sealed scope, the
  file or PostgreSQL removal authority), every option off. Loaded after wfix1/regression.clj. Prints one B2R_SCEN line
  per check; exits 1 if any check fails. Runs on any gateway source with the sealed scope (this branch and 1ed2650bd).
    S1  r1 published; r2 stopped at its publication (pending, natively committed); a pass past r1's grace; reads and a
        save while r2 is pending; r2 resent by the client; reads; a pass past r2's grace.
    S2a a data restore to a copy older than both removals while r2 is pending: the restore route and r2's resend.
    S2b a data restore to a copy taken after r1 and before r2 while r2 is pending (r1's key already deleted): r2's
        resend on the restored data, then the restore route, then reads and r2's key.
    S3  what the new failure lines print: a key deletion that fails, a log that does not verify, a scope listing that
        fails (the worker's own line), and on PostgreSQL a key deletion and a key-pool refill refused by the database.
        Each line is checked for the protected values, the subject IDs and the scope's own words.
  S2 simulates a data restore with two in-memory databases under one name (the authority is keyed by the name): the
  'older backup' received the same saves and, for S2b, the restore route's replay of r1."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.privacy :as privacy] [triplex.gateway.envelope :as envelope] [triplex.gateway.erase :as erase]
            [triplex.gateway.authority-sql :as sql] [triplex.gateway.selftest :as selftest] [triplex.gateway.storage :as storage]
            [triplex.gateway.main :as main] [wfix1-regression :as offers])
  (:import [java.nio.file Files LinkOption Paths] [java.util UUID] [java.io StringWriter]))

(def pg? (some? sql/url))
(def results (atom []))
(defn check! [label ok detail]
  (swap! results conj {:label label :ok (boolean ok)})
  (println "B2R_SCEN" (if ok "ok  " "FAIL") label (pr-str detail)))
(defn note [label detail] (println "B2R_SCEN note" label (pr-str detail)))

(defn- row* [id e attr val tx & [type]]
  {:id id :entity_id e :entity_type type :attribute attr :value_type "string" :value_string val
   :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})
(defn frame [command owner value]
  (let [tx (str "_tx/" command) fact (row* command owner ":v" value tx)
        j (fn [suffix a] (row* (str command "/" suffix) tx a nil tx "_Transaction"))
        change (json/write-str {"op" "assert" "tripleId" command "entityId" owner "attribute" ":v"
                                "value" {"type" "string" "value" value} "validFrom" 0.0 "recordedAt" 1000.0 "assertionTxId" tx})
        rows [(assoc (j "p" ":_tx/position") :value_type "number" :value_number 1.0)
              (assoc (j "t" ":_tx/instant") :value_type "datetime" :value_datetime 1000.0)
              (assoc (j "owner" ":_tx/changed-entity") :value_string owner)
              (assoc (j "cmd" ":_tx/command-id") :value_string command)
              (assoc (j "assert" ":_tx/change") :value_type "json" :value_json change)
              fact]]
    (selftest/row-input {"span" 1 "position" 1 "scopeWide" false "entities" [owner] "operationId" command
                         "rows" (mapv storage/wire-row rows) "newIds" (mapv :id rows) "live" []
                         "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]})))

(def older "datomic:mem://{db}-older")
(defn in-scope2 [f]
  (let [scope (json/write-str ["triplex-scope-v1" "test" "b2r-scenario" (str (UUID/randomUUID)) 0])]
    (with-redefs [main/uri-template "datomic:mem://{db}"]
      (let [name (:db (main/create-scope! nil scope "lean" true true)) conn (main/connection (main/db-uri name))]
        (try (f name conn scope)
             (finally (main/delete-scope! nil scope)
                      (with-redefs [main/uri-template older] (try (main/delete-scope! nil scope) (catch Exception _ nil)))))))))
(defmacro on-older [& body] `(with-redefs [main/uri-template older] ~@body))
(defn restart! [] (reset! privacy/cache {}) (reset! envelope/shredded {}))

(defn erase [name command owner] (offers/route name "v2" "erase" {"commandId" command "selectors" [{"entityId" owner "attribute" ":v"}]}))
(defn erase-stopped-at-publication [name command owner]
  (with-redefs [privacy/publish! (fn [& _] (throw (ex-info "stopped at publication" {})))] (offers/outcome (erase name command owner))))
(defn read-of [name owner] (offers/route name "v1" "read" {"entityIds" [owner] "history" true}))
(defn identities [name command]
  (let [cut (privacy/cut name nil true) p (privacy/pending name)]
    (get (or (get-in cut [:commands command]) (when (= command (get p "commandId")) p)) "identities")))
(defn keys-left [name command]
  (count (filter #(envelope/key-present? name (get % "assertionId") (get % "keyHandle")) (identities name command))))
(defn pass! [] (with-redefs [envelope/grace-ms 0] (#'envelope/maintain-keys!)))
(defn says? [reply text] (str/includes? (json/write-str (:body reply)) text))

(defn seed! [name x z b]
  (doseq [[o v] [[x "x-secret"] [z "z-secret"] [b "b-plain"]]]
    (check! (str "seed " o) (= 200 (:status (offers/send name (frame (str "b2r-" (UUID/randomUUID)) o v)))) nil)))

(defn s1 []
  (in-scope2
    (fn [name _ _]
      (let [x "acct/a/one" z "acct/c/one" b "acct/b/one"]
        (check! "S1 protection" (= 200 (:status (offers/route name "v2" "protection" {"attributes" [":v"] "sealed" true}))) nil)
        (seed! name x z b)
        (check! "S1 r1 published" (= 200 (:status (erase name "r1" x))) nil)
        (let [stopped (erase-stopped-at-publication name "r2" z)]
          (check! "S1 r2 left pending" (some? (privacy/pending name)) stopped))
        (pass!)
        (check! "S1 r1's keys deleted by a pass past its grace while r2 is pending (B2; fails on 1ed2650bd)"
                (= 0 (keys-left name "r1")) {:r1-keys-left (keys-left name "r1") :r1-keys (count (identities name "r1"))})
        (check! "S1 r2's own keys kept while it is pending" (= (count (identities name "r2")) (keys-left name "r2")) nil)
        (note "S1 requests while r2 is pending" {:read-z (offers/outcome (read-of name z)) :read-b (offers/outcome (read-of name b))
                                                 :save-b (offers/outcome (offers/send name (frame (str "b2r-" (UUID/randomUUID)) b "b-two")))})
        (let [resent (erase name "r2" z)]
          (check! "S1 r2 completed by the client's resend" (and (= 200 (:status resent)) (nil? (privacy/pending name))) (offers/outcome resent)))
        (let [rx (read-of name x) rz (read-of name z) rb (read-of name b)]
          (check! "S1 reads after: 200, no removed value, the kept value served"
                  (and (= 200 (:status rx) (:status rz) (:status rb)) (not (says? rx "x-secret")) (not (says? rz "z-secret")) (says? rb "b-plain"))
                  (mapv offers/outcome [rx rz rb])))
        (pass!)
        (check! "S1 r1 and r2 keys gone after a pass past both graces" (= 0 (keys-left name "r1") (keys-left name "r2"))
                {:r1 (keys-left name "r1") :r2 (keys-left name "r2")})))))

(defn s2 [variant]
  (in-scope2
    (fn [name _ scope]
      (let [x "acct/a/one" z "acct/c/one" b "acct/b/one" label (str "S2" variant)]
        (on-older (main/create-scope! nil scope "lean" true true))
        (check! (str label " protection") (= 200 (:status (offers/route name "v2" "protection" {"attributes" [":v"] "sealed" true}))) nil)
        (on-older (check! (str label " protection on the older copy") (= 200 (:status (offers/route name "v2" "protection" {"attributes" [":v"] "sealed" true}))) nil))
        ;; the same saves land in both copies (the same assertion IDs; a sealed value's key file is shared by ID)
        (doseq [[o v] [[x "x-secret"] [z "z-secret"] [b "b-plain"]]]
          (let [f (frame (str "b2r-" (UUID/randomUUID)) o v)]
            (check! (str label " seed " o) (= 200 (:status (offers/send name f))) nil)
            (on-older (check! (str label " seed on the older copy " o) (= 200 (:status (offers/send name f))) nil))))
        (check! (str label " r1 published") (= 200 (:status (erase name "r1" x))) nil)
        (when (= variant "b")
          (restart!)
          (on-older (check! (str label " the older copy takes r1 by the restore route (no removal pending)")
                            (= 200 (:status (offers/route name "v2" "restore-erasure" {}))) nil))
          (restart!))
        (erase-stopped-at-publication name "r2" z)
        (check! (str label " r2 pending") (some? (privacy/pending name)) nil)
        (pass!)
        (note (str label " r1 keys left after a pass, r2 pending") (keys-left name "r1"))
        ;; the data restore: the gateway restarts on the older copy; the removal log stays as it is
        (restart!)
        (on-older
          (let [restore-1 (offers/route name "v2" "restore-erasure" {})
                resend (erase name "r2" z)
                restore-2 (offers/route name "v2" "restore-erasure" {})
                rx (read-of name x) rz (read-of name z)]
            (note (str label " after the data restore") {:restore-while-pending (offers/outcome restore-1) :r2-resent (offers/outcome resend)
                                                         :restore-after (offers/outcome restore-2) :pending (some? (privacy/pending name))
                                                         :read-x (offers/outcome rx) :read-z (offers/outcome rz)})
            (check! (str label " no removed value answered on the restored data")
                    (and (not (says? rx "x-secret")) (not (says? rz "z-secret"))) nil)
            (when (= variant "b")
              (check! (str label " r2 completes on the restored data and the restore route then answers 200")
                      (and (= 200 (:status resend)) (= 200 (:status restore-2)) (nil? (privacy/pending name))) nil)
              (pass!)
              (check! (str label " r1 and r2 keys gone") (= 0 (keys-left name "r1") (keys-left name "r2")) nil))))))))

(defn- capture-root-out [f]
  (let [w (StringWriter.) old *out*]
    (alter-var-root #'*out* (constantly w))
    (try (binding [*out* w] (f)) (finally (alter-var-root #'*out* (constantly old))))
    (str w)))
(defn- leak-check [label lines scope]
  (let [words (concat ["x-secret" "z-secret" "b-plain" "acct/" "b2r-scenario"] (json/read-str scope))
        found (vec (for [l lines w (map str words) :when (and (seq w) (> (count w) 2) (str/includes? l w))] w))]
    (note (str label " lines") lines)
    (note (str label " the database field decodes to")
          (vec (distinct (keep #(when-let [n (get (json/read-str %) "database")]
                                  (String. (.decode (java.util.Base64/getUrlDecoder) (subs n 3)) "UTF-8")) lines))))
    (check! (str label " prints no hex run of 64 or more characters (wrapped key bytes)")
            (not-any? #(re-find #"(?i)\\\\x[0-9a-f]{64}|[0-9a-f]{120}" %) lines) nil)
    (check! (str label " prints no protected value, subject ID or scope word") (empty? found) found)))

(defn s3 []
  (in-scope2
    (fn [name _ scope]
      (let [x "acct/a/one" z "acct/c/one" b "acct/b/one"]
        (offers/route name "v2" "protection" {"attributes" [":v"] "sealed" true})
        (seed! name x z b)
        (check! "S3 r1 published" (= 200 (:status (erase name "r1" x))) nil)
        (let [lines (atom [])]
          (if-not pg?
            (let [ident (first (identities name "r1"))
                  kf (envelope/key-file name (get ident "assertionId"))]
              ;; a key deletion that fails: the key file replaced by a non-empty directory
              (Files/delete kf) (Files/createDirectories (.resolve kf "inner") (make-array java.nio.file.attribute.FileAttribute 0))
              (swap! lines into (str/split-lines (with-out-str (pass!))))
              (Files/delete (.resolve kf "inner")) (Files/delete kf)
              ;; a log that does not verify: entry 1 changed on disk
              (let [p (privacy/path name "erase-1.json") raw (Files/readString p)]
                (restart!)
                (Files/writeString p (str raw " ") (make-array java.nio.file.OpenOption 0))
                (swap! lines into (str/split-lines (with-out-str (pass!))))
                (Files/writeString p raw (make-array java.nio.file.OpenOption 0)))
              ;; the worker's own line: a scope listing that fails (a head.json that is a directory), worker running
              (let [bad (Paths/get privacy/root (into-array String ["zz-not-a-scope" "head.json"]))]
                (Files/createDirectories bad (make-array java.nio.file.attribute.FileAttribute 0))
                (swap! lines into (str/split-lines (capture-root-out #(do (envelope/start!) (Thread/sleep 1300)))))
                (Files/delete bad) (Files/delete (.getParent bad))))
            (let [c (java.sql.DriverManager/getConnection sql/url)
                  exec! (fn [s] (with-open [st (.createStatement c)] (.execute st s)))]
              (try
                (exec! "CREATE OR REPLACE FUNCTION b2r_block() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'b2r blocked'; END $$ LANGUAGE plpgsql")
                (exec! "CREATE TRIGGER b2r_no_delete BEFORE DELETE ON triplex_removal.keys FOR EACH ROW EXECUTE FUNCTION b2r_block()")
                (swap! lines into (str/split-lines (with-out-str (pass!))))
                (exec! "DROP TRIGGER b2r_no_delete ON triplex_removal.keys")
                (exec! "CREATE TRIGGER b2r_no_insert BEFORE INSERT ON triplex_removal.keys FOR EACH ROW EXECUTE FUNCTION b2r_block()")
                (.clear ^java.util.Queue (#'envelope/pool name))
                (swap! lines into (str/split-lines (with-out-str (#'envelope/maintain-keys!))))
                (exec! "DROP TRIGGER b2r_no_insert ON triplex_removal.keys")
                (finally (.close c)))))
          (let [ls (filterv #(str/includes? % "triplex.removal-failure.v1") @lines)]
            (check! "S3 failure lines printed" (seq ls) {:count (count ls) :where (frequencies (map #(get (json/read-str %) "where") ls))})
            (leak-check "S3" ls scope)
            (note "S3 counters" (into {} (for [w ["shred" "key-pool-refill" "shred-worker"]]
                                           [w (if-let [f (try (requiring-resolve 'triplex.gateway.failures/count-of) (catch Throwable _ nil))] (f w) :absent)])))))))))

(defn main []
  (doseq [[n f] [["S1" s1] ["S2a" #(s2 "a")] ["S2b" #(s2 "b")] ["S3" s3]]
          :when (or (nil? (System/getenv "B2R_SCENARIOS")) (str/includes? (System/getenv "B2R_SCENARIOS") n))]
    (restart!)
    (try (f) (catch Throwable t (check! (str n " ran") false (str t)))))
  (let [failed (remove :ok @results)]
    (println "B2R_SCEN_SUMMARY" (pr-str {:checks (count @results) :failed (count failed) :authority (if pg? "postgresql" "file")
                                         :source (System/getenv "B2R_SOURCE")}))
    (shutdown-agents)
    (System/exit (if (empty? failed) 0 1))))
