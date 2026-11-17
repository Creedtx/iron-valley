#!/bin/bash
# run a test with its own short-lived static server on :8765 serving game/:  tools/ws.sh <script.mjs> [args...]
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/../game" && python3 -m http.server 8765 >/dev/null 2>&1 & SRV=$!
sleep 1; cd "$HERE" && node "$@"; R=$?; kill $SRV 2>/dev/null; exit $R
