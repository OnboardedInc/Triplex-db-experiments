(ns triplex.age.native
  (:require [clojure.data.json :as json]
            [datomic.api :as d]
            [triplex.age.tape :as tape]
            [triplex.gateway.commit :as commit]
            [triplex.gateway.main :as gateway]
            [triplex.gateway.selftest :as fixture]
            [triplex.gateway.small-row :as small]
            [triplex.gateway.storage :as storage]))

(defn check! [condition message data]
  (when-not condition (throw (ex-info message data))))

(defn open! [label]
  (let [attempt (System/getenv "AGE_ATTEMPT")
        _ (check! (and attempt (re-matches #"[a-z0-9-]+" attempt)) "Missing attempt" {})
        scope (json/write-str ["triplex-scope-v1" "test" "age1" (str attempt "-" label) 0])
        result (gateway/create-scope! nil scope "lean" true true)]
    (check! (:created result) "Fresh empty database required" {:label label})
    {:scope scope :name (:db result) :conn (gateway/connection (gateway/db-uri (:db result)))}))

(defn emit [event data]
  (println "DX_AGE1" (json/write-str (assoc data :event event :attempt (System/getenv "AGE_ATTEMPT"))))
  (flush))

(defn seed! [{:keys [conn]} pop]
  (let [initial (d/db conn)
        attributes (into {} (map (fn [a] [(d/entid initial a) a])
                                  [:db/txInstant :triplex.entity/id :triplex.entity/rev :triplex.entity/row
                                   :triplex.tx/id :triplex.tx/position :triplex.tx/max-recorded-at]))]
    (first
      (reduce
        (fn [[total last-t] people]
          (let [p (tape/seed-position (first people))
                clock (+ tape/seed-clock p) tx-id (str "age-seed-" p)
                owners (mapv (fn [i]
                               (let [{:keys [owner fields]} (tape/person pop i)]
                                 {:db/id (str "e:" owner) :triplex.entity/id owner :triplex.entity/rev p
                                  :triplex.entity/row (mapv #(fixture/row-text (tape/seed-row pop i %)) (range fields))})) people)
                {:keys [db-after tx-data tempids]}
                @(d/transact conn (conj owners {:db/id "datomic.tx" :triplex.tx/id tx-id
                                                :triplex.tx/position p :triplex.tx/max-recorded-at clock}))
                t (d/basis-t db-after) tx (d/t->tx t)
                expected (into #{[tx :db/txInstant :engine-time] [tx :triplex.tx/id tx-id]
                                 [tx :triplex.tx/position p] [tx :triplex.tx/max-recorded-at clock]}
                               (mapcat (fn [o]
                                         (let [e (get tempids (:db/id o))]
                                           (concat [[e :triplex.entity/id (:triplex.entity/id o)] [e :triplex.entity/rev p]]
                                                   (map (fn [row] [e :triplex.entity/row row]) (:triplex.entity/row o))))) owners))
                got (into #{} (for [x tx-data :when (and (:added x) (= tx (:tx x)))
                                    :let [a (attributes (:a x)) v (:v x)]]
                                [(:e x) a (if (and (= :db/txInstant a) (instance? java.util.Date v)) :engine-time v)]))]
            (check! (and (< last-t t) (= (count expected) (count tx-data)) (= expected got))
                    "Seed native datoms differ" {:position p :t t :last-t last-t :expected (count expected) :observed (count tx-data)})
            [(+ total (count tx-data)) t]))
        [0 (d/basis-t initial)] (partition-all tape/seed-frame (range (:people pop)))))))

(defn stored-text [row ids]
  (let [text (fixture/row-text row)
        offset (+ 44 (count (:id row)) (if (= "ref" (:value_type row)) (count (:value_string row)) 0))
        p (:recorded_position row) plan (small/prepare text offset p ids)]
    (check! (seq plan) "Tape row no longer qualifies for the K encoder" {:id (:id row)})
    (str (subs text 0 offset) (format "%016d" p)
         (apply str (interpose (Double/toString (double (:recorded_at row))) plan)))))

(defn native-rows [rows ids] (mapv #(stored-text % ids) rows))

(defn journal-texts [journal prev ids position clock]
  (let [prior (into {} (map (fn [r] [(:id r) {"recordedAt" (:recorded_at r)
                                              "validFrom" (:valid_from r) "validTo" (:valid_to r)}]) prev))
        stamp (commit/stamp true clock ids (dec position) position position false prior)]
    (mapv (fn [row]
            (if (storage/timed-retraction row)
              (let [text (fixture/row-text row)
                    offset (+ 44 (count (:id row)))]
                ;; [DX-AGE1] Why: K keeps timed retract journals in the canonical full encoding.
                ;; Rejected: compressing these rows as if the predecessor clock were client-authoritative.
                (stamp [:triplex/row text position offset :row]))
              (stored-text row ids))) journal)))

(defn render [{:keys [owner operation tx position clock fresh prior journal]}]
  (let [ids (set (map :id (concat fresh journal)))
        owner-ref [:triplex.entity/id owner]
        prior-ids (set (map :id prior))]
    ;; [DX-AGE1] Why: the native transaction keeps one actual log frame and receipt per K save.
    ;; Rejected: combining solo saves in one physical transaction, which replaces instants and changes native cuts.
    (into [{:db/id "datomic.tx" :triplex.tx/position position :triplex.tx/operation-id operation
            :triplex.entity/id tx :triplex.claim/command-id operation :triplex.tx/max-recorded-at clock
            :triplex.entity/row (journal-texts journal prior ids position clock)}
           [:db/add owner-ref :triplex.entity/rev position]]
          (concat (map (fn [value] [:db/add owner-ref :triplex.entity/row value]) (native-rows fresh ids))
                  (map (fn [value] [:db/retract owner-ref :triplex.entity/row value])
                       (map #(if (.startsWith ^String (:id %) "A") (fixture/row-text %) (stored-text % prior-ids)) prior))))))

(def attrs [:db/txInstant :triplex.tx/position :triplex.tx/operation-id :triplex.entity/id
            :triplex.claim/command-id :triplex.tx/max-recorded-at :triplex.entity/row :triplex.entity/rev])

(defn acknowledge! [pop command authored result previous-t id-attr]
  (let [{:keys [db-after tx-data]} result
        t (d/basis-t db-after) tx (d/t->tx t)
        owner (d/entid db-after [:triplex.entity/id (:owner command)])
        n (:n command) previous (- n (:active pop))
        prior-rev (if (neg? previous) (tape/seed-position (:i command)) (+ (tape/seed-head pop) (inc previous)))
        header (first authored)
        expected (into #{[tx :db/txInstant :engine-time true] [owner :triplex.entity/rev prior-rev false]}
                       (concat
                         (for [[attr v] (dissoc header :db/id :triplex.entity/row)] [tx attr v true])
                         (for [v (:triplex.entity/row header)] [tx :triplex.entity/row v true])
                         (for [[op _ attr v] (rest authored)] [owner attr v (= op :db/add)])))
        seen (into #{} (map (fn [x]
                             (let [attr (id-attr (:a x)) v (:v x)]
                               [(:e x) attr (if (and (= attr :db/txInstant) (instance? java.util.Date v))
                                             :engine-time v) (:added x)]))) tx-data)]
    (check! (and owner (< previous-t t) (= (+ 12 (* 4 (:width command))) (count tx-data) (count expected))
                 (= expected seen) (every? #(= tx (:tx %)) tx-data))
            "Native reply differs from the requested K save"
            {:t t :previous-t previous-t :position (:position command) :records (count tx-data)})
    [t (count tx-data)]))

(defn age! [{:keys [conn]} pop from to depth]
  (check! (<= 1 depth (min 128 (:active pop))) "Depth exceeds the tape's nonoverlapping owner window" {:depth depth})
  (let [start (System/nanoTime) db (d/db conn) head (storage/head-position db)
        id-attr (into {} (map (fn [a] [(d/entid db a) a]) attrs))]
    (check! (= head (+ (tape/seed-head pop) from)) "Database head differs from tape start" {:head head :from from})
    (let [[t datoms]
          (reduce (fn [state batch]
                    (let [pending (mapv (fn [n]
                                          (let [command (tape/command pop n) authored (render command)]
                                            [command authored (d/transact-async conn authored)])) batch)]
                      (reduce (fn [[t datoms] [command authored future]]
                                (let [r (deref future 120000 ::timeout)]
                                  (check! (not= r ::timeout) "Native receipt timed out; outcome unknown" {:position (:position command)})
                                  (let [[next-t n] (acknowledge! pop command authored r t id-attr)]
                                    [next-t (+ datoms n)])))
                              state pending)))
                  [(d/basis-t db) 0] (partition-all depth (range from to)))
          elapsed (/ (- (System/nanoTime) start) 1e9)]
      (check! (= (+ (tape/seed-head pop) to) (storage/head-position (d/db conn)))
              "Final native head differs from tape end" {:to to})
      {:from from :to to :t t :seconds elapsed :records datoms :recordsPerSecond (/ datoms elapsed)})))
