(load-file "/config/regression.clj")
(load-file "/config/subject_gate.clj")
(load-file "/config/subject_conflicts.clj")
(ns subject-recovery
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [clojure.test :as test]
            [datomic.api :as d]
            [subject-gate :as gate]
            [triplex.gateway.group-test :as fixture]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.main :as main]
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
    (assert (= (str subject/ident) (:subjectFunction options)))
    [db (main/connection (main/db-uri db)) created (:subjectFunctionTx options)]))

(defn before [file]
  (let [[db conn created fn-tx] (open!)
        [seed] (reference/edits) input (request)
        verify subject/verify-report]
    (assert created)
    (assert (= [200 nil] (reference/outcome (reference/send db (native-journal (gate/deep-seed seed))))))
    ;; [DX-PREP1] Why: the runner kills the gateway while the subject HTTP response still waits on this thread.
    ;; Rejected: throwing after a client already has its receipt or killing on an elapsed timer.
    (with-redefs [subject/verify-report
                  (fn [native-report plan]
                    (let [report (verify native-report plan)
                          receipt (reference/operation db "edit-a")
                          native-t (d/basis-t (:db-after report))
                          witness {:attempt attempt :db db :function (str subject/ident) :functionTx fn-tx
                                   :nativeT (str native-t) :receipt receipt :planOperation (:operation plan)}
                          temporary (java.io.File. (str file ".tmp"))]
                      (assert (= (str native-t) (get-in receipt ["t" "v"])))
                      (assert (= (get (reference/claim db "edit-a") "receipt") receipt))
                      (assert (= "edit-a" (:operation plan)))
                      (assert (= "2" (get-in receipt ["position" "v"])))
                      (assert (= 1001.0 (get-in receipt ["recordedAt" "v"])))
                      (emit "blocked-before-reply" witness)
                      (spit temporary (json/write-str witness))
                      (assert (.renameTo temporary (java.io.File. file)))
                      @(promise)))]
      (reference/send db input)
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
        eid (d/entid view [:triplex.entity/id fixture/root])]
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
    {:feed entry :claim claim :nativeT (str native-t)
     :command command-reply :journal journal-reply :entityTransactions entity-reply}))

(defn after [file]
  (let [held (json/read-str (slurp file)) [db conn created fn-tx] (open!) input (request)]
    (assert (= [attempt db (str subject/ident) fn-tx false]
              [(held "attempt") (held "db") (held "function") (held "functionTx") created]))
    (let [before (read-after db conn held)
          retry (reference/outcome (reference/send db input))
          fresh-retry (reference/outcome (reference/send db (assoc input "operationId" "new-operation")))]
      (assert (= [409 "OperationDuplicate"] retry))
      (assert (= [409 "CommandConflict"] fresh-retry))
      (assert (= {"status" "absent"} (reference/operation db "new-operation")))
      (assert (= 2 (storage/head-position (d/db conn))))
      (assert (= before (read-after db conn held)))
      (emit "reopened" (assoc before :originalOperation retry :newOperation fresh-retry)))))

(defn erase-observation []
  (reference/in-scope
    (fn [db conn]
      (let [marker (str "synthetic-erase-" attempt)
            seed (reference/edit-frame "seed" "protected-id" marker 1.0 30.0 nil)
            edit (assoc (reference/edit-frame "edit" "replacement-id" "public" 1.0 30.0 "protected-id") "sourceK" 1)
            _ (assert (= [200 nil] (reference/outcome (reference/send db seed))))
            held (get-in (reference/route db "v1" "snapshot" {}) [:body "handle"])
            reply (reference/send db edit)
            _ (assert (= (str subject/ident) (get-in reply [:body "subjectSave"])))
            view (d/db conn)
            owner (d/entid view [:triplex.entity/id fixture/root])
            match (fn [handle]
                    (reference/route db "v1" "read"
                      (cond-> {"entityIds" [fixture/root] "history" true
                               "basis" {"recordedPosition" 1 "validAt" 5.0}}
                        handle (assoc "handle" handle))))
            contains-marker? #(str/includes? (pr-str %) marker)
            _ (assert (and (contains-marker? (match held)) (contains-marker? (reference/feed db 0 10))))
            request @(d/transact conn [{:db/excise owner :db.excise/attrs [:triplex.entity/row]}])
            t (d/basis-t (:db-after request))
            _ (d/request-index conn)
            current (deref (d/sync-excise conn t) 120000 ::timeout)
            _ (assert (not= ::timeout current))
            native (mapv :v (d/datoms (d/history current) :eavt owner :triplex.entity/row))
            fresh (match nil)
            old-pin (match held)
            journal (reference/feed db 0 10)
            replay (reference/send db (reference/save "identity-replay" "acct/else/person" "protected-id" nil))]
        ;; [DX-PREP1] Why: an index erasure can leave the old protected bytes in a separate journal or pinned view.
        ;; Rejected: treating sync-excise alone as proof of end-to-end erasure.
        (assert (not (contains-marker? native)))
        (emit "erase-observation" {:db db :nativeT (str t) :assertion "protected-id"
                                   :builtSubjectFunction (get-in reply [:body "subjectSave"])
                                   :nativeValuePresent false :freshValuePresent (contains-marker? fresh)
                                   :heldValuePresent (contains-marker? old-pin)
                                   :journalValuePresent (contains-marker? journal)
                                   :identityReplayOutcome (reference/outcome replay)
                                   :identityReplayReceipt (reference/operation db "identity-replay")})
        (reference/route db "v1" "release" {"handle" held})))))

(let [[phase file] *command-line-args*]
  (try
    (case phase
      "before" (before file)
      "after" (do (after file) (erase-observation))
      "gate" (let [{:keys [fail error] :as result}
                    (test/run-tests 'subject-gate 'subject-conflicts 'wfix1-regression)]
                 (emit "tests" result)
                 (when-not (zero? (+ fail error)) (System/exit 1))))
    (finally (shutdown-agents)))
  (System/exit 0))
