// Contrôle ponctuel des sites en ligne (retiré ensuite)
import { chromium } from "playwright";
const SITES = { PinIQ: "https://caddybook-957f3.web.app/", "Popote & Co": "https://popote-2026.web.app/", "An Nou Alé": "https://an-nou-ale-93b46.web.app/", KrediCash: "https://kredicash.web.app/",
  BudSnap: "https://budegetpilot.web.app/", "Séré'l byen": "https://serel-byen-2026.web.app/", SmartCode: "https://smartcode-3cf3d.web.app/", "Salle de jeux": "https://salle-de-jeux-2026.web.app/",
  Medyapam: "https://medyapam.web.app/", "Tableau de bord": "https://djims-tableau.web.app/", "Ancienne adresse": "https://radyo-lakay-2026.web.app/" };
const b = await chromium.launch();
for (const [nom, url] of Object.entries(SITES)) {
  const c = await b.newContext({ viewport: { width: 360, height: 780 }, serviceWorkers: "block" }), p = await c.newPage(), err = [], manque = [];
  p.on("pageerror", (e) => err.push(e.message.slice(0, 120)));
  p.on("console", (m) => { if (m.type() === "error" && !/favicon|ERR_BLOCKED|third-party|Cross-Origin-Opener/i.test(m.text())) err.push("console: " + m.text().slice(0, 120)); });
  p.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(new URL(url).origin)) manque.push(r.status() + " " + r.url().replace(new URL(url).origin, "")); });
  let t0 = Date.now(), titre = "";
  try { await p.goto(url, { waitUntil: "load", timeout: 30000 }); await p.waitForTimeout(5000); titre = await p.title(); } catch (e) { err.push("chargement : " + e.message.slice(0, 80)); }
  const ms = Date.now() - t0;
  let ver = ""; try { const sw = await (await fetch(url + "sw.js")).text(); ver = (sw.match(/["'`]([a-z-]*v\d+[\w.-]*)["'`]/) || [])[1] || ""; } catch (e) {}
  const debord = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1).catch(() => false);
  console.log(`::notice::${nom} :: « ${titre} » :: ${ms} ms :: version ${ver || "?"}${debord ? " :: ⚠ défilement horizontal" : ""}${manque.length ? " :: ⚠ manquants : " + [...new Set(manque)].join(", ") : ""}${err.length ? " :: ⚠ erreurs : " + [...new Set(err)].join(" | ") : " :: aucune erreur"}`);
  await c.close();
}
await b.close();
