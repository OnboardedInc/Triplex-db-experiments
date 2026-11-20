(ns small-parity
  (:require [clojure.test :refer :all] [clojure.data.json :as json]
            [datomic.api :as d] [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.codec :as codec]
            [triplex.gateway.lean :as lean] [triplex.gateway.small-row :as small-row]
            [triplex.gateway.journal :as journal] [triplex.gateway.group :as group] [triplex.gateway.reach :as reach]
            [triplex.gateway.group-test :as gt] [triplex.gateway.selftest :as fixture]))

(defn request [stage]
  (let [second? (= stage "edit")
        in (gt/input {:id stage :add nil :remove (when second? "signed")})
        tx (str "_tx/" stage)
        rt gt/root
        business (if second?
                   [(assoc (gt/row "signed2" rt ":signed" nil tx) :value_type "number" :value_number 17.0)]
                   [(assoc (gt/row "signed" rt ":signed" nil tx) :value_type "number" :value_number -0.0
                           :valid_from -0.0 :valid_to 3.5 :created_by "low\u0000note")
                    (assoc (gt/row "ref" rt ":ref" "some/resource" tx) :value_type "ref")
                    (assoc (gt/row "nested" rt ":nested" nil tx) :value_type "json"
                           :value_json "{\"unknown\":[\"☃\",\"/\\\\\",false]}")])
        change (assoc (gt/row (str stage "/change") tx ":_tx/change" nil tx) :value_type "json"
                      :value_json (json/write-str (array-map "op" (if second? "retract" "assert")
                                     "tripleId" "signed" "entityId" rt "attribute" ":signed"
                                     "recordedAt" 1000.0 "validFrom" 0.0 "retractedAt" 1000.0
                                     "extra" {"escaped" "ñ/\u0001\\\""})))
        extra (conj business change)]
    (fixture/row-input (-> in
                        (update "newIds" into (map :id extra))
                        (update "rows" into (map storage/wire-row extra))))))

(defn view-rows [rows]
  (mapv (fn [r] (-> r (dissoc :route)
                     (update "valid_from" #(when % (Double/doubleToRawLongBits (double (codec/decode-value %)))))
                     (update "valid_to" #(when % (Double/doubleToRawLongBits (double (codec/decode-value %))))))) rows))

(defn read-arm [encoded?]
  (let [scope (json/write-str ["triplex-scope-v1" "test" "small" (str (java.util.UUID/randomUUID)) 0])]
    (with-redefs [main/uri-template "datomic:mem://{db}" small-row/enabled encoded?]
      (let [db-name (:db (main/create-scope! nil scope "lean" true true)) conn (main/connection (main/db-uri db-name))]
        (try
          (doseq [id ["seed" "edit"]]
            (let [in (request id) result (gt/invoke db-name conn in)
                  durable (storage/operation (d/db conn) id)]
              (is (= :ok (:outcome result)) (pr-str result))
              (is (= (if (= id "seed") "1" "2") (get-in durable [:position "v"])))
              (is (= (:t result) (get-in durable [:t "v"])))))
          (let [db (d/db conn) root gt/root
                j "_tx/seed"
                texts (map :v (d/datoms db :aevt :triplex.entity/row))
                history (fn [owner] (view-rows (:rows (storage/read-rows db-name db {"history" true "entityIds" [owner]}))))
                feed (json/read-str (journal/page conn db-name {"after" 0 "limit" 10 "replicaRows" false}))
                cut (fn [p] (view-rows (:rows (storage/read-rows db-name db {"basis" {"recordedPosition" p} "entityIds" [root]}))))
                replica (fn [p] (select-keys (json/read-str (reach/build-response db-name db {"roots" [root j] "basis" {"recordedPosition" p "validAt" 1.0} "full" true})) ["position" "entities" "closures"]))
                by-id (view-rows (:rows (storage/read-rows db-name db {"id" "seed/change" "history" true})))]
            (is (= encoded? (boolean (some #(re-find #"!1[0-9a-f]{4}\[" %) texts))))
            (is (= [1 2] (mapv second (get feed "transactions"))))
            (is (= 1 (count by-id)))
            (is (= "IdentityConflict" (:outcome (gt/invoke db-name conn (gt/input {:id "try-again" :add "signed"})))))
            {:history (history root) :journal (history j) :by-id by-id :cut [(cut 1) (cut 2)]
             :replica [(replica 1) (replica 2)]
             :feed (mapv (fn [[id p texts]] [id p (mapv lean/decode texts)]) (get feed "transactions"))})
          (finally (main/delete-scope! nil scope)))))))

(deftest native-parity
  (is (= (read-arm false) (read-arm true)))
  (with-redefs [small-row/enabled true main/uri-template "datomic:mem://{db}"]
    (is (= (gt/run-arm false) (gt/run-arm true)))))

(let [r (run-tests 'small-parity)]
  (println "W1_SMALL_PARITY" (json/write-str (assoc r :attempt (System/getenv "W1_ATTEMPT"))))
  (shutdown-agents)
  (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))
