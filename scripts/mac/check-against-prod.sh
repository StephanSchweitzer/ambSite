#!/usr/bin/env bash
#
# check-against-prod.sh — does this Mac's practice site match the live server?
#
# Asks the server for a read-only fact sheet (scripts/server/paintbrush-facts,
# reached with the restricted FACTS_KEY) and compares it with this Mac:
#
#   * PHP version          major.minor must match, or the practice site is
#                          testing against a different language
#   * MySQL server version  likewise: 9.x changes reserved words and the
#                          default sql_mode, so a query can pass here and
#                          fail live
#   * PHP extensions       anything production loads that this Mac does not
#   * setting names        every key in production's .env must exist in this
#                          Mac's .env, and in the committed .env.example
#
# It only ever READS, on both ends: the key is pinned server-side to one
# command that prints facts, and nothing here writes anything anywhere.
#
# Usage
#   bash scripts/mac/check-against-prod.sh            # full report
#   bash scripts/mac/check-against-prod.sh --quiet     # one line, for the launcher
#
#   PAINTBRUSH_FACTS_FILE=/path/to/saved-facts bash scripts/mac/check-against-prod.sh
#                                                     # compare against a saved
#                                                     # fact sheet, no SSH
#
# Exit codes
#   0  everything matches
#   1  drift found (details printed)
#   2  could not ask the server — not configured, or unreachable
#
# Fixing what it finds: versions with scripts/mac/mac-match-prod.sh, missing
# settings by adding the key to .env (and .env.example, which is committed).
#
# Written for the bash 3.2 that ships with macOS.

set -uo pipefail

QUIET=0
[ "${1:-}" = "--quiet" ] && QUIET=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

say()  { [ "$QUIET" -eq 1 ] || printf '%s\n' "$*"; }
line() { [ "$QUIET" -eq 1 ] || printf '  %-22s %-18s %s\n' "$1" "$2" "$3"; }

# --- configuration ----------------------------------------------------------
# Same resolution order as paintbrush.sh: next to the launcher first, then home.
if [ -f "$SCRIPT_DIR/../paintbrush/.paintbrush.env" ]; then
    ENV_FILE="$SCRIPT_DIR/../paintbrush/.paintbrush.env"
else
    ENV_FILE="$HOME/.paintbrush.env"
fi

if [ ! -f "$ENV_FILE" ]; then
    say "No launcher config found, so there is nothing to check against."
    exit 2
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE" || { say "Could not read $ENV_FILE."; exit 2; }
set +a

# Tilde in a sourced value is literal, so expand it before use.
FACTS_KEY="${FACTS_KEY:-}"
FACTS_KEY="${FACTS_KEY/#\~/$HOME}"
FACTS_TARGET="${FACTS_TARGET:-${SSH_TARGET:-}}"
SITE_PATH="${SITE_PATH:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

if [ -z "$FACTS_KEY" ] || [ -z "$FACTS_TARGET" ]; then
    say "The fact-sheet key is not set up yet (FACTS_KEY in $ENV_FILE)."
    say "See scripts/server/paintbrush-facts for the server-side half."
    exit 2
fi

if [ ! -r "$FACTS_KEY" ]; then
    say "Fact-sheet key not readable: $FACTS_KEY"
    exit 2
fi

# --- ask the server ---------------------------------------------------------
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# PAINTBRUSH_FACTS_FILE replaces the server with a file holding the same
# output, so this script's comparisons can be exercised before the server-side
# half is installed, and afterwards without a round trip.
#
# -T for the same reason paintbrush.sh uses it: with no remote command of our
# own, ssh would ask for a PTY when stdin is a terminal, and a PTY mangles the
# output with CR line endings.
if [ -n "${PAINTBRUSH_FACTS_FILE:-}" ]; then
    cp "$PAINTBRUSH_FACTS_FILE" "$WORK/facts" 2>/dev/null \
        || { say "Could not read $PAINTBRUSH_FACTS_FILE."; exit 2; }
elif ! LC_ALL=C ssh -T \
        -i "$FACTS_KEY" \
        -o BatchMode=yes \
        -o ConnectTimeout=20 \
        "$FACTS_TARGET" >"$WORK/facts" 2>"$WORK/err"; then
    say "Could not ask the server for its versions."
    say "  target: $FACTS_TARGET"
    [ -s "$WORK/err" ] && say "  $(head -2 "$WORK/err" | tr '\n' ' ')"
    say "Is scripts/server/paintbrush-facts installed and pinned to this key?"
    exit 2
fi

fact() { sed -nE "s/^$1=(.*)/\1/p" "$WORK/facts" | head -1; }
minor() { printf '%s' "$1" | grep -oE '^[0-9]+\.[0-9]+'; }

prod_php="$(fact php)"
prod_mysqld="$(fact mysqld)"
prod_os="$(fact os)"

if [ -z "$prod_php" ] && [ -z "$prod_mysqld" ]; then
    say "The server answered, but not with a fact sheet. Is the forced command"
    say "pointing at scripts/server/paintbrush-facts?"
    exit 2
