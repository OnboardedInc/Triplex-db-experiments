(ns triplex.gateway.owner-root
  (:require [datomic.api :as d]))

;; [Opus W1] Why: every reader decides from the database itself whether an owner carries a covering root.
;; Rejected: a reader-side setting (a gateway started without it would misread a migrated person).
(def root-attr :triplex.owner/root)
(def owner-attr :triplex.owner/version-owner)
(def text-limit 4)

(defn prefix-end ^long [^String text] (+ 5 (Integer/parseInt text 1 5 16)))
(defn row-id [^String text] (subs text 5 (prefix-end text)))
(defn id-prefix [^String id] (str "2" (format "%04x" (.length id)) id))

(defn decode
  "Version 4 root: `4,position,clockBits,maskCount,len1,len2...\\n` then the mask IDs and row texts, length-framed."
  [^String raw]
  (when raw
    (let [split (.indexOf raw "\n")
          ^"[Ljava.lang.String;" head (when (and (pos? split) (.startsWith raw "4,")) (.split (subs raw 0 split) ","))
          n (when head (- (alength head) 4))
          masked (when head (Long/parseLong (aget head 3)))
          widths (when head (mapv #(Long/parseLong (aget head (+ 4 %))) (range n)))]
      (when-not (and head (pos? n) (<= 0 masked n) (<= masked text-limit) (<= 1 (- n masked) text-limit)
                     (every? pos? widths) (= (- (.length raw) split 1) (reduce + widths)))
        (throw (ex-info "Invalid owner projection root" {})))
      (let [cuts (vec (reductions + (inc split) widths))
            parts (mapv (fn [i] (subs raw (cuts i) (cuts (inc i)))) (range n))]
        {:raw raw :position (Long/parseLong (aget head 1))
         :clock (Double/longBitsToDouble (Long/parseLong (aget head 2)))
         :mask (subvec parts 0 masked) :texts (subvec parts masked)}))))

(def encode-code
  ;; [Opus W1] Why: every part is length-framed after one comma header, so a point read never runs the EDN reader.
  ;; Rejected: the version 3 EDN header (about 10 us of a 0.23 ms read on the Mac for the reader and escaped IDs).
  '(fn [position clock mask rows]
     (let [parts (concat mask rows)]
       (str "4," position "," (Double/doubleToRawLongBits (double clock)) "," (count mask) ","
            (apply str (interpose "," (map count parts))) "\n" (apply str parts)))))
(defmacro ^:private encoder [] encode-code)
(def encode (encoder))

(defn installed? [db] (some? (d/entid db root-attr)))
(defn raw [db eid] (when-let [a (d/entid db root-attr)] (:v (first (d/datoms db :eavt eid a)))))
(defn root [db eid] (decode (raw db eid)))

(defn owner-of
  "The owner of a row datom's entity: a version entity names its owner; any other entity is its own owner."
  [db e]
  (if-let [a (d/entid db owner-attr)]
    (or (:v (first (d/datoms db :eavt e a))) e)
    e))

(defn live
  "Live row datoms of one owner at db. Inline root texts come back as {:v text} maps beside native datoms.
  `visit!` sees every stored row, marker and inline text the read touches."
  [db eid visit!]
  ;; [DX-W1] Why: the covering root and legacy rows share one owner range at the selected basis.
  ;; Rejected: opening a page and then the public-ID and owner indexes for each edited row.
  (let [root-a (d/entid db root-attr)
        row-a (d/entid db :triplex.entity/row)
        retired-a (d/entid db :triplex.entity/retired)
        legacy (java.util.ArrayList.) retired (java.util.HashSet.) root (volatile! nil)]
    (doseq [^datomic.Datom datom (d/datoms db :eavt eid)]
      (let [a (.a datom)]
        (cond (= a row-a) (do (when visit! (visit! (.v datom))) (.add legacy datom))
              (= a root-a) (vreset! root (.v datom))
              (= a retired-a) (let [^String text (.v datom)]
                                (when visit! (visit! text))
                                (.add retired (subs text 0 (prefix-end text)))))))
    (let [{:keys [mask texts]} (decode @root)
          ;; [Opus W1] Why: at most four masked IDs, each matched as the exact length-tagged row prefix without allocating.
          ;; Rejected: cutting an ID substring from every legacy row and probing a hash set.
          ^"[Ljava.lang.String;" prefixes (into-array String (map id-prefix mask))
          n (alength prefixes)
          ^java.util.Set retired retired
          keep? (fn [^datomic.Datom datom]
                  (let [^String text (.v datom)]
                    (not (or (loop [i 0]
                               (cond (= i n) false
                                     (.startsWith text ^String (aget prefixes i)) true
                                     :else (recur (inc i))))
                             (and (not (.isEmpty retired)) (.contains retired (subs text 0 (prefix-end text))))))))]
      (when (and visit! texts) (run! visit! texts))
      (if (seq texts)
        ;; [Opus W1] Why: callers see the same index order of stored texts as for a legacy person.
        (vec (sort-by :v (into (filterv keep? legacy) (map #(hash-map :v %)) texts)))
        (filterv keep? legacy)))))

(defn version-datoms
  "Every row and retirement marker a migrated owner's version entities carry in `source` (a history or as-of view)."
  [source owner attr]
  (when-let [a (d/entid source owner-attr)]
    (mapcat (fn [link] (d/datoms source :eavt (:e link) attr)) (d/datoms source :vaet owner a))))
