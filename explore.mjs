import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("out", { recursive: true });
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36";
const urls = ["https://zeno.fm/country/haiti/", "https://zeno.fm/radio/?country=HT", "https://zeno.fm/search/?q=haiti", "https://zeno.fm/api/stations/?query=haiti",
  "https://zeno.fm/radio/caraibes-fm/", "https://api.zeno.fm/mounts/metadata/subscribe/54k0v7x14neuv", "https://zeno.fm/sitemap.xml", "https://zeno.fm/robots.txt"];
let i = 0;
for (const u of urls) {
  try { const ctl = new AbortController(); setTimeout(() => ctl.abort(), 15000);
    const r = await fetch(u, { headers: { "User-Agent": UA }, signal: ctl.signal });
    let t = ""; try { t = await r.text(); } catch (e) { t = "(flux)"; }
    writeFileSync(`out/${i}.txt`, `URL ${u}\nSTATUS ${r.status}\nTYPE ${r.headers.get("content-type")}\nCORS ${r.headers.get("access-control-allow-origin")}\n\n` + t.slice(0, 400000));
  } catch (e) { writeFileSync(`out/${i}.txt`, `URL ${u}\nERREUR ${e.message}`); }
  i++;
}
