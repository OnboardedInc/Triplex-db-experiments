(ns triplex.gateway.feed-live
  (:require [datomic.api :as d] [clojure.edn :as edn] [triplex.gateway.main :as main]
            [triplex.gateway.feed :as feed])
  (:import [java.util UUID]))

;; [EXP-DF01] Why: two separate JVM invocations prove the queue cannot supply resumed data.
;; Rejected: calling release/connect in one JVM and labeling it a peer restart.
(defn ensure! [ok message] (when-not ok (throw (ex-info message {}))))
(defn prepare! [file]
  (ensure! (not (.exists (java.io.File. file))) "Refuse existing live evidence")
  (let [scope (str "[\"triplex-scope-v1\",\"test\",\"df01\",\"" (UUID/randomUUID) "\",0]")
        created (main/create-scope! main/uri-template scope) db (:db created)
        conn (main/connection (main/db-uri db))
        report @(d/transact conn [{:db/id "datomic.tx" :triplex.tx/position 1 :triplex.tx/id "df01-tx"
                                  :triplex.tx/operation-id "df01-op" :triplex.tx/recorded-at 7000.0}
                                 {:db/id "subject" :triplex.entity/id "subject"}
                                 {:db/id "attribute" :triplex.attr/key "status"}
                                 {:db/id "fact" :f/id "df01-fact" :f/subject "subject" :f/attr "attribute"
                                  :f/asserted-in "datomic.tx" :f/valid-from 0.0 :f/valid-to 20.0
                                  :f.v/string "synthetic-protected-value"}
                                 [:db/cas [:triplex.scope/key scope] :triplex.scope/position 0 1]])
        t (str (d/basis-t (:db-after report))) page (feed/log-page conn {"fromT" t})
        fid (d/entid (:db-after report) [:f/id "df01-fact"])
        excision @(d/transact conn [{:db/id (d/tempid :db.part/user) :db/excise fid :db.excise/attrs [:f.v/string]}])
        excision-t (d/basis-t (:db-after excision))
        sync-excise (or (ns-resolve 'datomic.api 'sync-excise) (throw (Exception. "Peer lacks sync-excise; keep scratch database for diagnosis")))]
    (ensure! (= {:t t :kind "commit" :transaction {:positions ["1"] :txIds ["df01-tx"] :operationId "df01-op" :commandIds []
                                                :stamp "7000" :stampStatus "decided"
                                                :changes [{:op "assert" :entity "subject" :attribute "status" :assertionId "df01-fact"
                                                           :position "1" :validFrom 0.0 :validTo 20.0}]}}
                (first (:rows page))) "Initial page does not match the independently authored identity fixture")
    (ensure! (seq (System/getenv "GATEWAY_SOURCE_SHA256")) "Missing deployed source binding")
    (d/request-index conn)
    (ensure! (not= ::timeout (deref (sync-excise conn excision-t) 120000 ::timeout)) "Excision deadline exceeded")
    (ensure! (nil? (d/q '[:find ?v . :in $ ?f :where [?f :f.v/string ?v]] (d/history (d/db conn)) fid)) "Excised value remains in history")
    (let [again (feed/log-page conn {"fromT" t})]
      (ensure! (= (first (:rows page)) (first (:rows again))) "Identity bytes changed across excision")
      (ensure! (some #(= "skipped" (:kind %)) (:rows again)) "Excision transaction not listed as skipped")
      (spit file (pr-str {:scope scope :db db :fromT t :page again :excisionT excision-t :gatewaySource (System/getenv "GATEWAY_SOURCE_SHA256")})))
    (println (pr-str {:stage "prepared" :db db :evidence file}))))
(defn resume! [file]
  (let [{:keys [scope db fromT page gatewaySource]} (edn/read-string (slurp file))
        conn (main/connection (main/db-uri db))
        _ (ensure! (= gatewaySource (System/getenv "GATEWAY_SOURCE_SHA256")) "Resume source differs from prepare")
        _ @(d/sync conn)
        resumed (feed/log-page conn {"fromT" fromT})]
    (ensure! (= page resumed) "Restart replay bytes changed")
    (spit (str file ".resumed.edn") (pr-str resumed))
    (let [deleted (main/delete-scope! main/uri-template scope)]
      (ensure! (:deleted deleted) "Scratch database cleanup failed")
      (println (pr-str {:stage "resumed" :db db :deleted (:deleted deleted)})))))
(defn -main [stage file]
  (try
    (case stage "prepare" (prepare! file) "resume" (resume! file) (throw (Exception. "Use prepare|resume FILE")))
    (shutdown-agents)
    (System/exit 0)
    (catch Exception e (.printStackTrace e) (shutdown-agents) (System/exit 1))))
