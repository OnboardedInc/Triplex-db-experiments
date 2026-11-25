(ns triplex.gateway.account-claims
  "[DX-S6] Account-scoped command IDs, switched on by a one-way setting stored in the database.

  The setting. `:triplex.scope/account-ids` = 1 on the scope entity. Absent: every ID is stored as the client sent it
  (today). Present: a command ID of a save that names its account (`account`, the SDK's `claimAccount`) and writes only
  that account's entities is stored as \"acct-id/v1/<n>/<account>/<id>\" (n: the account's length, so the boundary is
  exact whatever either contains). Every gateway of this build reads it from the database it serves, on every save,
  lookup and fence; TX2_ACCOUNT_CLAIMS=1 only lets a process turn it on (at its first save that names an account, or
  through POST /v1/db/<db>/settings). It never turns off.

  One stored form per ID, chosen in one place. Operation IDs have a single stored form, the client's own, on every
  gateway and in every state of the setting: the save, its replan retry and the fence can never disagree, so a fenced
  original can never commit (S5 R2-1). A command ID's form is chosen by `stored-ids`, once per save; the replan retry
  re-applies the same choice (`apply-ids`). A save that names its account while the setting is absent carries a guard
  (`:triplex.account/ids-guard-v1`) that refuses it, replayably, if the setting turned on before it commits, so no
  command is stored in the plain form after the setting is on by a save that names its account.

  Old claims. A plain claim is the account's own when its transaction wrote that account's entities (an account among
  several included, S5 R2-11) or no account's entities at all; a lookup naming an account finds its scoped claim, else
  such a plain claim, and answers `taken` for a plain claim of other accounts only.

  The reserved prefix may not begin any client-supplied ID on any route (save, claim, begin, command, operation,
  fence), whatever the setting (S5 R2-3).

  Loaded through requiring-resolve, after every stored function is defined; no stored function changes."
  (:require [clojure.string :as str] [datomic.api :as d] [triplex.gateway.lean :as lean]))

(def enabled (= "1" (System/getenv "TX2_ACCOUNT_CLAIMS")))
(def prefix "acct-id/v1/")

(defn encode [account id] (str prefix (count account) "/" account "/" id))

(defn decode
  "[account id] for a scoped value, nil for a plain one."
  [^String v]
  (when (and (string? v) (.startsWith v prefix))
    (let [rest (subs v (count prefix)) slash (.indexOf ^String rest "/")]
      (when (pos? slash)
        (let [n (Long/parseLong (subs rest 0 slash)) from (inc slash)]
          (when (and (<= (+ from n 1) (count rest)) (= \/ (.charAt ^String rest (+ from n))))
            [(subs rest from (+ from n)) (subs rest (+ from n 1))]))))))

(defn plain "The caller's ID of a stored value (scoped or plain)." [v] (if-let [[_ id] (decode v)] id v))

