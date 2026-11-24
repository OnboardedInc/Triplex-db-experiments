(ns era2-paired
  "[DX-ERA2] One fixed sequential workload with removals on request (seeds, saves on both writers, removals, a ticketed
  derived write, a refused one, an import replay refused by its removed field, reads), unsealed and sealed, in an
  in-memory database with a file removal authority. Prints the native log as one SHA-256 over every datom (time-of-day
  values, random removal IDs and ciphertext replaced by placeholders) and every reply's status and code, so the base
  gateway and this branch's gateway (option off, and option on with the database left database-wide) can be compared.
  Uses only routes and namespaces of the base. Loaded with (load-file) after wfix1/regression.clj."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.main :as main] [triplex.gateway.selftest :as selftest] [triplex.gateway.storage :as storage]
            [triplex.gateway.group :as group] [triplex.gateway.write-policy :as policy] [wfix1-regression :as offers]))

(defn- row* [id e attr val tx & [type]]
  {:id id :entity_id e :entity_type type :attribute attr :value_type "string" :value_string val
   :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})
(defn save-frame [command owner attr value prior position]
  (let [tx (str "_tx/" command)
        fact (row* command owner attr value tx)
        retired (when prior (assoc (row* prior owner attr "client estimate" "earlier")
                                   :retracted_at 1000.0 :retracted_position 1 :retract_tx_id tx))
        j (fn [suffix a] (row* (str command "/" suffix) tx a nil tx "_Transaction"))
        change (fn [op r] (json/write-str (cond-> {"op" op "tripleId" (:id r) "entityId" owner "attribute" attr
                                                   "value" {"type" "string" "value" (:value_string r)} "validFrom" 0.0
                                                   "recordedAt" 1000.0 "assertionTxId" (:tx_id r)}
                                            (= op "retract") (assoc "retractedAt" 1000.0 "retractionTxId" tx))))
        journal (cond-> [(assoc (j "p" ":_tx/position") :value_type "number" :value_number 1.0)
                         (assoc (j "t" ":_tx/instant") :value_type "datetime" :value_datetime 1000.0)
                         (assoc (j "owner" ":_tx/changed-entity") :value_string owner)
                         (assoc (j "cmd" ":_tx/command-id") :value_string command)
                         (assoc (j "assert" ":_tx/change") :value_type "json" :value_json (change "assert" fact))]
                  retired (conj (assoc (j "retract" ":_tx/change") :value_type "json" :value_json (change "retract" retired))))
        fresh (conj journal fact)]
    (selftest/row-input
      (cond-> {"span" 1 "position" 1 "scopeWide" false "entities" [owner] "operationId" command
               "rows" (mapv storage/wire-row (cond-> fresh retired (conj retired)))
               "newIds" (mapv :id fresh) "live" (if prior [prior] [])
               "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]}
        position (assoc "sourceK" position)))))

(defn- clock? [x] (and (number? x) (<= 1.0e12 (double x) 1.0e14)))
(defn- hex-clock [s] (try (clock? (Double/longBitsToDouble (Long/parseUnsignedLong s 16))) (catch Exception _ false)))
(defn normalize [name v]
  (cond
    (clock? v) "CLOCK"
    (string? v) (-> v
                    (str/replace name "DB")
                    (str/replace #"_tx/erase-[0-9a-f-]{36}" "_tx/erase-ID")
                    (str/replace #"[0-9a-f]{64}" "HASH")
                    (str/replace #"1\.\d+E1[23]" "CLOCK")
                    (str/replace #"\b1[6-9]\d{11}(\.\d+)?\b" "CLOCK")
                    (str/replace #"[0-9a-f]{16}" #(if (hex-clock %) "HEXCLOCK" %)))
    :else v))
(defn log-digest [name conn]
  (let [db (d/db conn) ident #(d/ident db %) md (java.security.MessageDigest/getInstance "SHA-256")
        skip #{(d/entid db :db/txInstant)} key-attr (d/entid db :triplex.scope/key)
        body (d/entid db :triplex.private/body) n (volatile! 0)]
    (doseq [{:keys [t data]} (d/tx-range (d/log conn) nil nil) datom data :when (not (skip (:a datom)))]
      (vswap! n inc)
      (.update md (.getBytes (pr-str [t (:e datom) (ident (:a datom))
                                      (cond (= key-attr (:a datom)) "SCOPE" (and body (= body (:a datom))) "BODY"
                                            :else (normalize name (:v datom)))
                                      (:added datom)]) "UTF-8")))
    {:datoms @n :sha256 (format "%064x" (java.math.BigInteger. 1 (.digest md)))}))

(defn run [sealed?]
  (offers/in-scope
    (fn [name conn]
      (with-redefs [group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
        (let [replies (volatile! [])
              note (fn [label reply] (vswap! replies conj [label (:status reply) (get-in reply [:body "code"])]) reply)
              send (fn [label input] (note label (offers/send name input)))
              head #(storage/head-position (d/db conn))
              erase (fn [c o] (note c (offers/route name "v2" "erase" {"commandId" c "selectors" [{"entityId" o "attribute" ":v"}]})))
              owners ["acct/a/one" "acct/a/two" "acct/b/one" "acct/c/one"]]
          (note "protection" (offers/route name "v2" "protection" {"attributes" [":v"] "sealed" sealed?}))
          (doseq [[i o] (map-indexed vector owners)] (send (str "seed-" i) (save-frame (str "seed-" i) o ":v" (str "v-" o) nil nil)))
          ;; saves on the per-subject writer (one replacement) and the general writer (first write of another field)
          (doseq [[i o] (map-indexed vector owners)]
            (send (str "edit-" i) (save-frame (str "edit-" i) o ":v" (str "v2-" o) (str "seed-" i) (head)))
            (send (str "first-" i) (save-frame (str "first-" i) o ":w" (str "w-" o) nil (head))))
          (erase "rm-1" "acct/a/one")
          (send "after-rm" (save-frame "after-rm" "acct/b/one" ":v" "v3-b" "edit-2" (head)))
          (let [ticket (get-in (offers/route name "v2" "erasure-frontier" nil) [:body "seq"])]
            (send "derived-ok" (assoc (save-frame "derived-ok" "notice:v1:x" ":notice/body" "n1" nil nil) "erasureSeq" ticket))
            (erase "rm-2" "acct/c/one")
            (send "derived-stale" (assoc (save-frame "derived-stale" "notice:v1:y" ":notice/body" "n2" nil nil) "erasureSeq" ticket)))
          (send "replay" (assoc (save-frame "replay" "acct/a/one" ":v" "v2-acct/a/one" nil nil)
                                "erasureSeq" (get-in (offers/route name "v2" "erasure-frontier" nil) [:body "seq"]) "erasureReplay" true))
          (erase "rm-1" "acct/a/one")
          (doseq [o owners] (note (str "read-" o) (offers/route name "v1" "read" {"entityIds" [o] "history" true})))
          (let [reads (mapv (fn [o] (get-in (offers/route name "v1" "read" {"entityIds" [o] "history" true}) [:body "rows"])) owners)]
            (merge (log-digest name conn)
                   {:sealed sealed? :replies @replies
                    :reads (format "%064x" (java.math.BigInteger. 1 (.digest (java.security.MessageDigest/getInstance "SHA-256")
                                                                             (.getBytes (normalize name (json/write-str reads)) "UTF-8"))))})))))))

(defn main []
  (doseq [sealed? [false true]]
    (let [r (run sealed?)]
      (println "ERA2_PAIRED" (pr-str (dissoc r :replies)))
      (println "ERA2_PAIRED_REPLIES" sealed? (pr-str (:replies r)))))
  (shutdown-agents)
  (System/exit 0))
