(require '[clojure.test :as test])
(def root (System/getenv "DX_V01_FIXTURE_REPO"))
(assert (seq (System/getenv "WFIX1_URI")))
(load-file (str root "/lab/experiments/EXP-DX1/wfix1/regression.clj"))
(load-file (str root "/lab/experiments/EXP-DX1/prep1/subject_gate.clj"))
(load-file (str root "/lab/experiments/EXP-DX1/prep1/subject_conflicts.clj"))
(assert (var-get (ns-resolve 'triplex.gateway.subject-save 'ordered-ids?)))
;; [DX-V01] Why: use PREP1's mixed-format SQL test without its server campaign.
;; Rejected: substituting a command-line flag or a second local stack for the native witness.
(binding [test/*report-counters* (ref test/*initial-report-counters*)]
  (test/test-vars [(ns-resolve 'subject-conflicts 'ordered-block-collision-keeps-old-ids-reserved)])
  (let [{:keys [test pass fail error] :as result} @test/*report-counters*]
    (println "DX_V01_PREP1_MIXED" result)
    (System/exit (if (and (= 1 test) (>= pass 20) (zero? fail) (zero? error)) 0 1))))
