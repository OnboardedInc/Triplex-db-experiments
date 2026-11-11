(ns dx-v1.scope-probe (:require [clojure.java.io :as io]))
;; [DX-V1-R3] Why: execute real bootstrap/reopen/capability functions with explicit uniqueness and snapshot doubles.
;; Rejected: presenting a fake index store as a native Datomic concurrency or schema qualification.
(doseq [n '[dx-v1.sd dx-v1.schema dx-v1.commit dx-v1.codec dx-v1.lean]] (create-ns n))
(doseq [[a n] [['d 'dx-v1.sd] ['schema 'dx-v1.schema] ['commit 'dx-v1.commit] ['codec 'dx-v1.codec] ['lean 'dx-v1.lean]]] (alias a n))
(def state (atom {}))
(def submissions (atom []))
(def duplicates (atom 0))
(defn index-read [db index & args]
  (let [[e a] args]
    (case index
      :eavt (when (contains? db [e a]) [{:e e :a a :v (get db [e a])}])
      :aevt (for [[[entity attr] v] db :when (= attr e)] {:e entity :a attr :v v})
      [])))
(intern 'dx-v1.sd 'datoms index-read)
(intern 'dx-v1.sd 'entid (fn [db x] (if (keyword? x) (when (some #(= x (second %)) (keys db)) x)
                                      (when (= (get db ['scope :triplex.scope/key]) (second x)) 'scope))))
(intern 'dx-v1.sd 'tempid (fn [_] (gensym "temp")))
(intern 'dx-v1.sd 'transact
  (fn [_ tx]
    (swap! submissions conj tx)
    (when (and (some :triplex.scope/bootstrap tx) (get @state ['bootstrap :triplex.scope/bootstrap]))
      (swap! duplicates inc) (throw (ex-info "simulated unique/value conflict" {})))
    (doseq [m tx :when (map? m)]
      (let [e (if (:triplex.scope/bootstrap m) 'bootstrap 'scope)]
        (doseq [[a v] m :when (not= a :db/id)] (swap! state assoc [e a] v))))
    (delay {:db-after @state})))
(intern 'dx-v1.sd 'create-database (fn [_] (empty? @state)))
(intern 'dx-v1.sd 'db (fn [_] @state))
(intern 'dx-v1.sd 'entity (fn [db _] (into {} (for [[[e a] v] db :when (= e 'scope)] [a v]))))
(intern 'dx-v1.schema 'schema [])
(intern 'dx-v1.schema 'schema-hash "fixture-schema")
(intern 'dx-v1.commit 'install! (fn [& _]))
(intern 'dx-v1.codec 'invalid (fn [s] (throw (ex-info s {:code "InvalidValue"}))))
(intern 'dx-v1.lean 'enabled? (fn [db] (= 3 (get db ['scope :triplex.scope/rows-version]))))
(defn db-uri [x] x) (defn scope-name [x] x) (defn connection [x] x) (defn sync-db [_] @state)
(defn forms [file]
  (with-open [r (java.io.PushbackReader. (io/reader file))]
    (binding [*read-eval* false]
      (doall (take-while #(not= ::eof %) (repeatedly #(read r false ::eof)))))))
(doseq [f (forms "packages/datomic/gateway/src/triplex/gateway/main.clj")
        :when (and (seq? f) (= 'defn (first f)) (#{'stored-scope 'assert-scope 'initialize-scope! 'create-scope!} (second f)))] (eval f))
(defn config [_ _] {:scope 'scope})
(defn select-db [_ db _] db)
(defn decline! [s] (throw (ex-info s {:declined s})))
(eval (first (filter #(and (seq? %) (= 'defn (first %)) (= 'replica-capability (second %)))
                     (forms "packages/datomic/gateway/src/triplex/gateway/reach.clj"))))
(def checks (atom 0))
(defn check [label expected actual] (assert (= expected actual) (str label " " actual))
  (swap! checks inc) (println (pr-str {:check label :actual actual})))
(doseq [strict [false true]]
  (reset! state {}) (reset! duplicates 0)
  (check [:create strict] strict (:strictRecordClocks (create-scope! "base" "one" "lean" true strict)))
  (let [bootstrap @state]
    (check [:reopen strict] strict (:strictRecordClocks (create-scope! "base" "one" "lean" true (not strict))))
    (initialize-scope! "one" "one" "lean" true (not strict))
    (check [:second-bootstrap strict] bootstrap @state)
    (check [:unique-conflict-caught strict] 1 @duplicates)
    (check [:capability strict] (str "{\"supported\":true,\"strictRecordClocks\":" strict "}")
           (replica-capability "one" @state {"basis" {"recordedPosition" 0}}))))
(swap! state dissoc ['scope :triplex.scope/strict-record-clocks])
(check :missing-policy-not-upgraded false (:strictRecordClocks (create-scope! "base" "one" "lean" true true)))
(check :missing-policy-capability "{\"supported\":true,\"strictRecordClocks\":false}" (replica-capability "one" @state {}))
(check :reject-nonboolean "strictRecordClocks must be boolean"
       (try (create-scope! "base" "one" "lean" true 1) (catch Exception e (.getMessage e))))
(let [old @state latest (assoc old ['scope :triplex.scope/strict-record-clocks] true)]
  (check :capability-uses-given-snapshot "{\"supported\":true,\"strictRecordClocks\":false}"
         (replica-capability "one" old {}))
  (check :capability-does-not-cache-other-scope "{\"supported\":true,\"strictRecordClocks\":true}"
         (replica-capability "other" latest {})))
(println (pr-str {:checks @checks :native-engine false :unique-constraint "simulated; schema is separately inspected"}))
