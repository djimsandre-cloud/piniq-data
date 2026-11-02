// Sonde ponctuelle : messages reçus ces 12 dernières heures sur les sujets ntfy des applis (lecture seule)
const SUJETS = { Medyapam: "medyapam-p4mgqjbxpufyz2", Général: "caddybook-d4535629da" };
for (const [nom, t] of Object.entries(SUJETS)) {
  const x = await (await fetch(`https://ntfy.sh/${t}/json?poll=1&since=12h`)).text();
  const l = x.split("\n").filter(Boolean).map((s) => JSON.parse(s)).filter((m) => m.event === "message");
  console.log(`::notice::${nom} :: ${l.length} message(s) en 12 h :: ` + l.slice(-6).map((m) => new Date(m.time * 1000).toISOString().slice(11, 16) + " " + (m.title || "").slice(0, 40)).join(" | "));
}
