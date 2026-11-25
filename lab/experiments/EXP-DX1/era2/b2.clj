(ns era2-b2
  "[DX-ERA2 fifth pass] The derived-copies review's B2 (era5/REVIEW.md at a8213bc33): one removal left pending anywhere
  in a database stops the deletion of every published removal's key. Rebuilt with no dependency on the removal
  builder's own namespaces, so it runs on any gateway source that has the sealed scope (DX-ERASE1): this branch's head
  in every mode, and the merged line (exp/DX-INT1) with every option off, under today's database-wide rule.
  In process: the gateway's route handler, an in-memory Datomic, the file removal authority, a SEALED protected scope,
  the shred grace from TRIPLEX_ERASURE_SHRED_GRACE_MS (set it above 0). For each stop:
    R1 removes X (account a) and is published; R2 removes Z (account c) and stops (between its native commit and its
    publication, or before its native commit); a read of Z and a save of account b are sent; the shred pass runs every
    250 ms until R1's publication + grace + 3 s; then R1's key file must be gone. Then R2 is resent and the time until
    R1's key is deleted is measured. A control runs the same without R2.
  Prints one ERA2_B2 line per run; the check `a published removal's key is deleted within its grace + 3 s` is the gate."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.privacy :as privacy] [triplex.gateway.envelope :as envelope] [triplex.gateway.erase :as erase]
            [triplex.gateway.selftest :as selftest] [triplex.gateway.storage :as storage] [triplex.gateway.main :as main]
            [wfix1-regression :as offers])
  (:import [java.util UUID]))

(def per-account? (= "1" (System/getenv "TX2_REMOVAL_PER_ACCOUNT")))
(def results (atom []))
(defn check! [label ok message detail]
  (swap! results conj {:label label :ok (boolean ok) :message message})
  (when-not ok (println "FAIL" label message (pr-str detail))))

(defn- row* [id e attr val tx & [type]]
  {:id id :entity_id e :entity_type type :attribute attr :value_type "string" :value_string val
   :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})
(defn frame
  "One save of `value` on `owner`'s :v (a new assertion whose ID is `command`), with its journal."
  [command owner value]
  (let [tx (str "_tx/" command)
        fact (row* command owner ":v" value tx)
        j (fn [suffix a] (row* (str command "/" suffix) tx a nil tx "_Transaction"))
        change (json/write-str {"op" "assert" "tripleId" command "entityId" owner "attribute" ":v"
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

(defn- erase [name command owner]
  (offers/route name "v2" "erase" {"commandId" command "selectors" [{"entityId" owner "attribute" ":v"}]}))
(defn- key-present? [name id] (privacy/exists? (envelope/key-file name id)))
(defn- shred-now! [] (#'envelope/maintain-keys!))
(def worker? (some? (System/getenv "TX2_REMOVAL_WORKER_COMPLETE_MS")))
(defn- now [] (System/currentTimeMillis))

(defn run-one [stop]
  (offers/in-scope
    (fn [name conn]
      (let [label (str "B2/" (if per-account? "per-account" "database-wide") "/" (clojure.core/name stop))
            _ (check! label (= 200 (:status (offers/route name "v2" "protection" {"attributes" [":v"] "sealed" true}))) "sealed protection" nil)
            _ (when per-account?
                (check! label (= 200 (:status (offers/route name "v2" "removal-per-account" {}))) "moved per account" nil))
            x "acct/a/one" z "acct/c/one" b "acct/b/one"
            ix (str "b2-x-" (UUID/randomUUID)) iz (str "b2-z-" (UUID/randomUUID))
            _ (check! label (= 200 (:status (offers/send name (frame ix x "x-secret")))) "seed x" nil)
            _ (check! label (= 200 (:status (offers/send name (frame iz z "z-secret")))) "seed z" nil)
            r1 (erase name "b2-r1" x)
            published (now)
            r2 (case stop
                 :control nil
                 :at-publish (with-redefs [privacy/publish! (fn [& _] (throw (ex-info "stopped at publication" {})))]
                               (offers/outcome (erase name "b2-r2" z)))
                 :before-native (with-redefs [erase/apply-native! (fn [& _] (throw (ex-info "stopped before the native commit" {})))]
                                  (offers/outcome (erase name "b2-r2" z))))
            pending-after-r2 (some? (privacy/pending name))
            contacts {:read-z (offers/outcome (offers/route name "v1" "read" {"entityIds" [z]}))
                      :save-b (offers/outcome (offers/send name (frame (str "b2-b-" (UUID/randomUUID)) b "b-plain")))}
            ;; ERA2_B2_HOLD_MS (default 3000): how long past the grace the key is waited for while R2 stays pending
            hold (Long/parseLong (or (System/getenv "ERA2_B2_HOLD_MS") "3000"))
            due (+ published envelope/grace-ms hold)
            gone-at (loop []
                      (shred-now!)
                      (cond (not (key-present? name ix)) (now)
                            (>= (now) due) nil
                            :else (do (Thread/sleep 250) (recur))))
            still-pending (some? (privacy/pending name))
            ;; with the worker's completion on, R2 itself is completed by a pass and its own key goes after its grace
            z-key-gone (when (and worker? (not= stop :control))
                         (let [limit (+ (now) envelope/grace-ms 8000)]
                           (loop [] (shred-now!)
                             (cond (not (key-present? name iz)) true
                                   (>= (now) limit) false
                                   :else (do (Thread/sleep 250) (recur))))))
            resent (when (and (not= stop :control) (nil? gone-at)) (offers/outcome (erase name "b2-r2" z)))
            gone-after (or gone-at
                           (let [limit (+ (now) 10000)]
                             (loop [] (shred-now!)
                               (cond (not (key-present? name ix)) (now)
                                     (>= (now) limit) nil
                                     :else (do (Thread/sleep 100) (recur))))))
            row {:grace-ms envelope/grace-ms :r1 (offers/outcome r1) :r2 r2 :r2-pending pending-after-r2
                 :contacts contacts :r2-still-pending-after-the-wait still-pending
                 :held-past-grace-ms hold :r1-key-deleted-ms-after-publication (when gone-at (- gone-at published))
                 :r2-resent resent
                 :r1-key-deleted-ms-after-publication-with-the-resend (when gone-after (- gone-after published))
                 :outlived-grace-ms (when gone-after (max 0 (- gone-after published envelope/grace-ms)))
                 :worker-completes worker? :r2-key-deleted-by-the-worker z-key-gone}]
        (println "ERA2_B2" (pr-str [label row]))
        (check! label (some? gone-at) "a published removal's key is deleted within its grace + the hold, whatever else is pending" row)
        (when (and worker? (not= stop :control))
          (check! label (not still-pending) "the worker completed the removal left pending" row)
          (check! label (true? z-key-gone) "the worker's completion published it and its key went after its grace" row))))))

(defn main []
  (doseq [stop (if per-account? [:control :at-publish] [:control :at-publish :before-native])]
    (try (run-one stop)
         (catch Throwable t (check! (str "B2/" (name stop)) false (str "stopped: " (.getMessage t)) nil))))
  (let [failed (remove :ok @results)]
    (println "ERA2_B2_SUMMARY" (pr-str {:checks (count @results) :failed (count failed)
                                        :source (System/getenv "ERA2_B2_SOURCE")}))
    (shutdown-agents)
    (System/exit 0)))