(defn- account-of-id [db id]
  (or (second (re-matches #"acct/([A-Za-z0-9_-]{1,64})/.+" id))
      (when (and db (lean/enabled? db)) ((requiring-resolve 'triplex.gateway.group/persisted-account) db id))))

(defn account-of
  "The one account a save's business entities belong to, or nil (several, none, system only)."
  [db p]
  (let [journals (set (:journal-entities p))
        business (remove #(or (journals %) (.startsWith ^String % "_")) (filter string? (:owners p)))
        accounts (set (map #(account-of-id db %) business))]
    (when (and (seq business) (= 1 (count accounts)) (some? (first accounts))) (first accounts))))

(def setting-attr :triplex.scope/account-ids)
(def guard-ident :triplex.account/ids-guard-v1)
(def permitted? (= "1" (System/getenv "TX2_ACCOUNT_CLAIMS")))

(defn- scope-eid [db] (:e (first (d/datoms db :aevt :triplex.scope/key))))

(defn setting
  "The database's account-ID setting: 1 when on, nil when absent."
  [db]
  (when (d/entid db setting-attr) (:v (first (d/datoms db :eavt (scope-eid db) setting-attr)))))

(def ^:private guard-code
  '(let [a (d/entid db :triplex.scope/account-ids)
         v (when a (:v (first (d/datoms db :eavt scope a))))]
     (when-not (= v expected) (throw (ex-info "TRIPLEX_CONFLICT" {:triplex.account/ids-changed true})))
     []))

(defn turn-on!
  "Turns the setting on (one way) and installs the guard. Only a process with TX2_ACCOUNT_CLAIMS=1 may."
  [conn]
  (when-not permitted? (throw (ex-info "This process may not turn account IDs on" {:status 403 :code "SettingNotPermitted"})))
  (let [db (d/db conn)]
    (when-not (d/entid db setting-attr)
      @(d/transact conn [{:db/ident setting-attr :db/valueType :db.type/long :db/cardinality :db.cardinality/one}]))
    (let [db (d/db conn)]
      (when-not (= 1 (setting db)) @(d/transact conn [[:db/add (scope-eid db) setting-attr 1]]))
      (d/db conn))))

(defn install-guard! [conn]
  (when-not (d/entid (d/db conn) guard-ident)
    @(d/transact conn [{:db/ident guard-ident
                        :db/fn (d/function {:lang :clojure :params '[db scope expected] :requires '[[datomic.api :as d]] :code guard-code})}])))

(defn reserved? [id] (and (string? id) (str/starts-with? id prefix)))

(defn check-ids!
  "Refuses any client-supplied ID that begins with the reserved prefix (every route, every setting)."
  [ids]
  (when (some reserved? ids)
    (throw (ex-info "IDs may not begin with the reserved account prefix" {:status 400 :code "InvalidValue" :write-policy true}))))

(defn- tx-accounts
  "The accounts of the business entities a transaction wrote (their revision changed in it), from the log."
  [conn db tx]
  (let [t (d/tx->t tx) rev (d/entid db :triplex.entity/rev)
        data (:data (first (d/tx-range (d/log conn) t (inc t))))
        ids (distinct (keep (fn [x] (when (and (= rev (:a x)) (:added x)) (:v (first (d/datoms db :eavt (:e x) :triplex.entity/id))))) data))]
    (set (map #(account-of-id db %) (remove #(.startsWith ^String % "_") ids)))))

(defn owned?
  "Whether the plain claim entity `claim` is `account`'s: its transaction wrote that account's entities (alone or with
  others), or no account's entities at all."
  [conn db claim account]
  (let [tx (or (:v (first (d/datoms db :eavt claim :triplex.claim/tx))) claim)
        accounts (disj (tx-accounts conn db tx) nil)]
    (or (empty? accounts) (contains? accounts account))))

(defn find-claim
  "[claim-entity status] of command `id` for `account`: :scoped, :plain (an owned plain claim), :taken (a plain claim of
  other accounts only, not returned) or nil. Without an account: today's database-wide lookup."
  [conn db id account]
  (if-not account
    (when-let [e (d/entid db [:triplex.claim/command-id id])] [e :plain])
    (if-let [e (d/entid db [:triplex.claim/command-id (encode account id)])]
      [e :scoped]
      (when-let [e (d/entid db [:triplex.claim/command-id id])]
        (if (owned? conn db e account) [e :plain] [nil :taken])))))

(defn account-for
  "The account a lookup is made for: the one it names, or else the one account of the entities it names (`entities`,
  the caller's own save), or nil (today's database-wide lookup)."
  [db input]
  (or (get input "account")
      (let [ids (filter string? (get input "entities"))
            accounts (set (map #(account-of-id db %) (remove #(.startsWith ^String % "_") ids)))]
        (when (and (seq ids) (= 1 (count accounts))) (first accounts)))))

(defn- refuse! [status code message] (throw (ex-info message {:status status :code code :write-policy true})))

(defn stored-ids
  "The one place a save's stored command IDs are chosen. nil for a request that names no account (stored as sent).
  Otherwise {:account :scoped? :guard}: scoped when the setting is on and the save writes only the named account's
  entities; a save of no one account keeps the plain form; a save of another account is refused."
  [conn db p input]
  (when-let [account (get input "account")]
    (let [own (account-of db p)]
      (when (and own (not= own account))
        (refuse! 400 "InvalidValue" "The request's account is not the account of the entities it saves"))
      (let [db (if (and own (nil? (setting db)) permitted?) (turn-on! conn) db)
            on (= 1 (setting db))]
        (when (and own on)
          (doseq [c (:command-ids p)]
            (when-let [e (d/entid db [:triplex.claim/command-id c])]
              (when (owned? conn db e account)
                (refuse! 409 "CommandConflict" "This account already committed the command (plain claim)")))))
        (when-not on (install-guard! conn))
        {:account account :scoped? (boolean (and own on)) :guard (when-not on [guard-ident (scope-eid db) nil])}))))

(defn apply-ids
  "Rewrites prepared data to the stored IDs `ids` chose (the first attempt and its replan retry alike)."
  [data ids]
  (if-not ids
    data
    (let [[[ident p] & more] data
          cmd (if (:scoped? ids) #(encode (:account ids) %) identity)
          op (fn [x] (if (and (map? x) (:triplex.claim/command-id x)) (update x :triplex.claim/command-id cmd) x))
          p (cond-> (update p :ops #(mapv op %))
              (:command-ids p) (update :command-ids #(mapv cmd %))
              (:import-predecessor p) (update :import-predecessor cmd))]
      (vec (concat [[ident p]] more (when (:guard ids) [(:guard ids)]))))))
