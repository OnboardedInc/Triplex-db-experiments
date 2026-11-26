(ns rd7-harness
  "[DX-RD7] In-memory side of the writers' audit gate, and the hardened cut lookup's own tests. Loaded by rd7/clj-run.sh
  after wfix1/regression.clj, w2/wide_gate.clj, s5/fuzz.clj and rd7/audit.clj (and rd6/attacks.clj for the guard and
  rd6 modes). Every in-memory scope any test opens through wfix1's in-scope is audited by rd7/audit.clj just before it
  is deleted, so the audit covers each scope's whole log.

  Modes (rd7/clj-run.sh): fuzz-main (the save line's fuzzer, S5_* environment, with every scope audited; RD7_PLANT=row
  or position plants the review's break into every scope first, proof only); attack-main (the review's targeted tests
  with every scope audited and labelled by test); guard-main (the hardened cut lookup against the past view, and its
  cost on the toy, diagnostic)."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :as t]
            [datomic.api :as d] [triplex.gateway.storage :as storage]
            [s5-fuzz :as fz] [wfix1-regression :as reference] [rd7-audit :as audit])
  )

(defn emit [tag m] (println tag (json/write-str m)) (flush))

;; ---------------------------------------------------------------- every scope audited at its end

(def totals (atom audit/zero))
(def per-label (atom (sorted-map)))
(def scopes (atom 0))
(def plant (some-> (System/getenv "RD7_PLANT") not-empty keyword))

