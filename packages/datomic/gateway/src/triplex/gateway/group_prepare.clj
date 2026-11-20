(ns triplex.gateway.group-prepare
  (:require [datomic.api :as d]
            [triplex.gateway.commit :as commit]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.scope :as scope])
  (:import [java.util.concurrent ArrayBlockingQueue RejectedExecutionException ThreadFactory ThreadPoolExecutor TimeUnit]))

(def enabled (= "1" (System/getenv "TX2_PARALLEL_PREPARE")))
(def guard-ident :triplex.group/apply-prepared-v2)
(def guard-code
  '(letfn [(datom [e a] (when e (first (d/datoms db :eavt e a))))
           (v [e a] (:v (datom e a)))
           (lookup [id] (d/entid db [:triplex.entity/id id]))
           (seek [e a ^String prefix]
             (let [x (first (d/seek-datoms db :eavt e a prefix))]
               (when (and (= e (:e x)) (= (d/entid db a) (:a x))
                          (.startsWith ^String (:v x) prefix)) (:v x))))
           (expect [ok]
             (when-not ok (throw (ex-info "TRIPLEX_GROUP_STALE" {:triplex.group/stale true}))))]
     (let [scope (get witness :scope)
           tx (d/t->tx (d/basis-t db))
           newest (if (v tx :triplex.tx/position) tx
                    (let [x (first (d/rseek-datoms db :aevt :triplex.tx/position tx))]
                      (when (= (:a x) (d/entid db :triplex.tx/position)) (:e x))))
           clock (v newest :triplex.tx/max-recorded-at)
           historical (d/history db)]
       (doseq [member (get witness :members)]
         (when (d/entid db [:triplex.tx/operation-id (get member :operation)])
           (throw (ex-info "TRIPLEX_OPERATION_DUPLICATE" {})))
         (when (d/entid db [:triplex.claim/command-id (get member :command)])
           (throw (ex-info "TRIPLEX_COMMAND_DUPLICATE" {}))))
       (doseq [[a expected] (get witness :flags)] (expect (= expected (v scope a))))
       (expect (= (get witness :head)
                  [(or (v newest :triplex.tx/position) 0)
                   (when clock (Double/doubleToRawLongBits (double clock)))
                   (v newest :triplex.tx/operation-id)]))
       (doseq [member (get witness :members)]
         (let [[ident fn-tx] (get member :function)]
           (expect (= fn-tx (:tx (datom (d/entid db ident) :db/fn)))))
         (doseq [[id eid rev] (get member :entities)]
           (expect (and (= eid (lookup id)) (= rev (v eid :triplex.entity/rev)))))
         (doseq [[eid prefix text] (get member :retirements)]
           (expect (and (= text (seek eid :triplex.entity/row prefix))
                        (nil? (seek eid :triplex.entity/retired prefix)))))
         (doseq [^String prefix (get member :new-prefixes)]
           (let [old (first (d/index-range historical :triplex.entity/row prefix nil))]
             (expect (not (and old (.startsWith ^String (:v old) prefix))))))
         (expect (nil? (lookup (get member :journal)))))
       ops)))

(defn install! [conn db]
  (if (and enabled (not (d/entid db guard-ident)))
    (:db-after @(d/transact conn [{:db/ident guard-ident
                                  :db/fn (d/function {:lang :clojure :params '[db witness ops]
                                                     :requires '[[datomic.api :as d]]
                                                     :code guard-code})}]))
    db))

(def flags [:triplex.scope/key :triplex.scope/schema-hash :triplex.scope/commit-fn-hash
            :triplex.scope/rows-version :triplex.scope/head-version :triplex.scope/feed-version
            :triplex.scope/feed-irregular :triplex.scope/strict-record-clocks
            :triplex.scope/position-regular :triplex.scope/irregular :triplex.scope/packed-journals])
