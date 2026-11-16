(ns triplex.gateway.idle-refusal
  (:require [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.main :as main] [triplex.gateway.scope :as scope]
            [triplex.gateway.schema :as schema])
  (:import [java.net URI] [java.net.http HttpClient HttpRequest HttpRequest$BodyPublishers HttpResponse$BodyHandlers]
           [java.time Duration] [java.util UUID]))

;; [DX-T1-10] Why: prove the exact HTTP refusal enters the installed serial function and appends no native log transaction before a diagnostic may use it.
;; Rejected: infer no writes from HTTP 409, use successful empty commits, or share the measured writer's client sequence.
(defn -main [& [request-file]]
  (try
    (let [text (slurp request-file) input (json/read-str text) started (System/currentTimeMillis)
          _ (when-not (and (= (get input "run") (System/getenv "TRIPLEX_TRACE_RUN"))
                          (= (get input "slot") (System/getenv "TRIPLEX_TRACE_SLOT"))
                          (= (get input "source") (System/getenv "TRIPLEX_TRACE_SOURCE"))
                          (<= (- started 60000) (get input "createdAt") started))
              (throw (ex-info "Idle refusal attempt binding differs" {})))
          scope-text (get input "scope") name (scope/name-for scope-text)
          _ (main/create-scope! name scope-text "lean" true true)
          conn (main/connection (main/db-uri name)) before @(d/sync conn) before-t (d/basis-t before)
          http (.build (doto (HttpClient/newBuilder) (.connectTimeout (Duration/ofSeconds 5))))
          client-id (str "idle-proof-" (UUID/randomUUID))
          responses (mapv
            (fn [i]
              (let [body {"sourceK" nil "span" 1 "position" 1 "operationId" (str (UUID/randomUUID))
                          "attemptId" (str (UUID/randomUUID)) "clientId" client-id "sendSequence" i
                          "assignRecordTime" true "rows" [] "newIds" [] "claims" [] "live" [(str "idle-missing-" client-id)]}
                    request (-> (HttpRequest/newBuilder (URI/create (str "http://127.0.0.1:8080/v1/db/" name "/transact")))
                                (.timeout (Duration/ofSeconds 10)) (.header "Content-Type" "application/json")
                                (.POST (HttpRequest$BodyPublishers/ofString (json/write-str body))) (.build))
                    response (.send http request (HttpResponse$BodyHandlers/ofString))
                    result (json/read-str (.body response))]
                (when-not (and (= 409 (.statusCode response)) (= "CasConflict" (get result "code")))
                  (throw (ex-info "Idle request did not reach the serial missing-live refusal" {:status (.statusCode response) :body result})))
                {:status (.statusCode response) :code (get result "code")})) (range 1 26))
          after @(d/sync conn) after-t (d/basis-t after)
          log-rows (vec (d/tx-range (d/log conn) (inc before-t) nil))]
      (when-not (and (= before-t after-t) (empty? log-rows))
        (throw (ex-info "Refused HTTP calls changed native log" {:before before-t :after after-t})))
      (println (json/write-str {:schema "triplex.idle-refusal.v1" :run (get input "run") :slot (get input "slot")
                  :source (get input "source") :scope scope-text :requestHash (schema/sha256 text)
                  :startedAt started :endedAt (System/currentTimeMillis) :beforeT before-t :afterT after-t
                  :transactions (count log-rows) :datoms (reduce + 0 (map #(count (:data %)) log-rows)) :responses responses}))
      (shutdown-agents)
      (System/exit 0))
    (catch Throwable e (.printStackTrace e) (System/exit 1))))
