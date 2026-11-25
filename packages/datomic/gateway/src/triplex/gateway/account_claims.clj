(ns triplex.gateway.account-claims
  "[DX-S6] TX2_ACCOUNT_CLAIMS=1: a save's command ID and operation ID are stored scoped by the save's account, so two
  accounts in the one database can use the same IDs without blocking, or finding, each other's.

  A save is scoped when the request names its account (field `account`, the SDK's `claimAccount` option), which must be the
  account of every business entity it writes (group/classify's rule: the acct/<account>/ prefix, or else the stored
  :subject/account on the lean layout). A lookup (claim, command, begin, operation, fence) is scoped when the caller
  names its account. A caller that names none keeps today's database-wide IDs for its saves and its lookups alike, so
  its own lookups always find its own saves (an unknown outcome is never fenced under the wrong key).

  Stored value: \"acct-id/v1/<n>/<account>/<id>\", n the account's length in characters. The length makes it
  unambiguous whatever the account or the ID contains (a `/` in either cannot shift the boundary), and a client ID that
  begins with the prefix is refused, so a stored value is either a plain legacy ID or exactly one (account, ID) pair.
  Rejected: \"joined:<account>/<id>\"-style concatenation (ambiguous once a name may contain the separator).

  A legacy plain claim (written before the option, or by a gateway without it) is still found for the account that
  wrote it: its transaction's business entities must all be that account's (read from the log). It is never found
  for another account. Loaded through requiring-resolve, after every stored function is defined; no stored function
  changes (they see a longer string)."
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

(defn- tx-accounts
  "The accounts of the business entities a transaction wrote (their revision changed in it), from the log."
  [conn db tx]
  (let [t (d/tx->t tx) rev (d/entid db :triplex.entity/rev)
        data (:data (first (d/tx-range (d/log conn) t (inc t))))
        ids (distinct (keep (fn [x] (when (and (= rev (:a x)) (:added x)) (:v (first (d/datoms db :eavt (:e x) :triplex.entity/id))))) data))]
    (set (map #(account-of-id db %) (remove #(.startsWith ^String % "_") ids)))))

(defn owned?
  "Whether the plain legacy claim entity `claim` was written by a save of exactly `account`."
  [conn db claim account]
  (let [tx (or (:v (first (d/datoms db :eavt claim :triplex.claim/tx))) claim)]
    (= #{account} (tx-accounts conn db tx))))

(defn- plain-op-owned? [conn db e account] (= #{account} (tx-accounts conn db e)))

(defn find-claim
  "The claim entity of command `id` for `account` (nil: today's database-wide lookup)."
  [conn db id account]
  (if (and enabled account)
    (or (d/entid db [:triplex.claim/command-id (encode account id)])
        (when-let [e (d/entid db [:triplex.claim/command-id id])] (when (owned? conn db e account) e)))
    (d/entid db [:triplex.claim/command-id id])))

(defn operation-key
  "The stored operation ID to look up for `account` (the scoped one if it exists, else a plain one it owns)."
  [conn db id account]
  (if (and enabled account)
    (let [scoped (encode account id)]
      (cond (d/entid db [:triplex.tx/operation-id scoped]) scoped
            (when-let [e (d/entid db [:triplex.tx/operation-id id])] (plain-op-owned? conn db e account)) id
            :else scoped))
    id))

(defn- refuse! [status code message] (throw (ex-info message {:status status :code code :write-policy true})))

(defn scope!
  "Rewrites a prepared save's command and operation IDs to its account's scoped values (unchanged for a save of no one
  account). Refuses, before anything is sent: a client ID that begins with the reserved prefix; an `account` in the
  request that is not the save's; a command this account already claimed under its plain legacy ID."
  [conn db data input]
  (let [[[ident p] & more] data
        ids (concat (:command-ids p) (keep #(get % "commandId") (get input "claims")) [(get input "operationId")])]
    (when (some #(and (string? %) (str/starts-with? % prefix)) ids)
      (refuse! 400 "InvalidValue" "Command and operation IDs may not begin with the reserved account prefix"))
    (let [account (get input "account")]
      (when (and account (not= account (account-of db p)))
        (refuse! 400 "InvalidValue" "The request's account is not the account of the entities it saves"))
      (if-not account
        data
        (do
          (doseq [c (:command-ids p)]
            (when-let [e (d/entid db [:triplex.claim/command-id c])]
              (when (owned? conn db e account)
                (refuse! 409 "CommandConflict" "This account already committed the command (legacy claim)"))))
          (let [cmd #(encode account %)
                op (fn [x] (cond-> x
                             (and (map? x) (:triplex.claim/command-id x)) (update :triplex.claim/command-id cmd)
                             (and (map? x) (string? (:triplex.tx/operation-id x))) (update :triplex.tx/operation-id cmd)))
                p (cond-> (update p :ops #(mapv op %))
                    (:command-ids p) (update :command-ids #(mapv cmd %))
                    (:import-predecessor p) (update :import-predecessor cmd))]
            (vec (cons [ident p] more))))))))
