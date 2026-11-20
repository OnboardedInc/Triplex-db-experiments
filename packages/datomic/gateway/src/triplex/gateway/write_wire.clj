(ns triplex.gateway.write-wire
  (:require [clojure.data.json :as json] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.privacy :as privacy])
  (:import [java.nio.charset StandardCharsets]
           [java.security KeyFactory]
           [java.security.spec MGF1ParameterSpec PKCS8EncodedKeySpec]
           [java.util Arrays Base64]
           [javax.crypto Cipher]
           [javax.crypto.spec OAEPParameterSpec PSource$PSpecified]))

(defn base64 [^String s] (.decode (Base64/getDecoder) s))
(def private-key
  (delay
    (when-let [value (System/getenv "TRIPLEX_GATEWAY_WRITE_PRIVATE_KEY")]
      (.generatePrivate (KeyFactory/getInstance "RSA") (PKCS8EncodedKeySpec. (base64 value))))))

(defn required? [] (some? @private-key))

(defn open [name input]
  ;; [DX-W1] Why: the authenticated outer IDs select exactly the scope and original operation attempt.
  ;; Rejected: accepting a decoded body under a different database or reusing an outer routing claim unchecked.
  (if-not (contains? input "protectedWrite")
    [false input]
    (try
      (let [{key "key" nonce "nonce" body "body"} (get input "protectedWrite")
            operation (get input "operationId") attempt (get input "attemptId")
            rsa (Cipher/getInstance "RSA/ECB/OAEPWithSHA-256AndMGF1Padding")
            params (OAEPParameterSpec. "SHA-256" "MGF1" MGF1ParameterSpec/SHA256 PSource$PSpecified/DEFAULT)]
        (when-not (and (required?) (string? operation) (string? attempt)) (privacy/unavailable!))
        (.init rsa Cipher/DECRYPT_MODE @private-key params)
        (let [secret (.doFinal rsa (base64 key))]
          (try
            (let [iv (base64 nonce)
                  _ (when-not (and (= 32 (alength secret)) (= 12 (alength iv))) (privacy/unavailable!))
                  clear (envelope/crypto Cipher/DECRYPT_MODE secret iv
                          (envelope/utf8 (json/write-str ["triplex-write-v1" name operation attempt] :escape-slash false :escape-unicode false))
                          (base64 body))
                  decoded (try (json/read-str (String. ^bytes clear StandardCharsets/UTF_8))
                               (finally (Arrays/fill ^bytes clear (byte 0))))]
              (when-not (= [operation attempt] [(get decoded "operationId") (get decoded "attemptId")]) (privacy/unavailable!))
              [true (with-meta decoded (meta input))])
            (finally (Arrays/fill ^bytes secret (byte 0))))))
      (catch Exception _ (privacy/failure! 400 "InvalidProtectedWrite" "The protected write envelope could not be verified")))))
