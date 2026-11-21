(ns erase1
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [datomic.api :as d]
            [ring.adapter.jetty :as jetty]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.envelope :as envelope]
            [triplex.gateway.erase :as erase]
            [triplex.gateway.privacy :as privacy]
            [triplex.gateway.reach :as reach]
            [triplex.gateway.main :as main]
            [triplex.gateway.schema :as schema]
            [triplex.gateway.scope :as scope])
  (:import [java.nio.file Files]
           [java.security MessageDigest]
           [java.time Instant]
           [java.util Date HexFormat]))

(def token (System/getenv "DX_ERASE_TOKEN"))
(def nonce (System/getenv "DX_ERASE_NONCE"))
(def plans (atom nil))
(def server-scope (System/getenv "DX_ERASE2_SCOPE"))
(def server-field (System/getenv "DX_ERASE2_FIELD"))
(defn check! [ok message] (when-not ok (throw (ex-info message {}))))
(defn until [x] (let [v (deref x 480000 ::timeout)] (check! (not= ::timeout v) "Native operation timed out") v))
(defn wall-ms [] (let [t (Instant/now)] (+ (* 1000.0 (.getEpochSecond t)) (/ (.getNano t) 1e6))))

(defn scope-name! [input]
  (let [s (get input "scope") [_ org project db generation] (json/read-str (scope/validate! s))]
    (check! (and (= org "test") (= project "test") (= generation 0)
                 (if server-scope
                   (= s server-scope)
                   (re-matches (re-pattern (str "erase1-" nonce "(?:-[a-z]+)?")) db))) "Unexpected attempt scope")
    (scope/name-for s)))
(defn connect! [input open]
  (let [name (scope-name! input) conn (open (main/db-uri name)) db (until (d/sync conn))]
    (check! (and (lean/enabled? db) (= (main/stored-scope db) (get input "scope"))) "Scratch scope drifted")
    conn))
(defn eids [db ids]
  (mapv (fn [id] (let [e (d/entid db [:triplex.entity/id id])]
                  (check! e "Expected erase owner absent") e)) ids))
