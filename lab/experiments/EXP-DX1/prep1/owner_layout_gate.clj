(ns owner-layout-gate
  (:require [clojure.data.json :as json] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [clojure.edn :as edn]
            [triplex.gateway.group :as group] [triplex.gateway.group-test :as fixture]
            [triplex.gateway.lean :as lean] [triplex.gateway.owner-layout :as layout]
            [triplex.gateway.main :as main] [triplex.gateway.schema :as schema]
            [triplex.gateway.scope :as scope] [triplex.gateway.selftest :as rows]
            [triplex.gateway.storage :as storage] [triplex.gateway.subject-save :as subject]
            [triplex.gateway.write-policy :as policy] [wfix1-regression :as reference]))

(defn at-cut [input cut] (assoc input "sourceK" cut "position" cut))
(defn native-plan [db input] (layout/prepare db (storage/tx-data db input) input))
(defn append! [conn plan] (layout/verify-report @(d/transact conn [[layout/ident plan]]) plan))

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

(defn snapshot [db owner]
  (let [rows (vec (current db owner))]
    {:rows (count rows) :digest (schema/sha256 (pr-str rows))}))

(defn staged-reads! [path]
  (let [attempt (System/getenv "PREP1_ATTEMPT")
        build (fn [arm]
                (let [wire (json/write-str ["triplex-scope-v1" "test" "layout-read" (str attempt "-" arm) 0])
                      {:keys [db created]} (main/create-scope! nil wire "lean" true true)
                      conn (main/connection (main/db-uri db))
                      [seed a b] (reference/edits)
                      migrate? (= arm "migrated")
                      edit (fn [input cut]
                             (let [input (at-cut input cut)]
                               (if migrate?
                                 (let [plan (native-plan (d/db conn) input)]
                                   (assert plan)
                                   (append! conn plan))
                                 (assert (= [200 nil] (reference/outcome (reference/send db input)))))))]
                  (assert created)
                  (layout/install-fixture! conn)
                  (assert (= [200 nil] (reference/outcome (reference/send db (seed-deeper seed)))))
                  (edit a 1)
                  (let [view (d/db conn) owner (d/entid view [:triplex.entity/id fixture/root])
                        pinned {:t (d/basis-t view) :expected (snapshot view owner)}]
                    (edit b 2)
                    (let [current (d/db conn)]
                      (assert (= (boolean (scope/value current owner layout/root-attr)) migrate?))
                      {:db db :owner owner :pinned pinned :current {:t (d/basis-t current) :expected (snapshot current owner)}}))))
        fixtures (into {} (map (juxt identity build)) ["legacy" "migrated"])]
    (assert (apply = (map (fn [f] (mapv #(get-in f [% :expected]) [:pinned :current])) (vals fixtures))))
    (spit path (pr-str {:attempt attempt :fixtures fixtures}))))

(defn sample-reads! [path arm]
  (let [{:keys [attempt fixtures]} (edn/read-string (slurp path))
        {:keys [db owner pinned current]} (get fixtures arm)
        conn (main/connection (main/db-uri db))
        latest (d/db conn)
        sample (fn [{:keys [t expected]}]
                 (let [start (System/nanoTime)
                       view (if (= t (d/basis-t latest)) latest (d/as-of latest t))
                       actual (snapshot view owner)
                       elapsed (- (System/nanoTime) start)]
                   (assert (= expected actual))
                   elapsed))]
    (assert (= attempt (System/getenv "PREP1_ATTEMPT")))
    (assert (= (:t current) (d/basis-t latest)))
    (assert (= (= arm "migrated") (boolean (scope/value latest owner layout/root-attr))))
    (dotimes [_ 6] (sample current) (sample pinned))
    (println "DX-W1_OWNER_LAYOUT_READ"
             (json/write-str {:attempt attempt :db db :arm arm :pid (.pid (java.lang.ProcessHandle/current))
                              :current current :pinned pinned :clock "diagnostic-in-process"
                              :ns (mapv (fn [_] [(sample current) (sample pinned)]) (range 24))}))))
