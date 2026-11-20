(ns prep1-gate
  (:require [clojure.data.json :as json]
            [clojure.walk :as walk]
            [datomic.api :as d]
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
(defn arm [salt parallel? packed?]
  (with-scope (str salt "-" parallel?) parallel? packed?
    (fn [name conn]
      (let [seed (seed! name conn)
            groups (tape seed salt)
            outputs (mapv #(group! conn %) groups)
            commands (vec (concat seed (mapcat identity groups)))
            observed (observe name conn commands)]
        (assert (= (count commands) (count (:snapshots observed))))
        (assert (every? #(and (:receipt %) (nil? (:error %))) (mapcat identity outputs)))
        (assert (= [4 4 2] (mapv #(-> % first :size) outputs)))
        (assert (= (if parallel? ["prepared" "prepared" nil] [nil nil nil])
                   (mapv #(-> % first :path) outputs)))
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

(try
  (doseq [salt [17 43 503 2601]]
    (let [packed? (odd? (quot salt 10))
          a (arm salt false packed?)
          b (arm salt true packed?)
          semantic #(-> % (dissoc :db :groups) (update :receipts (fn [rs] (mapv (fn [r] (dissoc r :t)) rs))))]
      (assert (= (semantic a) (semantic b)))
      (emit "pair" {:salt salt :packed packed? :reference a :prepared b})))
  (refusal-and-recovery)
  (windows)
  (emit "finished" {})
  (shutdown-agents)
  (System/exit 0)
  (catch Throwable error
    (.printStackTrace error)
    (shutdown-agents)
    (System/exit 1)))
