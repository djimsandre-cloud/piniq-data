const UA = { "User-Agent": "Mozilla/5.0 (compatible; Medyapam-robot/1.0; +https://medyapam.web.app)", "Accept-Language": "fr-FR,fr;q=0.9" };
const out = [];
const h = await (await fetch("https://lenouvelliste.com/", { headers: UA })).text();
const liens = [...new Set([...h.matchAll(/href="(\/article\/\d+\/[^"#?]+)"/g)].map((m) => m[1]))].slice(0, 6);
for (const l of liens) {
  const a = await (await fetch("https://lenouvelliste.com" + l, { headers: UA })).text();
  const i = a.indexOf('"author":'), o = a.lastIndexOf("{", i), f = a.indexOf("}", i);
  const keys = JSON.parse(a.slice(o, f + 1));
  const rest = a.slice(f + 1, f + 6000), vals = [], re = /\s*,\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null)/y; let m;
  while (vals.length < 14 && (m = re.exec(rest))) vals.push(JSON.parse(m[1]));
  const base = Math.min(...Object.values(keys).filter((v) => v >= 0)), val = (k) => keys[k] >= 0 ? vals[keys[k] - base] : undefined;
  out.push(`${l.slice(9, 50)} :: base=${base} n=${vals.length} :: titre=${String(val("title")).slice(0, 40)} :: auteur=${val("author")} :: date=${val("date")} :: résumé=${String(val("summary")).slice(0, 50)}`);
}
for (const o of out) console.log("::notice::" + o.replace(/%/g, "%25"));
