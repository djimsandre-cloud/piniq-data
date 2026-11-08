const UA = { "User-Agent": "Mozilla/5.0 (compatible; Medyapam-robot/1.0; +https://medyapam.web.app)" };
const t = (s) => String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
for (const u of ["https://vantbefinfo.com/feed/", "https://www.vantbefinfo.com/feed/", "https://vantbefinfo.com/wp-json/wp/v2/posts?per_page=3", "https://vantbefinfo.com/"]) {
  try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) }); const x = await r.text(); const it = x.split(/<item[\s>]/).slice(1);
    const c = it[0] ? (it[0].match(/<content:encoded>([\s\S]*?)<\/content:encoded>/) || [])[1] : "";
    console.log(`::notice::${u} :: ${r.status} :: ${x.length} car. :: ${it.length} éléments :: texte=${t(c).length} car. :: titre=${it[0] ? t((it[0].match(/<title>([\s\S]*?)<\/title>/) || [])[1]).slice(0, 70) : t(x.slice(0, 300)).slice(0, 120)} :: img=${/<img/.test(c || "")} :: date=${it[0] ? (it[0].match(/<pubDate>([^<]+)/) || [])[1] : ""}`.replace(/%/g, "%25"));
  } catch (e) { console.log(`::notice::${u} :: ${e.message}`); }
}
