// Publica el contador de bondad ligado al registro.  Uso: CONTRATO=0x... npx hardhat run scripts/bondad.js --network base
const { ethers } = require("hardhat");
async function main() {
  const [yo] = await ethers.getSigners();
  const registro = process.env.CONTRATO || "0x8c6ACA8E53BaA96627DFF40552B5f328dCA8F230";
  console.log("Desplegando desde:", yo.address, "saldo:", ethers.formatEther(await ethers.provider.getBalance(yo.address)), "ETH");
  const b = await (await ethers.getContractFactory("Bondad")).deploy(registro);
  await b.waitForDeployment();
  console.log("BONDAD:", await b.getAddress(), "registro:", registro);
}
main().catch((e) => { console.error(e); process.exit(1); });
