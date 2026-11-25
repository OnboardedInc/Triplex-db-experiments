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
            [triplex.gateway.storage :as storage]))

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
  database guarded per account. What a request does depends on the database, never on this variable."
  (= "1" (System/getenv "TX2_REMOVAL_COMMIT_BOUNDARY")))

(defn commit-boundary?
  "[DX-ERA2 fourth pass; fifth pass: a setting in the database] True when this database value removes at the commit:
  its database-wide erasure sequence holds -2 instead of the per-account sentinel -1. A removal then takes effect for
  every request at its commit in Datomic, not at its publication in the removal log: every request is served from the
  log's cut with every removal committed in the data past the log's head applied (`effective`); the log stays the
  acknowledged, ordered record and what a restore of older data replays. Read at each request's own position. The
  value is the one every write and removal fences on at Datomic's serial point, so a plan made before the setting
  changes is refused, and a build that does not know -2 refuses the database (see era2/REMOVAL-PER-ACCOUNT.md 18)."
  [db]
  (= -2 (scope/value db (scope/entity db) :triplex.scope/erasure-seq)))

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
                                 {:entries (conj entries {:raw (:v x) :entry entry}) :dense (and (:dense acc) ok)
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

(defn served
  "The state a request on a database guarded per account is served from (erase/request-cut)."
  [name db state]
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
         :per-account true
         ;; [DX-ERA2 fifth pass] the value every write of this request fences on (-1, or -2 with the commit boundary)
         :erasure-sentinel (scope/value db (scope/entity db) :triplex.scope/erasure-seq)
         ;; [DX-ERA2 fifth pass, B5] the one value a cache keys on: it changes exactly when what a read may answer
         ;; changes. On the log's boundary the published sequence (a read publishes a committed removal first); with the
         ;; commit boundary the number of removals committed in this database value (it moves at the commit, while the
         ;; sequence and the tickets wait for the publication)
         :stamp (if (commit-boundary? db)
                  (max (long (:seq state)) (count (:entries (native-entries name db))))
                  (:seq state))))

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
                      ;; the publication's own refusal (typed) is the reader's answer
                      (catch java.util.concurrent.ExecutionException e (throw (or (.getCause e) e))))))
        state (when-not (= ::timeout done) (first (erase/request-cut name conn (erase/sync! conn))))
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

(defn log-cut
  "The published log's cut (pending removal included). With the commit boundary, a log put back behind a head this
  gateway verified is read again as it is, when the data still holds every removal verified (it is served from the
  data); otherwise refused as before (a restore of both the data and the log to an older copy)."
  [name db]
  (try (privacy/cut name db true)
       (catch clojure.lang.ExceptionInfo e
         (if (and (commit-boundary? db) (behind-cache? name db))
           (do (swap! privacy/cache dissoc name) (privacy/cut name db true))
           (throw e)))))

