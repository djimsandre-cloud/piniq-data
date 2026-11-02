const UA = { "User-Agent": "Mozilla/5.0 (compatible; Medyapam-robot/1.0; +https://medyapam.web.app)" };
const out = [];
const t = (s) => String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").trim();
for (const u of ["https://lenouvelliste.com/rss", "https://lenouvelliste.com/rss/fr", "https://lenouvelliste.com/fr/rss", "https://lenouvelliste.com/rss?lang=fr", "https://lenouvelliste.com/rss/actualite", "https://lenouvelliste.com/rss/national", "https://lenouvelliste.com/feed"]) {
  try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) }); const x = await r.text(); const it = x.split(/<item[\s>]/).slice(1);
    out.push(`${u} :: ${r.status} :: ${it.length} :: ${it.slice(0, 4).map((i) => t((i.match(/<title>([\s\S]*?)<\/title>/) || [])[1]).slice(0, 50) + " [" + t((i.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/) || [])[1]) + "]").join(" | ")}`);
  } catch (e) { out.push(u + " :: " + e.message); }
}
const r = await fetch("https://lenouvelliste.com/", { headers: UA }); const h = await r.text();
out.push("accueil flux annoncés :: " + [...h.matchAll(/<link[^>]+(?:rss|atom)\+xml[^>]*>/gi)].map((m) => (m[0].match(/href="([^"]+)"/) || [])[1]).join(" ") + " :: " + [...new Set(h.match(/https?:\/\/[^"' ]*rss[^"' ]*/gi) || [])].slice(0, 8).join(" "));
for (const o of out) console.log("::notice::" + o.replace(/%/g, "%25"));
