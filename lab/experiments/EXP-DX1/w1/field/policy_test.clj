(ns field-policy-test
  (:require [clojure.test :refer :all] [datomic.api :as d] [clojure.data.json :as json] [clojure.walk :as walk]
            [triplex.gateway.group-test :as gt] [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.group :as group] [triplex.gateway.write-policy :as policy] [triplex.gateway.selftest :as fixture]))
(defn frame [id owner kind]
  (fixture/row-input (assoc (walk/postwalk-replace {gt/root (str "acct/" owner "/p")} (gt/input {:id id :add id})) "writeClass" kind)))
(defn check-order [priority?]
  (let [scope (json/write-str ["triplex-scope-v1" "test" "test" (str (java.util.UUID/randomUUID)) 0])]
    (with-redefs [group/enabled true policy/priority? priority? main/uri-template "datomic:mem://{db}"]
      (let [name (:db (main/create-scope! nil scope "lean" true true)) conn (main/connection (main/db-uri name))
            send #(gt/invoke name conn %) entered (promise) release (promise) native group/execute! lane (group/lane-for conn)
            intents [["head" "seed" "import"] ["i1" "b" "import"] ["i2" "b" "activation"] ["n" "n" "notice"]
                     ["l1" "l" "live"] ["l2" "l" "live"] ["q" "q" "live"] ["dependent" "b" "live"]]]
        (try
          (with-redefs [group/execute! (fn [c batch] (when (= "head" (:id (first batch))) (deliver entered true) @release) (native c batch))]
            (let [active (future (send (apply frame (first intents))))]
              (try
                (assert (deref entered 5000 false))
                (let [fs (mapv (fn [[i intent]] (let [f (future (send (apply frame intent)))]
                          (gt/wait-until #(= (inc i) (count (:queue @lane)))) f)) (map-indexed vector (rest intents)))]
                  (deliver release true)
                  (let [r (into [@active] (map deref fs)) by-pos (mapv first (sort-by second (map vector (map first intents) (map :position r))))]
                    (is (every? #(= :ok (:outcome %)) r) (pr-str r))
                    (is (= (vec (range 1 9)) (sort (map :position r))))
                    (if priority? (do (is (= ["head" "l1" "q" "l2" "i1" "n" "i2" "dependent"] by-pos))
                                      (is (every? #(= 1 (:size (r %))) [0 1 2 3])))
                        (is (= "i1" (second by-pos))))
                    (doseq [[i x] (map-indexed vector r)]
                      (is (= (str (:position x)) (get-in (storage/operation (d/db conn) (first (intents i))) [:position "v"]))))
                    (println "W1_ORDER" (json/write-str {:priority priority? :scope scope :order by-pos :members (mapv :size r)}))))
                (finally (deliver release true)))))
          (when priority?
            (let [in (frame "oversize" "b" "import") n (policy/request-size in)]
              (with-redefs [policy/bulk-bytes (dec n)] (is (= "BulkFrameTooLarge" (:outcome (send in)))))
              (with-redefs [policy/bulk-rows 4] (is (= "BulkFrameTooLarge" (:outcome (send in)))))
              (is (= "absent" (:status (storage/operation (d/db conn) "oversize"))))
              (is (= "InvalidValue" (:outcome (send (assoc in "writeClass" "typo")))))
              (with-redefs [policy/bulk-bytes n policy/bulk-rows 5] (is (= :ok (:outcome (send in)))))))
          (finally (main/delete-scope! nil scope)))))))
(deftest policy-order (doseq [mode [false true true false]] (check-order mode)))
(deftest field-boundaries
  (with-redefs [policy/field-only? true group/enabled false]
    (let [e (fn [i s] {:id i :subject s :account "one" :predecessors [] :eligible true :keys #{} :token (promise)})
          [s one] (group/choose {:queue [(e 1 "a") (e 2 "a") (e 3 "b") (e 4 "a")] :accounts ["one"] :tails {}})
          [s two] (group/choose s) [_ three] (group/choose s)]
      (is (= [[1 2] [3] [4]] (mapv #(mapv :id %) [one two three]))))
    (is (= (binding [] (gt/run-arm false)) (gt/run-arm true)))))
(let [r (with-redefs [main/uri-template "datomic:mem://{db}"] (run-tests 'field-policy-test))]
  (println "W1_FIELD_POLICY" (json/write-str r)) (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))
