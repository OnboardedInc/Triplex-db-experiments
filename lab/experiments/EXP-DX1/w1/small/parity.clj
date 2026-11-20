(ns small-parity
  (:require [clojure.test :refer :all] [clojure.data.json :as json]
            [datomic.api :as d] [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.codec :as codec]
            [triplex.gateway.lean :as lean] [triplex.gateway.small-row :as small-row]
            [triplex.gateway.journal :as journal] [triplex.gateway.group :as group] [triplex.gateway.reach :as reach]
            [triplex.gateway.group-test :as gt] [triplex.gateway.selftest :as fixture]
            [triplex.gateway.save-ledger :as ledger] [triplex.gateway.packed-journal :as packed])
  (:import [java.io ByteArrayInputStream]))

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

(defn read-arm [encoded? ledger?]
  (let [scope (json/write-str ["triplex-scope-v1" "test" "small" (str (java.util.UUID/randomUUID)) 0])]
    (with-redefs [main/uri-template "datomic:mem://{db}" small-row/enabled encoded?]
      (let [db-name (:db (main/create-scope! nil scope "lean" true true)) conn (main/connection (main/db-uri db-name))]
        (try
          (doseq [id ["seed" "edit"]]
            (let [in (request id)
                  merged? (and ledger? (= id "edit"))
                  result (with-redefs [ledger/enabled merged?] (gt/invoke db-name conn in))
                  db (d/db conn) durable (storage/operation db id)
                  tx (d/entid db [:triplex.tx/operation-id id])
                  e (d/entid db [:triplex.entity/id (str "_tx/" id)])
                  claim (d/entid db [:triplex.claim/command-id id])]
              (is (= :ok (:outcome result)) (pr-str result))
              (is (= (if (= id "seed") "1" "2") (get-in durable [:position "v"])))
              (is (= (:t result) (get-in durable [:t "v"])))
              (is (= merged? (= tx e claim)))
              (is (= tx (ledger/claim-tx db claim)))
              (is (= (str "_tx/" id) (ledger/claim-tx-id db claim)))
              (is (= (str "_tx/" id) (get (json/read-str (journal/command db db-name {"commandId" id})) "txId")))
              (is (= (set (for [r (map storage/decode-row (get in "rows")) :when (= (str "_tx/" id) (:entity_id r))] (:id r)))
                     (set (map (comp :id lean/decode)
                               (get (json/read-str (journal/entity db db-name {"txId" (str "_tx/" id)})) "rows")))))))
          (let [db (d/db conn) root gt/root
                j "_tx/seed" edit "_tx/edit"
                texts (map :v (d/datoms db :aevt :triplex.entity/row))
                history (fn [owner] (view-rows (:rows (storage/read-rows db-name db {"history" true "entityIds" [owner]}))))
                feed (json/read-str (journal/page conn db-name {"after" 0 "limit" 10 "replicaRows" false}))
                cut (fn [p] (view-rows (:rows (storage/read-rows db-name db {"basis" {"recordedPosition" p} "entityIds" [root]}))))
                replica (fn [p] (select-keys (json/read-str (reach/build-response db-name db {"roots" [root j edit] "basis" {"recordedPosition" p "validAt" 1.0} "full" true})) ["position" "entities" "closures"]))
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
  (let [control (read-arm false false)]
    (doseq [[packed? merged?] [[true false] [false true] [true true]]]
      (is (= control (read-arm packed? merged?)))))
  (with-redefs [small-row/enabled true main/uri-template "datomic:mem://{db}"]
    (let [reference (with-redefs [ledger/enabled false] (gt/run-arm false))]
      (doseq [[merged? grouped?] [[false true] [true false] [true true]]]
        (with-redefs [ledger/enabled merged? group/fast-reply merged?]
          (is (= reference (gt/run-arm grouped?))))))))

(defn packed-arm [kind]
  (let [scope (json/write-str ["triplex-scope-v1" "test" "ledger" (str (java.util.UUID/randomUUID)) 0])
        owner gt/root tx "_tx/edit" pfx (str "S" (apply str (repeat 24 "0")))
        ids (mapv #(str pfx %) ["A" "B" "C"])
        in (gt/input {:id "edit" :add "new" :remove "old"})
        in (-> in (update "newIds" #(mapv (fn [id] (if (= id "edit/owner") (ids 0) id)) %))
                  (update "rows" #(mapv (fn [r] (if (= "edit/owner" (get-in r ["id" "v"]))
                                                 (storage/wire-row (assoc (storage/decode-row r) :id (ids 0) :value_type "ref")) r)) %)))
        changes [(array-map "op" "assert" "tripleId" "new" "entityId" owner "attribute" ":v"
                            "value" {"type" "string" "value" "new"} "validFrom" 0.0)
                 (array-map "op" "retract" "tripleId" "old" "entityId" owner "attribute" ":v"
                            "recordedAt" 999.0 "retractedAt" 1000.0 "validFrom" 999.0)]
        rs (mapv (fn [id change] (assoc (gt/row id tx ":_tx/change" nil tx) :value_type "json" :value_json (json/write-str change))) (subvec ids 1) changes)
        in (fixture/row-input (-> in (update "newIds" into (map :id rs))
                                    (update "rows" into (map storage/wire-row rs))))]
    (with-redefs [main/uri-template "datomic:mem://{db}" small-row/enabled (not= :legacy kind)
                  ledger/enabled (not= :legacy kind) packed/enabled (= :packed kind)]
      (let [name (:db (main/create-scope! nil scope (if (= :legacy kind) "legacy" "lean") true true))
            conn (main/connection (main/db-uri name))]
        (try
          (is (= :ok (:outcome (gt/invoke name conn (gt/input {:id "seed" :add "old"})))))
          (let [reply (gt/invoke name conn in)
                db (d/db conn) e (d/entid db [:triplex.entity/id tx])
                physical (filter #(#{":_tx/change" ":_tx/changed-entity"} (:attribute (lean/decode (:v %))))
                                 (d/datoms db :eavt e :triplex.entity/row))
                native (main/route-handler {:request-method :post :uri (str "/v1/db/" name "/q")
                                     :body (ByteArrayInputStream.
                                             (.getBytes (json/write-str {"edn" "[:find ?f :in $ $rules :where [?a :triplex.attr/key \":_tx/change\"] [?f :f/attr ?a]]"
                                                                         "relations" []}) "UTF-8"))})]
            (is (= :ok (:outcome reply)) (pr-str reply))
            (if (= :legacy kind)
              (do (is (= 200 (:status native)))
                  (is (= 2 (count (:rows (json/read-str (:body native) :key-fn keyword))))))
              (do (is (= 409 (:status native)))
                  (is (= "LayoutUnsupported" (get (json/read-str (:body native)) "code")))
                  (is (= (if (= :packed kind) 0 3) (count physical)))
                  (is (= (= :packed kind) (some? (ledger/value db e :triplex.journal/packed))))))
            (when-not (= :legacy kind)
              (let [rows (get (json/read-str (journal/entity db name {"txId" tx})) "rows")
                    full (mapv lean/decode rows)
                    retired (->> full (filter #(= ":_tx/change" (:attribute %))) (map #(json/read-str (:value_json %)))
                                 (filter #(= "retract" (get % "op"))) first)
                    page (get (json/read-str (journal/page conn name {"after" 1 "limit" 1})) "transactions")]
                (is (= {"op" "retract" "tripleId" "old" "entityId" owner "attribute" ":v"
                        "value" {"type" "string" "value" "old"}
                        "recordedAt" 1000.0 "retractedAt" 1001.0 "validFrom" 0.0
                        "assertionTxId" "_tx/seed"}
                       retired))
                (is (= [[tx 2 rows]] page))
                (is (= rows (get (json/read-str (journal/entity db name {"txId" tx "basis" {"recordedPosition" 2 "validAt" 1.0}})) "rows")))
                (is (= [] (get (json/read-str (journal/entity db name {"txId" tx "basis" {"recordedPosition" 1 "validAt" 1.0}})) "rows")))
                (is (= [[tx 2]] (get (json/read-str (journal/entity-positions db name {"entityId" owner "limit" 1 "basis" {"recordedPosition" 2 "validAt" 1.0}})) "positions")))
                (with-redefs [packed/enabled false ledger/enabled false]
                  (is (= "IdentityConflict" (:outcome (gt/invoke name conn (gt/input {:id "try-to-reuse" :add (ids 0)})))))
                  (is (= "OperationDuplicate" (:outcome (gt/invoke name conn in))))
                  (is (= "CommandConflict" (:outcome (gt/invoke name conn (assoc in "operationId" "try-new-operation"))))))
                (is (= 2 (storage/head-position (d/db conn))))
                rows)))
          (finally (main/delete-scope! nil scope)))))))

(deftest packed-informational-and-native-control
  (packed-arm :legacy)
  (is (= (packed-arm :ledger) (packed-arm :packed))))

(let [r (run-tests 'small-parity)]
  (println "W1_SMALL_PARITY" (json/write-str (assoc r :attempt (System/getenv "W1_ATTEMPT"))))
  (shutdown-agents)
  (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))
