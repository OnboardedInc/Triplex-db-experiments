(ns field-policy-test
  (:require [clojure.test :refer :all] [datomic.api :as d] [clojure.data.json :as json] [clojure.walk :as walk]
            [triplex.gateway.group-test :as gt] [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.journal :as journal]
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
          [s two] (group/choose s) [_ three] (group/choose s)
          [_ across] (group/choose {:queue [(e 5 "a") (assoc (e 6 "a") :account "other")]
                                    :accounts ["one" "other"] :tails {}})]
      (is (= [[1 2 4] [3] []] (mapv #(mapv :id %) [one two three])))
      (is (= [5] (mapv :id across))))
    (is (= (gt/run-arm false) (gt/run-arm true)))))

(deftest same-field-across-independent-work
  (with-redefs [group/enabled false policy/field-only? true policy/priority? true]
    (let [scope (json/write-str ["triplex-scope-v1" "test" "test" (str (java.util.UUID/randomUUID)) 0])
          name (:db (main/create-scope! nil scope "lean" true true))
          conn (main/connection (main/db-uri name)) lane (group/lane-for conn)
          execute group/execute! started (promise) release (promise)
          sender (str (java.util.UUID/randomUUID))
          fields (fn [i old]
                   (assoc (gt/input {:id (str "edit" i) :add (str "value" i) :remove old})
                          "writeClass" "live" "clientId" sender "sendSequence" (inc i)))
          intents (into [(fields 0 nil)
                         (frame "independent" "other" "live")
                         (frame "quiet" "quiet" "live")]
                        (for [i (range 1 10)] (fields i (str "value" (dec i)))))
          ids (mapv #(get % "operationId") intents)]
      (try
        (with-redefs [group/execute! (fn [c batch]
                                      (when (= "head" (:id (first batch))) (deliver started true) @release)
                                      (execute c batch))]
          (let [head (future (gt/invoke name conn (frame "head" "seed" "import")))]
            (try
              (assert (deref started 5000 false))
              (let [calls (mapv (fn [[i in]]
                                  (let [call (future (gt/invoke name conn in))]
                                    (gt/wait-until #(= (inc i) (count (:queue @lane)))) call))
                                (map-indexed vector intents))]
                (is (not-any? realized? (cons head calls)))
                (deliver release true)
                (is (= :ok (:outcome @head)))
                (let [rs (into {} (map vector ids (map deref calls)))
                      first-batch (mapv #(rs (str "edit" %)) (range 8))
                      order (mapv key (sort-by (comp :position val) rs))]
                  (is (every? #(= :ok (:outcome %)) (vals rs)) (pr-str rs))
                  (is (= (vec (concat (map #(str "edit" %) (range 8))
                                       ["independent" "quiet" "edit8" "edit9"])) order))
                  (is (apply = (map :t first-batch)))
                  (is (= (repeat 8 8) (map :size first-batch)))
                  (is (not= (:t (first first-batch)) (:t (rs "quiet"))))
                  (is (apply < (map #(-> (rs (str "edit" %)) :clock) (range 10))))
                  (doseq [i (range 10)
                          :let [id (str "edit" i) {:keys [position clock t]} (rs id)
                                db (d/db conn) saved (storage/operation db id)
                                cut (storage/read-rows name db {"entityIds" [gt/root] "basis" {"recordedPosition" position} "pattern" {}})
                                page (json/read-str (journal/page conn name {"after" (dec position) "limit" 1}))]]
                    (is (= [(str position) clock t] [(get-in saved [:position "v"]) (get-in saved [:recordedAt "v"]) (get-in saved [:t "v"])]))
                    (is (= [(str "value" i)] (mapv #(get-in % ["id" "v"]) (:rows cut))))
                    (is (= [[(str "_tx/" id) position]] (mapv #(subvec % 0 2) (get page "transactions")))))))
              (finally (deliver release true)))))
        (finally (main/delete-scope! nil scope))))))

(let [r (with-redefs [main/uri-template "datomic:mem://{db}"] (run-tests 'field-policy-test))]
  (println "W1_FIELD_POLICY" (json/write-str (assoc r :attempt (System/getenv "W1_ATTEMPT"))))
  (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))
