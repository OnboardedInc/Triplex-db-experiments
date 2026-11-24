# [DX-INT4] Sourced by Mac gates that start a Datomic container themselves (not through engine.mjs or ha1).
# Why: fixed shared tags (tx2-datomic:1.0.7745-da00, tx2-datomic:dx-real2-production, tx2-datomic:dx-prep1-*,
# tx2-datomic:dx-jvm1-*) are rebuilt and retagged by other builders on the same lab VM, so a gate that starts from one
# runs whatever the last builder left there. A gate here starts from one image ID, records it, and checks the
# container ran it.
# Rejected: trusting a mutable tag, or comparing a tag's ID once and then starting the container by tag.
#
#   gate_image REF EVIDENCE_FILE         prints the image ID; REF is an image ID (sha256:<64 hex>) or a private per-build
#                                        tag (tx2-dx<holder>-jre21|jre25|native|managed:<15 or 16 hex>); anything else,
#                                        including every tx2-datomic:* tag, is refused (status 2) before any Docker call.
#   gate_image_ran CONTAINER ID FILE     appends the ID the container runs; status 2 when it is not ID.
gate_image() {
  local ref=$1 file=$2 meta id created inputs
  if [[ ! $ref =~ ^sha256:[a-f0-9]{64}$ && ! $ref =~ ^tx2-dx[a-z0-9]+-(jre21|jre25|native|managed):[a-f0-9]{15,16}$ ]]; then
    echo "gate-image: refusing '$ref': give an image ID (sha256:...) or a private per-build tag; fixed shared tags are rebuilt by other builders" >&2
    return 2
  fi
  meta=$(docker image inspect --format '{{.Id}}|{{.Created}}|{{index .Config.Labels "tx2.build-inputs-sha256"}}' "$ref" 2>/dev/null) ||
    { echo "gate-image: $ref is not present on the lab VM" >&2; return 2; }
  IFS='|' read -r id created inputs <<< "$meta"
  [[ $id =~ ^sha256:[a-f0-9]{64}$ && ( $ref != sha256:* || $id == "$ref" ) ]] ||
    { echo "gate-image: $ref resolved to '$id'" >&2; return 2; }
  # A JRE variant tag names the first 16 hex of its build inputs; the label must agree.
  if [[ $ref =~ -jre(21|25):([a-f0-9]{16})$ && $inputs != "${BASH_REMATCH[2]}"* ]]; then
    echo "gate-image: $ref carries build inputs '$inputs', not the ones its tag names" >&2
    return 2
  fi
  printf '{"ref":"%s","imageId":"%s","created":"%s","buildInputsSha256":"%s"}\n' "$ref" "$id" "$created" "$inputs" > "$file"
  printf '%s' "$id"
}
gate_image_ran() {
  local ran
  ran=$(docker container inspect --format '{{.Image}}' "$1" 2>/dev/null) || { echo "gate-image: no container $1" >&2; return 2; }
  printf '{"container":"%s","ran":"%s"}\n' "$1" "$ran" >> "$3"
  [[ $ran == "$2" ]] || { echo "gate-image: $1 runs $ran, not $2" >&2; return 2; }
}
