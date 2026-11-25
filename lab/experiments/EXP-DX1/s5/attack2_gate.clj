(ns s5-attack2
  "[DX-S5 second review] Attacks on the S6 fixes (head a6d02225c): the fence and the operation lookup, account-scoped
  IDs, the outcome classification, and the removal-race code. Reviewer's tests; they do not change the code under
  review. Each case prints one DX-S5R2_ATTACK line with what it measured, and asserts the contract the S6 page states,
  so a failing assertion is a finding. Run by s5/clj-run2.sh (mode attack2) after s5/fuzz.clj and s5/attack_gate.clj."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [triplex.gateway.storage :as storage] [triplex.gateway.main :as main]
            [s5-fuzz :as fz] [wide-gate :as wide] [wfix1-regression :as reference])
  (:import [java.net URLEncoder]))

(def on? (= "1" (System/getenv "TX2_ACCOUNT_CLAIMS")))
(def only (some-> (System/getenv "S5_ONLY") (str/split #",") set))
(def counter (atom 12000000))
(defn- block [] (assoc (wide/identity-block :wide (swap! counter inc)) :kind :wide))
(defn- head [conn] (storage/head-position (d/db conn)))
(defn- line [m] (println "DX-S5R2_ATTACK" (json/write-str m)))
(defn- save [conn spec] (second (fz/input-of {:seed 0 :counter counter} (merge {:block (block) :source (head conn) :retires []} spec))))
(defn- with-account [input account] (cond-> input account (assoc "account" account)))
(defn- get-route [name action query]
  (let [{:keys [status body]} (main/route-handler {:request-method :get :uri (str "/v1/db/" name "/" action) :query-string query})]
    {:status status :body (json/read-str (if (string? body) body (String. ^bytes body "UTF-8")))}))
(defn- operation
  "The operation route as the SDK calls it (the ID URL-encoded, ?account= when the client has one)."
  [name id account]
  (:body (get-route name (str "operation/" (URLEncoder/encode ^String id "UTF-8")) (when account (str "account=" account)))))
(defn- fence [name id account] (reference/route name "v1" "fence" (cond-> {"operationId" id} account (assoc "account" account))))
(defn- resolve-like-the-sdk
  "DatomicStorageAdapter.persist after an unknown outcome: look up; when absent and not fenced, fence."
  [name id account]
  (let [op (operation name id account)]
    (if (or (= "committed" (get op "status")) (get op "fenced")) op (:body (fence name id account)))))
(defn- stored-ops [conn]
  (let [db (d/db conn)] (set (map :v (d/datoms db :aevt (d/entid db :triplex.tx/operation-id))))))
(defn- run? [k] (or (nil? only) (contains? only k)))

(defn- hanging []
  (reify clojure.lang.IDeref (deref [_] (throw (IllegalStateException. "unbounded deref")))
    clojure.lang.IBlockingDeref (deref [_ _ timeout] (Thread/sleep 100) timeout)
    clojure.lang.IPending (isRealized [_] false)))

(defn- holding
  "Runs f with its n-th d/transact-async call held (not sent; the gateway's deref times out, as when the transactor or
  the network delays the original). Returns [f's result, a thunk that sends the held transaction later]."
  [n f]
  (let [orig d/transact-async calls (atom 0) held (atom nil)]
    (with-redefs [d/transact-async (fn [conn tx & opts]
                                     (if (= n (swap! calls inc))
                                       (do (reset! held #(apply orig conn tx opts)) (hanging))
                                       (apply orig conn tx opts)))]
      [(f) @held])))

(defn- late! [held]
  (when held
    (try (let [r @(held)] {:late "committed" :t (d/basis-t (:db-after r))})
         (catch Exception e {:late "refused" :marker (re-find #"TRIPLEX_[A-Z_]+|unique-conflict" (str e))}))))

(defn- count-of [name owner] (get-in (fz/read-owner name owner {"validAt" 5.0}) [":c/count"]))
(defn- increment
  "A save that reads the subject's counter and writes it plus one (a TriplesLive effect re-run on every replay)."
  [conn name owner op & {:keys [command]}]
  (let [cur (count-of name owner) n (if cur (Long/parseLong (str (:value cur))) 0)]
    (save conn (cond-> {:operation op :no-command (nil? command) :command (or command (str "unused-" (swap! counter inc)))
                        :facts [{:owner owner :field ":c/count" :type :string :value (str (inc n)) :pred cur}]}))))

;; ---------------------------------------------------------------- 1. the fence and the save under different keys

(deftest a-fence-under-another-key-does-not-stop-the-original
  ;; A fleet where one gateway has TX2_ACCOUNT_CLAIMS=1 and another does not (a rolling start of the option): the
  ;; save's operation ID is stored plain by the gateway without the option, the SDK's fence (claimAccount) is stored
  ;; scoped by the gateway with it, or the other way round. Emulated in one JVM with the option on: a request without
  ;; `account` is exactly what the gateway without the option stores and fences (plain ID); with `account`, scoped.
  (if-not (and on? (run? "mixed"))
    (println "DX-S5R2_SKIP mixed fleet needs TX2_ACCOUNT_CLAIMS=1")
    (doseq [[label save-account fence-account command?]
            [["save plain (gateway without the option), fence scoped (gateway with it)" nil "m1" false]
             ["save scoped (gateway with the option), fence plain (gateway without it)" "m1" nil false]
             ["save plain, fence scoped, the save carries a command ID" nil "m1" true]
             ["control: save and fence both scoped" "m1" "m1" false]
             ["control: save and fence both plain" nil nil false]]]
      (reference/in-scope
        (fn [name conn]
          (let [M "acct/m1/subject/s"
                seed (reference/send name (with-account (increment conn name M (str "seed-" (swap! counter inc))) "m1"))
                op (str "mixed-op-" (swap! counter inc))
                input (with-account (increment conn name M op :command (when command? (str "mixed-cmd-" (swap! counter inc)))) save-account)
                [reply held] (holding 1 #(reference/send name input))
                resolved (resolve-like-the-sdk name op fence-account)
                late (late! held)
                after (operation name op fence-account)
                ;; The SDK's answer to a fenced save: DatomicOperationNotApplied, then a replay under a new operation
                ;; ID from a fresh read (TriplesLive re-runs the effect).
                replay (when (get resolved "fenced")
                         (reference/send name (with-account (increment conn name M (str "replay-" (swap! counter inc))
                                                                       :command (get-in input ["claims" 0 "commandId"]))
                                                            fence-account)))
                final (some-> (count-of name M) :value)
                r {:case label :answer (reference/outcome reply) :resolved (select-keys resolved ["status" "fenced"])
                   :late late :lookupAfter (select-keys after ["status" "fenced"]) :replay (some-> replay reference/outcome)
                   :counterBefore "1" :counterAfterOneIncrement final :head (head conn)}]
            (line r)
            (is (= [200 nil] (reference/outcome seed)))
            (is (= [503 "OutcomeUnknown"] (:answer r)) label)
            ;; The contract (S6 page 1): a fenced original can never commit, so one increment adds exactly one.
            (when (get resolved "fenced")
              (is (= "refused" (:late late)) [label "a fenced original must never commit"]))
            (is (= "2" final) [label "one increment call must add exactly one"])))))))

;; ---------------------------------------------------------------- 2. a per-subject replan drops the account scope

(defn- drop-rows [input attribute]
  (let [gone (set (keep (fn [r] (when (= attribute (get-in r ["attribute" "v"])) (get-in r ["id" "v"]))) (get input "rows")))]
    (-> input
        (update "rows" (fn [rs] (vec (remove #(gone (get-in % ["id" "v"])) rs))))
        (update "newIds" (fn [ids] (vec (remove gone ids))))
        (update "rowTexts" (fn [m] (apply dissoc m gone))))))

(deftest a-replanned-save-loses-its-account-scope
  ;; storage/submit!: a per-subject save refused TRIPLEX_SUBJECT_REPLAN is re-planned with (tx-data db input), from the
  ;; request, after account-claims/scope! rewrote the prepared data. The retry therefore stores the plain IDs.
  ;; Trigger (natural): between the plan and the commit, a general-writer save whose journal has no instant row flips
  ;; :triplex.scope/feed-irregular (a mutable scope flag), which the per-subject function answers with REPLAN.
  (if-not (and on? (run? "replan"))
    (println "DX-S5R2_SKIP replan needs TX2_ACCOUNT_CLAIMS=1")
    (doseq [hold? [false true]]
      (reference/in-scope
        (fn [name conn]
          (let [S "acct/r2/subject/s" T "acct/r2/subject/t"
                _ (doseq [o [S T]] (reference/send name (with-account (increment conn name o (str "seed-" (swap! counter inc))) "r2")))
                op (str "replan-op-" (swap! counter inc)) cmd (str "replan-cmd-" (swap! counter inc))
                input (with-account (increment conn name S op :command cmd) "r2")
                irregular (drop-rows (save conn {:command (str "irregular-" (swap! counter inc))
                                                 :facts [{:owner T :field ":c/other" :type :string :value "x" :pred nil}]})
                                     ":_tx/instant")
                competing (atom nil)
                orig storage/submit! fired (atom false)
                [reply held] (with-redefs [storage/submit! (fn [c data request timeline & more]
                                                             (when (and (= op (get request "operationId")) (compare-and-set! fired false true))
                                                               (reset! competing (fz/general #(reference/send name irregular))))
                                                             (apply orig c data request timeline more))]
                               ;; hold? the replan's retry is delayed: the third transact-async (the competing save, the per-subject
                               ;; function, then the retry on the general writer).
                               (if hold? (holding 3 #(reference/send name input)) [(reference/send name input) nil]))
                resolved (when hold? (resolve-like-the-sdk name op "r2"))
                late (late! held)
                ops (stored-ops conn)
                db (d/db conn)
                claim-plain (d/entid db [:triplex.claim/command-id cmd])
                scoped-op (str "acct-id/v1/2/r2/" op)
                other (reference/send name (save conn {:command cmd :facts [{:owner "acct/b2/subject/s" :field ":a/f" :type :string :value "b" :pred nil}]}))
                r {:case (if hold? "replan, then the retry delayed: lookup and fence by the account" "replan, then the retry commits")
                   :competing (some-> @competing reference/outcome) :answer (reference/outcome reply)
                   :subjectReplan (get-in reply [:body "subjectReplan"]) :storedPlain (contains? ops op) :storedScoped (contains? ops scoped-op)
                   :claimStoredPlain (some? claim-plain) :resolved (some-> resolved (select-keys ["status" "fenced"])) :late late
                   :anotherAccountReusingTheCommand (reference/outcome other) :counter (:value (count-of name S))}]
            (line r)
            (is (= [200 nil] (:competing r)))
            (if hold?
              (when (get resolved "fenced") (is (= "refused" (:late late)) "a fenced original must never commit"))
              (do (is (true? (:subjectReplan r)) "the trigger produced a replan")
                  (is (:storedScoped r) "a save naming its account stores its scoped operation ID (S6 9.2)")
                  (is (not (:claimStoredPlain r)) "and its scoped command ID")))))))))

;; ---------------------------------------------------------------- 3. the reserved prefix in lookups

(deftest lookups-accept-the-reserved-prefix
  ;; account-claims/scope! refuses a save whose IDs begin with "acct-id/v1/"; the claim, command, begin, operation and
  ;; fence routes do not. A caller that names no account can write another account's stored form.
  (if-not (and on? (run? "prefix"))
    (println "DX-S5R2_SKIP the reserved prefix needs TX2_ACCOUNT_CLAIMS=1")
    (reference/in-scope
      (fn [name conn]
        (let [A "acct/a4/subject/alice"
              a-input (with-account (save conn {:command "joined:alice" :operation "a4-op"
                                                :facts [{:owner A :field ":p/email" :type :string :value "a's value" :pred nil}]}) "a4")
              a (reference/send name a-input)
              a-tx (get-in a-input ["claims" 0 "txId"])
              scoped-cmd "acct-id/v1/2/a4/joined:alice" scoped-op "acct-id/v1/2/a4/a4-op"
              claim (:body (reference/route name "v1" "claim" {"commandId" scoped-cmd "receipt" true}))
              command (:body (reference/route name "v2" "command" {"commandId" scoped-cmd}))
              begin (:body (reference/route name "v2" "begin" {"commandId" scoped-cmd "ids" []}))
              op (operation name scoped-op nil)
              b-named (:body (reference/route name "v1" "claim" {"commandId" scoped-cmd "receipt" true "account" "b4"}))
              ;; A's next save in flight; B fences A's stored form first.
              op2 "a4-op-2"
              input2 (with-account (save conn {:command "joined:alice-2" :operation op2
                                               :facts [{:owner A :field ":p/email" :type :string :value "a's second"
                                                        :pred (get (fz/read-owner name A {"validAt" 5.0}) ":p/email")}]}) "a4")
              [reply2 held2] (holding 1 #(reference/send name input2))
              b-fence (:body (fence name (str "acct-id/v1/2/a4/" op2) nil))
              late2 (late! held2)
              a-resolved (resolve-like-the-sdk name op2 "a4")
              save-refused (reference/outcome (reference/send name (save conn {:command scoped-cmd :facts [{:owner "acct/b4/subject/s" :field ":a/f" :type :string :value "b" :pred nil}]})))
              r {:aSave (reference/outcome a) :aTx a-tx
                 :claimWithoutAccount (get claim "txId") :claimReceiptPosition (get-in claim ["receipt" "position"])
                 :commandWithoutAccount (get command "txId") :beginWithoutAccount (get begin "claim")
                 :operationWithoutAccount (select-keys op ["status" "txId"])
                 :claimNamingAccountB (get b-named "txId")
                 :aSecondSave (reference/outcome reply2) :bFenceOfAsStoredForm (select-keys b-fence ["status" "fenced"])
                 :aOriginalAfterBsFence late2 :aResolution (select-keys a-resolved ["status" "fenced"])
                 :saveWithThePrefix save-refused}]
          (line (assoc r :case "a caller naming no account looks up and fences another account's stored IDs"))
          (is (= [200 nil] (:aSave r)))
          (is (= [400 "InvalidValue"] (:saveWithThePrefix r)) "a save with the prefix is refused")
          (is (nil? (:claimNamingAccountB r)) "B naming its own account finds nothing")
          ;; The page's claim (9.2): with the option, the IDs are the account's own.
          (is (nil? (:claimWithoutAccount r)) "a lookup must not return another account's claim")
          (is (nil? (:commandWithoutAccount r)) "transactionByCommand must not return another account's transaction")
          (is (not= "committed" (get-in r [:operationWithoutAccount "status"])) "the operation route must not return another account's receipt")
          (is (not (get-in r [:bFenceOfAsStoredForm "fenced"])) "another caller must not fence this account's operation"))))))

;; ---------------------------------------------------------------- 4. saves the account rule refuses when the SDK names an account

(deftest claim-account-and-saves-of-no-one-account
  ;; S6 page 9.2: "A save that writes several accounts, none, or only system entities ... keep today's IDs". The SDK
  ;; with claimAccount names the account on every save; scope! refuses any save whose account-of is not that account.
  (if-not (and on? (run? "noaccount"))
    (println "DX-S5R2_SKIP needs TX2_ACCOUNT_CLAIMS=1")
    (reference/in-scope
      (fn [name conn]
        (let [send (fn [owner account] (reference/outcome (reference/send name (with-account (save conn {:facts [{:owner owner :field ":a/f" :type :string :value "v" :pred nil}]}) account))))
              r {:unprefixedNewSubjectNamingAccount (send "subject/u1" "c5")
                 :unprefixedNewSubjectWithout (send "subject/u2" nil)
                 :systemEntityNamingAccount (send "_sys/c5" "c5")
                 :prefixedNamingItsAccount (send "acct/c5/subject/s" "c5")
                 :prefixedNamingAnotherAccount (send "acct/c5/subject/t" "c6")}]
          (line (assoc r :case "saves of no one account from a client that names its account"))
          (is (= [200 nil] (:prefixedNamingItsAccount r)))
          (is (= [200 nil] (:unprefixedNewSubjectWithout r)))
          (is (= [200 nil] (:unprefixedNewSubjectNamingAccount r)) "the page: a save of no one account keeps today's IDs"))))))

;; ---------------------------------------------------------------- 4b. a plain claim nobody owns

(deftest a-plain-claim-of-no-one-account-is-not-found-by-the-account
  ;; S6 9.2: a plain claim is found for the account that wrote it when its transaction's business entities are all
  ;; that account's. A command first committed by a save naming no account that wrote entities of two accounts (or a
  ;; system entity) is owned by no account: the same command, named by one of them, commits again.
  (if-not (and on? (run? "legacy"))
    (println "DX-S5R2_SKIP needs TX2_ACCOUNT_CLAIMS=1")
    (reference/in-scope
      (fn [name conn]
        (let [first-save (save conn {:command "joined:z" :operation "z-op-1"
                                     :facts [{:owner "acct/z1/subject/s" :field ":a/f" :type :string :value "z1" :pred nil}
                                             {:owner "acct/z2/subject/s" :field ":a/f" :type :string :value "z2" :pred nil}]})
              a (reference/send name first-save)
              again (reference/send name (with-account (save conn {:command "joined:z" :operation "z-op-2"
                                                                   :facts [{:owner "acct/z1/subject/t" :field ":a/f" :type :string :value "again" :pred nil}]}) "z1"))
              claim (:body (reference/route name "v1" "claim" {"commandId" "joined:z" "receipt" true "account" "z1"}))
              ;; The same for the operation ID: a save naming z1 under the first save's operation ID.
              same-op (reference/send name (with-account (save conn {:command "joined:z-other" :operation "z-op-1"
                                                                     :facts [{:owner "acct/z1/subject/u" :field ":a/f" :type :string :value "op" :pred nil}]}) "z1"))
              r {:case "a plain claim of a save of two accounts, then the same command named by one of them"
                 :first (reference/outcome a) :sameCommandNamingAccount (reference/outcome again) :claimLookupByAccount (get claim "txId")
                 :firstTx (get-in first-save ["claims" 0 "txId"]) :sameOperationNamingAccount (reference/outcome same-op)}]
          (line r)
          (is (= [200 nil] (:first r)))
          (is (= 409 (first (:sameCommandNamingAccount r))) "a command already committed must not commit again")
          (is (= 409 (first (:sameOperationNamingAccount r))) "an operation already committed must not commit again"))))))

;; ---------------------------------------------------------------- 5. two resolvers of one unknown outcome

(deftest two-resolvers-of-one-operation
  (if-not (run? "resolvers")
    (println "DX-S5R2_SKIP")
    (reference/in-scope
      (fn [name conn]
        (let [M "acct/t1/subject/s" acct (when on? "t1")
              _ (reference/send name (with-account (increment conn name M (str "seed-" (swap! counter inc))) acct))
              op (str "two-" (swap! counter inc))
              [reply held] (holding 1 #(reference/send name (with-account (increment conn name M op) acct)))
              start (promise)
              resolvers (doall (for [_ (range 2)] (future @start (resolve-like-the-sdk name op acct))))
              _ (deliver start true)
              answers (mapv #(select-keys (deref % 20000 {"status" "timeout"}) ["status" "fenced"]) resolvers)
              late (late! held)
              r {:case "two SDK instances resolve one unknown outcome at once" :answer (reference/outcome reply)
                 :resolvers answers :late late :counter (:value (count-of name M))}]
          (line r)
          (is (every? #(get % "fenced") answers) "both resolvers answer fenced")
          (is (= "refused" (:late late)))
          (is (= "1" (:counter r))))))))

;; ---------------------------------------------------------------- 6. fences accumulate

(deftest fences-accumulate
  (if-not (run? "flood")
    (println "DX-S5R2_SKIP")
    (reference/in-scope
      (fn [name conn]
        (let [M "acct/f1/subject/s" acct (when on? "f1")
              n 3000
              before-db (d/db conn)
              t0 (System/nanoTime)
              answers (frequencies (for [i (range n)]
                                     (let [r (fence name (format "%0200d" i) acct)] [(:status r) (get-in r [:body "fenced"])])))
              fence-ms (/ (- (System/nanoTime) t0) 1e6)
              too-long (reference/outcome (fence name (apply str (repeat 257 "x")) acct))
              ;; An operation ID the save path accepts: is it one the fence accepts? (With the option, the fence
              ;; checks the stored, scoped form, which is longer than the client's ID.)
              long-op (apply str "L" (repeat 249 "x"))
              long-save (reference/outcome (reference/send name (with-account (increment conn name "acct/f1/subject/long" long-op) acct)))
              long-fence (reference/outcome (fence name long-op acct))
              long-unknown-fence (reference/outcome (fence name (apply str "U" (repeat 249 "y")) acct))
              saves (vec (for [i (range 20)] (reference/outcome (reference/send name (with-account (increment conn name M (str "after-" i)) acct)))))
              db (d/db conn)
              feed (reference/feed name 0 100)
              log-txs (count (seq (d/tx-range (d/log conn) nil nil)))
              r {:case "fences are permanent transactions with no position" :fences n :answers (str answers)
                 :msPerFence (/ fence-ms n) :overlong too-long :savesAfter (frequencies saves)
                 :saveWith250CharOperation long-save :fenceOfThatCommittedOperation long-fence :fenceOfAnUnknown250CharOperation long-unknown-fence
                 :head (head conn) :feedTransactions (count feed) :logTransactions log-txs
                 :datomsGrowth (- (count (seq (d/datoms db :eavt))) (count (seq (d/datoms before-db :eavt))))
                 :counter (:value (count-of name M))}]
          (line r)
          (is (= {[200 true] n} answers))
          (is (= {[200 nil] 20} (frequencies saves)))
          (is (= 21 (count feed)) "the feed lists the saves and skips the fences")
          (is (= "20" (:counter r)))
          (is (= 200 (first long-unknown-fence)) "an operation ID the save path accepts can be fenced"))))))

;; ---------------------------------------------------------------- 7. F3 and F4: the removal race and the SDK's replay

(deftest a-creation-racing-a-removal-is-replayed-into-the-removed-family
  ;; F4 refuses a creation of a removed family framed before the removal (ErasureReplayDeclined). F3 answers a
  ;; creation racing the removal CasConflict on every writer, which the SDK replays from a fresh read; the replay of a
  ;; creation stages the same caller-supplied values with a source after the removal, which F4 then admits.
  (if-not (and (System/getenv "TRIPLEX_ERASURE_DIRECTORY") (run? "f3f4"))
    (println "DX-S5R2_SKIP removal needs TRIPLEX_ERASURE_DIRECTORY")
    (doseq [fast? [true false]]
      (reference/in-scope
        (fn [name conn]
          (let [_ (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" false})
                X "acct/p3/subject/later" acct (when on? "p3")
                frame-before (fn [] (with-account (save conn {:facts [{:owner X :field ":a/f" :type :string :value "x" :pred nil}
                                                                       {:owner X :field ":p/secret" :type :string :value "x value framed before the removal" :pred nil}]}) acct))
                ;; (a) the removal lands between this save's plan and its commit.
                racing (frame-before)
                removed (atom nil)
                reply ((if fast? (fn [f] (f)) fz/general)
                       (fn [] (let [orig storage/submit! fired (atom false) id (get racing "operationId")]
                                (with-redefs [storage/submit! (fn [c data request timeline & more]
                                                                (when (and (= id (get request "operationId")) (compare-and-set! fired false true))
                                                                  (reset! removed (reference/route name "v1" "erase" {"commandId" "remove-x" "selectors" [{"entityId" X}]})))
                                                                (apply orig c data request timeline more))]
                                  (reference/send name racing)))))
                ;; (b) the same save framed before the removal, sent after it (no race): F4's refusal.
                stale (reference/send name (assoc racing "operationId" (str "stale-" (swap! counter inc))))
                ;; (c) the SDK's replay of (a): the same caller values, a fresh source, a new operation ID.
                replay ((if fast? (fn [f] (f)) fz/general)
                        #(reference/send name (with-account (save conn {:facts [{:owner X :field ":a/f" :type :string :value "x" :pred nil}
                                                                                {:owner X :field ":p/secret" :type :string :value "x value framed before the removal" :pred nil}]}) acct)))
                stored (get-in (fz/read-owner name X {"validAt" 5.0}) [":p/secret" :value])
                r {:case "a creation racing a removal that named its entity" :writer (if fast? "creation writer" "general writer")
                   :removal (:status @removed) :racingAnswer (reference/outcome reply)
                   :sameFrameAfterTheRemoval (reference/outcome stale) :sdkReplay (reference/outcome replay) :storedAfterReplay stored}]
            (line r)
            (is (= 200 (:removal r)))
            (is (= 409 (first (:racingAnswer r))))
            (is (= [409 "ErasureReplayDeclined"] (:sameFrameAfterTheRemoval r)))
            (is (not= "x value framed before the removal" stored)
                "a value framed before the removal must not be stored by the replay of a save that raced it")))))))

;; ---------------------------------------------------------------- 7b. probe: removals with every per-subject writer off

(deftest removals-with-the-per-subject-writers-off
  ;; Test 7 measured nothing in the settings general and accounts-on-general: its removal answered 503. This probe
  ;; records what a removal answers there, for an existing entity and for one that does not exist yet.
  (if-not (and (System/getenv "TRIPLEX_ERASURE_DIRECTORY") (run? "probe"))
    (println "DX-S5R2_SKIP probe")
    (reference/in-scope
      (fn [name conn]
        (let [decl (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" false})
              Y "acct/p9/subject/y"
              seeded (reference/send name (save conn {:facts [{:owner Y :field ":p/secret" :type :string :value "y" :pred nil}]}))
              e1 (reference/route name "v1" "erase" {"commandId" "remove-y" "selectors" [{"entityId" Y "attribute" ":p/secret"}]})
              e2 (reference/route name "v1" "erase" {"commandId" "remove-x" "selectors" [{"entityId" "acct/p9/subject/x"}]})]
          (line {:case "probe: removals" :declared (:status decl) :seed (reference/outcome seeded)
                 :existing (reference/outcome e1) :existingMessage (get-in e1 [:body "message"])
                 :notYetExisting (reference/outcome e2) :notYetExistingMessage (get-in e2 [:body "message"])}))))))

;; ---------------------------------------------------------------- 8. decided refusals answered unknown

(deftest refusals-inside-the-stored-function
  ;; outcome/decided? knows the TRIPLEX_ markers and Datomic's conflicts. The general writer's function also refuses
  ;; with unmarked texts (commit.clj 105, 214, 228, 296, 309; subject_save.clj 130). After submit they are unknown:
  ;; 503, the SDK fences and replays the same save, which is refused the same way, until its replays run out.
  (if-not (run? "unmarked")
    (println "DX-S5R2_SKIP")
    (reference/in-scope
      (fn [name conn]
        (let [M "acct/u3/subject/s" acct (when on? "u3")
              _ (reference/send name (with-account (increment conn name M "seed-u3") acct))
              mixed (let [i (with-account (increment conn name M (str "mixed-clock-" (swap! counter inc))) acct)
                          ids (set (take 1 (get i "newIds")))]
                      ;; two record clocks in one commit of a strict scope (the test scopes are strict)
                      (update i "rows" (fn [rs] (mapv #(if (ids (get-in % ["id" "v"])) (assoc % "recorded_at" {"t" "double" "v" 999.5}) %) rs))))
              span0 (assoc (with-account (increment conn name M (str "span0-" (swap! counter inc))) acct) "span" 0)
              cases {"two record clocks in one strict commit" mixed "span 0" span0}
              results (into {} (for [[k input] cases]
                                 (let [first-try (fz/general #(reference/send name input))
                                       resolved (resolve-like-the-sdk name (get input "operationId") acct)
                                       again (fz/general #(reference/send name (assoc input "operationId" (str "replay-" (swap! counter inc)))))]
                                   [k {:answer (reference/outcome first-try) :message (get-in first-try [:body "message"])
                                       :resolved (select-keys resolved ["status" "fenced"]) :replay (reference/outcome again)}])))]
          (line {:case "refusals inside the stored function, without a marker" :results results})
          (doseq [[k v] results]
            (when (= 503 (first (:answer v)))
              (is (not= 503 (first (:replay v))) [k "a deterministic refusal answered unknown is replayed forever"]))))))))

;; ---------------------------------------------------------------- 8b. the command path with the option off

(deftest the-command-path-settles-on-whichever-transaction-holds-the-command
  ;; S6 9.2: "fixed for every caller: the operation and fence answers name the transaction and the SDK settles only on
  ;; its own". DatomicClient.transactCommand (1640-1645) settles on the claim lookup's txId without comparing it with
  ;; its own journal. With TX2_ACCOUNT_CLAIMS off, B's earlier save of the same command ID makes A's save answer
  ;; CommandConflict, and A's claim lookup returns B's transaction, which the SDK returns as A's receipt.
  (if-not (and (not on?) (run? "command"))
    (println "DX-S5R2_SKIP the option-off command path")
    (reference/in-scope
      (fn [name conn]
        (let [b-input (save conn {:command "joined:shared" :operation "b6-op" :facts [{:owner "acct/b6/subject/s" :field ":a/f" :type :string :value "b" :pred nil}]})
              b (reference/send name b-input)
              a-input (save conn {:command "joined:shared" :operation "a6-op" :facts [{:owner "acct/a6/subject/s" :field ":a/f" :type :string :value "a" :pred nil}]})
              a (reference/send name a-input)
              found (:body (reference/route name "v1" "claim" {"commandId" "joined:shared" "receipt" true}))
              r {:case "the command path with the option off" :b (reference/outcome b) :a (reference/outcome a)
                 :aJournal (get-in a-input ["claims" 0 "txId"]) :claimLookupTxId (get found "txId")
                 :claimLookupReceiptStatus (get-in found ["receipt" "status"]) :aStored (= "committed" (get (operation name (get a-input "operationId") nil) "status"))}]
          (line r)
          (is (= [409 "CommandConflict"] (:a r)))
          (is (not (:aStored r)))
          (is (= (:aJournal r) (:claimLookupTxId r)) "the transaction the SDK would settle on is not A's"))))))

;; ---------------------------------------------------------------- 9. F2: shapes the S6 bound gate did not send

(deftest import-and-live-shapes-against-the-estimate
  ;; Setting bound (TX2_IMPORT_WHOLE_SUBJECT=1, TX2_READ_SET_BOUND=1). Admitted shapes the S6 gate did not send: an
  ;; import frame of one subject with thousands of large values; a re-import that retires a whole live subject; a live
  ;; save at both caps (4,096 existing entities and 4,096 read-only live IDs). Each on the general writer and on the
  ;; per-subject writers (which take import frames of new subjects, F10). Memory-toy times, diagnostic.
  (if-not (and (= "1" (System/getenv "TX2_IMPORT_WHOLE_SUBJECT")) (= "1" (System/getenv "TX2_READ_SET_BOUND")) (run? "f2"))
    (println "DX-S5R2_SKIP needs TX2_IMPORT_WHOLE_SUBJECT=1 and TX2_READ_SET_BOUND=1")
    (reference/in-scope
      (fn [name conn]
        (let [est (requiring-resolve 'triplex.gateway.import-bound/estimate-us)
              limit @(requiring-resolve 'triplex.gateway.write-policy/import-commit-us)
              estimate (fn [input] (let [data (storage/tx-data (d/db conn) input)] (est (second (first data)) input)))
              measure (fn [label wrap input]
                        (let [e (estimate input) reply (wrap #(reference/send name input))
                              t (get-in reply [:body "transactMicros"])
                              r {:frame label :writer (or (get-in reply [:body "subjectSave"]) "general") :outcome (reference/outcome reply)
                                 :message (when-not (= 200 (:status reply)) (get-in reply [:body "message"]))
                                 :estimateUs e :transactMicros t :ratio (when (and t (pos? e)) (/ (double t) e)) :importBoundUs limit}]
                          (line (assoc r :case "F2 shape against the estimate")) r))
              big (fn [n bytes] (apply str (repeat bytes (char (+ 97 (mod n 26))))))
              results (atom [])
              S "acct/b5/subject/replaced"]
          ;; Seed: one subject with 3,000 live facts; 4,096 existing subjects of one fact each.
          (doseq [k (range 6)]
            (is (= [200 nil] (reference/outcome (fz/general #(reference/send name (save conn {:facts (vec (for [i (range 500)] {:owner S :field (str ":r/f" k "-" i) :type :string :value (str "v" i) :pred nil}))})))))))
          (doseq [k (range 8)]
            (is (= [200 nil] (reference/outcome (fz/general #(reference/send name (save conn {:facts (vec (for [i (range 512)] {:owner (str "acct/b5/subject/e" k "-" i) :field ":e/f" :type :string :value "e" :pred nil}))})))))))
          (doseq [[label wrap] [["general" fz/general] ["fast" (fn [f] (f))]]]
            (let [tag (str label "-" (swap! counter inc))
                  ;; (a) one new subject per frame, n facts of v-byte values, as an import frame (sizes around the bound)
                  _ (doseq [[n v] [[20 100] [20 8000] [60 2000] [100 100] [150 100]]]
                      (let [a (assoc (save conn {:facts (vec (for [i (range n)] {:owner (str "acct/b5/subject/big-" tag "-" n "-" v) :field (str ":b/f" i) :type :string :value (big i v) :pred nil}))})
                                     "writeClass" "import")]
                        (swap! results conj (measure (str label ": import, one new subject, " n " values of " v " bytes") wrap a))))
                  ;; (b) a re-import of S: k live facts retired and written again (live = retired, the read set is S)
                  _ (doseq [k [20 60 100 150]]
                      (let [live (into {} (fz/read-owner name S {"validAt" 5.0}))
                            b (assoc (save conn {:facts (vec (for [[f p] (take k live)] {:owner S :field f :type :string :value (str "re-" tag "-" k) :pred p}))})
                                     "writeClass" "import")]
                        (swap! results conj (measure (str label ": import, a subject re-imported, " k " retirements and " k " values") wrap b))))
                  ;; (c) a live save at both caps: 4,096 existing entities read, 4,096 read-only live IDs, one fact
                  entities (vec (for [k (range 8) i (range 512)] (str "acct/b5/subject/e" k "-" i)))
                  live-ids (vec (take 4096 (concat (map (comp :id val) (fz/read-owner name S {"validAt" 5.0}))
                                                   (for [e entities] (:id (get (fz/read-owner name e {"validAt" 5.0}) ":e/f"))))))
                  c (-> (save conn {:facts [{:owner (str "acct/b5/subject/c-" tag) :field ":c/f" :type :string :value "c" :pred nil}]})
                        (assoc "entities" (vec (cons (str "acct/b5/subject/c-" tag) (take 4095 entities))) "live" live-ids))
                  _ (swap! results conj (measure (str label ": live, one fact, 4,095 existing entities and 4,096 read-only live IDs") wrap c))]))
          (let [over (filter #(and (= 200 (first (:outcome %))) (:ratio %) (> (:ratio %) 1.0)) @results)]
            (line {:case "F2 summary" :admittedOverEstimate (count over) :worst (when (seq @results) (select-keys (apply max-key #(or (:ratio %) 0) @results) [:frame :writer :ratio :transactMicros :estimateUs]))})
            (doseq [r @results :when (and (= 200 (first (:outcome r))) (re-find #"import" (:frame r)))]
              (is (<= (:ratio r) 1.0) [r "an admitted import frame costs no more than its estimate"]))))))))

(defn main []
  (let [r (clojure.test/run-tests 's5-attack2)]
    (println "DX-S5R2_RESULT" (json/write-str (assoc (select-keys r [:test :pass :fail :error])
                                                     :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv))))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
