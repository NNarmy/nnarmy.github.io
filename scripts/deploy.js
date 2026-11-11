// Publica el contrato. El guardian temporal es la llave de despliegue; al registrar al fundador
// (scripts/fundador.js) se entrega el control a la billetera guardian definitiva.
// Uso: npx hardhat run scripts/deploy.js --network base   (env: FUNDADOR, GUARDIAN, PRIMER_NUMERO, ANTERIOR)
const { ethers } = require("hardhat");
async function main() {
  const [yo] = await ethers.getSigners();
  console.log("Desplegando desde:", yo.address, "saldo:", ethers.formatEther(await ethers.provider.getBalance(yo.address)), "ETH");
  const inicio = Number(process.env.PRIMER_NUMERO || 1314);
  const c = await (await ethers.getContractFactory("Movimiento")).deploy(yo.address, inicio, process.env.ANTERIOR || ethers.ZeroAddress);
  await c.waitForDeployment();
  console.log("CONTRATO:", await c.getAddress());
  if (process.env.FUNDADOR) await require("./fundador").registrar(c, process.env.FUNDADOR, process.env.GUARDIAN);
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
