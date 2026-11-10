#!/usr/bin/env bash
# [DX-S4] Why: combine the initial anatomy and maintenance census in one hold. Rejected: spending a separate lease solely on a schema listing.
set -euo pipefail
exec bash "$(dirname "$0")/datomic.sh" clone
