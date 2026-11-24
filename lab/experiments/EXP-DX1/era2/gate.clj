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
            [triplex.gateway.main :as main] [wfix1-regression :as offers])
  (:import [java.util UUID]))

(def per-account? rs/enabled)
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
  "Send `held` (prepared under the current cut), run `during` while it is paused after preparation, then let it commit."
  [name held during]
  (let [entered (promise) release (promise) build subject/plan]
    (with-redefs [subject/plan (held-plan (get held "operationId") entered release build)]
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
  (doseq [step [:before-native :after-native :at-publish]]
    (fresh-scope sealed?
      (fn [name conn]
        (let [scenario (str "stopped/" (clojure.core/name step))
              seeds (seed! name [a1 a2 b1]) value (:value (seeds a1)) pin (head conn)
              before (raw-occurrences conn value)
              apply-native erase/apply-native! publish privacy/publish!
              stopped (with-redefs [erase/apply-native! (fn [c v e]
                                                          (when (= step :before-native) (throw (ex-info "stop before native" {})))
                                                          (let [t (apply-native c v e)]
                                                            (when (= step :after-native) (throw (ex-info "stop after native" {})))
                                                            t))
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

(defn- scenario [label f]
  (try (f) (catch Throwable e (check! label false (str "scenario stopped: " (.getMessage e))))))
(defn main []
  (doseq [sealed? [false true]]
    (when-not sealed? (scenario "held" #(held-across-removal false)))
    (scenario (str "derived " sealed?) #(derived-writes sealed?))
    (scenario (str "import " sealed?) #(import-replay sealed?))
    (scenario (str "pinned " sealed?) #(pinned-reader sealed?))
    (scenario (str "race " sealed?) #(racing-removals sealed?))
    (scenario (str "stopped " sealed?) #(stopped-removal sealed?)))
  (scenario "migrate" migrate-back-and-forth)
  (let [failed (remove :ok @results)]
    (println "ERA2_GATE" (if per-account? "per-account" "database-wide")
             (pr-str {:checks (count @results) :failed (count failed)}))
    (doseq [f failed] (println "FAILED" (pr-str f)))
    (shutdown-agents)
    (System/exit (if (empty? failed) 0 1))))
