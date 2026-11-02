const UA = { "User-Agent": "Mozilla/5.0 (compatible; Medyapam-robot/1.0; +https://medyapam.web.app)" };
const out = [];
const r = await fetch("https://backoffice.ayibopost.com/wp-json/wp/v2/posts?per_page=5&_embed=author,wp:featuredmedia", { headers: UA, signal: AbortSignal.timeout(25000) });
out.push("statut " + r.status);
const l = await r.json();
for (const p of l.slice(0, 5)) {
  const c = (p.content && p.content.rendered) || "", txt = c.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const img = (((p._embedded || {})["wp:featuredmedia"] || [])[0] || {}).source_url || "";
  const aut = ((((p._embedded || {}).author) || [])[0] || {}).name || "";
  out.push(`${p.date} :: ${p.title.rendered.slice(0, 70)} :: lien=${p.link} :: slug=${p.slug} :: texte=${txt.length} car. :: img=${img.slice(0, 70)} :: auteur=${aut} :: lang=${p.lang || ""} :: début=${txt.slice(0, 120)}`);
}
const f = await fetch("https://backoffice.ayibopost.com/feed/", { headers: UA }); const fx = await f.text();
out.push("backoffice feed :: " + f.status + " :: " + (fx.match(/<item>/g) || []).length + " éléments");
for (const o of out) console.log("::notice::" + o.replace(/%/g, "%25"));
