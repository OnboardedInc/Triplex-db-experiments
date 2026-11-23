;; [DX-PREP1] Why: derive aged rows with AGE1's own replay tape, so the TypeScript aged check is compared to the loader.
;; Rejected: a hand-written copy of AGE1's row rules as the only oracle.
(ns aged-gate
  (:require [clojure.data.json :as json]
            [triplex.age.tape :as tape])
  (:import [java.security MessageDigest]
           [java.util HexFormat]))

(defn hex [^String s]
  (.formatHex (HexFormat/of) (.digest (MessageDigest/getInstance "SHA-256") (.getBytes s "UTF-8"))))

(def people 50)  ;; people per account in the toy; the 1B seed has 100,000
(def per-account 5)
(def seed-head 87002)
(def saves 300)

(defn subject [account local]
  (let [key (format "account-%03d" (inc account))
        owner (str "acct/" key "/i9:" (format "%08d" local))]
    {:account account :local local :owner owner :revision 87000
     :rows (mapv (fn [j] {:id (str "seed-" account "-" local "-" j) :entity_id owner
                          :attribute (str ":task/field-" j) :value_type "string"
                          :value_string (subs (hex (str "deep-field/" local "/0/" j "/0")) 0 57)
                          :valid_from 0.0 :valid_to nil :recorded_at 1.7e12 :recorded_position 87001
                          :tx_id "_tx/seed"}) (range 3))}))

(defn -main [out]
  (let [actives (for [j (range per-account), account (range 10)]
                  (subject account (quot (* j (- people 2)) per-account)))
        probes (map #(subject % (- people 2)) (range 10))
        idle (map #(subject % (dec people)) (range 10))
        active (* 10 per-account)
        pop {:seed-head seed-head :origin-clock 1.7e12 :active active :people (+ active 20)
             :adopted (vec (concat actives probes idle)) :round-ms (quot tape/day-ms 3)
             :probes {7 {:owner (+ active 3) :width 2 :fields {}}
                      123 {:owner (+ active 3) :width 1 :fields {}}
                      260 {:owner (+ active 7) :width 3 :fields {}}}}
        owners (for [i (range (:people pop))]
                 (let [s (nth (:adopted pop) i)]
                   {:account (:account s) :person (:local s)
                    :rows (mapv #(select-keys % [:id :entity_id :attribute :value_string :recorded_position :tx_id])
                                (tape/expected-adopted pop i saves))}))]
    (spit out (json/write-str {:people people :active active :seedHead seed-head :saves saves :owners owners}))
    (println "aged-gate rows" (count owners))))
