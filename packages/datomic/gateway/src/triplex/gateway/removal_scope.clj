(ns triplex.gateway.removal-scope
  (:require [clojure.string :as str] [clojure.data.json :as json] [datomic.api :as d] [triplex.gateway.schema :as schema]
            [triplex.gateway.scope :as scope] [triplex.gateway.privacy :as privacy] [triplex.gateway.erase :as erase]
            [triplex.gateway.lean :as lean]))

;; [DX-ERA2 seventh pass, identities] This namespace loads AFTER every installed function's code has been read: no file
;; that loads before them requires it (privacy, erase and subject-save resolve what they need from it when called,
;; with `requiring-resolve`), and storage and main require it after them. Every generated name the per-account rule
;; adds (functions, `and`, `cond->`, `#()`) is therefore made after the installed functions' names are fixed, so with
;; every option off their code, idents and hashes are the one branch's (s3/idents.clj).
;; Rejected: defining these in privacy.clj and erase.clj (loaded before commit.clj): they moved 17 of the 58 stored
;; identities, so a database created by this build installed writer functions that differ from the one branch's.

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
         ;; [DX-ERA2 fifth pass] -2: guarded per account with the commit as the boundary (a one-way setting)
         (contains? #{sentinel -2} (scope/value db (scope/entity db) :triplex.scope/erasure-seq))
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

;; ---- [DX-ERA2 seventh pass, identities] moved here from privacy.clj and erase.clj, unchanged in what they do ----------
(defn add-entry-on
  "privacy/apply-entry's last step: each account's removal sequence, derived from the one ordered log (option on)."
  [cut entry]
  (if enabled (add-entry cut entry) cut))

(defn fence-seq
  "The value the installed writers' database-wide fence carries for this cut. Per account, the value the request read
  (-1, or -2 with the commit boundary): a write planned before the boundary changes is refused at the serial point and
  planned again."
  [state]
  (when state (if (:per-account state) (get state :erasure-sentinel sentinel) (:seq state))))

(defn ensure-ticket!
  "In a database guarded per account, a derived write's ticket that names its source accounts is stale only when a
  removal published after it touched one of them (or the unscoped sequence); otherwise the database-wide comparison.
  [DX-ERA3 F1b] removal-commit is loaded only on a database guarded per account. [DX-ERA3 N1] its refusal is tagged:
  the gateway completes that removal once this write has released its locks."
  [state input]
  (when (:per-account state)
    ((requiring-resolve 'triplex.gateway.removal-commit/refuse-pending!) state input))
  (if (and (:per-account state) (contains? input "erasureAccounts"))
    (when-not (ticket-current? state (get input "erasureSeq") (ticket-accounts input))
      (privacy/stale!))
    (privacy/ensure-seq! state (get input "erasureSeq"))))

(defn verify-data!
  "privacy/verify-data! on a database guarded per account: the native removal sequence (the database-wide one holds
  the sentinel)."
  [state db]
  (when (and state (not (consistent? db (:seq state) nil))) (privacy/unavailable!)))

(defn without-fence-ops
  "The one-owner writer's operations its small-operation check reads: the per-account fence operation is accepted
  beside them (it rides in the returned data; Datomic applies it on the same serial db-before)."
  [ops expected-erasure]
  (if (and enabled (some? expected-erasure)) (remove fence-op? ops) ops))

(defn selector-buckets
  "The accounts whose values these selectors can reach: an entity selector names its entity; an assertion selector
  names the entity that assertion belongs to (fixed for its whole life)."
  [db selectors]
  (into (sorted-set)
        (map (fn [s]
               (bucket
                 (or (get s "entityId")
                     (let [id (get s "id")
                           private-id (when (d/entid db :triplex.private/id) (d/entid db [:triplex.private/id id]))]
                       (if private-id (scope/value db private-id :triplex.private/entity)
                         (some-> (lean/by-id (d/history db) id) :v lean/decode :entity_id)))))))
        selectors))

(defn with-bucket-guards [name buckets work]
  (if-let [[b & more] (seq buckets)]
    (privacy/guard (lock-name name b) #(with-bucket-guards name more work))
    (work)))

(defn bucket-guarded
  "erase/erase!'s work under the database's lock: per account, also under the locks of the accounts it can touch."
  [name buckets work]
  (fn [] (with-bucket-guards name buckets work)))

;; [DX-ERA2] Why: guarded per account, other accounts' saves no longer pause during a removal, so the removal's own
;; "head has not moved since my selection" check (database-wide, P9) retries more often; this measures how often.
;; One JSON line per removal on standard output when TX2_REMOVAL_TRIES_LOG=1 (unset: nothing printed).
(def tries-log (= "1" (System/getenv "TX2_REMOVAL_TRIES_LOG")))
;; [DX-ERA2] On a database guarded per account every removal checks its selection per subject, takes its log position at
;; its own commit and declares itself natively first (removal_commit.clj). [DX-ERA3 F2] TX2_REMOVAL_SUBJECT_CHECK no
;; longer selects the path (one per-account path for the whole fleet): the setting is read and ignored.
(def subject-check (= "1" (System/getenv "TX2_REMOVAL_SUBJECT_CHECK")))

(defn log-tries! [entry tries buckets started]
  (when tries-log
    (println (json/write-str {"schema" "triplex.removal-tries.v1" "seq" (get entry "seq")
                              "tries" tries "perAccount" (boolean buckets)
                              "ms" (/ (- (System/nanoTime) started) 1.0e6)}))))

;; [DX-ERA2] Why: a request on a database guarded per account uses the last published cut while another removal is
;; prepared or natively committed but unpublished: a write is fenced at the serial point on its own accounts, and a
;; read is then a read that started before that removal's publication (TARGETS section 7.1). Anything else is
;; retried up to four times on a freshly synced database, then refused: a native value behind the published log
;; (another gateway's removal not yet seen by this peer, and further removals can publish meanwhile), and a cut
;; read that lost a race with a newer one on this gateway (privacy/cut refuses a published log behind the one it
;; verified last). A restored copy stays behind on every try and is refused, as before. Retrying changes only
;; whether a request waits: a request is served only from a cut that passes consistent?.
;; Rejected: refusing every request of every account while any removal is pending (the database-wide rule).
(defn request-cut [name conn db]
  (loop [db db tries 0]
    (let [state (try ((requiring-resolve 'triplex.gateway.removal-commit/log-cut) name db)
                     (catch clojure.lang.ExceptionInfo e
                       (if (and (< tries 4) (= "ErasureFrontierUnavailable" (:code (ex-data e)))) ::retry
                         (throw ((requiring-resolve 'triplex.gateway.removal-commit/typed-failure) name db e)))))]
      (cond
        (= ::retry state) (recur (erase/sync! conn) (inc tries))
        (nil? state) [nil db]
        ;; [DX-ERA3 N5] the declared sequence too, and a typed answer when the log is behind the data
        ;; [DX-ERA2 fourth pass] served: a pending removal already committed takes effect (M1); with the commit
        ;; boundary every removal committed in the data does
        ((requiring-resolve 'triplex.gateway.removal-commit/consistent?) name db state)
        [((requiring-resolve 'triplex.gateway.removal-commit/served) name db state) db]
        (< tries 4) (recur (erase/sync! conn) (inc tries))
        :else ((requiring-resolve 'triplex.gateway.removal-commit/refuse-inconsistent!) name db state)))))

;; [DX-ERA2] Why: move an existing protected database to removal sequences per account (or back), online: under the
;; removal lock, one small transaction (the global sequence moves to its own attribute, the database-wide one takes the
;; sentinel, and each account that ever lost a value gets its sequence from the published log). A save prepared under
;; the other mode fails its fence once and is sent again under the new one.
;; Rejected: rewriting the removal log or the stored rows (neither changes; the log is the same ordered log).
(defn per-account! [name conn input]
  (when-not enabled
    (privacy/failure! 404 "NotFound" "Removal per account is off on this gateway"))
  (when-not (and (map? input) (every? #{"back"} (keys input)) (contains? #{nil true false} (get input "back")))
    (privacy/failure! 400 "InvalidValue" "Expected {} or {\"back\": true}"))
  (let [back? (true? (get input "back"))]
    (privacy/guard name
      (fn []
        (let [db (erase/sync! conn)
              state (privacy/cut name db)]
          (when-not state (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
          (privacy/verify-data! state db)
          ;; [DX-ERA2 fifth pass] the commit boundary is one-way: a database on it does not move back
          (when back? (when (= -2 (scope/value db (scope/entity db) :triplex.scope/erasure-seq))
                        (privacy/failure! 409 "RemovalBoundaryOneWay" "This database removes at the commit; it does not move back")))
          (let [head (scope/entity db) n (:seq state) per? (per-account? db)
                buckets (:buckets state)
                ops (cond
                      (= back? (not per?)) nil
                      back? [[:db/cas head :triplex.scope/erasure-seq sentinel n]
                             [:db/retract head :triplex.scope/removal-seq n]]
                      :else [[:db/cas head :triplex.scope/erasure-seq n sentinel]
                             [:db/add head :triplex.scope/removal-seq n]
                             ;; [DX-ERA3 F1] nothing declared beyond the log
                             [:db/add head :triplex.scope/removal-intent n]])
                ;; [DX-ERA3] and every native counter the log does not derive goes back to 0 (a held account or subject
                ;; left by a removal that never reached its intent, or by an earlier move)
                counters (when (and ops (not back?))
                           (partition-all 1000 (concat (counter-ops (:entities state) buckets)
                                                       ((requiring-resolve 'triplex.gateway.removal-commit/stale-counter-ops) db state))))
                transact! #(when (= ::timeout (deref (d/transact conn (vec %)) 5000 ::timeout)) (privacy/unavailable!))]
            (when (and ops (not back?)) (install! conn db))
            ;; Counters first (nothing reads them before the mode moves), in parts of 1,000; the move itself last.
            (doseq [part counters] (transact! part))
            (when ops (transact! ops))
            (let [after (erase/sync! conn)]
              {:database name :perAccount (per-account? after) :seq n
               :accounts (count buckets) :entities (count (:entities state)) :changed (boolean ops)})))))))
