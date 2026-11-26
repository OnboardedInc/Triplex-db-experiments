(ns rd7-audit
  "[DX-RD7] The writers' audit for the two pinned-read options, as a standing gate (rd6/REVIEW-1.md, condition 1).
  The rule is the review's `audit` (rd6/attacks.clj) unchanged; this file adds the verdict, the named exceptions, a
  check that removal on request retracts nothing of a subject, a PostgreSQL entry point and the two planted breaks
  that prove the gate fails. It needs only datomic.api and clojure.data.json, so it runs as a peer of any database a
  gate has just written: in memory inside the gate's JVM (rd7/harness.clj hooks every scope), or against a PostgreSQL
  stack (prep1/stack.sh runs it after the production gate's driver).

  The gate fails on
   (a) any transaction that retracts a datom of a subject (an entity that has ever had :triplex.entity/id) without
       asserting anything on that subject other than an index entry (:triplex.ix/entry): the case the short-cut's rule
       (TX2_PINNED_SHORTCUT) cannot see, and the one the reach route's parsed-entity cache relies on with every option off;
   (b) any retraction or repeat of a grouped-save position (:triplex.group/position): the case the cut lookup
       (TX2_PINNED_CUT_LOOKUP) relies on;
   (c) any removal-on-request transaction that retracts a datom of a subject (the second exception below depends on it).

  Allowed exceptions, in the review's sentences (rd6/REVIEW-1.md, What held):
   1. \"The only retraction with no other datom on a subject is the index backfill's reconciliation of an index entry,
      which no row answer contains.\" Counted as indexOnlyRetractions; never a failure.
   2. \"Removal on request retracts nothing of the subject, and the removed value is masked at every pin on every option
      set.\" It needs no exception from (a); (c) checks that it stays so."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]))

(def exceptions
  ["the index backfill's reconciliation of an index entry, which no row answer contains (indexOnlyRetractions)"
   "removal on request retracts nothing of the subject (removalSubjectRetractions must be 0)"])

