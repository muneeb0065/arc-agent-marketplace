// --- 1. Import all our tools ---
// require('dotenv').config() loads all the secrets from our .env file
require("dotenv").config(); 
const express = require("express");     // Our web server framework
const { ethers } = require("ethers");   // The library to talk to the blockchain
const axios = require("axios");         // The library to call other APIs (our Cloudflare AI)
const cors = require("cors");           // A security tool to allow our React app to talk to this server

// --- 2. Load Your "Secrets" from .env ---
// We read all the addresses and keys we just saved
const {
  ARC_TESTNET_RPC_URL,
  MANAGER_AGENT_PRIVATE_KEY,
  REGISTRY_CONTRACT_ADDRESS,
  ESCROW_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS,
} = process.env;

// --- 3. Load Your Contract "Blueprints" (ABIs) ---
// An ABI (Application Binary Interface) is the JSON "menu"
// that tells ethers.js what functions our contracts have.

// We need to get the ABIs from the 'blockchain' folder
// This path '../' means "go up one folder"
const registryArtifact = require("../blockchain/artifacts/contracts/AgentServiceRegistry.sol/AgentServiceRegistry.json");
const escrowArtifact = require("../blockchain/artifacts/contracts/A2AEscrow.sol/A2AEscrow.json");
const usdcAbi = require("./usdc-abi.json"); // We will create this file next

// --- 4. Initialize Your Server and Blockchain Connection ---
const app = express();
const port = 3001; // We'll run the backend on port 3001

// Set up the "provider" (our connection to the Arc blockchain)
const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC_URL);

// Set up the "wallet" for our Manager Agent
// This combines our private key with the blockchain connection
const managerWallet = new ethers.Wallet(MANAGER_AGENT_PRIVATE_KEY, provider);

console.log(`Manager Agent wallet address: ${managerWallet.address}`);

// --- 5. Set up "Middleware" ---
// These are tools that run on *every* request

// Enable 'cors' so our React app (on port 3000) can talk to this server (on port 3001)
app.use(cors()); 
// Enable 'express.json()' so our server can understand JSON data sent from the React app
app.use(express.json()); 

// --- 6. Set up a simple "test" route ---
// This is just to make sure our server is working
app.get("/", (req, res) => {
  res.send("Hello! The Manager Agent server is running.");
});






// --- 7. THE MAIN "ORCHESTRATOR" ENDPOINT ---
// This is the "brain" of our Manager Agent.
// Our React app will send a POST request to http://localhost:3001/execute-job

