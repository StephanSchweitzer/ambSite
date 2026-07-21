# CLAUDE.md

Portfolio website + e-shop for the artist Ambar Velasco (ambarvelasco.com).
Plain PHP + MySQL backend, jQuery/Bootstrap 4 frontend. No framework, no build
step, no package manager, no automated tests — verify changes by loading the
site.

## ⚠️ Deployment

**Pushing to `main` on GitHub deploys straight to the production server via CI.**
Never push unverified changes. Test locally first (`php -S localhost:8000` from
`html/`, needs a MySQL database and a `.env` file — see `.env.example` at the
project root). When in doubt, commit locally and let the user decide when to push.

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
- Content changes (adding artworks, projects, nav links, newsletter) go
  through the admin panel — they don't need code changes. Code changes are for
  design, behavior, and new features.
- Secrets live in `.env` (never committed). `APP_ENV` controls whether errors
  are displayed (`production` hides them).
