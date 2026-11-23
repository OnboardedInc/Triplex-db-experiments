(ns owner-layout-gate
  (:require [clojure.data.json :as json] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [clojure.edn :as edn]
            [triplex.gateway.group :as group] [triplex.gateway.group-test :as fixture]
            [triplex.gateway.lean :as lean] [triplex.gateway.owner-layout :as layout] [triplex.gateway.owner-root :as owner-root]
            [triplex.gateway.main :as main] [triplex.gateway.reach :as reach] [triplex.gateway.schema :as schema]
            [triplex.gateway.scope :as scope] [triplex.gateway.selftest :as rows]
            [triplex.gateway.storage :as storage] [triplex.gateway.subject-save :as subject]
            [triplex.gateway.write-policy :as policy] [wfix1-regression :as reference]))

(defn at-cut [input cut] (assoc input "sourceK" cut))
(defn native-plan [db input]
  (let [plan (layout/prepare db (storage/tx-data db input) input)]
    (assert (and plan (not (:fold plan))) (str "Fixture must qualify for owner layout preparation: " (get input "operationId")))
    plan))
(defn append! [conn plan]
  (layout/verify-report @(d/transact-async conn [[layout/ident plan]] :io-context :dx-w1/owner-layout) plan))
(defn covered-append!
  "One covering save, folding first when the root is full. Returns the save report and the fold's datoms."
  [conn input]
  (let [db (d/db conn)
        plan (layout/prepare db (storage/tx-data db input) input)
        fold (when (:fold plan)
               (let [before (d/basis-t db) after (layout/fold! conn db (:fold plan))
                     entry (first (d/tx-range (d/log conn) (inc before) (inc (d/basis-t after))))]
                 {:db after :datoms (count (:data entry))}))
        plan (if fold (native-plan (:db fold) input) plan)]
    (assert (and plan (not (:fold plan))) (str "Covering save expected: " (get input "operationId")))
    {:report (append! conn plan) :plan plan :fold-datoms (:datoms fold)}))

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

