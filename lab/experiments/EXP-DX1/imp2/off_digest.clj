(ns imp2-off-digest
  "Gate (a): with TX2_IMPORT_WHOLE_SUBJECT unset, an import stores byte for byte what the base stores. The same
  scenario runs against the base sources and this branch's sources (each in a fresh JVM and memory database); the
  runner compares the printed digests."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [wfix1-regression :as reference] [imp2-frames :refer :all])
  (:import [java.security MessageDigest] [java.util HexFormat]))

(defn- sha [^String s] (.formatHex (HexFormat/of) (.digest (MessageDigest/getInstance "SHA-256") (.getBytes s "UTF-8"))))

(defn run []
  (let [scope (json/write-str ["triplex-scope-v1" "test" "imp2-off" "fixed-off-digest" 0])
        name (:db (main/create-scope! nil scope "lean" true true))
        conn (main/connection (main/db-uri name))
        since (d/basis-t (d/db conn))
        clock (atom 1000.0) blocks (atom 0)
        sizes [20 46 47 160 500 8 12 9]
        subjects {"import" (vec (map-indexed (fn [i n] (subject "imp2-off" i n)) sizes))
                  nil (vec (map-indexed (fn [i n] (subject "imp2-off-save" i n)) sizes))}
        runs [[0] [1] [2] [3] [4] [5 6 7]]
        sent (vec (for [[k run] (map-indexed vector runs) class ["import" nil]]
                    (let [input (subjects-frame (mapv (subjects class) run)
                                                {:command (str "off-" k "-" (or class "save")) :id-block (block (swap! blocks inc))
                                                 :source (head conn) :clock (swap! clock inc) :class class})
                          r (reference/send name input)]
                      {:frame k :class class :request (sha (json/write-str input)) :status (:status r)
                       :code (get-in r [:body "code"]) :position (get-in r [:body "position"])})))
        instant (d/entid (d/db conn) :db/txInstant)
        datoms (for [{:keys [data]} (d/tx-range (d/log conn) (inc since) nil) dt data :when (not= instant (:a dt))]
                 (str (:e dt) "|" (:a dt) "|" (pr-str (:v dt)) "|" (:tx dt) "|" (:added dt)))
        options (-> (reference/route name "v1" "write-options" nil) :body (dissoc "database" "attempt" "t" "position"))]
    (println "DX-IMP2_OFF" (json/write-str {:sent sent :datoms (count datoms) :log (sha (str/join "\n" datoms))
                                            :writeOptions (sha (json/write-str (into (sorted-map) options)))
                                            :writeOptionKeys (sort (keys (get options "options"))) :writeOptionsBody (into (sorted-map) options)}))
    (main/delete-scope! nil scope)))

(defn -main [& _]
  (with-redefs [main/uri-template "datomic:mem://{db}"] (run))
  (shutdown-agents)
  (System/exit 0))

