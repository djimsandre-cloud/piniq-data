// PinIQ · robot des calendriers de compétitions des golfs français
// Une fois par semaine (GitHub Actions) : golfs ayant un site web (OpenStreetMap) → pages « compétitions / calendrier »
// → agendas Google publics et fichiers iCal → compétitions à venir dans data/compets.json
// © D'jims ANDRÉ · Tous droits réservés
import { readFile, writeFile, mkdir } from "node:fs/promises";

const UA = "PinIQ-calendriers/1.0 (robot hebdomadaire ; contact : djims.andre@gmail.com)";
const NTFY = process.env.NTFY_TOPIC || "caddybook-d4535629da";
const GCAL = process.env.GCAL_BASE || "https://calendar.google.com";
const OUT = "data/compets.json";
const DAY = 864e5, NOW = Date.now(), FROM = NOW - DAY, TO = NOW + 150 * DAY;
const MAX_GOLFS = +(process.env.MAX_GOLFS || 1500);

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, ms = 12000){
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "fr" }, redirect: "follow", signal: ctl.signal }); if (!r.ok) return null;
    const t = await r.text(); return t.length > 3e6 ? t.slice(0, 3e6) : t; }
  catch(e){ return null; } finally { clearTimeout(to); }
}

// Contour simplifié de la France métropolitaine et de la Corse (lat, lon)
const FR = [[51.09,2.54],[50.81,2.95],[50.75,3.3],[50.5,3.7],[50.33,4.15],[49.97,4.15],[50.12,4.85],[49.8,4.9],[49.55,5.47],[49.47,6.37],[49.17,6.75],[49.21,7.37],[49.05,8.2],[48.55,7.8],[47.9,7.58],[47.59,7.59],[47.43,6.95],[47.03,6.7],[46.42,6.1],[46.26,5.98],[46.13,6.2],[46.4,6.55],[46.45,6.8],[46.16,6.86],[45.83,7.03],[45.14,7.13],[44.85,7.0],[44.13,7.71],[43.79,7.53],[43.5,7.1],[43.0,6.1],[43.2,5.0],[43.35,4.3],[43.15,3.4],[42.43,3.2],[42.42,2.5],[42.55,1.75],[42.75,0.6],[42.8,-0.3],[43.05,-1.0],[43.37,-1.8],[44.5,-1.35],[46.2,-1.65],[47.2,-2.6],[47.7,-4.0],[48.0,-4.9],[48.7,-4.85],[48.9,-3.0],[48.7,-1.6],[49.78,-2.0],[49.75,-1.2],[49.4,-1.0],[49.55,0.1],[50.05,1.4],[50.95,1.55]];
const CORSE = [[43.05,9.35],[42.6,9.6],[41.9,9.45],[41.35,9.25],[41.5,8.75],[42.25,8.5],[42.75,9.15]];
function dedans(lat, lon, poly){ let ok = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){ const [ai, bi] = poly[i], [aj, bj] = poly[j]; if ((bi > lon) !== (bj > lon) && lat < (aj - ai) * (lon - bi) / (bj - bi) + ai) ok = !ok; } return ok; }
const ETRANGER = /\.(de|ch|it|es|be|nl|lu|at|uk|cat|ad|pt|ie)$/i;
const enFrance = g => (dedans(g.ll[0], g.ll[1], FR) || dedans(g.ll[0], g.ll[1], CORSE)) && !ETRANGER.test(new URL(g.site).host);

