#!/usr/bin/env bash
#
# Bring a MAC's own PHP and MySQL (installed with Homebrew) up to the same
# major.minor versions the live server runs. For the Paintbrush practice site,
# which uses PHP and MySQL installed on the Mac itself (not Docker).
#
# Meant to be run by hand, once every few years, by whoever looks after the
# technical side. It is NOT part of Paintbrush and Ambar never needs it.
#
# What it does
#   1. Finds out which PHP and MySQL the live server runs (over SSH, read-only:
#      it only asks `php -v` and `mysql --version`) -- or you tell it.
#   2. Shows what this Mac has now and what it plans to change.
#   3. With --apply: installs/upgrades the matching Homebrew PHP and MySQL,
#      switches the Mac to them, and checks they work.
#
# By default it only SHOWS the plan and changes nothing.
#
# Usage
#   bash mac-match-prod.sh --ssh amb-droplet            # show the plan
#   bash mac-match-prod.sh --ssh amb-droplet --apply    # do it
#   bash mac-match-prod.sh --php 8.5 --mysql 8.4        # no SSH: say the versions
#
# --ssh needs an SSH login that can run ordinary commands on the server (your
# own admin one). The read-only keys Paintbrush uses are locked to a single
# command and won't work for this -- use --php/--mysql instead in that case.
#
# Quit Paintbrush (and its browser window) before using --apply.
#
# The practice database is a scratch copy that Paintbrush rebuilds on every
# launch, so nothing of value is in the Mac's MySQL. If MySQL won't start
# after the switch (it can't open a data folder written by a NEWER version),
# the script tells you the one command that moves the old folder aside; it
# never deletes anything.
#
# Written for the bash 3.2 that ships with macOS.

set -euo pipefail

APPLY=0
YES=0
SSH_HOST=""
PHP_WANT=""
MYSQL_WANT=""

say()  { printf '%s\n' "$*"; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --apply) APPLY=1 ;;
    --yes)   YES=1 ;;
    --ssh)   SSH_HOST="${2:-}"; shift ;;
    --php)   PHP_WANT="${2:-}"; shift ;;
    --mysql) MYSQL_WANT="${2:-}"; shift ;;
    -h|--help) sed -n '2,38p' "$0"; exit 0 ;;
    *) die "Unknown option: $1 (try --help)" ;;
  esac
  shift
done

[ "$(uname -s)" = "Darwin" ] || die "This is for a Mac. (On Windows the Docker sync already does this.)"
command -v brew >/dev/null 2>&1 || die "Homebrew isn't installed (https://brew.sh). Install it first."

# --- what does the live server run? ------------------------------------------
if [ -n "$SSH_HOST" ]; then
  say "==> Asking $SSH_HOST which PHP and MySQL it runs (read-only) ..."
  REMOTE_OUT="$(ssh -o BatchMode=yes -o ConnectTimeout=20 "$SSH_HOST" \
    'php -r "echo PHP_MAJOR_VERSION.\".\".PHP_MINOR_VERSION, \"\n\";"; mysql --version' 2>/dev/null)" \
    || die "Couldn't ask the server. Check the SSH name, or pass --php and --mysql instead."
  PHP_WANT="$(printf '%s\n' "$REMOTE_OUT" | sed -n '1p')"
  if printf '%s' "$REMOTE_OUT" | grep -qi mariadb; then
    die "The server runs MariaDB, which this script doesn't handle."
  fi
  MYSQL_WANT="$(printf '%s\n' "$REMOTE_OUT" | sed -n '2,$p' \
    | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 | cut -d. -f1,2)"
fi

printf '%s' "$PHP_WANT"   | grep -qE '^[0-9]+\.[0-9]+$' || die "Need the PHP version as X.Y (use --ssh HOST, or --php 8.5)."
printf '%s' "$MYSQL_WANT" | grep -qE '^[0-9]+\.[0-9]+$' || die "Need the MySQL version as X.Y (use --ssh HOST, or --mysql 8.4)."

# --- what does this Mac have now? --------------------------------------------
PHP_HAVE="none"
command -v php >/dev/null 2>&1 && PHP_HAVE="$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;' 2>/dev/null || echo none)"
MYSQL_HAVE="none"
if command -v mysql >/dev/null 2>&1; then
  MYSQL_HAVE="$(mysql --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 | cut -d. -f1,2 || true)"
  [ -n "$MYSQL_HAVE" ] || MYSQL_HAVE="none"
fi

# --- which Homebrew package gives that version? ------------------------------
# The plain name ("php", "mysql") is the newest release; older ones are
# "php@8.4", "mysql@8.4". Pick whichever matches.
pick_formula() {
  local base="$1" want="$2" latest
  latest="$(brew info --formula "$base" 2>/dev/null | head -1 \
    | sed -nE 's/.*stable ([0-9]+\.[0-9]+).*/\1/p')"
  if [ "$latest" = "$want" ]; then
    printf '%s' "$base"
  elif brew info --formula "$base@$want" >/dev/null 2>&1; then
    printf '%s' "$base@$want"
  else
    die "Homebrew has no $base for version $want yet. Check again in a few weeks, or ask for help."
  fi
}

say "==> Asking Homebrew which packages match ..."
PHP_FORMULA="$(pick_formula php "$PHP_WANT")"
MYSQL_FORMULA="$(pick_formula mysql "$MYSQL_WANT")"

say ""
say "                 live server    this Mac now    Homebrew package"
printf '  PHP            %-14s %-15s %s\n' "$PHP_WANT" "$PHP_HAVE" "$PHP_FORMULA"
printf '  MySQL          %-14s %-15s %s\n' "$MYSQL_WANT" "$MYSQL_HAVE" "$MYSQL_FORMULA"
say ""

