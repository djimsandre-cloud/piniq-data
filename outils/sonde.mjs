const UA = { "User-Agent": "Mozilla/5.0 (compatible; Medyapam-robot/1.0; +https://medyapam.web.app)" };
const lire = async (u) => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) }); return [r.status, await r.text()]; };
const out = [];
const [, h] = await lire("https://www.ayibopost.com/");
const js = [...h.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => new URL(m[1], "https://www.ayibopost.com/").href);
out.push("scripts :: " + js.join(" "));
for (const u of js.filter((x) => x.includes("ayibopost")).slice(0, 2)) {
  const [, s] = await lire(u);
  const api = [...new Set(s.match(/https?:\/\/[a-z0-9.-]+\/[a-z0-9_\/.-]*(api|graphql|wp-json|posts|articles)[a-z0-9_\/.?=&-]*/gi) || [])].slice(0, 12);
  out.push(`${u.slice(-40)} :: ${s.length} car. :: API=${api.join(" ")}`);
  const hosts = [...new Set(s.match(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi) || [])].filter((x) => !/w3\.org|react|google|facebook|twitter|schema/.test(x)).slice(0, 15);
  out.push("hôtes :: " + hosts.join(" "));
}
const [, b] = await lire("https://www.rfi.fr/fr/auteur/am%C3%A9lie-baron/rss");
out.push("Baron dates :: " + [...b.matchAll(/<pubDate>([^<]+)/g)].slice(0, 5).map((m) => m[1].slice(5, 16)).join(" | "));
for (const o of out) console.log("::notice::" + o.replace(/%/g, "%25"));
