(ns w1.query6
  (:require [clojure.data.json :as json] [clojure.test :refer :all] [datomic.api :as d]
            [triplex.gateway.group :as group] [triplex.gateway.group-test :as gt] [triplex.gateway.journal :as journal]
            [triplex.gateway.lean-feed :as lean-feed] [triplex.gateway.lean-query :as lean-query]
            [triplex.gateway.main :as gateway] [triplex.gateway.save-ledger :as ledger]
            [triplex.gateway.selftest :as fixture] [triplex.gateway.storage :as storage])
  (:import [java.io ByteArrayInputStream]))

(defn send [db route input]
  (let [resp (gateway/route-handler {:request-method :post :uri (str "/v1/db/" db "/" route)
                                   :body (ByteArrayInputStream. (.getBytes (json/write-str input) "UTF-8"))})]
    [(:status resp) (json/read-str (:body resp))]))
(defn native [db clauses find basis & [extra]]
  (send db "q" (merge {"edn" (str "[:find " find " :in $ $rules :where " clauses "]")
                      "basis" basis "relations" []} extra)))
(defn answer [[status body]]
  (assert (= 200 status) (pr-str body))
  (sort (mapv #(mapv (juxt (fn [x] (get x "t")) (fn [x] (get x "v"))) %) (get body "rows"))))
(defn pattern [attr]
  (str "[?f :f/id ?id] [?f :f/attr ?a] [?a :triplex.attr/key " (pr-str attr) "] "
       "[(triplex.gateway.query/scalar $ ?f) ?value]"))
(defn raw-log [db from]
  (let [resp (gateway/route-handler {:request-method :get :uri (str "/v1/db/" db "/log")
                                    :query-string (str "fromT=" from "&limit=1000")})]
    [(:status resp) (json/read-str (:body resp))]))
(defn changes [id add old]
  (let [tx (str "_tx/" id)
        input (gt/input {:id id :add add :remove old})
        authored (mapv (fn [op p n]
                         (assoc (gt/row (str id "/change-" n) tx ":_tx/change" nil tx)
                           :value_type "json" :value_json (json/write-str {"op" op "tripleId" p
                              "entityId" gt/root "attribute" ":v" "value" {"type" "string" "value" p}
                              "recordedAt" 1000.0 "validFrom" 0.0})))
                       (if old ["assert" "retract"] ["assert"]) (if old [add old] [add]) (range))
        actor (gt/row (str id "/actor") tx ":_tx/actor" "client" tx)
        rows (mapv (fn [r] (cond-> r (= ":_tx/changed-entity" (:attribute r)) (assoc :value_type "ref")))
                   (mapv storage/decode-row (get input "rows")))
        extra (conj authored actor)]
    (fixture/row-input (assoc input "newIds" (into (get input "newIds") (map :id extra))
                                   "rows" (mapv storage/wire-row (into rows extra))))))

(defn exercise [layout]
  (let [scope (json/write-str ["triplex-scope-v1" "test" "query6" (str (System/getenv "W1_ATTEMPT") "-" layout) 0])
        name (:db (gateway/create-scope! nil scope layout true true)) conn (gateway/connection (gateway/db-uri name))
        lean? (= "lean" layout) head {"recordedPosition" 2 "validAt" 1.0}]
    (try
      (let [input (changes "seed" "early" nil)
            first-reply (storage/commit! name conn (d/db conn) input)
            held (:handle (storage/begin! name (d/db conn)))
            disabled (with-redefs [lean-query/enabled false] (native name (pattern ":_tx/change") "?id ?value" head {"basis" {"recordedPosition" 1}}))
            next-reply (storage/commit! name conn (d/db conn) (changes "edit" "later" "early"))
            edit-world {"recordedPosition" 2 "validAt" 1.0}
            earlier {"recordedPosition" 1 "validAt" 1.0}
            match (fn [a cut] (let [[status data] (send name "read" {"basis" cut "pattern" {"attribute" a "entityType" "_Transaction"}})]
                                 (assert (= status 200) data)
                                 (vec (sort-by #(get-in % ["id" "v"]) (get data "rows")))))
            [off-status off-log] (with-redefs [lean-feed/enabled false] (raw-log name 0))
            [on-status on-log] (raw-log name 0)
            commits (filter #(= "commit" (get % "kind")) (get on-log "rows"))
            resumed (second (raw-log name (get on-log "nextT")))
            feed (mapv #(get % "transaction") commits)]
        (is (= ["1" "2"] (mapv #(get-in % [:position "v"]) [first-reply next-reply])))
        (is (= (if lean? [409 "LayoutUnsupported"] [200 nil]) [(first disabled) (get (second disabled) "code")]))
        (is (= 3 (count (match ":_tx/change" edit-world))))
        (is (= 2 (count (match ":_tx/changed-entity" edit-world))))
        (is (= (if lean? [409 "LayoutUnsupported"] [200 nil]) [off-status (get off-log "code")]))
        (when-not lean?
          (is (some #(= ":_tx/change" (get % "attribute"))
                    (mapcat #(get-in % ["transaction" "changes"]) (get off-log "rows")))))
        (is (= 200 on-status))
        (is (= [[["assert" "early" ":v"]] [["retract" "early" ":v"] ["assert" "later" ":v"]]]
               (mapv (fn [tx] (mapv #(mapv % ["op" "assertionId" "attribute"]) (get tx "changes"))) feed)))
        (is (= [] (get resumed "rows")))
        (when lean?
          (let [[status content] (native name "[?f :f/id _]" "?f" edit-world)]
            (is (= [409 "LayoutUnsupported"] [status (get content "code")])))
          (is (= [["_tx/edit" 2] ["_tx/seed" 1]]
                 (get (json/read-str (journal/entity-positions (d/db conn) name {"entityId" gt/root "limit" 2 "basis" edit-world})) "positions")))
          (is (= "_tx/seed" (get (json/read-str (journal/command (d/db conn) name {"commandId" "seed"})) "txId")))
          (is (= [1 2] (mapv second (get (json/read-str (journal/page conn name {"after" 0 "limit" 2})) "transactions")))))
        (let [actor-join (str "[?f :f/id ?id] [?f :f/attr ?a] [?a :triplex.attr/key \":v\"] "
                           "[(triplex.gateway.query/transaction-id $ ?f) ?tx] "
                           "[?txe :triplex.entity/id ?tx] [?aFact :f/subject ?txe] "
                           "[?aFact :f/attr ?actorName] [?actorName :triplex.attr/key \":_tx/actor\"] "
                           "[(triplex.gateway.query/scalar $ ?aFact) ?actor]")
              current (str (pattern ":v") " [(triplex.gateway.query/visible $ ?f 1.0 nil 2)]")
              point (str (pattern ":_tx/change") " [?f :f/subject ?e] [?e :triplex.entity/id \"_tx/edit\"]")
              queries [(native name (pattern ":_tx/change") "?id ?value" edit-world)
                       (native name (pattern ":_tx/changed-entity") "?id ?value" edit-world)
                       (native name point "?id ?value" edit-world)
                       (native name actor-join "?id ?actor" edit-world)
                       (native name current "?id ?value" edit-world)
                       (native name (pattern ":_tx/change") "?id ?value" earlier {"handle" held})
                       (native name (str "[?f :f/id ?id] [?f :f/subject _] (not-join [?f] [?f :f/live _])") "?id" edit-world)]
              result (mapv answer queries)]
          (is (= [3 2 2 2 1 1 1] (mapv count result)))
          (is (= [[ ["string" "later"] ["string" "later"] ]] (vec (nth result 4))))
          (storage/release! name held)
          {:queries result :feed feed :match [(match ":_tx/change" edit-world) (match ":_tx/changed-entity" earlier)]}))
      (finally (gateway/delete-scope! nil scope)))))

(deftest stored-journal-and-native-projections
  (with-redefs [gateway/uri-template "datomic:mem://{db}" lean-query/enabled true lean-feed/enabled true ledger/enabled true]
    (is (= (exercise "legacy") (exercise "lean")))))

(deftest group-interior-positions
  ;; [DX-W1] Why: an assertion born and retired at one physical t still has a readable logical cut.
  ;; Rejected: comparing only the group's final database and missing a lost interior feed event.
  (with-redefs [gateway/uri-template "datomic:mem://{db}" lean-query/enabled true lean-feed/enabled true
                ledger/enabled true group/enabled true]
    (let [scope (json/write-str ["triplex-scope-v1" "test" "query6" (str (System/getenv "W1_ATTEMPT") "-group") 0])
          name (:db (gateway/create-scope! nil scope "lean" true true)) conn (gateway/connection (gateway/db-uri name))
          entered (promise) release (promise) execute group/execute! lane (group/lane-for conn)
          commit #(storage/commit! name conn (d/db conn) (apply changes %))]
      (try
        (let [[seed a b] (with-redefs [group/execute! (fn [c entries]
                                                       (when (= "seed" (:id (first entries)))
                                                         (deliver entered true)
                                                         @release)
                                                       (execute c entries))]
                            (let [s (future (commit ["seed" "early" nil]))]
                              (try
                                (assert (deref entered 5000 false))
                                (let [x (future (commit ["edit" "middle" "early"]))
                                      _ (gt/wait-until #(= 1 (count (:queue @lane))))
                                      y (future (commit ["last" "late" "middle"]))
                                      _ (gt/wait-until #(= 2 (count (:queue @lane))))]
                                  (deliver release true)
                                  (mapv deref [s x y]))
                                (finally (deliver release true)))))
              t (get-in a [:t "v"])
              log-entry (get-in (second (raw-log name t)) ["rows" 0 "transaction"])
              answers (mapv (fn [p]
                              (answer (native name (str (pattern ":v") " [(triplex.gateway.query/visible $ ?f 1.0 nil " p ")]")
                                              "?id" {"recordedPosition" p "validAt" 1.0}))) [1 2 3])]
          (is (= ["1" "2" "3"] (mapv #(get-in % [:position "v"]) [seed a b])))
          (is (= t (get-in b [:t "v"])))
          (is (= [[ [["string" "early"]] ] [[["string" "middle"]]] [[["string" "late"]]]] answers))
          (is (= ["2" "3"] (get log-entry "positions")))
          (is (= [["2" "early" "retract"] ["2" "middle" "assert"] ["3" "late" "assert"] ["3" "middle" "retract"]]
                 (mapv #(mapv % ["position" "assertionId" "op"]) (get log-entry "changes"))))
          (is (= #{"edit" "last"} (set (get log-entry "commandIds")))))
        (finally (deliver release true) (gateway/delete-scope! nil scope))))))

(let [r (run-tests 'w1.query6)]
  (println "W1_QUERY6" (json/write-str (assoc r :attempt (System/getenv "W1_ATTEMPT"))))
  (shutdown-agents)
  (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))
