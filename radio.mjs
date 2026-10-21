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
    // on garde le lien d'origine : l'adresse finale contient souvent un jeton qui expire (zeno.fm)
    return recu >= 24576 ? { url, type, bitrate: Number(r.headers.get("icy-br")) || 0 } : null;
  } catch(_){ return null; } finally { clearTimeout(t); }
}

// Adresse stable d'un flux : les liens zeno.fm / surfernetwork avec jeton (zt=, zs=) expirent au bout de quelques heures,
// on revient donc à l'adresse publique https://stream.zeno.fm/<identifiant>
function stable(u){
  const m = /^https?:\/\/stream(?:-\d+)?\.(?:zeno\.fm|surfernetwork\.com)\/([a-z0-9]{8,})/i.exec(u);
  if (m) return "https://stream.zeno.fm/" + m[1];
  return /[?&](zt|zs)=/.test(u) ? "" : u;
}
// Liens à essayer pour une station : lien d'origine d'abord, https d'abord, puis la version https des liens http
function liens(x){
  const brut = [x.url, x.url_resolved].filter(u => typeof u === "string" && /^https?:\/\//.test(u)).map(stable).filter(Boolean);
  return [...new Set([...brut.filter(u => u.startsWith("https://")), ...brut.filter(u => u.startsWith("http://")).map(u => "https://" + u.slice(7))])].slice(0, 4);
}

// Stations de la liste fixe de RadioPam : on vérifie leur lien, et on leur trouve des liens de secours
const FIXES = [
  { id: "caraibes", q: "Caraibes", c: "HT", url: "https://stream.zeno.fm/54k0v7x14neuv" }, { id: "scoop", q: "Scoop FM", c: "HT" },
  { id: "rtvs", q: "Supreme", c: "HT", url: "https://stream.zeno.fm/bdkwbv3rt98uv" }, { id: "intermix", q: "Intermix", c: "HT" }, { id: "rhai", q: "RHAI", c: "HT" },
  { id: "4veh", q: "4VEH", c: "HT", url: "https://stream.zeno.fm/0zef35h1my5tv" }, { id: "bienetre", q: "Bien Etre", c: "HT", url: "https://stream.zeno.fm/zxg8t9gr3f8uv" },
  { id: "jamesen", q: "Jamesen", c: "HT", url: "https://stream.zeno.fm/aparrwtkwyzuv" }, { id: "tipiti", q: "Tipiti", c: "HT", url: "https://a8.asurahosting.com:7530/stream" },
  { id: "inter", q: "France Inter", c: "FR", url: "https://icecast.radiofrance.fr/franceinter-midfi.mp3" }, { id: "info", q: "franceinfo", c: "FR", url: "https://icecast.radiofrance.fr/franceinfo-midfi.mp3" },
  { id: "fip", q: "FIP", c: "FR", url: "https://icecast.radiofrance.fr/fip-midfi.mp3" }, { id: "culture", q: "France Culture", c: "FR", url: "https://icecast.radiofrance.fr/franceculture-midfi.mp3" },
  { id: "mouv", q: "Mouv", c: "FR", url: "https://icecast.radiofrance.fr/mouv-midfi.mp3" },
  { id: "rfi", q: "RFI Monde", c: "FR" }, { id: "rtl", q: "RTL", c: "FR" }, { id: "europe1", q: "Europe 1", c: "FR" }, { id: "nrj", q: "NRJ", c: "FR" },
  { id: "nostalgie", q: "Nostalgie", c: "FR" }, { id: "skyrock", q: "Skyrock", c: "FR" }, { id: "fun", q: "Fun Radio", c: "FR" },
];
async function liensFixes(){
  const res = {};
  for (const f of FIXES) {
    const trouves = await annuaire(`/json/stations/search?name=${encodeURIComponent(f.q)}&countrycode=${f.c}&order=votes&reverse=true&limit=12`);
    const k = norm(f.q);
    const proches = trouves.filter(x => norm(x.name).startsWith(k) || norm(x.name) === k || norm(x.name).includes(k)).slice(0, 6);
    const essais = [...new Set([f.url, ...proches.flatMap(liens)].filter(Boolean))].slice(0, 8);
    const ok = [];
    for (const u of essais) { if (ok.length >= 3) break; const r = await joue(u); if (r && !ok.includes(r.url)) ok.push(r.url); }
    res[f.id] = { urls: ok, principal: f.url ? ok.includes(f.url) : null };
  }
  return res;
}

async function main(){
  // 1. Candidats : pays Haïti, mots-clés haïtiens, langue créole
  const listes = await Promise.all([
    annuaire("/json/stations/bycountrycodeexact/HT?limit=1000"),
    ...["haiti", "haitian", "ayiti", "kreyol", "konpa", "kompa", "haitian music"].map(t => annuaire(`/json/stations/bytagexact/${encodeURIComponent(t)}?limit=500`)),
    annuaire("/json/stations/bylanguageexact/" + encodeURIComponent("haitian creole") + "?limit=500"),
    annuaire("/json/stations/bylanguageexact/kreyol?limit=500"),
    ...["haiti", "ayiti", "haitienne", "haitien", "kreyol", "konpa", "kompa", "lakay", "tele haiti"].map(n => annuaire(`/json/stations/byname/${encodeURIComponent(n)}?limit=300`)),
  ]);
  const vus = new Map();
  for (const x of listes.flat()) {
    if (!x || !x.stationuuid || vus.has(x.stationuuid)) continue;
    // Haïti : enregistrée en Haïti, ou radio de la diaspora dont le nom ou les mots-clés sont haïtiens
    const nom = x.name || "", tags = String(x.tags || "");             // la langue seule ne suffit pas (radios multilingues)
    const haitienne = /ha[iï]ti|ayiti|krey[oò]l|konpa|kompa|lakay|port.?au.?prince|cap.?ha[iï]tien|jacmel|gona[iï]ves|p[eé]tion.?ville/i.test(nom)
      || /ha[iï]ti|haitian|ayiti|krey[oò]l|cr[eé]ole ha[iï]tien/i.test(tags);
    const intrus = nom.trim().length < 4 || /islam|quran|coran|christmas|no[eë]l/i.test(`${nom} ${x.homepage}`)
      || /(^|\.)(rfi\.fr|laut\.fm|mp3islam\.com)/i.test(String(x.homepage).replace(/^https?:\/\//, "").split("/")[0]);
    if ((x.countrycode === "HT" || haitienne) && !intrus) vus.set(x.stationuuid, x);
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
  const parNom = new Map(), urlsPrises = new Set();
  for (const { x, ok } of bonnes.sort((a, b) => (b.x.votes || 0) - (a.x.votes || 0))) {
    const k = norm(x.name); if (k.length < 2) continue;
    if (!parNom.has(k) && ok.every(o => urlsPrises.has(o.url))) continue;          // même flux qu'une station déjà retenue
    const s = parNom.get(k) || { id: "rb-" + x.stationuuid, n: x.name.trim().replace(/\s+/g, " "), urls: [], site: x.homepage || "",
      favicon: (x.favicon || "").replace(/^http:/, "https:"), votes: x.votes || 0, tags: (x.tags || "").split(",").filter(Boolean).slice(0, 5),
      ville: x.state || "", pays: x.countrycode || "", codec: x.codec || "", debit: x.bitrate || ok[0].bitrate || 0 };
    for (const o of ok) if (!s.urls.includes(o.url)) { s.urls.push(o.url); urlsPrises.add(o.url); }
    s.ok = new Date(MAINTENANT).toISOString();
    parNom.set(k, s);
  }
  let gardees = 0;
  for (const s of avant) {
    const k = norm(s.n);
    s.urls = (s.urls || []).map(stable).filter(Boolean);
    if (!parNom.has(k) && s.urls.length && !s.urls.some(u => urlsPrises.has(u)) && s.ok && MAINTENANT - Date.parse(s.ok) < GARDE) { parNom.set(k, s); gardees++; }
  }
  const stations = [...parNom.values()].sort((a, b) => b.votes - a.votes || a.n.localeCompare(b.n));
  const fixes = await liensFixes();
  const morts = Object.entries(fixes).filter(([, v]) => !v.urls.length).map(([k]) => k);
  if (morts.length) console.log(`::warning::Stations de la liste sans aucun lien qui joue : ${morts.join(", ")}`);
  mkdirSync("radio", { recursive: true });
  writeFileSync(SORTIE, JSON.stringify({ maj: new Date(MAINTENANT).toISOString(), testees: testes, fixes, stations }, null, 1));
  console.log(`::notice::${testes} stations testées · ${bonnes.length} jouent maintenant · ${gardees} gardées (ont joué il y a moins de 3 jours) · ${stations.length} dans la liste`);
}
main().catch(e => { console.log(`::error::${e.message || e}`); process.exit(1); });