fi

# --- what this Mac has ------------------------------------------------------
local_php="none"
command -v php >/dev/null 2>&1 && \
    local_php="$(php -r 'echo PHP_VERSION;' 2>/dev/null || echo none)"

local_mysqld="none"
command -v mysqld >/dev/null 2>&1 && \
    local_mysqld="$(mysqld --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
[ -n "$local_mysqld" ] || local_mysqld="none"

DRIFT=0
VERSION_DRIFT=0
KEY_DRIFT=0
NOTES=()

say ""
say "  Comparing this Mac with ${prod_os:-the live server}"
say ""
line "" "live server" "this Mac"

if [ "$(minor "$prod_php")" = "$(minor "$local_php")" ]; then
    line "PHP" "$prod_php" "$local_php  ✓"
else
    line "PHP" "$prod_php" "$local_php  ✗ different"
    DRIFT=1; VERSION_DRIFT=1
fi

if [ "$(minor "$prod_mysqld")" = "$(minor "$local_mysqld")" ]; then
    line "MySQL" "$prod_mysqld" "$local_mysqld  ✓"
else
    line "MySQL" "$prod_mysqld" "$local_mysqld  ✗ different"
    DRIFT=1; VERSION_DRIFT=1
fi

# --- PHP extensions ---------------------------------------------------------
# A note rather than drift: production loads things a practice site has no use
# for (opcache, apcu), and only a missing one that the site actually uses
# matters. Reported so it can be judged.
prod_ext="$(fact php_extensions)"
if [ -n "$prod_ext" ] && [ "$local_php" != "none" ]; then
    printf '%s' "$prod_ext" | tr ',' '\n' | tr '[:upper:]' '[:lower:]' | sort -u >"$WORK/prod_ext"
    php -r 'echo implode("\n", get_loaded_extensions());' 2>/dev/null \
        | tr '[:upper:]' '[:lower:]' | sort -u >"$WORK/local_ext"
    missing_ext="$(comm -23 "$WORK/prod_ext" "$WORK/local_ext" | tr '\n' ' ')"
    [ -n "${missing_ext// /}" ] && NOTES=( ${NOTES+"${NOTES[@]}"} "PHP extensions the server has and this Mac does not: ${missing_ext% }" )
fi

# --- setting names ----------------------------------------------------------
sed -nE 's/^env_key=(.*)/\1/p' "$WORK/facts" | sort -u >"$WORK/prod_keys"

keys_of() {
    [ -r "$1" ] || return 1
    sed -nE 's/^[[:space:]]*([A-Za-z_][A-Za-z_0-9]*)[[:space:]]*=.*/\1/p' "$1" | sort -u
}

if [ -s "$WORK/prod_keys" ]; then
    say ""
    for target in ".env:this Mac's practice settings" ".env.example:the committed template"; do
        file="${target%%:*}"
        label="${target#*:}"
        if keys_of "$SITE_PATH/$file" >"$WORK/have"; then
            missing="$(comm -23 "$WORK/prod_keys" "$WORK/have" | tr '\n' ' ')"
            if [ -n "${missing// /}" ]; then
                say "  ✗ missing from $label: ${missing% }"
                DRIFT=1; KEY_DRIFT=1
            else
                say "  ✓ nothing missing from $label"
            fi
        else
            say "  ✗ could not read $SITE_PATH/$file"
            DRIFT=1; KEY_DRIFT=1
        fi
    done
else
    NOTES=( ${NOTES+"${NOTES[@]}"} "The server did not report its setting names (is its .env readable by that key's user?)" )
fi

# --- result -----------------------------------------------------------------
if [ "${#NOTES[@]}" -gt 0 ]; then
    say ""
    for n in ${NOTES+"${NOTES[@]}"}; do say "  note: $n"; done
fi

say ""
if [ "$DRIFT" -eq 0 ]; then
    say "  Everything matches."
    [ "$QUIET" -eq 1 ] && printf 'practice site matches the live server (PHP %s, MySQL %s)\n' "$prod_php" "$prod_mysqld"
    exit 0
fi

if [ "$VERSION_DRIFT" -eq 1 ]; then
    say "  To match the versions:"
    say "    bash scripts/mac/mac-match-prod.sh --php $(minor "$prod_php") --mysql $(minor "$prod_mysqld") --apply"
    say "  Quit Paintbrush first. MySQL will not open a data folder written by a"
    say "  newer version, so that script moves the old one aside — safe here,"
    say "  since the practice database is rebuilt on every launch."
fi
if [ "$KEY_DRIFT" -eq 1 ]; then
    say "  Add the missing settings to .env (this Mac) and .env.example (committed),"
    say "  with a value that suits a practice site — never production's own."
fi
say ""
if [ "$QUIET" -eq 1 ]; then
    printf 'practice site differs from the live server (server: PHP %s, MySQL %s — this Mac: PHP %s, MySQL %s)\n' \
        "$prod_php" "$prod_mysqld" "$local_php" "$local_mysqld"
fi
exit 1
