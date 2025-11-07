import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// This is the official Arc Testnet USDC contract address
const USDC_TESTNET_ADDRESS = "0x3600000000000000000000000000000000000000";

// This is our main Deployment Module
// We give it a unique ID, "MarketplaceModule"
const MarketplaceModule = buildModule("MarketplaceModule", (m) => {
  
  // --- Part 1: Deploy the "Yellow Pages" (AgentServiceRegistry) ---
  
  // We tell Hardhat to deploy our "AgentServiceRegistry" contract.
  // We'll name this deployed contract "registry" inside our script.
  console.log("Deploying AgentServiceRegistry...");
  const registry = m.contract("AgentServiceRegistry");

  // --- Part 2: Deploy the "Bank Vault" (A2AEscrow) ---
  
  // We tell Hardhat to deploy our "A2AEscrow" contract.
  // This is the critical part: our contract's constructor needs
  // the USDC address. Hardhat Ignition lets us pass arguments
  // as an array `[]` after the contract name.
  console.log(`Deploying A2AEscrow with USDC at ${USDC_TESTNET_ADDRESS}...`);
  const escrow = m.contract("A2AEscrow", [USDC_TESTNET_ADDRESS]);

  // --- Part 3: Return the Deployed Contracts ---
  
  // We return the deployed contracts so the script can
  // print their final addresses.
  return { registry, escrow };
});

// We must export the module as the default
export default MarketplaceModule;