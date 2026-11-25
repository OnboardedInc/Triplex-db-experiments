(ns triplex.gateway.sweep-shapes-test
  (:require [clojure.test :refer :all] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.sweep :as sweep] [triplex.gateway.main :as gateway] [triplex.gateway.storage :as storage]
            [triplex.gateway.selftest :as fixture]))

;; [DX-XQ9] In-memory checks of the sweep's added question shapes (TX2_SWEEP_SHAPES): every answer is compared with the
;; answer computed here from the seeded model itself (not from the store), at the head. The stack gate
;; (lab/experiments/EXP-DX1/xq9/gate.ts) is the full exactness gate; this one runs in about a minute and catches
;; compile errors, wrong meanings and refusals. Run with TX2_SWEEP_SHAPES=all.

(def base "datomic:mem://")
(def scope "[\"triplex-scope-v1\",\"test\",\"xq9\",\"shapes\",0]")
(def accounts ["account-003" "account-0031"])
(def n 12)

(defn row [id entity attribute kind value position]
  (cond-> {:id id :entity_id entity :attribute attribute :value_type kind :recorded_at (* 10.0 position)
           :recorded_position position :valid_from 0.0 :schema_version 1 :tx_id (str "tx" position)}
    (#{"string" "ref" "integer"} kind) (assoc :value_string (str value))
    (= kind "number") (assoc :value_number (double value))))

(defn commit! [name position rows]
  (storage/commit! name (gateway/connection (gateway/db-uri name)) (gateway/sync-db (gateway/db-uri name))
    (fixture/row-input {"sourceK" (dec position) "position" position "operationId" (str "xq9-" position)
                        "rows" (mapv storage/wire-row rows) "newIds" (mapv :id rows) "claims" []})))

(defn subject [a i] (format "acct/%s/pl:%08d" a i))
(defn task [a i k] (format "acct/%s/tk:%08d:%d" a i k))
(defn placement [a i p] (format "acct/%s/pl:%08d:p%d" a i p))

;; The model: what each entity holds at the head.
(defn model [a]
  (let [names (fn [i] (case i 3 "Ünïcode SMITH" 5 "smithson" (str "name " i)))]
    (into {}
      (concat
        (for [i (range n)]
          [(subject a i) (cond-> {":person/name" [["string" (names i)]]
                                  ":person/placement" (vec (for [p (range (if (even? i) 2 1))] ["ref" (placement a i p)]))}
                           (not= i 4) (assoc ":person/score" [["integer" (* 10 (mod i 5))]])
                           (= i 6) (assoc ":person/score" [["integer" 7] ["integer" 99]])
                           (= i 7) (assoc ":person/score" [["string" "n/a"]]))])
        (for [i (range n) p (range (if (even? i) 2 1))]
          [(placement a i p) {":placement/status" [["string" (if (= p 0) "active" "ended")]]}])
        (for [i (range n) k (range (mod i 4))]
          [(task a i k) {":task/status" [["string" (if (even? (+ i k)) "pending" "complete")]]
                         ":task/subject" [["ref" (subject a i)]]}])))))

(defn seed! [name]
  (commit! name 1
    (vec (for [a accounts [e attrs] (model a) [attr vs] attrs [j [kind v]] (map-indexed vector vs)]
           (row (str e "/" attr "/" j) e attr kind v 1)))))

(defn call [name input] (sweep/page name (gateway/connection (gateway/db-uri name)) #{} input))
(defn all-pages [name input]
  (loop [input input pages []]
    (let [answer (call name input) pages (conj pages answer)]
      (if-let [next (:next answer)] (recur (-> input (dissoc "basis") (assoc "cursor" next)) pages) pages))))
(defn refused [f] (try (f) :accepted (catch clojure.lang.ExceptionInfo e (:code (ex-data e)))))
(defn ids-of [pages] (vec (mapcat :ids pages)))

(def subjects-kind {"prefix" "pl:" "shape" "pl:{8 digits}"})
(defn S [v] {"type" "string" "value" v})

(deftest shapes
  (let [name (:db (gateway/create-scope! base scope "lean"))]
    (try
      (seed! name)
      (doseq [a accounts]
        (let [m (model a)
              roots (sort (filter #(re-matches #"acct/[^/]+/pl:\d{8}" %) (keys m)))
              vals (fn [e attr] (get-in m [e attr] []))
              tasks-of (fn [s] (filter #(and (str/starts-with? % (str "acct/" a "/tk:" (subs s (- (count s) 8)) ":"))) (keys m)))
              ask (fn [q & [paging]] (all-pages name (merge {"account" a "from" subjects-kind "bounds" {"subjects" 3}} paging q)))]
          (testing (str a ": ne (a subject with no value matches)")
            (is (= (filterv (fn [s] (not-any? #(= % ["integer" 0]) (vals s ":person/score"))) roots)
                   (ids-of (ask {"where" [{"attribute" ":person/score" "op" "ne" "value" {"type" "integer" "value" "0"}}]})))))
          (testing (str a ": contains, case-sensitive and not")
            (is (= (filterv (fn [s] (some #(str/includes? (second %) "smith") (vals s ":person/name"))) roots)
                   (ids-of (ask {"where" [{"attribute" ":person/name" "op" "contains" "value" (S "smith")}]}))))
            (is (= (filterv (fn [s] (some #(str/includes? (str/lower-case (second %)) "smith") (vals s ":person/name"))) roots)
                   (ids-of (ask {"where" [{"attribute" ":person/name" "op" "contains" "value" (S "SMITH") "caseInsensitive" true}]})))))
          (testing (str a ": anyOf")
            (is (= (filterv (fn [s] (or (some #{["integer" 40]} (vals s ":person/score")) (empty? (vals s ":person/score"))
                                        (some #{["string" "n/a"]} (vals s ":person/score")))) roots)
                   (ids-of (ask {"anyOf" [[{"attribute" ":person/score" "op" "eq" "value" {"type" "integer" "value" "40"}}]
                                          [{"attribute" ":person/score" "op" "missing"}]
                                          [{"attribute" ":person/score" "op" "eq" "value" (S "n/a")}]]})))))
          (testing (str a ": has by key, some / none / count")
            (let [pending (fn [s] (count (filter (fn [t] (some #{["string" "pending"]} (vals t ":task/status"))) (tasks-of s))))
                  tk {"prefix" "tk:" "link" "key"}]
              (is (= (filterv #(pos? (pending %)) roots)
                     (ids-of (ask {"where" [{"op" "has" "related" tk "where" [{"attribute" ":task/status" "op" "eq" "value" (S "pending")}]}]}))))
              (is (= (filterv #(zero? (pending %)) roots)
                     (ids-of (ask {"where" [{"op" "has" "related" tk "quantifier" "none" "where" [{"attribute" ":task/status" "op" "eq" "value" (S "pending")}]}]}))))
              (is (= (filterv #(>= (count (tasks-of %)) 2) roots)
                     (ids-of (ask {"where" [{"op" "has" "related" tk "quantifier" {"op" "gte" "value" 2}}]}))))
              (is (= (count (filter #(and (>= (count (tasks-of %)) 2)) roots))
                     (:count (last (ask {"result" "count" "where" [{"op" "has" "related" tk "quantifier" {"op" "gte" "value" 2}}]})))))))
          (testing (str a ": has by reference, and the reverse question (tasks whose subject's name contains smith)")
            (let [pl {"prefix" "pl:" "shape" "pl:{8 digits}:p{digits}" "link" {"ref" ":person/placement"}}]
              (is (= (filterv (fn [s] (some (fn [[_ p]] (some #{["string" "ended"]} (vals p ":placement/status"))) (vals s ":person/placement"))) roots)
                     (ids-of (ask {"where" [{"op" "has" "related" pl "where" [{"attribute" ":placement/status" "op" "eq" "value" (S "ended")}]}]})))))
            (let [tasks (sort (filter #(str/includes? % "/tk:") (keys m)))
                  expected (filterv (fn [t] (some (fn [[_ s]] (some #(str/includes? (second %) "smith") (vals s ":person/name"))) (vals t ":task/subject"))) tasks)]
              (is (= expected
                     (ids-of (ask {"from" {"prefix" "tk:"}
                                   "where" [{"op" "has" "related" {"prefix" "pl:" "shape" "pl:{8 digits}" "link" {"ref" ":task/subject"}}
                                             "where" [{"attribute" ":person/name" "op" "contains" "value" (S "smith")}]}]}))))
              (is (= expected
                     (ids-of (ask {"from" {"prefix" "tk:"}
                                   "where" [{"op" "has" "related" {"prefix" "pl:" "shape" "pl:{8 digits}" "link" "key"}
                                             "where" [{"attribute" ":person/name" "op" "contains" "value" (S "smith")}]}]}))))))
          (testing (str a ": top N, both directions, ties by ID, missing last, across pages")
            (doseq [dir ["asc" "desc"] limit [1 3 5 12]]
              (let [ov (fn [s] (let [xs (keep (fn [[f v]] (when (= f "integer") v)) (vals s ":person/score"))]
                                 (when (seq xs) (if (= dir "asc") (apply min xs) (apply max xs)))))
                    sorted (sort-by (fn [s] (let [v (ov s)] [(if v 0 1) (if v (if (= dir "asc") v (- v)) 0) s])) roots)
                    pages (ask {"result" "top" "limit" limit "order" {"by" ":person/score" "type" "integer" "direction" dir}})]
                (is (= (vec (take limit sorted)) (:ids (last pages))) (str dir " " limit))
                (is (every? #(= [] (:ids %)) (butlast pages)))
                (is (= (count roots) (reduce + (map :examined pages)))))))
          (testing (str a ": sum and average, exact")
            (let [ints (mapcat (fn [s] (keep (fn [[f v]] (when (= f "integer") v)) (vals s ":person/score"))) roots)
                  last-page (last (ask {"result" "sum" "of" ":person/score"}))]
              (is (= (str (reduce + ints)) (:sum last-page)))
              (is (= (count ints) (:valuesAdded last-page)))
              (is (= 1 (:skipped last-page)))))))
      (testing "refusals"
        (let [a "account-003"]
          (is (= "NestedRelatedUnsupported"
                 (refused #(call name {"account" a "from" subjects-kind
                                       "where" [{"op" "has" "related" {"prefix" "tk:"} "where" [{"op" "has" "related" {"prefix" "pl:"}}]}]}))))
          (is (= "ReverseLinkUnsupported"
                 (refused #(call name {"account" a "from" subjects-kind "where" [{"op" "has" "related" {"prefix" "tk:" "link" {"refBack" ":task/subject"}}}]}))))
          (is (= "OrderedPagingNeedsIndex" (refused #(call name {"account" a "from" subjects-kind "order" {"by" ":person/score" "type" "integer"}}))))
          (is (= "OrderedPagingNeedsIndex" (refused #(call name {"account" a "from" subjects-kind "result" "top" "limit" 1001 "order" {"by" ":person/score" "type" "integer"}}))))
          (is (= "UnsupportedOperation" (refused #(call name {"account" a "anyOf" [[{"attribute" ":a" "op" "exists"}] [{"attribute" ":a" "op" "exists"}] [{"attribute" ":a" "op" "exists"}] [{"attribute" ":a" "op" "exists"}] [{"attribute" ":a" "op" "exists"}]]}))))
          (is (= "UnsupportedOperation" (refused #(call name {"account" a "where" (vec (repeat 5 {"attribute" ":a" "op" "exists"})) "anyOf" [(vec (repeat 4 {"attribute" ":a" "op" "exists"}))]}))))
          (doseq [q [{"where" [{"attribute" ":p/x" "op" "ne" "value" (S "x")}]}
                     {"where" [{"attribute" ":p/x" "op" "contains" "value" (S "x")}]}
                     {"anyOf" [[{"attribute" ":p/x" "op" "exists"}]]}
                     {"where" [{"op" "has" "related" {"prefix" "tk:"} "where" [{"attribute" ":p/x" "op" "exists"}]}]}
                     {"where" [{"op" "has" "related" {"prefix" "pl:" "link" {"ref" ":p/x"}}}]}
                     {"result" "top" "order" {"by" ":p/x" "type" "string"}}
                     {"result" "sum" "of" ":p/x"}]]
            (is (= "ProtectedValueLookup"
                   (try (sweep/page name (gateway/connection (gateway/db-uri name)) #{":p/x"} (merge {"account" a "from" subjects-kind} q)) :accepted
                        (catch clojure.lang.ExceptionInfo e (:code (ex-data e)))))
                (pr-str q)))))
      (finally (gateway/delete-scope! base scope)))))

(defn -main [& _]
  (let [{:keys [fail error] :as result} (with-redefs [gateway/uri-template "datomic:mem://{db}"] (run-tests 'triplex.gateway.sweep-shapes-test))]
    (println "XQ9_SHAPES" (pr-str (select-keys result [:test :pass :fail :error])))
    (shutdown-agents)
    (System/exit (if (zero? (+ fail error)) 0 1))))
