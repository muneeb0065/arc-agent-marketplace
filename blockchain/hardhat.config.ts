import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox"; // This is all we need now

// This is the new "CommonJS" way to import dotenv
require("dotenv").config();

// We still load our key the same way
const arcTestnetPrivateKey = process.env.ARC_TESTNET_PRIVATE_KEY;
if (!arcTestnetPrivateKey) {
  console.warn("Please create a .env file with ARC_TESTNET_PRIVATE_KEY");
}

const config: HardhatUserConfig = {
  solidity: "0.8.28", // This is still correct
  networks: {
    arcTestnet: {
      // We REMOVED 'type: "http"' because Hardhat 2 doesn't need it
      url: "https://rpc.testnet.arc.network", 
      chainId: 5042002,                       
      accounts: [arcTestnetPrivateKey!], 
    },
  },
};

// This is the new "CommonJS" way to export the file
module.exports = config;