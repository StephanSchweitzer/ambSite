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

# ---------------------------------------------------------------------------
# Progress display
# ---------------------------------------------------------------------------
#
# The launch takes ~20 seconds, almost all of it network: the dump pull and the
# four rsync passes. Without feedback that is indistinguishable from a broken
# launcher, and the natural response is to double-click again. So when there is
# a terminal to draw on, the six steps get a live dashboard — a progress bar, a
# tick per finished step, and the last few log lines.
#
# Every noisy sub-command already redirects to the log file, so stdout carries
# nothing but log() output and the screen can be redrawn safely.
#
# With no terminal (piped, cron, PAINTBRUSH_PLAIN=1) it falls back to the plain
# timestamped lines, which is also exactly what the log file gets either way.

TOTAL_STEPS=6
COMPLETED_STEPS=0
CURRENT_STEP=""
DONE_STEPS=()
TAIL_LINES=()

UI=0
if [ -t 1 ] && [ -z "${PAINTBRUSH_PLAIN:-}" ]; then
    UI=1
    C_RESET=$'\033[0m'; C_BOLD=$'\033[1m';  C_DIM=$'\033[2m'
    C_GREEN=$'\033[32m'; C_BLUE=$'\033[34m'; C_RED=$'\033[31m'
    # Title and size the window from inside, with escape codes. Doing it from
    # the .app would mean driving Terminal over Apple Events, which raises a
    # "Paintbrush wants to control Terminal" permission prompt on first launch.
    printf '\033]0;Paintbrush\007'
    printf '\033[8;22;84t'
else
    C_RESET=; C_BOLD=; C_DIM=; C_GREEN=; C_BLUE=; C_RED=
fi

# macOS ships bash 3.2, where "${arr[@]}" on an empty array trips `set -u`.
# The ${arr+...} guard keeps the expansion out of the way when it is empty.

bar() {
    local width=22 filled i out=""
    filled=$(( COMPLETED_STEPS * width / TOTAL_STEPS ))
    for (( i = 0; i < width; i++ )); do
        # Braces are load-bearing: bash 3.2 reads the bytes of a multibyte
        # character as part of an unbraced variable name, so "$out█" expands
        # as ${out█} and dies under `set -u`.
        if [ "$i" -lt "$filled" ]; then out="${out}█"; else out="${out}░"; fi
    done
    printf '%s' "$out"
}

render() {
    [ "$UI" -eq 1 ] || return 0
    local s
    printf '\033[H\033[2J'
    printf '  %sPaintbrush%s — starting your practice site\n\n' "$C_BOLD" "$C_RESET"
    printf '  [%s%s%s]  %d/%d\n\n' "$C_BLUE" "$(bar)" "$C_RESET" "$COMPLETED_STEPS" "$TOTAL_STEPS"
    for s in ${DONE_STEPS+"${DONE_STEPS[@]}"}; do
        printf '  %s✓%s %s\n' "$C_GREEN" "$C_RESET" "$s"
    done
    [ -n "$CURRENT_STEP" ] && printf '  %s⟳ %s%s\n' "$C_BLUE" "$CURRENT_STEP" "$C_RESET"
    printf '\n'
    for s in ${TAIL_LINES+"${TAIL_LINES[@]}"}; do
        printf '  %s%s%s\n' "$C_DIM" "$s" "$C_RESET"
    done
}

step_start() {
    CURRENT_STEP="$1"
    render
}

step_done() {
    DONE_STEPS=( ${DONE_STEPS+"${DONE_STEPS[@]}"} "$1" )
    COMPLETED_STEPS=$(( COMPLETED_STEPS + 1 ))
    CURRENT_STEP=""
    render
}

log() {
    local line
    line="$(date '+%Y-%m-%d %H:%M:%S')  $*"
    printf '%s\n' "$line" >>"$LOG_FILE"
    if [ "$UI" -eq 1 ]; then
        TAIL_LINES=( ${TAIL_LINES+"${TAIL_LINES[@]}"} "$line" )
        while [ "${#TAIL_LINES[@]}" -gt 3 ]; do
            TAIL_LINES=( "${TAIL_LINES[@]:1}" )
        done
        render
    else
        printf '%s\n' "$line"
    fi
}

