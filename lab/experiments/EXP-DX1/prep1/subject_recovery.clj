(load-file "/config/regression.clj")
(load-file "/config/subject_gate.clj")
(load-file "/config/subject_conflicts.clj")
(ns subject-recovery
  (:require [clojure.data.json :as json]
            [clojure.test :as test]
            [datomic.api :as d]
            [subject-gate :as gate]
            [triplex.gateway.group-test :as fixture]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.main :as main]
            [triplex.gateway.replay-capture :as replay]
            [triplex.gateway.selftest :as rows]
            [triplex.gateway.storage :as storage]
            [triplex.gateway.subject-save :as subject]
            [wfix1-regression :as reference]))

(def attempt (System/getenv "PREP1_ATTEMPT"))
(def scope (json/write-str ["triplex-scope-v1" "test" "subject-recovery" attempt 0]))
(defn emit [label value]
  (println "PREP1_SUBJECT_RECOVERY" (json/write-str {:attempt attempt :label label :value value}))
  (flush))
(defn native-journal [input]
  (rows/row-input
    (update input "rows"
      (fn [facts]
        (mapv (fn [row]
                (if (= ":_tx/changed-entity" (get-in row ["attribute" "v"]))
                  (assoc-in row ["value_type" "v"] "ref")
                  row))
              facts)))))
(defn request []
  (let [[_ a] (reference/edits)] (native-journal (assoc a "sourceK" 1))))
(defn open! []
  (let [{:keys [db created]} (main/create-scope! nil scope "lean" true true)
        options (main/write-options db)]
    (assert (= subject/enabled (boolean (:subjectSave options))))
    (assert (:commitFunctionInstalled options))
    [db (main/connection (main/db-uri db)) created
     (if subject/enabled (:subjectFunction options) (:commitFunction options))
     (:subjectFunctionTx options)]))

(defn seed! [db]
  (let [[seed] (reference/edits)]
    (assert (= [200 nil] (reference/outcome (reference/send db (native-journal (gate/deep-seed seed))))))))

(defn witness [db function fn-tx native-t]
  (let [receipt (reference/operation db "edit-a")]
    (assert (= (str native-t) (get-in receipt ["t" "v"])))
    (assert (= (get (reference/claim db "edit-a") "receipt") receipt))
    (assert (= "2" (get-in receipt ["position" "v"])))
    (assert (= 1001.0 (get-in receipt ["recordedAt" "v"])))
    {:attempt attempt :db db :function function :functionTx fn-tx :prepared subject/enabled
     :nativeT (str native-t) :receipt receipt :planOperation "edit-a"}))

(defn before [file]
  (let [[db _ created function fn-tx] (open!)]
    (assert created)
    (seed! db)
    ;; [DX-PREP1] Why: intercept the common completed native report before either writer returns its response.
    ;; Rejected: crashing on a timer or acknowledging a planned report before the durable append.
    (with-redefs [replay/completed!
                  (fn [report input]
                    (assert (= "edit-a" (input "operationId")))
                    (assert (= (when subject/enabled function) (:subject-save report)))
                    (let [proof (witness db function fn-tx (d/basis-t (:db-after report)))
                          temporary (java.io.File. (str file ".tmp"))]
                      (emit "blocked-before-reply" proof)
                      (spit temporary (json/write-str proof))
                      (assert (.renameTo temporary (java.io.File. file)))
                      @(promise)))]
      (reference/send db (request))
      (throw (ex-info "The gateway replied before the hard stop" {})))))

