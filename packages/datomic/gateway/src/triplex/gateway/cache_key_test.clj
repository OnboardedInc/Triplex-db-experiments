(ns triplex.gateway.cache-key-test
  (:require [clojure.test :refer :all] [triplex.gateway.entity-cache :as cache]))
;; [DX-B9-A] Why: equal primitive coordinates must share a key only inside one immutable config token.
;; Rejected: a throughput-only proof (would miss historical/recreation contamination).
(deftest primitive-key-binding
  (let [generation (Object.) other-generation (Object.)
        key (cache/parsed-key "scope" generation 9007199254740991 9007199254740990)
        equal (cache/parsed-key "scope" generation 9007199254740991 9007199254740990)
        table (java.util.concurrent.ConcurrentHashMap.)]
    (.put table key :original)
    (is (= key equal))
    (is (= (hash key) (hash equal)))
    (is (= :original (.get table equal)))
    (is (nil? (.get table (cache/parsed-key "scope" other-generation 9007199254740991 9007199254740990))))
    (is (nil? (.get table (cache/parsed-key "scope" generation 9007199254740990 9007199254740990))))
    (is (nil? (.get table (cache/parsed-key "scope" generation 9007199254740991 9007199254740989))))
    (is (= "scope" (cache/key-name key)))
    (is (= "scope" (cache/key-name ["scope" 1 2])))))
(defn -main [& _]
  (let [result (run-tests 'triplex.gateway.cache-key-test)]
    (println result)
    (System/exit (if (zero? (+ (:fail result) (:error result))) 0 1))))
