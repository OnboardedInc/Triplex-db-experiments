#!/usr/bin/env bash
# [DX-DEMO1] On the Mac, after demo/connect.sh:
#   demo/inspect.sh          the standard MCP Inspector (pinned) in the browser against the local demo MCP server
#   demo/inspect.sh --page   the one-page inspector (demo/inspector.html) on http://127.0.0.1:28580/
# Both listen on 127.0.0.1 only and read the endpoints from ~/.triplex-demo/connection.json.
set -euo pipefail
repo=$(cd "$(dirname "$0")/.." && pwd)
[[ -s $HOME/.triplex-demo/connection.json ]] || { echo 'Run demo/connect.sh first' >&2; exit 2; }
if [[ ${1:-} == --page ]]; then
  exec node "$repo/examples/demo-mcp/src/page.ts" "${2:-28580}"
fi
# Inspector 2.13.0 (2026-10-28): a development tool; it binds to localhost and prints its URL with a session token.
# pnpm dlx takes the store directory from the environment (it refuses --store-dir as a flag).
export npm_config_store_dir=${PNPM_STORE_DIR:-$HOME/projects/triplex-db-2/.pnpm-store}
exec pnpm dlx @modelcontextprotocol/inspector@2.13.0 \
  node "$repo/examples/demo-mcp/src/mcp.ts"
