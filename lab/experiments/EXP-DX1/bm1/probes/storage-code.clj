;; [DX-BM1] Why: force the original first datom at the serial point, and record the nested Datomic I/O counters around that exact expression.
;; Rejected: counting candidate IDs on the peer, or equating a B-tree visit with physical PostgreSQL I/O.
(defn bm1-kind [form]
  (when (and (seq? form) (= 'first (first form)) (seq? (second form)))
    (let [[seek db sort e a] (second form)]
      (cond
        (and (= seek 'd/index-range) (= sort :triplex.entity/row))
        (if (= db 'db) "old-live-row" (if (nil? a) "new-id-single" "new-id-range"))
        (and (= seek 'd/seek-datoms) (= sort :eavt) (= a :triplex.entity/retired))
        "retirement-marker"
        (and (= seek 'd/seek-datoms) (= sort :eavt) (= a 'row-a))
        "retract-row"))))

(defn bm1-instrument [operation]
  (let [probed (walk/postwalk
                 (fn [form]
                   (if-let [kind (bm1-kind form)]
                     (list 'bm1-read kind (list 'fn [] form))
                     (if (and (seq? form) (= 'value (first form)) (= '[e a] (second form)))
                       (list 'value '[e a]
                             (list 'if '(= a :triplex.entity/rev)
                                   (list 'bm1-read "revision" (list 'fn [] (nth form 2)))
                                   (nth form 2)))
                       form)))
                 operation)]
    (list 'if-not '(:bm1-probe-id payload) operation
      (list 'let '[bm1-id (:bm1-probe-id payload) bm1-rows (volatile! [])]
        (list 'letfn
          '[(bm1-read [label thunk]
              (let [begin (System/nanoTime)
                    r (bmio/throw-if-ex! (bmio/with-io-stats thunk {:io-context :bm1/lookup :api :with}))]
                (vswap! bm1-rows conj {:label label :nanos (- (System/nanoTime) begin) :io (:io-stats r)})
                (:ret r)))]
          (list 'let
            (vector 'calibration
              '(when (.startsWith ^String bm1-id "bm1-cal-")
                 (let [id (first (:live payload))
                       prefix (when id (str "2" (format "%04x" (.length ^String id)) id))]
                   (when prefix
                     (let [seek (fn [] (some-> (first (d/index-range db :triplex.entity/row prefix nil)) :v))
                           checked (bmio/throw-if-ex!
                                     (bmio/with-io-stats
                                       (fn []
                                         (let [cold (bm1-read "cal-first" seek) again (bm1-read "cal-repeat" seek)]
                                           (when-not (= cold again) (throw (ex-info "Unequal repeated lookup" {})))
                                           (boolean cold)))
                                       {:io-context :bm1/calibration :api :with}))]
                       {:found (:ret checked) :io (:io-stats checked)}))))
              'result (list 'bmio/throw-if-ex! (list 'bmio/with-io-stats (list 'fn [] probed)
                                          {:io-context :bm1/operation :api :with})))
            '(do
               (println (str "BM1-STORAGE " (json/write-str {:schema "bm1-storage/1" :id bm1-id
                 :run (System/getenv "TRIPLEX_TRACE_RUN") :source (System/getenv "TRIPLEX_TRACE_SOURCE")
                 :traceId (get-in payload [:triplex-trace :traceId])
                 :basisT (d/basis-t db) :outer (:io-stats result) :calibration calibration :rows @bm1-rows})))
               (:ret result))))))))
