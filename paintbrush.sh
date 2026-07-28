#!/bin/bash
#
# paintbrush.sh — one-click launcher for the local practice copy of the site.
#
# Refreshes a local database from a read-only production dump, serves the site
# on localhost, and opens it alongside Claude Code. Safe to run repeatedly.
#
# All machine-specific values live in .paintbrush.env (gitignored).
# See paintbrush.env.example for the keys this script expects.
#
# Nothing here is written back to the server: the SSH key is restricted to a
# forced command that only produces a dump.

set -uo pipefail

# A GUI launcher (.app, Automator, Dock) starts with a minimal PATH that does
# not include Homebrew, so brew/mysql/php would not be found. Put the usual
# Homebrew locations back before anything else runs.
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

LOG_FILE="$HOME/Library/Logs/paintbrush.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG_FILE"
}

# Fatal errors need to be visible even when this runs from a double-clicked
# .app, where stdout goes nowhere the user will ever look.
fail() {
    log "ERROR: $*"
    osascript -e "display dialog \"Practice site could not start.

$1

Details: $LOG_FILE\" with title \"Paintbrush\" buttons {\"OK\"} default button \"OK\" with icon stop" >/dev/null 2>&1
    exit 1
}

log "=== paintbrush starting ==="

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Config lives next to the script (gitignored). Falls back to the home
# directory so an existing ~/.paintbrush.env keeps working.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/.paintbrush.env" ]; then
    ENV_FILE="$SCRIPT_DIR/.paintbrush.env"
else
    ENV_FILE="$HOME/.paintbrush.env"
fi

[ -f "$ENV_FILE" ] || fail "No config file found. Copy paintbrush.env.example to $SCRIPT_DIR/.paintbrush.env and fill it in."

# shellcheck source=/dev/null
set -a
source "$ENV_FILE" || fail "Could not read $ENV_FILE."
set +a

# SSH_KEY is optional; everything else must be present.
SSH_KEY="${SSH_KEY:-$HOME/.ssh/paintbrush}"

for var in SSH_TARGET LOCAL_DB SITE_PATH PORT; do
    [ -n "${!var:-}" ] || fail "$var is not set in $ENV_FILE."
done

# The PHP server is rooted at the web root, but Claude Code opens the project
# root — for this project those are different directories.
WEB_ROOT="${WEB_ROOT:-$SITE_PATH/html}"

[ -d "$SITE_PATH" ] || fail "SITE_PATH does not exist: $SITE_PATH"
[ -d "$WEB_ROOT" ]  || fail "WEB_ROOT does not exist: $WEB_ROOT"
[ -r "$SSH_KEY" ]   || fail "SSH key not readable: $SSH_KEY"

log "site=$SITE_PATH  webroot=$WEB_ROOT  db=$LOCAL_DB  port=$PORT"

# ---------------------------------------------------------------------------
# 1. Make sure local MySQL is running
# ---------------------------------------------------------------------------

log "Starting MySQL (no-op if already running)..."
brew services start mysql >>"$LOG_FILE" 2>&1

# `brew services start` returns before the server is actually accepting
# connections, so wait for a real ping rather than racing the load below.
mysql_ready=0
for _ in $(seq 1 30); do
    if mysqladmin ping --silent >/dev/null 2>&1; then
        mysql_ready=1
        break
    fi
    sleep 1
done
[ "$mysql_ready" -eq 1 ] || fail "MySQL did not come up. Try: brew services restart mysql"
log "MySQL is up."

# ---------------------------------------------------------------------------
# 2. Pull production data (read-only) and load it locally
# ---------------------------------------------------------------------------
#
# No remote command is sent: the key's forced command runs mysqldump on its
# own. No credentials appear on the command line — the local mysql client
# reads its user from ~/.my.cnf.
#
# SSH chatter on stderr ("Pseudo-terminal will not be allocated", key-exchange
# notices) is expected and harmless, so it goes to the log rather than the
# screen.

log "Pulling latest data from production (read-only)..."

