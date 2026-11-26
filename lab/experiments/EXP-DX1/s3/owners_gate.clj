(ns owners-gate
  "[DX-S3] The several-owners writer at the serial point (TX2_SUBJECT_SEVERAL_OWNERS=1): saves of two to four owners
  against a general-writer control on every read route; a competing change to one owner between the plan and the
  commit (another save, removal on request, an excision, a public ID moved); and every refusal with its typed reason.
  Run with the server's per-subject settings, TX2_SUBJECT_WIDE=1 and TX2_SUBJECT_SEVERAL_OWNERS=1 (s3/clj-gates.sh)."
  (:require [clojure.data.json :as json] [clojure.edn] [clojure.test :refer [deftest is testing]]
            [datomic.api :as d] [triplex.gateway.main :as main] [triplex.gateway.schema]
            [triplex.gateway.lean :as lean] [triplex.gateway.scope :as scope]
            [triplex.gateway.selftest :as rows] [triplex.gateway.storage :as storage]
            [triplex.gateway.subject-owners :as owners] [triplex.gateway.subject-save :as subject]
            [wide-gate :as wide] [wfix1-regression :as reference]))

(defn- row [id e entity-type attr value tx]
  {:id id :entity_id e :entity_type entity-type :attribute attr :value_type "string" :value_string value
   :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})

(defn- change [op id owner attr value tx]
  {"op" op "tripleId" id "entityId" owner "attribute" attr "value" {"type" "string" "value" value}
   "validFrom" 0.0 "recordedAt" 1000.0 "assertionTxId" tx})

