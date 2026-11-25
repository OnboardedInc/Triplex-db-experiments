(ns era2-source-tag
  "[DX-ERA2 fifth pass] The derived-copies builder's liveness finding, self-contained so it runs on any line (this branch,
  and the account-ticket line where a delivery naming its source's accounts goes through source-ticket!): a removal in
  the SOURCE database stopped after its declaration; a delivery from it into another database, naming the source's
  account of the removed subject (and, as a control, naming none). The delivery must be refused 503 and the source's
  removal completed by that refusal (nothing pending, published as 1); a second try is then served. Run with
  TX2_REMOVAL_PER_ACCOUNT=1 (and TX2_ACCOUNT_TICKETS=1 on the account-ticket line); file authority; in-memory Datomic.
  Prints ERA2_SOURCE_TAG lines; exits 1 on a failed check."
  (:require [clojure.data.json :as json] [datomic.api :as d] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.selftest :as selftest] [triplex.gateway.storage :as storage] [wfix1-regression :as offers])
  (:import [java.util UUID]))

(def results (atom []))
(defn check! [label ok message detail]
  (swap! results conj {:ok (boolean ok)})
  (when-not ok (println "FAIL" label message (pr-str detail))))
(defn- row* [id e attr val tx & [type]]
  {:id id :entity_id e :entity_type type :attribute attr :value_type "string" :value_string val
   :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})
(defn frame [command owner attr value]
  (let [tx (str "_tx/" command) fact (row* command owner attr value tx)
        j (fn [suffix a] (row* (str command "/" suffix) tx a nil tx "_Transaction"))
        change (json/write-str {"op" "assert" "tripleId" command "entityId" owner "attribute" attr
                                "value" {"type" "string" "value" value} "validFrom" 0.0 "recordedAt" 1000.0 "assertionTxId" tx})
        rows [(assoc (j "p" ":_tx/position") :value_type "number" :value_number 1.0)
              (assoc (j "t" ":_tx/instant") :value_type "datetime" :value_datetime 1000.0)
              (assoc (j "owner" ":_tx/changed-entity") :value_string owner)
              (assoc (j "cmd" ":_tx/command-id") :value_string command)
              (assoc (j "assert" ":_tx/change") :value_type "json" :value_json change)
              fact]]
    (selftest/row-input {"span" 1 "position" 1 "scopeWide" false "entities" [owner] "operationId" command
                         "rows" (mapv storage/wire-row rows) "newIds" (mapv :id rows) "live" []
                         "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]})))
(defn- scope! [name]
  (check! "setup" (= 200 (:status (offers/route name "v2" "protection" {"attributes" [":v"] "sealed" false}))) "protection" nil)
  (check! "setup" (= 200 (:status (offers/route name "v2" "removal-per-account" {}))) "per account" nil))

(defn run-one [variant]
  (offers/in-scope
    (fn [source sconn]
      (offers/in-scope
        (fn [other _]
          (scope! source) (scope! other)
          (let [label (str "source-tag/" (clojure.core/name variant))
                _ (check! label (= 200 (:status (offers/send source (frame (str "st-a-" (UUID/randomUUID)) "acct/a/one" ":v" "a-secret")))) "seed" nil)
                declare (resolve 'triplex.gateway.removal-commit/declare!)
                orig @declare
                stopped (with-redefs-fn {declare (fn [& args] (let [r (apply orig args)] (throw (ex-info "stopped after its declaration" {})) r))}
                          #(offers/route source "v2" "erase" {"commandId" "st-rm" "selectors" [{"entityId" "acct/a/one" "attribute" ":v"}]}))
                pending (some? (privacy/pending source))
                ticket (:seq (privacy/cut source (d/db sconn) true))
                delivery (fn [k] (cond-> (assoc (frame (str "st-d-" k "-" (UUID/randomUUID)) (str "notice:v1:st-" (UUID/randomUUID)) ":notice/body" "delivered")
                                                "erasureSourceDatabase" source "erasureSeq" ticket)
                                   (= variant :naming-accounts) (assoc "erasureAccounts" ["a"])))
                first-try (offers/send other (delivery 1))
                after {:pending (some? (privacy/pending source)) :published (:seq (privacy/cut source (d/db sconn) true))}
                second-try (offers/send other (assoc (delivery 2) "erasureSeq" (:published after)))
                obs {:stopped (offers/outcome stopped) :pending-before pending :first-try (offers/outcome first-try)
                     :message (get-in first-try [:body "message"]) :after-first-try after :second-try (offers/outcome second-try)}]
            (println "ERA2_SOURCE_TAG" (pr-str [variant obs]))
            (check! label pending "the source's removal stopped after its declaration is pending" obs)
            (check! label (= 503 (:status first-try)) "the delivery is refused 503 while it is pending" obs)
            (check! label (not (:pending after)) "the refusal completed the source's removal" obs)
            (check! label (= 1 (:published after)) "published as 1" obs)
            (check! label (= 200 (:status second-try)) "the delivery's next try is served" obs)))))))

(defn main []
  (doseq [v [:naming-accounts :naming-none]]
    (try (run-one v) (catch Throwable t (check! (str "source-tag/" (name v)) false (str "stopped: " (.getMessage t)) nil))))
  (let [failed (count (remove :ok @results))]
    (println "ERA2_SOURCE_TAG_SUMMARY" (pr-str {:checks (count @results) :failed failed}))
    (shutdown-agents) (System/exit (if (zero? failed) 0 1))))
