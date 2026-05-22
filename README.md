# CryptoAid — Premium Gasless Donation Platform (Base Sepolia)

CryptoAid is a gaming-tier, fully on-chain Web3 donation dApp that enables users to support global charity causes using **TYI_MOCK_USD** (the official UGF Testnet payment token) without needing to hold native gas tokens like Ether (ETH). 

The platform features a stunning dark-theme glassmorphic React frontend backed by an event indexer server. Gasless sponsorship is powered by the **Universal Gas Framework (UGF) SDK**, featuring smart allowance-based routing, secure cryptographic permits, and robust allowance propagation checking.

---

## How the Platform Works

CryptoAid operates on an integrated architectural stack connecting frontend, backend, and the EVM blockchain.

```mermaid
graph TB
    subgraph Frontend["React Frontend (cryptoaid/)"]
        APP[App.tsx — Core App]
        MODAL[DonationModal.tsx — Smart Flow]
        WEB3[web3Service.ts — UGF SDK Layer]
        NAV[Navbar.tsx — Dynamic Wallet]
        CAUSE[CauseGrid.tsx — Visual Explorer]
        INDEXCSS[index.css — Styling System]
    end

    subgraph Backend["Indexer & API Backend (backend/)"]
        API[Express REST API]
        DB[(PostgreSQL Database)]
        PRISMA[Prisma ORM Layer]
        INDEXER[DonationMade Event Listener]
        WS[WebSocket Live Updates]
    end

    subgraph Blockchain["Base Sepolia Network (Chain 84532)"]
        VAULT[DonationVault.sol — Smart Contract]
        MUSD[MockUSD.sol — ERC-20 + EIP-2612]
        UGFSVC[UGF Gateway Relayer]
    end

    APP --> NAV & CAUSE & MODAL
    MODAL -->|Dispatch Tx| WEB3
    WEB3 -->|Gas Quote & Pay| UGFSVC
    UGFSVC -->|Submit Sponsored Tx| VAULT
    VAULT -->|Log Event| INDEXER
    INDEXER -->|Upsert Record| PRISMA --> DB
    INDEXER -->|Push Event| WS --> APP
    API -->|Fetch Leaderboard & Feed| PRISMA
    APP -->|API Queries| API
```

### Dynamic Gas Abstraction Lifecycle
The user never pays native network fees (gas). Transactions are processed through one of three highly optimized routes depending on wallet state and contract configurations:

1. **Flow A: Pre-authorized (Direct Transfer)**
   If a user has already granted sufficient `TYI_MOCK_USD` allowance to the `DonationVault` contract, the frontend skips approval steps entirely and executes a single sponsored UGF transaction to `donate(causeId, amount)`.
2. **Flow B: Single-Transaction Permit (EIP-2612)**
   If allowance is insufficient and the wallet supports EIP-2612 permit signatures, the app requests a single off-chain cryptographic signature. It then dispatches **one** sponsored UGF transaction calling `donateWithPermit(...)`, executing allowance authorization and donation execution in a single on-chain block.
3. **Flow C: Fallback Sponsored Approve + Donate**
   If the wallet does not support permit signatures (e.g. hardware wallets), the app transparently runs a two-step fallback:
   - **Step 1**: Dispatches a sponsored UGF transaction to `approve()` the vault to spend tokens.
   - **Verification Polling**: The frontend safely polls the token allowance for up to 15 seconds after the transaction is mined to ensure on-chain allowance propagation has completed.
   - **Step 2**: Automatically dispatches the second sponsored UGF transaction to `donate(causeId, amount)`.

---

## Repository Structure

```
├── root/                     # Core configs and legacy HTML modules
├── cryptoaid/                # Premium React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/      # DonationModal, Navbar, Hero, CauseGrid
│   │   ├── web3Service.ts   # UGF Client, EIP-2612 Permits, RPC bindings
│   │   ├── App.tsx          # Central application and wallet contexts
│   │   └── index.css        # Premium typography, glassmorphism, and keyframe animations
├── backend/                  # Node Express API & Startup Event Indexer
│   ├── src/
│   │   ├── index.ts         # Express server & API routes
│   │   ├── indexer/         # Event logs listeners and background backfiller
│   │   └── ws/              # Live WebSocket server handles dashboard sync
│   └── prisma/               # Schema definitions, migrations, and seeds
└── contracts/                # Hardhat project with Solidity Smart Contracts
    ├── contracts/            # DonationVault.sol & MockUSD.sol
    └── scripts/              # Contract compilation and deployment automation
```

---

## Installation & System Setup

This project is fully supported on **Windows, macOS, and Linux**.

