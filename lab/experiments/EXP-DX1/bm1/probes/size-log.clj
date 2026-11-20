(require '[clojure.data.json :as json]
         '[clojure.string :as string]
         '[datomic.api :as d]
         '[datomic.index-direct-metrics :as index])

;; [DX-BM1] Why: count the actual native transaction suffix on the owned lean database.
;; Rejected: the legacy HTTP projector (disabled for lean), or pricing only application journal rows.
(let [[mode name low high] *command-line-args*
      low (Long/parseLong low)
      high (Long/parseLong high)
      template (System/getenv "DATOMIC_URI_TEMPLATE")
      _scope (assert (and (re-matches #"s2-[a-zA-Z0-9_-]+" name)
                     template (string/includes? template "{db}")
                     (<= 0 low high) (<= (- high low) 10000000)))
      connection (d/connect (string/replace template "{db}" name))
      database (if (= mode "indexed")
                 (deref (d/sync-index connection high) 90000 nil)
                 (deref (d/sync connection high) 30000 nil))
      _basis (assert (and database (>= (d/basis-t database) high)))
      result
      (case mode
        ("current" "indexed")
        (let [t (.-indexBasisT ^datomic.db.Db database)
              metrics (index/direct-metrics database)]
          (assert (and (pos? (:IndexSegments metrics)) (pos? (:IndexDatoms metrics))))
          (when (= mode "indexed") (assert (<= high t)))
          {:indexedT (str t) :segments (:IndexSegments metrics) :indexDatoms (:IndexDatoms metrics)})
        "log"
        (let [operation-attribute (d/entid database :triplex.tx/operation-id)
              position-attribute (d/entid database :triplex.tx/position)
              _schema (assert (and operation-attribute position-attribute))
              suffix (d/tx-range (d/log connection) (inc low) (inc high))]
          {:records (mapv (fn [{:keys [t data]}]
              (let [adds (count (filter :added data))
                    claims (filter #(and (:added %) (= (:a %) operation-attribute)) data)
                    positions (into {} (for [row data
                                             :when (and (:added row) (= (:a row) position-attribute))]
                                         [(:e row) (:v row)]))]
                {:t (str t) :datoms (count data) :adds adds :retracts (- (count data) adds)
                 :claims (mapv (fn [row] {:operation (:v row) :position (get positions (:e row))}) claims)}))
            suffix)}))]
  (println (str "BM1_SIZE_JSON " (json/write-str (assoc result :database name :low (str low) :high (str high)
                                                  :basis (str (d/basis-t database)) :mode mode)))))

;; [DX-BM1] Why: this disposable peer owns one checked request and has finished its only output.
;; Rejected: waiting for peer executor threads after the index record has already been written.
(flush)
(System/exit 0)
