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
  re-applies the same choice (`apply-ids`).

  The transition refuses every save prepared under the old view, of this build or of an older one. The transaction
  that turns the setting on also moves each save-writer function (the general commit function and its variants, the
  one-owner, several-owners, creation and covering-owner functions) to a twin ident (`<name>-ids1`, same body) and
  replaces the body under the old ident with one that refuses (`TRIPLEX_CONFLICT`, answered 409 CasConflict, which the
  SDK replays). This build calls the twins once it has read the setting on (`route`); a save it prepared before, and
  every save of a build that does not know the setting, calls the old idents and is refused. So no save stores a plain
  command ID of an account-named save after the setting is on, and no older build stores anything at all.

  Old claims. A plain claim is the account's own when its transaction wrote that account's entities (an account among
  several included, S5 R2-11); a lookup naming an account finds its scoped claim, else such a plain claim, and answers
  `taken` for any other plain claim. A plain claim of no account's entities is no account's: it refuses every
  account's save of the ID (stored-ids) and is returned only to a lookup naming no account.

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

(defn- account-of-id
  "The account an entity ID belongs to: `acct/<account>/...`, the join layer's account metadata
  `lazy/account/<kind>/<account>` (the Publish builder, PUBLISH-BESIDE-SAVES.md 0.9), or the stored `:subject/account`."
  [db id]
  (or (second (re-matches #"acct/([A-Za-z0-9_-]{1,64})/.+" id))
      (second (re-matches #"lazy/account/(?:releases|origin|clock|erasure|dispatcher|mask|cursor)/([A-Za-z0-9_.-]{1,64})" id))
      (when (and db (lean/enabled? db)) ((requiring-resolve 'triplex.gateway.group/persisted-account) db id))))

(defn- journal-id?
  "IDs that never decide a write's account: system entities and the join layer's notice documents (journals)."
  [^String id]
  (or (.startsWith id "_") (.startsWith id "notice:v1:")))

(defn account-of
  "The one account a save's business entities belong to, or nil (several, none, system only)."
  [db p]
  (let [journals (set (:journal-entities p))
        business (remove #(or (journals %) (journal-id? %)) (filter string? (:owners p)))
        accounts (set (map #(account-of-id db %) business))]
    (when (and (seq business) (= 1 (count accounts)) (some? (first accounts))) (first accounts))))

(def setting-attr :triplex.scope/account-ids)
(def permitted? (= "1" (System/getenv "TX2_ACCOUNT_CLAIMS")))

(defn- scope-eid [db] (:e (first (d/datoms db :aevt :triplex.scope/key))))

(defn setting
  "The database's account-ID setting: 1 when on, nil when absent."
  [db]
  (when (d/entid db setting-attr) (:v (first (d/datoms db :eavt (scope-eid db) setting-attr)))))

(def twin-suffix "-ids1")
(defn twin [k] (keyword (namespace k) (str (name k) twin-suffix)))

(defn swappable?
  "The save-writer functions the transition moves: the general commit function and its variants, and the one-owner,
  several-owners, creation and covering-owner functions. Not the functions every build calls inside or beside a save
  (row assertion, removal guards, group application, hints, folds)."
  [k]
  (let [n (namespace k) m (name k) starts? (fn [p] (str/starts-with? m p))]
    (boolean (and (not (str/ends-with? m twin-suffix))
                  (or (= k :triplex/commit)
                      (and (= n "triplex.write") (starts? "v-"))
                      (and (= n "triplex.subject") (or (starts? "v-") (starts? "owners-") (starts? "create-")))
                      (and (= n "triplex.owner") (starts? "v-")))))))

(def refusal
  (delay (d/function {:lang :clojure :params '[db & args]
                      :code '(throw (ex-info "TRIPLEX_CONFLICT" {:triplex.account/ids-changed true}))})))
(defn- refusal? [f] (= (:code f) (:code @refusal)))

(defn- swap-ops
  "Statements that move each function `e` (an entity with an ident and a body) to its twin and leave a refusal under
  the old ident. A body already replaced is not copied (two processes may run this at once; both write the same)."
  [db es]
  (mapcat (fn [e] (let [ent (d/entity db e) f (:db/fn ent) i (:db/ident ent)]
                    (when (and f (not (refusal? f)) (swappable? i))
                      [{:db/ident (twin i) :db/fn f} [:db/add e :db/fn @refusal]])))
          es))

(defn- writer-functions [db]
  (map first (d/q '[:find ?e :where [?e :db/fn] [?e :db/ident ?i]] db)))

(defn turn-on!
  "Turns the setting on (one way), in the transaction that moves every save-writer function to its twin. Only a
  process with TX2_ACCOUNT_CLAIMS=1 may."
  [conn]
  (when-not permitted? (throw (ex-info "This process may not turn account IDs on" {:status 403 :code "SettingNotPermitted"})))
  (let [db (d/db conn)]
    (when-not (d/entid db setting-attr)
      @(d/transact conn [{:db/ident setting-attr :db/valueType :db.type/long :db/cardinality :db.cardinality/one}]))
    (let [db (d/db conn)]
      (when-not (= 1 (setting db))
        @(d/transact conn (vec (concat [[:db/add (scope-eid db) setting-attr 1]] (swap-ops db (writer-functions db))))))
      (d/db conn))))

(defn- ensure-twin!
  "The twin of `ident` in a database whose setting is on, and its body's transaction. A function first installed after
  the transition is moved now (the same statements as the transition)."
  [conn db ident]
  (let [t (twin ident) db (if (d/entid db t) db (d/db conn))]
    (if-let [e (d/entid db t)]
      [t (:tx (first (d/datoms db :eavt e :db/fn)))]
      (let [db (:db-after @(d/transact conn (vec (swap-ops db [(d/entid db ident)]))))]
        [t (:tx (first (d/datoms db :eavt (d/entid db t) :db/fn)))]))))

(defn on?
  "Whether a save prepared on `db` runs under the setting. A value this build does not know refuses every save, so the
  next setting a later build adds stops this one the same way."
  [db]
  (let [v (setting db)]
    (when-not (contains? #{nil 1} v)
      (throw (ex-info "This database has an account-ID setting this build does not know" {:status 409 :code "SettingUnknown" :write-policy true})))
    (= 1 v)))

(defn route-data
  "The general writer's prepared data, calling the twin of its function (setting on)."
  [conn db data]
  (let [[[ident p] & more] data]
    (if (and (keyword? ident) (swappable? ident))
      (vec (cons [(first (ensure-twin! conn db ident)) p] more))
      data)))

(defn route-plan
  "A per-subject plan, naming the twin of its function and that body's transaction (setting on)."
  [conn db plan]
  (let [[ident] (:function plan)]
    (if (and (keyword? ident) (swappable? ident)) (assoc plan :function (ensure-twin! conn db ident)) plan)))

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
    (set (map #(account-of-id db %) (remove journal-id? ids)))))

(defn claim-accounts
  "The accounts whose entities the plain claim's transaction wrote (empty: no account's)."
  [conn db claim]
  (let [tx (or (:v (first (d/datoms db :eavt claim :triplex.claim/tx))) claim)]
    (disj (tx-accounts conn db tx) nil)))

(defn owned?
  "Whether the plain claim entity `claim` is `account`'s: its transaction wrote that account's entities (alone, or with
  other accounts' in a save across accounts, S5 R2-11). A claim of no account's entities is no account's: it is never
  returned to an account and it refuses every account's save of that ID (it stays the database's, as before)."
  [conn db claim account]
  (contains? (claim-accounts conn db claim) account))

(defn find-claim
  "[claim-entity status] of command `id` for `account`: :scoped, :plain (an owned plain claim), :taken (a plain claim
  that is not this account's, not returned) or nil. Without an account: today's database-wide lookup of the plain form."
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
            accounts (set (map #(account-of-id db %) (remove journal-id? ids)))]
        (when (and (seq ids) (= 1 (count accounts))) (first accounts)))))

(defn- refuse! [status code message] (throw (ex-info message {:status status :code code :write-policy true})))

(defn stored-ids
  "The one place a save's stored command IDs are chosen. nil for a request that names no account (stored as sent).
  Otherwise {:account :scoped? :on}: scoped when the setting is on and the save writes only the named account's
  entities; a save of no one account keeps the plain form; a save of another account is refused."
  [conn db p input]
  (when-let [account (get input "account")]
    (let [own (account-of db p)]
      (when (and own (not= own account))
        (refuse! 400 "InvalidValue" "The request's account is not the account of the entities it saves"))
      (let [db (if (and own (nil? (setting db)) permitted?) (turn-on! conn) db)
            on (on? db)]
        ;; A plain claim of this account (from before the setting), or of no account's entities, refuses the save:
        ;; the same operation is never committed under both forms.
        (when (and own on)
          (doseq [c (:command-ids p)]
            (when-let [e (d/entid db [:triplex.claim/command-id c])]
              (let [accounts (claim-accounts conn db e)]
                (when (or (empty? accounts) (contains? accounts account))
                  (refuse! 409 "CommandConflict" "This command ID is already committed (plain claim)"))))))
        {:account account :scoped? (boolean (and own on)) :on on}))))

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
      (vec (cons [ident p] more)))))
