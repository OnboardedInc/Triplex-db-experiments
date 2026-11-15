(ns triplex.gateway.slim)

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
(defn body [^String value]
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
          (finally (.end inflater)))))))
