# Black Mountain Birdie Book ⛳

A phone-friendly stroke saver for **Black Mountain Golf Club, Hua Hin** (East, North and West nines).
Static site, no build step, hosted on GitHub Pages.

## Features
- **Your tee** bar at the top (76 / 73 / 70 / 65 / 61 / 57). Every yardage, the tee marker on the map and all
  landmark distances are recalculated for the tee you pick.
- Pick the 18-hole combination (East→North, North→West, West→East); par and stroke index follow it.
- Per-hole **tips**: ⚠️ what to watch out for, 🎯 where to aim. Plus your own notes (saved on the phone).
- Satellite map with live **GPS distances** to the front / middle / back of the green.
- **Tap anywhere** on the map to measure: you (or the tee) → point → green. Drag the pin to adjust.
- **Landmarks** (bunkers, water carries, creeks) per hole with distance from your tee and to the green.
- Scorecard with out/in/total and score to par.
- Works offline once loaded (installable: "Add to Home Screen").

## Map setup
Tee and green positions for East and North are bundled in `data/geo.js` (taken from OpenStreetMap hole lines), so GPS distances work out of the box. West is not mapped in OpenStreetMap, so its positions are rough guesses placed by eye from satellite imagery (hole order and direction unconfirmed) — please re-set them on the course with Setup.

Positions can still be adjusted with Setup on any hole: tap ⚙︎ and either:
1. tap an orange OpenStreetMap hole line (if the course is mapped there), or
2. put the crosshair on the tee/green and tap the buttons, or use your GPS while standing there.

When you set a tee, select the tee you're standing on first — the other tees are derived from the card yardages.
Then **Export geo.js** and replace `data/geo.js` in this repo so it works on every device.

## Data
`data/course.js` holds pars, yardages, stroke indexes, tips and notes. Yardages come from published scorecards
(offcourse.co for East/North, golfpass.com for West — no 76 tee published for West) and may differ slightly
from the card at the club. `*` next to a stroke index = estimated.

## Deploy
Pushing to `main` runs `.github/workflows/pages.yml`, which publishes the site to GitHub Pages
(Settings → Pages → Source: GitHub Actions).
