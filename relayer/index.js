// Patrocinador de gas: recibe invitaciones firmadas y las envia a la cadena pagando el gas.
// Uso: MNEMONIC="12 palabras" (o PRIVATE_KEY=0x...) CONTRATO=0x... RPC_URL=https://mainnet.base.org node index.js
// No guarda nada. Solo envia transacciones validas (las simula antes).
const http = require("http");
const { ethers } = require("ethers");
const ABI = [
  "function unirse((uint256 invitador,uint256 nonce,uint256 vence) inv, bytes firma, address nuevo) returns (uint256)",
  "error InvitacionUsada()", "error InvitacionVencida()", "error FirmaInvalida()", "error YaEsMiembro(address)", "error NumeroOcupado(uint256)", "error Pausado()", "error LimiteDiario()",
];
const ABI_COMUNIDAD = [
  "function votar(uint256 votacion, uint256 numero, uint256 opcion, bytes firma)",
  "error VotacionCerrada()", "error OpcionInvalida()", "error YaVoto()", "error FirmaInvalida()",
];
const ABI_BONDAD = ["function marcar(uint256 numero, uint256 dia, bytes firma)", "error DiaInvalido()", "error YaMarcoHoy()", "error FirmaInvalida()"];
const MENSAJES = { DiaInvalido: "la fecha del teléfono no coincide, revisa la hora", YaMarcoHoy: "tu número ya marcó su acto de hoy", VotacionCerrada: "la votación ya cerró", OpcionInvalida: "esa opción no existe", YaVoto: "este número ya votó", InvitacionUsada: "esta invitación ya se usó", InvitacionVencida: "esta invitación venció",
  FirmaInvalida: "la invitación no es de un miembro", YaEsMiembro: "esta llave ya tiene número",
  Pausado: "las invitaciones están pausadas por ahora", LimiteDiario: "este miembro ya invitó a muchas personas hoy, prueba mañana" };
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "https://mainnet.base.org");
const wallet = (process.env.PRIVATE_KEY ? new ethers.Wallet(process.env.PRIVATE_KEY) : ethers.Wallet.fromPhrase(process.env.MNEMONIC.trim())).connect(provider);
const c = new ethers.Contract(process.env.CONTRATO || "0x8c6ACA8E53BaA96627DFF40552B5f328dCA8F230", ABI, wallet);
const comunidad = process.env.COMUNIDAD ? new ethers.Contract(process.env.COMUNIDAD, ABI_COMUNIDAD, wallet) : null;
const bondad = process.env.BONDAD ? new ethers.Contract(process.env.BONDAD, ABI_BONDAD, wallet) : null;
const PORT = Number(process.env.PORT || 8787);

function enviar(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" });
  res.end(JSON.stringify(obj));
}

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return enviar(res, 204, {});
  if (req.method === "GET" && req.url === "/") return enviar(res, 200, { ok: true, patrocinador: wallet.address });
  if (req.method !== "POST" || !["/unirse", "/votar", "/bondad"].includes(req.url)) return enviar(res, 404, { error: "no encontrado" });
  let body = "";
  req.on("data", (d) => { body += d; if (body.length > 4000) req.destroy(); });
  req.on("end", async () => {
    try {
      if (req.url === "/bondad") {
        if (!bondad) throw new Error("el contador de bondad todavía no está activo");
        const { numero, dia, firma } = JSON.parse(body);
        const args = [BigInt(numero), BigInt(dia), firma];
        await bondad.marcar.staticCall(...args);
        const tx = await bondad.marcar(...args);
        await tx.wait();
        return enviar(res, 200, { ok: true, tx: tx.hash });
      }
      if (req.url === "/votar") {
        if (!comunidad) throw new Error("las votaciones todavía no están activas");
        const { votacion, numero, opcion, firma } = JSON.parse(body);
        const args = [BigInt(votacion), BigInt(numero), BigInt(opcion), firma];
        await comunidad.votar.staticCall(...args); // revierte si el voto no sirve
        const tx = await comunidad.votar(...args);
        await tx.wait();
        return enviar(res, 200, { ok: true, tx: tx.hash });
      }
      const { inv, firma, nuevo } = JSON.parse(body);
      if (!ethers.isAddress(nuevo)) throw new Error("direccion invalida");
      const args = [[BigInt(inv.invitador), BigInt(inv.nonce), BigInt(inv.vence)], firma, nuevo];
      const numero = await c.unirse.staticCall(...args); // revierte si la invitacion no sirve
      const tx = await c.unirse(...args);
      await tx.wait();
      enviar(res, 200, { numero: numero.toString(), tx: tx.hash });
    } catch (e) {
      let nombre = e.revert?.name;
      for (const k of [comunidad, bondad]) if (!nombre && e.data && k) { try { nombre = k.interface.parseError(e.data)?.name; } catch {} }
      enviar(res, 400, { error: MENSAJES[nombre] || e.shortMessage || e.message });
    }
  });
}).listen(PORT, () => console.log("Patrocinador escuchando en", PORT, "desde", wallet.address));