(defn- label []
  (or (some-> (first t/*testing-vars*) meta :name str) (str "scope-" (swap! scopes inc))))

(defn audit-scope! [where conn]
  (let [planted (when plant (try (audit/plant! conn plant) (catch Throwable e {:plantError (str e)})))
        a (audit/audit conn)
        f (audit/failures a)]
    (swap! totals audit/add-total where a)
    (swap! per-label update where (fn [x] (-> (merge-with + (or x {}) (select-keys a [:transactions :violations :indexOnlyRetractions
                                                                                     :groupPositionRetractions :groupPositionDuplicates
                                                                                     :groupPositionAssertions :removalTransactions
                                                                                     :removalSubjectRetractions]))
                                              (update :scopes (fnil inc 0)) (update :failingScopes (fnil + 0) (if (seq f) 1 0)))))
    (when (or planted (seq f))
      (emit "DX-RD7_AUDIT_SCOPE" (assoc (audit/brief a) :where where :planted planted :rules f)))
    a))

(defonce hooked
  (alter-var-root #'reference/in-scope
    (fn [orig]
      (fn [f]
        (orig (fn [name conn]
                (let [where (label)
                      result (f name conn)]
                  (audit-scope! where conn)
                  result)))))))

(defn settings [] (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv))))

;; ---------------------------------------------------------------- the gate's in-memory part: the save line's fuzzer

(defn fuzz-main
  "The S5 fuzzer's runs (S5_SEEDS, S5_STEPS, S5_ROUNDS, S5_THREADS, S5_PER_THREAD and its other options), every scope
  audited. Passes only when the fuzzer finds no difference and every scope passes the audit."
  []
  (let [env (fn [k default] (Long/parseLong (or (System/getenv k) default)))
        seeds (map #(Long/parseLong %) (str/split (or (System/getenv "S5_SEEDS") "1") #","))
        runs (doall (for [s seeds] (fz/fuzz-run! s (env "S5_STEPS" "600") (env "S5_ROUNDS" "2") (env "S5_THREADS" "4") (env "S5_PER_THREAD" "60"))))
        bad (count (filter #(or (seq (:differences %)) (seq (:deep-differences %))
                                (some (fn [r] (seq (:replay-differences r))) (:concurrent %))) runs))
        tt @totals
        ok (and (zero? bad) (zero? (:failing tt)) (pos? (:databases tt)))]
    (emit "DX-RD7_FUZZ" {:s5Runs (count runs) :s5Differing bad :serial (reduce + (map :serial runs))
                         :concurrent (reduce + (map (fn [r] (reduce + (map :saves (:concurrent r)))) runs))
                         :writers (apply merge-with + (map :writers runs)) :modes (apply merge-with + (map :modes runs))
                         :planted (some-> plant name) :settings (settings) :pass ok})
    (println (audit/summary-line "memory" tt))
    (shutdown-agents)
    (System/exit (if ok 0 1))))

;; ---------------------------------------------------------------- the review's targeted tests, every scope audited

(defn attack-main
  "The review's targeted tests (rd6/attacks.clj), every scope audited and labelled by its test. Prints the review's
  result, one line per test with its audit, and the totals; exits by the review's tests (the audit lines are evidence:
  the tests that plant a break by design fail the audit, the others must pass it)."
  []
  (let [r (t/run-tests 'rd6-attacks)]
    (emit "DX-RD6_RESULT" (merge (select-keys r [:test :pass :fail :error]) {:settings (settings)}))
    (doseq [[k v] @per-label] (emit "DX-RD7_AUDIT_TEST" (assoc v :test k)))
    (println (audit/summary-line "memory-attacks" @totals))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))

;; ---------------------------------------------------------------- the hardened cut lookup against the past view

(defn guard-main
  "Every position 0..N read through group-cut/member-at at many pins, against the lookup ref on the past view, on a
  database where positions are asserted, interior ones retracted, numbers asserted again on another entity, and others
  never written; once with the builder's lookup and once with the guard. Then the review's grouped attack on the
  product's writers. Then the cost (diagnostic). Needs TX2_PINNED_CUT_LOOKUP=1 at load (the guard is installed)."
  []
  (let [guard-ns (the-ns 'triplex.gateway.group-cut-guard)
        unguarded @(ns-resolve guard-ns 'unguarded)
        guarded @(ns-resolve guard-ns 'member-at)
        fallbacks @(ns-resolve guard-ns 'fallbacks)
        installed (= guarded @(resolve 'triplex.gateway.group-cut/member-at))
        pinned-current (resolve 'triplex.gateway.pinned/*current*)
        conn (let [u (str "datomic:mem://rd7-guard-" (java.util.UUID/randomUUID))] (d/create-database u) (d/connect u))
        _ @(d/transact conn [{:db/ident :triplex.group/position :db/valueType :db.type/long
                              :db/cardinality :db.cardinality/one :db/unique :db.unique/value}])
        ;; 300 transactions; transaction i asserts positions 3i+1 and 3i+2 (3i+3 and everything above 900 are never
        ;; written). Transaction i with i mod 10 = 5 also retracts 3(i-5)+1 (a member asserted five transactions
        ;; earlier); with i mod 10 = 8 it asserts that number again on a new entity. A pin after every 7th.
        pins (atom [])
        retracted (atom 0) again (atom 0)
        _ (dotimes [i 300]
            (let [db (d/db conn)
                  ops (cond-> [{:db/id "a" :triplex.group/position (+ (* 3 i) 1)} {:db/id "b" :triplex.group/position (+ (* 3 i) 2)}]
                        (= 5 (mod i 10)) (conj (let [p (+ (* 3 (- i 5)) 1)]
                                                 (swap! retracted inc)
                                                 [:db/retract (d/entid db [:triplex.group/position p]) :triplex.group/position p]))
                        (= 8 (mod i 10)) (conj (do (swap! again inc) {:db/id "again" :triplex.group/position (+ (* 3 (- i 8)) 1)})))]
              @(d/transact conn ops)
              (when (zero? (mod i 7)) (swap! pins conj (d/basis-t (d/db conn))))))
        current (d/db conn)
        positions (range 0 1000)
        compare-with (fn [f]
                       (with-redefs-fn {(resolve 'triplex.gateway.group-cut/current-lookup) true}
                         (fn []
                           (with-bindings {pinned-current current}
                             (reduce (fn [acc t]
                                       (let [view (d/as-of current t)]
                                         (reduce (fn [acc p]
                                                   (let [want (d/entid view [:triplex.group/position p]) got (f view p)]
                                                     (cond-> (update acc :compared inc)
                                                       (not= want got) (-> (update :differences inc)
                                                                           (update :first #(if (< (count %) 5) (conj % {:t t :p p :want want :got got}) %))))))
                                                 acc positions)))
                                     {:compared 0 :differences 0 :first []} @pins)))))
        hist (frequencies (map (fn [p] (count (take 3 (d/datoms (d/history current) :avet :triplex.group/position p)))) positions))
        before-fallbacks (.sum ^java.util.concurrent.atomic.LongAdder fallbacks)
        builder (compare-with unguarded)
        guard (compare-with guarded)
        fallback-count (- (.sum ^java.util.concurrent.atomic.LongAdder fallbacks) before-fallbacks)]
    (emit "DX-RD7_GUARD_VIEW" {:installed installed :pins (count @pins) :positions (count positions)
                               :historyDatomsPerPosition (into (sorted-map) hist) :retracted @retracted :assertedAgain @again
                               :builder builder :guard guard :guardFallbacks fallback-count})
    (d/release conn)
    {:installed installed :builder builder :guard guard}))

(defn- timed-us [n f] (let [t0 (System/nanoTime)] (dotimes [_ n] (f)) (/ (- (System/nanoTime) t0) 1e3 n)))

(defn cost!
  "The cost on the Mac toy (diagnostic only): per lookup (the walk on the past view, the builder's, the review's
  hardened one, this guard) at interior positions, solo positions and never-written numbers; and per whole pinned read
  through the route under options off, the builder's cut lookup and this guard. The review's toy (rd6 cost-main):
  subjects edited before the pin, then groups of four saves after it (TX2_GROUP_COMMIT=1)."
  []
  (let [rd6 (fn [s] @(ns-resolve (the-ns 'rd6-attacks) s))
        save! (rd6 'save!) grouped-batch! (rd6 'grouped-batch!) lean-read-nocache (rd6 'lean-read-nocache)
        guard-ns (the-ns 'triplex.gateway.group-cut-guard)
        unguarded @(ns-resolve guard-ns 'unguarded) guarded @(ns-resolve guard-ns 'member-at)
        cut-var (resolve 'triplex.gateway.group-cut/current-lookup)
        member-var (resolve 'triplex.gateway.group-cut/member-at)
        pinned-current (resolve 'triplex.gateway.pinned/*current*)
        group-on @(resolve 'triplex.gateway.group/enabled)]
    (reference/in-scope
      (fn [name conn]
        (let [n (Long/parseLong (or (System/getenv "RD6_SUBJECTS") "40"))
              edits (Long/parseLong (or (System/getenv "RD6_EDITS") "40"))
              groups (Long/parseLong (or (System/getenv "RD6_GROUPS") "300"))
              os (vec (for [i (range n)] (str "acct/rd6/subject/c" i)))
              head #(storage/head-position (d/db conn))]
          (doseq [o os] (save! name conn {:set (vec (for [j (range 8)] [o (str ":fz/f" j) (str o "-" j)]))}))
          (dotimes [k edits] (doseq [o os] (save! name conn {:set [[o (str ":fz/f" (mod k 8)) (str o "-e" k)]]})))
          (let [pin (head)]
            (dotimes [k groups]
              (let [specs (for [i (range 4)] {:set [[(str "acct/rd6/other/" k "-" i) ":fz/f0" "x"]]})]
                (if group-on (grouped-batch! name conn specs) (doseq [sp specs] (save! name conn sp)))))
            (let [cur (d/db conn)
                  gpa (d/entid cur :triplex.group/position)
                  phys (d/entid cur :triplex.group/physical)
                  interior (when gpa (vec (take 50 (for [x (d/datoms cur :aevt gpa) :let [e (:e x)]
                                                         :when (not= e (:v (first (d/datoms cur :eavt e phys))))] (:v x)))))
                  solo (vec (take 50 (filter #(not (and gpa (d/entid cur [:triplex.group/position %]))) (range 1 pin))))
                  never (vec (range (+ 1000000 (head)) (+ 1000050 (head))))
                  per (fn [qs f] (when (seq qs)
                                   (let [views (into {} (for [q qs] [q (storage/at-position cur (min q (head)))]))]
                                     (with-redefs-fn {cut-var true}
                                       (fn [] (with-bindings {pinned-current cur}
                                                (dotimes [_ 50] (doseq [q qs] (f (views q) q)))
                                                (/ (timed-us 400 (fn [] (doseq [q qs] (f (views q) q)))) (count qs))))))))
                  lookups (into {} (for [[k qs] {:interior interior :solo solo :neverWritten never}]
                                     [k {:walkOnView (per qs (fn [v q] (d/entid v [:triplex.group/position q])))
                                         :builder (per qs unguarded)
                                         ;; the review's form (rd6 hardened-member-at): a history seek, then the builder's lookup
                                         :reviewHardened (per qs (fn [v q] (if (or (nil? gpa) (<= (count (take 2 (d/datoms (d/history cur) :avet gpa q))) 1))
                                                                             (unguarded v q) (d/entid v [:triplex.group/position q]))))
                                         :guard (per qs guarded)}]))
                  read-of (fn [o p] #(lean-read-nocache name {"entityIds" [o] "basis" {"validAt" 5.0 "recordedPosition" p}}))
                  with (fn [cut? f m] (with-redefs-fn {cut-var cut? member-var m} f))
                  reads (fn [ps] (let [targets (vec (for [p ps o (take 4 os)] (read-of o p)))]
                                   (into {} (for [[k cut? m] [[:off false unguarded] [:builder true unguarded] [:guard true guarded]]]
                                              [k (with cut? (fn [] (dotimes [_ 3] (doseq [r targets] (r)))
                                                              (/ (timed-us 10 (fn [] (doseq [r targets] (r)))) (count targets) 1e3)) m)]))))
                  same (every? (fn [[o p]] (apply = (for [[cut? m] [[false unguarded] [true unguarded] [true guarded]]]
                                                      (with cut? (read-of o p) m))))
                               (for [o (take 4 os) p (concat (take 10 interior) (take 10 solo) [pin])] [o p]))]
              (emit "DX-RD7_COST" {:diagnostic true :subjects n :editsBeforePin edits :pin pin :head (head)
                                   :groupPositions (if gpa (count (seq (d/datoms cur :aevt gpa))) 0)
                                   :microsecondsPerLookup lookups
                                   :msPerWholeRead {:interior (reads (take 10 interior)) :solo (reads (take 10 solo)) :atPin (reads [pin])}
                                   :answersEqual same}))))))))

(defn guard-and-cost-main []
  (let [g (guard-main)]
    (cost!)
    (let [ok (and (:installed g) (zero? (get-in g [:guard :differences])) (pos? (get-in g [:builder :differences])))]
      (emit "DX-RD7_GUARD_RESULT" {:pass ok :settings (settings)})
      (shutdown-agents)
      (System/exit (if ok 0 1)))))
