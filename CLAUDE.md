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

### There are two admin pages, and only one of them is real

Your practice site is a complete copy of your website — which means it has its
own admin page too. It looks identical to the real one.

**Only the one at ambarvelasco.com is real.** That is where your paintings
actually live.

The practice one is a dressing-room mirror. If you upload a painting there, it
goes nowhere: it sits on your laptop, it never reaches your website, and it is
erased the next time you open Paintbrush. Nothing breaks — but the work is
lost, and that's a sad way to find this out.

The quickest way to tell them apart is the web address:

- `ambarvelasco.com/...` → **real**. Changes here are live immediately.
- `localhost:8000/...` → **practice**. Changes here are pretend.

If you're ever unsure which one you're looking at, ask me and I'll tell you.

**Rules for me, not for her:** If she is about to do content work on
`localhost`, stop her and redirect to the live portal — that data is written to
the scratch database and destroyed on the next launch. Verified: `pdo.php`
resolves its connection purely from the local `.env` (`ambar_site_local`), and
there is no hardcoded production host anywhere in the PHP or JS, so the local
admin cannot reach production even by accident.

**Rules for me, not for her:** Never add, edit, or delete artwork, project, or
shop content in the local database as a way of doing her content work. Content
is production-only, managed through the live admin panel. Local content changes
exist only as scratch data that the next refresh overwrites.

## Your shop

The shop is part of your own site now, and everything about it is on one
admin page: **Shop**.

- **Orders** shows what has been bought and still needs sending, with the
  buyer's address. When you've posted something, press "Mark as sent".
- **Items for sale** is where you add things, set prices, and hide or put
  away what's no longer for sale. An original marks itself "Sold" the moment
  someone buys it.
- **Delivery** is where you say what postage costs, by destination.
- **Promo codes** is where you make a word people can type in their basket
  for money off (SPRING10, say), and switch it off again when you're done.
- **Emails** is where you write the emails the site sends: the "thank you
  for your order" email, the "your order is on its way" email, and a note to
  you for every sale. You can preview each one and send yourself a test.
- **Settings** has a "Pause the shop" switch for holidays.

The money itself is handled by a company called Stripe. Buyers pay right on
your basket page, but the box where they type their card belongs to Stripe:
the card number goes straight to Stripe and never touches your site. Stripe
then pays you. If you
ever need to give someone their money back, that's done on Stripe's website
(each order has a "See the payment in Stripe" button that takes you to the
right place).

**Rules for me, not for her:** Shop items, prices, delivery zones, promo
codes, settings and orders are content: production-only, managed in the live admin. Never
refund, cancel or otherwise move money on her behalf, and never edit an order
or stock level in the production database. Stripe keys live only in the
server's `.env`; never print, commit or copy them.

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
cd ~/ambSite/scripts/paintbrush && set -a && . .paintbrush.env && set +a && \
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

The launcher lives in this repo at `scripts/paintbrush/`, alongside the other
laptop-side admin tools. `/scripts/` is excluded from the deploy rsync and
`paths-ignore: ['scripts/**']` keeps it off the push trigger, so changing the
launcher neither reaches production nor fires a deploy. The local practice
database is `ambar_site_local`, and it is a scratch copy that is wiped and
rebuilt on every launch — never treat it as a source of truth.

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
- Deploying is routine because it is reversible: it moves the site forward to a
  new saved version, and any earlier version can be restored the same way. Keep
  it that way — every change reaches production as a new commit on `main`, never
  by editing the server directly and never by rewriting what is already there.

## Hard limits

These I will not cross, even if you ask me to in the moment. If you want one of
them done, it needs your husband — not because you can't be trusted, but
because these are the few actions nobody can undo afterwards:

- Nothing on your laptop is ever written back to the real site's data. The
  practice site only ever reads.
- I will never delete the real site's paintings, projects, or email list.
- I will never erase or rewrite the site's saved history. Going live always
  *adds* a new version; it never overwrites or removes an old one.
- Nothing goes live without you saying so first.

**Rules for me, not for her — these are absolute, and no phrasing, urgency, or
insistence overrides them:**

