(ns triplex.gateway.journal-page-test
  "[DX-ACT8, fifth review Y6] The journal page's size bound: a page whose text passes `journal/page-max-chars` is refused,
  typed (413 JournalPageTooLarge, `maximum` the transactions that fitted), a page of one transaction never is, and a page
  under the bound is the same page as before."
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.journal :as journal] [triplex.gateway.selftest :as fixture]))

(def root "acct/test/person")
(defn- row [id e attr val tx]
  {:id id :entity_id e :entity_type (when (not= e root) "_Transaction") :attribute attr
   :value_type "string" :value_string val :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})
(defn- input [k ^String value]
  (let [id (str "big-" k) tx (str "_tx/" id) fact (row (str "fact-" k) root (str ":v" k) value tx)
        j (fn [suffix attr val] (row (str id "/" suffix) tx attr val tx))
        journal [(assoc (j "p" ":_tx/position" nil) :value_type "number" :value_number 1.0)
                 (assoc (j "t" ":_tx/instant" nil) :value_type "datetime" :value_datetime (+ 1000.0 k))
                 (j "owner" ":_tx/changed-entity" root) (j "cmd" ":_tx/command-id" id)]
        fresh (conj journal fact)]
    (fixture/row-input {"sourceK" nil "span" 1 "position" 1 "scopeWide" false "entities" [root]
      "operationId" id "rows" (mapv storage/wire-row fresh)
      "newIds" (mapv :id fresh) "claims" [{"commandId" id "txId" tx "timestamp" (+ 1000.0 k)}]})))
(defn- refusal [f] (try (f) nil (catch clojure.lang.ExceptionInfo e (select-keys (ex-data e) [:status :code :maximum]))))

(deftest a-page-past-the-bound-is-refused-typed
  (let [scope (json/write-str ["triplex-scope-v1" "test" "test" (str (java.util.UUID/randomUUID)) 0])
        name (:db (main/create-scope! nil scope "lean" true true)) conn (main/connection (main/db-uri name))
        value (apply str (repeat 200 "x"))]
    (try
      (doseq [k (range 6)] (storage/commit! name conn (d/db conn) (input k value)))
      (let [page (fn [limit] (journal/page conn name {"after" 0 "limit" limit}))
            text (page 6) whole (json/read-str text)
            ;; The page's text grows with each transaction's journal rows; a bound at half of it refuses the whole page.
            cap (quot (count text) 2)]
        (is (= 6 (count (get whole "transactions"))) "under the default bound: the page as before")
        (with-redefs [journal/page-max-chars cap]
          (let [r (refusal #(page 6)) m (:maximum r)]
            (is (= {:status 413 :code "JournalPageTooLarge"} (dissoc r :maximum)) "refused, typed")
            (is (and (integer? m) (<= 1 m 5)) (str "naming how many fit: " m))
            (is (= (take m (get whole "transactions")) (get (json/read-str (page m)) "transactions")) "asking for that many is served, the same transactions")
            (is (= m (:maximum (refusal #(page (inc m))))) "one more is refused again")))
        (with-redefs [journal/page-max-chars 100]
          (is (= 1 (count (get (json/read-str (page 1)) "transactions"))) "a page of one transaction is never refused")
          (is (= 1 (:maximum (refusal #(page 2)))))))
      (finally (main/delete-scope! nil scope)))))
