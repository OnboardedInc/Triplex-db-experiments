(ns era3-review7
  "[DX-ERA3, seventh review] Attacks on DX-ERA2 at 383db77d1: the key pass that treats every database as sealed (X3),
  the union rule for additions (X6) and the 503 RemovalPolicyBehind (X1), privacy/cut's cache read before the log
  (E4's fix) under a held read of the head, and the acknowledged-removal line that step 5 of the restore procedure
  compares against (X10). Loaded after wfix1/regression.clj, era2/gate.clj, era3/attack.clj to attack6.clj;
  era3/run.sh runs it with ERA3_MAIN=r7 (ERA3_PG=1: the PostgreSQL authority). Review: era3/REVIEW-7.md."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.erase :as erase] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.scope :as scope] [triplex.gateway.removal-commit :as rc]
            [triplex.gateway.removal-scope :as rs] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.authority-sql :as sql] [triplex.gateway.storage :as storage]
            [triplex.gateway.selftest :as selftest] [triplex.gateway.main :as main]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as a] [era3-attack4 :as q]
            [era3-attack5 :as f] [era3-attack6 :as s6])
  (:import [java.io StringWriter]))

(def mode a/mode)
(def per-account? a/per-account?)
(def authority (if sql/url "postgresql" "file"))
(defn oracle! [& args] (apply a/oracle! args))
(defn observe! [& args] (apply a/observe! args))
(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))
(def boundaries (if per-account? [:log :commit] [:log]))
(defn bname [b] (clojure.core/name b))
(defn delta [f0 f1] (into (sorted-map) (for [[k v] f1 :let [dd (- v (get f0 k 0))] :when (pos? dd)] [k dd])))
(defn put-head! [name text] (@#'privacy/save-record! name "head.json" text) (reset! privacy/cache {}))
(defn edit-copy! [name f] (put-head! name (json/write-str (f (json/read-str (privacy/record-text name "head.json"))))))
(defn captured [f] (let [w (StringWriter.) r (binding [*out* w] (f))] [r (str w)]))
(defn lines-of [text schema] (filter #(str/includes? % schema) (str/split-lines text)))

;; a save of one value of `attr` with any value type (era2-gate/save-frame writes strings only)
(defn typed-frame [command owner attr vtype value position]
  (let [tx (str "_tx/" command)
        base (fn [id e a tx & [type]] {:id id :entity_id e :entity_type type :attribute a :valid_from 0.0 :recorded_at 1000.0
                                       :recorded_position 1 :schema_version 1 :tx_id tx})
        fact (merge (base command owner attr tx)
                    (case vtype :number {:value_type "number" :value_number value} :string {:value_type "string" :value_string value}))
        j (fn [suffix a] (base (str command "/" suffix) tx a tx "_Transaction"))
        change (json/write-str {"op" "assert" "tripleId" command "entityId" owner "attribute" attr
                                "value" {"type" (clojure.core/name vtype) "value" value} "validFrom" 0.0 "recordedAt" 1000.0 "assertionTxId" tx})
        journal [(assoc (j "p" ":_tx/position") :value_type "number" :value_number 1.0)
                 (assoc (j "t" ":_tx/instant") :value_type "datetime" :value_datetime 1000.0)
                 (assoc (j "owner" ":_tx/changed-entity") :value_type "string" :value_string owner)
                 (assoc (j "cmd" ":_tx/command-id") :value_type "string" :value_string command)
                 (assoc (j "assert" ":_tx/change") :value_type "json" :value_json change)]
        fresh (conj journal fact)]
    (selftest/row-input
      (cond-> {"span" 1 "position" 1 "scopeWide" false "entities" [owner] "operationId" command
               "rows" (mapv storage/wire-row fresh) "newIds" (mapv :id fresh) "live" []
               "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]}
        position (assoc "sourceK" position)))))

;; ---- R1: the key pass on an unsealed database (X3) ------------------------------------------------------------------
(defn r1-unsealed-keys [boundary sealed?]
  (f/scope5 boundary sealed?
    (fn [name conn]
      (let [lbl (str "R1 the key pass and a due removal, " (if sealed? "sealed" "unsealed") ", " (bname boundary) ", " mode ", " authority)
            _ (g/seed! name [g/a1 g/b1])
            _ (s6/set-grace! 3600000)
            rm (offers/outcome (a/remove-attr! name "r1-ra" g/a1))
            ids (get-in (privacy/cut name nil true) [:commands "r1-ra" "identities"])
            seq1 (get-in (privacy/cut name nil true) [:commands "r1-ra" "seq"])
            _ (s6/set-grace! 0) _ (Thread/sleep 5)
            f0 (f/failures)
            passes (vec (for [_ (range 4)] (s6/maintain!)))
            f1 (f/failures)
            mark (get @envelope/shredded name)
            keys-alive (count (filter #(envelope/key-present? name (get % "assertionId") (get % "keyHandle")) ids))
            detail {:removal rm :identities (count ids) :with-key-handles (count (keep #(get % "keyHandle") ids)) :passes passes
                    :failures-counted (delta f0 f1) :progress-mark mark :removal-seq seq1 :keys-alive-after keys-alive}]
        (observe! lbl :detail detail)
        (bump! :r1 boundary sealed? :failures (delta f0 f1) :mark-advanced (= mark seq1))
        (oracle! lbl (and (every? #(= :ok %) passes) (empty? (delta f0 f1)) (= mark seq1) (zero? keys-alive))
                 "the key pass completes a due removal once, deletes its keys (none when unsealed) and counts nothing" detail)))))

;; ---- R2: the union rule, a caller's addition of an attribute whose values are not strings (X6) -----------------------
(defn r2-union-type [sealed? boundary]
  (when per-account?
    (f/scope5-with [":v"] sealed? boundary
      (fn [name conn]
        (let [lbl (str "R2 a caller adds an attribute whose values are numbers, " (bname boundary) (if sealed? ", sealed" ""))
              _ (g/seed! name [g/a1])
              before (offers/outcome (offers/send name (typed-frame "r2-n-1" g/a1 ":n" :number 5.0 nil)))
              ;; any caller of the protection route (a misconfigured service, a typo in a list)
              add (f/safe #(offers/route name "v2" "protection" {"attributes" [":v" ":n"] "sealed" sealed?}))
              after (offers/outcome (offers/send name (typed-frame "r2-n-2" g/a1 ":n" :number 6.0 (g/head conn))))
              other (offers/outcome (offers/send name (typed-frame "r2-n-3" g/b1 ":n" :number 7.0 (g/head conn))))
              ;; the service's real list again, then the routes an operator has
              real (f/safe #(offers/route name "v2" "protection" {"attributes" [":v"] "sealed" sealed?}))
              restore (offers/outcome (f/safe #(offers/route name "v2" "restore-erasure" {})))
              rebuild (offers/outcome (f/safe #(q/rebuild! name {})))
              again (offers/outcome (offers/send name (typed-frame "r2-n-4" g/a1 ":n" :number 8.0 (g/head conn))))
              string-save (offers/outcome (offers/send name (g/frame "r2-v" g/b1 (g/secret g/b1 "x") nil (g/head conn))))
              detail {:numeric-save-before before :addition (offers/outcome add) :addition-answer (select-keys (:body add) ["attributes" "added" "notDeclared"])
                      :numeric-save-after after :numeric-save-other-subject other
                      :real-list-again (offers/outcome real) :real-list-answer (select-keys (:body real) ["attributes" "notDeclared"])
                      :restore-route restore :rebuild-route rebuild :numeric-save-after-the-routes again :a-string-save string-save
                      :stored (rc/stored-policy (d/db conn)) :copy (s6/head-copy name)}]
          (observe! lbl :detail detail)
          (bump! :r2 boundary sealed? :after after :again again)
          (oracle! lbl (= [200 nil] after) "a save the database stored before a caller's protection call is still stored after it" detail)
          (oracle! lbl (= [200 nil] again) "an attribute added by mistake can be taken back by some route or procedure" detail))))))

;; ---- R3: RemovalPolicyBehind entered through the log's copy (X1) ------------------------------------------------------
(defn r3-behind-by-copy [sealed? boundary]
  (when per-account?
    (f/scope5-with [":v"] sealed? boundary
      (fn [name conn]
        (let [lbl (str "R3 the log's copy lists a name the stored policy lacks, " (bname boundary) (if sealed? ", sealed" ""))
              seeds (g/seed! name [g/a1 g/b1 "acct/c/one"])
              ;; a hand edit or storage damage that keeps the head valid; the head's seal does not cover the copy
              _ (edit-copy! name #(update % "attributes" conj ":zz"))
              saves (vec (for [[k o] (map-indexed vector [g/a1 g/b1 "acct/c/one"])]
                           (offers/outcome (offers/send name (g/frame (str "r3-s" k) o (g/secret o "x") nil (g/head conn))))))
              read (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/b1]}))
              rm (offers/outcome (f/safe #(a/remove-attr! name "r3-rm" g/a1)))
              [_ start] (captured #(rc/start-check! [name] (fn [_] conn)))
              ;; the service's own list (it never named :zz) does not clear it
              real (offers/outcome (offers/route name "v2" "protection" {"attributes" [":v"] "sealed" sealed?}))
              save-after-real (offers/outcome (offers/send name (g/frame "r3-s9" g/b1 (g/secret g/b1 "y") nil (g/head conn))))
              ;; [DX-ERA6 eighth pass, adapted: the way out that protects nothing new] the copy-drop route first; the
              ;; restore route after it then has nothing to add
              drop-route (offers/outcome (f/safe #(offers/route name "v2" "removal-policy-copy-drop" {"attributes" [":zz"]})))
              restore (offers/outcome (f/safe #(offers/route name "v2" "restore-erasure" {})))
              save-after-restore (offers/outcome (offers/send name (g/frame "r3-s10" g/b1 (g/secret g/b1 "z") nil (g/head conn))))
              rm2 (offers/outcome (f/safe #(a/remove-attr! name "r3-rm" g/a1)))
              detail {:saves-of-three-accounts saves :read read :removal rm
                      :start-check (vec (take 3 (lines-of start "removal-start-check"))) :service-list real
                      :save-after-the-service-list save-after-real :copy-drop-route drop-route :restore-route restore :save-after-restore save-after-restore
                      :removal-after-restore rm2 :stored-at-the-end (get (rc/stored-policy (d/db conn)) "attributes")}]
          (observe! lbl :detail detail)
          (bump! :r3 boundary sealed? :saves saves :after-real save-after-real :after-restore save-after-restore)
          (oracle! lbl (every? #(= [200 nil] %) saves) "a name that only the log's unchecked copy lists does not stop every account's writes" detail)
          (oracle! lbl (not (some #{":zz"} (get (rc/stored-policy (d/db conn)) "attributes")))
                   "the way out does not make a name that only the copy listed protected for good" detail))))))

;; ---- R4: privacy/cut's cache read before the log, with the request held at its read of the head (E4) -----------------
(def held (atom nil))
(defn- head-read-hook
  "Holds the request's first read of the head BEFORE it reads (privacy/cut has read its cache by then: the window E4's
  fix opened)."
  [orig]
  (fn [& args]
    (let [h @held]
      (when (and h (= (Thread/currentThread) (:thread h)) (or sql/url (= "head.json" (second args))) (compare-and-set! (:fired h) false true))
        (deliver (:at h) true) (deref (:go h) 20000 :timeout))
      (apply orig args))))
(defn with-held-head-read
  "Run `request` on another thread; at its first read of the head (file: record-text of head.json; PostgreSQL:
  read-frontier), hold it, run `during` here, then let it read and go on. Returns [request's reply, during's result]."
  [request during]
  (let [at (promise) go (promise) fired (atom false)
        var (if sql/url #'sql/read-frontier #'privacy/record-text) orig @var]
    (with-redefs-fn {var (head-read-hook orig)}
      #(let [fut (future (reset! held {:thread (Thread/currentThread) :at at :go go :fired fired}) (try (request) (finally (reset! held nil))))
             _ (deref at 20000 :timeout)
             mid (if (realized? at) (f/safe during) :not-held)]
         (deliver go true)
         [(deref fut 30000 {:status :timeout}) mid]))))
(defn r4-held-read [boundary variant]
  (when per-account?
    (f/scope5 boundary false
      (fn [name conn]
        (let [lbl (str "R4 a read of a1 held at its read of the head, " (bname variant) " meanwhile, " (bname boundary) ", " authority)
              seeds (g/seed! name [g/a1 g/b1]) va (:value (seeds g/a1))
              snap0 (when (= variant :log-put-back) (if sql/url nil (q/log-snapshot name)))
              _ (when (= variant :log-put-back)
                  (a/remove-attr! name "r4-ra" g/a1)
                  ;; this gateway verified the newer head (sequence 1)
                  (offers/route name "v1" "read" {"entityIds" [g/b1]}))
              during (case variant
                       ;; a removal of a1 publishes and another request moves the cache to the newer head
                       :publication #(do (a/remove-attr! name "r4-ra" g/a1) (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/b1]})))
                       ;; the log is put back behind the head this gateway verified (file authority)
                       :log-put-back #(if snap0 (do (q/log-restore! name snap0) :put-back) :skipped-on-postgresql)
                       ;; the head cannot be read while the held read reads it (put back after the held read)
                       :failed-read #(do (put-head! name "{\"database\":") :head-cut-short))
              good-head (privacy/record-text name "head.json")
              [reply mid] (with-held-head-read #(f/safe (fn [] (offers/route name "v1" "read" {"entityIds" [g/a1]}))) during)
              _ (when (= variant :failed-read) (@#'privacy/save-record! name "head.json" good-head))
              text (g/text (:body reply))
              next-read (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/b1]}))
              detail {:held-read (offers/outcome reply) :meanwhile mid :held-read-answered-a1s-value (str/includes? text va)
                      :a-read-after next-read :seq (g/seq-now name conn)}]
          (observe! lbl :detail detail)
          (bump! :r4 boundary variant (offers/outcome reply) :answered (str/includes? text va))
          (oracle! lbl (not (and (= variant :publication) (= 200 (:status reply)) (str/includes? text va)))
                   "a read whose head read came after the removal's publication does not answer the removed value" detail)
          (oracle! lbl (not (and (= variant :log-put-back) (str/includes? text va))) "a log put back during the read does not bring the value back" detail)
          (oracle! lbl (= [200 nil] next-read) "the next read is served (the cache was not left behind by the held read)" detail))))))

;; ---- R5: the acknowledged line, for every way a removal comes to be answered 200 (X10, step 5) ----------------------
(defn r5-acknowledged [boundary how]
  (when per-account?
    (f/scope5 boundary false
      (fn [name conn]
        (let [lbl (str "R5 the acknowledged line of a removal published " (bname how) ", " (bname boundary))
              seeds (g/seed! name [g/a1 g/b1])
              [answers text]
              (captured
                #(case how
                   :by-its-own-request [(offers/outcome (a/remove-attr! name "r5-rm" g/a1))]
                   :by-the-rebuild-route [(offers/outcome (f/stop-removal! name "r5-rm" g/a1 :after-native))
                                          (offers/outcome (f/safe (fn [] (q/rebuild! name {}))))
                                          (offers/outcome (a/remove-attr! name "r5-rm" g/a1))]
                   :by-another-removal [(offers/outcome (f/stop-removal! name "r5-rm" g/a1 :after-native))
                                        (offers/outcome (a/remove-attr! name "r5-other" g/b1))
                                        (offers/outcome (a/remove-attr! name "r5-rm" g/a1))]
                   :by-the-worker [(offers/outcome (f/stop-removal! name "r5-rm" g/a1 :after-intent))
                                   (do (Thread/sleep 5) (f/with-worker-ms 1 (fn [] (s6/maintain!))))
                                   (offers/outcome (a/remove-attr! name "r5-rm" g/a1))]
                   :by-a-read [(offers/outcome (f/stop-removal! name "r5-rm" g/a1 :after-native))
                               (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/b1]}))
                               (offers/outcome (a/remove-attr! name "r5-rm" g/a1))]))
              acks (filter #(str/includes? % "\"r5-rm\"") (lines-of text "triplex.removal-acknowledged.v1"))
              published (some? (get-in (privacy/cut name nil true) [:commands "r5-rm"]))
              detail {:answers answers :published published :acknowledged-lines (count acks)}]
          (observe! lbl :detail detail)
          (bump! :r5 boundary how :lines (count acks) :last-answer (last answers))
          (when (and published (= [200 nil] (last answers)))
            (oracle! lbl (= 1 (count acks)) "a removal answered 200 to its client has exactly one acknowledged line (step 5's record)" detail)))))))

;; ---- R6 (the save line's F1, on this branch): a stored save sent again after a removal of a value it wrote -----------
(defn r6-stored-resent [boundary]
  (f/scope5 boundary false
    (fn [name conn]
      (let [lbl (str "R6 a stored save sent again after a removal of a value it wrote, " (bname boundary) ", " mode)
            _ (g/seed! name [g/b1])
            input (g/frame "r6-save" g/a1 (g/secret g/a1 "r6") nil (g/head conn))
            first-send (offers/outcome (offers/send name input))
            rm (offers/outcome (a/remove-attr! name "r6-rm" g/a1))
            again (offers/outcome (offers/send name input))
            op (offers/operation name "r6-save")
            detail {:first first-send :removal rm :sent-again again :operation (select-keys op ["status" "position"])}]
        (observe! lbl :detail detail)
        (bump! :r6 boundary again)
        (oracle! lbl (not (and (= [200 nil] first-send) (= [409 "ErasureReplayDeclined"] again)))
                 "a save that was stored is not answered as declined when it is sent again" detail)))))

(defn- guarded [label f] (try (f) (catch Throwable e (reset! a/plan nil) (reset! held nil) (s6/set-grace! 0)
                                         (oracle! label false (str "case stopped: " (.getMessage e)) (pr-str e)))))
(defn main []
  ((requiring-resolve 'era3-attack3/install-hooks3!))
  (f/real-boundary!)
  (f/may-turn-on! false)
  (let [phases (set (str/split (or (System/getenv "ERA3_PHASES") "r1 r2 r3 r4 r5 r6") #" "))]
    (when (phases "r1") (doseq [bd boundaries s? [false true]] (guarded "R1" #(r1-unsealed-keys bd s?))))
    (when (phases "r2") (doseq [s? [false true] bd boundaries] (guarded "R2" #(r2-union-type s? bd))))
    (when (phases "r3") (doseq [s? [false true] bd boundaries] (guarded "R3" #(r3-behind-by-copy s? bd))))
    (when (phases "r4") (doseq [bd boundaries v [:publication :log-put-back :failed-read]] (guarded "R4" #(r4-held-read bd v))))
    (when (phases "r5") (doseq [bd boundaries h [:by-its-own-request :by-the-rebuild-route :by-another-removal :by-the-worker :by-a-read]]
                          (guarded "R5" #(r5-acknowledged bd h))))
    (when (phases "r6") (doseq [bd boundaries] (guarded "R6" #(r6-stored-resent bd)))))
  (let [failed (remove :ok @g/results)]
    (println "ERA3_TALLY7" mode (pr-str (into (sorted-map) (map (fn [[k v]] [(pr-str k) v])) @tally)))
    (println "ERA3_FAILURES" mode (pr-str (f/failures)))
    (println "ERA3_SUMMARY" mode (pr-str {:oracles @a/oracles :violations (count @a/violations)
                                          :builder-checks (count @g/results) :builder-checks-failed (count failed)}))
    (doseq [x failed] (println "ERA3_BUILDER_CHECK_FAILED" (pr-str x)))
    (shutdown-agents)
    (System/exit 0)))
