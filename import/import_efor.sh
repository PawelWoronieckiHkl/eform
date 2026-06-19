#!/bin/bash

# Standalone import daemon — NOT part of server.js.
# Started at @reboot via crontab; one long-lived Node process.
#
# Logs: import/import.log
# PID:  import/import.pid

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

PIDFILE="$ROOT/import/import.pid"
if [ -f "$PIDFILE" ]; then
  OLD_PID="$(cat "$PIDFILE" 2>/dev/null)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "OrderImport daemon already running (pid $OLD_PID)" >&2
    exit 0
  fi
fi

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

NODE_BIN="${NODE_BIN:-$(command -v node)}"
if [ -z "$NODE_BIN" ]; then
  echo "OrderImport: node not found in PATH" >&2
  exit 1
fi

NODE_MAJOR="$("$NODE_BIN" -p "parseInt(process.versions.node.split('.')[0], 10)")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "OrderImport: Node >= 18 required, got $("$NODE_BIN" --version)" >&2
  exit 1
fi

export ORDER_IMPORT_STANDALONE=1
exec "$NODE_BIN" "$ROOT/scripts/orderImportDaemon.js"
