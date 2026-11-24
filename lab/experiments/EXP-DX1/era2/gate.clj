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
            [triplex.gateway.main :as main] [triplex.gateway.removal-commit :as rc] [wfix1-regression :as offers])
  (:import [java.util UUID]))

(def per-account? rs/enabled)
;; TX2_REMOVAL_SUBJECT_CHECK=1 with the per-account option: the removal checks its selection per subject and takes its
;; position at commit (removal_commit.clj).
(def subject? (and per-account? (= "1" (System/getenv "TX2_REMOVAL_SUBJECT_CHECK"))))
(def mode (cond subject? "subject-check" per-account? "per-account" :else "database-wide"))
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
            (check! "setup" (and (= 200 (:status moved)) (get-in moved [:body "perAccount"])) "database moved per account" moved)))
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
          (expect "held: the same subject's save across its removal" r [409 "CasConflict"])
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
            (expect (str scenario ": another subject of the account while stopped") same
                    (if per-account? [200 nil] [503 "ErasureFrontierUnavailable"]))
            ;; the removed subject: before the native commit the save lands first and the removal re-plans over it;
            ;; after it, the save is refused until the removal is published
            (expect (str scenario ": the removed subject while stopped") own
                    (cond (not per-account?) [503 "ErasureFrontierUnavailable"]
                          (= step :before-native) [200 nil]
                          :else [409 "CasConflict"]))
            (when (= 200 (:status own))
              ;; the value saved before the resumed removal's serial point is removed with it
              (swap! own-values assoc scenario v-own)))
          ;; resumed with the same command: completes exactly once
          (let [done (remove! name "rm-s" a1)]
            (expect scenario done [200 nil])
            (check! scenario (= 1 (get-in done [:body "seq"])) "one removal, sequence 1" (:body done)))
          (check! scenario (marked? name a1 pin) "a1's value is marked after the resumed removal")
          (removed-everywhere! scenario name conn a1 value before pin)
          (when-let [v (@own-values scenario)]
            (removed-everywhere! (str scenario "/own") name conn a1 v #{} (head conn))))))))

(defn migrate-back-and-forth
  "Per account only: the move is idempotent, reversible, and a save prepared under the other mode is refused once."
  []
  (when per-account?
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
  "[DX-ERA2 fix pass, DX-ERA3 F1/F1b] The commit-point check itself: a derived write (a ticket naming no account, or
  naming the removed subject's account) that has passed every gateway check and is paused just before Datomic, released
  at a random moment while a removal of that account runs (random delays after its declaration and intent). It may
  commit only if Datomic ordered it before the removal's declaration; otherwise it must be refused. No copy of the
  removed value may be readable after the removal answers."
  [n]
  (when per-account?
    (fresh-scope false
      (fn [name conn]
        (let [counts (atom {}) bump (fn [k] (swap! counts update k (fnil inc 0)))
              prepare privacy/prepare! declare rc/declare!]
          (doseq [i (range n)]
            (let [x (str "acct/q/s" i) v0 (secret x "seed")
                  _ (offers/send name (frame (str "q-" i) x v0 nil nil))
                  ticket (seq-now name conn)
                  accounts (when (odd? i) ["q"])
                  doc (str "notice:v1:q" i) op (str "qf-" i)
                  input (cond-> (assoc (save-frame op doc ":notice/body" (str "derived:" v0) nil nil) "erasureSeq" ticket)
                          accounts (assoc "erasureAccounts" accounts))
                  entered (promise) release (promise) submit storage/submit!
                  [saved removed]
                  (with-redefs [storage/submit! (fn [& args]
                                                  (when (= op (get (nth args 2) "operationId"))
                                                    (deliver entered true) (deref release 15000 nil))
                                                  (apply submit args))
                                rc/declare! (fn [& args] (let [r (apply declare args)] (Thread/sleep (long (rand-int 3))) r))
                                privacy/prepare! (fn [nm e] (prepare nm e) (Thread/sleep (long (rand-int 3))))]
                    (let [saver (future (offers/send name input))]
                      (deref entered 3000 nil)
                      (let [remover (future (remove! name (str "qr-" i) x))]
                        (Thread/sleep (long (rand-int 8)))
                        (deliver release true)
                        [(deref saver 20000 {:status 0}) (deref remover 20000 {:status 0})])))
                  db (d/db conn)
                  scope (triplex.gateway.scope/entity db)
                  declared (some (fn [x] (when (and (:added x) (= (seq-now name conn) (:v x))) (d/tx->t (:tx x))))
                                 (d/datoms (d/history db) :eavt scope :triplex.scope/removal-intent))
                  claim (d/entid db [:triplex.claim/command-id op])
                  frame-t (when claim (d/tx->t (:db/id (:triplex.claim/tx (d/entity db claim)))))
                  label (str "frame-race/" (if accounts "account" "no-account"))]
              (check! label (= [200 nil] (offers/outcome removed)) "the removal answers" (offers/outcome removed))
              (if (= 200 (:status saved))
                (do (bump [label :committed-before-declaration])
                    (check! label (and frame-t declared (< frame-t declared))
                            "a ticketed write commits only before the removal's declaration" {:frame frame-t :declared declared}))
                (bump [label (offers/outcome saved)]))
              (check! label (not (and (= 200 (:status saved)) frame-t declared (> frame-t declared))) "never after it")
              ;; whatever happened, the frame was either refused or made before the removal began: a copy made before a
              ;; removal is outside what a removal removes (DX-ERA3 F5), so only the order is checked here
              ))
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

(defn orphan-and-rebuild
  "A removal stopped between its declaration and its intent (an orphan declaration: accounts held, nothing pending), then
  another removal; and a restore replay that rebuilds counters a copy holds out of step with the log."
  []
  (when per-account?
    (fresh-scope false
      (fn [name conn]
        (let [seeds (seed! name [a1 b1]) prepare privacy/prepare!
              ticket (seq-now name conn)
              frame-a (fn [id] (assoc (save-frame id (str "notice:v1:" id) ":notice/body" (secret a1 id) nil nil)
                                      "erasureSeq" (seq-now name conn) "erasureAccounts" ["a"]))
              stopped (with-redefs [privacy/prepare! (fn [& _] (throw (ex-info "stop before the intent" {})))]
                        (remove! name "orphan-1" a1))]
          (check! "orphan" (not= 200 (:status stopped)) "stopped before its intent" (offers/outcome stopped))
          (check! "orphan" (nil? (privacy/pending name)) "no intent recorded")
          (expect "orphan: a frame of the held account fails at the commit point" (offers/send name (frame-a "orphan-f1")) [409 "CasConflict"])
          (expect "orphan: another account's save" (offers/send name (frame "orphan-b" b1 (secret b1 "o") (:id (seeds b1)) (head conn))) [200 nil])
          (expect "orphan: another removal replaces the declaration" (remove! name "orphan-2" b1) [200 nil])
          (expect "orphan: the frame of account a, read again" (offers/send name (frame-a "orphan-f2")) [200 nil])
          (expect "orphan: the stopped removal resent" (remove! name "orphan-1" a1) [200 nil])
          (native-counters-agree! "orphan" name conn)
          ;; a copy whose counters are out of step with the log (as a copy restored from mid-removal can be)
          (let [db (d/db conn) scope (triplex.gateway.scope/entity db) n (triplex.gateway.scope/value db scope :triplex.scope/removal-seq)]
            @(d/transact conn [[:db/add scope :triplex.scope/removal-intent (inc n)]
                               [:db/add scope :triplex.scope/removal-held "[\"zz\",\"a\"]"]
                               {:db/id "zz" :triplex.removal/account "zz" :triplex.removal/seq (- (inc n))}
                               {:db/id "za" :triplex.removal/account "a" :triplex.removal/seq (- (inc n))}
                               {:db/id "ze" :triplex.removal/entity "acct/zz/x" :triplex.removal/seq 7}]))
          (let [r (erase/replay-after-restore! name conn)]
            (check! "rebuild" (= (seq-now name conn) (get-in r [:erasure :seq])) "the restore replay answers" r))
          (native-counters-agree! "rebuild" name conn)
          (expect "rebuild: a frame of account a" (offers/send name (frame-a "rebuild-f")) [200 nil])
          (expect "rebuild: a ticket naming no account"
                  (offers/send name (assoc (save-frame "rebuild-any" "notice:v1:rebuild-any" ":notice/body" "x" nil nil) "erasureSeq" (seq-now name conn)))
                  [200 nil]))))))

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
          (expect "named-absent: a creation prepared before the removal, sent after it" r1 [409 "CasConflict"])
          (check! "named-absent" (= 1 (rs/native-entity-seq (d/db conn) x)) "the named entity's sequence moved with no row")
          (let [r2 (with-held name (frame* "import-early" x ":v" vi nil (head conn) {:actor "bulk-import"})
                     #(expect "named-absent" (remove-x "rm-n2") [200 nil]))]
            (expect "named-absent: an import frame prepared before a removal, sent after it" r2 [409 "CasConflict"]))
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

(defn- scenario [label f]
  (try (f) (catch Throwable e (check! label false (str "scenario stopped: " (.getMessage e))))))
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
  (scenario "frame-race" #(frame-race (Long/parseLong (or (System/getenv "ERA2_FRAME_RACES") "600"))))
  (scenario "orphan-and-rebuild" orphan-and-rebuild)
  (let [failed (remove :ok @results)]
    (println "ERA2_GATE" mode
             (pr-str {:checks (count @results) :failed (count failed)}))
    (doseq [f failed] (println "FAILED" (pr-str f)))
    (shutdown-agents)
    (System/exit (if (empty? failed) 0 1))))
