(ns triplex.age.tape
  (:require [clojure.data.json :as json]
            [triplex.gateway.selftest :as fixture]
            [triplex.gateway.storage :as storage])
  (:import [java.nio.charset StandardCharsets]
           [java.security MessageDigest]
           [java.util HexFormat]))

(def seed-clock 1704067200000.0)
(def day-ms 86400000)
(def seed-frame 12)

(defn population [deep thin]
  (assert (and (pos? deep) (pos? thin) (or (> deep 1) (> thin 1))))
  (let [people (+ (* 10 deep) (* 4 thin))
        deep-active (* 10 (min (dec deep) 20000))
        thin-active (* 4 (min (dec thin) 5000))]
    {:deep deep :thin thin :people people :deep-active deep-active :thin-active thin-active
     :active (+ deep-active thin-active)
     :round-ms (if (>= people 1000000) (quot day-ms 3) (* 2 day-ms))}))

(defn person [{:keys [deep thin people adopted]} i]
  (assert (<= 0 i (dec people)))
  (cond
    adopted (assoc (nth adopted i) :fields 3)
    (< i (* 10 deep))
    {:owner (str "acct/d" (mod i 10) "/p" (quot i 10)) :fields 160}
    :else (let [j (- i (* 10 deep))]
      {:owner (str "acct/w" (mod j 4) "/p" (quot j 4)) :fields 4})))

(defn seed-head [{:keys [people seed-head]}]
  (or seed-head (quot (+ people (dec seed-frame)) seed-frame)))

(defn id [prefix n] (str prefix (format "%025d" (long n))))
(defn tx-id [n] (str "_tx/" (id "T" n)))
(defn operation [n] (str "age-save-" n))
(defn seed-position [i] (inc (quot i seed-frame)))
(defn attribute [j] (str ":field/f" j))

(defn row [id owner attr value tx pos clock]
  {:id id :entity_id owner :attribute attr :value_type "string" :value_string value
   :valid_from 0.0 :recorded_at clock :recorded_position pos :schema_version 1 :tx_id tx})

(defn seed-row [pop i j]
  (if-let [rows (:rows (person pop i))]
    (nth rows j)
    (let [pos (seed-position i)]
      (row (id "A" (+ (* i 160) j)) (:owner (person pop i)) (attribute j)
           (str "initial-" i "-" j) (str "age-seed-" pos) pos (+ seed-clock pos)))))

;; [DX-AGE1] Why: one immutable tape indexes predecessors without a history-sized in-memory state.
;; Rejected: random selection with retained commands or a workload that grows its person population each rung.
(defn owner-index [{:keys [deep active deep-active adopted]} n]
  (let [slot (mod n active)]
    (cond adopted slot
          (< slot deep-active) (+ 10 slot)
          :else (+ (* 10 deep) 4 (- slot deep-active)))))

(defn width [n pop] (inc (mod (+ (quot n (:active pop)) (mod n (:active pop))) 3)))
(defn logical-clock [{:keys [active round-ms origin-clock]} n]
  ;; [DX-AGE1] Why: retain hundreds of edits per active person when the seed has millions of idle people.
  ;; Rejected: sweeping every seeded resident before any active owner receives a second edit.
  (double (+ (or origin-clock seed-clock) (* 365 day-ms)
             (* (quot n active) round-ms)
             (quot (* (mod n active) round-ms) active))))

(defn edit-row [pop n j]
  (let [i (owner-index pop n) pos (+ (seed-head pop) (inc n))
        original (when (:adopted pop) (seed-row pop i j))
        value (str "edit-" i "-" n "-" j)
        value (if original
                (subs (.formatHex (HexFormat/of)
                                  (.digest (MessageDigest/getInstance "SHA-256")
                                           (.getBytes value StandardCharsets/UTF_8))) 0 57)
                value)
        new (row (id "B" (+ (* n 16) j)) (:owner (person pop i))
                 (or (:attribute original) (attribute j)) value (tx-id n) pos (logical-clock pop n))]
    (if original (assoc new :valid_from (:valid_from original)
                           :valid_to (:valid_to original)) new)))

