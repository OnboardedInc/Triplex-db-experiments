(load-file "/config/gate.clj")
(load-file "/config/regression.clj")
(ns prep1-recovery
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [datomic.api :as d]
            [prep1-gate :as g]
            [triplex.gateway.group :as group]
            [triplex.gateway.group-prepare :as prepared]
            [triplex.gateway.group-test :as fixture]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.main :as main]
            [triplex.gateway.selftest :as rows]
            [triplex.gateway.storage :as storage]
            [wfix1-regression :as w]))

(defn emit [kind data]
  (println "PREP1_RECOVERY" (json/write-str {:attempt g/attempt :kind kind :data data}))
  (flush))
(defn scope-key [name]
  (json/write-str ["triplex-scope-v1" "test" "prep1-gate" (str g/attempt "-" name) 0]))
(defn publish [file data]
  (let [source (java.io.File. (str file ".tmp"))]
    (spit source (json/write-str data))
    (assert (.renameTo source (java.io.File. file)))))
(defn edit [id owner initial]
  (g/step id owner (:add (g/step (str "seed-" owner) owner nil)) initial))
(defn world [name db position]
  (mapv (fn [owner]
          (mapv #(get-in % ["id" "v"])
            (:rows (storage/read-rows name db {"entityIds" [owner]
                      "basis" {"recordedPosition" position "validAt" 1.0} "pattern" {}}))))
        (subvec g/owners 0 2)))
(defn feed [name offset limit]
  (mapv (fn [[id p texts]]
          [id p (into {} (keep (fn [text] (let [r (lean/decode text)]
                          (when (= ":_tx/change" (:attribute r))
                            (let [change (json/read-str (:value_json r))]
                              [(get change "op") change]))))) texts)])
        (w/feed name offset limit)))

