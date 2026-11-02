const UA = { "User-Agent": "Mozilla/5.0 (compatible; Medyapam-robot/1.0; +https://medyapam.web.app)", "Accept-Language": "fr-FR,fr;q=0.9" };
const out = [];
const r = await fetch("https://lenouvelliste.com/", { headers: UA }); const h = await r.text();
out.push(`accueil :: ${r.status} :: ${h.length} car. :: lang=${(h.match(/<html[^>]*lang="([^"]+)/) || [])[1]} :: titre=${(h.match(/<title>([^<]+)/) || [])[1]}`);
const liens = [...new Set([...h.matchAll(/href="((?:https:\/\/lenouvelliste\.com)?\/article\/[^"]+)"/g)].map((m) => m[1]))];
out.push(`liens /article (${liens.length}) :: ${liens.slice(0, 5).join(" ")}`);
const autres = [...new Set([...h.matchAll(/href="(\/[a-z-]+\/[^"]{15,})"/g)].map((m) => m[1].split("/")[1]))].slice(0, 15);
out.push("préfixes :: " + autres.join(" "));
const u = liens[0] ? new URL(liens[0], "https://lenouvelliste.com").href : "";
if (u) { const a = await (await fetch(u, { headers: UA })).text();
  const ps = [...a.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim()).filter((x) => x.length > 60);
  out.push(`article :: ${u} :: titre=${(a.match(/og:title" content="([^"]+)/) || [])[1]} :: desc=${((a.match(/og:description" content="([^"]+)/) || [])[1] || "").slice(0, 150)} :: img=${((a.match(/og:image" content="([^"]+)/) || [])[1] || "").slice(0, 60)} :: auteur=${(a.match(/name="author" content="([^"]+)/) || [])[1]} :: date=${(a.match(/published_time" content="([^"]+)/) || [])[1]} :: paragraphes=${ps.length} (${ps.join(" ").length} car.) :: abonné=${/abonn|subscribe|premium|paywall/i.test(a)}`); }
for (const o of out) console.log("::notice::" + o.replace(/%/g, "%25"));
