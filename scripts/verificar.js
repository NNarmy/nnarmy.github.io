// Publica el código fuente de los contratos en Basescan (Etherscan v2) para que cualquiera pueda revisarlo.
// Uso: ETHERSCAN_API_KEY=... npx hardhat run scripts/verificar.js
const hre = require("hardhat");
const { ethers } = hre;
const API = "https://api.etherscan.io/v2/api?chainid=8453";
const KEY = process.env.ETHERSCAN_API_KEY;
const REGISTRO = "0x8c6ACA8E53BaA96627DFF40552B5f328dCA8F230";
const CONTRATOS = [
  { nombre: "Movimiento", dir: REGISTRO, tipos: ["address", "uint256", "address"], args: ["0xd72BDA565C01B0202B6691c32179763539fBe55e", 1314, ethers.ZeroAddress] },
  { nombre: "Comunidad", dir: "0x5f3D0d7FE55A8557688a255DfB5E8717e3f6b251", tipos: ["address"], args: [REGISTRO] },
  { nombre: "Bondad", dir: "0xBFa670CAcE5217391cb8772AD2F181c5b2a1Aef6", tipos: ["address"], args: [REGISTRO] },
];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function main() {
  if (!KEY) throw new Error("Falta ETHERSCAN_API_KEY");
  await hre.run("compile");
  const version = "v" + require("solc").version().replace(".Emscripten.clang", "");
  for (const c of CONTRATOS) {
    const fq = `contracts/${c.nombre}.sol:${c.nombre}`;
    const info = await hre.artifacts.getBuildInfo(fq);
    const body = new URLSearchParams({
      apikey: KEY, module: "contract", action: "verifysourcecode", codeformat: "solidity-standard-json-input",
      sourceCode: JSON.stringify(info.input), contractaddress: c.dir, contractname: fq, compilerversion: version,
      constructorArguements: ethers.AbiCoder.defaultAbiCoder().encode(c.tipos, c.args).slice(2),
    });
    const r = await (await fetch(API, { method: "POST", body })).json();
    console.log(c.nombre, "envío:", r.status, r.result);
    if (r.status !== "1") continue;
    for (let i = 0; i < 20; i++) {
      await espera(5000);
      const q = await (await fetch(`${API}&module=contract&action=checkverifystatus&guid=${r.result}&apikey=${KEY}`)).json();
      console.log(c.nombre, "estado:", q.result);
      if (!/pending/i.test(q.result)) break;
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
