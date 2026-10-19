// PinIQ · robot des plans de golf (OpenStreetMap), une fois par semaine
// 1. tous les golfs de France  2. trous cartographiés (golf=hole) rattachés à chaque golf
// 3. plan complet de chaque golf cartographié (trous, greens, bunkers, fairways, eau, bois) dans plans/<id>.json
// 4. data/plans.json : liste des golfs avec leur état (18 trous, 9 trous, partiel, rien) et les nouveautés de la semaine
// © D'jims ANDRÉ · Tous droits réservés
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { enFranceLL } from "./france.mjs";

const UA = "PinIQ-plans/1.0 (robot hebdomadaire ; contact : djims.andre@gmail.com)";
const EPS = (process.env.OVERPASS || "https://overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter,https://overpass.private.coffee/api/interpreter,https://maps.mail.ru/osm/tools/overpass/api/interpreter").split(",");
const BBOX = "41.3,-5.3,51.15,9.7", DAY = 864e5, NOW = Date.now(), T_END = NOW + (+(process.env.MINUTES || 75)) * 60e3;
const MAX_FETCH = +(process.env.MAX_FETCH || 400);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const r6 = v => Math.round(v * 1e6) / 1e6;

// Overpass, en passant d'un serveur à l'autre
let epi = 0;
async function ask(q, ms = 200000, tries = 2 * EPS.length){
  for (let k = 0; k < tries; k++){ const ep = EPS[epi++ % EPS.length], ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms);
    try { const r = await fetch(ep, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" }, signal: ctl.signal });
      if (!r.ok){ console.log(`  ${new URL(ep).host} : HTTP ${r.status}`); await sleep(r.status === 429 ? 30000 : 8000); continue; }
      const j = await r.json(); if (!j || !Array.isArray(j.elements) || (j.remark && /error|timed out|memory/i.test(j.remark))){ console.log(`  ${new URL(ep).host} : réponse incomplète`); continue; }
      return j.elements;
    } catch(e){ console.log(`  ${new URL(ep).host} : ${e.name === "AbortError" ? "trop long" : e.message}`); await sleep(5000); }
    finally { clearTimeout(to); } }
  throw new Error("OpenStreetMap ne répond pas");
}
const idOf = ll => `p${Math.round(ll[0] * 1000)}_${Math.round(ll[1] * 1000)}`.replace(/-/g, "m");
const km = (a, b) => { const k = Math.cos(a[0] * Math.PI / 180); return Math.hypot((b[0] - a[0]) * 111, (b[1] - a[1]) * 111 * k); };

// Plan d'un golf : même requête et même tri que l'appli (rayon de 1,5 km autour du golf)
async function plan(lat, lon){
  const A = `(around:1500,${lat},${lon})`;
  const els = await ask(`[out:json][timeout:60];(way["golf"="hole"]${A};way["golf"~"^(green|bunker|fairway|water_hazard|lateral_water_hazard)$"]${A};way["natural"~"^(water|wood|sand)$"]${A};way["landuse"="forest"]${A};way["leisure"="golf_course"]${A};);out geom tags;`, 90000, 4);
  const h = {}, P = { greens: [], bunkers: [], fairways: [], water: [], woods: [], course: [] };
  const poly = e => { const g = e.geometry || []; return g.length >= 4 && g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon ? g.slice(0, -1).map(x => [r6(x.lat), r6(x.lon)]) : null; };
  els.forEach(e => { const t = e.tags || {};
    if (t.golf === "hole"){ const n = parseInt(t.ref, 10); if (!(n >= 1 && n <= 18) || h[n] || !e.geometry || e.geometry.length < 2) return;
      h[n] = { par: parseInt(t.par, 10) || null, si: parseInt(t.handicap, 10) || null, dist: parseInt(t.dist, 10) || null, line: e.geometry.map(g => [r6(g.lat), r6(g.lon)]) }; return; }
    const pg = poly(e); if (!pg) return;
    const k = t.golf === "green" ? "greens" : t.golf === "bunker" || (t.natural === "sand" && !t.golf) ? "bunkers" : t.golf === "fairway" ? "fairways" : /water/.test(t.golf || "") || t.natural === "water" ? "water" : t.natural === "wood" || t.landuse === "forest" ? "woods" : t.leisure === "golf_course" ? "course" : null;
    if (k) P[k].push(pg); });
  return { holes: h, poly: P };
}

