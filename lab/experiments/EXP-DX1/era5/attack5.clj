(ns era5-attack
  "[DX-ERA5] Adversarial review of TX2_DERIVED_SEAL (DX-ERA4, era4/DERIVED-COPIES.md; the review is era5/REVIEW.md).
  In process: the gateway's own route handler, an in-memory Datomic, the file removal authority, a SEALED protected
  database guarded per account, every option on (inproc.sh sets them). Loaded after wfix1/regression.clj, era2/gate.clj,
  era3/attack.clj, act9/tickets.clj and era4/races.clj, whose helpers it reuses.

  Phases (ERA5_PHASE):
    cases    deterministic attacks c1 to c9 (one of n, length and equality, tampering and place, a restored key decoded
             outside the gateway, an unsealed database, unknown names, two removals of one record's sources, a removal no
             copy used, the log put back to a pending-state copy)
    pending  a removal left pending stops the deletion of every published removal's keys (needs a grace above 0)
    fuzz     schedules over derived records x removal stop points x kills x key restores, checked through the routes AND
             by decoding every stored record outside the gateway with every key file the authority still holds
  A record is decoded outside the gateway exactly as the page specifies (section 3.1): HKDF-SHA256 with salt
  `triplex-derived-v1` over the assertions' keys in ID order, info [database, IDs...], AES-256-GCM with the header as
  associated data. Each case first checks that this decoder opens a live record (so a nil after a removal means the key
  is gone, not that the decoder is wrong)."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.privacy :as privacy] [triplex.gateway.envelope :as envelope]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as x] [era4-races :as r4])
  (:import [java.nio.file Files Path Paths OpenOption StandardOpenOption CopyOption StandardCopyOption LinkOption]
           [java.nio.charset StandardCharsets]
           [java.util Base64 Random UUID]
           [javax.crypto Cipher Mac]
           [javax.crypto.spec GCMParameterSpec SecretKeySpec]))

(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))
(defn report [k m] (println "ERA5_CASE" (pr-str [k m])))

;; ---- the routes ------------------------------------------------------------------------------------------------
(defn- items [r] (get-in r [:body "items"]))
(defn seal-many [src xs] (offers/route src "v2" "derived-seal" {"items" (vec xs)}))
(defn seal1 [src ids value] (first (items (seal-many src [{"ids" (vec ids) "value" value}]))))
(defn open1 [src wire]
  (let [r (offers/route src "v2" "derived-open" {"items" [wire]})]
    {:status (:status r) :code (get-in r [:body "code"]) :item (first (items r))}))
(defn opened [o] (get-in o [:item "value"]))
(defn removed? [o] (contains? (:item o) "removed"))
(defn shape [o] (cond (removed? o) :removed (opened o) :value :else [(:status o) (:code o)]))

(defn seed!
  "One protected value of `owner` saved on its own; [value assertion-id] (era2/gate.clj's frame: the fact's ID is the
  command)."
  [src cmd owner tag]
  (let [v (g/secret owner tag) rep (offers/send src (g/frame cmd owner v nil nil))]
    (x/oracle! "seed" (= 200 (:status rep)) "the seed save" (offers/outcome rep))
    [v cmd]))

(defn derived-write!
  "A derived document holding `content` (a sealed record), written as the option's writers write theirs: an ordinary
  ticketed save naming its account."
  [src conn cmd doc content acct]
  (offers/send src (assoc (g/save-frame cmd doc ":notice/body" content nil nil)
                          "erasureSeq" (g/seq-now src conn) "erasureAccounts" [acct])))

;; ---- decoding outside the gateway --------------------------------------------------------------------------------
(defn- unb64u ^bytes [^String s] (.decode (Base64/getUrlDecoder) s))
(defn- utf8 ^bytes [^String s] (.getBytes s StandardCharsets/UTF_8))
(defn- hmac ^bytes [^bytes k ^bytes data]
  (let [m (Mac/getInstance "HmacSHA256")] (.init m (SecretKeySpec. k "HmacSHA256")) (.doFinal m data)))
