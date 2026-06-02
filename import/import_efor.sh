#!/bin/bash

# Started from crontab (@reboot, via nohup) with stdout -> import/import_efor.log.
# Each cycle (every 30s):
#   1. preflight — read-only report of which queued FTP orders would be rejected
#      and exactly why (no DB writes, no files moved). Gives visibility instead
#      of a bad order silently sitting on the FTP.
#   2. import — the real run: creates orders and moves files to processed/error.

cd /home/pawel/projects/eform-project/eform || exit

while true
do
    echo "===== $(date '+%Y-%m-%d %H:%M:%S') ====="

    node scripts/orderImportPreflight.js

    node scripts/runOrderImport.js

    sleep 30
done