// 1. Golfs français avec un site web
async function golfs(){
  if (process.env.TEST_GOLFS) return JSON.parse(await readFile(process.env.TEST_GOLFS, "utf8"));
  // France métropolitaine (cadre géographique : plus léger pour OpenStreetMap qu'une recherche par frontière)
  const q = `[out:json][timeout:180][bbox:41.3,-5.3,51.15,9.7];(way["leisure"="golf_course"];relation["leisure"="golf_course"];);out center tags;`;
  const EPS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
  for (let tour = 0; tour < 2; tour++) for (const ep of EPS){
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 200000);
    try { const r = await fetch(ep, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" }, signal: ctl.signal });
      if (!r.ok){ console.log(`::warning::${new URL(ep).host} : HTTP ${r.status}`); await sleep(15000); continue; }
      const j = await r.json(), seen = new Set(), out = [];
      for (const e of j.elements || []){ const t = e.tags || {}, c = e.center, web = t.website || t["contact:website"] || t.url;
        if (!c || !web || !t.name || /mini.?golf|foot.?golf|disc.?golf|practice/i.test(t.name)) continue;
        let host; try { host = new URL(/^https?:/i.test(web) ? web : "https://" + web).host; } catch(e){ continue; }
        if (seen.has(host)) continue;
        const g = { name: t.name, ll: [+c.lat.toFixed(5), +c.lon.toFixed(5)], site: /^https?:/i.test(web) ? web : "https://" + web };
        if (!enFrance(g)) continue; seen.add(host); out.push(g); }
      if (out.length < 50){ console.log(`::warning::${new URL(ep).host} : seulement ${out.length} golfs`); continue; }
      await mkdir("data", { recursive: true }); await writeFile("data/golfs.json", JSON.stringify(out));
      return out;
    } catch(e){ console.log(`::warning::${new URL(ep).host} : ${e.name === "AbortError" ? "trop long" : e.message}`); }
    finally { clearTimeout(to); }
  }
  // OpenStreetMap indisponible : on reprend la liste de la semaine précédente
  try { const old = JSON.parse(await readFile("data/golfs.json", "utf8")).filter(enFrance); if (old.length){ console.log(`::warning::OpenStreetMap indisponible, liste précédente (${old.length} golfs)`); return old; } } catch(e){}
  throw new Error("OpenStreetMap ne répond pas");
}

