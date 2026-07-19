// NDBC realtime2 buoy-observation adapter.
// Feed: https://www.ndbc.noaa.gov/data/realtime2/<station>.txt
// Plain text, two "#" header rows, newest row first, space-delimited, "MM" = missing.
// Units are metric (wind m/s, wave height m); this adapter converts to the
// normalized shape's knots and feet. Columns are resolved from the header row,
// never by fixed index.
//
// Returns the normalized shape:
//   { source, fetchedAt, points: [{ time, windKts, gustKts, windDirDeg,
//                                   waveFt, wavePeriodS, waveDirDeg }] }
// points are newest-first, as in the feed. Wave fields are null on rows the
// buoy didn't report them.

const MS_TO_KT = 1.94384;
const M_TO_FT = 3.28084;
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_ROWS = 60; // newest ~10 hours of 10-minute rows is plenty

function parseText(text) {
  const lines = text.split("\n").filter(l => l.trim().length);
  if (lines.length < 3 || !lines[0].startsWith("#")) throw new Error("ndbc: unexpected format");
  const cols = lines[0].replace(/^#/, "").trim().split(/\s+/);
  const idx = {};
  cols.forEach((c, i) => { idx[c] = i; });
  for (const n of ["YY", "MM", "DD", "hh", "mm"]) {
    if (!(n in idx)) throw new Error("ndbc: missing column " + n);
  }
  const val = (parts, name) => {
    if (!(name in idx)) return null;
    const raw = parts[idx[name]];
    if (raw == null || raw === "MM") return null;
    const n = parseFloat(raw);
    return Number.isNaN(n) ? null : n;
  };
  const points = [];
  for (const line of lines.filter(l => !l.startsWith("#")).slice(0, MAX_ROWS)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;
    const t = Date.UTC(+parts[idx.YY], +parts[idx.MM] - 1, +parts[idx.DD], +parts[idx.hh], +parts[idx.mm]);
    if (!Number.isFinite(t)) continue;
    const wspd = val(parts, "WSPD"), gst = val(parts, "GST"), wvht = val(parts, "WVHT");
    points.push({
      time: new Date(t).toISOString(),
      windKts: wspd == null ? null : wspd * MS_TO_KT,
      gustKts: gst == null ? null : gst * MS_TO_KT,
      windDirDeg: val(parts, "WDIR"),
      waveFt: wvht == null ? null : wvht * M_TO_FT,
      wavePeriodS: val(parts, "DPD"),
      waveDirDeg: val(parts, "MWD")
    });
  }
  if (!points.length) throw new Error("ndbc: no data rows");
  return points;
}

async function fetchText(stationId) {
  // NDBC does not send CORS headers, so the direct fetch is expected to fail
  // in the browser; the /api/buoy/* Netlify redirect proxies it same-origin.
  const urls = [
    "https://www.ndbc.noaa.gov/data/realtime2/" + stationId + ".txt",
    "/api/buoy/" + stationId + ".txt"
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.text();
    } catch (e) { /* CORS or network -> try next */ }
  }
  throw new Error("ndbc: feed unavailable");
}

export async function fetchNdbcBuoy({ stationId }) {
  const key = "hg-buoy-" + stationId;
  try {
    const c = JSON.parse(localStorage.getItem(key));
    if (c && Date.now() - c.at < CACHE_TTL_MS) {
      return { source: "ndbc-" + stationId, fetchedAt: new Date(c.at).toISOString(), points: parseText(c.text) };
    }
  } catch (e) { /* cache unreadable -> refetch */ }
  const raw = await fetchText(stationId);
  const points = parseText(raw); // parse before caching so a bad payload is never stored
  const trimmed = raw.split("\n").slice(0, MAX_ROWS + 2).join("\n");
  try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), text: trimmed })); } catch (e) { /* quota */ }
  return { source: "ndbc-" + stationId, fetchedAt: new Date().toISOString(), points };
}
