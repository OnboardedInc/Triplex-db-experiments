(ns triplex.age.native
  (:require [clojure.data.json :as json]
            [datomic.api :as d]
            [triplex.age.tape :as tape]
            [triplex.gateway.commit :as commit]
            [triplex.gateway.group :as group]
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

(defn render [{:keys [owner operation tx position clock fresh prior journal prior-texts]}]
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
                       (map (fn [r text]
                              (or text (if (.startsWith ^String (:id r) "A")
                                         (fixture/row-text r) (stored-text r prior-ids))))
                            prior (or prior-texts (repeat nil))))))))

(def attrs [:db/txInstant :triplex.tx/position :triplex.tx/operation-id :triplex.entity/id
            :triplex.claim/command-id :triplex.tx/max-recorded-at :triplex.entity/row :triplex.entity/rev])

(defn grouped-render [commands]
  ;; [DX-AGE1] Why: mirror W1 materialize for a window with distinct owners and no born-and-retired rows.
  ;; Rejected: concatenating solo transactions, which would merge journals and hide interior cuts.
  (let [last-position (:position (peek commands))]
    (vec
      (mapcat (fn [{:keys [owner position clock tx width prior] :as command}]
                (let [final? (= position last-position)
                      member (if final? "datomic.tx" (str "age/member/" position))
                      owner-ref [:triplex.entity/id owner]
                      [header & rows] (render command)
                      header (if final? header
                                 (-> header
                                     (dissoc :triplex.tx/position :triplex.tx/max-recorded-at)
                                     (assoc :db/id member :triplex.tx/recorded-at clock)))
                      tags [[:db/add "datomic.tx" :triplex.group/members member]
                            [:db/add member :triplex.group/physical "datomic.tx"]
                            [:db/add member :triplex.group/position position]
                            [:db/add member :triplex.group/touched member]
                            [:db/add member :triplex.group/touched owner-ref]]
                      markers (for [r prior]
                                [:db/add owner-ref :triplex.entity/retired
                                 (str (group/prefix (fixture/row-text r)) (tape/digits 16 position)
                                      (format "%016x" (Double/doubleToRawLongBits (double clock))) tx)])]
                  (check! (= width (count markers)) "Grouped retirement count differs" {:position position})
                  (concat [header] rows tags markers)))
              commands))))

(defn grouped-ack! [commands {:keys [db-after tx-data]} previous-t]
  (let [t (d/basis-t db-after)
        physical (d/t->tx t)
        records (+ 2 (reduce + (map #(+ 15 (* 5 (:width %))) commands)))]
    (check! (and (< previous-t t) (= records (count tx-data))
                 (every? #(= physical (:tx %)) tx-data))
            "Physical group datoms or ordering differ" {:t t :records records})
    (doseq [{:keys [position clock operation tx owner prior-rev]} commands
            :let [receipt (group/receipt db-after operation)
                  member (d/entid db-after [:triplex.entity/id tx])
                  owner-id (d/entid db-after [:triplex.entity/id owner])]]
      (check! (and (= {:position position :clock clock :t t} receipt)
                   (= member (d/entid db-after [:triplex.claim/command-id operation]))
                   (some #(and (= owner-id (:e %)) (= prior-rev (:v %)) (not (:added %))
                               (= :triplex.entity/rev (d/ident db-after (:a %)))) tx-data))
              "Group logical receipt or predecessor revision differs" {:position position}))
    [t records]))

(defn grouped-age! [{:keys [conn]} pop from to size]
  (let [db (d/db conn) start (System/nanoTime)]
    (check! (<= 2 size (:active pop)) "Group owners must be distinct" {:size size})
    (check! (= (+ (tape/seed-head pop) from) (storage/head-position db)) "Group start differs" {:from from})
    (let [[t total]
          (reduce (fn [[prev total] batch]
                    (let [commands (mapv #(tape/command pop %) batch)
                          data (grouped-render commands)
                          result (deref (d/transact-async conn data) 120000 ::timeout)]
                      (check! (not= result ::timeout) "Group outcome unknown" {:from (first batch)})
                      (let [[t count] (grouped-ack! commands result prev)] [t (+ total count)])))
                  [(d/basis-t db) 0] (partition-all size (range from to)))
          seconds (/ (- (System/nanoTime) start) 1e9)]
      (check! (= (+ (tape/seed-head pop) to) (storage/head-position (d/db conn)))
              "Final grouped head differs" {:to to})
      {:from from :to to :t t :seconds seconds :records total :recordsPerSecond (/ total seconds)
       :groupSize size})))

(defn acknowledge! [command authored result previous-t id-attr]
  (let [{:keys [db-after tx-data]} result
        t (or (d/as-of-t db-after) (d/basis-t db-after)) tx (d/t->tx t)
        owner (d/entid db-after [:triplex.entity/id (:owner command)])
        prior-rev (:prior-rev command)
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

(defn age!
  ([db pop from to depth] (age! db pop from to depth false))
  ([{:keys [conn]} pop from to depth rolling?]
  (check! (<= 1 depth (min 1024 (:active pop))) "Depth exceeds the tape's nonoverlapping owner window" {:depth depth})
  (let [start (System/nanoTime) db (d/db conn) head (storage/head-position db)
        id-attr (into {} (map (fn [a] [(d/entid db a) a]) attrs))
        stage (long-array 5)]
    (check! (= head (+ (tape/seed-head pop) from)) "Database head differs from tape start" {:head head :from from})
    (let [add-stage! (fn [i a b] (aset-long stage i (+ (aget stage i) (- b a))))
          send! (fn [n]
                  (let [built (System/nanoTime)
                        command (tape/command pop n) rendered (System/nanoTime)
                        authored (render command) enqueue (System/nanoTime)
                        ack (d/transact-async conn authored) enqueued (System/nanoTime)]
                    (add-stage! 0 built rendered)
                    (add-stage! 1 rendered enqueue)
                    (add-stage! 2 enqueue enqueued)
                    [command authored ack]))
          receive! (fn [[t datoms] [command authored ack]]
                     (let [waiting (System/nanoTime) r (deref ack 120000 ::timeout)
                           ready (System/nanoTime)]
                       (check! (not= r ::timeout) "Native receipt timed out; outcome unknown" {:position (:position command)})
                       (let [[next-t n] (acknowledge! command authored r t id-attr)]
                         (add-stage! 3 waiting ready)
                         (add-stage! 4 ready (System/nanoTime))
                         [next-t (+ datoms n)])))
          initial [(d/basis-t db) 0]
          [t datoms] (if rolling?
                       (loop [sent (min to (+ from depth))
                              pending (into clojure.lang.PersistentQueue/EMPTY
                                            (map send! (range from (min to (+ from depth)))))
                              state initial]
                         (if (empty? pending) state
                           (let [done (receive! state (peek pending)) rest (clojure.core/pop pending)]
                             (if (< sent to)
                               (recur (inc sent) (conj rest (send! sent)) done)
                               (recur sent rest done)))))
                       (reduce (fn [state batch] (reduce receive! state (mapv send! batch)))
                               initial (partition-all depth (range from to))))
          elapsed (/ (- (System/nanoTime) start) 1e9)]
      (check! (= (+ (tape/seed-head pop) to) (storage/head-position (d/db conn)))
              "Final native head differs from tape end" {:to to})
      {:from from :to to :t t :seconds elapsed :records datoms :recordsPerSecond (/ datoms elapsed)
       :depth depth :rolling rolling?
       :stageMs (zipmap [:tape :encode :enqueue :blockedAwait :ackValidate]
                       (map #(/ % 1e6) stage))}))))
