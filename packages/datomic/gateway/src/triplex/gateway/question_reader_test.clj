(ns triplex.gateway.question-reader-test
  (:require [clojure.test :refer :all] [clojure.data.json :as json]
            [triplex.gateway.question-reader :as qr] [triplex.gateway.ids :as ids] [triplex.gateway.main :as gateway])
  (:import [java.util.concurrent Semaphore ConcurrentHashMap Executors TimeUnit]
           [java.util.concurrent.atomic AtomicLong]))

;; [DX-XQ7] The question reader's route guard and the ID list route's fair queue, without a database: which requests
;; each kind of gateway serves or refuses (and with what), that both options unset leave every request to the routes,
;; and that the queue admits one page per account at a time in arrival order, refuses after its wait, and counts how
;; many pages went ahead of each one. The routes themselves are gated on a stack (lab/experiments/EXP-DX1/xq7).

(def requests
  {:ids {:request-method :post :uri "/v2/db/s2-abc_1/ids"}
   :sweep {:request-method :post :uri "/v2/db/s2-abc_1/sweep"}
   :find {:request-method :post :uri "/v2/db/s-0123456789abcdef0123456789abcdef/find"}
   :read {:request-method :post :uri "/v1/db/s2-abc_1/read"}
   :reach {:request-method :post :uri "/v2/db/s2-abc_1/reach"}
   :transact {:request-method :post :uri "/v1/db/s2-abc_1/transact"}
   :declare {:request-method :post :uri "/v2/db/s2-abc_1/index-declaration"}
   :create {:request-method :post :uri "/v1/db/create"}
   :basis {:request-method :get :uri "/v1/db/s2-abc_1/basis"}
   :health {:request-method :get :uri "/health"}
   :stats {:request-method :get :uri "/v2/admin/scan-stats"}
   :get-ids {:request-method :get :uri "/v2/db/s2-abc_1/ids"}
   :nested {:request-method :post :uri "/v2/db/s2-abc_1/ids/x"}})

(defn- body [r] (json/read-str (:body r)))

(deftest off-means-every-request-goes-to-the-routes
  (with-redefs [qr/enabled false qr/question-reader? false qr/questions-at nil]
    (doseq [[k r] requests] (is (nil? (qr/guard r)) (str k)))))

(deftest a-main-gateway-refuses-questions-and-names-the-question-reader
  (with-redefs [qr/enabled true qr/question-reader? false qr/questions-at "http://127.0.0.1:18973" qr/counts (atom {})]
    (doseq [k [:ids :sweep :find]]
      (let [r (qr/guard (requests k))]
        (is (= 421 (:status r)) (str k))
        (is (= {"code" "QuestionReaderRoute" "route" (name k) "questionReader" "http://127.0.0.1:18973"}
               (dissoc (body r) "message")) (str k))))
    (doseq [k [:read :reach :transact :declare :create :basis :health :stats :get-ids :nested]]
      (is (nil? (qr/guard (requests k))) (str k)))
    (is (= {"ids" 1 "sweep" 1 "find" 1} (into {} (map (fn [[k v]] [k v]) (:refusedQuestion @qr/counts)))))))

(deftest the-question-reader-serves-only-questions
  (with-redefs [qr/enabled true qr/question-reader? true qr/questions-at nil qr/counts (atom {})]
    (doseq [k [:ids :sweep :find :basis :health :stats]] (is (nil? (qr/guard (requests k))) (str k)))
    (doseq [k [:read :reach :transact :declare :create :get-ids :nested]]
      (let [r (qr/guard (requests k))]
        (is (= 421 (:status r)) (str k))
        (is (= "QuestionReaderOnly" (get (body r) "code")) (str k))))))

(deftest the-route-list-is-a-setting
  (with-redefs [qr/enabled true qr/question-reader? false qr/questions-at "http://q:8080" qr/routes #{"ids"} qr/counts (atom {})]
    (is (= 421 (:status (qr/guard (requests :ids)))))
    (is (nil? (qr/guard (requests :sweep))))))

(deftest the-handler-applies-the-guard-before-any-database-work
  ;; A main gateway refuses a sweep of a database that does not exist without touching it (no connection is made).
  (with-redefs [qr/enabled true qr/question-reader? false qr/questions-at "http://q:8080" qr/counts (atom {})]
    (let [r (gateway/route-handler {:request-method :post :uri "/v2/db/s2-nosuchdb/sweep" :body nil})]
      (is (= 421 (:status r)))
      (is (= "QuestionReaderRoute" (get (body r) "code"))))))

(deftest the-id-list-queue-takes-accounts-in-turn
  (with-redefs [ids/list-queue-ms 300 ids/list-per-account 1 ids/permits (Semaphore. 1 true)
                ids/account-gates (ConcurrentHashMap.) ids/admitted-count (AtomicLong.)]
    (let [admit (fn [account] (#'ids/queued-admit! account 300 [:idLists :busy] ids/permits))
          first-a (admit "a")
          pool (Executors/newFixedThreadPool 4)
          order (atom [])
          wait (fn [account delay-ms]
                 (.submit pool ^Callable (fn [] (Thread/sleep (long delay-ms))
                                           (let [{:keys [queue release]} (admit account)]
                                             (swap! order conj [account (:ahead queue)])
                                             (Thread/sleep 20) (release) queue))))
          ;; While a's first page runs: a second page of a, then a page of b, then of c, arrive in that order.
          fa (wait "a" 10) fb (wait "b" 20) fc (wait "c" 30)]
      (Thread/sleep 60)
      ((:release first-a))
      (let [results (mapv #(.get ^java.util.concurrent.Future % 5 TimeUnit/SECONDS) [fa fb fc])]
        ;; a's second page waited at its own account's gate, so b and c (already in the pool's queue) went first.
        (is (= ["b" "c" "a"] (mapv first @order)))
        ;; Pages ahead while waiting: b none, c one (b), a's second two (b and c); at most one per other account.
        (is (= {"b" 0 "c" 1 "a" 2} (into {} @order)))
        (is (every? #(<= (:ahead %) 2) results)))
      ;; A page that cannot get its turn within the wait is refused, typed, with a retry hint.
      (let [held (admit "d")
            e (try (admit "d") nil (catch clojure.lang.ExceptionInfo e e))]
        (is (= [503 "IndexBusy" 300] ((juxt :status :code :retryAfterMs) (ex-data e))))
        ((:release held)))
      (.shutdown pool)
      (is (= 1 (.availablePermits ^Semaphore ids/permits))))))
