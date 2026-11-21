(ns owner-layout-gate
  (:require [clojure.data.json :as json] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [clojure.edn :as edn]
            [triplex.gateway.group :as group] [triplex.gateway.group-test :as fixture]
            [triplex.gateway.lean :as lean] [triplex.gateway.owner-layout :as layout]
            [triplex.gateway.main :as main] [triplex.gateway.schema :as schema]
            [triplex.gateway.scope :as scope] [triplex.gateway.selftest :as rows]
            [triplex.gateway.storage :as storage] [triplex.gateway.subject-save :as subject]
            [triplex.gateway.write-policy :as policy] [wfix1-regression :as reference]))

(defn at-cut [input cut] (assoc input "sourceK" cut))
(defn native-plan [db input & [cover?]]
  (let [plan (layout/prepare db (storage/tx-data db input) input cover?)]
    (assert plan (str "Fixture must qualify for owner layout preparation: " (get input "operationId")))
    plan))
(defn append! [conn plan]
  (layout/verify-report @(d/transact-async conn [[layout/ident plan]] :io-context :dx-w1/owner-layout) plan))

(defn current [db owner]
  (sort-by :id (map (comp lean/decode :v) (layout/live-datoms db owner))))

(defn field [db owner]
  (some #(when (= ":v" (:attribute %)) [(:id %) (:value_string %) (:recorded_position %)])
        (current db owner)))

(defn seed-deeper [input]
  (let [extra (for [i (range 80)]
                (fixture/row (str "spare-" i) fixture/root (str ":spare/" i) (str "value-" i) "_tx/seed"))]
    (rows/row-input (-> input (update "rows" into (map storage/wire-row extra))
                             (update "newIds" into (map :id extra))))))

(defn counts [report]
  {:datoms (count (:tx-data report))
   :io (select-keys (get-in report [:io-stats :reads]) [:sql :eavt-load :aevt-load :avet-load :vaet-load])
   :addedTextBytes (reduce + (map #(if (and (:added %) (string? (:v %)))
                                   (alength (.getBytes ^String (:v %) java.nio.charset.StandardCharsets/UTF_8)) 0)
                                 (:tx-data report)))})