(defn- field-edit [command attribute id value predecessor]
  (let [input (reference/edit-frame command id value 2.0 12.0 predecessor)]
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

(defn- spare-edit [i]
  (field-edit (str "edit-spare-" i) (str ":spare/" i) (str "replacement-" i) (str "new-value-🧭\n" i)
              (str "spare-" i)))

(deftest migration-and-cuts
  (with-redefs [subject/enabled true group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
    (reference/in-scope
      (fn [name conn]
        (let [[seed edit-a edit-b] (reference/edits)]
          (is (= [200 nil] (reference/outcome (reference/send name (seed-deeper seed)))))
          (let [installed (layout/install-fixture! conn)
                before (d/db conn)
                owner (d/entid before [:triplex.entity/id fixture/root])
                prior (current before owner)
                first-plan (native-plan before (at-cut edit-a 1))
                contender (native-plan before (at-cut (reference/edit-frame "contender" "loser" "loser value" 2.0 12.0 "old") 1))]
            (is (some? (d/entid installed layout/ident)))
            (is (nil? (scope/value before owner layout/root-attr)))
            (is (= 81 (count prior)))
            (let [first-report (append! conn first-plan)
                  migrated (:db-after first-report)]
              (is (= "old" (first (field before owner))))
              (is (= ["middle" "intermediate value" 2] (field migrated owner)))
              (is (= 2 (scope/value migrated owner :triplex.entity/rev)))
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
                (is (= 3 (layout/revision after owner)))
                (is (= 3 (scope/value after owner :triplex.entity/rev)))
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

(deftest migration-refuses-a-won-race
  (with-redefs [subject/enabled true group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
    (reference/in-scope
      (fn [name conn]
        (let [[seed edit-a] (reference/edits)]
          (is (= [200 nil] (reference/outcome (reference/send name seed))))
          (let [before (d/db conn)
                owner (d/entid before [:triplex.entity/id fixture/root])
                stale (native-plan before (at-cut edit-a 1))
                race (reference/edit-frame "race" "winner" "winner value" 2.0 12.0 "old")]
            (is (= [200 nil] (reference/outcome (reference/send name (at-cut race 1)))))
            (is (thrown-with-msg? Exception #"TRIPLEX_CONFLICT" @(d/transact conn [[layout/ident stale]])))
            (is (= 2 (storage/head-position (d/db conn))))
            (is (= ["winner"] (mapv owner-root/row-id (:texts (owner-root/root (d/db conn) owner)))))
            (is (= ["winner" "winner value" 2] (field (d/db conn) owner)))
            (is (= {"status" "absent"} (reference/operation name "edit-a")))))))))

(deftest framed-root-round-trips
  ;; [Opus W1] Why: IDs and row texts are customer bytes; the header holds only numbers and lengths.
  ;; Rejected: trusting that IDs never contain the header's separators.
  (let [encode owner-root/encode decode owner-root/decode
        mask ["a,b" "x\ny" "q\"\\" "🧭"] rows ["r1\n,4," "2"]
        raw (encode 17 1.800000000055E12 mask rows)
        root (decode raw)]
    (is (= [17 1.800000000055E12 mask rows] [(:position root) (:clock root) (:mask root) (:texts root)]))
    (is (= (Double/doubleToRawLongBits -0.0) (Double/doubleToRawLongBits (:clock (decode (encode 1 -0.0 [] ["x"]))))))
    (is (thrown? Exception (decode (str raw "!"))))
    (is (thrown? Exception (decode (encode 1 0.0 (mapv str (range 5)) ["x"]))))
    (is (thrown? Exception (decode (encode 1 0.0 [] (mapv str (range 5))))))))

(defn- history-rows [db owner]
  (vec (sort-by (juxt :id :retracted_position) (lean/history-entity db owner))))

(deftest fold-at-four-preserves-every-cut
  ;; [Opus W1] Why: the fifth distinct edited field folds the cover back into plain rows and migrates again.
  ;; Rejected: spilling into pages (slower reads) or growing the root without bound (pinned reads walk every old root).
  (with-redefs [subject/enabled true group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
    (with-redefs [layout/enabled false]
      (reference/in-scope
        (fn [legacy control]
          (with-redefs [layout/enabled true]
            (reference/in-scope
              (fn [covered candidate]
                (is (nil? (d/entid (d/db control) layout/root-attr)))
                (let [[seed] (reference/edits)]
                  (is (= [200 nil] (reference/outcome (reference/send legacy (seed-deeper seed)))))
                  (is (= [200 nil] (reference/outcome (reference/send covered (seed-deeper seed))))))
                (let [before (d/db candidate)
                      owner (d/entid before [:triplex.entity/id fixture/root])
                      legacy-owner (d/entid (d/db control) [:triplex.entity/id fixture/root])
                      cuts (mapv (fn [i]
                                   (let [edit (at-cut (spare-edit i) (inc i))
                                         _ (is (= [200 nil] (reference/outcome (reference/send legacy edit))))
                                         {:keys [report fold-datoms]} (covered-append! candidate edit)
                                         after (:db-after report)
                                         texts (count (:texts (owner-root/root after owner)))
                                         expected (current (d/db control) legacy-owner)]
                                     (is (= (if (= i 4) 1 (inc (mod i 4))) texts) [i texts])
                                     (is (= (= i 4) (some? fold-datoms)) [i fold-datoms])
                                     (is (= expected (current after owner)))
                                     [(d/basis-t after) (d/basis-t (d/db control)) expected]))
                                 (range 8))
                      after (d/db candidate)]
                  (is (= (current before owner) (current (d/as-of after (d/basis-t before)) owner)))
                  (doseq [[t legacy-t expected] cuts]
                    (is (= expected (current (d/as-of after t) owner)))
                    (is (= (history-rows (d/as-of (d/db control) legacy-t) legacy-owner)
                           (history-rows (d/as-of after t) owner))))
                  (is (= (history-rows (d/db control) legacy-owner) (history-rows after owner)))
                  (is (= (reference/feed legacy 0 20) (reference/feed covered 0 20))))))))))))

(defn- product-reads [name conn positions]
  ;; [Opus W1] Why: compare what clients see through every product read route, not the internal projection.
  (let [db (d/db conn)
        read (fn [input] (let [r (reference/route name "v1" "read" input)]
                           (assert (= 200 (:status r)) (pr-str r))
                           (sort-by #(get-in % ["id" "v"]) (get-in r [:body "rows"]))))
        reach (fn [basis] (json/read-str (reach/response name db {"roots" [fixture/root] "basis" basis "full" true})))]
    {:current (read {"entityIds" [fixture/root] "basis" {"validAt" 5.0}})
     :pinned (into {} (for [p positions] [p (read {"entityIds" [fixture/root] "basis" {"validAt" 5.0 "recordedPosition" p}})]))
     :history (read {"entityIds" [fixture/root] "history" true})
     :byId (into {} (for [id ["old" "middle" "new" "spare-0" "replacement-0" "extra-1"]]
                      [id [(read {"id" id "basis" {"validAt" 5.0}}) (read {"id" id "history" true})]]))
     :reach (dissoc (reach {"validAt" 5.0}) "t" "basisT")
     :reachPinned (into {} (for [p positions] [p (dissoc (reach {"validAt" 5.0 "recordedPosition" p}) "t" "basisT")]))
     :feed (mapv #(vec (take 2 %)) (reference/feed name 0 50))
     :feedChanges (mapv reference/changes (reference/feed name 0 50))}))

(deftest product-routes-match-legacy
  ;; [Opus W1] Why: with the option on, the product save route takes covering saves, folds, and hands other saves to the
  ;; reference writer; every read route must answer as for a database that never had the option.
  (with-redefs [subject/enabled true group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
    (with-redefs [layout/enabled false]
      (reference/in-scope
        (fn [legacy control]
          (with-redefs [layout/enabled true]
            (reference/in-scope
              (fn [covered candidate]
                (let [[seed edit-a edit-b] (reference/edits)
                      head #(storage/head-position (d/db %))
                      steps [["seed" (fn [_] (seed-deeper seed))]
                             ["edit-a" #(at-cut edit-a %)] ["edit-b" #(at-cut edit-b %)]
                             ["spare-0" #(at-cut (spare-edit 0) %)] ["spare-1" #(at-cut (spare-edit 1) %)]
                             ["spare-2" #(at-cut (spare-edit 2) %)] ["spare-3" #(at-cut (spare-edit 3) %)]
                             ["add-only" (fn [_] (reference/save "add-only" "extra-1" nil))]
                             ["spare-4" #(at-cut (spare-edit 4) %)]
                             ["drop-extra" (fn [_] (reference/save "drop-extra" nil "extra-1"))]
                             ["spare-0-again" #(at-cut (field-edit "spare-0-again" ":spare/0" "again-0" "again" "replacement-0") %)]]
                      owner #(d/entid (d/db candidate) [:triplex.entity/id fixture/root])
                      trail (mapv (fn [[label frame]]
                                    (let [l (reference/send legacy (frame (head control)))
                                          c (reference/send covered (frame (head candidate)))
                                          root (owner-root/root (d/db candidate) (owner))]
                                      (is (= [200 nil] (reference/outcome l)) label)
                                      (is (= (reference/outcome l) (reference/outcome c)) [label (:body c)])
                                      (is (= (get-in l [:body "position"]) (get-in c [:body "position"])) label)
                                      (is (= (get-in l [:body "recordedAt"]) (get-in c [:body "recordedAt"])) label)
                                      (is (= (head control) (head candidate)) label)
                                      [label (get-in c [:body "subjectSave"]) (count (:texts root))]))
                                  steps)
                      positions (range 1 (inc (head control)))]
                  (is (= (str layout/ident) (second (trail 1))))
                  ;; Root texts after each save: the fifth field folds; each reference-writer save folds first.
                  (is (= [1 1 2 3 4 1 nil 1 nil 1] (mapv (fn [[_ save n]] (when save n)) (rest trail))) (pr-str trail))
                  (is (nil? (d/entid (d/db control) layout/root-attr)))
                  (let [expected (product-reads legacy control positions)
                        actual (product-reads covered candidate positions)]
                    (doseq [k (keys expected)]
                      (is (= (get expected k) (get actual k)) (str "read route " k)))
                    (println "DX-W1_OWNER_PRODUCT"
                             (json/write-str {:attempt (System/getenv "PREP1_ATTEMPT") :trail trail
                                              :positions (count positions)
                                              :currentRows (count (:current actual)) :historyRows (count (:history actual))
                                              :pinnedRows (mapv count (vals (:pinned actual)))
                                              :reachKeys (sort (keys (:reach actual)))
                                              :feed (count (:feed actual)) :foldTxs (count (seq (d/datoms (d/db candidate) :aevt :triplex.owner/folded)))})))
                  ;; The reference writer's own fence: a payload for a migrated person is refused natively.
                  (let [db (d/db candidate)
                        stale (reference/save "fenced" "extra-2" nil)]
                    (is (some? (owner-root/raw db (owner))))
                    (is (thrown-with-msg? Exception #"TRIPLEX_CONFLICT"
                          @(d/transact candidate (storage/tx-data db stale))))
                    (is (= {"status" "absent"} (reference/operation covered "fenced"))))
                  ;; A writer started without the option may not write a database that stores covering roots.
                  (with-redefs [layout/enabled false]
                    (is (= [409 "OwnerLayoutRequired"]
                           (reference/outcome (reference/send covered (reference/save "refused" "extra-3" nil)))))))))))))))

(defn- read-rows [db owner arm]
  ;; [Opus W1] Why: the legacy arms read the way a database without the option reads; the covered arm reads as the product does.
  (let [datoms (case arm
                 ("legacy" "append") (layout/read-stage :legacy-range (vec (lean/legacy-live-texts db owner)))
                 ;; "untouched": a person never edited in a database where the option is installed.
                 ("covered" "untouched") (vec (lean/live-texts db owner)))]
    (layout/read-stage :decode (vec (sort-by :id (map (comp lean/decode :v) datoms))))))

(defn- row-summary [rows]
  {:rows (count rows) :digest (schema/sha256 (pr-str rows))})

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
                      migrate? (= arm "covered")
                      edit (fn [input cut]
                             (let [input (at-cut input cut)]
                               (if migrate?
                                 (append! conn (native-plan (d/db conn) input))
                                 (legacy-append! conn db input (= arm "append")))))
                      finish (fn [] (when (= arm "untouched") (layout/install-fixture! conn)))]
                  (assert created)
                  (assert (= [200 nil] (reference/outcome (reference/send db (seed-deeper seed)))))
                  (when migrate? (layout/install-fixture! conn))
                  (let [first (edit a 1) view (d/db conn) owner (d/entid view [:triplex.entity/id fixture/root])
                        pinned {:t (d/basis-t view) :expected (row-summary (read-rows view owner arm))}]
                    (let [next (edit b 2) _ (finish) current (d/db conn)]
                      (assert (= (boolean (when (d/entid current layout/root-attr) (scope/value current owner layout/root-attr))) migrate?))
                      {:db db :owner owner :pinned pinned :current {:t (d/basis-t current) :expected (row-summary (read-rows current owner arm))}
                       :counts {:first (counts first) :next (counts next)}
                       :journal (schema/sha256 (pr-str (reference/feed db 0 10)))}))))
        fixtures (into {} (map (juxt identity build)) ["legacy" "append" "covered" "untouched"])]
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
    (assert (= (= "covered" arm) (boolean (when (d/entid latest layout/root-attr) (scope/value latest owner layout/root-attr)))))
    (dotimes [_ 32] (sample current false) (sample pinned false))
    (println "DX-W1_OWNER_LAYOUT_READ"
             (json/write-str {:attempt attempt :db db :arm arm :pid (.pid (java.lang.ProcessHandle/current))
                              :current current :pinned pinned :journal journal :clock "diagnostic-in-process"
                              :counts counts
                              :ns (mapv (fn [_] [(sample current false) (sample pinned false)]) (range 96))
                              :stagesNs (mapv (fn [_] [(sample current true) (sample pinned true)]) (range 32))}))))

(defn- paired-sample [latest {:keys [owner]} arm {:keys [t]} truth]
  (let [start (System/nanoTime)
        view (if (= t (d/basis-t latest)) latest (d/as-of latest t))
        actual (read-rows view owner arm)
        elapsed (- (System/nanoTime) start)]
    (assert (= (truth t) actual))
    elapsed))

(defn paired-reads! [path round]
  ;; [Opus W1] Why: one JVM reads every arm in a shuffled order each round, so JIT, GC and CPU-clock drift hit all arms alike.
  ;; Rejected: one JVM per arm only (identical legacy and append read code differed by 20% between JVMs).
  (let [{:keys [attempt fixtures]} (edn/read-string (slurp path))
        arms ["legacy" "append" "covered" "untouched"]
        state (into {} (for [arm arms]
                         (let [{:keys [db owner pinned current] :as f} (get fixtures arm)
                               latest (d/db (main/connection (main/db-uri db)))]
                           (assert (= (:t current) (d/basis-t latest)))
                           [arm {:f f :latest latest
                                 :truth (into {} (map (fn [{:keys [t expected]}]
                                                        (let [rows (read-rows (d/as-of latest t) owner arm)]
                                                          (assert (= expected (row-summary rows)))
                                                          [t rows]))) [current pinned])}])))
        rng (java.util.Random. (long (hash [attempt round])))
        sample-round (fn []
                       (into {} (for [arm (let [l (java.util.ArrayList. ^java.util.Collection arms)]
                                            (java.util.Collections/shuffle l rng) l)]
                                  (let [{:keys [f latest truth]} (state arm)]
                                    [arm [(paired-sample latest f arm (:current f) truth)
                                          (paired-sample latest f arm (:pinned f) truth)]]))))]
    (assert (= attempt (System/getenv "PREP1_ATTEMPT")))
    (dotimes [_ 64] (sample-round))
    (let [rounds (vec (repeatedly 192 sample-round))]
      (println "DX-W1_OWNER_LAYOUT_PAIRED"
               (json/write-str {:attempt attempt :round round :pid (.pid (java.lang.ProcessHandle/current))
                                :clock "diagnostic-in-process" :order "shuffled-per-round"
                                :ns (into {} (for [arm arms] [arm (mapv #(get % arm) rounds)]))})))))

(defn- text-bytes [v]
  (if (string? v) (alength (.getBytes ^String v java.nio.charset.StandardCharsets/UTF_8)) 8))

(defn- range-shape [datoms]
  {:datoms (count datoms) :bytes (reduce + (map (comp text-bytes :v) datoms))})

(defn- read-shape [db owner arm]
  ;; [Opus W1] Why: at full size a cold read pays per index leaf, so count the EAVT range each projection walks.
  ;; Rejected: Mac timings alone (the toy index is resident and cannot show leaf crossings).
  (let [history (d/history db)
        attrs [:triplex.entity/retired :triplex.entity/row]
        walk (fn [source] (if (= arm "covered") (vec (d/datoms source :eavt owner))
                              (vec (mapcat #(d/datoms source :eavt owner %) attrs))))]
    {:current (range-shape (walk db)) :pinnedHistory (range-shape (walk history))}))

(defn- record-shape [db tx-data]
  (into (sorted-map) (frequencies (map (fn [x] (str (d/ident db (:a x)) (if (:added x) " +" " -"))) tx-data))))

(defn- time-pair [legacy covered]
  (let [one (fn [{:keys [db owner arm]}] (let [at (System/nanoTime)] (read-rows db owner arm) (- (System/nanoTime) at)))
        median (fn [xs] (let [v (vec (sort xs))] (nth v (quot (count v) 2))))]
    (dotimes [_ 48] (one legacy) (one covered))
    (let [pairs (vec (repeatedly 96 #(vector (one legacy) (one covered))))]
      {:legacyNs (median (map first pairs)) :coveredNs (median (map second pairs))})))

(defn shape-report! []
  ;; [Opus W1] Why: account for every record a save adds and every datom a read walks as edits and edited width grow.
  ;; Rejected: a single two-save, one-field fixture (it fixes the cover at one text and the history at two saves).
  (let [attempt (System/getenv "PREP1_ATTEMPT")
        tapes {"one-field" 1 "two-field" 2 "eight-field" 8}
        saves 16]
    (doseq [[tape width] tapes]
      (let [steps (vec (for [i (range saves)]
                         (let [f (mod i width) n (quot i width)]
                           [(str tape "-" i) (str ":spare/" f) (str "f" f "-" (inc n)) (str "value-" f "-" (inc n) "-🧭")
                            (if (zero? n) (str "spare-" f) (str "f" f "-" n))])))
            build (fn [arm]
                    (let [wire (json/write-str ["triplex-scope-v1" "test" "layout-shape" (str attempt "-" tape "-" arm) 0])
                          {:keys [db created]} (main/create-scope! nil wire "lean" true true)
                          conn (main/connection (main/db-uri db))
                          [seed] (reference/edits)]
                      (assert created)
                      (assert (= [200 nil] (reference/outcome (reference/send db (seed-deeper seed)))))
                      (when (= arm "covered") (layout/install-fixture! conn))
                      (let [owner (d/entid (d/db conn) [:triplex.entity/id fixture/root])
                            per-save (mapv (fn [i [command attribute id value predecessor]]
                                             (let [input (at-cut (field-edit command attribute id value predecessor) (inc i))
                                                   {:keys [report fold-datoms]}
                                                   (if (= arm "covered") (covered-append! conn input)
                                                     {:report (legacy-append! conn db input false)})
                                                   after (d/db conn)]
                                               (merge (counts report)
                                                      {:t (d/basis-t after) :foldDatoms (or fold-datoms 0)
                                                       :records (record-shape after (:tx-data report))})))
                                           (range) steps)]
                        {:db db :conn conn :owner owner :saves per-save})))
            legacy (build "legacy") covered (build "covered")
            latest (fn [{:keys [conn]}] (d/db conn))
            rows-at (fn [x arm t] (read-rows (d/as-of (latest x) t) (:owner x) arm))]
        (doseq [[l c] (map vector (:saves legacy) (:saves covered))]
          (assert (= (rows-at legacy "legacy" (:t l)) (rows-at covered "covered" (:t c))) (str tape " cut " (:t c))))
        (assert (= (schema/sha256 (pr-str (reference/feed (:db legacy) 0 (+ 2 saves))))
                   (schema/sha256 (pr-str (reference/feed (:db covered) 0 (+ 2 saves))))))
        (let [pin (fn [x] (:t (first (:saves x))))
              view (fn [x arm t] {:db (if t (d/as-of (latest x) t) (latest x)) :owner (:owner x) :arm arm})]
          (println "DX-W1_OWNER_LAYOUT_SHAPE"
                   (json/write-str
                     {:attempt attempt :tape tape :width width :saves saves :clock "diagnostic-in-process"
                      :legacy {:saves (mapv #(dissoc % :t :foldDatoms) (:saves legacy))
                               :reads (read-shape (latest legacy) (:owner legacy) "legacy")}
                      :covered {:saves (mapv #(dissoc % :t) (:saves covered))
                                :reads (read-shape (latest covered) (:owner covered) "covered")}
                      :timing {:current (time-pair (view legacy "legacy" nil) (view covered "covered" nil))
                               :pinned (time-pair (view legacy "legacy" (pin legacy)) (view covered "covered" (pin covered)))}})))))))

(defn- owner-of [i] (str "acct/test/serial-" i))

(defn- for-owner [owner input]
  ;; [Opus W1] Why: the shared edit frames name one fixture person; the serial probe needs many people in one scope.
  ;; Rejected: a second frame builder (it could drift from the journal shape the writers verify).
  (rows/row-input
    (-> input
        (dissoc "rowTexts")
        (assoc "entities" [owner])
        (update "rows"
                (fn [rows]
                  (mapv (fn [wire]
                          (let [row (storage/decode-row wire)]
                            (storage/wire-row
                              (cond-> row
                                (= fixture/root (:entity_id row)) (assoc :entity_id owner)
                                (= fixture/root (:value_string row)) (assoc :value_string owner)
                                (= ":_tx/change" (:attribute row))
                                (update :value_json #(json/write-str (assoc (json/read-str %) "entityId" owner)))))))
                        rows))))))

(def serial-people 256)
(def serial-width 160)
(def serial-edits 64)
(defn- serial-person [i] (mod (* i 67) serial-people))

(defn serial-seed! [path]
  ;; [Opus W1] Why: one indexed seed per writer so every measured save starts from storage, not the memory index.
  ;; Rejected: reusing the resident gate fixtures (they never fetch a segment).
  (let [attempt (System/getenv "PREP1_ATTEMPT")
        scopes (into {} (for [arm ["legacy" "append" "covered"]]
                          (let [wire (json/write-str ["triplex-scope-v1" "test" "layout-serial" (str attempt "-" arm) 0])
                                {:keys [db created]} (main/create-scope! nil wire "lean" true true)
                                conn (main/connection (main/db-uri db))]
                            (assert created)
                            (doseq [i (range serial-people)]
                              (let [base (reference/edit-frame (str "seed-" i) (str "p" i "-v") "old value" -9.0 40.0 nil)
                                    extra (for [j (range (dec serial-width))]
                                            (fixture/row (str "p" i "-s" j "-0") fixture/root (str ":spare/" j)
                                                         (str "value-" i "-" j) (str "_tx/seed-" i)))
                                    input (for-owner (owner-of i)
                                                     (-> base (update "rows" into (map storage/wire-row extra))
                                                         (update "newIds" into (map :id extra))))]
                                (assert (= [200 nil] (reference/outcome (reference/send db input))))))
                            (when (= arm "covered") (layout/install-fixture! conn))
                            (let [t (d/basis-t (d/db conn))]
                              (d/request-index conn)
                              @(d/sync-index conn t)
                              [arm {:db db :seedT t :position (storage/head-position (d/db conn))}]))))]
    (spit path (pr-str {:attempt attempt :scopes scopes}))
    (println "DX-W1_SERIAL_SEED" (json/write-str {:attempt attempt :people serial-people :width serial-width
                                                  :scopes scopes}))))

(defn serial-edits! [path arm round]
  ;; [Opus W1] Why: the same people, fields and order for every writer after a transactor restart.
  ;; Rejected: comparing writers on different people or with a warm transactor cache.
  (let [{:keys [attempt scopes]} (edn/read-string (slurp path))
        {:keys [db]} (get scopes arm)
        conn (main/connection (main/db-uri db))
        saves (vec (for [i (range serial-edits)]
                     (let [p (serial-person i) owner (owner-of p) j (mod i 7)
                           db-now (d/db conn)
                           input (at-cut (for-owner owner (field-edit (str "e" round "-" p) (str ":spare/" j)
                                                                      (str "p" p "-s" j "-" round)
                                                                      (str "edit-" round "-" p "-🧭")
                                                                      (str "p" p "-s" j "-" (dec round))))
                                         (storage/head-position db-now))
                           report (case arm
                                    "covered" (append! conn (native-plan db-now input))
                                    "append" (legacy-append! conn db input true)
                                    "legacy" (legacy-append! conn db input false))
                           after (d/db conn)
                           owner-e (d/entid after [:triplex.entity/id owner])
                           rows (read-rows after owner-e (if (= arm "covered") "covered" "legacy"))]
                       (assert (= (str "edit-" round "-" p "-🧭")
                                  (some #(when (= (str ":spare/" j) (:attribute %)) (:value_string %)) rows)))
                       (assert (= serial-width (count rows)))
                       {:t (str (d/basis-t after)) :datoms (count (:tx-data report))})))]
    (assert (= attempt (System/getenv "PREP1_ATTEMPT")))
    (println "DX-W1_SERIAL" (json/write-str {:attempt attempt :arm arm :round round :db db :saves saves}))))
