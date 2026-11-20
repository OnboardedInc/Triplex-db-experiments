(ns field-predecessor-test
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [clojure.walk :as walk] [datomic.api :as d]
            [triplex.gateway.group-test :as gt] [triplex.gateway.predecessor :as pred] [triplex.gateway.commit :as commit]
            [triplex.gateway.storage :as storage] [triplex.gateway.group :as group] [triplex.gateway.main :as main]
            [triplex.gateway.selftest :as fix]))
(defn exercise [opt]
  (let [scope (json/write-str ["triplex-scope-v1" "test" "pred" (str (java.util.UUID/randomUUID)) 0])]
    (with-redefs [pred/enabled opt group/enabled false main/uri-template "datomic:mem://{db}"]
      (let [name (:db (main/create-scope! nil scope "lean" true true)) conn (main/connection (main/db-uri name))
            send #(gt/invoke name conn %) plain #(send (gt/input %))
            pinned (fn [p] (storage/read-rows name (d/db conn) {"basis" {"recordedPosition" p "validAt" 1} "entityIds" [gt/root] "pattern" {}}))]
        (try
          (is (= :ok (:outcome (plain {:id "seed" :add "imported:01"}))))
          (let [bad (-> (gt/input {:id "wrong" :remove "imported:01"})
                       (as-> input (walk/postwalk-replace {gt/root "acct/test/different"} input)) fix/row-input)
                errors [(send bad) (plain {:id "missing" :remove "nonexistent"}) (plain {:id "stale" :source 0 :add "x"})]
                before (pinned 1)
                writes (mapv (fn [i] (future (plain {:id (str "w" i) :remove "imported:01" :add (str "winner" i)}))) [0 1])
                done (mapv deref writes) winner (if (= :ok (:outcome (done 0))) 0 1)
                retired (plain {:id "retired-guard" :remove "imported:01"})
                reuse (plain {:id "never-reuse" :add "imported:01"})]
            (is (= [:ok "CasConflict"] (sort-by #(if (= :ok %) 0 1) (map :outcome done))))
            (is (= ["CasConflict" "CasConflict"] (map :outcome (rest errors))))
            (is (= "CasConflict" (:outcome retired))) (is (= "IdentityConflict" (:outcome reuse)))
            (is (= (dissoc before :route) (dissoc (pinned 1) :route))) (is (= 2 (storage/head-position (d/db conn))))
            (is (= #{(str "winner" winner)} (set (map #(get-in % ["id" "v"]) (:rows (pinned 2))))))
            (mapv :outcome errors))
          (finally (main/delete-scope! nil scope)))))))
(deftest equivalence
  (is (= (exercise false) (exercise true)))
  (with-redefs [pred/enabled true main/uri-template "datomic:mem://{db}"]
    (is (= (gt/run-arm false) (gt/run-arm true)))
    (fix/one-history-range)))
(deftest existing-scope-rollout
  (with-redefs [pred/enabled false main/uri-template "datomic:mem://{db}"]
    (let [scope (json/write-str ["triplex-scope-v1" "test" "pred" (str (java.util.UUID/randomUUID)) 0])
          name (:db (main/create-scope! nil scope "lean" true true))
          conn (main/connection (main/db-uri name))
          send (fn [id add remove] (gt/invoke name conn (gt/input {:id id :add add :remove remove})))]
      (try
        (is (= 1 (:position (send "seed" "old" nil))))
        (with-redefs [pred/enabled true]
          (is (= :triplex/commit (commit/entry (d/db conn) {} true)))
          (is (= 2 (:position (send "before-open" "mid" "old"))))
          (is (false? (:created (main/create-scope! nil scope "lean" true true))))
          (is (not= :triplex/commit (commit/entry (d/db conn) {} true)))
          (is (= 3 (:position (send "after-open" "new" "mid"))))
          (is (= "3" (get-in (storage/operation (d/db conn) "after-open") [:position "v"]))))
        (finally (main/delete-scope! nil scope))))))
(let [result (run-tests 'field-predecessor-test)]
  (println "W1_PREDECESSOR" (json/write-str (assoc result :defaultFunction commit/source-hash :attempt (System/getenv "W1_ATTEMPT"))))
  (shutdown-agents) (System/exit (if (zero? (+ (:fail result) (:error result))) 0 1)))
