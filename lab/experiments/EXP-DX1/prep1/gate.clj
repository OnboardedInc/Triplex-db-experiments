(ns prep1-gate
  (:require [clojure.data.json :as json]
            [clojure.walk :as walk]
            [datomic.api :as d]
            [triplex.gateway.commit :as commit]
            [triplex.gateway.group :as group]
            [triplex.gateway.group-prepare :as prepared]
            [triplex.gateway.group-test :as fixture]
            [triplex.gateway.journal :as journal]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.main :as main]
            [triplex.gateway.selftest :as rows]
            [triplex.gateway.small-row :as small]
            [triplex.gateway.storage :as storage]
            [triplex.gateway.write-policy :as policy]))

(def attempt (System/getenv "PREP1_ATTEMPT"))
(def owners (mapv #(str "acct/a" % "/person") (range 8)))
(defn emit [kind data]
  (println "PREP1_GATE" (json/write-str {:attempt attempt :kind kind :data data})))
(defn request [{:keys [id owner add retire source claim assertion-clock]}]
  (let [tx (str "_tx/" id)
        row (fn [suffix change]
              (assoc (fixture/row (str id "/" suffix) tx ":_tx/change" nil tx)
                     :value_type "json" :value_json (json/write-str change)))
        change (fn [kind fact clock]
                 {:op kind :entityId owner :attribute ":v" :tripleId fact :recordedAt clock
                  :validFrom 0 :value {:type "string" :value fact}
                  :assertionTxId (str "_tx/" (subs fact 5))})
        changes (cond-> [(row "add" (change "assert" add 1000.0))]
                  retire (conj (row "retire" (assoc (change "retract" retire (or assertion-clock 1000.0))
                                                   :retractedAt 1000.0 :retractionTxId tx))))]
    (rows/row-input
      (-> (walk/postwalk-replace {fixture/root owner}
            (fixture/input {:id id :add add :remove retire :source source :claim claim}))
          (update "newIds" into (map :id changes))
          (update "rows" into (map storage/wire-row changes))))))
(defn submitted [conn db input]
  (let [data (storage/tx-data db input)
        p (second (first data))
        result (promise)
        base (merge (group/classify db p input)
                    {:id (get input "operationId") :data data :params p :result result :token (promise)
                     :rank :live :predecessors []
                     :eligible (group/eligible? db p)
                     :prepare (storage/prepared-for data input p)
                     :solo #(d/transact-async conn data)
                     :arrived 0 :dispatch 0})
        pending (when prepared/enabled (prepared/schedule! conn base))]
    (when pending (assert (not= ::timeout (deref pending 10000 ::timeout))))
    (assoc base :draft pending)))
(defn output [entry]
  (let [{:keys [value error]} @(:result entry)]
    (if error
      {:error (or (:code (ex-data error)) (str error))}
      {:receipt (group/receipt (:db-after value) (:id entry))
       :size (:group-size value) :path (get-in value [:prepared-stats :path])
       :guard (get-in value [:prepared-stats :guard])
       :replays (get-in value [:prepared-stats :replays])})))
(defn group! [conn descriptors & [inject]]
  (let [db (d/db conn)
        entries (mapv #(submitted conn db (request %)) descriptors)
        send group/send!]
    (with-redefs [group/send! (fn [c ops]
                                (if (and inject (= prepared/guard-ident (ffirst ops)))
                                  (inject c ops send)
                                  (send c ops)))]
      (group/execute! conn entries))
    (mapv output entries)))
(defn with-scope [name parallel? packed? f]
  (with-redefs [prepared/enabled parallel? group/enabled true group/stage-clock true
                group/reuse-prepared true group/fast-reply packed? small/enabled packed?
                main/uri-template (or (System/getenv "PREP1_URI") "datomic:mem://{db}")]
    (let [key (json/write-str ["triplex-scope-v1" "test" "prep1-gate" (str attempt "-" name) 0])
          db (:db (main/create-scope! nil key "lean" true true))
          conn (main/connection (main/db-uri db))]
      (try (f db conn)
           (finally (main/delete-scope! nil key))))))
(defn step [id n prior & [source]]
  {:id id :owner (owners n) :add (str "fact-" id) :retire prior :source source})
(defn seed! [name conn]
  (let [seed (mapv #(step (str "seed-" %) % nil) (range (count owners)))]
    (doseq [cmd seed]
      (assert (= :ok (:outcome (fixture/invoke name conn (request cmd))))))
    seed))
(defn shuffled [^java.util.Random rng xs]
  (let [copy (java.util.ArrayList. xs)]
    (java.util.Collections/shuffle copy rng)
    (vec copy)))
(defn tape [seed salt]
  (let [rng (java.util.Random. (long salt))
        splits (partition 4 (shuffled rng (range 8)))
        groups (mapv (fn [i members]
                       (mapv #(assoc (step (str "edit-" i "-" %) % (:add (seed %)) 8)
                                     :assertion-clock (+ 1000.0 %)) members))
                    (range) splits)
        a (first (first groups))
        i (.indexOf owners (:owner a))
        link (assoc (step "chain-a" i (:add a)) :assertion-clock 1008.0)
        chain [link (step "chain-b" i (:add link))]]
    (conj groups chain)))
(defn observe [name conn commands]
  (let [db (d/db conn)
        head (storage/head-position db)
        snapshots (mapv (fn [p]
                          (->> (storage/read-rows name db {"entityIds" owners "basis" {"recordedPosition" p "validAt" 1.0} "pattern" {}})
                               :rows (map storage/decode-row)
                               (map #(select-keys % [:id :entity_id :value_string :attribute :recorded_position]))
                               (sort-by :id) vec))
                        (range 1 (inc head)))
        feed (get (json/read-str (journal/page conn name {"after" 0 "limit" 100})) "transactions")
        receipts (mapv #(group/receipt db (:id %)) commands)]
    (assert (= (range 1 (inc head)) (map second feed)))
    {:receipts receipts :snapshots snapshots
     :feed (mapv (fn [[id p texts]]
                   (let [facts (mapv lean/decode texts)]
                     [id p (sort (map :id facts))
                      (vec (sort-by #(get % "op")
                         (keep #(when (= ":_tx/change" (:attribute %)) (json/read-str (:value_json %))) facts)))])) feed)}))
(defn arm [salt parallel? packed? & [basis?]]
  (with-scope (str salt "-" (if basis? "basis" parallel?)) parallel? packed?
    (fn [name conn]
      (let [seed (seed! name conn)
            groups (tape seed salt)
            outputs (with-redefs [prepared/basis-enabled (boolean basis?)]
                      (mapv #(group! conn %) groups))
            commands (vec (concat seed (mapcat identity groups)))
            observed (observe name conn commands)]
        (assert (= (count commands) (count (:snapshots observed))))
        (assert (every? #(and (:receipt %) (nil? (:error %))) (mapcat identity outputs)))
        (assert (= [4 4 2] (mapv #(-> % first :size) outputs)))
        (assert (= (if parallel? ["prepared" "prepared" nil] [nil nil nil])
                   (mapv #(-> % first :path) outputs)))
        (assert (= (if parallel? (if basis? [:basis :basis nil] [:full :full nil]) [nil nil nil])
                   (mapv #(-> % first :guard) outputs)))
        (assert (apply = (map (comp :t :receipt) (peek outputs))))
        (merge observed {:db name :commands commands :groups outputs})))))

(defn refusal-and-recovery []
  (doseq [mode [:unrelated :revision :retired :identity :claim :lost]]
    (with-scope (name mode) true false
      (fn [name conn]
        (let [seed (seed! name conn)
              a (step "a" 0 (:add (seed 0)) 8)
              b (step "b" 1 (:add (seed 1)) 8)
              actual (atom nil)
              native (fn [c ops send]
                       (case mode
                         :lost (do (reset! actual (:db-after @(send c ops)))
                                   (delay (throw (ex-info "lost acknowledgement" {}))))
                         :identity (send c ops)
                         :claim (send c ops)
                         (let [db (d/db c) eid (d/entid db [:triplex.entity/id (owners 0)])]
                           @(d/transact-async c
                              [(case mode
                                 :revision [:db/add eid :triplex.entity/rev 40]
                                 :retired [:db/add eid :triplex.entity/retired
                                           (str (lean/prefix (:add (seed 0))) "0000000000000008"
                                                (format "%016x" (Double/doubleToRawLongBits 1007.0)) "_tx/other")]
                                 :unrelated [:db/add "datomic.tx" :db/doc "unrelated"])])
                           (send c ops))))
              a (cond-> a (= mode :identity) (assoc :add (:add (seed 2)))
                          (= mode :claim) (assoc :claim "seed-2"))
              [x y :as results] (group! conn [a b] native)
              durable (d/db conn)
              saved (mapv #(group/receipt durable %) ["a" "b"])]
          (case mode
            :unrelated (assert (= ["prepared" "prepared"] (mapv :path results)))
            :lost (do
                    (assert (= ["OutcomeUnknown" "OutcomeUnknown"] (mapv :error results)))
                    (assert (= saved (mapv #(group/receipt @actual %) ["a" "b"])))
                    (assert (= ["OperationDuplicate" "OperationDuplicate"]
                               (mapv #(-> (fixture/invoke name conn (request %)) :outcome) [a b])))
                    (assert (= ["CommandConflict" "CommandConflict"]
                               (mapv #(-> (fixture/invoke name conn (request (assoc % :id (str (:id %) "-retry") :claim (:id %))))
                                          :outcome) [a b])))
                    (doseq [[id receipt] (map vector ["a" "b"] saved)]
                      (let [claim (d/entid durable [:triplex.claim/command-id id])
                            eid (group/v durable claim :triplex.claim/tx)]
                        (assert (= id (group/v durable eid :triplex.tx/operation-id)))
                        (assert (= (:position receipt) (group/v durable eid :triplex.group/position))))))
            (do (assert (= 1 (:replays y)))
                (assert (nil? (first saved)))
                (assert (some? (:error x)))))
          (assert (and (second saved) (= (:position (second saved)) (storage/head-position durable))))
          (emit "witness" {:mode mode :db name :results results :receipts saved}))))))

(defn windows []
  (doseq [window [:prepare :two] scenario [:ordinary :moved :lost]]
    (with-scope (str (name window) "-" (name scenario)) true false
      (fn [db conn]
        (let [seed (seed! db conn)
              cuts (tape seed 17)
              first-group (first cuts) second-group (second cuts)
              basis (d/db conn)
              first-entries (mapv #(submitted conn basis (request %)) first-group)
              second-entries (mapv #(submitted conn basis (request %)) second-group)
              order (mapv :account second-entries)
              lane (atom {:queue second-entries :accounts order :rotation {:live order} :tails {}})
              calls (atom []) n (atom 0)
              send group/send!
              outside (assoc (step "outside" 0 nil) :owner "acct/outside/person")]
          (with-redefs [group/batch-limit 4 group/prepare-window window policy/priority? true
                        group/send!
                        (fn [c ops]
                          (if (not= prepared/guard-ident (ffirst ops))
                            (send c ops)
                            (let [i (swap! n inc)]
                              (swap! calls conj [:send i])
                              (when (and (= 1 i) (= :moved scenario))
                                @(d/transact-async c (storage/tx-data (d/db c) (request outside))))
                              (let [f (send c ops)]
                                (when (and (= :two window) (= :moved scenario) (= 2 i))
                                  ;; Force the second attempt to reach the stale cut before the first group's replay.
                                  (try @f (catch Exception _ nil)))
                                (delay
                                  (swap! calls conj [:await i])
                                  (let [report @f]
                                    (if (and (= :lost scenario) (= i 1))
                                      (throw (ex-info "after native commit" {}))
                                      report)))))))]
            (group/execute-window! conn lane first-entries))
          (let [entries (into first-entries second-entries)
                replies (mapv output entries)
                saved (mapv #(group/receipt (d/db conn) (:id %)) entries)
                start (if (= :moved scenario) 10 9)
                seq-expected (if (= window :two) [[:send 1] [:send 2] [:await 1] [:await 2]]
                                               [[:send 1] [:await 1] [:send 2] [:await 2]])]
            (assert (empty? (:queue @lane)))
            (assert (= (vec (range start (+ start 8))) (mapv :position saved)))
            (assert (= seq-expected @calls))
            (assert (= (if (= :lost scenario) (repeat 4 "OutcomeUnknown") (repeat 4 nil))
                       (map :error (take 4 replies))))
            (assert (every? #(and (nil? (:error %)) (:receipt %)) (drop 4 replies)))
            (assert (= (if (= :moved scenario) (if (= :two window) [1 1] [1 0]) [(if (= :lost scenario) nil 0) 0])
                       (mapv #(-> replies (nth %) :replays) [0 4])))
            (emit "window" {:window window :scenario scenario :db db :calls @calls
                            :replies replies :receipts saved})))))))

(def basis-cases [:unchanged :unrelated :scope :feed :head :function :revision :predicate :retired :journal :history :claim])
(defn change-after-proof [conn mode seed a]
  (let [base (d/db conn)
        owner (d/entid base [:triplex.entity/id (owners 0)])
        initial (:add (seed 0))
        outside (assoc (step "outside" 0 nil) :owner "acct/outside/person")]
    (when-not (#{:unchanged :claim} mode)
      @(d/transact conn
         (case mode
           :unrelated [[:db/add "datomic.tx" :db/doc "after certification"]]
           :scope [[:db/add (first (map :e (d/datoms base :aevt :triplex.scope/key)))
                    :triplex.scope/schema-hash "changed during certification"]]
           :feed [[:db/add (first (map :e (d/datoms base :aevt :triplex.scope/key)))
                   :triplex.scope/feed-irregular true]]
           :head (storage/tx-data base (request outside))
           :function (let [[ident body] (commit/variants [true false])]
                       [{:db/id (d/entid base ident)
                         :db/fn (d/function {:lang :clojure :params '[db payload]
                                            :requires '[[datomic.api :as d] [clojure.data.json :as json]]
                                            :code (list 'do body)})}])
           :revision [[:db/add owner :triplex.entity/rev 40]]
           :predicate [[:db/add (d/entid base [:triplex.entity/id (owners 2)]) :triplex.entity/rev 40]]
           :retired [[:db/add owner :triplex.entity/retired
                      (str (lean/prefix initial) "0000000000000008"
                           (format "%016x" (Double/doubleToRawLongBits 1007.0)) "_tx/seed-7")]]
           :journal [{:db/id "occupied-journal" :triplex.entity/id (str "_tx/" (:id a))}]
           :history [[:db/add (d/entid base [:triplex.entity/id (owners 2)]) :triplex.entity/row
                      (fixture/row-text (assoc (fixture/row (:add a) (owners 2) ":v" "occupied" "_tx/seed-2")
                                               :recorded_position 3 :recorded_at 1002.0))]])))))

(defn basis-fences []
  (doseq [mode basis-cases]
    (with-scope (str "basis-" (name mode)) true false
      (fn [name conn]
        (with-redefs [prepared/basis-enabled true]
          (let [seed (seed! name conn)
                a (cond-> (step "a" 0 (:add (seed 0)) 8)
                    (= mode :claim) (assoc :claim "seed-2"))
                b (step "b" 1 (:add (seed 1)) 8)
                db (d/db conn)
                a-input (cond-> (request a) (= mode :predicate) (update "entities" conj (owners 2)))
                entries (mapv #(submitted conn db %) [a-input (request b)])
                proof (group/plan conn entries)
                tx-data (:data proof)
                expected-basis (d/basis-t db)
                _ (assert (= :basis (:guard proof)))
                _ (assert (= [prepared/basis-ident expected-basis] (subvec (first tx-data) 0 2)))
                _ (assert (not (prepared/empty-history-range? (d/history db)
                                  [(lean/prefix "fact-a") (lean/prefix (:add (seed 7)))])))
                _ (assert (not (prepared/empty-history-range? (d/history db)
                                  [(lean/prefix "fact-a") (lean/prefix "fact-\u00e9a")])))
                _ (change-after-proof conn mode seed a)
                moved (d/basis-t (d/db conn))
                _ (assert (= (= moved expected-basis) (contains? #{:unchanged :claim} mode)))
                _ (group/finish-prepared! conn entries (group/start-prepared! conn proof))
                [x y :as replies] (mapv output entries)
                [first-save second-save :as saved] (mapv #(group/receipt (d/db conn) %) ["a" "b"])]
            (assert (= (if (= mode :unchanged) 0 1) (:replays y)))
            (assert (= (if (= mode :unchanged) "prepared" "reference") (:path y)))
            (assert (= (not (#{:revision :predicate :retired :history :claim} mode)) (some? first-save)))
            (when-not first-save (assert (:error x)))
            (assert (= second-save (:receipt y)))
            (assert (= (:position second-save) (storage/head-position (d/db conn))))
            (when (= mode :history)
              (let [view (d/db conn)]
                (assert (not (prepared/unused-prefix? (d/history view) (lean/prefix (:add a)))))))
            (emit "basis" {:mode mode :db name :basis expected-basis :observedBasis moved
                           :historyPath (:history proof) :replies replies :receipts saved})))))))

(when-not (= "1" (System/getenv "PREP1_GATE_LIBRARY"))
  (try
    (doseq [salt [17 43 503 2601]]
      (let [packed? (odd? (quot salt 10))
            a (arm salt false packed?)
            b (arm salt true packed?)
            c (arm salt true packed? true)
            semantic #(-> % (dissoc :db :groups) (update :receipts (fn [rs] (mapv (fn [r] (dissoc r :t)) rs))))]
        (assert (= (semantic a) (semantic b) (semantic c)))
        (emit "pair" {:salt salt :packed packed? :reference a :prepared b :basis c})))
    (refusal-and-recovery)
    (windows)
    (basis-fences)
    (emit "finished" {})
    (shutdown-agents)
    (System/exit 0)
    (catch Throwable error
      (.printStackTrace error)
      (shutdown-agents)
      (System/exit 1))))
