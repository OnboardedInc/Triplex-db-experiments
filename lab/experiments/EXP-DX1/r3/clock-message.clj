(ns dxr3.clock-message (:require [clojure.java.io :as io] [clojure.string :as str]))
;; [DX-R3-P6] Why: evaluate the shipped formatter without requiring a Datomic engine or substituting its text.
;; Rejected: a second formatter in the test (could pass while the gateway message stays unactionable).
(def forms (with-open [r (java.io.PushbackReader. (io/reader "packages/datomic/gateway/src/triplex/gateway/storage.clj"))]
             (binding [*read-eval* false] (doall (take-while #(not= ::eof %) (repeatedly #(read r false ::eof)))))))
(def formatter (first (filter #(and (seq? %) (= 'defn (first %)) (= 'clock-conflict-message (second %))) forms)))
(assert formatter)
(eval formatter)
(doseq [maximum ["0" "100" "-1.5" "1.0E12"]]
  (let [marker (str "TRIPLEX_CLOCK " maximum) message (clock-conflict-message marker)]
    (assert (str/starts-with? message marker))
    (doseq [part ["strictRecordClocks" "scope maximum" "greater commit time" "fresh non-strict scope" "increasing commit times" "one clock per commit"]]
      (assert (str/includes? message part)))
    (println (pr-str {:maximum maximum :message message}))))
(println "ClockConflict policy/remedy: 4 source-formatter cases passed; no engine timing claimed")
