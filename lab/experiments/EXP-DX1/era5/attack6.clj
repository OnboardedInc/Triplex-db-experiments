(ns era5-attack6
  "[DX-ERA5, second review] Attacks on DX-ERA4's answer at 73e0d6849 (era5/REVIEW-2.md): the database setting
  `derived-seal-required` and its check, the shape of a record a writer names too few rows for, the log rebuild of the
  removal review's Z2 composed with this option, the key re-sweep's cost and its silent failures, and the fuzzer with
  the seal call's failure modes as dimensions. In process, as attack5.clj (loaded after it): the gateway's own route
  handler, an in-memory Datomic, the file removal authority, a SEALED protected database guarded per account; the
  boundary is the database's (inproc.sh's ERA5_EXTRA_ENV=TX2_REMOVAL_COMMIT_BOUNDARY=1 turns the commit boundary on at
  the per-account move).

  Phases (ERA5_PHASE): cases6 (e1 shapes, e2 window, e3 journal, z2, m2), fuzz6 (ERA5_N, ERA5_BLOCK, ERA5_SEED, ERA5_RUN).
  Lines: ERA6_CASE for each case's observations, ERA6_FINDING for each accepted write the setting is meant to refuse
  (counted, not oracles: they are the findings), oracles (x/oracle!) only for what must hold."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.privacy :as privacy] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.storage :as storage] [triplex.gateway.selftest :as selftest]
            [triplex.gateway.derived-seal :as ds] [triplex.gateway.stats :as stats]
            [triplex.gateway.group :as group] [triplex.gateway.write-policy :as policy]
            [triplex.gateway.removal-commit :as rc]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as x] [era4-races :as r4] [era5-attack :as a5])
  (:import [java.util Base64 Random]
           [java.nio.charset StandardCharsets]
           [java.nio.file Files]
           [javax.crypto Cipher]))

(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))
(defn report [k m] (println "ERA6_CASE" (pr-str [k m])))
(def findings (atom []))
(defn finding! [k m] (swap! findings conj k) (println "ERA6_FINDING" (pr-str [k m])))

