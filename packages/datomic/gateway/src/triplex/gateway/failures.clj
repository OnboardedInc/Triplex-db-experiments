(ns triplex.gateway.failures
  "[DX-ERA2 fifth pass] Failures that the removal, key-shred and publication code used to drop silently (B2 of the
  derived-copies review was hidden by one): each is counted (`/v2/admin/scan-stats`, key `:removalFailures`) and
  logged as one JSON line (schema triplex.removal-failure.v1). Loaded lazily (requiring-resolve) by the places that
  report, so no early-loaded file gains a definition."
  (:require [clojure.data.json :as json] [triplex.gateway.stats :as stats]))

(defn note!
  "Count and log one dropped failure at `where` (a short place name) for database `name`. Returns nil, so a caller that
  used to answer nil still does."
  [where name ^Throwable e]
  (stats/bump! [:removalFailures where] 1)
  (println (json/write-str {"schema" "triplex.removal-failure.v1" "where" where "database" name
                            "type" (.getName (class e)) "code" (:code (ex-data e)) "message" (.getMessage e)}))
  nil)

(defn count-of [where] (get-in @stats/counts [:removalFailures where] 0))
