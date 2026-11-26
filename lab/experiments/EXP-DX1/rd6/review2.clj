(ns rd6-review2
  "[DX-RD6, second review] Attacks on the hardened cut lookup (group_cut_guard.clj), on the writers' audit gate
  (rd7/audit.clj) and on the default flip. Reviewer's tests; they change none of the code under review. Loaded after
  wfix1/regression.clj, w2/wide_gate.clj, s5/fuzz.clj, rd7/audit.clj and rd6/attacks.clj (rd6/run2.sh).
  Each test prints one DX-RD6R2 line."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is testing]]
            [datomic.api :as d] [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.pinned :as pinned] [triplex.gateway.group-cut :as group-cut]
            [triplex.gateway.reach :as reach] [triplex.gateway.group :as group]
            [s5-fuzz :as fz] [wfix1-regression :as reference] [rd6-attacks :as a] [rd7-audit :as audit])
  (:import [java.util Random]))

(defn emit [m] (println "DX-RD6R2" (json/write-str m)) (flush))

;; ---------------------------------------------------------------- reads against a given database value

(defn read-at
  "storage/read-rows against the database value `db` as the request's own (a gateway whose peer holds `db`)."
  [name db input]
  (reach/forget! name)
  (try (vec (sort-by pr-str (:rows (storage/read-rows name db input))))
       (catch clojure.lang.ExceptionInfo e [:refused (:status (ex-data e)) (:code (ex-data e))])))

(defn position-history
  "How the history of a grouped-save position looks in `db`: :none, :one (one assertion) or :more."
  [db p]
  (if-let [a (d/entid db :triplex.group/position)]
    (case (count (take 2 (d/datoms (d/history db) :avet a p))) 0 :none 1 :one :more)
    :none))

(def modes [:on :cut :hard])

;; ---------------------------------------------------------------- 1. the guard: gateways behind, indexing, positions never written