# Fatal errors need to be visible even when this runs from a double-clicked
# .app, where stdout goes nowhere the user will ever look. The dialog stays
# even now that there is a window: it survives the window being behind others.
fail() {
    log "ERROR: $*"
    if [ "$UI" -eq 1 ]; then
        printf '\n  %s✗ %s%s\n\n' "$C_RED" "$1" "$C_RESET"
        printf '  %sDetails: %s%s\n\n' "$C_DIM" "$LOG_FILE" "$C_RESET"
    fi
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

# Which Homebrew formula is MySQL installed as? The practice site has to run
# the same MySQL as the live server, and Homebrew calls an older release
# "mysql@8.4" rather than "mysql" -- so a hardcoded `brew services start mysql`
# fails outright on a Mac that has been matched to the server, and the launcher
# dies with "MySQL did not come up". Resolve it from whichever mysqld is
# actually on PATH instead, which is the one about to be started.
mysql_formula() {
    local bin link
    bin="$(command -v mysqld 2>/dev/null)" || true
    if [ -z "$bin" ]; then printf 'mysql'; return; fi
    link="$(readlink "$bin" 2>/dev/null || printf '%s' "$bin")"
    case "$link" in
        */Cellar/*) printf '%s' "$(printf '%s' "$link" | sed -E 's|.*/Cellar/([^/]+)/.*|\1|')" ;;
        *)          printf 'mysql' ;;
    esac
}

MYSQL_FORMULA="$(mysql_formula)"

step_start "Starting MySQL..."
log "Starting MySQL ($MYSQL_FORMULA; no-op if already running)..."
brew services start "$MYSQL_FORMULA" >>"$LOG_FILE" 2>&1

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
[ "$mysql_ready" -eq 1 ] || fail "MySQL did not come up. Try: brew services restart $MYSQL_FORMULA"
log "MySQL is up."
step_done "MySQL is up"

# ---------------------------------------------------------------------------
# 2. Back up the local database, then load a fresh production dump over it
# ---------------------------------------------------------------------------
#
# No remote command is sent: the key's forced command runs mysqldump on its
# own. No credentials appear on the command line — the local mysql client
# reads its user from ~/.my.cnf.
#
# SSH chatter on stderr (key-exchange notices and the like) is expected and
# harmless, so it goes to the log rather than the screen.
#
# The production dump opens with DROP TABLE IF EXISTS for every table, so this
# step destroys whatever is in the local database — including work done through
# the practice site's own admin page. Resetting is deliberate: a practice copy
# is only useful if it matches production. Being unrecoverable is not, so the
# current contents are saved first.

BACKUP_DIR="$HOME/Library/Application Support/Paintbrush/db-backups"
BACKUP_KEEP=5

step_start "Backing up the local database..."

