// NOAA CO-OPS tide-prediction adapter (high/low events, datum MLLW).
//
// Tides are events, not hourly points, so this adapter returns:
//   { source, fetchedAt, events: [{ time: Date, type: "H"|"L", heightFt: number|null }] }
// Returns null when neither the serverless proxy nor NOAA directly can serve
// predictions — callers keep whatever estimate they already show.

export async function fetchNoaaTides({ stationId, proxyPath = "/.netlify/functions/tides" }) {
  const today = new Date();
  const f = d => d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  const qs = "station=" + stationId + "&datum=MLLW&interval=hilo&units=english&time_zone=lst_ldt&format=json&begin_date=" + f(today) + "&range=48";
  // (1) the Netlify serverless proxy first (handles subordinate-station offsets + any CORS),
  // (2) then NOAA directly.
  const attempts = [
    proxyPath + "?" + qs,
    "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=hartygang_planner&" + qs
  ];
  for (const url of attempts) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const j = await r.json();
      const preds = j.predictions || (j.data && j.data.predictions) || null;
      if (preds && preds.length) {
        return {
          source: "noaa-tides",
          fetchedAt: new Date().toISOString(),
          events: preds.map(p => ({
            time: new Date(p.t.replace(" ", "T")),
            type: p.type,
            heightFt: p.v != null ? +p.v : null
          }))
        };
      }
    } catch (e) { /* try next */ }
  }
  return null;
}