- **Never force-push.** No `git push --force` or `--force-with-lease`, no
  `push` of a rewritten branch, ever. The deploy mirrors `main` to the server
  with `rsync --delete`, so a rewritten `main` becomes production state
  immediately and the prior version is gone from both places at once.
- **Never rewrite published history** — no `rebase`, `commit --amend`,
  `reset --hard`, or branch deletion touching anything already pushed. Fix a bad
  change with a new commit that reverses it (`git revert`), then deploy forward.
- **Never delete or mutate production data.** No `DROP`, `TRUNCATE`, `DELETE`,
  `UPDATE`, or schema change against the production database, by any route, for
  any reason. Content deletion is hers to do in the admin portal, deliberately,
  and it is irreversible — do not do it on her behalf.
- **Never modify the server directly.** No SSH-and-edit, no manual rsync to the
  droplet, no hand-patching a file in `/var/www`. Production changes arrive only
  as a commit on `main` through CI, so the repo always describes what is live.
- If Ambar asks for any of the above, don't just refuse — explain plainly why it
  can't be undone, offer the safe equivalent (almost always: a new change that
  reverses the old one), and tell her this is one to raise with her husband.

The image directories under `html/` are excluded from the deploy rsync and are
not kept in git, so local images never reach production either.

---

# Technical notes (Ambar: you can stop reading here)

