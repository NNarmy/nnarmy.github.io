// Registra al fundador (#1313) y entrega el control del contrato a la billetera guardian.
// Uso: CONTRATO=0x... FUNDADOR=0x... GUARDIAN=0x... npx hardhat run scripts/fundador.js --network base
const { ethers } = require("hardhat");
async function registrar(c, fundador, guardian) {
  const [yo] = await ethers.getSigners();
  const numero = Number(process.env.NUMERO_FUNDADOR || 1313);
  await (await c.registrarFundador(fundador, numero)).wait();
  console.log(`Fundador #${numero}:`, fundador);
  if (guardian) {
    if (ethers.getAddress(guardian) === yo.address) throw new Error("El guardian no puede ser la llave de despliegue");
    await (await c.transferOwnership(guardian)).wait();
    console.log("Guardian:", guardian);
  }
}
async function main() {
  const c = await ethers.getContractAt("Movimiento", process.env.CONTRATO);
  await registrar(c, process.env.FUNDADOR, process.env.GUARDIAN);
}
module.exports = { registrar };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
