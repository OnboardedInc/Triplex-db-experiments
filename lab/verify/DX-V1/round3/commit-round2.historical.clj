(ns triplex.gateway.commit
  (:require [datomic.api :as d] [triplex.gateway.schema :as schema]))

;; [DX-B3-M2] Why: the serial point belongs in Datomic, after parallel client staging.
;; Rejected: scope CAS in the peer (unrelated subjects conflict and queue).
(def code
  '(letfn [(value [e a] (:v (first (d/datoms db :eavt e a))))
           ;; [DX-B8] Why: immutable transaction values avoid the per-commit scope retraction merge.
           ;; Rejected: a peer-cached head (allocation must remain atomic on the transactor).
           (newest-commit []
             (let [tx (d/t->tx (d/basis-t db))]
               (if (some? (value tx :triplex.tx/position)) tx
                 ;; [DX-B8] Why: one AEVT seek skips any suffix of non-commit transactions.
                 ;; Rejected: walking the log backwards (unbounded marker suffix).
                 (let [datom (first (d/rseek-datoms db :aevt :triplex.tx/position tx))]
                   (when (and datom (= (:a datom) (d/entid db :triplex.tx/position))) (:e datom))))))
           (digits [p] (let [s (str p)] (str (subs "0000000000000000" (count s)) s)))
           (row-id [id]
             (let [prefix (str "2" (format "%04x" (.length ^String id)) id)
                   datom (first (d/index-range db :triplex.entity/row prefix nil))]
               (when (and datom (.startsWith ^String (:v datom) prefix))
                 (let [marker (first (d/seek-datoms db :eavt (:e datom) :triplex.entity/retired prefix))]
                   (when-not (and marker (= (:a marker) (d/entid db :triplex.entity/retired))
                                  (.startsWith ^String (:v marker) prefix)) datom)))))
           ;; [DX-B5-L1] Why: legacy assertion identities remain reserved after retirement.
           ;; Rejected: accepting a reused retired ID (history would contain two incompatible rows for one identity).
           (identity-row [id]
             (let [prefix (str "2" (format "%04x" (.length ^String id)) id)
                   datom (first (d/index-range (d/history db) :triplex.entity/row prefix nil))]
               (when (and datom (.startsWith ^String (:v datom) prefix)) datom)))
           (conflict [] (throw (ex-info "TRIPLEX_CONFLICT" {})))]
     (let [{:keys [scope source provisional span lean live entities scope-wide ops times replay-safe irregular position-irregular journal-entities]} payload
           head-v2 (= 2 (value scope :triplex.scope/head-version))
           latest (when head-v2 (newest-commit))
           h (if head-v2 (or (when latest (value latest :triplex.tx/position)) 0)
                 (value scope :triplex.scope/position)) final (+ h span) final-digits (digits final) delta (- final provisional)
           lower (- provisional span)
           shifted (fn [p] (if (< lower p (inc provisional)) (+ p delta) p))
           row-a (d/entid db :triplex.entity/row)]
       (when (or (not (pos? span)) (> final 9007199254740991))
         (throw (ex-info "Invalid commit span" {})))
       (when (and scope-wide (not= h source)) (conflict))
       (doseq [id live]
         (when-not (if lean (row-id id) (when-let [e (d/entid db [:f/id id])] (value e :f/live))) (conflict)))
       (when source
         (doseq [id entities]
           (when-let [e (d/entid db [:triplex.entity/id id])]
             (when (> (or (value e :triplex.entity/rev) 0) source) (conflict)))))
       (letfn [(replace-value [x]
                 (cond
                   (and (instance? java.util.List x) (= :triplex/position (first x))) (shifted (second x))
                   (and (instance? java.util.List x) (= :triplex/double-position (first x))) (double (shifted (second x)))
                   (and (instance? java.util.List x) (= :triplex/row (first x)))
                   (let [[_ text p offset] x]
                     (if (and (not= 0 delta) (< lower p (inc provisional)))
                       (str (subs text 0 offset) (if (= p provisional) final-digits (digits (shifted p)))
                            (subs text (+ offset 16))) text))
                   (instance? java.util.Map x) (into {} (map (fn [[k v]] [k (replace-value v)]) x))
                   (instance? java.util.List x) (mapv replace-value x)
                   :else x))]
         (let [prepared
               (mapcat (fn [op]
                         (cond
                           (= :triplex/assert (first op))
                           (let [[_ entity a text] op raw (second text)
                                 id (subs raw 5 (+ 5 (Integer/parseInt raw 1 5 16)))]
                             (when (identity-row id) (throw (ex-info "TRIPLEX_IDENTITY f/id" {})))
                             [(replace-value [:db/add entity a text])])
                           (= :triplex/retract (first op))
                           (let [[_ entity id] op e (d/entid db [:triplex.entity/id entity])
                                 suffix (str (format "%04x" (.length ^String id)) id)
                                 ;; [DX-B5-L1] Why: a hot subject's other rows must not make stamp retirement linear.
                                 ;; Rejected: scanning every row on the touched entity; legacy retains its original path.
                                 text (if lean
                                        (let [prefix (str "2" suffix) datom (first (d/seek-datoms db :eavt e row-a prefix))]
                                          (when (and datom (= e (:e datom)) (= row-a (:a datom))
                                                     (.startsWith ^String (:v datom) prefix)) (:v datom)))
                                        (some (fn [datom]
                                                (let [v (:v datom)]
                                                  (when (and (= e (:e datom)) (= row-a (:a datom))
                                                             (or (.startsWith ^String v (str "2" suffix))
                                                                 (.startsWith ^String v (str "1" suffix)))) v)))
                                              (d/datoms db :eavt e row-a)))]
                             (when (and (nil? text) (not (value e :triplex.entity/row-overflow)))
                               (throw (ex-info "Missing live row datom" {})))
                             (if text [[:db/retract e :triplex.entity/row text]] []))
                           :else [(replace-value op)])) ops)
               prior (if head-v2 (when latest (value latest :triplex.tx/max-recorded-at))
                         (value scope :triplex.scope/max-recorded-at))
               maximum (if (seq times) (reduce max (or prior (first times)) times) (when head-v2 prior))
               _ (when (and replay-safe prior (some #(<= % prior) times))
                   (throw (ex-info (str "TRIPLEX_CLOCK " prior) {:maximum prior})))
               irregular (or irregular
                             (and (seq times)
                                  (or (some #(not= (first times) %) times)
                                      (and prior (some #(< % prior) times)))))]
           (vec (concat prepared
                        (when-not head-v2 [[:db/add scope :triplex.scope/position final]])
                        ;; [DX-B8] Why: carry the prefix maximum even for commits without row timestamps.
                        ;; Rejected: reading scope/max-recorded-at (the second hot cardinality-one datom).
                        (when maximum
                          (concat (when-not head-v2 [[:db/add scope :triplex.scope/max-recorded-at maximum]])
                                  [[:db/add "datomic.tx" :triplex.tx/max-recorded-at maximum]]))
                        ;; [DX-B4-T1] Why: append-only eligibility is decided at the serial point, including a lagging optimistic peer.
                        ;; Rejected: trusting a pre-transaction entity-absence observation.
                        (when (some #(d/entid db [:triplex.entity/id %]) journal-entities)
                          [[:db/add scope :triplex.scope/feed-irregular true]])
                        (when irregular [[:db/add scope :triplex.scope/irregular true]])
                        (when position-irregular [[:db/add scope :triplex.scope/position-regular false]]))))))))
(def source-hash (schema/sha256 (pr-str code)))
(defn install! [conn scope]
  (let [db (d/db conn) e (d/entid db [:triplex.scope/key scope])]
    (when-not (= source-hash (:v (first (d/datoms db :eavt e :triplex.scope/commit-fn-hash))))
      @(d/transact conn [{:db/ident :triplex/commit
                         :db/fn (d/function {:lang :clojure :params '[db payload]
                                            :requires '[[datomic.api :as d]] :code code})}
                        [:db/add e :triplex.scope/commit-fn-hash source-hash]]))))
