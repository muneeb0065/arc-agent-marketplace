# 🤖 Arc-strator: A Decentralized AI Agent Marketplace

Arc-strator is a full-stack, decentralized application (dApp) that demonstrates a working, autonomous economy for AI agents. It's a decentralized marketplace where a "Manager Agent" can autonomously discover, hire, and pay "Specialist Agents" for their generative content.

All payments are settled instantly and trustlessly using an on-chain escrow contract, powered by **Arc** and **USDC**.


## 🤖 How it Works

This project consists of four main components that create a fully automated, end-to-end workflow. The "Manager Agent" (our backend) is the "brain" that connects all the pieces.


Here is the complete job-cycle for hiring our "Voiceover Agent":

1.  **User Request:** The user types "Hello, world" into the **React Frontend** and clicks "Run Voice Agent."
2.  **Manager Hires:** The frontend calls our **Node.js/Express "Manager Agent"** backend.
3.  **On-Chain Discovery:** The Manager Agent connects to the Arc Testnet and reads from our **`AgentServiceRegistry`** contract (the "Yellow Pages"). It searches for `"VoiceoverAgent"` and finds its public URL (on Cloudflare) and its *price* (e.g., 0.5 USDC).
4.  **On-Chain Escrow:** The Manager's wallet (a server-side `ethers.js` wallet) performs two transactions on Arc:
    * **1. Approve:** It calls the `approve` function on the **USDC Token Contract** to give our "Bank Vault" permission to take the 0.5 USDC.
    * **2. Fund:** It calls the `fundJob` function on our **`A2AEscrow`** contract. The 0.5 USDC is now locked safely in the escrow vault.
5.  **Off-Chain Work:** Now that payment is secured, the Manager Agent makes an HTTP call to the "Voiceover Agent's" **Cloudflare Worker** URL, sending it the text "Hello, world."
6.  **AI Generation:** The Cloudflare Worker uses its **`Workers AI`** binding to call the `@cf/deepgram/aura-1` model, which generates the MP3 audio file.
7.  **On-Chain Payment:** The Cloudflare Worker sends the MP3 file back to the Manager. The Manager receives it, and (since the job is complete) it sends a *third* transaction, calling **`releasePayment`** on the `A2AEscrow` contract. The "Bank Vault" instantly releases the 0.5 USDC to the "Voiceover Agent's" wallet.
8.  **Success:** The Manager sends the final audio file back to the React app, where the user can click "play."

---

## 🛠️ Tech Stack

### 1. Blockchain (The Foundation)
* **`Arc Testnet`** (Hackathon Partner): Used as the core settlement layer for all on-chain activity.
* **`USDC`** (Hackathon Partner): Used for *both* paying gas fees and as the native currency for agent-to-agent payments in the `A2AEscrow` contract.
* **`Solidity`**: Language for writing the `AgentServiceRegistry` and `A2AEscrow` smart contracts.
* **`Hardhat`** (v2): Professional environment for compiling, testing, and deploying our contracts.
* **`Ethers.js`**: The JavaScript library used in our backend to create a wallet and talk to the blockchain.

### 2. AI Agents (The "Specialists" & Partner Tech)
* **`Cloudflare Workers`** (Hackathon Partner): Serverless platform for hosting our two autonomous, specialist AI agents.
* **`Cloudflare Workers AI`** (Hackathon Partner): Used to run the AI models for both text and speech, integrated with a simple `env.AI` binding.
* **Llama 3 Model** (`@cf/meta/llama-3-8b-instruct`): The text-generation model for our "TweetWriterAgent."
* **Deepgram Aura Model** (`@cf/deepgram/aura-1`): The text-to-speech model for our "VoiceoverAgent."

### 3. Manager Agent & Frontend (The "MERN" Stack)
* **`Node.js` / `Express.js`**: The backend **"Manager Agent"** that orchestrates the entire complex workflow.
* **`React.js`**: The frontend "lobby" for the user to interact with the marketplace.
* **`Axios`**: For all HTTP communication (Frontend → Manager, Manager → Specialist).



## 🚀 How to Run (Quick Start)

The smart contracts and AI agents are **already deployed**! You can run the backend and frontend locally to interact with the live system.

### Live Deployed Components

* **Arc `AgentServiceRegistry`:** `0x6138336C0ef3C44c387Bba01D961325b0f23b50B`
* **Arc `A2AEscrow`:** `0x4Ddd84402421EfCbCb5A986146F3dCeA2A2d81A2`
* **`TweetWriterV2` Agent:** `https://polished-moon-464a.sheikhmuneeb926.workers.dev`
* **`VoiceoverAgent`:** `https://spring-rice-13cb.sheikhmuneeb926.workers.dev`


### Terminal 1: Run the Backend (Manager Agent)

1.  **Navigate to the `backend` folder:**
    cd backend
    
2.  **Install dependencies:**
    npm install

3.  **Create your Manager's "wallet":**
    * Create a **new** MetaMask account and name it "Manager Agent."
    * Go to the [Circle Faucet](https://faucet.circle.com), select "Arc Testnet," and send 10 USDC to this **new** account.
    * Export the private key for this **new** "Manager Agent" account.

4.  **Create your `.env` file:**
    * Create a file named `.env` in the `backend` folder.
    * Copy and paste the text below, filling in your deployed addresses and your new private key.
    ```env
    # -- Blockchain Connection --
    ARC_TESTNET_RPC_URL="[https://rpc.testnet.arc.network](https://rpc.testnet.arc.network)"

    # -- YOUR CONTRACT ADDRESSES --
    REGISTRY_CONTRACT_ADDRESS="0x6138336C0ef3C44c387Bba01D961325b0f23b50B"
    ESCROW_CONTRACT_ADDRESS="0x4Ddd84402421EfCbCb5A986146F3dCeA2A2d81A2E"

    # -- Official USDC Token Address --
    USDC_CONTRACT_ADDRESS="0x3600000000000000000000000000000000000000"

    # -- MANAGER AGENT'S WALLET --
    MANAGER_AGENT_PRIVATE_KEY="YOUR_NEWLY_FUNDED_MANAGER_AGENT_PRIVATE_KEY_HERE"
    ```

5.  **Run the server:**
    node index.js
    
    *You should see `Manager Agent server listening on http://localhost:3001`.*

### Terminal 2: Run the Frontend (Lobby)

1.  **Navigate to the `frontend` folder:**
    cd frontend
    
2.  **Install dependencies:**
    npm install
    
3.  **Run the app:**
    npm start

    *This will automatically open `http://localhost:3000` in your browser.*

4.  You can now use the app!

