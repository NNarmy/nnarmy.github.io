require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
// La llave puede venir como PRIVATE_KEY (0x...) o como MNEMONIC (12 palabras de una billetera nueva)
const cuentas = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : process.env.MNEMONIC ? { mnemonic: process.env.MNEMONIC.trim() } : [];
module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    baseSepolia: { url: process.env.RPC_URL || "https://sepolia.base.org", accounts: cuentas },
    base: { url: process.env.RPC_URL || "https://mainnet.base.org", accounts: cuentas },
  },
};

// Usa el compilador solc de npm (sin descargar binarios externos)
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
  if (args.solcVersion === "0.8.24") {
    const compilerPath = require.resolve("solc/soljson.js");
    return { compilerPath, isSolcJs: true, version: args.solcVersion, longVersion: require("solc/package.json").version };
  }
  return runSuper();
});
module.exports.networks.localhost = { url: "http://127.0.0.1:8545" };
