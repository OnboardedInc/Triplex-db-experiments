(ns s6-gates
  "[DX-S6] Runs one older gate namespace (s3/owners_gate.clj, s4/create_gate.clj) in the standing phase and prints its
  DX-S6_RESULT line."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test]))

(defn run [ns-sym]
  (let [r (clojure.test/run-tests ns-sym)]
    (println "DX-S6_RESULT" (json/write-str (assoc (select-keys r [:test :pass :fail :error]) :gate (str ns-sym)
                                                   :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv))))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
