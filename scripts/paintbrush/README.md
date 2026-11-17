# Paintbrush

A one-click launcher that spins up a **local practice copy** of a PHP/MySQL
site, so you can experiment freely without ever touching production.

Double-clicking `Paintbrush.app` opens a Terminal window showing a progress
bar, a tick per finished step, and the live log, then:

1. Starts local MySQL (no-op if it is already running).
2. Pulls a fresh **read-only** dump of the production database and loads it
   into a local scratch database.
3. Mirrors the artwork image directories down from the server, so images
   uploaded through the live admin panel appear locally too.
4. Starts a PHP dev server on `localhost:$PORT`, unless something is already
   serving there.
5. Opens the practice site in the browser.
6. Opens Claude Code on the project folder, last, so it lands in front.

The server is started detached, so it keeps running after the app exits — and
after the progress window is closed.

## The progress window

The launch takes around twenty seconds, nearly all of it network: the database
dump and the four image syncs. The app used to run with no interface at all, so
that was twenty seconds of nothing happening, which looks exactly like a
launcher that does not work — and invites a second double-click.

So the `.app` hands the script to Terminal instead of running it headless:

```
  Paintbrush — starting your practice site

  [███████████░░░░░░░░░░░]  3/6

  ✓ MySQL is up
  ✓ Data refreshed (10 tables)
  ✓ Images up to date (619 files)
  ⟳ Starting the web server...

  21:34:57    imgMid: up to date (67 files)
  21:35:00    thumbnails: up to date (247 files)
  21:35:05    baseImages: up to date (251 files)
```

Every noisy sub-command already redirects to the log file, so stdout carries
nothing but `log()` output and the screen can be redrawn on each update.

The window is safe to close as soon as the site opens; the PHP server is
detached and keeps serving. It stays open rather than closing itself, so a
failure is still on screen afterwards.

The dashboard only appears when stdout is a terminal. Piped, scripted, or run
with `PAINTBRUSH_PLAIN=1`, the script falls back to the plain timestamped lines
that the log file gets either way:

```bash
PAINTBRUSH_PLAIN=1 ./paintbrush.sh
```

## Security model

- **No secrets anywhere in this repo.** Nothing here needs a password.
- The production dump is authorised by an SSH key that is restricted
  *server-side* to a forced command producing only a `mysqldump`. The key
  cannot open a shell, and the launcher sends no remote command of its own.
- Local MySQL credentials come from `~/.my.cnf`, never from the command line
  (where they would be visible to any user running `ps`).
- Machine-specific paths and hostnames live in `.paintbrush.env`, which is
  gitignored. `paintbrush.env.example` documents the keys with placeholders.

## Setup

```bash
cp paintbrush.env.example .paintbrush.env
chmod 600 .paintbrush.env
# edit .paintbrush.env with the real values
./build_app.sh ~/Applications
```

`.paintbrush.env` sits next to the script and is gitignored. The script falls
back to `~/.paintbrush.env` if there is no local one.

`build_app.sh` takes the output directory as its argument and defaults to this
repo. Pass `~/Applications` as above: the bundle belongs there rather than in
`/Applications`, since it is unsigned and hardcodes a path inside this user's
home directory, and rather than in the repo, where it is gitignored build
output. Keep exactly one bundle — every copy declares the same
`CFBundleIdentifier`, so duplicates leave LaunchServices to pick a winner and
you cannot tell which one you launched. For Desktop or Dock access, make an
alias to the single bundle instead of copying it.

Run `./paintbrush.sh` directly for the same progress window in the terminal you
are already in. Either way everything is appended to
`~/Library/Logs/paintbrush.log`, and fatal errors are surfaced both on screen
and as a dialog — the dialog stays because the window can end up behind others.

## What a launch resets, and what it never touches

