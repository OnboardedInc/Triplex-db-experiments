;; [DX-XQ3] Count toy only: adds bare entity IDs (no rows, no Triplex position) to a disposable scope so that one
;; account's ID range spans many index segments, then asks for an indexing job so the IDs are in stored segments.
;; Never run against a database that matters: these transactions bypass Triplex's commit function.
;; Environment: XQ3_URI (peer URI of the scope), XQ3_ACCOUNT, XQ3_FROM, XQ3_COUNT, XQ3_PLACEMENTS (per subject),
;; XQ3_TAG (the placement letter, default p; a second run with another letter interleaves new IDs among old ones).
(require '[datomic.api :as d])
(let [uri (System/getenv "XQ3_URI") account (System/getenv "XQ3_ACCOUNT")
      from (Long/parseLong (System/getenv "XQ3_FROM")) n (Long/parseLong (System/getenv "XQ3_COUNT"))
      placements (Long/parseLong (or (System/getenv "XQ3_PLACEMENTS") "0"))
      tag (or (System/getenv "XQ3_TAG") "p")
      conn (d/connect uri) start (System/nanoTime)]
  (doseq [batch (partition-all 2000 (range from (+ from n)))]
    @(d/transact conn (vec (for [i batch
                                 id (cons (format "acct/%s/pl:%08d" account i)
                                          (map #(format "acct/%s/pl:%08d:%s%d" account i tag %) (range placements)))]
                             {:db/id (d/tempid :db.part/user) :triplex.entity/id id}))))
  (let [t (d/basis-t (d/db conn))]
    (d/request-index conn)
    (println (pr-str {:account account :from from :count n :placements placements :tag tag :t t
                      :indexed (not= ::timeout (deref (d/sync-index conn t) 600000 ::timeout))
                      :ms (quot (- (System/nanoTime) start) 1000000)})))
  (shutdown-agents)
  (System/exit 0))
