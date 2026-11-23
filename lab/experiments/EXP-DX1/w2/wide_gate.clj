(ns wide-gate
  "Wide saves on the per-subject writer (TX2_SUBJECT_WIDE=1): frames, gates and the paired toy measurement."
  (:require [clojure.data.json :as json] [clojure.edn :as edn] [clojure.test :refer [deftest is testing]]
            [datomic.api :as d] [datomic.measure.io-stats :as io]
            [triplex.gateway.group :as group] [triplex.gateway.lean :as lean] [triplex.gateway.main :as main]
            [triplex.gateway.owner-layout :as layout] [triplex.gateway.owner-root :as owner-root]
            [triplex.gateway.reach :as reach] [triplex.gateway.scope :as scope]
            [triplex.gateway.selftest :as rows] [triplex.gateway.storage :as storage]
            [triplex.gateway.subject-save :as subject] [triplex.gateway.write-policy :as policy]
            [wfix1-regression :as reference]))

;; ---------------------------------------------------------------- frames

(def alphabet "0123456789ABCDEFGHJKMNPQRSTVWXYZ")
(defn- base32 [n width]
  (let [s (loop [n n acc ()] (if (zero? n) (apply str acc) (recur (quot n 32) (cons (.charAt alphabet (rem n 32)) acc))))]
    (str (apply str (repeat (- width (count s)) "0")) s)))
(defn token23 [n] (str "01" (base32 n 21)))
(defn token24 [n] (str "02" (base32 n 22)))

