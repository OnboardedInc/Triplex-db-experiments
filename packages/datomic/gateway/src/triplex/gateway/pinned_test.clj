(ns triplex.gateway.pinned-test
  (:require [clojure.test :refer :all] [datomic.api :as d]
            [triplex.gateway.schema :as schema] [triplex.gateway.pinned :as pinned] [triplex.gateway.group-cut]))
;; [DX-RD2] Why: the short-cut answers from the current database only when nothing about the subject can differ at the pin.
;; Rejected: testing the revision rule alone (a writer that forgot the revision must still fall back).
(defn fixture [f]
  (let [uri (str "datomic:mem://rd2-pinned-" (java.util.UUID/randomUUID))]
    (d/create-database uri)
    (let [conn (d/connect uri)]
      (try @(d/transact conn schema/schema) (f conn)
        (finally (d/delete-database uri) (d/release conn))))))
(defn save! [conn id rev add retract]
  (:db-after @(d/transact conn (cond-> [[:db/add "p" :triplex.entity/id id]]
                                 rev (conj [:db/add "p" :triplex.entity/rev rev])
                                 add (conj [:db/add "p" :triplex.entity/row add])
                                 retract (conj [:db/retract [:triplex.entity/id id] :triplex.entity/row retract])))))
(deftest unchanged-subject-reads-current
  (fixture
    (fn [conn]
      (let [db1 (save! conn "a" 1 "row-a-1" nil)
            _ (save! conn "b" 2 "row-b-1" nil)
            pin (d/basis-t (d/db conn))
            view (d/as-of (d/db conn) pin)
            _ (save! conn "b" 3 "row-b-2" "row-b-1")
            current (d/db conn)
            a (d/entid current [:triplex.entity/id "a"]) b (d/entid current [:triplex.entity/id "b"])]
        (is db1)
        (testing "a subject whose revision and datoms predate the pin"
          (is (pinned/unchanged-since? current a pin 2)))
        (testing "a subject saved after the pin"
          (is (not (pinned/unchanged-since? current b pin 2))))
        (testing "a revision above the pinned position falls back even with old datoms"
          (is (not (pinned/unchanged-since? current a pin 0))))
        (testing "current-eid is off unless the option is on, and needs a pinned view"
          (is (nil? (pinned/current-eid current view 2 "a")))
          (with-redefs [pinned/enabled true]
            (is (= a (pinned/current-eid current view 2 "a")))
            (is (nil? (pinned/current-eid current view 2 "b")))
            (is (nil? (pinned/current-eid current current 3 "a")))))))))
(deftest a-row-added-without-a-revision-falls-back
  (fixture
    (fn [conn]
      (save! conn "c" 1 "row-c-1" nil)
      (let [pin (d/basis-t (d/db conn))
            ;; A writer that adds a row but forgets the revision: the subject's new datom still sends it to as-of.
            current (:db-after @(d/transact conn [[:db/add [:triplex.entity/id "c"] :triplex.entity/row "row-c-2"]]))
            c (d/entid current [:triplex.entity/id "c"])]
        (is (= 1 (:v (first (d/datoms current :eavt c :triplex.entity/rev)))))
        (is (not (pinned/unchanged-since? current c pin 1)))))))
(deftest a-subject-without-a-revision-falls-back
  (fixture
    (fn [conn]
      (let [current (:db-after @(d/transact conn [[:db/add "p" :triplex.entity/id "d"] [:db/add "p" :triplex.entity/row "row-d"]]))
            d-eid (d/entid current [:triplex.entity/id "d"])]
        (is (not (pinned/unchanged-since? current d-eid (d/basis-t current) 100)))))))
(deftest group-member-lookup-equals-the-view
  ;; [DX-RD2] The cut lookup must give the as-of view's own answer for every position, present or absent.
  (fixture
    (fn [conn]
      @(d/transact conn [{:db/ident :triplex.group/position :db/valueType :db.type/long
                          :db/cardinality :db.cardinality/one :db/unique :db.unique/value}])
      (let [add! (fn [ps] (:db-after @(d/transact conn (vec (for [p ps] {:db/id (str "m" p) :triplex.group/position p})))))
            _ (add! [3 5])
            pin (d/basis-t (d/db conn))
            _ (doseq [chunk (partition-all 100 (range 6 1200))] (add! chunk))
            current (d/db conn)
            view (d/as-of current pin)
            expected (mapv #(d/entid view [:triplex.group/position %]) (range 0 1300))]
        (is (= 2 (count (remove nil? expected))))
        (with-redefs [triplex.gateway.group-cut/current-lookup true]
          (binding [pinned/*current* current]
            (is (= expected (mapv #(triplex.gateway.group-cut/member-at view %) (range 0 1300))))
            (testing "a current database view keeps the lookup ref"
              (is (= (d/entid current [:triplex.group/position 700]) (triplex.gateway.group-cut/member-at current 700))))))))))