(defn wire-parts [^String wire]
  (let [[header nonce body] (str/split (subs wire 5) #"\." 3)
        h (json/read-str (String. (unb64u header) StandardCharsets/UTF_8))]
    {:header header :nonce (unb64u nonce) :body (unb64u body) :d (get h "d") :k (get h "k")}))
(defn clear-length
  "The length in bytes of a sealed record's clear content, from its stored bytes alone (AES-GCM adds a 16-byte tag)."
  [wire]
  (- (alength ^bytes (:body (wire-parts wire))) 16))
(defn file-key [src id] (let [p (envelope/key-file src id)] (when (privacy/exists? p) (Files/readAllBytes p))))
(defn offline-open
  "The record's clear content decoded with the key bytes `key-of` gives for each assertion it names (the authority's
  files), or nil when one is missing or the record does not open."
  [wire key-of]
  (let [{:keys [header nonce body d k]} (wire-parts wire)
        ks (mapv key-of k)]
    (when (every? some? ks)
      (try
        (let [prk (hmac (utf8 "triplex-derived-v1") (byte-array (mapcat seq ks)))
              okm (hmac prk (byte-array (concat (seq (utf8 (json/write-str (into [d] k)))) [(byte 1)])))
              c (Cipher/getInstance "AES/GCM/NoPadding")]
          (.init c (int Cipher/DECRYPT_MODE) (SecretKeySpec. okm "AES") (GCMParameterSpec. 128 ^bytes nonce))
          (.updateAAD c (utf8 header))
          (String. (.doFinal c ^bytes body) StandardCharsets/UTF_8))
        (catch Exception _ nil)))))
