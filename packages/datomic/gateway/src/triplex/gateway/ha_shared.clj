(ns triplex.gateway.ha-shared
  (:require [datomic.api :as d] [clojure.data.json :as json] [clojure.string :as str]
            [ring.adapter.jetty :as jetty] [triplex.gateway.main :as main] [triplex.gateway.schema :as schema]
            [triplex.gateway.storage :as store] [triplex.gateway.feed :as feed] [triplex.gateway.codec :as codec]))

;; [DX-HA1] Why: a stale peer may already have submitted a transaction when the router changes. Rejected: fencing only at HTTP ingress or through a placement TTL.
(def control-code
 '(let [owner (d/entid db [:ha/account account]) e (when owner (d/entity db owner))
        n (long (or (:ha/sequence e) 0)) h (or (:ha/hash e) "") verified (long (or (:ha/verified e) 0))
        key-for (fn [i] (format "%s/%016d" account (long i)))
        require! (fn [v reason] (when-not v (throw (ex-info (str "HA1_" reason) {}))))]
    (case action
      :init (if owner (do (require! (and (= gen (:ha/generation e)) (= (:source x) (:ha/source e)) (= (:mode x) (:ha/mode e))) "PlacementConflict") [])
             [{:db/id (d/tempid :db.part/user) :ha/account account :ha/sequence 0 :ha/hash "" :ha/verified 0
               :ha/generation gen :ha/source (:source x) :ha/mode (:mode x)}])
      (:write :copy)
      (let [next (inc n)
            digest (format "%064x" (java.math.BigInteger. 1 (.digest (java.security.MessageDigest/getInstance "SHA-256")
                                    (.getBytes (str h ":" next ":" (:body-hash x)) "UTF-8"))))]
        (require! (and owner (= gen (:ha/generation e)) (= (if (= action :write) "serving" "importing") (:ha/mode e))) "AccountFenced")
        (when (= action :copy)
          (require! (and (= (:seq x) next) (= (:digest x) digest) (= (:prev x) h)) "CopyGap"))
        [[:db/add owner :ha/sequence next] [:db/add owner :ha/hash digest]
         (cond-> {:db/id "datomic.tx" :ha/key (key-for next) :ha/tenant account :ha/seq next :ha/prev h :ha/digest digest
                  :ha/body (:body x) :ha/body-hash (:body-hash x) :ha/tx-key (:tx-key x)}
           (:original x) (assoc :ha/original (:original x) :ha/legacy-t (:legacy-t x) :ha/legacy-p (:legacy-p x)))])
      :verify (let [i (:seq x) entry (d/entity db [:ha/key (key-for i)])]
        (require! (and (= gen (:ha/generation e)) (= "importing" (:ha/mode e)) (= (:digest x) (:ha/digest entry)) (<= i n)
                       (or (<= i verified) (= i (inc verified)))) "VerifyGap")
        (if (<= i verified) [] [[:db/add owner :ha/verified i]]))
      :fence (do
        (require! (and (= gen (:ha/generation e)) (or (= "serving" (:ha/mode e))
                           (and (= "fenced" (:ha/mode e)) (= (:dest x) (:ha/target e))))) "AccountFenced")
        (let [i (:verified x) observed (if (zero? i) "" (:ha/digest (d/entity db [:ha/key (key-for i)])))]
          (require! (and (= observed (:digest x)) (<= 0 (- n i) (:limit x))) "CatchUpFirst"))
        (if (= "fenced" (:ha/mode e)) [] [[:db/add owner :ha/mode "fenced"] [:db/add owner :ha/target (:dest x)] [:db/add owner :ha/seal "datomic.tx"]]))
      :activate (do
        (require! (and (= gen (:ha/generation e)) (= (:source x) (:ha/source e))
                       (= verified n (:seq x)) (= h (:digest x)) (#{"importing" "serving"} (:ha/mode e))) "SealMismatch")
        [[:db/add owner :ha/mode "serving"] [:db/add owner :ha/end-t (:end-t x)] [:db/add owner :ha/end-p (:end-p x)] [:db/add owner :ha/activation (or (some-> (:ha/activation e) :db/id) "datomic.tx")]]))))
(def attrs
  (mapv (fn [[k typ unique]] (cond-> {:db/ident k :db/valueType typ :db/cardinality :db.cardinality/one}
                                    unique (assoc :db/unique :db.unique/value)))
        [[:ha/account :db.type/string true] [:ha/sequence :db.type/long] [:ha/verified :db.type/long]
         [:ha/hash :db.type/string] [:ha/generation :db.type/long] [:ha/source :db.type/string] [:ha/target :db.type/string]
         [:ha/mode :db.type/string] [:ha/key :db.type/string true] [:ha/tx-key :db.type/string true]
         [:ha/tenant :db.type/string] [:ha/seq :db.type/long] [:ha/digest :db.type/string] [:ha/prev :db.type/string]
         [:ha/legacy-t :db.type/string true] [:ha/legacy-p :db.type/string true] [:ha/seal :db.type/ref] [:ha/activation :db.type/ref] [:ha/end-t :db.type/long] [:ha/end-p :db.type/long]
         [:ha/body :db.type/string] [:ha/body-hash :db.type/string] [:ha/original :db.type/string]]))
(defn invalid [s] (throw (ex-info s {:code s :status 409})))
(defn check [v code] (when-not v (invalid code)))
(defn canonical [v] (cond (map? v) (into (sorted-map) (map (fn [[k x]] [k (canonical x)]) v))
                          (sequential? v) (mapv canonical v) :else v))
(defn receipt [db entry]
  (if-let [original (:ha/original entry)] (json/read-str original)
    (let [r (json/read-str (json/write-str (dissoc (store/operation db (:triplex.tx/operation-id entry)) :status)))
          owner (d/entity db [:ha/account (:ha/tenant entry)]) activation (some-> (:ha/activation owner) :db/id d/tx->t)]
      (if (and activation (> (d/tx->t (:db/id entry)) activation))
        (-> r (assoc-in ["t" "v"] (str (+ (:ha/end-t owner) (- (d/tx->t (:db/id entry)) activation))))
              (assoc-in ["position" "v"] (str (+ (:ha/end-p owner) (- (:triplex.tx/position entry) (store/head-position (d/as-of db activation)))))))
        r))))
;; [DX-HA1] Why: JSON numbers round-trip an integral tagged double through JavaScript as an integer. Rejected: dropping the recorded time or accepting a changed type tag to match a pin.
(defn same-receipt? [left right]
  (let [path ["recordedAt" "v"] a (get-in left path) b (get-in right path)]
    (and (number? a) (number? b) (= "double" (get-in left ["recordedAt" "t"]))
         (= (assoc-in left path (double a)) (assoc-in right path (double b))))))
(defn key-at [tenant n] (format "%s/%016d" tenant (long n)))
(defn meta-state [db tenant]
  (let [e (d/entity db [:ha/account tenant])]
    {:account tenant :mode (:ha/mode e) :generation (:ha/generation e) :source (:ha/source e) :target (:ha/target e)
     :sequence (:ha/sequence e) :digest (:ha/hash e) :verified (:ha/verified e) :verifiedDigest (if (pos? (long (or (:ha/verified e) 0))) (:ha/digest (d/entity db [:ha/key (key-at tenant (:ha/verified e))])) "") :sealT (some-> (:ha/seal e) :db/id d/tx->t) :sealP (when-let [ref (:ha/seal e)] (store/head-position (d/as-of db (d/tx->t (:db/id ref))))) :endT (:ha/end-t e) :endP (:ha/end-p e)}))
(defn entry-at [db tenant seq] (let [e (d/entity db [:ha/key (key-at tenant seq)])] (check (= tenant (:ha/tenant e)) "UnknownPin") e))
(defn owned? [tenant id] (and (string? id) (str/starts-with? id (str tenant "~"))))
(defn wire-value [row k] (get-in row [k "v"]))
(defn validate-body [tenant body]
  (let [rows (get body "rows") claims (get body "claims") tx (get-in claims [0 "txId"])
        ids (set (get body "newIds"))]
    (check (and (every? #{"sourceK" "scopeWide" "span" "position" "operationId" "rows" "newIds" "claims" "rowTexts" "assignRecordTime" "entities" "live"} (keys body))
                (= ids (set (filter ids (map #(wire-value % "id") rows))))
                (= false (get body "scopeWide")) (nil? (get body "sourceK"))
                (= 1 (get body "position") (get body "span")) (= false (get body "assignRecordTime"))
                (vector? rows) (<= 1 (count rows) 160) (= 1 (count claims)) (= (count rows) (count (set (map #(wire-value % "id") rows))))
                (owned? tenant (get body "operationId")) (owned? tenant tx) (owned? tenant (get-in claims [0 "commandId"]))
                (every? #(owned? tenant %) (concat (get body "newIds") (get body "live") (get body "entities") (keys (get body "rowTexts"))))
                (every? #(and (owned? tenant (wire-value % "id")) (owned? tenant (wire-value % "entity_id"))
                              (owned? tenant (wire-value % "tx_id"))
                              (if (ids (wire-value % "id")) (= tx (wire-value % "tx_id")) (= tx (wire-value % "retract_tx_id")))
                              (or (not= "ref" (wire-value % "value_type")) (owned? tenant (wire-value % "value_string")))) rows))
           "UnsupportedAccountCommand")
    tx))
(defn post! [conn tenant gen act x] (:db-after @(d/transact conn [[:ha/control tenant gen act x]])))
(defn normalized-row [db row]
  (reduce (fn [r [id pos]]
            (if-let [tx (get-in r [id "v"])]
              (let [entry (d/entity db [:ha/tx-key tx]) p (get (receipt db entry) "position")]
                (check (some? p) "MissingOrigin") (assoc r pos p)) r))
          row [["tx_id" "recorded_position"] ["retract_tx_id" "retracted_position"]]))
(defn rows-at [name db tenant e input]
  (let [p (:triplex.tx/position e) cut (d/as-of db (d/tx->t (:db/id e)))
        query (assoc input "basis" {"recordedPosition" p "validAt" (get input "validAt" 10)})
        rows (:rows (store/read-rows name cut query))]
    (mapv #(normalized-row db %) rows)))
(defn record [conn db e]
  (let [native (d/tx->t (:db/id e)) log-entry (first (d/tx-range (d/log conn) native (inc native)))
        public (:transaction (feed/project db log-entry)) seq (:ha/seq e)
        original (receipt db e) position (get-in original ["position" "v"])]
    (let [cut (d/as-of db native)
          rows (mapv (fn [id] (let [eid (d/entid cut [:f/id id])]
                                (check (some? eid) "MissingFact") (normalized-row db (store/wire-row (store/row cut eid)))))
                     (sort (distinct (map :assertionId (:changes public)))))]
     {:observedFacts (count rows) :valueHash (schema/sha256 (json/write-str (canonical rows))) :sequence seq :account (:ha/tenant e) :prev (:ha/prev e) :digest (:ha/digest e) :receipt original
     ;; [DX-HA1] Why: subscribers retain native receipt coordinates even when other tenants filled the intervening positions. Rejected: exposing the account sequence as the historical transaction position.
     :feed (-> public (assoc :positions [position]) (update :changes (fn [cs] (mapv #(assoc % :position position) cs))))
     :body (:ha/body e)})))
(defn transact! [name conn tenant gen action body import]
  (let [db (d/db conn) tx (validate-body tenant body) bytes (json/write-str (canonical body))
        _ (check (<= (alength (.getBytes bytes "UTF-8")) 524288) "CommandTooLarge")
        sha (schema/sha256 bytes) op (get body "operationId")
        existing (fn [cut] (when-let [id (d/entid cut [:triplex.tx/operation-id op])]
                            (let [e (d/entity cut id)]
                              (check (and (= tenant (:ha/tenant e)) (= bytes (:ha/body e))
                                          (or (nil? import) (and (= (get import "sequence") (:ha/seq e))
                                              (= (get import "digest") (:ha/digest e))
                                              (same-receipt? (get import "receipt") (receipt cut e))))) "OperationPayloadConflict")
                              (receipt cut e))))]
    (or (existing db)
        (let [x (cond-> {:body bytes :body-hash sha :tx-key tx}
                  import (assoc :seq (get import "sequence") :prev (get import "prev") :digest (get import "digest")
                                 :legacy-t (key-at tenant (Long/parseLong (get-in import ["receipt" "t" "v"])))
                                :legacy-p (key-at tenant (Long/parseLong (get-in import ["receipt" "position" "v"])))
                                :original (json/write-str (get import "receipt"))))]
          (try
            (let [report @(d/transact conn (into [[:ha/control tenant gen action x]] (store/tx-data db body)))
                  after (:db-after report)] (existing after))
            (catch Exception ex (or (existing (d/db conn)) (throw ex))))))))
(defn handler [name conn secret req]
  (try
    (if (= (:uri req) "/health") (main/response 200 {:datomicVersion "1.0.7745" :gatewaySourceHash (System/getenv "GATEWAY_SOURCE_SHA256")})
      (do (check (= :post (:request-method req)) "UnsupportedRoute")
      (let [input (main/request-json (:body req)) txn (= (:uri req) (str "/v1/db/" name "/transact"))
            op (if txn "write" (last (str/split (:uri req) #"/"))) tenant (get input "haAccount") gen (get input "haGeneration")
            db (d/db conn) admin (= secret (get-in req [:headers "x-ha1-admin"]))
            _ (check (and (or txn (and (= name (get input "haDatabase")) (= (:uri req) (str "/ha1/shared/" op)))) (string? tenant) (re-matches #"[a-z0-9-]{1,64}" tenant)) "UnsupportedRoute")
            _ (when (#{"init" "export" "import" "verify" "fence" "activate"} op) (check admin "AdminRequired"))
            _ (when (#{"lookup" "read" "feed" "translate"} op)
                (check (not= "importing" (:ha/mode (d/entity db [:ha/account tenant]))) "TargetImporting"))
            result (case op
             "state" (meta-state db tenant)
             "init" (let [mode (get input "mode")] (check (and (#{"importing" "serving"} mode) (= (= mode "serving") (= name (get input "source")))) "InvalidPlacement")
                      (meta-state (post! conn tenant gen :init {:mode mode :source (get input "source")}) tenant))
             "write" (let [r (transact! name conn tenant gen :write (dissoc input "haAccount" "haGeneration" "attemptId") nil)]
                       (assoc r "delta" (- (Long/parseLong (get-in r ["position" "v"])) (get input "position"))))
             "import" (let [entry (get input "entry")] (check (= tenant (get entry "account")) "ScopeMismatch")
                        (transact! name conn tenant gen :copy (json/read-str (get entry "body")) entry))
             "verify" (meta-state (post! conn tenant gen :verify {:seq (get input "sequence") :digest (get input "digest")}) tenant)
             "fence" (let [limit (get input "limit")] (check (<= 0 limit 8) "DeltaLimit")
                       (meta-state (post! conn tenant gen :fence {:verified (get input "verified") :digest (get input "digest") :limit limit :dest (get input "dest")}) tenant))
             "activate" (meta-state (post! conn tenant gen :activate {:seq (get input "sequence") :digest (get input "digest") :source (get input "source") :end-t (get input "endT") :end-p (get input "endP")}) tenant)
             "lookup" (let [id (get input "operationId") _ (check (owned? tenant id) "ScopeMismatch") e (d/entity db [:triplex.tx/operation-id id])]
                        (if (= tenant (:ha/tenant e)) {:found true :sequence (:ha/seq e) :receipt (receipt db e)} {:found false}))
             ("export" "feed") (let [after (get input "after") limit (get input "limit")
                                      _ (check (and (integer? after) (<= 0 after) (integer? limit) (<= 1 limit 64)) "InvalidCursor")
                                      high (long (or (:ha/sequence (d/entity db [:ha/account tenant])) 0))
                                      _ (check (<= after high) "FutureCursor")
                                      page (mapv (fn [i] (let [r (record conn db (entry-at db tenant i))]
                                              (if (= op "export") r (dissoc r :body)))) (range (inc after) (inc (min high (+ after limit)))))]
                                 {:account tenant :after after :next (+ after (count page)) :entries page})
             "translate" (let [origin (get input "origin") typ (get input "coordinate") n (get input "value")
                            _ (check (and (integer? n) (<= 0 n) (#{"t" "position"} typ)) "InvalidCursor")
                            owner (d/entity db [:ha/account tenant])
                            activation (some-> (:ha/activation owner) :db/id d/tx->t)
                            end (if (= typ "t") (:ha/end-t owner) (:ha/end-p owner))
                            current (if (= typ "t") (d/basis-t db) (store/head-position db))
                            start (when activation (if (= typ "t") activation (store/head-position (d/as-of db activation))))
                            public-head (if activation (+ end (- current start)) current)
                            _ (check (if (= name origin) (<= n public-head)
                                      (and activation (= origin (:ha/source owner)) (<= n end))) "UnknownOrigin")
                            attr (if (= typ "t") :ha/legacy-t :ha/legacy-p)
                            seq (if (and activation (<= n end))
                                  (when-let [datom (first (d/rseek-datoms db :avet attr (key-at tenant n)))]
                                    (when (and (= (:a datom) (d/entid db attr)) (str/starts-with? (:v datom) (str tenant "/")))
                                      (:ha/seq (d/entity db (:e datom)))))
                                  (let [local (if activation (+ start (- n end)) n)]
                                    (:ha/sequence (d/entity (if (= typ "t") (d/as-of db local) (store/at-position db local)) [:ha/account tenant]))))]
                        {:account tenant :sequence (or seq 0)})
             "read" (let [e (entry-at db tenant (get input "sequence"))
                           _ (check (same-receipt? (get input "receipt") (receipt db e)) "PinMismatch")
                           id (get input "id") subj (get input "subject")
                           _ (check (and (not= (some? id) (some? subj)) (owned? tenant (or id subj))) "ScopeMismatch")]
                      {:rows (rows-at name db tenant e (merge (if id {"id" id} {"entityIds" [subj]})
                                {"history" (true? (get input "history")) "validAt" (get input "validAt" 10)}))})
             (invalid "UnsupportedRoute"))]
        (main/response 200 result))))
    (catch Exception ex
      (let [chain (take-while some? (iterate #(some-> ^Throwable % .getCause) ex))
            code (or (some #(get (ex-data %) :code) chain)
                     (some #(second (re-find #"HA1_([A-Za-z]+)" (str %))) chain) "SharedTransactionError")]
        (main/response 409 {:code code :message (if (= code "SharedTransactionError") (str ex) code)})))))
(defn -main [& _]
  (let [scope (System/getenv "HA1_SHARED_SCOPE") secret (System/getenv "HA1_ADMIN_TOKEN")
        _ (assert (and (seq scope) (seq secret))) name (:db (main/create-scope! nil scope "legacy" true false))
        conn (main/connection (main/db-uri name))]
    @(d/transact conn attrs)
    @(d/transact conn [{:db/ident :ha/control :db/fn (d/function {:lang :clojure :params '[db account gen action x] :requires '[[datomic.api :as d]] :code control-code})}])
    (jetty/run-jetty (partial handler name conn secret) {:port 8080 :host (.getHostAddress (java.net.InetAddress/getByAddress (byte-array 4))) :join? true})))
