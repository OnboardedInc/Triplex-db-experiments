(ns triplex.gateway.group
  (:require [datomic.api :as d] [triplex.gateway.write-policy :as policy] [triplex.gateway.schema :as schema] [triplex.gateway.lean :as lean]
            [triplex.gateway.group-prepare :as prepared]
            [triplex.gateway.save-ledger :as ledger] [clojure.string :as str])
  (:import [java.util WeakHashMap] [java.util.concurrent Executors ThreadFactory]))

;; [DX-W1] Why: an idle scope dispatches immediately; only work accumulated behind an in-flight append can share its successor.
;; Rejected: a collection timer or an unbounded burst queue.
(def enabled (= "1" (System/getenv "TX2_GROUP_COMMIT")))
(def bulk-priority (= "1" (System/getenv "TX2_LOAD1_PRIORITY")))
(defn grouping? [] (or enabled policy/field-only?))
(defn scheduling? [] (or (grouping?) policy/priority? policy/budget-us))
(def queue-clock (= "1" (System/getenv "TX2_GROUP_QUEUE_CLOCK")))
(def load-timing (= "1" (System/getenv "TX2_LOAD2_TIMING")))
(def load-frame-caps (= "1" (System/getenv "TX2_LOAD2_FRAME_CAPS")))
(defn frame-measurement [p input]
  (when (and (or load-timing load-frame-caps) (:bulk p))
    {:rows (+ (count (:new-ids p)) (count (filter #(and (vector? %) (= :triplex/retract (first %))) (:ops p))))
     :bytes (:wire-bytes (meta input))}))
(defn bound-frame! [size]
  ;; [DX-W1] Why: bound actual decoded fresh and retired rows (including journal) and exact HTTP bytes before admitting bulk.
  ;; Rejected: estimating bytes from input business facts or splitting one atomic write after seeing a receipt.
  (when (and load-frame-caps size)
    (when-not (and (number? (:bytes size)) (<= (:rows size) 96) (<= (:bytes size) 65536))
      (throw (ex-info "Atomic bulk frame exceeds its row or byte limit" {:code "BulkFrameTooLarge" :status 413})))))

(defn mono-ms [] (/ (double (System/nanoTime)) 1000000.0))
(def stage-clock (= "1" (System/getenv "TX2_GROUP_STAGE_CLOCK")))
(def reuse-prepared (= "1" (System/getenv "TX2_GROUP_REUSE_PREPARED")))
(def fast-reply (= "1" (System/getenv "TX2_GROUP_FAST_REPLY")))
(def reply-clock (= "1" (System/getenv "TX2_GROUP_REPLY_CLOCK")))
(def prepare-window
  (case (or (System/getenv "TX2_PREPARE_WINDOW") "off")
    "off" :off "prepare" :prepare "two" :two
    (throw (IllegalArgumentException. "Invalid TX2_PREPARE_WINDOW"))))
(def batch-limit (policy/limit "TX2_GROUP_MAX_MEMBERS" 8 128))
(def pending-limit 256)
(def max-live-turns 8)
(def executor (Executors/newCachedThreadPool
  (reify ThreadFactory (newThread [_ r] (doto (Thread. r "triplex-group-writer") (.setDaemon true))))))
(def lanes (WeakHashMap.))
(defn lane-for [conn]
  (locking lanes (or (.get lanes conn)
    (let [lane (atom {:active false :queue [] :accounts [] :tails {}})] (.put lanes conn lane) lane))))
(def group-schema
  [(schema/attr :triplex.group/position :db.type/long :db.unique/value)
   (schema/attr :triplex.group/physical :db.type/ref)
   (assoc (schema/attr :triplex.group/members :db.type/ref) :db/cardinality :db.cardinality/many)
   (assoc (schema/attr :triplex.group/touched :db.type/ref) :db/cardinality :db.cardinality/many)])
(def guard '(if (= expected (d/basis-t db)) ops (throw (ex-info "TRIPLEX_GROUP_STALE" {:triplex.group/stale true}))))
(defn install! [conn db]
  (let [ops (concat
              (when (and (grouping?) (not (d/entid db :triplex.group/apply-v1)))
                (conj group-schema {:db/ident :triplex.group/apply-v1
                  :db/fn (d/function {:lang :clojure :params '[db expected ops] :requires '[[datomic.api :as d]] :code guard})}))
              (when (and queue-clock (not (d/entid db :triplex.diagnostic/queue-clock)))
                [(schema/attr :triplex.diagnostic/native-entry :db.type/string)
                 {:db/ident :triplex.diagnostic/queue-clock :db/fn (d/function {:lang :clojure :params '[db sent]
                    :code '(vector [:db/add "datomic.tx" :triplex.diagnostic/native-entry
                                      (str sent "/" (System/currentTimeMillis))])})}]))]
    (let [ready (if (seq ops) (:db-after @(d/transact conn (vec ops))) db)]
      (if (grouping?) (prepared/install! conn ready) ready))))
(defn instrument [ops]
  ;; [DX-W1] Why: timestamp actual submission and native entry on the same host, before either real command function runs.
  ;; Rejected: counting the entire peer future as queue time, or recording speculative d/with evaluations.
  (if queue-clock (into [[:triplex.diagnostic/queue-clock (System/currentTimeMillis)]] ops) ops))
(defn v [db e a] (:v (first (d/datoms db :eavt e a))))
(defn receipt [db id]
  (when-let [e (d/entid db [:triplex.tx/operation-id id])]
    (let [grouped (and (d/entid db :triplex.group/physical) (v db e :triplex.group/physical))
          tx (or grouped e)]
      {:position (if grouped (v db e :triplex.group/position) (v db e :triplex.tx/position))
       :clock (ledger/clock db e) :t (d/tx->t tx)})))
(def receipt-attrs [:triplex.tx/operation-id :triplex.group/members :triplex.group/physical
                    :triplex.group/position :triplex.tx/recorded-at :triplex.tx/max-recorded-at
                    :triplex.tx/id :triplex.entity/id])
(defn report-receipts [{:keys [db-after tx-data]}]
  ;; [DX-W1] Why: the acknowledged native report already contains each member's durable bytes.
  ;; Rejected: one independent index lookup per reply, or publishing the speculative report.
  (let [t (d/basis-t db-after) physical (d/t->tx t)
        attrs (into {} (map #(vector (d/entid db-after %) %) receipt-attrs))
        members (volatile! []) values (java.util.HashMap.)]
    (doseq [^datomic.Datom x tx-data :let [a (attrs (.a x))] :when (and a (.added x) (= physical (.tx x)))]
      (let [e (.e x) value (.v x)]
        (if (= :triplex.group/members a)
          (when (= e physical) (vswap! members conj value))
          (.put values e (assoc (.get values e) a value)))))
    (into {} (keep (fn [e]
                     (let [v (.get values e)]
                       (when (and (= physical (:triplex.group/physical v)) (:triplex.tx/operation-id v))
                         [(:triplex.tx/operation-id v)
                          {:t t :position (:triplex.group/position v)
                           :clock (or (:triplex.tx/recorded-at v) (:triplex.tx/max-recorded-at v))
                           :id (or (:triplex.tx/id v) (:triplex.entity/id v))}])))) @members)))
(defn persisted-account [db owner]
  ;; [DX-W1] Why: existing shared scopes may keep the account as a fact on the subject.
  ;; Rejected: trusting an arbitrary label to obtain extra turns in the contended queue.
  (when-let [e (d/entid db [:triplex.entity/id owner])]
    (let [matches (into #{} (keep (fn [x] (let [r (lean/decode (:v x))]
                   (when (and (= ":subject/account" (:attribute r)) (= "string" (:value_type r))) (:value_string r)))))
                         (lean/live-texts db e))]
      (when (= 1 (count matches)) (first matches)))))
(defn classify [db p input]
  (let [journals (set (:journal-entities p))
        owners (set (keep #(when (map? %) (:triplex.entity/id %)) (:ops p)))
        authored (remove journals (or (:owners p) owners))
        ;; [DX-WFIX1] Why: the core reserves system entities within this verified database scope.
        ;; Rejected: assigning scope maintenance to a caller-supplied account (or removing its dependency keys).
        system? #(.startsWith ^String % "_triplex/")
        business (remove system? authored)
        hint (get input "groupAccount")
        accounts (set (map #(or (second (re-matches #"acct/([A-Za-z0-9_-]{1,64})/.+" %))
                                (when (:lean p) (persisted-account db %))) business))
        account (when (= 1 (count accounts)) (first accounts))]
    (when (and hint (seq business) (not= hint account))
      (throw (ex-info "Group account must match every business entity namespace" {:code "InvalidValue" :status 400 :write-policy true})))
    {:account (or account (if (and (seq authored) (empty? business)) :system :shared))
     :bulk (boolean (:bulk p))
     :subject (when (= 1 (count business)) (first business))
     :scope-barrier (and policy/priority? (:scope-wide p) (some? (:source p)))
     :keys (set (concat (map #(vector :entity %) (concat owners (:entities p)))
                        (map #(vector :id %) (concat (:new-ids p) (:live p)))
                        [[:operation (get input "operationId")]]
                        (for [c (get input "claims")] [:command (get c "commandId")])
                        (when-let [c (get input "clientId")] [[:client c]])))}))
(defn eligible? [db p]
  (and (:lean p) (not (:slim-row p)) (= 1 (:span p)) (:assign-record-time p)
       (not (:position-irregular p)) (<= (count (:ops p)) 256)
       (= true (v db (:scope p) :triplex.scope/strict-record-clocks))
       (= 2 (v db (:scope p) :triplex.scope/head-version))
       (= true (v db (:scope p) :triplex.scope/position-regular))
       (not (v db (:scope p) :triplex.scope/irregular)) (d/entid db :triplex.group/apply-v1)))

(defn evaluate [db entries]
  ;; [DX-W1] Why: evaluate ordinary installed commands sequentially on immutable speculative databases, including duplicate/CAS checks.
  ;; Rejected: concatenated transaction functions (Datomic gives each function the original db-before).
  (loop [view db entries (seq entries) out []]
    (if-not entries out
      (let [entry (first entries)
            result (try
                     (let [started (when stage-clock (System/nanoTime))
                           data ((:prepare entry) view)
                           prepared (when stage-clock (System/nanoTime))
                           report (d/with view data)
                           applied (when stage-clock (System/nanoTime))
                           after (:db-after report) tx (d/t->tx (d/basis-t after))
                           id (v after tx :triplex.tx/id)]
                       (cond-> {:report report :tx tx :position (v after tx :triplex.tx/position)
                                :clock (ledger/clock after tx) :id (or id (v after tx :triplex.entity/id))
                                :merged-ledger (nil? id)}
                         stage-clock (assoc :prepare-micros (quot (- prepared started) 1000)
                                           :speculative-micros (quot (- applied prepared) 1000)
                                           :reused (if (identical? data (:original-data entry)) 1 0))))
                     (catch Exception e
                       (if (re-find #"TRIPLEX_CONFLICT|TRIPLEX_IDENTITY|TRIPLEX_CLOCK|TRIPLEX_(?:OPERATION|COMMAND)_DUPLICATE|:db.error/(?:unique-conflict|cas-failed)" (str e))
                         {:error e} (throw e))))]
        (recur (or (get-in result [:report :db-after]) view) (next entries) (conj out result))))))
(defn prefix [^String text] (subs text 0 (+ 5 (Integer/parseInt text 1 5 16))))
(defn materialize [base members]
  (let [last-tx (:tx (peek members))
        ;; Synthetic transaction and entity numbers cannot be published as durable references.
        ids (into {} (concat
          (for [m members eid (vals (:tempids (:report m)))
                :when (and (number? eid) (nil? (first (d/datoms base :eavt eid))))] [eid (str "w1/e/" eid)])
          (for [[i m] (map-indexed vector members)] [(:tx m) (if (= last-tx (:tx m)) "datomic.tx" (str "w1/m/" i))])))
        eid #(get ids % %)
        ref-type (d/entid base :db.type/ref)
        info (memoize (fn [a] [(d/ident base a) (= ref-type (v base a :db/valueType))]))
        net (java.util.LinkedHashMap.) born (volatile! #{}) retained (volatile! #{}) metadata (java.util.ArrayList.)]
    (doseq [{:keys [report tx position clock id merged-ledger]} members]
      (let [member (eid tx) datoms (:tx-data report)
            explicit (set (for [x datoms :when (and (:added x) (= :triplex.entity/retired (first (info (:a x)))))]
                            [(:e x) (prefix (:v x))]))]
        (doseq [op [[:db/add "datomic.tx" :triplex.group/members member]
                    [:db/add member :triplex.group/physical "datomic.tx"] [:db/add member :triplex.group/position position]]]
          (.add metadata op))
        (when merged-ledger
          (.add metadata [:db/add member :triplex.group/touched member])
          (when (not= tx last-tx)
            (.add metadata [:db/add member :triplex.tx/recorded-at clock])))
        (doseq [x datoms :let [[a ref?] (info (:a x)) e (:e x) value (:v x) add (:added x)
                                 k [(if (= a :triplex.tx/journals) "datomic.tx" (eid e)) a (if ref? (eid value) value)]]]
          (when (and (= a :triplex.entity/rev) add)
            (.add metadata [:db/add member :triplex.group/touched (eid e)]))
          (when-not (or (= a :db/txInstant)
                        (and (= e tx) (not= tx last-tx) (#{:triplex.tx/position :triplex.tx/max-recorded-at} a)))
            (if (= (get net k ::missing) (not add)) (.remove net k) (.put net k add)))
          (when (= a :triplex.entity/row)
            (if add (vswap! born conj k)
              (do
                ;; [DX-W1] Why: a physical add/remove pair cancels. Keep its assertion and explicit retirement so interior cuts and never-reuse survive.
                ;; Rejected: observing an old cut from the final live set alone.
                (when (@born k) (vswap! retained conj k))
                (when-not (explicit [e (prefix value)])
                  (.add metadata [:db/add (eid e) :triplex.entity/retired
                    (str (prefix value) (format "%016d" position) (format "%016x" (Double/doubleToRawLongBits (double clock))) id)]))))))))
    (into (vec metadata)
      (concat (for [[[e a value] add] net] [(if add :db/add :db/retract) e a value])
              (for [[e a value] @retained] [:db/add e a value])))))

(defn outcome-future [p]
  (let [unwrap (fn [r] (if-let [e (:error r)] (throw e) (:value r)))]
    (reify clojure.lang.IDeref (deref [_] (unwrap @p))
           clojure.lang.IBlockingDeref (deref [_ ms timeout]
             (let [r (deref p ms ::timeout)] (if (= r ::timeout) timeout (unwrap r)))))))
(defn complete! [entry r]
  (deliver (:result entry) (if-let [stats (and stage-clock (:prepared-stats entry))]
                             (cond-> r (:value r) (update :value assoc :prepared-stats stats)) r)))
(defn alone! [entry]
  (try
    ;; [DX-LOAD2] Why: the nonpreemptible interval starts at dispatch and ends when the peer future resolves.
    ;; Rejected: sizing a frame from its HTTP response or the time it spent waiting to be dispatched.
    (let [result @((:solo entry))
          timing (when load-timing {:start (/ (double (:dispatch entry)) 1000000.0) :end (mono-ms)})]
      (complete! entry {:value (cond-> (assoc result :group-size 1
                                          :bulk-grant (select-keys entry [:bulk :queued-at-grant :runnable-live])
                                          :group-wait-ns (- (:dispatch entry) (:arrived entry)))
                                 timing (assoc :serial-hold timing))}))
    (catch Exception e (complete! entry {:error e}))))
(defn definitive? [e]
  ;; [DX-W1] Why: only an authoritative refused transaction can be submitted again.
  ;; Rejected: searching a transport error's free text for a transaction-function marker.
  (some (fn [cause] (let [data (ex-data cause)]
          (or (true? (:triplex.group/stale data))
              (and (instance? clojure.lang.ExceptionInfo cause) (= "TRIPLEX_GROUP_STALE" (ex-message cause)))
              (contains? #{:db.error/unique-conflict :db.error/conflicting-datoms :db.error/cas-failed
                           :db.error/not-an-entity :db.error/invalid-data} (:db/error data)))))
        (take-while some? (iterate #(when % (ex-cause %)) e))))
(defn micros [start end] (quot (- end start) 1000))
(defn finish-group! [batch results report valid-count stages received-ms]
  (let [started (when reply-clock (System/nanoTime))
        db (:db-after report) t (d/basis-t db)
        indexed (when fast-reply (try (report-receipts report) (catch Exception _ {})))
        selected (when reply-clock (System/nanoTime))
        lookup-ns (when reply-clock (volatile! 0))]
    (doseq [[entry expected] (map vector batch results)]
      (if (:error expected)
        (complete! entry expected)
        (let [start (when reply-clock (System/nanoTime))
              saved (if fast-reply (get indexed (:id entry))
                      (try (receipt db (:id entry)) (catch Exception _ nil)))]
          (when reply-clock (vswap! lookup-ns + (- (System/nanoTime) start)))
          (if (and (= (:position saved) (:position expected)) (= (:clock saved) (:clock expected))
                   (= (:t saved) t) (or (not fast-reply) (= (:id saved) (:id expected))))
            (complete! entry {:value (cond-> (assoc report :member saved :group-size valid-count
                                                :bulk-grant (select-keys entry [:bulk :queued-at-grant :runnable-live])
                                                :group-wait-ns (- (:dispatch entry) (:arrived entry)))
                                      stages (assoc :group-stages stages))})
            (complete! entry {:error (ex-info "Durable member receipt unavailable" {:status 503 :code "OutcomeUnknown"})})))))
    (when reply-clock
      (let [done (System/nanoTime)]
        (println (str "W1_REPLY " t " " valid-count " " received-ms " "
                      (+ (micros started selected) (quot @lookup-ns 1000)) " " (micros started done)))))))
(defn unknown! [batch error]
  (doseq [entry batch]
    (complete! entry {:error (ex-info "Group durability is unknown" {:status 503 :code "OutcomeUnknown"} error)})))
(defn send! [conn tx-data]
  (let [data (instrument tx-data)]
    (if stage-clock (d/transact-async conn data :io-context :w1/grouped)
      (d/transact-async conn data))))
(defn receive! [future]
  (let [report @future]
    {:report report :received-ms (when reply-clock (System/currentTimeMillis))}))
(defn execute-reference! [conn batch]
  (if (or (= 1 (count batch)) (not-every? :eligible batch))
    (doseq [e batch] (alone! e))
    (let [started (when stage-clock (System/nanoTime))
          base (d/db conn)
          results (when (every? #(eligible? base (:params %)) batch)
                    (try (evaluate base batch) (catch Exception _ nil)))
          evaluated (when stage-clock (System/nanoTime))
          valid (vec (remove :error results))
          data (when (seq valid) (try (materialize base valid) (catch Exception _ nil)))]
      (if-not data
        (doseq [e batch] (alone! e))
        (let [prepared (when stage-clock (System/nanoTime))
              physical (try (receive! (send! conn [[:triplex.group/apply-v1 (d/basis-t base) data]]))
                            (catch Exception e {:error e}))
              stages (when stage-clock
                       {:evaluateMicros (quot (- evaluated started) 1000)
                        :prepareMicros (reduce + (map :prepare-micros valid))
                        :speculativeMicros (reduce + (map :speculative-micros valid))
                        :reused (reduce + (map :reused valid))
                        :materializeMicros (quot (- prepared evaluated) 1000)
                        :awaitMicros (quot (- (System/nanoTime) prepared) 1000)})]
          (if-let [e (:error physical)]
            (if (definitive? e) (doseq [entry batch] (alone! entry))
              (unknown! batch e))
            (finish-group! batch results (:report physical) (count valid) stages (:received-ms physical))))))))

(defn preparable? [batch]
  (and prepared/enabled (< 1 (count batch)) (every? :eligible batch) (prepared/disjoint? batch)))
(defn drafted [batch]
  (mapv #(when-let [pending (:draft %)] (deref pending 0 nil)) batch))
(defn ready-drafts [batch]
  (when (preparable? batch)
    (let [drafts (drafted batch)]
      (when (every? some? drafts) drafts))))
(defn mark-prepared [batch stats]
  (if stage-clock (mapv #(assoc % :prepared-stats stats) batch) batch))
(defn assemble [batch drafts head & [certificate]]
  (try (when-let [plan (prepared/assemble batch drafts head certificate)]
         (assoc plan :rendered-ns (when stage-clock (str (System/nanoTime)))))
       (catch Exception _ nil)))
(defn plan [conn batch]
  (if (and prepared/basis-enabled (preparable? batch))
    (let [db (d/db conn)]
      (try (when-let [certificate (prepared/certify db batch (drafted batch))]
             (assemble batch (:drafts certificate) (prepared/head db) certificate))
           (catch Exception _ nil)))
    (when-let [drafts (ready-drafts batch)]
      (assemble batch drafts (prepared/head (d/db conn))))))
(defn start-prepared! [conn plan]
  (let [sent (when stage-clock (str (System/nanoTime)))]
    (merge plan {:submitted-ns sent}
           (try {:future (send! conn (:data plan))} (catch Exception e {:error e})))))
(defn finish-prepared! [conn batch plan]
  (let [physical (if-let [error (:error plan)] {:error error}
                   (try (receive! (:future plan)) (catch Exception e {:error e})))
        stats (when stage-clock
                {:submittedNs (:submitted-ns plan) :renderedNs (:rendered-ns plan)
                 :guard (:guard plan) :history (:history plan)
                 :afterOperation (:after-operation plan) :observedNs (str (System/nanoTime))})]
    (if-let [error (:error physical)]
      ;; [DX-PREP1] Why: re-evaluate at the authoritative cut after a definite rejection.
      ;; Rejected: retrying a write whose lost response could hide a successful durable append.
      (do (if (definitive? error)
            (execute-reference! conn (mark-prepared batch (assoc stats :path "reference" :replays 1)))
            (unknown! batch error))
          false)
      (do (finish-group! (mark-prepared batch (assoc stats :path "prepared" :replays 0))
                         (:results plan) (:report physical) (count batch) nil (:received-ms physical))
          true))))
(defn execute! [conn batch]
  (if-let [candidate (plan conn batch)]
    (finish-prepared! conn batch (start-prepared! conn candidate))
    (execute-reference! conn batch)))

(defn next-entry
  ([state] (next-entry state realized?))
  ([{:keys [queue accounts rotation live-turns]} ready?]
   (let [ready (fn [owners rank]
                 (some (fn [account]
                         (some #(when (and (= account (:account %)) (or (nil? rank) (= rank (:rank %)))
                                           (every? ready? (:predecessors %))) %) queue)) owners))]
     (if policy/priority?
       (or (when (>= (or live-turns 0) max-live-turns) (ready (:bulk rotation) :bulk))
           (ready (:live rotation) :live) (ready (:bulk rotation) :bulk))
       (ready accounts nil)))))
(defn rotate [owners account more?]
  (cond-> (filterv #(not= account %) owners) more? (conj account)))
(defn join-turn [owners account]
  (if (some #{account} owners) owners (conj (or owners []) account)))
(defn preview-batch [state]
  (loop [{:keys [queue accounts tails] :as state} state out [] selected #{} variable 0]
    (if (or (empty? queue) (= (count out) batch-limit)) [state out]
      (let [ready? #(or (contains? selected %) (realized? %))
            live (when (and bulk-priority (not policy/priority?))
                   (some (fn [account]
                           (some (fn [e] (when (and (= account (:account e)) (not (:bulk e))
                                                   (every? ready? (:predecessors e))) e)) queue))
                         accounts))
            next (or live (next-entry state ready?)) _ (assert next "Oldest pending command must be eligible")
            first-member (first out)
            ;; [DX-W1] Why: combine already waiting edits of this subject across independent work in the same account.
            ;; Rejected: two physical turns before the next account or jumping a sender, subject, claim or scope predecessor.
            entry (if (and policy/field-only? first-member (:subject first-member) (= (:rank next) (:rank first-member)))
                    (or (first (filter #(and (= (:account %) (:account first-member)) (= (:rank %) (:rank first-member))
                                             (= (:subject %) (:subject first-member)) (:eligible %)
                                             (every? ready? (:predecessors %))) queue)) next) next)
            a (:account entry) rank (:rank entry)
            priced (+ variable (or (:variable-us entry) 0))
            solo (or (not (:eligible entry))
                     (and (or policy/priority? policy/budget-us) (or (= rank :bulk) (not (grouping?)))))]
        (if (and (seq out)
                 (or solo (not (policy/fits? priced)) (and policy/field-only?
                               (or (nil? (:subject entry)) (not= (:subject entry) (:subject first-member))
                                   (not= a (:account first-member)))))) [state out]
          (let [others (filterv #(not (identical? % entry)) queue)
                same? #(= a (:account %))
                remaining (reduce (fn [m k] (if (identical? (:token entry) (get m k)) (dissoc m k) m)) tails (:keys entry))
                s (cond-> (assoc state :queue others :tails remaining :accounts (rotate accounts a (some same? others)))
                    policy/priority? (update-in [:rotation rank] rotate a (some #(and (same? %) (= rank (:rank %))) others)))
                taken (conj out (assoc entry :queued-at-grant (count queue) :runnable-live (boolean live)))]
            (if solo [s taken] (recur s taken (conj selected (:token entry)) priced))))))))
(defn preview [state]
  (let [[next batch] (preview-batch state)]
    ;; [DX-W1] Why: count each admitted physical turn once, including a pre-rendered or pipelined live group.
    ;; Rejected: letting early reservation bypass the bounded bulk grant.
    [(if (and policy/priority? (seq batch))
       (if (= :bulk (:rank (first batch))) (assoc next :live-turns 0)
         (update next :live-turns #(min max-live-turns (inc (or % 0)))))
       next)
     batch]))
(defn admit [batch]
  (mapv (fn [entry] (deliver (:token entry) true) (assoc entry :dispatch (System/nanoTime))) batch))
(defn choose [state]
  (let [[remaining batch] (preview state)]
    [remaining (admit batch)]))
(defn reserve-overlap! [lane current]
  (locking lane
    (let [[remaining next] (preview @lane)]
      (when-let [drafts (and (prepared/disjoint? (concat current next)) (ready-drafts next))]
        (reset! lane remaining)
        {:batch (admit next) :drafts drafts}))))
(defn execute-window! [conn lane batch]
  ;; [DX-PREP1] Why: reserve only ready and dependency-disjoint live members, then render against the first group's exact proposed head.
  ;; Rejected: whole-basis blind submissions or sending another group that depends on unsettled subject or sender state.
  (if-let [first-plan (plan conn batch)]
    (let [first-started (start-prepared! conn first-plan)
          next (when (:future first-started) (reserve-overlap! lane batch))
          candidate (when next
                      (when-let [p (assemble (:batch next) (:drafts next) (:next-head first-plan))]
                        (assoc p :after-operation (peek (:next-head first-plan)))))
          second-started (when (and candidate (= :two prepare-window)) (start-prepared! conn candidate))]
      (try
        (let [first-ok (finish-prepared! conn batch first-started)]
          (when-let [entries (:batch next)]
            (cond
              second-started (finish-prepared! conn entries second-started)
              (and candidate first-ok) (finish-prepared! conn entries (start-prepared! conn candidate))
              :else (execute! conn entries))))
        (catch Throwable error
          (unknown! (concat batch (:batch next)) error))))
    (execute-reference! conn batch)))
(defn submit! [conn entry]
  (let [entry (merge {:rank :live} entry) lane (lane-for conn) p (promise) token (promise)
        launch (locking lane
                 (let [{:keys [active queue tails]} @lane]
                   (when (or (>= (count queue) pending-limit)
                             (and policy/priority? (= :bulk (:rank entry)) (>= (count (filter #(= :bulk (:rank %)) queue)) 64)) (>= (count (filter #(= (:account %) (:account entry)) queue)) 128))
                     (throw (ex-info "Account write queue full" {:status 429 :code "WriteQueueFull"})))
                   (let [draft (when (and prepared/enabled active (:eligible entry) (= :live (:rank entry)) (:data entry))
                                 (prepared/schedule! conn entry))
                         e (assoc entry :result p :token token :arrived (System/nanoTime) :draft draft
                                        :predecessors (vec (distinct (concat (keep tails (:keys entry))
                                          (when (:scope-barrier entry) (map :token queue))
                                          (when-let [b (:barrier @lane)] [b])))))]
                     (if active
                       (do (swap! lane (fn [s] (-> s (update :queue conj e)
                         (update :accounts join-turn (:account e))
                         (cond-> policy/priority? (update-in [:rotation (:rank e)] join-turn (:account e))
                                 (:scope-barrier e) (assoc :barrier token))
                         (update :tails into (map #(vector % token) (:keys e)))))) nil)
                       (do (swap! lane assoc :active true) (deliver token true) [(assoc e :dispatch (System/nanoTime) :queued-at-grant 0 :runnable-live false)])))))]
    (when launch
      (.execute executor (fn []
        (loop [batch launch]
          ;; [DX-PREP1] Why: the next certified batch must actually observe the first native append.
          ;; Rejected: guessing the next physical basis for a second native submission.
          (try (if (and prepared/enabled (not prepared/basis-enabled) (not= :off prepare-window))
                 (execute-window! conn lane batch)
                 (execute! conn batch))
               (catch Throwable t (doseq [e batch] (complete! e {:error t}))))
          (when-let [next-batch (locking lane
                                 (if (empty? (:queue @lane)) (do (swap! lane assoc :active false :live-turns 0) nil)
                                   (let [[s taken] (choose @lane)] (reset! lane s) taken)))]
            (recur next-batch))))))
    (outcome-future p)))
