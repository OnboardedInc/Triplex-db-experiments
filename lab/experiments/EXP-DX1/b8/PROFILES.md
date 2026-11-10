# DX-B8 profiles

Each row attributes a sampled leaf to the first gateway frame actually present; no missing caller is inferred.

## 19f5422d helper off: random-256

Samples: 1373; missing gateway caller: 104; truncated stacks: 0.

| Leaf | First gateway caller | Samples |
|---|---|---:|
| `clojure/lang/PersistentArrayMap.indexOf` | `triplex/gateway/reach$read_entity.invokeStatic` | 104 |
| `clojure/lang/Util.equals` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 92 |
| `java/lang/AbstractStringBuilder.append` | `triplex/gateway/reach$append_string_BANG_.invokeStatic` | 75 |
| `triplex/gateway/reach$append_string_BANG_.invokeStatic` | `triplex/gateway/reach$append_string_BANG_.invokeStatic` | 60 |
| `triplex/gateway/reach$read_entity.invokeStatic` | `triplex/gateway/reach$read_entity.invokeStatic` | 53 |
| `java/util/HashMap.putVal` | `triplex/gateway/reach$build_response.invokeStatic` | 48 |
| `clojure/lang/APersistentVector.hashCode` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 40 |
| `triplex/gateway/reach$build_response.invokeStatic` | `triplex/gateway/reach$build_response.invokeStatic` | 37 |
| `java/util/HashMap.resize` | `triplex/gateway/reach$build_response.invokeStatic` | 36 |
| `java/util/concurrent/ConcurrentHashMap.get` | `triplex/gateway/reach$entity_id.invokeStatic` | 35 |
| `clojure/lang/PersistentHashMap$BitmapIndexedNode.find` | `triplex/gateway/reach$read_entity.invokeStatic` | 31 |
| `java/lang/String.equals` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 30 |
| `clojure/lang/PersistentVector.arrayFor` | `triplex/gateway/reach$read_entity.invokeStatic` | 27 |
| `java/util/regex/Pattern.lambda$union$3` | `triplex/gateway/main$handler.invokeStatic` | 26 |
| `java/util/concurrent/ConcurrentHashMap.get` | `triplex/gateway/reach$build_response.invokeStatic` | 21 |

## 19f5422d helper off: readPoisson

Samples: 2570; missing gateway caller: 229; truncated stacks: 0.

| Leaf | First gateway caller | Samples |
|---|---|---:|
| `clojure/lang/Util.equals` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 218 |
| `triplex/gateway/reach$read_entity.invokeStatic` | `triplex/gateway/reach$read_entity.invokeStatic` | 127 |
| `java/lang/AbstractStringBuilder.append` | `triplex/gateway/reach$append_string_BANG_.invokeStatic` | 116 |
| `java/util/HashMap.putVal` | `triplex/gateway/reach$build_response.invokeStatic` | 112 |
| `clojure/lang/PersistentArrayMap.indexOf` | `triplex/gateway/reach$read_entity.invokeStatic` | 109 |
| `java/util/concurrent/ConcurrentHashMap.get` | `triplex/gateway/reach$entity_id.invokeStatic` | 68 |
| `triplex/gateway/reach$append_string_BANG_.invokeStatic` | `triplex/gateway/reach$append_string_BANG_.invokeStatic` | 65 |
| `java/util/concurrent/ConcurrentHashMap.get` | `triplex/gateway/entity_cache$revision.invokeStatic` | 61 |
| `clojure/lang/PersistentVector.arrayFor` | `triplex/gateway/reach$read_entity.invokeStatic` | 58 |
| `java/util/concurrent/ConcurrentHashMap.get` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 54 |
| `java/util/regex/Pattern.lambda$union$3` | `triplex/gateway/main$handler.invokeStatic` | 52 |
| `java/lang/String.equals` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 50 |
| `datomic/index$reify__13665.compare` | `triplex/gateway/reach$read_entity$fn__426.invoke` | 48 |
| `clojure/lang/RT.doubleCast` | `triplex/gateway/reach$read_entity.invokeStatic` | 47 |
| `clojure/lang/RT.nthFrom` | `triplex/gateway/reach$build_response.invokeStatic` | 46 |