if [ "$PHP_HAVE" = "$PHP_WANT" ] && [ "$MYSQL_HAVE" = "$MYSQL_WANT" ] && [ "$APPLY" = 0 ]; then
  say "Already matching on version. (Run with --apply to also pick up the newest patch release.)"
  exit 0
fi

if [ "$APPLY" = 0 ]; then
  say "That was a preview; nothing was changed. Run again with --apply to do it."
  exit 0
fi

# --- do it -------------------------------------------------------------------
if pgrep -x mysqld >/dev/null 2>&1 || pgrep -f 'php -S' >/dev/null 2>&1; then
  say "MySQL or the PHP test server looks to be running (is Paintbrush open?)."
  say "Quit Paintbrush first so nothing is using them."
  if [ "$YES" = 0 ]; then
    printf 'Carry on anyway? [y/N] '; read -r a; [ "$a" = "y" ] || [ "$a" = "Y" ] || die "Stopped; nothing changed."
  fi
elif [ "$YES" = 0 ]; then
  printf 'Install/upgrade %s and %s now? [y/N] ' "$PHP_FORMULA" "$MYSQL_FORMULA"
  read -r a; [ "$a" = "y" ] || [ "$a" = "Y" ] || die "Stopped; nothing changed."
fi

install_or_upgrade() {
  if brew list --formula "$1" >/dev/null 2>&1; then
    say "==> Upgrading $1 ..."; brew upgrade "$1" || true
  else
    say "==> Installing $1 ..."; brew install "$1"
  fi
}

say "==> Updating Homebrew's list of packages ..."
brew update

# PHP
install_or_upgrade "$PHP_FORMULA"
for f in $(brew list --formula | grep -E '^php(@|$)' || true); do
  [ "$f" = "$PHP_FORMULA" ] || brew unlink "$f" >/dev/null 2>&1 || true
done
brew link --overwrite --force "$PHP_FORMULA"

# MySQL. Installing comes FIRST, while the old server is still serving. An
# install can fail for reasons that have nothing to do with this Mac's MySQL --
# no bottle for this macOS, no compiler, no network -- and stopping the server
# before finding that out leaves the practice site with no database at all,
# until somebody notices and starts it again. That happened once.
install_or_upgrade "$MYSQL_FORMULA"

# Past this point the old server is being taken away. A failure in the window
# between stopping it and linking the new one would leave the Mac with no
# MySQL linked and none running, so that window gets a safety net.
MYSQL_WAS=""
MYSQL_SWITCHED=0

rescue_mysql() {
  [ "$MYSQL_SWITCHED" = 1 ] && return 0
  [ -n "$MYSQL_WAS" ] || return 0
  say ""
  say "Stopped partway through the switch, so putting $MYSQL_WAS back ..."
  brew link --overwrite --force "$MYSQL_WAS" >/dev/null 2>&1 || true
  brew services start "$MYSQL_WAS" >/dev/null 2>&1 || true
  say "The practice site should have its database again. Nothing was deleted;"
  say "run this again when you know why it stopped."
}
trap rescue_mysql EXIT

for s in $(brew services list 2>/dev/null | awk '$1 ~ /^mysql/ && $2 == "started" {print $1}'); do
  MYSQL_WAS="$s"
  say "==> Stopping $s ..."; brew services stop "$s" || true
done
for f in $(brew list --formula | grep -E '^mysql(@|$)' || true); do
  [ "$f" = "$MYSQL_FORMULA" ] || brew unlink "$f" >/dev/null 2>&1 || true
done
brew link --overwrite --force "$MYSQL_FORMULA"

# The switch itself is done. Whether the new server then starts is a separate
# matter, handled at the end -- a data folder written by a newer MySQL is a
# known case with its own advice, and rolling back there would undo exactly
# what was asked for.
MYSQL_SWITCHED=1

# --- check it worked ---------------------------------------------------------
hash -r
PHP_BIN="$(brew --prefix "$PHP_FORMULA")/bin/php"
MYSQL_PREFIX="$(brew --prefix "$MYSQL_FORMULA")"

say "==> Checking PHP ..."
"$PHP_BIN" -v | head -1
MISSING=""
for ext in gd pdo_mysql mysqli mbstring; do
  "$PHP_BIN" -m | grep -qix "$ext" || MISSING="$MISSING $ext"
done
[ -z "$MISSING" ] || say "WARNING: this PHP is missing:$MISSING"

say "==> Starting MySQL ..."
brew services start "$MYSQL_FORMULA" >/dev/null
UP=0
for _ in $(seq 1 30); do
  if "$MYSQL_PREFIX/bin/mysqladmin" ping >/dev/null 2>&1; then UP=1; break; fi
  sleep 1
done

if [ "$UP" = 1 ]; then
  "$MYSQL_PREFIX/bin/mysql" --version
  say ""
  say "Done. PHP $PHP_WANT and MySQL $MYSQL_WANT are in place. Open Paintbrush to test."
  say "(If a Terminal window already open still shows the old version, open a new one.)"
else
  DATADIR="$(brew --prefix)/var/mysql"
  say ""
  say "MySQL did not start. The usual cause is a data folder written by a newer version"
  say "than the one just installed. The practice database is rebuilt by Paintbrush, so it"
  say "is safe to move the old one aside (this renames it, nothing is deleted):"
  say ""
  say "  brew services stop $MYSQL_FORMULA && mv \"$DATADIR\" \"$DATADIR.old-\$(date +%Y%m%d)\" && brew services start $MYSQL_FORMULA"
  say ""
  say "Then open Paintbrush; it will recreate the practice database. The error log is in $DATADIR.*"
  exit 1
fi
