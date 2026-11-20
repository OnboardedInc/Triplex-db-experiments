(ns triplex.compact.fixtures
  (:require [triplex.compact.store :as store]))

(def accounts (mapv #(str "a" %) (range 10)))
(def now-valid "2026-11-04T12:00:00.000000Z")
(defn root [i] (str "pl:p" i))
(defn account [i] (nth accounts (mod i (count accounts))))
(defn input [account root command expected adds retires]
  {:account account :root root :command command :expected expected :adds (vec adds) :retires (vec retires)})
(defn answer [root i] (str root "/ans:" i))
(defn round-value [serial i j]
  (str "reply-" serial "-" i "-" j "-" (Integer/toUnsignedString (hash [serial i j]) 36)))
(defn seed-facts [person n]
  (let [root (root person)]
    (vec (take n
      (concat [[root "startDate" "2026-11-02" nil nil]
               [root "weeklyMinutes" 2400 nil nil]
               [root "payRateCents" 1600 nil nil]
               [root "bgcStatus" "clear" nil nil]]
              (mapcat (fn [chain]
                        (let [first (* chain 4)]
                          (cons [root "answers" (answer root first) nil nil]
                            (mapcat (fn [j]
                                      (cond-> [[(answer root j) "value" (round-value 0 person j) nil nil]
                                               [(answer root j) "field" (str "field-" j) nil nil]]
                                        (< j (+ first 3))
                                        (conj [(answer root j) "next" (answer root (inc j)) nil nil])))
                                    (range first (+ first 4)))))) (range n)))))))
(defn correction [person serial width]
  (mapv (fn [j] [(answer (root person) j) "value" (round-value serial person j) nil nil]) (range width)))
(defn replace-ordinals [width] (mapv #(+ 5 (* 3 %)) (range width)))
(defn sorted-world [w] (update w :facts #(vec (sort-by (juxt :e :a (comp store/canonical :v) :tx) %))))
