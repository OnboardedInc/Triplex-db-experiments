#!/bin/sh
# Owned tool/cache environment. Does not change HOME or the default Docker context.
set -eu
TRIPLEX_TASK_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
python3 "$TRIPLEX_TASK_ROOT/tools/bootstrap/check-storage.py" > /dev/null
export PATH="$TRIPLEX_TASK_ROOT/.local/tools/node-v24.13.0-darwin-arm64/bin:$TRIPLEX_TASK_ROOT/.local/bin:$PATH"
export TMPDIR="$TRIPLEX_TASK_ROOT/.cache/tmp"
export XDG_CACHE_HOME="$TRIPLEX_TASK_ROOT/.cache/xdg"
export npm_config_cache="$TRIPLEX_TASK_ROOT/.cache/npm"
export npm_config_store_dir="$TRIPLEX_TASK_ROOT/.cache/pnpm"
export npm_config_manage_package_manager_versions=false
export PNPM_HOME="$TRIPLEX_TASK_ROOT/.local/bin"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export PYTHONPYCACHEPREFIX="$TRIPLEX_TASK_ROOT/.cache/python"
export COLIMA_HOME="$TRIPLEX_TASK_ROOT/.runtime/colima"
export LIMA_HOME="$TRIPLEX_TASK_ROOT/.runtime/lima"
export DOCKER_CONFIG="$TRIPLEX_TASK_ROOT/.runtime/docker-config"
export DOCKER_HOST="unix://$TRIPLEX_TASK_ROOT/.runtime/colima/triplex/docker.sock"
export BUILDX_CONFIG="$TRIPLEX_TASK_ROOT/.runtime/docker-config/buildx"
export GOCACHE="$TRIPLEX_TASK_ROOT/.cache/go-build"
export GOMODCACHE="$TRIPLEX_TASK_ROOT/.cache/go-mod"
export CARGO_HOME="$TRIPLEX_TASK_ROOT/.cache/cargo"
export RUSTUP_HOME="$TRIPLEX_TASK_ROOT/.cache/rustup"
exec "$@"