(defn before [file]
  (g/with-scope "restart" true false
    (fn [name conn]
      (g/seed! name conn)
      (let [offers (mapv g/request [(edit "a" 0 8) (edit "b" 1 8)])
            entries (mapv #(g/submitted conn (d/db conn) %) offers)
            plan (group/plan conn entries)]
        (assert (= :basis (:guard plan)))
        ;; [DX-PREP1] Why: stop the gateway after a durable native report with both response promises still pending.
        ;; Rejected: timer-driven shutdown or discarding an already published receipt in the client.
        (with-redefs [group/finish-group! (fn [batch expected report n _ _]
                       (let [view (:db-after report)
                             claims (mapv #(w/claim name %) ["a" "b"])
                             t (d/basis-t view)
                             witness {:attempt g/attempt :scope (scope-key "restart") :db name :guard :basis
                                      :t (str t) :offers offers :claims claims :head (storage/head-position view)
                                      :replies (count (filter (comp realized? :result) batch))}]
                         (assert (= 2 n (count expected)))
                         (assert (= 10 (:head witness)))
                         (assert (= 0 (:replies witness)))
                         (assert (every? #(= (str t) (get-in % ["receipt" "t" "v"])) claims))
                         (emit "held" witness)
                         (publish file witness)
                         @(promise)))]
          (group/finish-prepared! conn entries (group/start-prepared! conn plan)))))))

(defn after [file]
  (let [{:strs [attempt scope db offers claims t]} (json/read-str (slurp file))
        _ (assert (= g/attempt attempt))
        reopened (main/create-scope! nil scope "lean" true true)
        conn (main/connection (main/db-uri db))
        view (d/db conn)
        reads (mapv #(world db view %) [8 9 10])
        changes (feed db 8 2)]
    (assert (= db (:db reopened)))
    (assert (false? (:created reopened)))
    (assert (= [[["fact-seed-0"] ["fact-seed-1"]]
                [["fact-a"] ["fact-seed-1"]]
                [["fact-a"] ["fact-b"]]] reads))
    (assert (= [["_tx/a" 9] ["_tx/b" 10]] (mapv #(subvec % 0 2) changes)))
    (doseq [[i [tx p change]] (map-indexed vector changes)]
      (let [added (get change "assert") retired (get change "retract")]
        (assert (= (+ 1008.0 i) (get added "recordedAt") (get retired "retractedAt")))
        (assert (= (+ 1000.0 i) (get retired "recordedAt")))
        (assert (= {"type" "string" "value" (str "fact-seed-" i)} (get retired "value")))
        (assert (= (str "_tx/seed-" i) (get retired "assertionTxId")))
        (assert (= tx (get retired "retractionTxId")))
        (assert (= p (+ 9 i)))))
    (assert (= [(second changes)] (feed db 9 1)))
    (assert (empty? (feed db 10 1)))
    (let [retries (mapv (fn [offer original]
                    (let [id (get offer "operationId")
                          fresh (str id "-again")
                          exact (w/outcome (w/send db offer))
                          resend (w/outcome (w/send db (assoc offer "operationId" fresh)))
                          claim (w/claim db id)]
                      (assert (= [409 "OperationDuplicate"] exact))
                      (assert (= [409 "CommandConflict"] resend))
                      (assert (= original claim))
                      (assert (= (get original "receipt") (w/operation db id)))
                      (assert (= {"status" "absent"} (w/operation db fresh)))
                      {:id id :exact exact :resend resend :claim claim})) offers claims)]
      (assert (= 10 (storage/head-position (d/db conn))))
      (emit "recovered" {:db db :t t :head 10 :retries retries :reads reads :feed changes
                         :resumed (feed db 9 1)}))))

(defn erase [move-owner?]
  (g/with-scope (str "erase-" move-owner?) true false
    (fn [name conn]
      (g/seed! name conn)
      (let [marker (str "private-probe-value-" g/attempt)
            seed (w/edit-frame "protected" "id-protected" marker 1.0 30.0 nil)
            _ (assert (= [200 nil] (w/outcome (w/send name seed))))
            proof (mapv #(g/submitted conn (d/db conn) %)
                        [(w/edit-frame "replacement" "id-replacement" "after" 1.0 30.0 "id-protected")
                         (g/request (edit "conditional" 1 9))])
            plan (group/plan conn proof)
            _ (assert (= :basis (:guard plan)))
            _ (group/finish-prepared! conn proof (group/start-prepared! conn plan))
            _ (assert (every? #(= :basis (:guard (g/output %))) proof))
            prior (d/db conn)
            pending (mapv #(g/submitted conn prior (g/request (edit (str "other-" %) % 11))) [2 3])
            certificate (group/plan conn pending)
            _ (assert (= :basis (:guard certificate)))
            owner (d/entid prior [:triplex.entity/id fixture/root])
            head (storage/head-position prior)
            business (fn [view] (mapv :v (d/datoms (d/history view) :eavt owner :triplex.entity/row)))
            journal (fn [] (w/feed name 8 10))
            present? #(str/includes? (pr-str %) marker)
            _ (assert (and (present? (business prior)) (present? (journal))))
            retired (get-in (first (feed name 9 1)) [2 "retract"])
            _ (assert (= {"value" {"type" "string" "value" marker}
                          "validFrom" 1.0 "validTo" 30.0
                          "recordedAt" 1008.0 "retractedAt" 1009.0
                          "assertionTxId" "_tx/protected" "retractionTxId" "_tx/replacement"}
                         (select-keys retired ["value" "validFrom" "validTo" "recordedAt" "retractedAt"
                                                "assertionTxId" "retractionTxId"])))
            ;; [DX-PREP1] Why: run real lean attribute excision and inspect the independent value-bearing journal.
            ;; Rejected: equating index completion with end-to-end erasure.
            excision @(d/transact conn [{:db/id (d/tempid :db.part/user) :db/excise owner
                                         :db.excise/attrs [:triplex.entity/row]}])
            t (d/basis-t (:db-after excision))
            _ (d/request-index conn)
            current (deref (d/sync-excise conn t) 120000 ::timeout)
            _ (assert (not= ::timeout current))
            _ (assert (= head (storage/head-position current)))
            _ (assert (nil? (prepared/certify current pending (group/drafted pending))))
            _ (assert (try
                        @(d/transact conn (:data certificate))
                        false
                        (catch Exception e (group/definitive? e))))
            _ (assert (= head (storage/head-position (d/db conn))))
            texts (business current)
            remaining-journal (journal)
            subject (if move-owner? "acct/new/person" fixture/root)
            reuse (w/save "reuse" subject "id-protected" nil)
            reply (w/send name reuse)]
        (assert (not (present? texts)))
        (emit "erasure" {:db name :movedOwner move-owner? :excisionT t :watermark (d/basis-t current)
                         :headBefore head :headAfter (storage/head-position (d/db conn))
                         :protectedInNative (present? texts) :protectedInJournal (present? remaining-journal)
                         :retry (w/outcome reply) :receipt (w/operation name "reuse")
                         :retired retired
                         :certificateAfterExcision false})))))

(let [[phase file] *command-line-args*]
  (case phase
    "before" (before file)
    "after" (do (after file) (erase false) (erase true)))
  (shutdown-agents)
  (System/exit 0))