(defn rows [db owners]
  (mapcat #(d/datoms db :eavt % :triplex.entity/row) owners))
(defn row-stat [db owners]
  (let [md (MessageDigest/getInstance "SHA-256")]
    (assoc
     (reduce (fn [result x]
               (.update md (.getBytes (str (:e x) "|" (:a x) "|" (:tx x) "|" (:added x) "|" (:v x) "\n") "UTF-8"))
               (-> result (update :datoms inc) (update (if (:added x) :adds :retracts) inc)))
             {:datoms 0 :adds 0 :retracts 0} (rows db owners))
     :sha256 (.formatHex (HexFormat/of) (.digest md)))))

(defn marker-values [db plan]
  (mapv (fn [e]
          (->> (rows db [e]) (map #(lean/decode (:v %)))
               (filter #(= ":task/field-0" (:attribute %)))
               (keep :value_string) sort vec))
        (:witnesses plan)))
(defn snapshot [db plan]
  (let [old (d/as-of db (:pin plan)) history (d/history db)]
    {:basis (d/basis-t db) :pin (:pin plan) :values (marker-values db plan)
     :atPin (marker-values old plan) :inHistory (mapv count (marker-values history plan))
     :domain (row-stat db (:domain plan)) :domainHistory (row-stat history (:domain plan))
     :journal (row-stat db (:journal plan)) :journalHistory (row-stat history (:journal plan))}))

(defn regression-excise! [conn input]
  ;; [DX-ERASE1] Why: the red gate must use the real current excision boundary and leave the real journal in place.
  ;; Rejected: editing journal or reader outputs in the fixture (it would hide the missing publication contract).
  (let [db (d/db conn) id (get input "assertionId") row (lean/by-id db id)]
    (check! (and row (= (get input "entityId") (:entity_id (lean/decode (:v row))))) "Regression target missing")
    (let [result (until (d/transact conn [{:db/id (d/tempid :db.part/user) :db/excise (:e row)
                                          :db.excise/attrs [:triplex.entity/row]}]))
          t (d/basis-t (:db-after result))
          erased-at (.getTime ^Date (:db/txInstant (d/entity (:db-after result) (d/t->tx t))))]
      (d/request-index conn)
      (until (d/sync-excise conn t))
      {:t (str t) :erasedAt erased-at :assertionId id})))
(defn log-rows [conn plan]
  (let [ids (set (concat (:domain plan) (:journal plan))) a (:rowAttr plan)]
    (mapv (fn [t]
            {:t t :selected (count (filter #(and (= (:a %) a) (ids (:e %)))
                                           (:data (first (d/tx-range (d/log conn) t (inc t))))) )})
          (:logTs plan))))
(defn check-journal! [db domain journal]
  ;; [DX-ERASE1] Why: isolate the measured copy before submitting an attribute-wide predicate.
  ;; Rejected: treating a mixed seed journal as owned by the person being erased.
  (doseq [e journal]
    (let [decoded (map #(lean/decode (:v %)) (rows db [e]))
          changed (keep #(when (= ":_tx/changed-entity" (:attribute %)) (:value_string %)) decoded)
          owners (set (keep (fn [r] (when (= ":_tx/change" (:attribute r))
                                       (get (json/read-str (:value_json r)) "entityId"))) decoded))]
      (check! (and (seq changed) (= (set changed) owners) (every? domain owners)) "Mixed or missing journal owner"))))

(defn prepare! [conn input]
  (check! (nil? @plans) "Previous arm still holds a pin")
  (let [db (until (d/sync conn))
        domain (get input "domain") journal (get input "journal") witnesses (get input "witnesses")
        ids (vec (concat domain journal))
        _ (check! (and (seq domain) (seq journal) (seq witnesses) (= (count ids) (count (set ids)))
                       (every? (set domain) witnesses)) "Invalid owner inventory")
        _ (check-journal! db (set domain) (eids db journal))
        plan {:domain (eids db domain) :journal (eids db journal) :witnesses (eids db witnesses)
              :rowAttr (d/entid db :triplex.entity/row) :pin (d/basis-t db)
              :logTs (mapv (fn [p] (d/tx->t (d/entid db [:triplex.tx/position p]))) (get input "logPositions"))}
        before (snapshot db plan)
        log (log-rows conn plan)]
    (check! (= (get input "values") (:values before) (:atPin before)) "Current protected witness differs")
    (check! (= (get input "historyCounts") (:inHistory before)) "History witness differs")
    (check! (every? #(pos? (:selected %)) log) "Native log positive control missing")
    (reset! plans {:conn conn :held db :plan plan :arm (get input "arm") :before before :logBefore log})
    {:plan plan :before before :log log}))

(defn erase! [conn input]
  (let [{:keys [plan arm] :as state} @plans]
    (check! (and (= conn (:conn state)) (= arm (get input "arm")) (nil? (:request state))) "Unexpected erase arm")
    (check! (compare-and-set! plans state (assoc state :request true)) "Duplicate erase request")
    (let [data (mapv (fn [e] {:db/id (d/tempid :db.part/user) :db/excise e :db.excise/attrs [:triplex.entity/row]})
                     (concat (:domain plan) (:journal plan)))
          start (System/nanoTime) submitted (wall-ms)
          report (until (d/transact conn data))
          ack (System/nanoTime) ack-wall (wall-ms) t (d/basis-t (:db-after report))
          ;; [DX-ERASE1] Why: observe the ACK and job barrier separately. Rejected: using sync-index to certify an excision.
          indexed-wall (wall-ms) requested (d/request-index conn)
          fresh (until (d/sync-excise conn t))
          finish (System/nanoTime) finished-wall (wall-ms)]
      (check! (<= t (d/basis-t fresh)) "Excision returned a prior cut")
      (swap! plans assoc :t t :after fresh)
      {:arm arm :t t :requests (count data) :requestedIndex requested :submittedAt submitted
       :ackAt ack-wall :indexAskedAt indexed-wall :finishedAt finished-wall
       :ackMs (/ (- ack start) 1e6) :requestToSyncMs (/ (- finish start) 1e6) :ackToSyncMs (/ (- finish ack) 1e6)})))

(defn observe! [conn input]
  (let [{:keys [plan before held after t arm] :as state} @plans]
    (check! (and (= conn (:conn state)) (= arm (get input "arm")) t) "Excision observation has no fresh barrier")
    (let [positive (snapshot held plan) fresh (snapshot after plan) latest (snapshot (d/db conn) plan)
          raw-log (log-rows conn plan)]
      (check! (= before positive) "Held database value changed")
      {:held positive :fresh fresh :latest latest :log raw-log :t t :plan plan})))

(defn ciphertext-inventory! [conn input]
  (let [name (scope-name! input) db (d/db conn) id (get input "id") canary (get input "canary")
        target (lean/by-id (d/history db) id)
        _ (check! (and target (string? canary) (not-empty canary)) "Missing inventory control")
        parsed (lean/decode (:v target))
        asserted (d/entid db [:triplex.tx/position (get input "assertionPosition")])
        retirement (d/entid db [:triplex.tx/position (get input "retractionPosition")])
        _ (check! (and asserted retirement (< asserted retirement)) "Missing distinct native assertion and retirement positions")
        t (d/tx->t asserted)
        retired-t (d/tx->t retirement)
        pull (fn [basis]
               (let [part (first (d/tx-range (d/log conn) basis (inc basis)))]
                 (check! (= basis (:t part)) "Wrong native log slice") (:data part)))
        append (pull t) retract (pull retired-t)
        logs (keep (fn [x] (when (string? (:v x)) (:v x))) (concat append retract))
        envelope-id (d/entid db [:triplex.private/id id])
        body (scope/value db envelope-id :triplex.private/body)
        value (envelope/decode! name db id (:entity_id parsed) (:attribute parsed) (:value_string parsed))
        row-attr (d/entid db :triplex.entity/row)
        references (fn [datoms]
                     (let [token (envelope/token id)]
                       (->> datoms
                         (filter #(and (:added %) (= row-attr (:a %)))) (map #(lean/decode (:v %)))
                         (filter (fn [r]
                                   (or (and (= id (:id r)) (= token (:value_string r)))
                                       (when (= ":_tx/change" (:attribute r))
                                         (let [c (json/read-str (:value_json r))]
                                           (and (= id (get c "tripleId"))
                                                (= token (get-in c ["value" "value"]))))))))
                         count)))]
    {:id id :nativeT (str t) :retirementT (str retired-t)
     :body (boolean (and (string? body) (seq body)))
     :keyBytes (Files/size (envelope/key-file name id))
     :references (references append) :retirementReferences (references retract) :unsealed (= canary value)
     :plaintext (boolean (some #(str/includes? % canary) (conj (vec logs) (:v target))))}))

(defn ciphertext-cleanup! [conn input]
  (let [name (scope-name! input) ids (get input "ids")
        db (d/db conn) state (privacy/cut name db)
        _ (privacy/verify-data! state db)
        _ (check! (and (:sealed state) (vector? ids) (<= 1 (count ids) 2000)
                       (= (count ids) (count (set ids))) (every? (:erased state) ids)) "Cleanup requires bounded published erasures")
        history (d/history db)
        candidates (mapv (fn [id] [id (d/entid db [:triplex.private/id id])]) ids)
        history-count (fn [at e]
                        (if e (count (seq (d/datoms at :eavt e :triplex.private/body))) 0))
        matched (reduce + (map #(history-count history (second %)) candidates))
        _ (check! (<= matched 2000) "Cleanup would exceed 2,000 matched datoms")
        selected (filter (fn [[_ e]] (pos? (history-count history e))) candidates)
        started (wall-ms)
        keys (select-keys (into {} (for [entry (vals (:commands state)) r (get entry "identities")]
                                    [(get r "assertionId") (get r "keyHandle")])) ids)
        _ (envelope/erase-keys! name (mapv (fn [id] {"assertionId" id "keyHandle" (keys id)}) ids))
        shred (wall-ms)
        _ (check! (not-any? #(envelope/key-present? name % (keys %)) ids) "Keys survive their shred")
        _ (doseq [[_ e] selected]
            (check! (= 1 (history-count history e)) "Assertion has multiple envelope bodies"))]
    (if (seq selected)
      (let [report (until (d/transact conn (mapv (fn [[_ e]]
                      {:db/id (d/tempid :db.part/user) :db/excise e :db.excise/attrs [:triplex.private/body]})
                    selected)))
            t (d/basis-t (:db-after report))
            submitted {:ids ids :matched matched :keysAbsent (count ids) :startedAt started
                       :shreddedAt shred :t (str t) :seq (:seq state)}]
        (if (true? (get input "foldWithOrdinaryIndex"))
          submitted
          (let [asked (wall-ms) requested (d/request-index conn)
                after (until (d/sync-excise conn t))
                finished (wall-ms)]
            (check! (and (>= (d/basis-t after) t)
                         (every? #(zero? (history-count (d/history after) (second %))) selected))
                    "Cleanup did not reach exact absence for the scheduled ciphertext")
            (assoc submitted :requestedIndex requested :indexAskedAt asked :finishedAt finished))))
      {:ids ids :matched matched :keysAbsent (count ids)
       :startedAt started :shreddedAt shred :finishedAt (wall-ms) :seq (:seq state)})))

(defn cleanup-barrier! [conn input]
  (let [name (scope-name! input) ids (get input "ids")
        before (d/db conn) state (privacy/cut name before)
        t (parse-long (get input "t"))
        _ (privacy/verify-data! state before)
        _ (check! (and t (vector? ids) (<= 1 (count ids) 2000)
                       (= (count ids) (count (set ids))) (every? (:erased state) ids))
                  "Cleanup barrier requires its exact published identities")
        entities (set (map #(d/entid before [:triplex.private/id %]) ids))
        ;; [DX-ERASE1] Why: the barrier must name the exact body-only excision in this run.
        ;; Rejected: accepting a recent index cut as evidence of this batch.
        ops (vec (mapcat :data (d/tx-range (d/log conn) t (inc t))))
        excises (filter #(= (:a %) (d/entid before :db/excise)) ops)
        bodies (filter #(= (:a %) (d/entid before :db.excise/attrs)) ops)
        body (d/entid before :triplex.private/body)
        _ (check! (and (not (contains? entities nil))
                       (= entities (set (map :v excises)))
                       (= (set (map :e excises)) (set (map :e bodies)))
                       (= (count entities) (count excises) (count bodies))
                       (every? #(= body (:v %)) bodies))
                  "Native cleanup transaction differs from its published body set")
        after (until (d/sync-excise conn t))
        history (d/history after)]
    (check! (and (>= (d/basis-t after) t)
                 (every? #(empty? (d/datoms history :eavt % :triplex.private/body)) entities))
            "Ordinary index did not remove the exact scheduled bodies")
    {:ids ids :t (str t) :finishedAt (wall-ms)}))

(defn key-state! [conn input]
  (let [name (scope-name! input) id (get input "id")
        db (d/db conn) state (privacy/cut name db)
        _ (privacy/verify-data! state db)
        _ (check! (and (:sealed state) (contains? (:erased state) id)) "Key state requires a published identity")
        e (d/entid db [:triplex.private/id id])
        handle (some (fn [entry] (some #(when (= id (get % "assertionId")) (get % "keyHandle"))
                                        (get entry "identities"))) (vals (:commands state)))
        _ (check! (or (not (envelope/shared?)) (string? handle)) "Removal did not retain the exact key handle")]
    {:id id :seq (:seq state) :now (wall-ms)
     :keyPresent (envelope/key-present? name id handle)
     :bodyPresent (boolean (and e (scope/value db e :triplex.private/body)))}))

(defn reach-parity! [conn input]
  ;; [DX-ERASE1] Why: compare byte-for-byte at the same synthetic pin, with matching fresh sessions.
  ;; Rejected: comparing only byte counts across separately seeded databases.
  (let [name (scope-name! input) db (d/db conn) cut (privacy/cut name db)
        _ (privacy/verify-data! cut db)
        _ (check! (and cut (not (:sealed cut)) (= (:seq cut) (get input "sequence"))) "Unexpected parity frontier")
        base {"roots" [(get input "root")] "basis" (get input "basis") "erasureRefs" true}
        plain (assoc base "session" (str (java.util.UUID/randomUUID)))
        guarded (assoc base "session" (str (java.util.UUID/randomUUID)))
        cold-control (reach/build-response name db plain)
        cold-guarded (binding [privacy/*cut* cut] (reach/build-response name db guarded))
        warm-control (reach/build-response name db plain)
        warm-guarded (binding [privacy/*cut* cut] (reach/build-response name db guarded))
        entities (get (json/read-str warm-guarded) "entities")
        refs (count (filter #(= 2 (count %)) entities))]
    (check! (= cold-control cold-guarded) "Guarded cold Reach bytes differ")
    (check! (= warm-control warm-guarded) "Guarded warm Reach bytes differ")
    ;; [DX-ERASE1] Why: a dangling ID has no native entity to remember in either arm.
    ;; Rejected: demanding a reference for every entity even when both reply bodies agree.
    (check! (pos? refs) "Guarded Reach still inlines every entity")
    {:sequence (:seq cut) :pin (get-in base ["basis" "recordedPosition"])
     :coldBytes (alength (.getBytes ^String cold-guarded "UTF-8"))
     :warmBytes (alength (.getBytes ^String warm-guarded "UTF-8"))
     :warmSha256 (privacy/sha256 warm-guarded) :coldSha256 (privacy/sha256 cold-guarded) :refs refs :entities (count entities)}))

(defn handle [{:keys [uri request-method headers body] :as req}]
  (if-not (str/starts-with? uri "/erase1/")
    (main/handler req)
    (if-not (and (= :post request-method) token (MessageDigest/isEqual (.getBytes token "UTF-8")
                  (.getBytes ^String (get headers "x-erase1-token" "") "UTF-8")))
      (main/response 404 {:code "NotFound"})
      (try
        (let [input (main/request-json body) op (subs uri 8)]
          (main/response 200
           (if (= op "clock") {:now (wall-ms)}
             (let [conn (connect! input main/connection)]
               (case op
                 "server-protection" (let [position (get input "position")
                                            db (erase/sync! conn)]
                                        (check! (and server-scope server-field (integer? position) (pos? position)
                                                     (envelope/shared?)
                                                     (not (privacy/enabled? db)))
                                                "Expected an unopened sealed seed with shared removal storage")
                                        (erase/declare! (scope-name! input) conn db
                                                        {"attributes" [server-field] "sealed" true} position))
                 "parallel-writer" (do
                                     (load-file "/erase1-writer-check/regression.clj")
                                     (load-file "/erase1/parallel.clj")
                                     ((ns-resolve 'erase1-parallel 'run!) (scope-name! input) conn))
                 "prepare" (prepare! conn input)
                 "erase" (erase! conn input)
                 "regression-excise" (regression-excise! conn input)
                 "ciphertext-inventory" (ciphertext-inventory! conn input)
                 "ciphertext-cleanup" (ciphertext-cleanup! conn input)
                 "cleanup-barrier" (cleanup-barrier! conn input)
                 "key-state" (key-state! conn input)
                 "authority-kind" {:database (scope-name! input) :shared (envelope/shared?)}
                 "reach-parity" (reach-parity! conn input)
                 "observe" (observe! conn input)
                 "drop-pin" (do (check! (= conn (:conn @plans)) "Wrong pin owner") (reset! plans nil) {:released true})
                 "index" (let [t (d/basis-t (d/db conn)) clock (System/nanoTime) req (d/request-index conn)
                               db (until (d/sync-index conn t))]
                           {:t t :basis (d/basis-t db) :requested req :ms (/ (- (System/nanoTime) clock) 1e6)})
                 "gc" (let [_ (check! (nil? @plans) "Reader still holds an old index")
                            cutoff (Date.) clock (System/nanoTime) work (d/gc-storage conn cutoff)]
                        (when (instance? clojure.lang.IDeref work) (until work))
                        {:cutoff (.getTime cutoff) :callMs (/ (- (System/nanoTime) clock) 1e6)})
                 (throw (ex-info "Unknown diagnostic operation" {})))))))
        (catch Throwable e
          (.printStackTrace e)
          (main/response 500 {:error (.getMessage e)}))))))

(defn -main [mode]
  (case mode
    "gateway" (if server-scope (main/serve! handle 8080)
              (do
                (envelope/start!)
                (d/create-database (main/db-uri "tx2-health"))
                ;; [DX-ERASE1] Why: bare-metal diagnostics bind to the prepared loopback interface.
                ;; Rejected: exposing native fixture controls on the server's public interfaces.
                (jetty/run-jetty handle (cond-> {:port 8080 :join? true :min-threads 8 :max-threads 48}
                                         (System/getenv "DX_ERASE_BIND_HOST")
                                         (assoc :host (System/getenv "DX_ERASE_BIND_HOST"))))))
    "fresh" (let [input (json/read-str (slurp *in*)) conn (connect! input d/connect)
                  t (get input "t") plan (into {} (map (fn [[k v]] [(keyword k) v])) (get input "plan"))
                  db (until (d/sync-excise conn t))]
              (println (str "ERASE1 " (json/write-str {:t t :snapshot (snapshot db plan) :log (log-rows conn plan)})))
              (d/release conn)
              (shutdown-agents)
              (System/exit 0))))
