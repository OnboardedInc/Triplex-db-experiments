(ns erase1
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [datomic.api :as d]
            [ring.adapter.jetty :as jetty]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.main :as main]
            [triplex.gateway.schema :as schema]
            [triplex.gateway.scope :as scope])
  (:import [java.security MessageDigest]
           [java.time Instant]
           [java.util Date HexFormat]))

(def token (System/getenv "DX_ERASE_TOKEN"))
(def nonce (System/getenv "DX_ERASE_NONCE"))
(def plans (atom nil))
(defn check! [ok message] (when-not ok (throw (ex-info message {}))))
(defn until [x] (let [v (deref x 480000 ::timeout)] (check! (not= ::timeout v) "Native operation timed out") v))
(defn wall-ms [] (let [t (Instant/now)] (+ (* 1000.0 (.getEpochSecond t)) (/ (.getNano t) 1e6))))

(defn scope-name! [input]
  (let [s (get input "scope") [_ org project db generation] (json/read-str (scope/validate! s))]
    (check! (and (= org "test") (= project "test") (= generation 0)
                 (re-matches (re-pattern (str "erase1-" nonce "(?:-[a-z]+)?")) db)) "Unexpected attempt scope")
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
                 "prepare" (prepare! conn input)
                 "erase" (erase! conn input)
                 "regression-excise" (regression-excise! conn input)
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
    "gateway" (do
                (d/create-database (main/db-uri "tx2-health"))
                ;; [DX-ERASE1] Why: bare-metal diagnostics bind to the prepared loopback interface.
                ;; Rejected: exposing native fixture controls on the server's public interfaces.
                (jetty/run-jetty handle (cond-> {:port 8080 :join? true :min-threads 8 :max-threads 48}
                                         (System/getenv "DX_ERASE_BIND_HOST")
                                         (assoc :host (System/getenv "DX_ERASE_BIND_HOST")))))
    "fresh" (let [input (json/read-str (slurp *in*)) conn (connect! input d/connect)
                  t (get input "t") plan (into {} (map (fn [[k v]] [(keyword k) v])) (get input "plan"))
                  db (until (d/sync-excise conn t))]
              (println (str "ERASE1 " (json/write-str {:t t :snapshot (snapshot db plan) :log (log-rows conn plan)})))
              (d/release conn)
              (shutdown-agents)
              (System/exit 0))))
