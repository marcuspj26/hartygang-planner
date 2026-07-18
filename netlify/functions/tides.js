// netlify/functions/tides.js
// Serverless fallback proxy for NOAA CO-OPS tide predictions.
// Station 8447742 (Menauhant / Nantucket Sound area). Datum MLLW, hi/lo only.
// Called by the site at /api/tides (see netlify.toml redirect).

exports.handler = async function (event) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const begin = `${yyyy}${mm}${dd}`;

  const url =
    "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter" +
    "?product=predictions&application=hartygang_planner&station=8447742&datum=MLLW&interval=hilo&units=english&time_zone=lst_ldt&format=json" +
    "&begin_date=" + begin + "&range=48";

  try {
    const r = await fetch(url);
    if (!r.ok) {
      return { statusCode: r.status, body: JSON.stringify({ error: "NOAA " + r.status }) };
    }
    const data = await r.json();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=600"
      },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: String(e) }) };
  }
};
