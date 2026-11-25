(ns triplex.gateway.removal-commit
  "[DX-ERA2] Removal on request that takes its log position at its own commit and checks its selection per subject
  (TX2_REMOVAL_SUBJECT_CHECK=1, default off), on a database guarded per account (TX2_REMOVAL_PER_ACCOUNT=1, moved).
  Why: guarded per account, other accounts' saves no longer pause during a removal, and the removal's database-wide
  check that the head had not moved since its selection retried it whenever any account committed in that window
  (mean tries e^(commits per second x window); 63 tries and 15 s on the toy, no upper limit). What the selection
  depends on is the selected subjects' own datoms, so the removal now proves at its serial point that none of them
  changed since its selection, and takes the next log position there (the journal rows and the log entry are written
  at a provisional position and stamp and rewritten by the installed function, exactly as the save commit function
  shifts a provisional position). A removal whose own subjects keep changing takes a short guard on those subjects only
  (their removal counters go negative, so every save of them fails its fence at the serial point) after
  `narrow-tries`, which bounds it: see era2/REMOVAL-PER-ACCOUNT.md section 13 for the proof and the bound.
  Rejected: keeping the head check (unbounded under load); pausing every save of the database or of the account (it
  refuses saves the removal cannot affect); a guard held through the authority only (a save admitted before it could
  still commit, so the bound would depend on the gateway's in-flight writes).
  Loaded on first use (erase/erase! resolves it), so a gateway without the option loads none of this.
  [DX-ERA3 second review] The order of a removal's steps is: intent (in the log), declaration (native), selection and
  commit (native), publication (log). Every stop leaves a removal the log shows as pending, which every gateway
  answers 503 for the writes it can reach and which any gateway completes (`complete-pending!`): the first derived
  write it refuses, any removal of another command, or its own resend. Rejected: the declaration before the intent
  (a stop between them left a native block no gateway could see, N1); a repair of such a block by any gateway (it
  cannot tell it from a removal between its two steps; with the intent first there is no such state)."
  (:require [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.authority-sql :as sql]
            [triplex.gateway.erase :as erase] [triplex.gateway.privacy :as privacy] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.removal-scope :as removal-scope] [triplex.gateway.scope :as scope]
            [triplex.gateway.storage :as storage] [triplex.gateway.lean :as lean]))

(def commit-ident :triplex.removal/commit-v1)
(def moved "TRIPLEX_REMOVAL_SUBJECT_MOVED")
;; Tries on the narrow check alone before the subject guard, and tries under the guard before the removal answers 503
;; and stays pending (resumable): at most 4 commit attempts. Under the guard only an unfenced write of the subject can
;; fail a try (an owner-root fold, once per subject); none was observed.
(def narrow-tries 2)
(def guarded-tries 2)
;; [DX-ERA3] How long the gateway waits for each of the removal's native transactions before it answers 503 (the
;; transaction may still land: the removal is then pending, declared and possibly committed). A var so a test can force
;; the wait to expire.
(def wait-ms (Long/parseLong (or (System/getenv "TX2_REMOVAL_WAIT_MS") "5000")))

