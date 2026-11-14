# Sonde temporaire : presse internationale sur Haïti + essai de traduction libre (Argos Translate)
import re, time, html, urllib.request, sys
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36", "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"}
def lire(u, n=3_000_000):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25).read(n).decode("utf-8", "replace")
HAITI = re.compile(r"ha[iïí]t[iíî]|port-au-prince|puerto pr[ií]ncipe", re.I)
FLUX = [("en", "The Guardian", "https://www.theguardian.com/world/haiti/rss"), ("en", "BBC News", "https://feeds.bbci.co.uk/news/world/latin_america/rss.xml"),
  ("en", "Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"), ("en", "NPR", "https://feeds.npr.org/1004/rss.xml"), ("en", "DW", "https://rss.dw.com/rdf/rss-en-all"),
  ("en", "AP News", "https://apnews.com/hub/haiti"), ("en", "Miami Herald", "https://www.miamiherald.com/news/nation-world/world/americas/haiti/?widgetName=rssfeed&widgetContentId=712015&getXmlFeed=true"),
  ("en", "Reuters (Google)", "https://news.google.com/rss/search?q=Haiti+site:reuters.com+when:7d&hl=en-US&gl=US&ceid=US:en"), ("en", "CNN", "http://rss.cnn.com/rss/edition_americas.rss"),
  ("en", "New York Times", "https://rss.nytimes.com/services/xml/rss/nyt/Americas.xml"), ("en", "Washington Post", "https://feeds.washingtonpost.com/rss/world"), ("en", "UN News", "https://news.un.org/feed/subscribe/en/news/region/americas/feed/rss.xml"),
  ("en", "CBC", "https://www.cbc.ca/webfeed/rss/rss-world"), ("en", "France 24 EN", "https://www.france24.com/en/tag/haiti/rss"),
  ("es", "El País", "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/america/portada"), ("es", "BBC Mundo", "https://feeds.bbci.co.uk/mundo/rss.xml"), ("es", "DW Español", "https://rss.dw.com/rdf/rss-sp-all"),
  ("es", "Listín Diario", "https://listindiario.com/rss/portada"), ("es", "France 24 ES", "https://www.france24.com/es/tag/hait%C3%AD/rss"), ("es", "EFE (Google)", "https://news.google.com/rss/search?q=Hait%C3%AD+when:2d&hl=es-419&gl=US&ceid=US:es-419"),
  ("fr", "Le Monde", "https://www.lemonde.fr/haiti/rss_full.xml"), ("fr", "France 24", "https://www.france24.com/fr/tag/ha%C3%AFti/rss"), ("fr", "RFI", "https://www.rfi.fr/fr/tag/ha%C3%AFti/rss"),
  ("fr", "Radio-Canada", "https://ici.radio-canada.ca/rss/4159"), ("fr", "TV5MONDE", "https://information.tv5monde.com/rss.xml"), ("fr", "Courrier international", "https://www.courrierinternational.com/feed/all/rss.xml"),
  ("fr", "Le Devoir", "https://www.ledevoir.com/rss/section/monde.xml"), ("fr", "La Presse", "https://www.lapresse.ca/international/rss"), ("fr", "ONU Info", "https://news.un.org/feed/subscribe/fr/news/region/americas/feed/rss.xml"),
  ("fr", "Google Actualités FR", "https://news.google.com/rss/search?q=Ha%C3%AFti+when:2d&hl=fr&gl=FR&ceid=FR:fr")]
choisis = []
for lg, nom, u in FLUX:
    try:
        x = lire(u); items = re.split(r"<item[\s>]", x)[1:]
        if not items and "apnews" in u:
            liens = sorted(set(re.findall(r'href="(https://apnews\.com/article/[^"]+)"', x))); print(f"FLUX {nom}: page, {len(liens)} liens d'articles"); choisis += [(lg, nom, "(AP)", l) for l in liens[:1]]; continue
        bons = []
        for b in items:
            t = html.unescape(re.sub(r"<!\[CDATA\[|\]\]>", "", (re.search(r"<title>([\s\S]*?)</title>", b) or [0, ""])[1])).strip()
            d = html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<!\[CDATA\[|\]\]>", "", (re.search(r"<description>([\s\S]*?)</description>", b) or [0, ""])[1])))
            l = (re.search(r"<link>([\s\S]*?)</link>", b) or [0, ""])[1].replace("<![CDATA[", "").replace("]]>", "").strip()
            if HAITI.search(t + " " + d): bons.append((t, l, len(d)))
        print(f"FLUX {nom} ({lg}): {len(items)} articles, {len(bons)} sur Haïti" + (f" · ex. « {bons[0][0][:90]} » (résumé {bons[0][2]} car.)" if bons else ""))
        if bons and "google" not in u: choisis.append((lg, nom, bons[0][0], bons[0][1]))
    except Exception as e: print(f"FLUX {nom}: ÉCHEC {str(e)[:80]}")
def texte(u):
    h = lire(u); h = re.sub(r"<(script|style|nav|footer|aside|figure|form)[\s\S]*?</\1>", " ", h, flags=re.I)
    ps = [html.unescape(re.sub(r"<[^>]+>", "", p)).strip() for p in re.findall(r"<p[^>]*>([\s\S]*?)</p>", h)]
    return [p for p in ps if len(p) > 80]
print("\nINSTALLATION traduction…"); t0 = time.time()
import subprocess; subprocess.run([sys.executable, "-m", "pip", "install", "-q", "argostranslate"], check=False)
print(f"installé en {time.time()-t0:.0f} s"); t0 = time.time()
import argostranslate.package as P, argostranslate.translate as T
P.update_package_index(); dispo = P.get_available_packages()
for a in ("en", "es"):
    pk = next(p for p in dispo if p.from_code == a and p.to_code == "fr"); P.install_from_path(pk.download())
print(f"modèles prêts en {time.time()-t0:.0f} s")
vus = set()
for lg, nom, titre, lien in choisis:
    if lg == "fr" and nom not in ("Le Monde",): continue
    if nom in vus or len(vus) >= 7: continue
    vus.add(nom)
    try:
        ps = texte(lien); brut = sum(len(p) for p in ps)
        print(f"\nARTICLE {nom} ({lg}) · {titre[:100]} · {len(ps)} paragraphes, {brut} caractères")
        if lg == "fr": print("  début :", " ".join(ps)[:300]); continue
        t0 = time.time(); tt = T.translate(titre, lg, "fr") if titre != "(AP)" else ""; tr = [T.translate(p, lg, "fr") for p in ps[:6]]
        print(f"  TITRE FR : {tt}\n  traduit en {time.time()-t0:.1f} s ({sum(len(p) for p in ps[:6])} car.)")
        for o, f in list(zip(ps, tr))[:3]: print("  EN/ES :", o[:260]); print("  FR    :", f[:300])
    except Exception as e: print(f"ARTICLE {nom}: ÉCHEC {str(e)[:100]}")
