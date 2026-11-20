(ns triplex.compact.reverse
  (:require [clojure.data.json :as json]
            [datomic.api :as d]
            [triplex.compact.store :as store]))

(def link-types #{"location" "jurisdiction"})
(def schema [(store/attr :compact.reverse/cursor :db.type/string :db.unique/value)
             (store/attr :compact.reverse/through :db.type/long)
             (store/attr :compact.reverse/link :db.type/string :db.unique/value)])

(defn open! [projection source account]
  (let [conn (:conn source)
        db (store/sync-view source)
        id (store/value db (store/account-id db account) :compact/source)
        key (store/compound id account)]
    (store/require! id :MissingSourceIdentity)
    (store/tx! projection schema)
    (when-not (store/lookup (d/db projection) :compact.reverse/cursor key)
      (try (store/tx! projection [{:compact.reverse/cursor key :compact.reverse/through 0}])
           (catch Exception e
             (when-not (store/lookup (store/sync-view {:conn projection}) :compact.reverse/cursor key)
               (throw e)))))
    {:conn projection :source conn :account account :id id :key key}))

(defn through [projection db]
  (store/value db (store/lookup db :compact.reverse/cursor (:key projection)) :compact.reverse/through))

(defn pre [projection a target]
  (str (:key projection) "|" a "|" target "|"))

(defn edge [{:keys [eid p adds]} ordinal root]
  (let [[suffix code target from to :as a] (get adds ordinal)]
    (store/require! (and a eid) :MissingPostingWitness)
    (let [attr (store/attribute code)]
      (when (link-types attr)
        {:attr attr :target target :source (str root suffix) :id [p ordinal] :from from :to to}))))

(defn mutations [{:keys [account id]} db after p]
  (store/require! (= id (store/value db (store/account-id db account) :compact/source)) :WrongProjectionSource)
  (store/require! (<= 0 after p (store/head-position db account)) :InvalidProjectionCut)
  (vec
    (mapcat (fn [pos]
              (let [eid (store/event-at db account pos)
                    root-id (store/value db eid :compact/subject-ref)
                    root (when root-id (store/component (store/value db root-id :compact/subject)))
                    event (when eid (store/event db eid))]
                (store/require! (and root (= pos (:p event))) :ProjectionGap)
                (concat
                  (keep-indexed (fn [i _] (when-let [e (edge event i root)] (assoc e :op "add" :p pos)))
                                (:adds event))
                  (for [[older ordinal] (:retires event)
                        :let [old-eid (store/event-at db account older)
                              owner (store/value db old-eid :compact/subject-ref)
                              _ (store/require! (= root-id owner) :WrongPostingOwner)
                              e (edge (store/event db old-eid) ordinal root)]
                        :when e]
                    (assoc e :op "retire" :p pos)))))
            (range (inc after) (inc p)))))

(defn posting [projection {:keys [attr target source id from to op p]}]
  (str (pre projection attr target) (store/canonical [p op id source from to])))

(defn advance! [projection source-view p]
  ;; [DX-COMPACT1] Why: one CAS binds all postings, including an empty page, to the exact contiguous source cut.
  ;; Rejected: marking an index complete based on a timer or using the source transaction's physical t as its cursor.
  (let [conn (:conn projection) db (d/db conn)
        from (through projection db)
        _ (store/require! (<= from p (+ from 256)) :ProjectionWindow)
        rows (mapv #(posting projection %) (mutations projection source-view from p))]
    (when (< from p)
      (let [data (conj (mapv #(hash-map :compact.reverse/link %) rows)
                       [:db/cas [:compact.reverse/cursor (:key projection)] :compact.reverse/through from p])
            report (store/tx! conn data)
            after (:db-after report)
            attr (d/entid after :compact.reverse/link)
            observed (mapv :v (filter #(= attr (:a %)) (:tx-data report)))]
        (store/require! (and (= p (through projection after))
                             (= (sort rows) (sort observed))) :PostingReadbackMismatch)
        {:mutations (count rows) :through p :from from :report report}))))

(defn sync-to! [projection source-view p]
  (loop [from (through projection (d/db (:conn projection)))]
    (when (< from p)
      (recur (:through (advance! projection source-view (min p (+ from 256))))))))

(defn reverse-links [projection index-view delta a target p valid]
  (let [prefix (pre projection a target)
        data (map :v (d/index-range index-view :compact.reverse/link prefix (str prefix "\uffff")))
        committed (map #(json/read-str (subs % (count prefix))) data)
        pending (for [e delta :when (and (= a (:attr e)) (= target (:target e)))]
                  [(:p e) (:op e) (:id e) (:source e) (:from e) (:to e)])
        ordered (sort-by (juxt first second #(nth % 2)) (filter #(<= (first %) p) (concat committed pending)))
        live (reduce (fn [out [_ op id source from to]]
                       (if (= "retire" op) (dissoc out id) (assoc out id [source from to]))) {} ordered)]
    (into #{} (keep (fn [[source from to]]
                      (when (store/visible? valid {:from from :to to}) source))) (vals live))))

(defn candidates [projection source-view p valid writes]
  (let [index-view (d/db (:conn projection)) cursor (through projection index-view)
        from (min p cursor)
        _ (store/require! (<= (- p from) 256) :ProjectionBehind)
        delta (mutations projection source-view from p)
        cut (delay (store/history-cut source-view (:account projection) p))
        present? (fn [root]
                   (loop [eid (store/head @cut (store/subject-id @cut (:account projection) root))]
                     (when eid
                       (if (<= (store/position @cut eid) p) true
                           (recur (store/value @cut eid :compact/previous))))))
        at #(reverse-links projection index-view delta %1 %2 p valid)]
    (into (sorted-set)
          (mapcat (fn [[entity _attr]]
                    (let [root (store/owner entity)]
                      (case (store/kind-of root)
                        "placement" (when (present? root) [root])
                        "location" (at "location" root)
                        "jurisdiction" (mapcat #(at "location" %) (at "jurisdiction" root))
                        []))))
          writes)))
