(ns triplex.age.structure
  (:require [datomic.api :as d]
            [datomic.index]
            [triplex.age.native :as native])
  (:import [datomic.db Db]
           [datomic.index Index DirNode RootNode]
           [java.nio ByteBuffer]))

(defn index-var [s]
  (or (ns-resolve 'datomic.index s) (throw (ex-info "Pinned Datomic index primitive missing" {:name s}))))

(defn serialized-bytes [node]
  (let [value ((index-var 'fress) node @(index-var 'common-write-handlers))]
    (cond
      (bytes? value) (alength ^bytes value)
      (instance? ByteBuffer value) (.remaining ^ByteBuffer value)
      :else (throw (ex-info "Unknown pinned index serialization type" {:class (class value)})))))

(defn tier-census [tier]
  (into {}
    (for [order [:eavt :aevt :avet :raet]
          :let [idx (get tier order)]
          :when idx]
      (let [^Index idx idx
            ^RootNode root (.-root idx)
            dirs (alength ^objects (.-dirids root))
            subtree (reduce
                      (fn [{:keys [leaves bytes]} i]
                        (let [^DirNode dir ((index-var 'get-dir-node) root i (.-lookup idx) false)]
                          {:leaves (+ leaves (alength ^objects (.-segids dir)))
                           :bytes (+ bytes (serialized-bytes dir))}))
                      {:leaves 0 :bytes 0} (range dirs))]
        [(if (= order :raet) :vaet order)
         {:levels 3 :datoms (.longCount idx) :directories dirs :leaves (:leaves subtree)
          :directoryBytes (:bytes subtree) :rootBytes (serialized-bytes root)}]))))

(defn measure! [db]
  ;; [DX-AGE1] Why: enumerate directory headers only and leave measurement JVM caches undisturbed.
  ;; Rejected: scanning every historical datom to estimate the committed index shape.
  (native/check! (instance? Db db) "Unsupported pinned index representation" {:class (str (class db))})
  (let [^Db db db]
    {:basisT (d/basis-t db) :indexBasisT (.-indexBasisT db)
     :main (tier-census (.-index db)) :mid (tier-census (.-mid_index db))}))
