(ns s5-logdigest
  "[DX-S5 third review] Is the native log of a build byte-identical to another's with every option off? One fixed
  sequence of saves (the same requests, IDs and values on every build: s5/attack3_era.clj's frame with fixed counters)
  into a fresh scope, then one SHA-256 over every datom of the log in order (entity, attribute ident, value as printed,
  added), with :db/txInstant left out and the scope's random name replaced by a constant. Prints DX-S5R3_LOG with the
  digest and counts. Run by s5/clj-run3.sh (mode logdigest) on each build's tree."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.storage :as storage] [triplex.gateway.subject-save :as subject]
            [s5-attack3-era :as era] [wfix1-regression :as reference])
  (:import [java.security MessageDigest]))

(defn- cur [name owner field]
  (let [r (reference/route name "v1" "read" {"entityIds" [owner] "basis" {"validAt" 5.0}})]
    (some (fn [row] (when (= field (get-in row ["attribute" "v"])) {:id (get-in row ["id" "v"]) :value (get-in row ["value_string" "v"])}))
          (get-in r [:body "rows"]))))

(defn main []
  (reset! @(requiring-resolve 's5-attack3-era/counter) 41000000)
  (reference/in-scope
    (fn [name conn]
      (let [outcomes (frequencies
                       (for [i (range 240)]
                         (let [s (str "acct/l1/subject/s" (mod i 20))
                               facts (for [f [":a/f0" ":a/f1" ":a/f2"]] {:owner s :field f :value (str "v" i f) :pred (cur name s f)})
                               facts (if (zero? (mod i 7))
                                       (concat facts [{:owner (str "acct/l1/profile/s" (mod i 20)) :field ":a/f0" :value (str "p" i)
                                                       :pred (cur name (str "acct/l1/profile/s" (mod i 20)) ":a/f0")}])
                                       facts)]
                           (reference/outcome (reference/send name (era/frame {:command (str "l-" i) :source (storage/head-position (d/db conn)) :facts facts}))))))
            db (d/db conn)
            md (MessageDigest/getInstance "SHA-256")
            instant (d/entid db :db/txInstant)
            txs (seq (d/tx-range (d/log conn) nil nil))
            n (volatile! 0)
            scope-key (:v (first (d/datoms db :aevt :triplex.scope/key)))
            norm (fn [^String t] (-> t (str/replace name "SCOPE") (str/replace scope-key "SCOPEKEY")))]
        (doseq [{:keys [data]} txs, x data :when (not= instant (:a x))]
          (vswap! n inc)
          (let [text (norm (pr-str [(:e x) (d/ident db (:a x)) (:v x) (:added x)]))
                one (MessageDigest/getInstance "SHA-256")]
            (.update md (.getBytes ^String text "UTF-8"))
            ;; One line per datom (its own digest and its first 160 characters), so two builds' logs can be diffed.
            (println "DX-S5R3_DATOM" @n (subs (apply str (map #(format "%02x" %) (.digest one (.getBytes ^String text "UTF-8")))) 0 16)
                     (subs text 0 (min 160 (count text))))))
        (println "DX-S5R3_LOG" (json/write-str {:outcomes (into {} (map (fn [[k v]] [(str k) v]) outcomes)) :transactions (count txs)
                                                :datoms @n :digest (apply str (map #(format "%02x" %) (.digest md)))
                                                :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv)))})))))
  (shutdown-agents)
  (System/exit 0))
