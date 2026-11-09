// Copia del registro: guarda numero -> llave en respaldo/registro-<bloque>.json
// Uso: CONTRATO=0x... npx hardhat run scripts/exportar.js --network baseSepolia
const { ethers } = require("hardhat");
const fs = require("fs");
async function main() {
  const c = await ethers.getContractAt("Movimiento", process.env.CONTRATO);
  const bloque = await ethers.provider.getBlockNumber();
  const total = Number(await c.totalMiembros({ blockTag: bloque }));
  const miembros = [];
  for (let i = 0; i < total; i += 500) {
    for (const n of await c.numeros(i, 500, { blockTag: bloque })) {
      miembros.push({ numero: Number(n), cuenta: await c.ownerOf(n, { blockTag: bloque }) });
    }
  }
  const net = await ethers.provider.getNetwork();
  const copia = { contrato: process.env.CONTRATO, chainId: Number(net.chainId), bloque, siguienteNumero: Number(await c.siguienteNumero({ blockTag: bloque })), miembros };
  fs.mkdirSync("respaldo", { recursive: true });
  const archivo = `respaldo/registro-${bloque}.json`;
  fs.writeFileSync(archivo, JSON.stringify(copia, null, 2));
  console.log(`${total} miembros guardados en ${archivo}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