(defn scope-flags [db eid] (mapv #(vector % (scope/value db eid %)) flags))
(defn head [db]
  (let [latest (scope/newest-commit db)
        value #(when latest (scope/value db latest %))]
    [(or (value :triplex.tx/position) 0) (value :triplex.tx/max-recorded-at) (value :triplex.tx/operation-id)]))
(defn head-witness [[p clock id]]
  [p (when clock (Double/doubleToRawLongBits (double clock))) id])

(defn row-id [op]
  (let [^String text (second (nth op 3))]
    (subs text 5 (+ 5 (Integer/parseInt text 1 5 16)))))
(defn small-op? [op]
  (if (map? op)
    (contains? #{#{:db/id :triplex.entity/id}
                 #{:db/id :triplex.claim/command-id :triplex.claim/tx :triplex.claim/tx-id}
                 #{:db/id :triplex.tx/position :triplex.tx/operation-id :triplex.tx/id :triplex.tx/recorded-at}}
               (set (keys op)))
    (case (first op)
      (:triplex/assert :triplex/retract) true
      :db/add (contains? #{:triplex.entity/rev :triplex.tx/journals :triplex.journal/position} (nth op 2))
      false)))
(defn retire [db owner [kind _ id]]
  (when-let [row (lean/by-id db id)]
    (let [prefix (lean/prefix id)
          marker (first (d/seek-datoms db :eavt owner :triplex.entity/retired prefix))]
      (when (and (= kind :triplex/retract) (= owner (:e row))
                 (not (and (= owner (:e marker)) (= (d/entid db :triplex.entity/retired) (:a marker))
                           (.startsWith ^String (:v marker) prefix))))
        [owner prefix (:v row)]))))

(defn draft [db {:keys [data subject]}]
  (let [[ident p] (first data)
        {:keys [scope source entities live ops new-ids times record-clocks journal-entities provisional]} p
        journal (first journal-entities)
        fn-tx (:tx (first (d/datoms db :eavt (d/entid db ident) :db/fn)))]
    ;; [DX-PREP1] Why: represent every read of the regular field-save transaction with a native witness.
    ;; Rejected: generalizing the guard to scope predicates, imports or irregular journals without a read-set proof.
    (when (and subject (re-matches #"acct/[A-Za-z0-9_-]{1,64}/.+" subject)
               (:lean p) (not (:slim-row p)) (= 1 (:span p)) (:assign-record-time p)
               (not (:scope-wide p)) (not (:position-irregular p)) (not (:irregular p))
               (not (:identity-bounds p))
               (not-any? p [:save-ledger :packed-journal])
               (<= (count ops) 256)
               (#{:triplex/commit (first (commit/variants [true false]))} ident) fn-tx
               (= 1 (count journal-entities)) (every? small-op? ops))
      (let [signature (scope-flags db scope)
            by-flag (into {} signature)
            lookup #(d/entid db [:triplex.entity/id %])
            owner (lookup subject)
            entity-ids (into #{subject} entities)
            revisions (mapv (fn [id] (let [eid (lookup id)]
                                       [id eid (when eid (scope/value db eid :triplex.entity/rev))])) entity-ids)
            maps (filter map? ops)
            claims (filter :triplex.claim/command-id maps)
            upserts (into #{} (keep :triplex.entity/id) maps)
            retired (filterv #(and (vector? %) (= :triplex/retract (first %))) ops)
            asserted (filter #(and (vector? %) (= :triplex/assert (first %))) ops)
            clocks (concat times record-clocks)]
        (when (and (some? (:triplex.scope/key by-flag)) owner
                   (= commit/source-hash (:triplex.scope/commit-fn-hash by-flag))
                   (not (:triplex.scope/packed-journals by-flag))
                   (= 3 (:triplex.scope/rows-version by-flag)) (= 2 (:triplex.scope/head-version by-flag))
                   (= true (:triplex.scope/strict-record-clocks by-flag)) (= true (:triplex.scope/position-regular by-flag))
                   (= 2 (:triplex.scope/feed-version by-flag)) (not (:triplex.scope/feed-irregular by-flag))
                   (not (:triplex.scope/irregular by-flag))
                   (= #{subject journal} upserts) (not (lookup journal))
                   (= 1 (count claims)) (= journal (:triplex.claim/tx-id (first claims)))
                   (= (count asserted) (count new-ids)) (= (set new-ids) (into #{} (map row-id) asserted))
                   (= (count retired) (count live)) (= (set live) (into #{} (map #(nth % 2)) retired))
                   (every? #(= subject (second %)) retired)
                   (every? (fn [[id _ rev]] (or (nil? source) (not (contains? (set entities) id))
                                                 (<= (or rev 0) source))) revisions)
                   (seq clocks) (every? #(and (number? %) (Double/isFinite (double %))) clocks))
          (let [retirements (mapv #(retire db owner %) retired)]
            (when (every? some? retirements)
              {:scope scope :flags signature :provisional provisional :operations ops
               :new-ids (set new-ids) :submitted-clock (reduce max (map double clocks))
               :id (:triplex.tx/id (first ops)) :operation (:triplex.tx/operation-id (first ops))
               :retirement-times (into {} (map (fn [[_ prefix text]]
                                                  [(subs prefix 5) (commit/recorded-row text)]))
                                       retirements)
               :witness {:operation (:triplex.tx/operation-id (first ops))
                         :command (:triplex.claim/command-id (first claims))
                         :function [ident fn-tx] :entities revisions
                         :journal journal :retirements retirements :new-prefixes (mapv lean/prefix new-ids)}})))))))

(def executor
  (let [threads (max 2 (min 4 (.availableProcessors (Runtime/getRuntime))))]
    (ThreadPoolExecutor. threads threads 0 TimeUnit/SECONDS (ArrayBlockingQueue. 256)
      (reify ThreadFactory (newThread [_ f] (doto (Thread. f "triplex-prepare") (.setDaemon true)))))))
(defn schedule! [conn entry]
  (let [result (promise)]
    (try
      (.execute executor (fn []
                           (try (deliver result (draft (d/db conn) entry))
                                (catch Exception _ (deliver result nil)))))
      result
      (catch RejectedExecutionException _ nil))))

(defn assign-clock [prior submitted]
  (if prior (max submitted (+ (double prior) 1.0) (Math/nextUp (double prior))) submitted))
(defn render [{:keys [id operations provisional new-ids witness retirement-times]} member position clock]
  (let [physical "datomic.tx"
        stamp (commit/stamp true clock new-ids (dec provisional) provisional position false retirement-times)
        old (into {} (map (fn [[eid prefix text]] [prefix [eid text]]) (:retirements witness)))
        tx-metadata [[:db/add physical :triplex.group/members member]
                     [:db/add member :triplex.group/physical physical]
                     [:db/add member :triplex.group/position position]]]
    (into tx-metadata
      (mapcat
        (fn [op]
          (if (map? op)
            [(stamp (cond
                      (= physical (:db/id op)) (cond-> (assoc op :db/id member)
                                                (not= physical member) (dissoc :triplex.tx/position))
                      (:triplex.claim/command-id op) (assoc op :triplex.claim/tx member)
                      :else op))]
            (case (first op)
              :triplex/assert [(stamp (assoc op 0 :db/add))]
              :triplex/retract (let [prefix (lean/prefix (nth op 2)) [eid text] (old prefix)]
                                 [[:db/retract eid :triplex.entity/row text]
                                  [:db/add eid :triplex.entity/retired
                                   (str prefix (format "%016d" position)
                                        (format "%016x" (Double/doubleToRawLongBits (double clock))) id)]])
              :db/add (cond-> [(stamp op)]
                        (= :triplex.entity/rev (nth op 2)) (conj [:db/add member :triplex.group/touched (second op)])))))
        operations))))

(defn disjoint? [batch]
  (loop [keys #{} entries (seq batch)]
    (if-let [entry (first entries)]
      (let [more (:keys entry)]
        (when-not (some keys more) (recur (into keys more) (next entries))))
      true)))
(defn assemble [entries drafts starting-head]
  (let [[position clock] starting-head
        scope (:scope (first drafts)) signature (:flags (first drafts))]
    (when (and (<= (+ position (count drafts)) 9007199254740991)
               (every? #(= [scope signature] [(:scope %) (:flags %)]) drafts))
      (let [clocks (rest (reductions assign-clock clock (map :submitted-clock drafts)))]
        (when (every? #(Double/isFinite (double %)) clocks)
          (let [positions (range (inc position) (+ position 1 (count drafts)))
                members (concat (map #(str "prep1/m/" %) (range (dec (count drafts)))) ["datomic.tx"])
                data (into [[:db/add "datomic.tx" :triplex.tx/max-recorded-at (last clocks)]]
                           (mapcat render drafts members positions clocks))
                witness {:scope scope :flags signature :head (head-witness starting-head)
                         :members (mapv :witness drafts)}]
            {:data [[guard-ident witness data]]
             :results (mapv (fn [draft p c] {:id (:id draft) :position p :clock c}) drafts positions clocks)
             :next-head [(last positions) (last clocks) (:id (peek entries))]}))))))
