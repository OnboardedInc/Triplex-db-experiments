(ns triplex.gateway.slim
  (:require [triplex.gateway.small-row :as small-row] [clojure.data.json :as json] [clojure.walk :as walk]))

;; [DX-T1-8] Why: compress only the JSON suffix after authoritative clock/position assignment, preserving indexed prefixes.
;; Rejected: changing logical rows or UTF-8 conversion (unpaired UTF-16 code units must round-trip exactly).
(def encoder-code
  '(fn [^String text offset]
     (let [start (- offset 2) body (subs text start) n (.length ^String body)]
       (if (> n 8388608) text
         (let [buffer (java.nio.ByteBuffer/allocate (* 2 n))
               _ (dotimes [i n] (.putChar buffer (.charAt ^String body i)))
               output (java.io.ByteArrayOutputStream.)
               deflater (java.util.zip.Deflater. 1)]
           (try
             (with-open [stream (java.util.zip.DeflaterOutputStream. output deflater)]
               (.write stream (.array buffer)))
             (let [encoded (str "Z1" (format "%08x" n)
                                (.encodeToString (java.util.Base64/getEncoder) (.toByteArray output)))]
               (if (< (.length ^String encoded) n) (str (subs text 0 start) encoded) text))
             (finally (.end deflater))))))))
(def encode (eval encoder-code))

;; [DX-T1-8] Why: bounded, versioned frames fail on truncation, trailing bytes or a forged length before JSON is trusted.
;; Rejected: unbounded readAllBytes on compressed storage or silently accepting damaged rows.
(def body-code
  '(fn [^String value]
  (if-not (.startsWith value "Z1") value
    (let [n (Integer/parseInt value 2 10 16)]
      (when-not (<= 0 n 8388608) (throw (ex-info "Invalid slim row length" {})))
      (let [compressed (.decode (java.util.Base64/getDecoder) (subs value 10))
            inflater (java.util.zip.Inflater.)]
        (try
          (with-open [stream (java.util.zip.InflaterInputStream. (java.io.ByteArrayInputStream. compressed) inflater)]
            (let [bytes (.readNBytes stream (inc (* 2 n)))]
              (when-not (and (= (* 2 n) (alength bytes)) (.finished inflater) (zero? (.getRemaining inflater)))
                (throw (ex-info "Invalid slim row content" {})))
              (let [chars (char-array n)]
                (.get (.asCharBuffer (java.nio.ByteBuffer/wrap bytes)) chars)
                (String. chars))))
          (finally (.end inflater))))))))
(def body (eval body-code))

;; [DX-T1-8] Why: journal and receipt routes return row texts directly, so expand before crossing the wire.
;; Rejected: requiring each TypeScript reader/oracle to understand a private physical storage frame.
(defn logical-text [^String text body-start]
  (if-let [packed (small-row/unpack text body-start)]
    (str (subs text 0 body-start) (json/write-str packed))
    (if (.startsWith text "Z1" (int body-start))
      (str (subs text 0 body-start) (body (subs text body-start))) text)))
(def row-columns-code
  (walk/postwalk-replace {'unpack-code small-row/unpack-code 'body-code body-code}
    '(fn [^String text]
       (let [start (+ 5 (Integer/parseInt text 1 5 16)) ref-start (+ start 36)
             size (Integer/parseInt text (int (+ start 32)) (int ref-start) 16)
             body-start (+ ref-start size 1)]
         (or (unpack-code text body-start) (json/read-str (body-code (subs text body-start))))))))
(def row-columns (eval row-columns-code))
(defn row-text [^String text]
  (if (not= \2 (.charAt text 0)) text
    (let [start (+ 5 (Integer/parseInt text 1 5 16)) ref-start (+ start 36)
          size (Integer/parseInt text (int (+ start 32)) (int ref-start) 16)
          body-start (+ ref-start size 1)]
      (logical-text text body-start))))