(defn- batch! [name conn rng os k]
  (let [members (take (+ 2 (.nextInt ^Random rng 4)) (shuffle os))
        specs (for [o members]
                (let [f (str ":fz/f" (.nextInt ^Random rng 5)) live (vec (keys (fz/read-owner name o {"validAt" 5.0})))]
                  (case (.nextInt ^Random rng 3)
                    0 {:set [[o f (str "g" k)]]}
                    1 (if (seq live) {:retire [[o (nth live (.nextInt ^Random rng (count live)))]]} {:set [[o f (str "g" k)]]})
                    {:set [[o f (str "g" k)]] :retire (if (seq live) [[o (nth live (.nextInt ^Random rng (count live)))]] [])})))]
    (@#'a/grouped-batch! name conn specs)))

(deftest guard-behind-indexed-and-never-written
  ;; Every grouped position read through the guard from database values a gateway could hold: one per batch (a
  ;; gateway behind the head), the head, and on storage before and after an indexing job moved the positions out of
  ;; the memory index. Solo saves between the batches give positions with no history (the guard's nil answer).
  (if-not group/enabled
    (emit {:case "guard" :skip "needs TX2_GROUP_COMMIT=1"})
    (reference/in-scope
      (fn [name conn]
        (let [rng (Random. 7) os (vec (for [i (range 10)] (str "acct/rd6/subject/q" i)))
              _ (doseq [o os] (a/save! name conn {:set (vec (for [j (range 3)] [o (str ":fz/f" j) (str o "-" j)]))}))
              snaps (atom [])
              storage? (not (str/starts-with? (or (System/getenv "WFIX1_URI") "datomic:mem") "datomic:mem"))
              indexed (atom nil)]
          (dotimes [k 24]
            (batch! name conn rng os k)
            (when (even? k) (a/save! name conn {:set [[(nth os (.nextInt rng (count os))) ":fz/f9" (str "solo" k)]]}))
            (when (and storage? (= k 11))
              ;; an indexing job: every position so far moves from the memory index to stored segments
              (d/request-index conn)
              (let [t (d/basis-t (d/db conn))]
                (reset! indexed {:t t :synced (not= ::timeout (deref (d/sync-index conn t) 120000 ::timeout))})))
            (swap! snaps conj (d/db conn)))
          (let [final (d/db conn) top (storage/head-position final)
                classes (frequencies (for [p (range 1 (inc top))] (position-history final p)))
                ;; (1) each held database value as the request's database, every position up to its head
                behind (reduce
                         (fn [acc db]
                           (let [h (storage/head-position db)]
                             (reduce (fn [acc [p o]]
                                       (let [input {"entityIds" [o] "basis" {"validAt" 5.0 "recordedPosition" p}}
                                             off (a/with-mode :off #(read-at name db input))
                                             at-head (a/with-mode :on #(read-at name final input))]
                                         (reduce (fn [acc m]
                                                   (let [x (a/with-mode m #(read-at name db input))]
                                                     (cond-> (update acc :compared inc)
                                                       (not= off x) (update :differences inc))))
                                                 (cond-> (update acc :crossCompared inc)
                                                   (not= off at-head) (update :crossDifferences inc))
                                                 modes)))
                                     acc (for [p (range 1 (inc h)) :when (even? p) o (take 3 (shuffle os))] [p o]))))
                         {:compared 0 :differences 0 :crossCompared 0 :crossDifferences 0 :databases (count @snaps)}
                         @snaps)
                ;; (2) the head, every position, every subject, all read shapes
                r (a/compare-reads (a/pinned-reads name conn os (range 1 (inc top)) {:clocks 20}))
                fallbacks (when-let [v (resolve 'triplex.gateway.group-cut-guard/fallbacks)] (.sum ^java.util.concurrent.atomic.LongAdder @v))]
            (emit {:case "guard: gateways behind, positions never written, indexed and not" :storage storage? :indexed @indexed
                   :head top :positionHistories classes :behind behind :head-reads r :guardFallbacks fallbacks
                   :cutLookup group-cut/current-lookup :shortcut pinned/enabled})
            (is (zero? (:differences behind)))
            (is (zero? (:crossDifferences behind)) "a pin answers the same from a database behind and from the head")
            (is (empty? (:differences r)) (pr-str (:first r)))
            (is (pos? (get classes :one 0)))
            (is (pos? (get classes :none 0)))))))))

;; ---------------------------------------------------------------- 2. the audit gate against breaks it was not shown

(defn- datom-with [db eid needle]
  (first (filter #(str/includes? ^String (:v %) needle) (d/datoms db :eavt eid :triplex.entity/row))))

(defn- probe
  "After the planted transactions: the audit's verdict, its report-only count, the short-cut's and the hardening's
  differences at every position, and whether the options-off reach route answers a pin differently cold and after a
  head read (its parsed-entity cache)."
  [name conn pins subjects]
  (let [aud (audit/audit conn)
        r (a/compare-reads (for [p pins o subjects]
                             [[:read p o] #(a/lean-read name {"entityIds" [o] "basis" {"validAt" 5.0 "recordedPosition" p}})])
                           [:on :short :hard])
        reach-stale (vec (for [p pins o subjects
                               :let [basis {"validAt" 5.0 "recordedPosition" p}
                                     cold (do (reach/forget! name) (a/with-mode :off #(:body (reference/route name "v2" "reach-many" {"roots" [o] "basis" basis "full" true}))))
                                     _ (reach/forget! name)
                                     _ (a/with-mode :off #(reference/route name "v2" "reach-many" {"roots" [o] "basis" {"validAt" 5.0} "full" true}))
                                     warm (a/with-mode :off #(:body (reference/route name "v2" "reach-many" {"roots" [o] "basis" basis "full" true})))]
                               :when (not= cold warm)] [p o]))]
    {:rules (audit/failures aud) :violations (:violations aud) :groupRetractions (:groupPositionRetractions aud)
     :groupRepeats (:groupPositionDuplicates aud) :revisionless (:revisionlessChanges aud)
     :shortcutDifferences (get-in r [:differences :on] 0) :hardDifferences (get-in r [:differences :hard] 0)
     :reads (:reads r) :reachCacheStale (count reach-stale)}))

(defmacro ^:private break [label & body]
  `(reference/in-scope
     (fn [~'name ~'conn]
       (let [~'S "acct/rd6/subject/s" ~'T "acct/rd6/subject/t" ~'F "acct/rd6/form/f"]
         (a/save! ~'name ~'conn {:set [[~'S ":fz/f0" "s0"] [~'S ":fz/f1" "s1"] [~'S ":fz/ref" (str "ref:" ~'F)]]})
         (a/save! ~'name ~'conn {:set [[~'T ":fz/f0" "t0"] [~'T ":fz/f1" "t1"]]})
         (a/save! ~'name ~'conn {:set [[~'F ":fz/f0" "f0"] [~'F ":fz/f1" "f1"]]})
         (let [~'pin (a/head ~'conn)
               ~'db (d/db ~'conn)
               ~'s (d/entid ~'db [:triplex.entity/id ~'S]) ~'t (d/entid ~'db [:triplex.entity/id ~'T])
               ~'f (d/entid ~'db [:triplex.entity/id ~'F])]
           (do ~@body)
           (a/save! ~'name ~'conn {:set [[~'T ":fz/f9" "after"]]})
           (let [res# (probe ~'name ~'conn (range 1 (inc (a/head ~'conn))) [~'S ~'T ~'F])]
             (emit (assoc res# :case "audit break" :break ~label))
             res#))))))

(deftest audit-against-other-breaks
  (let [row-a :triplex.entity/row
        results
        {"retraction on S, assertion on T, one transaction"
         (break "retraction on S, assertion on T, one transaction"
           (let [x (datom-with db s "s1")] @(d/transact conn [[:db/retract s row-a (:v x)] [:db/add t row-a (str "2" (subs (:v x) 1))]])))
         "retraction alone, then an assertion on S in a later transaction"
         (break "retraction alone, then an assertion on S in a later transaction"
           (let [x (datom-with db s "s1")]
             @(d/transact conn [[:db/retract s row-a (:v x)]])
             @(d/transact conn [[:db/add s :triplex.entity/retired (str (subs (:v x) 0 (+ 5 (Integer/parseInt (:v x) 1 5 16))) "0000000000000099" "0000000000000000" "x")]])))
         "retraction with a marker on S, the marker retracted later"
         (break "retraction with a marker on S, the marker retracted later"
           (let [x (datom-with db s "s1") marker (str (subs (:v x) 0 (+ 5 (Integer/parseInt (:v x) 1 5 16))) "0000000000000099" "0000000000000000" "x")]
             @(d/transact conn [[:db/retract s row-a (:v x)] [:db/add s :triplex.entity/retired marker]])
             @(d/transact conn [[:db/retract s :triplex.entity/retired marker]])))
         "retraction with only an index entry asserted on S"
         (break "retraction with only an index entry asserted on S"
           (let [x (datom-with db s "s1")]
             (when-not (d/entid db :triplex.ix/entry)
               @(d/transact conn [{:db/ident :triplex.ix/entry :db/valueType :db.type/string :db/cardinality :db.cardinality/many}]))
             @(d/transact conn [[:db/retract s row-a (:v x)] [:db/add s :triplex.ix/entry "planted"]])))
         "an owned entity's row retracted alone (the form F)"
         (break "an owned entity's row retracted alone (the form F)"
           (let [x (datom-with db f "f1")] @(d/transact conn [[:db/retract f row-a (:v x)]])))
         "a retirement marker retracted alone (a row comes back)"
         (break "a retirement marker retracted alone (a row comes back)"
           (do (a/save! name conn {:retire [[S ":fz/f1"]]})
               (let [db (d/db conn) m (first (d/datoms db :eavt s :triplex.entity/retired))]
                 (if m @(d/transact conn [[:db/retract s :triplex.entity/retired (:v m)]])
                   ;; the writer retracted the row instead of marking it: put the row back with no revision
                   (let [old (first (filter #(str/includes? ^String (:v %) "s1") (d/datoms (d/history db) :eavt s row-a)))]
                     @(d/transact conn [[:db/add s row-a (:v old)]]))))))
         "a row asserted on S without moving its revision (rule d)"
         (break "a row asserted on S without moving its revision (rule d)"
           (let [x (datom-with db s "s0")] @(d/transact conn [[:db/add s row-a (str (:v x) " ")]])))
         "a row replaced on S without moving its revision (rule d)"
         (break "a row replaced on S without moving its revision (rule d)"
           (let [x (datom-with db s "s0")] @(d/transact conn [[:db/retract s row-a (:v x)] [:db/add s row-a (str (:v x) " ")]])))
         "a row changed and the revision moved back to an earlier value"
         (break "a row changed and the revision moved back to an earlier value"
           (let [x (datom-with db s "s0") rev (:v (first (d/datoms db :eavt s :triplex.entity/rev)))]
             ;; S's revision is 1 (its only save); a save moves it on, then a raw transaction puts 1 back with a
             ;; different row, so (entity, revision 1) names two different sets of rows
             (a/save! name conn {:set [[S ":fz/f2" "s2"]]})
             (let [db (d/db conn) y (datom-with db s "s2")]
               @(d/transact conn [[:db/retract s row-a (:v y)] [:db/retract s row-a (:v (datom-with db s "s0"))] [:db/add s :triplex.entity/rev rev]]))))}
        position
        (reference/in-scope
          (fn [name conn]
            @(d/transact conn [{:db/ident :triplex.group/position :db/valueType :db.type/long
                                :db/cardinality :db.cardinality/one :db/unique :db.unique/value}])
            (let [r1 @(d/transact conn [{:db/id "m" :triplex.group/position 777001}])
                  m (d/resolve-tempid (:db-after r1) (:tempids r1) "m")
                  _ @(d/transact conn [[:db/retract m :triplex.group/position 777001]])
                  alone (audit/failures (audit/audit conn))
                  conflict (try @(d/transact conn [{:db/id "n" :triplex.group/position 777002}])
                                @(d/transact conn [{:db/id "o" :triplex.group/position 777002}]) :stored
                                (catch Exception e (str "refused: " (first (str/split-lines (str (.getMessage e)))))))]
              {:retractedNotReused alone :sameNumberOnTwoLiveEntities conflict})))]
    (emit {:case "audit: a position retracted and never reused; the same number on two live entities" :result position})
    (is (seq (:retractedNotReused position)))
    (doseq [[label r] results]
      (testing label
        ;; Every break that makes the short-cut answer wrong must fail the gate.
        (when (pos? (:shortcutDifferences r)) (is (seq (:rules r)) (str label ": the short-cut answered wrong and the gate passed")))
        (is (zero? (:hardDifferences r)))))))

;; ---------------------------------------------------------------- 3. the default flip as an operator sees it

(deftest defaults-as-loaded
  (reference/in-scope
    (fn [name conn]
      (let [o (get-in (reference/route name "v1" "write-options" nil) [:body "options"])]
        (emit {:case "defaults as loaded" :shortcut pinned/enabled :cutLookup group-cut/current-lookup
               :writeOptions (select-keys o ["pinnedShortcut" "pinnedCutLookup"])
               :env {"TX2_PINNED_SHORTCUT" (System/getenv "TX2_PINNED_SHORTCUT") "TX2_PINNED_CUT_LOOKUP" (System/getenv "TX2_PINNED_CUT_LOOKUP")}
               :guardInstalled (= @#'group-cut/member-at (some-> (resolve 'triplex.gateway.group-cut-guard/member-at) deref))})
        (is (= [pinned/enabled group-cut/current-lookup] [(get o "pinnedShortcut") (get o "pinnedCutLookup")]))))))

;; ---------------------------------------------------------------- 1b. restore to an older position (rd6/restore-container.sh)

(def restore-scope (json/write-str ["triplex-scope-v1" "test" "rd6-restore" "one" 0]))
(defn- open-restore-scope []
  (with-redefs [main/uri-template (System/getenv "WFIX1_URI")]
    (let [name (:db (main/create-scope! nil restore-scope "lean" true true))]
      [name (main/connection (main/db-uri name))])))
(def restore-os (vec (for [i (range 8)] (str "acct/rd6/subject/r" i))))
(defn- answers [name conn]
  (into {} (for [p (range 1 (inc (a/head conn))) o restore-os]
             [[p o] (a/with-mode :off #(a/lean-read name {"entityIds" [o] "basis" {"validAt" 5.0 "recordedPosition" p}}))])))

(defn restore-phase
  "a: the scope, seeded, six groups (then the container backs it up); b: six more groups and solo saves, answers kept
  (the backup lacks them); c (after the restore, fresh JVMs and transactor): six groups that take the lost positions
  again, then every position under every option set, the answers at the positions the backup kept compared with phase
  a's, and the audit."
  [phase]
  (with-redefs [main/uri-template (System/getenv "WFIX1_URI")]
    (let [[name conn] (open-restore-scope) rng (Random. (case phase "a" 1 "b" 2 3))
          spit-edn (fn [f x] (spit (str "/out/" f) (pr-str x)))
          batches! (fn [n tag] (dotimes [k n] (batch! name conn rng restore-os (str tag k))
                                 (a/save! name conn {:set [[(nth restore-os (.nextInt rng 8)) ":fz/f9" (str tag "solo" k)]]})))]
      (case phase
        "a" (do (doseq [o restore-os] (a/save! name conn {:set (vec (for [j (range 3)] [o (str ":fz/f" j) (str o "-" j)]))}))
                (batches! 6 "a")
                (spit "/out/restore-name" name)
                (spit-edn "answers-a.edn" (answers name conn))
                (emit {:case "restore: phase a" :head (a/head conn)}))
        "b" (do (batches! 6 "b")
                (spit-edn "answers-b.edn" (answers name conn))
                (emit {:case "restore: phase b (after the backup)" :head (a/head conn)}))
        "c" (let [before (a/head conn)
                  _ (batches! 6 "c")
                  top (a/head conn)
                  r (a/compare-reads (a/pinned-reads name conn restore-os (range 1 (inc top)) {:clocks 20}))
                  ans-a (read-string (slurp "/out/answers-a.edn")) ans-b (read-string (slurp "/out/answers-b.edn"))
                  now (answers name conn)
                  kept (count (filter (fn [[k v]] (= v (get now k))) ans-a))
                  head-a (apply max (map ffirst ans-a))
                  ;; pins the backup lacked: they now name the saves written after the restore (the same on every option set)
                  lost (count (for [[[p o :as k] v] ans-b :when (> p head-a) :when (not= v (get now k))] k))
                  aud (audit/audit conn)
                  db (d/db conn)]
              (emit {:case "restore to an older position: the lost positions taken again" :headAfterRestore before :head top
                     :positionHistories (frequencies (for [p (range 1 (inc top))] (position-history db p)))
                     :result r :answersAtBackupPositions {:equal kept :of (count ans-a)}
                     :pinsTheBackupLacked {:changedMeaning lost :of (count (filter (fn [[[p]]] (> p head-a)) ans-b))}
                     :audit (select-keys aud [:violations :groupPositionRetractions :groupPositionDuplicates :groupPositionAssertions])
                     :rules (audit/failures aud)})
              (shutdown-agents)
              (System/exit (if (and (empty? (:differences r)) (= kept (count ans-a)) (empty? (audit/failures aud))) 0 1))))
      (shutdown-agents)
      (System/exit 0))))

(defn main []
  (let [r (clojure.test/run-tests 'rd6-review2)]
    (println "DX-RD6R2_RESULT" (json/write-str (merge (select-keys r [:test :pass :fail :error])
                                                      {:settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv)))})))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