async function main(){
  let prev = { golfs: [] }; try { prev = JSON.parse(await readFile("data/plans.json", "utf8")); } catch(e){}
  const before = new Map((prev.golfs || []).map(g => [idOf([g[1], g[2]]), g]));
  const sigs = prev.sigs || {};

  // 1. Golfs de France
  console.log("Golfs de France…");
  const gEls = await ask(`[out:json][timeout:180][bbox:${BBOX}];(way["leisure"="golf_course"];relation["leisure"="golf_course"];);out center tags;`);
  const golfs = [];
  for (const e of gEls){ const t = e.tags || {}, c = e.center; if (!c || !t.name || t.golf || /mini.?golf|foot.?golf|disc.?golf|swin|practice/i.test(t.name)) continue;
    if (!enFranceLL(c.lat, c.lon)) continue;
    const ll = [+c.lat.toFixed(5), +c.lon.toFixed(5)];
    if (golfs.some(g => km(g.ll, ll) < 0.4 && g.name === t.name)) continue;
    golfs.push({ name: t.name, ll, id: idOf(ll), refs: new Set(), sig: [] }); }
  console.log(`${golfs.length} golfs en France`);

  // 2. Trous cartographiés, rattachés au golf le plus proche (2,5 km au plus)
  console.log("Trous cartographiés…");
  const hEls = await ask(`[out:json][timeout:180][bbox:${BBOX}];way["golf"="hole"];out center meta;`);
  for (const e of hEls){ if (!e.center) continue; const p = [e.center.lat, e.center.lon]; let best = null, bd = 2.5;
    for (const g of golfs){ if (Math.abs(g.ll[0] - p[0]) > 0.03) continue; const d = km(g.ll, p); if (d < bd){ bd = d; best = g; } }
    if (!best) continue; const r = parseInt((e.tags || {}).ref, 10); if (r >= 1 && r <= 27) best.refs.add(r); best.sig.push(`${e.id}v${e.version || 0}`); }
  const has = (g, k) => Array.from({ length: k }, (_, x) => x + 1).every(r => g.refs.has(r));
  golfs.forEach(g => { g.mapped = g.refs.size; g.ready = has(g, 18) ? 18 : has(g, 9) ? 9 : 0; g.sig = createHash("md5").update(g.sig.sort().join(",")).digest("hex").slice(0, 12); });
  const withHoles = golfs.filter(g => g.mapped);
  console.log(`${hEls.length} trous · ${withHoles.length} golfs cartographiés (${golfs.filter(g => g.ready === 18).length} complets, ${golfs.filter(g => g.ready === 9).length} de 9 trous)`);

  // 3. Plans : seulement les golfs nouveaux ou modifiés sur OpenStreetMap, ou plus vieux que 4 semaines
  await mkdir("plans", { recursive: true });
  const todo = withHoles.filter(g => { const s = sigs[g.id]; return !s || s.sig !== g.sig || NOW - s.t > 28 * DAY; })
    .sort((a, b) => (sigs[a.id] ? 1 : 0) - (sigs[b.id] ? 1 : 0) || b.mapped - a.mapped);
  let done = 0, fail = 0;
  for (const g of todo){
    if (done >= MAX_FETCH || Date.now() > T_END){ console.log(`::notice::${todo.length - done - fail} plans reportés à la semaine prochaine`); break; }
    try { const p = await plan(g.ll[0], g.ll[1]); if (!Object.keys(p.holes).length) throw new Error("aucun trou");
      await writeFile(`plans/${g.id}.json`, JSON.stringify({ name: g.name, ll: g.ll, t: NOW, ...p }));
      sigs[g.id] = { sig: g.sig, t: NOW }; done++;
    } catch(e){ fail++; console.log(`  ${g.name} : ${e.message}`); }
    await sleep(2500);
  }
  // les golfs dont le plan n'a jamais pu être lu restent sans fichier : l'appli interroge alors OpenStreetMap elle-même
  Object.keys(sigs).forEach(id => { if (!golfs.some(g => g.id === id && g.mapped)) delete sigs[id]; });

  // 4. Liste et nouveautés (golfs devenus jouables depuis la semaine dernière)
  const first = !(prev.golfs || []).length;
  // nouveautés datées, gardées 8 jours (le robot passe chaque nuit, le bilan du lundi reprend la semaine)
  const news = (prev.news || []).filter(x => Array.isArray(x) && NOW - x[1] < 8 * DAY);
  if (!first) golfs.filter(g => g.ready && (!before.get(g.id) || (before.get(g.id)[3] || 0) < g.ready)).forEach(g => news.push([`${g.name}${g.ready === 9 ? " (9 trous)" : ""}`, NOW]));
  const out = { updated: new Date(NOW).toISOString(), news, sigs,
    golfs: golfs.sort((a, b) => a.name.localeCompare(b.name, "fr")).map(g => [g.name, g.ll[0], g.ll[1], g.ready, g.mapped, sigs[g.id] ? g.id : ""]) };
  await mkdir("data", { recursive: true });
  await writeFile("data/plans.json", JSON.stringify(out));
  console.log(`::notice::${golfs.length} golfs · ${withHoles.length} cartographiés · ${done} plans mis à jour${fail ? ` · ${fail} échecs` : ""}${news.length ? ` · nouveaux : ${news.filter(x => x[1] === NOW).map(x => x[0]).slice(0, 10).join(", ")}` : ""}`);
}
main().catch(e => { console.log(`::error::${e.message || e}`); process.exit(1); });
