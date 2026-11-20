(ns triplex.gateway.prepare-trace
  (:require [clojure.data.json :as json]))

(def attempt (System/getenv "TX2_PREPARE_CENSUS"))
(def ^:dynamic *reasons* nil)

;; [DX-PREP1] Why: distinguish input and proof outcomes before native submission on the actual writer path.
;; Rejected: inferring a stale native guard from a reference ACK or recording value-bearing request bodies.
(defn note! [member reason]
  (when *reasons* (vswap! *reasons* update member (fnil conj []) reason))
  nil)

(defn emit! [batch reasons route]
  (when attempt
    (println "PREP1_DECISION"
      (json/write-str {:attempt attempt :route route
                       :members (mapv (fn [i entry] {:operation (:id entry)
                                                     :reasons (vec (concat (get reasons :all) (get reasons i)))})
                                      (range) batch)})))
  nil)
