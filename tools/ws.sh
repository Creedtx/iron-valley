#!/bin/bash
# run a test with its own short-lived static server on :8765:  tools/ws.sh <script.mjs> [args...]
cd /home/claude/iron-valley-assets/game && python3 -m http.server 8765 >/dev/null 2>&1 & SRV=$!
sleep 1; cd /home/claude/iron-valley-assets/tools && node "$@"; R=$?; kill $SRV 2>/dev/null; exit $R
