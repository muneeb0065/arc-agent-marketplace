// We import 'ethers' from Hardhat. This gives us all the tools
// to talk to the blockchain.
import { ethers } from "hardhat";

// This is the main "launch" function
async function main() {
  
  // This is the official Arc Testnet USDC contract address
  // We MUST give this to our A2AEscrow contract
  const USDC_TESTNET_ADDRESS = "0x3600000000000000000000000000000000000000";

  console.log("Deploying AgentServiceRegistry...");

  // 1. Get the "Contract Factory" for our "Yellow Pages".
  // A "Factory" is a "blueprint" object that knows how to create
  // new copies of our contract.
  const RegistryFactory = await ethers.getContractFactory("AgentServiceRegistry");
  
  // 2. Tell the Factory to "deploy" (build) the contract.
  // This sends the transaction to the network.
  const registry = await RegistryFactory.deploy();

  // 3. Wait for the blockchain to confirm the transaction
  await registry.waitForDeployment();

  // 4. Print the "street address" of our new, live contract!
  // We use `await .getAddress()` which is the modern way.
  console.log(
    `✅ AgentServiceRegistry (Yellow Pages) deployed to: ${await registry.getAddress()}`
  );


  // --- Now we do the same for the Escrow contract ---

  console.log("Deploying A2AEscrow...");
  
  // 1. Get the blueprint for the "Bank Vault"
  const EscrowFactory = await ethers.getContractFactory("A2AEscrow");

  // 2. Deploy it, but this time we pass the USDC address
  //    into its "constructor" (the setup function).
  const escrow = await EscrowFactory.deploy(USDC_TESTNET_ADDRESS);

  // 3. Wait for it to be confirmed
  await escrow.waitForDeployment();

  // 4. Print its new, live address
  console.log(
    `✅ A2AEscrow (Bank Vault) deployed to: ${await escrow.getAddress()}`
  );

  console.log("\nDeployment complete! You are live on the Arc Testnet.");
}

// This is the standard, safe way to run our 'main' function
// It ensures that if any errors happen, they are printed to the console.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});