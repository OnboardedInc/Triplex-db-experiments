(ns triplex.gateway.group-cut-guard
  (:require [datomic.api :as d] [triplex.gateway.group-cut :as group-cut] [triplex.gateway.pinned :as pinned])
  (:import [java.util.concurrent.atomic LongAdder]))

;; [DX-RD7] Why: the cut lookup (TX2_PINNED_CUT_LOOKUP) answers a grouped-save position from the current database, which
;; is exact only while no writer retracts a position or asserts one again (rd6/REVIEW-1.md R6-3: a raw retraction of an
;; interior member's position, or the same number asserted again on another entity, made 2 of 6 reads differ). Here the
;; current answer is taken only when the position's history holds exactly its one assertion; any other history (a
;; retraction, a second assertion) sends the read to the lookup on the past view, which is the reference. One seek into
;; the history index replaces the builder's seek into the current one. A position whose history holds no datom at all
;; is held by no view, so nil is the exact answer for it, and the solo saves keep the option's gain.
;; Installed from here, loaded last by main.clj, only with the option on: editing group_cut.clj (loaded before
;; commit.clj) would renumber generated names inside the stored functions, whose identities hash their text (the way
;; cross_index.clj installs the short-cut's rule). With the option off nothing is replaced.
;; Rejected: the builder's lookup unchanged (rests on a writer rule nothing checks); the review's form (a history seek,
;; then the builder's current seek: two seeks); refusing the current answer for a position never written (every pinned
;; read of a solo save would pay the walk the option removes).
(def unguarded @#'group-cut/member-at)
(def ^LongAdder fallbacks (LongAdder.))

(defn member-at [db cut]
  (let [t (d/as-of-t db) current pinned/*current*]
    (if (and group-cut/current-lookup t current)
      (when-let [a (d/entid current :triplex.group/position)]
        (let [[^datomic.Datom x y] (take 2 (d/datoms (d/history current) :avet a cut))]
          (cond
            (nil? x) nil
            (and (nil? y) (.added x) (= cut (.v x))) (when (<= (.tx x) (d/t->tx t)) (.e x))
            :else (do (.increment fallbacks) (d/entid db [:triplex.group/position cut])))))
      (d/entid db [:triplex.group/position cut]))))

(when group-cut/current-lookup
  (alter-var-root #'group-cut/member-at (constantly member-at)))