// 2. Calendriers publiés sur les pages du club
const absUrl = (h, base) => { try { return new URL(h.replace(/&amp;/g, "&"), base).href; } catch(e){ return null; } };
function gcalIds(html){
  const ids = new Set(), re = /calendar\.google\.com\/calendar\/(?:u\/\d+\/)?(?:embed|ical|htmlembed|r)[^"'\s<>]*/gi;
  for (const m of html.matchAll(re)){
    const u = m[0].replace(/&amp;|&#0?38;/g, "&");
    for (const s of u.matchAll(/[?&](?:src|cid)=([^&#"']+)/g)){ let id = decodeURIComponent(s[1]);
      if (!id.includes("@")){ try { const d = Buffer.from(id.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"); if (/^[\w.+-]+@[\w.-]+$/.test(d)) id = d; } catch(e){} }
      if (/^[\w.+-]+@[\w.-]+\.\w+$/.test(id) && !/holiday|#contacts|addressbook/i.test(id)) ids.add(id); }
    const ic = u.match(/\/ical\/([^/]+)\/public\//); if (ic) ids.add(decodeURIComponent(ic[1]));
  }
  return [...ids];
}
function icsLinks(html, base){ const out = new Set(); for (const m of html.matchAll(/(?:href|src)=["']([^"']+\.ics(?:\?[^"']*)?)["']/gi)){ const u = absUrl(m[1].replace(/^webcal:/i, "https:"), base); if (u && !/calendar\.google\.com/.test(u)) out.add(u); } for (const m of html.matchAll(/webcal:\/\/[^"'\s<>]+/gi)) out.add(m[0].replace(/^webcal:/i, "https:")); return [...out]; }
function subPages(html, base){
  const host = new URL(base).host, out = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)){
    const u = absUrl(m[1], base), txt = (m[2] || "").replace(/<[^>]+>/g, " ").toLowerCase();
    if (!u || new URL(u).host !== host || /\.(pdf|jpe?g|png|gif|zip|docx?)$/i.test(u)) continue;
    if (/comp[eé]ti|calendri|agenda|[eé]v[eè]nement|events?\b|planning|programme/.test(u.toLowerCase() + " " + txt) && !out.includes(u)) out.push(u);
  }
  return out.slice(0, 4);
}
async function findCals(g){
  const home = await get(g.site); if (!home) return { g: [], i: [] };
  let G = gcalIds(home), I = icsLinks(home, g.site);
  for (const p of subPages(home, g.site)){ await sleep(400); const h = await get(p); if (!h) continue; G = G.concat(gcalIds(h)); I = I.concat(icsLinks(h, p)); }
  return { g: [...new Set(G)], i: [...new Set(I)].slice(0, 3) };
}

// 3. Lecture iCal (agendas Google publics et fichiers .ics)
function parseICS(txt){
  const lines = txt.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/), ev = []; let cur = null;
  const un = v => v.replace(/\\n/gi, " · ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  for (const l of lines){
    if (l === "BEGIN:VEVENT") cur = {}; else if (l === "END:VEVENT"){ if (cur) ev.push(cur); cur = null; }
    else if (cur){ const i = l.indexOf(":"); if (i < 0) continue; const k = l.slice(0, i), v = l.slice(i + 1), name = k.split(";")[0];
      if (name === "DTSTART") cur.start = { v, utc: v.endsWith("Z"), date: /VALUE=DATE/.test(k) || /^\d{8}$/.test(v) };
      else if (name === "SUMMARY") cur.name = un(v); else if (name === "DESCRIPTION") cur.info = un(v); else if (name === "STATUS") cur.status = v; else if (name === "RRULE") cur.rrule = v; }
  }
  return ev.filter(e => e.start && e.name && e.status !== "CANCELLED" && !e.rrule).map(e => {
    const m = e.start.v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/); if (!m) return null;
    let d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0))); let h = "";
    if (m[4] && !e.start.date){ if (e.start.utc){ const p = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d); const o = Object.fromEntries(p.map(x => [x.type, x.value])); d = new Date(`${o.year}-${o.month}-${o.day}T12:00:00Z`); h = `${+o.hour} h${o.minute !== "00" ? " " + o.minute : ""}`; }
      else h = `${+m[4]} h${m[5] !== "00" ? " " + m[5] : ""}`; }
    return { t: d.getTime(), d: d.toISOString().slice(0, 10), h, name: e.name.slice(0, 90), info: (e.info || "").slice(0, 140) };
  }).filter(e => e && e.t >= FROM && e.t <= TO).sort((a, b) => a.t - b.t).map(({ t, ...e }) => e).slice(0, 60);
}
async function readCal(url){ const t = await get(url, 20000); return t && t.includes("BEGIN:VCALENDAR") ? parseICS(t) : null; }

// 4. Tout assembler
async function main(){
  let prev = { clubs: [] }; try { prev = JSON.parse(await readFile(OUT, "utf8")); } catch(e){}
  const known = new Set((prev.clubs || []).map(c => c.site));
  const G = (await golfs()).slice(0, MAX_GOLFS), clubs = []; let checked = 0;
  console.log(`${G.length} golfs avec un site web`);
  const queue = [...G], workers = Array.from({ length: 4 }, async () => {
    while (queue.length){ const g = queue.shift(); checked++;
      try { const f = await findCals(g); if (!f.g.length && !f.i.length) continue;
        const cals = [], events = [];
        for (const id of f.g){ const ev = await readCal(`${GCAL}/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`); if (ev){ cals.push(id); events.push(...ev); } }
        for (const u of f.i){ const ev = await readCal(u); if (ev){ cals.push(u); events.push(...ev); } }
        if (cals.length){ const seen = new Set(); clubs.push({ name: g.name, ll: g.ll, site: g.site, cals, events: events.filter(e => { const k = e.d + e.name; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => a.d.localeCompare(b.d)) });
          console.log(`✓ ${g.name} : ${cals.length} calendrier(s), ${events.length} compétition(s)`); }
      } catch(e){}
      await sleep(300);
    } });
  await Promise.all(workers);
  clubs.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  await mkdir("data", { recursive: true });
  await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), checked, clubs }));
  const fresh = clubs.filter(c => !known.has(c.site)), nev = clubs.reduce((a, c) => a + c.events.length, 0);
  console.log(`::notice::${G.length} golfs avec un site · ${clubs.length} publient un calendrier · ${nev} compétitions à venir · ${fresh.length} nouveaux`);
  if (process.env.NO_NTFY) return;
  const msg = `${clubs.length} golfs publient leur calendrier · ${nev} compétitions à venir${fresh.length ? `\nNouveaux : ${fresh.slice(0, 8).map(c => c.name).join(", ")}${fresh.length > 8 ? "…" : ""}` : ""}`;
  try { await fetch("https://ntfy.sh/", { method: "POST", body: JSON.stringify({ topic: NTFY, title: "Calendriers des golfs", message: msg, tags: ["calendar"] }) }); } catch(e){}
}
main().catch(e => { console.log(`::error::${e.message || e}`); process.exit(1); });
