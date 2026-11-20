(ns triplex.age.scorecard
  (:require [datomic.api :as d]
            [triplex.age.adopt :as adopt]
            [triplex.age.gate :as gate]
            [triplex.age.native :as native]
            [triplex.age.rung :as rung]
            [triplex.age.scale :as scale]
            [triplex.age.tape :as tape]
            [triplex.gateway.scope :as scope]))

(defn observe! [state db t head records]
  (let [pop (:population state)
        conn (:conn db)
        view (rung/verify-state! state db)
        seed (d/as-of view (:seed-t pop))
        uid (:db-id conn)
        policy (get state :journal "recorded-predecessor-k")
        last-n (dec (:observed state))
        last-command (tape/command pop last-n)
        last-receipt (gate/read-receipt db last-n)]
    ;; [DX-AGE1] Why: compare the live peer's identity, history count and cuts to the independently pinned seal.
    ;; Rejected: a scope name, target label or count from the checkpoint cannot distinguish a fresh restore.
    (native/check! (and uid (not-empty (str uid))) "Peer did not expose its native database identity" {})
    (gate/equal! [t head records]
                 [(d/basis-t view) (+ (tape/seed-head pop) (:observed state)) (:datoms (d/db-stats view))]
                 "Live physical t, logical head or history count differs")
    (gate/equal! (:seed-t pop) (adopt/exact-position-t view (:seed-head pop)) "Original loader cut differs")
    (gate/equal! (:origin-clock pop) (scope/max-recorded-at seed (scope/entity seed)) "Original loader clock differs")
    (gate/equal! [(str t) (str head) (:clock last-command)]
                 [(get-in last-receipt [:t "v"]) (get-in last-receipt [:position "v"])
                  (get-in last-receipt [:recordedAt "v"])]
                 "Live last receipt differs from the replay tape")
    (gate/equal! (:clock last-command) (scope/max-recorded-at view (scope/entity view)) "Last record clock differs")
    (doseq [s (take 10 (:adopted pop))]
      (gate/equal! s (adopt/subject! seed (:seed-head pop) (:origin-clock pop) (:account s) (:local s))
                   "Original membership, row bytes or owner revision differs"))
    (doseq [[cell i n pinned?] (rung/read-targets pop (:observed state))]
      (rung/read-probe! db pop cell i n pinned?))
    (scale/confirm-page! (gate/feed db (- head 7) 7 nil) pop (- (:observed state) 7) 7 policy)
    {:database (get-in pop [:seal :name]) :nativeId (str uid) :scope (get-in pop [:seal :scope])
     :physicalT t :logicalHead head :records records :layout "lean-v3-strict-solo-k" :journal policy
     :sourceSeed (select-keys (:seal pop) [:source :source-seal :manifest-sha :facts])
     :roster (mapv (fn [i]
                     (let [tenant (format "account-%03d" (inc i))]
                       {:account tenant :namespace (str "acct/" tenant "/") :firstPerson 0
                        :people (:people-per-account (:seal pop))}))
                   (range 10))
     :clocks {:seedHead (:seed-head pop) :seedT (:seed-t pop) :seedRecordedAt (:origin-clock pop)
              :roundMs (:round-ms pop) :active (:active pop) :tapeSaves (:observed state)
              :lastRecordedAt (:clock last-command) :lastOperation (:operation last-command)
              :lastTransaction (:tx last-command)}}))

(defn -main [file physical want-t want-head want-records policy]
  (try
    (let [[t head records] (mapv #(Long/parseLong %) [want-t want-head want-records])
          state (rung/load-state! file)
          pop (:population state)
          name (get-in pop [:seal :name])
          final (or (get-in state [:closed-rungs 1000000000]) (:finished state))]
      (native/check! (and (>= records 1000000000) (#{"classic-k" "recorded-predecessor-k"} policy) (string? physical)
                          (or (= name physical) (re-matches #"age-restore-[a-f0-9-]{36}" physical)))
                     "Expected a sealed one-billion DB or its owned restore" {})
      (gate/equal! [1000000000 t head records]
                   (mapv #(get final %) [:target :t :head :records]) "Checkpoint is not the one-billion seal")
      (native/emit "scorecard-cut" (observe! (assoc state :journal policy) (adopt/scope-db name physical) t head records)))
    (shutdown-agents)
    (System/exit 0)
    (catch Throwable e (.printStackTrace e) (System/exit 1))))
