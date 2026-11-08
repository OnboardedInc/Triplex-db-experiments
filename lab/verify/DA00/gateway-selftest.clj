(ns triplex.gateway.selftest
  (:require [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.main :as gateway]))

;; [CX-VDA00] Why: validate public scopes and synchronize an actual mem initialization race. Rejected: a sleep-based concurrency guess.
(defn -main [& _]
  (let [public-scope "[\"triplex-scope-v1\",\"test\",\"test\",\"cx-vda00\",0]"]
    (println (json/write-str
      (try {:case "public-scope" :scope public-scope :result (gateway/scope-name public-scope)}
           (catch Exception e {:case "public-scope" :scope public-scope :rejected true :error (.getMessage e)})))))
  (let [base "datomic:mem://" scope "[\"triplex-scope-v1\",\"test\",\"verifier\",\"cx-vda00-race\",\"1\"]"
        paused (promise) release (promise) slow-thread (atom nil) transact d/transact]
    (with-redefs [d/transact (fn [conn tx]
                              (when (and (= @slow-thread (Thread/currentThread))
                                         (map? (first tx)) (= 0 (:triplex.scope/position (first tx))))
                                (deliver paused true)
                                (when-not (deref release 10000 false) (throw (Exception. "Verifier release timeout"))))
                              (transact conn tx))]
      (let [slow (future (reset! slow-thread (Thread/currentThread)) (gateway/create-scope! base scope))]
        (when-not (deref paused 10000 false) (throw (Exception. "Verifier pause timeout")))
        (let [fast (gateway/create-scope! base scope) name (:db fast) conn (gateway/connection (str base name))]
          @(d/transact conn [{:triplex.scope/key scope :triplex.scope/position 7}])
          (let [before (gateway/basis base name)]
            (deliver release true)
            (deref slow 10000 ::timeout)
            (let [after (gateway/basis base name) deleted (gateway/delete-scope! base scope)]
              (println (json/write-str {:case "initialization-race" :before before :after after :deleted deleted}))))))))
  (shutdown-agents))