(def hex (apply str (repeat 64 "a")))
(defn- utf8 ^bytes [^String s] (.getBytes s StandardCharsets/UTF_8))
(defn- b64u [^bytes b] (.encodeToString (.withoutPadding (Base64/getUrlEncoder)) b))
(defn require! [src] (offers/route src "v2" "derived-seal-required" {}))
(defn packed [v] (#'r4/packed v))
(defn doc!
  "One derived document as Documents.put writes it (attribute notice/value on notice:v1:<hex>:<key>); its outcome."
  [src cmd key value]
  (offers/outcome (#'r4/doc-write src cmd key value)))
(defn page [units & [entry-extra]]
  {"identity" "i" "frame" 1 "start" 0 "part" 0 "through" 1 "tail" 0 "previous" "p"
   "bytes" (packed [(merge {"subject" "pl:00000001" "changes" units} entry-extra)])})
(def place "a|pl:00000001")

;; ---- e1: what the setting's check accepts ------------------------------------------------------------------------
(defn e1
  "With the setting declared: the documents a writer could store that hold a protected value in clear (or recoverably)
  yet pass the check. Controls first (a clear unit refused, a sealed unit accepted)."
  []
  (g/fresh-scope true
    (fn [src conn]
      (let [[vx idx] (a5/seed! src "e1-x" g/a1 "e1")
            plain (a5/plain-row! src "e1-plain" g/a1)
            wire (get (a5/seal-placed src [idx] (str "derived:" vx) place) "sealed")
            req (offers/outcome (require! src))
            ;; a writer that names only an unprotected row it read (too few names): the gateway seals the record under
            ;; the key of no assertion, which anyone can compute
            under (get (a5/seal-placed src [plain idx] (str "control:" vx) place) "sealed")
            under-named (get (a5/seal-placed src [plain] (str "derived:" vx) place) "sealed")
            ;; a hand-made string in the record's shape whose body is the clear value in base64
            forged (str "tdx2." (b64u (utf8 (json/write-str {"d" src "k" [] "p" place}))) "." (b64u (byte-array 12)) "." (b64u (utf8 vx)))
            dl (fn [s] {"subject" "pl:00000001" "generation" 0 "sealed" s})
            cases [[:control-clear-unit "answer:1:f1" (page [["k" (str "derived:" vx)]]) :refuse]
                   [:control-sealed-unit "answer:1:f2" (page [["" wire]]) :accept]
                   [:control-under-named-control "answer:1:f3" (page [["" under]]) :accept]
                   [:page-identity-clear "answer:1:f4" (assoc (page [["" wire]]) "identity" vx) :refuse]
                   [:page-previous-clear "answer:1:f5" (assoc (page [["" wire]]) "previous" vx) :refuse]
                   [:entry-subject-clear "answer:1:f6" (page [["" wire]] {"subject" vx}) :refuse]
                   [:packet-recipe-clear "recorded-notices:1" (packed {"recipe" vx "deliveries" [(dl wire)]}) :refuse]
                   [:packet-account-event-previous-clear "recorded-notices:2"
                    (packed {"account" vx "event" vx "previous" vx "deliveries" [(dl wire)]}) :refuse]
                   [:delivery-subject-generation-clear "recorded-notices:3"
                    (packed {"deliveries" [{"subject" vx "generation" vx "sealed" wire}]}) :refuse]
                   [:delivery-removed-marker-extra-key "recorded-notices:4"
                    (packed {"deliveries" [(dl {"removed" [] "payload" vx})]}) :refuse]
                   [:effects-removed-marker-extra-key "effects:o:1" (packed [(dl {"removed" [] "payload" vx})]) :refuse]
                   [:ledger-removed-marker-extra-key "recorded-ledger:pl:00000001" (packed [{"removed" [] "payload" vx}]) :refuse]
                   [:receiver-removed-marker-extra-key "receiver:o:pl:00000001" (packed {"g" 0 "e" [{"removed" [] "payload" vx}]}) :refuse]
                   [:receiver-generation-clear "receiver:o:pl:00000002" (packed {"g" vx "e" [wire]}) :refuse]
                   [:forged-record-clear-body "answer:1:f7" (page [["" forged]]) :refuse]
                   [:under-named-record "answer:1:f8" (page [["" under-named]]) :refuse]
                   [:ledger-part "recorded-ledger-part:pl:00000001:1:0" "x" :refuse]
                   [:unlisted-kind-near-name "recorded-ledgers:pl:00000001" (packed [{"payload" vx}]) :refuse]
                   [:unlisted-kind-packet "packet:1" (packed {"deliveries" [{"payload" vx}]}) :refuse]]
            outcomes (into {} (for [[k key value want] cases]
                                (let [o (doc! src (str "e1-" (name k)) key value)
                                      accepted (= [200 nil] o)]
                                  (when (and accepted (= want :refuse) (not (str/starts-with? (name k) "control")))
                                    (finding! :e1-accepted {:case k :kind key}))
                                  [k o])))
            ;; the same clear document, by hand: another attribute, the entity's hex in capitals
            other-attr (offers/outcome (offers/send src (g/save-frame "e1-attr" (str "notice:v1:" hex ":answer:1:f9") "notice/body"
                                                                      (json/write-str (page [["k" vx]])) nil nil)))
            upper (offers/outcome (offers/send src (g/save-frame "e1-upper" (str "notice:v1:" (str/upper-case hex) ":answer:1:f9")
                                                                 "notice/value" (json/write-str (page [["k" vx]])) nil nil)))
            ;; the under-named record after X's value is removed: the gateway and anyone outside it
            rm (a5/erase-until-done! src "e1-rm" [idx] nil nil)
            gone (a5/key-gone? src [idx])
            after-route (a5/open-placed src under-named place)
            after-control (a5/open-placed src under place)
            outside (a5/offline-open under-named (fn [_] nil))
            forged-open (a5/open-placed src forged place)
            row {:setting req :outcomes outcomes :other-attribute other-attr :upper-case-hex upper
                 :removal (:status (:final rm)) :key-gone gone
                 :under-named-header-names (:k (a5/wire-parts under-named))
                 :under-named-after-removal-route (a5/shape after-route)
                 :under-named-after-removal-holds-value (boolean (some-> (a5/opened after-route) (str/includes? vx)))
                 :under-named-decoded-outside-with-no-key (boolean (some-> outside (str/includes? vx)))
                 :control-after-removal (a5/shape after-control)
                 :forged-through-the-open-route (a5/shape forged-open)}]
        (when (= [200 nil] other-attr) (finding! :e1-accepted {:case :other-attribute}))
        (when (= [200 nil] upper) (finding! :e1-accepted {:case :upper-case-hex}))
        (report :e1 row)
        (x/oracle! "e1" (= [409 "DerivedRecordUnsealed"] (:control-clear-unit outcomes)) "control: a clear unit is refused" row)
        (x/oracle! "e1" (= [200 nil] (:control-sealed-unit outcomes)) "control: a sealed unit is accepted" row)
        (x/oracle! "e1" (a5/removed? after-control) "control: a record naming the removed row opens as removed" row)))))

;; a stored derived document decoded as the check decodes it (its packed page bytes too), searched for `needle`
(defn page-holds? [src entity needle]
  (let [body (:body (offers/route src "v1" "read" {"entityIds" [entity]}))
        texts (filter string? (tree-seq coll? seq body))
        decode (fn [t] (try (let [doc (#'ds/document t)
                                  bytes (when (map? doc) (get doc "bytes"))]
                              (str (pr-str doc) (when (string? bytes) (pr-str (#'ds/document (str "\"" bytes "\""))))))
                            (catch Exception _ t)))]
    (boolean (some #(str/includes? (decode %) needle) texts))))
;; ---- e2: a write checked before the setting, committed after it ----------------------------------------------
(defn e2 []
  (g/fresh-scope true
    (fn [src conn]
      (let [[vx _] (a5/seed! src "e2-x" g/a1 "e2")
            held (g/save-frame "e2-held" (str "notice:v1:" hex ":answer:1:f1") "notice/value"
                               (json/write-str (page [["k" (str "derived:" vx)]])) nil nil)
            during (atom nil)
            reply (g/with-held src held (fn [] (reset! during (offers/outcome (require! src)))))
            required (ds/required? (d/db conn))
            again (doc! src "e2-again" "answer:1:f2" (page [["k" (str "derived:" vx)]]))
            stored (page-holds? src (str "notice:v1:" hex ":answer:1:f1") (str "derived:" vx))
            row {:setting-declared-while-held @during :held-write (offers/outcome reply) :setting-now required
                 :same-write-after again :stored-document-holds-the-clear-copy stored}]
        (report :e2 row)
        (when (and (= 200 (:status reply)) required stored) (finding! :e2-window {:stored stored}))
        (x/oracle! "e2" (= [409 "DerivedRecordUnsealed"] again) "after the setting the same write is refused" row)))))

;; ---- e3: the journal's change record of a derived write -------------------------------------------------------
(defn- save-frame-change
  "g/save-frame with the journal's change record carrying `change-value` instead of the row's value."
  [command owner attr value change-value]
  (let [row* #'g/row* tx (str "_tx/" command)
        fact (row* command owner attr value tx)
        j (fn [suffix a] (row* (str command "/" suffix) tx a nil tx "_Transaction"))
        change (json/write-str {"op" "assert" "tripleId" command "entityId" owner "attribute" attr
                                "value" {"type" "string" "value" change-value} "validFrom" 0.0 "recordedAt" 1000.0
                                "assertionTxId" tx})
        journal [(assoc (j "p" ":_tx/position") :value_type "number" :value_number 1.0)
                 (assoc (j "t" ":_tx/instant") :value_type "datetime" :value_datetime 1000.0)
                 (assoc (j "owner" ":_tx/changed-entity") :value_string owner)
                 (assoc (j "cmd" ":_tx/command-id") :value_string command)
                 (assoc (j "assert" ":_tx/change") :value_type "json" :value_json change)]
        fresh (conj journal fact)]
    (selftest/row-input {"span" 1 "position" 1 "scopeWide" false "entities" [owner] "operationId" command
                         "rows" (mapv storage/wire-row fresh) "newIds" (mapv :id fresh) "live" []
                         "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]})))
(defn e3 []
  (g/fresh-scope true
    (fn [src conn]
      (let [[vx idx] (a5/seed! src "e3-x" g/a1 "e3")
            wire (get (a5/seal-placed src [idx] (str "derived:" vx) place) "sealed")
            _ (require! src)
            sealed-doc (json/write-str (page [["" wire]]))
            clear-doc (str "derived-in-journal:" vx)
            o (offers/outcome (offers/send src (save-frame-change "e3-w" (str "notice:v1:" hex ":answer:1:f1") "notice/value"
                                                                  sealed-doc clear-doc)))
            native (count (#'r4/native-clear conn [(str "derived-in-journal:" vx)]))
            journal (g/text (:body (offers/route src "v2" "transactions" {"after" 0 "limit" 1000})))
            row {:write o :native-datoms-with-the-clear-copy native
                 :journal-route-shows-it (str/includes? journal (str "derived-in-journal:" vx))}]
        (report :e3 row)
        (when (= [200 nil] o) (finding! :e3-journal-change-accepted row))))))

;; ---- z2: the removal review's Z2 (a rebuilt log drops a protected attribute) with this option ----------------------
(defn scope-with [attrs f]
  (offers/in-scope
    (fn [name conn]
      (binding [g/sealed-run? true]
        (with-redefs [group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
          (let [p (offers/route name "v2" "protection" {"attributes" attrs "sealed" true})
                m (offers/route name "v2" "removal-per-account" {})]
            (when-not (= [200 200] [(:status p) (:status m)]) (throw (ex-info "scope setup failed" {:p p :m m})))
            (f name conn)))))))
(defn- log-delete! [name]
  (let [now (get (json/read-str (privacy/record-text name "head.json")) "seq")]
    (doseq [k (range 1 (inc now))] (Files/deleteIfExists (privacy/path name (str "erase-" k ".json"))))
    (Files/deleteIfExists (privacy/path name "head.json"))
    (Files/deleteIfExists (privacy/path name "pending.json"))
    (reset! privacy/cache {})))
(defn z2 []
  (scope-with [":v" ":p"]
    (fn [src conn]
      (let [lbl "z2"
            pv (g/secret g/a1 "p-before")
            s1 (offers/outcome (offers/send src (g/save-frame "z2-a1-p" g/a1 ":p" pv nil nil)))
            p-place "a|pl:a1"
            old-wire (get (a5/seal-placed src ["z2-a1-p"] (str "derived:" pv) p-place) "sealed")
            req (offers/outcome (require! src))
            s2 (offers/outcome (offers/send src (g/frame "z2-b1-v" g/b1 (g/secret g/b1 "v") nil nil)))
            rm (offers/outcome (x/remove-attr! src "z2-rm-b1" g/b1))
            _ (log-delete! src)
            rebuilt (offers/outcome (offers/route src "v2" "removal-log-rebuild" {"attributes" [":v"] "sealed" true}))
            pv2 (g/secret g/a1 "p-after")
            s3 (offers/outcome (offers/send src (g/save-frame "z2-a1-p2" g/a1 ":p" pv2 "z2-a1-p" nil)))
            native-new (count (g/raw-occurrences conn pv2))
            new-seal (a5/seal-placed src ["z2-a1-p2"] (str "derived:" pv2) p-place)
            new-wire (get new-seal "sealed")
            stored (when new-wire (doc! src "z2-doc" "answer:1:f1" (page [["" new-wire]])))
            outside (when new-wire (a5/offline-open new-wire (fn [_] nil)))
            rm-p (offers/outcome (x/erase! src "z2-rm-a1-p" [{"entityId" g/a1 "attribute" ":p"}]))
            old-after (a5/open-placed src old-wire p-place)
            new-after (when new-wire (a5/open-placed src new-wire p-place))
            row {:seeds [s1 s2] :setting req :removal-of-b1-v rm :rebuild-dropping-p rebuilt
                 :policy-now (get (json/read-str (or (privacy/record-text src "head.json") "{}")) "attributes")
                 :new-p-save s3 :native-datoms-with-new-p-value-in-clear native-new
                 :new-record (if new-wire {:names (:k (a5/wire-parts new-wire))} new-seal)
                 :new-record-stored-under-the-setting stored
                 :new-record-decoded-outside-with-no-key (boolean (some-> outside (str/includes? pv2)))
                 :removal-of-a1-p rm-p :old-record-after (a5/shape old-after) :new-record-after (some-> new-after a5/shape)}]
        (report :z2 row)
        (when (= [200 nil] rebuilt)
          (finding! :z2-rebuild-drops-a-protected-attribute (select-keys row [:native-datoms-with-new-p-value-in-clear
                                                                             :new-record :new-record-stored-under-the-setting
                                                                             :new-record-decoded-outside-with-no-key
                                                                             :removal-of-a1-p :old-record-after :new-record-after])))
        (x/oracle! lbl (not= [200 nil] rebuilt) "a rebuild cannot drop a protected attribute from the policy" row)))))

;; ---- m2: the key re-sweep's cost and its failures ------------------------------------------------------------------
(defn- failures-total [] (reduce + 0 (vals (get @stats/counts :removalFailures {}))))
(defn m2 []
  (doseq [n [10 100 400 1000]]
    (g/fresh-scope true
      (fn [src conn]
        (let [seeded (vec (for [j (range n)] (second (a5/seed! src (str "m2-" n "-" j) (format "acct/a/pl:%08d/f" j) "m2"))))
              id0 (first seeded)
              backup (a5/file-key src id0)
              t0 (System/nanoTime)
              _ (doseq [[j id] (map-indexed vector seeded)] (x/erase! src (str "m2-rm-" n "-" j) [{"id" id}]))
              removal-ms (/ (- (System/nanoTime) t0) 1e6)
              _ (a5/key-gone? src [id0])
              conn-of (fn [_] conn)
              passes (vec (for [_ (range 5)]
                            (with-redefs [envelope/authority-scopes (fn [] [src])]
                              (let [t (System/nanoTime)] (ds/resweep! conn-of) (/ (- (System/nanoTime) t) 1e6)))))
              ;; a failure inside a pass: a key file restored from an older copy, and the authority refusing its delete.
              ;; The shred worker's failures are counted since DX-ERA2's fifth pass; the re-sweep's?
              _ (a5/restore-key! src id0 backup)
              before (failures-total)
              _ (with-redefs [envelope/authority-scopes (fn [] [src])
                              envelope/erase-keys! (fn [& _] (throw (ex-info "injected: the authority refused the delete" {})))]
                  (ds/resweep! conn-of))
              after-resweep (failures-total)
              still-there (boolean (a5/file-key src id0))
              _ (reset! envelope/shredded {})
              _ (with-redefs [envelope/authority-scopes (fn [] [src])
                              envelope/erase-keys! (fn [& _] (throw (ex-info "injected: the authority refused the delete" {})))]
                  (#'envelope/shred-published!))
              after-shred (failures-total)
              _ (with-redefs [envelope/authority-scopes (fn [] [src])] (ds/resweep! conn-of))
              row {:removals n :removals-ms (Math/round (double removal-ms))
                   :resweep-pass-ms (mapv #(Math/round (double %)) passes)
                   :restored-key-left-after-a-failed-resweep still-there
                   :failures-counted-during-the-failed-resweep (- after-resweep before)
                   :failures-counted-by-the-shred-worker-under-the-same-fault (- after-shred after-resweep)
                   :restored-key-left-after-a-good-pass (boolean (a5/file-key src id0))}]
          (report :m2 row)
          (when (and still-there (zero? (- after-resweep before))) (bump! :m2-resweep-failure-silent))
          (x/oracle! "m2" (pos? (- after-shred after-resweep)) "control: the shred worker counts its failure" row)
          (x/oracle! "m2" (not (:restored-key-left-after-a-good-pass row)) "a good pass deletes the restored key" row))))))

;; ---- z4: the removal review's Z4 on the merged head: a Reach session primed before a removal, read at its pin between
;; the removal's native commit and its publication (stop after the native commit), on this database's boundary ----------
(defn- reach [name entity pin session]
  (:body (offers/route name "v2" "reach" {"root" entity "basis" {"recordedPosition" pin "validAt" 1.0e12} "session" session "erasureRefs" true})))
(defn- reach-entity [body entity] (some (fn [e] (when (= entity (first e)) e)) (get body "entities")))
(defn- hit? [e] (and (vector? e) (= 2 (count e))))
(defn z4 []
  (doseq [sealed? [false true]]
    (g/fresh-scope sealed?
      (fn [name conn]
        (let [boundary (if (rc/commit-boundary? (d/db conn)) :commit :log)
              lbl (str "z4 Reach session at a pin between the commit and the publication, " (clojure.core/name boundary) (if sealed? ", sealed" ""))
              seeds (g/seed! name [g/a1 g/b1]) value (:value (seeds g/a1))
              pin (g/head conn) session (str "z4-" (clojure.core/name boundary) (if sealed? "-s" ""))
              primed (reach-entity (reach name g/a1 pin session) g/a1)
              _ (reset! x/plan {:stop :after-native :stops-left 1})
              stopped (x/remove-attr! name "z4-rm" g/a1)
              _ (reset! x/plan nil)
              stamp-between (get-in (offers/route name "v2" "erasure-frontier" nil) [:body "removalStamp"])
              between (reach-entity (reach name g/a1 pin session) g/a1)
              plain (str/includes? (x/read-text name g/a1) value)
              done (x/remove-attr! name "z4-rm" g/a1)
              after (reach-entity (reach name g/a1 pin session) g/a1)
              holds (fn [prior e] (if (hit? e) prior (str/includes? (g/text e) value)))
              h0 (holds true primed) h1 (holds h0 between) h2 (holds h1 after)
              kind (fn [e] (if (hit? e) :hit (if (str/includes? (g/text e) value) :inline-with-value :inline-masked)))
              row {:boundary boundary :sealed sealed? :primed (kind primed) :stopped (offers/outcome stopped)
                   :stamp-between stamp-between :session-read-between (kind between) :client-holds-the-value-after-it h1
                   :plain-read-between-answers-value plain :acknowledged (offers/outcome done)
                   :session-read-after-ack (kind after) :client-holds-the-value-after-ack h2}]
          (report :z4 row)
          (x/oracle! lbl (not h2) "after the acknowledgement no Reach session client holds the value" row)
          (when (= boundary :commit)
            (x/oracle! lbl (not h1) "commit boundary: after the commit no read leaves the value with its reader" row)))))))

;; ---- m3: M3's fix re-run: with the setting, a gateway of this build without the option refuses the database ---------
(defn m3 []
  (g/fresh-scope true
    (fn [src conn]
      (let [[vx _] (a5/seed! src "m3-x" g/a1 "m3")
            before (with-redefs [triplex.gateway.main/derived-seal-on false]
                     (offers/outcome (offers/route src "v1" "read" {"entityIds" [g/a1]})))
            _ (require! src)
            routes (with-redefs [triplex.gateway.main/derived-seal-on false]
                     {:read (offers/outcome (offers/route src "v1" "read" {"entityIds" [g/a1]}))
                      :write (offers/outcome (#'r4/doc-write src "m3-w" "answer:1:f1" (page [["k" (str "derived:" vx)]])))
                      :erase (offers/outcome (x/erase! src "m3-rm" [{"id" "m3-x"}]))
                      :journal (offers/outcome (offers/route src "v2" "transactions" {"after" 0 "limit" 10}))})
            row {:without-the-option-before-the-setting before :without-the-option-after routes}]
        (report :m3 row)
        (x/oracle! "m3" (= [200 nil] before) "control: before the setting a gateway without the option serves the database" row)
        (doseq [[k o] routes]
          (x/oracle! "m3" (= [503 "DerivedSealRequired"] o) (str "after the setting a gateway without the option refuses: " (name k)) row))))))

;; ---- fuzz6: the fuzzer with the seal call's failure modes ----------------------------------------------------------
(def slow-gate (atom nil))
(defn install-slow! []
  (let [orig @#'ds/gcm]
    (alter-var-root #'ds/gcm
      (fn [_] (fn [mode k nonce aad data]
                (when-let [[entered go] (when (= mode Cipher/ENCRYPT_MODE) (let [s @slow-gate] (when (and s (compare-and-set! slow-gate s nil)) s)))]
                  (deliver entered true)
                  (deref go 15000 nil))
                (orig mode k nonce aad data))))))

(def stops [nil nil nil :before-declare :after-declare :after-guard :before-native :after-native :at-publish])
(def modes [:ok :ok :ok :ok :failed :slow :refused :mislabelled])

(defn run-schedule6!
  "As attack5's run-schedule!, on a database with the setting declared, records written as real derived documents
  (settled pages, attribute notice/value) and each record's seal call in one of five modes: ok; failed (the call throws:
  the writer stores the clear content instead, which the setting must refuse); slow (the call is held inside the
  gateway, after its key was derived, while the removal of its sources runs, and answers after it); refused (the call
  names a row the database does not hold, 400; the writer stores clear, which must be refused); mislabelled (the writer
  names only unprotected rows: admission 3, counted apart: does the record still open after its source is removed?)."
  [src conn run i ^Random r]
  (let [pick (fn [v] (v (.nextInt r (count v))))
        tag (str run "-" i)
        accts ["a" "b" "c"]
        subjects (vec (for [s (range 3)] (format "acct/%s/pl:%08d" (pick accts) (+ (* 10 i) s))))
        values (vec (for [[si subj] (map-indexed vector subjects) j (range (inc (.nextInt r 3)))]
                      (let [[v aid] (a5/seed! src (str "fz-" tag "-" si "-" j) (str subj "/f" j) tag)]
                        {:si si :owner (str subj "/f" j) :value v :id aid})))
        n (count values)
        plains (vec (for [k (range 2)] (a5/plain-row! src (str "pr-" tag "-" k) (str (first subjects) "/p"))))
        slow-done (atom nil)
        records (loop [k 0 acc [] want (+ 4 (.nextInt r 5))]
                  (if (= k want) acc
                    (let [base (when (and (seq acc) (zero? (.nextInt r 3))) (pick acc))
                          own (vec (distinct (repeatedly (inc (.nextInt r (min 4 n))) #(.nextInt r n))))
                          srcs (vec (sort (distinct (concat (:srcs base) own))))
                          content (str "derived-" tag "-" k ":" (str/join "|" (map #(:value (values %)) srcs)))
                          mode (let [m (pick modes)] (if (and (= m :slow) @slow-done) :ok m))
                          pl (str "acct|" (:owner (values (first srcs))))
                          named (cond-> (mapv #(:id (values %)) srcs) (.nextBoolean r) rseq true (into (repeatedly (.nextInt r 2) #(pick plains))))
                          rec {:srcs srcs :content content :mode mode :place pl :k k}]
                      (bump! :mode mode)
                      (case mode
                        :ok (recur (inc k) (conj acc (assoc rec :wire (get (a5/seal-placed src (vec named) content pl) "sealed"))) want)
                        :mislabelled (recur (inc k) (conj acc (assoc rec :wire (get (a5/seal-placed src (vec plains) content pl) "sealed"))) want)
                        :failed (let [o (with-redefs [ds/handle! (fn [& _] (throw (ex-info "injected: the seal call failed" {})))]
                                          (offers/route src "v2" "derived-seal" {"items" [{"ids" (vec named) "value" content "place" pl}]}))]
                                  (bump! :failed-seal-answer (:status o))
                                  (recur (inc k) (conj acc (assoc rec :clear true)) want))
                        :refused (let [o (offers/route src "v2" "derived-seal" {"items" [{"ids" (conj (vec named) (str "no-such-row-" tag)) "value" content "place" pl}]})]
                                   (bump! :refused-seal-answer (offers/outcome o))
                                   (recur (inc k) (conj acc (assoc rec :clear true)) want))
                        :slow (do (reset! slow-done true)
                                  (recur (inc k) (conj acc (assoc rec :slow true :named (vec named))) want))))))
        ;; every record is written into a real derived document: sealed ones accepted, clear ones refused
        _ (doseq [rec records :when (not (:slow rec))]
            (let [unit (if (:clear rec) ["k" (:content rec)] ["" (:wire rec)])
                  o (doc! src (str "fzw-" tag "-" (:k rec)) (str "answer:" i ":f" (:k rec)) (page [unit]))]
              (bump! :write (:mode rec) o)
              (if (:clear rec)
                (x/oracle! (str "F6 " i) (= [409 "DerivedRecordUnsealed"] o) "the setting refuses the clear content a writer stores after its seal call failed or was refused" {:mode (:mode rec)})
                (x/oracle! (str "F6 " i) (= [200 nil] o) "the setting accepts a sealed unit" {:mode (:mode rec) :o o}))))
        slow-rec (first (filter :slow records))
        rounds (if (zero? (.nextInt r 4)) 2 1)
        results
        (loop [round 1 gone-set #{} acc [] slow-wire nil]
          (if (or (> round rounds) (every? gone-set (range n))) [acc slow-wire]
            (let [left (filterv #(not (gone-set %)) (range n))
                  victim (:si (values (pick left)))
                  mine (filterv #(= victim (:si (values %))) left)
                  now-idx (vec (sort (distinct (repeatedly (inc (.nextInt r (count mine))) #(pick mine)))))
                  now-ids (mapv #(:id (values %)) now-idx)
                  gone-set (into gone-set now-idx)
                  stop (pick stops) kill? (zero? (.nextInt r 4)) restore? (zero? (.nextInt r 8))
                  backups (into {} (for [id now-ids] [id (a5/file-key src id)]))
                  ;; the slow seal: held inside the gateway (its key derived) while this removal runs
                  slow (when (and slow-rec (= round 1))
                         (let [entered (promise) go (promise)]
                           (reset! slow-gate [entered go])
                           (let [f (future (a5/seal-placed src (:named slow-rec) (:content slow-rec) (:place slow-rec)))]
                             (if (deref entered 5000 false) {:f f :go go} (do (reset! slow-gate nil) (deliver go true) {:f f :go go :not-held true})))))
                  between (fn [] (when kill? (reset! privacy/cache {}) (reset! envelope/shredded {}) (bump! :kill)) nil)
                  rm (a5/erase-until-done! src (str "fzr-" tag "-" round) now-ids stop between)
                  _ (when slow (deliver (:go slow) true))
                  slow-answer (when slow (deref (:f slow) 15000 {"timeout" true}))
                  slow-wire (or slow-wire (get slow-answer "sealed"))
                  _ (when slow (bump! :slow-answer (cond (:not-held slow) :not-held (get slow-answer "sealed") :sealed
                                                         (contains? slow-answer "removed") :removed :else :other)))
                  _ (when (and slow slow-wire)
                      (let [o (doc! src (str "fzw-slow-" tag) (str "answer:" i ":fs") (page [["" slow-wire]]))]
                        (x/oracle! (str "F6 " i) (= [200 nil] o) "the setting accepts the slow seal's record" {:o o})))
                  ok (= 200 (:status (:final rm)))
                  label (str "F6 " (pr-str {:i i :round round :stop stop :kill kill? :restore restore?}))
                  gone (and ok (a5/key-gone? src now-ids))
                  restored (when (and ok restore?) (let [id (pick now-ids)] (a5/restore-key! src id (backups id)) (bump! :restore) id))
                  checked (concat (filter :wire records)
                                  (when (and slow-wire slow-rec) [(assoc slow-rec :wire slow-wire :mode :slow)]))]
              (bump! :stop (or stop :none) (if (:fired rm) :fired :not-fired))
              (when (= 2 round) (bump! :second-removal))
              (x/oracle! label ok "the removal completes after at most 4 resends" {:first (:first rm) :final (offers/outcome (:final rm))})
              (when ok
                (x/oracle! label gone "every removed key is deleted" {:ids now-ids})
                (doseq [rec checked]
                  (let [hit (some gone-set (:srcs rec)) o (a5/open-placed src (:wire rec) (:place rec))
                        dec (if (= :mislabelled (:mode rec)) (a5/offline-open (:wire rec) (fn [_] nil)) (a5/offline src (:wire rec)))]
                    (bump! :records (:mode rec) (if hit :from-removed :kept))
                    (cond
                      (= :mislabelled (:mode rec))
                      (do (bump! :mislabelled (if hit :from-removed :kept) :route (a5/shape o) :outside (if dec :decodes :no))
                          (when (and hit (= (:content rec) (a5/opened o))) (bump! :mislabelled-removed-value-still-opens)))
                      hit
                      (do (x/oracle! label (a5/removed? o) "a record computed from a removed value opens as removed" {:mode (:mode rec)})
                          (if (and restored (some #(= restored (:id (values %))) (:srcs rec))
                                   (every? #(or (not (gone-set %)) (= restored (:id (values %)))) (:srcs rec)))
                            (bump! :restored-key-decodes (boolean dec))
                            (x/oracle! label (nil? dec) "no key the authority holds decodes a removed value's copy" {:mode (:mode rec)})))
                      :else
                      (do (x/oracle! label (= (:content rec) (a5/opened o)) "a record of kept values opens to its exact content" {:mode (:mode rec)})
                          (x/oracle! label (= (:content rec) dec) "and decodes outside the gateway" {:mode (:mode rec)}))))))
              (when restored (Files/deleteIfExists (envelope/key-file src restored)))
              (recur (inc round) gone-set (conj acc gone-set) slow-wire))))
        gone-set (or (last (first results)) #{})]
    (bump! :schedules)
    {:gone (into {} (for [k gone-set] [(:value (values k)) #{(:owner (values k))}]))
     ;; never stored in clear anywhere: the removed records' contents (except a mislabelled one's, sealed under no key)
     ;; and every clear content a writer tried to store
     :contents (vec (concat (for [rec records :when (and (some gone-set (:srcs rec)) (not= :mislabelled (:mode rec)))] (:content rec))
                            (for [rec records :when (:clear rec)] (:content rec))))}))

(defn fuzz6 [run n block seed]
  (install-slow!)
  (let [r (Random. (long seed))]
    (doseq [kb (range (quot (+ n block -1) block))]
      (g/fresh-scope true
        (fn [src conn]
          (x/oracle! "F6 setting" (= 200 (:status (require! src))) "the setting is declared" nil)
          (let [results (vec (for [i (range (* kb block) (min n (* (inc kb) block)))]
                               (try (run-schedule6! src conn run i r)
                                    (catch Throwable e
                                      (reset! x/plan nil) (reset! slow-gate nil)
                                      (x/oracle! (str "F6 " i) false (str "schedule stopped: " (.getMessage e)))
                                      nil))))
                gone (apply merge-with into {} (keep :gone results))
                contents (vec (mapcat :contents (keep identity results)))
                hits (#'r4/native-clear conn (concat (keys gone) contents))
                journal (g/text (:body (offers/route src "v2" "transactions" {"after" 0 "limit" 1000})))]
            (bump! :native-clear (count hits))
            (x/oracle! (str "F6 block " kb) (empty? hits) "no native datom holds a removed value, a copy of it, or a refused clear write" (take 3 hits))
            (x/oracle! (str "F6 block " kb) (not-any? #(str/includes? journal %) (concat (keys gone) contents))
                       "no journal page holds them" nil)
            (println "ERA6_PROGRESS" (pr-str {:block kb :schedules (get @tally [:schedules]) :oracles @x/oracles
                                               :violations (count @x/violations)}))))))))

(defn- guarded [label f]
  (try (f) (catch Throwable e (reset! x/plan nil) (x/oracle! label false (str "case stopped: " (.getMessage e)) (pr-str e)))))
(defn main []
  (x/install-hooks!)
  (#'r4/install-declare-hooks!)
  (envelope/start!)
  (println "ERA6_BOUNDARY" (pr-str {:commit-boundary-allowed rc/may-turn-on}))
  (case (System/getenv "ERA5_PHASE")
    "cases6" (do (guarded "e1" e1) (guarded "e2" e2) (guarded "e3" e3) (guarded "z2" z2) (guarded "z4" z4) (guarded "m2" m2))
    "z4" (do (guarded "z4" z4) (guarded "m3" m3))
    "fuzz6" (fuzz6 (or (System/getenv "ERA5_RUN") "g0") (Long/parseLong (or (System/getenv "ERA5_N") "200"))
                   (Long/parseLong (or (System/getenv "ERA5_BLOCK") "100")) (Long/parseLong (or (System/getenv "ERA5_SEED") "1"))))
  (println "ERA6_TALLY" (pr-str (into (sorted-map) (map (fn [[kk v]] [(pr-str kk) v])) @tally)))
  (println "ERA6_FINDINGS" (pr-str (frequencies @findings)))
  (println "ERA5_VIOLATIONS" (pr-str (frequencies (map :message @x/violations))))
  (doseq [v (take 8 @x/violations)] (println "ERA5_VIOLATION" (pr-str v)))
  (println "ERA5_SUMMARY" (pr-str {:oracles @x/oracles :violations (count @x/violations)}))
  (shutdown-agents)
  (System/exit 0))