(defn frame
  "One save of `facts` ({:owner :field :value :pred}) and `retires` ({:owner :field :pred}) over several owners, framed as
  the SDK frames it: business rows, one journal change per fact and per retired value, position, instant, one
  changed-entity row per owner and the command. `entities` defaults to the owners written."
  [{:keys [command block facts retires source entities ref-fact]}]
  (let [{:keys [tx id]} block
        n (volatile! -1) next-id #(id (vswap! n inc))
        business (mapv (fn [{:keys [owner field value ref?]}]
                         (cond-> (row (next-id) owner nil field value tx) ref? (assoc :value_type "ref")))
                       facts)
        retired (vec (concat (keep (fn [{:keys [owner field pred]}] (when pred [owner field pred])) facts)
                             (map (fn [{:keys [owner field pred]}] [owner field pred]) retires)))
        old (mapv (fn [[owner field {pid :id pv :value}]]
                    (assoc (row pid owner nil field pv "_tx/earlier")
                           :retracted_at 1000.0 :retracted_position 1 :retract_tx_id tx))
                  retired)
        written (vec (distinct (concat (map :owner facts) (map first retired))))
        j (fn [attr value] (row (next-id) tx "_Transaction" attr value tx))
        changes (concat (map (fn [r] (cond-> (change "assert" (:id r) (:entity_id r) (:attribute r) (:value_string r) tx)
                                       (= "ref" (:value_type r)) (assoc "value" {"type" "ref" "value" (:value_string r)})))
                             business)
                        (map (fn [[owner field {pid :id pv :value}]]
                               (assoc (change "retract" pid owner field pv "_tx/earlier")
                                      "retractedAt" 1000.0 "retractionTxId" tx)) retired))
        journal (-> [(assoc (j ":_tx/position" nil) :value_type "number" :value_number 1.0)
                     (assoc (j ":_tx/instant" nil) :value_type "datetime" :value_datetime 1000.0)]
                    (into (map #(j ":_tx/changed-entity" %) written))
                    (conj (j ":_tx/command-id" command))
                    (into (map (fn [c] (assoc (j ":_tx/change" nil) :value_type "json" :value_json (json/write-str c))) changes)))
        fresh (into business journal)]
    (rows/row-input
      {"sourceK" source "span" 1 "position" 1 "scopeWide" false "entities" (vec (or entities written))
       "operationId" command "rows" (mapv storage/wire-row (into fresh old)) "newIds" (mapv :id fresh)
       "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]})))

(def A "task/a") (def B "profile/b") (def C "task/c") (def D "document/d") (def E "task/e")
(def owners-under-test [A B C D E])

(defn- seed! [name owner]
  (let [s (wide/seed-frame owner (str "seed-" (subs owner (inc (.indexOf ^String owner "/")))) #(str owner "-seed-" %))]
    (is (= [200 nil] (reference/outcome (reference/send name (:input s)))) owner)
    (:state s)))

(defn- head [conn] (storage/head-position (d/db conn)))
(def block-counter (atom 1000))
(defn- block [] (wide/identity-block :wide (swap! block-counter inc)))

(defn- replace-facts [model owner fields tag]
  (for [f fields] {:owner owner :field f :value (str tag "|" owner "|" f) :pred (get-in model [owner f])}))
(defn- first-facts [owner k tag] (for [i (range k)] {:owner owner :field (str ":new/" tag "-" i) :value (str tag "|" i)}))
(defn- retire-facts [model owner fields] (for [f fields] {:owner owner :field f :pred (get-in model [owner f])}))
(defn- apply-save [model {:keys [facts retires]} input]
  (let [ids (vec (take (count facts) (get input "newIds")))
        model (reduce (fn [m [{:keys [owner field value]} id]] (assoc-in m [owner field] {:id id :value value}))
                      model (map vector facts ids))]
    (reduce (fn [m {:keys [owner field]}] (update m owner dissoc field)) model retires)))
(def fields (mapv #(str ":seed/f" %) (range 160)))

(defn- writer [reply] (get-in reply [:body "subjectSave"]))

;; ------------------------------------------------------------------ (b) the same records as the general writer

(def steps
  ;; [label owners {owner [replace first retire]}]
  [["two owners, task form and two profile fields" {A [20 0 0] B [2 0 0]}]
   ["two owners, profile first writes and a retirement" {A [3 0 1] B [0 4 1]}]
   ["three owners" {A [5 2 0] B [1 0 0] C [2 0 1]}]
   ["four owners" {A [10 0 0] B [1 1 0] C [1 0 0] D [0 2 0]}]
   ["four owners at the bound (128 facts)" {A [64 0 0] B [32 0 0] C [16 0 0] D [0 16 0]}]
   ["two owners, retirements only" {A [0 0 2] B [0 0 3]}]
   ["two owners again (second save of the same fields)" {A [20 0 0] B [2 0 0]}]])

(defn- plan-step [model n {:as spec} source]
  (let [used (atom {})
        take-fields (fn [owner k] (let [start (get @used owner 0)
                                        live (filterv #(contains? (get model owner) %) fields)
                                        out (subvec live start (+ start k))]
                                    (swap! used assoc owner (+ start k)) out))
        parts (for [[owner [rep fst ret]] spec]
                {:facts (concat (replace-facts model owner (take-fields owner rep) (str "s" n))
                                (first-facts owner fst (str "s" n)))
                 :retires (retire-facts model owner (take-fields owner ret))})
        facts (vec (mapcat :facts parts)) retires (vec (mapcat :retires parts))
        input (frame {:command (str "save-" n) :block (block) :facts facts :retires retires :source source})]
    [input (apply-save model {:facts facts :retires retires} input)]))

(defn- run-steps [control-name control candidate-name candidate append?]
  (let [model (into {} (for [o [A B C D]] [o (seed! control-name o)]))]
    (doseq [o [A B C D]] (seed! candidate-name o))
    (loop [[[label spec] & more] steps n 1 model model trail []]
      (if-not label
        {:model model :trail trail}
        (let [[input after] (plan-step model n spec (head control))
              l (with-redefs [subject/enabled false owners/enabled false] (reference/send control-name input))
              c (with-redefs [subject/append-retirement? (and append? subject/numeric-owner?)] (reference/send candidate-name input))]
          (is (= [200 nil] (reference/outcome l)) [label (:body l)])
          (is (= [200 nil] (reference/outcome c)) [label (:body c)])
          (is (= (get-in l [:body "position"]) (get-in c [:body "position"])) label)
          (is (= (get-in l [:body "recordedAt"]) (get-in c [:body "recordedAt"])) label)
          (is (= (get-in l [:body "datoms"]) (get-in c [:body "datoms"])) label)
          (is (nil? (writer l)) label)
          (is (= (str owners/ident) (writer c)) [label (:body c)])
          (is (= (count spec) (get-in c [:body "subjectOwners"])) label)
          (is (true? (get-in c [:body "subjectOrderedIds"])) label)
          ;; With TX2_SUBJECT_HINTS=1 every owner's reads are named (one hint call per owner, the hint function unchanged).
          (when (= "1" (System/getenv "TX2_SUBJECT_HINTS")) (is (true? (get-in c [:body "subjectHintsAttached"])) label))
          (recur more (inc n) after (conj trail [label (count spec) (get-in c [:body "datoms"])])))))))

(defn- compare-all [control-name control candidate-name candidate model]
  (let [positions (range 1 (inc (head control)))
        subjects [A B C D]
        expected (wide/product-reads control-name control subjects positions)
        actual (wide/product-reads candidate-name candidate subjects positions)
        ids (into #{} (comp (mapcat val) (map #(get-in % ["id" "v"]))) (:history actual))]
    (doseq [k (keys expected)] (is (= (get expected k) (get actual k)) (str "read route " k)))
    (is (= (wide/by-id-reads control-name ids) (wide/by-id-reads candidate-name ids)) "read by assertion ID")
    (doseq [o subjects]
      (is (= (into {} (map (fn [[f {:keys [value]}]] [f value])) (get model o))
             (wide/current-values (get-in actual [:current o]))) (str "current values of " o " equal the model")))
    {:positions (count positions) :ids (count ids) :feed (count (:feed actual))
     :historyRows (reduce + (map #(count (get-in actual [:history %])) subjects))}))

(deftest several-owners-match-the-general-writer
  (doseq [append? [false true] :when (or (not append?) subject/numeric-owner?)]
    (reference/in-scope
      (fn [control-name control]
        (reference/in-scope
          (fn [candidate-name candidate]
            (let [{:keys [model trail]} (run-steps control-name control candidate-name candidate append?)
                  shape (compare-all control-name control candidate-name candidate model)
                  markers (count (seq (d/datoms (d/db candidate) :aevt :triplex.entity/retired)))]
              (when append? (is (pos? markers) "append retirement wrote markers"))
              (println "DX-S3_OWNERS_ROUTES" (json/write-str (assoc shape :append append? :markers markers :trail trail))))))))))

;; ------------------------------------------------------------------ (c, e) a change to one owner between plan and commit

(defn- race-before-submit
  "Plan the save, run `competing` after the several-owners plan exists and before it is sent; expect `expected`."
  [name conn input competing expected]
  (let [prepare owners/plan native d/transact-async submitted (atom 0) fired (atom false) id (input "operationId")]
    (with-redefs [owners/plan (fn [db data request & more]
                                (let [p (apply prepare db data request more)]
                                  (when (and (= id (request "operationId")) (compare-and-set! fired false true))
                                    (is (some? (:owners p)) (pr-str p))
                                    (competing))
                                  p))
                  d/transact-async (fn [c tx & opts]
                                     (when (= owners/ident (ffirst tx)) (swap! submitted inc))
                                     (apply native c tx opts))]
      (let [reply (reference/send name input)]
        (is (= expected (reference/outcome reply)) (pr-str reply))))
    (is (= 1 @submitted) "the several-owners function was submitted once")
    (is (= {"status" "absent"} (reference/operation name id)))
    (is (nil? (get (reference/claim name (get-in input ["claims" 0 "commandId"])) "receipt")))
    (let [db (d/db conn)]
      (is (nil? (d/entid db [:triplex.entity/id (get-in input ["claims" 0 "txId"])])) "no journal")
      (is (not-any? (fn [new-id] (let [x (first (d/index-range (d/history db) :triplex.entity/row (lean/prefix new-id) nil))]
                                   (and x (.startsWith ^String (:v x) (lean/prefix new-id)))))
                    (input "newIds"))
          "no identity of the refused save in history, on any owner"))))

(defn- two-owner-save [model n source]
  (first (plan-step model n {A [3 0 0] B [1 1 0]} source)))

(deftest a-change-to-one-owner-between-plan-and-commit
  (doseq [[label competing]
          [["another save of the shared owner (general writer)"
            (fn [name conn model]
              (let [other (frame {:command "other" :block (block) :source (head conn)
                                  :facts (replace-facts model B [(nth fields 5)] "other")})]
                (is (= [200 nil] (reference/outcome (with-redefs [subject/enabled false owners/enabled false]
                                                      (reference/send name other)))))))]
           ["erase generation (the serial effect of a removal)"
            (fn [_ conn _] @(d/transact conn [[:db/add (scope/entity (d/db conn)) subject/erase-generation 1]]))]
           ["excision of the second owner's rows"
            (fn [_ conn _] (let [db (d/db conn)] @(d/transact conn [{:db/excise (d/entid db [:triplex.entity/id B])
                                                                     :db.excise/attrs [:triplex.entity/row]}])))]
           ["the second owner's public ID moved"
            (fn [_ conn _] (let [db (d/db conn)] @(d/transact conn [[:db/add (d/entid db [:triplex.entity/id B]) :triplex.entity/id "moved"]])))]]]
    (testing label
      (reference/in-scope
        (fn [name conn]
          (let [model (into {} (for [o [A B]] [o (seed! name o)]))
                before (head conn)
                input (two-owner-save model 1 before)]
            (race-before-submit name conn input #(competing name conn model) [409 "CasConflict"])
            (println "DX-S3_RACE" (json/write-str {:case label :headBefore before :headAfter (head conn)}))))))))

;; [DX-S3] Removal on request of one owner's protected value, on a protected scope, between the plan and the commit.
(defn- race-at-submit
  "[DX-S6] Run `competing` once, after the save was planned (any writer) and before its submit; return the reply."
  [name input competing]
  (let [orig storage/submit! fired (atom false) id (get input "operationId")]
    (with-redefs [storage/submit! (fn [conn data request timeline & more]
                                    (when (and (= id (get request "operationId")) (compare-and-set! fired false true)) (competing))
                                    (apply orig conn data request timeline more))]
      (reference/send name input))))

;; [DX-S6] The control this gate lacked: the same removal at the same point, with every per-subject plan declined, so
;; the general writer decides the same request; it must give the same code (F3: CasConflict on every writer).
(deftest removal-on-request-between-plan-and-commit-general-control
  (if-not (System/getenv "TRIPLEX_ERASURE_DIRECTORY")
    (println "DX-S3_SKIP removal needs TRIPLEX_ERASURE_DIRECTORY")
    (reference/in-scope
      (fn [name conn]
        (let [declared (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" false})
              _ (is (= 200 (:status declared)) (pr-str declared))
              model (into {} (for [o [A B]] [o (seed! name o)]))
              secret (frame {:command "secret" :block (block) :source (head conn)
                             :facts [{:owner B :field ":p/secret" :value "a protected value"}]})
              _ (is (= [200 nil] (reference/outcome (reference/send name secret))))
              input (two-owner-save model 2 (head conn))
              erased (atom nil)
              reply (with-redefs [owners/plan (fn [& _] nil) subject/plan (fn [& _] nil)]
                      (race-at-submit name input
                        #(reset! erased (reference/route name "v1" "erase" {"commandId" "remove-b" "selectors" [{"entityId" B "attribute" ":p/secret"}]}))))]
          (is (= 200 (:status @erased)) (pr-str @erased))
          (is (= [409 "CasConflict"] (reference/outcome reply)) (pr-str reply))
          (is (= "absent" (get (reference/operation name (get input "operationId")) "status")) "refused whole")
          (println "DX-S3_REMOVAL_CONTROL" (json/write-str {:erase (:status @erased) :general (reference/outcome reply)})))))))

(deftest removal-on-request-between-plan-and-commit
  (if-not (System/getenv "TRIPLEX_ERASURE_DIRECTORY")
    (println "DX-S3_SKIP removal needs TRIPLEX_ERASURE_DIRECTORY")
    (reference/in-scope
      (fn [name conn]
        (let [declared (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" false})
              _ (is (= 200 (:status declared)) (pr-str declared))
              model (into {} (for [o [A B]] [o (seed! name o)]))
              secret (frame {:command "secret" :block (block) :source (head conn)
                             :facts [{:owner B :field ":p/secret" :value "a protected value"}]})
              _ (is (= [200 nil] (reference/outcome (reference/send name secret))))
              input (two-owner-save model 2 (head conn))
              erased (atom nil)]
          (race-before-submit name conn input
            #(reset! erased (reference/route name "v1" "erase" {"commandId" "remove-b" "selectors" [{"entityId" B "attribute" ":p/secret"}]}))
            [409 "CasConflict"])
          (is (= 200 (:status @erased)) (pr-str @erased))
          ;; The same save, sent again as a new operation after the removal, commits on the several-owners writer.
          (let [again (reference/send name (assoc input "operationId" "after-removal"))]
            (is (= [200 nil] (reference/outcome again)) (pr-str again))
            (is (= (str owners/ident) (writer again)))
            (println "DX-S3_REMOVAL" (json/write-str {:erase (:status @erased) :retry (reference/outcome again)
                                                      :retryWriter (writer again)}))))))))

;; ------------------------------------------------------------------ refusals and their typed reasons

(deftest refusals-take-the-general-writer-with-a-reason
  (reference/in-scope
    (fn [control-name control]
      (reference/in-scope
        (fn [name conn]
          (let [model (into {} (for [o owners-under-test] [o (seed! name o)]))
                _ (doseq [o owners-under-test] (seed! control-name o))
                cases
                [["new owner" "new-owner"
                  {:facts (concat (replace-facts model A [(nth fields 0)] "n") [{:owner "profile/new" :field ":x" :value "new"}])}]
                 ["a third entity read only" "read-only-entity"
                  {:facts (concat (replace-facts model A [(nth fields 1)] "r") (replace-facts model B [(nth fields 1)] "r"))
                   :entities [A B C]}]
                 ["five owners" "over-owner-bound"
                  {:facts (mapcat #(replace-facts model % [(nth fields 2)] "f") owners-under-test)}]
                 ["two accounts" "several-accounts"
                  {:facts [{:owner "acct/x/task" :field ":x" :value "1"} {:owner "acct/y/profile" :field ":x" :value "1"}]}]
                 ["over the 128-fact bound across owners" "over-subject-bound"
                  {:facts (concat (replace-facts model A (subvec fields 10 80) "o") (replace-facts model B (subvec fields 10 69) "o"))}]
                 ["a reference between the owners" "reference-or-system-field"
                  {:facts (concat (replace-facts model A [(nth fields 3)] "ref") [{:owner B :field ":x/task" :value A :ref? true}])}]
                 ["a source cut older than an owner's revision" "stale-source"
                  {:facts (concat (replace-facts model A [(nth fields 4)] "st") (replace-facts model B [(nth fields 4)] "st"))
                   :source 1}]]]
            (doseq [[label reason spec] cases]
              (testing label
                (let [input (frame (merge {:command (str "refuse-" reason) :block (block) :source (head conn)} spec))
                      data (storage/tx-data (d/db conn) input)
                      [[_ p]] data
                      planned (owners/plan (d/db conn) data input nil)
                      c (reference/send name input)
                      l (with-redefs [subject/enabled false owners/enabled false] (reference/send control-name input))]
                  (is (= reason (:declined planned)) [label planned])
                  (is (= (reference/outcome l) (reference/outcome c)) [label (:body l) (:body c)])
                  (is (nil? (writer c)) label)
                  (when (= 200 (:status c)) (is (= reason (get-in c [:body "subjectDeclined"])) [label (:body c)]))
                  (println "DX-S3_REFUSAL" (json/write-str {:case label :reason (:declined planned) :outcome (reference/outcome c)
                                                            :control (reference/outcome l)
                                                            :receiptReason (get-in c [:body "subjectDeclined"])
                                                            :entities (count (:entities p))})))))))))))

;; ------------------------------------------------------------------ (g) counted work of a two-owner form save (PostgreSQL)
;; [DX-S3] Run by s3/sql-run.sh: one identical indexed seed per arm, then after a transactor restart each subject gets a
;; cold and a warm two-owner form save (20 task fields and 2 profile fields replaced), on the general writer ("general")
;; or the several-owners writer ("several"). Storage reads inside apply are the transaction's io-stats; the 32 MiB
;; object cache starts empty after each restart, so a cold save's segment loads show. Times are diagnostic.

(def m-people 160)
(def m-task-fields (mapv #(str ":task/f" %) (range 40)))
(def m-profile-fields (mapv #(str ":employee/f" %) (range 20)))
(defn m-task [i] (str "acct/test/task-" i))
(defn m-profile [i] (str "acct/test/profile-" i))
(defn- m-seed-model [i]
  {(m-task i) (into {} (map-indexed (fn [j f] [f {:id (str "t" i "-" j) :value (str "task-" i "-" j)}]) m-task-fields))
   (m-profile i) (into {} (map-indexed (fn [j f] [f {:id (str "p" i "-" j) :value (str "profile-" i "-" j)}]) m-profile-fields))})
(defn- m-seed-frame [i]
  (let [command (str "seed-" i) tx (str "_tx/" command) model (m-seed-model i)
        business (vec (for [[owner fs] model [f {:keys [id value]}] fs] (row id owner nil f value tx)))
        journal [(assoc (row (str command "/p") tx "_Transaction" ":_tx/position" nil tx) :value_type "number" :value_number 1.0)
                 (assoc (row (str command "/t") tx "_Transaction" ":_tx/instant" nil tx) :value_type "datetime" :value_datetime 1000.0)
                 (row (str command "/e1") tx "_Transaction" ":_tx/changed-entity" (m-task i) tx)
                 (row (str command "/e2") tx "_Transaction" ":_tx/changed-entity" (m-profile i) tx)
                 (row (str command "/c") tx "_Transaction" ":_tx/command-id" command tx)]
        fresh (into business journal)]
    (rows/row-input {"span" 1 "position" 1 "scopeWide" false "entities" [(m-task i) (m-profile i)] "operationId" command
                     "rows" (mapv storage/wire-row fresh) "newIds" (mapv :id fresh)
                     "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]})))
(def m-arms ["general" "several"])

(defn measure-seed! [path]
  (let [attempt (System/getenv "PREP1_ATTEMPT")
        scopes (into {} (for [arm m-arms]
                          (let [wire (json/write-str ["triplex-scope-v1" "test" "several-owners" (str attempt "-" arm) 0])
                                {:keys [db created]} (main/create-scope! nil wire "lean" true true)
                                conn (main/connection (main/db-uri db))]
                            (assert created)
                            (doseq [i (range m-people)]
                              (let [reply (reference/send db (m-seed-frame i))]
                                (assert (= [200 nil] (reference/outcome reply)) (pr-str (:body reply)))))
                            (let [t (d/basis-t (d/db conn))]
                              (d/request-index conn)
                              @(d/sync-index conn t)
                              [arm {:db db :seedT t :position (head conn)}]))))]
    (spit path (pr-str {:attempt attempt :scopes scopes}))
    (println "DX-S3_SEED" (json/write-str {:attempt attempt :people m-people :scopes scopes}))))

(defn- text-bytes [report]
  (reduce + (map #(if (and (:added %) (string? (:v %))) (alength (.getBytes ^String (:v %) java.nio.charset.StandardCharsets/UTF_8)) 0)
                 (:tx-data report))))
(defn- m-reads [stats] (select-keys (:reads stats) [:sql :eavt-load :aevt-load :avet-load :vaet-load :ocache :dev]))

(defn measure-round! [path arm round]
  (let [{:keys [attempt scopes]} (clojure.edn/read-string (slurp path))
        {:keys [db]} (get scopes arm)
        conn (main/connection (main/db-uri db))
        order (mapv #(+ (* (dec round) (quot m-people 2)) (mod (* % 37) (quot m-people 2))) (range (quot m-people 2)))
        commit! (fn [input]
                  (let [db (d/db conn)
                        data (storage/tx-data db input)
                        plan (when (= arm "several") (owners/plan db data input nil))
                        _ (assert (or (= arm "general") (:owners plan)) (str "the several-owners writer refused: " (pr-str (:declined plan))))
                        report @(d/transact-async conn (if plan [[owners/ident plan]] data) :io-context (keyword "s3" arm))]
                    (if plan (owners/verify-report report plan) report)))
        out (vec (for [i order]
                   (let [model (m-seed-model i)
                         save (fn [model tag n]
                                (let [facts (vec (concat (replace-facts model (m-task i) (take 20 m-task-fields) tag)
                                                         (replace-facts model (m-profile i) (take 2 m-profile-fields) tag)))
                                      input (frame {:command (str "r" round "-" i "-" tag) :block (wide/identity-block :wide (+ (* round 100000) (* 2 i) n))
                                                    :facts facts :source (head conn)})
                                      started (System/nanoTime)
                                      report (commit! input)
                                      after (apply-save model {:facts facts} input)
                                      db-after (:db-after report)]
                                  (doseq [o [(m-task i) (m-profile i)]]
                                    (let [current (into {} (map (comp (juxt :attribute :value_string) lean/decode :v))
                                                        (lean/live-texts db-after (d/entid db-after [:triplex.entity/id o])))]
                                      (assert (= current (into {} (map (fn [[f {:keys [value]}]] [f value])) (get after o)))
                                              (str "exact current readback of " o))))
                                  [after {:arm arm :round round :subject i :phase tag
                                          :wallMs (/ (- (System/nanoTime) started) 1e6)
                                          :tx (m-reads (:io-stats report)) :applyMs (get-in report [:io-stats :api-ms])
                                          :datoms (count (:tx-data report)) :addedTextBytes (text-bytes report)
                                          :assertions (count (get input "newIds"))
                                          :writer (or (:subject-save report) "general") :owners (:subject-owners report)}]))
                         [m1 cold] (save model "cold" 0)
                         [_ warm] (save m1 "warm" 1)]
                     [cold warm])))]
    (assert (= attempt (System/getenv "PREP1_ATTEMPT")))
    (doseq [[a b] out] (println "DX-S3_COMMIT" (json/write-str a)) (println "DX-S3_COMMIT" (json/write-str b)))))

(defn measure-verify! [path]
  (let [{:keys [scopes]} (clojure.edn/read-string (slurp path))
        conns (into {} (for [[arm {:keys [db]}] scopes]
                         [arm [db (main/connection (main/db-uri db))]]))
        heads (into {} (for [[arm [_ conn]] conns] [arm (head conn)]))
        _ (assert (apply = (vals heads)) (pr-str heads))
        subjects (vec (mapcat (fn [i] [(m-task i) (m-profile i)]) (range m-people)))
        read (fn [db input] (let [r (reference/route db "v1" "read" input)] (assert (= 200 (:status r)) (pr-str r)) (sort-by #(get-in % ["id" "v"]) (get-in r [:body "rows"]))))
        digest #(triplex.gateway.schema/sha256 (pr-str %))
        summary (fn [arm]
                  (let [[db] (conns arm)
                        positions (range 1 (inc (heads arm)) 7)]
                    {:current (digest (mapv #(read db {"entityIds" [%] "basis" {"validAt" 5.0}}) subjects))
                     :history (digest (mapv #(read db {"entityIds" [%] "history" true}) subjects))
                     :pinned (digest (vec (for [p positions s (take 3 (drop (mod p 300) subjects))]
                                            (read db {"entityIds" [s] "basis" {"validAt" 5.0 "recordedPosition" p}}))))
                     :feed (digest (loop [after 0 out []]
                                     (let [page (reference/feed db after 100)]
                                       (if (empty? page) out (recur (second (peek page)) (into out (map (fn [tx] [(vec (take 2 tx)) (wide/feed-changes tx)]) page)))))))}))
        results (into {} (for [arm (keys conns)] [arm (summary arm)]))]
    (assert (apply = (vals results)) (pr-str results))
    (println "DX-S3_VERIFY" (json/write-str {:arms (keys results) :head (heads "general") :subjects (count subjects) :equal true}))))
