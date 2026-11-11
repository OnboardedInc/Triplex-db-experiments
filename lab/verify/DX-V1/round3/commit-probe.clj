(ns dx-v1.round3
  (:require [clojure.java.io :as io]))

;; [DX-V1-R3] Why: execute the shipped quoted transaction function with observable index reads, without a database engine.
;; Rejected: reimplementing its clock predicate in another language (could test a different rule).
(create-ns 'dx-v1.fake-datomic)
(alias 'd 'dx-v1.fake-datomic)
(def reads (atom []))
(intern 'dx-v1.fake-datomic 'datoms
  (fn [db index e a]
    (swap! reads conj [index e a])
    (when (contains? db [e a]) [{:e e :a a :v (get db [e a])}])))
(intern 'dx-v1.fake-datomic 'entid (fn [_ x] (swap! reads conj [:entid x]) (when (keyword? x) x)))
(intern 'dx-v1.fake-datomic 'basis-t (fn [_] 10))
(intern 'dx-v1.fake-datomic 't->tx identity)
(doseq [n '[rseek-datoms seek-datoms index-range]] (intern 'dx-v1.fake-datomic n (fn [& _] [])))
(intern 'dx-v1.fake-datomic 'history identity)
(def forms (with-open [r (java.io.PushbackReader. (io/reader "packages/datomic/gateway/src/triplex/gateway/commit.clj"))]
             (binding [*read-eval* false]
               (doall (take-while #(not= ::eof %) (repeatedly #(read r false ::eof)))))))
(def ast (second (nth (first (filter #(and (seq? %) (= 'def (first %)) (= 'code (second %))) forms)) 2)))
(def execute (eval (list 'fn '[db payload] ast)))
(def initial {['scope :triplex.scope/head-version] 2 [10 :triplex.tx/position] 5
              [10 :triplex.tx/max-recorded-at] 100 ['scope :triplex.scope/strict-record-clocks] true})
(def base {:scope 'scope :source 5 :provisional 6 :span 1 :lean true :live [] :entities []
           :scope-wide false :ops [] :times [101] :record-clocks [101] :journal-entities []})
(def count-checks (atom 0))
(defn check [label expected f]
  (let [actual (try (f) (catch Exception e (.getMessage e)))]
    (assert (= expected actual) (str label " expected " expected ", got " actual))
    (swap! count-checks inc) (println (pr-str {:check label :actual actual}))))
(defn maximum [out] (some #(when (= :triplex.tx/max-recorded-at (nth % 2 nil)) (nth % 3)) out))
(check :strict-above 101.0 #(maximum (execute initial base)))
(doseq [time [100 99 -0.0 0.0]]
  (check [:strict-not-above time] "TRIPLEX_CLOCK 100" #(execute initial (assoc base :times [time] :record-clocks [time]))))
(doseq [time [Double/NaN Double/POSITIVE_INFINITY Double/NEGATIVE_INFINITY nil "101"]]
  (check [:strict-nonfinite time] "Invalid strict record clock" #(execute initial (assoc base :times [] :record-clocks [time]))))
(check :strict-one-physical-clock "Strict scopes require one record clock per commit"
       #(execute initial (assoc base :span 2 :provisional 7 :times [101 102] :record-clocks [101])))
(check :several-journals-one-clock 101.0 #(maximum (execute initial (assoc base :span 2 :provisional 7 :times [101 101]))))
(check :empty-rows-with-clock 101.0 #(maximum (execute initial (assoc base :times []))))
(check :retraction-clock 101.0 #(maximum (execute initial (assoc base :times [101] :ops [[:db/add "r" :f/retracted-at 101]]))))
(check :serial-second-equal-rejected "TRIPLEX_CLOCK 101.0"
       #(let [next (assoc initial [10 :triplex.tx/max-recorded-at] (maximum (execute initial base)))] (execute next base)))
(check :precision-rounds-equal-rejected "TRIPLEX_CLOCK 9.007199254740992E15"
       #(execute (assoc initial [10 :triplex.tx/max-recorded-at] (double 9007199254740992))
                 (assoc base :times [9007199254740993] :record-clocks [9007199254740993])))
(check :first-negative-zero -0.0 #(maximum (execute (dissoc initial [10 :triplex.tx/max-recorded-at])
                                                  (assoc base :times [-0.0] :record-clocks [-0.0]))))
(check :zero-after-negative-zero "TRIPLEX_CLOCK -0.0"
       #(execute (assoc initial [10 :triplex.tx/max-recorded-at] -0.0) (assoc base :times [0.0] :record-clocks [0.0])))
(doseq [policy [false nil]]
  (check [:nonstrict-spi-regression policy] 100
         #(maximum (execute (assoc initial ['scope :triplex.scope/strict-record-clocks] policy)
                            (assoc base :times [99] :record-clocks [99])))))
(check :nonstrict-replay-safe-still-rejects "TRIPLEX_CLOCK 100"
       #(execute (assoc initial ['scope :triplex.scope/strict-record-clocks] false)
                 (assoc base :replay-safe true :times [99] :record-clocks [99])))

;; [DX-V1-R3] Why: distinguish HTTP-generated payload guarantees from what native calls to this function enforce.
;; Rejected: claiming native calls are reachable through an arbitrary HTTP transaction payload.
(check :native-clockless-payload-not-rejected 100
       #(maximum (execute initial (assoc base :times [] :record-clocks []))))
(check :native-payload-can-clear-policy true
       #(boolean (some #{[:db/add 'scope :triplex.scope/strict-record-clocks false]}
                       (execute initial (assoc base :ops [[:db/add 'scope :triplex.scope/strict-record-clocks false]])))))
(check :legacy-head-strict-rejects-equal "TRIPLEX_CLOCK 100"
       #(execute {['scope :triplex.scope/position] 5 ['scope :triplex.scope/max-recorded-at] 100
                  ['scope :triplex.scope/strict-record-clocks] true}
                 (assoc base :times [100] :record-clocks [100])))
(check :maximum-after-retraction-still-rejects-old "TRIPLEX_CLOCK 101.0"
       #(execute (assoc initial [10 :triplex.tx/max-recorded-at]
                        (maximum (execute initial (assoc base :ops [[:db/add "r" :f/retracted-at 101]]))))
                 (assoc base :times [] :record-clocks [100])))
(doseq [policy [true false nil]]
  (reset! reads [])
  (execute (assoc initial ['scope :triplex.scope/strict-record-clocks] policy) base)
  (let [policy-reads (filter #(= [:eavt 'scope :triplex.scope/strict-record-clocks] %) @reads)]
    (assert (= 1 (count policy-reads)))
    (println (pr-str {:policy policy :reads @reads :extra-policy-eavt (count policy-reads)}))))
(def old-forms (with-open [r (java.io.PushbackReader. (io/reader "lab/verify/DX-V1/round3/commit-round2.historical.clj"))]
                 (binding [*read-eval* false]
                   (doall (take-while #(not= ::eof %) (repeatedly #(read r false ::eof)))))))
(def old-ast (second (nth (first (filter #(and (seq? %) (= 'def (first %)) (= 'code (second %))) old-forms)) 2)))
(def old-execute (eval (list 'fn '[db payload] old-ast)))
(defn outcome [f db payload]
  (reset! reads [])
  (let [answer (try {:out (f db payload)} (catch Exception e {:error (.getMessage e)}))]
    {:answer answer :reads @reads}))
(def comparisons (atom 0))
(doseq [policy [false nil] head-v2 [false true] replay-safe [false true] times [[] [99] [100] [101] [101 102]]]
  (let [db (merge initial {['scope :triplex.scope/head-version] (if head-v2 2 1)
                           ['scope :triplex.scope/position] 5 ['scope :triplex.scope/max-recorded-at] 100
                           ['scope :triplex.scope/strict-record-clocks] policy})
        payload (assoc base :replay-safe replay-safe :times times)
        old (outcome old-execute db payload) new (outcome execute db payload)]
    (assert (= (:answer old) (:answer new)))
    (assert (= (+ 2 (count (:reads old))) (count (:reads new))))
    (swap! comparisons inc)))
(println (pr-str {:nonstrict-old-new-comparisons @comparisons :behavior "identical output/error"
                  :additional-reads "one d/entid attribute lookup plus one EAVT scope flag lookup, also for non-strict scopes"}))
(println (pr-str {:checks @count-checks :native-engine false :source "commit.clj quoted code"}))
