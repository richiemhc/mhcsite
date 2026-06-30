# Merit Hill Capital — local mirror

A verbatim, offline copy of https://merithillcapital.com/ (WordPress + Elementor),
captured as static files. All HTML, CSS, JS, images, fonts, and the hero video are
local; absolute URLs have been rewritten to relative paths.

## Pages

- `index.html` — Home
- `about/` — About
- `expertise/` — Expertise
- `team/` — Team
- `portfolio/` — Portfolio
- `contact/` — Contact
- `terms-and-conditions-of-use/` — Terms & Conditions

## Run it

Serve the folder over HTTP (needed so directory URLs resolve to `index.html` and the
video/fonts load with correct MIME types):

```sh
# any one of these, from this directory:
python -m http.server 8000
# or
npx serve .
```

Then open http://localhost:8000/ . Opening `index.html` directly via `file://` mostly
works but the background video and some relative directory links resolve more reliably
over HTTP.

## Preserved interactivity

- Hero background video (`wp-content/uploads/2025/02/storage_header.mp4`)
- Elementor flip-box carousels (Swiper) — investment approach + featured investments
- Sticky header, mobile hamburger popup menu, scroll fade-in animations
- Team page member modals (data is inlined as `mhcTeamData`; photos are local)

## How it was built

`mirror.mjs` downloads each page and all referenced assets via `curl` (with a desktop
Chrome User-Agent, required to pass the site's Cloudflare bot check), discovers nested
assets inside CSS `url()` rules, then rewrites every `merithillcapital.com` URL —
including JSON-escaped and double-escaped forms in Elementor `data-settings` — to a
path relative to each file. Re-run with `node mirror.mjs`. `check-links.mjs` audits the
saved HTML for any local asset reference that is missing on disk.

## Known limitations (offline)

- **WordPress head metadata endpoints** (`/feed/`, `/comments/feed/`, `/wp-json/...`,
  `/xmlrpc.php`, oEmbed links) are `<link rel>` discovery tags only. They are not
  fetched while rendering and do not affect the page; they 404 offline (they resolve on
  the live origin). Left in place to keep the markup verbatim.
- **Contact page map:** the live site uses the `wp-google-maps` plugin. An interactive
  Google map tile requires the live Google Maps API and will not render offline; the rest
  of the contact page is intact.
- **Font Awesome kit** (`kit.fontawesome.com/...js`) is left pointing at its remote URL.
  All icons used on the site are already inlined as SVG, so this has no visible effect.
- External links are intentionally left remote: **LOGIN** (`clients.alterdomus.com`) and
  the LinkedIn/Twitter references in the page's structured data.
- Cloudflare's email-obfuscation script and challenge script were removed; the obfuscated
  address was decoded back to a working `mailto:` link.
