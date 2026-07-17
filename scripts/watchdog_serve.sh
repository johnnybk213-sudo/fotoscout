#!/usr/bin/env bash
# FotoScout server-watchdog.
# Tjekker om den statiske HTTP-server lytter på PORT; genstarter den hvis ikke.
# Kaldes fra cron hvert par minutter. Matcher @reboot-startkommandoen 1:1.
set -u

PROJECT="/mnt/c/Users/jbk_d/OneDrive/Dokumenter/project-workspace/projects/fotoscout"
PORT=7080
LOG="$PROJECT/logs/cron_serve.log"

# Lytter serveren allerede? Så gør vi intet.
if ss -tlnp 2>/dev/null | grep -q ":${PORT}\b"; then
    exit 0
fi

# Nede -> genstart (samme kommando som @reboot-cron'en).
cd "$PROJECT" || exit 0
echo "[$(date '+%Y-%m-%d %H:%M:%S')] watchdog: server nede paa ${PORT} -> genstarter" >> "$LOG"
setsid /usr/bin/python3 -m http.server "$PORT" --bind 0.0.0.0 < /dev/null >> "$LOG" 2>&1 &
exit 0