app.post("/execute-job", async (req, res) => {
  console.log("\n--- New Job Request Received ---");

  try {
    // --- Step 1: Get the "goal" from the React app ---
    // We expect the React app to send JSON: { "topic": "some topic" }
    const { topic } = req.body;
    if (!topic) {
      // If no 'topic' is sent, send a 400 "Bad Request" error
      return res.status(400).json({ error: "Missing 'topic' in request body." });
    }
    console.log(`[MANAGER] Goal: Write a tweet about "${topic}"`);

    
    // --- Step 2: Connect to our on-chain "Yellow Pages" ---
    // We create a new "contract" object that connects our Manager's
    // wallet to the deployed contract's address and ABI.
    console.log(`[MANAGER] Connecting to Registry: ${REGISTRY_CONTRACT_ADDRESS}`);
    const registry = new ethers.Contract(
      REGISTRY_CONTRACT_ADDRESS, // The "street address" from our .env
      registryArtifact.abi, // The "menu" of functions from the .json file
      managerWallet         // The "wallet" we are using to make the call
    );

    
    // --- Step 3: Find the "TweetWriter" Specialist Agent ---
    console.log("[MANAGER] Finding 'TweetWriter' agent on-chain...");
    const agentName = "TweetWriterV2";
    // We call the 'getService' function *on the blockchain*
    const service = await registry.getService(agentName);

    // Check if the agent exists and has an endpoint
    if (!service || !service.endpoint || service.endpoint === "") {
      console.error("[MANAGER] Error: 'TweetWriter' agent not found in registry.");
      return res.status(404).json({ error: "TweetWriter agent not found." });
    }
    
    const agentEndpoint = service.endpoint; // The Cloudflare URL
    const agentCost = service.cost; // This is a BigInt, e.g., 100000
    const agentOwner = service.owner; // The wallet of the specialist

    console.log(`[MANAGER] Agent found at ${agentEndpoint}`);
    console.log(`[MANAGER] Job cost: ${ethers.formatUnits(agentCost, 6)} USDC`);

    
    // --- Step 4: Approve the Escrow to spend our USDC ---
    // This is the "2-step-payment" process in ERC20 tokens.
    // 1. Approve: We tell the USDC contract, "I (the Manager)
    //    give permission to the Escrow contract to take [amount] of my money."
    // 2. Fund: We tell the Escrow contract, "Go take that money now."
    
    console.log("[MANAGER] Connecting to USDC contract...");
    const usdcContract = new ethers.Contract(
      USDC_CONTRACT_ADDRESS, // The USDC token's address
      usdcAbi,               // The minimal "menu" for USDC
      managerWallet
    );

    console.log(`[MANAGER] Approving Escrow contract (${ESCROW_CONTRACT_ADDRESS}) to spend ${ethers.formatUnits(agentCost, 6)} USDC...`);
    
    // Send the 'approve' transaction and wait for it to be confirmed
    const approveTx = await usdcContract.approve(ESCROW_CONTRACT_ADDRESS, agentCost);
    await approveTx.wait(); 
    
    console.log("[MANAGER] Approval successful. Tx:", approveTx.hash);

    
    // --- Step 5: Fund the "Bank Vault" (Escrow) ---
    console.log("[MANAGER] Connecting to Escrow contract...");
    const escrow = new ethers.Contract(
      ESCROW_CONTRACT_ADDRESS, // The "Bank Vault's" address
      escrowArtifact.abi,      // The "menu" for our Escrow
      managerWallet
    );

    console.log("[MANAGER] Calling 'fundJob' to pay specialist...");
    // This call will *trigger* the 'transferFrom' we just approved.
    // The money moves from our Manager wallet, into the Escrow contract.
    const fundTx = await escrow.fundJob(
      agentOwner, // The wallet of the specialist (from the registry)
      agentCost
    );
    // We wait for the transaction to be confirmed
    const fundReceipt = await fundTx.wait();
    console.log("[MANAGER] Job funded! Escrow is holding payment. Tx:", fundTx.hash);


    // --- Step 6: HIRE the "Specialist Agent" (Call Cloudflare) ---
    // Now that the money is safe in escrow, we can hire the worker.
    // This is an "off-chain" API call.
    console.log(`[MANAGER] Hiring Specialist Agent at ${agentEndpoint}...`);
    
    let aiResponse;
    try {
      // We use 'axios' to send a POST request with our "topic"
      aiResponse = await axios.post(agentEndpoint, {
        topic: topic,
      });
    } catch (apiError) {
      console.error("[MANAGER] AI Specialist Agent failed!", apiError.message);
      // NOTE: In a *real* app, you would add a function
      // to "reclaim" your funds from the escrow if the job fails.
      // For a hackathon, this is okay.
      return res.status(500).json({ error: "AI agent failed to respond." });
    }

    const tweet = aiResponse.data.tweet;
    console.log(`[MANAGER] Specialist completed job. Tweet: "${tweet}"`);

    
// --- Step 7: Release the Payment ---
    // (This is the NEW, ROBUST code)
    console.log("[MANAGER] Job complete. Releasing payment from Escrow...");
    
    // We already have the 'fundReceipt' from Step 5
    // Now, we will loop through all the logs to find the right one
    let jobFundedEvent;
    
    // Loop through every log in the transaction receipt
    for (const log of fundReceipt.logs) {
      try {
        // Try to parse the log with our Escrow's "menu" (ABI)
        const parsedLog = escrow.interface.parseLog(log);
        
        // If it's the log we want, save it and stop looping
        if (parsedLog && parsedLog.name === "JobFunded") {
          jobFundedEvent = parsedLog;
          break;
        }
      } catch (e) {
        // This log wasn't from our Escrow contract, so we ignore it
      }
    }

    // If we didn't find our event, something is very wrong
    if (!jobFundedEvent) {
      console.error("[MANAGER] CRITICAL ERROR: Could not find 'JobFunded' event in transaction logs.");
      return res.status(500).json({ error: "Could not find JobFunded event." });
    }

    // Now we can safely get the Job ID!
    const jobId = jobFundedEvent.args[0]; // The first argument of the event is the 'jobId'
    
    console.log(`[MANAGER] Found Job ID: ${jobId}. Calling 'releasePayment'...`);

    // Call 'releasePayment' with the *correct* Job ID
    const releaseTx = await escrow.releasePayment(jobId);
    await releaseTx.wait();
    
    console.log("[MANAGER] Payment released! Tx:", releaseTx.hash);
    
    // --- Step 8: Send the Final Result to the React App ---
    console.log("--- Job Finished. Sending result to frontend. ---");
    // We send a 200 "OK" status with the final tweet
    res.status(200).json({
      success: true,
      tweet: tweet,
      paymentTx: releaseTx.hash,
    });

  } catch (error) {
    // This is our main error handler
    console.error("\n--- !!! A CRITICAL ERROR OCCURRED !!! ---");
    console.error(error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});






// --- 8. NEW "VOICEOVER" ENDPOINT ---
// This is the "brain" for hiring our new Voiceover Agent
// Our React app will send a POST request to http://localhost:3001/execute-voice-job

app.post("/execute-voice-job", async (req, res) => {
  console.log("\n--- New VOICE Job Request Received ---");

  try {
    // --- Step 1: Get the "text" from the React app ---
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing 'text' in request body." });
    }
    console.log(`[MANAGER] Goal: Generate voiceover for "${text}"`);

    
    // --- Step 2: Connect to our on-chain "Yellow Pages" ---
    console.log(`[MANAGER] Connecting to Registry: ${REGISTRY_CONTRACT_ADDRESS}`);
    const registry = new ethers.Contract(
      REGISTRY_CONTRACT_ADDRESS,
      registryArtifact.abi,
      managerWallet
    );

    
    // --- Step 3: Find the "VoiceoverAgent" Specialist ---
    console.log("[MANAGER] Finding 'VoiceoverAgent' agent on-chain...");
    const agentName = "VoiceoverAgent"; // <-- We are hiring the new agent
    const service = await registry.getService(agentName);

    if (!service || !service.endpoint || service.endpoint === "") {
      console.error("[MANAGER] Error: 'VoiceoverAgent' not found in registry.");
      return res.status(404).json({ error: "VoiceoverAgent not found." });
    }
    
    const agentEndpoint = service.endpoint;
    const agentCost = service.cost; // This will be the 0.5 USDC price
    const agentOwner = service.owner;

    console.log(`[MANAGER] Agent found at ${agentEndpoint}`);
    console.log(`[MANAGER] Job cost: ${ethers.formatUnits(agentCost, 6)} USDC`);

    
    // --- Step 4: Approve the Escrow to spend our USDC ---
    console.log("[MANAGER] Connecting to USDC contract...");
    const usdcContract = new ethers.Contract(
      USDC_CONTRACT_ADDRESS,
      usdcAbi,
      managerWallet
    );

    console.log(`[MANAGER] Approving Escrow to spend ${ethers.formatUnits(agentCost, 6)} USDC...`);
    const approveTx = await usdcContract.approve(ESCROW_CONTRACT_ADDRESS, agentCost);
    await approveTx.wait();
    console.log("[MANAGER] Approval successful. Tx:", approveTx.hash);

    
    // --- Step 5: Fund the "Bank Vault" (Escrow) ---
    console.log("[MANAGER] Connecting to Escrow contract...");
    const escrow = new ethers.Contract(
      ESCROW_CONTRACT_ADDRESS,
      escrowArtifact.abi,
      managerWallet
    );

    console.log("[MANAGER] Calling 'fundJob' to pay specialist...");
    const fundTx = await escrow.fundJob(agentOwner, agentCost);
    const fundReceipt = await fundTx.wait();
    console.log("[MANAGER] Job funded! Escrow is holding payment. Tx:", fundTx.hash);


    // --- Step 6: HIRE the "Voiceover Agent" (Call Cloudflare) ---
    console.log(`[MANAGER] Hiring Specialist Agent at ${agentEndpoint}...`);
    
    let audioResponse;
    try {
      // We call the 'voiceover-agent' URL
      audioResponse = await axios.post(
        agentEndpoint,
        { text: text }, // We send the 'text' to be converted
        {
          responseType: "arraybuffer", // <-- CRITICAL: We tell axios to expect a *file*
        }
      );
    } catch (apiError) {
      console.error("[MANAGER] AI Specialist Agent failed!", apiError.message);
      return res.status(500).json({ error: "AI (Voice) agent failed to respond." });
    }

    // --- Step 7: Release the Payment ---
    // The Specialist has delivered the audio data!
    console.log(`[MANAGER] Specialist completed job. Received audio file.`);
    console.log("[MANAGER] Job complete. Releasing payment from Escrow...");

    // Find the Job ID from the logs (using our robust code)
    let jobFundedEvent;
    for (const log of fundReceipt.logs) {
      try {
        const parsedLog = escrow.interface.parseLog(log);
        if (parsedLog && parsedLog.name === "JobFunded") {
          jobFundedEvent = parsedLog;
          break;
        }
      } catch (e) { /* ignore */ }
    }
    
    if (!jobFundedEvent) {
      console.error("[MANAGER] CRITICAL ERROR: Could not find 'JobFunded' event.");
      return res.status(500).json({ error: "Could not find JobFunded event." });
    }
    
    const jobId = jobFundedEvent.args[0];
    console.log(`[MANAGER] Found Job ID: ${jobId}. Calling 'releasePayment'...`);

    const releaseTx = await escrow.releasePayment(jobId);
    await releaseTx.wait();
    console.log("[MANAGER] Payment released! Tx:", releaseTx.hash);

    
    // --- Step 8: Send the Final Result to the React App ---
    // We can't send a raw file in JSON.
    // So, we convert the audio file (an 'arraybuffer') into a Base64 string.
    // This is a standard way to send files in JSON.
    const audioBase64 = Buffer.from(audioResponse.data, "binary").toString("base64");

    console.log("--- Job Finished. Sending audio data to frontend. ---");
    res.status(200).json({
      success: true,
      audioData: audioBase64, // The audio file, encoded as text
      audioFormat: "audio/mpeg",
      paymentTx: releaseTx.hash,
    });

  } catch (error) {
    // This is our main error handler
    console.error("\n--- !!! A CRITICAL ERROR OCCURRED !!! ---");
    console.error(error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});







app.listen(port, () => {
  console.log(`Manager Agent server listening on http://localhost:${port}`);
});