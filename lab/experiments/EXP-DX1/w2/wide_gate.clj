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
