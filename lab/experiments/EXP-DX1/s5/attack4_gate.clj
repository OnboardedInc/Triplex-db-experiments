(ns s5-attack4
  "[DX-S5 fourth review] Attacks on the save line's answer to the third review (head 9f210018f): the admitted window
  after an old build rewrites a moved writer, the install wrap under a stale read and a crash, the transition killed
  at each of its steps, the account check of a request naming one account, and R2-2's general-writer arm with the
  removal on its own thread. Reviewer's tests; they do not change the code under review. Each case prints one
  DX-S5R4_ATTACK line. Run by s5/clj-run3.sh (mode attack4) after s5/fuzz.clj and s5/attack3_gate.clj (whose helpers it
  uses)."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [triplex.gateway.storage :as storage] [triplex.gateway.commit :as commit]
            [triplex.gateway.schema :as schema] [triplex.gateway.account-claims :as ac]
            [s5-fuzz :as fz] [s5-attack3 :as a3] [wfix1-regression :as reference]))

(def only (some-> (System/getenv "S5_ONLY") (str/split #",") set))
(defn- run? [k] (or (nil? only) (contains? only k)))
(def counter @#'a3/counter)
(def save @#'a3/save)
(def seed! @#'a3/seed!)
(def cur @#'a3/cur)
(def op-status @#'a3/op-status)
(def at-submit @#'a3/at-submit)
(def protected! @#'a3/protected!)
(def erase! @#'a3/erase!)
(defn- turn-on! [conn] (with-redefs [ac/permitted? true] (ac/turn-on! conn)))
(defn- line [m] (println "DX-S5R4_ATTACK" (json/write-str m)))
(defn- with-account [input account] (cond-> input account (assoc "account" account)))
(defn- op [] (str "op4-" (swap! counter inc)))
(defn- scope-of [conn] (:e (first (d/datoms (d/db conn) :aevt :triplex.scope/key))))
(defn- working? [db ident] (when-let [e (d/entid db ident)] (when-let [f (:db/fn (d/entity db e))] (not (ac/refusal? f)))))

;; ---------------------------------------------------------------- another build's general writer

(defn- other-bodies
  "The general writer (and its variants) as a build whose commit code differs writes them: here this build's own code
  under the covering-owner option (its owner-root fence) or the load profile, computed with that option's var on."
  [option]
  (let [with-option (fn [f] (case option
                              :owner-head (with-redefs [commit/owner-root-guard? true] (f))
                              :load-profile (with-redefs [commit/load-profile true] (f))))]
    (with-option
      (fn []
        (let [code (commit/observe-load (commit/instrument-code (commit/expand-code commit/observe-range)))
              variants (into {} (for [[opt profile] [[true false] [false true] [true true]]
                                      :let [body (commit/observe-load (commit/instrument-code (commit/expand-code commit/observe-range opt profile)))]]
                                  [[opt profile] [(keyword "triplex.write" (str "v-" (subs (schema/sha256 (pr-str body)) 0 24))) body]]))]
          {:code code :hash (schema/sha256 (pr-str code)) :variants variants})))))

(defn- fn-of [code] (d/function {:lang :clojure :params '[db payload] :requires '[[datomic.api :as d] [clojure.data.json :as json]] :code code}))

(defn- old-open!
  "What a build that does not know the setting writes when it opens the database (its commit/install! without the
  wrap): its general writer under :triplex/commit with its hash, and its predecessor-lookup variant when absent."
  [conn {:keys [code hash variants]} option]
  (let [db (d/db conn) [vident vbody] (variants [true false])]
    @(d/transact conn (cond-> [{:db/ident :triplex/commit :db/fn (fn-of code)} [:db/add (scope-of conn) :triplex.scope/commit-fn-hash hash]]
                        (= option :load-profile) (conj (schema/attr :triplex.load/metrics :db.type/string))))
    (when (and (= "1" (System/getenv "TX2_PREDECESSOR_LOOKUP")) (not (d/entid (d/db conn) vident)))
      @(d/transact conn [{:db/ident vident :db/fn (fn-of vbody)}]))))

(defn- old-save
  "A general save of that build: the setting never read, its own writer idents."
  [name conn bodies input]
  (with-redefs [ac/on? (constantly false) ac/permitted? false commit/variants (:variants bodies)]
    (fz/general #(reference/send name input))))

(deftest the-admitted-window-after-an-old-build-opens
  (when (run? "window")
    (doseq [option [:owner-head :load-profile]]
      (reference/in-scope
        (fn [name conn]
          (let [a (str "w" (swap! counter inc)) _ (seed! name conn a)
                _ (turn-on! conn)
                bodies (other-bodies option)
                olds (fn [n] (vec (for [i (range n)]
                                    (let [input (save conn {:operation (op) :facts [{:owner (str "acct/" a "/subject/o" (swap! counter inc)) :field ":a/f0" :type :string :value "old" :pred nil}]})]
                                      (reference/outcome (old-save name conn bodies input))))))
                stored (fn [xs] (count (filter #(= [200 nil] %) xs)))
                head-save (fn [] (reference/outcome (reference/send name (with-account (save conn {:operation (op) :facts [{:owner (str "acct/" a "/subject/h" (swap! counter inc)) :field ":a/f0" :type :string :value "head" :pred nil}]}) a))))
                _ (old-open! conn bodies option)
                after-open (olds 20)
                ;; A save of the old build under a command of the account, in the window: a plain claim.
                cmd (str "joined:" a "-" (swap! counter inc))
                window-save (old-save name conn bodies (save conn {:command cmd :operation (op) :facts [{:owner (str "acct/" a "/subject/c") :field ":a/f0" :type :string :value "window" :pred nil}]}))
                window-tx (get (:body (reference/route name "v1" "claim" {"commandId" cmd})) "txId")
                h1 (head-save)
                after-head (olds 5)
                _ (old-open! conn bodies option)
                after-reopen (olds 5)
                _ (ac/installing conn #(d/db conn))
                after-head-open (olds 5)
                ;; The account's own save of that command, and its lookup.
                own (reference/outcome (reference/send name (with-account (save conn {:command cmd :operation (op) :facts [{:owner (str "acct/" a "/subject/c") :field ":a/f1" :type :string :value "own" :pred nil}]}) a)))
                lookup (:body (reference/route name "v1" "claim" {"commandId" cmd "account" a "receipt" true}))
                r {:case "an old build opens after the transition (its general writer differs) and saves" :option option
                   :storedAfterItsOpen (stored after-open) :of 20 :windowSave (reference/outcome window-save)
                   :headSave h1 :storedAfterAHeadSave (stored after-head) :storedAfterItReopens (stored after-reopen)
                   :storedAfterAHeadOpen (stored after-head-open)
                   :accountsOwnSaveOfTheCommand own :accountsLookupIsTheOldBuildsTransaction (= window-tx (get lookup "txId"))
                   :repairs @ac/repairs}]
            (line r)
            (is (= 0 (:storedAfterAHeadSave r)) [option "a routed save of this build restores the refusal"])
            (is (= 0 (:storedAfterAHeadOpen r)) [option "an open of this build restores the refusal"])))))))

;; ---------------------------------------------------------------- the install wrap: a stale read, then a crash

(deftest an-install-read-before-the-transition-commits-after-it
  ;; An open of this build reads the database before the setting attribute exists; another process turns the setting
  ;; on; the open's install commits (install-transact: attribute absent at read, so no guard, no rewrite); the process
  ;; dies before its repair. What is left, and how long.
  (when (run? "stale-install")
    (reference/in-scope
      (fn [name conn]
        (let [a (str "s" (swap! counter inc)) _ (seed! name conn a)
              scope-key (:v (first (d/datoms (d/db conn) :aevt :triplex.scope/key)))
              before (d/db conn)
              _ (turn-on! conn)
              orig-db d/db
              crash (try (with-redefs [d/db (fn [c] (if (= c conn) before (orig-db c)))
                                       ac/repair! (fn [& _] (throw (ex-info "the process died before its repair" {})))
                                       commit/source-hash (str "f" (subs commit/source-hash 1))]
                           (commit/install-base! conn scope-key)
                           "no crash")
                         (catch Exception e (.getMessage e)))
              db (d/db conn)
              bodies {:variants commit/variants}
              old (fn [] (reference/outcome (old-save name conn bodies (save conn {:operation (op) :facts [{:owner (str "acct/" a "/subject/o" (swap! counter inc)) :field ":a/f0" :type :string :value "old" :pred nil}]}))))
              olds-before (vec (repeatedly 3 old))
              h (reference/outcome (reference/send name (with-account (save conn {:operation (op) :facts [{:owner (str "acct/" a "/subject/h") :field ":a/f0" :type :string :value "h" :pred nil}]}) a)))
              olds-after (vec (repeatedly 3 old))
              r {:case "an install that read the database before the transition commits after it; the process dies before its repair"
                 :crash crash :oldIdentWorksAfterTheCrash (boolean (working? db :triplex/commit))
                 :oldSavesBeforeAHeadSave olds-before :headSave h :oldSavesAfter olds-after}]
          (line r)
          (is (every? #(not= [200 nil] %) olds-after) "after a routed save of this build, an old save is refused"))))))

;; ---------------------------------------------------------------- the transition killed at each of its steps

(deftest the-transition-killed-at-each-step
  ;; turn-on! is two transactions: the setting attribute with the setting guard, then the setting with every move. The
  ;; process dies before the first, between them, or after the second before it answers; then the state is read, an
  ;; old save and an account's save are sent, and turn-on! is run again.
  (when (run? "kill")
    (doseq [kill-at [1 2 3]]
      (reference/in-scope
        (fn [name conn]
          (let [a (str "k" (swap! counter inc)) _ (seed! name conn a)
                orig d/transact calls (atom 0)
                killed (try (with-redefs [d/transact (fn [c tx & more]
                                                       (let [n (swap! calls inc)]
                                                         (when (= n kill-at) (throw (ex-info "killed before this transaction" {})))
                                                         (let [r (apply orig c tx more)]
                                                           (when (and (= kill-at 3) (= n 2)) @r (throw (ex-info "killed after the transition, before its answer" {})))
                                                           r)))]
                              (turn-on! conn) "no kill")
                            (catch Exception e (.getMessage e)))
                db (d/db conn)
                moved (for [[_ i] (d/q '[:find ?e ?i :where [?e :db/fn] [?e :db/ident ?i]] db) :when (ac/swappable? i)] i)
                state {:setting (ac/setting db) :attribute (some? (d/entid db :triplex.scope/account-ids))
                       :guard (some? (d/entid db ac/setting-guard))
                       :oldIdentsRefusing (count (filter #(not (working? db %)) moved)) :writerIdents (count moved)
                       :twins (count (filter #(d/entid db (ac/twin %)) moved))}
                old (reference/outcome (old-save name conn {:variants commit/variants} (save conn {:operation (op) :facts [{:owner (str "acct/" a "/subject/o") :field ":a/f0" :type :string :value "old" :pred nil}]})))
                acct (reference/outcome (with-redefs [ac/permitted? false] (reference/send name (with-account (save conn {:command (str "kc-" (swap! counter inc)) :operation (op) :facts [{:owner (str "acct/" a "/subject/k") :field ":a/f0" :type :string :value "k" :pred nil}]}) a))))
                again (turn-on! conn)
                db2 (d/db conn)
                moved2 (for [[_ i] (d/q '[:find ?e ?i :where [?e :db/fn] [?e :db/ident ?i]] db2) :when (ac/swappable? i)] i)
                old2 (reference/outcome (old-save name conn {:variants commit/variants} (save conn {:operation (op) :facts [{:owner (str "acct/" a "/subject/o2") :field ":a/f0" :type :string :value "old" :pred nil}]})))
                r {:case "the transition killed at one of its steps, then run again" :killAt kill-at :killed killed :state state
                   :oldSave old :accountSave acct :afterRunningItAgain {:setting (ac/setting db2) :oldIdentsRefusing (count (filter #(not (working? db2 %)) moved2))
                                                                        :writerIdents (count moved2) :oldSave old2}}]
            (line r)
            ;; Never a mix: either nothing moved and the setting is absent, or the setting is on and every writer moved.
            (is (or (and (nil? (:setting state)) (zero? (:oldIdentsRefusing state)) (= [200 nil] old))
                    (and (= 1 (:setting state)) (= (:writerIdents state) (:oldIdentsRefusing state)) (not= [200 nil] old)))
                [kill-at "no state between the two"])
            (is (and (= 1 (ac/setting db2)) (not= [200 nil] old2)) [kill-at "running it again completes it"])))))))

;; ---------------------------------------------------------------- the account check of a request naming one account

(deftest a-request-naming-one-account
  (when (run? "authority4")
    (doseq [setting-on [true false]]
      (reference/in-scope
        (fn [name conn]
          (when setting-on (turn-on! conn))
          (let [A "a40" B "b40"
                kept (fn [f] (if setting-on (f) (with-redefs [ac/permitted? false] (f))))
                send (fn [account facts & [klass general?]]
                       (let [input (cond-> (with-account (save conn {:command (str "c4-" (swap! counter inc)) :operation (op) :facts facts}) account)
                                     klass (assoc "writeClass" klass))]
                         [input (kept #(if general? (fz/general (fn [] (reference/send name input))) (reference/send name input)))]))
                claim-form (fn [input account]
                             (let [c (get-in input ["claims" 0 "commandId"]) db (d/db conn)]
                               (cond (d/entid db [:triplex.claim/command-id (ac/encode account c)]) "scoped"
                                     (d/entid db [:triplex.claim/command-id c]) "plain" :else "none")))
                f (fn [owner field value & [type]] {:owner owner :field field :type (or type :string) :value value :pred nil})
                [_ other] (send A [(f (str "acct/" A "/subject/x") ":a/f" "a") (f (str "acct/" B "/subject/x") ":a/f" "b")])
                [_ other-import] (send A [(f (str "acct/" A "/subject/i" (swap! counter inc)) ":a/f" "a") (f (str "acct/" B "/subject/i" (swap! counter inc)) ":a/f" "b")] "import" true)
                [_ other-activation] (send A [(f (str "acct/" A "/subject/s" (swap! counter inc)) ":a/f" "a") (f (str "acct/" B "/subject/s" (swap! counter inc)) ":a/f" "b")] "activation" true)
                [i-sys sys] (send A [(f "_sys/x4" ":n/t" "s")])
                [i-mixed mixed] (send A [(f (str "acct/" A "/subject/y") ":a/f" "a") (f "_sys/y4" ":n/t" "s")])
                [i-ref ref] (send A [(f (str "acct/" A "/subject/r") ":a/ref" (str "acct/" B "/subject/x") :ref)])
                ;; An entity of no account that the save makes B's: its :subject/account is read before the save.
                planted (str "x/planted-" (swap! counter inc))
                [i-plant plant] (send A [(f planted ":subject/account" B)])
                stored-account (when-let [pa (requiring-resolve 'triplex.gateway.group/persisted-account)] (pa (d/db conn) planted))
                [_ b-writes] (send B [(f planted ":a/f" "by b")])
                [_ a-writes-again] (send A [(f planted ":a/f" "by a")])
                r {:case "a request naming one account" :settingOn setting-on
                   :writesAnotherAccountsEntity (reference/outcome other) :sameAsAnImportFrame (reference/outcome other-import)
                   :sameAsASettlementFrame (reference/outcome other-activation)
                   :systemEntityOnly [(reference/outcome sys) (claim-form i-sys A)] :itsOwnAndASystemEntity [(reference/outcome mixed) (claim-form i-mixed A)]
                   :aReferenceIntoAnotherAccount [(reference/outcome ref) (claim-form i-ref A)]
                   :makesAnEntityAnotherAccounts [(reference/outcome plant) (claim-form i-plant A)] :itsStoredAccountAfter stored-account
                   :thatAccountThenWritesIt (reference/outcome b-writes) :theFirstAccountWritesItAgain (reference/outcome a-writes-again)}]
            (line r)
            (is (= 400 (first (:writesAnotherAccountsEntity r))))
            (is (= 400 (first (:sameAsAnImportFrame r))))
            (is (= 400 (first (:sameAsASettlementFrame r))))
            (is (not= [200 nil] (first (:makesAnEntityAnotherAccounts r))) "a save naming A must not make an entity B's")))))))

;; ---------------------------------------------------------------- R2-2's general-writer arm, the removal on its own thread

(deftest r2-2-the-general-writer-with-the-removal-on-its-own-thread
  ;; The third review's race ran the removal on the saving thread, which on the general writer cannot take the scope's
  ;; writer lock the save holds. Here the removal runs on its own thread from the save's submit; the save commits, the
  ;; removal then takes the lock. The value chosen before the removal must not be what is stored after both.
  (when (and (System/getenv "TRIPLEX_ERASURE_DIRECTORY") (run? "r22b"))
    (doseq [[label klass creates?] [["general" nil false] ["import frame" "import" true] ["general, a new entity" nil true]]]
      (reference/in-scope
        (fn [name conn]
          (protected! name)
          (let [S (str "acct/p41/subject/" (if creates? (str "new" (swap! counter inc)) "s"))
                _ (when-not creates? (fz/general #(reference/send name (save conn {:operation (op) :facts [{:owner S :field ":p/secret" :type :string :value "old" :pred nil}]}))))
                input (cond-> (save conn {:command (str "rb-" (swap! counter inc)) :operation (op)
                                          :facts [{:owner S :field ":p/secret" :type :string :value "chosen before" :pred (when-not creates? (cur name S ":p/secret"))}]})
                        klass (assoc "writeClass" klass))
                removal (promise)
                reply (fz/general #(at-submit name input (fn [] (future (deliver removal (erase! name (str "rm-" (swap! counter inc)) [{"entityId" S "attribute" ":p/secret"}]))))))
                removed (deref removal 20000 :timeout)
                stored (get-in (fz/read-owner name S {"validAt" 5.0}) [":p/secret" :value])
                r {:case "a general-writer save racing a removal sent from another thread at its submit" :writer label
                   :save (reference/outcome reply) :removal (if (map? removed) (:status removed) removed) :storedAfterBoth stored}]
            (line r)
            (is (= 200 (:removal r)))
            (is (not= "chosen before" stored) [label "after the removal, the value chosen before it is not stored"])))))))

(defn main []
  (let [r (clojure.test/run-tests 's5-attack4)]
    (println "DX-S5R4_RESULT" (json/write-str (assoc (select-keys r [:test :pass :fail :error])
                                                     :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv))))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
