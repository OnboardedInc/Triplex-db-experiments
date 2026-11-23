(ns triplex.gateway.owner-root
  (:require [datomic.api :as d]))

;; [Opus W1] Why: every reader decides from the database itself whether an owner carries a covering root.
;; Rejected: a reader-side setting (a gateway started without it would misread a migrated person).
(def root-attr :triplex.owner/root)
(def owner-attr :triplex.owner/version-owner)
(def text-limit 4)

(defn prefix-end ^long [^String text] (+ 5 (Integer/parseInt text 1 5 16)))
(defn row-id [^String text] (subs text 5 (prefix-end text)))
(defn id-prefix [^String id]
  (let [h (Integer/toHexString (.length id))]
    (str "2" (subs "0000" (min 4 (count h))) h id)))

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

(defn- merge-sorted
  "Merge the root's few inline texts into the legacy rows, which arrive in index order."
  [^java.util.ArrayList kept texts]
  (let [extra (sort texts) out (java.util.ArrayList. (+ (.size kept) (count texts)))]
    (loop [i 0 extra (seq extra)]
      (cond
        (and (< i (.size kept)) (or (nil? extra)
                                    (neg? (.compareTo ^String (.v ^datomic.Datom (.get kept i)) ^String (first extra)))))
        (do (.add out (.get kept i)) (recur (inc i) extra))
        extra (do (.add out {:v (first extra)}) (recur i (next extra)))
        :else (vec out)))))

(defn live
  "Live row datoms of one owner at db. Inline root texts come back as {:v text} maps beside native datoms, in the
  same index order as a legacy person's rows. `visit!` sees every stored row, marker and inline text the read touches."
  [db eid visit!]
  ;; [DX-W1] Why: the covering root and legacy rows share one owner range at the selected basis.
  ;; Rejected: opening a page and then the public-ID and owner indexes for each edited row.
  ;; [Opus W1] Why: one pass, no allocation beyond the row list when the person has no root and no markers.
  ;; Rejected: sorting the merged rows (it cost about 0.2 ms of a 0.3 ms read on the Mac) and String/format per mask ID.
  (let [root-a (d/entid db root-attr)
        row-a (d/entid db :triplex.entity/row)
        retired-a (d/entid db :triplex.entity/retired)
        legacy (java.util.ArrayList.)
        retired (volatile! nil)
        root (volatile! nil)]
    (doseq [^datomic.Datom datom (d/datoms db :eavt eid)]
      (let [a (.a datom)]
        (cond (= a row-a) (do (when visit! (visit! (.v datom))) (.add legacy datom))
              (= a root-a) (vreset! root (.v datom))
              (= a retired-a) (let [^String text (.v datom)]
                                (when visit! (visit! text))
                                (.add ^java.util.HashSet (or @retired (vreset! retired (java.util.HashSet.)))
                                      (subs text 0 (prefix-end text)))))))
    (if (and (nil? @root) (nil? @retired))
      (vec legacy)
      (let [{:keys [mask texts]} (decode @root)
            ^"[Ljava.lang.String;" prefixes (into-array String (map id-prefix mask))
            n (alength prefixes)
            ^java.util.Set retired @retired
            kept (java.util.ArrayList. (.size legacy))]
        (dotimes [k (.size legacy)]
          (let [^datomic.Datom datom (.get legacy k) ^String text (.v datom)]
            (when-not (or (loop [i 0]
                            (cond (= i n) false
                                  (.startsWith text ^String (aget prefixes i)) true
                                  :else (recur (inc i))))
                          (and retired (.contains retired (subs text 0 (prefix-end text)))))
              (.add kept datom))))
        (when (and visit! texts) (run! visit! texts))
        (if (seq texts) (merge-sorted kept texts) (vec kept))))))

(defn version-datoms
  "Every row and retirement marker a migrated owner's version entities carry in `source` (a history or as-of view)."
  [source owner attr]
  (when-let [a (d/entid source owner-attr)]
    (mapcat (fn [link] (d/datoms source :eavt (:e link) attr)) (d/datoms source :vaet owner a))))