if ssh -i "$SSH_KEY" \
       -o BatchMode=yes \
       -o ConnectTimeout=20 \
       "$SSH_TARGET" 2>>"$LOG_FILE" | mysql "$LOCAL_DB" 2>>"$LOG_FILE"; then
    table_count=$(mysql -N -B "$LOCAL_DB" \
        -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$LOCAL_DB';" 2>/dev/null)
    log "Data refreshed into $LOCAL_DB (${table_count:-?} tables)."
else
    fail "Could not refresh the practice database from production. The local copy may be incomplete — check your internet connection and run this again."
fi

# ---------------------------------------------------------------------------
# 3. Pull down artwork images
# ---------------------------------------------------------------------------
#
# The database dump carries rows, not files. Images uploaded through the live
# admin panel land on the server's disk, so without this step every artwork
# added since the last sync shows up locally as a broken thumbnail.
#
# This needs its own key: the dump key is pinned to a forced command that only
# ever runs mysqldump, so rsync cannot travel over it. The image key should be
# restricted server-side to read-only rsync (see README) — the launcher must
# never be able to write to production.
#
# Deliberately non-fatal. A failed image sync leaves the site working with
# whatever images are already local, which is far better than blocking the
# launch with an error dialog.

IMAGE_DIRS="${IMAGE_DIRS:-img imgMid thumbnails baseImages}"
IMAGE_SYNC_KEY="${IMAGE_SYNC_KEY:-$HOME/.ssh/paintbrush_images}"
IMAGE_REMOTE_BASE="${IMAGE_REMOTE_BASE:-}"

if [ -z "${IMAGE_SYNC_TARGET:-}" ]; then
    log "Image sync not configured (IMAGE_SYNC_TARGET unset in $ENV_FILE) — skipping."
    log "Artworks added on the live site will show as broken images until this is set up."
elif [ ! -r "$IMAGE_SYNC_KEY" ]; then
    log "WARNING: image sync key not readable ($IMAGE_SYNC_KEY) — skipping image sync."
elif rsync --version 2>/dev/null | head -1 | grep -qi "openrsync"; then
    # macOS ships Apple's openrsync ("rsync version 2.6.9 compatible",
    # protocol 29). It speaks a legacy option dialect that the restricted
    # server-side rrsync rejects outright, so catch it here rather than
    # emitting four identical and misleading per-directory failures.
    log "WARNING: this Mac is using openrsync, which the server's restricted"
    log "         rsync will not accept. Fix with:  brew install rsync"
    log "         Skipping image sync."
else
    log "Syncing artwork images from production (read-only)..."
    sync_failed=0

    for dir in $IMAGE_DIRS; do
        mkdir -p "$WEB_ROOT/$dir"
        # -rt keeps timestamps so repeat runs only transfer what actually
        # changed. No -z: JPEG/PNG are already compressed.
        # No --delete on purpose — a wrong remote path combined with --delete
        # would wipe her local images. Stale extra files are harmless.
        if rsync -rt --partial \
                 -e "ssh -i $IMAGE_SYNC_KEY -o BatchMode=yes -o ConnectTimeout=20" \
                 "$IMAGE_SYNC_TARGET:${IMAGE_REMOTE_BASE}$dir/" \
                 "$WEB_ROOT/$dir/" >>"$LOG_FILE" 2>&1; then
            log "  $dir: up to date ($(ls "$WEB_ROOT/$dir" 2>/dev/null | wc -l | tr -d ' ') files)"
        else
            log "  WARNING: could not sync $dir"
            sync_failed=1
        fi
    done

    if [ "$sync_failed" -eq 1 ]; then
        log "Some images could not be synced — the site will still work, but a few may be missing."
    else
        log "Images up to date."
    fi
fi

# ---------------------------------------------------------------------------
# 4. Start the PHP dev server, only if nothing is on the port already
# ---------------------------------------------------------------------------

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "Something is already serving on port $PORT — leaving it alone."
else
    log "Starting PHP server on port $PORT..."
    # nohup + background + disown so the server outlives this script and the
    # .app that launched it.
    nohup php -S "localhost:$PORT" -t "$WEB_ROOT" >>"$LOG_FILE" 2>&1 &
    disown

    server_ready=0
    for _ in $(seq 1 20); do
        if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
            server_ready=1
            break
        fi
        sleep 0.5
    done
    [ "$server_ready" -eq 1 ] || fail "The PHP server did not start on port $PORT."
    log "PHP server is listening."
fi

# ---------------------------------------------------------------------------
# 5. Open the practice site
# ---------------------------------------------------------------------------

log "Opening http://localhost:$PORT ..."
open "http://localhost:$PORT"

# ---------------------------------------------------------------------------
# 6. Open Claude Code last, so it ends up as the focused window
# ---------------------------------------------------------------------------

# Percent-encode spaces so a path like /Users/me/My Site still works.
encoded_path=${SITE_PATH// /%20}

log "Opening Claude Code at $SITE_PATH ..."
sleep 1
if ! open "claude://code/new?folder=$encoded_path" 2>>"$LOG_FILE"; then
    # If the URL scheme is ever retired, fall back to just launching the app so
    # she still lands somewhere useful instead of nothing happening.
    log "claude:// scheme did not work; falling back to opening Claude directly."
    open -a "Claude" 2>>"$LOG_FILE" || log "Could not open Claude. Is the desktop app installed?"
fi

log "=== paintbrush finished ==="
