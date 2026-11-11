// Publica el contrato de Comunidad (anuncios y votaciones) ligado al registro.
// Uso: CONTRATO=0x... npx hardhat run scripts/comunidad.js --network base
const { ethers } = require("hardhat");
async function main() {
  const [yo] = await ethers.getSigners();
  const registro = process.env.CONTRATO || "0x8c6ACA8E53BaA96627DFF40552B5f328dCA8F230";
  console.log("Desplegando desde:", yo.address, "saldo:", ethers.formatEther(await ethers.provider.getBalance(yo.address)), "ETH");
  const c = await (await ethers.getContractFactory("Comunidad")).deploy(registro);
  await c.waitForDeployment();
  console.log("COMUNIDAD:", await c.getAddress(), "registro:", registro);
}
main().catch((e) => { console.error(e); process.exit(1); });
