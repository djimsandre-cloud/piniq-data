// Sonde temporaire : la recherche YouTube est-elle lisible sans clé ?
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
async function chercher(q, sp) {
  const r = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=${sp}&hl=fr&gl=FR`, { headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9", Cookie: "SOCS=CAI; CONSENT=YES+1" } });
  const t = await r.text(); const m = t.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
  if (!m) return { statut: r.status, taille: t.length, erreur: "pas de données", debut: t.slice(0, 200).replace(/\s+/g, " ") };
  const out = []; const voir = (o) => { if (!o || typeof o !== "object") return; if (o.videoRenderer) { const v = o.videoRenderer; out.push({ id: v.videoId, titre: (v.title?.runs || []).map((x) => x.text).join(""), chaine: v.ownerText?.runs?.[0]?.text, chId: v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId, quand: v.publishedTimeText?.simpleText, duree: v.lengthText?.simpleText, vues: v.viewCountText?.simpleText, desc: (v.detailedMetadataSnippets?.[0]?.snippetText?.runs || []).map((x) => x.text).join("").slice(0, 80) }); return; } for (const k in o) voir(o[k]); };
  voir(JSON.parse(m[1])); return { statut: r.status, n: out.length, out };
}
for (const [q, sp] of [["Haïti", "CAISBAgCEAE%3D"], ["Haiti actualités", "CAISBAgCEAE%3D"], ["Ayiti", "CAISBAgCEAE%3D"], ["Haïti", "EgIIAg%3D%3D"]]) {
  const r = await chercher(q, sp);
  console.log(`\n=== ${q} (${sp}) statut ${r.statut} · ${r.n ?? r.erreur} ${r.debut || ""}`);
  for (const v of (r.out || []).slice(0, 25)) console.log(` ${v.id} | ${v.quand} | ${v.duree} | ${v.vues} | ${v.chaine} (${v.chId}) | ${v.titre.slice(0, 90)}`);
}
