(ns wfix1-regression
  (:require [clojure.data.json :as json] [clojure.test :refer [deftest is testing]]
            [clojure.string :as str] [clojure.walk :as walk] [datomic.api :as d]
            [triplex.gateway.group :as group] [triplex.gateway.group-test :as fixture]
            [triplex.gateway.lean :as lean] [triplex.gateway.main :as main]
            [triplex.gateway.predecessor :as pred] [triplex.gateway.selftest :as rows]
            [triplex.gateway.small-row :as small]
            [triplex.gateway.storage :as storage] [triplex.gateway.write-policy :as policy])
  (:import [java.io ByteArrayInputStream] [java.nio.charset StandardCharsets] [java.util UUID]))

(defn in-scope [f]
  (let [scope (json/write-str ["triplex-scope-v1" "test" "write-regression" (str (UUID/randomUUID)) 0])]
    (with-redefs [main/uri-template (or (System/getenv "WFIX1_URI") "datomic:mem://{db}")]
      (let [name (:db (main/create-scope! nil scope "lean" true true))
            conn (main/connection (main/db-uri name))]
        (try (f name conn)
             (finally (main/delete-scope! nil scope)))))))

(defn route [name version action input]
  (let [{:keys [status body]} (main/route-handler
        {:request-method (if (nil? input) :get :post)
         :uri (str "/" version "/db/" name "/" action)
         :body (when input (ByteArrayInputStream. (.getBytes ^String (json/write-str input) StandardCharsets/UTF_8)))})]
    {:status status :body (json/read-str (if (string? body) body (String. ^bytes body StandardCharsets/UTF_8)))}))

(defn send [name input] (route name "v1" "transact" input))
(defn operation [name id] (:body (route name "v1" (str "operation/" id) nil)))
(defn claim [name id] (:body (route name "v1" "claim" {"commandId" id "receipt" true})))
(defn feed [name after limit] (get-in (route name "v2" "transactions" {"after" after "limit" limit}) [:body "transactions"]))
(defn outcome [reply] [(:status reply) (get-in reply [:body "code"])])

(defn save
  ([id add retire] (save id fixture/root add retire))
  ([id owner add retire]
   (walk/postwalk-replace {fixture/root owner} (fixture/input {:id id :add add :remove retire}))))

