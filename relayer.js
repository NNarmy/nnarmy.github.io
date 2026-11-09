// Patrocinador de gas: recibe invitaciones firmadas y las envia a la cadena pagando el gas.
// Uso: PRIVATE_KEY=0x... CONTRATO=0x... RPC_URL=https://sepolia.base.org node relayer.js
// No guarda nada. Solo envia transacciones validas (las simula antes).
const http = require("http");
const { ethers } = require("ethers");
const ABI = [
  "function unirse((uint256 invitador,uint256 nonce,uint256 vence) inv, bytes firma, address nuevo) returns (uint256)",
  "error InvitacionUsada()", "error InvitacionVencida()", "error FirmaInvalida()", "error YaEsMiembro(address)", "error NumeroOcupado(uint256)", "error Pausado()", "error LimiteDiario()",
];
const MENSAJES = { InvitacionUsada: "esta invitación ya se usó", InvitacionVencida: "esta invitación venció",
  FirmaInvalida: "la invitación no es de un miembro", YaEsMiembro: "esta llave ya tiene número",
  Pausado: "las invitaciones están pausadas por ahora", LimiteDiario: "este miembro ya invitó a muchas personas hoy, prueba mañana" };
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, new ethers.JsonRpcProvider(process.env.RPC_URL));
const c = new ethers.Contract(process.env.CONTRATO, ABI, wallet);
const PORT = Number(process.env.PORT || 8787);

function enviar(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" });
  res.end(JSON.stringify(obj));
}

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return enviar(res, 204, {});
  if (req.method !== "POST" || req.url !== "/unirse") return enviar(res, 404, { error: "no encontrado" });
  let body = "";
  req.on("data", (d) => { body += d; if (body.length > 4000) req.destroy(); });
  req.on("end", async () => {
    try {
      const { inv, firma, nuevo } = JSON.parse(body);
      if (!ethers.isAddress(nuevo)) throw new Error("direccion invalida");
      const args = [[BigInt(inv.invitador), BigInt(inv.nonce), BigInt(inv.vence)], firma, nuevo];
      const numero = await c.unirse.staticCall(...args); // revierte si la invitacion no sirve
      const tx = await c.unirse(...args);
      await tx.wait();
      enviar(res, 200, { numero: numero.toString(), tx: tx.hash });
    } catch (e) {
      const nombre = e.revert?.name;
      enviar(res, 400, { error: MENSAJES[nombre] || e.shortMessage || e.message });
    }
  });
}).listen(PORT, () => console.log("Patrocinador escuchando en", PORT, "desde", wallet.address));
