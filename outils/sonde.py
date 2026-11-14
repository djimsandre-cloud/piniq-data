# Sonde temporaire : traduction légère (CTranslate2 + modèles libres Argos/OPUS), sans torch
import json, time, urllib.request, zipfile, io, os, re, subprocess, sys, glob
t0 = time.time(); subprocess.run([sys.executable, "-m", "pip", "install", "-q", "ctranslate2", "sentencepiece"], check=True); print(f"INSTALL {time.time()-t0:.0f} s")
import ctranslate2, sentencepiece as spm
idx = json.load(urllib.request.urlopen("https://raw.githubusercontent.com/argosopentech/argospm-index/main/index.json", timeout=30))
MOD = {}
for a, vers in (("en", "fr"), ("es", "en")):
    p = sorted([x for x in idx if x["from_code"] == a and x["to_code"] == vers], key=lambda x: x["package_version"])[-1]
    t0 = time.time(); b = urllib.request.urlopen(urllib.request.Request(p["links"][0], headers={"User-Agent": "Mozilla/5.0"}), timeout=120).read()
    zipfile.ZipFile(io.BytesIO(b)).extractall(f"mod/{a}"); d = glob.glob(f"mod/{a}/*")[0]
    print(f"MODELE {a}→fr v{p['package_version']} {len(b)//1_000_000} Mo en {time.time()-t0:.0f} s · {p['links'][0]} · contenu : {sorted(os.listdir(d))} / {sorted(os.listdir(d+'/model'))[:8]}")
    sp = spm.SentencePieceProcessor(model_file=glob.glob(d + "/*.model")[0]) if glob.glob(d + "/*.model") else None
    MOD[a] = (ctranslate2.Translator(d + "/model", device="cpu", inter_threads=2), sp, d)
def phrases(t): return [x.strip() for x in re.split(r"(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÑ¿¡\"“‘(])", t) if x.strip()]
def traduire(t, a):
    tr, sp, d = MOD[a]; ph = phrases(t)
    toks = [sp.encode(p, out_type=str) for p in ph]
    res = tr.translate_batch(toks, beam_size=2, max_decoding_length=256, repetition_penalty=1.1)
    out = " ".join(sp.decode(r.hypotheses[0]).replace("▁", " ").strip() for r in res)
    return traduire(out, "en") if a == "es" else out      # l'espagnol passe par l'anglais (pas de modèle direct)
EN = ["Haitian forces recapture national stadium after two years of gang control",
 "Salvadoran troops deployed in Haiti have retaken the Sylvio Cator stadium in Port-au-Prince, which had been under the control of armed gangs since 2024, the prime minister's office said on Thursday. Residents described hearing heavy gunfire through the night. \"We have been waiting for this for two years,\" said Marie, a street vendor who asked that her last name not be used.",
 "More than 1,000 people were killed in Haiti between July and September, according to a new UN report, which warns that gangs are expanding beyond the capital into the Artibonite and Centre departments. The report also documents a sharp rise in kidnappings and sexual violence."]
ES = ["De campo de fútbol a base militar: Haití y El Salvador recapturan el principal estadio de Puerto Príncipe",
 "El presidente de El Salvador, Nayib Bukele, informó que tropas salvadoreñas y haitianas retomaron el estadio Sylvio Cator, que llevaba dos años en manos de las pandillas. Las autoridades haitianas aseguran que la operación continuará en los barrios vecinos durante los próximos días."]
for a, L in (("en", EN), ("es", ES)):
    for t in L:
        t0 = time.time(); f = traduire(t, a); print(f"ORIG ({a}) {t}\nFR   {f}\n   → {time.time()-t0:.2f} s pour {len(t)} car.")
long = " ".join(EN[1:]) * 6; t0 = time.time(); traduire(long, "en"); print(f"VITESSE {len(long)} car. en {time.time()-t0:.1f} s")