(defn ready-batch [name conn leader offers]
  ;; [DX-WFIX1] Why: observe actual queue admission before opening the native turn.
  ;; Rejected: sleeping between offers (HTTP threads can reorder).
  (let [started (promise) resume (promise) execute group/execute! lane (group/lane-for conn)]
    (with-redefs [group/execute! (fn [c batch]
                    (when (= (get leader "operationId") (:id (first batch)))
                      (deliver started true)
                      (assert (deref resume 5000 false) "admission barrier timed out"))
                    (execute c batch))]
      (let [head (future (send name leader))]
        (try
          (assert (deref started 5000 false) "leader did not reach the writer")
          (let [pending (mapv (fn [i input]
                                (let [request (future (send name input))]
                                  (fixture/wait-until #(= (inc i) (count (:queue @lane))))
                                  request)) (range) offers)]
            (deliver resume true)
            (into [@head] (map deref pending)))
          (finally (deliver resume true)))))))

(defn expect-receipt [name command tx id position clock]
  (let [found (claim name command) saved (get found "receipt")]
    (is (= {"commandId" command "txId" tx "receipt" (operation name id)} found))
    (is (= {"status" "committed" "operationId" id
            "position" {"t" "long" "v" (str position)} "recordedAt" {"t" "double" "v" clock}
            "t" {"t" "long" "v" (get-in saved ["t" "v"])}}
           saved))
    (is (pos? (parse-long (get-in saved ["t" "v"]))))
    saved))

(deftest replacement-resends
  (with-redefs [group/enabled true policy/priority? true policy/field-only? false]
    (in-scope
     (fn [name conn]
       (let [replace (save "edit" "new" "old")
             native d/transact-async
             result (with-redefs [d/transact-async (fn [c tx & options]
                      (if (= :triplex.group/apply-v1 (ffirst tx))
                        (do @(apply native c tx options)
                            (delay (throw (ex-info "Native reply discarded after commit" {}))))
                        (apply native c tx options)))]
                      (ready-batch name conn (save "seed" "old" nil)
                                   [replace (save "peer" "acct/peer/person" "peer-row" nil)]))
             original (expect-receipt name "edit" "_tx/edit" "edit" 2 1001.0)
             before (feed name 0 10)]
         (is (= [[200 nil] [503 "OutcomeUnknown"] [503 "OutcomeUnknown"]] (mapv outcome result)))
         (is (= (get original "t") (get (operation name "peer") "t")))
         (is (= [409 "OperationDuplicate"] (outcome (send name replace))))
         (is (= [409 "CommandConflict"] (outcome (send name (assoc replace "operationId" "fresh")))))
         (is (= [409 "CasConflict"] (outcome (send name (save "conflict" "unused" "old")))))
         (is (= original (expect-receipt name "edit" "_tx/edit" "edit" 2 1001.0)))
         (is (= {"status" "absent"} (operation name "fresh") (operation name "conflict")))
         (is (= [["_tx/seed" 1] ["_tx/edit" 2] ["_tx/peer" 3]] (mapv #(subvec % 0 2) before)))
         (is (= before (feed name 0 10)))
         (is (= 3 (storage/head-position (d/db conn)))))))))

(deftest exact-resend-queued-before-commit
  (doseq [mode [:singleton :grouped :fallback]]
    (testing (name mode)
      (with-redefs [group/enabled true policy/priority? true policy/field-only? false]
        (in-scope
         (fn [name conn]
           (is (= [200 nil] (outcome (send name (save "seed" "old" nil)))))
           (let [edit (save "edit" "new" "old")
                 native d/transact-async
                 grouped (atom 0)
                 offers (cond-> [edit] (not= :singleton mode) (conj (save "peer" "acct/peer/person" "peer-row" nil)))
                 result (with-redefs [d/transact-async (fn [c tx & opts]
                          (when (= :triplex.group/apply-v1 (ffirst tx))
                            (swap! grouped inc)
                            (when (= :fallback mode)
                              @(native c [[:db/add "datomic.tx" :db/doc "independent native append"]])))
                          (apply native c tx opts))]
                          (ready-batch name conn edit offers))
                 original (expect-receipt name "edit" "_tx/edit" "edit" 2 1001.0)]
             (is (= (if (= :singleton mode) [[200 nil] [409 "OperationDuplicate"]]
                        [[200 nil] [409 "OperationDuplicate"] [200 nil]]) (mapv outcome result)))
             (is (= (if (= :singleton mode) 0 1) @grouped))
             (is (= (select-keys (get-in result [0 :body]) ["operationId" "position" "recordedAt" "t"])
                    (dissoc original "status")))
             (is (= (cond-> [["_tx/seed" 1] ["_tx/edit" 2]] (not= :singleton mode) (conj ["_tx/peer" 3]))
                    (mapv #(subvec % 0 2) (feed name 0 10))))
             (is (= (+ 1 (count offers)) (storage/head-position (d/db conn)))))))))))

(defn change [op id value from to clock tx]
  (cond-> {"op" op "tripleId" id "entityId" fixture/root "attribute" ":v"
           "value" {"type" "string" "value" value} "validFrom" from
           "recordedAt" clock "assertionTxId" tx}
    to (assoc "validTo" to)))

(defn edit-frame [command id value from to predecessor]
  (let [input (save command id predecessor)
        tx (str "_tx/" command)
        business (fn [r]
                   (cond-> (storage/decode-row r)
                     (= id (get-in r ["id" "v"])) (assoc :value_string value :valid_from from :valid_to to)))
        changes (cond-> [(change "assert" id value from to 1000.0 tx)]
                  predecessor (conj (assoc (change "retract" predecessor "client estimate" 0.0 90.0 1000.0 "_tx/estimate")
                                           "retractedAt" 1000.0 "retractionTxId" tx)))
        journal (mapv (fn [c]
                        (assoc (fixture/row (str command "/" (c "op")) tx ":_tx/change" nil tx)
                               :value_type "json" :value_json (json/write-str c))) changes)]
    (rows/row-input (-> input (assoc "rows" (mapv storage/wire-row (concat (map business (input "rows")) journal)))
                        (update "newIds" into (map :id journal))))))

(defn changes [[_ _ texts]]
  (let [entries (for [text texts :let [row (lean/decode text)] :when (= ":_tx/change" (:attribute row))]
                  (let [change (json/read-str (:value_json row))]
                    [(change "op") change]))
        indexed (into {} entries)]
    (assert (= (count indexed) (count entries)) "Fixture contains duplicate change operations")
    indexed))

(defn edits []
  [(edit-frame "seed" "old" "old value" -9.0 40.0 nil)
   (edit-frame "edit-a" "middle" "intermediate value" 2.0 12.0 "old")
   (edit-frame "edit-b" "new" "final value" 3.0 nil "middle")])

(defn replay-observations [name]
  (let [all (feed name 0 10)
        resume (feed name 2 1)]
    {:feed (mapv (fn [tx] [(first tx) (second tx) (changes tx)]) all)
     :resume (mapv (fn [tx] [(first tx) (second tx) (changes tx)]) resume)
     :rawFeed all :rawResume resume
     :cuts (mapv (fn [p]
                   (get-in (route name "v1" "read" {"entityIds" [fixture/root]
                                                  "basis" {"recordedPosition" p "validAt" 5.0}}) [:body "rows"]))
                 [1 2 3])
     :receipts (mapv #(claim name %) ["seed" "edit-a" "edit-b"])
     :operations (mapv #(operation name %) ["seed" "edit-a" "edit-b"])}))

(deftest retraction-content-at-interior-cut-and-resume
  (doseq [[grouped compact predecessor] [[false false false] [true false false] [true true true]]]
    (testing (str [grouped compact predecessor])
      (with-redefs [group/enabled grouped small/enabled compact pred/enabled predecessor
                    policy/priority? grouped policy/field-only? grouped]
        (in-scope
         (fn [name conn]
           (let [[seed a b] (edits)
                 result (if grouped (ready-batch name conn seed [a b]) (mapv #(send name %) [seed a b]))
                 [first-a middle last-b] [(change "assert" "old" "old value" -9.0 40.0 1000.0 "_tx/seed")
                                          (change "assert" "middle" "intermediate value" 2.0 12.0 1001.0 "_tx/edit-a")
                                          (change "assert" "new" "final value" 3.0 nil 1002.0 "_tx/edit-b")]
                 retired (fn [c clock tx] (assoc c "op" "retract" "retractedAt" clock "retractionTxId" tx))
                 expected [["_tx/seed" 1 {"assert" first-a}]
                           ["_tx/edit-a" 2 {"assert" middle "retract" (retired first-a 1001.0 "_tx/edit-a")}]
                           ["_tx/edit-b" 3 {"assert" last-b "retract" (retired middle 1002.0 "_tx/edit-b")}]]
                 actual (replay-observations name)
                 middle-row (:v (lean/by-id (d/history (d/db conn)) "middle"))
                 retraction-row (:v (lean/by-id (d/db conn) "edit-b/retract"))]
             (is (= [[200 nil] [200 nil] [200 nil]] (mapv outcome result)))
             (is (= grouped (= (get-in result [1 :body "t"]) (get-in result [2 :body "t"]))))
             (is (= compact (boolean (str/includes? middle-row "!1"))
                            (boolean (str/includes? retraction-row "!1"))))
             (is (= expected (:feed actual)))
             (is (= [(peek expected)] (:resume actual)))
             (is (empty? (feed name 3 1)))
             (is (= [[["old" "old value" 1000.0 -9.0 40.0]]
                     [["middle" "intermediate value" 1001.0 2.0 12.0]]
                     [["new" "final value" 1002.0 3.0 nil]]]
                    (mapv (fn [cut] (mapv (fn [r] (mapv #(get-in r [% "v"])
                                                   ["id" "value_string" "recorded_at" "valid_from" "valid_to"])) cut))
                          (:cuts actual))))
             (when-let [attempt (System/getenv "WFIX1_ATTEMPT")]
               (println "WFIX1_REPLAY" (json/write-str (assoc actual :attempt attempt :database name
                                                          :mode [grouped compact predecessor])))))))))))
