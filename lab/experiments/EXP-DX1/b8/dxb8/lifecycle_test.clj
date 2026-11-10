(ns dxb8.lifecycle-test
  (:require [clojure.test :refer :all] [clojure.data.json :as json]
            [triplex.gateway.main :as main] [triplex.gateway.feed :as feed]))
;; [DX-B8-C] Why: an active old subscriber must not lend its revision map or teardown to a recreated scope.
;; Rejected: proving only that a new parsed-cache token exists without checking the report consumer's state identity.
(deftest report-state-isolated-after-recreation
  (with-redefs [main/uri-template "datomic:mem://{db}"]
    (let [scope (str "[\"triplex-scope-v1\",\"test\",\"test\",\"b8-life-" (java.util.UUID/randomUUID) "\",0]")
          name (:db (main/create-scope! main/uri-template scope "lean")) uri (main/db-uri name)
          old (main/connection-view uri) subscribed (feed/subscribe! (:conn old)) released (atom false)]
      (try
        (is (identical? (:recent old) (:recent subscribed)))
        (is (:deleted (main/delete-scope! main/uri-template scope)))
        (main/create-scope! main/uri-template scope "lean")
        (let [fresh (main/connection-view uri)]
          (is (not (identical? (:conn old) (:conn fresh))))
          (is (not (identical? (:recent old) (:recent fresh))))
          (feed/unsubscribe! (:conn old)) (reset! released true)
          (is (.get ^java.util.concurrent.atomic.AtomicBoolean (:closed (:recent old))))
          (is (not (.get ^java.util.concurrent.atomic.AtomicBoolean (:closed (:recent fresh))))))
        (finally
          (when-not @released (feed/unsubscribe! (:conn old)))
          (main/delete-scope! main/uri-template scope))))))
(defn -main [& _]
  (let [{:keys [fail error] :as result} (run-tests 'dxb8.lifecycle-test)]
    (println (json/write-str result)) (shutdown-agents)
    (System/exit (if (zero? (+ fail error)) 0 1))))
