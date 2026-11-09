require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    baseSepolia: { url: process.env.RPC_URL || "https://sepolia.base.org", accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [] },
    base: { url: process.env.RPC_URL || "https://mainnet.base.org", accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [] },
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