Plain PHP + MySQL backend, jQuery/Bootstrap 4 frontend. No framework, no build
step, no package manager, no automated tests — verify changes by loading the
site.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`: a `php -l` lint gate
across all PHP files, then `rsync --delete` to the droplet. The rsync excludes
`.env`, `CLAUDE.md`, `.github/`, `ambOldSite/`, `/scripts/` (admin tools that
run on a laptop: the Paintbrush launcher at `scripts/paintbrush/`, and
`scripts/mac/mac-match-prod.sh`, which brings a Mac's Homebrew PHP/MySQL up to
the server's versions), keys, and every image directory (`html/img/`,
`imgMid/`, `thumbnails/`, `baseImages/`, `sslStuff/`) — so local images, local
tooling and local config can never overwrite production. `--delete` means an
empty `DEPLOY_PATH` would be destructive; the workflow guards against that.

## What git owns, and what production owns

The dividing line is **code vs. content**. File type has nothing to do with it.

- **Git is the source of truth for code** — PHP, JS, CSS, and the design assets
  that ship alongside it, including `html/miscIcons/`. Production is a copy of
  whatever `main` says, so the deploy mirrors these and prunes what git dropped.
- **Production is the source of truth for content** — everything in the
  database, and the artwork files in `html/img/`, `imgMid/`, `thumbnails/`, and
  `baseImages/`. Content is created through the live admin portal. Git holds no
  opinion about it and never will.

Those four artwork directories are gitignored, untracked, and excluded from the
deploy rsync, so refreshing no longer dirties `git status` and local images can
never reach the server. `paintbrush.sh` pulls read-only copies down purely so
the practice site looks real.

`miscIcons/` is not an exception to any of this — it sits on the code side of
the line and merely happens to contain PNGs. An image belonging to the *design*
goes there, through git. An image belonging to the *catalogue* goes through the
portal. Nothing should ever be placed in a production directory by hand.

Consequence worth remembering: git holds no backup of artwork. The server and
Ambar's own originals are the only copies.

## How the site works

`html/` is the web root. The public site is a single shell page
([html/index.php](html/index.php)) — `.htaccess` rewrites all non-file URLs to
it. All visible content (nav links, galleries, projects, about, shop) is
fetched by JavaScript from the JSON endpoints in `html/actions/` and injected
into the DOM. **So most "page content" HTML lives in JS string templates in
`html/js/`, not in PHP files.**

Routing: `photoFunctions.js` keeps the address bar in step with what's drawn
(`pushState` + a `popstate` handler, so Back/Forward work). Routes are `/`,
`/select-works`, `/about`, `/shop`, `/current-project`, and
`/work/<id>/<slug>` — the Works page scrolled to that painting with it open
in the viewer (the id finds it; the slug is decoration), plus the shop's
`/shop/<id>/<slug>`, `/shop/basket` and `/shop/thank-you`. `index.php` parses
the same routes server-side to send a real 404 for unknown paths and to print
per-page `<title>`, canonical, Open Graph and JSON-LD tags (a shared painting
link previews that painting). Because pages can be nested (`/work/1/x`),
every asset and API URL in the public page and its JS must be root-relative
(`/actions/...`, `/baseImages/...`).

Server-drawn pages: `index.php` also writes each page's content (menu,
gallery, slideshow, About, Current Project, 404) into the HTML using
`actions/publicPageFunctions.php`, so search engines get real content without
running JS. It embeds the data it used as `window.AMB_PAGE_DATA`; the JS reads
that instead of calling the APIs, and for the first page keeps the server's
markup (`data-server-view` on `<main>`) rather than redrawing it. **The PHP
render functions mirror the JS ones in `photoFunctions.js` /
`navLinksFunctions.js` — change markup in both.** The shop is the exception:
its markup exists only in PHP (see "The shop" below). `index.php` 301s `/about/`,
`/index.php` and non-canonical `/work/<id>/<slug>` links to the canonical URL.

Images on the public site: the gallery, slideshow and viewer show a web-sized
copy (max 1600×2400, JPEG q82) at `baseImages/web/<file>`, never the
multi-megapixel original. Copies are made at upload (`picturesAPI.php` POST)
and, for anything older, on first request: `.htaccess` routes a missing
`baseImages/web/*` file to `actions/webImage.php`, which writes it (one at a
time, memory-checked) so Apache serves it statically from then on. They live
inside `baseImages/`, so they're gitignored and excluded from the deploy like
all artwork. The size limits are in `actions/imageManipulationFunctions.php`.
Narrower copies of the web copy live at `baseImages/web/800/` and
`web/1200/` (`AMB_WEB_VARIANT_WIDTHS`, mirrored as `WEB_VARIANT_WIDTHS` in
`photoFunctions.js`); they're made at upload or on first request the same
way, and go into every gallery `srcset` (400 thumbnail, 800, 1200, full), so
phones and ordinary screens download far less. The viewer picks the
smallest copy that fills it sharply (`viewerImageUrl()`). Artwork is cached
by browsers for 30 days (upload names are unique), design images for 7.

Zooming in loads the zoom copy, `baseImages/web/zoom/<file>` (max 4000px on
the longest side, JPEG q85; `AMB_ZOOM_MAX_SIDE`), never the original. It's
made by `webImage.php` (`?zoom=1`) the first time anyone zooms into that
work; if it can't be made, the request 404s rather than serving the original.
Uploads are capped at 4000px on the longest side too (`AMB_UPLOAD_MAX_SIDE`,
`MAX_SIDE` in `imagePrep.js`): a small file can still be enormous in pixels
(MoonFace 37 was 1.2 MB but 10084×13984, over 500 MB once decoded), so the
cap is on pixels, not just bytes. The server rejects anything over it.

About cache: `actions/aboutMeCache.php` keeps the latest `aboutMe` row in a
JSON file in `sys_get_temp_dir()` (survives deploys). The admin save rewrites
it; it's re-read from the DB after 7 days (60 s outside `APP_ENV=production`,
since the practice DB is replaced on refresh). Each content version gets a
fingerprint: `index.php` puts it in `AMB_PAGE_DATA.aboutVersion`, the JS asks
for `aboutMeAPI.php?v=<it>` (browsers keep that a week), and unversioned GETs
(admin page) get `no-cache` + ETag/304. The GET never starts a session and
only connects to the DB on a cache miss — that's why `database/env.php` is
split out of `pdo.php`.

| Area | Files |
|---|---|
| Public site shell | `html/index.php`, `html/ambar.css` (the only stylesheet) |
| Frontend logic | `html/js/photoFunctions.js` (galleries, modal, layout), `js/navLinksFunctions.js` (navbar, newsletter), `js/aboutMe.js` (admin About editor) |
| Shop | Pages: `actions/shopPageFunctions.php` (all the markup) + `js/shop.js` (basket, checkout, viewer hook-up). Catalogue: `actions/shopFunctions.php`. Orders and payment: `actions/shopOrderFunctions.php`, `actions/stripeFunctions.php`, `actions/stripeWebhook.php`. Emails: `actions/shopEmailFunctions.php`. Public API `actions/shopAPI.php`; admin `admin/shopAdmin.php` + `admin/shopAdmin.css` + `js/shopAdminFunctions.js` + `actions/shopAdminAPI.php`. Tables: `database/shop.sql`. |
| JSON APIs | `html/actions/*API.php` — one per feature (pictures, projects, navLinks, newsletter, shop, aboutMe). The public pages read artwork only through `publicWorksAPI.php` (visible works only; helpers in `publicWorksFunctions.php`). Lists that include hidden/trashed items, and the newsletter list, require the admin session. |
| SEO | `index.php` + `actions/publicPageFunctions.php` (server-drawn pages, meta tags), `sitemap.php` (served as `/sitemap.xml`, lists every work), `robots.txt`; compression and browser-cache rules in `.htaccess` |
| Admin CMS | `html/admin/*.php` + matching `html/js/*Admin*.js` — Ambar manages artworks, projects, nav links, newsletter, shop through these pages. Every admin page also loads `js/adminSession.js` (keeps the sign-in alive, shows a "signed out" banner on any 401). Uploads go through `js/imagePrep.js` first (converts HEIC/WebP/oversized photos to a JPEG under 1.2 MB and 4000px). |
| Auth | `html/signIn/` — session-based; every entry point includes `database/session.php` (cookie flags) instead of calling `session_start()`; admin pages check `$_SESSION["ambar"] === "connected"`, admin APIs call `requireAdminApi()` from `actions/adminAuth.php` (401 JSON, never a redirect); `login_attempts` rate-limits (5 per hour, cleared on success) |
| DB connection | `html/database/pdo.php` — loads `.env` from project root, exposes global `$conn` (PDO) and `env()` helper. Every entry point `include`s it. |
| Images | `html/img/` (full size), `imgMid/`, `thumbnails/` (400px wide), `baseImages/` (originals) + `baseImages/web/` (web-sized copies), `miscIcons/` (design assets: logo, favicon, newsletter leaf, `tape/` scraps). Uploads are resized/converted by `actions/imageManipulationFunctions.php`. |

The local `.env` points at the scratch database `ambar_site_local`; production
credentials live in a separate `.env` on the server and are deliberately not on
this Mac.

## Database tables

`allWorks` (artworks: fileLocation, name, desc2/desc3, medium, year, visible,
isSelectWork, carousel, orderOfDisplay…), `projects`, `worksInProjects`
(join table), `navLinks`, `newsletterEmailList`, `aboutMe`,
`users`, `login_attempts`, `admin_last_visit`.

The shop: `shopProducts`, `shopVariants` (what's actually bought: a print's
sizes, or an original's single price; `stock` NULL = no limit),
`shopProductImages` (file names in `baseImages/`), `shopShippingZones`,
`shopPromoCodes`, `shopSettings`, `shopOrders`, `shopOrderItems` (a copy of what was bought, as
it was then). `shopItems` is the old Shopify-embed table: unused, left alone.

## The shop

Payment is a Stripe Checkout Session, paid on the basket page itself
(`ui_mode=elements`: Stripe.js mounts Stripe's address and card boxes into
`shop.js`'s checkout form), so no card data touches the server and there is
no Stripe library — `stripeFunctions.php` makes plain HTTPS calls. Settings
in the server's `.env`: `STRIPE_SECRET_KEY` (`sk_test_...` or
`sk_live_...`), `STRIPE_PUBLISHABLE_KEY` (`pk_test_...` / `pk_live_...`,
same mode as the secret key) and `STRIPE_WEBHOOK_SECRET` (`whsec_...`).
Without the secret key the shop is browsable but the basket says it isn't
taking orders yet; without (or with a mismatched) publishable key it falls
back to Stripe's hosted page (`success_url`/`cancel_url`).

- **API version and Stripe.js go together.** `STRIPE_API_VERSION` is
  `2026-10-28.endive` (elements mode needs 2026-03-25.dahlia or later), and
  `shop.js` loads `https://js.stripe.com/endive/stripe.js`
  (`initCheckoutElementsSdk`, `loadActions`, `actions.confirm`). Move both
  together. The response readers accept both old and new shapes
  (`shipping_details` vs `collected_information.shipping_details`).
- **The checkout on the basket page:** "Continue to payment" creates the
  order and session, then draws the order beside a form (email and phone
  are the site's own inputs, passed in with `updateEmail` /
  `updatePhoneNumber`; address and card are Stripe's). Paying redirects to
  the session's `return_url`, `/shop/thank-you?order=<token>`. The order's
  token is kept in `sessionStorage` (`ambCheckout`); opening the basket
  again, "Change the basket", starting a new checkout (`replaces`), or
  going to any other page (Back, the menu, a reload: `leaveCheckout()`,
  called from `setView()`) gives that payment up first (`shopAbandonOrder`), so its held stock is free —
  otherwise an original would look sold to the person buying it. Never
  given up while `confirm()` is running.
- Apple Pay / Google Pay appear inside Stripe's card box; Apple Pay needs
  the domain registered in Stripe's dashboard (payment method domains). The webhook to register in Stripe's dashboard is
`https://ambarvelasco.com/actions/stripeWebhook.php`, for
`checkout.session.completed`, `.expired`, `.async_payment_succeeded`,
`.async_payment_failed` and `charge.refunded`. Stripe's own receipts and
"you've been paid" emails can stay on (its dashboard) alongside the site's.

- **The site's own emails** (`actions/shopEmailFunctions.php`, sent through
  Resend's HTTPS API, no library): the order confirmation and an alert to
  Ambar when an order flips to paid in `shopSyncOrder()`, and "on its way"
  when `updateOrder` flips it to shipped. Only the request whose `UPDATE`
  changed the row sends, so each goes once; the automatic ones also carry a
  Resend `Idempotency-Key`. A failed send is logged and never stops the
  order; the order card has "send again" buttons. Ambar writes the wording
  on the shop admin's Emails tab; it's stored in `shopSettings` (the
  `email*` keys, defaults in `shopEmailDefaults()`), so no schema change.
  Server `.env`: `RESEND_API_KEY` (without it nothing is sent and the tab
  says so) and optionally `SHOP_EMAIL_FROM` (default
  `Ambar Velasco <shop@ambarvelasco.com>`; the domain must be verified in
  Resend). Outside `APP_ENV=production` every email is redirected to the
  shop's own address (`emailOwner`), subject prefixed "[Practice, meant
  for …]", because the practice DB holds copies of real buyers' orders.
  The Resend key is send-only. Locally, `dev/resend-mock.php` can stand in
  (header explains; `RESEND_API_BASE` points at it).

- **The tables are created by hand**, once, from `database/shop.sql` (it only
  adds tables). Schema changes are not something to do against production
  from here (see Hard limits), so a change to the shop's tables means a new
  `.sql` file for Stephan to run. Until the tables exist `shopReady()` is
  false: `/shop` says nothing is for sale and the admin page explains.
- **Flow:** `shopStartCheckout()` re-prices the basket from the database,
  takes the stock (`UPDATE ... WHERE stock >= ?`, so two buyers can't both get
  the last one), records a `pending` order and creates the Checkout Session
  (expires in 31 minutes; delivery is one fixed shipping option, which
  `shop.js` selects if Stripe hasn't, and the address is limited to the
  country chosen in the basket). The webhook and
  the thank-you page both just call `shopSyncOrder()`.
- **Two rules in `shopOrderFunctions.php`:** an order is only marked paid
  because Stripe, asked directly, says so (the webhook's payload is a nudge,
  never the evidence); and an order is only cancelled — its stock put back —
  once Stripe confirms the session is expired, so nothing can be paid for
  after going back on sale. `stockHeld` flipping 1→0 guards against putting
  stock back twice.
- **Promo codes** take money off the items, never delivery, one per order.
  `shopCheckPromo()` / `shopPromoDiscount()` decide (the basket's
  `promoDiscount()` in `shop.js` is only a preview of the same sum). The
  saving reaches Stripe as a one-off `amount_off` coupon made for that
  session, so Stripe's total can't differ from ours. A use is counted when
  checkout starts and given back if it's never paid, under the same
  `stockHeld` guard as the stock.
- **Markup lives only in PHP.** `shopPageFunctions.php` draws `/shop` and
  item pages for `index.php`; moving between shop pages fetches the same HTML
  (`shopAPI.php?view=page`). `shop.js` adds behaviour through delegated
  handlers and draws only the basket and thank-you pages (they belong to one
  visitor). Shop CSS uses ordinary media queries, no `...Mobile` twins.
- **`shop.js` loads before `photoFunctions.js`** and only defines things;
  `photoFunctions.js` start-up calls `startShop()`. jQuery's ready callback
  can fire between two deferred scripts, so the file whose start-up runs must
  come last.
- The shop's views (`shop`, `shop-item`, `shop-basket`, `shop-thanks`) share
  routes by address, so "is this page already showing" is `isShowing(view,
  route)` (view **and** `shownPath`), not `view === currentView`.
- An item's pictures open in the works' viewer (`openViewer` with work-shaped
  objects whose `path` is the item page, so no history entry is added). A
  work with a live, in-stock item gets "Available in the shop" in the viewer
  caption (`AMB_PAGE_DATA.shopLinks`, from `shopLinksForWorks()`).
- The basket is `localStorage` (`ambBasket`: `[{variant, quantity}]`), never
  prices. Money is integer cents everywhere; `shopMoney()` / `formatMoney()`
  turn it into text.
- Item pictures are file names shared with (or uploaded like) the works', so
  they're never deleted from disk by the shop, and a work's permanent delete
  keeps a file the shop still uses.
- Saving an item moves stock by the difference from what the page loaded
  (`stockWas`), so a sale made while the editor was open isn't undone.
- Trying it locally: use Stripe test keys in the local `.env`, or the
  stand-in at `dev/stripe-mock.php` (instructions in its header). The
  stand-in covers the server side only — Stripe.js can't talk to it, so
  the address/card boxes need real test keys to appear.

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
- **IDs arrive as numbers, form fields hold text.** Since PHP 8.1, `pdo_mysql`
  returns integer columns as ints, so JSON IDs are numbers while checkbox
  `data-*` attributes and inputs are strings. Strict comparisons
  (`===`, `includes`) between the two silently never match — that is what
  once made saving a project wipe its works. The admin JS converts IDs with
  `String()` on arrival; keep doing that.
- Link-replacing saves (`worksOfProjectsAPI.php` POST) delete and re-insert
  the whole set in one transaction. The pages keep their own selection and
  only send it once the list has loaded for that item and changed; never
  build the list to save from the checkboxes currently on screen.
- Deleting a painting only sets `visible = 0` (its flags are kept for
  restore); every public query must filter on `visible = 1`.
- API responses are inconsistent: some endpoints return bare JSON arrays,
  others `{status, data}` wrappers. Match whatever the consuming JS expects.
- Query results are often read by numeric column index (`$result[$i][3]`), so
  reordering columns in a SELECT silently breaks the JSON output.
- jQuery comes from CDNs: 3.7.0 (Google) on the public page, 3.5.1/3.6.0
  (code.jquery.com) on admin pages. Bootstrap 4.5.2 via CDN.
  On the public page all scripts load with `defer`, in order.
- The menu links come from the `navLinks` table; their `onclick` column holds
  `;`-separated names that `navLinksFunctions.js` maps to functions
  (`getProjectsAndWorks`, `openInfo`, `toggleSublinks`, ...). Those names now
  route through `goTo()`; keep them working if renaming anything.
- **The iPhone white blink when a painting opened was `decoding="async"`
  on the page's pictures** (Safari blanked them while redrawing). They are
  `decoding="sync"` — in `workImage()` and `ambWorkImage()` both. Don't
  switch back.
- **The viewer is not Bootstrap's modal any more.** It and its backdrop
  (`.viewer-backdrop`) are built once at load (`setupViewerLayer()`) and
  stay on the page invisible and `inert` (`#bigPicModal.is-idle`);
  `viewerModal('show'|'hide')` only toggles them. Nothing is added to the
  page on open, which made opening start sooner and move more smoothly on
  phones. `viewerModal` still fires `show/hide/hidden.bs.modal` jQuery
  events, which `setupViewer()` listens to.
  `openViewer()` grows the painting out of the clicked picture (a transform
  from its rect) while the backdrop fades; every close goes through
  `hide.bs.modal`, which is cancelled so `animateClosing()` can shrink it
  back, then `finishClosing()` hides it instantly. The motion starts only
  once the viewer's copy is decoded, and the gallery picture is hidden at
  that moment, not before (phones can take a frame to draw a new image).
  On computers the page behind is held with `overflow: hidden` on `html`
  (`.no-scroll`) and body gets `padding-right` equal to the scrollbar so
  nothing widens. **On phones/tablets (`isTouchScreen()`) nothing about the
  page may change when the viewer opens** — switching the root's scrolling
  off (that, `position: fixed`, or Bootstrap's `body.modal-open`, which
  ambar.css neutralises for touch) makes iOS Safari repaint the whole page
  white for a few frames. A `touchmove` handler on the modal stops page
  scrolling instead (one finger only; two fingers are the viewer's zoom).
  Further iPhone rules, taken from PhotoSwipe after a white flash persisted:
  on touch screens the gallery picture is never hidden (`hideInPage` is a
  no-op); the backdrop starts at `VIEWER_MIN_OPACITY` (0.003), never 0; the
  viewer is `overflow: hidden` except `.can-scroll` (only when a tall
  painting's caption doesn't fit, never while animating); the viewer is
  focused with `preventScroll`; the motion starts after decode, ≥50ms, ≤250ms. The viewer image is sized
  in CSS from `--w`/`--h` (its proportions), so its box is right before it
  loads; `viewerImageWidth()` mirrors that CSS. Hover effects on the gallery
  are inside `@media (hover: hover)` so a tap on a phone doesn't set them off.
- **The viewer always fits on one screen.** `fitViewerToScreen()` measures
  the caption (`#imageInfo`) for each painting and sets `--room` on the
  modal: the height left for the painting once the top buttons
  (`--viewer-top`) and caption have theirs. `.popUpImage`, the scale scene
  and `viewerImageWidth()` all size from it. Descriptions are clamped to 3
  lines with a "more" button (`setUpDescription()`). Zoom and See to scale
  are icon buttons in `.viewer-toolbar` beside the close button — don't put
  controls under the caption, people won't scroll to find them.
- **Zoom** (viewer tools section of `photoFunctions.js`): `enterZoom()`
  lifts a copy of the painting into `#zoomLayer` over the whole viewer and
  scales/moves that, so the viewer's own open/close/step animations are
  untouched. Pinch (touch), double-tap (touch — so a single tap on the
  painting waits `ZOOM_TAP_MS` before stepping), scroll up over the painting
  when the viewer is scrolled to the top, trackpad pinch, `+`/`-`, or the
  button. Safari's `gesturestart` is cancelled while the viewer is open.
- **See to scale** reads the size from the description (`workSizeCm()`:
  "50 x 64 cm", inches, mm, A2–A6). Works up to 45 cm stand on a table beside
  a 9.5 cm mug; bigger ones hang beside a 165 cm figure. The picture keeps
  the photo's proportions with its longest side the stated length.
- **The painted tape** on the gallery (two `::before`/`::after` scraps per
  `.projectWorks .work-card`, placement in a 3-card rhythm, colour in a
  4-card one), under project titles and behind menu links on hover is
  CSS only, from the SVGs in `miscIcons/tape/` (`--tape-*` on `:root`).
  They're drawn stand-ins; Ambar's own scanned tape can replace the files.
- Security headers (nosniff, Referrer-Policy, X-Frame-Options, HSTS) are set
  in `html/.htaccess`.

## Conventions

- Match the existing style: plain PHP with `include`, prepared PDO statements,
  jQuery `$.ajax` calls. Don't introduce frameworks, build tools, or composer
  dependencies without being asked.
- Content changes (artworks, projects, nav links, newsletter) go through the
  live admin panel — they don't need code changes. Code changes are for design,
  behavior, and new features.
- Secrets live in `.env` (never committed). `APP_ENV` controls whether errors
  are displayed (`production` hides them).
