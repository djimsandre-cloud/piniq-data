// Sonde temporaire : où YouTube met-il la date des vidéos sur la page d'une chaîne ?
const UA = { "User-Agent": "Mozilla/5.0 (compatible; Medyapam-robot/1.0; +https://medyapam.web.app)", "Accept-Language": "fr-FR,fr;q=0.9" };
for (const u of ["https://www.youtube.com/@RadioTeleEclair/search?query=Kan%20Pep%20La&hl=fr", "https://www.youtube.com/@RadioTeleEclair/videos?hl=fr", "https://www.youtube.com/@Machannzenhaiti/videos?hl=fr"]) {
  const h = await (await fetch(u, { headers: UA })).text();
  console.log("\n=== " + u + " · " + h.length + " caractères");
  const ids = [...h.matchAll(/"videoId":"([\w-]{11})"/g)].map((m) => m.index);
  console.log("publishedTimeText simpleText :", (h.match(/"publishedTimeText":\{"simpleText":"[^"]+"/g) || []).slice(0, 4).join(" | "));
  console.log("il y a / ago :", [...new Set((h.match(/"(?:content|simpleText|text)":"(?:il y a|Diffusé il y a|Streamed|[0-9]+ \w+ ago)[^"]*"/g) || []))].slice(0, 8).join(" | "));
  if (ids.length) { const i = ids[0]; const b = h.slice(i, i + 3000); const k = b.search(/il y a|ago/); console.log("autour du 1er videoId (position du texte de date dans les 3000 car. suivants : " + k + ")"); console.log(b.slice(Math.max(0, k - 200), k + 120).replace(/\s+/g, " ")); }
}
