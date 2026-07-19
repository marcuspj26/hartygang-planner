// Open-Meteo forecast adapter (marine waves + weather wind/rain/cloud).
//
// Normalized adapter shape shared by all forecast sources:
//   {
//     source:    string,
//     fetchedAt: ISO string,
//     points: [{ time, windKts, gustKts, windDirDeg, waveFt, wavePeriodS,
//                waveDirDeg, precipProbPct, cloudCoverPct }],   // null where a source lacks a field
//     daily:  [{ date, sunrise, sunset }]                        // local ISO strings
//   }
// Times are local ISO strings as reported by the source for the requested timezone.

const num = v => (v == null || Number.isNaN(v) ? null : v);

export async function fetchOpenMeteo({ lat, lon, days = 5, timezone = "America/New_York" }) {
  const tz = encodeURIComponent(timezone);
  const m = "https://marine-api.open-meteo.com/v1/marine?latitude=" + lat + "&longitude=" + lon +
    "&hourly=wave_height,wave_period,wave_direction&timezone=" + tz + "&forecast_days=" + days + "&length_unit=imperial";
  const f = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
    "&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation_probability,cloud_cover" +
    "&daily=sunrise,sunset&timezone=" + tz + "&forecast_days=" + days + "&wind_speed_unit=kn";
  const [mr, fr] = await Promise.all([fetch(m), fetch(f)]);
  if (!mr.ok || !fr.ok) throw new Error("open-meteo unavailable");
  const [mj, fj] = await Promise.all([mr.json(), fr.json()]);

  // Both endpoints share the same hourly grid for the same lat/lon/timezone/days.
  const points = [];
  for (let i = 0; i < mj.hourly.time.length; i++) {
    points.push({
      time: mj.hourly.time[i],
      windKts: num(fj.hourly.wind_speed_10m[i]),
      gustKts: num(fj.hourly.wind_gusts_10m[i]),
      windDirDeg: num(fj.hourly.wind_direction_10m[i]),
      waveFt: num(mj.hourly.wave_height[i]),
      wavePeriodS: num(mj.hourly.wave_period[i]),
      waveDirDeg: num(mj.hourly.wave_direction[i]),
      precipProbPct: num(fj.hourly.precipitation_probability[i]),
      cloudCoverPct: num(fj.hourly.cloud_cover[i])
    });
  }
  const daily = fj.daily.time.map((date, d) => ({
    date,
    sunrise: fj.daily.sunrise[d],
    sunset: fj.daily.sunset[d]
  }));
  return { source: "open-meteo", fetchedAt: new Date().toISOString(), points, daily };
}
