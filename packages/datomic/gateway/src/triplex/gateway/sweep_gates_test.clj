(ns triplex.gateway.sweep-gates-test
  "[DX-SCALE2] The sweep's per-account gates with and without TX2_SWEEP_GATE_EVICT: without it one gate stays for every
  account ever swept; with it no gate outlives its account's last request, and an account still runs at most
  TX2_SWEEP_PER_ACCOUNT sweeps at once (a second request waits and is refused after the queue wait)."
  (:require [clojure.test :refer [deftest is testing]] [triplex.gateway.sweep :as sweep])
  (:import [java.util.concurrent CountDownLatch TimeUnit]
           [java.util.concurrent.atomic AtomicInteger]))

(defn- swept! [accounts]
  (doseq [a accounts] ((:release (sweep/admit-for-test! a)))))

(deftest gates-grow-without-eviction
  (let [before (sweep/gate-count)]
    (binding [sweep/*evict-gates* false] (swept! (map #(str "keep-" %) (range 1000))))
    (is (= (+ before 1000) (sweep/gate-count)))))

(deftest gates-evicted-with-option
  (let [before (sweep/gate-count)]
    (binding [sweep/*evict-gates* true] (swept! (map #(str "evict-" %) (range 1000))))
    (is (= before (sweep/gate-count)))))

(deftest one-per-account-with-eviction
  (binding [sweep/*evict-gates* true]
    (let [before (sweep/gate-count)
          held (sweep/admit-for-test! "busy-account")
          other (future (try (sweep/admit-for-test! "busy-account") :admitted
                             (catch clojure.lang.ExceptionInfo e (:code (ex-data e)))))]
      (is (= "SweepBusy" (deref other 5000 :timeout)) "a second sweep of the account waits, then is refused")
      (is (= (inc before) (sweep/gate-count)) "one gate while the account's sweep runs")
      ((:release held))
      (is (= before (sweep/gate-count)) "no gate once it ends")
      ((:release (sweep/admit-for-test! "busy-account")))
      (is (= before (sweep/gate-count))))))

(deftest stress-with-eviction
  (binding [sweep/*evict-gates* true]
    (let [before (sweep/gate-count)
          holders (into {} (for [a ["s0" "s1" "s2"]] [a (AtomicInteger.)]))
          over (AtomicInteger.) admitted (AtomicInteger.) refused (AtomicInteger.)
          start (CountDownLatch. 1)
          workers (doall (for [t (range 16)]
                           (future
                             (.await start)
                             (dotimes [n 300]
                               (let [a (nth ["s0" "s1" "s2"] (mod (+ t n) 3))]
                                 (try
                                   (let [{:keys [release]} (sweep/admit-for-test! a)
                                         ^AtomicInteger h (holders a)]
                                     (when (> (.incrementAndGet h) 1) (.incrementAndGet over))
                                     (.incrementAndGet admitted)
                                     (when (zero? (mod n 7)) (Thread/sleep 0 200000))
                                     (.decrementAndGet h)
                                     (release))
                                   (catch clojure.lang.ExceptionInfo _ (.incrementAndGet refused))))))))]
      (.countDown start)
      (doseq [w workers] (deref w 60000 :timeout))
      (testing "every request was admitted or refused, never two holders of one account, no gate left"
        (is (= (* 16 300) (+ (.get admitted) (.get refused))))
        (is (zero? (.get over)))
        (is (= before (sweep/gate-count)))))))