(deftest migration-and-stable-pages
  (with-redefs [subject/enabled true group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
    (reference/in-scope
      (fn [name conn]
        (let [[seed edit-a edit-b] (reference/edits)
              installed (layout/install-fixture! conn)]
          (is (nil? (d/entid installed [:triplex.entity/id fixture/root])))
          (is (= [200 nil] (reference/outcome (reference/send name (seed-deeper seed)))))
          (let [before (d/db conn)
                owner (d/entid before [:triplex.entity/id fixture/root])
                prior (current before owner)
                first-plan (native-plan before (at-cut edit-a 1))
                contender (native-plan before (at-cut (reference/edit-frame "contender" "loser" "loser value" 2.0 12.0 "old") 1))]
            (is (nil? (scope/value before owner layout/root-attr)))
            (is (= 81 (count prior)))
            (is (= 3 (count (:written-pages first-plan))))
            (let [first-report (append! conn first-plan)
                  migrated (:db-after first-report)]
              (is (= "old" (first (field before owner))))
              (is (= ["middle" "intermediate value" 2] (field migrated owner)))
              (is (= (remove #(= ":v" (:attribute %)) prior)
                     (remove #(= ":v" (:attribute %)) (current migrated owner))))
              (is (thrown? Exception @(d/transact conn [[layout/ident first-plan]])))
              (is (thrown-with-msg? Exception #"TRIPLEX_CONFLICT" @(d/transact conn [[layout/ident contender]])))
              (is (= {"status" "absent"} (reference/operation name "contender")))
              (is (= 2 (storage/head-position (d/db conn))))
              (is (= "old" (:id (lean/decode (:v (lean/by-id migrated "old"))))))
              (let [next-plan (native-plan migrated (at-cut edit-b 2))
                    report (append! conn next-plan)
                    after (:db-after report)
                    version (first (d/datoms after :aevt layout/owner-attr))
                    txids (mapv first (reference/feed name 0 10))]
                (is (= 1 (count (:written-pages next-plan))))
                (is (= 3 (layout/revision after owner)))
                (is (= 1 (scope/value after owner :triplex.entity/rev)))
                (is (= "new" (first (field after owner))))
                (is (= prior (current (d/as-of after (d/basis-t before)) owner)))
                (is (= (current migrated owner) (current (d/as-of after (d/basis-t migrated)) owner)))
                (is (= owner (:v version)))
                (is (not= owner (:e version)))
                (is (= ["_tx/edit-a" "_tx/edit-b"] (filterv #{"_tx/edit-a" "_tx/edit-b"} txids)))
                (is (= (d/basis-t after) (parse-long (get-in (reference/operation name "edit-b") ["t" "v"]))))
                (let [reuse (native-plan after (at-cut (reference/edit-frame "reuse-legacy" "old" "reused" 2.0 12.0 "new") 3))]
                  (is (thrown-with-msg? Exception #"TRIPLEX_SUBJECT_REPLAN" @(d/transact conn [[layout/ident reuse]])))
                  (is (= {"status" "absent"} (reference/operation name "reuse-legacy"))))
                (println "DX-W1_OWNER_LAYOUT_COUNTS"
                         (json/write-str {:attempt (System/getenv "PREP1_ATTEMPT")
                                          :db name :first (counts first-report) :next (counts report)}))))))))))

(deftest migration-refuses-a-won-legacy-race
  (with-redefs [subject/enabled true group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
    (reference/in-scope
      (fn [name conn]
        (layout/install-fixture! conn)
        (let [[seed edit-a] (reference/edits)]
          (is (= [200 nil] (reference/outcome (reference/send name seed))))
          (let [before (d/db conn)
                owner (d/entid before [:triplex.entity/id fixture/root])
                stale (native-plan before (at-cut edit-a 1))
                race (reference/edit-frame "race" "winner" "winner value" 2.0 12.0 "old")]
            (is (= [200 nil] (reference/outcome (reference/send name (at-cut race 1)))))
            (is (thrown-with-msg? Exception #"TRIPLEX_CONFLICT" @(d/transact conn [[layout/ident stale]])))
            (is (= 2 (storage/head-position (d/db conn))))
            (is (nil? (scope/value (d/db conn) owner layout/root-attr)))
            (is (= ["winner" "winner value" 2] (field (d/db conn) owner)))
            (is (= {"status" "absent"} (reference/operation name "edit-a")))))))))

(defn- read-rows [db owner arm]
  (let [datoms (case arm
                 ("legacy" "append") (layout/read-stage :legacy-range (vec (lean/live-texts db owner)))
                 "covered" (or (layout/covered-live-datoms db owner) (layout/live-datoms db owner))
                 (layout/live-datoms db owner))]
    (layout/read-stage :decode (vec (sort-by :id (map (comp lean/decode :v) datoms))))))

(defn- row-summary [rows]
  {:rows (count rows) :digest (schema/sha256 (pr-str rows))})

(defn- spare-edit [i]
  (let [attribute (str ":spare/" i)
        input (reference/edit-frame (str "edit-spare-" i) (str "replacement-" i) (str "new-value-\uD83E\uDDED\n" i)
                                    2.0 12.0 (str "spare-" i))]
    (rows/row-input
      (update input "rows"
              (fn [rows]
                (mapv (fn [wire]
                        (let [row (storage/decode-row wire)]
                          (storage/wire-row
                            (case (:attribute row)
                              ":v" (assoc row :attribute attribute)
                              ":_tx/change" (update row :value_json
                                                   #(json/write-str (assoc (json/read-str %) "attribute" attribute)))
                              row))))
                      rows))))))

(deftest covering-limit-preserves-legacy-cuts
  (with-redefs [subject/enabled true subject/owner-head? false
                group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
    (reference/in-scope
      (fn [legacy control]
        (reference/in-scope
          (fn [covered candidate]
            (layout/install-fixture! candidate)
            (let [[seed] (reference/edits)]
              (doseq [db [legacy covered]]
                (is (= [200 nil] (reference/outcome (reference/send db (seed-deeper seed)))))))
            (let [before (d/db candidate)
                  owner (d/entid before [:triplex.entity/id fixture/root])
                  legacy-owner (d/entid (d/db control) [:triplex.entity/id fixture/root])
                  cuts (mapv (fn [i]
                               (let [edit (at-cut (spare-edit i) (inc i))
                                     plan (native-plan (d/db candidate) edit true)
                                     backed (<= (inc i) layout/cover-limit)]
                                 (is (= [200 nil] (reference/outcome (reference/send legacy edit))))
                                 (is (= backed (boolean (get-in plan [:owner-layout :cover]))))
                                 (let [after (:db-after (append! candidate plan))
                                       expected (read-rows (d/db control) legacy-owner "legacy")]
                                   (is (= expected (read-rows after owner "covered")))
                                   [(d/basis-t after) expected])))
                             (range (inc layout/cover-limit)))
                  after (d/db candidate)]
              (is (= (read-rows before owner "covered")
                     (read-rows (d/as-of after (d/basis-t before)) owner "covered")))
              (doseq [[t expected] cuts]
                (is (= expected (read-rows (d/as-of after t) owner "covered"))))
              (is (= (reference/feed legacy 0 20) (reference/feed covered 0 20))))))))))

(defn- legacy-append! [conn db input append?]
  (let [reply (with-redefs [subject/append-retirement? append?] (reference/send db input))
        body (:body reply)
        _ (assert (= [200 nil] (reference/outcome reply)))
        t (parse-long (get-in body ["t" "v"]))
        log (d/log conn)
        entry (first (d/tx-range log t (inc t)))]
    (assert (= (:t entry) t))
    (assert (= (get body "datoms") (count (:data entry))))
    (assert (= append? (true? (get body "subjectAppendRetirement"))))
    {:tx-data (:data entry)}))

(defn staged-reads! [path]
  (let [attempt (System/getenv "PREP1_ATTEMPT")
        build (fn [arm]
                (let [wire (json/write-str ["triplex-scope-v1" "test" "layout-read" (str attempt "-" arm) 0])
                      {:keys [db created]} (main/create-scope! nil wire "lean" true true)
                      conn (main/connection (main/db-uri db))
                      [seed a b] (reference/edits)
                      migrate? (contains? #{"migrated" "covered"} arm)
                      edit (fn [input cut]
                             (let [input (at-cut input cut)]
                               (if migrate?
                                 (let [plan (native-plan (d/db conn) input (= arm "covered"))]
                                   (assert plan)
                                   (append! conn plan))
                                 (legacy-append! conn db input (= arm "append")))))]
                  (assert created)
                  (layout/install-fixture! conn)
                  (assert (= [200 nil] (reference/outcome (reference/send db (seed-deeper seed)))))
                  (let [first (edit a 1) view (d/db conn) owner (d/entid view [:triplex.entity/id fixture/root])
                        pinned {:t (d/basis-t view) :expected (row-summary (read-rows view owner arm))}]
                    (let [next (edit b 2) current (d/db conn)]
                      (assert (= (boolean (scope/value current owner layout/root-attr)) migrate?))
                      {:db db :owner owner :pinned pinned :current {:t (d/basis-t current) :expected (row-summary (read-rows current owner arm))}
                       :counts {:first (counts first) :next (counts next)}
                       :journal (schema/sha256 (pr-str (reference/feed db 0 10)))}))))
        fixtures (into {} (map (juxt identity build)) ["legacy" "append" "migrated" "covered"])]
    (assert (apply = (map (fn [f] [(:journal f) (get-in f [:pinned :expected]) (get-in f [:current :expected])]) (vals fixtures))))
    (spit path (pr-str {:attempt attempt :fixtures fixtures}))))

(defn sample-reads! [path arm]
  (let [{:keys [attempt fixtures]} (edn/read-string (slurp path))
        {:keys [db owner pinned current journal counts]} (get fixtures arm)
        conn (main/connection (main/db-uri db))
        latest (d/db conn)
        truth (into {} (map (fn [{:keys [t expected]}]
                             (let [actual (read-rows (d/as-of latest t) owner arm)]
                               (assert (= expected (row-summary actual)))
                               [t actual]))) [current pinned])
        sample (fn [{:keys [t]} profile?]
                 (let [stages (when profile? (volatile! {}))
                       start (System/nanoTime)
                       view (if (= t (d/basis-t latest)) latest (d/as-of latest t))
                       actual (binding [layout/*read-stages* stages] (read-rows view owner arm))
                       elapsed (- (System/nanoTime) start)]
                   ;; [DX-W1] Why: verify every read against the rows bound to its cut at startup.
                   ;; Rejected: rehashing the same rows after every read (allocates into the next sample).
                   (assert (= (truth t) actual))
                   (if stages @stages elapsed)))]
    (assert (= attempt (System/getenv "PREP1_ATTEMPT")))
    (assert (= (:t current) (d/basis-t latest)))
    (assert (= (contains? #{"migrated" "covered"} arm) (boolean (scope/value latest owner layout/root-attr))))
    (dotimes [_ 32] (sample current false) (sample pinned false))
    (println "DX-W1_OWNER_LAYOUT_READ"
             (json/write-str {:attempt attempt :db db :arm arm :pid (.pid (java.lang.ProcessHandle/current))
                              :current current :pinned pinned :journal journal :clock "diagnostic-in-process"
                              :counts counts
                              :ns (mapv (fn [_] [(sample current false) (sample pinned false)]) (range 96))
                              :stagesNs (mapv (fn [_] [(sample current true) (sample pinned true)]) (range 32))}))))
