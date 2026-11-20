(ns triplex.age.erased-successor
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [datomic.api :as d]
            [triplex.age.gate :as gate]
            [triplex.age.native :as native]
            [triplex.age.successor :as successor]
            [triplex.age.tape :as tape]
            [triplex.gateway.envelope :as envelope]
            [triplex.gateway.erase :as erase]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.privacy :as privacy]
            [triplex.gateway.schema :as schema]
            [triplex.gateway.scope :as scope]
            [triplex.gateway.storage :as storage])
  (:import [java.nio.file Files]
           [java.util UUID]))

(def protected-attribute ":field/f0")
(def private-schema
  [(schema/attr :triplex.scope/erasure-ledger :db.type/boolean)
   (schema/attr :triplex.scope/erasure-seq :db.type/long)
   (schema/attr :triplex.private/id :db.type/string :db.unique/value)
   (schema/attr :triplex.private/entity :db.type/string nil true)
   (schema/attr :triplex.private/attribute :db.type/string)
   (schema/attr :triplex.private/validity :db.type/string)
   (schema/attr :triplex.private/body :db.type/string)
   (schema/attr :triplex.tx/erasure-record :db.type/string)])

(defn enroll! [{:keys [name conn]}]
  @(d/transact conn private-schema)
  (erase/declare! name conn (d/db conn) {"attributes" [protected-attribute] "sealed" true}))

