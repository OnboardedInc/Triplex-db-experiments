(ns w1.packed-group
  (:require [clojure.data.json :as json] [clojure.test :refer :all] [datomic.api :as d]
            [triplex.gateway.group :as group] [triplex.gateway.group-test :as gt]
            [triplex.gateway.journal :as journal] [triplex.gateway.main :as gateway]
            [triplex.gateway.packed-journal :as packed] [triplex.gateway.save-ledger :as ledger]
            [triplex.gateway.small-row :as small] [triplex.gateway.storage :as storage]))

(load-file "lab/experiments/EXP-DX1/w1/field/field_probe.clj")
(load-file "lab/experiments/EXP-DX1/w1/small/native_cost.clj")
(require '[triplex.gateway.field-probe :as field] '[triplex.gateway.native-cost :as cost])

;; [DX-W1] Why: a packed journal can name a predecessor born and replaced inside one physical transaction.
;; Rejected: testing only disjoint members whose predecessors already exist in the durable index.
(defn replay [grouped?]
  (let [suffix (if grouped? "packed-group" "ledger-solo")
        [name conn] (cost/open suffix)
        scope (json/write-str ["triplex-scope-v1" "test" "small" (str (System/getenv "W1_ATTEMPT") "-" suffix) 0])
        seed (cost/correction 0 1 [] 1 true)
        a (cost/correction 0 2 (:fresh seed) 1 true)
        b (cost/correction 0 3 (:fresh a) 1 true)
        submit #(gt/invoke name conn (:input %))]
    (try
      (let [[s x y] (if-not grouped? (mapv submit [seed a b])
                        (let [started (promise) release (promise) execute group/execute!
                              lane (group/lane-for conn)]
                          (with-redefs [group/execute! (fn [c entries]
                                                         (when (= "correction-1" (:id (first entries)))
                                                           (deliver started true)
                                                           @release)
                                                         (execute c entries))]
                            (let [first-call (future (submit seed))]
                              (try
                                (assert (= true (deref started 5000 false)))
                                (let [next-call (future (submit a)) _ (gt/wait-until #(= 1 (count (:queue @lane))))
                                      last-call (future (submit b)) _ (gt/wait-until #(= 2 (count (:queue @lane))))]
                                  (deliver release true)
                                  (mapv deref [first-call next-call last-call]))
                                (finally (deliver release true)))))))
            rs [s x y] db (d/db conn)
            page (get (json/read-str (journal/page conn name {"after" 0 "limit" 10})) "transactions")
            pins (mapv (fn [p] (:rows (storage/read-rows name db {"entityIds" [(field/root 0)]
                                         "basis" {"recordedPosition" p "validAt" 1.0}}))) [1 2 3])]
        (is (= [:ok :ok :ok] (mapv :outcome rs)) (pr-str rs))
        (is (= [1 2 3] (mapv :position rs)))
        (is (apply < (map :clock rs)))
        (is (= grouped? (= (:t x) (:t y))))
        (is (= (if grouped? 3 0) (reduce (fn [n _] (inc n)) 0 (d/datoms db :aevt :triplex.journal/packed))))
        (is (= [1 2 3] (mapv second page)))
        (is (= (mapv (comp :id first :fresh) [seed a b]) (mapv #(get-in % [0 "id" "v"]) pins)))
        (is (= "OperationDuplicate" (:outcome (submit a))))
        {:journal page :pins pins})
      (finally (gateway/delete-scope! nil scope)))))

(deftest packed-members-preserve-born-and-retired-predecessors
  (with-redefs [gateway/uri-template "datomic:mem://{db}" ledger/enabled true small/enabled true]
    (let [baseline (with-redefs [group/enabled false packed/enabled false] (replay false))]
      (with-redefs [group/enabled true group/fast-reply true packed/enabled true]
        (is (= baseline (replay true)))))))

(let [r (run-tests 'w1.packed-group)]
  (println "W1_PACKED_GROUP" (json/write-str (assoc r :attempt (System/getenv "W1_ATTEMPT"))))
  (shutdown-agents)
  (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))
