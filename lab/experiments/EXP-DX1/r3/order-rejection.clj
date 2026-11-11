(ns dxr3.order-rejection
  (:require [clojure.java.io :as io] [triplex.gateway.commit-order :as order]))
;; [DX-R3-P7] Why: evaluate the actual submit wrapper with a synchronous clock refusal and real ordering lanes.
;; Rejected: an independent ordering model (would miss the unchanged gateway cursor after a refused handover).
(create-ns 'datomic.api)
(intern 'datomic.api 'transact-async (fn [& _] (throw (Exception. "unbound test submission"))))
(alias 'd 'datomic.api)
(def commit-hints? false)
(defn transaction-hints [& _] nil)
(def forms (with-open [r (java.io.PushbackReader. (io/reader "packages/datomic/gateway/src/triplex/gateway/storage.clj"))]
             (binding [*read-eval* false] (doall (take-while #(not= ::eof %) (repeatedly #(read r false ::eof)))))))
(eval (or (first (filter #(and (seq? %) (= 'defn (first %)) (= 'submit! (second %))) forms)) (throw (Exception. "missing source function"))))
(let [client (str (java.util.UUID/randomUUID)) input {"clientId" client "sendSequence" 1 "operationId" "rejected"}
      error (ex-info "TRIPLEX_CLOCK 1000" {}) calls (atom 0)]
  (with-redefs-fn {(ns-resolve 'datomic.api 'transact-async)
                  (fn [& _] (if (= 1 (swap! calls inc)) (throw error) (delay {:accepted true})))}
    (fn []
      (let [out (submit! :connection [] input (atom {}))]
        (assert (= 2 (:next @(order/lane-for client))))
        (assert (identical? error (try @out nil (catch Exception e e)))))
      (assert (= {:accepted true} @(submit! :connection [] (assoc input "sendSequence" 2 "operationId" "retry") (atom {}))))
      (assert (= 3 (:next @(order/lane-for client))))
      (assert (= 2 @calls)))))
(println "source submit!: synchronous ClockConflict consumed turn 1, original error preserved, retry turn 2 accepted; no engine used")
(shutdown-agents)
