# Hartygang — Weather & Sea Planner

A single-page trip planner for the boat **Hartygang**, home-ported at New Seabury,
Mashpee, Massachusetts. It turns live marine + weather data into a plain-language
"go / hold" trip call for a set of Nantucket Sound destinations, plus a practical read
on the ride home.

**Live site:** https://hartygang-planner.netlify.app

Home dock: **41.5867 N, 70.4647 W** (NWS marine zone ANZ232).

---

## What it does

- **Live forecast** for the home dock, fetched on page load (no API keys).
- **Trip call** — scores a chosen destination 0-100 and renders a verdict
  ("Good to go" / "Workable" / "Hold the run") with the limiting factor,
  best window, and modeled sea state.
- **5-day outlook** — each day scored independently so you can pick a better day.
- **Sequenced tides** — shows a built-in approximation instantly, then upgrades
  to real NOAA predictions in the background (see below).
- **Advisor** — answers free-text questions ("Can we make Naushon tomorrow?") by
  parsing the question and reading the relevant day/destination from live data.
- **Route planner** — draws a simple planning map for the selected destination.

## Data sources

All sources are keyless and CORS-friendly, so the site runs as static files with
no secrets to manage.

- **Open-Meteo Marine API** — wave height, wave period, swell.
- **Open-Meteo Forecast API** — wind, gusts, rain probability, cloud cover.
- **NOAA CO-OPS Tide Predictions** — high/low tide times and heights for the
  nearest Nantucket Sound station (datum MLLW, high/low only).

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
crew profile (family / cruise / sport). The lowest-contributing factor is surfaced
as the "limiting factor" so the verdict is explainable rather than a black box.

## Project structure

```
hartygang-planner/
  index.html                     # the whole app: markup, styles, and JS engine
  netlify.toml                   # publish dir + /api/tides redirect
  netlify/
    functions/
      tides.js                   # serverless fallback proxy for NOAA tides
  README.md
```

## The serverless fallback

`netlify/functions/tides.js` is a small proxy that fetches the NOAA tide
predictions server-side and returns them as JSON. `netlify.toml` maps the tidy
path **`/api/tides`** to it. The page can call NOAA directly (CORS is open), so
this function is a belt-and-suspenders fallback in case direct browser access is
ever blocked. You can hit it directly at `/api/tides` to sanity-check tides.

## Deploying

It is a static site with one function, so there is no build step.

1. Push this repo to GitHub (done).
2. In Netlify: **Add new project -> Import an existing project -> GitHub**, pick
   this repo.
3. Leave the **build command empty** and set the **publish directory** to `.`.
4. No environment variables or API keys are required.
5. Deploy. Verify at `/` (tide badge should read `NOAA live`) and at `/api/tides`
   (should return NOAA JSON).

## Note on safety

This is a planning aid, not a navigation system. Always confirm conditions with
official NOAA/NWS forecasts and your own judgment before leaving the dock.

# hartygang-planner
Hartygang Weather &amp; Sea Planner — live keyless marine/weather forecast, sequenced NOAA tides, and a Netlify serverless fallback.
