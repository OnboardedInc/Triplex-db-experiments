(ns triplex.gateway.omit-protected-test
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.omit-protected]))

;; [DX-RPT1] "omitProtected": true (privacy/*omit-protected*) sends no protected value: rows of a protected attribute
;; leave with every value column empty and type "protected"; change records of a protected attribute leave with the
;; value {"type":"protected"}; a sealed value is never unsealed for such a request; nothing else changes. Unbound, every
;; row is masked exactly as before.

(def cut {:attrs #{":privacy/id"} :sealed false :erased {} :seq 0})
(defn row [attribute value]
  {:id "f1" :entity_id "acct/a/pl:1" :attribute attribute :value_type "string" :value_string value
   :value_number nil :value_boolean nil :value_datetime nil :value_json nil :recorded_position 3 :recorded_at 1.0
   :valid_from 0.0 :valid_to nil :created_by nil :entity_type "Subject" :schema_version 1 :tx_id "t1"})
(defn change [attribute value]
  (assoc (row ":_tx/change" nil) :value_type "json" :entity_id "t1" :entity_type "_Transaction"
         :value_json (json/write-str (cond-> {"op" "assert" "tripleId" "f1" "entityId" "acct/a/pl:1" "attribute" attribute
                                              "validFrom" 0.0 "recordedAt" 1.0}
                                       value (assoc "value" {"type" "string" "value" value})))))

(deftest omitted-rows-and-changes
  (binding [privacy/*cut* cut privacy/*omit-protected* true]
    (let [out (privacy/masked (row ":privacy/id" "IDN-1"))]
      (is (= "protected" (:value_type out)))
      (is (every? nil? (map out privacy/payload-cols))))
    (is (= (row ":person/name" "n") (privacy/masked (row ":person/name" "n"))))
    (is (= {"type" "protected"} (get (json/read-str (:value_json (privacy/masked (change ":privacy/id" "IDN-1")))) "value")))
    (is (= (change ":person/name" "n") (privacy/masked (change ":person/name" "n"))))
    ;; An erase record carries no value and is passed on unchanged.
    (is (= (change ":privacy/id" nil) (privacy/masked (change ":privacy/id" nil))))
    ;; A removed assertion of a protected attribute: still only "protected", never the removal marker's fields.
    (binding [privacy/*cut* (assoc cut :erased {"f1" {"type" "erased" "erasedAt" 5.0}})]
      (is (= "protected" (:value_type (privacy/masked (row ":privacy/id" "IDN-1"))))))))

(deftest sealed-values-never-unsealed
  (binding [privacy/*cut* (assoc cut :sealed true) privacy/*omit-protected* true
            privacy/*unseal* (fn [& _] (throw (ex-info "unsealed" {})))]
    (is (= "protected" (:value_type (privacy/masked (row ":privacy/id" "triplex-sealed-v1/f1")))))
    (is (= {"type" "protected"} (get (json/read-str (:value_json (privacy/masked (change ":privacy/id" "triplex-sealed-v1/f1")))) "value")))))

(deftest unbound-is-unchanged
  (binding [privacy/*cut* cut]
    (is (= (row ":privacy/id" "IDN-1") (privacy/masked (row ":privacy/id" "IDN-1"))))
    (is (= (change ":privacy/id" "IDN-1") (privacy/masked (change ":privacy/id" "IDN-1")))))
  (binding [privacy/*cut* nil privacy/*omit-protected* true]
    ;; No protection declared: nothing is protected, nothing is omitted.
    (is (= (row ":privacy/id" "IDN-1") (privacy/masked (row ":privacy/id" "IDN-1"))))))

(deftest text-masks-when-omitting
  ;; The journal page path (privacy/text) takes the masking branch when omitting, even with no seal and no removal.
  (let [text (privacy/encode (row ":privacy/id" "IDN-1"))]
    (binding [privacy/*cut* cut]
      (is (= text (privacy/text text))))
    (binding [privacy/*cut* cut privacy/*omit-protected* true]
      (is (not (.contains ^String (privacy/text text) "IDN-1")))
      (is (= "protected" (:value_type (privacy/packed-row (privacy/text text))))))))
