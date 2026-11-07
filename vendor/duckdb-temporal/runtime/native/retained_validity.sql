-- Canonical retained carrier check for the native persisted-query boundary.
CASE WHEN json_valid(payload) THEN
 payload_hash=sha256(payload) AND (origin='triplex' OR valid_from<valid_to) AND
 (tx_from<tx_to OR (origin='triplex' AND tx_from=tx_to)) AND
 octet_length(encode(e))<=1048576 AND octet_length(encode(a))<=1048576 AND
 NOT contains(e,chr(0)) AND NOT contains(a,chr(0)) AND
 CASE tag
 WHEN 'str' THEN v_tag=1 AND v_s IS NOT NULL AND v_b IS NULL AND v_i IS NULL AND v_f IS NULL
  AND json_type(payload)='VARCHAR' AND v_s=encode(json_extract_string(payload,'$'))
  AND octet_length(v_s)<=1048576 AND NOT contains(json_extract_string(payload,'$'),chr(0))
 WHEN 'bool' THEN v_tag=2 AND v_s IS NULL AND v_b IS NOT NULL AND v_i IS NULL AND v_f IS NULL
  AND json_type(payload)='BOOLEAN' AND CAST(v_b AS VARCHAR)=json_extract_string(payload,'$')
 WHEN 'i64' THEN v_tag=3 AND v_s IS NULL AND v_b IS NULL AND v_i IS NOT NULL AND v_f IS NULL
  AND json_type(payload)='VARCHAR' AND CAST(v_i AS VARCHAR)=json_extract_string(payload,'$')
 WHEN 'f64' THEN v_tag=4 AND v_s IS NULL AND v_b IS NULL AND v_i IS NULL AND v_f IS NOT NULL
  AND json_type(payload)='VARCHAR' AND CASE WHEN isfinite(v_f) THEN
   system.main.td_float_bits_v1(v_f)=json_extract_string(payload,'$') ELSE FALSE END
 WHEN 'ref' THEN origin='triplex' AND v_tag=5 AND v_s IS NOT NULL AND v_b IS NULL AND v_i IS NULL AND v_f IS NULL
  AND json_type(payload)='VARCHAR' AND octet_length(v_s)>0 AND v_s=encode(json_extract_string(payload,'$'))
  AND NOT contains(json_extract_string(payload,'$'),chr(0))
 WHEN 'datetime' THEN origin='triplex' AND v_tag=6 AND v_s IS NULL AND v_b IS NULL AND v_i IS NULL AND v_f IS NOT NULL
  AND json_type(payload)='VARCHAR' AND CASE WHEN isfinite(v_f) THEN system.main.td_float_bits_v1(v_f)=json_extract_string(payload,'$') ELSE FALSE END
 WHEN 'json' THEN origin='triplex' AND v_tag=7 AND v_s IS NOT NULL AND v_b IS NULL AND v_i IS NULL AND v_f IS NULL
  AND json_type(payload)='VARCHAR' AND v_s=encode(json_extract_string(payload,'$')) AND json_valid(decode(v_s))
 WHEN 'blob' THEN origin='triplex' AND v_tag=8 AND v_s IS NOT NULL AND v_b IS NULL AND v_i IS NULL AND v_f IS NULL
  AND CASE json_type(payload)
   WHEN 'VARCHAR' THEN v_s=encode(json_extract_string(payload,'$')) AND extra_json IS NOT NULL AND json_valid(extra_json)
   WHEN 'OBJECT' THEN system.main.td_validate_blob_descriptor_v2(payload,decode(v_s),extra_json)
   ELSE FALSE END
 ELSE FALSE END
 ELSE FALSE END