### System Prerequisites
Ensure the following packages are installed on your machine:
* **Node.js (version 20.x recommended, 18+ required)** and **npm**
* **PostgreSQL Database** (local instance or hosted service like Supabase)
* **Web3 Wallet** (MetaMask, Coinbase Wallet, or Rabby) connected to **Base Sepolia**

---

### Step 1: Clone the Repository & Install Dependencies
Clone the repository and install dependencies inside each project folder:

```bash
# 1. Clone the project
git clone https://github.com/rayyanshk03/DONATION.git
cd DONATION

# 2. Install root dependencies
npm install

# 3. Install React frontend dependencies
cd cryptoaid
npm install

# 4. Install Express backend dependencies
cd ../backend
npm install

# 5. Install Contracts dependencies (optional)
cd ../contracts
npm install
```

---

### Step 2: PostgreSQL Database & Prisma Setup
Prisma coordinates migrations and database operations. Configure your database connection string and migrate schemas.

1. Navigate to the backend directory:
   ```bash
   cd ../backend
   ```
2. Create your `.env` file from the provided example:
   ```bash
   cp .env.example .env
   ```
3. Open `backend/.env` in your editor and configure the database details:
   ```dotenv
   PORT=4000
   DATABASE_URL="postgresql://db_user:db_password@localhost:5432/cryptoaid?schema=public"
   DIRECT_URL="postgresql://db_user:db_password@localhost:5432/cryptoaid?schema=public"
   
   # Base Sepolia RPC URLs for the live Indexer
   RPC_URL="https://sepolia.base.org"
   
   # Main Smart Contract Address
   VAULT_ADDRESS="0xB6Cfb2BCF4bb8eF6A9aBa53405F23eC872703b5c"
   ```
4. Push database tables, generate the client, and load cause seed data:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

---

### Step 3: Configure & Build the React Frontend
Configure the client parameters for UGF and chain endpoints.

1. Navigate to the frontend directory:
   ```bash
   cd ../cryptoaid
   ```
2. Set up the environment variables:
   ```bash
   cp .env.example .env
   ```
3. Open `cryptoaid/.env` and verify the values:
   ```dotenv
   VITE_UGC_TOKEN_ADDRESS=0x27DC1C167AeF232bb1e21073304B526726a8727e
   VITE_DONATION_CONTRACT_ADDRESS=0xB6Cfb2BCF4bb8eF6A9aBa53405F23eC872703b5c
   VITE_TARGET_CHAIN_ID=84532
   VITE_UGF_ENDPOINT=https://gateway.universalgasframework.com
   VITE_UGC_FAUCET_URL=https://universalgasframework.com/faucets
   VITE_BACKEND_URL=http://localhost:4000
   VITE_WS_URL=ws://localhost:4000
   ```
4. Validate that Vite is configured correctly by running a production build safety check:
   ```bash
   npm run build
   ```

---

### Step 4: Running the Applications Locally

To run the full end-to-end platform locally, launch the backend and frontend simultaneously in separate terminals:

#### Term 1: Run the Backend & Indexer
Starts the Express API server on port `4000`, hosts WebSockets, and runs the Base Sepolia startup transaction backfiller:
```bash
cd backend
npm run dev
```

#### Term 2: Run the React Web App
Serves the premium React frontend application locally on port `3000`:
```bash
cd cryptoaid
npm run dev
```

Once running, navigate to **`http://localhost:3000`** in your browser.

---

## Smart Contracts compilation & Deployment (Optional)

If you wish to deploy a fresh instance of the token or vault contracts to Base Sepolia:

1. Navigate to the `contracts/` directory:
   ```bash
   cd contracts
   ```
2. Create your contract environment file:
   ```bash
   cp .env.example .env
   ```
3. Configure your deployment wallet `PRIVATE_KEY` and Base Sepolia RPC URL inside `contracts/.env`.
4. Compile the Solidity contracts:
   ```bash
   npm run compile
   ```
5. Deploy to Base Sepolia using Hardhat:
   ```bash
   npx hardhat run scripts/deploy.js --network baseSepolia
   ```
   *Note: Updating contract deployments will output new addresses. Copy these addresses into your `backend/.env` and `cryptoaid/.env` files.*

---

## Diagnostic & Architectural Notes

* **Dynamic Faucet Claims**: To acquire `TYI_MOCK_USD` tokens for testing gasless donations, click the **Get UGC Tokens** faucet link in the navigation header to open the UGF faucet panel.
* **MetaMask Signature Security**: Rejecting or closing a permit signature prompt will safely cancel the transaction and return you to the amount selector rather than triggering fallback loops.
* **On-Chain Event Sync**: The backend event indexer features an **auto-recovery backfiller**. When the server starts, it automatically queries the past 1,500 Base Sepolia blocks to index any donations executed while the indexer was offline, keeping the leaderboard and activity feed perfectly accurate.