(defn typed-failure
  "The refusal request-cut throws after its retries: typed when the database is protected and its log is missing."
  [name db e]
  (if (and (privacy/enabled? db) (nil? (privacy/record-text name "head.json")))
    (ex-info "The removal log is missing: rebuild it from the data (POST removal-log-rebuild with the policy)."
             {:status 503 :code "RemovalLogMissing"})
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

(declare complete-pending!)

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
            (privacy/unavailable!)))))))

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
                    ;; [DX-ERA2 fifth pass] a process allowed to turns the commit boundary on before its removal
                    db (or (when (and may-turn-on (not (commit-boundary? db))) (turn-on-locked! name conn db)) db)
                    current (log-cut name db)
                    ;; [DX-ERA2 fourth pass] with the commit boundary the log is first brought up to the data
                    [db current] (if (commit-boundary? db) (catch-up! name conn db current) [db current])]
                (privacy/clear-completed! name current)
                (if-let [before (get-in current [:commands command])]
                  (do (when-not (= selectors (get before "selectors"))
                        (privacy/failure! 409 "EraseCommandConflict" "The command already used different selectors"))
                      (erase/response db before))
                  (let [pending (privacy/pending name)
                        wire (when pending (intent-wire name))
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
          (catch Exception e
            (println (json/write-str {"schema" "triplex.removal-completion.v1" "seq" (get p "seq") "outcome" "pending"
                                      "code" (:code (ex-data e))})))
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
  "The newest removal committed in the data AFTER this save's own frame source (`sourceK`, the position the client
  framed it from) that names a protected value the save writes (by its selectors, so a subject with no value yet
  counts), or nil. From the data's own records, so it is the same on both boundaries and database-wide."
  [name db input]
  (let [source (get input "sourceK")]
    (when (integer? source)
      (let [cut (privacy/cut name db true) attrs (or (:attrs cut) #{})]
        (when (seq attrs)
          (let [after (take-while (fn [x] (> (long (get-in x [:entry "position"] 0)) source)) (rseq (:entries (native-entries name db))))]
            (when (seq after)
              (let [w (written-protected db input attrs)]
                (when (seq w)
                  (some (fn [x] (when (some #(names-value? (:entry x) %) w) (:entry x))) after))))))))))

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

(defn- decline!
  "Record the save's commands as declined by `entry` (so a replay under the same command is refused whatever source it
  carries), then refuse it with the terminal answer."
  [conn db input entry]
  (when (seq (commands-of input))
    (when-not (d/entid db :triplex.removal/declined-command) @(d/transact conn declined-schema))
    @(d/transact conn (vec (for [c (commands-of input)]
                             {:triplex.removal/declined-command c :triplex.removal/declined-by (get entry "txId")}))))
  (println (json/write-str {"schema" "triplex.removal-declined-save.v1" "operationId" (get input "operationId")
                            "commands" (commands-of input) "removal" (get entry "seq") "source" (get input "sourceK")}))
  (throw (ex-info (str "A removal of a subject this save writes committed after the save was framed (removal "
                       (get entry "seq") "); it is declined, and so is its command")
                  {:status 409 :code "ErasureReplayDeclined"})))

(defn decline-check!
  "Before a save (both writers, every mode): refused 409 ErasureReplayDeclined when its command was declined by a
  removal, or when a removal of a subject it writes committed after its own frame source (case 1: the late frame),
  its commands then recorded as declined (case 2)."
  [name conn db input]
  (when-let [by (declined-by db input)]
    (throw (ex-info (str "This save's command was declined by a removal (" by "); a new command is a new save")
                    {:status 409 :code "ErasureReplayDeclined"})))
  (when-let [entry (removal-after-source name db input)]
    (decline! conn db input entry)))

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
          (try (decline! conn db input entry)
               (catch clojure.lang.ExceptionInfo e
                 {:status 409 :headers (:headers answer)
                  :body (json/write-str {:code "ErasureReplayDeclined" :message (.getMessage e)})}))
          answer))
      answer)))

(def worker-complete-ms
  "[DX-ERA2 fifth pass] TX2_REMOVAL_WORKER_COMPLETE_MS (default unset: off): the key-shred worker completes a removal
  left pending longer than this many milliseconds since its intent, as its own resend would, so that neither its
  effect nor its keys wait for a client that went away."
  (some-> (System/getenv "TX2_REMOVAL_WORKER_COMPLETE_MS") Long/parseLong))

(defn complete-stale!
  "[DX-ERA2 fifth pass] Called by the key-shred worker on every pass (envelope/maintain-keys!). With
  `worker-complete-ms` set, every database whose pending removal is older than it is completed (`complete-pending!`,
  guarded at the serial point like any resend); a failure is counted and logged and the next pass tries again."
  []
  (when worker-complete-ms
    (doseq [name (@#'envelope/authority-scopes)]
      (try
        (when-let [p (privacy/pending name)]
          (when (> (- (System/currentTimeMillis) (long (get p "erasedAt" 0))) worker-complete-ms)
            (println (json/write-str {"schema" "triplex.removal-worker-completion.v1" "database" name "seq" (get p "seq")
                                      "ageMs" (- (System/currentTimeMillis) (long (get p "erasedAt" 0)))}))
            (complete-pending! name ((requiring-resolve 'triplex.gateway.main/connection)
                                     ((requiring-resolve 'triplex.gateway.main/db-uri) name)))))
        (catch Exception e ((requiring-resolve 'triplex.gateway.failures/note!) "worker-completion" name e))))))

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

(defn rebuild-log!
  "[DX-ERA2 fourth pass] POST /v2/db/{db}/removal-log-rebuild: the removal log rebuilt from the data, under the
  removal lock. Every removal committed in Datomic carries its entry exactly as published, chained by its previous
  seal, so the log is the data's records in order. A log behind the data (any number of removals, or a copy with a
  removal pending in it) is caught up; a missing log is written whole from the policy given in the body
  ({\"attributes\": [...], \"sealed\": bool}), which must cover every removed value's attribute. Refused when the data is
  behind the log (the restore route), or when they disagree. The way out of RemovalLogBehind on either boundary."
  [name conn input]
  (when-not (and (map? input) (every? #{"attributes" "sealed"} (keys input)))
    (privacy/failure! 400 "InvalidValue" "Expected {} or {\"attributes\": [...], \"sealed\": bool}"))
  (privacy/guard name
    (fn []
      (let [db (erase/sync! conn)
            {:keys [entries dense]} (native-entries name db)
            wire (privacy/record-text name "head.json")]
        (when-not (privacy/enabled? db) (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
        (when-not dense (privacy/failure! 503 "RemovalLogConflict" "The data's removal records are not a dense chain"))
        (if wire
          (let [_ (swap! privacy/cache dissoc name)
                current (privacy/cut name db true)
                e (effective name db current)
                _ (check-writes! e)
                h (:seq current)
                after (if (> (count entries) h) (append-log! name db current (subvec entries h)) current)]
            (privacy/clear-completed! name after)
            {:database name :seq (:seq after) :appended (- (:seq after) h) :written false})
          (let [attrs (get input "attributes") sealed? (get input "sealed")
                removed (into #{} (mapcat (fn [x] (map #(get % "attribute") (get (:entry x) "identities")))) entries)]
            (when-not (and (vector? attrs) (seq attrs) (every? string? attrs) (= (count attrs) (count (set attrs)))
                           (instance? Boolean sealed?))
              (privacy/failure! 400 "InvalidValue" "A missing log needs the policy: {\"attributes\": [...], \"sealed\": bool}"))
            (when-not (every? (set attrs) removed)
              (privacy/failure! 409 "ProtectionPolicyMismatch" "The policy does not cover every removed value's attribute"))
            (when (and (not sealed?) (d/entid db :triplex.private/id) (seq (d/datoms db :aevt :triplex.private/id)))
              (privacy/failure! 409 "ProtectionPolicyMismatch" "The data holds sealed values"))
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
              {:database name :seq (:seq after) :appended (count entries) :written true})))))))

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
  (let [head (scope/entity db)
        n (scope/value db head :triplex.scope/removal-seq)
        ops (concat [[:db/add head :triplex.scope/removal-intent n] [:db/add head :triplex.scope/removal-held "[]"]]
                    (removal-scope/counter-ops (:entities state) (:buckets state))
                    (stale-counter-ops db state))]
    (doseq [part (partition-all 1000 ops)] (transact! conn (vec part)))))
