(ns triplex.gateway.pinned
  (:require [datomic.api :as d])
  (:import [java.util.concurrent.atomic LongAdder]))

;; [DX-RD2] Why: a subject that has not changed since the pin has the same rows in the current database, which a
;; pinned read then answers without an as-of view (rd1/PINNED-1B.md).
;; Rejected: reading every pinned subject through d/as-of (pays the history probes for subjects the pin cannot affect),
;; and trusting the revision alone (a writer that changed rows without advancing it would make the answer wrong).
(def enabled (= "1" (System/getenv "TX2_PINNED_SHORTCUT")))

;; The current database of the request whose pinned view is being read; bound by the pinned read route
;; (storage/read-rows) and used by the short-cut and by group-cut/member-at.
(def ^:dynamic *current* nil)

(def ^LongAdder current-answers (LongAdder.))
(def ^LongAdder as-of-answers (LongAdder.))
(defn stats [] {:enabled enabled :currentAnswers (.sum current-answers) :asOfAnswers (.sum as-of-answers)})

(defn pin-t
  "The basis t of a pinned view, or nil when the view is the current database."
  [db]
  (d/as-of-t db))

(defn unchanged-since?
  "True only when the subject `eid` cannot differ between `current` and the view at basis t `t` and logical position `p`:
  its revision exists and is at or below `p`, and no datom of the subject in the current database was asserted after
  `t`. The second condition does not depend on any writer advancing the revision: an assertion on the subject after the
  pin always sends the read to as-of."
  [current eid t p]
  (when (and eid t p)
    (let [rev-a (d/entid current :triplex.entity/rev)
          rev (when rev-a (:v (first (d/datoms current :eavt eid rev-a))))
          last-tx (d/t->tx t)]
      (and (some? rev) (<= (long rev) (long p))
           (every? (fn [^datomic.Datom datom] (<= (.tx datom) last-tx)) (d/datoms current :eavt eid))))))

(defn current-eid
  "The subject's entity in `current` when the shortcut may answer it at the pinned view `view`, otherwise nil."
  [current view p id]
  (when (and enabled current)
    (when-let [t (pin-t view)]
      (let [eid (d/entid current [:triplex.entity/id id])]
        (if (and eid (unchanged-since? current eid t p))
          (do (.increment current-answers) eid)
          (do (.increment as-of-answers) nil))))))
