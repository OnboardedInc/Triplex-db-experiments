(ns triplex.gateway.ids-test
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.ids :as ids] [triplex.gateway.main :as gateway] [triplex.gateway.storage :as storage]
            [triplex.gateway.selftest :as fixture]))

;; [DX-XQ3] Gates G1 (ID shapes), G4, G5 and G8 for the ID list route on an in-memory lean scope: every page sequence
;; equals a brute-force pass over the same database value (every :triplex.entity/id datom of the as-of value, filtered
;; in Clojure), at the head, at every past commit and at record times; isolation against neighbouring accounts and
;; crafted inputs; the entry bound on every page with a cursor that always continues; the route absent when off.

(def base "datomic:mem://")
(def scope "[\"triplex-scope-v1\",\"test\",\"xq3\",\"id-lists\",0]")
(def accounts ["account-003" "account-004" "account-0031" "account-03"])

(defn row [id entity attribute value position clock & [kind]]
  {:id id :entity_id entity :attribute attribute :value_type (or kind "string") :value_string value
   :recorded_at clock :recorded_position position :valid_from 0.0 :schema_version 1 :tx_id (str "tx" position)})

(defn commit! [name conn position rows]
  (storage/commit! name conn (gateway/sync-db (gateway/db-uri name))
    (fixture/row-input {"sourceK" (dec position) "position" position "operationId" (str "xq3-" position)
                        "rows" (mapv storage/wire-row rows) "newIds" (mapv :id rows) "claims" []})))

(defn seed! [name conn]
  ;; Five commits. Each adds subjects `pl:NNNNNNNN`, placements `pl:NNNNNNNN:pK`, tasks `tk:` and a reference to a
  ;; target `wk:` that has no facts of its own, in four accounts whose names prefix each other, plus reserved entities.
  (doseq [position (range 1 6)]
    (commit! name conn position
      (vec (concat
             (for [a accounts i (range (* 3 (dec position)) (* 3 position))
                   :let [subject (format "acct/%s/pl:%08d" a i)]
                   r [(row (str subject "/name") subject ":person/name" (str "n" i) position (* 10.0 position))
                      (row (str subject "/p0") (str subject ":p0") ":placement/status" "open" position (* 10.0 position))
                      (row (str subject "/tk") (format "acct/%s/tk:%08d" a i) ":task/status" "pending" position (* 10.0 position))
                      (row (str subject "/wk") subject ":person/worker" (format "acct/%s/wk:%08d" a i) position (* 10.0 position) "ref")]]
               (assoc r :id (str (:id r) "@" position)))
             [(row (str "cfg" position) (str "_triplex/config/object/c" position) ":triplex/config-kind" "k" position (* 10.0 position))])))))