## 19f5422d helper on: random-256

Samples: 1001; missing gateway caller: 96; truncated stacks: 0.

| Leaf | First gateway caller | Samples |
|---|---|---:|
| `clojure/lang/PersistentArrayMap.indexOf` | `triplex/gateway/reach$read_entity.invokeStatic` | 62 |
| `java/lang/AbstractStringBuilder.append` | `triplex/gateway/reach$append_string_BANG_.invokeStatic` | 60 |
| `java/lang/String.equals` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 48 |
| `triplex/gateway/entity_cache$lookup.invokeStatic` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 41 |
| `clojure/lang/PersistentVector.arrayFor` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 40 |
| `java/util/concurrent/ConcurrentHashMap.get` | `triplex/gateway/reach$build_response.invokeStatic` | 35 |
| `java/util/regex/Pattern.lambda$union$3` | `triplex/gateway/main$handler.invokeStatic` | 33 |
| `triplex/gateway/reach$append_string_BANG_.invokeStatic` | `triplex/gateway/reach$append_string_BANG_.invokeStatic` | 29 |
| `java/util/HashMap.resize` | `triplex/gateway/reach$build_response.invokeStatic` | 27 |
| `triplex/gateway/reach$build_response.invokeStatic` | `triplex/gateway/reach$build_response.invokeStatic` | 25 |
| `clojure/lang/APersistentVector.doEquals` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 24 |
| `java/util/HashMap.putVal` | `triplex/gateway/reach$build_response.invokeStatic` | 23 |
| `clojure/lang/Util.equiv` | `triplex/gateway/reach$read_entity.invokeStatic` | 19 |
| `triplex/gateway/reach$read_entity.invokeStatic` | `triplex/gateway/reach$read_entity.invokeStatic` | 15 |
| `java/util/regex/Pattern$BmpCharPropertyGreedy.match` | `triplex/gateway/main$handler.invokeStatic` | 15 |

## 19f5422d helper on: readPoisson

Samples: 1398; missing gateway caller: 160; truncated stacks: 0.

| Leaf | First gateway caller | Samples |
|---|---|---:|
| `triplex/gateway/reach$append_string_BANG_.invokeStatic` | `triplex/gateway/reach$append_string_BANG_.invokeStatic` | 88 |
| `clojure/lang/PersistentArrayMap.indexOf` | `triplex/gateway/reach$read_entity.invokeStatic` | 62 |
| `java/lang/String.equals` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 60 |
| `clojure/lang/APersistentVector.hashCode` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 55 |
| `triplex/gateway/entity_cache$lookup.invokeStatic` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 45 |
| `java/util/HashMap.putVal` | `triplex/gateway/reach$build_response.invokeStatic` | 43 |
| `triplex/gateway/reach$build_response.invokeStatic` | `triplex/gateway/reach$build_response.invokeStatic` | 31 |
| `java/util/regex/Pattern.lambda$union$3` | `triplex/gateway/main$handler.invokeStatic` | 31 |
| `datomic/index$reify__13665.compare` | `triplex/gateway/reach$read_entity$fn__426.invoke` | 30 |
| `clojure/lang/Util.equals` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 28 |
| `java/util/concurrent/ConcurrentHashMap.get` | `triplex/gateway/entity_cache$revision.invokeStatic` | 27 |
| `java/util/concurrent/ConcurrentHashMap.transfer` | `triplex/gateway/entity_cache$revision$fn__236.invoke` | 26 |
| `datomic/db$reify__10129.compare` | `triplex/gateway/reach$read_entity$fn__426.invoke` | 24 |
| `java/util/concurrent/ConcurrentHashMap.get` | `triplex/gateway/reach$entity_id.invokeStatic` | 24 |
| `clojure/lang/KeywordLookupSite$1.get` | `triplex/gateway/reach$read_entity.invokeStatic` | 20 |

## da77a50a helper off: random-256

