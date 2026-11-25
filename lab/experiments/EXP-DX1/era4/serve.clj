;; [DX-ERA4] T1 (era4/DERIVED-COPIES.md section 2): this checkout's gateway on an in-memory Datomic for era4/derived.ts.
;; On /out/dump-request-<n> it writes /out/dump-<n>.jsonl: every string value of every datom of every database (history
;; included: row texts, packed journals, sealed bodies), plus every sealed protected body it can still open with the keys
;; the store holds ("opened:protected"); then /out/dump-done-<n>. /out/stop ends it.
(require '[triplex.gateway.main :as main] '[datomic.api :as d] '[clojure.data.json :as json]
         '[clojure.java.io :as io] '[triplex.gateway.envelope :as envelope] '[triplex.gateway.scope :as scope])
(import '[java.io File])

(future (main/serve! main/handler 8080))

(defn- line! [^java.io.Writer w m] (.write w (json/write-str m)) (.write w "\n"))

(defn dump! [tag]
  (with-open [w (io/writer (str "/out/dump-" tag ".jsonl"))]
    (doseq [name (sort (d/get-database-names (main/db-uri "*"))) :when (not= name "tx2-health")]
      (let [db (d/db (d/connect (main/db-uri name)))]
        (doseq [datom (d/datoms (d/history db) :eavt) :when (string? (:v datom))]
          (line! w {"db" name "a" (str (d/ident db (:a datom))) "v" (:v datom)}))
        (when (d/entid db :triplex.private/id)
          (doseq [datom (d/datoms db :aevt :triplex.private/id)]
            (let [e (:e datom) id (:v datom)
                  clear (try (envelope/decode! name db id (scope/value db e :triplex.private/entity)
                                               (scope/value db e :triplex.private/attribute) (envelope/token id))
                             (catch Exception _ nil))]
              (when clear (line! w {"db" name "a" "opened:protected" "v" (str clear)})))))))))

(loop [n 0]
  (cond
    (.exists (File. (str "/out/dump-request-" n)))
    (do (dump! (str n)) (spit (str "/out/dump-done-" n) "ok") (recur (inc n)))
    (.exists (File. "/out/stop")) (System/exit 0)
    :else (do (Thread/sleep 200) (recur n))))
