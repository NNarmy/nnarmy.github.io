// Vigia: corre cada 15 minutos en GitHub. Sin dependencias.
// 1) Avisa por ntfy cuando el guardian publica un anuncio o abre una votacion.
// 2) Una vez al dia agrega un punto a la historia del movimiento (web/historia.json).
const fs = require("fs"), path = require("path");
const RPC = process.env.RPC_URL || "https://mainnet.base.org";
const cfg = fs.readFileSync(path.join(__dirname, "..", "web", "config.js"), "utf8");
const leer = (k) => (cfg.match(new RegExp(`${k}:\\s*"([^"]*)"`)) || [])[1] || "";
const REGISTRO = leer("contrato"), COMUNIDAD = leer("comunidad"), BONDAD = leer("bondad"), TEMA = leer("avisos");
const ESTADO = path.join(__dirname, "..", "respaldo", "vigia.json");
const HISTORIA = path.join(__dirname, "..", "web", "historia.json");
const SITIO = "https://nnarmy.github.io";

async function llamar(to, data) {
  const r = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }) });
  const j = await r.json(); if (j.error) throw new Error(JSON.stringify(j.error));
  return j.result;
}
const numero = async (to, sel) => (to ? Number(BigInt(await llamar(to, sel))) : 0);
// lee un string devuelto en primera posicion de una tupla ABI (anuncio(i) -> (string,uint64,bool) / votacion(i) -> (string,...))
function primerTexto(hex) {
  const b = Buffer.from(hex.slice(2), "hex");
  const off = Number(BigInt("0x" + b.subarray(0, 32).toString("hex")));
  const len = Number(BigInt("0x" + b.subarray(off, off + 32).toString("hex")));
  return b.subarray(off + 32, off + 32 + len).toString("utf8");
}
const argUint = (i) => i.toString(16).padStart(64, "0");

async function avisar(titulo, texto) {
  if (!TEMA) return;
  try {
    const r = await fetch(`https://ntfy.sh/${TEMA}`, { method: "POST", body: texto, headers: { Title: titulo, Click: SITIO, Tags: "sparkles" } });
    console.log("aviso:", titulo, r.status);
  } catch (e) { console.log("no se pudo avisar:", e.message); }
}

(async () => {
  const estado = fs.existsSync(ESTADO) ? JSON.parse(fs.readFileSync(ESTADO, "utf8")) : {};
  let cambio = false;
  if (COMUNIDAD) {
    const ta = await numero(COMUNIDAD, "0xaa32c8d0"), tv = await numero(COMUNIDAD, "0x19fddb50");
    if (estado.anuncios === undefined) { estado.anuncios = ta; estado.votaciones = tv; cambio = true; }
    for (let i = estado.anuncios; i < ta; i++) {
      const t = primerTexto(await llamar(COMUNIDAD, "0x76bbfd37" + argUint(i)));
      await avisar("Nuevo anuncio del guardian", t.slice(0, 300));
    }
    for (let i = estado.votaciones; i < tv; i++) {
      const t = primerTexto(await llamar(COMUNIDAD, "0x6df20956" + argUint(i)));
      await avisar("Nueva votacion abierta", t.slice(0, 300) + "\nEntra a la app para votar.");
    }
    if (ta !== estado.anuncios || tv !== estado.votaciones) { estado.anuncios = ta; estado.votaciones = tv; cambio = true; }
  }
  const hoy = new Date().toISOString().slice(0, 10);
  const historia = fs.existsSync(HISTORIA) ? JSON.parse(fs.readFileSync(HISTORIA, "utf8")) : [];
  const miembros = await numero(REGISTRO, "0x6fe2c6e8"), bondad = await numero(BONDAD, "0x2ddbd13a");
  const ultimo = historia[historia.length - 1];
  if (!ultimo || ultimo.fecha !== hoy) { historia.push({ fecha: hoy, miembros, bondad }); fs.writeFileSync(HISTORIA, JSON.stringify(historia) + "\n"); }
  if (cambio) fs.writeFileSync(ESTADO, JSON.stringify(estado, null, 1) + "\n");
  console.log("ok", { miembros, bondad, ...estado });
})().catch((e) => { console.error(e); process.exit(1); });

