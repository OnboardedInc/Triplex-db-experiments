# [DX-TAIL1] Why: a cpuset or memory placement change must leave the selected collector intact.
# Rejected: HotSpot ergonomics (evaluated at launch), and replacing an explicitly tested collector.
explicit_gc() {
  local fallback=$1 options=$2 selected='' word disabled=' '
  local -a words
  read -r -d '' -a words <<< "$options" || true
  for word in ${words[@]+"${words[@]}"}; do
    case "$word" in
      -XX:+UseSerialGC|-XX:+UseParallelGC|-XX:+UseG1GC|-XX:+UseZGC|-XX:+UseShenandoahGC|-XX:+UseEpsilonGC)
        if [[ -n $selected && $selected != "$word" ]]; then
          echo 'Conflicting explicit JVM collectors' >&2
          return 2
        fi
        selected=$word
        ;;
      -XX:-Use*) disabled+=" ${word#-XX:-} ";;
    esac
  done
  local selector=${selected:-${fallback%% *}}
  if [[ $disabled == *" ${selector#-XX:+} "* ]]; then
    echo 'Selected JVM collector is explicitly disabled' >&2
    return 2
  fi
  if [[ -n $selected ]]; then
    printf '%s\n' "$options"
  else
    printf '%s\n' "$fallback${options:+ $options}"
  fi
}
