# Merit Hill Capital — website

A clean, hand-built static recreation of merithillcapital.com. Semantic HTML, one
consolidated stylesheet, and a small amount of dependency-free JavaScript. No WordPress,
no Elementor, no plugins.

## Structure

```
src/
  layout.html        Shared shell: <head>, header, nav, footer (one source of truth)
  pages/*.html       Per-page <main> content fragments
assets/
  css/styles.css     All styles (brand tokens, layout, components, responsive)
  js/main.js         Mobile menu, carousels, count-up stats, scroll reveal, team modal, contact form
  js/team-data.js    Team roster data (names, titles, bios, photos) for the modal
  fonts/             Self-hosted Roboto + Cantata One (woff2)
  img/               Optimized images (logo, textures, hero stills, properties, team, US map)
  video/             Hero background videos
  data/portfolio.json  Property map dots (pixel coords + owned/sold flag) — generated, committed
build.mjs            Assembles src/ into the final HTML pages at the repo root
check-links.mjs      Audits built HTML for missing local asset references
optimize-images.mjs  Resizes/recompresses images in assets/img (dev tool; needs `npm i`)
```

### Portfolio map + statistics data

The portfolio page plots owned (navy) and sold (gold) property dots on the US map
and shows headline stat tiles (current properties, states, units, square feet,
metropolitan areas, total properties). Both come from `assets/data/portfolio.json`,
a committed snapshot — the live site is static (GitHub Pages), so it never touches a
database and no credentials ship to the browser. Each dot is clickable and opens a
popover with that property's name, manager, address, acquisition year, and
storage-unit count; the map zooms and pans (buttons / wheel / double-click / drag) by
animating the SVG `viewBox` in `assets/js/main.js`, so dots and base map stay aligned.
The stat tiles, the as-of date, and the portfolio figures in the home/expertise prose
(`{{STAT_*}}` tokens) are injected at build time from this snapshot.

The snapshot is produced by a local-only data pipeline that is intentionally kept
out of this public repo (see `tools/README.md` locally). After it regenerates
`assets/data/portfolio.json`, rebuild the pages:

```sh
node build.mjs                        # rebuild pages with the refreshed numbers
```

Built pages live at the repo root so the site can be served as-is:
`index.html`, `about/`, `expertise/`, `team/`, `portfolio/`, `contact/`,
`terms-and-conditions-of-use/`.

## Develop

```sh
node build.mjs          # regenerate the HTML pages from src/
node check-links.mjs     # verify no broken local references
python -m http.server 8000   # preview at http://localhost:8000/
```

Edit content in `src/pages/*.html`, shared chrome in `src/layout.html`, styles in
`assets/css/styles.css`, then re-run `node build.mjs`. The header/footer/nav are defined
once in the layout and injected into every page. The team grid is generated from
`assets/js/team-data.js`, so adding or editing a person happens in one place.

To re-optimize images after adding new ones: `npm install` then `node optimize-images.mjs`.

## Deploy

The repo root is a static site — push to the `main` branch and GitHub Pages serves it.
Live at https://richiemhc.github.io/mhcsite/.

## Notes

- Brand palette: navy `#23427B`, gold `#B49430`, teal `#009DB7`. Display font Cantata One,
  body font Roboto — both self-hosted.
- The contact form is static; submitting composes a `mailto:` to IR@merithillcapital.com.
  Wire it to a form backend (Formspree, Netlify Forms, etc.) for server-side delivery.
- The portfolio "national footprint" uses a public-domain US map (the live site used an
  interactive Google Map, which requires the Maps API and a key).
- `LOGIN` links to the external investor portal (clients.alterdomus.com).
