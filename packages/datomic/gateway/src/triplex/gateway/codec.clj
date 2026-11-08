(ns triplex.gateway.codec
  (:import [java.math BigDecimal BigInteger] [java.util UUID Date]))

;; [EXP-DA00] Why: tagged exact values cross JSON without JS integer rounding. Rejected: bare JSON longs (precision loss).
(defn invalid [message] (throw (ex-info message {:status 400 :code "InvalidValue"})))
(defn decimal-text [v]
  (when-not (and (string? v) (re-matches #"(0|-?[1-9][0-9]*)" v)) (invalid "Expected decimal integer text")) v)
(defn decode-value [{:strs [t v]}]
  (case t
    ("long" "ref" "instant") (let [n (Long/parseLong (decimal-text v))] (if (= t "instant") (Date. n) n))
    "bigint" (BigInteger. (decimal-text v))
    "bigdec" (do (when-not (and (string? v) (re-matches #"-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?" v)) (invalid "Invalid bigdec")) (BigDecimal. v))
    "double" (do (when-not (and (number? v) (Double/isFinite (double v))) (invalid "Nonfinite double")) (double v))
    "string" (do (when-not (string? v) (invalid "Expected string")) v)
    "bool" (do (when-not (instance? Boolean v) (invalid "Expected boolean")) v)
    "keyword" (do (when-not (and (string? v) (re-matches #":[^\s:/]+(/[^\s:/]+)?" v)) (invalid "Invalid keyword")) (keyword (subs v 1)))
    "uuid" (do (when-not (and (string? v) (re-matches #"[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}" v)) (invalid "Invalid uuid")) (UUID/fromString v))
    (invalid "Unknown value tag")))
(defn encode-value [t v]
  (let [wire {"t" t "v" (case t ("long" "ref" "bigint" "bigdec" "keyword" "uuid") (str v) "instant" (str (.getTime ^Date v)) v)}]
    (decode-value wire) wire))