Samples: 1423; missing gateway caller: 150; truncated stacks: 0.

| Leaf | First gateway caller | Samples |
|---|---|---:|
| `clojure/lang/Util.equals` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 110 |
| `clojure/lang/PersistentArrayMap.indexOf` | `triplex/gateway/reach$read_entity.invokeStatic` | 106 |
| `java/util/concurrent/ConcurrentHashMap.get` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 78 |
| `clojure/lang/KeywordLookupSite$1.get` | `triplex/gateway/reach$read_entity.invokeStatic` | 68 |
| `java/lang/AbstractStringBuilder.append` | `triplex/gateway/reach$append_string_BANG_.invokeStatic` | 55 |
| `java/util/concurrent/ConcurrentHashMap.get` | `triplex/gateway/reach$entity_id.invokeStatic` | 32 |
| `triplex/gateway/reach$append_string_BANG_.invokeStatic` | `triplex/gateway/reach$append_string_BANG_.invokeStatic` | 30 |
| `clojure/lang/PersistentHashMap$BitmapIndexedNode.find` | `triplex/gateway/reach$read_entity.invokeStatic` | 30 |
| `java/util/concurrent/ConcurrentHashMap.get` | `triplex/gateway/reach$build_response.invokeStatic` | 29 |
| `clojure/lang/PersistentVector.arrayFor` | `triplex/gateway/reach$read_entity.invokeStatic` | 25 |
| `triplex/gateway/reach$build_response.invokeStatic` | `triplex/gateway/reach$build_response.invokeStatic` | 24 |
| `clojure/lang/RT.seqFrom` | `triplex/gateway/reach$read_entity.invokeStatic` | 24 |
| `java/util/HashMap.resize` | `triplex/gateway/reach$build_response.invokeStatic` | 21 |
| `clojure/lang/APersistentVector.hashCode` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 20 |
| `java/util/HashMap.putVal` | `triplex/gateway/reach$build_response.invokeStatic` | 20 |

## da77a50a helper off: readPoisson

Samples: 2606; missing gateway caller: 315; truncated stacks: 0.

| Leaf | First gateway caller | Samples |
|---|---|---:|
| `clojure/lang/PersistentArrayMap.indexOf` | `triplex/gateway/reach$read_entity.invokeStatic` | 296 |
| `clojure/lang/Util.equals` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 208 |
| `java/util/concurrent/ConcurrentHashMap.get` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 96 |
| `java/lang/AbstractStringBuilder.append` | `triplex/gateway/reach$append_string_BANG_.invokeStatic` | 68 |
| `java/util/concurrent/ConcurrentHashMap.get` | `triplex/gateway/reach$build_response.invokeStatic` | 55 |
| `java/util/concurrent/ConcurrentHashMap.get` | `triplex/gateway/reach$entity_id.invokeStatic` | 55 |
| `clojure/lang/PersistentArrayMap.indexOf` | `triplex/gateway/recent$lookup.invokeStatic` | 54 |
| `clojure/lang/PersistentHashMap$BitmapIndexedNode.find` | `triplex/gateway/reach$read_entity.invokeStatic` | 43 |
| `java/util/regex/Pattern.lambda$union$3` | `triplex/gateway/main$handler.invokeStatic` | 43 |
| `triplex/gateway/reach$build_response.invokeStatic` | `triplex/gateway/reach$build_response.invokeStatic` | 42 |
| `java/lang/String.equals` | `triplex/gateway/entity_cache$lookup.invokeStatic` | 39 |
| `clojure/lang/KeywordLookupSite$1.get` | `triplex/gateway/reach$read_entity$read_datom__553.invoke` | 37 |
| `java/util/HashMap.putVal` | `triplex/gateway/reach$build_response.invokeStatic` | 33 |
| `triplex/gateway/reach$append_string_BANG_.invokeStatic` | `triplex/gateway/reach$append_string_BANG_.invokeStatic` | 32 |
| `triplex/gateway/reach$read_entity.invokeStatic` | `triplex/gateway/reach$read_entity.invokeStatic` | 28 |

