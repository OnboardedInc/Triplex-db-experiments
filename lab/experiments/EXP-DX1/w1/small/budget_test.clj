(ns small-budget-test
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.group :as group] [triplex.gateway.group-test :as gt]
            [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.write-policy :as policy]))

(deftest exact-budget-boundary
  (with-redefs [policy/budget-us 7600 group/enabled true policy/priority? true]
    (let [e (fn [id rank cost] {:id id :account (str id) :rank rank :eligible true
                               :keys #{} :predecessors [] :token (promise) :variable-us cost})
          q [(e 1 :live 2600) (e 2 :live 2600) (e 3 :live 1500) (e 4 :bulk 1800)]
          s {:queue q :accounts ["1" "2" "3" "4"] :rotation {:live ["1" "2" "3"] :bulk ["4"]} :tails {}}
          [rest first-batch] (group/choose s)]
      (is (= [1 2] (mapv :id first-batch)))
      (is (= [3 4] (mapv :id (:queue rest))))
      (is (not (realized? (:token (q 2)))))
      (let [[left next] (group/choose rest) [final bulk] (group/choose left)]
        (is (= [[3] [4] []] [(mapv :id next) (mapv :id bulk) (:queue final)])))))
  (let [scope (json/write-str ["triplex-scope-v1" "test" "budget" (str (java.util.UUID/randomUUID)) 0])]
    (with-redefs [main/uri-template "datomic:mem://{db}" group/enabled true policy/priority? true]
      (let [name (:db (main/create-scope! nil scope "lean" true true)) conn (main/connection (main/db-uri name))]
        (try
          (let [in (assoc (gt/input {:id "costed" :add "fact"}) "writeClass" "import")
                p (second (first (storage/tx-data (d/db conn) in)))
                size (policy/request-size in)
                limit (+ policy/fixed-us (policy/variable-us (count (:ops p)) size))]
            (with-redefs [policy/budget-us (dec limit)]
              (is (= "WriteBudgetExceeded" (:outcome (gt/invoke name conn in))))
              (is (= "absent" (:status (storage/operation (d/db conn) "costed")))))
            (with-redefs [policy/budget-us limit]
              (is (= :ok (:outcome (gt/invoke name conn in))))
              (is (= "1" (get-in (storage/operation (d/db conn) "costed") [:position "v"]))))
            (is (> (policy/variable-us (count (:ops p)) (+ size 1024))
                   (policy/variable-us (count (:ops p)) size))))
          (finally (main/delete-scope! nil scope)))))))

(let [r (run-tests 'small-budget-test)]
  (println "W1_BUDGET" (json/write-str (assoc r :attempt (System/getenv "W1_ATTEMPT"))))
  (shutdown-agents)
  (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))
