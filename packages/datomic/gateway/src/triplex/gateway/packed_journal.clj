(ns triplex.gateway.packed-journal
  (:require [clojure.data.json :as json] [datomic.api :as d] [clojure.walk :as walk]
            [triplex.gateway.slim :as slim]))

(def enabled (= "1" (System/getenv "TX2_PACKED_JOURNAL")))

;; [DX-W1] Why: a single indexed value reserves a short, gapless run, including in native history.
;; Rejected: dropping never-reuse or searching every historical journal when an ID arrives.
(def identity-code
  '(fn [db id]
     (when (and (string? id) (re-matches #"[0-9A-Z]{26}" id))
       (let [start (str "2001a" (subs id 0 25))
             end (str "2001a" id "\uffff")
             suffix (int (.charAt ^String id 25))]
         (boolean
           (some (fn [x] (let [^String frame (:v x)
                               low (int (.charAt frame 30))
                               count (Integer/parseInt frame 31 32 16)]
                           (<= 0 (- suffix low) (dec count))))
                 (d/index-range (d/history db) :triplex.journal/packed start end)))))))

(def decode-columns-code
  '(fn [^String text]
     (let [id-end (+ 5 (Integer/parseInt text 1 5 16))
           ref-start (+ id-end 36)
           start (+ ref-start 1 (Integer/parseInt text (+ id-end 32) ref-start 16))]
       (if (.startsWith text "!1" (+ start 19))
         (let [mask (Integer/parseInt text (+ start 21) (+ start 25) 16)
               packed (json/read-str (subs text (+ start 25)))
               fields [2 3 4 5 6 7 8 9 10 13 14 15 16]
               values (reduce (fn [v [i x]] (assoc v i x)) (vec (repeat 17 nil))
                              (map vector (keep-indexed (fn [bit i] (when (bit-test mask bit) i)) fields) packed))]
           [(subs text 0 start) (assoc values 1 (subs text 5 id-end))])
         [(subs text 0 start) (json/read-str (slim-body-code (subs text start)))]))))

(def business-code
  '(fn [row]
     (when (= "string" (nth row 4))
       {"entityId" (nth row 2) "attribute" (nth row 3)
        "value" {"type" "string" "value" (nth row 5)}})))
(def restore-code
  '(fn [[prefix columns id keys] business]
     (let [source (business id)]
       (when-not source (throw (ex-info "Missing packed journal predecessor" {:id id})))
       (str prefix
         (json/write-str
           (if (= ":_tx/changed-entity" (nth columns 3))
             (assoc columns 5 (get source "entityId"))
             (assoc columns 9 (json/write-str (merge (nth columns 9) (select-keys source keys))))))))))

;; [DX-W1] Why: encode references only when they reproduce each original row byte, including arbitrary metadata.
;; Rejected: silently reconstructing custom journal content or changing public journal IDs.
(def encode-code
  '(fn [resolved ids]
     (let [resolved (vec resolved) selected (set ids)
           row-id (fn [^String text] (subs text 5 (+ 5 (Integer/parseInt text 1 5 16))))
           row-op? (fn [op] (and (instance? java.util.List op) (= :triplex.entity/row (nth op 2 nil))))
           business (into {} (keep (fn [[_ _ _ text :as op]]
                                     (when (row-op? op)
                                       (let [id (row-id text)]
                                         (when-not (selected id)
                                           (when-let [row (packed-business-code (second (packed-columns-code text)))]
                                             [id row]))))))
                          (filter row-op? resolved))
           templates (vec (for [[_ _ _ text :as op] (filter row-op? resolved)
                                :when (selected (row-id text))]
                            (let [[prefix columns] (packed-columns-code text)
                                  a (nth columns 3)
                                  change (when (= ":_tx/change" a) (json/read-str (nth columns 9)))
                                  id (if change (get change "tripleId")
                                       (first (sort (for [[id row] business :when (= (nth columns 5) (get row "entityId"))] id))))
                                  source (get business id)
                                  keys (when change (vec (filter #(and (contains? change %) (= (get change %) (get source %))) (keys source))))
                                  recipe [prefix
                                          (if change (assoc columns 9 (reduce #(assoc %1 %2 nil) change keys))
                                            (assoc columns 5 nil)) id keys]]
                              (when (and source (if change (seq keys) (= ":_tx/changed-entity" a))
                                         (= text (packed-restore-code (json/read-str (json/write-str recipe)) business)))
                                recipe))))]
       (if (and (= (count ids) (count templates)) (every? some? templates))
         (let [plain (json/write-str templates)
               frame (packed-frame-code plain 2)]
           (if (= plain (slim-body-code frame))
             (conj (filterv #(not (and (row-op? %) (selected (row-id (nth % 3))))) resolved)
                   [:db/add "datomic.tx" :triplex.journal/packed (str "2001a" (first ids) (format "%x" (count ids)) frame)])
             resolved))
         resolved))))

(defn definitions []
  (let [columns (walk/postwalk-replace {'slim-body-code slim/decoder-code} decode-columns-code)]
    {'packed-columns-code columns 'packed-business-code business-code 'packed-restore-code restore-code
     'packed-frame-code slim/encoder-code 'slim-body-code slim/decoder-code}))
(def compiled-encode (walk/postwalk-replace (definitions) encode-code))
(def restore (eval restore-code))
(def to-business (eval business-code))
(def columns (eval (get (definitions) 'packed-columns-code)))

(defn identity-run [ids]
  (let [ordered (vec (sort ids))]
    (when (and (<= 2 (count ordered) 15) (every? #(re-matches #"[0-9A-Z]{26}" %) ordered)
               (apply = (map #(subs % 0 25) ordered))
               (every? true? (map-indexed #(= (+ %1 (int (.charAt ^String (first ordered) 25))) (int (.charAt ^String %2 25))) ordered)))
      ordered)))

(defn rows [db e]
  (when-let [frame (:v (first (d/datoms db :eavt e :triplex.journal/packed)))]
    (let [templates (json/read-str (slim/body (subs frame 32)))
          business (memoize (fn [id]
                              (let [prefix (str "2" (format "%04x" (.length ^String id)) id)
                                    x (first (filter :added (d/index-range (d/history db) :triplex.entity/row prefix (str prefix "\uffff"))))]
                                (when x (to-business (second (columns (:v x))))))))]
      (mapv #(restore % business) templates))))
