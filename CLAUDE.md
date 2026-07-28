# CLAUDE.md

This is the website for the artist Ambar Velasco (ambarvelasco.com).

**Hi Ambar — the first part of this file is written for you.** It explains how
we work together. The second half is technical notes I keep for myself; you can
ignore all of it.

---

# Working with Ambar

## How to talk to me

Just say what you want in plain words — "make the titles bigger," "the menu
looks cramped on my phone," "can we add a page for the new series." You never
need to know the technical name for anything, and you never need to type
commands. I do all of that part myself.

If I ever say something confusing, tell me and I'll say it again more simply.
Nothing you can say to me is a wrong way to ask.

**Rules for me, not for her:** Do the terminal and git work myself. Never hand
Ambar a command to run or a file path to open. Explain in everyday language —
no jargon, no acronyms, and no assuming she knows what a branch, a commit, a
server, or a database is. Be warm, patient, and unhurried.

## The two websites

There are two copies of your site, and keeping them straight is the most
important idea here.

**Your practice site** lives on your laptop. It's yours to play in. You can try
anything — change colours, move things around, make a mess — and no visitor
will ever see it. It's opened by the app you double-click, and it copies the
real site's paintings so it looks exactly like the real thing.

**The real site** is the one at ambarvelasco.com that visitors see.

You always work on the practice site. **Nothing you change reaches the real
site until you tell me to put it there.** Not by accident, not while you sleep,
not because you tried something bold. Only when you say so, in words like:

> "Put it live."
> "Make the real website look like this."

Until you say something like that, everything stays on your laptop.

## What lives where

This trips people up, so here it is plainly:

- **Your paintings, projects, descriptions, and shop items** are added and
  edited on the *real* site, through your admin page — the same way you always
  have. That's the only place they live.
- **How the site looks and behaves** — colours, spacing, layout, new
  features — is what you and I change together on the practice site.

So if you want to add a painting, do it in your admin page as usual. If you
want the paintings to be *displayed differently*, that's me.

**Rules for me, not for her:** Never add, edit, or delete artwork, project, or
shop content in the local database as a way of doing her content work. Content
is production-only, managed through the live admin panel. Local content changes
exist only as scratch data that the next refresh overwrites.

## When you want to see how something looks

Your practice site copies the paintings from the real site, but that copy was
made whenever the app last started. If you've added paintings since then, the
practice site won't know about them yet.

So before showing you anything, I'll usually offer to freshen it up, and I'll
tell you I'm doing it:

> "Let me grab your latest paintings first so this looks current."

That takes a few seconds and pulls down a fresh copy of your paintings and
images. It only ever *reads* from the real site — it can't change anything
there.

**Rules for me, not for her:** Offer the refresh before any visual preview, and
say so visibly rather than doing it silently. Refresh with the data steps only
(below) — do **not** re-run the full launcher mid-session, because it opens a
second browser window and a second Claude Code session, which is confusing.

```bash
cd ~/local_ambsite_startup_app && set -a && . .paintbrush.env && set +a && \
  ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=20 "$SSH_TARGET" | mysql "$LOCAL_DB" && \
  for d in $IMAGE_DIRS; do \
    rsync -rt --partial -e "ssh -i $IMAGE_SYNC_KEY -o BatchMode=yes" \
      "$IMAGE_SYNC_TARGET:${IMAGE_REMOTE_BASE}$d/" "$WEB_ROOT/$d/"; \
  done
```

Both SSH keys are restricted server-side to read-only forced commands, so this
cannot write to production even by mistake.

## Your practice site is probably already running

You start it by double-clicking the **Paintbrush** app, which is usually how
you got here — so by the time we're talking, it's almost certainly already up
and running at `localhost:8000`.

If I need to look at your site, I'll just use the one that's already open.