# Non-fatal throughout: there is nothing to save on the first run, and a failed
# backup must never be the reason the practice site will not start.
existing_tables=$(mysql -N -B \
    -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$LOCAL_DB';" 2>/dev/null)

if [ "${existing_tables:-0}" -gt 0 ]; then
    mkdir -p "$BACKUP_DIR"
    backup_file="$BACKUP_DIR/$LOCAL_DB-$(date '+%Y%m%d-%H%M%S').sql"

    if mysqldump "$LOCAL_DB" >"$backup_file" 2>>"$LOG_FILE"; then
        log "Backed up $LOCAL_DB to $(basename "$backup_file") ($(du -h "$backup_file" | awk '{print $1}'))."

        # Keep the most recent BACKUP_KEEP dumps. Scoped to this database's own
        # files in this directory, so nothing else can be caught by it.
        ls -t "$BACKUP_DIR/$LOCAL_DB"-*.sql 2>/dev/null | tail -n +$(( BACKUP_KEEP + 1 )) | \
        while IFS= read -r old_backup; do
            rm -f "$old_backup"
            log "  pruned old backup $(basename "$old_backup")"
        done
    else
        # A half-written file is worse than none: it looks like a usable backup.
        rm -f "$backup_file"
        log "WARNING: could not back up $LOCAL_DB — continuing without a safety net."
    fi
else
    log "No local database to back up yet — first run."
fi

step_start "Pulling production data (read-only)..."
log "Pulling latest data from production (read-only)..."

# -T is load-bearing, not tidiness. No remote command is passed here (the
# forced command supplies it), so ssh treats this as an interactive session and
# requests a PTY as soon as stdin is a terminal — which it now is, since the
# launcher runs in a Terminal window. A PTY applies ONLCR translation, turning
# every \n in the dump into \r\n and feeding corrupted SQL to mysql. The server
# happens to refuse the PTY, so this survived on luck; -T removes the luck.
#
# LC_ALL=C stops macOS forwarding LC_CTYPE="UTF-8" to a server whose perl does
# not have that locale, which otherwise warns on every connection.

if LC_ALL=C ssh -T \
       -i "$SSH_KEY" \
       -o BatchMode=yes \
       -o ConnectTimeout=20 \
       "$SSH_TARGET" 2>>"$LOG_FILE" | mysql "$LOCAL_DB" 2>>"$LOG_FILE"; then
    table_count=$(mysql -N -B "$LOCAL_DB" \
        -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$LOCAL_DB';" 2>/dev/null)
    log "Data refreshed into $LOCAL_DB (${table_count:-?} tables)."
    step_done "Data refreshed (${table_count:-?} tables)"
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

step_start "Syncing artwork images (read-only)..."

if [ -z "${IMAGE_SYNC_TARGET:-}" ]; then
    log "Image sync not configured (IMAGE_SYNC_TARGET unset in $ENV_FILE) — skipping."
    log "Artworks added on the live site will show as broken images until this is set up."
    step_done "Image sync skipped (not configured)"
elif [ ! -r "$IMAGE_SYNC_KEY" ]; then
    log "WARNING: image sync key not readable ($IMAGE_SYNC_KEY) — skipping image sync."
    step_done "Image sync skipped (no key)"
elif rsync --version 2>/dev/null | head -1 | grep -qi "openrsync"; then
    # macOS ships Apple's openrsync ("rsync version 2.6.9 compatible",
    # protocol 29). It speaks a legacy option dialect that the restricted
    # server-side rrsync rejects outright, so catch it here rather than
    # emitting four identical and misleading per-directory failures.
    log "WARNING: this Mac is using openrsync, which the server's restricted"
    log "         rsync will not accept. Fix with:  brew install rsync"
    log "         Skipping image sync."
    step_done "Image sync skipped (needs: brew install rsync)"
else
    log "Syncing artwork images from production (read-only)..."
    sync_failed=0
    synced_files=0

    for dir in $IMAGE_DIRS; do
        mkdir -p "$WEB_ROOT/$dir"
        # Name the directory in flight, so the slowest step of the six does not
        # look stalled while four rsync passes run back to back.
        step_start "Syncing artwork images — $dir..."
        # -rt keeps timestamps so repeat runs only transfer what actually
        # changed. No -z: JPEG/PNG are already compressed.
        # No --delete on purpose — a wrong remote path combined with --delete
        # would wipe her local images. Stale extra files are harmless.
        if LC_ALL=C rsync -rt --partial \
                 -e "ssh -T -i $IMAGE_SYNC_KEY -o BatchMode=yes -o ConnectTimeout=20" \
                 "$IMAGE_SYNC_TARGET:${IMAGE_REMOTE_BASE}$dir/" \
                 "$WEB_ROOT/$dir/" >>"$LOG_FILE" 2>&1; then
            dir_files=$(ls "$WEB_ROOT/$dir" 2>/dev/null | wc -l | tr -d ' ')
            synced_files=$(( synced_files + dir_files ))
            log "  $dir: up to date ($dir_files files)"
        else
            log "  WARNING: could not sync $dir"
            sync_failed=1
        fi
    done

    if [ "$sync_failed" -eq 1 ]; then
        log "Some images could not be synced — the site will still work, but a few may be missing."
        step_done "Images partly synced — some missing"
    else
        log "Images up to date."
        step_done "Images up to date ($synced_files files)"
    fi
fi

# ---------------------------------------------------------------------------
# 4. Start the PHP dev server, only if nothing is on the port already
# ---------------------------------------------------------------------------

step_start "Starting the web server..."

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "Something is already serving on port $PORT — leaving it alone."
    step_done "Web server already running on port $PORT"
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
    step_done "Web server listening on port $PORT"
fi

# ---------------------------------------------------------------------------
# 5. Open the practice site
# ---------------------------------------------------------------------------

step_start "Opening the practice site..."
log "Opening http://localhost:$PORT ..."
open "http://localhost:$PORT"
step_done "Practice site open at http://localhost:$PORT"

# ---------------------------------------------------------------------------
# 6. Open Claude Code last, so it ends up as the focused window
# ---------------------------------------------------------------------------

# Percent-encode spaces so a path like /Users/me/My Site still works.
encoded_path=${SITE_PATH// /%20}

step_start "Opening Claude Code..."
log "Opening Claude Code at $SITE_PATH ..."
sleep 1
if ! open "claude://code/new?folder=$encoded_path" 2>>"$LOG_FILE"; then
    # If the URL scheme is ever retired, fall back to just launching the app so
    # she still lands somewhere useful instead of nothing happening.
    log "claude:// scheme did not work; falling back to opening Claude directly."
    open -a "Claude" 2>>"$LOG_FILE" || log "Could not open Claude. Is the desktop app installed?"
fi
step_done "Claude Code open"

log "=== paintbrush finished ==="

# The Terminal window stays open after this exits, so end on the useful facts
# rather than leaving the last rsync line as the final word on screen.
if [ "$UI" -eq 1 ]; then
    printf '\n  %s✓ Ready — your practice site is at %shttp://localhost:%s%s\n' \
        "$C_GREEN" "$C_BOLD" "$PORT" "$C_RESET"
    printf '  %sYou can close this window; the site keeps running.%s\n\n' "$C_DIM" "$C_RESET"
fi
