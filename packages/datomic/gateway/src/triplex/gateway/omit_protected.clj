(ns triplex.gateway.omit-protected
  "[DX-RPT1, moved by DX-INT5] The rows a request with \"omitProtected\": true receives: every protected row with its
  value columns empty and type \"protected\", every change record of a protected attribute with the value
  {\"type\":\"protected\"}. Loaded last by main.clj, it fills privacy/omit-hook (a function compiled before
  commit.clj moved the stored functions' identities with every option off)."
  (:require [clojure.data.json :as json] [triplex.gateway.privacy :as privacy]))

(defn omitted [row attrs]
  (cond
    (= ":_tx/change" (:attribute row))
    (let [change (json/read-str (:value_json row))]
      (if (and (contains? change "value") (attrs (get change "attribute")))
        (assoc row :value_json (json/write-str (assoc change "value" {"type" "protected"})))
        row))
    (attrs (:attribute row)) (assoc (reduce #(assoc %1 %2 nil) row privacy/payload-cols) :value_type "protected")
    :else row))

(alter-var-root #'privacy/omit-hook (constantly omitted))
