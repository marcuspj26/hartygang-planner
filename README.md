# Hartigang — Weather & Sea Planner

A single-page trip planner for the boat **Hartigang** (a 2024 EdgeWater 230 CC),
home-ported at New Seabury, Mashpee, Massachusetts. It turns live marine + weather
data into a plain-language "go / hold" trip call for a set of Nantucket Sound
destinations, plus a practical read on the ride home.

**Live site:** https://hartigang-planner.netlify.app

Home dock: **41.5867 N, 70.4647 W** (NWS marine zone ANZ232).

---

## What it does

- **Weekend board** — the default view. Every destination is scored for a
  selected day and ranked (good, then workable, then hold; closest first
  within each). Pick a weekend day and Saturday and Sunday show side by side.
  A departure-time control re-scores the whole board. Each row shows the
  verdict, a one-line reason, distance, and time on the water; tap a row to
  open its full trip call.
- **Trip call** — scores a chosen destination 0-100 and renders a verdict
  ("Good to go" / "Workable" / "Hold the run") with the limiting factor,
  best window, and modeled sea state.
- **Live buoy read** — pulls the latest observation from NDBC buoy 44020
  (mid-Nantucket-Sound) and flags when observed seas are running above the
  forecast.
- **5-day outlook** — each day scored independently so you can pick a better day.
- **Sequenced tides** — shows a built-in approximation instantly, then upgrades
  to real NOAA predictions in the background (see below).
- **Advisor** — answers free-text questions ("Can we make Naushon tomorrow?") by
  parsing the question and reading the relevant day/destination from live data.
- **Route planner** — planning map, NOAA chart reference, and a live conditions
  dashboard for the selected destination, plus an embedded Windy conditions map.

## No build step

The app is plain ES modules and `fetch` — no bundler, no framework, no build
tooling. `index.html` is a single `<script type="module">` engine that imports
the data adapters directly and loads its configuration at startup. Open it
through any static server (or `netlify dev`, see below) and it runs as-is.

## Configuration

Everything boat-specific lives in JSON under `config/`, so nothing about a
particular boat is hardcoded in the app:

- **`config/boat.json`** — vessel identity, home dock, cruise speed, comfort
  thresholds, crew profiles, the tide station, the NDBC buoy, marine zone,
  external links (including the Windy embed), and all display copy.
- **`config/destinations.json`** — each destination's route, legs, exposure,
  round-trip distance, map coordinates, advisor aliases, and skipper/guest notes.

Repointing the app at a different boat is a matter of editing these two files.

## Data sources

All sources are keyless, so the site runs as static files with no secrets to
manage. Each source sits behind a small adapter in `js/adapters/` that returns a
normalized shape, so the scoring engine never touches a raw API response.

- **Open-Meteo Marine + Forecast APIs** (`openMeteo.js`) — wave height, period,
  and direction; wind, gusts, wind direction, rain probability, cloud cover.
- **NOAA CO-OPS Tide Predictions** (`noaaTides.js`) — high/low tide times and
  heights for the nearest Nantucket Sound station (datum MLLW, high/low only).
- **NDBC buoy observations** (`ndbcBuoy.js`) — the latest realtime reading from
  buoy 44020, parsed defensively from the fixed-width text feed and converted to
  the app's units.

## How the tide sequencing works

This was a deliberate design choice so the tide card is never blank and never lies
about its source:

1. **On load** the card renders a built-in harmonic *approximation* and labels it
   clearly as `Estimated`.
2. **In the background** the page requests real predictions from NOAA.
3. **On success** the card swaps in the real high/low times and heights and the
   badge flips to `NOAA live`.
4. **On failure** it silently keeps the estimate — no fake "connecting" state.

## Scoring model

The 0-100 score combines: wave height and period (steepness), wind and gusts,
rain probability, how exposed the route to that destination is, and the selected
crew profile (comfort-first / regular / sport). The lowest-contributing factor is
surfaced as the "limiting factor" so the verdict is explainable rather than a
black box. The scorer also reports which leg (departure or return) and hour bound
the result, and turns that into the one-line reason shown on each board row
(e.g. "return leg builds past your chop threshold after 2 PM").

## Project structure

```
hartigang-planner/
  index.html                     # the whole app: markup, styles, and JS engine (one ES module)
  config/
    boat.json                    # per-boat configuration and copy
    destinations.json            # destinations, routes, and notes
  js/
    adapters/
      openMeteo.js               # Open-Meteo marine + forecast adapter
      noaaTides.js               # NOAA CO-OPS tide-prediction adapter
      ndbcBuoy.js                # NDBC buoy 44020 observation adapter
  netlify.toml                   # publish dir + /api/tides and /api/buoy redirects
  netlify/
    functions/
      tides.js                   # serverless fallback proxy for NOAA tides
  README.md
```

## Netlify redirects and the serverless fallback

`netlify.toml` sets up two same-origin paths:

- **`/api/tides`** → `netlify/functions/tides.js`, a small proxy that fetches the
  NOAA tide predictions server-side. The page can call NOAA directly (CORS is
  open), so this is a belt-and-suspenders fallback in case direct browser access
  is ever blocked. Hit it directly at `/api/tides` to sanity-check tides.
- **`/api/buoy/*`** → `https://www.ndbc.noaa.gov/data/realtime2/:splat`, a proxy
  for the NDBC feed, which does **not** send CORS headers. The buoy adapter tries
  a direct fetch first and falls back to this path.

Because the buoy path is a Netlify redirect, the buoy read only works when the
site is served through Netlify (production or `netlify dev`) — a bare static
server won't have it.

## Running locally

Use the Netlify CLI so the `/api/*` redirects and the function are live, matching
production:

```
npm install -g netlify-cli
netlify dev
```

Then open the printed localhost URL. The tide badge should read `NOAA live`, the
buoy line should appear on a trip call, and `/api/tides` and `/api/buoy/44020.txt`
should both return data.

## Deploying

It is a static site with one function and no build step.

1. Push this repo to GitHub.
2. In Netlify: **Add new project -> Import an existing project -> GitHub**, pick
   this repo.
3. Leave the **build command empty** and set the **publish directory** to `.`.
4. No environment variables or API keys are required.
5. Deploy. Verify at `/` (tide badge should read `NOAA live`), at `/api/tides`
   (should return NOAA JSON), and at `/api/buoy/44020.txt` (should return the
   NDBC feed).

## Note on safety

This is a planning aid, not a navigation system. Always confirm conditions with
official NOAA/NWS forecasts and your own judgment before leaving the dock.
