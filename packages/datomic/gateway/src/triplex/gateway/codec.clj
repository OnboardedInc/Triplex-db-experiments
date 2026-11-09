(ns triplex.gateway.codec
  (:require [clojure.data.json :as json])
  (:import [java.math BigDecimal BigInteger] [java.util UUID Date]))

;; [EXP-DA00] Why: tagged exact values cross JSON without JS integer rounding. Rejected: bare JSON longs (precision loss).
(defn invalid [message] (throw (ex-info message {:status 400 :code "InvalidValue"})))
;; [EXP-DA01] Why: runtime grammar and limits come from the shared specification. Rejected: separately maintained JVM constants (V-DA00 F4).
;; [EXP-DF01] Why: offline JVM gates must load the same checked-in codec specification.
;; Rejected: shadowing codec in tests (would not compile the shipped gateway namespaces).
(def spec (json/read-str (slurp (System/getProperty "triplex.codec.spec" "/opt/gateway/codec-spec.json"))))
(defn matches [kind v] (and (string? v) (re-matches (re-pattern (get spec kind)) v)))
(defn decimal-text [v]
  (when-not (matches "integerPattern" v) (invalid "Expected decimal integer text")) v)
(defn decode-value [{:strs [t v]}]
  (case t
    ("long" "ref" "instant") (let [text (decimal-text v) exact (BigInteger. text)
                                _ (when-not (<= (bigint (get spec "longMin")) (bigint exact) (bigint (get spec "longMax"))) (invalid "Long out of range"))
                                n (.longValue exact)] (if (= t "instant") (Date. n) n))
    "bigint" (BigInteger. (decimal-text v))
    "bigdec" (do
      (when-not (matches "decimalPattern" v) (invalid "Invalid bigdec"))
      (let [[coefficient exponent-text] (clojure.string/split v #"[eE]")
            exponent (BigInteger. (or exponent-text "0"))
            fraction (count (second (clojure.string/split coefficient #"\.")))
            scale (- (bigint fraction) (bigint exponent))]
        (when-not (and (<= (bigint (get spec "exponentMin")) (bigint exponent) (bigint (get spec "exponentMax")))
                       (<= (bigint (get spec "scaleMin")) scale (bigint (get spec "scaleMax"))))
          (invalid "Bigdec scale or exponent out of range")))
      (BigDecimal. v))
    "double" (do (when-not (and (number? v) (Double/isFinite (double v))) (invalid "Nonfinite double")) (double v))
    "string" (do (when-not (string? v) (invalid "Expected string")) v)
    "bool" (do (when-not (instance? Boolean v) (invalid "Expected boolean")) v)
    "keyword" (do (when-not (matches "keywordPattern" v) (invalid "Invalid keyword")) (keyword (subs v 1)))
    "uuid" (do (when-not (matches "uuidPattern" v) (invalid "Invalid uuid")) (UUID/fromString v))
    (invalid "Unknown value tag")))
(defn encode-value [t v]
  (let [wire {"t" t "v" (case t ("long" "ref" "bigint" "bigdec" "keyword" "uuid") (str v) "instant" (str (.getTime ^Date v)) v)}]
    (decode-value wire) wire))
