(ns triplex.gateway.layout-input-audit
  (:require [clojure.data.json :as json] [clojure.edn :as edn] [clojure.java.io :as io] [clojure.string :as str]
            [triplex.gateway.schema :as schema] [triplex.gateway.lean :as lean]))

;; [DX-T1-11] Why: pricing's single-claim fold must not silently drop a distinct journal transaction identity.
;; Rejected: infer that equality from the ordinary writer shape or from row-delta checks that do not cover claim attributes.
(defn inspect-capture [r]
  (let [data (edn/read-string (get r "dataEdn")) p (get-in data [0 1]) ops (:ops p)
        metadata (first (filter #(and (map? %) (:triplex.tx/operation-id %)) ops))
        claims (vec (filter #(and (map? %) (:triplex.claim/command-id %)) ops))
        journals (set (:journal-entities p))
        rows (mapv #(lean/decode (get-in % [3 1])) (filter #(and (vector? %) (= :triplex/assert (first %))) ops))
        fact-rows (remove #(journals (:entity_id %)) rows)
        retired (set (map #(nth % 2) (filter #(and (vector? %) (= :triplex/retract (first %))) ops)))
        affected (into retired (map :id fact-rows))
        derived (filter #(contains? #{":_tx/change" ":_tx/changed-entity"} (:attribute %)) rows)
        kept-ids (set (map :id (remove #(contains? #{":_tx/change" ":_tx/changed-entity"} (:attribute %)) rows)))
        dropped-ids (map :id derived)]
    (when-not (and (= :triplex/commit (get-in data [0 0])) (= 1 (count claims)) (= 1 (count journals))
                   (= (get r "operationId") (:triplex.tx/operation-id metadata))
                   (= (:triplex.tx/id metadata) (:triplex.claim/tx-id (first claims)) (first journals))
                   (= "datomic.tx" (:triplex.claim/tx (first claims)))
                   (= (get r "facts") (count fact-rows)))
      (throw (ex-info "Replay single-command/claim fold assumption differs" {:operation (get r "operationId")})))
    (doseq [r derived :when (= ":_tx/change" (:attribute r))]
      (when-not (affected (get (json/read-str (:value_json r)) "tripleId"))
        (throw (ex-info "Change row names a fact absent from its logical delta" {}))))
    (when (some kept-ids dropped-ids) (throw (ex-info "Dropped row identity unexpectedly retained" {})))
    {:claims 1 :droppedRowIdentities (count dropped-ids)
     :identityUtf8Bytes (reduce + (map #(alength (.getBytes ^String % "UTF-8")) dropped-ids))}))

(defn -main [& [request-file]]
  (try
    (let [text (slurp request-file) q (json/read-str text) started (System/currentTimeMillis)
          _ (when-not (and (= (get q "run") (System/getenv "TRIPLEX_TRACE_RUN"))
                           (= (get q "source") (System/getenv "TRIPLEX_TRACE_SOURCE"))
                           (<= (get q "createdAt") started))
              (throw (ex-info "Input audit request is foreign/stale" {})))
          results
          (mapv (fn [input]
                  (let [_ (when-not (re-matches #"[a-z0-9-]+\.jsonl" (get input "file")) (throw (ex-info "Invalid audit input name" {})))
                        file (io/file "/inputs" (get input "file")) body (slurp file)
                        _ (when-not (= (schema/sha256 body) (get input "sha256"))
                            (throw (ex-info "Input audit capture bytes differ" {})))
                        rows (mapv json/read-str (str/split-lines body))]
                    (when-not (and (= 300 (count rows))
                                   (every? #(and (= (get input "run") (get % "run") (get % "slot"))
                                                 (= (get input "source") (get % "source"))) rows))
                      (throw (ex-info "Input audit capture source/count differs" {})))
                    (let [findings (mapv inspect-capture rows)]
                      {:run (get input "run") :source (get input "source") :captures 300
                       :singleClaimIdentityEqual (reduce + (map :claims findings))
                       :droppedRowIdentities (reduce + (map :droppedRowIdentities findings))
                       :identityUtf8Bytes (reduce + (map :identityUtf8Bytes findings))
                       :captureSha256 (get input "sha256")}))) (get q "inputs"))]
      (println (json/write-str {:schema "triplex.layout-input-audit.v1" :run (get q "run") :source (get q "source")
                               :requestSha256 (schema/sha256 text) :startedAt started :endedAt (System/currentTimeMillis)
                               :scope "Input assumptions only; not query/oracle acceptance" :results results}))
      (shutdown-agents) (System/exit 0))
    (catch Throwable e (.printStackTrace e) (shutdown-agents) (System/exit 1))))
