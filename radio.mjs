// Robot des radios d'Haïti pour RadioPam — © D'jims ANDRÉ · Tous droits réservés
// Plusieurs fois par jour : récupère toutes les radios d'Haïti et de la diaspora dans l'annuaire libre Radio Browser,
// essaie VRAIMENT chaque flux (le son doit arriver), et ne garde que ceux qui se lisent DANS l'appli :
// liens sécurisés (https), formats lus par le téléphone (MP3, AAC, Ogg/Opus). Un lien « http » est retenté en « https ».
// Résultat : radio/haiti.json, lu par l'appli. Une station qui a marché il y a moins de 3 jours reste dans la liste
// (une coupure passagère ne la fait pas disparaître).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const SORTIE = "radio/haiti.json", GARDE = 3 * 864e5, MAINTENANT = Date.now();
const ANNUAIRES = ["https://de1.api.radio-browser.info", "https://fr1.api.radio-browser.info", "https://nl1.api.radio-browser.info", "https://at1.api.radio-browser.info"];
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36 RadioPam-robot";
const sommeil = ms => new Promise(r => setTimeout(r, ms));
const norm = n => String(n || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

async function annuaire(chemin){
  for (const h of ANNUAIRES) {
    try { const r = await fetch(h + chemin, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) }); if (r.ok) return await r.json(); } catch(_){}
  }
  console.log(`::warning::annuaire injoignable pour ${chemin}`); return [];
}

// Le flux joue-t-il ? On lit le début du son : au moins 24 Ko d'audio en 10 s.
const AUDIO = /^(audio\/|application\/ogg|application\/octet-stream|video\/mp2t)/i;
async function joue(url, profondeur = 0){
  if (!url.startsWith("https://")) return null;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Icy-MetaData": "0" }, redirect: "follow", signal: ctl.signal });
    if (!r.ok || !r.body) return null;
    const fin = r.url || url;
    if (!fin.startsWith("https://")) return null;                       // redirigé vers du http : illisible dans l'appli
    const type = (r.headers.get("content-type") || "").split(";")[0].trim();
    if (/mpegurl|x-scpls|text\/plain|audio\/x-scpls/i.test(type) || /\.(m3u8?|pls)(\?|$)/i.test(fin)) {
      if (profondeur) return null;
      const txt = (await r.text().catch(() => "")).slice(0, 20000);
      if (/#EXT-X-/i.test(txt)) return null;                              // HLS : non retenu
      const liens = [...txt.matchAll(/https?:\/\/[^\s"'<>]+/g)].map(m => m[0].replace(/^http:/, "https:")).slice(0, 3);
      for (const l of liens) { const ok = await joue(l, 1); if (ok) return ok; }
      return null;
    }
    if (type && !AUDIO.test(type)) return null;
    const lecteur = r.body.getReader(); let recu = 0;
    while (recu < 24576) { const { value, done } = await lecteur.read(); if (done) break; recu += value.length; }
    lecteur.cancel().catch(() => {});
    return recu >= 24576 ? { url: fin, type, bitrate: Number(r.headers.get("icy-br")) || 0 } : null;
  } catch(_){ return null; } finally { clearTimeout(t); }
}

// Liens à essayer pour une station : https d'abord, puis la version https des liens http
function liens(x){
  const brut = [x.url_resolved, x.url].filter(u => typeof u === "string" && /^https?:\/\//.test(u));
  return [...new Set([...brut.filter(u => u.startsWith("https://")), ...brut.filter(u => u.startsWith("http://")).map(u => "https://" + u.slice(7))])].slice(0, 4);
}

async function main(){
  // 1. Candidats : pays Haïti, mots-clés haïtiens, langue créole
  const listes = await Promise.all([
    annuaire("/json/stations/bycountrycodeexact/HT?limit=1000"),
    ...["haiti", "haitian", "ayiti", "kreyol", "konpa", "kompa", "haitian music"].map(t => annuaire(`/json/stations/bytagexact/${encodeURIComponent(t)}?limit=500`)),
    annuaire("/json/stations/bylanguageexact/" + encodeURIComponent("haitian creole") + "?limit=500"),
    annuaire("/json/stations/bylanguageexact/kreyol?limit=500"),
    ...["haiti", "ayiti", "haitienne", "kreyol"].map(n => annuaire(`/json/stations/byname/${encodeURIComponent(n)}?limit=300`)),
  ]);
  const vus = new Map();
  for (const x of listes.flat()) {
    if (!x || !x.stationuuid || vus.has(x.stationuuid)) continue;
    const pays = x.countrycode === "HT", lie = /ha[iï]ti|ayiti|kreyol|krey[oò]l|konpa|kompa|port.?au.?prince|cap.?ha[iï]tien|jacmel|gona[iï]ves/i.test(`${x.name} ${x.tags} ${x.language} ${x.homepage}`);
    if (pays || lie) vus.set(x.stationuuid, x);
  }
  const candidats = [...vus.values()];
  console.log(`::notice::${candidats.length} stations candidates dans l'annuaire`);

  // 2. Test réel de chaque flux, 10 à la fois
  const bonnes = []; let i = 0, testes = 0;
  async function ouvrier(){
    while (i < candidats.length) {
      const x = candidats[i++]; testes++;
      const ok = [];
      for (const u of liens(x)) { const r = await joue(u); if (r && !ok.some(o => o.url === r.url)) ok.push(r); if (ok.length >= 2) break; }
      if (ok.length) bonnes.push({ x, ok });
    }
  }
  await Promise.all(Array.from({ length: 10 }, ouvrier));

  // 3. Fusion avec la liste précédente (garde 3 jours), une station par nom
  const avant = existsSync(SORTIE) ? JSON.parse(readFileSync(SORTIE, "utf8")).stations || [] : [];
  const parNom = new Map();
  for (const { x, ok } of bonnes.sort((a, b) => (b.x.votes || 0) - (a.x.votes || 0))) {
    const k = norm(x.name); if (k.length < 2) continue;
    const s = parNom.get(k) || { id: "rb-" + x.stationuuid, n: x.name.trim().replace(/\s+/g, " "), urls: [], site: x.homepage || "",
      favicon: (x.favicon || "").replace(/^http:/, "https:"), votes: x.votes || 0, tags: (x.tags || "").split(",").filter(Boolean).slice(0, 5),
      ville: x.state || "", pays: x.countrycode || "", codec: x.codec || "", debit: x.bitrate || ok[0].bitrate || 0 };
    for (const o of ok) if (!s.urls.includes(o.url)) s.urls.push(o.url);
    s.ok = new Date(MAINTENANT).toISOString();
    parNom.set(k, s);
  }
  let gardees = 0;
  for (const s of avant) {
    const k = norm(s.n);
    if (!parNom.has(k) && s.ok && MAINTENANT - Date.parse(s.ok) < GARDE) { parNom.set(k, s); gardees++; }
  }
  const stations = [...parNom.values()].sort((a, b) => b.votes - a.votes || a.n.localeCompare(b.n));
  mkdirSync("radio", { recursive: true });
  writeFileSync(SORTIE, JSON.stringify({ maj: new Date(MAINTENANT).toISOString(), testees: testes, stations }, null, 1));
  console.log(`::notice::${testes} stations testées · ${bonnes.length} jouent maintenant · ${gardees} gardées (ont joué il y a moins de 3 jours) · ${stations.length} dans la liste`);
}
main().catch(e => { console.log(`::error::${e.message || e}`); process.exit(1); });
