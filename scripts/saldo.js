// Revisa el saldo de la billetera que paga el gas. Sale con codigo 1 si esta bajo.
const { ethers } = require("hardhat");
async function main() {
  const quien = process.env.PATROCINADOR || "0xd72BDA565C01B0202B6691c32179763539fBe55e";
  const saldo = await ethers.provider.getBalance(quien);
  const minimo = ethers.parseEther(process.env.MINIMO || "0.0005");
  console.log(`Saldo del patrocinador ${quien}: ${ethers.formatEther(saldo)} ETH`);
  require("fs").writeFileSync("saldo.txt", ethers.formatEther(saldo));
  if (saldo < minimo) { console.log("SALDO BAJO"); process.exitCode = 1; }
}
main().catch((e) => { console.error(e); process.exit(2); });
