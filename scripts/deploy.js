// Uso: GUARDIAN=0x... FUNDADOR=0x... npx hardhat run scripts/deploy.js --network baseSepolia
const { ethers } = require("hardhat");
async function main() {
  const [yo] = await ethers.getSigners();
  const guardian = process.env.GUARDIAN || yo.address;
  const inicio = Number(process.env.PRIMER_NUMERO || 1314);
  const c = await (await ethers.getContractFactory("Movimiento")).deploy(guardian, inicio, process.env.ANTERIOR || ethers.ZeroAddress);
  await c.waitForDeployment();
  console.log("Contrato:", await c.getAddress());
  if (process.env.FUNDADOR) {
    await (await c.registrarFundador(process.env.FUNDADOR, Number(process.env.NUMERO_FUNDADOR || 1313))).wait();
    console.log("Fundador registrado:", process.env.NUMERO_FUNDADOR || 1313, process.env.FUNDADOR);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
