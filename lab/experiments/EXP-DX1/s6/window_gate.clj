(ns s6-window
  "[DX-S6c fifth pass] The fourth review's findings on the setting (s5/REVIEW-4.md): an older build's open after the
  transition (R4-1, R4-4, R4-7), a plain claim written in such a window (R4-5), a database turned on without the setting
  guard (R4-8), a gateway with predecessor lookup off (R4-4), and a request naming one account that would give an entity
  another account (R4-2). Each case prints one DX-S6_WINDOW line. Run by s6/clj-run.sh (mode window) after
  s5/fuzz.clj, s5/attack3_gate.clj and s5/attack4_gate.clj, whose helpers it uses. Times are diagnostic."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [triplex.gateway.storage :as storage] [triplex.gateway.commit :as commit]
            [triplex.gateway.predecessor :as pred] [triplex.gateway.account-claims :as ac]
            [s5-fuzz :as fz] [s5-attack3 :as a3] [s5-attack4 :as a4] [wfix1-regression :as reference]))

(def counter @#'a3/counter)
(def save @#'a3/save)
(def seed! @#'a3/seed!)
(def other-bodies @#'a4/other-bodies)
(def fn-of @#'a4/fn-of)
(def old-save @#'a4/old-save)
(defn- turn-on! [conn] (with-redefs [ac/permitted? true] (ac/turn-on! conn)))
(defn- line [m] (println "DX-S6_WINDOW" (json/write-str m)))
(defn- with-account [input account] (cond-> input account (assoc "account" account)))
(defn- op [] (str "op6w-" (swap! counter inc)))
(defn- scope-of [conn] (:e (first (d/datoms (d/db conn) :aevt :triplex.scope/key))))
(defn- working? [db ident] (when-let [e (d/entid db ident)] (when-let [f (:db/fn (d/entity db e))] (not (ac/refusal? f)))))
(defn- violations [db] (vec (for [[i] (d/q '[:find ?i :where [?e :db/fn] [?e :db/ident ?i]] db) :when (and (ac/swappable? i) (working? db i))] (str i))))
(defn- probe
  "Which body the transactor runs under `ident`: the refusal, or a working writer (which fails some other way on an
  empty payload)."
  [conn ident]
  (try @(d/transact conn [[ident {}]]) "committed"
       (catch Exception e (if (re-find #"TRIPLEX_ACCOUNT_IDS_ON" (str e (.getCause e))) "refusal" "writer"))))
(defn- old-general [name conn a]
  (reference/outcome (old-save name conn {:variants commit/variants}
                               (save conn {:operation (op) :facts [{:owner (str "acct/" a "/subject/o" (swap! counter inc)) :field ":a/f0" :type :string :value "old" :pred nil}]}))))
(defn- own [name conn a & [extra]]
  (reference/outcome (reference/send name (merge (with-account (save conn {:operation (op) :facts [{:owner (str "acct/" a "/subject/h" (swap! counter inc)) :field ":a/f0" :type :string :value "head" :pred nil}]}) a) extra))))

;; ---------------------------------------------------------------- R4-1: the database refuses an older build's general writer

(deftest an-older-builds-open-with-another-general-writer-is-refused-by-the-database
  ;; What an older build's commit/install! writes when the recorded hash is not its own: its body under :triplex/commit
  ;; and its hash, in one transaction. Under the setting the hash bar refuses that transaction whole.
  (doseq [option [:owner-head :load-profile]]
    (reference/in-scope
      (fn [name conn]
        (let [a (str "wb" (swap! counter inc)) _ (seed! name conn a)
              before-hash (:v (first (d/datoms (d/db conn) :eavt (scope-of conn) :triplex.scope/commit-fn-hash)))
              _ (turn-on! conn)
              {:keys [code hash]} (other-bodies option)
              open (try @(d/transact conn [{:db/ident :triplex/commit :db/fn (fn-of code)} [:db/add (scope-of conn) :triplex.scope/commit-fn-hash hash]])
                        "committed"
                        (catch Exception e (let [m (str (.getMessage (or (.getCause e) e)))] (subs m 0 (min 200 (count m))))))
              db (d/db conn)
              olds (vec (repeatedly 10 #(old-general name conn a)))
              r {:case "an older build opens after the transition with another general writer" :option option
                 :open open :barred (ac/hash-barred? db)
                 :hashUnchanged (= before-hash (:v (first (d/datoms db :eavt (scope-of conn) :triplex.scope/commit-fn-hash))))
                 :oldIdent (probe conn :triplex/commit) :oldSavesStored (count (filter #(= [200 nil] %) olds)) :of 10
                 :ownSave (own name conn a)}]
          (line r)
          (is (not= "committed" (:open r)) [option "the database refuses the older build's install"])
          (is (str/includes? (str (:open r)) "clojure.core/nil?") [option "refused by the hash bar"])
          (is (:hashUnchanged r)) (is (= "refusal" (:oldIdent r)))
          (is (zero? (:oldSavesStored r)) [option "no save of the older build commits"])
          (is (= [200 nil] (:ownSave r))))))))

;; ---------------------------------------------------------------- R4-1 (the rest) and the fuzz case: closed at the next save

(def refused-before-routing
  "This build's saves that are refused before any writer is chosen (the review's fuzz case was 400
  ProtectedTypeUnsupported), and an ordinary save."
  {:reserved-prefix (fn [input] (assoc input "operationId" (str ac/prefix "x")))
   :invalid-account (fn [input] (assoc input "account" "not an account!"))
   :stored identity})

(deftest a-working-body-another-build-writes-closes-at-this-builds-next-save
  ;; What the hash bar does not stop: a working body under an ident the database did not hold at the transition (an
  ;; older build's writer for options no process had opened that database with), or under a moved ident without a hash
  ;; (an install that read the database before the transition, R4-7). Each is written; the older build's saves through
  ;; it are counted (the window); then this build sends one save of each kind, including saves refused before any
  ;; writer is chosen; after it, no moved ident holds a working body and the older build's saves are refused.
  (doseq [[shape ident] [[:new-ident (keyword "triplex.write" (str "v-" "0123456789abcdef01234567"))] [:old-ident-no-hash :triplex/commit]]
          [kind f] refused-before-routing]
    (reference/in-scope
      (fn [name conn]
        (let [a (str "wn" (swap! counter inc)) _ (seed! name conn a)
              _ (turn-on! conn)
              _ (own name conn a)
              _ @(d/transact conn [{:db/ident ident :db/fn (fn-of commit/code)}])
              window (probe conn ident)
              ;; An older build's general saves through it, when its variant is that ident (predecessor lookup on).
              old (fn [] (if (= shape :new-ident)
                           (reference/outcome (old-save name conn {:variants (assoc commit/variants [true false] [ident commit/code])}
                                                        (save conn {:operation (op) :facts [{:owner (str "acct/" a "/subject/o" (swap! counter inc)) :field ":a/f0" :type :string :value "old" :pred nil}]})))
                           (old-general name conn a)))
              in-window (vec (repeatedly 3 old))
              trigger (reference/outcome (reference/send name (f (with-account (save conn {:operation (op) :facts [{:owner (str "acct/" a "/subject/t") :field ":a/f0" :type :string :value "t" :pred nil}]}) a))))
              db (d/db conn)
              after (vec (repeatedly 3 old))
              r {:case "a working body another build writes after the transition, then one save of this build" :shape shape :trigger kind
                 :predecessorLookup pred/enabled :window window :oldSavesInTheWindow in-window :thisBuildsSave trigger
                 :workingBodiesAfter (violations db) :identAfter (probe conn ident) :twinOfTheNewIdent (some? (d/entid db (ac/twin ident)))
                 :oldSavesAfter after}]
          (line r)
          (is (= "writer" (:window r)) "the case: a working body is there")
          (when (not= kind :stored) (is (not= [200 nil] (:thisBuildsSave r)) "this build's save is refused before routing"))
          (is (empty? (:workingBodiesAfter r)) [shape kind "after any save of this build, no moved ident holds a working body"])
          (is (= "refusal" (:identAfter r)) [shape kind])
          (is (every? #(not= [200 nil] %) (:oldSavesAfter r)) [shape kind "the older build's saves are refused after it"]))))))

(deftest the-guard-costs-one-scan-per-save
  ;; Diagnostic: what guard! reads on a save. Setting absent: one datom read, no transaction. Setting on, nothing
  ;; written since the last look: one scan of the :db/fn datoms.
  (reference/in-scope
    (fn [name conn]
      (let [a (str "wc" (swap! counter inc)) _ (seed! name conn a)
            n 2000
            timed (fn [] (let [t0 (System/nanoTime)] (dotimes [_ n] (ac/guard! conn)) (/ (- (System/nanoTime) t0) n 1000.0)))
            t-absent (d/basis-t (d/db conn))
            off-us (timed)
            off-tx (= t-absent (d/basis-t (d/db conn)))
            _ (turn-on! conn)
            _ (ac/guard! conn)
            t-on (d/basis-t (d/db conn))
            on-us (timed)
            on-tx (= t-on (d/basis-t (d/db conn)))
            fns (count (seq (d/datoms (d/db conn) :aevt :db/fn)))
            r {:case "the guard's cost per save (diagnostic, Mac)" :settingAbsentMicros off-us :settingAbsentWrites (not off-tx)
               :settingOnMicros on-us :settingOnWrites (not on-tx) :fnDatomsScanned fns}]
        (line r)
        (is off-tx "with the setting absent the guard writes nothing")
        (is on-tx "with nothing written since, the guard writes nothing")))))

;; ---------------------------------------------------------------- R4-5: a plain claim after the setting is no account's

(deftest a-plain-claim-after-the-setting-is-no-accounts
  ;; Two ways a plain claim is committed after the setting: a request naming no account (the system's), and a save of
  ;; an older build in a window (here: a working body without a hash under :triplex/commit, the old build's save naming
  ;; no account). Either way the account's lookup does not return it and the account's own save of that command is
  ;; stored, under its scoped form.
  (doseq [how [:system :window]]
    (reference/in-scope
      (fn [name conn]
        (let [a (str "wp" (swap! counter inc)) _ (seed! name conn a)
              _ (turn-on! conn)
              cmd (str "joined:" a "-" (swap! counter inc))
              input (save conn {:command cmd :operation (op) :facts [{:owner (str "acct/" a "/subject/c") :field ":a/f0" :type :string :value "plain" :pred nil}]})
              plain (case how
                      :system (reference/outcome (reference/send name input))
                      :window (do @(d/transact conn [{:db/ident :triplex/commit :db/fn (fn-of commit/code)}])
                                  (reference/outcome (old-save name conn {:variants {}} input))))
              plain-tx (get (:body (reference/route name "v1" "claim" {"commandId" cmd})) "txId")
              lookup-before (:body (reference/route name "v1" "claim" {"commandId" cmd "account" a "receipt" true}))
              mine (reference/outcome (reference/send name (with-account (save conn {:command cmd :operation (op) :facts [{:owner (str "acct/" a "/subject/c") :field ":a/f1" :type :string :value "own" :pred nil}]}) a)))
              lookup-after (:body (reference/route name "v1" "claim" {"commandId" cmd "account" a "receipt" true}))
              db (d/db conn)
              r {:case "a plain claim committed after the setting" :how how :plainSave plain :plainClaim (some? plain-tx)
                 :accountsLookupBefore (select-keys lookup-before ["status" "txId"]) :accountsOwnSave mine
                 :scopedStored (some? (d/entid db [:triplex.claim/command-id (ac/encode a cmd)]))
                 :accountsLookupAfterIsItsOwn (and (some? (get lookup-after "txId")) (not= plain-tx (get lookup-after "txId")))}]
          (line r)
          (is (= [200 nil] (:plainSave r)) [how "the case: a plain claim is committed"])
          (is (not= plain-tx (get lookup-before "txId")) [how "the account's lookup does not return it"])
          (is (= [200 nil] (:accountsOwnSave r)) [how "the account's own save of the command is stored"])
          (is (:scopedStored r)) (is (:accountsLookupAfterIsItsOwn r)))))))

;; ---------------------------------------------------------------- R4-8: a database turned on without the guard

(deftest a-database-turned-on-without-the-setting-guard
  ;; A database turned on by cdfc70e02 has the setting attribute and the moved functions but no setting guard (and no
  ;; hash bar). This build's installs get both before they run, and then take the guarded path.
  (reference/in-scope
    (fn [name conn]
      (let [a (str "wg" (swap! counter inc)) _ (seed! name conn a)
            scope (scope-of conn)
            _ @(d/transact conn [{:db/ident :triplex.scope/account-ids :db/valueType :db.type/long :db/cardinality :db.cardinality/one}])
            db0 (d/db conn)
            _ @(d/transact conn (vec (concat [[:db/add scope :triplex.scope/account-ids 1]] (#'ac/swap-ops db0 (#'ac/writer-functions db0)))))
            before {:guard (some? (d/entid (d/db conn) ac/setting-guard)) :bar (ac/hash-barred? (d/db conn))}
            hash0 (:v (first (d/datoms (d/db conn) :eavt scope :triplex.scope/commit-fn-hash)))
            scope-key (:v (first (d/datoms (d/db conn) :aevt :triplex.scope/key)))
            ;; This build opens it with another general-writer hash (an option that changes the body).
            _ (with-redefs [commit/source-hash (str "f" (subs commit/source-hash 1))] (commit/install-base! conn scope-key))
            db (d/db conn)
            r {:case "a database turned on without the setting guard, then opened by this build" :before before
               :after {:guard (some? (d/entid db ac/setting-guard)) :bar (ac/hash-barred? db)}
               :hashUnchanged (= hash0 (:v (first (d/datoms db :eavt scope :triplex.scope/commit-fn-hash))))
               :workingBodies (violations db) :ownSave (own name conn a) :oldSave (old-general name conn a)}]
        (line r)
        (is (= {:guard false :bar false} (:before r)) "the case")
        (is (= {:guard true :bar true} (:after r)) "this build's open installs the guard and the hash bar")
        (is (:hashUnchanged r) "the install took the guarded path: the recorded hash is left as it was")
        (is (empty? (:workingBodies r)))
        (is (= [200 nil] (:ownSave r))) (is (not= [200 nil] (:oldSave r)))))))

;; ---------------------------------------------------------------- R4-4: predecessor lookup off

(deftest a-gateway-with-predecessor-lookup-off-serves-no-save-under-the-setting
  (reference/in-scope
    (fn [name conn]
      (let [a (str "wl" (swap! counter inc)) _ (seed! name conn a)
            nopred (fn [f] (with-redefs [ac/nopred-for-tests false pred/enabled false] (f)))
            ;; A process that may not turn the setting on (with permission it would try, and be refused: below).
            absent (nopred #(with-redefs [ac/permitted? false] (own name conn a)))
            turn (nopred #(try (turn-on! conn) "turned on" (catch Exception e (:code (ex-data e)))))
            setting-after-refused-turn (ac/setting (d/db conn))
            _ (with-redefs [pred/enabled true] (turn-on! conn))
            op-id (op)
            refused (nopred #(reference/outcome (reference/send name (with-account (save conn {:operation op-id :facts [{:owner (str "acct/" a "/subject/n") :field ":a/f0" :type :string :value "n" :pred nil}]}) a))))
            refused-unnamed (nopred #(reference/outcome (reference/send name (save conn {:operation (op) :facts [{:owner "_sys/n" :field ":n/t" :type :string :value "n" :pred nil}]}))))
            stored (some? (d/entid (d/db conn) [:triplex.tx/operation-id op-id]))
            on (with-redefs [pred/enabled true] (own name conn a))
            r {:case "a gateway with predecessor lookup off" :settingAbsentSave absent :turnOn turn :settingAfterTheRefusedTurnOn setting-after-refused-turn
               :saveUnderTheSetting refused :saveNamingNoAccount refused-unnamed :stored stored :withPredecessorLookupOn on}]
        (line r)
        (is (= [200 nil] (:settingAbsentSave r)) "with the setting absent nothing changes")
        (is (= "AccountIdsNeedPredecessorLookup" (:turnOn r))) (is (nil? (:settingAfterTheRefusedTurnOn r)))
        (is (= [409 "AccountIdsNeedPredecessorLookup"] (:saveUnderTheSetting r)))
        (is (= [409 "AccountIdsNeedPredecessorLookup"] (:saveNamingNoAccount r)))
        (is (not (:stored r)))
        (is (= [200 nil] (:withPredecessorLookupOn r)))))))

;; ---------------------------------------------------------------- R4-2: an entity's account after the save

(deftest a-save-cannot-give-an-entity-another-account
  ;; A request naming A asserts :subject/account on an entity whose ID carries no account: with B's value it is
  ;; refused and the entity stays absent; with A's own value it is stored and the entity is A's (B is then refused, A
  ;; may write it). Through the one-owner, general and import-frame writers, setting on and off.
  (doseq [setting-on [true false] [label klass general?] [["one owner" nil false] ["general" nil true] ["import frame" "import" true]]]
    (reference/in-scope
      (fn [name conn]
        (when setting-on (turn-on! conn))
        (let [A "a60" B "b60"
              kept (fn [f] (if setting-on (f) (with-redefs [ac/permitted? false] (f))))
              send (fn [account facts]
                     (let [input (cond-> (with-account (save conn {:command (str "c6-" (swap! counter inc)) :operation (op) :facts facts}) account)
                                   klass (assoc "writeClass" klass))]
                       (reference/outcome (kept #(if general? (fz/general (fn [] (reference/send name input))) (reference/send name input))))))
              f (fn [owner field value] {:owner owner :field field :type :string :value value :pred nil})
              planted (str "x/planted6-" (swap! counter inc))
              mine (str "x/mine6-" (swap! counter inc))
              both (str "x/both6-" (swap! counter inc))
              pa (fn [id] ((requiring-resolve 'triplex.gateway.group/persisted-account) (d/db conn) id))
              r {:case "a request naming one account and an entity's :subject/account" :settingOn setting-on :writer label
                 :givesItAnother (send A [(f planted ":subject/account" B)]) :plantedExists (some? (d/entid (d/db conn) [:triplex.entity/id planted]))
                 :givesItItsOwn (send A [(f mine ":subject/account" A)]) :itsAccount (pa mine)
                 :anotherThenWritesIt (send B [(f mine ":a/f" "by b")]) :itWritesItAgain (send A [(f mine ":a/f" "by a")])
                 :ownAndAnotherInOne (send A [(f both ":subject/account" A) (f (str "x/both6b-" (swap! counter inc)) ":subject/account" B)])}]
          (line r)
          (is (= 400 (first (:givesItAnother r))) [setting-on label "a save naming A must not make an entity B's"])
          (is (not (:plantedExists r)))
          (is (= [200 nil] (:givesItItsOwn r)) [setting-on label "a save giving an entity its own account is stored"])
          (is (= A (:itsAccount r)))
          (is (= 400 (first (:anotherThenWritesIt r))))
          (is (= [200 nil] (:itWritesItAgain r)))
          (is (= 400 (first (:ownAndAnotherInOne r)))))))))

(defn main []
  (let [r (clojure.test/run-tests 's6-window)]
    (println "DX-S6_RESULT" (json/write-str (assoc (select-keys r [:test :pass :fail :error])
                                                   :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv))))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