(defn transact!
  "One native transaction of the removal, waited for at most `wait-ms`. A refused step (a compare-and-set that lost a
  race, a guard) answers 503 like an expired wait: the removal stays pending and its next attempt completes it."
  [conn ops]
  (let [report (try (deref (d/transact-async conn ops) wait-ms ::timeout)
                    (catch Exception e
                      ;; [DX-ERA2 fifth pass] a refusal the removal expects (a guard, a lost compare-and-set) stays quiet;
                      ;; anything else is a fault and is counted and logged before it is answered 503
                      (when-not (re-find #"TRIPLEX_|cas-failed|unique-conflict|:db.error" (str e (.getCause e)))
                        ((requiring-resolve 'triplex.gateway.failures/note!) "removal-step" nil e))
                      (throw (ex-info "A native step of the removal was refused; it stays pending"
                                      {:status 503 :code "ErasureFrontierUnavailable" :removal-step-refused true} e))))]
    (when (= ::timeout report) (privacy/unavailable!))
    report))
(def tries-log (= "1" (System/getenv "TX2_REMOVAL_TRIES_LOG")))

;; [DX-ERA3 second review] A test seam for the stack run that kills a gateway at every step of a removal:
;; TX2_REMOVAL_TEST_PAUSE_AT names one step (intent, declared, committed, prepared, published); the gateway prints it
;; and waits there until it is killed, or for TX2_REMOVAL_TEST_PAUSE_MS when that is set (the lock-lost run). Unset
;; (the default): nothing happens.
(def pause-at (System/getenv "TX2_REMOVAL_TEST_PAUSE_AT"))
(def pause-ms (some-> (System/getenv "TX2_REMOVAL_TEST_PAUSE_MS") Long/parseLong))
(defn- step! [k]
  (when (= pause-at k)
    (println "TRIPLEX_REMOVAL_PAUSED" k)
    (flush)
    (Thread/sleep (long (or pause-ms Long/MAX_VALUE)))
    (println "TRIPLEX_REMOVAL_RESUMED" k)
    (flush)))

(defn declared-seq
  "The declared sequence, or nil on a database that has none (moved by an earlier build, or its value retracted)."
  [db]
  (when (d/entid db :triplex.scope/removal-intent)
    (scope/value db (scope/entity db) :triplex.scope/removal-intent)))

(defn disagreement
  "[DX-ERA3 N5] How the native data and the published removal log disagree, or nil. The log's top is its head, or
  the prepared removal one past it. The data is never ahead of that top: a native removal committed or declared past
  it means the log is behind the data (restored from an older backup), and a declaration or release taken from that
  log could let in a write that read a removed value. The data may be behind the head only until the restore route
  replays the log."
  [db state]
  (let [c (removal-scope/native-seq db) dd (declared-seq db)
        h (:seq state) p (:pending-seq state)
        top (if (and (integer? p) (integer? h) (= p (inc h))) p h)]
    (cond
      (not (and (integer? c) (integer? h))) nil
      (or (> c top) (and (integer? dd) (> dd top))) {:code "RemovalLogBehind" :native c :declared dd :log h :pending p}
      (< c h) {:code "RemovalDataBehind" :native c :declared dd :log h :pending p})))

(defn refuse!
  "A typed 503 for a disagreement, naming the step that clears it."
  [{:keys [code native declared log pending]}]
  (throw (ex-info (str (if (= code "RemovalLogBehind")
                         (str "The removal log is behind the data (restored from an older backup?): put the current "
                              "removal log back, or rebuild it from the data (POST removal-log-rebuild); a declaration "
                              "the log does not show, left by an earlier build, is cleared by moving the database back "
                              "and forward. ")
                         "The data is behind the removal log: replay the log with the restore route. ")
                       "Native removal " native ", declared " declared ", log " log
                       (when (some? pending) (str ", pending " pending)))
                  {:status 503 :code code})))

(def may-turn-on
  "[DX-ERA2 fifth pass] TX2_REMOVAL_COMMIT_BOUNDARY=1 now means only: this process may turn the commit boundary on for a
  database guarded per account. What a request does depends on the database, never on this variable.
  [DX-ERA2 sixth pass] It allows the explicit move routes only (removal-commit-boundary, and removal-per-account on
  this process continuing to the commit boundary); a removal on this process no longer moves its database."
  (= "1" (System/getenv "TX2_REMOVAL_COMMIT_BOUNDARY")))

(def commit-boundary
  "Test seam only, nil in every gateway: the fourth review's in-process emulation of two gateways on different
  boundaries (era3/attack4.clj) sets it to true or false; nil means the database's own setting decides."
  nil)

(defn commit-boundary?
  "[DX-ERA2 fourth pass; fifth pass: a setting in the database] True when this database value removes at the commit:
  its database-wide erasure sequence holds -2 instead of the per-account sentinel -1. A removal then takes effect for
  every request at its commit in Datomic, not at its publication in the removal log: every request is served from the
  log's cut with every removal committed in the data past the log's head applied (`effective`); the log stays the
  acknowledged, ordered record and what a restore of older data replays. Read at each request's own position. The
  value is the one every write and removal fences on at Datomic's serial point, so a plan made before the setting
  changes is refused, and a build that does not know -2 refuses the database (see era2/REMOVAL-PER-ACCOUNT.md 18)."
  [db]
  (if (some? commit-boundary) commit-boundary (= -2 (scope/value db (scope/entity db) :triplex.scope/erasure-seq))))

(def ^:private natives (atom {}))
(defn native-entries
  "The removals committed in this database value, in log order (their transactions are in sequence order):
  {:entries [{:raw text :entry map}] :dense bool}, dense when the sequences are 1..n and each entry's previous seal is
  the one before it. Cached per database and extended from the newest record seen."
  [name db]
  (if-let [attr (d/entid db :triplex.tx/erasure-record)]
    (let [newest (first (d/rseek-datoms db :aevt attr))
          cached (get @natives name)
          still? (fn [c] (when (:last-e c)
                           (when-let [x (first (d/datoms db :eavt (:last-e c) attr))] (= (:v x) (:last-raw c)))))]
      (cond
        (nil? newest) {:entries [] :dense true}
        (and cached (= (:last-e cached) (:e newest)) (= (:last-raw cached) (:v newest))) cached
        :else
        (let [base (if (and cached (still? cached)) cached {:entries [] :dense true})
              more (->> (if (:last-e base) (rest (d/seek-datoms db :aevt attr (:last-e base))) (d/datoms db :aevt attr))
                        (take-while (fn [x] (= attr (:a x)))))
              result (reduce (fn [acc x]
                               (let [entry (json/read-str (:v x)) entries (:entries acc) prior (peek entries)
                                     ok (and (= (get entry "seq") (inc (count entries)))
                                             (= (get entry "previous") (if prior (privacy/sha256 (:raw prior)) privacy/zeros)))]
                                 {:entries (conj entries {:raw (:v x) :entry entry :e (:e x)
                                                          ;; the transaction's own position (after a restore the
                                                          ;; replayed record keeps its published position)
                                                          :position (or (scope/value db (:e x) :triplex.tx/position)
                                                                        (get entry "position"))})
                                  :dense (and (:dense acc) ok)
                                  :last-e (:e x) :last-raw (:v x)}))
                             base more)]
          (swap! natives assoc name result)
          result)))
    {:entries [] :dense true}))

(def ^:private removal-keys ["database" "seq" "previous" "commandId" "selectors"])
(defn- pending-of?
  "This committed entry is the removal the log holds as pending."
  [state entry]
  (and (:pending state) (= (select-keys entry removal-keys) (select-keys (:pending state) removal-keys))))

(defn- seal-at [state k]
  ;; the log's seal after its entry k (k <= head)
  (cond (zero? k) privacy/zeros
        (= k (:seq state)) (:seal state)
        :else (some (fn [e] (when (= k (get e "seq")) (privacy/sha256 (json/write-str e)))) (vals (:commands state)))))

(defn- union-mask [state entries]
  (let [mask (reduce @#'privacy/apply-entry {:seq 0 :erased {} :families #{} :commands {}} (map :entry entries))]
    (-> state (update :erased #(merge (:erased mask) %)) (update :families into (:families mask)))))

(defn effective
  "[commit boundary] The state a request is served from: the log's cut with every removal committed in the data past
  the log's head applied in order (the log behind or missing entries: served from the data). The data behind the log
  (older data restored): the log's cut, which masks more, and writes wait for the restore route. The two disagreeing
  on an entry: reads masked by both, writes refused."
  [name db state]
  (let [{:keys [entries dense]} (native-entries name db)
        c (count entries) h (:seq state)
        ;; [DX-ERA2 fourth pass] false past the data's last entry (the data behind the log): the stack's restore of
        ;; older data found this indexing past the end (an IndexOutOfBounds answered 400 GatewayError)
        agree (fn [k] (or (zero? k) (and (<= k c) (= (privacy/sha256 (:raw (entries (dec k)))) (seal-at state k)))))
        beyond (when (>= c h) (subvec entries h))]
    (cond
      (not dense) (assoc (union-mask state entries) :writes-refused "RemovalLogConflict")
      ;; the one removal in flight, committed but not yet published: masked for reads at its commit; its counters and
      ;; sequence wait for its publication (writes it can reach wait for it as on the log's boundary)
      (and (agree h) (= 1 (count beyond)) (pending-of? state (:entry (first beyond)))) (union-mask state beyond)
      (and (>= c h) (agree h)) (reduce @#'privacy/apply-entry state (map :entry beyond))
      (and (< c h) (agree c)) (assoc state :writes-refused "RemovalDataBehind")
      :else (assoc (union-mask state entries) :writes-refused "RemovalLogConflict"))))

;; ---- [DX-ERA2 sixth pass, V1 and V2 of the fifth review] the policy stored in Datomic is the only policy -------------
(def ^:private policy-schema
  [{:db/ident :triplex.scope/protection-policy :db/valueType :db.type/string :db/cardinality :db.cardinality/one}])

(defn- stored-text [db]
  (when (d/entid db :triplex.scope/protection-policy)
    (scope/value db (scope/entity db) :triplex.scope/protection-policy)))

(defn stored-policy
  "The database's own protection policy ({\"attributes\" [...] \"sealed\" bool \"added\" [...]}), or nil (a database
  moved per account by an earlier build, until its verified log's policy is adopted once). \"added\" lists the
  attributes added after the database was first protected (their values from before the addition may be in clear)."
  [db]
  (some-> (stored-text db) json/read-str))

(defn with-policy
  "The state with the database's stored policy (attributes, seal, attributes added later), never the log head's copy.
  A database with no stored policy keeps its verified head's (an earlier build's move, until adopted)."
  [state db]
  (if-let [p (when state (stored-policy db))]
    (assoc state :attrs (set (get p "attributes")) :sealed (true? (get p "sealed")) :added (set (get p "added")))
    state))

(defn served
  "The state a request on a database guarded per account is served from (erase/request-cut)."
  [name db state]
  (let [policy (with-policy state db)]
  (assoc (if (commit-boundary? db)
           (effective name db state)
           ;; [DX-ERA3 M1] the log's boundary: a pending removal already committed in the data is flagged; a read then
           ;; publishes it before it is served (main/route-handler, `publish-for-read!`), so a log copy put back with
           ;; that removal pending in it cannot answer its value again, and the removal still takes effect at its
           ;; publication
           (let [p (:pending-seq state) {:keys [entries]} (native-entries name db)]
             (cond-> state
               (and (integer? p) (= p (inc (:seq state))) (<= p (count entries)) (pending-of? state (:entry (entries (dec p)))))
               (assoc :committed-pending true))))
         ;; [DX-ERA2 sixth pass] the database's own policy, not the log's copy
         :attrs (:attrs policy) :sealed (:sealed policy) :added (:added policy)
         :per-account true
         ;; [DX-ERA2 fifth pass] the value every write of this request fences on (-1, or -2 with the commit boundary)
         :erasure-sentinel (scope/value db (scope/entity db) :triplex.scope/erasure-seq)
         ;; [DX-ERA2 fifth pass, B5] the one value a cache keys on: it changes exactly when what a read may answer
         ;; changes. On the log's boundary the published sequence (a read publishes a committed removal first); with the
         ;; commit boundary the number of removals committed in this database value (it moves at the commit, while the
         ;; sequence and the tickets wait for the publication)
         :stamp (if (commit-boundary? db)
                  (max (long (:seq state)) (count (:entries (native-entries name db))))
                  (:seq state)))))

(def ^:private read-publications (atom {}))
(defn publish-for-read!
  "[DX-ERA3 M1, the log's boundary] A read found its database's pending removal already committed in the data: the
  removal is published first (its gateway takes the removal lock; only the log is written), then the read is served
  from the published log. Each such read waits for the publication; none is served from the log before it."
  [name conn]
  (let [started (System/nanoTime) p (privacy/pending name)
        ;; [DX-ERA2 fifth pass] bounded: one publication per database runs at a time on this gateway (the readers that
        ;; find it running wait on it), and a reader waits at most `wait-ms` (the removal lock may be held by a live
        ;; but stalled removal on another gateway); then 503, and the publication goes on without it
        done (when p
               (let [job (get (swap! read-publications
                                     (fn [m] (if (some-> (get m name) future-done? not) m
                                               (assoc m name (future (erase/erase! name conn {"commandId" (get p "commandId")
                                                                                             "selectors" (get p "selectors")}))))))
                              name)]
                 (try (deref job wait-ms ::timeout)
                      ;; the publication's own refusal (typed) is the reader's answer; anything else (a gateway that
                      ;; cannot write the log, Z5 of the fourth review) is counted and answered a typed 503, never 400
                      (catch java.util.concurrent.ExecutionException e
                        (let [c (or (.getCause e) e)]
                          (if (instance? clojure.lang.ExceptionInfo c) (throw c)
                            (do ((requiring-resolve 'triplex.gateway.failures/note!) "read-publication" name c)
                                (privacy/unavailable!))))))))
        state (when-not (= ::timeout done)
                (try (first (erase/request-cut name conn (erase/sync! conn)))
                     (catch clojure.lang.ExceptionInfo e (throw e))
                     (catch Exception e ((requiring-resolve 'triplex.gateway.failures/note!) "read-publication" name e)
                       (privacy/unavailable!))))
        ms (/ (- (System/nanoTime) started) 1.0e6)]
    ;; [DX-ERA2 fifth pass] each such wait is counted and logged (its distribution is measured on the stack)
    ((requiring-resolve 'triplex.gateway.stats/bump!) [:removalReadWaits] 1)
    (println (json/write-str {"schema" "triplex.removal-read-wait.v1" "database" name "seq" (get p "seq") "ms" ms
                              "published" (boolean (and state (not (:committed-pending state)))) "timedOut" (= ::timeout done)}))
    (when (or (nil? state) (:committed-pending state)) (privacy/unavailable!))
    state))

(defn consistent?
  "Request time (erase/request-cut): the data and the log agree, declarations included. With the commit boundary,
  served as long as nothing refuses writes (a transient disagreement is retried on a synced database first)."
  [name db state]
  (if (commit-boundary? db)
    (nil? (:writes-refused (effective name db state)))
    (and (removal-scope/consistent? db (:seq state) (:pending-seq state)) (nil? (disagreement db state)))))

(defn refuse-inconsistent!
  "After request-cut's retries: with the commit boundary the request is served (reads; writes are refused by
  `check-writes!`), else the typed disagreement when there is one, else 503."
  [name db state]
  (if (commit-boundary? db)
    [(served name db state) db]
    (do (when-let [b (and state (disagreement db state))] (refuse! b))
        (privacy/unavailable!))))

(defn check-writes!
  "[commit boundary] A write on a state whose data is behind the log, or which disagrees with it, waits (typed 503)."
  [state]
  (when-let [code (:writes-refused state)]
    (throw (ex-info (if (= code "RemovalDataBehind")
                      "The data is behind the removal log: replay the log with the restore route; reads are served meanwhile."
                      "The removal log and the data disagree on a removal: an operator must decide; reads are served meanwhile.")
                    {:status 503 :code code}))))

(defn- behind-cache?
  "This gateway verified a newer head than the log now shows, and the data still holds every removal it verified."
  [name db]
  (when-let [prior (get @privacy/cache name)]
    (when-let [wire (privacy/record-text name "head.json")]
      (and (< (get (json/read-str wire) "seq") (:seq prior))
           (>= (count (:entries (native-entries name db))) (:seq prior))))))

(defn- copy-changed?
  "[DX-ERA2 sixth pass] The log's head differs from the cut this gateway verified last only in its policy copy (another
  gateway rewrote it from the database), and is not behind it."
  [name]
  (when-let [prior (get @privacy/cache name)]
    (when-let [wire (privacy/record-text name "head.json")]
      (let [h (json/read-str wire)]
        (and (integer? (get h "seq")) (>= (long (get h "seq")) (long (:seq prior)))
             (or (not= (set (get h "attributes")) (:attrs prior)) (not= (get h "sealed") (:sealed prior))))))))

(defn log-cut
  "The published log's cut (pending removal included). With the commit boundary, a log put back behind a head this
  gateway verified is read again as it is, when the data still holds every removal verified (it is served from the
  data); otherwise refused as before (a restore of both the data and the log to an older copy).
  [DX-ERA2 sixth pass] A head whose policy copy was rewritten (by another gateway, from the database) is read again
  whole, and kept only when its chain is the one this gateway verified, up to it."
  [name db]
  (try (privacy/cut name db true)
       (catch clojure.lang.ExceptionInfo e
         (cond
           (copy-changed? name)
           (let [prior (get @privacy/cache name)]
             (swap! privacy/cache dissoc name)
             (let [c (privacy/cut name db true)]
               (if (= (:seal prior) (seal-at c (:seq prior))) c
                 (do (swap! privacy/cache assoc name prior) (throw e)))))
           (and (commit-boundary? db) (behind-cache? name db))
           (do (swap! privacy/cache dissoc name) (privacy/cut name db true))
           :else (throw e)))))

(defn typed-failure
  "The refusal request-cut throws after its retries: typed when the database is protected and its log is missing."
  [name db e]
  (if (and (privacy/enabled? db) (nil? (privacy/record-text name "head.json")))
    ;; [DX-ERA2 fifth pass, Z2] tagged: the gateway rebuilds the log from the data and the database's own policy once
    ;; this request has released its locks (main/route-handler), so a missing log refuses one request, not all
    (ex-info "The removal log is missing; this gateway rebuilds it from the data. Send the request again."
             {:status 503 :code "RemovalLogMissing" :removal-log-missing true})
    e))

(defn- pending-refusal
  "[DX-ERA3 N1] The refusal of a ticketed write that a removal in flight can reach. It is tagged so the gateway, once the
  write has released its locks, completes that removal before it answers (main/route-handler, `complete-pending!`)."
  []
  (ex-info (str "A removal this write's inputs can reach is in flight; this gateway completes it. "
                "Read the ticket again and send the write again.")
           {:status 503 :code "ErasureFrontierUnavailable" :removal-pending true}))

(defn ticket-intent-ops
  "[DX-ERA3 F1] A ticket naming no account read any account, so at Datomic's serial point it must find no removal
  committed since it (the committed sequence equals the ticket) and none declared since it (the declared sequence is
  where the gateway read it, never past the ticket). A removal of this version declares itself (moves the declared
  sequence) before it selects anything; a removal of an earlier version does not, and its commit is caught by the
  committed sequence [N3]. A database without a declared sequence (moved by an earlier build) is checked on the
  committed sequence only, until its first removal starts one [N2]. A delivery between databases carries the source
  database's ticket, which says nothing about this one [N4]: it is checked against this database's own cut instead
  [M2]. Tickets
  naming accounts are held by those accounts' counters in the fence (`removal-scope/fence-op`).
  [DX-ERA2 third pass] A write that this data already shows declared against (the declared sequence past its ticket,
  or a named account's counter negative) is refused here with the tagged refusal rather than at the serial point, so
  every refusal a declaration causes starts the removal's completion, not only the gateway's early one."
  [scope input db]
  (let [t (get input "erasureSeq") source (get input "erasureSourceDatabase")]
    (cond
      (not (contains? input "erasureSeq")) []
      (contains? input "erasureAccounts")
      (do (when (some (fn [a] (neg? (long (removal-scope/native-account-seq db a))))
                      (conj (vec (removal-scope/ticket-accounts input)) removal-scope/unscoped))
            (throw (pending-refusal)))
          [])
      ;; [DX-ERA3 M2] a ticket naming another database speaks for that database; this database's own removals are
      ;; still checked, at the sequence of this request's own cut (what today's rule does with its one sequence)
      :else (let [dd (declared-seq db)
                  t (if (and (some? source) (not= source privacy/*database*)) (:seq privacy/*cut*) t)]
              (when (and (integer? dd) (integer? t) (> dd t)) (throw (pending-refusal)))
              (cond-> [[:db/cas scope :triplex.scope/removal-seq t t]]
                (integer? dd) (conj [:db/cas scope :triplex.scope/removal-intent (min dd t) (min dd t)]))))))

(defn pending-touches?
  "[DX-ERA3 F1b] A ticketed write waits (503, as the database-wide rule answers) while a removal is in flight that can
  reach what it read: always for a ticket naming no account, else when the removal's accounts meet the ticket's or the
  unscoped account. The serial point enforces the same (`ticket-intent-ops`, the account counters); this answers it
  early with today's code. Here, not in removal_scope.clj, because a new top-level function there would renumber
  the generated names in the installed functions' texts loaded after it."
  [state input]
  (if (:per-account state)
    (if (:pending state)
      (if (contains? input "erasureAccounts")
        (boolean (some (set (conj (vec (removal-scope/ticket-accounts input)) removal-scope/unscoped)) (removal-scope/entry-buckets (:pending state))))
        true)
      false)
    false))

(defn refuse-pending!
  "[DX-ERA3 N1] The refusal of a ticketed write that a pending removal can reach. It is tagged so the gateway, once the
  write has released its locks, completes that removal before it answers (main/route-handler, `complete-pending!`):
  no pending removal outlives the first write it refuses by more than one completion."
  [state input]
  (when (pending-touches? state input)
    (throw (pending-refusal))))

(def commit-code
  ;; No #() and no syntax quote: the stored function text is the same on every gateway.
  '(let [{:keys [basis entities stamp rows record operation txid cols]} payload
         since (d/history (d/since db basis))
         owner-a (d/entid db :triplex.owner/version-owner)
         private-a (d/entid db :triplex.private/entity)
         touched (fn [e] (seq (d/datoms since :eavt e)))
         changed (fn [entity]
                   (let [e (d/entid db [:triplex.entity/id entity])]
                     (or (and e (touched e))
                         (and e owner-a (or (seq (d/datoms since :vaet e owner-a))
                                            (some (fn [link] (touched (:e link))) (d/datoms db :vaet e owner-a))))
                         (and private-a (or (seq (d/datoms since :avet private-a entity))
                                            (some (fn [r] (touched (:e r))) (d/datoms db :avet private-a entity)))))))]
     (when-let [entity (first (filter changed entities))]
       (throw (ex-info "TRIPLEX_REMOVAL_SUBJECT_MOVED" {:entity entity})))
     (let [value (fn [e a] (:v (first (d/datoms db :eavt e a))))
           position-a (d/entid db :triplex.tx/position)
           v2 (and (d/entid db :triplex.scope/head-version) (= 2 (value scope :triplex.scope/head-version)))
           newest (when v2 (let [datom (first (d/rseek-datoms db :aevt position-a (d/t->tx (d/basis-t db))))]
                             (when (and datom (= (:a datom) position-a)) (:e datom))))
           prior (value scope :triplex.scope/position)
           head (or (if v2 (when newest (value newest :triplex.tx/position)) prior) 0)
           latest (if v2 (when newest (value newest :triplex.tx/max-recorded-at)) (value scope :triplex.scope/max-recorded-at))
           position (inc head)
           at (max stamp (inc (long (or latest 0))))
           clock (double at)
           digits (format "%016d" position)
           rewrite (fn [text]
                     (let [id-end (+ 5 (Integer/parseInt (subs text 1 5) 16))
                           ref-end (+ id-end 36)
                           start (inc (+ ref-end (Integer/parseInt (subs text (- ref-end 4) ref-end) 16)))
                           values (assoc (json/read-str (subs text start))
                                         (:position cols) digits (:recorded-at cols) clock)
                           values (if (= ":_tx/instant" (nth values (:attribute cols)))
                                    (assoc values (:datetime cols) clock) values)]
                       (str (subs text 0 start) (json/write-str values))))
           entry (assoc (json/read-str record) "position" position "erasedAt" at)
           ops [{:db/id "datomic.tx" :triplex.tx/position position :triplex.tx/operation-id operation :triplex.tx/id txid
                 :triplex.tx/recorded-at clock :triplex.tx/max-recorded-at clock
                 :triplex.tx/erasure-record (json/write-str entry) :triplex.tx/journals ["privacy-journal"]}
                {:db/id "privacy-journal" :triplex.entity/id txid :triplex.journal/position position
                 :triplex.entity/rev position :triplex.entity/row (mapv rewrite rows)}]]
       (if v2 ops (conj ops [:db/cas scope :triplex.scope/position prior position])))))

(defn- install! [conn db]
  (if (d/entid db commit-ident) db
    (:db-after (transact! conn [{:db/ident commit-ident
                                 :db/fn (d/function {:lang :clojure :params '[db scope payload]
                                                     :requires '[[datomic.api :as d] [clojure.data.json :as json]]
                                                     :code commit-code})}]))))

(defn check-entities
  "The subjects whose selection must be complete at the serial point: every entity a selector names by entity ID. An
  assertion selector names one identity, which no later write can add to."
  [selectors]
  (vec (distinct (keep (fn [s] (get s "entityId")) selectors))))

(def columns
  (into {} (map (fn [[k c]] [k (.indexOf ^java.util.List privacy/columns c)]))
        {:position :recorded_position :attribute :attribute :datetime :value_datetime :recorded-at :recorded_at}))

(defn hold!
  "The subject guard: each subject's removal counter takes the pending removal's negated sequence, which no save's fence
  can expect, so every save of these subjects fails at Datomic's serial point until this removal commits (its commit
  sets the counters again). Other subjects and accounts are untouched."
  [conn entities s]
  ;; [DX-ERA3 second review] only while this removal is declared and uncommitted: a hold whose wait expired and that
  ;; lands after the commit would otherwise refuse the subjects' saves until another removal touches them
  (let [head (scope/entity (d/db conn))]
    (:db-after (transact! conn (into [[:db/cas head :triplex.scope/removal-seq (dec s) (dec s)]
                                      [:db/cas head :triplex.scope/removal-intent s s]]
                                     (removal-scope/counter-ops (map (fn [e] [e (- s)]) entities) nil))))))

(defn- held-accounts [db head]
  (set (json/read-str (or (scope/value db head :triplex.scope/removal-held) "[]"))))

(defn- ensure-declaration!
  "[DX-ERA3 N2] A database moved per account by an earlier build has no declared sequence (no attribute, or no
  value): install the attributes and start it at the committed sequence, before anything is declared."
  [conn db]
  (let [db (if (and (d/entid db :triplex.scope/removal-intent) (d/entid db :triplex.scope/removal-held)) db
             (removal-scope/install! conn db))]
    (if (some? (declared-seq db)) db
      (:db-after (transact! conn [[:db/cas (scope/entity db) :triplex.scope/removal-intent nil (removal-scope/native-seq db)]])))))

(defn declare!
  "[DX-ERA3 F1, F1b] The removal's first native transaction, after its intent is in the log and before it selects
  anything: the declared sequence (`:triplex.scope/removal-intent`) moves to the removal's sequence, and every account
  its selectors can reach takes the negated sequence on its counter. From this transaction on, a ticketed write that
  read any of those accounts (any account, for a ticket naming none) fails at Datomic's serial point
  (`ticket-intent-ops`, the fence's account guards) until the removal is published and the ticket is read again.
  Plain saves fence only on their own subjects and are not touched.
  [DX-ERA3 N5] It lands only while nothing is committed at or past its sequence (the committed sequence is checked in
  the same transaction), and a declaration already at its sequence is taken as its own only when its intent was in
  the log before this attempt (`current` holds it as pending): only then are that declaration's other accounts
  released. Anything else is refused before anything is written."
  [conn db current buckets s]
  (let [head (scope/entity db)
        dd (declared-seq db)
        c (removal-scope/native-seq db)
        own? (= s (get (:pending current) "seq"))
        earlier (if (= dd s) (held-accounts db head) #{})]
    (when-not (and (= c (dec s)) (integer? dd) (or (< dd s) (and (= dd s) own?)))
      (refuse! {:code "RemovalLogBehind" :native c :declared dd :log (:seq current) :pending (get (:pending current) "seq")}))
    (let [ops (-> [[:db/cas head :triplex.scope/removal-intent dd s]
                   [:db/cas head :triplex.scope/removal-seq (dec s) (dec s)]
                   [:db/add head :triplex.scope/removal-held (json/write-str (vec (sort buckets)))]]
                  (into (removal-scope/counter-ops nil (map (fn [b] [b (- s)]) buckets)))
                  (into (removal-scope/counter-ops nil (for [b earlier :when (not (contains? (set buckets) b))]
                                                         [b (removal-scope/bucket-seq current b)]))))]
      (:db-after (transact! conn ops)))))

(defn commit!
  "One try: the removal's native transaction through the installed function, which refuses it if a selected subject
  changed since `view` and otherwise gives it the next position."
  [conn view current entry held]
  (let [db (install! conn view)
        head (scope/entity db)
        s (get entry "seq")
        lost (removal-scope/entry-entities entry)
        payload {:basis (d/basis-t view) :entities (check-entities (get entry "selectors")) :stamp (get entry "erasedAt")
                 :rows (@#'erase/journal-rows entry) :record (json/write-str entry)
                 :operation (@#'erase/operation-id entry) :txid (get entry "txId") :cols columns}
        ;; A held subject or declared account that lost no value goes back to its sequence from the published log.
        lost-accounts (removal-scope/entry-buckets entry)
        released (removal-scope/counter-ops (for [e held :when (not (contains? lost e))] [e (removal-scope/entity-seq current e)])
                                            (for [b (held-accounts db head) :when (not (contains? lost-accounts b))]
                                              [b (removal-scope/bucket-seq current b)]))
        ops (-> [[commit-ident head payload]
                 {:db/id "privacy-claim" :triplex.claim/command-id (get entry "commandId") :triplex.claim/tx "datomic.tx"
                  :triplex.claim/tx-id (get entry "txId")}
                 [:db/cas head :triplex.scope/erasure-seq (scope/value db head :triplex.scope/erasure-seq)
                  (scope/value db head :triplex.scope/erasure-seq)]
                 [:db/cas head :triplex.scope/removal-seq (dec s) s]
                 ;; [DX-ERA3 second review] a commit lands only under its own declaration
                 [:db/cas head :triplex.scope/removal-intent s s]]
                (into (removal-scope/entry-ops entry))
                (into released))]
    (transact! conn ops)))

(defn- moved? [error]
  (some (fn [x] (= moved (ex-message x))) (take-while some? (iterate ex-cause error))))

;; [DX-ERA3 second review] The same removal: the same command and selectors at the same place in the log. Its
;; selection (identities, transaction ID) is the native commit's own: an attempt whose wait expired can commit after
;; a later attempt recorded a fresh selection, and the command's claim admits exactly one commit, checked at its
;; serial point. Rejected: requiring the stored intent's selection (that removal could then never be published).
(defn- same-removal [native entry]
  (= (select-keys native removal-keys) (select-keys entry removal-keys)))

(defn- native-record [db eid entry]
  (let [raw (scope/value db eid :triplex.tx/erasure-record) native (json/read-str raw)]
    (when-not (and (same-removal native entry) (= raw (json/write-str native))) (privacy/unavailable!))
    native))

(defn committed
  "A prepared removal already committed natively (stopped before publication): the stored entry, whose position and
  stamp were given at its commit."
  [db pending]
  (when-let [eid (d/entid db [:triplex.tx/operation-id (@#'erase/operation-id pending)])]
    (native-record db eid pending)))

(defn- intent-wire [name] (privacy/record-text name "pending.json"))
(def ^:private intent-lock (Object.))
(defn- put-intent!
  "[DX-ERA3 second review] Record the removal's intent only over the intent this removal last saw (`expected`, its
  stored text; nil: none), so two removals that both believe they hold the database's lock (one lost it) cannot replace
  each other's intent: the loser answers 503 and nothing of it is in the log. Returns the stored text."
  [name expected item & [head]]
  ;; [DX-ERA3 M5] the first intent is written only while the log's head is the one this removal read: a removal that
  ;; lost its lock cannot record an intent at a sequence another removal has published meanwhile
  (let [wire (json/write-str item)]
    (if sql/url
      (let [n (@#'sql/with-session
                (fn [c]
                  (if (nil? expected)
                    (@#'sql/execute! c (str "INSERT INTO triplex_removal.records(scope,record,payload) "
                                            "SELECT ?, 'pending.json', ? WHERE EXISTS (SELECT 1 FROM triplex_removal.records "
                                            "WHERE scope=? AND record='head.json' AND payload=?) "
                                            "ON CONFLICT (scope,record) DO NOTHING") [name wire name head])
                    (@#'sql/execute! c (str "UPDATE triplex_removal.records SET payload=? "
                                            "WHERE scope=? AND record='pending.json' AND payload=?") [wire name expected]))))]
        (when-not (= 1 n) (privacy/unavailable!)))
      (locking intent-lock
        (when-not (= expected (intent-wire name)) (privacy/unavailable!))
        (when (and (nil? expected) (not= head (privacy/record-text name "head.json"))) (privacy/unavailable!))
        (privacy/prepare! name item)))
    wire))

(defn publish!
  "Publish the committed entry. Its position and stamp were given at the commit, so the intent is first rewritten to
  the committed entry: the PostgreSQL authority publishes only an entry equal to the stored intent (it deletes the
  intent by its exact payload in the same transaction). A crash between the two leaves either form, and both are
  matched to the native commit on resume."
  [name conn current entry wire tries held started]
  (put-intent! name wire entry)
  (step! "prepared")
  (privacy/publish! name current entry)
  (step! "published")
  (when tries-log
    (println (json/write-str {"schema" "triplex.removal-tries.v1" "seq" (get entry "seq") "tries" tries
                              "perAccount" true "subjectCheck" true "held" (boolean held)
                              "ms" (/ (- (System/nanoTime) started) 1.0e6)})))
  (erase/response (d/db conn) entry))

(defn- append-log!
  "[DX-ERA2 fourth pass] Append removals committed in the data to the log after its head, each exactly as its commit
  recorded it (its text is the entry its own publication would have written), dropping a pending intent of the same
  removal. Under the removal lock. Returns the log's new cut."
  [name db state entries]
  (loop [state state [x & more] entries]
    (if-not x state
      (let [k (get (:entry x) "seq") raw (:raw x) record (str "erase-" k ".json")
            prior-wire (:wire state)
            head (json/write-str (assoc (json/read-str prior-wire) "seq" k "seal" (privacy/sha256 raw)))
            pending (intent-wire name)
            drop (when pending
                   (let [p (json/read-str pending)]
                     (when (= (select-keys p ["seq" "commandId"]) (select-keys (:entry x) ["seq" "commandId"])) pending)))
            existing (privacy/record-text name record)]
        (when (and existing (not= existing raw)) (privacy/failure! 503 "RemovalLogConflict" "The removal log and the data disagree on a removal: an operator must decide"))
        (if sql/url
          (@#'sql/transaction!
            (fn [c]
              (when-not existing
                (@#'sql/execute! c "INSERT INTO triplex_removal.records(scope,record,payload) VALUES (?,?,?)" [name record raw]))
              (when-not (= 1 (@#'sql/execute! c (str "UPDATE triplex_removal.records SET payload=? "
                                                     "WHERE scope=? AND record='head.json' AND payload=?") [head name prior-wire]))
                (throw (java.sql.SQLException. "Removal authority moved during the catch-up")))
              (when drop
                (@#'sql/execute! c "DELETE FROM triplex_removal.records WHERE scope=? AND record='pending.json' AND payload=?" [name drop]))))
          (do (when-not existing (@#'privacy/save-record! name record raw))
              (@#'privacy/save-record! name "head.json" head)
              (when drop (@#'privacy/remove-record! name "pending.json"))))
        (println (json/write-str {"schema" "triplex.removal-log-catch-up.v1" "seq" k "droppedIntent" (boolean drop)}))
        (recur (privacy/cut name db true) more)))))

(defn- release-orphan!
  "[commit boundary] A declaration past every commit with no intent in the log (left by an earlier build, or a log put
  back to a copy from before the intent): nothing was committed under it, and a late commit under it is refused (it
  checks its own declaration), so it is released: the declared sequence back to the committed one, its accounts to
  the log's values."
  [conn db current]
  (let [head (scope/entity db) dd (declared-seq db) c (removal-scope/native-seq db)]
    (if (and (integer? dd) (integer? c) (> dd c) (nil? (:pending current)))
      (do (println (json/write-str {"schema" "triplex.removal-orphan-released.v1" "declared" dd "committed" c}))
          (:db-after (transact! conn (-> [[:db/cas head :triplex.scope/removal-intent dd c]
                                          [:db/cas head :triplex.scope/removal-seq c c]
                                          [:db/add head :triplex.scope/removal-held "[]"]]
                                         (into (removal-scope/counter-ops nil (for [b (held-accounts db head)]
                                                                                [b (removal-scope/bucket-seq current b)])))))))
      db)))

(defn catch-up!
  "[commit boundary] Under the removal lock, before anything else: the log brought up to the data (every removal
  committed past its head appended), an orphan declaration released; refused (typed) when the data is behind the log
  or the two disagree. Returns [db current]."
  [name conn db current]
  (let [{:keys [entries]} (native-entries name db)
        e (effective name db current)]
    (check-writes! e)
    (let [current (if (> (count entries) (:seq current)) (append-log! name db current (subvec entries (:seq current))) current)
          db (release-orphan! conn db current)]
      [db current])))

(declare complete-pending! adopt-policy! sync-policy-copy!)

(defn- turn-on-locked!
  "Under the database's removal lock, with no removal pending and the data and the log in agreement (the log's
  boundary rules): the one-way move to the commit boundary, one compare-and-set from -1 to -2. Every write and removal
  planned before it carries -1 and is refused at the serial point. Returns the database after it, or nil when it is
  not done now (already on, a removal pending, or the two disagreeing: the request then follows the log's boundary)."
  [name conn db]
  (let [head (scope/entity db) v (scope/value db head :triplex.scope/erasure-seq) cut (privacy/cut name db true)]
    (when (and (= removal-scope/sentinel v) (removal-scope/per-account? db) cut (nil? (:pending cut))
               (nil? (privacy/pending name)) (= (removal-scope/native-seq db) (:seq cut)) (nil? (disagreement db cut)))
      (transact! conn [[:db/cas head :triplex.scope/erasure-seq removal-scope/sentinel -2]])
      (println (json/write-str {"schema" "triplex.removal-boundary.v1" "database" name "boundary" "commit" "seq" (:seq cut)}))
      (erase/sync! conn))))

(defn turn-on!
  "[DX-ERA2 fifth pass] POST /v2/db/{db}/removal-commit-boundary: a process allowed to (TX2_REMOVAL_COMMIT_BOUNDARY=1)
  moves this database to the commit boundary, for good. A removal left pending is completed first; a removal in
  flight on another gateway holds the removal lock, so this waits for it. Idempotent."
  [name conn]
  (when-not may-turn-on
    (privacy/failure! 403 "RemovalBoundaryNotPermitted" "This process may not move a database to the commit boundary"))
  (when-not (removal-scope/per-account? (erase/sync! conn))
    (privacy/failure! 409 "NotGuardedPerAccount" "Move the database to removal per account first"))
  (complete-pending! name conn)
  (privacy/guard name
    (fn []
      (let [db (erase/sync! conn)]
        (if (commit-boundary? db)
          {:database name :boundary "commit" :changed false}
          (if (turn-on-locked! name conn db)
            {:database name :boundary "commit" :changed true}
            ;; [DX-ERA2 sixth pass] the rollout's refusal says what to clear first (the log or the data behind)
            (do (when-let [b (disagreement db (privacy/cut name db true))] (refuse! b))
                (privacy/unavailable!))))))))

(defn erase! [name conn input]
  (let [selectors (erase/selectors! input)
        command (get input "commandId")
        started (System/nanoTime)]
    ;; [DX-ERA3 N1] A removal of another command left pending is completed first, exactly as its own resend would.
    (when-let [p (privacy/pending name)]
      (when-not (= command (get p "commandId")) (complete-pending! name conn)))
    (let [buckets (@#'erase/selector-buckets (d/db conn) selectors)]
      (when-not (log-cut name (d/db conn))
        (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
      (privacy/guard name
        (fn []
          (@#'erase/with-bucket-guards name buckets
            (fn []
              (let [db (erase/sync! conn)
                    current (log-cut name db)
                    _ (when-not current (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
                    ;; [DX-ERA2 fifth pass, Z2] the database's own policy (adopted from the log once)
                    db (adopt-policy! name conn db)
                    ;; [DX-ERA2 sixth pass] a removal no longer moves its database to the commit boundary on a process
                    ;; allowed to (the fifth pass did, at a database's first removal there): the move is the explicit
                    ;; route only, so the rollout decides when each database moves (page 19, the rollout procedure)
                    ;; [DX-ERA2 sixth pass] the log's copy of the policy rewritten from the database when it differs
                    current (sync-policy-copy! name db (log-cut name db))
                    ;; [DX-ERA2 fourth pass] with the commit boundary the log is first brought up to the data
                    [db current] (if (commit-boundary? db) (catch-up! name conn db current) [db current])
                    ;; [DX-ERA2 sixth pass] the selection uses the database's own policy, never the log's copy
                    current (with-policy current db)]
                (privacy/clear-completed! name current)
                (if-let [before (get-in current [:commands command])]
                  (do (when-not (= selectors (get before "selectors"))
                        (privacy/failure! 409 "EraseCommandConflict" "The command already used different selectors"))
                      (erase/response db before))
                  (let [pending (privacy/pending name)
                        wire (when pending (intent-wire name))
                        ;; [DX-ERA2 sixth pass, V8] the same command resent with other selectors while it is pending: a
                        ;; terminal answer naming the pending removal (it completes as first sent); another command's
                        ;; removal still pending here (its completion above failed): retry later
                        _ (when (and pending (= command (get pending "commandId")) (not= selectors (get pending "selectors")))
                            (privacy/failure! 409 "EraseCommandConflict"
                                              (str "A removal of this command with other selectors is pending (sequence "
                                                   (get pending "seq") "); it completes as first sent")))
                        _ (when (and pending (not= [command selectors] [(get pending "commandId") (get pending "selectors")]))
                            (privacy/unavailable!))
                        _ (when (and (not pending) (d/entid db [:triplex.claim/command-id command]))
                            (privacy/failure! 409 "EraseCommandConflict" "The command identity is already claimed"))
                        s (inc (:seq current))
                        _ (when (and pending (not= s (get pending "seq"))) (privacy/unavailable!))
                        ;; [DX-ERA3 N5] before anything is recorded, declared or released: the data is not ahead of the log
                        ;; (with the commit boundary the catch-up above has already made it so)
                        _ (when-not (commit-boundary? db) (when-let [b (disagreement db current)] (refuse! b)))
                        checked (check-entities selectors)]
                    (if-let [native (and pending (committed db pending))]
                      (publish! name conn current native wire 0 false started)
                      (let [db (ensure-declaration! conn db)
                            ;; [DX-ERA3 N1] the intent first: from here on, every stop leaves a removal that every
                            ;; gateway sees as pending and any gateway completes
                            wire (or wire (put-intent! name nil (erase/make-entry name db current command selectors) (:wire current)))
                            _ (step! "intent")
                            view (do (declare! conn db current (vec buckets) s) (erase/sync! conn))
                            _ (step! "declared")
                            ;; A removal resumed after its guard was taken finds its subjects held and keeps them held.
                            held (into #{} (filter (fn [e] (= (- s) (removal-scope/native-entity-seq view e))) checked))
                            ;; [DX-ERA3 M3] a resumed removal takes its subject guard before its first commit attempt: its
                            ;; earlier attempts' tries are not counted across requests, and a subject saved while each
                            ;; slow commit is in flight would otherwise refuse every attempt
                            [view held] (if (and pending (empty? held) (seq checked))
                                          [(do (hold! conn checked s) (erase/sync! conn)) (set checked)]
                                          [view held])]
                        (loop [view view wire wire tries 1 held held]
                          (let [entry (erase/make-entry name view current command selectors)
                                _ (when-not (every? buckets (removal-scope/entry-buckets entry)) (privacy/unavailable!))
                                wire (put-intent! name wire entry)
                                ;; a commit refused at the serial point may be refused because an earlier attempt's commit
                                ;; (its wait expired) landed first: that commit is then the removal
                                outcome (try {:report (commit! conn view current entry held)}
                                             (catch Exception e
                                               (cond (moved? e) {}
                                                     (:removal-step-refused (ex-data e))
                                                     (if-let [native (committed (erase/sync! conn) entry)] {:native native} (throw e))
                                                     :else (throw e))))]
                            (cond
                              (:report outcome)
                              (let [after (:db-after (:report outcome))]
                                (step! "committed")
                                (publish! name conn current (native-record after (d/t->tx (d/basis-t after)) entry)
                                          wire tries (seq held) started))
                              (:native outcome) (publish! name conn current (:native outcome) wire tries (seq held) started)
                              (>= tries (+ narrow-tries guarded-tries)) (privacy/unavailable!)
                              (and (empty? held) (>= tries narrow-tries))
                              (do (hold! conn checked s) (recur (erase/sync! conn) wire (inc tries) (set checked)))
                              :else (recur (erase/sync! conn) wire (inc tries) held))))))))))))))))

(def ^:private completing (atom #{}))
(defn complete-pending!
  "[DX-ERA3 N1] Complete the removal the log holds as pending, exactly as its own resend would: its intent names its
  command and selectors, every native step is guarded at the serial point (declared and committed sequences,
  the command's claim), and its own client gets the same answer when it resends. Run by a gateway that refused a
  derived write because of it (after the write released its locks) and by a removal of another command. One at a
  time per database on this gateway; a failure leaves it pending for the next contact. Returns nothing."
  [name conn]
  (when-let [p (privacy/pending name)]
    (let [[before _] (swap-vals! completing conj name)]
      (when-not (contains? before name)
        (try
          (let [r (erase/erase! name conn {"commandId" (get p "commandId") "selectors" (get p "selectors")})]
            (println (json/write-str {"schema" "triplex.removal-completion.v1" "seq" (get p "seq") "outcome" "completed"
                                      "position" (:position r)})))
          ;; [DX-ERA2 sixth pass, V7] a completion that fails is counted (`completion`) and logged (one line a minute per
          ;; database and code), not only printed
          (catch Exception e ((requiring-resolve 'triplex.gateway.failures/note!) "completion" name e))
          (finally (swap! completing disj name)))))
    nil))

;; ---- [DX-ERA2 fifth pass] R2-2 of the save line's second review: a save framed before a removal of its subject ----
(defn- written-protected
  "The [entity attribute] pairs of the protected values this save writes (its new rows on a protected attribute)."
  [db input attrs]
  (let [fresh (set (get input "newIds"))]
    (into #{} (comp (filter #(fresh (:id %))) (filter #(attrs (:attribute %))) (map (juxt :entity_id :attribute)))
          (storage/input-rows input (storage/lean? db) fresh))))

(defn- names-value? [entry [e a]]
  (or (some (fn [x] (and (= e (get x "entityId")) (or (nil? (get x "attribute")) (= a (get x "attribute"))))) (get entry "selectors"))
      (some (fn [x] (and (= e (get x "entity")) (= a (get x "attribute")))) (get entry "identities"))))

(defn removal-after-source
  "The newest removal committed in the data AFTER this save was framed that names a protected value the save writes
  (by its selectors, so a subject with no value yet counts), or nil. From the data's own records, so it is the same on
  both boundaries and database-wide. When was the save framed:
  - its own frame source (`sourceK`, the position the client framed it from): removals at a later position;
  - else the removal sequence the client last saw (`removalSeen`, the frontier's sequence or stamp it read): removals
    with a later sequence;
  - else nothing tells, so the save counts as framed before every removal (the fourth review's Z7: the SDK's
    optimistic commits send no source): any removal that names a value it writes declines it. A save sent again with a
    fresh source or a fresh `removalSeen` is a new save after the removal (case 3) and is not declined."
  [name db input]
  (let [source (get input "sourceK") seen (get input "removalSeen")
        later? (cond (integer? source) (fn [x] (> (long (:position x)) (long source)))
                     (integer? seen) (fn [x] (> (long (get-in x [:entry "seq"] 0)) (long seen)))
                     :else (constantly true))
        ;; [DX-ERA2 sixth pass] the database's own policy (an attribute added later counts from its addition)
        cut (with-policy (privacy/cut name db true) db) attrs (or (:attrs cut) #{})]
    (when (seq attrs)
      (let [after (take-while later? (rseq (:entries (native-entries name db))))]
        (when (seq after)
          (let [w (written-protected db input attrs)]
            (when (seq w)
              (some (fn [x] (when (some #(names-value? (:entry x) %) w) (:entry x))) after))))))))

(def ^:private declined-schema
  [{:db/ident :triplex.removal/declined-command :db/valueType :db.type/string :db/cardinality :db.cardinality/one
    :db/unique :db.unique/identity}
   {:db/ident :triplex.removal/declined-by :db/valueType :db.type/string :db/cardinality :db.cardinality/one}])

(defn- commands-of [input] (vec (distinct (keep #(get % "commandId") (get input "claims")))))

(defn- declined-by [db input]
  (when (d/entid db :triplex.removal/declined-command)
    (some (fn [c] (when-let [e (d/entid db [:triplex.removal/declined-command c])]
                    (:v (first (d/datoms db :eavt e :triplex.removal/declined-by)))))
          (commands-of input))))

(defn current-stamp
  "[DX-ERA2 sixth pass, V3] The removal stamp and erasure sequence a served answer of this database would carry now, as
  headers ({\"x-triplex-removal-stamp\" .. \"x-triplex-erasure-seq\" ..}), or nil (not protected, or not readable now)."
  [name db]
  (try
    (when-let [cut (if (removal-scope/per-account? db) (served name db (log-cut name db)) (privacy/cut name db true))]
      {"x-triplex-erasure-seq" (str (:seq cut)) "x-triplex-removal-stamp" (str (or (:stamp cut) (:seq cut)))})
    (catch Exception _ nil)))

(defn- framed? [input] (or (integer? (get input "sourceK")) (integer? (get input "removalSeen"))))

(defn- decline!
  "Refuse the save with the terminal answer, carrying the database's current removal stamp (V3: a client that learns
  its stamp from answers, as the SDK does, learns it from this one too, and a save it frames after this answer is a
  new save, case 3).
  [DX-ERA2 sixth pass, V4] What it writes, bounded:
  - a save that says when it was framed (a frame source, or removalSeen) and was framed before the removal: its
    commands recorded as declined (case 2: a replay under the same command is refused whatever it then claims), each
    command once; a command already recorded writes nothing;
  - a save that says nothing: nothing. The rule declines it again on every resend that still says nothing (it reads
    only the data's removal records), so a record adds nothing; a resend carrying this answer's stamp is case 3."
  [name conn db input entry]
  (let [fresh (when (framed? input)
                (vec (remove (fn [c] (and (d/entid db :triplex.removal/declined-command)
                                          (d/entid db [:triplex.removal/declined-command c])))
                             (commands-of input))))]
    (when (seq fresh)
      (when-not (d/entid db :triplex.removal/declined-command) @(d/transact conn declined-schema))
      @(d/transact conn (vec (for [c fresh] {:triplex.removal/declined-command c :triplex.removal/declined-by (get entry "txId")}))))
    (println (json/write-str {"schema" "triplex.removal-declined-save.v1" "operationId" (get input "operationId")
                              "commands" (commands-of input) "recorded" (count fresh) "removal" (get entry "seq")
                              "source" (get input "sourceK") "removalSeen" (get input "removalSeen")}))
    (throw (ex-info (if (framed? input)
                      (str "A removal of a subject this save writes committed after the save was framed (removal "
                           (get entry "seq") "); it is declined, and so is its command")
                      (str "A removal of a subject this save writes was committed (removal " (get entry "seq") ") and the "
                           "save does not say when it was framed (no frame source, no removalSeen); it is declined. A save "
                           "framed after this answer sends removalSeen with this answer's x-triplex-removal-stamp"))
                    {:status 409 :code "ErasureReplayDeclined" :headers (current-stamp name (erase/sync! conn))}))))

(defn decline-check!
  "Before a save (both writers, every mode): refused 409 ErasureReplayDeclined when its command was declined by a
  removal, or when a removal of a subject it writes committed after its own frame source (case 1: the late frame),
  its commands then recorded as declined (case 2). Every refusal carries the current removal stamp."
  [name conn db input]
  (when-let [by (declined-by db input)]
    (throw (ex-info (str "This save's command was declined by a removal (" by "); a new command is a new save")
                    {:status 409 :code "ErasureReplayDeclined" :headers (current-stamp name db)})))
  (when-let [entry (removal-after-source name db input)]
    (decline! name conn db input entry)))

(defn after-refusal
  "After a save was refused at the serial point (409 CasConflict or ErasureFrontierChanged): when the cause is a removal
  of a subject it writes that committed after its frame source (case 1: the race), the same terminal answer as the
  late frame, and its commands recorded as declined (case 2). Any other answer is returned unchanged."
  [name conn input answer]
  (let [body (:body answer)
        code (when (= 409 (:status answer))
               (get (try (json/read-str (if (string? body) body (String. ^bytes body "UTF-8")))
                         (catch Exception e ((requiring-resolve 'triplex.gateway.failures/note!) "refusal-parse" name e) {}))
                    "code"))]
    (if (#{"CasConflict" "ErasureFrontierChanged"} code)
      (let [db (erase/sync! conn)]
        (if-let [entry (removal-after-source name db input)]
          (try (decline! name conn db input entry)
               (catch clojure.lang.ExceptionInfo e
                 ;; [DX-ERA2 sixth pass, V3] the current stamp, not the one the refused plan read
                 {:status 409 :headers (merge (:headers answer) (:headers (ex-data e)))
                  :body (json/write-str {:code "ErasureReplayDeclined" :message (.getMessage e)})}))
          answer))
      answer)))

(def worker-complete-ms
  "[DX-ERA2 fifth pass] The key-shred worker completes a removal left pending longer than this many milliseconds
  since its intent, as its own resend would, so that neither its effect nor its keys wait for a client that went
  away. Part of the per-account rule: on with TX2_REMOVAL_PER_ACCOUNT=1 (30 s unless TX2_REMOVAL_WORKER_COMPLETE_MS
  says otherwise; 0 turns it off). Under the database-wide rule only when TX2_REMOVAL_WORKER_COMPLETE_MS is set."
  (let [v (some-> (System/getenv "TX2_REMOVAL_WORKER_COMPLETE_MS") Long/parseLong)]
    (cond (some? v) (when (pos? v) v)
          removal-scope/enabled 30000
          :else nil)))

(defn complete-stale!
  "[DX-ERA2 fifth pass] Called by the key-shred worker on every pass (envelope/maintain-keys!). With
  `worker-complete-ms` set, every database whose pending removal is older than it is completed (`complete-pending!`,
  guarded at the serial point like any resend); a failure is counted and logged and the next pass tries again.
  [DX-ERA2 sixth pass, V5] The log of a database that no longer exists (deleted by an earlier build, or while this
  gateway was down) is retired instead of failing on every pass (the catalog is read once per pass, only when a
  removal is stale)."
  []
  (when worker-complete-ms
    (let [existing (delay (set (d/get-database-names ((requiring-resolve 'triplex.gateway.main/db-uri) "*"))))]
      (doseq [name (@#'envelope/authority-scopes)]
        (try
          (when-let [p (privacy/pending name)]
            (when (> (- (System/currentTimeMillis) (long (get p "erasedAt" 0))) worker-complete-ms)
              (if-not (contains? @existing name)
                ((requiring-resolve 'triplex.gateway.removal-repair/retire-log!) name)
                (do (println (json/write-str {"schema" "triplex.removal-worker-completion.v1" "database" name "seq" (get p "seq")
                                              "ageMs" (- (System/currentTimeMillis) (long (get p "erasedAt" 0)))}))
                    (complete-pending! name ((requiring-resolve 'triplex.gateway.main/connection)
                                             ((requiring-resolve 'triplex.gateway.main/db-uri) name)))))))
          (catch Exception e ((requiring-resolve 'triplex.gateway.failures/note!) "worker-completion" name e)))))))

(defn check-source!
  "[DX-ERA3 M4] A delivery's source database, checked under its lock (main/route-handler): a pending removal there
  refuses the delivery with the tagged 503 naming that database, so its gateway completes the source's removal; then
  the source's state (served as a request on it would be) must match the delivery's ticket."
  [source db ticket]
  (let [state (log-cut source db)]
    (when (and state (:pending state))
      (throw (ex-info (str "A removal is in flight in the delivery's source database; this gateway completes it. "
                           "Read the source's ticket again and send the delivery again.")
                      {:status 503 :code "ErasureFrontierUnavailable" :removal-pending true :removal-database source})))
    (let [state (if (and state (removal-scope/per-account? db)) (served source db state) state)]
      (if (and state (removal-scope/per-account? db))
        (if (commit-boundary? db) (check-writes! state) (privacy/verify-data! state db))
        (privacy/verify-data! state db))
      (privacy/ensure-seq! state ticket))))

;; ---- [DX-ERA2 fifth pass, Z2; sixth pass, V1, V2, V6] the policy in the database; the log a derived copy ----------
(defn- removed-attributes [entries]
  (into #{} (mapcat (fn [x] (map #(get % "attribute") (get (:entry x) "identities")))) entries))

(defn- covers!
  "A policy is taken (adopted from a verified head, or copied into the log) only when it covers every attribute the
  data's removals removed, and is sealed when the data holds sealed values."
  [name db policy]
  (let [attrs (set (get policy "attributes"))]
    (when-not (every? attrs (removed-attributes (:entries (native-entries name db))))
      (privacy/failure! 409 "ProtectionPolicyMismatch" "The policy does not cover every removed value's attribute"))
    (when (and (not (true? (get policy "sealed"))) (d/entid db :triplex.private/id) (seq (d/datoms db :aevt :triplex.private/id)))
      (privacy/failure! 409 "ProtectionPolicyMismatch" "The data holds sealed values"))))

(defn adopt-policy!
  "[DX-ERA2 sixth pass, V2] Once, for a database that holds no policy (moved per account by an earlier build): the
  policy of its log's head, taken only from a head that passes the log's own checks first (its database's own name,
  every entry's chain, the head's seal: `privacy/cut`) and that covers every removed value's attribute; nothing is
  stored before those checks. One compare-and-set from no policy, so two gateways adopting different logs cannot both
  win: the second is refused (503) and finds the first's policy on its next try. A database that holds a policy never
  takes one from the log (its log carries a copy derived from it, `sync-policy-copy!`). Returns the database value."
  [name conn db]
  (if (stored-policy db) db
    (if-let [cut (privacy/cut name db true)]
      (let [h (json/read-str (:wire cut))
            policy {"attributes" (vec (get h "attributes")) "sealed" (true? (get h "sealed"))}]
        (covers! name db policy)
        (when-not (d/entid db :triplex.scope/protection-policy) (transact! conn policy-schema))
        (transact! conn [[:db/cas (scope/entity db) :triplex.scope/protection-policy nil (json/write-str policy)]])
        (println (json/write-str {"schema" "triplex.protection-policy-adopted.v1" "database" name}))
        (erase/sync! conn))
      db)))

(defn- write-head!
  "Replace the log's head, only over the head this step read (`expected`): the PostgreSQL authority compares in the
  statement, the file authority under the gateway's intent lock (as `put-intent!`). Anything else answers 503."
  [name expected head]
  (if sql/url
    (when-not (= 1 (@#'sql/with-session
                     (fn [c] (@#'sql/execute! c (str "UPDATE triplex_removal.records SET payload=? "
                                                     "WHERE scope=? AND record='head.json' AND payload=?") [head name expected]))))
      (privacy/unavailable!))
    (locking intent-lock
      (when-not (= expected (privacy/record-text name "head.json")) (privacy/unavailable!))
      (@#'privacy/save-record! name "head.json" head))))

(defn sync-policy-copy!
  "[DX-ERA2 sixth pass] Under the removal lock: the log's head carries a copy of the database's policy (its attributes
  and seal), which the database-wide rule and the key pass read; a copy that differs (a log put back from before an
  addition, a head rebuilt by an earlier build) is rewritten from the database over the head it read. The copy is
  never an input while the database holds a policy. Returns the log's cut after it."
  [name db current]
  (let [p (when current (stored-policy db))]
    (if-not p current
      (let [h (json/read-str (:wire current))
            want (vec (get p "attributes")) sealed? (true? (get p "sealed"))]
        (if (and (= (set want) (set (get h "attributes"))) (= sealed? (get h "sealed"))) current
          (do (covers! name db p)
              (write-head! name (:wire current) (json/write-str (assoc h "attributes" want "sealed" sealed?)))
              (println (json/write-str {"schema" "triplex.protection-policy-copy.v1" "database" name
                                        "attributes" (count want) "copyHad" (count (get h "attributes"))}))
              (swap! privacy/cache dissoc name)
              (privacy/cut name db true)))))))

(defn- intent-state
  "The intent record as stored: nil (none), the intent, or ::unreadable (storage damage: not a removal's intent)."
  [name]
  (when-let [t (privacy/record-text name "pending.json")]
    (let [p (try (json/read-str t) (catch Exception _ nil))]
      (if (and (map? p) (integer? (get p "seq")) (string? (get p "commandId")) (vector? (get p "selectors"))) p ::unreadable))))

(defn- repair-intent!
  "[DX-ERA2 sixth pass, V6] An intent that cannot be read. One removal is in flight per database at a time (under its
  lock), so a removal committed in the data past the log's head is the one it stood for: the intent is deleted and the
  catch-up publishes that removal from the data's own record. With nothing committed past the head the removal never
  committed, so it was never acknowledged: its declaration (accounts and subjects held for it) is released and the
  intent deleted; its content is gone with the damaged record, so only its client's resend starts it again (its
  command and selectors are in the client's request). Neither path changes the policy or drops a published removal."
  [name conn db]
  (when (= ::unreadable (intent-state name))
    (let [h (some-> (privacy/record-text name "head.json") json/read-str)
          committed-past (> (count (:entries (native-entries name db))) (long (get h "seq" 0)))]
      (if sql/url (sql/delete! name "pending.json") (@#'privacy/remove-record! name "pending.json"))
      (swap! privacy/cache dissoc name)
      (println (json/write-str {"schema" "triplex.removal-intent-repaired.v1" "database" name
                                "committedPastTheHead" committed-past}))
      (when-not committed-past
        (when-let [current (privacy/cut name db true)] (release-orphan! conn db current))))))

(defn- repair-entries!
  "[DX-ERA2 sixth pass, V6] A published log that no longer verifies (an entry altered or lost): every entry is
  rewritten from the data's record of the same sequence, only when the data proves the whole published chain: its
  records are dense from 1 and the head's seal is the hash of the data's record at the head's sequence (each record
  carries its predecessor's hash). Nothing else is written; a head that does not match the data is refused (503
  RemovalLogConflict: put back a copy of the log)."
  [name db]
  (when-let [wire (privacy/record-text name "head.json")]
    (when (try ((requiring-resolve 'triplex.gateway.removal-repair/verify-log) name) false (catch Exception _ true))
      (let [h (json/read-str wire) n (get h "seq") {:keys [entries dense]} (native-entries name db)]
        (when-not (and (= name (get h "database")) (integer? n) (pos? n) dense (>= (count entries) n)
                       (= (get h "seal") (privacy/sha256 (:raw (entries (dec n))))))
          (privacy/failure! 503 "RemovalLogConflict"
                            "The removal log does not verify and the data does not prove it: put back a copy of the log"))
        (let [fixed (vec (for [k (range 1 (inc n))
                               :let [raw (:raw (entries (dec k))) record (str "erase-" k ".json")]
                               :when (not= raw (privacy/record-text name record))]
                           (do (@#'privacy/save-record! name record raw) k)))]
          (swap! privacy/cache dissoc name)
          (println (json/write-str {"schema" "triplex.removal-log-entries-repaired.v1" "database" name "rewritten" fixed})))))))

(defn- rebuild-locked!
  "The rebuild route's work, under the removal lock: the log made what the data says. `repair?` (the route itself, an
  operator's call) also repairs storage damage first (V6)."
  [name conn repair?]
  (let [db (erase/sync! conn)
        {:keys [entries dense]} (native-entries name db)]
    (when-not (privacy/enabled? db) (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
    (when-not dense (privacy/failure! 503 "RemovalLogConflict" "The data's removal records are not a dense chain"))
    (when repair? (repair-intent! name conn db) (repair-entries! name db))
    (let [db (erase/sync! conn) wire (privacy/record-text name "head.json")]
      (if wire
        ;; [DX-ERA2 sixth pass, V2] the head's own checks (its database's name, its chain and seal) BEFORE anything is
        ;; stored: a head from another database is refused here and adopts nothing
        (let [_ (swap! privacy/cache dissoc name)
              current (privacy/cut name db true)
              db (adopt-policy! name conn db)
              current (sync-policy-copy! name db current)
              e (effective name db current)
              _ (check-writes! e)
              h (:seq current)
              after (if (> (count entries) h) (append-log! name db current (subvec entries h)) current)]
          (privacy/clear-completed! name after)
          {:database name :seq (:seq after) :appended (- (:seq after) h) :written false})
        (let [policy (or (stored-policy db)
                         (privacy/failure! 409 "ProtectionPolicyUnknown"
                                           "The database holds no protection policy: put back a copy of this database's removal log head"))
              attrs (vec (get policy "attributes")) sealed? (true? (get policy "sealed"))]
          (covers! name db policy)
          (when-not sql/url
            (java.nio.file.Files/createDirectories (.getParent (privacy/path name "head.json"))
                                                   (make-array java.nio.file.attribute.FileAttribute 0)))
          (doseq [x entries] (@#'privacy/save-record! name (str "erase-" (get (:entry x) "seq") ".json") (:raw x)))
          (@#'privacy/save-record! name "head.json"
            (json/write-str {"database" name "seq" (count entries)
                             "seal" (if (seq entries) (privacy/sha256 (:raw (peek entries))) privacy/zeros)
                             "attributes" attrs "sealed" sealed?}))
          (swap! privacy/cache dissoc name)
          (let [after (privacy/cut name db true)]
            (privacy/clear-completed! name after)
            (println (json/write-str {"schema" "triplex.removal-log-rebuilt.v1" "seq" (:seq after) "entries" (count entries)}))
            {:database name :seq (:seq after) :appended (count entries) :written true}))))))

(defn rebuild-log!
  "[DX-ERA2 fourth pass; fifth pass: the policy from the database; sixth pass: storage damage] POST
  /v2/db/{db}/removal-log-rebuild: the removal log rebuilt from the data, under the removal lock. Every removal
  committed in Datomic carries its entry exactly as published, chained by its previous seal, so the log is the data's
  records in order. A log behind the data (any number of removals, or a copy with a removal pending in it) is caught
  up; a missing log is written whole from the data and the database's own policy; an unreadable intent or a published
  entry that no longer verifies is repaired from the data when the data proves it (V6, `repair-intent!`,
  `repair-entries!`). It takes nothing from the request, so any caller can only make the log what the data says.
  Refused when the data is behind the log (the restore route), when they disagree (the reconcile route), or, for a
  missing log, when the database holds no policy (an earlier build's move: put back a copy of this database's head)."
  [name conn input]
  (when-not (and (map? input) (empty? input))
    (privacy/failure! 400 "InvalidValue" "Expected {}: the policy is the database's own"))
  (privacy/guard name #(rebuild-locked! name conn true)))

(defn- add-attributes!
  "One compare-and-set of the stored policy: `extra` appended to its attributes and to its added list. Then the log's
  copy is rewritten from it. Returns the database value after it."
  [name conn db p extra]
  (let [next (assoc p "attributes" (into (vec (get p "attributes")) extra) "added" (into (vec (get p "added")) extra))]
    (transact! conn [[:db/cas (scope/entity db) :triplex.scope/protection-policy (stored-text db) (json/write-str next)]])
    (println (json/write-str {"schema" "triplex.protection-policy-added.v1" "database" name "added" (count extra)}))
    (let [db (erase/sync! conn)]
      (sync-policy-copy! name db (privacy/cut name db true))
      db)))

(defn protect!
  "[DX-ERA2 sixth pass, V1] POST /v2/db/{db}/protection on a database guarded per account. The policy is the one stored
  in Datomic, and the request is compared with it, never with the log:
  - the same attributes and seal: 200, nothing written (a service declares its policy at every start);
  - more attributes and the same seal: the new ones are added (one compare-and-set of the stored policy), then the
    log's copy is rewritten from it. Adding is one-way. New values of an added attribute are protected from the
    addition on; its values stored before it stay as stored (in clear when the database is sealed): a removal selects
    and masks them by identity, but has no key to delete for them;
  - fewer attributes, or another seal: 409 ProtectionPolicyMismatch, nothing written (an attribute is never dropped).
  First, under the removal lock, the log is made what the data says (missing: rebuilt from the data and the stored
  policy; behind: caught up), so this route never writes a log from its request. A database with no stored policy
  adopts its verified log's first; with neither, 409 ProtectionPolicyUnknown."
  [name conn input]
  (let [attrs (get input "attributes") sealed? (true? (get input "sealed"))]
    (when-not (and (vector? attrs) (seq attrs) (= (count attrs) (count (set attrs)))
                   (every? #(and (string? %) (seq %) (not (.startsWith ^String % ":_tx/"))) attrs)
                   (contains? #{nil true false} (get input "sealed")))
      (privacy/failure! 400 "InvalidProtectedAttributes" "Expected distinct declared protected attributes"))
    (let [result
          (privacy/guard name
            (fn []
              (rebuild-locked! name conn false)
              (let [db (erase/sync! conn)
                    p (or (stored-policy db)
                          (privacy/failure! 409 "ProtectionPolicyUnknown" "The database holds no protection policy"))
                    have (vec (get p "attributes"))]
                (when-not (= sealed? (true? (get p "sealed")))
                  (privacy/failure! 409 "ProtectionPolicyMismatch" "Whether the database is sealed never changes"))
                (when-not (every? (set attrs) have)
                  (privacy/failure! 409 "ProtectionPolicyMismatch"
                                    (str "A protected attribute is never dropped; this database protects " (count have)
                                         " attributes and the request leaves some out")))
                (let [extra (vec (remove (set have) attrs))
                      db (if (seq extra) (add-attributes! name conn db p extra) db)
                      p (stored-policy db)]
                  {:database name :attributes (vec (get p "attributes")) :sealed (true? (get p "sealed"))
                   :added extra :erasure {:seq (:seq (privacy/cut name db true))}}))))]
      (envelope/provision! name sealed?)
      result)))

(defn before-move-back!
  "[DX-ERA2 sixth pass] Before a database moves back to the database-wide rule (whose policy is the log's): the log's
  copy rewritten from the database's policy; refused for a sealed database whose policy gained attributes (their
  values from before the addition are in clear, which only the per-account rule reads)."
  [name conn]
  (privacy/guard name
    (fn []
      (let [db (erase/sync! conn) p (stored-policy db)]
        (when (and p (true? (get p "sealed")) (seq (get p "added")))
          (privacy/failure! 409 "RemovalBoundaryOneWay" "This sealed database's policy gained attributes; it stays per account"))
        (sync-policy-copy! name db (privacy/cut name db true))
        nil))))

(defn clear-rows
  "[DX-ERA2 sixth pass] In a sealed database, `owner`'s values of attributes added to its policy after it was first
  protected that are stored in clear (saved before the addition, or by a save planned before it): a removal selects
  them as well, so they are masked by identity like every removed value (erase/matches)."
  [db owner policy attribute]
  (when-let [e (d/entid db [:triplex.entity/id owner])]
    (for [a (:added policy) :when (or (nil? attribute) (= a attribute))
          r (lean/history-entity db e nil a)
          :when (not= (:value_string r) (str "triplex-sealed-v1/" (:id r)))]
      r)))

(defn boundary-moved?
  "[DX-ERA2 sixth pass, V9] A write refused at Datomic's serial point (409 ErasureFrontierChanged, or CasConflict on the
  subject writer) while its database moved to the commit boundary after the write was planned: the fence value the
  plan carried is no longer the database's. The gateway plans it once more (main/route-handler); a real conflict is
  refused again by that plan, and its answer is the client's."
  [conn state answer]
  (boolean
    (when (and (:per-account state) (= 409 (:status answer)))
      (let [body (:body answer)
            code (get (try (json/read-str (if (string? body) body (String. ^bytes body "UTF-8"))) (catch Exception _ {})) "code")]
        (when (#{"ErasureFrontierChanged" "CasConflict"} code)
          ;; only the move to the commit boundary (-1 to -2); a move back to the database-wide rule keeps its 409, which
          ;; the client replays on the database-wide rule
          (let [db (erase/sync! conn)]
            (and (= removal-scope/sentinel (:erasure-sentinel state))
                 (= -2 (scope/value db (scope/entity db) :triplex.scope/erasure-seq)))))))))

;; ---- [DX-ERA2 fifth pass] the operator's way out of RemovalLogConflict ---------------------------------------------
(defn reconcile!
  "POST /v2/db/{db}/removal-log-reconcile: the way out of RemovalLogConflict that can neither change the policy nor drop
  a removal. Under the removal lock, every record in the data that differs from the log's entry of the same sequence
  only in its position (a restore's replay by an earlier build, which wrote its new position into the record) is
  rewritten as the published record; after that the data and the log must agree, else it is still refused with what
  differs. Takes nothing from the request."
  [name conn input]
  (when-not (and (map? input) (empty? input)) (privacy/failure! 400 "InvalidValue" "Expected {}"))
  (privacy/guard name
    (fn []
      (let [db (erase/sync! conn)
            cut (or (privacy/cut name db true) (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
            by-seq (into {} (map (fn [e] [(get e "seq") e]) (vals (:commands cut))))
            fixes (vec (for [x (:entries (native-entries name db))
                             :let [published (by-seq (get-in x [:entry "seq"]))]
                             :when (and published (not= (:entry x) published)
                                        (= (dissoc (:entry x) "position") (dissoc published "position")))]
                         [:db/add (:e x) :triplex.tx/erasure-record (json/write-str published)]))]
        (when (seq fixes) (transact! conn fixes))
        (swap! natives dissoc name)
        (let [db (erase/sync! conn)
              e (effective name db (privacy/cut name db true))]
          (println (json/write-str {"schema" "triplex.removal-log-reconciled.v1" "database" name "rewritten" (count fixes)
                                    "refused" (:writes-refused e)}))
          (when (:writes-refused e)
            (privacy/failure! 503 (:writes-refused e) "The data and the removal log still differ beyond positions: an operator must decide"))
          {:database name :rewritten (count fixes) :seq (:seq e)})))))

(defn start-check!
  "[DX-ERA3 N5] At gateway start: every database guarded per account whose data is ahead of (or behind) its removal
  log is reported. Every request (erase/request-cut) and every removal checks the same again and refuses."
  [names connect]
  (doseq [name names]
    (try
      (let [db (d/db (connect name))]
        (when (removal-scope/per-account? db)
          (when-let [b (disagreement db (privacy/cut name db true))]
            (println (json/write-str {"schema" "triplex.removal-start-check.v1" "database" name "agree" false
                                      "code" (:code b) "native" (:native b) "declared" (:declared b) "log" (:log b)})))))
      (catch Exception e
        (println (json/write-str {"schema" "triplex.removal-start-check.v1" "database" name "agree" false
                                  "code" (or (:code (ex-data e)) "Unverified")}))))))

(defn stale-counter-ops
  "Counters a database holds natively that the published log does not derive (a held account or subject left by a
  removal that never recorded its intent, a copy restored from mid-removal): back to 0."
  [db state]
  (if (removal-scope/installed? db)
    (let [ents (or (:entities state) {}) bks (or (:buckets state) {})
          native (fn [attr] (d/q '[:find ?k ?s :in $ ?a :where [?e ?a ?k] [?e :triplex.removal/seq ?s]] db attr))]
      (concat (removal-scope/counter-ops (for [[k v] (native :triplex.removal/entity) :when (and (not= 0 v) (not (contains? ents k)))] [k 0]) nil)
              (removal-scope/counter-ops nil (for [[k v] (native :triplex.removal/account) :when (and (not= 0 v) (not (contains? bks k)))] [k 0]))))
    []))

(defn rebuild!
  "After a restored copy guarded per account has replayed the log: every counter from the log, nothing declared beyond
  it, no account held."
  [conn db state]
  ;; [DX-ERA3 N5] never from a log behind the data: that would release accounts that lost a value
  (when-let [b (disagreement db state)] (refuse! b))
  ;; [DX-ERA2 sixth pass] the restore route replays the log's policy additions too (adding is one-way): data restored
  ;; from before an addition takes the attributes its verified log's copy has and its stored policy lacks
  (let [p (stored-policy db) h (some-> (:wire state) json/read-str)
        extra (when (and p h) (vec (remove (set (get p "attributes")) (get h "attributes"))))]
    (when (seq extra) (add-attributes! (get h "database") conn db p extra)))
  (let [head (scope/entity db)
        n (scope/value db head :triplex.scope/removal-seq)
        ops (concat [[:db/add head :triplex.scope/removal-intent n] [:db/add head :triplex.scope/removal-held "[]"]]
                    (removal-scope/counter-ops (:entities state) (:buckets state))
                    (stale-counter-ops db state))]
    (doseq [part (partition-all 1000 ops)] (transact! conn (vec part)))))
