#!/bin/bash

# Pełne ścieżki do komend
GIT=/usr/bin/git
LOG_FILE=/home/pawel/projects/eform-project/eform/cron.log

# Zmiana katalogu na właściwy
cd /home/pawel/projects/eform-project/eform || exit 1

# Logowanie rozpoczęcia
echo "=== $(date '+%Y-%m-%d %H:%M:%S') - Start ===" >> "$LOG_FILE"

# Wykonanie operacji git z logowaniem
$GIT add . >> "$LOG_FILE" 2>&1
$GIT commit -m "Automatic commit $(date '+%Y-%m-%d %H:%M')" >> "$LOG_FILE" 2>&1
$GIT push origin main >> "$LOG_FILE" 2>&1

echo "=== $(date '+%Y-%m-%d %H:%M:%S') - Koniec (Exit: $?) ===" >> "$LOG_FILE"