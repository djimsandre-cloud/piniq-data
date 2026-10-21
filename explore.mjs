import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("out", { recursive: true });
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36";
const urls = ["https://zeno.fm/sitemap-index.xml", "https://zeno.fm/sitemap-pages.xml", "https://zeno.fm/radio/radiomega-haiti/"];
let i = 0;
for (const u of urls) {
  try { const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    const t = await r.text();
    writeFileSync(`out/${i}.txt`, `URL ${u}\nSTATUS ${r.status}\n\n` + t.slice(0, 600000));
  } catch (e) { writeFileSync(`out/${i}.txt`, `URL ${u}\nERREUR ${e.message}`); }
  i++;
}
