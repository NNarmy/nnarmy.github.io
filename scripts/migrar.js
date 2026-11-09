// Reconstruccion: publica un contrato nuevo con todos los miembros de una copia, con sus mismos numeros.
// Uso: COPIA=respaldo/registro-123.json GUARDIAN=0x... npx hardhat run scripts/migrar.js --network baseSepolia
const { ethers } = require("hardhat");
const fs = require("fs");
async function main() {
  const copia = JSON.parse(fs.readFileSync(process.env.COPIA));
  const [yo] = await ethers.getSigners();
  const c = await (await ethers.getContractFactory("Movimiento")).deploy(yo.address, copia.siguienteNumero, copia.contrato);
  await c.waitForDeployment();
  console.log("Contrato nuevo:", await c.getAddress());
  for (let i = 0; i < copia.miembros.length; i += 100) {
    const lote = copia.miembros.slice(i, i + 100);
    await (await c.importar(lote.map((m) => m.cuenta), lote.map((m) => m.numero))).wait();
    console.log(`importados ${Math.min(i + 100, copia.miembros.length)}/${copia.miembros.length}`);
  }
  if (process.env.GUARDIAN && process.env.GUARDIAN !== yo.address) {
    await (await c.transferOwnership(process.env.GUARDIAN)).wait();
    console.log("Guardian:", process.env.GUARDIAN);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
