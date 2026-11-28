# Outside libraries, kept on this site

Served from here instead of from other companies' servers, so the public
pages load without contacting anyone else (and a visit isn't reported to
them).

| File | What | From | Licence |
|---|---|---|---|
| `jquery/jquery-3.7.0.min.js` | jQuery 3.7.0 | ajax.googleapis.com | MIT |
| `bootstrap/bootstrap-4.5.2.min.css`, `.min.js` | Bootstrap 4.5.2 | maxcdn.bootstrapcdn.com | MIT |
| `fonts/*.woff2`, `fonts/fonts.css` | Lato, Cormorant Garamond | fonts.google.com | SIL Open Font License 1.1 |

Each script was checked against the sha384 fingerprint the page used when it
loaded them from the CDN, before being kept. To change a version, download the
new file, check its published fingerprint, give it a new file name, and change
the link in `index.php`.