(defn brute
  ([db start shape] (brute db start start shape))
  ([db ^String base ^String start shape]
   (let [re (ids/shape-pattern shape)]
     (->> (d/datoms db :aevt :triplex.entity/id) (map :v)
          (filter #(.startsWith ^String % start))
          (filter #(or (nil? re) (re-matches re (subs % (count base)))))
          sort vec))))

(defn call [name input]
  (ids/page name (gateway/connection (gateway/db-uri name)) input))

(defn all-pages [name input]
  (loop [input input pages [] n 0]
    (let [answer (call name input) pages (conj pages answer)]
      (is (< n 10000) "a cursor must end")
      (if-let [next (:next answer)]
        (recur (-> input (dissoc "basis" "after") (assoc "cursor" next)) pages (inc n))
        pages))))

(defn refused [f] (try (f) :accepted (catch clojure.lang.ExceptionInfo e (:code (ex-data e)))))

(deftest id-lists
  (let [name (:db (gateway/create-scope! base scope "lean")) uri (gateway/db-uri name) conn (gateway/connection uri)]
    (try
      (seed! name conn)
      (let [head-db (gateway/sync-db uri)
            head (storage/head-position name head-db)
            asof (fn [p] (storage/at-position head-db p))
            cases (for [a ["account-003" "account-0031" "_system"]
                        [prefix shape] [["" nil] ["pl:" nil] ["pl:" "pl:{8 digits}"] ["pl:" "pl:{digits}:p{digits}"] ["wk:" nil]
                                        ["tk:0000000" nil] ["config/" nil] ["pl:00000004" "pl:{8 digits}"] ["zz:" nil]
                                        ["" "{segment}:{8 digits}"] ["config/" "config/object/{segment}"]]]
                    [a prefix shape])]
        (is (= 5 head))
        (testing "G1: every page sequence equals the brute-force pass, at the head and at every past commit"
          (doseq [[a prefix shape] cases p (range 0 6) limit [1 4 1000] order ["asc" "desc"]
                  :let [start (str (ids/base-for a) prefix)
                        expected (cond-> (brute (asof p) (ids/base-for a) start shape) (= order "desc") (-> reverse vec))
                        pages (all-pages name (cond-> {"account" a "prefix" prefix "limit" limit "order" order
                                                       "basis" {"recordedPosition" p "validAt" 1.0}}
                                                shape (assoc "shape" shape)))
                        listed (vec (mapcat :ids pages))]]
            (is (= expected listed) (pr-str [a prefix shape p limit order]))
            (is (every? #(= p (:position %)) pages))
            (is (every? #(= 0 (:trailingBy %)) pages))
            (is (= "end" (:stopped (last pages))))
            (is (every? #(<= (count (:ids %)) limit) pages))
            (let [c (all-pages name (cond-> {"account" a "prefix" prefix "result" "count" "bounds" {"entries" 3}
                                             "basis" {"recordedPosition" p}} shape (assoc "shape" shape)))]
              (is (= (count expected) (:count (last c))))
              (is (true? (:countExact (last c))))
              (is (every? #(<= (:examined %) 3) c)))))
        (testing "the head with no basis, and a record time (resolved like every pinned read)"
          (is (= (brute head-db "acct/account-003/pl:" nil)
                 (vec (mapcat :ids (all-pages name {"account" "account-003" "prefix" "pl:" "limit" 7})))))
          (doseq [[clock p] [[10.0 1] [25.0 2] [30.0 3] [49.9 4] [1.0e9 5]]]
            (let [answer (call name {"account" "account-004" "prefix" "pl:" "limit" 1000 "basis" {"recordedAt" clock}})]
              (is (= p (:position answer)) (str clock))
              (is (= (brute (asof p) "acct/account-004/pl:" nil) (:ids answer))))))
        (testing "at least a receipt's position: answered at the head"
          (let [answer (call name {"account" "account-003" "prefix" "pl:" "atLeastPosition" 3})]
            (is (= head (:position answer))))
          (is (= "AtLeastTimeout" (refused #(call name {"account" "account-003" "atLeastPosition" 99 "basisWaitMs" 20}))))
          (is (= "InvalidValue" (refused #(call name {"account" "account-003" "atLeastPosition" 3 "basis" {"recordedPosition" 3}})))))
        (testing "G4: an account reads only its own IDs, whatever the prefix"
          (doseq [prefix ["" "/" "../account-004/" "%2F" "pl:../../account-004/pl:" "ÿ" "￿"]]
            (let [answer (call name {"account" "account-003" "prefix" prefix "limit" 1000})]
              (is (every? #(.startsWith ^String % "acct/account-003/") (:ids answer)) prefix)))
          (is (= (brute head-db "acct/account-003/" nil) (vec (mapcat :ids (all-pages name {"account" "account-003" "limit" 1000})))))
          (is (not-any? #(.startsWith ^String % "acct/account-0031/") (mapcat :ids (all-pages name {"account" "account-003" "limit" 1000}))))
          (doseq [bad ["account-003/" "account-003/../account-004" ".." "" "a b" "acct/x" (apply str (repeat 65 "a")) "account\u0001003" 3 nil]]
            (is (#{"InvalidValue" "AccountRequired"} (refused #(call name {"account" bad}))) (pr-str bad)))
          (doseq [prefix ["pl:\u0000" "pl:\u0001" "x\n"]]
            (is (= "InvalidValue" (refused #(call name {"account" "account-003" "prefix" prefix})))))
          (is (= "AccountMismatch" (refused #(call name {"account" "account-003" "after" "acct/account-004/pl:00000001"}))))
          (is (= "AccountMismatch" (refused #(call name {"account" "account-003" "after" "acct/account-0031/pl:00000001"}))))
          (let [first-page (call name {"account" "account-003" "prefix" "pl:" "limit" 2})
                cursor (:next first-page)
                forged (fn [f] (ids/encode-cursor (f (ids/decode-cursor cursor))))]
            (is (string? cursor))
            (is (= "CursorMismatch" (refused #(call name {"account" "account-004" "prefix" "pl:" "limit" 2 "cursor" cursor}))))
            (is (= "CursorMismatch" (refused #(call name {"account" "account-003" "prefix" "tk:" "limit" 2 "cursor" cursor}))))
            (is (= "CursorMismatch" (refused #(call name {"account" "account-003" "prefix" "pl:" "limit" 2 "cursor" cursor
                                                         "basis" {"recordedPosition" 1}}))))
            ;; A cursor edited by hand to name another account's key cannot leave the account's range.
            (is (= "CursorMismatch" (refused #(call name {"account" "account-003" "prefix" "pl:" "limit" 2
                                                         "cursor" (forged (fn [m] (assoc m "last" "acct/account-004/pl:00000001")))}))))
            (is (= "CursorMismatch" (refused #(call name {"account" "account-004" "prefix" "pl:" "limit" 2
                                                         "cursor" (forged (fn [m] (assoc m "account" "account-004")))}))))))
        (testing "G5: the entry bound holds on every page, a cursor always continues, the permit is released"
          (let [pages (all-pages name {"account" "account-003" "shape" "zz:{digits}" "limit" 5 "bounds" {"entries" 4}})]
            (is (every? #(<= (:examined %) 4) pages))
            (is (= (count (brute head-db "acct/account-003/" nil)) (reduce + (map :examined pages))))
            (is (= [] (vec (mapcat :ids pages))))
            (is (every? #(= "entries" (:stopped %)) (butlast pages)))
            (is (= ids/permit-count (.availablePermits ids/permits)))
            (is (.isEmpty ids/running)))
          (testing "a second request of the same account while one runs is refused, another account is not"
            (.put ids/running "account-003" true)
            (try
              (is (= "IndexBusy" (refused #(call name {"account" "account-003"}))))
              (is (= :accepted (refused #(call name {"account" "account-004"}))))
              (finally (.remove ids/running "account-003"))))
          (testing "every permit taken: refused after the time bound, with the retry hint"
            (.acquire ids/permits ids/permit-count)
            (try
              (let [e (try (call name {"account" "account-004" "bounds" {"ms" 5}}) nil (catch clojure.lang.ExceptionInfo e (ex-data e)))]
                (is (= ["IndexBusy" 503 5] [(:code e) (:status e) (:retryAfterMs e)])))
              (finally (.release ids/permits ids/permit-count)))
            (is (.isEmpty ids/running)))
          (doseq [bad [{"entries" 0} {"entries" 1000001} {"ms" 1001} {"segments" 0} {"other" 1} {"entries" 1.5}]]
            (is (= "InvalidValue" (refused #(call name {"account" "account-003" "bounds" bad}))) (pr-str bad)))
          (is (= "UnsupportedOperation" (refused #(call name {"account" "account-003" "result" "countByValue"}))))
          (is (= "InvalidValue" (refused #(call name {"account" "account-003" "shape" "pl:{x}"}))))
          (is (= "InvalidValue" (refused #(call name {"account" "account-003" "limit" 1001})))))
        (testing "G8: the route is absent when the option is off, exactly as before; present when on"
          (let [request (fn [] (gateway/route-handler-base
                                 {:request-method :post :uri (str "/v2/db/" name "/ids")
                                  :body (java.io.ByteArrayInputStream. (.getBytes (json/write-str {"account" "account-003"}) "UTF-8"))}))
                body (fn [r] (let [b (:body r)] (if (string? b) b (String. ^bytes b "UTF-8"))))]
            (with-redefs [ids/enabled false]
              (let [r (request)] (is (= [404 "{\"code\":\"NotFound\"}"] [(:status r) (body r)]))))
            (with-redefs [ids/enabled true]
              (let [r (request) answer (json/read-str (body r))]
                (is (= 200 (:status r)))
                (is (= (brute head-db "acct/account-003/" nil) (vec (take 100 (get answer "ids"))))))))))
      (finally (gateway/delete-scope! base scope)))))

(defn -main [& _]
  (let [{:keys [fail error] :as result} (with-redefs [gateway/uri-template "datomic:mem://{db}"] (run-tests 'triplex.gateway.ids-test))]
    (println (json/write-str result))
    (shutdown-agents)
    (System/exit (if (zero? (+ fail error)) 0 1))))
