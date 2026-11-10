(ns dxb8.head-test
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.main :as main] [triplex.gateway.scope :as scope]
            [triplex.gateway.storage :as storage] [triplex.gateway.schema :as schema] [triplex.gateway.commit :as commit] [triplex.gateway.reach :as reach]))

;; [DX-B8] Why: exercise the actual stored function on empty, span, marker and legacy cuts.
;; Rejected: mocking reverse index seeks (would miss transactor API restrictions).
(defn commit! [conn e span times replay-safe]
  @(d/transact conn [[:triplex/commit {:scope e :source nil :provisional span :span span
                                      :lean true :live [] :entities [] :ops [{:db/id "datomic.tx" :triplex.tx/position [:triplex/position span]}]
                                      :times times :replay-safe replay-safe :journal-entities []}]]))
(deftest immutable-head
  (let [key (str "[\"triplex-scope-v1\",\"test\",\"test\",\"b8-" (java.util.UUID/randomUUID) "\",0]")
        name (:db (main/create-scope! main/uri-template key "lean" true))
        conn (main/connection (main/db-uri name)) e (d/entid (d/db conn) [:triplex.scope/key key])]
    (try
      (is (= 0 (storage/head-position name (d/db conn))))
      (let [first-report (commit! conn e 4 [100.0] true) first-db (:db-after first-report)]
        (is (= 4 (storage/head-position name first-db)))
        (is (= 100.0 (scope/max-recorded-at first-db e)))
        (is (= 0 (scope/value first-db e :triplex.scope/position)))
        (is (nil? (scope/value first-db e :triplex.scope/max-recorded-at)))
        ;; A non-commit basis must take reverse AEVT, on the peer and in the stored function.
        @(d/transact conn [[:db/add e :triplex.scope/feed-irregular true]])
        (is (= 4 (storage/head-position name (d/db conn))))
        (is (= 4 (second (reach/select-db name (d/db conn) nil))))
        (let [second-report (commit! conn e 3 [] true) second-db (:db-after second-report)]
          (let [marker-t (dec (d/basis-t second-db)) cut (d/as-of second-db marker-t)
                original d/rseek-datoms calls (atom [])]
            (with-redefs [d/rseek-datoms (fn [db index & components]
                                         (swap! calls conj [index components])
                                         (apply original db index components))]
              (is (= 4 (storage/head-position name cut)))
              (is (= [[:aevt (list :triplex.tx/position (d/t->tx marker-t))]] @calls))))
          (is (= 7 (storage/head-position name second-db)))
          (is (= 100.0 (scope/max-recorded-at second-db e)))
          (is (= 4 (storage/head-position name first-db)))
          (is (= 4 (storage/head-position name (d/as-of second-db (d/basis-t first-db)))))
          (is (thrown? Exception (commit! conn e 1 [100.0] true)))
          (is (= 7 (storage/head-position name (d/db conn))))
          (commit! conn e 1 [101.0] true)
          (is (= 8 (storage/head-position name (d/db conn))))
          (is (= 101.0 (scope/max-recorded-at (d/db conn) e)))
          (is (= 1 (count (seq (d/datoms (d/history (d/db conn)) :eavt e :triplex.scope/position)))))
          (is (empty? (d/datoms (d/history (d/db conn)) :eavt e :triplex.scope/max-recorded-at)))))
      (finally (main/delete-scope! main/uri-template key)))))
(deftest legacy-head
  (let [key (str "[\"triplex-scope-v1\",\"test\",\"test\",\"b8-old-" (java.util.UUID/randomUUID) "\",0]")
        name (:db (main/create-scope! main/uri-template key))
        conn (main/connection (main/db-uri name)) e (d/entid (d/db conn) [:triplex.scope/key key])]
    (try
      (is (not (scope/head-v2? (d/db conn) e)))
      (commit! conn e 2 [20.0] false)
      (is (= 2 (storage/head-position name (d/db conn))))
      (is (= 2 (scope/value (d/db conn) e :triplex.scope/position)))
      (is (= 20.0 (scope/value (d/db conn) e :triplex.scope/max-recorded-at)))
      (is (= 20.0 (scope/max-recorded-at (d/db conn) e)))
      (finally (main/delete-scope! main/uri-template key)))))
(deftest pre-version-schema
  ;; [DX-B8] Why: historical db values can predate the head-version attribute itself.
  ;; Rejected: checking only a missing marker on a freshly installed v2 schema.
  (let [uri (str "datomic:mem://b8-old-schema-" (java.util.UUID/randomUUID)) key "old-scope"]
    (d/create-database uri)
    (let [conn (d/connect uri)]
      (try
        @(d/transact conn (remove #(= :triplex.scope/head-version (:db/ident %)) schema/schema))
        @(d/transact conn [{:triplex.scope/key key :triplex.scope/position 9}])
        (let [old-db (d/db conn) e (d/entid old-db [:triplex.scope/key key])]
          (is (nil? (d/entid old-db :triplex.scope/head-version)))
          (is (= 9 (storage/head-position old-db)))
          @(d/transact conn schema/schema)
          (commit/install! conn key)
          (commit! conn e 1 [20.0] false)
          (is (= 10 (storage/head-position (d/db conn))))
          (is (= 9 (storage/head-position old-db)))
          (is (not (scope/head-v2? (d/db conn) e))))
        (finally (d/delete-database uri) (d/release conn))))))
(defn -main [& _]
  (let [{:keys [fail error] :as result} (run-tests 'dxb8.head-test)]
    (println (json/write-str result)) (shutdown-agents)
    (System/exit (if (zero? (+ fail error)) 0 1))))
