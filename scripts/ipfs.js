// Sube la carpeta web/ a IPFS por medio de Pinata y muestra el CID (la dirección de la copia).
// Uso: PINATA_JWT=... node scripts/ipfs.js
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", "web");
function archivos(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? archivos(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
(async () => {
  if (!process.env.PINATA_JWT) { console.log("Falta el secreto PINATA_JWT: no se sube la copia a IPFS."); return; }
  const form = new FormData();
  for (const f of archivos(RAIZ)) form.append("file", new Blob([fs.readFileSync(f)]), "movimiento/" + path.relative(RAIZ, f).split(path.sep).join("/"));
  form.append("pinataMetadata", JSON.stringify({ name: "movimiento-" + new Date().toISOString().slice(0, 10) }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
  const r = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", { method: "POST", headers: { Authorization: "Bearer " + process.env.PINATA_JWT }, body: form });
  const j = await r.json();
  if (!r.ok) { console.error("Pinata respondió:", r.status, JSON.stringify(j)); process.exit(1); }
  const cid = j.IpfsHash;
  const salida = [`CID: ${cid}`, `Copia: https://${cid}.ipfs.dweb.link/`, `Otra puerta: https://ipfs.io/ipfs/${cid}/`].join("\n");
  console.log(salida);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, "## Copia en IPFS\n\n" + salida.split("\n").map((l) => "- " + l).join("\n") + "\n");
  fs.writeFileSync(path.join(__dirname, "..", "respaldo", "ipfs.txt"), salida + "\n");
})();
