(ns s5-attack3
  "[DX-S5 third review] Attacks on the save line's answer to the second review (head cdfc70e02): the one-way account-ID
  setting and its function move, account authority, and R2-2's replay rule. Reviewer's tests; they do not change the
  code under review. Each case prints one DX-S5R3_ATTACK line and asserts the contract the S6 page states (section 12),
  so a failing assertion is a finding. Run by s5/clj-run3.sh (mode attack3) after s5/fuzz.clj."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [triplex.gateway.storage :as storage] [triplex.gateway.main :as main]
            [triplex.gateway.commit :as commit] [triplex.gateway.account-claims :as ac]
            [s5-fuzz :as fz] [wide-gate :as wide] [wfix1-regression :as reference]))

(def only (some-> (System/getenv "S5_ONLY") (str/split #",") set))
(defn- run? [k] (or (nil? only) (contains? only k)))
(def counter (atom 21000000))
(defn- block [] (assoc (wide/identity-block :wide (swap! counter inc)) :kind :wide))
(defn- head [conn] (storage/head-position (d/db conn)))
(defn- line [m] (println "DX-S5R3_ATTACK" (json/write-str m)))
(defn- save [conn spec] (second (fz/input-of {:seed 0 :counter counter} (merge {:block (block) :source (head conn) :retires []} spec))))
(defn- with-account [input account] (cond-> input account (assoc "account" account)))
(defn- cur [name owner field] (get (fz/read-owner name owner {"validAt" 5.0}) field))
(defn- op-status [name id] (get (fz/op-lookup name id nil) "status"))
(defn- fn-code [db ident] (when-let [e (d/entid db ident)] (:code (:db/fn (d/entity db e)))))
(def refusal-code (delay (:code @ac/refusal)))

(defn- at-submit
  "Runs `competing` once, after the save `input` was planned and before its submit; returns the save's reply."
  [name input competing]
  (let [orig storage/submit! fired (atom false) id (get input "operationId")]
    (with-redefs [storage/submit! (fn [conn data request timeline & more]
                                    (when (and (= id (get request "operationId")) (compare-and-set! fired false true)) (competing))
                                    (apply orig conn data request timeline more))]
      (reference/send name input))))

(defn- hanging []
  (reify clojure.lang.IDeref (deref [_] (throw (IllegalStateException. "unbounded deref")))
    clojure.lang.IBlockingDeref (deref [_ _ timeout] (Thread/sleep 50) timeout)
    clojure.lang.IPending (isRealized [_] false)))
(defn- holding [n f]
  (let [orig d/transact-async calls (atom 0) held (atom nil)]
    (with-redefs [d/transact-async (fn [conn tx & opts]
                                     (if (= n (swap! calls inc))
                                       (do (reset! held #(apply orig conn tx opts)) (hanging))
                                       (apply orig conn tx opts)))]
      [(f) @held])))
(defn- late! [held]
  (when held
    (try (let [r @(held)] {:late "committed" :t (d/basis-t (:db-after r))})
         (catch Exception e {:late "refused" :marker (re-find #"TRIPLEX_[A-Z_]+|unique-conflict" (str e))
                             :message (let [c (or (.getCause e) e)] (subs (str (.getMessage c) " " (pr-str (ex-data c))) 0 (min 300 (count (str (.getMessage c) " " (pr-str (ex-data c)))))))}))))

(defn- turn-on! [conn] (with-redefs [ac/permitted? true] (ac/turn-on! conn)))

;; The writers, each as a save a process that does not know the setting (or has not read it yet) prepares.
(def writers
  {"one owner, narrow block" [:fast (fn [a name] [{:owner (str "acct/" a "/subject/s") :field ":a/f0" :type :string :value "n" :pred (cur name (str "acct/" a "/subject/s") ":a/f0")}]) :narrow nil]
   "one owner, wide block" [:fast (fn [a name] [{:owner (str "acct/" a "/subject/s") :field ":a/f1" :type :string :value "w" :pred (cur name (str "acct/" a "/subject/s") ":a/f1")}]) :wide nil]
   "several owners" [:fast (fn [a name] [{:owner (str "acct/" a "/subject/s") :field ":a/f2" :type :string :value "o" :pred (cur name (str "acct/" a "/subject/s") ":a/f2")}
                                          {:owner (str "acct/" a "/profile/s") :field ":a/f0" :type :string :value "o" :pred (cur name (str "acct/" a "/profile/s") ":a/f0")}]) :wide nil]
   "creation" [:fast (fn [a _] [{:owner (str "acct/" a "/enrolment/" (swap! counter inc)) :field ":e/subject" :type :ref :value (str "acct/" a "/subject/s") :pred nil}]) :wide nil]
   "general" [:general (fn [a name] [{:owner (str "acct/" a "/subject/s") :field ":a/f0" :type :string :value "g" :pred (cur name (str "acct/" a "/subject/s") ":a/f0")}]) :wide nil]
   "import frame" [:general (fn [a _] [{:owner (str "acct/" a "/subject/imp" (swap! counter inc)) :field ":a/f0" :type :string :value "i" :pred nil}]) :wide "import"]
   "settlement frame (activation)" [:general (fn [a _] [{:owner (str "acct/" a "/subject/act" (swap! counter inc)) :field ":a/f0" :type :string :value "a" :pred nil}]) :wide "activation"]})

(defn- seed! [name conn a]
  (doseq [o [(str "acct/" a "/subject/s") (str "acct/" a "/profile/s")]]
    (reference/send name (save conn {:facts (vec (for [f [":a/f0" ":a/f1" ":a/f2"]] {:owner o :field f :type :string :value "seed" :pred nil}))}))))

;; ---------------------------------------------------------------- 1. the transition with a save in flight

(deftest the-transition-with-a-save-in-flight-in-each-writer
  ;; A save planned with the setting absent and submitted after the transition committed must be refused (409
  ;; CasConflict), store nothing, and its replay store once. Two kinds of planner: a request naming no account, and a
  ;; request naming its account on a process without the permission (it stores the plain form when it commits).
  (when (run? "transition")
    (doseq [[label [path facts-of kind klass]] (sort writers) naming [false true]]
      (reference/in-scope
        (fn [name conn]
          (let [a (str "t" (swap! counter inc)) _ (seed! name conn a)
                input (cond-> (save conn {:command (str "tc-" (swap! counter inc)) :facts (facts-of a name)
                                          :block (if (= kind :narrow) (assoc (wide/identity-block :narrow (swap! counter inc)) :kind :narrow) (block))})
                        klass (assoc "writeClass" klass)
                        naming (assoc "account" a))
                op (get input "operationId")
                wrap (if (= path :general) fz/general (fn [f] (f)))
                reply (with-redefs [ac/permitted? false]
                        (wrap #(at-submit name input (fn [] (turn-on! conn)))))
                after (op-status name op)
                replay (wrap #(reference/send name (assoc input "operationId" (str op "/replay"))))
                db (d/db conn)
                claim (get-in input ["claims" 0 "commandId"])
                r {:case "a save planned before the transition, submitted after it" :writer label :namesAccount naming
                   :setting (ac/setting db) :answer (reference/outcome reply) :writerKind (fz/writer-kind conn op reply)
                   :storedAfterRefusal after :replay (reference/outcome replay)
                   :claimPlain (some? (d/entid db [:triplex.claim/command-id claim]))
                   :claimScoped (some? (d/entid db [:triplex.claim/command-id (ac/encode a claim)]))}]
            (line r)
            (is (= 1 (:setting r)))
            (is (= [409 "CasConflict"] (:answer r)) [label naming "a save planned before the transition is refused"])
            (is (= "absent" (:storedAfterRefusal r)) [label naming "nothing stored"])
            (is (= [200 nil] (:replay r)) [label naming "its replay commits"])
            (when naming (is (and (:claimScoped r) (not (:claimPlain r))) [label "the replay of a save naming its account stores the scoped form"]))))))))

;; ---------------------------------------------------------------- 2. two processes turn it on at once

(deftest two-processes-turn-it-on-at-once
  (when (run? "race")
    (let [results
          (vec (for [i (range 12)]
                 (reference/in-scope
                   (fn [name conn]
                     (seed! name conn (str "r" i))
                     (let [before (d/db conn)
                           originals (into {} (for [[_ i] (d/q '[:find ?e ?i :where [?e :db/fn] [?e :db/ident ?i]] before)
                                                    :when (ac/swappable? i)] [i (fn-code before i)]))
                           start (promise)
                           runs (doall (for [_ (range 3)] (future @start (try (turn-on! conn) :ok (catch Exception e (str (.getMessage e)))))))
                           _ (deliver start true)
                           outcomes (mapv #(deref % 30000 :timeout) runs)
                           db (d/db conn)
                           check (for [[i code] originals]
                                   {:ident (str i) :oldRefuses (= @refusal-code (fn-code db i)) :twinIsOriginal (= code (fn-code db (ac/twin i)))})]
                       {:outcomes outcomes :setting (ac/setting db) :functions (count originals)
                        :bad (vec (remove #(and (:oldRefuses %) (:twinIsOriginal %)) check))})))))]
      (line {:case "three processes turn the setting on at once, 12 databases" :results (mapv #(dissoc % :bad) results)
             :bad (vec (mapcat :bad results))})
      (is (every? #(= 1 (:setting %)) results))
      (is (empty? (mapcat :bad results)) "every moved function: the old ident refuses and the twin keeps the original body"))))

;; ---------------------------------------------------------------- 3. the fixed ident of the general writer is reinstalled
;; The general writer calls :triplex/commit when predecessor lookup is off (the gateway's default; commit.clj entry) and
;; its hashed variant :triplex.write/v-... when it is on. Run under accounts-on-nopred to see the fixed ident's case.

(deftest a-reopen-with-another-commit-hash-restores-the-old-ident
  ;; create-scope! (every store open) calls commit/install-base!, which re-transacts :triplex/commit whenever the
  ;; scope's stored hash differs from the process's own (commit.clj 420-432). The hash differs between builds whose
  ;; commit code differs and between options of one build (TX2_LOAD1_PROFILE, the covering-owner trio). After the
  ;; transition that re-transaction replaces the refusing body: a save planned before the transition, or by a build that
  ;; does not know the setting, commits on the general writer again; and the twin keeps the body of the transition's
  ;; build, so an upgraded build's general writer runs the old code.
  (when (run? "reinstall")
    (doseq [reopen? [false true]]
      (reference/in-scope
        (fn [name conn]
          (let [a (str "u" (swap! counter inc)) _ (seed! name conn a)
                scope-key (:v (first (d/datoms (d/db conn) :aevt :triplex.scope/key)))
                ;; A general-writer save planned by a process that has not read the setting (or does not know it).
                input (with-account (save conn {:command (str "ri-" (swap! counter inc))
                                                :facts [{:owner (str "acct/" a "/subject/s") :field ":a/f0" :type :string :value "late" :pred (cur name (str "acct/" a "/subject/s") ":a/f0")}]}) a)
                [reply held] (with-redefs [ac/permitted? false] (holding 1 #(fz/general (fn [] (reference/send name input)))))
                _ (turn-on! conn)
                ;; A process whose :triplex/commit hash differs opens the scope (here the same code under another hash; a
                ;; build or option with different commit code writes its own body).
                _ (when reopen? (with-redefs [commit/source-hash (str "f" (subs commit/source-hash 1))] (commit/install-base! conn scope-key)))
                db (d/db conn)
                old-body-refuses (= @refusal-code (fn-code db :triplex/commit))
                ;; Which body the transactor runs under the old ident: the refusal throws with
                ;; {:triplex.account/ids-changed true}; the writer's body fails some other way on an empty payload.
                probe (try @(d/transact conn [[:triplex/commit {}]]) "committed"
                           (catch Exception e (let [c (or (.getCause e) e)]
                                                (if (:triplex.account/ids-changed (ex-data c)) "refusal body" (str "writer body: " (subs (str (.getMessage c)) 0 (min 80 (count (str (.getMessage c))))))))))
                late (late! held)
                claim (get-in input ["claims" 0 "commandId"])
                ;; A build that does not know the setting (same writer code, the setting never read), after the reopen:
                ;; a general save naming no account, as base 23b7df344 or a6d02225c sends it.
                old-input (save conn {:facts [{:owner (str "acct/" a "/subject/old") :field ":a/f0" :type :string :value "old build" :pred nil}]})
                old-build (with-redefs [ac/on? (constantly false) ac/permitted? false] (fz/general #(reference/send name old-input)))
                db2 (d/db conn)
                r {:case "the general writer's ident after a reopen by a process with another commit hash" :reopened reopen?
                   :answer (reference/outcome reply) :oldIdentRefuses old-body-refuses :bodyRun probe :lateOriginal late
                   :oldBuildGeneralSave (reference/outcome old-build)
                   :oldBuildStored (op-status name (get old-input "operationId"))
                   :storedPlainAfterTheSetting (some? (d/entid db2 [:triplex.claim/command-id claim]))
                   :twinIsTransitionBody (= (fn-code db2 (ac/twin :triplex/commit)) (fn-code (d/db conn) (ac/twin :triplex/commit)))
                   :routedTo (str (ffirst (ac/route-data conn db2 [[:triplex/commit {}]])))}]
            (line r)
            (is (= 1 (ac/setting db2)))
            (is (:oldIdentRefuses r) [reopen? "after the transition the old ident must keep refusing"])
            (is (not= "committed" (:late (:lateOriginal r))) [reopen? "a save planned before the transition must never commit after it"])
            (is (not= [200 nil] (:oldBuildGeneralSave r)) [reopen? "a build that does not know the setting must be refused"])
            (is (not (:storedPlainAfterTheSetting r)) [reopen? "no plain claim of an account-named save after the setting is on"])))))))

;; ---------------------------------------------------------------- 4. a save prepared on an old snapshot

(deftest a-held-snapshot-from-before-the-transition
  (when (run? "snapshot")
    (reference/in-scope
      (fn [name conn]
        (let [a (str "h" (swap! counter inc)) _ (seed! name conn a)
              begun (:body (reference/route name "v2" "begin" {"ids" []}))
              handle (get begun "handle")
              _ (turn-on! conn)
              input (assoc (with-account (save conn {:facts [{:owner (str "acct/" a "/subject/s") :field ":a/f0" :type :string :value "h" :pred (cur name (str "acct/" a "/subject/s") ":a/f0")}]}) a)
                           "handle" handle)
              first-try (reference/send name input)
              db (d/db conn)
              claim (get-in input ["claims" 0 "commandId"])
              r {:case "a save sent with a snapshot handle taken before the transition" :handle (some? handle)
                 :firstTry (reference/outcome first-try)
                 :claimPlain (some? (d/entid db [:triplex.claim/command-id claim]))
                 :claimScoped (some? (d/entid db [:triplex.claim/command-id (ac/encode a claim)]))}]
          (line r)
          (when (= [200 nil] (:firstTry r))
            (is (and (:claimScoped r) (not (:claimPlain r))) "a save prepared on a snapshot from before the transition, stored after it, stores the scoped form")))))))

;; ---------------------------------------------------------------- 5. account authority

(deftest one-account-against-anothers-command-ids-with-the-setting-on
  ;; S6 12.2 "what stays": a write of no one account's names under an ID before the account's own write refuses that
  ;; write. Measured: how long (for good), and who can do it (any caller that writes a system entity or two accounts'
  ;; names, naming no account). And :names-the-account: B names account a9 itself (the gateway takes the account from
  ;; the request) and writes an a9 entity under a9's command ID first; S6 12.4 says another account cannot take a
  ;; Publish's ID first once the setting is on.
  (when (run? "authority")
    (doseq [setting-on [true false] how [:system-entity :two-accounts :names-the-account]]
      (reference/in-scope
        (fn [name conn]
          (when setting-on (turn-on! conn))
          (let [A "acct/a9/subject/alice" cmd (str "joined:alice-" (swap! counter inc))
                ;; Operation IDs are random per attempt in the SDK (protocol.ts randomUUID): every save here has its own.
                op #(str "op-" (swap! counter inc))
                ;; With the setting off it stays off: no process here is permitted to turn it on.
                keep-off (fn [f] (if setting-on (f) (with-redefs [ac/permitted? false] (f))))
                b-facts (case how
                          :system-entity [{:owner "_sys/notes" :field ":n/text" :type :string :value "b" :pred nil}]
                          :two-accounts [{:owner "acct/b9/subject/x" :field ":a/f" :type :string :value "b" :pred nil}
                                         {:owner "acct/c9/subject/x" :field ":a/f" :type :string :value "b" :pred nil}]
                          :names-the-account [{:owner "acct/a9/subject/planted-by-b" :field ":a/f" :type :string :value "b" :pred nil}])
                b (keep-off #(fz/general (fn [] (reference/send name (with-account (save conn {:command cmd :operation (op) :facts b-facts})
                                                                             (when (= how :names-the-account) "a9"))))))
                tries (vec (for [i (range 5)]
                             (reference/outcome (keep-off #(reference/send name (with-account (save conn {:command cmd :operation (op) :facts [{:owner A :field ":a/f" :type :string :value (str "a" i) :pred (cur name A ":a/f")}]}) "a9"))))))
                filler (dotimes [i 30] (keep-off #(reference/send name (save conn {:operation (op) :facts [{:owner (str "acct/a9/subject/f" i) :field ":a/f" :type :string :value "x" :pred nil}]}))))
                later (reference/outcome (keep-off #(reference/send name (with-account (save conn {:command cmd :operation (op) :facts [{:owner A :field ":a/f" :type :string :value "late" :pred (cur name A ":a/f")}]}) "a9"))))
                setting-after (ac/setting (d/db conn))
                lookup (:body (reference/route name "v1" "claim" {"commandId" cmd "account" "a9" "receipt" true}))
                forged (:body (reference/route name "v1" "claim" {"commandId" cmd "receipt" true}))
                r {:case "another caller's write of no one account takes an account's command ID first" :settingOn setting-on :how how
                   :bWrite (reference/outcome b) :accountsSaves tries :after30MoreSaves later
                   :accountsLookup (select-keys lookup ["txId" "taken"]) :lookupNamingNoAccount (get forged "txId")
                   :settingAfter setting-after :deniedForGood (not-any? #(= [200 nil] %) (conj tries later))}]
            (line r)
            (is (= [200 nil] (:bWrite r)))
            (is (= (when setting-on 1) setting-after))
            ;; Asserted only where the page claims it: S6 12.4 (U8) with the setting on. The other cases are admitted
            ;; (12.2 "what stays"; with the setting off command IDs are database-wide) and only measured.
            (when (and setting-on (= how :names-the-account))
              (is (some #(= [200 nil] %) (:accountsSaves r)) [setting-on how "another account must not take an account's ID first (S6 12.4, U8)"]))))))))

(deftest naming-another-account-reads-its-claims
  ;; The account a lookup is made for is the one the request names, or the account of the entities it names. Nothing
  ;; checks it: any caller can name account A, or A's entities, and read A's claims, receipts and rows.
  (when (run? "authority")
    (reference/in-scope
      (fn [name conn]
        (turn-on! conn)
        (let [A "acct/a10/subject/alice" cmd "joined:a10"
              a (reference/send name (with-account (save conn {:command cmd :facts [{:owner A :field ":p/email" :type :string :value "a's value" :pred nil}]}) "a10"))
              by-name (:body (reference/route name "v1" "claim" {"commandId" cmd "account" "a10" "receipt" true}))
              by-entities (:body (reference/route name "v1" "claim" {"commandId" cmd "entities" [A] "receipt" true}))
              command (:body (reference/route name "v2" "command" {"commandId" cmd "account" "a10"}))
              r {:case "a caller names another account (or its entities) on a lookup" :aSave (reference/outcome a)
                 :claimNamingTheAccount (get by-name "txId") :claimNamingItsEntities (get by-entities "txId")
                 :transactionByCommand (get command "txId")}]
          (line r)
          (is (= [200 nil] (:aSave r))))))))

;; ---------------------------------------------------------------- 6. R2-2: the replay rule

(defn- protected! [name] (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" false}))
(defn- erase! [name cmd selectors] (reference/route name "v1" "erase" {"commandId" cmd "selectors" selectors}))

(deftest r2-2-replays-across-a-removal
  ;; Each case: a save chosen before a removal of a protected value it writes, then the removal, then an attempt that
  ;; carries the same values. The rule under review: an SDK replay (frameSourceK = its first attempt's source) is
  ;; declined; a new save (no frameSourceK) is judged by its own source.
  (when (and (System/getenv "TRIPLEX_ERASURE_DIRECTORY") (run? "r22"))
    (doseq [[label path] [["one owner" :fast] ["general" :general]] chosen ["value chosen before" "old secret"]]
      (reference/in-scope
        (fn [name conn]
          (protected! name)
          (let [S "acct/p11/subject/s" wrap (if (= path :general) fz/general (fn [f] (f)))
                _ (wrap #(reference/send name (save conn {:facts [{:owner S :field ":p/secret" :type :string :value "old secret" :pred nil}
                                                                  {:owner S :field ":a/f" :type :string :value "x" :pred nil}]})))
                ;; (a) The first attempt is refused for a reason unrelated to the removal (a concurrent save of S).
                cmd (str "c-" (swap! counter inc))
                first-source (head conn)
                attempt (save conn {:command cmd :operation (str cmd "/1") :source first-source
                                    :facts [{:owner S :field ":p/secret" :type :string :value chosen :pred (cur name S ":p/secret")}]})
                _ (wrap #(reference/send name (save conn {:facts [{:owner S :field ":a/f" :type :string :value "y" :pred (cur name S ":a/f")}]})))
                refused (wrap #(reference/send name attempt))
                removed (erase! name "remove-s" [{"entityId" S "attribute" ":p/secret"}])
                fresh (fn [n extra] (merge (save conn {:command cmd :operation (str cmd "/" n) :facts [{:owner S :field ":p/secret" :type :string :value chosen :pred (cur name S ":p/secret")}]}) extra))
                ;; (b) The SDK's replay: fresh source, the first attempt's source as frameSourceK.
                replay (wrap #(reference/send name (fresh 2 {"frameSourceK" first-source})))
                ;; (c) The caller resends the same command after the decline: a new save (no frameSourceK).
                resend (wrap #(reference/send name (fresh 3 {})))
                stored (get-in (fz/read-owner name S {"validAt" 5.0}) [":p/secret" :value])
                r {:case "a save refused before a removal, replayed and resent after it" :writer label :chosen chosen
                   :firstAttempt (reference/outcome refused) :removal (:status removed) :sdkReplay (reference/outcome replay)
                   :callerResendSameCommand (reference/outcome resend) :storedAfter stored}]
            (line r)
            (is (= 200 (:removal r)))
            (is (= [409 "ErasureReplayDeclined"] (:sdkReplay r)) [label "the SDK's replay across the removal is declined"])
            (is (not= chosen stored) [label chosen "a value chosen before the removal must not be stored by a resend of the same command"])))))))

(deftest r2-2-an-optimistic-replay-against-an-old-removal
  ;; frameSourceK null (an optimistic first attempt) is judged as framed before every removal: a replay is declined when
  ;; it writes a family any removal ever named, here one removed before the save was ever made.
  (when (and (System/getenv "TRIPLEX_ERASURE_DIRECTORY") (run? "r22"))
    (reference/in-scope
      (fn [name conn]
        (protected! name)
        (let [S "acct/p12/subject/s"
              _ (reference/send name (save conn {:facts [{:owner S :field ":p/secret" :type :string :value "first" :pred nil}]}))
              removed (erase! name "remove-early" [{"entityId" S "attribute" ":p/secret"}])
              _ (dotimes [i 5] (reference/send name (save conn {:facts [{:owner (str "acct/p12/subject/f" i) :field ":a/f" :type :string :value "x" :pred nil}]})))
              ;; The owner enters a new value long after the removal; its first attempt was optimistic (no source) and was
              ;; refused for an unrelated reason; the SDK replays it with frameSourceK null.
              replay (reference/send name (assoc (save conn {:facts [{:owner S :field ":p/secret" :type :string :value "new value after the removal" :pred nil}]})
                                                 "frameSourceK" nil))
              plain (reference/send name (save conn {:facts [{:owner S :field ":p/secret" :type :string :value "new value, first attempt" :pred nil}]}))
              r {:case "an optimistic replay of a new value, long after a removal of its family" :removal (:status removed)
                 :replayWithNullFrameSource (reference/outcome replay) :sameSaveAsAFirstAttempt (reference/outcome plain)}]
          (line r)
          (is (= [200 nil] (:replayWithNullFrameSource r)) "a value entered after the removal must not be declined because the first attempt stated no source"))))))

(deftest r2-2-race-on-each-writer
  ;; The removal lands between the plan and the commit of a save writing the removed family, then the SDK replays.
  (when (and (System/getenv "TRIPLEX_ERASURE_DIRECTORY") (run? "r22"))
    (doseq [[label path kind klass creates?] [["one owner, narrow" :fast :narrow nil false] ["one owner, wide" :fast :wide nil false]
                                              ["creation" :fast :wide nil true] ["general" :general :wide nil false]
                                              ["import frame" :general :wide "import" true]]]
      (reference/in-scope
        (fn [name conn]
          (protected! name)
          (let [S (str "acct/p13/subject/" (if creates? (str "new" (swap! counter inc)) "s"))
                wrap (if (= path :general) fz/general (fn [f] (f)))
                _ (when-not creates? (wrap #(reference/send name (save conn {:facts [{:owner S :field ":p/secret" :type :string :value "old" :pred nil}]}))))
                src (head conn)
                input (cond-> (save conn {:command (str "race-" (swap! counter inc)) :source src
                                          :block (if (= kind :narrow) (assoc (wide/identity-block :narrow (swap! counter inc)) :kind :narrow) (block))
                                          :facts [{:owner S :field ":p/secret" :type :string :value "chosen before" :pred (when-not creates? (cur name S ":p/secret"))}]})
                        klass (assoc "writeClass" klass))
                removed (atom nil)
                reply (wrap #(at-submit name input (fn [] (reset! removed (erase! name "remove-race" [{"entityId" S "attribute" ":p/secret"}])))))
                replay (wrap #(reference/send name (assoc (save conn {:command (get-in input ["claims" 0 "commandId"])
                                                                      :facts [{:owner S :field ":p/secret" :type :string :value "chosen before" :pred (when-not creates? (cur name S ":p/secret"))}]})
                                                          "frameSourceK" src)))
                stored (get-in (fz/read-owner name S {"validAt" 5.0}) [":p/secret" :value])
                r {:case "a save racing a removal of the family it writes, then the SDK's replay" :writer label
                   :removal (:status @removed) :race (reference/outcome reply) :replay (reference/outcome replay) :storedAfter stored}]
            (line r)
            (is (= 200 (:removal r)))
            (is (not= "chosen before" stored) [label "the value chosen before the removal is not stored"])))))))

;; ---------------------------------------------------------------- 7. an ordered import chain across the transition

(deftest an-import-chain-across-the-transition
  ;; TX2_IMPORT_PIPELINE=1: frame n of a stream names frame n-1's command ID as its predecessor (storage.clj
  ;; import-predecessor), and the writer refuses the frame unless that claim exists (TRIPLEX_IMPORT_PREDECESSOR).
  ;; apply-ids rewrites the predecessor to the scoped form once the setting is on; frames committed before it are plain.
  (when (and (run? "import") storage/import-pipeline?)
    (reference/in-scope
      (fn [name conn]
        (let [a (str "i" (swap! counter inc))
              stream (str "pipeline-" (apply str (repeat 64 "c")))
              frame! (fn [cmd i account]
                       (with-redefs [ac/permitted? false]
                         (fz/general #(reference/send name (cond-> (assoc (save conn {:command cmd :operation (str cmd "/op" (swap! counter inc))
                                                                                       :facts [{:owner (str "acct/" a "/subject/imp" i) :field ":a/f0" :type :string :value (str "i" i) :pred nil}]})
                                                                          "writeClass" "import")
                                                                   account (assoc "account" account))))))
              manifest (frame! "load1/manifest/import" 0 a)
              f0 (frame! (str "load1/" stream "/0") 1 a)
              _ (turn-on! conn)
              f1-naming (frame! (str "load1/" stream "/1") 2 a)
              f1-again (frame! (str "load1/" stream "/1") 2 a)
              f1-plain (frame! (str "load1/" stream "/1") 2 nil)
              r {:case "an ordered import chain, its first frames before the transition and the next after it"
                 :manifest (reference/outcome manifest) :frame0 (reference/outcome f0) :setting (ac/setting (d/db conn))
                 :frame1NamingTheAccount (reference/outcome f1-naming) :frame1Again (reference/outcome f1-again)
                 :frame1NamingNoAccount (reference/outcome f1-plain)}]
          (line r)
          (is (= [200 nil] (:frame0 r)))
          (is (= [200 nil] (:frame1NamingTheAccount r)) "an import chain that names its account continues across the transition"))))))

(defn main []
  (let [r (clojure.test/run-tests 's5-attack3)]
    (println "DX-S5R3_RESULT" (json/write-str (assoc (select-keys r [:test :pass :fail :error])
                                                     :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv))))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