(defn identity-block
  "Mirror of packages/datomic/src/orderedSaveIdentity.ts: :wide is a 23-character token with a three-hex-digit ordinal."
  [kind n]
  (case kind
    :wide (let [t (token23 n)] {:tx (str "_tx/" t "W00") :id #(str t (format "%03X" %))})
    :narrow (let [t (token24 n)] {:tx (str "_tx/" t "00") :id #(do (assert (< % 256)) (str t (format "%02X" %)))})))

(defn- row [id e entity-type attr value tx]
  {:id id :entity_id e :entity_type entity-type :attribute attr :value_type "string" :value_string value
   :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})

(defn- change [op id subject attr value tx]
  {"op" op "tripleId" id "entityId" subject "attribute" attr "value" {"type" "string" "value" value}
   "validFrom" 0.0 "recordedAt" 1000.0 "assertionTxId" tx})

(defn frame
  "One save of `facts` ({:field :value :pred}) and `retires` ({:field :pred}) on one subject, as the SDK frames it:
  the business rows, one journal change per fact and per retired value, and four fixed journal rows.
  :pred is the current {:id :value} of that field, or nil for a first write."
  [{:keys [subject command block facts retires source bounds?]}]
  (let [{:keys [tx id]} block
        n (volatile! -1) next-id #(id (vswap! n inc))
        business (mapv (fn [{:keys [field value]}] (row (next-id) subject nil field value tx)) facts)
        retired (vec (concat (keep (fn [{:keys [field pred]}] (when pred [field pred])) facts)
                             (map (fn [{:keys [field pred]}] [field pred]) retires)))
        old (mapv (fn [[field {pid :id pv :value}]]
                    (assoc (row pid subject nil field pv "_tx/earlier")
                           :retracted_at 1000.0 :retracted_position 1 :retract_tx_id tx))
                  retired)
        j (fn [attr value] (row (next-id) tx "_Transaction" attr value tx))
        changes (concat (map (fn [r] (change "assert" (:id r) subject (:attribute r) (:value_string r) tx)) business)
                        (map (fn [[field {pid :id pv :value}]]
                               (assoc (change "retract" pid subject field pv "_tx/earlier")
                                      "retractedAt" 1000.0 "retractionTxId" tx)) retired))
        journal (into [(assoc (j ":_tx/position" nil) :value_type "number" :value_number 1.0)
                       (assoc (j ":_tx/instant" nil) :value_type "datetime" :value_datetime 1000.0)
                       (j ":_tx/changed-entity" subject) (j ":_tx/command-id" command)]
                      (map (fn [c] (assoc (j ":_tx/change" nil) :value_type "json" :value_json (json/write-str c))) changes))
        fresh (into business journal)
        ids (mapv :id fresh)]
    (rows/row-input
      (cond-> {"sourceK" source "span" 1 "position" 1 "scopeWide" false "entities" [subject]
               "operationId" command "rows" (mapv storage/wire-row (into fresh old)) "newIds" ids
               "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]}
        bounds? (assoc "historyIdentityBounds" [(first (sort ids)) (last (sort ids))])))))

(defn head [conn] (storage/head-position (d/db conn)))

;; ---------------------------------------------------------------- a subject model and save shapes

(def kinds [:replace :first :mixed])
(def sizes [6 20 75 120])

(defn shape-facts
  "Facts for one save of `size` facts of `kind` against the model `state` (field -> {:id :value})."
  [state kind size tag seeded]
  (let [seed-fields (filterv #(contains? state %) seeded)
        rep (case kind :replace size :first 0 :mixed (quot size 2))
        fst (case kind :replace 0 :first size :mixed (quot (* size 2) 5))
        ret (- size rep fst)]
    (assert (<= (+ rep ret) (count seed-fields)) "not enough current fields")
    {:facts (vec (concat (for [f (take rep seed-fields)] {:field f :value (str tag "|" f "|🧭") :pred (state f)})
                         (for [k (range fst)] {:field (str ":new/" tag "-" k) :value (str tag "|new" k) :pred nil})))
     :retires (vec (for [f (take ret (reverse seed-fields))] {:field f :pred (state f)}))}))

(defn apply-model [state {:keys [facts retires]} ids]
  (let [state (reduce (fn [s [{:keys [field value]} id]] (assoc s field {:id id :value value})) state (map vector facts ids))]
    (reduce (fn [s {:keys [field]}] (dissoc s field)) state retires)))

;; ---------------------------------------------------------------- the product routes

(defn feed-changes
  "Every journal change of one feed transaction, decoded, in a stable order."
  [[_ _ texts]]
  (sort-by pr-str (for [text texts :let [row (lean/decode text)] :when (= ":_tx/change" (:attribute row))]
                    (json/read-str (:value_json row)))))

(defn product-reads
  "What a client sees for these subjects through every read route, at the given positions."
  [name conn subjects positions]
  (let [db (d/db conn)
        read (fn [input] (let [r (reference/route name "v1" "read" input)]
                           (assert (= 200 (:status r)) (pr-str r))
                           (sort-by #(get-in % ["id" "v"]) (get-in r [:body "rows"]))))
        reach (fn [s basis] (dissoc (json/read-str (reach/response name db {"roots" [s] "basis" basis "full" true})) "t" "basisT"))
        feed (loop [after 0 out []]
               (let [page (reference/feed name after 200)]
                 (if (empty? page) out (recur (second (peek page)) (into out page)))))]
    {:current (into {} (for [s subjects] [s (read {"entityIds" [s] "basis" {"validAt" 5.0}})]))
     :pinned (into {} (for [s subjects p positions] [[s p] (read {"entityIds" [s] "basis" {"validAt" 5.0 "recordedPosition" p}})]))
     :history (into {} (for [s subjects] [s (read {"entityIds" [s] "history" true})]))
     :reach (into {} (for [s subjects] [s (reach s {"validAt" 5.0})]))
     :reachPinned (into {} (for [s subjects p (take-last 3 positions)] [[s p] (reach s {"validAt" 5.0 "recordedPosition" p})]))
     :feed (mapv #(vec (take 2 %)) feed)
     :feedChanges (mapv feed-changes feed)}))

(defn by-id-reads [name ids]
  (into {} (for [id ids]
             [id [(get-in (reference/route name "v1" "read" {"id" id "basis" {"validAt" 5.0}}) [:body "rows"])
                  (get-in (reference/route name "v1" "read" {"id" id "history" true}) [:body "rows"])]])))

(defn current-values [rows-read]
  (into {} (map (fn [r] [(get-in r ["attribute" "v"]) (get-in r ["value_string" "v"])])) rows-read))

;; ---------------------------------------------------------------- gates

(def gate-fields (mapv #(str ":seed/f" %) (range 160)))
(def reference-subject "acct/test/wide-subject")

(defn seed-frame [subject command values]
  ;; The seed takes the general writer in every arm (160 first writes, ordinary IDs).
  (let [tx (str "_tx/" command)
        business (vec (map-indexed (fn [j f] (row (str command "-" j) subject nil f (values j) tx)) gate-fields))
        journal [(assoc (row (str command "/p") tx "_Transaction" ":_tx/position" nil tx) :value_type "number" :value_number 1.0)
                 (assoc (row (str command "/t") tx "_Transaction" ":_tx/instant" nil tx) :value_type "datetime" :value_datetime 1000.0)
                 (row (str command "/e") tx "_Transaction" ":_tx/changed-entity" subject tx)
                 (row (str command "/c") tx "_Transaction" ":_tx/command-id" command tx)]
        fresh (into business journal)]
    {:input (rows/row-input {"span" 1 "position" 1 "scopeWide" false "entities" [subject] "operationId" command
                             "rows" (mapv storage/wire-row fresh) "newIds" (mapv :id fresh)
                             "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]})
     :state (into {} (map-indexed (fn [j f] [f {:id (str command "-" j) :value (values j)}]) gate-fields))}))

(defn- with-writer [wide? f]
  (with-redefs [subject/enabled true subject/wide? wide? group/enabled false
                policy/priority? false policy/field-only? false policy/budget-us nil]
    (f)))

(defn- planned-save
  "Build the next save for the model; returns [input ids model-after]."
  [state {:keys [kind size block command source facts retires]}]
  (let [{:keys [facts retires]} (if facts {:facts facts :retires (or retires [])}
                                    (shape-facts state kind size command gate-fields))
        input (frame {:subject reference-subject :command command :block block :facts facts :retires retires :source source})
        ids (vec (take (count facts) (get input "newIds")))]
    [input (apply-model state {:facts facts :retires retires} ids)]))

(def steps
  ;; [label kind size identity expected-writer-with-option-off expected-with-option-on]
  [["wide-replace-20"   :replace 20  :wide   :general :subject]
   ["narrow-replace-1"  :replace 1   :narrow :subject :subject]
   ["wide-mixed-75"     :mixed   75  :wide   :general :subject]
   ["narrow-first-2"    :first   2   :narrow :general :subject]
   ["wide-first-6"      :first   6   :wide   :general :subject]
   ["wide-replace-120"  :replace 120 :wide   :general :subject]
   ["narrow-replace-3"  :replace 3   :narrow :subject :subject]
   ["wide-mixed-120"    :mixed   120 :wide   :general :subject]
   ["narrow-mixed-3"    :mixed   3   :narrow :general :subject]
   ["wide-replace-129"  :replace 129 :wide   :general :general]
   ["wide-replace-6"    :replace 6   :wide   :general :subject]])

(defn- run-pair
  "Send the same steps to a control scope (option off) and a candidate scope (option on) and return the trail."
  [control-name control candidate-name candidate & {:keys [append?] :or {append? false}}]
  (let [seed (seed-frame reference-subject "seed" #(str "seed-value-" %))]
    (is (= [200 nil] (reference/outcome (with-writer false #(reference/send control-name (:input seed))))))
    (is (= [200 nil] (reference/outcome (with-writer true #(reference/send candidate-name (:input seed))))))
    (loop [[[label kind size id-kind off on] & more] steps n 1 state (:state seed) trail []]
      (if-not label
        {:trail trail :state state}
        (let [source (head control)
              [input after] (planned-save state {:kind kind :size size :block (identity-block id-kind n)
                                                 :command (str "w-" n "-" label) :source source})
              l (with-writer false #(reference/send control-name input))
              c (with-redefs [subject/append-retirement? (and append? subject/numeric-owner?)]
                  (with-writer true #(reference/send candidate-name input)))
              writer #(if (get-in % [:body "subjectSave"]) :subject :general)]
          (is (= [200 nil] (reference/outcome l)) [label (:body l)])
          (is (= (reference/outcome l) (reference/outcome c)) [label (:body c)])
          (is (= (get-in l [:body "position"]) (get-in c [:body "position"])) label)
          (is (= (get-in l [:body "recordedAt"]) (get-in c [:body "recordedAt"])) label)
          (is (= off (writer l)) [label :option-off (:body l)])
          (is (= on (writer c)) [label :option-on (:body c)])
          (when (= :subject on)
            (is (true? (get-in c [:body "subjectOrderedIds"])) [label "ordered block recognised"]))
          (recur more (inc n) after (conj trail [label (writer l) (writer c) (get-in c [:body "datoms"])])))))))

(defn- compare-routes [control-name control candidate-name candidate state]
  (let [positions (range 1 (inc (head control)))
        expected (product-reads control-name control [reference-subject] positions)
        actual (product-reads candidate-name candidate [reference-subject] positions)
        ids (into #{} (comp (mapcat val) (map #(get-in % ["id" "v"]))) (:history actual))]
    (doseq [k (keys expected)] (is (= (get expected k) (get actual k)) (str "read route " k)))
    (is (= (by-id-reads control-name ids) (by-id-reads candidate-name ids)) "read by assertion ID")
    (is (= (into {} (map (fn [[f {:keys [value]}]] [f value])) state)
           (current-values (get-in actual [:current reference-subject])))
        "current values equal the model")
    {:positions (count positions) :ids (count ids) :historyRows (count (get-in actual [:history reference-subject]))
     :currentRows (count (get-in actual [:current reference-subject])) :feed (count (:feed actual))}))

(deftest wide-saves-match-the-general-writer
  ;; [Opus W2] Why: the option moves wide saves, first writes and retirements to the per-subject writer;
  ;; every read route must answer as the general writer's database does. Rejected: comparing internal projections.
  (with-redefs [layout/enabled false]
    (reference/in-scope
      (fn [control-name control]
        (reference/in-scope
          (fn [candidate-name candidate]
            (let [{:keys [trail state]} (run-pair control-name control candidate-name candidate)
                  shape (compare-routes control-name control candidate-name candidate state)]
              (println "DX-W2_WIDE_ROUTES" (json/write-str (assoc shape :attempt (System/getenv "PREP1_ATTEMPT") :trail trail))))))))))

(deftest wide-saves-with-append-retirement
  (if-not subject/numeric-owner?
    (println "DX-W2_SKIP append retirement needs TX2_SUBJECT_NUMERIC_OWNER=1")
    (with-redefs [layout/enabled false]
      (reference/in-scope
        (fn [control-name control]
          (reference/in-scope
            (fn [candidate-name candidate]
              (let [{:keys [trail state]} (run-pair control-name control candidate-name candidate :append? true)
                    shape (compare-routes control-name control candidate-name candidate state)
                    markers (count (seq (d/datoms (d/db candidate) :aevt :triplex.entity/retired)))]
                (is (pos? markers) "append retirement wrote markers")
                (println "DX-W2_WIDE_APPEND" (json/write-str (assoc shape :markers markers :trail trail)))))))))))

(deftest wide-conflicts-resends-and-identities
  ;; [Opus W2] Why: the wide path must refuse exactly what the general writer refuses, with the same codes and no write.
  (with-redefs [layout/enabled false]
    (reference/in-scope
      (fn [control-name control]
        (reference/in-scope
          (fn [candidate-name candidate]
            (let [seed (seed-frame reference-subject "seed" #(str "seed-value-" %))
                  both (fn [input & [label]]
                         (let [l (with-writer false #(reference/send control-name input))
                               c (with-writer true #(reference/send candidate-name input))]
                           (is (= (reference/outcome l) (reference/outcome c)) [label (:body l) (:body c)])
                           (is (= (head control) (head candidate)) label)
                           [(reference/outcome c) (get-in c [:body "subjectSave"])]))
                  _ (both (:input seed) "seed")
                  s0 (:state seed)
                  ;; 1. a wide save, then its resend and a fresh operation on the same command
                  [w1 s1] (planned-save s0 {:kind :mixed :size 40 :block (identity-block :wide 100) :command "c-1" :source (head control)})
                  _ (is (= [[200 nil] (str subject/ident)] (both w1 "wide save")))
                  receipt (reference/claim candidate-name "c-1")
                  _ (is (= [[409 "OperationDuplicate"] nil] (both w1 "resend")))
                  _ (is (= [[409 "CommandConflict"] nil] (both (assoc w1 "operationId" "c-1-fresh") "same command")))
                  _ (is (= receipt (reference/claim candidate-name "c-1")) "original receipt kept")
                  ;; 2. a save planned before another save replaced its predecessors
                  stale-source (head control)
                  [w2 s2] (planned-save s1 {:kind :replace :size 30 :block (identity-block :wide 101) :command "c-2" :source stale-source})
                  [w3 _] (planned-save s1 {:kind :replace :size 30 :block (identity-block :wide 102) :command "c-3" :source stale-source})
                  _ (is (= [[200 nil] (str subject/ident)] (both w2 "winner")))
                  _ (is (= [409 "CasConflict"] (first (both w3 "stale predecessor"))))
                  _ (is (= {"status" "absent"} (reference/operation candidate-name "c-3")))
                  ;; 3. a wide block that reuses IDs of an earlier one-byte block (live and retired), and of a wide block
                  narrow-token (str (token23 7) "0")
                  [n1 s3] (planned-save s2 {:kind :replace :size 2 :block {:tx (str "_tx/" narrow-token "00") :id #(str narrow-token (format "%02X" %))}
                                            :command "c-4" :source (head control)})
                  _ (is (= [[200 nil] (str subject/ident)] (both n1 "narrow block")))
                  [n2 s4] (planned-save s3 {:kind :replace :size 2 :block (identity-block :narrow 103) :command "c-5" :source (head control)})
                  _ (is (= [200 nil] (first (both n2 "retire the narrow block's rows"))))
                  [reuse _] (planned-save s4 {:kind :replace :size 10 :block (identity-block :wide 7) :command "c-6" :source (head control)})
                  reuse-outcome (both reuse "wide block over an old one-byte block")
                  _ (is (= "IdentityConflict" (second (first reuse-outcome))) (pr-str reuse-outcome))
                  _ (is (= {"status" "absent"} (reference/operation candidate-name "c-6")))
                  [again _] (planned-save s4 {:kind :replace :size 10 :block (identity-block :wide 100) :command "c-7" :source (head control)})
                  again-outcome (both again "wide block reused")
                  _ (is (= "IdentityConflict" (second (first again-outcome))) (pr-str again-outcome))
                  ;; 4. a lost reply on the wide path: durable, then OutcomeUnknown, then the original receipt
                  [w8 s8] (planned-save s4 {:kind :first :size 50 :block (identity-block :wide 104) :command "c-8" :source (head control)})
                  native d/transact-async
                  lost (with-writer true
                         #(with-redefs [d/transact-async (fn [c tx & options]
                                                           (if (= subject/ident (ffirst tx))
                                                             ;; The commit is durable; its reply never arrives.
                                                             (do @(apply native c tx options) (promise))
                                                             (apply native c tx options)))]
                            (reference/send candidate-name w8)))
                  _ (is (= [503 "OutcomeUnknown"] (reference/outcome lost)) (pr-str (:body lost)))
                  _ (is (= [200 nil] (reference/outcome (with-writer false #(reference/send control-name w8)))))
                  _ (is (= [409 "OperationDuplicate"] (reference/outcome (with-writer true #(reference/send candidate-name w8)))))
                  recovered (reference/operation candidate-name "c-8")
                  _ (is (= "committed" (get recovered "status")))
                  _ (is (= (get (reference/operation control-name "c-8") "position") (get recovered "position")))
                  shape (compare-routes control-name control candidate-name candidate s8)]
              (println "DX-W2_WIDE_REFUSALS" (json/write-str (assoc shape :reuse (first reuse-outcome) :again (first again-outcome)))))))))))

(deftest wide-saves-with-the-covering-head
  ;; [Opus W2] Why: with the covering root on, a wide save folds the subject and takes the plain per-subject writer;
  ;; narrow replacements keep the covering writer. Every route must still answer as a database without either option.
  (if-not subject/owner-head?
    (println "DX-W2_SKIP covering head needs TX2_SUBJECT_OWNER_HEAD=1")
    (with-redefs [layout/enabled false]
      (reference/in-scope
        (fn [control-name control]
          (with-redefs [layout/enabled true]
            (reference/in-scope
              (fn [candidate-name candidate]
                (layout/install-fixture! candidate)
                (let [seed (seed-frame reference-subject "seed" #(str "seed-value-" %))
                      owner #(d/entid (d/db candidate) [:triplex.entity/id reference-subject])
                      send-both (fn [input label]
                                  (let [l (with-redefs [layout/enabled false] (with-writer false #(reference/send control-name input)))
                                        c (with-writer true #(reference/send candidate-name input))]
                                    (is (= [200 nil] (reference/outcome l)) [label (:body l)])
                                    (is (= (reference/outcome l) (reference/outcome c)) [label (:body c)])
                                    (is (= (get-in l [:body "position"]) (get-in c [:body "position"])) label)
                                    [label (get-in c [:body "subjectSave"]) (count (:texts (owner-root/root (d/db candidate) (owner))))]))
                      _ (send-both (:input seed) "seed")
                      plan [["narrow-1" :replace 1 :narrow] ["narrow-2" :replace 2 :narrow] ["wide-20" :replace 20 :wide]
                            ["narrow-3" :replace 1 :narrow] ["wide-mixed-75" :mixed 75 :wide] ["narrow-4" :replace 3 :narrow]
                            ["narrow-first" :first 1 :narrow] ["wide-120" :replace 120 :wide] ["narrow-5" :replace 1 :narrow]]
                      [trail state] (reduce (fn [[trail state] [n [label kind size id-kind]]]
                                              (let [[input after] (planned-save state {:kind kind :size size :block (identity-block id-kind (+ 200 n))
                                                                                       :command (str "h-" n "-" label) :source (head control)})]
                                                [(conj trail (send-both input label)) after]))
                                            [[] (:state seed)] (map-indexed vector plan))
                      by-label (into {} (map (juxt first rest)) trail)]
                  (is (= (str layout/ident) (first (by-label "narrow-1"))) "narrow replacement takes the covering writer")
                  (is (= (str subject/ident) (first (by-label "wide-20"))) "wide save takes the plain per-subject writer")
                  (is (= (str subject/ident) (first (by-label "narrow-first"))) "first write takes the plain per-subject writer")
                  (is (= 0 (second (by-label "wide-120"))) "the wide save left no root")
                  (is (= (str layout/ident) (first (by-label "narrow-5"))) "the next replacement migrates again")
                  (let [shape (compare-routes control-name control candidate-name candidate state)]
                    (println "DX-W2_WIDE_HEAD" (json/write-str (assoc shape :trail trail)))))))))))))

;; ---------------------------------------------------------------- the paired toy measurement (SQL storage)

(def m-people 192)
(def m-width 160)
(def m-round-people 96)
(def m-arms ["general" "general-bounds" "subject-wide"])
(def m-shapes (vec (for [kind kinds size sizes] [kind size])))
(defn m-subject [i] (str "acct/test/wide-" i))
(defn m-fields [] (mapv #(str ":seed/f" %) (range m-width)))
(defn m-seed-state [i]
  (into {} (map (fn [j f] [f {:id (str "w" i "-" j "-0") :value (str "seed-" i "-" j)}]) (range) (m-fields))))
(defn- m-order [round] (mapv #(+ (* (dec round) m-round-people) (mod (* % 37) m-round-people)) (range m-round-people)))

(defn- seed-subject-frame [i]
  (let [subject (m-subject i) command (str "seed-" i) tx (str "_tx/" command) state (m-seed-state i)
        business (mapv (fn [f] (row (:id (state f)) subject nil f (:value (state f)) tx)) (m-fields))
        journal [(assoc (row (str command "/p") tx "_Transaction" ":_tx/position" nil tx) :value_type "number" :value_number 1.0)
                 (assoc (row (str command "/t") tx "_Transaction" ":_tx/instant" nil tx) :value_type "datetime" :value_datetime 1000.0)
                 (row (str command "/e") tx "_Transaction" ":_tx/changed-entity" subject tx)
                 (row (str command "/c") tx "_Transaction" ":_tx/command-id" command tx)]
        fresh (into business journal)]
    (rows/row-input {"span" 1 "position" 1 "scopeWide" false "entities" [subject] "operationId" command
                     "rows" (mapv storage/wire-row fresh) "newIds" (mapv :id fresh)
                     "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]})))

(defn measure-seed!
  "One identical indexed seed per arm, each in its own scope."
  [path]
  (let [attempt (System/getenv "PREP1_ATTEMPT")
        scopes (into {} (for [arm m-arms]
                          (let [wire (json/write-str ["triplex-scope-v1" "test" "wide-saves" (str attempt "-" arm) 0])
                                {:keys [db created]} (main/create-scope! nil wire "lean" true true)
                                conn (main/connection (main/db-uri db))]
                            (assert created)
                            (subject/install! conn (d/db conn))
                            (with-writer false
                              #(doseq [i (range m-people)]
                                 (let [reply (reference/send db (seed-subject-frame i))]
                                   (assert (= [200 nil] (reference/outcome reply)) (pr-str (:body reply))))))
                            (let [t (d/basis-t (d/db conn))]
                              (d/request-index conn)
                              @(d/sync-index conn t)
                              [arm {:db db :seedT t :position (head conn)}]))))]
    (spit path (pr-str {:attempt attempt :scopes scopes}))
    (println "DX-W2_SEED" (json/write-str {:attempt attempt :people m-people :width m-width :scopes scopes}))))

(defn- text-bytes [report]
  (reduce + (map #(if (and (:added %) (string? (:v %))) (alength (.getBytes ^String (:v %) java.nio.charset.StandardCharsets/UTF_8)) 0)
                 (:tx-data report))))
(defn- reads [stats] (select-keys (:reads stats) [:sql :eavt-load :aevt-load :avet-load :vaet-load :ocache :dev]))

(defn- m-commit! [arm conn input]
  (let [db (d/db conn)
        started (System/nanoTime)
        prepared (io/throw-if-ex!
                   (io/with-io-stats
                     #(let [data (storage/tx-data db input)]
                        (if (= arm "subject-wide")
                          (let [plan (subject/plan db data input)]
                            (assert plan (str "the widened writer refused " (get input "operationId")))
                            [[subject/ident plan] plan])
                          [data nil]))
                     {:io-context :w2/prepare :api :lookup}))
        [tx-data plan] (:ret prepared)
        report @(d/transact-async conn (if plan [tx-data] tx-data) :io-context (keyword "w2" arm))
        report (if plan (subject/verify-report report plan) report)]
    {:report report :wallMs (/ (- (System/nanoTime) started) 1e6)
     :peer (reads (:io-stats prepared)) :tx (reads (:io-stats report)) :applyMs (get-in report [:io-stats :api-ms])}))

(defn measure-round!
  "The same saves, in the same order, on the same subjects, for one arm after a transactor restart."
  [path arm round]
  (let [{:keys [attempt scopes]} (edn/read-string (slurp path))
        {:keys [db]} (get scopes arm)
        conn (main/connection (main/db-uri db))
        fields (m-fields)
        out (with-writer (= arm "subject-wide")
              #(vec (for [[k i] (map-indexed vector (m-order round))]
                      (let [[kind size] (m-shapes (mod k (count m-shapes)))
                            subject (m-subject i)
                            tag (str "r" round "-" i)
                            seed (m-seed-state i)
                            a (shape-facts seed kind size (str tag "a") fields)
                            a-input (frame {:subject subject :command (str tag "a") :block (identity-block :wide (+ (* round 100000) (* 2 i)))
                                            :facts (:facts a) :retires (:retires a) :source (head conn) :bounds? (= arm "general-bounds")})
                            a-ids (vec (take (count (:facts a)) (get a-input "newIds")))
                            after-a (apply-model seed a a-ids)
                            b-facts (mapv (fn [{:keys [field]}] {:field field :value (str tag "b|" field) :pred (after-a field)}) (:facts a))
                            b {:facts b-facts :retires []}
                            b-input (frame {:subject subject :command (str tag "b") :block (identity-block :wide (+ (* round 100000) (* 2 i) 1))
                                            :facts b-facts :retires [] :source nil :bounds? (= arm "general-bounds")})
                            run (fn [phase input save model]
                                  (let [input (assoc input "sourceK" (head conn))
                                        {:keys [report] :as m} (m-commit! arm conn input)
                                        after (:db-after report)
                                        owner (d/entid after [:triplex.entity/id subject])
                                        current (into {} (map (comp (juxt :attribute :value_string) lean/decode :v)) (lean/live-texts after owner))]
                                    (assert (= current (into {} (map (fn [[f {:keys [value]}]] [f value])) model))
                                            (str "exact current readback after " (get input "operationId")))
                                    (merge (dissoc m :report)
                                           {:arm arm :round round :subject i :kind kind :size size :phase phase
                                            :facts (count (:facts save)) :retired (+ (count (keep :pred (:facts save))) (count (:retires save)))
                                            :assertions (count (get input "newIds")) :position (scope/value after (d/t->tx (d/basis-t after)) :triplex.tx/position)
                                            :datoms (count (:tx-data report)) :addedTextBytes (text-bytes report)
                                            :writer (or (:subject-save report) "general")})))]
                        [(run "cold" a-input a after-a)
                         (run "warm" b-input b (apply-model after-a b (vec (take (count b-facts) (get b-input "newIds")))))]))))]
    (assert (= attempt (System/getenv "PREP1_ATTEMPT")))
    (doseq [[a b] out] (println "DX-W2_COMMIT" (json/write-str a)) (println "DX-W2_COMMIT" (json/write-str b)))
    ;; [Opus W2] Why: start every arm's next round from an indexed database, so reads count cold segments, not an index job.
    (when (= "1" (System/getenv "DX_W2_INDEX_BETWEEN"))
      (let [t (d/basis-t (d/db conn))] (d/request-index conn) @(d/sync-index conn t)))))

(defn- digest [x] (triplex.gateway.schema/sha256 (pr-str x)))

(defn measure-verify!
  "Every read route, for every subject the rounds touched, answers the same in all three arms (compared by digest)."
  [path]
  (let [{:keys [attempt scopes]} (edn/read-string (slurp path))
        conns (into {} (for [[arm {:keys [db]}] scopes] [arm [db (main/connection (main/db-uri db))]]))
        heads (into {} (for [[arm [_ conn]] conns] [arm (head conn)]))
        _ (assert (apply = (vals heads)) (pr-str heads))
        subjects (mapv m-subject (range m-people))
        seed-position (get-in scopes ["general" :position])
        positions (vec (range seed-position (inc (heads "general"))))
        route (fn [db input] (let [r (reference/route db "v1" "read" input)] (assert (= 200 (:status r)) (pr-str r)) (get-in r [:body "rows"])))
        sorted #(sort-by (fn [r] (get-in r ["id" "v"])) %)
        summary (fn [arm]
                  (let [[db conn] (conns arm) started (System/nanoTime) counts (volatile! {})
                        count! (fn [k n] (vswap! counts update k (fnil + 0) n))
                        per-subject (fn [k f] (digest (mapv (fn [s] (let [rows (f s)] (count! k (count rows)) (digest (sorted rows)))) subjects)))
                        current (per-subject :current #(route db {"entityIds" [%] "basis" {"validAt" 5.0}}))
                        history-ids (volatile! [])
                        history (per-subject :history #(let [rows (route db {"entityIds" [%] "history" true})]
                                                         (vswap! history-ids into (take-nth 37 (map (fn [r] (get-in r ["id" "v"])) rows)))
                                                         rows))
                        pinned (digest (vec (for [p (take-nth 9 positions) s (take 4 (drop (mod p 188) subjects))]
                                              (do (count! :pinned 1) (digest (sorted (route db {"entityIds" [s] "basis" {"validAt" 5.0 "recordedPosition" p}})))))))
                        by-id (digest (vec (for [id (sort @history-ids)]
                                             (do (count! :byId 1)
                                                 [(digest (route db {"id" id "basis" {"validAt" 5.0}})) (digest (route db {"id" id "history" true}))]))))
                        reach (digest (vec (for [s (take-nth 8 subjects)]
                                             (do (count! :reach 1)
                                                 (digest (dissoc (json/read-str (reach/response db (d/db conn) {"roots" [s] "basis" {"validAt" 5.0} "full" true})) "t" "basisT"))))))
                        feed (loop [after 0 out []]
                               (let [page (reference/feed db after 100)]
                                 (if (empty? page) (digest out)
                                   (do (count! :feed (count page))
                                       (recur (second (peek page)) (conj out (digest (mapv (fn [tx] [(vec (take 2 tx)) (feed-changes tx)]) page))))))))]
                    (println "DX-W2_VERIFY_ARM" arm (format "%.1f s" (/ (- (System/nanoTime) started) 1e9)) (pr-str @counts))
                    {:digests {:current current :history history :pinned pinned :byId by-id :reach reach :feed feed} :counts @counts}))
        results (into {} (for [arm (keys conns)] [arm (summary arm)]))
        base (results "general")]
    (doseq [[arm r] results k (keys (:digests base))]
      (assert (= (get-in base [:digests k]) (get-in r [:digests k])) (str arm " differs from the general writer on read route " k)))
    (assert (apply = (map :counts (vals results))))
    (println "DX-W2_VERIFY" (json/write-str {:attempt attempt :arms (keys results) :head (heads "general")
                                             :counts (:counts base) :equal true}))))
