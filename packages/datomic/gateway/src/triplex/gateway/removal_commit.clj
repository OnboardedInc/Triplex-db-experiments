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
  Loaded on first use (removal-erase/erase! resolves it), so a gateway without the option loads none of this.
  [DX-ERA3 second review] The order of a removal's steps is: intent (in the log), declaration (native), selection and
  commit (native), publication (log). Every stop leaves a removal the log shows as pending, which every gateway
  answers 503 for the writes it can reach and which any gateway completes (`complete-pending!`): the first derived
  write it refuses, any removal of another command, or its own resend. Rejected: the declaration before the intent
  (a stop between them left a native block no gateway could see, N1); a repair of such a block by any gateway (it
  cannot tell it from a removal between its two steps; with the intent first there is no such state)."
  (:require [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.authority-sql :as sql]
            [triplex.gateway.erase :as erase] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.removal-scope :as removal-scope] [triplex.gateway.scope :as scope]
            [triplex.gateway.removal-erase :as removal-erase]))

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
                              "removal log back; a declaration the log does not show, left by an earlier build, is "
                              "cleared by moving the database back and forward. ")
                         "The data is behind the removal log: replay the log with the restore route. ")
                       "Native removal " native ", declared " declared ", log " log
                       (when (some? pending) (str ", pending " pending)))
                  {:status 503 :code code})))

(defn consistent?
  "Request time (removal-erase/request-cut): the data and the log agree, declarations included."
  [db state]
  (and (removal-scope/consistent? db (:seq state) (:pending-seq state)) (nil? (disagreement db state))))

(defn refuse-inconsistent!
  "After request-cut's retries: the typed disagreement when there is one, else 503."
  [db state]
  (when-let [b (and state (disagreement db state))] (refuse! b))
  (privacy/unavailable!))

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
  database's ticket, which says nothing about this one: no check here, as on the database-wide rule [N4]. Tickets
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
      (and (some? source) (not= source privacy/*database*)) []
      :else (let [dd (declared-seq db)]
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
                 [:db/cas head :triplex.scope/erasure-seq removal-scope/sentinel removal-scope/sentinel]
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
(def ^:private removal-keys ["database" "seq" "previous" "commandId" "selectors"])
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
  [name expected item]
  (let [wire (json/write-str item)]
    (if sql/url
      (let [n (@#'sql/with-session
                (fn [c]
                  (if (nil? expected)
                    (@#'sql/execute! c (str "INSERT INTO triplex_removal.records(scope,record,payload) VALUES (?,'pending.json',?) "
                                            "ON CONFLICT (scope,record) DO NOTHING") [name wire])
                    (@#'sql/execute! c (str "UPDATE triplex_removal.records SET payload=? "
                                            "WHERE scope=? AND record='pending.json' AND payload=?") [wire name expected]))))]
        (when-not (= 1 n) (privacy/unavailable!)))
      (locking intent-lock
        (when-not (= expected (intent-wire name)) (privacy/unavailable!))
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

(declare complete-pending!)

(defn erase! [name conn input]
  (let [selectors (erase/selectors! input)
        command (get input "commandId")
        started (System/nanoTime)]
    ;; [DX-ERA3 N1] A removal of another command left pending is completed first, exactly as its own resend would.
    (when-let [p (privacy/pending name)]
      (when-not (= command (get p "commandId")) (complete-pending! name conn)))
    (let [buckets (removal-erase/selector-buckets (d/db conn) selectors)]
      (when-not (privacy/cut name (d/db conn) true)
        (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
      (privacy/guard name
        (fn []
          (removal-erase/with-bucket-guards name buckets
            (fn []
              (let [db (erase/sync! conn)
                    current (privacy/cut name db true)]
                (when-not current (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
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
                        _ (when-let [b (disagreement db current)] (refuse! b))
                        checked (check-entities selectors)]
                    (if-let [native (and pending (committed db pending))]
                      (publish! name conn current native wire 0 false started)
                      (let [db (ensure-declaration! conn db)
                            ;; [DX-ERA3 N1] the intent first: from here on, every stop leaves a removal that every
                            ;; gateway sees as pending and any gateway completes
                            wire (or wire (put-intent! name nil (erase/make-entry name db current command selectors)))
                            _ (step! "intent")
                            view (do (declare! conn db current (vec buckets) s) (erase/sync! conn))
                            _ (step! "declared")]
                        ;; A removal resumed after its guard was taken finds its subjects held and keeps them held.
                        (loop [view view wire wire tries 1
                               held (into #{} (filter (fn [e] (= (- s) (removal-scope/native-entity-seq view e))) checked))]
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
          (let [r (erase! name conn {"commandId" (get p "commandId") "selectors" (get p "selectors")})]
            (println (json/write-str {"schema" "triplex.removal-completion.v1" "seq" (get p "seq") "outcome" "completed"
                                      "position" (:position r)})))
          (catch Exception e
            (println (json/write-str {"schema" "triplex.removal-completion.v1" "seq" (get p "seq") "outcome" "pending"
                                      "code" (:code (ex-data e))})))
          (finally (swap! completing disj name)))))
    nil))

(defn start-check!
  "[DX-ERA3 N5] At gateway start: every database guarded per account whose data is ahead of (or behind) its removal
  log is reported. Every request (removal-erase/request-cut) and every removal checks the same again and refuses."
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
