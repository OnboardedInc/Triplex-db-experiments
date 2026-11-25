(ns create-gate
  "[DX-S4] The creation writer at the serial point (TX2_SUBJECT_CREATE=1): creation saves against a general-writer
  control on every read route; two creations of one ID; a creation racing a removal on request (of an existing
  subject's value, and of a subject that is itself being created); every refusal with its typed reason. Run with the
  server's per-subject settings, TX2_SUBJECT_WIDE=1, TX2_SUBJECT_SEVERAL_OWNERS=1 and TX2_SUBJECT_CREATE=1
  (s4/clj-gates.sh). Frames come from s3/owners_gate.clj, which stays as it was."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is testing]]
            [datomic.api :as d] [triplex.gateway.lean :as lean] [triplex.gateway.storage :as storage]
            [triplex.gateway.subject-create :as create] [triplex.gateway.subject-owners :as owners]
            [triplex.gateway.subject-save :as subject]
            [owners-gate :as og] [wide-gate :as wide] [wfix1-regression :as reference]))

(defn- head [conn] (storage/head-position (d/db conn)))
;; owners_gate.clj's private helpers, reused as they are.
(def replace-facts @#'og/replace-facts)
(def apply-save @#'og/apply-save)
(def block-counter (atom 5000))
(defn- block [] (wide/identity-block :wide (swap! block-counter inc)))
(defn- writer [reply] (get-in reply [:body "subjectSave"]))
(defn- general [f] (with-redefs [subject/enabled false owners/enabled false create/enabled false] (f)))

(def S "acct/a1/subject/s") (def P "acct/a1/subject/p")
(defn- profile-facts [owner tag] (for [i (range 12)] {:owner owner :field (str ":subject/f" i) :value (str tag "|" owner "|" i)}))
(defn- enrolment-facts [e s tag]
  [{:owner e :field ":enrolment/subject" :value s :ref? true} {:owner e :field ":enrolment/client" :value "acct/a1/client/7" :ref? true}
   {:owner e :field ":enrolment/status" :value (str tag "|active")} {:owner e :field ":enrolment/start" :value (str tag "|2026-11-24")}])

;; ---------------------------------------------------------------- (b) the same records as the general writer

(def steps
  ;; [label facts-fn expected-new-owners]; facts-fn takes the model (owner -> field -> {:id :value})
  [["new subject with its profile (one new owner, 12 facts)" (fn [_] (profile-facts "acct/a1/subject/n1" "c1")) 1]
   ["new enrolment of an existing subject (one new owner, two references)" (fn [_] (enrolment-facts "acct/a1/enrolment/e1" S "c2")) 1]
   ["new subject with its profile and first enrolment (two new owners)"
    (fn [_] (concat (profile-facts "acct/a1/subject/n2" "c3") (enrolment-facts "acct/a1/enrolment/e2" "acct/a1/subject/n2" "c3"))) 2]
   ["new owed form beside a profile replacement (one new, one existing owner)"
    (fn [m] (concat [{:owner "acct/a1/task/t1" :field ":task/status" :value "pending"}
                     {:owner "acct/a1/task/t1" :field ":task/enrolment" :value "acct/a1/enrolment/e1" :ref? true}]
                    (replace-facts m S [":subject/f0"] "c4"))) 1]
   ["references written onto an existing owner (attribute writes after creation)"
    (fn [m] [{:owner "acct/a1/enrolment/e1" :field ":enrolment/manager" :value "acct/a1/manager/5" :ref? true}
             {:owner "acct/a1/enrolment/e1" :field ":enrolment/status" :value "c5|on-hold" :pred (get-in m ["acct/a1/enrolment/e1" ":enrolment/status"])}]) 0]
   ["four new owners at the owner bound" (fn [_] (for [k (range 4) i (range 3)] {:owner (str "acct/a1/item/i" k) :field (str ":item/f" i) :value (str "c6|" k i)})) 4]])

(defn- run-steps [control-name control candidate-name candidate]
  (let [seed (fn [name] (let [input (og/frame {:command "seed-s" :block (block) :source (head control)
                                               :facts (profile-facts S "seed")})]
                          (is (= [200 nil] (reference/outcome (general #(reference/send name input)))))
                          input))
        input (seed control-name)
        _ (reference/outcome (general #(reference/send candidate-name input)))
        model (apply-save {} {:facts (vec (profile-facts S "seed"))} input)]
    (loop [[[label facts-fn new-owners] & more] steps n 1 model model trail []]
      (if-not label
        {:model model :trail trail}
        (let [facts (vec (facts-fn model))
              input (og/frame {:command (str "create-" n) :block (block) :facts facts :source (head control)})
              l (general #(reference/send control-name input))
              c (reference/send candidate-name input)]
          (is (= [200 nil] (reference/outcome l)) [label (:body l)])
          (is (= [200 nil] (reference/outcome c)) [label (:body c)])
          (is (= (get-in l [:body "position"]) (get-in c [:body "position"])) label)
          (is (= (get-in l [:body "recordedAt"]) (get-in c [:body "recordedAt"])) label)
          (is (= (get-in l [:body "datoms"]) (get-in c [:body "datoms"])) label)
          (is (nil? (writer l)) label)
          (is (= (str create/ident) (writer c)) [label (:body c)])
          (is (= new-owners (get-in c [:body "subjectCreated"] 0)) [label (:body c)])
          (when (= "1" (System/getenv "TX2_SUBJECT_HINTS"))
            (when (some (fn [{:keys [owner]}] (get model owner)) facts)
              (is (true? (get-in c [:body "subjectHintsAttached"])) label)))
          (recur more (inc n) (apply-save model {:facts facts} input)
                 (conj trail [label new-owners (get-in c [:body "datoms"])])))))))

(deftest creations-match-the-general-writer
  (reference/in-scope
    (fn [control-name control]
      (reference/in-scope
        (fn [candidate-name candidate]
          (let [{:keys [model trail]} (run-steps control-name control candidate-name candidate)
                subjects (vec (sort (keys model)))
                positions (range 1 (inc (head control)))
                expected (wide/product-reads control-name control subjects positions)
                actual (wide/product-reads candidate-name candidate subjects positions)
                ids (into #{} (comp (mapcat val) (map #(get-in % ["id" "v"]))) (:history actual))]
            (doseq [k (keys expected)] (is (= (get expected k) (get actual k)) (str "read route " k)))
            (is (= (wide/by-id-reads control-name ids) (wide/by-id-reads candidate-name ids)) "read by assertion ID")
            (println "DX-S4_CREATE_ROUTES" (json/write-str {:owners (count subjects) :positions (count positions) :ids (count ids)
                                                            :feed (count (:feed actual)) :trail trail}))))))))

;; ---------------------------------------------------------------- (c, e) a competing change between plan and commit

(defn- race-at-submit
  "[DX-S6] Run `competing` once, after the save was planned (any writer) and before its submit; return the reply."
  [name input competing]
  (let [orig storage/submit! fired (atom false) id (get input "operationId")]
    (with-redefs [storage/submit! (fn [conn data request timeline & more]
                                    (when (and (= id (get request "operationId")) (compare-and-set! fired false true)) (competing))
                                    (apply orig conn data request timeline more))]
      (reference/send name input))))

(defn- race-before-submit
  "Plan the save, run `competing` after the creation plan exists and before it is sent; expect `expected`."
  [name conn input competing expected]
  (let [prepare create/plan native d/transact-async submitted (atom 0) fired (atom false) id (input "operationId")]
    (with-redefs [create/plan (fn [db data request & more]
                                (let [p (apply prepare db data request more)]
                                  (when (and (= id (request "operationId")) (compare-and-set! fired false true))
                                    (is (:creation p) (pr-str (dissoc p :ops)))
                                    (competing))
                                  p))
                  d/transact-async (fn [c tx & opts]
                                     (when (and (= create/ident (ffirst tx)) (= id (get-in tx [0 1 :operation]))) (swap! submitted inc))
                                     (apply native c tx opts))]
      (let [reply (reference/send name input)]
        (is (= expected (reference/outcome reply)) (pr-str reply))
        (is (= 1 @submitted) "the creation function was submitted once")
        (is (= {"status" "absent"} (reference/operation name id)))
        (let [db (d/db conn)]
          (is (nil? (d/entid db [:triplex.entity/id (get-in input ["claims" 0 "txId"])])) "no journal")
          (is (not-any? (fn [new-id] (let [x (first (d/index-range (d/history db) :triplex.entity/row (lean/prefix new-id) nil))]
                                       (and x (.startsWith ^String (:v x) (lean/prefix new-id)))))
                        (input "newIds"))
              "no identity of the refused save in history"))
        reply))))

(deftest two-creations-of-one-id
  (reference/in-scope
    (fn [name conn]
      (let [n "acct/a1/enrolment/race"
            first-save (og/frame {:command "race-1" :block (block) :source (head conn) :facts (enrolment-facts n S "r1")})
            second-save (og/frame {:command "race-2" :block (block) :source (head conn) :facts (enrolment-facts n P "r2")})]
        ;; The second creation is planned first, then the first commits between its plan and its commit.
        (race-before-submit name conn second-save
          #(is (= [200 nil] (reference/outcome (reference/send name first-save))))
          [409 "CasConflict"])
        (let [db (d/db conn) e (d/entid db [:triplex.entity/id n])]
          (is (some? e))
          (is (= ["r1|active"] (keep #(let [r (lean/decode %)] (when (= ":enrolment/status" (:attribute r)) (:value_string r)))
                                     (map :v (lean/live-texts db e))))
              "the entity holds only the first creation's rows"))
        ;; The general writer refuses the same second save the same way (its source is older than the new revision).
        (let [again (general #(reference/send name (assoc second-save "operationId" "race-2-general")))]
          (is (= [409 "CasConflict"] (reference/outcome again)) (pr-str again)))
        (println "DX-S4_RACE" (json/write-str {:case "two creations of one ID" :head (head conn)}))))))

(defn- plaintext-anywhere?
  "Does `text` appear in any answer of any read route at any position, or anywhere in the Datomic log?"
  [name conn owners text]
  (let [positions (range 1 (inc (head conn)))
        reads (wide/product-reads name conn owners positions)
        log (pr-str (for [tx (d/tx-range (d/log conn) nil nil) datom (:data tx)] (:v datom)))]
    {:routes (str/includes? (pr-str reads) text) :log (str/includes? log text)}))

(defn- protected-scope! [name]
  (let [declared (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" false})]
    (is (= 200 (:status declared)) (pr-str declared))))

(deftest creation-racing-a-removal-on-request
  (if-not (System/getenv "TRIPLEX_ERASURE_DIRECTORY")
    (println "DX-S4_SKIP removal needs TRIPLEX_ERASURE_DIRECTORY")
    (do
      ;; (1) A new enrolment of an existing subject while that subject's protected value is removed.
      (reference/in-scope
        (fn [name conn]
          (protected-scope! name)
          (let [secret "a protected value of the existing subject"
                seed (og/frame {:command "seed-s" :block (block) :source (head conn)
                                :facts (cons {:owner S :field ":p/secret" :value secret} (profile-facts S "seed"))})
                _ (is (= [200 nil] (reference/outcome (reference/send name seed))))
                input (og/frame {:command "enrol" :block (block) :source (head conn) :facts (enrolment-facts "acct/a1/enrolment/x" S "x")})
                erased (atom nil)]
            (race-before-submit name conn input
              #(reset! erased (reference/route name "v1" "erase" {"commandId" "remove-s" "selectors" [{"entityId" S "attribute" ":p/secret"}]}))
              [409 "CasConflict"])
            (is (= 200 (:status @erased)) (pr-str @erased))
            (let [again (reference/send name (assoc input "operationId" "enrol-again"))
                  db (d/db conn)
                  ;; Every row ever written of the removed family, and whether the new enrolment holds the value.
                  family (for [datom (d/datoms (d/history db) :eavt (d/entid db [:triplex.entity/id S]) :triplex.entity/row)
                               :let [r (lean/decode (:v datom))] :when (= ":p/secret" (:attribute r))] (:id r))
                  seed-id (first (keep #(when (= ":p/secret" (get % "attribute")) (get % "id")) (map #(into {} %) (seed "rows"))))
                  enrolment (pr-str (map :v (lean/live-texts db (d/entid db [:triplex.entity/id "acct/a1/enrolment/x"]))))]
              (is (= [200 nil] (reference/outcome again)) (pr-str again))
              (is (= (str create/ident) (writer again)))
              (is (= 1 (count (distinct family))) "no row of the removed family was written after the removal")
              (is (not (str/includes? enrolment secret)) "the new enrolment holds no removed value")
              (println "DX-S4_REMOVAL" (json/write-str {:case "enrolment of an existing subject" :first [409 "CasConflict"]
                                                         :resend (reference/outcome again) :writer (writer again)
                                                         :removedFamilyRows (count (distinct family)) :seedRowId (some? seed-id)}))))))
      ;; (2) A new subject whose protected value is removed (by its entity) while its creation is in flight: with the
      ;; option on the resend is refused whole, and a resend without the removed value commits whole; with it off (the
      ;; general writer, families not recorded) the removed value comes back.
      (doseq [option [true false]]
        (reference/in-scope
          (fn [name conn]
            (protected-scope! name)
            (let [x "acct/a1/subject/new" secret (str "the removed value " option)
                  facts (cons {:owner x :field ":p/secret" :value secret} (profile-facts x "n"))
                  input (og/frame {:command "create-x" :block (block) :source (head conn) :facts facts})
                  run (fn []
                        (let [erased (atom nil)
                              first-try (if option
                                          (race-before-submit name conn input
                                            #(reset! erased (reference/route name "v1" "erase" {"commandId" "remove-x" "selectors" [{"entityId" x}]}))
                                            [409 "CasConflict"])
                                          ;; [DX-S6] Off: measured, not assumed. The general writer gets the same race at
                                          ;; the same point (after the plan, before the submit) and must give the same code.
                                          (let [reply (race-at-submit name input
                                                        #(reset! erased (reference/route name "v1" "erase" {"commandId" "remove-x" "selectors" [{"entityId" x}]})))]
                                            (is (= [409 "CasConflict"] (reference/outcome reply)) (pr-str reply))
                                            reply))
                              resend (reference/send name (assoc input "operationId" "create-x-again"))
                              without (when (not= 200 (:status resend))
                                        (reference/send name (og/frame {:command "create-x-without" :block (block) :source (head conn)
                                                                        :facts (profile-facts x "n")})))]
                          {:erase (:status @erased) :first (reference/outcome first-try) :resend (reference/outcome resend)
                           :without (some-> without reference/outcome) :writer (or (some-> without writer) (writer resend))}))
                  result (if option (run) (general run))
                  seen (plaintext-anywhere? name conn [x] secret)
                  rows (let [db (d/db conn) e (d/entid db [:triplex.entity/id x])] (when e (count (lean/live-texts db e))))]
              (is (= 200 (:erase result)))
              (if option
                (do (is (= [409 "ErasureReplayDeclined"] (:resend result)) (pr-str result))
                    (is (= [200 nil] (:without result)) (pr-str result))
                    (is (= (str create/ident) (:writer result)))
                    (is (= 12 rows) "the subject is whole, without the removed value")
                    (is (= {:routes false :log false} seen) "the removed value appears nowhere"))
                (do (is (= [200 nil] (:resend result)) (pr-str result))
                    (is (:routes seen) "off: the removed value comes back (the fault the option closes)")))
              (println "DX-S4_REMOVAL" (json/write-str (assoc result :case "creation of the removed subject" :option option
                                                              :removedValueSeen seen :liveRows rows))))))))))

(deftest a-change-between-plan-and-commit
  (doseq [[label competing]
          [["another save of the existing owner" (fn [name conn]
                                                   (is (= [200 nil] (reference/outcome
                                                                      (general #(reference/send name (og/frame {:command "other" :block (block) :source (head conn)
                                                                                                                 :facts [{:owner S :field ":subject/other" :value "o"}]})))))))]
           ["the erase generation moved" (fn [_ conn] @(d/transact conn [[:db/add (triplex.gateway.scope/entity (d/db conn)) subject/erase-generation 1]]))]
           ["the existing owner's public ID moved" (fn [_ conn] (let [db (d/db conn)] @(d/transact conn [[:db/add (d/entid db [:triplex.entity/id S]) :triplex.entity/id "moved"]])))]]]
    (testing label
      (reference/in-scope
        (fn [name conn]
          (is (= [200 nil] (reference/outcome (general #(reference/send name (og/frame {:command "seed" :block (block) :source (head conn)
                                                                                          :facts (profile-facts S "seed")}))))))
          (let [input (og/frame {:command "mixed" :block (block) :source (head conn)
                                 :facts (concat (enrolment-facts "acct/a1/enrolment/m" S "m") [{:owner S :field ":subject/extra" :value "m"}])})]
            (race-before-submit name conn input #(competing name conn) [409 "CasConflict"])
            (println "DX-S4_RACE" (json/write-str {:case label}))))))))

;; ---------------------------------------------------------------- refusals and their typed reasons

(deftest refusals-take-the-general-writer-with-a-reason
  (reference/in-scope
    (fn [control-name _]
      (reference/in-scope
        (fn [name conn]
          (doseq [n [name control-name]]
            (is (= [200 nil] (reference/outcome (general #(reference/send n (og/frame {:command "seed" :block (block) :source 0
                                                                                        :facts (profile-facts S "seed")})))))))
          (let [cases
                [["a third entity read only" "read-only-entity" {:facts (enrolment-facts "acct/a1/enrolment/r" S "r") :entities ["acct/a1/enrolment/r" P]}]
                 ["five new owners" "over-owner-bound" {:facts (for [k (range 5)] {:owner (str "acct/a1/item/f" k) :field ":x" :value "1"})}]
                 ["two accounts" "several-accounts" {:facts [{:owner "acct/a1/subject/q" :field ":x" :value "1"} {:owner "acct/a2/subject/q" :field ":x" :value "1"}]}]
                 ["over the 128-fact bound" "over-subject-bound" {:facts (for [i (range 129)] {:owner "acct/a1/subject/big" :field (str ":x/f" i) :value "1"})}]
                 ["a system attribute on the new owner" "system-field" {:facts [{:owner "acct/a1/subject/sys" :field ":_x/y" :value "1"}]}]
                 ["a source cut older than the existing owner's revision" "stale-source"
                  {:facts (concat (enrolment-facts "acct/a1/enrolment/st" S "st") [{:owner S :field ":subject/st" :value "1"}]) :source 0}]]]
            (doseq [[label reason spec] cases]
              (testing label
                (let [input (og/frame (merge {:command (str "refuse-" reason) :block (block) :source (head conn)} spec))
                      data (storage/tx-data (d/db conn) input)
                      planned (create/plan (d/db conn) data input nil)
                      c (reference/send name input)
                      l (general #(reference/send control-name input))]
                  (is (= reason (:declined planned)) [label (dissoc planned :ops)])
                  (is (= (reference/outcome l) (reference/outcome c)) [label (:body l) (:body c)])
                  (is (nil? (writer c)) label)
                  (when (= 200 (:status c)) (is (= reason (get-in c [:body "subjectDeclined"])) [label (:body c)]))
                  (println "DX-S4_REFUSAL" (json/write-str {:case label :reason (:declined planned) :outcome (reference/outcome c)
                                                            :control (reference/outcome l) :receiptReason (get-in c [:body "subjectDeclined"])})))))))))))

;; ---------------------------------------------------------------- counted work per kind of save (PostgreSQL)
;; [DX-S4] Run by s4/sql-run.sh: one identical indexed seed per arm (each subject a profile of 12 fields, a task of 40
;; and an enrolment of 6), then after a transactor restart each subject gets a cold and a warm save of one kind of real
;; save, on the general writer ("general", as today) or the creation and per-subject writers ("create"). Storage reads
;; inside apply are the transaction's io-stats; the 32 MiB object cache starts empty after each restart. Times diagnostic.

(def m-people 96)
(def m-kinds [:new-subject :enrolment :subject-and-enrolment :owed-form :attributes :form-page :form-two-owners :status-change])
(defn m-profile [i] (str "acct/test/subject/" i))
(defn m-task [i] (str "acct/test/task/" i))
(defn m-enrolment [i] (str "acct/test/enrolment/" i "/0"))
(defn- m-seed-model [i]
  {(m-profile i) (into {} (for [j (range 12)] [(str ":subject/f" j) {:id (str "sp" i "-" j) :value (str "profile-" i "-" j)}]))
   (m-task i) (into {} (for [j (range 40)] [(str ":task/f" j) {:id (str "st" i "-" j) :value (str "task-" i "-" j)}]))
   (m-enrolment i) (into {} (for [j (range 6)] [(str ":enrolment/f" j) {:id (str "se" i "-" j) :value (str "enrolment-" i "-" j)}]))})
(defn- m-seed-frame [i]
  (let [command (str "seed-" i) tx (str "_tx/" command) model (m-seed-model i)
        row (fn [id e et a v] {:id id :entity_id e :entity_type et :attribute a :value_type "string" :value_string v
                               :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})
        business (vec (for [[owner fs] model [f {:keys [id value]}] fs] (row id owner nil f value)))
        journal (into [(assoc (row (str command "/p") tx "_Transaction" ":_tx/position" nil) :value_type "number" :value_number 1.0)
                       (assoc (row (str command "/t") tx "_Transaction" ":_tx/instant" nil) :value_type "datetime" :value_datetime 1000.0)
                       (row (str command "/c") tx "_Transaction" ":_tx/command-id" command)]
                      (map-indexed (fn [k o] (row (str command "/e" k) tx "_Transaction" ":_tx/changed-entity" o)) (keys model)))]
    (triplex.gateway.selftest/row-input
      {"span" 1 "position" 1 "scopeWide" false "entities" (vec (keys model)) "operationId" command
       "rows" (mapv storage/wire-row (into business journal)) "newIds" (mapv :id (into business journal))
       "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]})))
(def m-arms ["general" "create"])

(defn- m-facts
  "One save of `kind` for subject i; `tag` makes created entities unique per save."
  [kind i model tag]
  (case kind
    :new-subject (profile-facts (str "acct/test/subject/new-" i "-" tag) tag)
    :enrolment (enrolment-facts (str "acct/test/enrolment/" i "/" tag) (m-profile i) tag)
    :subject-and-enrolment (let [s (str "acct/test/subject/new-" i "-" tag)]
                             (concat (profile-facts s tag) (enrolment-facts (str "acct/test/enrolment/new-" i "-" tag) s tag)))
    :owed-form [{:owner (str "acct/test/form/" i "/" tag) :field ":form/definition" :value "acct/test/definition/w4" :ref? true}
                {:owner (str "acct/test/form/" i "/" tag) :field ":form/enrolment" :value (m-enrolment i) :ref? true}
                {:owner (str "acct/test/form/" i "/" tag) :field ":form/status" :value "pending"}
                {:owner (str "acct/test/form/" i "/" tag) :field ":form/due" :value (str tag "|2026-12-01")}
                {:owner (str "acct/test/form/" i "/" tag) :field ":form/by" :value "api"}]
    :attributes (concat [{:owner (m-enrolment i) :field (str ":enrolment/manager-" tag) :value "acct/test/manager/5" :ref? true}]
                        (replace-facts model (m-enrolment i) [":enrolment/f2" ":enrolment/f3"] tag))
    :form-page (concat (replace-facts model (m-task i) (map #(str ":task/f" %) (range 2)) tag)
                       (for [k (range 7)] {:owner (m-task i) :field (str ":task/page-" tag "-" k) :value (str tag "|" k)}))
    :form-two-owners (concat (replace-facts model (m-task i) (map #(str ":task/f" %) (range 2 22)) tag)
                             (replace-facts model (m-profile i) [":subject/f0" ":subject/f1"] tag))
    :status-change (concat (replace-facts model (m-task i) [":task/f30"] tag)
                           (for [k (range 3)] {:owner (m-task i) :field (str ":task/event-" tag "-" k) :value (str tag "|" k)}))))

(defn measure-seed! [path]
  (let [attempt (System/getenv "PREP1_ATTEMPT")
        scopes (into {} (for [arm m-arms]
                          (let [wire (json/write-str ["triplex-scope-v1" "test" "creation-saves" (str attempt "-" arm) 0])
                                {:keys [db created]} (triplex.gateway.main/create-scope! nil wire "lean" true true)
                                conn (triplex.gateway.main/connection (triplex.gateway.main/db-uri db))]
                            (assert created)
                            (doseq [i (range m-people)]
                              (let [reply (reference/send db (m-seed-frame i))]
                                (assert (= [200 nil] (reference/outcome reply)) (pr-str (:body reply)))))
                            (let [t (d/basis-t (d/db conn))]
                              (d/request-index conn)
                              @(d/sync-index conn t)
                              [arm {:db db :seedT t :position (head conn)}]))))]
    (spit path (pr-str {:attempt attempt :scopes scopes}))
    (println "DX-S4_SEED" (json/write-str {:attempt attempt :people m-people :scopes scopes}))))

(defn- text-bytes [report]
  (reduce + (map #(if (and (:added %) (string? (:v %))) (alength (.getBytes ^String (:v %) java.nio.charset.StandardCharsets/UTF_8)) 0)
                 (:tx-data report))))
(defn- m-reads [stats] (select-keys (:reads stats) [:sql :eavt-load :aevt-load :avet-load :vaet-load :ocache :dev]))

(defn measure-round! [path arm round]
  (let [{:keys [scopes]} (clojure.edn/read-string (slurp path))
        {:keys [db]} (get scopes arm)
        conn (triplex.gateway.main/connection (triplex.gateway.main/db-uri db))
        half (quot m-people 2)
        order (mapv #(+ (* (dec round) half) (mod (* % 37) half)) (range half))
        commit! (fn [input]
                  (let [dbv (d/db conn)
                        data (storage/tx-data dbv input)
                        plan (when (= arm "create")
                               (or (subject/plan dbv data input) (let [p (owners/plan dbv data input nil)] (when-not (:declined p) p))
                                   (create/plan dbv data input nil)))
                        _ (assert (or (= arm "general") (and plan (not (:declined plan)))) (str "no per-subject plan: " (pr-str (:declined plan))))
                        fn-ident (when plan (first (:function plan)))
                        report @(d/transact-async conn (if plan [[fn-ident plan]] data) :io-context (keyword "s4" arm))]
                    [(cond (nil? plan) report (:creation plan) (create/verify-report report plan)
                           (:owners plan) (owners/verify-report report plan) :else (subject/verify-report report plan))
                     (if plan (clojure.string/replace (str fn-ident) #"-[0-9a-f]{24}$" "") "general")]))
        out (vec (for [i order]
                   (let [kind (nth m-kinds (mod i (count m-kinds)))
                         model (m-seed-model i)
                         save (fn [model tag n]
                                (let [facts (vec (m-facts kind i model tag))
                                      input (og/frame {:command (str "r" round "-" i "-" tag) :block (wide/identity-block :wide (+ (* round 100000) (* 2 i) n))
                                                       :facts facts :source (head conn)})
                                      [report writer] (commit! input)]
                                  [(apply-save model {:facts facts} input)
                                   {:arm arm :round round :subject i :kind kind :phase tag
                                    :tx (m-reads (:io-stats report)) :applyMs (get-in report [:io-stats :api-ms])
                                    :datoms (count (:tx-data report)) :addedTextBytes (text-bytes report)
                                    :assertions (count (get input "newIds")) :facts (count facts) :writer writer
                                    :owners (:subject-owners report) :created (:subject-created report)}]))
                         [m1 cold] (save model "cold" 0)
                         [_ warm] (save m1 "warm" 1)]
                     [cold warm])))]
    (doseq [[a b] out] (println "DX-S4_COMMIT" (json/write-str a)) (println "DX-S4_COMMIT" (json/write-str b)))))

(defn measure-verify! [path]
  (let [{:keys [scopes]} (clojure.edn/read-string (slurp path))
        conns (into {} (for [[arm {:keys [db]}] scopes] [arm [db (triplex.gateway.main/connection (triplex.gateway.main/db-uri db))]]))
        heads (into {} (for [[arm [_ conn]] conns] [arm (head conn)]))
        _ (assert (apply = (vals heads)) (pr-str heads))
        digest #(triplex.gateway.schema/sha256 (pr-str %))
        summary (fn [arm]
                  (let [[db] (conns arm)]
                    {:feed (digest (loop [after 0 out []]
                                     (let [page (reference/feed db after 100)]
                                       (if (empty? page) out (recur (second (peek page)) (into out (map (fn [tx] [(vec (take 2 tx)) (wide/feed-changes tx)]) page)))))))}))
        results (into {} (for [arm (keys conns)] [arm (summary arm)]))]
    (assert (apply = (vals results)) (pr-str results))
    (println "DX-S4_VERIFY" (json/write-str {:arms (keys results) :head (heads "general") :equal true}))))
