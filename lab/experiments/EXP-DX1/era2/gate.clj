(ns era2-gate
  "[DX-ERA2] Deterministic interleavings of removal on request against saves, derived (ticketed) writes, imports,
  pinned reads, a second removal and a removal stopped at each of its steps, in ONE in-memory Datomic database with a
  file removal authority, through the gateway's own route handler. Run once with TX2_REMOVAL_PER_ACCOUNT unset
  (database-wide, today's rule) and once with it on (the database moved to per-account sequences). Every scenario
  checks that the removed value is never answered by a route (current and history reads, journal pages, feed, pinned
  reads at the old position) and never re-appears in the native data in a place it was not before the removal.
  Loaded with (load-file) after wfix1/regression.clj; era2/gate.sh runs it."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.walk :as walk] [datomic.api :as d]
            [triplex.gateway.erase :as erase] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.removal-scope :as rs] [triplex.gateway.storage :as storage]
            [triplex.gateway.subject-save :as subject] [triplex.gateway.group :as group]
            [triplex.gateway.write-policy :as policy] [triplex.gateway.selftest :as selftest]
            [triplex.gateway.main :as main] [triplex.gateway.removal-commit :as rc] [triplex.gateway.envelope :as envelope]
            [wfix1-regression :as offers])
  (:import [java.util UUID]))

(def per-account? rs/enabled)
;; TX2_REMOVAL_SUBJECT_CHECK=1 with the per-account option: the removal checks its selection per subject and takes its
;; position at commit (removal_commit.clj).
(def subject? (and per-account? (= "1" (System/getenv "TX2_REMOVAL_SUBJECT_CHECK"))))
(def commit? (and per-account? (= "1" (System/getenv "TX2_REMOVAL_COMMIT_BOUNDARY"))))
(def mode (cond commit? "commit-boundary" subject? "subject-check" per-account? "per-account" :else "database-wide"))
(def ^:dynamic sealed-run? false)
(def results (atom []))
(defn check! [scenario ok message & [detail]]
  (swap! results conj {:scenario scenario :ok (boolean ok) :message message :detail detail})
  (when-not ok (println "FAIL" scenario message (pr-str detail))))

(def a1 "acct/a/one") (def a2 "acct/a/two") (def b1 "acct/b/one") (def n1 "notice:v1:era2-a")
(defn secret [owner tag] (str "SECRET-" (str/replace owner "/" "_") "-" tag "-" (UUID/randomUUID)))
(defn text [x] (if (string? x) x (json/write-str x :escape-slash false)))

(defn- row* [id e attr val tx & [type]]
  {:id id :entity_id e :entity_type type :attribute attr :value_type "string" :value_string val
   :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})

(defn save-frame
  "One commit of one save: the new value of `attr` on `owner` (retiring `prior`, an assertion ID, when given), with its
  journal (position, instant, changed entity, command, one change per assertion and retirement)."
  [command owner attr value prior position]
  (let [tx (str "_tx/" command)
        fact (row* command owner attr value tx)
        retired (when prior (assoc (row* prior owner attr "client estimate" "earlier")
                                   :retracted_at 1000.0 :retracted_position 1 :retract_tx_id tx))
        j (fn [suffix a] (row* (str command "/" suffix) tx a nil tx "_Transaction"))
        change (fn [op r] (json/write-str (cond-> {"op" op "tripleId" (:id r) "entityId" owner "attribute" attr
                                                   "value" {"type" "string" "value" (:value_string r)} "validFrom" 0.0
                                                   "recordedAt" 1000.0 "assertionTxId" (:tx_id r)}
                                            (= op "retract") (assoc "retractedAt" 1000.0 "retractionTxId" tx))))
        journal (cond-> [(assoc (j "p" ":_tx/position") :value_type "number" :value_number 1.0)
                         (assoc (j "t" ":_tx/instant") :value_type "datetime" :value_datetime 1000.0)
                         (assoc (j "owner" ":_tx/changed-entity") :value_string owner)
                         (assoc (j "cmd" ":_tx/command-id") :value_string command)
                         (assoc (j "assert" ":_tx/change") :value_type "json" :value_json (change "assert" fact))]
                  retired (conj (assoc (j "retract" ":_tx/change") :value_type "json" :value_json (change "retract" retired))))
        fresh (conj journal fact)]
    (selftest/row-input
      (cond-> {"span" 1 "position" 1 "scopeWide" false "entities" [owner] "operationId" command
               "rows" (mapv storage/wire-row (cond-> fresh retired (conj retired)))
               "newIds" (mapv :id fresh) "live" (if prior [prior] [])
               "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]}
        position (assoc "sourceK" position)))))

(defn frame [command owner value prior position] (save-frame command owner ":v" value prior position))
(defn head [conn] (storage/head-position (d/db conn)))
(defn seq-now [name conn] (:seq (privacy/cut name (d/db conn) true)))

(defn held-plan [op entered release build]
  (fn [db data input & more]
    (let [plan (apply build db data input more)]
      (when (= op (get input "operationId"))
        (deliver entered true)
        (when-not (deref release 15000 false) (throw (ex-info "barrier not released" {}))))
      plan)))

(defn with-held
  "Send `held` (prepared under the current cut), run `during` while it is paused after preparation (just before it is
  submitted to Datomic, on either writer), then let it commit."
  [name held during]
  (let [entered (promise) release (promise) submit storage/submit! op (get held "operationId")]
    (with-redefs [storage/submit! (fn [& args]
                                    (when (= op (get (nth args 2) "operationId"))
                                      (deliver entered true)
                                      (when-not (deref release 15000 false) (throw (ex-info "barrier not released" {}))))
                                    (apply submit args))]
      (let [leader (future (offers/send name held))]
        (try
          (loop [k 0]
            (cond (realized? entered) nil
                  (future-done? leader) (throw (ex-info (str "held save answered before its plan: "
                                                             (pr-str (offers/outcome @leader)) " "
                                                             (get-in @leader [:body "message"])) {}))
                  (> k 2000) (throw (ex-info "held save never reached its plan" {}))
                  :else (do (Thread/sleep 5) (recur (inc k)))))
          (during)
          (finally (deliver release true)))
        (deref leader 15000 {:status 0 :body {"code" "timeout"}})))))

(defn remove! [name command owner]
  (offers/route name "v2" "erase" {"commandId" command "selectors" [{"entityId" owner "attribute" ":v"}]}))

(defn raw-occurrences
  "Every native datom (history included) whose value contains text, as [entity ID, attribute]."
  [conn text]
  (let [current (d/db conn) db (d/history current)]
    (into #{} (comp (filter #(and (string? (:v %)) (str/includes? ^String (:v %) text)))
                    (map (fn [x] [(or (:triplex.entity/id (d/entity current (:e x))) (str (:e x))) (d/ident current (:a x))])))
          (d/datoms db :eavt))))

(defn route-texts [name owner pin]
  {:current (offers/route name "v1" "read" {"entityIds" [owner]})
   :history (offers/route name "v1" "read" {"entityIds" [owner] "history" true})
   :pinned (offers/route name "v1" "read" {"entityIds" [owner] "basis" {"recordedPosition" pin "validAt" 1.0e12}})
   :journal (offers/route name "v2" "transactions" {"after" 0 "limit" 1000})
   :feed (main/route-handler {:request-method :get :uri (str "/v1/db/" name "/log") :query-string "fromT=0&limit=1000"})})

(defn removed-everywhere!
  "No route answers the removed value; the native data holds it nowhere it did not hold it before the removal."
  [scenario name conn owner value before pin]
  (doseq [[route reply] (route-texts name owner pin)]
    (let [body (text (:body reply))]
      (check! scenario (= 200 (:status reply)) (str "route " route " answers") (:status reply))
      (check! scenario (not (str/includes? body value)) (str "route " route " never answers the removed value"))))
  ;; Sealed: no plaintext anywhere in the native data, before or after. Unsealed (masking only, as today): the value may
  ;; stay on its own subject and in journals (masked by assertion identity on every route), but on no other entity.
  (let [after (raw-occurrences conn value)
        foreign (remove (fn [[e _]] (or (= e owner) (str/starts-with? e "_tx/"))) after)]
    (check! scenario (if sealed-run? (and (empty? before) (empty? after)) (empty? foreign))
            "no native copy of the removed value outside its subject and journals (none at all when sealed)"
            {:after after})))