(defn previous-edit [pop n j]
  (loop [candidate (- n (:active pop))]
    (cond
      (neg? candidate) nil
      (< j (width candidate pop)) candidate
      :else (recur (- candidate (:active pop))))))

(defn command [pop n]
  (let [i (owner-index pop n) owner (:owner (person pop i))
        w (width n pop) pos (+ (seed-head pop) (inc n)) clock (logical-clock pop n)
        tx (tx-id n) op (operation n)
        fresh (mapv #(edit-row pop n %) (range w))
        preceding (mapv #(previous-edit pop n %) (range w))
        prior (mapv (fn [j p] (if p (edit-row pop p j) (seed-row pop i j))) (range w) preceding)
        stored (when (:adopted pop)
                 (mapv #(when (nil? %2) (nth (:texts (person pop i)) %1)) (range w) preceding))
        prior-rev (if (< n (:active pop))
                    (or (:revision (person pop i)) (seed-position i))
                    (+ (seed-head pop) (inc (- n (:active pop)))))
        journal-row (fn [j attr value]
                      (assoc (row (id "B" (+ (* n 16) j)) tx attr value tx pos clock)
                             :entity_type "_Transaction"))
        journal [(assoc (journal-row 3 ":_tx/position" nil) :value_type "number" :value_number (double pos))
                 (assoc (journal-row 4 ":_tx/instant" nil) :value_type "datetime" :value_datetime clock)
                 (assoc (journal-row 5 ":_tx/changed-entity" owner) :value_type "ref")
                 (journal-row 6 ":_tx/command-id" op)]
        changes (concat
                  (for [r fresh] {:op "assert" :entityId owner :attribute (:attribute r)
                                  :value {:type "string" :value (:value_string r)} :tripleId (:id r)
                                  :validFrom (:valid_from r) :validTo (:valid_to r)})
                  (for [r prior] {:op "retract" :entityId owner :attribute (:attribute r)
                                  :tripleId (:id r) :recordedAt (:recorded_at r) :retractedAt clock}))
        journal (into journal
                      (map-indexed (fn [j change]
                                     (assoc (journal-row (+ 7 j) ":_tx/change" nil)
                                            :value_type "json" :value_json (json/write-str change))) changes))]
    {:i i :owner owner :n n :width w :operation op :tx tx :position pos :clock clock
     :prior-rev prior-rev :prior-texts stored
     :fresh fresh :prior prior :journal journal}))

(defn input [{:keys [owner operation tx position clock fresh prior journal]}]
  (let [new (into fresh journal)
        retired (map #(assoc % :retract_tx_id tx :retracted_at clock :retracted_position position) prior)]
    (fixture/row-input
      {"operationId" operation "position" position "span" 1 "sourceK" (dec position)
       "assignRecordTime" true "scopeWide" false "entities" [owner]
       "newIds" (mapv :id new) "claims" [{"commandId" operation "txId" tx "timestamp" clock}]
       "rows" (mapv storage/wire-row (concat new retired))})))

(defn expected-person [pop i saves]
  (let [origin (mapv #(seed-row pop i %) (range (:fields (person pop i))))
        deep-people (* 10 (or (:deep pop) 0))
        thin-start (+ deep-people 4)
        slot (cond (:adopted pop) (when (< i (:active pop)) i)
                   (<= 10 i (+ 9 (:deep-active pop))) (- i 10)
                   (<= thin-start i (+ (dec thin-start) (:thin-active pop)))
                   (+ (:deep-active pop) (- i thin-start)))]
    ;; [DX-AGE1] Why: derive the current oracle from chronological field updates in the last complete cycle.
    ;; Rejected: reading expected values back from either database or reusing the predecessor selection.
    (if (and slot (> saves slot))
      (let [round (quot (- (dec saves) slot) (:active pop))]
        (reduce (fn [rows r]
                  (let [n (+ slot (* r (:active pop)))]
                    (reduce (fn [acc j] (assoc acc j (edit-row pop n j))) rows (range (width n pop)))))
                origin (range (max 0 (- round 2)) (inc round))))
      origin)))