(defn offline [src wire] (offline-open wire #(file-key src %)))

(defn shred-now!
  "One pass of the shred worker (envelope.clj `shred-published!`), as the worker runs every 500 ms."
  []
  (#'envelope/shred-published!))
(defn key-gone? [src ids]
  (loop [n 0]
    (shred-now!)
    (cond (not-any? #(privacy/exists? (envelope/key-file src %)) ids) true
          (> n 30) false
          :else (do (Thread/sleep 100) (recur (inc n))))))
(defn restore-key! [src id ^bytes backup]
  (Files/write (envelope/key-file src id) backup
               (into-array OpenOption [StandardOpenOption/CREATE StandardOpenOption/WRITE StandardOpenOption/TRUNCATE_EXISTING])))

(defn erase-until-done!
  "A removal by assertion IDs, stopped at `stop` once (nil: none), then resent until it answers 200 (at most 4 times),
  with `between` run after the first answer."
  [src cmd ids stop between]
  (let [sel (mapv (fn [i] {"id" i}) ids)
        _ (reset! x/plan (when stop {:stop stop :stops-left 1}))
        first-reply (x/erase! src cmd sel)
        fired (and stop (zero? (long (:stops-left @x/plan 1))))
        _ (reset! x/plan nil)
        mid (when between (between))
        final (loop [n 0 reply first-reply]
                (if (or (= 200 (:status reply)) (>= n 4)) reply (recur (inc n) (x/erase! src cmd sel))))]
    {:first (offers/outcome first-reply) :fired (boolean fired) :mid mid :final final
     :seq (get-in final [:body "seq"])}))

;; ---- c1: one of n ------------------------------------------------------------------------------------------------
(defn one-of-n
  "A record sealed under n protected assertions (n up to 512, the route's limit); one of them, chosen at random, is
  removed. The record must open as removed through the route, the assertion must seal nothing, and outside the gateway
  the n-1 keys left must not decode it; a record sealed under the other n-1 must still open. Then n = 513."
  []
  (doseq [n [1 2 3 5 8 16 64 200 512]]
    (g/fresh-scope true
      (fn [src conn]
        (let [lbl (str "c1 one of " n)
              r (Random. (long (+ 7 n)))
              seeded (vec (for [j (range n)] (seed! src (str "c1-" n "-" j) (format "acct/a/pl:%08d/f%d" n j) "c1")))
              ids (mapv second seeded)
              content (str "derived:" (str/join "|" (map first seeded)))
              victim (.nextInt r n)
              rest-ids (vec (concat (subvec ids 0 victim) (subvec ids (inc victim))))
              wire (get (seal1 src (rseq ids) content) "sealed")
              rest-wire (when (seq rest-ids) (get (seal1 src rest-ids "derived:rest") "sealed"))
              before (open1 src wire)
              offline-before (offline src wire)
              rm (erase-until-done! src (str "c1-rm-" n) [(ids victim)] nil nil)
              gone (key-gone? src [(ids victim)])
              after (open1 src wire)
              again (seal1 src ids "probe")
              offline-after (offline src wire)
              kept-left (count (filter #(file-key src %) rest-ids))
              rest-after (when rest-wire (open1 src rest-wire))
              row {:n n :victim victim :header-names (count (:k (wire-parts wire))) :before (shape before)
                   :offline-before-decodes (= content offline-before) :removal (:status (:final rm)) :key-gone gone
                   :after (shape after) :seal-again (if (contains? again "removed") :removed again)
                   :offline-after (if offline-after :DECODED :nil) :kept-keys-on-disk kept-left
                   :rest-after (when rest-after (shape rest-after))}]
          (report :c1 row)
          (x/oracle! lbl (= content (opened before)) "the record opens before the removal" row)
          (x/oracle! lbl (= content offline-before) "the outside decoder opens a live record (it is the page's algorithm)" row)
          (x/oracle! lbl (= 200 (:status (:final rm))) "the removal completes" row)
          (x/oracle! lbl gone "the removed assertion's key is deleted" row)
          (x/oracle! lbl (removed? after) "one removed source of n makes the record open as removed" row)
          (x/oracle! lbl (contains? again "removed") "a removed source seals nothing" row)
          (x/oracle! lbl (nil? offline-after) "the n-1 keys left do not decode the record" row)
          (when rest-wire (x/oracle! lbl (= "derived:rest" (opened rest-after)) "a record of the other n-1 still opens" row))))))
  (g/fresh-scope true
    (fn [src _]
      (let [r (seal-many src [{"ids" (mapv #(str "row-" %) (range 513)) "value" "a world of 513 string rows"}])]
        (report :c1-limit {:ids 513 :outcome (offers/outcome r) :message (get-in r [:body "message"])})
        (bump! :c1-limit-513 (offers/outcome r))))))

;; ---- c2: length and equality -------------------------------------------------------------------------------------
(defn- delivery
  "A delivery in the shape the recorder seals (canonical JSON of W0's delivery: id, key, kind, payload, rule, seq,
  subject, version), with DOCEXP's payload copying the document type and its expiry date."
  [subject doc-type expires]
  (str "{\"id\":\"" (apply str (repeat 64 "7")) "\",\"key\":\"" subject "/doc:a\",\"kind\":\"notify.document-expired\","
       "\"payload\":{\"docType\":\"" doc-type "\",\"expiresOn\":\"" expires "\"},\"rule\":\"DOCEXP\",\"seq\":1,"
       "\"subject\":\"" subject "\",\"version\":\"" (apply str (repeat 64 "3")) "\"}"))

(defn length-and-equality
  "After X's document type is removed and its key deleted, a stored sealed record of X still carries the exact length
  of its clear content (AES-GCM, no padding). Against a kept subject's record of the same rule (any reader can open a
  live one), that length identifies X's removed value among the values the attribute takes. And two copies of one
  content under the same assertions are byte-for-byte equal (the nonce is computed from the content), so equality
  between copies stays visible after the removal."
  []
  (g/fresh-scope true
    (fn [src conn]
      (let [lbl "c2 length and equality"
            [_ ix] (seed! src "c2-x" "acct/a/pl:00000001/doc:a" "c2")
            [_ iy] (seed! src "c2-y" "acct/a/pl:00000002/doc:a" "c2")
            exact (every? (fn [n] (= n (clear-length (get (seal1 src [ix] (apply str (repeat n "z"))) "sealed")))) (range 0 65))
            wx (get (seal1 src [ix] (delivery "pl:00000001" "visa" "2026-02-13")) "sealed")
            wx2 (get (seal1 src [ix] (delivery "pl:00000001" "visa" "2026-02-13")) "sealed")
            wy (get (seal1 src [iy] (delivery "pl:00000002" "ead" "2025-12-29")) "sealed")
            stored (derived-write! src conn "c2-doc" "notice:v1:c2" wx "a")
            rm (erase-until-done! src "c2-rm" [ix] nil nil)
            gone (key-gone? src [ix])
            ;; the attacker, after the removal: X's stored bytes, and Y's record opened (Y is kept)
            y-clear (opened (open1 src wy))
            x-len (clear-length wx)
            y-len (count (utf8 y-clear))
            y-type "ead"
            ;; W0's schema (packages/w0/src/schema.ts 83): docType is one of passport, ead, visa
            candidates ["passport" "ead" "visa"]
            fits (filterv #(= x-len (+ (- y-len (count y-type)) (count %))) candidates)
            row {:exact-length-for-0-to-64 exact :x-removed (:status (:final rm)) :key-gone gone
                 :x-opens (shape (open1 src wx)) :x-offline (if (offline src wx) :DECODED :nil)
                 :x-clear-length x-len :y-clear-length y-len :candidates-that-fit fits
                 :two-copies-equal (= wx wx2) :stored (offers/outcome stored)}]
        (report :c2 row)
        (x/oracle! lbl (removed? (open1 src wx)) "X's record opens as removed" row)
        (x/oracle! lbl (not= ["visa"] fits) "BREAK if one candidate fits: the stored length identifies X's removed document type" row)
        (x/oracle! lbl (not= wx wx2) "BREAK if equal: two copies of one content are recognisable as equal after the removal" row)))))

;; ---- c3: tampering and place -------------------------------------------------------------------------------------
(defn- rewire [wire f]
  (let [[header nonce body] (str/split (subs wire 5) #"\." 3)] (str "tdx1." (str/join "." (f [header nonce body])))))
(defn- header-of [d k] (.encodeToString (.withoutPadding (Base64/getUrlEncoder)) (utf8 (json/write-str {"d" d "k" k}))))
(defn- flip [^String b64]
  (let [b (unb64u b64)] (aset-byte b 0 (unchecked-byte (bit-xor (aget b 0) 1)))
    (.encodeToString (.withoutPadding (Base64/getUrlEncoder)) b)))

(defn tampering
  "A record's header names fewer assertions, names them out of order, or another database; a bit of the nonce or the
  body flipped: none may open. A record of account A's subject written into account B's document opens there to A's
  value (the seal binds the database and the assertions only, not the document, subject or account that holds it):
  observed."
  []
  (g/fresh-scope true
    (fn [src conn]
      (let [lbl "c3 tampering"
            [vx ix] (seed! src "c3-x" "acct/a/pl:00000001/v" "c3")
            [vy iy] (seed! src "c3-y" "acct/a/pl:00000001/w" "c3")
            both (vec (sort [ix iy]))
            w (get (seal1 src both (str "derived:" vx vy)) "sealed")
            {:keys [d]} (wire-parts w)
            fewer (rewire w (fn [[_ n b]] [(header-of d [ix]) n b]))
            unsorted (rewire w (fn [[_ n b]] [(header-of d (vec (reverse both))) n b]))
            other-db (rewire w (fn [[_ n b]] [(header-of (str d "x") both) n b]))
            nonce (rewire w (fn [[h n b]] [h (flip n) b]))
            body (rewire w (fn [[h n b]] [h n (flip b)]))
            outcomes (into {} (for [[k v] {:fewer fewer :unsorted unsorted :other-db other-db :nonce nonce :body body}]
                                [k (let [o (open1 src v)] [(:status o) (:code o) (shape o)])]))
            moved (derived-write! src conn "c3-moved" "settlement-values-b:answer:1" w "b")
            read-b (x/read-text src "settlement-values-b:answer:1")
            in-b (first (re-seq #"tdx1\.[A-Za-z0-9_.-]+" read-b))
            opened-in-b (when in-b (opened (open1 src in-b)))
            row {:tampered outcomes :moved-write (offers/outcome moved)
                 :account-b-document-opens-to-account-a-value (= (str "derived:" vx vy) opened-in-b)}]
        (report :c3 row)
        (doseq [[k [_ _ s]] outcomes] (x/oracle! lbl (not= :value s) (str "a tampered record (" (name k) ") does not open") row))
        (bump! :c3-moved-opens (boolean (:account-b-document-opens-to-account-a-value row)))))))

;; ---- c4: a key restored from an older copy of the authority ------------------------------------------------------
(defn restored-key
  "X's key is deleted after the removal; then the key file comes back from a copy of the authority taken before it.
  The routes keep answering removed (the published removal decides). Outside the gateway the restored key decodes every
  derived record of X. The running worker does not delete it again (its progress is past that removal); a restart does.
  Page 11.6 states the restored key stays until a restart; this measures what it opens meanwhile."
  []
  (g/fresh-scope true
    (fn [src conn]
      (let [lbl "c4 restored key"
            [vx ix] (seed! src "c4-x" "acct/a/pl:00000001/v" "c4")
            wire (get (seal1 src [ix] (str "derived:" vx)) "sealed")
            _ (derived-write! src conn "c4-doc" "notice:v1:c4" wire "a")
            backup (file-key src ix)
            rm (erase-until-done! src "c4-rm" [ix] nil nil)
            gone (key-gone? src [ix])
            offline-gone (offline src wire)
            _ (restore-key! src ix backup)
            route (open1 src wire)
            again (seal1 src [ix] "probe")
            offline-restored (offline src wire)
            _ (dotimes [_ 6] (shred-now!) (Thread/sleep 500))
            still (some? (file-key src ix))
            _ (reset! envelope/shredded {})
            restart-gone (key-gone? src [ix])
            row {:removal (:status (:final rm)) :key-gone gone :offline-after-delete (if offline-gone :DECODED :nil)
                 :route-after-restore (shape route) :seal-after-restore (if (contains? again "removed") :removed again)
                 :offline-with-restored-key (= (str "derived:" vx) offline-restored)
                 :restored-key-still-there-after-3s still :deleted-after-a-restart restart-gone}]
        (report :c4 row)
        (x/oracle! lbl (nil? offline-gone) "after the deletion no key the authority holds decodes the copy" row)
        (x/oracle! lbl (removed? route) "with the key restored the routes answer removed" row)
        (bump! :c4-restored-key-decodes-copy (boolean (:offline-with-restored-key row)))
        (bump! :c4-restored-key-kept-until-restart still)))))

;; ---- c5: an unsealed protected database --------------------------------------------------------------------------
(defn unsealed
  "On an UNSEALED protected database (the gateway accepts `sealed: false` with no other condition): native datoms
  holding the value before and after its removal, and what the derived-seal route answers."
  []
  (g/fresh-scope false
    (fn [src conn]
      (let [[vx ix] (seed! src "c5-x" "acct/a/pl:00000001/v" "c5")
            before (count (g/raw-occurrences conn vx))
            rm (erase-until-done! src "c5-rm" [ix] nil nil)
            after (count (g/raw-occurrences conn vx))
            routes (str/includes? (x/read-text src "acct/a/pl:00000001/v") vx)
            s (seal-many src [{"ids" [ix] "value" "x"}])
            row {:declared-unsealed true :removal (:status (:final rm)) :native-datoms-with-value-before before
                 :native-datoms-with-value-after after :read-route-answers-value routes :seal (offers/outcome s)}]
        (report :c5 row)
        (bump! :c5-native-after-removal after)))))

;; ---- c6: names the gateway does not know -------------------------------------------------------------------------
(defn unknown-names
  "The route keeps only the names that are protected assertions of its database and answers {clear: true} when none
  is left, so the caller stores its value in clear. A writer that sends a wrong name (an entity ID, a row of another
  database, an ID in another form) gets `clear`, not a refusal."
  []
  (g/fresh-scope true
    (fn [src conn]
      (let [[vx ix] (seed! src "c6-x" "acct/a/pl:00000001/v" "c6")
            cases {:entity-id ["acct/a/pl:00000001/v"] :other-database [(str "s2-other/" ix)] :upper-case [(str/upper-case ix)]
                   :empty [] :the-assertion [ix]}
            out (into {} (for [[k ids] cases] [k (let [i (seal1 src ids (str "derived:" vx))]
                                                     (cond (contains? i "sealed") :sealed (contains? i "clear") :CLEAR :else i))]))]
        (report :c6 out)
        (doseq [[k v] out :when (= v :CLEAR)] (bump! :c6-clear k))))))

;; ---- c7: two removals of one record's sources; a removal no copy used; another subject untouched ------------------
(defn two-removals
  []
  (g/fresh-scope true
    (fn [src conn]
      (let [lbl "c7 two removals"
            [v1 i1] (seed! src "c7-1" "acct/a/pl:00000001/f1" "c7")
            [v2 i2] (seed! src "c7-2" "acct/a/pl:00000001/f2" "c7")
            [v3 i3] (seed! src "c7-3" "acct/a/pl:00000001/f3" "c7")
            [vy iy] (seed! src "c7-y" "acct/b/pl:00000002/f1" "c7")
            w12 (get (seal1 src [i1 i2] (str "d12:" v1 v2)) "sealed")
            wy (get (seal1 src [iy] (str "dy:" vy)) "sealed")
            wy3 (get (seal1 src [iy i3] (str "dy3:" vy v3)) "sealed")
            y-before (open1 src wy)
            r3 (erase-until-done! src "c7-rm3" [i3] nil nil)
            after3 {:w12 (shape (open1 src w12)) :wy (shape (open1 src wy)) :wy3 (shape (open1 src wy3))}
            r1 (erase-until-done! src "c7-rm1" [i1] nil nil)
            after1 (open1 src w12)
            r2 (erase-until-done! src "c7-rm2" [i2] nil nil)
            after2 (open1 src w12)
            y-after (open1 src wy)
            row {:removal-no-copy-used after3 :after-first-source after1 :after-second-source after2
                 :seq-after-two (get-in after2 [:item "seq"]) :removals [(:seq r3) (:seq r1) (:seq r2)]
                 :other-subject-same-bytes (= (:item y-before) (:item y-after))}]
        (report :c7 row)
        (x/oracle! lbl (= :value (:w12 after3)) "a removal no copy used leaves the copy readable" row)
        (x/oracle! lbl (= :value (:wy after3)) "another account's copy is untouched" row)
        (x/oracle! lbl (= :removed (:wy3 after3)) "a copy of two subjects' values is removed with either" row)
        (x/oracle! lbl (removed? after1) "the first of two sources removed" row)
        (x/oracle! lbl (and (removed? after2) (= (:seq r2) (get-in after2 [:item "seq"]))) "the second: still removed, at the later sequence" row)
        (x/oracle! lbl (= (str "dy:" vy) (opened y-after)) "the other subject's copy opens to its value" row)))))

;; ---- c8: the removal log and keys put back to a copy taken while the removal was pending (M1) ---------------------
(defn pending-copy-restored
  "M1 for derived copies, measured outside the gateway: the file authority's directory (log and key files) put back to
  a copy taken while X's removal was pending, after the acknowledgement. The routes answer removed (d803df016). The key
  file came back with the copy; outside the gateway it decodes X's copies. The restored log holds the removal pending,
  so the shred worker refuses that database's cut and deletes no key there, even after a restart, until something
  completes the removal again."
  []
  (g/fresh-scope true
    (fn [src conn]
      (let [lbl "c8 pending-state copy restored"
            [vx ix] (seed! src "c8-x" "acct/a/pl:00000001/v" "c8")
            wire (get (seal1 src [ix] (str "derived:" vx)) "sealed")
            dir (.getParent ^Path (privacy/path src "head.json"))
            snap (Paths/get "/tmp" (into-array String [(str "era5-c8-" (UUID/randomUUID))]))
            rm (erase-until-done! src "c8-rm" [ix] :after-declare (fn [] (#'r4/copy-dir! dir snap) (some? (privacy/pending src))))
            gone (key-gone? src [ix])
            _ (#'r4/copy-dir! snap dir)
            _ (reset! privacy/cache {})
            route (open1 src wire)
            offline-restored (offline src wire)
            _ (reset! envelope/shredded {})
            _ (dotimes [_ 6] (shred-now!) (Thread/sleep 300))
            still-after-restart (some? (file-key src ix))
            pending-now (some? (privacy/pending src))
            row {:pending-in-copy (:mid rm) :removal (:status (:final rm)) :key-gone gone :route-after-restore (shape route)
                 :offline-with-restored-files (= (str "derived:" vx) offline-restored)
                 :key-still-there-after-restart-and-6-passes still-after-restart :log-holds-it-pending pending-now}]
        (report :c8 row)
        (x/oracle! lbl (removed? route) "after the restore the routes answer removed" row)
        (bump! :c8-restored-files-decode-copy (boolean (:offline-with-restored-files row)))
        (bump! :c8-key-kept-after-restart still-after-restart)))))

;; ---- pending: a removal left pending stops every key deletion of the database ------------------------------------
(defn pending-blocks-shred
  "Removal R1 of X (account a) is published; R2 of Z (account c, another subject, another account) is left after its
  intent (its gateway stopped there). While R2 stays pending the shred worker cannot read the database's published cut
  (envelope.clj `shred-published!` calls `privacy/cut` without allowing a pending removal, which refuses, and the
  exception is swallowed), so R1's key is not deleted after its grace: R1's value and every derived copy of it decode
  outside the gateway. Reads, seals and an ordinary save of another account in the meantime do not complete R2.
  Control: the same without R2. Needs TRIPLEX_ERASURE_SHRED_GRACE_MS above 0 so R2 can start before R1's key is due."
  []
  (doseq [with-r2 [false true]]
    (g/fresh-scope true
      (fn [src conn]
        (let [lbl (str "pending blocks shred " (if with-r2 "with R2" "control"))
              [vx ix] (seed! src (str "pb-x-" with-r2) "acct/a/pl:00000001/v" "pb")
              [vz iz] (seed! src (str "pb-z-" with-r2) "acct/c/pl:00000003/v" "pb")
              wire (get (seal1 src [ix] (str "derived:" vx)) "sealed")
              r1 (erase-until-done! src (str "pb-r1-" with-r2) [ix] nil nil)
              t0 (System/currentTimeMillis)
              r2 (when with-r2
                   (reset! x/plan {:stop :before-declare :stops-left 1})
                   (let [o (x/erase! src (str "pb-r2-" with-r2) [{"id" iz}])] (reset! x/plan nil) (offers/outcome o)))
              pending (some? (privacy/pending src))
              ;; contacts that do not complete it: a read of each account, a seal, an open, a save in account a
              contacts [(:status (offers/route src "v1" "read" {"entityIds" ["acct/c/pl:00000003/v"]}))
                        (:status (open1 src wire))
                        (:status (seal-many src [{"ids" [iz] "value" "probe"}]))
                        (:status (offers/send src (g/frame (str "pb-save-" with-r2) "acct/a/pl:00000009/v" "plain" nil nil)))]
              wait-ms (+ envelope/grace-ms 3000)
              _ (loop [] (when (< (- (System/currentTimeMillis) t0) wait-ms) (shred-now!) (Thread/sleep 250) (recur)))
              x-key (some? (file-key src ix))
              decoded (= (str "derived:" vx) (offline src wire))
              still-pending (some? (privacy/pending src))
              done (when with-r2 (:status (:final (erase-until-done! src (str "pb-r2-" with-r2) [iz] nil nil))))
              gone-after (key-gone? src [ix])
              row {:grace-ms envelope/grace-ms :r1 (:status (:final r1)) :r2-first r2 :r2-pending pending
                   :contacts contacts :waited-ms wait-ms :r1-key-present-after-grace x-key
                   :r1-copy-decodes-outside-gateway decoded :r2-still-pending still-pending
                   :r2-completed-by-its-resend done :r1-key-deleted-after-r2-completes gone-after}]
          (report :pending row)
          (x/oracle! lbl (not x-key) "a published removal's key is deleted after its grace" row)
          (x/oracle! lbl (not decoded) "after the grace no key the store holds decodes a removed value's copy" row))))))

;; ---- fuzz --------------------------------------------------------------------------------------------------------
(def stops [nil nil nil :before-declare :after-declare :after-guard :before-native :after-native :at-publish])

(defn run-schedule!
  "Three subjects in accounts a, b and c (chosen at random), one to three protected values each; four to eight derived
  records, each sealed from one to four values of any subjects, one in three a copy of an earlier record (its sources
  and more, as the recorder's lineage), each naming also unprotected rows (dropped by the route); half of them written
  into derived documents. Then one subject loses one or more of its values: stopped at a random step and resumed, one
  schedule in four after a kill (the gateway's caches and the shred worker's progress cleared), one in eight with a
  removed key restored afterwards from a copy taken before, one in eight run by a gateway without the option; one
  schedule in four removes a second value afterwards (any subject) and checks everything again. Checked through the
  routes and outside the gateway."
  [src conn run i ^Random r]
  (let [pick (fn [v] (v (.nextInt r (count v))))
        tag (str run "-" i)
        accts ["a" "b" "c"]
        subjects (vec (for [s (range 3)] (format "acct/%s/pl:%08d" (pick accts) (+ (* 10 i) s))))
        values (vec (for [[si subj] (map-indexed vector subjects) j (range (inc (.nextInt r 3)))]
                      (let [[v aid] (seed! src (str "fz-" tag "-" si "-" j) (str subj "/f" j) tag)]
                        {:si si :owner (str subj "/f" j) :value v :id aid})))
        n (count values)
        records (loop [k 0 acc [] want (+ 4 (.nextInt r 5))]
                  (if (= k want) acc
                    (let [base (when (and (seq acc) (zero? (.nextInt r 3))) (pick acc))
                          own (vec (distinct (repeatedly (inc (.nextInt r (min 4 n))) #(.nextInt r n))))
                          srcs (vec (sort (distinct (concat (:srcs base) own))))
                          content (str "derived-" tag "-" k ":" (str/join "|" (map #(:value (values %)) srcs)))
                          named (cond-> (mapv #(:id (values %)) srcs)
                                  (.nextBoolean r) rseq
                                  true (into (repeatedly (.nextInt r 3) #(str "plain-row-" (.nextInt r 100000)))))
                          w (get (seal1 src (vec named) content) "sealed")]
                      (recur (inc k) (conj acc {:srcs srcs :content content :wire w}) want))))
        _ (doseq [[k rec] (map-indexed vector records) :when (.nextBoolean r)]
            (let [acct (second (re-find #"acct/([a-c])/" (:owner (values (first (:srcs rec))))))
                  rep (derived-write! src conn (str "fzw-" tag "-" k) (str "notice:v1:fz-" tag "-" k) (:wire rec) acct)]
              (bump! :derived-write (offers/outcome rep))))
        rounds (if (zero? (.nextInt r 4)) 2 1)
        results
        (loop [round 1 gone-set #{} acc []]
          (if (or (> round rounds) (every? gone-set (range n))) acc
            (let [left (filterv #(not (gone-set %)) (range n))
                  victim (:si (values (pick left)))
                  mine (filterv #(= victim (:si (values %))) left)
                  now-idx (vec (sort (distinct (repeatedly (inc (.nextInt r (count mine))) #(pick mine)))))
                  now-ids (mapv #(:id (values %)) now-idx)
                  gone-set (into gone-set now-idx)
                  stop (pick stops) kill? (zero? (.nextInt r 4)) restore? (zero? (.nextInt r 8))
                  ;; one removal in eight is run by a gateway without the option (its removal's transaction ID is the
                  ;; old `_tx/erase-<uuid>`; the derived routes are absent there): a mixed fleet during a rollout
                  old? (zero? (.nextInt r 8))
                  backups (into {} (for [id now-ids] [id (file-key src id)]))
                  at-stop (atom nil)
                  between (fn []
                            (when (privacy/pending src)
                              (reset! at-stop
                                      (vec (for [rec records :when (some (set now-idx) (:srcs rec))]
                                             (let [o (open1 src (:wire rec))
                                                   plain (some #(str/includes? (x/read-text src (:owner (values %))) (:value (values %)))
                                                               (filter (set now-idx) (:srcs rec)))]
                                               [(shape o) (boolean plain)])))))
                            (when kill? (reset! privacy/cache {}) (reset! envelope/shredded {}) (bump! :kill))
                            nil)
                  rm (if old?
                       (with-redefs [privacy/derived-tx-id nil] (erase-until-done! src (str "fzr-" tag "-" round) now-ids stop between))
                       (erase-until-done! src (str "fzr-" tag "-" round) now-ids stop between))
                  ok (= 200 (:status (:final rm)))
                  label (str "F " (pr-str {:i i :round round :stop stop :kill kill? :restore restore? :old-gateway old?}))
                  gone (and ok (key-gone? src now-ids))
                  restored (when (and ok restore?) (let [id (pick now-ids)] (restore-key! src id (backups id)) (bump! :restore) id))]
              (bump! :stop (or stop :none) (if (:fired rm) :fired :not-fired))
              (when old? (bump! :removal-by-gateway-without-option))
              (when (= 2 round) (bump! :second-removal))
              (x/oracle! label ok "the removal completes after at most 4 resends" {:first (:first rm) :final (offers/outcome (:final rm))})
              (doseq [[s plain] @at-stop]
                (x/oracle! label (if (= :value s) plain true) "while pending, a copy opens only while the plain read still answers the value" {:stop stop}))
              (when ok
                (x/oracle! label gone "every removed key is deleted" {:ids now-ids})
                (doseq [id now-ids]
                  (x/oracle! label (contains? (seal1 src [id] "probe") "removed") "a removed assertion seals nothing" {:id id}))
                (doseq [rec records]
                  (let [hit (some gone-set (:srcs rec)) o (open1 src (:wire rec)) dec (offline src (:wire rec))]
                    (bump! :records (if hit :from-removed :kept))
                    (if hit
                      (do (x/oracle! label (removed? o) "a record computed from a removed value opens as removed" {:srcs (:srcs rec)})
                          (if (and restored (some #(= restored (:id (values %))) (:srcs rec))
                                   (every? #(or (not (gone-set %)) (= restored (:id (values %)))) (:srcs rec)))
                            (bump! :restored-key-decodes (boolean dec))
                            (x/oracle! label (nil? dec) "no key the authority holds decodes a removed value's copy" {:srcs (:srcs rec)})))
                      (do (x/oracle! label (= (:content rec) (opened o)) "a record of kept values opens to its exact content" {:srcs (:srcs rec)})
                          (x/oracle! label (= (:content rec) dec) "and decodes outside the gateway (the decoder works)" {:srcs (:srcs rec)}))))))
              (when restored (Files/deleteIfExists (envelope/key-file src restored)))
              (recur (inc round) gone-set (conj acc gone-set)))))
        gone-set (or (last results) #{})]
    (bump! :schedules)
    {:gone (into {} (for [k gone-set] [(:value (values k)) #{(:owner (values k))}]))
     :contents (vec (for [rec records :when (some gone-set (:srcs rec))] (:content rec)))}))

(defn fuzz [run n block seed]
  (let [r (Random. (long seed))]
    (doseq [kb (range (quot (+ n block -1) block))]
      (g/fresh-scope true
        (fn [src conn]
          (let [results (vec (for [i (range (* kb block) (min n (* (inc kb) block)))]
                               (try (run-schedule! src conn run i r)
                                    (catch Throwable e
                                      (reset! x/plan nil)
                                      (x/oracle! (str "F " i) false (str "schedule stopped: " (.getMessage e)))
                                      nil))))
                gone (apply merge-with into {} (keep :gone results))
                contents (vec (mapcat :contents (keep identity results)))
                hits (#'r4/native-clear conn (concat (keys gone) contents))
                journal (g/text (:body (offers/route src "v2" "transactions" {"after" 0 "limit" 1000})))]
            (bump! :native-clear (count hits))
            (x/oracle! (str "F block " kb) (empty? hits) "no native datom holds a removed value or a copy of it in clear" (take 3 hits))
            (x/oracle! (str "F block " kb) (not-any? #(str/includes? journal %) (concat (keys gone) contents))
                       "no journal page holds a removed value or a copy of it" nil)
            (println "ERA5_PROGRESS" (pr-str {:block kb :schedules (get @tally [:schedules]) :oracles @x/oracles
                                               :violations (count @x/violations)}))))))))

(defn main []
  (x/install-hooks!)
  (#'r4/install-declare-hooks!)
  (envelope/start!)
  (case (System/getenv "ERA5_PHASE")
    "cases" (do (one-of-n) (length-and-equality) (tampering) (restored-key) (unsealed) (unknown-names) (two-removals)
                (pending-copy-restored))
    "pending" (pending-blocks-shred)
    (fuzz (or (System/getenv "ERA5_RUN") "f0") (Long/parseLong (or (System/getenv "ERA5_N") "200"))
          (Long/parseLong (or (System/getenv "ERA5_BLOCK") "100")) (Long/parseLong (or (System/getenv "ERA5_SEED") "1"))))
  (println "ERA5_TALLY" (pr-str (into (sorted-map) (map (fn [[kk v]] [(pr-str kk) v])) @tally)))
  (println "ERA5_VIOLATIONS" (pr-str (frequencies (map :message @x/violations))))
  (doseq [v (take 8 @x/violations)] (println "ERA5_VIOLATION" (pr-str v)))
  (println "ERA5_SUMMARY" (pr-str {:oracles @x/oracles :violations (count @x/violations)}))
  (shutdown-agents)
  (System/exit 0))
