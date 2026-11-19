(ns triplex.gateway.group
  (:require [datomic.api :as d] [triplex.gateway.schema :as schema] [triplex.gateway.lean :as lean])
  (:import [java.util WeakHashMap] [java.util.concurrent Executors ThreadFactory]))

;; [DX-W1] Why: an idle scope dispatches immediately; only work accumulated behind an in-flight append can share its successor.
;; Rejected: a collection timer or an unbounded burst queue.
(def enabled (= "1" (System/getenv "TX2_GROUP_COMMIT")))
(def queue-clock (= "1" (System/getenv "TX2_GROUP_QUEUE_CLOCK")))
(def batch-limit 8)
(def pending-limit 256)
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
              (when (and enabled (not (d/entid db :triplex.group/apply-v1)))
                (conj group-schema {:db/ident :triplex.group/apply-v1
                  :db/fn (d/function {:lang :clojure :params '[db expected ops] :requires '[[datomic.api :as d]] :code guard})}))
              (when (and queue-clock (not (d/entid db :triplex.diagnostic/queue-clock)))
                [(schema/attr :triplex.diagnostic/native-entry :db.type/string)
                 {:db/ident :triplex.diagnostic/queue-clock :db/fn (d/function {:lang :clojure :params '[db sent]
                    :code '(vector [:db/add "datomic.tx" :triplex.diagnostic/native-entry
                                      (str sent "/" (System/currentTimeMillis))])})}]))]
    (if (seq ops) (:db-after @(d/transact conn (vec ops))) db)))
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
       :clock (v db e :triplex.tx/recorded-at) :t (d/tx->t tx)})))
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
        business (remove journals owners)
        hint (get input "groupAccount")
        accounts (set (map #(or (second (re-matches #"acct/([A-Za-z0-9_-]{1,64})/.+" %))
                                (when (and hint (:lean p)) (persisted-account db %))) business))
        account (when (= 1 (count accounts)) (first accounts))]
    (when (and hint (seq business) (not= hint account))
      (throw (ex-info "Group account must match every business entity namespace" {:code "InvalidValue" :status 400})))
    {:account (or account :shared)
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
                     (when (d/entid view [:triplex.tx/operation-id (:id entry)])
                       (throw (ex-info "triplex.tx/operation-id already committed" {})))
                     (let [report (d/with view ((:prepare entry) view))
                           after (:db-after report) tx (d/t->tx (d/basis-t after))]
                       {:report report :tx tx :position (v after tx :triplex.tx/position)
                        :clock (v after tx :triplex.tx/recorded-at) :id (v after tx :triplex.tx/id)})
                     (catch Exception e
                       (if (re-find #"TRIPLEX_CONFLICT|TRIPLEX_IDENTITY|TRIPLEX_CLOCK|:db.error/(?:unique-conflict|cas-failed)|triplex.tx/operation-id already committed" (str e))
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
    (doseq [{:keys [report tx position clock id]} members]
      (let [member (eid tx) datoms (:tx-data report)
            explicit (set (for [x datoms :when (and (:added x) (= :triplex.entity/retired (first (info (:a x)))))]
                            [(:e x) (prefix (:v x))]))]
        (doseq [op [[:db/add "datomic.tx" :triplex.group/members member]
                    [:db/add member :triplex.group/physical "datomic.tx"] [:db/add member :triplex.group/position position]]]
          (.add metadata op))
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
(defn complete! [entry r] (deliver (:result entry) r))
(defn alone! [entry]
  (try (complete! entry {:value (assoc @((:solo entry)) :group-size 1 :group-wait-ns (- (:dispatch entry) (:arrived entry)))})
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
(defn execute! [conn batch]
  (if (or (= 1 (count batch)) (not-every? :eligible batch))
    (doseq [e batch] (alone! e))
    (let [base (d/db conn)
          results (when (every? #(eligible? base (:params %)) batch)
                    (try (evaluate base batch) (catch Exception _ nil)))
          valid (vec (remove :error results))
          data (when (seq valid) (try (materialize base valid) (catch Exception _ nil)))]
      (if-not data
        (doseq [e batch] (alone! e))
        (let [physical (try {:report @(d/transact-async conn (instrument [[:triplex.group/apply-v1 (d/basis-t base) data]]))}
                            (catch Exception e {:error e}))]
          (if-let [e (:error physical)]
            (if (definitive? e) (doseq [entry batch] (alone! entry))
              (doseq [entry batch] (complete! entry {:error (ex-info "Group durability is unknown" {:status 503 :code "OutcomeUnknown"} e)})))
            (doseq [[entry result] (map vector batch results)]
              (if (:error result) (complete! entry result)
                (let [report (:report physical) saved (try (receipt (:db-after report) (:id entry)) (catch Exception _ nil))]
                  (if (and (= (:position saved) (:position result)) (= (:clock saved) (:clock result))
                           (= (:t saved) (d/basis-t (:db-after report))))
                    (complete! entry {:value (assoc report :member saved :group-size (count valid)
                                               :group-wait-ns (- (:dispatch entry) (:arrived entry)))})
                    (complete! entry {:error (ex-info "Durable member receipt unavailable" {:status 503 :code "OutcomeUnknown"})})))))))))))

(defn choose [state]
  (loop [{:keys [queue accounts tails] :as state} state out []]
    (if (or (empty? queue) (= (count out) batch-limit)) [state out]
      (let [candidate (some (fn [account]
                       (let [entry (first (filter #(= account (:account %)) queue))]
                         (when (and entry (every? realized? (:predecessors entry))) entry))) accounts)
            _ (assert candidate "A pending scope must have an eligible oldest entry")]
        (if (and (seq out) (not (:eligible candidate))) [state out]
          (let [others (filterv #(not (identical? % candidate)) queue) a (:account candidate)
                accounts (cond-> (filterv #(not= a %) accounts) (some #(= a (:account %)) others) (conj a))
                tails (reduce (fn [m k] (if (identical? (:token candidate) (get m k)) (dissoc m k) m)) tails (:keys candidate))
                s (assoc state :queue others :accounts accounts :tails tails)
                selected (conj out (assoc candidate :dispatch (System/nanoTime)))]
            (deliver (:token candidate) true)
            (if (:eligible candidate) (recur s selected) [s selected])))))))
(defn submit! [conn entry]
  (let [lane (lane-for conn) p (promise) token (promise)
        launch (locking lane
                 (let [{:keys [active queue tails]} @lane]
                   (when (or (>= (count queue) pending-limit) (>= (count (filter #(= (:account %) (:account entry)) queue)) 128))
                     (throw (ex-info "Account write queue full" {:status 429 :code "WriteQueueFull"})))
                   (let [e (assoc entry :result p :token token :arrived (System/nanoTime)
                                        :predecessors (vec (keep tails (:keys entry))))]
                     (if active
                       (do (swap! lane (fn [s] (-> s (update :queue conj e)
                         (update :accounts #(if (some #{(:account e)} %) % (conj % (:account e))))
                         (update :tails into (map #(vector % token) (:keys e)))))) nil)
                       (do (swap! lane assoc :active true) (deliver token true) [(assoc e :dispatch (System/nanoTime))])))))]
    (when launch
      (.execute executor (fn []
        (loop [batch launch]
          (try (execute! conn batch)
               (catch Throwable t (doseq [e batch] (complete! e {:error t}))))
          (when-let [next-batch (locking lane
                                 (if (empty? (:queue @lane)) (do (swap! lane assoc :active false) nil)
                                   (let [[s taken] (choose @lane)] (reset! lane s) taken)))]
            (recur next-batch))))))
    (outcome-future p)))
