# Paintbrush

A one-click launcher that spins up a **local practice copy** of a PHP/MySQL
site, so you can experiment freely without ever touching production.

Double-clicking `Paintbrush.app`:

1. Starts local MySQL (no-op if it is already running).
2. Pulls a fresh **read-only** dump of the production database and loads it
   into a local scratch database.
3. Mirrors the artwork image directories down from the server, so images
   uploaded through the live admin panel appear locally too.
4. Starts a PHP dev server on `localhost:$PORT`, unless something is already
   serving there.
5. Opens the practice site in the browser.
6. Opens Claude Code on the project folder, last, so it lands in front.

The server is started detached, so it keeps running after the app exits.

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
./build_app.sh
```

`.paintbrush.env` sits next to the script and is gitignored. The script falls
back to `~/.paintbrush.env` if there is no local one.

Run `./paintbrush.sh` directly to see the output in a terminal. When launched
from the `.app`, everything is logged to `~/Library/Logs/paintbrush.log` and
fatal errors are surfaced as a dialog.

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

## Notes

- The local database is **overwritten on every run**. Point `LOCAL_DB` at a
  scratch database, never at anything you care about.
- `WEB_ROOT` defaults to `$SITE_PATH/html`. Set it explicitly if your web root
  is the project root or is named something else.
- The `.app` is a thin stub that calls `paintbrush.sh` by absolute path, so
  edits to the script take effect immediately — no rebuild needed. Rebuild
  only if you move the repo or change the icon.