(defn marked? [name owner pin]
  (let [rows (get-in (offers/route name "v1" "read" {"entityIds" [owner] "basis" {"recordedPosition" pin "validAt" 1.0e12}})
                     [:body "rows"])]
    (some #(= "erased" (get-in % ["value_type" "v"] (get % "value_type"))) rows)))

(defn fresh-scope [sealed? f]
  (offers/in-scope
    (fn [name conn]
     (binding [sealed-run? sealed?]
      (with-redefs [group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
        (check! "setup" (= 200 (:status (offers/route name "v2" "protection" {"attributes" [":v"] "sealed" sealed?})))
                "protection declared")
        (when per-account?
          (let [moved (offers/route name "v2" "removal-per-account" {})]
            (check! "setup" (and (= 200 (:status moved)) (get-in moved [:body "perAccount"])) "database moved per account" moved)
            ;; [DX-ERA2 fifth pass] the boundary is the database's: a process allowed to (commit mode) moved it on
            ;; (the fourth review's cases choose each request's boundary with the test seam; then the seam is the mode)
            (check! "setup" (= (if (some? rc/commit-boundary) rc/commit-boundary commit?) (rc/commit-boundary? (d/db conn)))
                    "the database's boundary is the mode's" (:body moved))))
        (f name conn))))))

(defn seed! [name owners]
  (into {} (for [[i owner] (map-indexed vector owners)]
             (let [v (secret owner "seed") id (str "seed-" i)
                   r (offers/send name (frame id owner v nil nil))]
               (check! "seed" (= 200 (:status r)) "seed save" (offers/outcome r))
               [owner {:id id :value v}]))))

(defn expect [scenario reply wanted]
  (check! scenario (= wanted (offers/outcome reply)) (str "outcome " (pr-str wanted)) (offers/outcome reply)))

;; ---- scenarios ------------------------------------------------------------------------------------------------
(defn held-across-removal
  "Saves prepared before a removal and committed after it."
  [sealed?]
  (fresh-scope sealed?
    (fn [name conn]
      (let [a3 "acct/a/three" seeds (seed! name [a1 a2 a3 b1]) pin (head conn)
            before (raw-occurrences conn (:value (seeds a1)))]
        ;; 1. Another account's save, held while a1's value is removed: database-wide refused (CasConflict, replayed by
        ;; the SDK); per account it commits.
        (let [r (with-held name (frame "other" b1 (secret b1 "x") (:id (seeds b1)) (head conn))
                  #(expect "held/other-account" (remove! name "rm-1" a1) [200 nil]))]
          (expect "held: another account's save across a removal" r (if per-account? [200 nil] [409 "CasConflict"])))
        ;; 2. The same subject: a new value v2, then a save of a1 held while v2 is removed: refused in both modes.
        (let [v2 (secret a1 "v2")
              _ (expect "held/same-subject" (offers/send name (frame "a1-v2" a1 v2 (:id (seeds a1)) (head conn))) [200 nil])
              before2 (raw-occurrences conn v2)
              r (with-held name (frame "same-subject" a1 (secret a1 "v3") "a1-v2" (head conn))
                  #(expect "held/same-subject" (remove! name "rm-2" a1) [200 nil]))]
          ;; [DX-ERA2 fifth pass, R2-2] refused with the terminal answer: a removal of its subject landed after its frame
          (expect "held: the same subject's save across its removal" r [409 "ErasureReplayDeclined"])
          (removed-everywhere! "held/same-subject" name conn a1 v2 before2 (head conn)))
        ;; 3. Another subject of the same account (a2) held while a3's value is removed: database-wide refused; guarded
        ;; per account a save is fenced on the subjects it writes, so it commits.
        (let [r (with-held name (frame "same-account" a2 (secret a2 "x") (:id (seeds a2)) (head conn))
                  #(expect "held/same-account" (remove! name "rm-3" a3) [200 nil]))]
          (expect "held: another subject of the same account across a removal" r
                  (if per-account? [200 nil] [409 "CasConflict"])))
        (check! "held" (marked? name a1 pin) "a1's first value is marked at the old pin")
        (removed-everywhere! "held/a1" name conn a1 (:value (seeds a1)) before pin)
        (removed-everywhere! "held/a3" name conn a3 (:value (seeds a3)) (raw-occurrences conn (:value (seeds a3))) pin)))))

(defn derived-writes
  "Settlement-shaped and Publish-shaped writes: a ticket read before a removal, sent after it."
  [sealed?]
  (fresh-scope sealed?
    (fn [name conn]
      (let [seeds (seed! name [a1 b1])
            value (:value (seeds a1))
            before (raw-occurrences conn value)
            pin (head conn)
            ticket (seq-now name conn)
            copy (fn [command owner accounts]
                   ;; a derived document outside the account's prefix that copies a1's value into an unprotected field
                   (cond-> (assoc (save-frame command owner ":notice/body" (str "derived:" value) nil nil) "erasureSeq" ticket)
                     accounts (assoc "erasureAccounts" accounts)))]
        (expect "derived" (remove! name "rm-d" a1) [200 nil])
        (expect "settlement frame of the removed account, old ticket" (offers/send name (copy "frame-a" n1 ["a"]))
                [409 "ErasureFrontierChanged"])
        (expect "Publish of the removed account, old ticket" (offers/send name (copy "publish-a" "lazy/account/releases/a" ["a"]))
                [409 "ErasureFrontierChanged"])
        (expect "database-wide ticket, old" (offers/send name (copy "frame-any" "notice:v1:era2-any" nil))
                [409 "ErasureFrontierChanged"])
        (let [other (assoc (save-frame "frame-b" "notice:v1:era2-b" ":notice/body" (secret b1 "notice") nil nil)
                           "erasureSeq" ticket "erasureAccounts" ["b"])]
          (expect "settlement frame of another account, old ticket" (offers/send name other)
                  (if per-account? [200 nil] [409 "ErasureFrontierChanged"])))
        (check! "derived" (marked? name a1 pin) "a1's value is marked at the old pin")
        (removed-everywhere! "derived" name conn a1 value before pin)))))

(defn import-replay
  "An import frame carrying the subject's archived value."
  [sealed?]
  (fresh-scope sealed?
    (fn [name conn]
      (let [seeds (seed! name [a1 b1])
            value (:value (seeds a1))
            before (raw-occurrences conn value)
            pin (head conn)]
        (expect "import" (remove! name "rm-i" a1) [200 nil])
        ;; a replay of the archived field after its removal, under a current ticket: refused by the removed family
        (let [replay (assoc (frame "replay-a1" a1 value nil nil) "erasureSeq" (seq-now name conn) "erasureReplay" true)]
          (expect "import replay of the removed field" (offers/send name replay) [409 "ErasureReplayDeclined"]))
        ;; an import frame of another account under a current ticket is unaffected
        (let [other (assoc (frame "replay-b1" b1 (secret b1 "replay") (:id (seeds b1)) nil) "erasureSeq" (seq-now name conn)
                           "erasureReplay" true)]
          (expect "import replay of another account" (offers/send name other) [200 nil]))
        (removed-everywhere! "import" name conn a1 value before pin)))))

(defn pinned-reader
  "A reader that decoded the value at a pin before the removal reads the same pin after it."
  [sealed?]
  (fresh-scope sealed?
    (fn [name conn]
      (let [seeds (seed! name [a1 b1]) value (:value (seeds a1)) pin (head conn) before (raw-occurrences conn value)
            read-at #(text (:body (offers/route name "v1" "read" {"entityIds" [a1] "basis" {"recordedPosition" pin "validAt" 1.0e12}})))
            reach-at #(text (:body (offers/route name "v2" "reach" {"root" a1 "basis" {"recordedPosition" pin "validAt" 1.0e12}
                                                                     "session" "era2-pinned" "erasureRefs" true})))]
        (check! "pinned" (str/includes? (read-at) value) "the value is readable at the pin before the removal")
        (check! "pinned" (str/includes? (reach-at) value) "Reach at the pin answers the value before the removal (and caches it)")
        (expect "pinned" (remove! name "rm-p" a1) [200 nil])
        (check! "pinned" (not (str/includes? (read-at) value)) "the same pin answers the marker after the removal")
        (check! "pinned" (not (str/includes? (reach-at) value)) "a cached Reach session at the pin answers the marker")
        (removed-everywhere! "pinned" name conn a1 value before pin)))))

(defn racing-removals
  "Two removals in two accounts at once, beside a save in a third account."
  [sealed?]
  (fresh-scope sealed?
    (fn [name conn]
      (let [c1 "acct/c/one" seeds (seed! name [a1 b1 c1]) pin (head conn)
            befores (into {} (for [o [a1 b1]] [o (raw-occurrences conn (:value (seeds o)))]))
            ra (future (remove! name "race-a" a1)) rb (future (remove! name "race-b" b1))
            s (future (offers/send name (frame "race-save" c1 (secret c1 "x") (:id (seeds c1)) (head conn))))]
        (expect "race" @ra [200 nil]) (expect "race" @rb [200 nil])
        (let [r @s]
          ;; database-wide the save may be refused by either removal (a replay); per account it never is
          (check! "race" (if per-account? (= [200 nil] (offers/outcome r))
                           (contains? #{[200 nil] [409 "CasConflict"] [503 "ErasureFrontierUnavailable"]} (offers/outcome r)))
                  "a third account's save beside two removals" (offers/outcome r)))
        (check! "race" (= 2 (seq-now name conn)) "two removals, two sequences")
        (when per-account?
          (let [db (d/db conn)]
            (check! "race" (= #{1 2} (set [(rs/native-account-seq db "a") (rs/native-account-seq db "b")]))
                    "each account took its own removal's sequence")
            (check! "race" (= #{1 2} (set [(rs/native-entity-seq db a1) (rs/native-entity-seq db b1)]))
                    "each removed subject took its own removal's sequence")
            (check! "race" (= [0 0] [(rs/native-account-seq db "c") (rs/native-entity-seq db c1)])
                    "the third account's sequences never moved")))
        (doseq [o [a1 b1]]
          (check! "race" (marked? name o pin) (str o " marked"))
          (removed-everywhere! (str "race/" o) name conn o (:value (seeds o)) (befores o) pin))))))

(def own-values (atom {}))
(defn stopped-removal
  "A removal stopped after each of its steps (before the native commit, after it, at publication), then resumed."
  [sealed?]
  (doseq [step (cond-> [:before-native :after-native :at-publish] subject? (conj :after-guard))]
    (fresh-scope sealed?
      (fn [name conn]
        (let [scenario (str "stopped/" (clojure.core/name step))
              seeds (seed! name [a1 a2 b1]) value (:value (seeds a1)) pin (head conn)
              before (raw-occurrences conn value)
              apply-native erase/apply-native! publish privacy/publish! commit rc/commit! hold rc/hold!
              first-try (atom true)
              stopped (with-redefs [erase/apply-native! (fn [c v e]
                                                          (when (= step :before-native) (throw (ex-info "stop before native" {})))
                                                          (let [t (apply-native c v e)]
                                                            (when (= step :after-native) (throw (ex-info "stop after native" {})))
                                                            t))
                                    ;; the same steps on the subject-check path, and its guard: one try refused as if
                                    ;; the subject had moved, the guard taken, then the gateway stops
                                    rc/narrow-tries (if (= step :after-guard) 1 rc/narrow-tries)
                                    rc/commit! (fn [c v cur e h]
                                                 (when (= step :before-native) (throw (ex-info "stop before native" {})))
                                                 (when (and (= step :after-guard) (compare-and-set! first-try true false))
                                                   (throw (ex-info rc/moved {})))
                                                 (let [r (commit c v cur e h)]
                                                   (when (= step :after-native) (throw (ex-info "stop after native" {})))
                                                   r))
                                    rc/hold! (fn [c es s]
                                               (let [r (hold c es s)]
                                                 (when (= step :after-guard) (throw (ex-info "stop after guard" {})))
                                                 r))
                                    privacy/publish! (fn [& args]
                                                       (if (= step :at-publish) (throw (ex-info "stop at publish" {}))
                                                         (apply publish args)))]
                        (remove! name "rm-s" a1))]
          (check! scenario (not= 200 (:status stopped)) "the removal did not answer while stopped" (offers/outcome stopped))
          ;; while stopped: another account's save and read; another subject of the same account; the subject itself
          (let [other (offers/send name (frame "while-other" b1 (secret b1 "w") (:id (seeds b1)) (head conn)))
                read (offers/route name "v1" "read" {"entityIds" [b1]})
                same (offers/send name (frame "while-same" a2 (secret a2 "w") (:id (seeds a2)) (head conn)))
                v-own (secret a1 "w")
                own (offers/send name (frame "while-own" a1 v-own (:id (seeds a1)) (head conn)))]
            (expect (str scenario ": another account's save while stopped") other
                    (if per-account? [200 nil] [503 "ErasureFrontierUnavailable"]))
            (check! scenario (= (if per-account? 200 503) (:status read)) "another account's read while stopped" (:status read))
            ;; [DX-ERA3 M1] on the log's boundary a read that finds the pending removal committed in the data publishes
            ;; it before it is served; with the commit boundary nothing is published by a read (the data masks it)
            (let [published-by-read (and per-account? (not commit?) (#{:after-native :at-publish} step))]
              (when per-account?
                (check! scenario (= (if published-by-read 1 0) (seq-now name conn))
                        (if published-by-read "the read published the committed removal first" "nothing published while stopped")
                        (seq-now name conn)))
              (expect (str scenario ": another subject of the account while stopped") same
                      (if per-account? [200 nil] [503 "ErasureFrontierUnavailable"]))
              ;; the removed subject: before the native commit the save lands first and the removal re-plans over it;
              ;; after it, the save is refused until the removal is published; once a read has published it, the save is
              ;; an ordinary save after the removal (answered, not removed by it)
              (expect (str scenario ": the removed subject while stopped") own
                      (cond (not per-account?) [503 "ErasureFrontierUnavailable"]
                            (= step :before-native) [200 nil]
                            published-by-read [200 nil]
                            :else [409 "CasConflict"]))
              (when (and (= 200 (:status own)) (not published-by-read))
                ;; the value saved before the resumed removal's serial point is removed with it
                (swap! own-values assoc scenario v-own))))
          ;; resumed with the same command: completes exactly once
          (let [done (remove! name "rm-s" a1)]
            (expect scenario done [200 nil])
            (check! scenario (= 1 (get-in done [:body "seq"])) "one removal, sequence 1" (:body done)))
          (check! scenario (marked? name a1 pin) "a1's value is marked after the resumed removal")
          (removed-everywhere! scenario name conn a1 value before pin)
          (when-let [v (@own-values scenario)]
            (removed-everywhere! (str scenario "/own") name conn a1 v #{} (head conn))))))))

(defn migrate-back-and-forth
  "Per account only: the move is idempotent, reversible, and a save prepared under the other mode is refused once.
  [DX-ERA2 fifth pass] On the commit boundary (one-way) moving back is refused and nothing else is checked here."
  []
  (when (and per-account? commit?)
    (fresh-scope false
      (fn [name conn]
        (seed! name [a1 b1])
        (expect "migrate: moving back from the commit boundary" (offers/route name "v2" "removal-per-account" {"back" true})
                [409 "RemovalBoundaryOneWay"])
        (check! "migrate" (rc/commit-boundary? (d/db conn)) "still on the commit boundary" nil))))
  (when (and per-account? (not commit?))
    (fresh-scope false
      (fn [name conn]
        (let [seeds (seed! name [a1 b1]) pin (head conn)]
          (expect "migrate" (remove! name "rm-m" a1) [200 nil])
          (let [again (offers/route name "v2" "removal-per-account" {})]
            (check! "migrate" (= [200 false] [(:status again) (get-in again [:body "changed"])]) "moving twice changes nothing"))
          (let [r (with-held name (frame "across-move" b1 (secret b1 "m") (:id (seeds b1)) (head conn))
                    #(check! "migrate" (= 200 (:status (offers/route name "v2" "removal-per-account" {"back" true}))) "moved back"))]
            (expect "a save prepared per account, committed after the move back" r [409 "CasConflict"]))
          (check! "migrate" (not (rs/per-account? (d/db conn))) "database-wide again")
          (expect "migrate: a fresh save after the move back" (offers/send name (frame "after-back" b1 (secret b1 "n") (:id (seeds b1)) (head conn))) [200 nil])
          (check! "migrate" (marked? name a1 pin) "a1 still marked database-wide")
          (let [forward (offers/route name "v2" "removal-per-account" {})]
            (check! "migrate" (and (= 200 (:status forward)) (= 1 (get-in forward [:body "accounts"]))) "moved again; one account had a removal" (:body forward)))
          (check! "migrate" (= [1 1] [(rs/native-account-seq (d/db conn) "a") (rs/native-entity-seq (d/db conn) a1)])
                  "account a's and a1's sequences restored from the log")
          (check! "migrate" (marked? name a1 pin) "a1 still marked per account"))))))

;; ---- the subject-check path (TX2_REMOVAL_SUBJECT_CHECK=1) ------------------------------------------------------
(defn frame*
  "save-frame with options: :actor (a journal actor row, e.g. \"bulk-import\" for an import frame) and :retire-only
  (retire `prior` without a new value)."
  [command owner attr value prior position {:keys [actor retire-only]}]
  (let [tx (str "_tx/" command)
        fact (when-not retire-only (row* command owner attr value tx))
        retired (when prior (assoc (row* prior owner attr "client estimate" "earlier")
                                   :retracted_at 1000.0 :retracted_position 1 :retract_tx_id tx))
        j (fn [suffix a] (row* (str command "/" suffix) tx a nil tx "_Transaction"))
        change (fn [op r] (json/write-str (cond-> {"op" op "tripleId" (:id r) "entityId" owner "attribute" attr
                                                   "value" {"type" "string" "value" (:value_string r)} "validFrom" 0.0
                                                   "recordedAt" 1000.0 "assertionTxId" (:tx_id r)}
                                            (= op "retract") (assoc "retractedAt" 1000.0 "retractionTxId" tx))))
        journal (cond-> [(assoc (j "p" ":_tx/position") :value_type "number" :value_number 1.0)
                         (assoc (j "t" ":_tx/instant") :value_type "datetime" :value_datetime 1000.0)
                         (assoc (j "owner" ":_tx/changed-entity") :value_string owner)
                         (assoc (j "cmd" ":_tx/command-id") :value_string command)]
                  actor (conj (assoc (j "actor" ":_tx/actor") :value_string actor))
                  fact (conj (assoc (j "assert" ":_tx/change") :value_type "json" :value_json (change "assert" fact)))
                  retired (conj (assoc (j "retract" ":_tx/change") :value_type "json" :value_json (change "retract" retired))))
        fresh (cond-> journal fact (conj fact))]
    (selftest/row-input
      (cond-> {"span" 1 "position" 1 "scopeWide" false "entities" [owner] "operationId" command
               "rows" (mapv storage/wire-row (cond-> fresh retired (conj retired)))
               "newIds" (mapv :id fresh) "live" (if prior [prior] [])
               "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]}
        position (assoc "sourceK" position)))))

(def secret-pattern #"SECRET-[A-Za-z0-9_\-]+")
(defn foreign-copies
  "One pass over every native datom: the given values found on an entity other than their own subjects and journals."
  [conn owners-of]
  (let [current (d/db conn) db (d/history current) out (volatile! [])]
    (doseq [x (d/datoms db :eavt) :when (string? (:v x))
            v (re-seq secret-pattern (:v x)) :when (owners-of v)]
      (let [e (or (:triplex.entity/id (d/entity current (:e x))) (str (:e x)))]
        (when-not (or ((owners-of v) e) (str/starts-with? e "_tx/")) (vswap! out conj [v e (d/ident current (:a x))]))))
    @out))

(defn absent-from-routes!
  "No route answers any of `values`: current and history reads of `owners`, a pinned read and a pinned Reach session
  (cached before the removal) at `pin`, the journal pages after `pin` and the feed from `t0`."
  [scenario name owners pin t0 values]
  (let [replies (concat
                  (for [o owners q [{"entityIds" [o]} {"entityIds" [o] "history" true}
                                    {"entityIds" [o] "basis" {"recordedPosition" pin "validAt" 1.0e12}}]]
                    (offers/route name "v1" "read" q))
                  [(offers/route name "v2" "reach" {"root" (first owners) "basis" {"recordedPosition" pin "validAt" 1.0e12}
                                                    "session" (str "era2-" (first owners)) "erasureRefs" true})
                   (offers/route name "v2" "transactions" {"after" (max 0 (dec pin)) "limit" 200})
                   (main/route-handler {:request-method :get :uri (str "/v1/db/" name "/log") :query-string (str "fromT=" t0 "&limit=200")})])
        texts (mapv (fn [r] [(:status r) (text (:body r))]) replies)]
    (check! scenario (every? (fn [[st _]] (= 200 st)) texts) "every route answers" (mapv first texts))
    (check! scenario (not-any? (fn [[_ body]] (some (fn [v] (str/includes? body v)) values)) texts)
            "no route answers a removed or racing value")))

(defn race-loop
  "Randomized races: a save of the subject prepared before its removal (a new fact of the subject, the creation of an
  entity the removal names before it exists, an import frame creating that entity, a retirement of the removed value),
  paused after preparation and released at a random moment while the removal runs, with random delays after the
  removal's intent is written. Every racing save that commits must have committed before the removal's serial point
  and been removed by it; none may commit after it."
  [n]
  (when subject?
    (fresh-scope false
      (fn [name conn]
        (let [kinds [:fact :creation :import :retire]
              owners (atom {}) counts (atom {})
              bump (fn [k] (swap! counts update k (fnil inc 0)))
              submit storage/submit! prepare privacy/prepare!
              imported (offers/send name (frame* "import-probe" "acct/r/probe" ":v" (secret "acct/r/probe" "p") nil nil {:actor "bulk-import"}))]
          (check! "race-loop" (= [200 nil] (offers/outcome imported)) "an import frame commits outside any race" (offers/outcome imported))
          (doseq [i (range n)]
            (let [kind (kinds (mod i (count kinds)))
                  x (str "acct/r/s" i) child (str x "-new") v0 (secret x "seed") v1 (secret x "race")
                  seed (offers/send name (frame (str "rs-" i) x v0 nil nil))
                  pin (head conn) t0 (d/basis-t (d/db conn))
                  op (str "race-" i)
                  input (case kind
                          :fact (frame op x v1 (str "rs-" i) pin)
                          :creation (frame op child v1 nil nil)
                          :import (frame* op child ":v" v1 nil nil {:actor "bulk-import"})
                          :retire (frame* op x ":v" nil (str "rs-" i) pin {:retire-only true}))
                  _ (offers/route name "v2" "reach" {"root" x "basis" {"recordedPosition" pin "validAt" 1.0e12}
                                                     "session" (str "era2-" x) "erasureRefs" true})
                  entered (promise) release (promise)
                  [saved removed]
                  (with-redefs [storage/submit! (fn [& args]
                                                  (when (= op (get (nth args 2) "operationId"))
                                                    (deliver entered true) (deref release 15000 nil))
                                                  (apply submit args))
                                privacy/prepare! (fn [nm e] (prepare nm e) (Thread/sleep (long (rand-int 3))))]
                    (let [saver (future (offers/send name input))]
                      (deref entered 3000 nil)
                      (let [remover (future (offers/route name "v2" "erase"
                                                          {"commandId" (str "rr-" i)
                                                           "selectors" [{"entityId" x "attribute" ":v"} {"entityId" child "attribute" ":v"}]}))]
                        (Thread/sleep (long (rand-int 8)))
                        (deliver release true)
                        [(deref saver 20000 {:status 0}) (deref remover 20000 {:status 0})])))
                  ids (set (map (fn [r] (get r "assertionId")) (get-in removed [:body "identities"])))
                  label (str "race-loop/" (clojure.core/name kind))]
              (check! label (= [200 nil] (offers/outcome seed)) "seed" (offers/outcome seed))
              (check! label (= [200 nil] (offers/outcome removed)) "the removal answers" (offers/outcome removed))
              (if (= 200 (:status saved))
                (do (bump [kind :committed-before])
                    ;; it committed, so it must have committed before the removal's serial point and been removed
                    (check! label (or (= kind :retire) (contains? ids op)) "a committed racing value was removed with the subject"
                            {:op op :ids ids}))
                (do (bump [kind (offers/outcome saved)])
                    (check! label (contains? #{[409 "CasConflict"] [409 "ErasureReplayDeclined"] [503 "ErasureFrontierUnavailable"]}
                                             (offers/outcome saved))
                            "a racing save that did not commit was refused" (offers/outcome saved))))
              (check! label (contains? ids (str "rs-" i)) "the seed value was removed" ids)
              ;; the installed function's rewrite equals the gateway's own encoding at the final position and stamp
              (let [db (d/db conn)
                    tx (d/entid db [:triplex.tx/operation-id (str "privacy-" (privacy/sha256 (str "rr-" i)))])
                    native (json/read-str (:v (first (d/datoms db :eavt tx :triplex.tx/erasure-record))))
                    journal (d/entid db [:triplex.entity/id (get native "txId")])]
                (check! label (= (set (map :v (d/datoms db :eavt journal :triplex.entity/row))) (set (@#'erase/journal-rows native)))
                        "the stored journal rows are the gateway's encoding at the committed position and stamp")
                (check! label (= [(get native "position") (get native "position")]
                                 [(:v (first (d/datoms db :eavt tx :triplex.tx/position))) (get-in removed [:body "position"])])
                        "the entry, the transaction and the reply carry the same position"))
              (swap! owners assoc v0 #{x} v1 #{x child})
              (absent-from-routes! label name [x child] pin t0 [v0 v1])))
          ;; the log stays dense and ordered, and record time never goes back
          (let [db (d/db conn)
                txs (sort-by first (map (fn [x] [(:v x) (:e x)]) (d/datoms db :aevt :triplex.tx/position)))
                clock (fn [e] (:v (first (d/datoms db :eavt e :triplex.tx/max-recorded-at))))
                removal? (fn [e] (some? (first (d/datoms db :eavt e :triplex.tx/erasure-record))))
                ;; each removal's stamp is at least the newest record time before it (taken at its serial point)
                backwards (keep (fn [[[_ a] [_ b]]] (when (and (removal? b) (clock a) (< (clock b) (clock a))) [a b]))
                                (partition 2 1 txs))]
            (check! "race-loop" (= (map first txs) (range 1 (inc (count txs)))) "positions are 1..N with no gap or repeat"
                    (take 5 (remove (fn [[a b]] (= a b)) (map vector (map first txs) (range 1 (inc (count txs)))))))
            (check! "race-loop" (empty? backwards) "no removal's record time is before the commit before it" (take 3 backwards)))
          (let [foreign (foreign-copies conn @owners)]
            (check! "race-loop" (empty? foreign) "no native copy of any removed or racing value outside its subjects and journals"
                    (take 5 foreign)))
          (println "ERA2_RACE" (pr-str {:iterations n :outcomes @counts})))))))

(defn hammer
  "The bound: a subject saved without pause by four writers (one of them replacing its protected value) while it is
  removed. The narrow check keeps failing, so the removal takes the guard on that subject only; it must commit within
  4 tries, and every protected value committed before its position must be removed with it."
  [rounds]
  (when subject?
    (fresh-scope false
      (fn [name conn]
        (let [b (secret b1 "b")
              _ (expect "hammer" (offers/send name (frame "hb" b1 b nil nil)) [200 nil])
              commit rc/commit! hold rc/hold! tries (atom []) holds (atom 0)]
          (doseq [k (range rounds)]
            (let [h (str "acct/h/s" k) v0 (secret h "seed")
                  _ (expect "hammer" (offers/send name (frame (str "h-" k) h v0 nil nil)) [200 nil])
                  pin (head conn) t0 (d/basis-t (d/db conn))
                  stop (atom false) written (atom []) n (atom 0) calls (atom 0)
                  writer (fn [w]
                           (future
                             (loop [prior (when (zero? w) (str "h-" k))]
                               (when-not @stop
                                 (let [id (str "h-" k "-" w "-" (swap! n inc))
                                       attr (if (zero? w) ":v" (str ":w" w))
                                       v (secret h (str "w" w))
                                       r (offers/send name (save-frame id h attr v prior nil))]
                                   (if (= 200 (:status r))
                                     (do (when (zero? w) (swap! written conj [id v])) (recur id))
                                     (do (Thread/sleep 1) (recur prior))))))))
                  removed (with-redefs [rc/commit! (fn [& args] (swap! calls inc) (apply commit args))
                                        rc/hold! (fn [& args] (swap! holds inc) (apply hold args))]
                            (let [ws (mapv writer (range 4))]
                              (Thread/sleep 20)
                              (let [r (offers/route name "v2" "erase" {"commandId" (str "rm-h-" k) "selectors" [{"entityId" h "attribute" ":v"}]})]
                                (Thread/sleep 20) (reset! stop true) (doseq [w ws] (deref w 20000 nil)) r)))
                  ids (set (map (fn [r] (get r "assertionId")) (get-in removed [:body "identities"])))
                  position (get-in removed [:body "position"])
                  pos-of (fn [id] (some-> (d/entid (d/db conn) [:triplex.claim/command-id id])
                                          (as-> c (:triplex.claim/tx (d/entity (d/db conn) c)))
                                          (as-> t (:triplex.tx/position t))))
                  before (filter (fn [[id _]] (let [p (pos-of id)] (and p (< p position)))) @written)]
              (swap! tries conj @calls)
              (expect "hammer" removed [200 nil])
              (check! "hammer" (<= @calls 4) "the removal committed within 4 tries" @calls)
              (check! "hammer" (every? (fn [[id _]] (contains? ids id)) before)
                      "every protected value committed before the removal's position was removed with it" {:before (map first before) :ids ids})
              (check! "hammer" (contains? ids (str "h-" k)) "the seed value was removed")
              (absent-from-routes! "hammer" name [h] pin t0 (cons v0 (map second before)))))
          (let [r (offers/route name "v1" "read" {"entityIds" [b1]})]
            (check! "hammer" (str/includes? (text (:body r)) b) "another account's value is untouched"))
          (println "ERA2_HAMMER" (pr-str {:rounds rounds :tries (frequencies @tries) :guards @holds})))))))

(defn frame-race
  "[DX-ERA2 fix pass, DX-ERA3 F1/F1b] The commit-point check itself. Live, a derived write and a removal of its account
  are ordered by their locks, so the case that matters is a derived write whose request gave up (the gateway's 5 s
  wait expired, its lock released) while its transaction was still queued: here its transaction is held back until
  the removal has declared itself, then submitted. It must fail at Datomic's serial point, and no copy may land."
  [n]
  (when per-account?
    (fresh-scope false
      (fn [name conn]
        (let [counts (atom {}) bump (fn [k] (swap! counts update k (fnil inc 0)))
              declare rc/declare! submit storage/submit!]
          (doseq [i (range n)]
            (let [x (str "acct/q/s" i) v0 (secret x "seed")
                  _ (offers/send name (frame (str "q-" i) x v0 nil nil))
                  ticket (seq-now name conn)
                  accounts (when (odd? i) ["q"])
                  doc (str "notice:v1:q" i) op (str "qf-" i)
                  input (cond-> (assoc (save-frame op doc ":notice/body" (str "derived:" v0) nil nil) "erasureSeq" ticket)
                          accounts (assoc "erasureAccounts" accounts))
                  declared (promise) outcome (promise)
                  [saved removed]
                  (with-redefs [storage/submit! (fn [& args]
                                                  (if (= op (get (nth args 2) "operationId"))
                                                    (future (deref declared 30000 nil)
                                                            (try (let [r @(apply submit args)] (deliver outcome :committed) r)
                                                                 (catch Throwable e (deliver outcome (.getMessage e)) (throw e))))
                                                    (apply submit args)))
                                rc/declare! (fn [& args] (let [r (apply declare args)] (deliver declared true) r))]
                    (let [saver (future (offers/send name input))]
                      (Thread/sleep 50)
                      (let [remover (future (remove! name (str "qr-" i) x))]
                        [(deref saver 20000 {:status 0}) (deref remover 30000 {:status 0})])))
                  landed (deref outcome 30000 :never-submitted)
                  label (str "frame-race/" (if accounts "account" "no-account"))]
              (check! label (= [200 nil] (offers/outcome removed)) "the removal answers" (offers/outcome removed))
              (check! label (not= 200 (:status saved)) "the derived write's request gave up" (offers/outcome saved))
              (check! label (and (string? landed) (re-find #"TRIPLEX_|cas-failed|Compare failed" landed)) "its late transaction failed at the serial point" landed)
              (check! label (nil? (d/entid (d/db conn) [:triplex.claim/command-id op])) "it never committed")
              (check! label (not (str/includes? (text (:body (offers/route name "v1" "read" {"entityIds" [doc]}))) v0)) "no copy")
              (bump [label (if (string? landed) (or (re-find #"TRIPLEX_[A-Z_]+[ a-z-]*|cas-failed" landed) landed) landed)])))
          (println "ERA2_FRAME_RACE" (pr-str {:iterations n :outcomes @counts})))))))

(defn native-counters-agree!
  "Every native removal counter equals the one derived from the published log, and nothing is declared beyond it."
  [label name conn]
  (let [db (d/db conn) cut (privacy/cut name db true) scope (triplex.gateway.scope/entity db)
        ents (:entities cut) bks (:buckets cut)
        native-e (into {} (d/q '[:find ?k ?s :where [?e :triplex.removal/entity ?k] [?e :triplex.removal/seq ?s]] db))
        native-b (into {} (d/q '[:find ?k ?s :where [?e :triplex.removal/account ?k] [?e :triplex.removal/seq ?s]] db))
        bad (concat (for [k (into (set (keys ents)) (keys native-e)) :when (not= (get ents k 0) (get native-e k 0))] [:entity k])
                    (for [k (into (set (keys bks)) (keys native-b)) :when (not= (get bks k 0) (get native-b k 0))] [:account k]))]
    (check! label (empty? bad) "every native counter equals the log's" (take 5 bad))
    (check! label (= (:seq cut) (triplex.gateway.scope/value db scope :triplex.scope/removal-intent)
                     (triplex.gateway.scope/value db scope :triplex.scope/removal-seq))
            "nothing declared beyond the log")))

(defn- served-seq
  "The ticket a client reads: the sequence of the state a request is served from. With the commit boundary that is
  the data's (the log's cut with the removals committed past its head), else the log's."
  [name conn]
  (if commit?
    (let [db (d/db conn)] (:seq (rc/effective name db (privacy/cut name db true))))
    (seq-now name conn)))
(defn- frame-any [name conn id]
  (assoc (save-frame id (str "notice:v1:" id) ":notice/body" "derived" nil nil) "erasureSeq" (served-seq name conn)))
(defn- frame-acct [name conn id account]
  (assoc (frame-any name conn id) "erasureAccounts" [account]))
(defn- stop-ex [step] (ex-info (str "stopped " (clojure.core/name step)) {}))

(defn stop-points
  "[DX-ERA3 second review, N1] A removal stopped after each of its steps. Every stop leaves a removal the log shows as
  pending: a write it cannot reach commits; the first derived write it can reach (here one naming no account) is
  refused 503 and its gateway completes the removal; the next ones commit; the stopped removal, resent, answers the
  same removal; the counters agree with the log and nothing is declared past it."
  []
  (when per-account?
    (doseq [step [:intent :declared :held :committed :prepared]]
      (fresh-scope false
        (fn [name conn]
          (let [label (str "stop-points/" (clojure.core/name step))
                seeds (seed! name [a1 a2 b1]) value (:value (seeds a1)) pin (head conn)
                before (raw-occurrences conn value)
                declare rc/declare! commit rc/commit! hold rc/hold! publish privacy/publish! first-try (atom true)
                stopped (with-redefs [rc/declare! (fn [& args]
                                                    (when (= step :intent) (throw (stop-ex step)))
                                                    (let [r (apply declare args)] (when (= step :declared) (throw (stop-ex step))) r))
                                      rc/narrow-tries (if (= step :held) 1 rc/narrow-tries)
                                      rc/commit! (fn [& args]
                                                   (when (and (= step :held) (compare-and-set! first-try true false))
                                                     (throw (ex-info rc/moved {})))
                                                   (let [r (apply commit args)] (when (= step :committed) (throw (stop-ex step))) r))
                                      rc/hold! (fn [& args] (let [r (apply hold args)] (when (= step :held) (throw (stop-ex step))) r))
                                      privacy/publish! (fn [& args] (if (= step :prepared) (throw (stop-ex step)) (apply publish args)))]
                          (remove! name "sp-1" a1))
                pending (privacy/pending name)
                other-frame (offers/send name (frame-acct name conn "sp-b" "b"))
                other-save (offers/send name (frame "sp-sb" b1 (secret b1 "s") (:id (seeds b1)) (head conn)))
                first-any (offers/send name (frame-any name conn "sp-any-1"))
                seq-after (seq-now name conn)
                second-any (offers/send name (frame-any name conn "sp-any-2"))
                named-a (offers/send name (frame-acct name conn "sp-a" "a"))
                resent (remove! name "sp-1" a1)]
            (check! label (not= 200 (:status stopped)) "the removal did not answer while stopped" (offers/outcome stopped))
            (check! label (= 1 (get pending "seq")) "its intent is pending (every gateway sees it)" pending)
            (expect (str label ": a frame naming another account") other-frame [200 nil])
            (expect (str label ": another account's save") other-save [200 nil])
            (expect (str label ": the first frame naming no account is refused, its gateway completes the removal") first-any
                    [503 "ErasureFrontierUnavailable"])
            (check! label (= 1 seq-after) "the removal was completed by that contact" seq-after)
            (expect (str label ": the next frame naming no account") second-any [200 nil])
            (expect (str label ": a frame naming the removed account") named-a [200 nil])
            (expect (str label ": the stopped removal resent") resent [200 nil])
            (check! label (= 1 (get-in resent [:body "seq"])) "the resend answers the same removal" (:body resent))
            (check! label (marked? name a1 pin) "a1's value is marked")
            (removed-everywhere! label name conn a1 value before pin)
            (native-counters-agree! label name conn)))))))

(defn late-own-commit
  "[DX-ERA3 second review] The removal's commit waits longer than the gateway (503), and its transaction lands while
  the resend is in flight, after the resend recorded a fresh selection: the resend publishes the commit that landed."
  []
  (when per-account?
    (fresh-scope false
      (fn [name conn]
        (let [seeds (seed! name [a1 b1]) value (:value (seeds a1)) pin (head conn) before (raw-occurrences conn value)
              tx rc/transact! commit rc/commit! landed (promise) late (atom nil)
              commit-op? (fn [ops] (some (fn [op] (and (vector? op) (= rc/commit-ident (first op)))) ops))
              first-reply (with-redefs [rc/transact! (fn [c ops]
                                                       (if (and (commit-op? ops) (nil? @late))
                                                         (do (reset! late ops) (privacy/unavailable!))
                                                         (tx c ops)))]
                            (remove! name "late-1" a1))
              ;; the resend: once it has recorded its own selection and reaches its commit, the first commit lands
              resent (with-redefs [rc/commit! (fn [& args]
                                                (when-not (realized? landed)
                                                  (deliver landed (try @(d/transact-async conn @late) :committed
                                                                       (catch Exception e (.getMessage e)))))
                                                (apply commit args))]
                       (remove! name "late-1" a1))
              native (d/entid (d/db conn) [:triplex.tx/operation-id (str "privacy-" (privacy/sha256 "late-1"))])]
          (expect "late-own-commit: the first attempt" first-reply [503 "ErasureFrontierUnavailable"])
          (check! "late-own-commit" (= :committed (deref landed 1000 nil)) "the first attempt's commit landed late" (deref landed 1000 nil))
          (expect "late-own-commit: the resend" resent [200 nil])
          (check! "late-own-commit" (= (get-in resent [:body "position"]) (:triplex.tx/position (d/entity (d/db conn) native)))
                  "the resend published the commit that landed" (:body resent))
          (expect "late-own-commit: sent again" (remove! name "late-1" a1) [200 nil])
          (expect "late-own-commit: a frame naming no account" (offers/send name (frame-any name conn "late-any")) [200 nil])
          (removed-everywhere! "late-own-commit" name conn a1 value before pin)
          (native-counters-agree! "late-own-commit" name conn))))))

(defn- copy-dir! [^java.nio.file.Path from ^java.nio.file.Path to]
  (java.nio.file.Files/createDirectories to (make-array java.nio.file.attribute.FileAttribute 0))
  (with-open [st (java.nio.file.Files/list to)] (doseq [p (iterator-seq (.iterator st))] (java.nio.file.Files/delete p)))
  (with-open [st (java.nio.file.Files/list from)]
    (doseq [p (iterator-seq (.iterator st))]
      (java.nio.file.Files/copy ^java.nio.file.Path p (.resolve to (.getFileName ^java.nio.file.Path p))
                                (into-array java.nio.file.CopyOption [java.nio.file.StandardCopyOption/REPLACE_EXISTING])))))

(defn log-behind
  "[DX-ERA3 N5] The removal log restored from a backup one and two removals behind the data: every removal, the
  restore route and every derived write are refused (typed) before anything is declared or released, the native
  counters do not move, a derived write that read a removed value never lands; the gateway's start check reports it;
  once the current log is back everything works again. Also a declaration the log does not show (left by the earlier
  build), cleared by moving the database back and forward. [DX-ERA2 fourth pass] With the commit boundary the same
  steps are served instead: the removal first appends the missing entries to the log and then commits after them (so
  the restore route finds the log current), a declaration the log does not show is released by the next removal, and a
  derived write that read a removed value still never lands."
  []
  (when per-account?
    (doseq [behind [1 2]]
      (fresh-scope false
        (fn [name conn]
          (let [label (str "log-behind/" behind)
                seeds (seed! name [a1 b1 "acct/c/one"]) vb (:value (seeds b1))
                dir (.getParent (privacy/path name "head.json"))
                tmp (fn [t] (java.nio.file.Paths/get "/tmp" (into-array String [(str "era2-lb-" behind "-" t)])))
                _ (copy-dir! dir (tmp "old"))
                r1 (remove! name "lb-1" b1)
                r2 (when (= behind 2) (remove! name "lb-2" "acct/c/one"))
                _ (copy-dir! dir (tmp "current"))
                _ (copy-dir! (tmp "old") dir) _ (reset! privacy/cache {})
                native (fn [] (let [db (d/db conn) sc (triplex.gateway.scope/entity db)]
                                {:declared (triplex.gateway.scope/value db sc :triplex.scope/removal-intent)
                                 :committed (triplex.gateway.scope/value db sc :triplex.scope/removal-seq)
                                 :held (triplex.gateway.scope/value db sc :triplex.scope/removal-held)
                                 :b (rs/native-account-seq db "b") :a (rs/native-account-seq db "a")}))
                n0 (native)
                removal (remove! name "lb-3" a1)
                restore (offers/route name "v2" "restore-erasure" {})
                old-frame (offers/send name (assoc (save-frame "lb-old" "notice:v1:lb-old" ":notice/body" (str "derived:" vb) nil nil)
                                                   "erasureSeq" 0 "erasureAccounts" ["b"]))
                any-frame (offers/send name (assoc (save-frame "lb-any" "notice:v1:lb-any" ":notice/body" "x" nil nil) "erasureSeq" 0))
                start (with-out-str (rc/start-check! [name] (fn [_] conn)))
                n1 (native)
                _ (copy-dir! (tmp "current") dir) _ (reset! privacy/cache {})
                back-frame (offers/send name (frame-acct name conn "lb-b" "b"))
                back-any (offers/send name (frame-any name conn "lb-any2"))
                back-removal (remove! name "lb-3" a1)]
            (expect label r1 [200 nil])
            (when r2 (expect label r2 [200 nil]))
            (if commit?
              (do (expect (str label ": a removal while the log is behind (it catches the log up first)") removal [200 nil])
                  (check! label (= (inc behind) (get-in removal [:body "seq"])) "the removal follows the appended entries" (:body removal))
                  (expect (str label ": the restore route after the catch-up") restore [200 nil])
                  (check! label (not (str/includes? start "RemovalLogBehind")) "the start check finds the log current" start)
                  (check! label (= {:declared (inc behind) :committed (inc behind) :held "[]" :b 1 :a (inc behind)} n1)
                          "only the removal moved the counters" {:before n0 :after n1}))
              (do (expect (str label ": a removal while the log is behind") removal [503 "RemovalLogBehind"])
                  (expect (str label ": the restore route while the log is behind") restore [503 "RemovalLogBehind"])
                  (check! label (str/includes? start "RemovalLogBehind") "the start check reports it" start)
                  (check! label (= n0 n1) "nothing declared, held or released while the log is behind" {:before n0 :after n1})))
            (check! label (not= 200 (:status old-frame)) "a derived write that read the removed value never lands" (offers/outcome old-frame))
            (check! label (not= 200 (:status any-frame)) "a derived write naming no account is refused" (offers/outcome any-frame))
            (check! label (not (str/includes? (text (:body (offers/route name "v1" "read" {"entityIds" ["notice:v1:lb-old"]}))) vb)) "no copy")
            (expect (str label ": once the current log is back, a frame naming b") back-frame [200 nil])
            (expect (str label ": and one naming no account") back-any [200 nil])
            (expect (str label ": and the removal") back-removal [200 nil])
            (native-counters-agree! label name conn)))))
    ;; a declaration the log does not show, as the earlier build (27733d980) could leave
    (fresh-scope false
      (fn [name conn]
        (let [label "log-behind/undeclared" seeds (seed! name [a1 b1])
              db (d/db conn) sc (triplex.gateway.scope/entity db)
              n (triplex.gateway.scope/value db sc :triplex.scope/removal-seq)
              _ @(d/transact conn [[:db/add sc :triplex.scope/removal-intent (inc n)] [:db/add sc :triplex.scope/removal-held "[\"a\"]"]
                                   {:db/id "za" :triplex.removal/account "a" :triplex.removal/seq (- (inc n))}])
              removal (remove! name "ud-1" a1)
              frame (offers/send name (frame-any name conn "ud-any"))
              moves [(offers/route name "v2" "removal-per-account" {"back" true}) (offers/route name "v2" "removal-per-account" {})]]
          (if commit?
            (do (expect (str label ": a removal (it releases the declaration first)") removal [200 nil])
                (expect (str label ": a frame naming no account after it") frame [200 nil]))
            (do (expect (str label ": a removal") removal [503 "RemovalLogBehind"])
                (check! label (not= 200 (:status frame)) "a frame naming no account is refused" (offers/outcome frame))))
          ;; [DX-ERA2 fifth pass] the commit boundary is one-way: moving back is refused there
          (check! label (= (if commit? [[409 "RemovalBoundaryOneWay"] [200 nil]] [[200 nil] [200 nil]]) (map offers/outcome moves))
                  "moved back and forward (back refused on the commit boundary)" (map offers/outcome moves))
          (expect (str label ": after the moves, the removal") (remove! name "ud-1" a1) [200 nil])
          (expect (str label ": and a frame naming no account") (offers/send name (frame-any name conn "ud-any2")) [200 nil])
          (native-counters-agree! label name conn))))))

(defn rebuild
  "A copy restored from mid-removal (counters out of step with the log, accounts held): the restore replay rebuilds
  every counter from the log."
  []
  (when per-account?
    (fresh-scope false
      (fn [name conn]
        (let [seeds (seed! name [a1 b1])
              _ (expect "rebuild" (remove! name "rb-1" b1) [200 nil])
              db (d/db conn) scope (triplex.gateway.scope/entity db) n (triplex.gateway.scope/value db scope :triplex.scope/removal-seq)]
          @(d/transact conn [[:db/add scope :triplex.scope/removal-held "[\"zz\",\"a\"]"]
                             {:db/id "zz" :triplex.removal/account "zz" :triplex.removal/seq (- n)}
                             {:db/id "za" :triplex.removal/account "a" :triplex.removal/seq (- n)}
                             {:db/id "ze" :triplex.removal/entity "acct/zz/x" :triplex.removal/seq 7}])
          (let [r (erase/replay-after-restore! name conn)]
            (check! "rebuild" (= (seq-now name conn) (get-in r [:erasure :seq])) "the restore replay answers" r))
          (native-counters-agree! "rebuild" name conn)
          (expect "rebuild: a frame of account a" (offers/send name (frame-acct name conn "rebuild-f" "a")) [200 nil])
          (expect "rebuild: a ticket naming no account" (offers/send name (frame-any name conn "rebuild-any")) [200 nil]))))))

(defn deliveries
  "[DX-ERA3 N4] A delivery between databases (erasureSourceDatabase, the source's ticket) in both directions between a
  database guarded per account and one on the database-wide rule, and into the same database; a delivery with a
  source ticket older than a source removal is refused. Then the finding of the account-ticket builder, which this
  fix does not change: a delivery whose recipient transaction was prepared before a source removal and lands after
  it commits, because no serial point spans the two databases."
  []
  (when per-account?
    (doseq [[src-moved? rcp-moved?] [[true true] [true false] [false true]]]
      (fresh-scope false
        (fn [recipient rconn]
          (fresh-scope false
            (fn [source sconn]
              (let [label (str "deliveries/" (if src-moved? "per-account" "database-wide") "->" (if rcp-moved? "per-account" "database-wide"))
                    _ (when-not src-moved? (offers/route source "v2" "removal-per-account" {"back" true}))
                    _ (when-not rcp-moved? (offers/route recipient "v2" "removal-per-account" {"back" true}))
                    _ (seed! source [a1 b1]) _ (seed! recipient [a1 b1 "acct/c/one"])
                    _ (expect label (remove! recipient "dl-r1" b1) [200 nil])
                    _ (expect label (remove! recipient "dl-r2" "acct/c/one") [200 nil])
                    deliver (fn [k ticket] (offers/send recipient (assoc (save-frame (str "dl-" k) (str "notice:v1:dl-" k) ":notice/body" "delivered" nil nil)
                                                                         "erasureSourceDatabase" source "erasureSeq" ticket)))
                    d1 (deliver 1 (seq-now source sconn))
                    old (seq-now source sconn)
                    _ (expect label (remove! source "dl-s1" a1) [200 nil])
                    d2 (deliver 2 old)
                    d3 (deliver 3 (seq-now source sconn))]
                (expect (str label ": a delivery with the current source ticket") d1 [200 nil])
                (expect (str label ": a delivery with a source ticket older than a source removal") d2 [409 "ErasureFrontierChanged"])
                (expect (str label ": a delivery with the source's new ticket") d3 [200 nil])))))))
    (fresh-scope false
      (fn [name conn]
        (let [label "deliveries/same-database" _ (seed! name [a1 b1])
              deliver (fn [k ticket] (offers/send name (assoc (save-frame (str "ds-" k) (str "notice:v1:ds-" k) ":notice/body" "x" nil nil)
                                                              "erasureSourceDatabase" name "erasureSeq" ticket)))
              d1 (deliver 1 (seq-now name conn))
              old (seq-now name conn)
              _ (expect label (remove! name "ds-r" b1) [200 nil])
              d2 (deliver 2 old)
              d3 (deliver 3 (seq-now name conn))]
          (expect (str label ": current ticket") d1 [200 nil])
          (expect (str label ": a ticket older than a removal of the same database") d2 [409 "ErasureFrontierChanged"])
          (expect (str label ": the new ticket") d3 [200 nil]))))
    ;; the cross-database window (observed, not a check of this branch)
    (fresh-scope false
      (fn [recipient rconn]
        (fresh-scope false
          (fn [source sconn]
            (let [seeds (seed! source [a1]) v (:value (seeds a1))
                  input (assoc (save-frame "dw-late" "notice:v1:dw-late" ":notice/body" (str "derived:" v) nil nil)
                               "erasureSourceDatabase" source "erasureSeq" (seq-now source sconn))
                  captured (atom nil) submit d/transact-async
                  _ (with-redefs [d/transact-async (fn [c data & more] (if (nil? @captured) (do (reset! captured data) (future (throw (ex-info "held back" {}))))
                                                                          (apply submit c data more)))]
                      (offers/send recipient input))
                  removed (remove! source "dw-rm" a1)
                  landed (try @(d/transact-async rconn @captured) :committed (catch Exception e (.getMessage e)))
                  copy (str/includes? (text (:body (offers/route recipient "v1" "read" {"entityIds" ["notice:v1:dw-late"]}))) v)]
              (println "ERA2_DELIVERY_WINDOW" (pr-str {:source-removal (offers/outcome removed) :late-recipient-transaction landed
                                                       :copy-readable-in-recipient-after-ack copy})))))))))

(defn commit-visibility
  "[DX-ERA2 fourth pass] A removal stopped after its commit in Datomic, before its publication: no read route answers
  its value. With the commit boundary the reads are masked by the commit and the first derived write that reaches the
  removal completes it; on the log's boundary the first read publishes it before it is served (M1), so the derived
  write after it is an ordinary write."
  []
  (when per-account?
    (fresh-scope false
      (fn [name conn]
        (let [label (str "commit-visibility/" mode)
              seeds (seed! name [a1 b1]) value (:value (seeds a1)) pin (head conn)
              commit rc/commit!
              stopped (with-redefs [rc/commit! (fn [& args] (let [r (apply commit args)] (throw (stop-ex :committed)) r))]
                        (remove! name "cv-1" a1))
              texts (apply str (map (fn [[_ r]] (text (:body r))) (route-texts name a1 pin)))
              answered (str/includes? texts value)
              first-any (offers/send name (frame-any name conn "cv-any"))]
          (check! label (not= 200 (:status stopped)) "stopped after its commit" (offers/outcome stopped))
          (check! label (not answered) "no route answers the value once it is committed")
          (expect (str label ": the first frame naming no account") first-any
                  (if commit? [503 "ErasureFrontierUnavailable"] [200 nil]))
          (check! label (= 1 (seq-now name conn)) (if commit? "completed by that contact" "published by the first read"))
          (check! label (not (str/includes? (apply str (map (fn [[_ r]] (text (:body r))) (route-texts name a1 pin))) value)) "not answered after the completion"))))))

(defn log-states
  "[DX-ERA2 fourth pass] The data current and the log put back to an older copy (one and two removals behind), and
  the log missing. On the log's boundary: RemovalLogBehind (two behind), and the rebuild route is the way out; with the
  commit boundary every request is served from the data, the next removal catches the log up, and a missing log is
  refused until the rebuild route writes it from the data with the policy. In every case no route answers a removed
  value, and once the log is back every counter equals it."
  []
  (when per-account?
    (doseq [behind [1 2 :missing]]
      (fresh-scope false
        (fn [name conn]
          (let [label (str "log-states/" mode "/" behind)
                seeds (seed! name [a1 b1 "acct/c/one"]) va (:value (seeds a1)) vb (:value (seeds b1)) pin (head conn)
                dir (.getParent (privacy/path name "head.json"))
                tmp (java.nio.file.Paths/get "/tmp" (into-array String [(str "era2-ls-" (UUID/randomUUID))]))
                _ (copy-dir! dir tmp)
                _ (expect label (remove! name "ls-1" a1) [200 nil])
                _ (when (= behind 1) (copy-dir! dir tmp))
                _ (expect label (remove! name "ls-2" b1) [200 nil])
                _ (if (= behind :missing)
                    (with-open [st (java.nio.file.Files/list dir)] (doseq [p (iterator-seq (.iterator st))] (java.nio.file.Files/delete p)))
                    (copy-dir! tmp dir))
                _ (reset! privacy/cache {})
                read-a (offers/route name "v1" "read" {"entityIds" [a1 b1]})
                answered (or (str/includes? (text (:body read-a)) va) (str/includes? (text (:body read-a)) vb))
                other-save (offers/send name (frame "ls-sc" "acct/c/one" (secret "acct/c/one" "s") (:id (seeds "acct/c/one")) (head conn)))
                ;; [DX-ERA2 fifth pass, Z2] the rebuild route takes no policy (it is the database's)
                with-policy (offers/route name "v2" "removal-log-rebuild" {"attributes" [":v"] "sealed" false})
                rebuild (offers/route name "v2" "removal-log-rebuild" {})
                after-any (offers/send name (frame-any name conn "ls-any"))
                after-removal (remove! name "ls-3" "acct/c/one")]
            (check! label (not answered) "no route answers a removed value while the log is behind or missing")
            (cond
              ;; [DX-ERA2 fifth pass, Z2] the first request is refused and its gateway rebuilds the log from the data and
              ;; the database's own policy; the next request is served
              (= behind :missing) (do (expect (str label ": the first request while the log is missing") read-a [503 "RemovalLogMissing"])
                                      (expect (str label ": the next request (the log rebuilt by the first)") other-save [200 nil]))
              commit? (do (expect (str label ": a read") read-a [200 nil])
                          (expect (str label ": another account's save") other-save [200 nil]))
              (= behind 2) (expect (str label ": a read on the log's boundary") read-a [503 "RemovalLogBehind"])
              :else (expect (str label ": a read on the log's boundary, one behind (nothing pending in the copy)") read-a [503 "RemovalLogBehind"]))
            (expect (str label ": the rebuild route with a policy in the body") with-policy [400 "InvalidValue"])
            (expect (str label ": the rebuild route") rebuild [200 nil])
            (check! label (= 2 (get-in rebuild [:body "seq"])) "the log rebuilt up to the data (two removals)" (:body rebuild))
            (check! label (= 3 (seq-now name conn) (get-in after-removal [:body "seq"])) "the removal after the rebuild is sequence 3" (:body after-removal))
            (expect (str label ": a frame naming no account after it") after-any [200 nil])
            (expect (str label ": a removal after it") after-removal [200 nil])
            (check! label (not (str/includes? (text (:body (offers/route name "v1" "read" {"entityIds" [a1 b1]}))) va)) "a1 not answered after")
            (native-counters-agree! label name conn)))))))

(defn policy-and-reconcile
  "[DX-ERA2 fifth pass, Z1 and Z2 of the fourth review] (a) A database whose policy is only in its log (an earlier
  build's move: the stored policy retracted here) loses its log: requests are refused 503 RemovalLogMissing, the
  rebuild route 409 ProtectionPolicyUnknown; any copy of the log's head put back (here the one from before the first
  removal) and the rebuild route writes the rest from the data and adopts the policy. (b) A stored policy that differs
  from the log's is refused (409 ProtectionPolicyMismatch). (c) A removal record an earlier build replayed with its new
  position written into it: on the commit boundary writes are refused 503 RemovalLogConflict; the reconcile route
  (body {} only) rewrites it as published and writes are served again. No removed value is answered throughout."
  []
  (when per-account?
    (fresh-scope false
      (fn [name conn]
        (let [label (str "policy-and-reconcile/" mode)
              seeds (seed! name [a1 b1 "acct/c/one" "acct/d/one"]) va (:value (seeds a1)) vb (:value (seeds b1))
              dir (.getParent (privacy/path name "head.json"))
              tmp (java.nio.file.Paths/get "/tmp" (into-array String [(str "era2-pr-" (UUID/randomUUID))]))
              _ (copy-dir! dir tmp)
              policy-attr :triplex.scope/protection-policy
              stored (fn [] (rc/stored-policy (d/db conn)))
              head-e (fn [] (triplex.gateway.scope/entity (d/db conn)))
              _ (check! label (= {"attributes" [":v"] "sealed" false} (stored)) "the move stored the policy in the database" (stored))
              _ (expect label (remove! name "pr-1" a1) [200 nil])
              ;; (a) the policy only in the log, then the log lost
              _ @(d/transact conn [[:db/retract (head-e) policy-attr (triplex.gateway.scope/value (d/db conn) (head-e) policy-attr)]])
              _ (with-open [st (java.nio.file.Files/list dir)] (doseq [x (iterator-seq (.iterator st))] (java.nio.file.Files/delete x)))
              _ (reset! privacy/cache {})
              first-read (offers/route name "v1" "read" {"entityIds" [a1 b1]})
              second-read (offers/route name "v1" "read" {"entityIds" [a1 b1]})
              unknown (offers/route name "v2" "removal-log-rebuild" {})
              _ (copy-dir! tmp dir)
              _ (reset! privacy/cache {})
              rebuilt (offers/route name "v2" "removal-log-rebuild" {})
              adopted (stored)
              after-rebuild (offers/route name "v1" "read" {"entityIds" [a1 b1]})
              ;; (b) a stored policy that differs from the log's
              _ @(d/transact conn [[:db/add (head-e) policy-attr (json/write-str {"attributes" [":w"] "sealed" false})]])
              mismatch (offers/route name "v2" "removal-log-rebuild" {})
              _ @(d/transact conn [[:db/add (head-e) policy-attr (json/write-str adopted)]])
              ;; (c) an earlier build's replay wrote its new position into the record
              _ (expect label (remove! name "pr-2" b1) [200 nil])
              native (last (:entries (rc/native-entries name (d/db conn))))
              shifted (assoc (:entry native) "position" (inc (long (get-in native [:entry "position"]))))
              _ @(d/transact conn [[:db/add (:e native) :triplex.tx/erasure-record (json/write-str shifted)]])
              _ (swap! @#'rc/natives dissoc name)
              _ (reset! privacy/cache {})
              conflict-save (offers/send name (frame "pr-sc" "acct/c/one" (secret "acct/c/one" "s") (:id (seeds "acct/c/one")) (head conn)))
              with-body (offers/route name "v2" "removal-log-reconcile" {"attributes" [":v"]})
              reconciled (offers/route name "v2" "removal-log-reconcile" {})
              after-save (offers/send name (frame "pr-sd" "acct/d/one" (secret "acct/d/one" "s") (:id (seeds "acct/d/one")) (head conn)))
              after-removal (remove! name "pr-3" "acct/c/one")
              history (offers/route name "v1" "read" {"entityIds" [a1 b1] "history" true})
              leaks (into {} (for [[k r] {:first-read first-read :second-read second-read :after-rebuild after-rebuild :history-at-the-end history}
                                   ;; b1 is removed only in part (c): its value is checked in the read after it
                                   :let [t (text (:body r)) b? (and (= k :history-at-the-end) (str/includes? t vb))]
                                   :when (or (str/includes? t va) b?)]
                               [k {:a1 (str/includes? t va) :b1 b? :body (subs t 0 (min 1500 (count t)))}]))]
          (println "ERA2_POLICY_RECONCILE" mode
                   (pr-str {:first-read (offers/outcome first-read) :second-read (offers/outcome second-read)
                            :rebuild-without-a-stored-policy (offers/outcome unknown) :rebuild-after-the-head-put-back (offers/outcome rebuilt)
                            :adopted adopted :mismatch (offers/outcome mismatch) :save-with-a-shifted-record (offers/outcome conflict-save)
                            :reconcile-with-a-body (offers/outcome with-body) :reconcile (offers/outcome reconciled) :rewritten (get-in reconciled [:body "rewritten"])
                            :save-after (offers/outcome after-save) :removal-after (offers/outcome after-removal)}))
          (check! label (empty? leaks) "no removed value answered" leaks)
          (expect (str label ": the first request with the log missing") first-read [503 "RemovalLogMissing"])
          (expect (str label ": the next request, no stored policy") second-read [503 "RemovalLogMissing"])
          (expect (str label ": the rebuild route, no stored policy") unknown [409 "ProtectionPolicyUnknown"])
          (expect (str label ": the rebuild route after a copy of the head is put back") rebuilt [200 nil])
          (check! label (= 1 (get-in rebuilt [:body "seq"])) "the log rebuilt to the data" (:body rebuilt))
          (check! label (= {"attributes" [":v"] "sealed" false} adopted) "the policy adopted again from the log's head" adopted)
          (expect (str label ": a read after it") after-rebuild [200 nil])
          (expect (str label ": a stored policy that differs from the log's") mismatch [409 "ProtectionPolicyMismatch"])
          (when commit? (expect (str label ": a save with a record shifted by an earlier build's replay") conflict-save [503 "RemovalLogConflict"]))
          (expect (str label ": the reconcile route with a body") with-body [400 "InvalidValue"])
          (expect (str label ": the reconcile route") reconciled [200 nil])
          (check! label (= 1 (get-in reconciled [:body "rewritten"])) "the shifted record rewritten as published" (:body reconciled))
          (check! label (= (get (:commands (privacy/cut name (d/db conn) true)) "pr-2") (some #(when (= "pr-2" (get (:entry %) "commandId")) (:entry %)) (:entries (rc/native-entries name (d/db conn))))) "the data's record equals the published entry")
          (expect (str label ": a save after it") after-save [200 nil])
          (expect (str label ": a removal after it") after-removal [200 nil])
          (native-counters-agree! label name conn))))))

(defn catch-up
  "[DX-ERA2 fourth pass, commit boundary] The log put back two removals behind; the next removal appends both from the
  data before its own; the log then equals the data."
  []
  (when commit?
    (fresh-scope false
      (fn [name conn]
        (let [seeds (seed! name [a1 b1 "acct/c/one"]) va (:value (seeds a1))
              dir (.getParent (privacy/path name "head.json"))
              tmp (java.nio.file.Paths/get "/tmp" (into-array String [(str "era2-cu-" (UUID/randomUUID))]))
              _ (copy-dir! dir tmp)
              _ (expect "catch-up" (remove! name "cu-1" a1) [200 nil])
              _ (expect "catch-up" (remove! name "cu-2" b1) [200 nil])
              _ (copy-dir! tmp dir) _ (reset! privacy/cache {})
              r (remove! name "cu-3" "acct/c/one")]
          (expect "catch-up: the next removal" r [200 nil])
          (check! "catch-up" (= 3 (get-in r [:body "seq"]) (seq-now name conn)) "sequence 3, after appending 1 and 2" (:body r))
          (check! "catch-up" (= #{"cu-1" "cu-2" "cu-3"} (set (keys (:commands (privacy/cut name (d/db conn) true))))) "the log holds all three")
          (check! "catch-up" (not (str/includes? (text (:body (offers/route name "v1" "read" {"entityIds" [a1]}))) va)) "a1 not answered")
          (native-counters-agree! "catch-up" name conn))))))

(defn lock-lost
  "[DX-ERA3 second review] Two removals of different commands at once, with the database's lock not held (as after a
  lost lock): the intent is the arbiter, one records it and the other answers 503; resent, both complete, the log
  verifies, every counter agrees and both values are removed."
  [n]
  (when per-account?
    (fresh-scope false
      (fn [name conn]
        (let [counts (atom {}) guard privacy/guard]
          (doseq [i (range n)]
            (let [x (str "acct/k/s" i) y (str "acct/j/s" i)
                  vx (secret x "seed") vy (secret y "seed")
                  _ (expect "lock-lost: seed" (offers/send name (frame (str "kseed-x" i) x vx nil nil)) [200 nil])
                  _ (expect "lock-lost: seed" (offers/send name (frame (str "kseed-y" i) y vy nil nil)) [200 nil])
                  pin (head conn)
                  bx (raw-occurrences conn vx) by (raw-occurrences conn vy)
                  [rx ry] (with-redefs [privacy/guard (fn [scope work] (if (str/includes? scope "#removal/") (guard scope work) (work)))]
                            (let [fx (future (remove! name (str "kx-" i) x)) fy (future (remove! name (str "ky-" i) y))]
                              [(deref fx 20000 {:status 0}) (deref fy 20000 {:status 0})]))
                  outcomes (sort (map offers/outcome [rx ry]))
                  ax (remove! name (str "kx-" i) x) ay (remove! name (str "ky-" i) y)]
              (swap! counts update outcomes (fnil inc 0))
              (check! "lock-lost" (some #(= [200 nil] %) outcomes) "one of the two completes at once" outcomes)
              (check! "lock-lost" (every? #(contains? #{[200 nil] [503 "ErasureFrontierUnavailable"]} %) outcomes) "the other completes or answers 503" outcomes)
              (expect "lock-lost: x resent" ax [200 nil]) (expect "lock-lost: y resent" ay [200 nil])
              (check! "lock-lost" (not= (get-in ax [:body "seq"]) (get-in ay [:body "seq"])) "two sequences")
              (removed-everywhere! "lock-lost/x" name conn x vx bx pin)
              (removed-everywhere! "lock-lost/y" name conn y vy by pin)))
          (native-counters-agree! "lock-lost" name conn)
          (println "ERA2_LOCK_LOST" (pr-str {:iterations n :outcomes @counts})))))))

(defn named-absent
  "A removal naming an entity that has no row yet: a creation save and an import frame of it prepared before the
  removal are refused after it (its counter moved); a creation sent after the removal is new data."
  []
  (when per-account?
    (fresh-scope false
      (fn [name conn]
        (let [x "acct/n/new" v (secret x "early") vi (secret x "import") vl (secret x "late")
              pin (head conn) t0 (d/basis-t (d/db conn))
              remove-x #(offers/route name "v2" "erase" {"commandId" % "selectors" [{"entityId" x "attribute" ":v"}]})
              r1 (with-held name (frame "early" x v nil (head conn)) #(expect "named-absent" (remove-x "rm-n1") [200 nil]))]
          ;; [DX-ERA2 fifth pass, R2-2] the terminal answer: a removal naming its subject landed after its frame
          (expect "named-absent: a creation prepared before the removal, sent after it" r1 [409 "ErasureReplayDeclined"])
          (check! "named-absent" (= 1 (rs/native-entity-seq (d/db conn) x)) "the named entity's sequence moved with no row")
          (let [r2 (if policy/import-whole?
                     ;; [DX-ACT9] With TX2_IMPORT_WHOLE_SUBJECT=1 (every option on together) an import of a removed
                     ;; family is declined at validation, before any plan (DX-IMP2's rule; the first removal already
                     ;; named this family), so it cannot be held at its plan: prepared before the second removal, sent
                     ;; after it, it is declined.
                     (let [f (frame* "import-early" x ":v" vi nil (head conn) {:actor "bulk-import"})]
                       (expect "named-absent" (remove-x "rm-n2") [200 nil])
                       (offers/send name f))
                     (with-held name (frame* "import-early" x ":v" vi nil (head conn) {:actor "bulk-import"})
                       #(expect "named-absent" (remove-x "rm-n2") [200 nil])))]
            (expect "named-absent: an import frame prepared before a removal, sent after it" r2
                    ;; [DX-ERA2 fifth pass, R2-2] declined on the general writer's path too
                    [409 "ErasureReplayDeclined"]))
          (absent-from-routes! "named-absent" name [x] pin t0 [v vi])
          (let [late (offers/send name (frame "late" x vl nil (head conn)))]
            (expect "named-absent: a creation sent after the removal (new data)" late [200 nil])))))))

(defn same-subject-twice
  "Two removals of the same subject at once."
  [sealed?]
  (when per-account?
    (fresh-scope sealed?
      (fn [name conn]
        (let [seeds (seed! name [a1 b1]) value (:value (seeds a1)) pin (head conn) before (raw-occurrences conn value)
              r1 (future (remove! name "twice-1" a1)) r2 (future (remove! name "twice-2" a1))]
          (expect "same-subject-twice" @r1 [200 nil]) (expect "same-subject-twice" @r2 [200 nil])
          (check! "same-subject-twice" (= #{1 2} (set [(get-in @r1 [:body "seq"]) (get-in @r2 [:body "seq"])])) "two sequences")
          (check! "same-subject-twice" (= 1 (count (filter seq [(get-in @r1 [:body "identities"]) (get-in @r2 [:body "identities"])])))
                  "the value is removed by exactly one of them")
          (removed-everywhere! "same-subject-twice" name conn a1 value before pin))))))

(defn subject-mid-import
  "A subject being imported (import frames, each replacing the last) while it is removed."
  [frames]
  (when per-account?
    (fresh-scope false
      (fn [name conn]
        (let [y "acct/m/imported" seed (secret y "seed")
              _ (expect "mid-import" (offers/send name (frame* "imp-0" y ":v" seed nil nil {:actor "bulk-import"})) [200 nil])
              pin (head conn) t0 (d/basis-t (d/db conn))
              values (atom {"imp-0" seed}) results (atom [])
              importer (future
                         (loop [k 1 prior "imp-0"]
                           (when (<= k frames)
                             (let [id (str "imp-" k) v (secret y (str "i" k))
                                   r (offers/send name (frame* id y ":v" v prior (head conn) {:actor "bulk-import"}))]
                               (swap! values assoc id v) (swap! results conj [id (offers/outcome r)])
                               (Thread/sleep (long (rand-int 3)))
                               (recur (inc k) (if (= 200 (:status r)) id prior))))))
              _ (Thread/sleep 15)
              removed (offers/route name "v2" "erase" {"commandId" "rm-mid" "selectors" [{"entityId" y "attribute" ":v"}]})
              _ (deref importer 60000 nil)
              ids (set (map (fn [r] (get r "assertionId")) (get-in removed [:body "identities"])))
              committed (set (map first (filter (fn [[_ o]] (= [200 nil] o)) @results)))
              after (offers/route name "v2" "erase" {"commandId" "rm-mid-2" "selectors" [{"entityId" y "attribute" ":v"}]})
              ids2 (set (map (fn [r] (get r "assertionId")) (get-in after [:body "identities"])))]
          (expect "mid-import" removed [200 nil])
          (check! "mid-import" (contains? ids "imp-0") "the first imported value was removed")
          ;; every frame that committed did so before the removal's serial point (removed by it), or after it under a
          ;; cut that already held the removal, which the removed family refuses; a second removal finds nothing new
          (check! "mid-import" (every? ids committed) "every committed import frame was removed by the removal"
                  {:committed committed :ids ids :results @results})
          (check! "mid-import" (empty? ids2) "a second removal finds no imported value left" ids2)
          (check! "mid-import" (every? (fn [[_ o]] (contains? #{[200 nil] [409 "CasConflict"] [409 "ErasureReplayDeclined"]} o)) @results)
                  "import frames either committed or were refused" (frequencies (map second @results)))
          (println "ERA2_MID_IMPORT" (pr-str (frequencies (map second @results))))
          (absent-from-routes! "mid-import" name [y] pin t0 (vals @values)))))))

(defn data-behind
  "[DX-ERA2 fourth pass, commit boundary] The data behind the log (older data restored): the state a request is
  served from is the log's cut, which masks every removal the log holds, and writes are refused RemovalDataBehind.
  Checked on a database value from before the log's last removal (the stack's restore of older data found `effective`
  indexing past the data's last entry)."
  []
  (when commit?
    (fresh-scope false
      (fn [name conn]
        (let [seeds (seed! name [a1 b1])
              _ (expect "data-behind" (remove! name "db-1" a1) [200 nil])
              older (d/db conn)
              _ (expect "data-behind" (remove! name "db-2" b1) [200 nil])
              state (privacy/cut name (d/db conn) true)
              e (try (rc/effective name older state) (catch Throwable t {:threw (str t)}))]
          (check! "data-behind" (= "RemovalDataBehind" (:writes-refused e)) "writes refused, typed" (select-keys e [:writes-refused :threw :seq]))
          (check! "data-behind" (= 2 (:seq e)) "served from the log's cut (both removals masked)" (:seq e))
          (check! "data-behind" (contains? (:erased e) (:id (seeds b1))) "b1's value, removed only in the log's newer entry, is masked" (keys (:erased e))))))))

(defn boundary-transition
  "[DX-ERA2 fifth pass] The commit boundary as a one-way setting in the database (-2 in :triplex.scope/erasure-seq),
  turned on by a process allowed to (here `rc/may-turn-on` redefined true, on a database guarded per account and still
  on the log's boundary). A save planned before the move and committed after it is refused at the serial point (it
  fenced on -1) and is stored when sent again; a removal left committed but unpublished is completed by the move
  before it turns; the move is idempotent; the database does not move back; a process without permission is refused
  and follows the stored setting (its requests are served on the commit boundary)."
  []
  (when (and per-account? (not commit?))
    (fresh-scope false
      (fn [name conn]
        (let [label (str "boundary-transition/" mode)
              seeds (seed! name [a1 a2 b1]) va (:value (seeds a1)) pin (head conn)
              turn #(offers/route name "v2" "removal-commit-boundary" {})
              refused-without (turn)
              ;; a removal left committed and unpublished (its gateway stopped there)
              commit rc/commit! apply-native erase/apply-native!
              stopped (with-redefs [rc/commit! (fn [& args] (let [r (apply commit args)] (throw (ex-info "stopped after the commit" {})) r))
                                    erase/apply-native! (fn [& args] (let [r (apply apply-native args)] (throw (ex-info "stopped after the commit" {})) r))]
                        (remove! name "bt-1" a1))
              pending-before (some? (privacy/pending name))
              ;; a save of b1 planned before the move, committed after it
              held (frame "bt-held" b1 (secret b1 "held") (:id (seeds b1)) (head conn))
              [moved late] (with-redefs [rc/may-turn-on true]
                             (let [m (atom nil)
                                   r (with-held name held #(reset! m (turn)))]
                               [@m r]))
              again (with-redefs [rc/may-turn-on true] (turn))
              back (offers/route name "v2" "removal-per-account" {"back" true})
              ;; [DX-ERA2 sixth pass] the held save was stored (V9), so the next save of b1 retires its value
              resent (offers/send name (frame "bt-held-2" b1 (secret b1 "held2") (if (= 200 (:status late)) "bt-held" (:id (seeds b1))) (head conn)))
              read-a1 (offers/route name "v1" "read" {"entityIds" [a1]})]
          (expect (str label ": a process without permission") refused-without [403 "RemovalBoundaryNotPermitted"])
          (check! label (not= 200 (:status stopped)) "the removal stopped after its commit" (offers/outcome stopped))
          (check! label pending-before "it is pending" nil)
          (check! label (and (= 200 (:status moved)) (true? (get-in moved [:body "changed"]))) "the move to the commit boundary" (:body moved))
          (check! label (nil? (privacy/pending name)) "the pending removal was completed before the move" (privacy/pending name))
          (check! label (= 1 (seq-now name conn)) "published as sequence 1" (seq-now name conn))
          (check! label (rc/commit-boundary? (d/db conn)) "the database now removes at the commit" nil)
          ;; [DX-ERA2 sixth pass, V9] the gateway plans it once more (was 409 CasConflict, replayed by the client)
          (expect (str label ": a save planned before the move, committed after it") late [200 nil])
          (check! label (= [200 false] [(:status again) (get-in again [:body "changed"])]) "moving again changes nothing" (:body again))
          (expect (str label ": moving back") back [409 "RemovalBoundaryOneWay"])
          (expect (str label ": the save sent again") resent [200 nil])
          (check! label (not (str/includes? (text (:body read-a1)) va)) "a1 not answered" nil)
          (check! label (marked? name a1 pin) "a1 marked at the old position" nil)
          (native-counters-agree! label name conn))))))

(defn cache-stamps
  "[DX-ERA2 fifth pass, B5] Caches across a removal stopped after its commit in Datomic (before its publication). Reach
  sessions remember a1 at a pin (the server then answers a remembered entity without its rows, and the client reuses
  its own copy) and the erasure frontier is read; the removal of a1 commits and stops; then the same sessions read the
  same pin. Each must send a1 again with its rows (masked), never `unchanged`, and no route may answer the value. With
  the commit boundary the frontier's sequence stays (tickets wait for the publication) and its removalStamp moves at
  the commit; on the log's boundary the first read publishes the removal, so both move. Also a fresh session and the
  plain read routes."
  []
  (when per-account?
    (fresh-scope false
      (fn [name conn]
        (let [label (str "cache-stamps/" mode)
              seeds (seed! name [a1 b1]) value (:value (seeds a1)) pin (head conn)
              frontier #(:body (offers/route name "v2" "erasure-frontier" nil))
              reach-at (fn [session] (offers/route name "v2" "reach" {"root" a1 "basis" {"recordedPosition" pin "validAt" 1.0e12}
                                                                       "session" session "erasureRefs" true}))
              entity-of (fn [r] (some (fn [e] (when (= a1 (first e)) e)) (get (json/read-str (text (:body r))) "entities")))
              w1 (reach-at "cs-pin-1") w2 (reach-at "cs-pin-2")
              f0 (frontier)
              stop (fn [f] (fn [& args] (let [r (apply f args)] (throw (ex-info "stopped after the commit" {})) r)))
              stopped (with-redefs [rc/commit! (stop rc/commit!) erase/apply-native! (stop erase/apply-native!)]
                        (remove! name "cs-1" a1))
              r1 (reach-at "cs-pin-1") r2 (reach-at "cs-pin-2") r3 (reach-at "cs-pin-fresh")
              f1 (frontier)
              texts (route-texts name a1 pin)]
          (check! label (str/includes? (text (:body w1)) value) "warm: the session at the pin holds the value" nil)
          (check! label (= 3 (count (entity-of w2))) "warm: sent with its rows" (entity-of w2))
          (check! label (not= 200 (:status stopped)) "the removal stopped after its commit" (offers/outcome stopped))
          (doseq [[k r] {:remembered-1 r1 :remembered-2 r2 :fresh r3}]
            (check! label (= 200 (:status r)) (str "reach " k " answers") (:status r))
            (check! label (not (str/includes? (text (:body r)) value)) (str "reach " k " does not answer the value") nil)
            (check! label (= 3 (count (entity-of r))) (str "reach " k " sends a1 again with its rows, not `unchanged`") (entity-of r)))
          (doseq [[route reply] texts]
            (check! label (not (str/includes? (text (:body reply)) value)) (str "route " route " does not answer the value") nil))
          (if commit?
            (do (check! label (= (get f0 "seq") (get f1 "seq")) "commit boundary: the sequence waits for the publication" [f0 f1])
                (check! label (= (inc (get f0 "removalStamp")) (get f1 "removalStamp")) "commit boundary: the stamp moved at the commit" [(get f0 "removalStamp") (get f1 "removalStamp")]))
            (check! label (= 1 (get f1 "seq") (get f1 "removalStamp")) "log boundary: the first read published it; sequence and stamp 1" f1))
          (println "ERA2_CACHE_STAMPS" mode (pr-str {:before (select-keys f0 ["seq" "removalStamp"]) :after (select-keys f1 ["seq" "removalStamp"])})))))))

(defn pending-tag-walk
  "[DX-ERA2 fifth pass, Z3 of the fourth review] Every kind of write a removal left pending can refuse: the refusal
  arrives typed (503 ErasureFrontierUnavailable) and its gateway completes the removal (published as sequence 1,
  nothing pending), on both writers. Each variant: a removal of a1 stopped after its declaration, then one write."
  []
  (when per-account?
    (doseq [variant [:frame-no-account :frame-naming-a :frame-no-account-general :frame-naming-a-general
                     :delivery-into :delivery-from
                     ;; [DX-ERA2 fifth pass] a delivery naming its source's accounts (on the account-ticket line it goes
                     ;; through source-ticket!), and a source check whose refusal carries no tag (source-ticket!'s did not)
                     :delivery-from-naming-accounts :delivery-from-untagged]]
      (fresh-scope false
        (fn [name conn]
          (fresh-scope false
            (fn [other oconn]
              (let [label (str "pending-tag-walk/" mode "/" (clojure.core/name variant))
                    _ (seed! name [a1 b1]) _ (seed! other [b1])
                    declare rc/declare!
                    stopped (with-redefs [rc/declare! (fn [& args] (let [r (apply declare args)] (throw (stop-ex :declared)) r))]
                              (remove! name "tw-1" a1))
                    pending (some? (privacy/pending name))
                    general (fn [f] (with-redefs [subject/plan (fn [& _] nil)] (f)))
                    deliver (fn [into from ticket]
                              (offers/send into (assoc (save-frame (str "tw-d-" (UUID/randomUUID)) (str "notice:v1:tw-" (UUID/randomUUID))
                                                                   ":notice/body" "delivered" nil nil)
                                                       "erasureSourceDatabase" from "erasureSeq" ticket)))
                    r (case variant
                        :frame-no-account (offers/send name (frame-any name conn "tw-any"))
                        :frame-naming-a (offers/send name (frame-acct name conn "tw-a" "a"))
                        :frame-no-account-general (general #(offers/send name (frame-any name conn "tw-any-g")))
                        :frame-naming-a-general (general #(offers/send name (frame-acct name conn "tw-a-g" "a")))
                        :delivery-into (deliver name other (seq-now other oconn))
                        :delivery-from (deliver other name (seq-now name conn))
                        :delivery-from-naming-accounts
                        (offers/send other (assoc (save-frame (str "tw-d-" (UUID/randomUUID)) (str "notice:v1:tw-" (UUID/randomUUID))
                                                              ":notice/body" "delivered" nil nil)
                                                  "erasureSourceDatabase" name "erasureSeq" (seq-now name conn) "erasureAccounts" ["a"]))
                        :delivery-from-untagged
                        (with-redefs [rc/check-source! (fn [source _ _] (when (privacy/pending source) (privacy/unavailable!)))]
                          (deliver other name (seq-now name conn))))]
                (check! label (not= 200 (:status stopped)) "the removal stopped after its declaration" (offers/outcome stopped))
                (check! label pending "it is pending" nil)
                (expect (str label ": the refused write") r [503 "ErasureFrontierUnavailable"])
                (check! label (nil? (privacy/pending name)) "the refusal completed the removal" (privacy/pending name))
                (check! label (= 1 (seq-now name conn)) "published as sequence 1" (seq-now name conn))))))))))

;; ---- [DX-ERA2 fifth pass] the authority's intent deleted between a check and a read (the derived-copies builder's
;; finding: another account's delivery answered 400 GatewayError naming pending.json) ---------------------------------
(defn pending-file-race
  "A removal of a1 published up to its last step (head written, its intent file not yet deleted); then, for each kind
  of request of ANOTHER account, the intent file is deleted exactly between the existence check and the read (every
  check of pending.json deletes it first, as the publication's last step would at that moment). Every request must be
  answered without a 400: 200, or a typed refusal. File authority (the PostgreSQL authority reads a row in one query)."
  []
  (doseq [variant [:read-b1 :save-b1 :frame-no-account :frame-naming-b :frontier :reach-b1 :removal-b1
                   :delivery-from :delivery-into]]
    (fresh-scope false
      (fn [name conn]
        (fresh-scope false
          (fn [other oconn]
            (let [label (str "pending-file-race/" mode "/" (clojure.core/name variant))
                  seeds (seed! name [a1 b1]) _ (seed! other [b1]) va (:value (seeds a1))
                  remove-record @#'privacy/remove-record!
                  stopped (with-redefs-fn {#'privacy/remove-record!
                                           (fn [n r] (if (and (= n name) (= r "pending.json"))
                                                       (throw (ex-info "stopped before the intent file's deletion" {}))
                                                       (remove-record n r)))}
                            #(remove! name "pfr-1" a1))
                  intent-file (privacy/path name "pending.json")
                  lingering (privacy/exists? intent-file)
                  published (get (json/read-str (privacy/record-text name "head.json")) "seq")
                  deletions (atom 0)
                  exists privacy/exists?
                  ticket (served-seq name conn)
                  deliver (fn [into from t]
                            (offers/send into (assoc (save-frame (str "pfr-d-" (UUID/randomUUID)) (str "notice:v1:pfr-" (UUID/randomUUID))
                                                                 ":notice/body" "delivered" nil nil)
                                                     "erasureSourceDatabase" from "erasureSeq" t)))
                  r (with-redefs [privacy/exists? (fn [^java.nio.file.Path p]
                                                    (let [found (exists p)]
                                                      ;; only the published removal's lingering intent (pfr-1): the
                                                      ;; intent of a removal this request starts is its own
                                                      (when (and found (= "pending.json" (str (.getFileName p)))
                                                                 (str/includes? (java.nio.file.Files/readString p) "\"pfr-1\""))
                                                        (java.nio.file.Files/deleteIfExists p) (swap! deletions inc))
                                                      found))]
                      (case variant
                        :read-b1 (offers/route name "v1" "read" {"entityIds" [b1]})
                        :save-b1 (offers/send name (frame "pfr-b1" b1 (secret b1 "s") (:id (seeds b1)) (head conn)))
                        :frame-no-account (offers/send name (assoc (save-frame "pfr-n" "notice:v1:pfr-n" ":notice/body" "n" nil nil) "erasureSeq" ticket))
                        :frame-naming-b (offers/send name (assoc (save-frame "pfr-nb" "notice:v1:pfr-nb" ":notice/body" "n" nil nil)
                                                                 "erasureSeq" ticket "erasureAccounts" ["b"]))
                        :frontier (offers/route name "v2" "erasure-frontier" nil)
                        :reach-b1 (offers/route name "v2" "reach" {"root" b1 "basis" {"recordedPosition" (head conn) "validAt" 1.0e12}
                                                                   "session" "pfr" "erasureRefs" true})
                        :removal-b1 (remove! name "pfr-2" b1)
                        :delivery-from (deliver other name ticket)
                        :delivery-into (deliver name other (served-seq other oconn))))
                  obs {:stopped (offers/outcome stopped) :intent-lingering lingering :published published
                       :intent-deleted-between-check-and-read @deletions :answer (offers/outcome r)
                       :message (get-in r [:body "message"])}]
              (println "ERA2_PENDING_FILE_RACE" mode (pr-str [variant obs]))
              (check! label (and lingering (= 1 published)) "set-up: the removal published, its intent file still there" obs)
              (check! label (pos? @deletions) "the intent file was deleted between a check and a read" obs)
              (check! label (not= 400 (:status r)) "another account's request is never answered 400 by someone else's removal" obs)
              (check! label (or (= 200 (:status r)) (and (#{409 503} (:status r)) (string? (get-in r [:body "code"]))))
                      "answered 200 or a typed refusal" obs)
              (check! label (not (str/includes? (text (:body (offers/route name "v1" "read" {"entityIds" [a1]}))) va))
                      "a1 not answered" nil))))))))

;; ---- [DX-ERA2 fifth pass] the PostgreSQL authority's session lost at each step of a removal -----------------------
(defn authority-fault-steps
  "The authority fails once with the error a killed PostgreSQL session gives (java.sql.SQLException) at each step of a
  removal: its intent, its declaration, its native commit, its prepared publication, its publication. The removal is
  answered a typed 503 ErasureFrontierUnavailable, never 400. Per account the gateway then completes it itself (the
  completion tag; nothing pending, published as 1); under today's database-wide rule it stays pending and the client's
  resend completes it (completion without the client is the owner's decision there)."
  []
  (doseq [step [:intent :declared :committed :prepared :published]]
    (when (or per-account? (#{:intent :committed :published} step))
      (fresh-scope false
        (fn [name conn]
          (let [label (str "authority-fault-steps/" mode "/" (clojure.core/name step))
                seeds (seed! name [a1 b1]) va (:value (seeds a1))
                fired (atom false)
                fault (fn [f] (fn [& args]
                                (if (compare-and-set! fired false true)
                                  (throw (java.sql.SQLException. "This connection has been closed." "08003"))
                                  (apply f args))))
                after (fn [f] (fn [& args]
                                (let [r (apply f args)]
                                  (if (compare-and-set! fired false true)
                                    (throw (java.sql.SQLException. "This connection has been closed." "08003"))
                                    r))))
                redefs (case step
                         :intent {#'privacy/prepare! (fault privacy/prepare!)}
                         :declared {#'rc/declare! (after rc/declare!)}
                         :committed (if per-account? {#'rc/commit! (after rc/commit!)} {#'erase/apply-native! (after erase/apply-native!)})
                         :prepared {#'rc/publish! (fault rc/publish!)}
                         :published {#'privacy/publish! (fault privacy/publish!)})
                answer (with-redefs-fn redefs #(remove! name "afs-1" a1))
                pending-after (privacy/pending name)
                ;; the client sends the removal again after its 503 (idempotent when the gateway completed it already)
                resent (when-not (= 200 (:status answer)) (remove! name "afs-1" a1))
                obs {:answer (offers/outcome answer) :message (get-in answer [:body "message"])
                     :pending-after-the-answer (some? pending-after) :resent (when resent (offers/outcome resent))
                     :published (seq-now name conn) :failures-counted ((requiring-resolve 'triplex.gateway.failures/count-of) "authority")}]
            (println "ERA2_AUTHORITY_FAULT" mode (pr-str [step obs]))
            (check! label @fired "the authority failed at that step" obs)
            (expect (str label ": the removal's answer") answer [503 "ErasureFrontierUnavailable"])
            ;; (a failure at the intent leaves nothing to complete: the removal starts again when the client resends)
            (when (and per-account? (not= step :intent))
              (check! label (nil? pending-after) "the gateway completed the removal itself (the completion tag)" obs))
            (when resent (expect (str label ": the client's resend") resent [200 nil]))
            (check! label (nil? (privacy/pending name)) "nothing pending in the end" obs)
            (check! label (= 1 (seq-now name conn)) "published as sequence 1" obs)
            (check! label (not (str/includes? (text (:body (offers/route name "v1" "read" {"entityIds" [a1]}))) va)) "a1 not answered" nil)
            (expect (str label ": a save of another account after it")
                    (offers/send name (frame "afs-b1" b1 (secret b1 "s") (:id (seeds b1)) (head conn))) [200 nil])))))))

;; ---- [DX-S5 second review R2-2, adapted] a creation racing a removal of its subject, then the client's replay ----
(defn creation-race
  "The save-line review's R2-2 (`s5/attack2_gate.clj` `a-creation-racing-a-removal-is-replayed-into-the-removed-family`,
  at 9dc800e7b), rebuilt on this branch's harness: that test needs the save line's own code (`subject-create`), which
  this branch does not have. A creation of subject X (no prior value) is framed; a removal naming X lands between its
  plan and its commit (run from inside the save's submit, on another thread, waited for 3 s); then the same frame is
  sent after the removal under a new operation ID (its source still before the removal); then the client's replay: the
  same caller-supplied value with a fresh source and a new operation ID, as the SDK replays a CasConflict. On the
  subject writer and on the general writer. [DX-ERA2 fifth pass] Asserted on every mode: the race and the late frame
  refused with the same terminal answer (409 ErasureReplayDeclined, case 1); a replay under the racing save's command
  with a fresh source refused the same way (case 2); a resend under a new command with a fresh source stored (case 3,
  allowed until the owner decides). Printed as ERA2_R22."
  []
  (doseq [writer [:subject :general]]
    (fresh-scope false
      (fn [name conn]
        (let [label (str "creation-race/" mode "/" (clojure.core/name writer))
              X "acct/p3/subject/later" v (secret X "framed-before-the-removal") pin (head conn)
              racing (frame "r22-race" X v nil pin)
              removed (atom nil) fired (atom false) orig storage/submit!
              general (fn [f] (if (= writer :general) (with-redefs [subject/plan (fn [& _] nil)] (f)) (f)))
              reply (general
                      #(with-redefs [storage/submit! (fn [c data request timeline & more]
                                                       (when (and (= "r22-race" (get request "operationId")) (compare-and-set! fired false true))
                                                         (let [f (future (offers/route name "v2" "erase" {"commandId" "r22-remove" "selectors" [{"entityId" X "attribute" ":v"}]}))]
                                                           (reset! removed (deref f 3000 :waiting))))
                                                       (apply orig c data request timeline more))]
                         (offers/send name racing)))
              removal (let [r @removed] (if (= :waiting r) [:waited-past-3s] (offers/outcome r)))
              removal-seq (seq-now name conn)
              stale (general #(offers/send name (frame "r22-stale" X v nil pin)))
              same-command (general #(offers/send name (assoc (frame "r22-race" X v nil (head conn)) "operationId" "r22-race-replay")))
              replay (general #(offers/send name (frame "r22-replay" X v nil (head conn))))
              stored? (str/includes? (text (:body (offers/route name "v1" "read" {"entityIds" [X]}))) v)
              obs {:writer writer :removal removal :removalSeq removal-seq :racing (offers/outcome reply)
                   :sameFrameAfterTheRemoval (offers/outcome stale) :replayUnderTheSameCommand (offers/outcome same-command)
                   :replayUnderANewCommand (offers/outcome replay) :valueStoredAfter stored?}]
          (println "ERA2_R22" mode (pr-str obs))
          (check! label (= [200 nil] removal) "the removal landed inside the creation's window" obs)
          (expect (str label ": the race (case 1)") reply [409 "ErasureReplayDeclined"])
          (expect (str label ": the same frame after the removal (case 1)") stale [409 "ErasureReplayDeclined"])
          (expect (str label ": a replay under the same command, fresh source (case 2)") same-command [409 "ErasureReplayDeclined"])
          (expect (str label ": a resend under a new command, fresh source (case 3, allowed)") replay [200 nil])
          (check! label stored? "case 3 stored its value (a new save after the removal)" obs)
          ;; [DX-ERA2 fifth pass, Z7] the same with frames that carry NO source (the SDK's optimistic commits): the race
          ;; and the late frame declined; a frame carrying the removal sequence its client saw after the removal stored
          (let [Y "acct/p4/subject/later" vy (secret Y "framed-before-the-removal")
                racing-y (frame "r22y-race" Y vy nil nil)
                removed-y (atom nil) fired-y (atom false)
                reply-y (general
                          #(with-redefs [storage/submit! (fn [c data request timeline & more]
                                                           (when (and (= "r22y-race" (get request "operationId")) (compare-and-set! fired-y false true))
                                                             (let [f (future (offers/route name "v2" "erase" {"commandId" "r22y-remove" "selectors" [{"entityId" Y "attribute" ":v"}]}))]
                                                               (reset! removed-y (deref f 3000 :waiting))))
                                                           (apply orig c data request timeline more))]
                             (offers/send name racing-y)))
                late-y (general #(offers/send name (frame "r22y-late" Y vy nil nil)))
                seen (seq-now name conn)
                fresh-y (general #(offers/send name (assoc (frame "r22y-new" Y vy nil nil) "removalSeen" seen)))]
            (println "ERA2_R22_NOSOURCE" mode (pr-str {:writer writer :removal (let [r @removed-y] (if (= :waiting r) :waiting (offers/outcome r)))
                                                       :race (offers/outcome reply-y) :late (offers/outcome late-y)
                                                       :withRemovalSeen (offers/outcome fresh-y)}))
            (expect (str label ": no source, the race (Z7)") reply-y [409 "ErasureReplayDeclined"])
            (expect (str label ": no source, the late frame (Z7)") late-y [409 "ErasureReplayDeclined"])
            (expect (str label ": no source, removalSeen after the removal (case 3, allowed)") fresh-y [200 nil])))))))

;; ==== [DX-ERA2 sixth pass] the fifth review (era3/REVIEW-5.md) and the B2 review's base faults ====================
(defn- raw-route
  "A request through the gateway's own handler, with its headers."
  [name version action input]
  (let [{:keys [status body headers]}
        (main/route-handler {:request-method (if (nil? input) :get :post) :uri (str "/" version "/db/" name "/" action)
                             :body (when input (java.io.ByteArrayInputStream. (.getBytes ^String (json/write-str input) "UTF-8")))})
        t (if (string? body) body (String. ^bytes body "UTF-8"))]
    {:status status :headers headers :body (try (json/read-str t) (catch Exception _ t))}))
(defn- stamp-header [r] (some-> (get-in r [:headers "x-triplex-removal-stamp"]) Long/parseLong))
(defn- head-json [name] (some-> (privacy/record-text name "head.json") json/read-str))
(defn- log-dir [name] (.getParent (privacy/path name "head.json")))
(defn- tmp-dir [tag] (java.nio.file.Paths/get "/tmp" (into-array String [(str "era2-6-" tag "-" (UUID/randomUUID))])))
(defn- delete-log! [name]
  (with-open [st (java.nio.file.Files/list (log-dir name))]
    (doseq [p (iterator-seq (.iterator st))
            :when (not (str/ends-with? (str (.getFileName ^java.nio.file.Path p)) ".key"))]
      (java.nio.file.Files/delete p)))
  (reset! privacy/cache {}))
(defn- stop-after [step f]
  (case step
    :intent (with-redefs-fn {#'rc/declare! (fn [& _] (throw (stop-ex :intent)))} f)
    :declared (let [declare rc/declare!] (with-redefs-fn {#'rc/declare! (fn [& args] (apply declare args) (throw (stop-ex :declared)))} f))
    :committed (let [commit rc/commit!] (with-redefs-fn {#'rc/commit! (fn [& args] (apply commit args) (throw (stop-ex :committed)))} f))))
(defn- read-text [name owner & [history?]]
  (text (:body (offers/route name "v1" "read" (cond-> {"entityIds" [owner]} history? (assoc "history" true))))))
(defn- failures-of [where] ((requiring-resolve 'triplex.gateway.failures/count-of) where))

(defn policy-sixth
  "[V1, V2 of the fifth review] The policy stored in Datomic is the only policy; the log's head carries a copy derived
  from it. (1) The protection route compared with the stored policy: the same list 200 and nothing written; a list
  that drops an attribute, or another seal, 409 and nothing written. (2) Adding an attribute with the log present,
  missing and behind: 200, the stored policy grows, the log's copy follows; a value of the attribute stored before the
  addition is read as stored and a removal masks it; a new value is sealed when the database is sealed. (3) V1 as the
  review ran it: the log lost, then the protection route with a narrower list: 409, and the database is not stuck. (4)
  Another gateway that verified the log before the addition: its next read and its key pass take the rewritten copy.
  (5) A data restore from before an addition: the restore route takes the addition back from the verified log. (6) V2:
  a database without a stored policy, another database's head put back: the rebuild route refuses it before storing
  anything; its own head back: adopted. (7) Two adoptions from different heads: one wins (compare-and-set), the other
  is refused. (8) Moving a sealed database whose policy grew back to the database-wide rule: refused."
  [sealed?]
  (when per-account?
    (fresh-scope sealed?
      (fn [name conn]
        (let [label (str "policy-sixth/" mode (if sealed? "/sealed" ""))
              protect (fn [attrs & [s?]] (offers/route name "v2" "protection" {"attributes" attrs "sealed" (if (some? s?) s? sealed?)}))
              stored (fn [] (rc/stored-policy (d/db conn)))
              copy (fn [] (select-keys (head-json name) ["attributes" "sealed"]))
              seeds (seed! name [a1 b1 "acct/c/one" "acct/d/one"])
              ;; a value of :q stored before :q is protected (in clear, also in a sealed database)
              q0 (secret a1 "q-before") _ (expect label (offers/send name (save-frame "ps-q0" a1 ":q" q0 nil nil)) [200 nil])
              p0 (stored) t0 (d/basis-t (d/db conn))
              ;; (1) compared with the stored policy
              same (protect [":v"]) t1 (d/basis-t (d/db conn))
              other-seal (protect [":v"] (not sealed?))
              dropped (protect [":w"])
              ;; (4) another gateway's view, verified before the addition
              prior (get @privacy/cache name)
              ;; (2) add :q with the log present
              added (protect [":v" ":q"])
              p1 (stored) c1 (copy)
              read-q0 (offers/route name "v1" "read" {"entityIds" [a1]})
              _ (swap! privacy/cache assoc name prior)
              other-read (offers/route name "v1" "read" {"entityIds" [b1]})
              _ (swap! privacy/cache assoc name prior)
              shred-before (failures-of "shred")
              _ (@#'envelope/shred-published!) _ (@#'envelope/shred-published!)
              shred-after (failures-of "shred")
              q1 (secret a1 "q-after") _ (expect label (offers/send name (save-frame "ps-q1" a1 ":q" q1 "ps-q0" (head conn))) [200 nil])
              q1-native (raw-occurrences conn q1)
              rm-q (offers/route name "v2" "erase" {"commandId" "ps-rm-q" "selectors" [{"entityId" a1 "attribute" ":q"}]})
              q-after (str (read-text name a1) (read-text name a1 true))
              ;; (2) add :r with the log missing
              _ (delete-log! name)
              added-missing (protect [":v" ":q" ":r"])
              c2 (copy) seq2 (get (head-json name) "seq")
              ;; (2) add :s with the log behind by one removal
              tmp (tmp-dir "behind") _ (copy-dir! (log-dir name) tmp)
              rm-b (remove! name "ps-rm-b" b1)
              _ (copy-dir! tmp (log-dir name)) _ (reset! privacy/cache {})
              added-behind (protect [":v" ":q" ":r" ":s"])
              c3 (copy) seq3 (get (head-json name) "seq") natives (count (:entries (rc/native-entries name (d/db conn))))
              ;; (3) V1: the log lost, the protection route with a narrower list first
              _ (delete-log! name)
              narrower (protect [":v"])
              after-narrower (stored)
              read-after (offers/route name "v1" "read" {"entityIds" [b1]})
              rm-c (offers/route name "v2" "erase" {"commandId" "ps-rm-c" "selectors" [{"entityId" "acct/c/one" "attribute" ":q"}]})
              r1 (secret "acct/d/one" "r") _ (expect label (offers/send name (save-frame "ps-r1" "acct/d/one" ":r" r1 nil (head conn))) [200 nil])
              r1-native (raw-occurrences conn r1)
              ;; (5) a data restore from before the addition of :s (the stored policy as it was), then the restore route
              p-before-s (assoc p1 "attributes" [":v" ":q" ":r"] "added" [":q" ":r"])
              _ @(d/transact conn [[:db/add (triplex.gateway.scope/entity (d/db conn)) :triplex.scope/protection-policy (json/write-str p-before-s)]])
              restored (offers/route name "v2" "restore-erasure" {})
              p5 (stored)
              ;; (8) back to the database-wide rule
              back (offers/route name "v2" "removal-per-account" {"back" true})]
          (println "ERA2_POLICY6" mode sealed? (pr-str {:same (offers/outcome same) :other-seal (offers/outcome other-seal) :dropped (offers/outcome dropped)
                                                         :added (offers/outcome added) :stored p1 :copy c1 :other-read (offers/outcome other-read)
                                                         :shred-failures [shred-before shred-after] :q1-native q1-native :rm-q (offers/outcome rm-q)
                                                         :added-missing (offers/outcome added-missing) :copy-2 c2 :added-behind (offers/outcome added-behind)
                                                         :copy-3 c3 :seq3 seq3 :natives natives :narrower (offers/outcome narrower)
                                                         :read-after (offers/outcome read-after) :rm-c (offers/outcome rm-c) :r1-native r1-native
                                                         :restored (offers/outcome restored) :p5 p5 :back (offers/outcome back)}))
          (expect (str label ": the same list") same [200 nil])
          (check! label (= t0 t1) "the same list writes nothing" [t0 t1])
          (expect (str label ": another seal") other-seal [409 "ProtectionPolicyMismatch"])
          (expect (str label ": a list that drops an attribute") dropped [409 "ProtectionPolicyMismatch"])
          (check! label (= p0 (rc/stored-policy (d/as-of (d/db conn) t1))) "nothing changed the stored policy before the addition" p0)
          (expect (str label ": adding :q, the log present") added [200 nil])
          (check! label (= [":q"] (get-in added [:body "added"])) "the answer names what was added" (:body added))
          (check! label (= {"attributes" [":v" ":q"] "sealed" sealed? "added" [":q"]} p1) "the stored policy grew by :q" p1)
          (check! label (= {"attributes" [":v" ":q"] "sealed" sealed?} c1) "the log's copy follows the stored policy" c1)
          (expect (str label ": a read of a value of :q stored before the addition") read-q0 [200 nil])
          (check! label (str/includes? (text (:body read-q0)) q0) "the value stored before the addition is read as stored" nil)
          (expect (str label ": another gateway that verified the log before the addition reads") other-read [200 nil])
          (check! label (<= (- shred-after shred-before) 1) "that gateway's key pass takes the rewritten copy (at most one failure, then none)" [shred-before shred-after])
          (when sealed? (check! label (empty? q1-native) "a new value of :q is sealed (no native copy in clear)" q1-native))
          (expect (str label ": a removal of a1's :q") rm-q [200 nil])
          (check! label (not (or (str/includes? q-after q0) (str/includes? q-after q1))) "neither :q value is answered after its removal (current and history)" nil)
          (expect (str label ": adding :r with the log missing") added-missing [200 nil])
          (check! label (= [":v" ":q" ":r"] (get c2 "attributes")) "the log rebuilt from the data, its copy from the stored policy" c2)
          (expect (str label ": the removal while the log is current") rm-b [200 nil])
          (expect (str label ": adding :s with the log behind by one removal") added-behind [200 nil])
          (check! label (and (= seq3 natives) (= [":v" ":q" ":r" ":s"] (get c3 "attributes"))) "the log caught up, then its copy rewritten" {:seq seq3 :natives natives :copy c3})
          (expect (str label ": V1, the log lost, then a narrower list") narrower [409 "ProtectionPolicyMismatch"])
          (check! label (= [":v" ":q" ":r" ":s"] (get after-narrower "attributes")) "the narrower list changed nothing" after-narrower)
          (expect (str label ": a read after it") read-after [200 nil])
          (expect (str label ": a removal after it") rm-c [200 nil])
          (when sealed? (check! label (empty? r1-native) "a new value of an added attribute is sealed" r1-native))
          (expect (str label ": the restore route on data from before the addition of :s") restored [200 nil])
          (check! label (= [":v" ":q" ":r" ":s"] (get p5 "attributes")) "the restore route takes the addition back from the verified log" p5)
          (expect (str label ": moving back to the database-wide rule") back (if (or sealed? commit?) [409 "RemovalBoundaryOneWay"] [200 nil]))
          (check! label (not (str/includes? (read-text name b1 true) (:value (seeds b1)))) "b1's removed value not answered" nil))))))

(defn policy-adoption
  "[V2 of the fifth review] A database moved per account by an earlier build (no stored policy), its log lost: another
  database's head put back is refused by the rebuild route BEFORE anything is stored, and so is a read; its own head
  back, the rebuild route adopts it, and every protected attribute can be removed on request. [owed] Two adoptions
  from different heads of the same database: one compare-and-set wins, the other is refused."
  []
  (when per-account?
    (fresh-scope false
      (fn [other oconn]
        (fresh-scope false
          (fn [name conn]
            (let [label (str "policy-adoption/" mode)
                  seeds (seed! name [a1 b1]) _ (seed! other [a1])
                  pa (fn [] (rc/stored-policy (d/db conn)))
                  sc (fn [] (triplex.gateway.scope/entity (d/db conn)))
                  retract! (fn [] @(d/transact conn [[:db/retract (sc) :triplex.scope/protection-policy
                                                       (triplex.gateway.scope/value (d/db conn) (sc) :triplex.scope/protection-policy)]]))
                  _ (retract!)
                  own (privacy/record-text name "head.json")
                  _ (delete-log! name)
                  foreign (privacy/record-text other "head.json")
                  _ (privacy/replace! (privacy/path name "head.json") foreign) _ (reset! privacy/cache {})
                  read-foreign (offers/route name "v1" "read" {"entityIds" [a1]})
                  rebuild-foreign (offers/route name "v2" "removal-log-rebuild" {})
                  stored-after-foreign (pa)
                  _ (privacy/replace! (privacy/path name "head.json") own) _ (reset! privacy/cache {})
                  rebuild-own (offers/route name "v2" "removal-log-rebuild" {})
                  stored-own (pa)
                  rm (remove! name "pa-rm" a1)
                  ;; two adoptions from different heads: the first adopts; a second one planned on the database value
                  ;; from before it (another gateway), from a head with another list, is refused by the compare-and-set
                  _ (retract!)
                  before (d/db conn)
                  first-adopt (rc/adopt-policy! name conn (d/db conn))
                  h (json/read-str (privacy/record-text name "head.json"))
                  _ (privacy/replace! (privacy/path name "head.json") (json/write-str (assoc h "attributes" [":v" ":x"]))) _ (reset! privacy/cache {})
                  second-adopt (try (rc/adopt-policy! name conn before) :adopted (catch clojure.lang.ExceptionInfo e (:status (ex-data e))))
                  stored-two (pa)]
              (println "ERA2_POLICY_ADOPTION" mode (pr-str {:read-foreign (offers/outcome read-foreign) :rebuild-foreign (offers/outcome rebuild-foreign)
                                                            :stored-after-foreign stored-after-foreign :rebuild-own (offers/outcome rebuild-own)
                                                            :stored-own stored-own :removal (offers/outcome rm) :second-adopt second-adopt :stored-two stored-two}))
              (check! label (not= 200 (:status read-foreign)) "a read with another database's head is refused" (offers/outcome read-foreign))
              (check! label (= 503 (:status rebuild-foreign)) "the rebuild route refuses another database's head (503)" (offers/outcome rebuild-foreign))
              (check! label (nil? stored-after-foreign) "nothing stored from another database's head" stored-after-foreign)
              (expect (str label ": its own head back") rebuild-own [200 nil])
              (check! label (= {"attributes" [":v"] "sealed" false} stored-own) "its own policy adopted" stored-own)
              (expect (str label ": a removal after it") rm [200 nil])
              (check! label (= 503 second-adopt) "a second adoption from another head is refused by the compare-and-set" second-adopt)
              (check! label (= {"attributes" [":v"] "sealed" false} stored-two) "the first adoption stands" stored-two))))))))

(defn decline-stamp
  "[V3, V4 of the fifth review] A save that says nothing about when it was framed (no frame source, no removalSeen), of
  a removed subject's value: 409 ErasureReplayDeclined carrying the current removal stamp, and NOTHING written (50 of
  them: no transaction); the same save sent again with removalSeen set to that stamp is stored (case 3), under the
  same command too. A save framed before the removal (an old frame source): its command recorded once (case 2: a
  resend under it with a fresh source is refused), and a further refusal of that command writes nothing."
  []
  (fresh-scope false
    (fn [name conn]
      (let [label (str "decline-stamp/" mode)
            seeds (seed! name [a1 b1]) pin (head conn)
            _ (expect label (remove! name "ds-rm" a1) [200 nil])
            sourceless (fn [cmd v] (raw-route name "v1" "transact" (frame cmd a1 v nil nil)))
            first-decline (sourceless "ds-1" (secret a1 "n1"))
            stamp (stamp-header first-decline)
            frontier (get (:body (raw-route name "v2" "erasure-frontier" nil)) "removalStamp")
            t0 (d/basis-t (erase/sync! conn))
            many (frequencies (for [k (range 50)] (let [r (sourceless (str "ds-m-" k) (secret a1 (str "m" k)))] [(:status r) (get-in r [:body "code"])])))
            t1 (d/basis-t (erase/sync! conn))
            retry (raw-route name "v1" "transact" (assoc (frame "ds-1" a1 (secret a1 "n1-again") nil nil) "removalSeen" stamp))
            records (fn [] (let [db (d/db conn)] (if (d/entid db :triplex.removal/declined-command) (count (seq (d/datoms db :aevt :triplex.removal/declined-command))) 0)))
            r0 (records)
            late (raw-route name "v1" "transact" (frame "ds-late" a1 (secret a1 "late") nil pin))
            r1 (records)
            late-again (raw-route name "v1" "transact" (frame "ds-late" a1 (secret a1 "late2") nil (head conn)))
            t2 (d/basis-t (erase/sync! conn))
            late-third (raw-route name "v1" "transact" (frame "ds-late" a1 (secret a1 "late3") nil pin))
            t3 (d/basis-t (erase/sync! conn))]
        (println "ERA2_DECLINE_STAMP" mode (pr-str {:first [(:status first-decline) (get-in first-decline [:body "code"])] :stamp stamp :frontier frontier
                                                    :fifty many :transactions (- t1 t0) :retry [(:status retry) (get-in retry [:body "code"])]
                                                    :records [r0 r1] :late (:status late) :late-again (:status late-again) :third-writes (- t3 t2)}))
        (check! label (= [409 "ErasureReplayDeclined"] [(:status first-decline) (get-in first-decline [:body "code"])]) "a source-less save of the removed value is declined" (:body first-decline))
        (check! label (and (integer? stamp) (= stamp frontier)) "the refusal carries the current removal stamp" [stamp frontier])
        (check! label (= {[409 "ErasureReplayDeclined"] 50} many) "50 more are declined" many)
        (check! label (= t0 t1) "and write nothing (V4: no transaction for a save that says nothing)" [t0 t1])
        (check! label (= 0 r0) "no command recorded for them" r0)
        (check! label (= 200 (:status retry)) "the same save again with removalSeen = that stamp is stored (case 3), under the same command" (:body retry))
        (check! label (some? (stamp-header retry)) "a stored save carries the stamp too" (:headers retry))
        (check! label (= [409 "ErasureReplayDeclined"] [(:status late) (get-in late [:body "code"])]) "a save framed before the removal is declined" (:body late))
        (check! label (= 1 r1) "its command recorded once (case 2)" r1)
        (check! label (= 409 (:status late-again)) "a resend under that command with a fresh source is refused (case 2)" (:body late-again))
        (check! label (= t2 t3) "a further refusal of a recorded command writes nothing" [t2 t3])))))

(defn worker-retire
  "[V5 of the fifth review] A database deleted while one of its removals is pending: its removal log and keys leave
  the authority with it (the option on), and no worker pass fails on it. A log left by a database deleted earlier
  (here written by hand, as an earlier build left them): the worker retires it at its next pass instead of failing."
  []
  (when per-account?
    (let [scope (json/write-str ["triplex-scope-v1" "test" "era2-retire" (str (UUID/randomUUID)) 0])
          label (str "worker-retire/" mode)]
      (with-redefs [main/uri-template (or (System/getenv "WFIX1_URI") "datomic:mem://{db}")]
        (let [name (:db (main/create-scope! nil scope "lean" true true))
              _ (expect label (offers/route name "v2" "protection" {"attributes" [":v"] "sealed" true}) [200 nil])
              _ (expect label (offers/route name "v2" "removal-per-account" {}) [200 nil])
              _ (seed! name [a1 b1])
              _ (stop-after :declared #(remove! name "wr-rm" a1))
              pending (some? (privacy/pending name))
              keys-before (count (filter #(str/ends-with? (str %) ".key") (with-open [s (java.nio.file.Files/list (log-dir name))] (vec (iterator-seq (.iterator s))))))
              _ (main/delete-scope! nil scope)
              log-left (privacy/exists? (log-dir name))
              listed (boolean (some #{name} (@#'envelope/authority-scopes)))
              ;; a log an earlier build left behind: a database that no longer exists, a removal pending in it
              ghost (str "s2-era2-ghost-" (UUID/randomUUID))
              _ (java.nio.file.Files/createDirectories (log-dir ghost) (make-array java.nio.file.attribute.FileAttribute 0))
              _ (privacy/replace! (privacy/path ghost "head.json") (json/write-str {"database" ghost "seq" 0 "seal" privacy/zeros "attributes" [":v"] "sealed" false}))
              _ (privacy/replace! (privacy/path ghost "pending.json") (json/write-str {"database" ghost "seq" 1 "commandId" "g" "selectors" [] "erasedAt" 1}))
              f0 (failures-of "worker-completion")
              _ (alter-var-root #'rc/worker-complete-ms (constantly 1))
              _ (try (dotimes [_ 3] (rc/complete-stale!)) (finally (alter-var-root #'rc/worker-complete-ms (constantly 30000))))
              f1 (failures-of "worker-completion")
              ghost-left (privacy/exists? (log-dir ghost))
              ;; a delete whose retirement the authority refuses (a non-empty directory in the log's folder), then the
              ;; same delete sent again once the authority accepts: the log is retired then
              scope2 (json/write-str ["triplex-scope-v1" "test" "era2-retire" (str (UUID/randomUUID)) 0])
              name2 (:db (main/create-scope! nil scope2 "lean" true true))
              _ (expect label (offers/route name2 "v2" "protection" {"attributes" [":v"] "sealed" true}) [200 nil])
              _ (expect label (offers/route name2 "v2" "removal-per-account" {}) [200 nil])
              _ (seed! name2 [a1])
              _ (expect label (remove! name2 "wr-2" a1) [200 nil])
              blocker (.resolve ^java.nio.file.Path (log-dir name2) "zz-blocker")
              _ (java.nio.file.Files/createDirectories (.resolve blocker "inner") (make-array java.nio.file.attribute.FileAttribute 0))
              first-delete (try (main/delete-scope! nil scope2) :answered (catch Exception e (str (class e))))
              _ (java.nio.file.Files/deleteIfExists (.resolve blocker "inner")) _ (java.nio.file.Files/deleteIfExists blocker)
              second-delete (try (main/delete-scope! nil scope2) (catch Exception e (str (class e))))
              log2-left (privacy/exists? (log-dir name2))]
          (println "ERA2_WORKER_RETIRE" mode (pr-str {:pending pending :keys-before keys-before :log-left log-left :listed listed
                                                      :failures [f0 f1] :ghost-left ghost-left :first-delete first-delete
                                                      :second-delete second-delete :log2-left log2-left}))
          (check! label (not= :answered first-delete) "set-up: the retirement refused by the authority fails the delete" first-delete)
          (check! label (map? second-delete) "the delete sent again is answered" second-delete)
          (check! label (not log2-left) "and retires the log then" log2-left)
          (check! label (and pending (pos? keys-before)) "set-up: a removal pending, sealed keys present" [pending keys-before])
          (check! label (not log-left) "the deleted database's log and keys left the authority" log-left)
          (check! label (not listed) "no pass lists it" listed)
          (check! label (= f0 f1) "the worker did not fail on the earlier build's leftover log" [f0 f1])
          (check! label (not ghost-left) "the worker retired that log" ghost-left))))))

(defn log-repair
  "[V6 of the fifth review] Storage damage the review found with no way out: (a) an unreadable intent, nothing
  committed past the head; (b) an unreadable intent whose removal is committed in the data; (c) a published log entry
  altered; (d) an altered entry the data cannot prove (the head's seal changed too). Every request of the database
  503 meanwhile; the rebuild route (an operator's call, body {}) repairs (a) to (c) from the data, without touching the
  policy or dropping a published removal, and refuses (d)."
  []
  (when per-account?
    (doseq [variant [:intent-uncommitted :intent-committed :entry-altered :unprovable]]
      (fresh-scope true
        (fn [name conn]
          (let [label (str "log-repair/" mode "/" (clojure.core/name variant))
                seeds (seed! name [a1 b1 "acct/c/one"]) va (:value (seeds a1)) vb (:value (seeds b1))
                _ (expect label (remove! name "lr-1" b1) [200 nil])
                _ (case variant
                    :intent-uncommitted (stop-after :intent #(remove! name "lr-2" a1))
                    :intent-committed (stop-after :committed #(remove! name "lr-2" a1))
                    (:entry-altered :unprovable) (expect label (remove! name "lr-2" a1) [200 nil]))
                _ (case variant
                    (:intent-uncommitted :intent-committed) (privacy/replace! (privacy/path name "pending.json") "{\"seq\": 2, \"commandId\": \"lr-2\"")
                    :entry-altered (let [e (json/read-str (privacy/record-text name "erase-1.json"))]
                                     (privacy/replace! (privacy/path name "erase-1.json") (json/write-str (assoc e "erasedAt" (inc (long (get e "erasedAt")))))))
                    :unprovable (let [h (head-json name)]
                                  (privacy/replace! (privacy/path name "head.json") (json/write-str (assoc h "seal" (apply str (repeat 64 "a")))))))
                _ (reset! privacy/cache {})
                before (offers/route name "v1" "read" {"entityIds" [b1]})
                p0 (rc/stored-policy (d/db conn))
                repaired (offers/route name "v2" "removal-log-rebuild" {})
                after (offers/route name "v1" "read" {"entityIds" [a1 b1] "history" true})
                resend (when (= variant :intent-uncommitted) (remove! name "lr-2" a1))
                seq-after (try (seq-now name conn) (catch Exception _ :refused))]
            (println "ERA2_LOG_REPAIR" mode (pr-str {:variant variant :before (offers/outcome before) :repaired (offers/outcome repaired)
                                                     :after (offers/outcome after) :resend (some-> resend offers/outcome) :seq seq-after}))
            (check! label (= 503 (:status before)) "storage damage: the database's requests are refused meanwhile" (offers/outcome before))
            (check! label (= p0 (rc/stored-policy (d/db conn))) "the repair does not touch the policy" nil)
            (if (= variant :unprovable)
              (expect (str label ": the rebuild route when the data cannot prove the log") repaired [503 "RemovalLogConflict"])
              (do (expect (str label ": the rebuild route repairs it") repaired [200 nil])
                  (expect (str label ": reads after it") after [200 nil])
                  (check! label (not (str/includes? (text (:body after)) vb)) "the published removal stays (b1 not answered)" nil)
                  (case variant
                    :intent-uncommitted (do (expect (str label ": the client's resend starts it again") resend [200 nil])
                                            (check! label (= 2 seq-after) "published as 2" seq-after))
                    (:intent-committed :entry-altered)
                    (do (check! label (= 2 seq-after) "the committed removal published from the data" seq-after)
                        (check! label (not (str/includes? (text (:body after)) va)) "a1 not answered" nil)))
                  (check! label (nil? (privacy/pending name)) "nothing pending" nil)))))))))

(defn completion-sixth
  "[V7, V8 of the fifth review] (V8) The same command resent with other selectors while it is pending: a terminal 409
  EraseCommandConflict naming the pending removal (not a retryable 503); the worker completes it as first sent. (V7) A
  removal the worker cannot complete (its intent's sequence out of step): every failed completion is counted."
  []
  (when per-account?
    (fresh-scope false
      (fn [name conn]
        (let [label (str "completion-sixth/" mode)
              seeds (seed! name [a1 b1]) va (:value (seeds a1)) vb (:value (seeds b1))
              _ (stop-after :declared #(remove! name "cs-1" a1))
              other (offers/route name "v2" "erase" {"commandId" "cs-1" "selectors" [{"entityId" b1 "attribute" ":v"}]})
              _ (alter-var-root #'rc/worker-complete-ms (constantly 1))
              _ (try (Thread/sleep 5) (rc/complete-stale!) (finally (alter-var-root #'rc/worker-complete-ms (constantly 30000))))
              masked-a (not (str/includes? (read-text name a1) va)) kept-b (str/includes? (read-text name b1) vb)
              ;; V7: an intent whose sequence is out of step
              _ (stop-after :intent #(remove! name "cs-2" b1))
              pj (json/read-str (privacy/record-text name "pending.json"))
              _ (privacy/replace! (privacy/path name "pending.json") (json/write-str (assoc pj "seq" (+ 5 (long (get pj "seq"))))))
              _ (reset! privacy/cache {})
              f0 (failures-of "completion")
              _ (rc/complete-pending! name conn) _ (rc/complete-pending! name conn)
              f1 (failures-of "completion")]
          (println "ERA2_COMPLETION6" mode (pr-str {:other (offers/outcome other) :message (get-in other [:body "message"]) :a-masked masked-a
                                                    :b-kept kept-b :failures [f0 f1]}))
          (expect (str label ": the same command with other selectors while pending") other [409 "EraseCommandConflict"])
          (check! label (str/includes? (str (get-in other [:body "message"])) "sequence 1") "the answer names the pending removal" (get-in other [:body "message"]))
          (check! label (and masked-a kept-b) "the worker completed the removal as first sent" [masked-a kept-b])
          (check! label (= 2 (- f1 f0)) "each failed completion counted" [f0 f1]))))))

(defn move-replay
  "[V9 of the fifth review] A save and a frame planned on the log's boundary and committed after their database moved
  to the commit boundary: the gateway plans each once more, and both are stored (were 409 ErasureFrontierChanged,
  which the SDK does not replay)."
  []
  (when (and per-account? (not commit?))
    (doseq [kind [:save :frame]]
      (fresh-scope false
        (fn [name conn]
          (let [label (str "move-replay/" mode "/" (clojure.core/name kind))
                seeds (seed! name [a1 b1])
                fired (atom false) inner (atom nil) orig storage/submit!
                op (str "mr-" (clojure.core/name kind))
                input (case kind :save (frame op b1 (secret b1 "x") (:id (seeds b1)) (head conn)) :frame (frame-acct name conn op "b"))
                reply (with-redefs [storage/submit! (fn [c data request timeline & more]
                                                      (when (and (= op (get request "operationId")) (compare-and-set! fired false true))
                                                        (reset! inner (deref (future (alter-var-root #'rc/may-turn-on (constantly true))
                                                                                     (try (offers/route name "v2" "removal-commit-boundary" {})
                                                                                          (finally (alter-var-root #'rc/may-turn-on (constantly false)))))
                                                                             10000 :waiting)))
                                                      (apply orig c data request timeline more))]
                        (offers/send name (assoc input "operationId" op)))]
            (println "ERA2_MOVE_REPLAY" mode (pr-str {:kind kind :move (some-> @inner offers/outcome) :reply (offers/outcome reply)}))
            (check! label (= [200 nil] (some-> @inner offers/outcome)) "the database moved while the write was planned" (some-> @inner offers/outcome))
            (check! label (rc/commit-boundary? (d/db conn)) "it is on the commit boundary" nil)
            (expect (str label ": the write planned before the move") reply [200 nil])))))))

(defn key-pass-behind
  "[F1 of the B2 review] A gateway that verified a newer log than a copy then put back: its key pass no longer refuses
  for good. A removal published before the copy was taken, whose grace ends after the copy is back, has its key
  deleted by the next pass; requests on that gateway keep refusing the older copy as before (no removed value)."
  []
  (fresh-scope true
    (fn [name conn]
      (let [label (str "key-pass-behind/" mode)
            seeds (seed! name [a1 b1 "acct/c/one"]) va (:value (seeds a1))
            grace envelope/grace-ms]
        (alter-var-root #'envelope/grace-ms (constantly 1500))
        (try
          (let [r1 (remove! name "kb-1" a1)
                ids (mapv #(get % "assertionId") (get-in (privacy/cut name nil) [:commands "kb-1" "identities"]))
                tmp (tmp-dir "kb") _ (copy-dir! (log-dir name) tmp)
                r2 (remove! name "kb-2" b1)
                _ (@#'envelope/shred-published!)
                ;; the older copy back (its records only; the keys stay as they are)
                _ (doseq [f ["head.json" "erase-1.json"]] (java.nio.file.Files/copy (.resolve tmp ^String f) (privacy/path name f) (into-array java.nio.file.CopyOption [java.nio.file.StandardCopyOption/REPLACE_EXISTING])))
                _ (java.nio.file.Files/deleteIfExists (privacy/path name "erase-2.json"))
                alive-before (count (filter #(envelope/key-present? name % nil) ids))
                _ (Thread/sleep 1700)
                _ (@#'envelope/shred-published!) _ (@#'envelope/shred-published!)
                alive-after (count (filter #(envelope/key-present? name % nil) ids))
                read (offers/route name "v1" "read" {"entityIds" [a1 b1]})]
            (println "ERA2_KEY_PASS_BEHIND" mode (pr-str {:r1 (offers/outcome r1) :r2 (offers/outcome r2) :alive [alive-before alive-after] :read (offers/outcome read)}))
            (check! label (pos? alive-before) "set-up: the key is alive when the older copy is back" alive-before)
            (check! label (zero? alive-after) "the next pass deletes it (it refused for good before)" alive-after)
            (check! label (not (str/includes? (text (:body read)) va)) "no removed value answered" (offers/outcome read)))
          (finally (alter-var-root #'envelope/grace-ms (constantly grace))))))))

(defn shred-isolation
  "[DX-ERA2 sixth pass, found by the B2 review's S3 in the standing gate on a3082aba0] One database's key deletion fails
  (its key file replaced by a non-empty directory): the key pass counts it and goes on; it never throws, and another
  database's due keys are deleted in the same pass. Before the fix, F1's second reading retried the failed deletion
  outside any catch, so the pass threw and stopped there."
  []
  (fresh-scope true
    (fn [name-a _]
      (fresh-scope true
        (fn [name-b _]
          (let [label (str "shred-isolation/" mode)
                _ (seed! name-a [a1 b1]) _ (seed! name-b [a1 b1])
                grace envelope/grace-ms
                _ (expect label (remove! name-a "si-a" a1) [200 nil])
                _ (expect label (remove! name-b "si-b" a1) [200 nil])
                ids (fn [nm c] (mapv #(get % "assertionId") (get-in (privacy/cut nm nil) [:commands c "identities"])))
                kf (envelope/key-file name-a (first (ids name-a "si-a")))
                before ((requiring-resolve 'triplex.gateway.failures/count-of) "shred")]
            (java.nio.file.Files/deleteIfExists kf)
            (java.nio.file.Files/createDirectories (.resolve kf "inner") (make-array java.nio.file.attribute.FileAttribute 0))
            (alter-var-root #'envelope/grace-ms (constantly 0))
            (try
              (let [thrown (try (@#'envelope/shred-published!) nil (catch Throwable t (str (class t))))
                    alive-b (count (filter #(envelope/key-present? name-b % nil) (ids name-b "si-b")))
                    counted (- ((requiring-resolve 'triplex.gateway.failures/count-of) "shred") before)]
                (println "ERA2_SHRED_ISOLATION" mode (pr-str {:thrown thrown :alive-b alive-b :counted counted}))
                (check! label (nil? thrown) "the key pass does not throw when one database's key deletion fails" thrown)
                (check! label (zero? alive-b) "the other database's due key is deleted in the same pass" alive-b)
                (check! label (pos? counted) "the failed deletion is counted" counted))
              (finally
                (alter-var-root #'envelope/grace-ms (constantly grace))
                (java.nio.file.Files/deleteIfExists (.resolve kf "inner"))
                (java.nio.file.Files/deleteIfExists kf)))))))))

(defn file-publish-compare
  "[F3 of the B2 review] A writer whose view is stale (its lock did not hold) publishes, on the file authority, an entry
  that is already in the log while the head has moved past it: refused, and the head on disk is not moved back."
  []
  (fresh-scope false
    (fn [name conn]
      (let [label (str "file-publish-compare/" mode)
            _ (seed! name [a1 b1 "acct/c/one"])
            _ (expect label (remove! name "fp-1" a1) [200 nil])
            stale (privacy/cut name (d/db conn) true)
            _ (expect label (remove! name "fp-2" b1) [200 nil])
            _ (expect label (remove! name "fp-3" "acct/c/one") [200 nil])
            entry (get-in (privacy/cut name (d/db conn) true) [:commands "fp-2"])
            head-before (privacy/record-text name "head.json")
            _ (privacy/prepare! name entry)
            r (try (privacy/publish! name stale entry) :written (catch clojure.lang.ExceptionInfo e (or (:code (ex-data e)) (.getMessage e))))
            head-after (privacy/record-text name "head.json")]
        (java.nio.file.Files/deleteIfExists (privacy/path name "pending.json"))
        (reset! privacy/cache {})
        (println "ERA2_FILE_PUBLISH" mode (pr-str {:answer r :head-unchanged (= head-before head-after)
                                                   :head-seq (get (json/read-str head-after) "seq")}))
        (check! label (= "ErasureFrontierUnavailable" r) "a stale publication is refused" r)
        (check! label (= head-before head-after) "the head is not moved back" (get (json/read-str head-after) "seq"))))))

(defn restore-with-pending
  "[F4 of the B2 review] The data restored to a copy older than a pending removal's predecessor (both removals after
  the backup; the later one pending): the restore route replays the published one (it no longer refuses while a
  removal is pending), then the pending removal completes by its resend; nothing stays pending; no removed value is
  answered. Two in-memory databases under one name stand for the data before and after the restore."
  []
  (let [scope (json/write-str ["triplex-scope-v1" "test" "era2-f4" (str (UUID/randomUUID)) 0])
        label (str "restore-with-pending/" mode)
        newer "datomic:mem://{db}" older "datomic:mem://{db}-older"
        x "acct/a/one" z "acct/c/one" b "acct/b/one"]
    (try
      (let [setup (fn [] (let [name (:db (main/create-scope! nil scope "lean" true true))]
                           (check! label (= 200 (:status (offers/route name "v2" "protection" {"attributes" [":v"] "sealed" false}))) "protection")
                           name))
            name (with-redefs [main/uri-template newer] (setup))
            _ (with-redefs [main/uri-template older] (setup))
            frames (for [[o v] [[x (secret x "x")] [z (secret z "z")] [b (secret b "b")]]] [o v (frame (str "f4-" (UUID/randomUUID)) o v nil nil)])]
        (doseq [[_ _ f] frames] (with-redefs [main/uri-template newer] (offers/send name f)) (with-redefs [main/uri-template older] (offers/send name f)))
        (when per-account?
          (with-redefs [main/uri-template newer] (offers/route name "v2" "removal-per-account" {}))
          (with-redefs [main/uri-template older] (offers/route name "v2" "removal-per-account" {})))
        (let [vx (second (first frames)) vz (second (second frames))
              r1 (with-redefs [main/uri-template newer] (remove! name "f4-r1" x))
              _ (with-redefs [main/uri-template newer]
                  (with-redefs [privacy/publish! (fn [& _] (throw (ex-info "stopped at publication" {})))] (remove! name "f4-r2" z)))
              pending (some? (privacy/pending name))
              _ (reset! privacy/cache {})
              [restore resend restore-2 rx rz]
              (with-redefs [main/uri-template older]
                [(offers/route name "v2" "restore-erasure" {}) (remove! name "f4-r2" z) (offers/route name "v2" "restore-erasure" {})
                 (offers/route name "v1" "read" {"entityIds" [x] "history" true}) (offers/route name "v1" "read" {"entityIds" [z] "history" true})])]
          (println "ERA2_RESTORE_PENDING" mode (pr-str {:r1 (offers/outcome r1) :pending pending :restore (offers/outcome restore) :resend (offers/outcome resend)
                                                        :restore-2 (offers/outcome restore-2) :pending-after (some? (privacy/pending name))}))
          (check! label pending "set-up: r2 pending" nil)
          (expect (str label ": the restore route while r2 is pending") restore [200 nil])
          (expect (str label ": r2's resend on the restored data") resend [200 nil])
          (expect (str label ": the restore route again") restore-2 [200 nil])
          (check! label (nil? (privacy/pending name)) "nothing pending" nil)
          (check! label (not (or (str/includes? (text (:body rx)) vx) (str/includes? (text (:body rz)) vz))) "no removed value answered" nil)))
      (finally
        (doseq [u [newer older]] (with-redefs [main/uri-template u] (try (main/delete-scope! nil scope) (catch Exception _ nil))))))))


(defn peer-behind-move
  "[owed by the fifth review] A gateway whose Datomic peer has not yet seen its database's move to the commit boundary
  (its first database value is from before the move): a save planned there carries the old fence value and is refused
  at the serial point; the gateway plans it once more on the database as it is now and it is stored (V9). A read on
  that gateway is served (as a read a moment earlier would be) and answers no removed value."
  []
  (when (and per-account? (not commit?))
    (fresh-scope false
      (fn [name conn]
        (let [label (str "peer-behind-move/" mode)
              seeds (seed! name [a1 b1]) va (:value (seeds a1))
              _ (expect label (remove! name "pb-1" a1) [200 nil])
              stale (d/db conn)
              _ (alter-var-root #'rc/may-turn-on (constantly true))
              moved (try (offers/route name "v2" "removal-commit-boundary" {}) (finally (alter-var-root #'rc/may-turn-on (constantly false))))
              behind (fn [f] (let [orig d/db armed (atom true)]
                               (with-redefs [d/db (fn [c] (if (and (identical? c conn) (compare-and-set! armed true false)) stale (orig c)))]
                                 (f))))
              save (behind #(offers/send name (frame "pb-save" b1 (secret b1 "x") (:id (seeds b1)) (head conn))))
              read (behind #(offers/route name "v1" "read" {"entityIds" [a1 b1] "history" true}))]
          (println "ERA2_PEER_BEHIND" mode (pr-str {:move (offers/outcome moved) :save (offers/outcome save) :read (offers/outcome read)}))
          (expect (str label ": the move") moved [200 nil])
          (check! label (= -1 (triplex.gateway.scope/value stale (triplex.gateway.scope/entity stale) :triplex.scope/erasure-seq)) "the stale value is from before the move" nil)
          (expect (str label ": a save planned on the stale value") save [200 nil])
          (check! label (not= 400 (:status read)) "a read on the stale value is not a 400" (offers/outcome read))
          (check! label (not (str/includes? (text (:body read)) va)) "no removed value answered" nil))))))

;; ERA2_ONLY (space-separated label prefixes) runs only those scenarios: a diagnostic run, never a gate
(def only (some-> (System/getenv "ERA2_ONLY") str/trim not-empty (str/split #"\s+")))
(defn- scenario [label f]
  (when (or (nil? only) (some #(str/starts-with? label %) only))
    (try (f) (catch Throwable e (check! label false (str "scenario stopped: " (.getMessage e)))))))
(defn main []
  ;; The file authority publishes whatever it is given; the PostgreSQL authority publishes only an entry equal to the
  ;; stored intent. Every run here holds the file authority to that rule as well.
  (let [publish privacy/publish!]
    (alter-var-root #'privacy/publish!
      (fn [_] (fn [name current item]
                (when-not (= (privacy/pending name) item)
                  (throw (ex-info "Removal intent missing before publication" {:pending (privacy/pending name) :item item})))
                (publish name current item)))))
  (doseq [sealed? [false true]]
    (when-not sealed? (scenario "held" #(held-across-removal false)))
    (scenario (str "derived " sealed?) #(derived-writes sealed?))
    (scenario (str "import " sealed?) #(import-replay sealed?))
    (scenario (str "pinned " sealed?) #(pinned-reader sealed?))
    (scenario (str "race " sealed?) #(racing-removals sealed?))
    (scenario (str "stopped " sealed?) #(stopped-removal sealed?)))
  (scenario "migrate" migrate-back-and-forth)
  (scenario "named-absent" named-absent)
  (doseq [sealed? [false true]] (scenario (str "same-subject-twice " sealed?) #(same-subject-twice sealed?)))
  (scenario "mid-import" #(subject-mid-import 40))
  (scenario "race-loop" #(race-loop (Long/parseLong (or (System/getenv "ERA2_RACES") "1000"))))
  (scenario "hammer" #(hammer 30))
  (scenario "frame-race" #(frame-race (Long/parseLong (or (System/getenv "ERA2_FRAME_RACES") "40"))))
  (scenario "stop-points" stop-points)
  (scenario "late-own-commit" late-own-commit)
  (scenario "log-behind" log-behind)
  (scenario "rebuild" rebuild)
  (scenario "deliveries" deliveries)
  (scenario "lock-lost" #(lock-lost (Long/parseLong (or (System/getenv "ERA2_LOCK_LOST") "20"))))
  (scenario "commit-visibility" commit-visibility)
  (scenario "log-states" log-states)
  (scenario "catch-up" catch-up)
  (scenario "policy-and-reconcile" policy-and-reconcile)
  (scenario "pending-file-race" pending-file-race)
  (scenario "authority-fault-steps" authority-fault-steps)
  (scenario "data-behind" data-behind)
  (scenario "boundary-transition" boundary-transition)
  (scenario "cache-stamps" cache-stamps)
  (scenario "pending-tag-walk" pending-tag-walk)
  (scenario "creation-race" creation-race)
  ;; [DX-ERA2 sixth pass]
  (doseq [sealed? [false true]] (scenario (str "policy-sixth " sealed?) #(policy-sixth sealed?)))
  (scenario "policy-adoption" policy-adoption)
  (scenario "decline-stamp" decline-stamp)
  (scenario "worker-retire" worker-retire)
  (scenario "log-repair" log-repair)
  (scenario "completion-sixth" completion-sixth)
  (scenario "move-replay" move-replay)
  (scenario "key-pass-behind" key-pass-behind)
  (scenario "shred-isolation" shred-isolation)
  (scenario "file-publish-compare" file-publish-compare)
  (scenario "restore-with-pending" restore-with-pending)
  (scenario "peer-behind-move" peer-behind-move)
  (let [failed (remove :ok @results)]
    (println "ERA2_GATE" mode
             (pr-str {:checks (count @results) :failed (count failed)}))
    (doseq [f failed] (println "FAILED" (pr-str f)))
    (shutdown-agents)
    (System/exit (if (empty? failed) 0 1))))
