(ns triplex.gateway.cross-index-test
  "[DX-XQ4] The key encoding of the commit-time index: byte order equals value order in every family, the separator never
  appears inside a field, and keys parse back to what composed them."
  (:require [clojure.test :refer [deftest is run-tests]] [triplex.gateway.cross-index :as x])
  (:import [java.util Random]))

(defn- sign [n] (Long/signum (long n)))
(def ^Random rnd (Random. 20261124))
(defn- rand-text []
  (apply str (repeatedly (.nextInt rnd 6) #(char (nth [0 1 2 3 65 97 0xffff 0xd7ff 0x1f 0x7f] (.nextInt rnd 10))))))

(deftest escape-preserves-order-and-round-trips
  (dotimes [_ 20000]
    (let [a (rand-text) b (rand-text)]
      (is (= a (x/unesc (x/esc a))))
      (is (neg? (.indexOf ^String (x/esc a) (int 1))))
      (is (= (sign (compare a b)) (sign (compare (x/esc a) (x/esc b)))))
      ;; A field followed by the separator sorts before any longer value with that prefix.
      (is (= (sign (compare a b)) (sign (compare (str (x/esc a) x/sep) (str (x/esc b) x/sep))))))))

(deftest doubles-sort-numerically
  (let [special [0.0 -0.0 1.0 -1.0 Double/MIN_VALUE (- Double/MIN_VALUE) Double/MAX_VALUE (- Double/MAX_VALUE) 1e-300 -1e-300 1.7e12]]
    (doseq [a special b special]
      (is (= (sign (compare (double a) (double b))) (sign (compare (x/hex16 a) (x/hex16 b))))
          [a b]))
    (is (= (x/hex16 -0.0) (x/hex16 0.0)))
    (dotimes [_ 20000]
      (let [a (* (- (.nextDouble rnd) 0.5) (Math/pow 10 (- (.nextInt rnd 40) 20)))
            b (* (- (.nextDouble rnd) 0.5) (Math/pow 10 (- (.nextInt rnd 40) 20)))]
        (is (= (sign (compare a b)) (sign (compare (x/hex16 a) (x/hex16 b)))))
        (is (== a (x/unhex16 (x/hex16 a))))))))

(deftest integers-sort-numerically-at-any-size
  (dotimes [_ 20000]
    (let [mk #(let [n (BigInteger. (+ 1 (.nextInt rnd 90)) rnd)] (if (.nextBoolean rnd) (.negate n) n))
          a (mk) b (mk)]
      (is (= (sign (compare a b)) (sign (compare (x/int-enc (str a)) (x/int-enc (str b))))) [a b])
      (is (= a (BigInteger. (x/int-dec (x/int-enc (str a)))))))))

(deftest keys-parse-back
  (dotimes [_ 5000]
    (let [token "acc-a" code "a3" local (rand-text) fact (str "F" (rand-text))
          field (str "s" (x/esc (rand-text))) vf (.nextDouble rnd) vt (when (.nextBoolean rnd) (+ 1.0 (.nextDouble rnd)))
          long? (.nextBoolean rnd)
          p (x/parse-key (x/value-key token code field local fact vf vt long?))]
      (is (= [token code field local fact (x/hex16 vf) (some-> vt x/hex16) long?]
             [(:token p) (:code p) (:field p) (:local p) (:fact p) (:vf p) (:vt p) (:long? p)]))))
  (let [p (x/parse-key (x/type-key "acc-a" "Re\u0001view" "pl:\u000001"))]
    (is (= ["acc-a" "Re\u0001view" "pl:\u000001"] [(:token p) (:type p) (:local p)]))))

(deftest account-tokens
  (is (= ["acc-a" "pl:00000001"] (x/token+local "acct/acc-a/pl:00000001")))
  (is (= [":system" "config/x"] (x/token+local "_triplex/config/x")))
  (is (nil? (x/token+local "acct/bad account/x")))
  (is (nil? (x/token+local "plain-id")))
  (is (= "acct/acc-a/x" (x/entity-id "acc-a" "x"))))

(deftest long-texts-are-truncated-and-marked
  (let [long (apply str (repeat 260 "x"))
        [field long?] (x/value-field {:value_type "string" :value_string long})
        [full _] (x/value-field {:value_type "string" :value_string long} true)]
    (is long?) (is (= 201 (count field))) (is (= 261 (count full)))
    ;; Never split a surrogate pair.
    (let [s (str (apply str (repeat 199 "y")) "😀" "zz")]
      (is (= 199 (count (x/truncate s)))))))

(defn -main [& _]
  (let [{:keys [fail error]} (run-tests 'triplex.gateway.cross-index-test)]
    (shutdown-agents)
    (System/exit (if (zero? (+ fail error)) 0 1))))
