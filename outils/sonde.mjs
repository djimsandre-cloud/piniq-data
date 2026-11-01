// Sonde ponctuelle (retirée ensuite) : flux des sources haïtiennes de référence
const UA = { "User-Agent": "Mozilla/5.0 (compatible; Medyapam-robot/1.0; +https://medyapam.web.app)", "Accept-Language": "fr-FR,fr;q=0.9" };
const lire = async (u) => { try { const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(20000) }); return [r.status, await r.text()]; } catch (e) { return [0, e.message]; } };
const out = [];
const ent = (s) => String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "’");
const txt = (s) => ent(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
async function flux(nom, u) {
  const [st, x] = await lire(u);
  const items = x.split(/<item[\s>]|<entry[\s>]/i).slice(1);
  if (!items.length) return out.push(`${nom} :: ${u} :: HTTP ${st} :: 0 élément :: ${x.slice(0, 80).replace(/\s+/g, " ")}`);
  const it = items[0], c = (it.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/) || it.match(/<content[^>]*>([\s\S]*?)<\/content>/) || [])[1] || "";
  const d = (it.match(/<description>([\s\S]*?)<\/description>/) || it.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) || [])[1] || "";
  const auteurs = [...new Set(items.map((i) => txt((i.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/) || i.match(/<author>([\s\S]*?)<\/author>/) || [])[1] || "")).filter(Boolean))].slice(0, 8);
  out.push(`${nom} :: ${u} :: HTTP ${st} :: ${items.length} éléments :: texte=${txt(c).length} car. :: résumé=${txt(d).length} car. :: titre=${txt((it.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1]).slice(0, 70)} :: auteurs=${auteurs.join(", ")}`);
}
await flux("AlterPresse", "https://www.alterpresse.org/spip.php?page=backend");
await flux("AlterPresse (2)", "https://www.alterpresse.org/spip.php?page=backend-simple");
await flux("AyiboPost", "https://www.ayibopost.com/feed/");
await flux("AyiboPost (2)", "https://ayibopost.com/rss/");
await flux("AyiboPost (3)", "https://www.ayibopost.com/?feed=rss2");
await flux("Le Nouvelliste", "https://lenouvelliste.com/rss");
await flux("RFI Amériques", "https://www.rfi.fr/fr/am%C3%A9riques/rss");
await flux("RFI Haïti", "https://www.rfi.fr/fr/tag/ha%C3%AFti/rss");
await flux("Radio-Canada Haïti", "https://ici.radio-canada.ca/rss/4159");
for (const [nom, u] of [["Geffrard (Nouvelliste)", "https://lenouvelliste.com/auteur/robenson-geffrard"], ["Amélie Baron (RFI)", "https://www.rfi.fr/fr/auteur/am%C3%A9lie-baron/"], ["X Le Nouvelliste", "https://x.com/LeNouvelliste"], ["Nitter", "https://nitter.net/LeNouvelliste/rss"]]) {
  const [st, x] = await lire(u); const rss = (x.match(/<link[^>]+(rss|atom)\+xml[^>]+href="([^"]+)"/i) || [])[2] || "";
  out.push(`${nom} :: HTTP ${st} :: ${x.length} car. :: flux annoncé=${rss} :: titre=${txt((x.match(/<title>([\s\S]*?)<\/title>/) || [])[1]).slice(0, 70)}`);
}
for (const o of out) console.log("::notice::" + o.replace(/%/g, "%25"));
