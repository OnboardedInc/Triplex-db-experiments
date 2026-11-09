(ns round4-verify
  (:require [clojure.data.json :as json] [clojure.test :refer :all]
            [datomic.api :as d] [triplex.gateway.feed :as feed] [triplex.gateway.main :as main]
            [triplex.gateway.storage :as storage] [triplex.gateway.schema :as schema]))

;; [CX-VDF01-R4] Why: test the gateway over real in-memory peer datoms, including an as-of database predating the type attribute.
;; Rejected: mocking d/entity or comparing only predicates (cannot expose schema-history/projection failures).
(def output (System/getenv "CX_VDF01_OUTPUT"))
(def results (atom []))
(defn save! [] (spit (str output "/datomic-results.json") (json/write-str @results)))
(defn old-row [r] (assoc r :retracted_at nil :retracted_position nil :retract_tx_id nil))
(defn commit! [conn source position op rows]
  (storage/commit! conn (d/db conn)
                   {"sourceK" source "position" position "operationId" op
                    "rows" (mapv storage/wire-row rows)
                    "newIds" (mapv :id (filter #(nil? (:retracted_position %)) rows)) "claims" []}))
(defn tuples [changes]
  (sort (map (fn [c] [(:op c) (:entity c) (:attribute c) (double (:validFrom c))
                      (some-> (:validTo c) double) (Long/parseLong (:position c))]) changes)))
(deftest shared-cases
  (doseq [c (json/read-str (slurp (str output "/fixture.json")) :key-fn keyword)]
    (testing (:name c)
      (let [base "datomic:mem://" scope (json/write-str ["triplex-scope-v1" "test" "review" (str "r4-" (:name c)) 1])
            uri (str base (main/scope-name scope))]
        (try
          (if (:legacySchema c)
            (do (d/create-database uri)
                @(d/transact (main/connection uri) (remove #(= :f/entity-type (:db/ident %)) schema/schema))
                (main/initialize-scope! uri scope))
            (main/create-scope! base scope))
          (let [conn (main/connection uri) old (mapv old-row (filter :retracted_position (:rows c)))
                _ (when (seq old) (commit! conn 0 1 (str (:name c) "-seed") old))
                committed (commit! conn (if (seq old) 1 0) 4 (:name c) (:rows c))
                t (get-in committed [:t "v"])
                _ (when (:legacySchema c) @(d/transact conn schema/schema))
                page (feed/log-page conn {"fromT" t "limit" "1" "waitMs" "0"})
                rows (:rows page)
                actual (:transaction (first rows))
                expected (set (:expectedIds c))
                changes (:changes actual)
                selected (filter #(expected (:id %)) (:rows c))
                expected-tuples (sort (map (fn [r] [(if (:retracted_position r) "retract" "assert") (:entity_id r) (:attribute r)
                                                   (double (:valid_from r)) (some-> (:valid_to r) double)
                                                   (or (:retracted_position r) (:recorded_position r))]) selected))]
            (is (= 1 (count rows)))
            (is (= "commit" (:kind (first rows))))
            (is (= expected (set (map :assertionId changes))))
            (is (= expected-tuples (tuples changes)))
            (is (= (mapv str (:positions c)) (:positions actual)))
            (is (= (sort (:txIds c)) (:txIds actual)))
            (is (= "4000" (:stamp actual)))
            (is (= page (feed/log-page conn {"fromT" t "limit" "1" "waitMs" "0"})))
            (swap! results conj {:name (:name c) :physicalT t :legacySchema (:legacySchema c) :page page})
            (save!))
          (finally (feed/unsubscribe! (main/connection uri)) (main/delete-scope! base scope)))))))
(defn -main [& _]
  (let [result (run-tests 'round4-verify)]
    (save!)
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail result) (:error result))) 0 1))))