|              | On every launch                                       | Recoverable                |
| ------------ | ----------------------------------------------------- | -------------------------- |
| **Database** | every table dropped and rebuilt from production        | yes — backed up first      |
| **Images**   | production copies written over local ones, none deleted | local-only files always kept |
| **Code**     | **never touched**                                     | git                         |

The launcher syncs four image directories and nothing else. No PHP, HTML, CSS
or JavaScript is ever transferred, so the site's code is whatever is on disk
and in git — the practice site cannot overwrite it.

The database is the destructive part. The production dump opens with
`DROP TABLE IF EXISTS` for every table, so a launch wipes anything done in the
local database, including work through the practice site's own admin page. That
reset is the point of a practice copy, but it is not allowed to be permanent:
before loading, the current database is dumped to

```
~/Library/Application Support/Paintbrush/db-backups/
```

as `<database>-YYYYMMDD-HHMMSS.sql`. The five most recent are kept (about 2 MB
in total) and older ones are pruned. To restore one:

```bash
mysql ambar_site_local < ~/Library/Application\ Support/Paintbrush/db-backups/ambar_site_local-20260727-220119.sql
```

The backup is non-fatal at every step: there is nothing to save on a first run,
and a backup that fails logs a warning and lets the site start anyway. A dump
that fails halfway is deleted rather than left looking like a usable backup.

## Image sync: required server-side setup

The database dump carries rows, not files. Artwork uploaded through the live
admin panel lives on the server's disk, so without this step those pieces show
up locally as broken images.

**This needs a second SSH key.** The dump key is pinned to a forced command
that only ever runs `mysqldump`, so rsync cannot travel over it — attempting it
fails with an rsync protocol error as the SQL dump arrives where rsync expected
its own protocol. Until the key below exists, the launcher logs a note and
skips the step; everything else still works.

**0. On the Mac** — install real rsync:

```bash
brew install rsync
```

Not optional. macOS ships Apple's **openrsync**, which reports itself as
"rsync version 2.6.9 compatible" (protocol 29) and speaks a legacy option
dialect that `rrsync` rejects outright — even a bare `-r` fails with
`invalid rsync-command syntax or options`. The launcher detects openrsync and
says so rather than emitting four confusing per-directory failures.

**1. On the Mac** — create the keypair:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/paintbrush_images -N "" -C "paintbrush read-only image sync"
```

**2. On the server** — make sure `rrsync` (restricted rsync, ships with rsync)
is available:

```bash
ls /usr/bin/rrsync || sudo gunzip -c /usr/share/doc/rsync/scripts/rrsync.gz | sudo tee /usr/bin/rrsync >/dev/null && sudo chmod +x /usr/bin/rrsync
```

**3. On the server** — add the *public* key to `~/.ssh/authorized_keys`, pinned
to a read-only forced command:

```
command="rrsync -ro /var/www/ambarvelasco.com/html",restrict ssh-ed25519 AAAA...paintbrush_images
```

`-ro` makes it read-only and `restrict` disables pty, port forwarding, agent
forwarding and X11. The key therefore cannot write to production, cannot open a
shell, and cannot read outside the web root — the same containment the dump key
has. Prefer a dedicated unprivileged user with read access to the image
directories over `root`; the forced command constrains either, but a
low-privilege account limits the blast radius if `rrsync` ever has a bug.

**4. On the Mac** — uncomment `IMAGE_SYNC_TARGET` in `.paintbrush.env` and
point it at that `user@host`. Verify before relying on it:

```bash
rsync -n -rt -e "ssh -i ~/.ssh/paintbrush_images" user@host:img/ /tmp/imgtest/
```

The sync is intentionally **non-fatal**: if it fails, the launcher warns, keeps
the images already present, and carries on opening the site. It also runs
without `--delete`, so a misconfigured remote path can never wipe local images.

## Fact sheet: optional server-side setup

The practice site has to run the same PHP and MySQL as production and hold the
same set of settings, or it is quietly testing something else. Keeping those
numbers written down in two places means they drift, so the Mac asks the server
instead.

**This needs a third SSH key**, restricted the same way as the other two. Until
it exists, `scripts/mac/check-against-prod.sh` says so and exits; nothing else
is affected.

**1. On the Mac** — create the keypair:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/paintbrush_facts -N "" -C "paintbrush read-only stack facts"
```

