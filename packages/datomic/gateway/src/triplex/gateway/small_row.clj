(ns triplex.gateway.small-row
  (:require [clojure.data.json :as json]))

(def enabled (= "1" (System/getenv "TX2_SMALL_ROWS")))
(def ^:private clock-slot (Object.))
(def ^:private fields [2 3 4 5 6 7 8 9 10 13 14 15 16])
(def ^:private shared-tx-bit 13)

(defn- slice-bits [^String header start]
  (let [bits (Long/parseUnsignedLong (subs header start (+ start 16)) 16)]
    (if (= bits Long/MIN_VALUE) "-0" (Double/longBitsToDouble bits))))

(defn- numeric-bits [value]
  (Double/doubleToRawLongBits (if (= value "-0") -0.0 (double value))))

(defn- split-clock [tokens]
  (let [out (transient []) part (StringBuilder.)]
    (doseq [x tokens]
      (if (identical? x clock-slot)
        (do (conj! out (.toString part)) (.setLength part 0))
        (.append part ^String x)))
    (persistent! (conj! out (.toString part)))))

(defn- escaped-fragment [^String s]
  (let [q (json/write-str s)]
    (subs q 1 (dec (.length ^String q)))))

(defn- change-tokens [text new-ids]
  (let [change (json/read-str text)
        change (cond-> change
                 (new-ids (get change "tripleId")) (assoc "recordedAt" clock-slot)
                 (contains? change "retractedAt") (assoc "retractedAt" clock-slot))]
    (if (map? change)
      (let [pieces (split-clock
                     (concat ["{"]
                       (mapcat identity
                         (interpose [","]
                           (for [[k v] change]
                             [(json/write-str k) ":" (if (identical? v clock-slot) clock-slot (json/write-str v))])))
                       ["}"]))]
        (concat ["\""] (interpose clock-slot (map escaped-fragment pieces)) ["\""]))
      [(json/write-str (json/write-str change))])))

;; [DX-W1] Why: keep the indexed identity, validity, ref and fixed position, and stage the exact clock slots off the serial point.
;; Rejected: per-row compression on the transactor, or recreating published journal identities from the business facts.
(defn prepare [^String text offset position new-ids]
  (try
    (let [start (- offset 2)
          id-end (+ 5 (Integer/parseInt text 1 5 16))
          id (subs text 5 id-end) values (json/read-str (subs text start))
          from (slice-bits text id-end)
          end (+ id-end 16)
          to (when-not (.startsWith text "----------------" (int end)) (slice-bits text end))]
      (when (and (= 17 (count values)) (= id (nth values 1)) (integer? (nth values 15))
                 (= (format "%016d" position) (first values))
                 (= (numeric-bits from) (numeric-bits (nth values 11)))
                 (or (and (nil? to) (nil? (nth values 12)))
                     (and (some? to) (= (numeric-bits to) (numeric-bits (nth values 12))))))
        (let [journal (= "_Transaction" (nth values 14))
              instant (and journal (= ":_tx/instant" (nth values 3)))
              changed (and journal (= ":_tx/change" (nth values 3)))
              shared? (and journal (= (nth values 2) (nth values 16)))
              slots (keep-indexed (fn [bit index]
                                     (let [v (nth values index)]
                                       (when (or (= 10 index) (and instant (= 8 index))
                                                 (and (some? v) (not (and shared? (= 16 index)))
                                                      (not (and (= 15 index) (= 1 v)))))
                                         [bit index v])))
                                  fields)
              mask (reduce (fn [n [bit]] (bit-set n bit)) (if shared? (bit-set 0 shared-tx-bit) 0) slots)
              tokens (map (fn [[_ i v]]
                            (cond
                              (or (= i 10) (and instant (= i 8))) [clock-slot]
                              (and changed (= i 9)) (change-tokens v new-ids)
                              :else [(json/write-str v)])) slots)]
          (split-clock (concat [(str "\"!1" (format "%04x" mask) "[")]
                               (mapcat identity (interpose [","] tokens)) ["]"])))))
    ;; The canonical function still owns unsupported or malformed rows and its existing error mapping.
    (catch Exception _ nil)))

(defn unpack [^String text start]
  (when (.startsWith text "!1" (int (+ start 19)))
    (let [mask (Integer/parseInt text (int (+ start 21)) (int (+ start 25)) 16)
          ids (+ 5 (Integer/parseInt text 1 5 16))
          from (slice-bits text ids)
          end (+ ids 16)
          to (when-not (.startsWith text "----------------" (int end)) (slice-bits text end))
          present (keep-indexed (fn [bit i] (when (bit-test mask bit) i)) fields)
          packed (json/read-str (subs text (+ start 25)))
          values (reduce (fn [arr [i v]] (assoc arr i v))
                         (assoc (vec (repeat 17 nil))
                           0 (subs text (+ start 2) (+ start 18)) 1 (subs text 5 ids) 11 from 12 to 15 1)
                         (map vector present packed))]
      (when-not (and (vector? packed) (= (count present) (count packed))
                     (< mask (bit-shift-left 1 (inc shared-tx-bit))) (bit-test mask 8))
        (throw (ex-info "Invalid packed row" {})))
      (if (bit-test mask shared-tx-bit) (assoc values 16 (nth values 2)) values))))
