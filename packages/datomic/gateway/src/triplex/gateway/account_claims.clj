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

  Old claims. A plain claim is an account's own when every business entity its transaction wrote is that account's; a
  lookup naming an account finds its scoped claim, else such a plain claim, and answers `taken` for any other plain
  claim. A plain claim of no one account (several accounts, an entity of no account, system entities only) refuses
  every account's save of the ID (stored-ids) and is returned only to a lookup naming no account.

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

(def account-name
  "[DX-S6b] S5 R3-8: one rule for an account's name in every form that carries it (`acct/`, `lazy/account/`,
  `notice:v2:`, the request's `account`): letters, digits, `_`, `-` and `.`, 1 to 64 characters."
  #"[A-Za-z0-9_.-]{1,64}")

(defn- account-of-id
  "The account an entity ID belongs to: `acct/<account>/...`, the join layer's account metadata
  `lazy/account/<kind>/<account>` (the Publish builder, PUBLISH-BESIDE-SAVES.md 0.9), or the stored `:subject/account`."
  [db id]
  (or (second (re-matches #"acct/([A-Za-z0-9_.-]{1,64})/.+" id))
      (second (re-matches #"lazy/account/(?:releases|origin|clock|erasure|dispatcher|mask|cursor)/([A-Za-z0-9_.-]{1,64})" id))
      ;; [DX-S6b] A document namespace that names its account in clear (`notice:v2:<n>/<account>/...`, n the account's
      ;; length): the form the join layer moves its documents to so a settlement frame has an account (the Publish
      ;; review's U3). `notice:v1:<hash>:` hides the account inside a hash and stays a journal.
      (when-let [[_ n rest] (re-matches #"notice:v2:([0-9]{1,2})/(.+)" id)]
        (let [n (Long/parseLong n)]
          (when (and (<= 1 n 64) (< n (count rest)) (= \/ (.charAt ^String rest n)))
            (let [a (subs rest 0 n)] (when (re-matches account-name a) a)))))
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

(defn setting-t
  "The Datomic t of the transaction that turned the setting on, or nil."
  [db]
  (when (d/entid db setting-attr)
    (when-let [x (first (d/datoms db :eavt (scope-eid db) setting-attr))] (d/tx->t (:tx x)))))

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

(def refusal-message
  "[DX-S6b] S5 R3-7: the refusal names the setting. This build answers it 409 CasConflict (a save it prepared before the
  transition replays under the setting); a build that does not know the marker answers it as its own unrecognised
  refusal, with this text, instead of a conflict its SDK replays until its replays run out."
  "TRIPLEX_ACCOUNT_IDS_ON: this database's account-ID setting is on and this writer function was moved; a gateway that does not know the setting cannot save here")
(def refusal
  (delay (d/function {:lang :clojure :params '[db & args]
                      :code (list 'throw (list 'ex-info refusal-message {:triplex.account/ids-changed true}))})))
(defn refusal?
  "Whether a stored body is the transition's refusal (this build's or an earlier one's): it throws at once. A stored
  function's code reads back as text (with reader metadata), so its first form is matched there."
  [f]
  (let [c (:code f)]
    (boolean (if (string? c) (re-find #"^\s*(?:\^\{[^}]*\}\s*)?\(throw\b" c) (and (seq? c) (= 'throw (first c)))))))

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

(defn- repair-ops
  "Statements that put the refusal back under every moved ident that holds a working body again (written by a build
  that does not know the setting). A function with no twin yet is moved as at the transition; one whose twin exists
  keeps its twin (this build's body), and the foreign body is replaced."
  [db]
  (mapcat (fn [e] (let [ent (d/entity db e) f (:db/fn ent) i (:db/ident ent)]
                    (when (and f (swappable? i) (not (refusal? f)))
                      (if (d/entid db (twin i)) [[:db/add e :db/fn @refusal]] (swap-ops db [e])))))
          (writer-functions db)))

(def repairs "Working bodies found under moved idents and replaced, since this process started." (atom 0))

(defn repair!
  "Under the setting, restores the refusal under any moved ident that holds a working body; returns the database."
  [conn db]
  (if-not (and (d/entid db setting-attr) (= 1 (setting db)))
    db
    (let [ops (vec (repair-ops db))]
      (if (empty? ops) db
        (do (swap! repairs + (count (filter vector? ops)))
            (:db-after @(d/transact conn ops)))))))

;; ---------------------------------------------------------------- every install respects the setting (S5 R3-1)
;; The scope-open installs (main.clj create-scope!: commit/install! and install-base!, group, subject, covering owner,
;; hints, prefetch, several owners, creation) run with *installing* bound. Their transactions are rewritten here:
;; - setting attribute absent: unchanged; if it appeared before the install committed, the install is repaired at once;
;; - setting present: the transaction carries the setting guard (refused if the setting changed since it was read);
;;   with the setting on, a body for a moved ident goes to its twin (refreshing it: R3-1b), the old ident keeps or gets
;;   the refusal, and the scope's recorded general-writer hash is left as the transition found it, so a build that
;;   does not know the setting and has that hash never rewrites the old ident.
(def ^:dynamic *installing* false)
(def setting-guard :triplex.account/setting-guard-v1)
(def ^:private setting-guard-code
  '(let [a (d/entid db :triplex.scope/account-ids)
         v (when a (:v (first (d/datoms db :eavt scope a))))]
     (when-not (= v expected) (throw (ex-info "TRIPLEX_ACCOUNT_IDS_CHANGED" {})))
     []))

(defn- function-op? [op] (and (map? op) (:db/ident op) (:db/fn op)))

(defn- rewrite-install [db tx]
  (let [on (= 1 (setting db))
        scope (scope-eid db)
        ops (mapcat (fn [op]
                      (cond
                        (and on (function-op? op) (swappable? (:db/ident op)) (not (refusal? (:db/fn op))))
                        [(assoc op :db/ident (twin (:db/ident op))) {:db/ident (:db/ident op) :db/fn @refusal}]
                        (and on (vector? op) (= :db/add (first op)) (= :triplex.scope/commit-fn-hash (nth op 2 nil))) []
                        :else [op]))
                    tx)]
    (vec (concat ops [[setting-guard scope (setting db)]]))))

(defn- install-transact [orig conn tx more]
  (let [db (d/db conn)]
    (if (and (d/entid db setting-attr) (d/entid db setting-guard))
      (apply orig conn (rewrite-install db tx) more)
      (let [r @(apply orig conn tx more) after (:db-after r)]
        ;; The setting appeared while this install was in flight: move what it wrote, now.
        (repair! conn after)
        (doto (promise) (deliver r))))))

(defonce ^:private hooked
  (do (alter-var-root #'d/transact
        (fn [orig] (fn [conn tx & more] (if *installing* (install-transact orig conn tx more) (apply orig conn tx more)))))
      true))

(defn- changed? [^Throwable e]
  (loop [x e] (cond (nil? x) false (re-find #"TRIPLEX_ACCOUNT_IDS_CHANGED" (str (.getMessage x))) true :else (recur (.getCause x)))))

(defn installing
  "Runs a scope open's installs under the setting's rules (above), again if the setting changed under them, then
  repairs any moved ident another build rewrote. Returns what `f` returns (the database)."
  [conn f]
  (loop [n 0]
    (let [r (try (binding [*installing* true] (f))
                 (catch Exception e (if (and (changed? e) (< n 3)) ::again (throw e))))]
      (if (= ::again r) (recur (inc n)) (repair! conn r)))))

(def install-sites
  "[DX-S6b] S5 R3-1: every function of this build that writes a stored function on a scope open. Each runs under
  `installing` whoever calls it (create-scope!, a test, a tool). The other writers of stored functions write idents the
  transition never moves: erase.clj (the removal guards), group_prepare.clj (group application), layout_replay.clj
  (replay tooling), ha_shared.clj (the HA lab), owner_layout.clj install-fixture! (a test fixture), and this namespace
  (the setting guard, the twins, the refusals)."
  '[triplex.gateway.commit/install-base! triplex.gateway.commit/install! triplex.gateway.group/install!
    triplex.gateway.subject-save/install! triplex.gateway.owner-layout/install! triplex.gateway.general-prefetch/install!
    triplex.gateway.subject-hints/install! triplex.gateway.subject-owners/install! triplex.gateway.subject-create/install!])

(defonce ^:private install-hooks
  (doseq [sym install-sites]
    (alter-var-root (requiring-resolve sym)
      (fn [orig] (fn [conn & args] (if *installing* (apply orig conn args) (installing conn #(apply orig conn args))))))))

(defn turn-on!
  "Turns the setting on (one way), in the transaction that moves every save-writer function to its twin. Only a
  process with TX2_ACCOUNT_CLAIMS=1 may."
  [conn]
  (when-not permitted? (throw (ex-info "This process may not turn account IDs on" {:status 403 :code "SettingNotPermitted"})))
  (let [db (d/db conn)]
    (when-not (and (d/entid db setting-attr) (d/entid db setting-guard))
      @(d/transact conn [{:db/ident setting-attr :db/valueType :db.type/long :db/cardinality :db.cardinality/one}
                         {:db/ident setting-guard
                          :db/fn (d/function {:lang :clojure :params '[db scope expected] :requires '[[datomic.api :as d]]
                                              :code setting-guard-code})}]))
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

(defn- repair-routed!
  "The old ident a save is routed away from: when it holds a working body again (another build rewrote it), put the
  refusal back before this save commits (one datom read per save)."
  [conn db ident]
  (when-let [e (d/entid db ident)]
    (let [f (:v (first (d/datoms db :eavt e :db/fn)))]
      (when (and f (not (refusal? f))) (repair! conn (d/db conn))))))

(defn route-data
  "The general writer's prepared data, calling the twin of its function (setting on)."
  [conn db data]
  (let [[[ident p] & more] data]
    (if (and (keyword? ident) (swappable? ident))
      (let [t (first (ensure-twin! conn db ident))] (repair-routed! conn db ident) (vec (cons [t p] more)))
      data)))

(defn route-plan
  "A per-subject plan, naming the twin of its function and that body's transaction (setting on)."
  [conn db plan]
  (let [[ident] (:function plan)]
    (if (and (keyword? ident) (swappable? ident))
      (let [f (ensure-twin! conn db ident)] (repair-routed! conn db ident) (assoc plan :function f))
      plan)))

(defn reserved? [id] (and (string? id) (str/starts-with? id prefix)))

(defn check-ids!
  "Refuses any client-supplied ID that begins with the reserved prefix (every route, every setting)."
  [ids]
  (when (some reserved? ids)
    (throw (ex-info "IDs may not begin with the reserved account prefix" {:status 400 :code "InvalidValue" :write-policy true}))))

(defn checked
  "A request body with no client ID that begins with the reserved prefix (`commandId`, `operationId`, every claim's
  `commandId`), else refused 400. Returns the body."
  [input]
  (when (map? input)
    (check-ids! (concat [(get input "commandId") (get input "operationId")]
                        (map #(when (map? %) (get % "commandId")) (get input "claims")))))
  input)

(defn- tx-accounts
  "The accounts of the business entities a transaction wrote (their revision changed in it), from the log; nil among
  them for a business entity of no account."
  [conn db tx]
  (let [t (d/tx->t tx) rev (d/entid db :triplex.entity/rev)
        data (:data (first (d/tx-range (d/log conn) t (inc t))))
        ids (distinct (keep (fn [x] (when (and (= rev (:a x)) (:added x)) (:v (first (d/datoms db :eavt (:e x) :triplex.entity/id))))) data))]
    (set (map #(account-of-id db %) (remove journal-id? ids)))))

(defn claim-accounts
  "The accounts of the business entities the plain claim's transaction wrote (nil among them for an entity of no
  account; empty when it wrote journals and system entities only)."
  [conn db claim]
  (let [tx (or (:v (first (d/datoms db :eavt claim :triplex.claim/tx))) claim)]
    (tx-accounts conn db tx)))

(defn owner
  "The one account a plain claim belongs to: every business entity its transaction wrote is that account's (the
  Publish review's condition: every change, not some change). nil when it wrote several accounts', an entity of no
  account, or none."
  [conn db claim]
  (let [accounts (claim-accounts conn db claim)]
    (when (and (= 1 (count accounts)) (some? (first accounts))) (first accounts))))

(defn owned?
  "Whether the plain claim entity `claim` is `account`'s: every business entity its transaction wrote is that
  account's. A claim of no one account (several accounts, an entity of no account, system entities only) is never
  returned to an account and refuses every account's save of that ID: it stays the database's, as before."
  [conn db claim account]
  (= account (owner conn db claim)))

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

(defn- other-accounts
  "The accounts other than `account` whose entities the save writes (journals and system entities excluded)."
  [db p account]
  (let [journals (set (:journal-entities p))
        business (remove #(or (journals %) (journal-id? %)) (filter string? (:owners p)))]
    (disj (set (keep #(account-of-id db %) business)) account)))

(defn stored-ids
  "The one place a save's stored command IDs are chosen. nil for a request that names no account (stored as sent).
  Otherwise {:account :scoped? :on :predecessor}.
  [DX-S6b] S5 R3-2 and R3-5: a request naming account A that writes any entity of another account is refused (400),
  on every writer (this runs in commit! before any writer is chosen). Under the setting every save naming A is stored
  under A's scoped form, whatever else it writes (system entities, documents that carry no account), so after the
  transition a plain claim can only come from a request that names no account."
  [conn db p input]
  (when-let [account (get input "account")]
    (when-not (and (string? account) (re-matches account-name account))
      (refuse! 400 "InvalidValue" "Invalid account name"))
    (let [others (other-accounts db p account)]
      (when (seq others)
        (refuse! 400 "InvalidValue" "The request names one account and writes another account's entities"))
      (let [db (if (and (nil? (setting db)) permitted?) (turn-on! conn) db)
            on (on? db)]
        ;; A plain claim of this account (from before the setting), or of no account's entities, refuses the save:
        ;; the same operation is never committed under both forms.
        (when on
          (doseq [c (:command-ids p)]
            (when-let [e (d/entid db [:triplex.claim/command-id c])]
              ;; Only a plain claim of exactly one other account leaves this account's ID free.
              (let [o (owner conn db e)]
                (when (or (nil? o) (= o account))
                  (refuse! 409 "CommandConflict" "This command ID is already committed (plain claim)"))))))
        {:account account :scoped? (boolean on) :on on
         ;; S5 R3-4: an ordered import stream's predecessor keeps the form it was stored in (a frame from before the
         ;; transition is plain); a plain one is accepted only when it is this account's.
         :predecessor (when-let [pred (and on (:import-predecessor p))]
                        (cond (d/entid db [:triplex.claim/command-id (encode account pred)]) (encode account pred)
                              (when-let [e (d/entid db [:triplex.claim/command-id pred])] (owned? conn db e account)) pred
                              :else (encode account pred)))}))))

(defn stored-command
  "The stored form of command `c` of a request naming `account` (nil: none) on `db`: the form `stored-ids` gives a
  save, for a lookup that keys on it (declined commands, storage.clj)."
  [db account c]
  (if (and account (on? db)) (encode account c) c))

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
              (:import-predecessor p) (update :import-predecessor #(or (:predecessor ids) (cmd %))))]
      (vec (cons [ident p] more)))))