**2. On the server** — install the fact sheet:

```bash
sudo cp paintbrush-facts /usr/local/bin/paintbrush-facts && sudo chmod 755 /usr/local/bin/paintbrush-facts
```

The script is kept in the repo at `scripts/server/paintbrush-facts` and copied
across by hand. `/scripts/` is excluded from the deploy, so it is never
installed automatically.

**3. On the server** — add the *public* key to `~/.ssh/authorized_keys`, pinned
to it:

```
command="/usr/local/bin/paintbrush-facts",restrict ssh-ed25519 AAAA...paintbrush_facts
```

**4. On the Mac** — point `FACTS_KEY` at the private key in `.paintbrush.env`.
`FACTS_TARGET` defaults to `SSH_TARGET`.

Then:

```bash
bash scripts/mac/check-against-prod.sh
```

### Why this can hold no secrets

The forced command runs as its own user, so it *can* read production's `.env` —
which holds the live Stripe secret key, the webhook secret, the Resend key and
the database password. It prints only the left-hand side of each line, so a
setting's name can reach the Mac and its value cannot. The script is the
boundary, not the file permissions: anything added to it is readable by whoever
holds that key, on a laptop. Print facts, never secrets.

The checker can be exercised without the server — and the fact sheet's wording
checked before trusting it — by feeding it a saved copy:

```bash
PAINTBRUSH_FACTS_FILE=/tmp/facts bash scripts/mac/check-against-prod.sh
```

## Notes

- The local database is **overwritten on every run**. Point `LOCAL_DB` at a
  scratch database, never at anything you care about. It is backed up first —
  see below — but that is a safety net, not a reason to keep anything valuable
  there.
- `WEB_ROOT` defaults to `$SITE_PATH/html`. Set it explicitly if your web root
  is the project root or is named something else.
- The `.app` lives in `~/Applications`, with a Finder alias on the Desktop
  pointing at it. The alias tracks the bundle by file reference, so moving or
  renaming the app does not break it.
- The dump runs over `ssh -T`, and that flag matters. No remote command is
  passed (the forced command supplies it), so ssh treats the session as
  interactive and asks for a PTY the moment stdin is a terminal — which it is
  now that the launcher runs in a Terminal window. A PTY applies ONLCR
  translation, rewriting every `\n` in the dump as `\r\n` and piping corrupted
  SQL into `mysql`. This server refuses the PTY, so it survived on luck before
  `-T` was added. Both ssh calls also run under `LC_ALL=C`, so macOS stops
  forwarding `LC_CTYPE="UTF-8"` to a server whose perl lacks that locale.
- The `.app` stub drives Terminal over Apple Events, so the window gets a real
  title and a size that fits the dashboard. This costs a one-time **"Paintbrush
  wants to control Terminal"** prompt on the very first launch. Approving it is
  permanent — it is not per session or per day — though a rebuild that changes
  the stub (moving the repo rewrites the baked-in path) can make macOS ask
  again. If the Apple Event fails or is declined, the stub falls back to
  `open -a Terminal`, so a mis-click can never leave a launcher that appears to
  do nothing.
- The script also titles and sizes its own window with escape codes, which is
  what takes effect when you run `./paintbrush.sh` directly in an existing
  terminal.
- The `.app` is a thin stub that calls `paintbrush.sh` by absolute path, so
  edits to the script take effect immediately — no rebuild needed. Rebuild
  only if you move the repo or change the icon. Moving the repo is the one case
  that silently breaks the launcher: the stub keeps pointing at the old path.
  Rebuild with `./build_app.sh ~/Applications` after any such move.