**Rules for me, not for her:** Check whether port 8000 is already serving
before starting anything. If it is, use it — do not start a second PHP server,
and do not restart hers. Check with:

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
```

The launcher lives at `~/local_ambsite_startup_app/` (its own git repo). The
local practice database is `ambar_site_local`, and it is a scratch copy that is
wiped and rebuilt on every launch — never treat it as a source of truth.

## The one thing the app asks you

The first time you talk to me each day, a box may pop up asking whether it's
okay for me to work on your site folder.

**That's normal — just click yes.** It's only asking permission to look at your
own website files. It appears once per session and then leaves you alone.

## Putting changes live

When you're happy with something, just tell me in whatever words come
naturally — "put it live," "make the real site look like this," "okay, ship
it," "let's do it for real." You don't need a magic phrase. I'll understand,
and I'll get on with it rather than asking you to confirm all over again.

Then:

1. I'll tell you plainly what's going live, in your words, not mine.
2. I send it to the real site.
3. A minute or two later it's live, and I'll tell you it worked.

If something looks wrong afterwards, say so. Every version of the *design* is
saved, so I can put the look of the site back the way it was — that's why you
should feel free to experiment here.

(Deleting a painting in your admin portal is a different matter — that one is
permanent, and I can't undo it.)

**Rules for me, not for her:**

- Recognise the intent to deploy from ordinary phrasing and act on it. Do not
  make her repeat herself or answer a confirmation prompt — she has already
  said what she wants.
- Where it is genuinely unclear whether she means "show me" or "make it real,"
  ask — but ask because it is ambiguous, not as a ritual. "Make it look nicer"
  is a request to change something, not to deploy it.
- Say what is going live before it goes, and report the outcome after. Never
  deploy silently.
- Commit locally as often as useful. Before pushing, verify the change on the
  practice site yourself — load it and look at it. There are no automated tests;
  CI runs `php -l` only, which catches typos, not mistakes.
- Confirm the deploy actually landed rather than assuming it did.
- Deploying is routine. Anything genuinely irreversible — deleting production
  data, force-pushing, rewriting history — is not, and still warrants stopping
  to ask.

## Hard limits

These I will not cross, even if asked in the moment:

- Nothing on your laptop is ever written back to the real site's data. The
  practice site only ever reads.
- No command that could delete or damage the real site's paintings, projects,
  or email list.
- Nothing goes live without you saying so first.

**Rules for me, not for her:** No writes to the production database under any
circumstances — no `DROP`, `TRUNCATE`, `DELETE`, or schema changes anywhere,
local or remote. The image directories under `html/` are **excluded from
deploys** and are not kept in git, so local images never reach production.

---

# Technical notes (Ambar: you can stop reading here)

Plain PHP + MySQL backend, jQuery/Bootstrap 4 frontend. No framework, no build
step, no package manager, no automated tests — verify changes by loading the
site.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`: a `php -l` lint gate
across all PHP files, then `rsync --delete` to the droplet. The rsync excludes
`.env`, `CLAUDE.md`, `.github/`, `ambOldSite/`, keys, and every image directory
(`html/img/`, `imgMid/`, `thumbnails/`, `baseImages/`, `sslStuff/`) — so local
images and local config can never overwrite production. `--delete` means an
empty `DEPLOY_PATH` would be destructive; the workflow guards against that.

## Artwork images are not in git

`html/img/`, `imgMid/`, `thumbnails/`, and `baseImages/` are gitignored and
untracked. Artwork is uploaded through the live admin portal and lives on the
server; `paintbrush.sh` pulls read-only copies down purely so the practice site
looks real. Refreshing therefore no longer dirties `git status`.

`html/miscIcons/` **is** tracked — those are design assets that ship with the
code, and it is the one image directory the deploy rsync does not exclude.

