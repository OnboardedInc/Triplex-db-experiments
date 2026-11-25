(ns n1-pool
  "[DX-N1] The PostgreSQL authority's key pool, in process, through the gateway's own routes (in-memory Datomic, a sealed
  scope, every option off). A gateway fills a database's pool (256 keys) when it serves that database's protection
  declaration; its worker refills, every 500 ms, only pools it already holds; a save takes one key per protected value
  and is refused when the pool runs out. Run with n1-keys/run.sh on the file and the PostgreSQL authority, on the base
  and on this branch. Each scenario prints what it saw (N1_POOL) and checks the fixed behaviour (N1 ok / N1 FAIL): on
  the base the checks of a reachable state fail, which is the evidence.
    R0  control: the database declared on this gateway, one save of one protected value.
    R1  a restart (or a gateway that never served the declaration, or a restored database's gateway restarted): the
        gateway's pools emptied, the worker running as in a gateway; saves of one protected value sent back to back
        until one is stored (at most 10 s): how many were refused, with what answer, and for how long.
    R2  one save with 300 protected values (more than one pool), sent three times 1.5 s apart (the worker refilling in
        between); then one with 600.
    R3  a burst: four saves of 100 protected values each, back to back, right after the declaration.
  N1_MODE=bodies prints the request bodies the stack scenario sends (N1_BODY NAME JSON) and nothing else."
  (:require [clojure.data.json :as json] [clojure.string :as str]
            [triplex.gateway.authority-sql :as sql] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.selftest :as selftest] [triplex.gateway.storage :as storage]
            [wfix1-regression :as offers])
  (:import [java.util UUID]))

(def pg? (some? sql/url))
(def results (atom []))
(defn check! [label ok detail]
  (swap! results conj {:label label :ok (boolean ok)})
  (println "N1" (if ok "ok  " "FAIL") label (pr-str detail)))
(defn observed [label detail] (println "N1_POOL" label (pr-str detail)))

(defn frame
  "One save of N protected values (attribute :v), one per new subject acct/a/<command>-<i>."
  [command n]
  (let [tx (str "_tx/" command)
        row (fn [id e a v & [type]] {:id id :entity_id e :entity_type type :attribute a :value_type "string" :value_string v
                                     :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})
        j (fn [suffix a] (row (str command "/" suffix) tx a nil "_Transaction"))
        owners (mapv #(str "acct/a/" command "-" %) (range n))
        facts (mapv #(row (str command "/f" %) (owners %) ":v" (str "secret-" command "-" %)) (range n))
        changes (mapv (fn [i f] (assoc (j (str "c" i) ":_tx/change") :value_type "json"
                                       :value_json (json/write-str {"op" "assert" "tripleId" (:id f) "entityId" (:entity_id f)
                                                                    "attribute" ":v" "value" {"type" "string" "value" (:value_string f)}
                                                                    "validFrom" 0.0 "recordedAt" 1000.0 "assertionTxId" tx})))
                      (range n) facts)
        rows (concat [(assoc (j "p" ":_tx/position") :value_type "number" :value_number 1.0)
                      (assoc (j "t" ":_tx/instant") :value_type "datetime" :value_datetime 1000.0)]
                     (map-indexed (fn [i o] (assoc (j (str "o" i) ":_tx/changed-entity") :value_string o)) owners)
                     [(assoc (j "cmd" ":_tx/command-id") :value_string command)]
                     changes facts)]
    (selftest/row-input {"span" 1 "position" 1 "scopeWide" false "entities" owners "operationId" command
                         "rows" (mapv storage/wire-row rows) "newIds" (mapv :id rows) "live" []
                         "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]})))

(defn fresh [tag] (str "n1-" tag "-" (subs (str (UUID/randomUUID)) 0 8)))
(defn save! [name tag n] (offers/outcome (offers/send name (frame (fresh tag) n))))
(defn declare! [name] (offers/outcome (offers/route name "v2" "protection" {"attributes" [":v"] "sealed" true})))
(defn restart! [] (.clear ^java.util.Map @#'envelope/batches))
(defn pool-size [name] (some-> ^java.util.Map @#'envelope/batches (.get name) (.size)))

(defn r0 []
  (offers/in-scope
    (fn [name _]
      (let [d (declare! name) s (save! name "r0" 1)]
        (observed "R0 declared here, one save" {:declare d :save s})
        (check! "R0 the declaring gateway's first save is stored" (= [200 nil] s) s)))))

(defn r1 []
  (offers/in-scope
    (fn [name _]
      (declare! name)
      (restart!)
      (let [t0 (System/nanoTime)
            ms #(long (/ (- (System/nanoTime) t0) 1e6))
            tries (loop [tries []]
                    (let [o (save! name "r1" 1) tries (conj tries [(ms) o])]
                      (if (or (= [200 nil] o) (> (ms) 10000)) tries (recur tries))))
            refused (remove #(= [200 nil] (second %)) tries)]
        (observed "R1 after a restart: saves of one protected value, back to back"
                  {:sent (count tries) :refused (count refused) :answers (frequencies (map second refused))
                   :first-stored-ms (when (= [200 nil] (second (last tries))) (first (last tries)))
                   :last-refused-ms (first (last refused)) :pool-after (pool-size name)})
        (check! "R1 no save refused after a restart" (empty? refused) {:refused (count refused)})))))

(defn r2 []
  (offers/in-scope
    (fn [name _]
      (declare! name)
      (let [pool0 (pool-size name)
            tries (vec (for [k (range 3)] (let [o (save! name (str "r2-" k) 300)] (Thread/sleep 1500) [o (pool-size name)])))
            big (save! name "r2-600" 600)]
        (observed "R2 one save of 300 protected values, three times 1.5 s apart; then 600"
                  {:pool-after-declaration pool0 :three-hundred tries :six-hundred big})
        (check! "R2 a save of 300 protected values is stored" (every? #(= [200 nil] (first %)) tries) tries)
        (check! "R2 a save of 600 protected values is stored" (= [200 nil] big) big)))))

(defn r3 []
  (offers/in-scope
    (fn [name _]
      (declare! name)
      (let [burst (vec (for [k (range 4)] (save! name (str "r3-" k) 100)))]
        (observed "R3 four saves of 100 protected values, back to back" {:answers burst :pool-after (pool-size name)})
        (check! "R3 every save of the burst is stored" (every? #(= [200 nil] %) burst) burst)))))

(defn bodies []
  (let [b (fn [nm command n] (println "N1_BODY" nm (json/write-str (frame command n))))]
    (doseq [k (range 80)] (b (str "one-" k) (str "n1s-one-" k) 1))
    (doseq [k (range 3)] (b (str "big300-" k) (str "n1s-big300-" k) 300))
    (doseq [k (range 4)] (b (str "burst100-" k) (str "n1s-burst100-" k) 100))))

(defn main []
  (if (= "bodies" (System/getenv "N1_MODE"))
    (bodies)
    (do
      (envelope/start!)
      (doseq [[n f] [["R0" r0] ["R1" r1] ["R2" r2] ["R3" r3]]]
        (restart!)
        (try (f) (catch Throwable t (check! (str n " ran") false (str (class t) " " (.getMessage t))))))
      (let [failed (remove :ok @results)]
        (println "N1_SUMMARY" (pr-str {:checks (count @results) :failed (count failed) :authority (if pg? "postgresql" "file")
                                       :source (System/getenv "B2R_SOURCE")})))))
  (shutdown-agents)
  (System/exit (if (or (= "bodies" (System/getenv "N1_MODE")) (empty? (remove :ok @results))) 0 1)))
