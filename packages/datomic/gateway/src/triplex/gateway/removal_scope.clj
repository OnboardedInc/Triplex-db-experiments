(ns triplex.gateway.removal-scope
  (:require [clojure.string :as str] [datomic.api :as d] [triplex.gateway.schema :as schema]
            [triplex.gateway.scope :as scope]))

;; [DX-ERA2] Removal on request guarded per account (TX2_REMOVAL_PER_ACCOUNT=1, default off).
;; Why: in one database holding every account, one removal sequence refused or delayed every account's saves, reads
;; and settlement frames while any account removed a value. What a save's fence protects (the gateway's decisions made
;; from the cut: no import replay of a removed field, the journal's protected change values) depends only on removals of
;; values on the entities the save writes, so a save is fenced on those entities' removal sequences. A derived write
;; (settlement, Publish, staging, import replay) names the accounts it read, and is fenced on those accounts' sequences
;; and on the sequence of entities outside every account prefix. The removal log, its order and its one global
;; sequence stay as they are; each entity's and account's sequence is derived from it (the global sequence of the
;; latest removal that touched it). See era2/REMOVAL-PER-ACCOUNT.md for the proof.
;; Rejected: a removal log per account (the authority's chain, pending intent and restore replay are one ordered log);
;; fencing a save on its whole account (it refused every save of the account for no protection); changing the
;; installed writer functions (the database-wide fence is kept at a fixed value instead, see `sentinel`).

(def enabled (= "1" (System/getenv "TX2_REMOVAL_PER_ACCOUNT")))
;; The database-wide :triplex.scope/erasure-seq is held at this value in a database guarded per account: every write
;; still carries the installed functions' database-wide fence (now constant), and a gateway without the option sees a
;; frontier it can never verify (the authority's sequence is never negative), so it refuses every request on that
;; database instead of writing without the per-account fence.
(def sentinel -1)
(def unscoped "")
(def fence-ident :triplex.removal/fence-v1)

(defn bucket
  "The account whose removal sequence guards writes to this entity: the <account> of acct/<account>/...; every other
  entity (journal, settlement documents, system names) belongs to the unscoped sequence."
  [entity]
  (if (and (string? entity) (.startsWith ^String entity "acct/"))
    (let [end (.indexOf ^String entity "/" 5)]
      (if (> end 5) (subs entity 5 end) unscoped))
    unscoped))

(defn installed? [db] (boolean (and db (d/entid db :triplex.scope/removal-seq) (d/entid db :triplex.removal/account)
                                   (d/entid db :triplex.removal/entity))))

(defn native-seq [db]
  (when (installed? db) (scope/value db (scope/entity db) :triplex.scope/removal-seq)))

(defn per-account?
  "True when this gateway runs the option and this database value is protected and guarded per account."
  [db]
  (boolean (and enabled db (d/entid db :triplex.scope/erasure-ledger)
                (true? (scope/value db (scope/entity db) :triplex.scope/erasure-ledger))
                (some? (native-seq db)))))

(defn- native-counter [db attr k]
  (if-let [e (and (installed? db) (d/entid db [attr k]))]
    (or (scope/value db e :triplex.removal/seq) 0)
    0))
(defn native-account-seq [db a] (native-counter db :triplex.removal/account a))
(defn native-entity-seq [db e] (native-counter db :triplex.removal/entity e))

(defn bucket-seq [state b] (get (:buckets state) b 0))
(defn entity-seq [state e] (get (:entities state) e 0))

(defn entry-entities
  "The entities whose removal sequence a removal moves: every entity that lost a value, and every entity a selector
  names by entity ID even when it has no row yet, so a save or import frame of that entity prepared before the removal
  is refused at the serial point instead of creating it after the removal (DX-IMP2's case)."
  ;; No function literal and no macro that generates names (and, or, when-let, for...): the generated names in the
  ;; installed function texts loaded after this file stay as they are.
  [entry]
  (-> (into (sorted-set) (map #(get % "entity")) (get entry "identities"))
      (into (remove nil? (map get (get entry "selectors") (repeat "entityId"))))))
(defn entry-buckets [entry] (into (sorted-set) (map bucket) (entry-entities entry)))

(defn add-entry
  "The cut after one removal entry: every entity that lost a value, and its account, take the entry's seq."
  [state entry]
  (let [s (get entry "seq")]
    (-> state
        (update :buckets #(reduce (fn [m b] (assoc m b s)) (or % {}) (entry-buckets entry)))
        (update :entities #(reduce (fn [m e] (assoc m e s)) (or % {}) (entry-entities entry))))))

(defn consistent?
  "The native data and the published removal log agree: the native removal sequence is the published one, or one
  ahead by the prepared (not yet published) removal. A request may then use the published cut: a write is fenced at
  the serial point on its own accounts, and a read is a read that started before that removal's publication."
  [db published pending]
  (let [native (native-seq db)]
    (and (integer? native) (integer? published)
         (= sentinel (scope/value db (scope/entity db) :triplex.scope/erasure-seq))
         (or (= native published) (and (integer? pending) (= pending (inc published)) (= native pending))))))

(def fence-code
  ;; [DX-ERA2] Why: checked on Datomic's serial db-before, beside the writer's own predecessor checks.
  ;; Rejected: a compare-and-set per counter (an entity or account with no removal has no counter to compare).
  '(let [attr (d/entid db :triplex.removal/seq)]
     (doseq [[kind k expected] guards]
       (let [e (d/entid db [(if (= kind :account) :triplex.removal/account :triplex.removal/entity) k])
             v (if e (or (:v (first (d/datoms db :eavt e attr))) 0) 0)]
         (when-not (= v expected)
           (throw (ex-info "TRIPLEX_CONFLICT removal-fence" {:triplex.removal/kind kind})))))
     []))

(defn fence-op? [op] (and (vector? op) (= fence-ident (first op))))

(defn fence-op
  "One fence for a write: every entity it writes; for a derived write, every account its ticket names and the unscoped
  account."
  [state rows accounts]
  ;; Three elements: the writers read the third element of every vector operation.
  [fence-ident :v1
   (into (mapv (fn [e] [:entity e (entity-seq state e)]) (into (sorted-set) (map :entity_id) rows))
         (when accounts (map (fn [a] [:account a (bucket-seq state a)]) (into (sorted-set unscoped) accounts))))])

(defn ticket-accounts
  "The accounts a derived write's ticket names (erasureAccounts), or nil for a database-wide ticket."
  [input]
  (when (contains? input "erasureAccounts")
    (let [accounts (get input "erasureAccounts")]
      (when-not (and (vector? accounts) (<= 1 (count accounts) 64) (every? #(and (string? %) (re-matches #"[^/\s]{1,128}" %)) accounts)
                     (= (count accounts) (count (set accounts))))
        (throw (ex-info "Invalid erasure ticket accounts" {:status 400 :code "InvalidValue"})))
      accounts)))

(defn ticket-current?
  "A per-account ticket is current when no removal published after its sequence touched one of its accounts or the
  unscoped sequence."
  [state offered accounts]
  (and (integer? offered) (<= 0 offered (:seq state))
       (every? #(<= (bucket-seq state %) offered) (conj (set accounts) unscoped))))

(defn ticket-intent-ops
  "[DX-ERA3 F1] A ticket naming no account read any account, so at Datomic's serial point it must find no removal
  declared or committed since it: the global declared sequence equals the ticket. A removal declares itself (moves
  it) in its first transaction, before it selects or records anything. Tickets naming accounts are held the same way
  by those accounts' counters in the fence (`fence-op`)."
  ;; No function literal and no name-generating macro (see entry-entities).
  [scope input]
  (if (contains? input "erasureSeq")
    (if (contains? input "erasureAccounts")
      []
      [[:db/cas scope :triplex.scope/removal-intent (get input "erasureSeq") (get input "erasureSeq")]])
    []))

(defn pending-touches?
  "[DX-ERA3 F1b] A ticketed write waits (503, as the database-wide rule answers) while a removal is in flight that can
  reach what it read: always for a ticket naming no account, else when the removal's accounts meet the ticket's or the
  unscoped account. The serial point enforces the same (`ticket-intent-ops`, the account counters); this answers it
  early with today's code."
  [state input]
  (if (:per-account state)
    (if (:pending state)
      (if (contains? input "erasureAccounts")
        (boolean (some (set (conj (vec (ticket-accounts input)) unscoped)) (entry-buckets (:pending state))))
        true)
      false)
    false))

(defn lock-name [name b] (str name "#removal/" b))

(defn install!
  "Schema and the fence function (idempotent)."
  [conn db]
  (let [attrs (cond-> []
                (not (d/entid db :triplex.scope/removal-seq)) (conj (schema/attr :triplex.scope/removal-seq :db.type/long))
                (not (d/entid db :triplex.removal/account))
                (conj (schema/attr :triplex.removal/account :db.type/string :db.unique/identity))
                (not (d/entid db :triplex.removal/entity))
                (conj (schema/attr :triplex.removal/entity :db.type/string :db.unique/identity))
                (not (d/entid db :triplex.removal/seq)) (conj (schema/attr :triplex.removal/seq :db.type/long))
                ;; [DX-ERA3 F1] The removal's declaration: the sequence of the latest removal that has declared itself
                ;; natively (equal to removal-seq, or one ahead while it is in flight), and the accounts it holds.
                (not (d/entid db :triplex.scope/removal-intent)) (conj (schema/attr :triplex.scope/removal-intent :db.type/long))
                (not (d/entid db :triplex.scope/removal-held)) (conj (schema/attr :triplex.scope/removal-held :db.type/string))
                (not (d/entid db fence-ident))
                (conj {:db/ident fence-ident
                       :db/fn (d/function {:lang :clojure :params '[db version guards] :requires '[[datomic.api :as d]]
                                           :code fence-code})}))]
    (if (seq attrs) (:db-after @(d/transact conn attrs)) db)))

(defn counter-ops
  "Upserts that set removal sequences: {entity seq} and {account seq} (in the removal's own transaction, or the move)."
  [entities accounts]
  (concat (map (fn [[e s]] {:db/id (str "removal-entity:" e) :triplex.removal/entity e :triplex.removal/seq s}) entities)
          (map (fn [[a s]] {:db/id (str "removal-account:" a) :triplex.removal/account a :triplex.removal/seq s}) accounts)))

(defn entry-ops [entry]
  (let [s (get entry "seq")]
    (counter-ops (map #(vector % s) (entry-entities entry)) (map #(vector % s) (entry-buckets entry)))))

(defn frontier-fields
  "The per-account part of the erasure frontier answer; ?account=<account> adds that account's sequence, so a derived
  writer can recheck only the accounts it read."
  [state query-string]
  (let [account (some (fn [part]
                        (let [[k v] (str/split part #"=" 2)]
                          (when (= k "account") (java.net.URLDecoder/decode (or v "") "UTF-8"))))
                      (str/split (or query-string "") #"&"))]
    (cond-> {:perAccount true :unscopedSeq (bucket-seq state unscoped)}
      (seq account) (assoc :account account :accountSeq (bucket-seq state account)))))