(defn with-privacy [{:keys [name conn]} work]
  (let [current (d/db conn) cut (privacy/cut name current)]
    (privacy/verify-data! cut current)
    (binding [privacy/*cut* cut privacy/*database* name privacy/*data* current
              privacy/*unseal* #(envelope/decode! name current %1 %2 %3 %4)]
      (work))))

(defn transform-owners [name owners]
  (let [bodies (transient [])
        entries (mapv (fn [owner]
                        (update owner :triplex.entity/row
                          (fn [texts]
                            (mapv (fn [text]
                                    (let [row (lean/decode text)]
                                      (if (= protected-attribute (:attribute row))
                                        (do
                                          (conj! bodies (envelope/seal! name row))
                                          (privacy/encode (assoc row :value_string (envelope/token (:id row)))))
                                        text))) texts)))) owners)]
    [entries (persistent! bodies)]))

(defn append! [{:keys [name conn] :as db} command]
  (privacy/guard name
    #(with-privacy db
       (fn []
         (let [current (erase/sync! conn)
               input (tape/input command)
               rows (mapv storage/decode-row (get input "rows"))
               state (privacy/cut name current)
               _ (privacy/validate-write! state input rows)
               {:keys [input bodies rows]} (envelope/protect name state input rows)
               data (storage/tx-data current (assoc input "rows" (mapv storage/wire-row rows)))
               head (scope/entity current)
               seq (:seq state)
               report @(d/transact conn (into (conj data [:db/cas head :triplex.scope/erasure-seq seq seq]) bodies))
               result (:db-after report)
               receipt (storage/operation result (:operation command))]
           (gate/equal! [(str (:position command)) (:clock command)]
                       [(get-in receipt [:position "v"]) (get-in receipt [:recordedAt "v"])]
                       "Protected save receipt differs")
           (doseq [body bodies
                   :let [e (d/entid result [:triplex.private/id (:triplex.private/id body)])]]
             (gate/equal! (:triplex.private/body body) (storage/value result e :triplex.private/body)
                          "Detached body did not commit with its protected save"))
           receipt)))))

(defn move! [{:keys [old next cut]} pop]
  (privacy/guard (:name next)
    (fn [] (with-privacy old
       (fn []
         (let [view (storage/at-position (d/db (:conn old)) cut)
               tx (d/entid view [:triplex.tx/position cut])
               owners (mapv (fn [i]
                              (let [owner (:owner (tape/person pop i))
                                    e (d/entid view [:triplex.entity/id owner])]
                                {:triplex.entity/id owner :triplex.entity/rev (storage/value view e :triplex.entity/rev)
                                 :triplex.entity/row (mapv #(privacy/encode (privacy/masked (lean/decode (:v %))))
                                                           (lean/live-texts view e))}))
                            (range (:people pop)))
               [rows bodies] (transform-owners (:name next) owners)]
           ;; [DX-AGE1] Why: preserve assertion IDs while issuing distinct ERA2 keys authenticated to the target.
           ;; Rejected: copying ERA1 ciphertext under mismatching scope AAD or copying plaintext into Datomic.
           @(d/transact (:conn next)
              (into (conj rows {:db/id "datomic.tx" :triplex.tx/position cut
                                :triplex.tx/id "age-protected-carry"
                                :triplex.tx/max-recorded-at (storage/value view tx :triplex.tx/max-recorded-at)})
                    bodies))))))))

(defn visible! [{:keys [domain] :as eras} db read]
  (privacy/guard domain
    (fn []
      (let [frontier (privacy/cut domain nil)]
        (native/check! (some? frontier) "Shared successor erasure ledger is unavailable" {})
        (doseq [side [(:old eras) (:next eras)]]
          (let [native-db (d/db (:conn side)) local (privacy/cut (:name side) native-db)]
            (privacy/verify-data! local native-db)
            (privacy/ensure-seq! local (:seq frontier))))
        (with-privacy db read)))))

(defn person [eras pop i position]
  (let [db (successor/source-at eras position)]
    (visible! eras db #(mapv privacy/masked (gate/person-view db pop i position)))))

(defn held-person [eras {:keys [name] :as db} held owner]
  (visible! eras db
    #(->> (storage/read-rows name held {"entityIds" [owner] "route" "live"})
          :rows (map storage/decode-row) (map privacy/masked) (sort-by :attribute) vec)))

(defn page [{:keys [domain old next cut]} after limit]
  ;; [DX-AGE1] Why: take one authority guard over both pages.
  ;; Rejected: checking the two era pages at potentially different erasure sequences.
  (privacy/guard domain
    (fn []
      (let [frontier (privacy/cut domain nil)
            side (fn [db p n pin]
                   (with-privacy db
                     (fn []
                       (privacy/ensure-seq! privacy/*cut* (:seq frontier))
                       (update (gate/feed db p n pin) "transactions"
                         (fn [txs]
                           (mapv (fn [[id at rows]]
                                   [id at (mapv (comp privacy/encode privacy/masked lean/decode) rows)])
                                 txs))))))
            first (when (< after cut) (side old after limit cut))
            left (- limit (count (get first "transactions")))
            rest (when (pos? left) (side next (max after cut) left nil))]
        {:transactions (into (get first "transactions" []) (get rest "transactions" []))
         :clockEnds (into (get first "clockEnds" []) (get rest "clockEnds" []))}))))

(defn publish-era! [{:keys [name conn]} desired]
  (privacy/guard name
    (fn []
      (let [view (erase/sync! conn) state (privacy/cut name view true)
            command (get desired "commandId")]
        (privacy/clear-completed! name state)
        (if-let [previous (get-in state [:commands command])]
          (do (gate/equal! desired previous "Recovered era erasure differs")
              (erase/response view previous))
          (do
            (if-let [pending (privacy/pending name)]
              (gate/equal! desired pending "Pending era erasure differs")
              (privacy/prepare! name desired))
            (erase/apply-native! conn view desired)
            (privacy/publish! name state desired)
            (erase/response (erase/sync! conn) desired)))))))

(defn erase-both! [{:keys [domain old next]} owner command fault]
  ;; [DX-AGE1] Why: keep both archived and current routes closed after any partial publication.
  ;; Rejected: independently publishing each era and exposing the still-live half during the move.
  (privacy/guard domain
    (fn []
      (let [state (privacy/cut domain nil true)
            _ (privacy/clear-completed! domain state)]
        (if-let [prior (get-in state [:commands command])]
          (do
            (gate/equal! [{ "entityId" owner }] (get prior "selectors") "Erasure resubmission differs")
            (doseq [[db desired] (map vector [old next] (get prior "eras"))]
              (envelope/erase-keys! (:name db) (get desired "identities")))
            prior)
          (let [selectors [{"entityId" owner}]
                pending (privacy/pending domain)
                views (mapv (comp erase/sync! :conn) [old next])
                entry (or pending
                          (let [entries (mapv (fn [db view]
                                                (erase/make-entry (:name db) view (privacy/cut (:name db) view)
                                                                  command selectors)) [old next] views)
                                stamp (apply max (map #(get % "erasedAt") entries))
                                tx (str "_tx/era-erasure-" (UUID/randomUUID))
                                bind #(assoc % "erasedAt" stamp "txId" tx)]
                            {"database" domain "seq" (inc (:seq state)) "previous" (:seal state)
                             "commandId" command "selectors" selectors "erasedAt" stamp "txId" tx
                             "identities" (vec (distinct (mapcat #(get % "identities") entries)))
                             "eras" (mapv bind entries)}))]
            (gate/equal! [command selectors] (mapv #(get entry %) ["commandId" "selectors"])
                         "Pending successor erasure targets differ")
            (when-not pending (privacy/prepare! domain entry))
            (doseq [[i db desired] (map vector (range) [old next] (get entry "eras"))]
              (gate/equal! (get desired "identities") (:identities (publish-era! db desired))
                           "Fresh native era erasure inventory differs")
              (when (and fault (zero? i)) (throw (ex-info "Planted partial publication" {:planted true}))))
            (privacy/publish! domain state entry)
            (doseq [[db desired] (map vector [old next] (get entry "eras"))]
              (envelope/erase-keys! (:name db) (get desired "identities")))
            entry))))))

(defn clear-free! [{:keys [conn]} secrets ids]
  (let [db (d/db conn)
        data (d/history db)
        texts (concat (map :v (d/datoms data :aevt :triplex.entity/row))
                      (mapcat (fn [{:keys [data]}] (keep #(when (string? (:v %)) (:v %)) data))
                              (d/tx-range (d/log conn) nil nil)))
        refs (map envelope/token ids)
        strings (vec texts)]
    (native/check! (not-any? #(some (fn [s] (str/includes? % s)) secrets) strings)
                   "A protected plaintext appears in native storage" {})
    (native/check! (every? #(some (fn [s] (str/includes? s %)) strings) refs)
                   "A protected opaque positive control is missing" {})
    (count strings)))

(defn rehearsal! []
  (let [pop (tape/population 2 2) old (native/open! "sealed-era-one") next (native/open! "sealed-era-two")
        domain (str "successor-" (System/getenv "AGE_ATTEMPT"))
        rounds (:active pop)
        before (tape/command pop 0)
        after (tape/command pop rounds)
        owner (:owner before)
        _ (doseq [db [old next]] (enroll! db))
        _ (privacy/register! domain [protected-attribute] true)
        seed (privacy/guard (:name old)
               #(native/seed! old pop (partial transform-owners (:name old))))
        first-ack (append! old before)
        _ (doseq [n (range 1 rounds)] (append! old (tape/command pop n)))
        old-view (erase/sync! (:conn old))
        cut (storage/head-position old-view)
        eras {:old old :next next :cut cut :domain domain}
        _ (move! eras pop)
        _ (successor/fence! old old-view)
        _ (let [denied (try (append! old after) nil (catch Exception e (ex-message e)))]
            (native/check! (and denied (str/includes? denied "DX_AGE_ERA_SEALED"))
                           "Stale writer passed the archive seal" {}))
        last-ack (append! next after)
        final (inc cut)
        resend (successor/resend eras before)
        before-pin (:position before)
        held-old (storage/at-position old-view before-pin)
        held-next (d/db (:conn next))
        i (:i before)
        cuts [[before-pin 1] [cut rounds] [final (inc rounds)] [nil (inc rounds)]]
        _ (gate/equal! first-ack resend "Pre-move command did not return its original receipt")
        _ (gate/equal! (str final) (get-in last-ack [:position "v"]) "Wrong first successor save position")
        _ (doseq [a (range (:people pop)), [p n] cuts]
            (gate/equal! (gate/oracle-person pop a n) (person eras pop a p) "Two-era routed rows differ"))
        clear-original [(person eras pop i before-pin) (person eras pop i final)]
        _ (gate/equal! clear-original [(held-person eras old held-old owner) (held-person eras next held-next owner)]
                       "Held read plaintext control differs")
        older (page eras (tape/seed-head pop) (inc rounds))
        _ (gate/equal! (mapv (fn [n] [(tape/tx-id n) (+ (tape/seed-head pop) (inc n))])
                            (range (inc rounds)))
                       (mapv #(subvec % 0 2) (:transactions older)) "Feed boundary differs")
        operation "age1-cross-era-erase"
        _ (let [e (try (erase-both! eras owner operation true) nil (catch Exception e (ex-data e)))]
            (gate/equal! true (:planted e) "Partial publication was not exercised"))
        _ (doseq [read [#(person eras pop i before-pin) #(person eras pop i nil)
                        #(page eras (dec cut) 2)]]
            (let [e (try (read) nil (catch Exception e (ex-data e)))]
              (gate/equal! "ErasureFrontierUnavailable" (:code e) "Partial frontier allowed a value to escape")))
        entry (erase-both! eras owner operation false)
        _ (gate/equal! entry (erase-both! eras owner operation false) "Erasure retry advanced its sequence")
        ids (mapv #(mapv (fn [r] (get r "assertionId")) (get % "identities")) (get entry "eras"))
        sealed-rows [(tape/seed-row pop i 0) (first (:fresh before)) (first (:fresh after))]
        secrets (mapv :value_string sealed-rows)
        marker (fn [row]
                 (if (= protected-attribute (:attribute row))
                   (assoc row :value_type "erased" :value_string nil
                          :value_json (json/write-str {"type" "erased" "valueType" "string"
                                                      "erasedAt" (get entry "erasedAt")
                                                      "erasureTxId" (get entry "txId")}))
                   row))
        _ (doseq [[p n] cuts]
            (gate/equal! (mapv marker (gate/oracle-person pop i n)) (person eras pop i p)
                         "A current or pinned view lost assertion identity or returned a value"))
        _ (gate/equal! (mapv (partial mapv marker) clear-original)
                       [(held-person eras old held-old owner) (held-person eras next held-next owner)]
                       "A held view escaped the present erasure frontier")
        _ (gate/equal! (gate/oracle-person pop (inc i) (inc rounds)) (person eras pop (inc i) nil)
                       "An unrelated owner changed")
        cleared-page (page eras (tape/seed-head pop) (+ 2 rounds))
        _ (gate/equal! (mapv (fn [[tx p rows]] [tx p (mapv (comp :id lean/decode) rows)]) (:transactions older))
                       (mapv (fn [[tx p rows]] [tx p (mapv (comp :id lean/decode) rows)])
                             (butlast (:transactions cleared-page)))
                       "Erasure removed old feed membership or row identities")
        _ (native/check! (not-any? #(str/includes? (pr-str cleared-page) %) secrets)
                         "Cross-era feed contains protected plaintext after erasure" {})
        native-counts (mapv (fn [db ids] (clear-free! db secrets ids)) [old next] ids)]
    (doseq [[db expected] (map vector [old next] ids)
            id expected
            :let [view (d/db (:conn db)) e (d/entid view [:triplex.private/id id])]]
      (native/check! (and e (string? (storage/value view e :triplex.private/body))
                          (not (Files/exists (envelope/key-file (:name db) id)
                                             (make-array java.nio.file.LinkOption 0))))
                     "Ciphertext missing or an erasure key survived" {:id id}))
    (native/check! (= (set (map :id sealed-rows)) (set (mapcat identity ids)))
                   "Cross-era protected identity inventory differs" {})
    (native/emit "erased-successor"
                 {:accounts 14 :people (:people pop) :seedRecords seed :cut cut :businessHead final
                  :eraseSequence (get entry "seq") :entriesByEra (mapv count ids)
                  :historicalRowCuts (* (count cuts) (:people pop)) :heldCuts 2
                  :checkedNativeStrings native-counts
                  :businessFeedEntries (count (:transactions older))
                  :afterErasureFeedEntries (count (:transactions cleared-page))
                  :erasureSources [(:name old) (:name next)]})))

(defn -main [& _]
  (try
    (rehearsal!)
    (shutdown-agents)
    (System/exit 0)
    (catch Throwable e (.printStackTrace e) (System/exit 1))))
