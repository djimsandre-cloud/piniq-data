const UA = { "User-Agent": "Mozilla/5.0 (compatible; Medyapam-robot/1.0; +https://medyapam.web.app)", "Accept-Language": "fr-FR,fr;q=0.9" };
const lire = async (u) => { try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) }); return [r.status, await r.text()]; } catch (e) { return [0, e.message]; } };
const txt = (s) => String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const out = [];
{ const [st, x] = await lire("https://www.rfi.fr/fr/auteur/am%C3%A9lie-baron/rss"); const it = x.split(/<item[\s>]/).slice(1);
  out.push(`Amélie Baron RSS :: HTTP ${st} :: ${it.length} articles :: ${it.slice(0, 3).map((i) => txt((i.match(/<title>([\s\S]*?)<\/title>/) || [])[1]).slice(0, 60) + " (" + txt((i.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]).slice(5, 16) + ")").join(" | ")} :: résumé ${txt((it[0] || "").match(/<description>([\s\S]*?)<\/description>/)?.[1]).length} car.`); }
{ const [st, h] = await lire("https://www.ayibopost.com/");
  const liens = [...new Set([...h.matchAll(/href="(https:\/\/www\.ayibopost\.com\/[a-z0-9-]{25,}\/?)"/g)].map((m) => m[1]))];
  out.push(`AyiboPost accueil :: ${liens.length} liens d'articles :: ${liens.slice(0, 3).join(" ")}`);
  if (liens[0]) { const [s2, p] = await lire(liens[0]); const ld = (p.match(/"articleBody":"((?:[^"\\]|\\.){0,300})/) || [])[1] || "";
    const paras = [...p.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => txt(m[1])).filter((t) => t.length > 80);
    out.push(`AyiboPost article :: HTTP ${s2} :: ${paras.length} paragraphes, ${paras.join(" ").length} car. :: og:image ${/og:image/.test(p)} :: articleBody=${ld.length} :: auteur=${(p.match(/"author":\{[^}]*"name":"([^"]+)/) || [])[1] || ""}`); } }
for (const o of out) console.log("::notice::" + o.replace(/%/g, "%25"));
