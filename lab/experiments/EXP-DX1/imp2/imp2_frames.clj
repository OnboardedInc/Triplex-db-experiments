(ns imp2-frames
  "Subjects and the SDK's framing of one commit, for the whole-subject gate and the option-off digest. Uses only
  gateway functions that exist on the base, so the same file runs against the base sources."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.selftest :as rows] [triplex.gateway.storage :as storage]))

;; ---------------------------------------------------------------- subjects

(def value-chars 57)
(defn text [& parts]
  (let [s (str (str/join "-" parts) "|")] (subs (str s (apply str (repeat value-chars "v"))) 0 value-chars)))

(defn subject
  "One subject of n facts (n >= 3) on three entities, as the lab's deep subjects are shaped: a root that refers to a
  profile and a document, the profile holding most fields. Facts are {:e :a :type :v}."
  [tag i n]
  (let [root (str "acct/" tag "/pl:" i) profile (str root "/wk") doc (str root "/doc")]
    {:root root :entities [root profile doc] :n n
     :facts (vec (concat [{:e root :a ":person/profile" :type "ref" :v profile}
                          {:e root :a ":person/file" :type "ref" :v doc}
                          {:e doc :a ":file/name" :type "string" :v (text tag i "doc")}]
                         (for [k (range (- n 3))]
                           {:e (if (zero? (mod k 5)) root profile) :a (str ":person/f" k) :type "string" :v (text tag i k)})))}))

;; ---------------------------------------------------------------- frames (the SDK's framing of one save)

(def alphabet "0123456789ABCDEFGHJKMNPQRSTVWXYZ")
(defn- base32 [n width]
  (let [s (loop [n n acc ()] (if (zero? n) (apply str acc) (recur (quot n 32) (cons (.charAt alphabet (rem n 32)) acc))))]
    (str (apply str (repeat (- width (count s)) "0")) s)))
(defn block
  "A wide ordered identity block (26-character IDs, 4,096 per block), as `wideOrderedSaveIdentity` mints."
  [n] (let [t (str "01" (base32 n 21))] {:tx (str "_tx/" t "W00") :id #(do (assert (< % 4096)) (str t (format "%03X" %)))}))

(defn row [id e entity-type attr type value tx clock]
  (cond-> {:id id :entity_id e :entity_type entity-type :attribute attr :value_type type
           :valid_from 0.0 :recorded_at clock :recorded_position 1 :schema_version 1 :tx_id tx}
    (#{"string" "ref"} type) (assoc :value_string value)))

(defn change [id {:keys [e a type v]} tx clock]
  {"op" "assert" "tripleId" id "entityId" e "attribute" a "value" {"type" type "value" v}
   "validFrom" 0.0 "recordedAt" clock "assertionTxId" tx})

(defn frame
  "One commit carrying `facts` (first writes) on `entities`: the business rows, one journal change per fact, the four
  fixed journal rows and one changed-entity row per entity. `class` nil sends no writeClass (a save), else the class."
  [{:keys [facts entities command id-block source clock class]}]
  (let [{:keys [tx id]} id-block n (volatile! -1) next-id #(id (vswap! n inc))
        business (mapv (fn [{:keys [e a type v]}] (row (next-id) e nil a type v tx clock)) facts)
        j (fn [attr type value] (row (next-id) tx "_Transaction" attr type value tx clock))
        journal (-> [(assoc (j ":_tx/position" "number" nil) :value_number 1.0)
                     (assoc (j ":_tx/instant" "datetime" nil) :value_datetime clock)
                     (j ":_tx/command-id" "string" command)]
                    (into (map #(j ":_tx/changed-entity" "string" %) entities))
                    (into (map (fn [r f] (assoc (j ":_tx/change" "json" nil) :value_json (json/write-str (change (:id r) f tx clock))))
                               business facts)))
        fresh (into business journal)
        ids (mapv :id fresh)]
    ;; The SDK's default request on a lean scope: no wire rows for new rows, only their texts, in order.
    (-> (rows/row-input
          (cond-> {"sourceK" source "span" 1 "position" 1 "scopeWide" false "entities" (vec entities)
                   "operationId" (str (str/replace command "/" ".") ".op") "assignRecordTime" false
                   "rows" (mapv storage/wire-row fresh) "newIds" ids
                   "claims" [{"commandId" command "txId" tx "timestamp" clock}]}
            class (assoc "writeClass" class)))
        (assoc "rows" [] "rowMode" "texts" "rowOrder" ids))))

(defn subjects-frame [subjects opts]
  (frame (assoc opts :facts (vec (mapcat :facts subjects)) :entities (vec (mapcat :entities subjects)))))

(defn head [conn] (storage/head-position (d/db conn)))