(defn audit
  "The review's audit (rd6/attacks.clj `audit`, the same rule and the same counts), plus removal transactions: every
  transaction in the log; entities with a retraction and no assertion other than an index entry in the same
  transaction, split by whether the entity is a subject; every grouped-save position retracted or asserted twice; and
  every subject datom a removal on request retracts."
  [conn]
  (let [db (d/db conn) h (d/history db)
        id-a (d/entid db :triplex.entity/id) ix-a (d/entid db :triplex.ix/entry) gp-a (d/entid db :triplex.group/position)
        er-a (d/entid db :triplex.tx/erasure-record)
        ;; Report only (rule d, not a failure): what the reach route's parsed-entity cache relies on with every option off
        ;; (entity_cache.clj keys a parse by entity and revision), a change to a subject's rows, retirement markers or
        ;; owner root in a transaction that asserts no revision on it. Folds (the transaction carries
        ;; :triplex.owner/folded) are counted apart: they change no logical row.
        rev-a (d/entid db :triplex.entity/rev) fold-a (d/entid db :triplex.owner/folded)
        parsed-as (set (keep #(d/entid db %) [:triplex.entity/row :triplex.entity/retired :triplex.owner/root]))
        subject? (memoize (fn [e] (boolean (and id-a (first (d/datoms h :eavt e id-a))))))
        ident (memoize (fn [a] (str (d/ident db a))))
        out (reduce
              (fn [acc {:keys [t data]}]
                (let [acc (update acc :transactions inc)
                      removal? (and er-a (some #(and (= er-a (.a ^datomic.Datom %)) (.added ^datomic.Datom %)) data))
                      acc (cond-> acc removal? (update :removalTransactions inc))
                      fold? (and fold-a (some #(= fold-a (.a ^datomic.Datom %)) data))
                      acc (reduce
                            (fn [acc [e ds]]
                              (if (and (some #(contains? parsed-as (.a ^datomic.Datom %)) ds)
                                       (not (some #(and (= rev-a (.a ^datomic.Datom %)) (.added ^datomic.Datom %)) ds))
                                       (subject? e))
                                (update-in acc [(if fold? :revisionlessFolds :revisionlessChanges)
                                                (str (vec (sort (distinct (map #(str (if (.added ^datomic.Datom %) "+" "-") (ident (.a ^datomic.Datom %))) ds)))))]
                                           (fnil inc 0))
                                acc))
                            acc (group-by #(.e ^datomic.Datom %) data))
                      acc (reduce
                            (fn [acc [e ds]]
                              (let [rets (remove #(.added ^datomic.Datom %) ds)
                                    adds (filter #(.added ^datomic.Datom %) ds)
                                    real-adds (remove #(= ix-a (.a ^datomic.Datom %)) adds)
                                    real-rets (remove #(= ix-a (.a ^datomic.Datom %)) rets)
                                    attrs (fn [xs] (vec (sort (distinct (map #(ident (.a ^datomic.Datom %)) xs)))))]
                                (if (empty? rets) acc
                                  (let [subj (subject? e)
                                        k (str (attrs rets) " + " (attrs adds))]
                                    (cond-> (update-in acc [(if subj :subjectRetracting :otherRetracting) k] (fnil inc 0))
                                      (and subj (empty? real-rets) (empty? real-adds))
                                      (update :indexOnlyRetractions inc)
                                      (and subj (seq real-rets) (empty? real-adds))
                                      (-> (update :violations inc)
                                          (update :firstViolations #(if (< (count %) 5) (conj % {:t t :e e :retracted (attrs rets) :added (attrs adds)}) %)))
                                      (and subj removal?)
                                      (-> (update :removalSubjectRetractions inc)
                                          (update :firstRemovalRetractions #(if (< (count %) 5) (conj % {:t t :e e :retracted (attrs rets)}) %))))))))
                            acc (group-by #(.e ^datomic.Datom %) data))]
                  (if gp-a
                    (let [gp (filter #(= gp-a (.a ^datomic.Datom %)) data)]
                      (-> acc (update :groupPositionRetractions + (count (remove #(.added ^datomic.Datom %) gp)))
                          (update :groupPositionAssertions + (count (filter #(.added ^datomic.Datom %) gp)))))
                    acc)))
              {:transactions 0 :violations 0 :indexOnlyRetractions 0 :firstViolations [] :subjectRetracting {} :otherRetracting {}
               :groupPositionRetractions 0 :groupPositionAssertions 0 :removalTransactions 0 :removalSubjectRetractions 0
               :firstRemovalRetractions [] :revisionlessChanges {} :revisionlessFolds {}}
              (d/tx-range (d/log conn) nil nil))
        values (when gp-a (map :v (filter :added (d/datoms h :aevt gp-a))))]
    (assoc out :groupPositionDuplicates (if values (- (count values) (count (distinct values))) 0))))

(defn failures
  "The gate's verdict on one audit: the list of rules broken (empty when it passes)."
  [a]
  (cond-> []
    (pos? (:violations a)) (conj "a: a subject's datom retracted with no other assertion on it")
    (pos? (:groupPositionRetractions a)) (conj "b: a grouped-save position retracted")
    (pos? (:groupPositionDuplicates a)) (conj "b: a grouped-save position asserted again")
    (pos? (:removalSubjectRetractions a)) (conj "c: a removal on request retracted a subject's datom")))

(defn brief [a] (dissoc a :subjectRetracting :otherRetracting))

;; ---------------------------------------------------------------- totals over many databases

(def zero {:databases 0 :transactions 0 :violations 0 :indexOnlyRetractions 0 :groupPositionRetractions 0
           :groupPositionDuplicates 0 :groupPositionAssertions 0 :removalTransactions 0 :removalSubjectRetractions 0
           :failing 0 :firstFailures [] :subjectShapes {} :revisionlessChanges {} :revisionlessFolds {}})

(defn add-total [t label a]
  (let [f (failures a)]
    (-> (merge-with + t (assoc (select-keys a [:transactions :violations :indexOnlyRetractions :groupPositionRetractions
                                               :groupPositionDuplicates :groupPositionAssertions :removalTransactions
                                               :removalSubjectRetractions])
                               :databases 1 :failing (if (seq f) 1 0)))
        (assoc :firstFailures (vec (take 6 (concat (:firstFailures t)
                                                   (when (seq f) [{:database label :rules f :first (:firstViolations a)
                                                                   :firstRemoval (:firstRemovalRetractions a)}])))))
        (assoc :subjectShapes (merge-with + (:subjectShapes t) (:subjectRetracting a)))
        (assoc :revisionlessChanges (merge-with + (:revisionlessChanges t) (:revisionlessChanges a)))
        (assoc :revisionlessFolds (merge-with + (:revisionlessFolds t) (:revisionlessFolds a))))))

(defn summary-line
  "One line: DX-RD7_AUDIT pass|fail and the counts."
  [where t]
  (str "DX-RD7_AUDIT " (if (zero? (:failing t)) "pass" "fail") " "
       (json/write-str (assoc (dissoc t :subjectShapes) :where where :exceptions exceptions
                              :subjectRetractingShapes (:subjectShapes t)))))

;; ---------------------------------------------------------------- the review's two breaks, planted (proof only)

(defn plant!
  "Plant one of the review's raw-transaction breaks into `conn`, as a hypothetical writer would (never in a gate run
  without RD7_PLANT). :row (R6-1): retract one row of the subject with the most rows and assert nothing on it. :position
  (R6-3): retract a grouped-save position (an interior member's when the database holds one; otherwise one asserted
  first on a new entity), then assert the same number on another entity. Returns what it did."
  [conn kind]
  (let [db (d/db conn)]
    (case kind
      :row (let [row-a (d/entid db :triplex.entity/row)
                 id-a (d/entid db :triplex.entity/id)
                 subjects (->> (d/datoms db :aevt row-a) (map :e) frequencies
                               (filter (fn [[e _]] (first (d/datoms db :eavt e id-a)))))
                 [e n] (first (sort-by (comp - second) subjects))
                 row (first (d/datoms db :eavt e row-a))]
             (assert row "no subject row to retract")
             @(d/transact conn [[:db/retract e row-a (:v row)]])
             {:plant "row" :entity e :rowsBefore n})
      :position (let [_ (when-not (d/entid db :triplex.group/position)
                          @(d/transact conn [{:db/ident :triplex.group/position :db/valueType :db.type/long
                                              :db/cardinality :db.cardinality/one :db/unique :db.unique/value}]))
                      db (d/db conn)
                      gp (d/entid db :triplex.group/position)
                      phys (d/entid db :triplex.group/physical)
                      interior (first (for [x (d/datoms db :aevt gp) :let [e (:e x)]
                                            :when (or (nil? phys) (not= e (:v (first (d/datoms db :eavt e phys)))))] x))
                      [e q] (if interior [(:e interior) (:v interior)]
                              (let [q (+ 1000000000 (rand-int 1000000))
                                    r @(d/transact conn [{:db/id "planted" :triplex.group/position q}])]
                                [(d/resolve-tempid (:db-after r) (:tempids r) "planted") q]))]
                  @(d/transact conn [[:db/retract e :triplex.group/position q]])
                  @(d/transact conn [{:db/id "again" :triplex.group/position q}])
                  {:plant "position" :position q :interior (some? interior)}))))

;; ---------------------------------------------------------------- PostgreSQL (or any storage) entry point

(defn uri-main
  "Audit every database at a storage URI template (\"datomic:sql://{db}?jdbc:...\"); RD7_PLANT=row|position plants a
  break into every database first (proof only). Prints one DX-RD7_AUDIT_DB line per database and one DX-RD7_AUDIT line;
  exits 1 when any database fails the gate, or when there is no database to audit."
  [template where]
  (let [names (sort (d/get-database-names (str/replace template "{db}" "*")))
        plant (some-> (System/getenv "RD7_PLANT") not-empty keyword)
        t (reduce (fn [t n]
                    (let [conn (d/connect (str/replace template "{db}" n))
                          planted (when plant (plant! conn plant))
                          a (audit conn)]
                      (println "DX-RD7_AUDIT_DB" (json/write-str (assoc (brief a) :database n :planted planted :rules (failures a))))
                      (d/release conn)
                      (add-total t n a)))
                  zero names)
        t (cond-> t (empty? names) (assoc :failing 1 :firstFailures [{:rules ["no database to audit"]}]))]
    (println (summary-line where t))
    (flush)
    (shutdown-agents)
    (System/exit (if (zero? (:failing t)) 0 1))))
