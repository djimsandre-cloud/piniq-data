// An Nou Alé · robot des lieux de sortie (OpenStreetMap), une fois par semaine
// Cinémas, théâtres, salles de concert et de spectacle, centres culturels, boîtes de nuit, bars, bowlings, salles de danse
// de toute la France, rangés par carreaux de 1° × 1° : lieux/<lat>_<lon>.json (l'appli lit les carreaux autour d'elle)
// © D'jims ANDRÉ · Tous droits réservés
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { enFranceLL } from "./france.mjs";

const UA = "AnNouAle-lieux/1.0 (robot hebdomadaire ; contact : djims.andre@gmail.com)";
const EPS = (process.env.OVERPASS || "https://overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter,https://overpass.private.coffee/api/interpreter,https://maps.mail.ru/osm/tools/overpass/api/interpreter").split(",");
const T_END = Date.now() + (+(process.env.MINUTES || 80)) * 60e3;
const sleep = ms => new Promise(r => setTimeout(r, ms));
// codes courts des types (l'appli les traduit)
const TYPES = { cinema: "c", theatre: "t", nightclub: "n", music_venue: "m", events_venue: "e", arts_centre: "a", bar: "b", pub: "b", bowling_alley: "w", dance: "d" };

let epi = 0;
async function ask(q){
  for (let k = 0; k < 2 * EPS.length; k++){ const ep = EPS[epi++ % EPS.length], ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 150000);
    try { const r = await fetch(ep, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" }, signal: ctl.signal });
      if (!r.ok){ console.log(`  ${new URL(ep).host} : HTTP ${r.status}`); await sleep(r.status === 429 ? 30000 : 6000); continue; }
      const j = await r.json(); if (!j || !Array.isArray(j.elements) || (j.remark && /error|timed out|memory/i.test(j.remark))){ console.log(`  ${new URL(ep).host} : réponse incomplète`); continue; }
      return j.elements;
    } catch(e){ console.log(`  ${new URL(ep).host} : ${e.name === "AbortError" ? "trop long" : e.message}`); await sleep(4000); }
    finally { clearTimeout(to); } }
  throw new Error("OpenStreetMap ne répond pas");
}
const r5 = v => Math.round(v * 1e5) / 1e5;
const tileOf = (lat, lon) => `${Math.floor(lat)}_${Math.floor(lon)}`;

async function main(){
  // carreaux qui touchent la France (métropole et Corse)
  const tiles = [];
  for (let la = 41; la <= 51; la++) for (let lo = -5; lo <= 9; lo++){
    let ok = false; for (let a = 0; a <= 4 && !ok; a++) for (let b = 0; b <= 4 && !ok; b++) if (enFranceLL(la + a / 4, lo + b / 4)) ok = true;
    if (ok) tiles.push([la, lo]);
  }
  let idx = { tiles: {} }; try { idx = JSON.parse(await readFile("lieux/index.json", "utf8")); } catch(e){}
  // les carreaux les plus anciens d'abord (si le temps manque, la suite passe la semaine suivante)
  tiles.sort((a, b) => ((idx.tiles[a.join("_")] || {}).t || 0) - ((idx.tiles[b.join("_")] || {}).t || 0));
  await mkdir("lieux", { recursive: true });
  let done = 0, total = 0;
  for (const [la, lo] of tiles){
    if (Date.now() > T_END){ console.log(`::notice::${tiles.length - done} carreaux reportés au prochain passage`); break; }
    const bb = `${la},${lo},${la + 1},${lo + 1}`;
    const q = `[out:json][timeout:120];(nwr["amenity"~"^(cinema|theatre|nightclub|music_venue|events_venue|arts_centre|bar|pub)$"](${bb});nwr["leisure"~"^(bowling_alley|dance)$"](${bb}););out center tags;`;
    try {
      const els = await ask(q), out = [], seen = new Set();
      for (const e of els){ const t = e.tags || {}, lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
        if (!t.name || lat == null || !enFranceLL(lat, lon) || tileOf(lat, lon) !== `${la}_${lo}`) continue;
        const ty = TYPES[t.amenity] || TYPES[t.leisure]; if (!ty) continue;
        const k = ty + t.name + r5(lat).toFixed(3); if (seen.has(k)) continue; seen.add(k);
        out.push([e.type[0] + e.id, t.name, ty, r5(lat), r5(lon), t["addr:city"] || "",
          [t["addr:housenumber"], t["addr:street"], t["addr:postcode"]].filter(Boolean).join(" "),
          t.website || t["contact:website"] || "", t.phone || t["contact:phone"] || "", t.opening_hours || ""]); }
      await writeFile(`lieux/${la}_${lo}.json`, JSON.stringify(out));
      idx.tiles[`${la}_${lo}`] = { t: Date.now(), n: out.length }; done++; total += out.length;
      console.log(`${la}_${lo} : ${out.length} lieux`);
    } catch(e){ console.log(`  ${la}_${lo} : ${e.message}`); }
    await sleep(3000);
  }
  idx.updated = new Date().toISOString();
  await writeFile("lieux/index.json", JSON.stringify(idx));
  const n = Object.values(idx.tiles).reduce((a, x) => a + x.n, 0);
  console.log(`::notice::${done} carreaux mis à jour (${total} lieux) · ${Object.keys(idx.tiles).length} carreaux en tout · ${n} lieux en France`);
}
main().catch(e => { console.log(`::error::${e.message || e}`); process.exit(1); });
