(ns triplex.gateway.selftest
  (:require [clojure.data.json :as json] [clojure.string :as string]
            [triplex.gateway.codec :as codec]))

;; [CX-VDA00] Why: run independent probes against the actual image codec. Rejected: changing the gateway to add a test route.
(defn probe [line]
  (let [wire (json/read-str line)]
    (try
      (let [value (codec/decode-value wire)
            encoded (codec/encode-value (get wire "t") value)
            output (json/write-str encoded)
            decoded-again (codec/decode-value (json/read-str output))]
        {:input wire :result "accept" :output output :class (.getName (class value))
         :doubleBits (when (= "double" (get wire "t")) (str (Double/doubleToRawLongBits value)))
         :roundtrip (= value decoded-again)
         :scale (when (= "bigdec" (get wire "t")) (.scale ^java.math.BigDecimal value))})
      (catch Exception e {:input wire :result "reject" :class (.getName (class e)) :error (.getMessage e)}))))
(defn -main [& _]
  (doseq [line (string/split-lines (slurp "/verify/codec-wire.jsonl"))]
    (println (json/write-str (probe line))))
  (shutdown-agents))
