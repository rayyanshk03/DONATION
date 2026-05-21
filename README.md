# CryptoAid — Gasless Donation Platform

CryptoAid is a gasless Web3 donation app that lets users donate Mock USD without holding ETH. The frontend uses the official **UGF Testnet SDK** to authenticate, quote, settle, execute, and confirm transactions, while a backend indexer stores donation data and pushes live updates.

## How the system works

1. **Frontend (static HTML/JS)**  
   - `index.html` + `wallet.js`, `donate.js`, `ugf.js`, `realtime.js` render the UI and connect wallets via `ethers.js`.  
   - When a user donates, the app creates an ERC‑20 permit (if supported) or performs a gasless approve via UGF, then uses the **UGF Testnet SDK** to run the quote → settle → execute → confirm lifecycle.  
   - The donation call targets the `DonationVault` contract. UGF pays gas in Mock USD, so the user spends **no ETH**.

2. **Smart contracts (Base Sepolia testnet)**  
   - `MockUSD.sol`: ERC‑20 test token with faucet + EIP‑2612 permit.  
   - `DonationVault.sol`: Holds cause list and forwards donated Mock USD to each cause wallet, emitting `DonationMade` events.

3. **Backend (Express + Prisma + WebSocket)**  
   - Listens to `DonationMade` events via RPC and stores them in Postgres.  
   - Updates donor stats, caches leaderboard in Redis (optional), and broadcasts live updates over `/ws`.  
   - REST endpoints power the UI: `/api/causes`, `/api/donations/feed`, `/api/leaderboard`, `/api/analytics/overview`.

## Project structure

- `index.html`, `*.js`, `style.css` — frontend (static site)
- `env.js` — frontend runtime config (loaded before scripts)
- `backend/` — Express API, WebSocket server, Prisma schema
- `contracts/` — Hardhat project with smart contracts

## Installation (runs on Windows/macOS/Linux)

### Prerequisites

- **Node.js 18+** (20 recommended) and **npm**
- **PostgreSQL** (required for backend)
- **Redis** (optional, enables leaderboard caching)
- A **wallet** (MetaMask/WalletConnect) with Base Sepolia testnet access
- **UGF Testnet SDK** access (no API key required — wallet signature auth is used)

### 1) Clone and install dependencies

```bash
git clone https://github.com/rayyanshk03/DONATION.git
cd DONATION
npm install

cd backend
npm install

# Only needed if you plan to compile/deploy contracts
cd ..
cd contracts
npm install
```

### 2) Configure frontend env

The frontend reads `env.js` (loaded by `index.html`).

Option A — **edit `env.js` directly** (quickest):

- `VITE_UGC_TOKEN_ADDRESS`
- `VITE_DONATION_CONTRACT_ADDRESS`
- `VITE_TARGET_CHAIN_ID` (Base Sepolia = `84532`)
- `VITE_UGF_API_KEY` (legacy, unused by the SDK)
- `VITE_UGF_ENDPOINT` (optional override; defaults to the UGF gateway)
- `VITE_UGC_FAUCET_URL`
- `VITE_BACKEND_URL` (default `http://localhost:4000`)
- `VITE_WS_URL` (default `ws://localhost:4000/ws`)

Option B — **deploy contracts and auto-generate `env.js`** (see “Deploy contracts” below).

### 3) Configure backend env

Create `backend/.env` (copy from `backend/.env.example` and replace values):

```dotenv
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB
DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DB
REDIS_URL=redis://localhost:6379         # optional
RPC_URL=https://sepolia.base.org
RPC_WS_URL=wss://YOUR_WS_RPC_ENDPOINT    # optional but recommended
VAULT_ADDRESS=0xYourDonationVaultAddress
CORS_ORIGIN=                             # optional
```

### 4) Set up the database

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 5) Run the backend

```bash
cd backend
npm run dev
```

The API will start on `http://localhost:4000` with WebSocket at `ws://localhost:4000/ws`.

### 6) Run the frontend

```bash
cd ..
npm run dev
```

The static app will be served (default `http://localhost:3000`). Open the URL printed in your terminal.

## Deploy contracts (optional)

If you want to deploy fresh contracts to Base Sepolia:

1. Create `.env` in the repo root (copy `.env.example` and set `PRIVATE_KEY` + `BASE_SEPOLIA_RPC_URL`).  
2. Compile contracts inside `/contracts`:

```bash
cd contracts
npm run compile
```

3. From the repo root, run:

```bash
node scripts/deploy.js
```

This deploys **MockUSD** + **DonationVault** and overwrites `env.js` with the new addresses.

## Notes

- The backend indexer requires a valid `VAULT_ADDRESS` and RPC URL to track donations.  
- Redis is optional; if missing, the backend still runs (leaderboard cache disabled).  
- Mock USD is obtained via the UGF faucet link; no ETH is required for the claim flow.
