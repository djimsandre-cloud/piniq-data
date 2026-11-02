const UA = { "User-Agent": "Mozilla/5.0 (compatible; Medyapam-robot/1.0; +https://medyapam.web.app)", "Accept-Language": "fr-FR,fr;q=0.9" };
const lire = async (u) => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) }); return [r.status, await r.text()]; };
const out = [];
const [, h] = await lire("https://www.ayibopost.com/");
out.push("indices :: next=" + h.includes("__NEXT_DATA__") + " wp=" + /wp-content|wp-json/.test(h) + " ldjson=" + (h.match(/application\/ld\+json/g) || []).length + " ghost=" + /ghost/i.test(h) + " gen=" + ((h.match(/name="generator" content="([^"]+)/) || [])[1] || ""));
const liens = [...new Set([...h.matchAll(/href="(https:\/\/(?:www\.)?ayibopost\.com\/[a-z0-9-]{20,}\/?)"/g)].map((m) => m[1]))];
out.push(`liens d'articles (${liens.length}) :: ` + liens.slice(0, 6).join(" "));
for (const t of ["wp-json/wp/v2/posts?per_page=2&_fields=id,title,link,date", "feed/atom/", "rss.xml", "sitemap.xml"]) { try { const [st, x] = await lire("https://www.ayibopost.com/" + t); out.push(`${t} :: ${st} :: ${x.slice(0, 160).replace(/\s+/g, " ")}`); } catch (e) { out.push(t + " :: " + e.message); } }
if (liens[0]) { const [st, a] = await lire(liens[0]);
  const ps = [...a.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim()).filter((x) => x.length > 60);
  out.push(`article ${st} :: ${ps.length} paragraphes, ${ps.join(" ").length} car. :: og:image=${((a.match(/og:image" content="([^"]+)/) || [])[1] || "").slice(0, 80)} :: date=${(a.match(/article:published_time" content="([^"]+)/) || [])[1]} :: auteur=${(a.match(/name="author" content="([^"]+)/) || [])[1]} :: début=${(ps[0] || "").slice(0, 150)}`);
  const i = h.indexOf(liens[0]); out.push("autour du lien :: " + h.slice(Math.max(0, i - 500), i + 700).replace(/\s+/g, " ").replace(/%/g, "%25"));
}
const [s2, b] = await lire("https://www.rfi.fr/fr/auteur/am%C3%A9lie-baron/rss");
const it = b.split(/<item[\s>]/).slice(1); out.push(`Amélie Baron RSS :: ${s2} :: ${it.length} :: ${(it[0] || "").slice(0, 400).replace(/\s+/g, " ")}`);
for (const o of out) console.log("::notice::" + o.replace(/%(?!25)/g, "%25"));
