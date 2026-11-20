(load-file "/config/regression.clj")
(ns wfix1-sql
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.group :as group] [triplex.gateway.group-test :as fixture]
            [triplex.gateway.lean :as lean] [triplex.gateway.main :as main]
            [triplex.gateway.predecessor :as pred] [triplex.gateway.selftest :as rows]
            [triplex.gateway.storage :as storage] [triplex.gateway.write-policy :as policy]
            [wfix1-regression :as w]))

(def attempt (str/trim (slurp "/config/attempt")))
(defn emit [event value]
  (println "WFIX1_SQL" (json/write-str {:attempt attempt :event event :value value})))
(defn publish [path value]
  (let [temporary (java.io.File. (str path ".tmp"))]
    (spit temporary (json/write-str (assoc value :attempt attempt)))
    (assert (.renameTo temporary (java.io.File. path)))))

(defn before-replies [directory]
  (let [scope (json/write-str ["triplex-scope-v1" "test" "write-sql" attempt 0])
        name (:db (main/create-scope! nil scope "lean" true true))
        execute group/execute! native d/transact-async
        offers (mapv #(assoc %2 "clientId" attempt "sendSequence" (inc %1)) (range) (w/edits))]
    ;; [DX-WFIX1] Why: force one real group and stop its gateway after the native report returns.
    ;; Rejected: withholding a client-side response after the gateway already replied.
    (publish (str directory "/offers.json") {:scope scope :database name :offers offers})
    (with-redefs [group/execute! (fn [conn batch]
                    (when (= "seed" (:id (first batch)))
                      (publish (str directory "/leader.json") {:database name})
                      (fixture/wait-until #(= ["edit-a" "edit-b"] (mapv :id (:queue @(group/lane-for conn))))))
                    (execute conn batch))
                  d/transact-async (fn [conn data & opts]
                    (if-not (= :triplex.group/apply-v1 (ffirst data))
                      (apply native conn data opts)
                      (let [report @(apply native conn data opts)
                            db (:db-after report)
                            commands (into {} (map (fn [id]
                                        (let [claim (d/entid db [:triplex.claim/command-id id])
                                              tx (storage/value db claim :triplex.claim/tx)
                                              op (storage/value db tx :triplex.tx/operation-id)]
                                          [id {:commandId id :txId (storage/value db claim :triplex.claim/tx-id)
                                               :receipt (storage/operation db op)}])) ["edit-a" "edit-b"]))]
                        (assert (= 3 (storage/head-position db)))
                        (publish (str directory "/native.json") {:database name :t (str (d/basis-t db)) :commands commands})
                        @(promise))))]
      (main/-main))))

(defn recover [directory]
  (let [{:strs [scope database offers]} (json/read-str (slurp (str directory "/offers.json")))
        native (json/read-str (slurp (str directory "/native.json")))
        reopened (main/create-scope! nil scope "lean" true true)
        actual (w/replay-observations database)
        settings (main/write-options database)
        retries (mapv (fn [frame]
                    (let [id (get frame "operationId")
                          original (dissoc frame "clientId" "sendSequence")
                          fresh-id (str id "-retry")
                          fresh (assoc original "operationId" fresh-id)]
                      {:id id :exact (w/send database original) :fresh (w/send database fresh)
                       :claim (w/claim database id) :operation (w/operation database id)
                       :unused (w/operation database fresh-id)})) (rest offers))
        conn (main/connection (main/db-uri database))]
    (emit "recovered" {:database database :reopened reopened :settings settings :native native
                       :observed actual :retries retries :head (storage/head-position (d/db conn))
                       :last (w/feed database 3 1)})
    (assert (and (= database (:db reopened)) (false? (:created reopened))))
    (assert (= 3 (storage/head-position (d/db conn))))
    (assert (empty? (w/feed database 3 1)))
    (doseq [{:keys [id exact fresh claim operation unused]} retries]
      (assert (= [409 "OperationDuplicate"] (w/outcome exact)))
      (assert (= [409 "CommandConflict"] (w/outcome fresh)))
      (assert (= (get-in native ["commands" id]) claim))
      (assert (= (get claim "receipt") operation))
      (assert (= {"status" "absent"} unused)))))

(def max-body 4194304)
(defn wire-size [input] (alength (.getBytes ^String (json/write-str input) "UTF-8")))
(defn wide-frame [i width pad?]
  (let [id (str "wide-" i)
        base (w/save id nil nil)
        payload (apply str (repeat width "x"))
        fresh (mapv #(fixture/row (str id "-" %) fixture/root (str ":wide/" %) payload (str "_tx/" id)) (range 225))
        input (rows/row-input (-> base (update "newIds" into (map :id fresh))
                             (update "rows" into (map storage/wire-row fresh))
                             (assoc "writeClass" "live" "attemptId" "")))]
    (if pad? (assoc input "attemptId" (.repeat "x" (- max-body (wire-size input)))) input)))

(defn wire-gate [grouped max?]
  (with-redefs [group/enabled grouped policy/priority? grouped policy/field-only? grouped]
    (w/in-scope
     (fn [name conn]
       (let [width (if max? 3800 2350)
             inputs (mapv #(wide-frame % width max?) (range 8))
             seed (w/save "seed" "seed-row" nil)
             native d/transact-async
             group-results (atom [])
             sent (with-redefs [d/transact-async (fn [c data & opts]
                          (let [result (apply native c data opts)]
                            (if (= :triplex.group/apply-v1 (ffirst data))
                              (delay
                                (try (let [report @result] (swap! group-results conj :durable) report)
                                     (catch Exception e
                                       (swap! group-results conj (if (group/definitive? e) :definitively-rejected :unknown))
                                       (throw e))))
                              result)))]
                    (if grouped (w/ready-batch name conn seed inputs) (mapv #(w/send name %) (into [seed] inputs))))
             ack (mapv :body (rest sent))
             db (main/sync-db (main/db-uri name))
             expected (into {} (for [i (range 8) j (range 225)]
                                 [(str "wide-" i "-" j) [(str ":wide/" j) (.repeat "x" width) (+ 2 i)]]))
             facts (->> (lean/live-texts db (d/entid db [:triplex.entity/id fixture/root]))
                        (map (comp lean/decode :v)) (filter #(str/starts-with? (:id %) "wide-")) vec)
             actual (into {} (map (fn [r] [(:id r) [(:attribute r) (:value_string r) (:recorded_position r)]]) facts))
             durable (mapv #(w/operation name (get % "operationId")) inputs)
             bytes (mapv wire-size inputs)]
         (emit "wire" {:database name :grouped grouped :max max? :width width :bytes bytes :groupOutcome @group-results
                       :offered (mapv #(select-keys % ["operationId" "newIds" "claims"]) inputs)
                       :replies sent :durable durable :stored facts})
         (assert (every? #(if max? (= max-body %) (< % max-body)) bytes))
         (assert (every? #(= 200 (:status %)) sent))
         (assert (= (mapv str (range 2 10)) (mapv #(get-in % ["position" "v"]) ack)))
         (let [physical (count (distinct (map #(get % "t") ack)))
               sizes (mapv #(get % "groupSize" 1) ack)]
           (assert (or (and grouped (= [:durable] @group-results) (= 1 physical) (= (repeat 8 8) sizes))
                       (and (= (if grouped [:definitively-rejected] []) @group-results)
                            (= 8 physical) (= (repeat 8 1) sizes)))))
         (assert (= (mapv #(assoc (select-keys % ["operationId" "position" "recordedAt" "t"]) "status" "committed") ack)
                    durable))
         (assert (= expected actual))
         (assert (= 1800 (count facts))))))))

(defn erasure-probe [optimized? owner-changes?]
  (with-redefs [pred/enabled optimized? group/enabled true policy/priority? true policy/field-only? true]
    (w/in-scope
     (fn [name conn]
       (let [id #(str (.repeat "W" 25) %)
             lower (id "A") ordinary (id "B") upper (id "C") imported "imported/old"
             a (w/edit-frame "ascii" ordinary "erase-value-a" 0.0 nil nil)
             b (w/edit-frame "upper" upper "erase-value-b" 0.0 nil ordinary)
             c (w/edit-frame "imported" imported "erase-value-c" 0.0 nil nil)
             writes (w/ready-batch name conn (w/edit-frame "lower" lower "retained-value" 0.0 nil nil) [a b c])
             before (d/db conn)
             owner (d/entid before [:triplex.entity/id fixture/root])
             before-feed (w/feed name 0 10)
             ;; [DX-WFIX1] Why: prove what native attribute excision removes even though lean has no per-value erasure route.
             ;; Rejected: substituting the legacy :f.v/string fixture for lean row texts and journals.
             excision @(d/transact conn [{:db/id (d/tempid :db.part/user) :db/excise owner
                                          :db.excise/attrs [:triplex.entity/row]}])
             t (d/basis-t (:db-after excision))
             sync-excise (ns-resolve 'datomic.api 'sync-excise)
             watermark (deref (sync-excise conn t) 120000 ::timeout)
             current (when-not (= ::timeout watermark) (main/sync-db (main/db-uri name)))
             earlier (when current (mapv #(w/route name "v1" "read"
                                    {"basis" {"recordedPosition" % "validAt" 1} "entityIds" [fixture/root]}) [1 2 3 4]))
             journal-after (when current (w/feed name 0 10))
             retries (when current (mapv (fn [i value]
                       (let [label (str "reuse-" i)
                             subject (if owner-changes? "acct/other/person" fixture/root)
                             low (str (.repeat "V" 25) i)
                             high (if (= value upper) value (str (.repeat "X" 25) i))
                             ids (if (= value high) [low high] [low value high])
                             facts (mapv #(assoc (fixture/row % subject ":v" "identity check" label)
                                           :entity_type nil) ids)
                             offer (rows/row-input (cond-> {"operationId" label "position" 1 "span" 1 "sourceK" nil
                                                             "scopeWide" false "newIds" ids "rows" (mapv storage/wire-row facts)
                                                             "claims" []}
                                                      optimized? (assoc "historyIdentityBounds" [low high])))]
                         {:id value :owner subject :react (w/send name offer) :receipt (w/operation name label)}))
                       (range) [ordinary upper imported]))]
         (emit "erasure" {:database name :optimized optimized? :changedOwner owner-changes?
                          :writes writes :supportedLeanValueErasure false
                          :excisionT (str t) :watermark (when current (str (d/basis-t watermark)))
                          :beforeFeed before-feed :journalAfter journal-after :earlier earlier
                          :nativeText (when current (mapv :v (d/datoms (d/history current) :eavt owner :triplex.entity/row)))
                          :retries retries :head (storage/head-position (d/db conn))}))))))

(let [[phase directory] *command-line-args*]
  (case phase
    "before" (before-replies directory)
    "serve" (main/-main)
    "after" (do
              (recover directory)
              (let [failures (atom [])]
                (doseq [max? [false true] grouped [false true]]
                  (try (wire-gate grouped max?)
                       (catch Throwable e (swap! failures conj {:gate "wire" :max max? :grouped grouped :error (str e)}))))
                (doseq [optimized? [false true] changed-owner? [false true]]
                  (try (erasure-probe optimized? changed-owner?)
                       (catch Throwable e (swap! failures conj {:gate "erasure" :optimized optimized?
                                                               :changedOwner changed-owner? :error (str e)}))))
                (emit "gate-errors" @failures)
                (shutdown-agents)
                (System/exit (if (empty? @failures) 0 1))))))