Consequences worth remembering: git holds no backup of artwork images (the
server and Ambar's originals are the only copies), and a new image needed for
the *design* rather than the catalogue must go in `miscIcons/` or it will never
reach production.

## How the site works

`html/` is the web root. The public site is a single shell page
([html/index.php](html/index.php)) — `.htaccess` rewrites all non-file URLs to
it. All visible content (nav links, galleries, projects, about, shop) is
fetched by JavaScript from the JSON endpoints in `html/actions/` and injected
into the DOM. **So most "page content" HTML lives in JS string templates in
`html/js/`, not in PHP files.**

| Area | Files |
|---|---|
| Public site shell | `html/index.php`, `html/ambar.css` (the only stylesheet) |
| Frontend logic | `html/js/photoFunctions.js` (galleries, modal, layout), `js/navLinksFunctions.js` (navbar, newsletter), `js/aboutMe.js`, `js/shopFunctions.js` |
| JSON APIs | `html/actions/*API.php` — one per feature (pictures, projects, navLinks, newsletter, shop, aboutMe, sidebar) |
| Admin CMS | `html/admin/*.php` + matching `html/js/*Admin*.js` — Ambar manages artworks, projects, nav links, newsletter, shop through these pages |
| Auth | `html/signIn/` — session-based; admin pages check `$_SESSION["ambar"] === "connected"`; `login_attempts` table rate-limits |
| DB connection | `html/database/pdo.php` — loads `.env` from project root, exposes global `$conn` (PDO) and `env()` helper. Every entry point `include`s it. |
| Images | `html/img/` (full size), `imgMid/`, `thumbnails/`, `baseImages/`, `miscIcons/`. Uploads are resized/converted by `actions/imageManipulationFunctions.php`. |

The local `.env` points at the scratch database `ambar_site_local`; production
credentials live in a separate `.env` on the server and are deliberately not on
this Mac.

## Database tables

`allWorks` (artworks: fileLocation, name, desc2/desc3, medium, year, visible,
isSelectWork, carousel, orderOfDisplay…), `projects`, `worksInProjects`
(join table), `navLinks`, `newsletterEmailList`, `shopItems`, `aboutMe`,
`users`, `login_attempts`, `admin_last_visit`.

## Quirks to know before editing

- **`picturesAPI.php` overloads the `theYear` GET param** — it can be a year,
  `'stats'`, `'everything'`, `'invisible'`, `'Select Works'`, or a medium name
  like `'Fixed Motion'`. A chain of hardcoded `if` blocks maps each value to a
  SQL WHERE clause.
- **Responsive layout is done in JavaScript, not media queries.**
  `setupResponsiveLayout()` in `photoFunctions.js` swaps class names on resize
  at a 992px breakpoint (e.g. `navLinksBox` ↔ `navLinksBoxMobile`). Most
  layout classes therefore exist in desktop + `...Mobile` pairs in `ambar.css`,
  and a CSS change usually needs to touch both variants.
- Some legacy class/id names are whimsical (`whiteForTheTopMaybe`,
  `holdForNow`, `sideBySide`). Rename only with a full grep across PHP, JS,
  and CSS — they're referenced from all three.
- API responses are inconsistent: some endpoints return bare JSON arrays,
  others `{status, data}` wrappers. Match whatever the consuming JS expects.
- Query results are often read by numeric column index (`$result[$i][3]`), so
  reordering columns in a SELECT silently breaks the JSON output.
- jQuery comes from the Google CDN (3.7.0) in `index.php`; the vendored
  `js/jquery-3.6.0.js` is used by some admin pages. Bootstrap 4.5.2 via CDN.
- `html/oldCode.txt` is dead code kept for reference; ignore it.

## Conventions

- Match the existing style: plain PHP with `include`, prepared PDO statements,
  jQuery `$.ajax` calls. Don't introduce frameworks, build tools, or composer
  dependencies without being asked.
- Content changes (artworks, projects, nav links, newsletter) go through the
  live admin panel — they don't need code changes. Code changes are for design,
  behavior, and new features.
- Secrets live in `.env` (never committed). `APP_ENV` controls whether errors
  are displayed (`production` hides them).
