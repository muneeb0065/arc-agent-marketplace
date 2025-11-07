// We import 'ethers' from Hardhat
import { ethers } from "hardhat";

// --- !!! IMPORTANT: PASTE YOUR ADDRESSES HERE !!! ---
// Replace these with the *real* addresses you just deployed
const REGISTRY_CONTRACT_ADDRESS = "0x6138336C0ef3C44c387Bba01D961325b0f23b50B";
const YOUR_WORKER_URL = "https://spring-rice-13cb.sheikhmuneeb926.workers.dev"; // <-- Add https://
// ----------------------------------------------------

async function main() {
  console.log("Connecting to the AgentServiceRegistry contract...");

  // 1. Get the "blueprint" (ABI) for our contract
  // This tells Ethers what functions our contract has.
  const RegistryFactory = await ethers.getContractFactory("AgentServiceRegistry");

  // 2. Connect to the *existing, live* contract
  // This "attaches" our factory to the real address on the blockchain.
  const registry = RegistryFactory.attach(REGISTRY_CONTRACT_ADDRESS);

  console.log(`Connected to registry at: ${await registry.getAddress()}`);

  // --- 3. Define our new AI Specialist Agent ---
  const agentName = "VoiceoverAgent";
  const agentEndpoint = YOUR_WORKER_URL;
  
  // Let's set the price for this service.
  // We'll say it costs 0.1 USDC.
  // IMPORTANT: USDC has 6 decimal places.
  // So, 0.1 USDC = 100,000 "base units"
  const agentCost = ethers.parseUnits("0.25", 6); // 100000

  console.log(`Registering "${agentName}"...`);
  console.log(`  > Endpoint: ${agentEndpoint}`);
  console.log(`  > Cost: 0.1 USDC (${agentCost.toString()} base units)`);

  // 4. Call the 'registerService' function!
  // This creates a real blockchain transaction.
  const tx = await registry.registerService(
    agentName,
    agentEndpoint,
    agentCost
  );

  // 5. Wait for the transaction to be confirmed
  await tx.wait();

  console.log("\n✅ Success! Your AI Agent is now on the blockchain.");
  console.log("Transaction hash:", tx.hash);

  // 6. Let's test it by reading the data back
  console.log("\nVerifying data from the blockchain...");
  const service = await registry.getService(agentName);
  
  console.log("...Data verified!");
  console.log("Name:", service.name);
  console.log("Endpoint:", service.endpoint);
  console.log("Cost:", service.cost.toString());
  console.log("Owner:", service.owner);
}

// Run the script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});