(defn read-after [db conn held]
  (let [view (d/db conn)
        read-cut (fn [position]
                   (filter #(= ":v" (get-in % ["attribute" "v"]))
                     (get-in (reference/route db "v1" "read" {"entityIds" [fixture/root]
                                 "basis" {"recordedPosition" position "validAt" 5.0}}) [:body "rows"])))
        [before after] (mapv read-cut [1 2])
        route #(reference/route db "v2" %1 %2)
        page (:body (route "transactions" {"after" 1 "limit" 1}))
        entry (first (page "transactions"))
        command-reply (route "command" {"commandId" "edit-a"})
        journal-reply (route "journal" {"txId" "_tx/edit-a"})
        entity-reply (route "entity-transactions" {"entityId" fixture/root "limit" 10
                                                  "basis" {"recordedPosition" 2 "validAt" 5.0}})
        claim (reference/claim db "edit-a")
        native-t (parse-long (held "nativeT"))
        data (mapcat :data (d/tx-range (d/log conn) native-t (inc native-t)))
        row-a (d/entid view :triplex.entity/row)
        eid (d/entid view [:triplex.entity/id fixture/root])
        query (fn [position valid-at]
                (reference/route db "v1" "q"
                  {"edn" (str "[:find ?id :in $ $rules :where [?f :f/id ?id] [?f :f/attr ?a] "
                              "[?a :triplex.attr/key \":v\"] "
                              "[(triplex.gateway.query/visible $ ?f " valid-at " nil " position ")]]")
                   "relations" [] "basis" {"recordedPosition" position "validAt" valid-at}}))
        queries (mapv #(apply query %) [[1 5.0] [2 5.0] [2 50.0]])
        log-response (main/route-handler {:request-method :get :uri (str "/v1/db/" db "/log")
                                         :query-string (str "fromT=" (dec native-t) "&limit=10")})
        log-result (json/read-str (:body log-response))
        native-entry (first (filter #(= (str native-t) (get % "t")) (log-result "rows")))]
    (assert (= ["old" "middle"] (mapv #(get-in (first %) ["id" "v"]) [before after])))
    (assert (= ["_tx/edit-a" 2] (subvec entry 0 2)))
    (assert (empty? (get-in (route "transactions" {"after" 2 "limit" 1}) [:body "transactions"])))
    (assert (= 1000.0 (get-in (reference/changes entry) ["retract" "recordedAt"])))
    (assert (= 1001.0 (get-in (reference/changes entry) ["retract" "retractedAt"])))
    (assert (= [200 200 200] (mapv :status [command-reply journal-reply entity-reply])))
    (assert (= {"txId" "_tx/edit-a"} (:body command-reply)))
    (assert (= (set (nth entry 2)) (set (get-in journal-reply [:body "rows"]))))
    (assert (= [["_tx/edit-a" 2] ["_tx/seed" 1]] (get-in entity-reply [:body "positions"])))
    (assert (= (held "receipt") (claim "receipt")))
    (assert (= #{"middle"} (set (for [text (d/q '[:find [?row ...] :in $ ?e :where [?e :triplex.entity/row ?row]] view eid)
                                         :let [row (lean/decode text)]
                                         :when (= ":v" (:attribute row))] (:id row)))))
    (assert (= #{["middle" true] ["old" false]}
               (set (for [x data :when (and (= eid (:e x)) (= row-a (:a x)))]
                      [(:id (lean/decode (:v x))) (:added x)]))))
    ;; [DX-PREP1] Why: read the recovered edit through the public native query and log adapters.
    ;; Rejected: treating internal Peer API checks as evidence for the HTTP surfaces.
    (assert (every? #(= 200 (:status %)) queries))
    (assert (= [["old"] ["middle"] []]
               (mapv #(mapv (fn [r] (get-in r [0 "v"])) (get-in % [:body "rows"])) queries)))
    (assert (= 200 (:status log-response)))
    (assert (= #{["retract" "old" ":v"] ["assert" "middle" ":v"]}
               (set (map #(mapv % ["op" "assertionId" "attribute"])
                         (get-in native-entry ["transaction" "changes"])))))
    {:feed entry :claim claim :nativeT (str native-t)
     :command command-reply :journal journal-reply :entityTransactions entity-reply
     :nativeQueries queries :nativeLog native-entry}))

(defn after [file]
  (let [held (json/read-str (slurp file)) [db conn created function fn-tx] (open!) input (request)]
    (assert (= [attempt db function fn-tx subject/enabled false]
              [(held "attempt") (held "db") (held "function") (held "functionTx") (held "prepared") created]))
    (let [before (read-after db conn held)
          retry (reference/outcome (reference/send db input))
          fresh-retry (reference/outcome (reference/send db (assoc input "operationId" "new-operation")))]
      (assert (= [409 "OperationDuplicate"] retry))
      (assert (= [409 "CommandConflict"] fresh-retry))
      (assert (= {"status" "absent"} (reference/operation db "new-operation")))
      (assert (= 2 (storage/head-position (d/db conn))))
      (assert (= before (read-after db conn held)))
      (emit "reopened" (assoc before :originalOperation retry :newOperation fresh-retry)))))

(defn query-gate []
  (let [[db conn created function fn-tx] (open!)]
    (assert created)
    (seed! db)
    (let [reply (reference/send db (request))]
      (assert (= [200 nil] (reference/outcome reply)))
      (assert (= (when subject/enabled function) (get-in reply [:body "subjectSave"])))
      (let [proof (witness db function fn-tx (get-in reply [:body "t" "v"]))]
        (emit "queries" {:held proof :observed (read-after db conn (update-keys proof name))})))))

(let [[phase file] *command-line-args*]
  (try
    (case phase
      "before" (before file)
      "after" (after file)
      "query" (query-gate)
      "gate" (let [{:keys [fail error] :as result}
                    (test/run-tests 'subject-gate 'subject-conflicts 'wfix1-regression)]
                 (emit "tests" result)
                 (when-not (zero? (+ fail error)) (System/exit 1))))
    (finally (shutdown-agents)))
  (System/exit 0))
