(ns triplex.gateway.erase6
  (:require [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.group-test :as seed] [triplex.gateway.lean :as lean]
            [triplex.gateway.main :as gateway] [triplex.gateway.selftest :as fixture]
            [triplex.gateway.storage :as storage])
  (:import [java.io ByteArrayInputStream]))

(defn completed [f]
  (let [r (deref f 120000 ::timeout)]
    (assert (not= r ::timeout) "Excision observation timed out")
    r))

;; [DX-ERASE1] Why: reproduce the published regression-excise! boundary on a real K scope.
;; Rejected: deleting fixture rows in memory, which would hide the retained log and held snapshot.
(defn cut! [conn entity id]
  (let [db (d/db conn) assertion (lean/by-id db id)]
    (assert (and assertion (= entity (:entity_id (lean/decode (:v assertion))))))
    (let [report (completed (d/transact conn [{:db/id (d/tempid :db.part/user) :db/excise (:e assertion)
                                               :db.excise/attrs [:triplex.entity/row]}]))
          db (:db-after report) t (d/basis-t db)]
      (d/request-index conn)
      (assert (<= t (d/basis-t (completed (d/sync-excise conn t)))))
      t)))

(defn post [name route data]
  (let [response (gateway/route-handler {:request-method :post :uri (str "/v1/db/" name "/" route)
                                        :body (ByteArrayInputStream. (.getBytes (json/write-str data) "UTF-8"))})]
    [(:status response) (json/read-str (:body response))]))

(defn -main [& _]
  (let [attempt (System/getenv "W1_ATTEMPT") key (json/write-str ["triplex-scope-v1" "test" "erase6" attempt 0])
        opened (gateway/create-scope! nil key "lean" true true) name (:db opened)
        conn (gateway/connection (gateway/db-uri name)) id "canary-identity" token "synthetic-secret"
        input (seed/input {:id "erase-witness" :add id}) tx "_tx/erase-witness"
        pages (mapv (fn [r] (cond-> (storage/decode-row r)
                             (= id (get-in r ["id" "v"])) (assoc :value_string token))) (get input "rows"))
        entry (assoc (seed/row "erase-change" tx ":_tx/change" nil tx)
                     :value_type "json" :value_json (json/write-str {"op" "assert" "tripleId" id
                       "entityId" seed/root "attribute" ":v" "recordedAt" 1000.0 "validFrom" 0.0
                       "value" {"type" "string" "value" token}}))
        payload (fixture/row-input (assoc input "newIds" (conj (get input "newIds") (:id entry))
                                                "rows" (mapv storage/wire-row (conj pages entry))))
        query {"edn" (str "[:find ?v :in $ $rules :where [?f :f/id " (pr-str id)
                           "] [(triplex.gateway.query/scalar $ ?f) ?v]]") "basis" {"recordedPosition" 1}}
        log-page (fn [t]
                   (let [r (gateway/route-handler {:request-method :get :uri (str "/v1/db/" name "/log")
                                                   :query-string (str "fromT=" t "&limit=1")})]
                     [(:status r) (json/read-str (:body r))]))]
    (assert (:created opened))
    (try
      (let [report (storage/commit! name conn (d/db conn) payload)
            held (:handle (storage/begin! name (d/db conn))) pinned (assoc query "handle" held)
            [before body] (post name "q" pinned)
            journal #(post name "read" {"pattern" {"entityId" tx "attribute" ":_tx/change"}})]
        (assert (= ["1" "erase-witness"] [(get-in report [:position "v"]) (:operationId report)]))
        (assert (= [200 [[{"t" "string" "v" token}]]] [before (get body "rows")]))
        (assert (= token (get-in (json/read-str (get-in (second (journal)) ["rows" 0 "value_json" "v"])) ["value" "value"])))
        (let [t (cut! conn seed/root id)
              [pin-status pin] (post name "q" pinned) [fresh-status fresh] (post name "q" query)
              [log-status log] (log-page t)
              [old-status old] (post name "read" {"id" id "handle" held "basis" {"recordedPosition" 1}})
              [new-status current] (post name "read" {"id" id "history" true})
              [journal-status j] (journal)]
          ;; [DX-W1] Why: prove the new query guard and preserve the observed red read boundaries separately.
          ;; Rejected: declaring a typed 409 equivalent to Q49c's ordered, countable marker.
          (assert (= [[409 "ErasureQueryUnsupported"] [409 "ErasureQueryUnsupported"] [409 "FeedErasureUnsupported"]]
                     [[pin-status (get pin "code")] [fresh-status (get fresh "code")] [log-status (get log "code")]]))
          (assert (= [200 200 200] [old-status new-status journal-status]))
          (println "W1_ERASE6" (json/write-str {:attempt attempt :db name :eraseT (str t) :id id
                     :assertT (get-in report [:t "v"]) :pinnedCode (get pin "code") :freshCode (get fresh "code")
                     :feedCode (get log "code") :heldCleartext (= token (get-in old ["rows" 0 "value_string" "v"]))
                     :historyPresent (boolean (seq (get current "rows")))
                     :journalCleartext (= token (get-in (json/read-str (get-in j ["rows" 0 "value_json" "v"])) ["value" "value"]))}))))
      (finally (gateway/delete-scope! nil key))))
  (shutdown-agents)
  (System/exit 0))
