(require '[clojure.data.json :as json]
         '[clojure.string :as string]
         '[datomic.api :as d])

;; [DX-BM1] Why: count the actual native transaction suffix on the owned lean database.
;; Rejected: the legacy HTTP projector (disabled for lean), or pricing only application journal rows.
(let [[name low high] *command-line-args*
      low (Long/parseLong low)
      high (Long/parseLong high)
      template (System/getenv "DATOMIC_URI_TEMPLATE")
      _scope (assert (and (re-matches #"s2-[a-zA-Z0-9_-]+" name)
                     template (string/includes? template "{db}")
                     (<= 0 low high) (<= (- high low) 10000000)))
      connection (d/connect (string/replace template "{db}" name))
      database @(d/sync connection high)
      _basis (assert (>= (d/basis-t database) high))
      operation-attribute (d/entid database :triplex.tx/operation-id)
      position-attribute (d/entid database :triplex.tx/position)
      _schema (assert (and operation-attribute position-attribute))
      suffix (d/tx-range (d/log connection) (inc low) (inc high))
      records
      (mapv (fn [{:keys [t data]}]
              (let [adds (count (filter :added data))
                    claims (filter #(and (:added %) (= (:a %) operation-attribute)) data)
                    positions (into {} (for [row data
                                             :when (and (:added row) (= (:a row) position-attribute))]
                                         [(:e row) (:v row)]))]
                {:t (str t) :datoms (count data) :adds adds :retracts (- (count data) adds)
                 :claims (mapv (fn [row] {:operation (:v row) :position (get positions (:e row))}) claims)}))
            suffix)]
  (println (str "BM1_SIZE_JSON " (json/write-str {:database name :low (str low) :high (str high)
                                                :basis (str (d/basis-t database)) :records records}))))
