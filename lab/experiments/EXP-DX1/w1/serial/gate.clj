(require '[clojure.test :as test] '[clojure.data.json :as json] '[clojure.java.io :as io]
         '[triplex.gateway.subject-save :as subject])
(load-file "/config/regression.clj")
(load-file "/config/subject_gate.clj")
(load-file "/config/subject_conflicts.clj")

;; [DX-W1] Why: check the native function installed by this process against the reference writer and race fixtures.
;; Rejected: invoking only the revision predicate in a manufactured map.
(let [candidate? (= "1" (System/getenv "TX2_SUBJECT_NARROW_REVISION"))]
  (assert subject/enabled)
  (assert subject/numeric-owner?)
  (assert subject/ordered-ids?)
  (assert (= candidate? subject/narrow-revision? subject/reuse-predecessor?))
  (assert (= candidate? (boolean (some #{'(d/datoms db :aevt :triplex.entity/rev owner)}
                                         (tree-seq coll? seq subject/code)))))
  (with-open [reader (java.io.PushbackReader. (io/reader "/config/observe.clj"))]
    (loop [] (when-not (= ::eof (read {:eof ::eof} reader)) (recur))))
  (let [tests (test/run-tests 'subject-gate 'subject-conflicts)]
    (assert (pos? (:test tests)))
    (println "DX-W1_SERIAL_GATE"
             (json/write-str (assoc tests :candidate candidate? :function (str subject/ident)
                                    :attempt (.trim (slurp "/config/attempt"))
                                    :source (.trim (slurp "/config/source")))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail tests) (:error tests))) 0 1))))
