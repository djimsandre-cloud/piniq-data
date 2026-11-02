const UA = { "User-Agent": "Mozilla/5.0 (compatible; Medyapam-robot/1.0; +https://medyapam.web.app)", "Accept-Language": "fr-FR,fr;q=0.9" };
const out = [];
const a = await (await fetch("https://lenouvelliste.com/article/273494/mgr-jean-pierre-sander-louis-jean-officiellement-installe-comme-eveque-du-diocese-de-fort-liberte", { headers: UA })).text();
for (const mot of ["2026", "Publi", "auteur", "author", "datetime", "ld+json", "byline", "Par "]) {
  const re = new RegExp(mot, "g"); let m, n = 0;
  while ((m = re.exec(a)) && n < 2) { n++; out.push(mot + " :: " + a.slice(Math.max(0, m.index - 150), m.index + 200).replace(/\s+/g, " ")); }
}
for (const o of out) console.log("::notice::" + o.replace(/%/g, "%25"));
