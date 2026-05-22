<div align="center">

<br/>

<h1>
  <img src="https://em-content.zobj.net/source/apple/391/globe-with-meridians_1f310.png" width="38" height="38" style="vertical-align:middle"/> CryptoAid
</h1>

<h3>Premium Gasless Crypto Donation Platform · Built on Base Sepolia</h3>

<p>
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black"/>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white"/>
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white"/>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs&logoColor=white"/>
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white"/>
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma&logoColor=white"/>
  <img alt="Ethers.js" src="https://img.shields.io/badge/Ethers.js-6-764ABC?style=flat-square"/>
  <img alt="Base Sepolia" src="https://img.shields.io/badge/Base_Sepolia-84532-0052FF?style=flat-square&logo=coinbase&logoColor=white"/>
</p>

<p>
  CryptoAid is a fully on-chain Web3 donation platform where users can support global charity campaigns using <strong>TYI_MOCK_USD</strong> without ever needing to hold native ETH for gas. Powered by the Universal Gas Framework (UGF), every donation is completely gasless.
</p>

<br/>

</div>

---

## ✨ What We Built

CryptoAid is a production-quality Web3 dApp with two distinct portals:

### 🌍 Donor Portal
- Interactive **Three.js 3D Earth Globe** with rotating starfield — the homepage hero
- **Campaign Explorer Grid** — browse active causes with live funding progress bars
- **Gasless Donation Modal** — 3-step flow (Permit → Settle → Confirm) with live status updates
- **Activity Feed & Leaderboard** — real-time WebSocket-powered live donation stream and donor rankings
- **One-click UGC Faucet** — claim test tokens directly from the navbar

### 🎛️ Creator Dashboard (Campaign Manager Portal)
- **Network Operations Console** — live block height ticker, gas price feed, and relayer status panel
- **Relayer CLI Log Terminal** — streaming system messages showing UGF relay events in real time
- **Interactive SVG Analytics Chart** — 7-day cubic bezier donation spline with hover tooltips
- **Campaign Selector Sidebar** — active campaign list with progress gauges and real-time stats
- **Campaign Launch Form** — on-chain registration with live preview card (mirrors the donor's view)
- **Web3 Transaction Audit Drawer** — click any donation row to see gas subsidies, block numbers, permit signatures, and Basescan links
- **Secure Campaign Deletion** — Vercel-style multi-challenge verification modal with:
  - Challenge 1: Type the exact campaign title to confirm
  - Challenge 2: Cryptographic owner signature simulation
  - Backend soft-delete that preserves all historical donation records

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       React Frontend (Vite)                         │
│                                                                     │
│  EarthGlobe ── Hero ── Navbar ── CauseGrid ── DonationModal        │
│  CreatorDashboard ── ActivityLeaderboard ── TransactionSequence     │
│                            ↕ web3Service.ts                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │  REST + WebSocket
┌────────────────────────────▼────────────────────────────────────────┐
│                   Express Backend (Node.js + TypeScript)            │
│                                                                     │
│  /api/causes   /api/donations   /api/leaderboard   /api/ugf        │
│                     ↕ Prisma ORM                                    │
│               PostgreSQL (Cause, Donation, Donor)                   │
│                                                                     │
│  Event Indexer ── WebSocket Push ── Historical Backfiller (1500 blocks) │
└────────────────────────────┬────────────────────────────────────────┘
                             │  ethers.js  ·  EIP-2612 Permits
┌────────────────────────────▼────────────────────────────────────────┐
│                       Base Sepolia (Chain 84532)                    │
│                                                                     │
│    DonationVault.sol  ──  MockUSD.sol (ERC-20 + EIP-2612)         │
│            UGF Gateway Relayer (Universal Gas Framework)            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Gasless Donation Flow

The user never pays native gas (ETH). CryptoAid routes every transaction through one of three paths based on wallet state:

```
Flow A — Pre-authorized (fastest)
  ✅ Sufficient allowance already granted
  → Direct: donate(causeId, amount) via UGF relay

Flow B — EIP-2612 Permit (one tx)
  📝 Off-chain permit signature from wallet
  → donateWithPermit(causeId, amount, deadline, v, r, s)

Flow C — Sponsored Approve + Donate (fallback)
  ⚙️  Hardware wallets or non-permit wallets
  → UGF tx 1: approve() to DonationVault
  → Poll allowance propagation (up to 15s)
  → UGF tx 2: donate(causeId, amount)
```

Each transaction is subsidized by the **UGF (Universal Gas Framework)** relayer. The 4% UGF protocol cut is automatically deducted on-chain — donating $5 sends $4.80 to the cause and $0.20 to UGF.

---

## 🛠️ Tech Stack

### Frontend (`cryptoaid/`)

| Layer | Technology | Purpose |
|---|---|---|
| UI Framework | **React 19** | Component-based reactive UI |
| Language | **TypeScript 5.8** | End-to-end type safety |
| Build Tool | **Vite 6** | Lightning-fast HMR dev server and bundler |
| Styling | **Tailwind CSS v4** | Utility-first glassmorphic dark design system |
| Animations | **Motion (Framer Motion 12)** | Micro-animations, presence transitions |
| 3D Graphics | **Three.js** | Interactive rotating Earth Globe hero |
| Icons | **Lucide React** | Consistent iconography across the UI |
| Fonts | **Outfit** (sans) + **JetBrains Mono** (mono) | Premium typography |
| Web3 Library | **Ethers.js 6** | EVM wallet interactions and EIP-2612 permits |
| Gas Abstraction | **@tychilabs/ugf-testnet-js** | UGF SDK for gasless relay dispatch |

### Backend (`backend/`)

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | **Node.js 20** | Server runtime |
| Framework | **Express 4** | REST API routing and middleware |
| Language | **TypeScript 5** | Type-safe server code |
| ORM | **Prisma 5** | PostgreSQL schema management and type-safe queries |
| Database | **PostgreSQL 16** | Relational storage for causes, donations, donors |
| Caching | **Redis (ioredis)** | Optional response caching layer |
| Real-time | **ws (WebSocket)** | Live donation push events to connected frontends |
| Blockchain | **Ethers.js 6** | Event listener and on-chain transaction executor |
| Dev Tools | **tsx** | TypeScript-native development hot reload |

### Smart Contracts (`contracts/`)

| Layer | Technology | Purpose |
|---|---|---|
| Language | **Solidity** | Smart contract logic |
| Framework | **Hardhat** | Compilation, testing, and deployment |
| Network | **Base Sepolia (84532)** | EVM-compatible L2 testnet |
| Contracts | **DonationVault.sol** | Campaign registry and donation logic |
| Token | **MockUSD.sol** | ERC-20 + EIP-2612 testnet payment token |

### Data Models (Prisma Schema)

```prisma
model Cause {
  id          Int        // On-chain cause ID (from DonationVault)
  name        String     // Campaign title
  description String     // Campaign description
  wallet      String     // Recipient wallet address
  icon        String     // Campaign emoji icon
  tag         String     // Category (Environmental, Humanitarian, Education)
  goalUsd     Decimal    // Fundraising goal in USD
  active      Boolean    // Soft-delete flag (false = deactivated)
  createdAt   DateTime
  donations   Donation[]
}

model Donation {
  id         String    // CUID
  donor      String    // Donor wallet address
  amount     Decimal   // Amount in mock USD
  txHash     String    // On-chain transaction hash (unique)
  ugfQuoteId String?   // UGF relayer quote reference
  ugfStatus  String    // confirmed | pending
  causeId    Int
  createdAt  DateTime
}

model Donor {
  id            String    // CUID
  wallet        String    // Unique wallet address
  totalDonated  Decimal   // Aggregate donated amount
  donationCount Int       // Total number of donations
  firstDonation DateTime
  lastDonation  DateTime
}
```

---

## 📁 Repository Structure

```
DONATION/
├── cryptoaid/                    # ⚛️  React + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ActivityLeaderboard.tsx   # Live tx feed + donor rankings
│   │   │   ├── CauseGrid.tsx             # Campaign explorer grid
│   │   │   ├── CreatorDashboard.tsx      # Creator analytics portal
│   │   │   ├── DonationModal.tsx         # Gasless donation flow
│   │   │   ├── EarthGlobe.tsx            # Three.js 3D Earth Globe
│   │   │   ├── Hero.tsx                  # Homepage hero section
│   │   │   ├── Navbar.tsx                # Navigation + wallet connector
│   │   │   ├── StarfieldBackground.tsx   # Animated starfield canvas
│   │   │   └── TransactionSequenceDiagram.tsx
│   │   ├── web3Service.ts        # UGF SDK, EIP-2612, RPC bindings
│   │   ├── App.tsx               # Root app, wallet state, routing
│   │   ├── types.ts              # Shared TypeScript interfaces
│   │   ├── mockData.ts           # Seed data helpers
│   │   └── index.css             # Design system (glassmorphism, animations)
│   ├── .env.example
│   └── package.json
│
├── backend/                      # 🖥️  Node.js + Express API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── causes.ts         # GET/POST/DELETE /api/causes
│   │   │   ├── donations.ts      # GET /api/donations/feed
│   │   │   ├── leaderboard.ts    # GET /api/leaderboard
│   │   │   ├── ugf.ts            # UGF relay Quote/Settle/Execute/Status
│   │   │   ├── faucet.ts         # Token faucet endpoint
│   │   │   ├── analytics.ts      # Campaign stats
│   │   │   └── health.ts         # Health check
│   │   ├── indexer/
│   │   │   └── donationListener.ts  # On-chain event indexer + backfiller
│   │   ├── websocket/
│   │   │   └── server.ts         # WebSocket broadcast server
│   │   ├── services/
│   │   │   ├── prisma.ts         # Prisma client singleton
│   │   │   ├── ethers.ts         # Shared provider + signer
│   │   │   └── redis.ts          # Redis client
│   │   ├── config/
│   │   │   └── env.ts            # Environment configuration
│   │   └── index.ts              # Express server entrypoint + CORS
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema (Cause, Donation, Donor)
│   │   └── seed.ts               # Initial campaign seed data
│   ├── .env.example
│   └── package.json
│
└── contracts/                    # ⛓️  Hardhat + Solidity
    ├── contracts/
    │   ├── DonationVault.sol     # Main donation + campaign registry
    │   └── MockUSD.sol           # ERC-20 + EIP-2612 testnet token
    └── scripts/
        └── deploy.js             # Deployment script
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** and npm
- **PostgreSQL** (local or hosted, e.g. Supabase)
- **Redis** (optional, for caching)
- **MetaMask** or compatible wallet connected to **Base Sepolia**
- Base Sepolia test ETH (for the backend relayer wallet)

---

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/rayyanshk03/DONATION.git
cd DONATION

# Install frontend dependencies
cd cryptoaid && npm install

# Install backend dependencies
cd ../backend && npm install
```

---

### 2. Configure the Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```dotenv
PORT=4000
DATABASE_URL="postgresql://user:password@localhost:5432/cryptoaid?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/cryptoaid?schema=public"

# Base Sepolia RPC
RPC_URL="https://sepolia.base.org"

# Smart Contract Address (already deployed)
VAULT_ADDRESS="0xB6Cfb2BCF4bb8eF6A9aBa53405F23eC872703b5c"

# Relayer wallet private key (must have Base Sepolia ETH for gas)
PRIVATE_KEY="your_relayer_wallet_private_key"

# Optional
CORS_ORIGIN="http://localhost:3000"
REDIS_URL="redis://localhost:6379"
```

Set up the database:

```bash
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Run schema migrations
npm run prisma:seed       # Seed initial campaign data
```

---

### 3. Configure the Frontend

```bash
cd cryptoaid
cp .env.example .env
```

Edit `cryptoaid/.env`:

```dotenv
VITE_UGC_TOKEN_ADDRESS=0x27DC1C167AeF232bb1e21073304B526726a8727e
VITE_DONATION_CONTRACT_ADDRESS=0xB6Cfb2BCF4bb8eF6A9aBa53405F23eC872703b5c
VITE_TARGET_CHAIN_ID=84532
VITE_UGF_ENDPOINT=https://gateway.universalgasframework.com
VITE_BACKEND_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
```

---

### 4. Run Locally

Open two terminal tabs:

**Terminal 1 — Backend API + Indexer:**
```bash
cd backend
npm run dev
# ➜ Express API on http://localhost:4000
# ➜ WebSocket server started
# ➜ Connected to PostgreSQL
# ➜ Listening for DonationVault events on Base Sepolia
```

**Terminal 2 — React Frontend:**
```bash
cd cryptoaid
npm run dev
# ➜ Local: http://localhost:3000
```

Open **http://localhost:3000** and connect your MetaMask wallet to Base Sepolia.

---

### 5. Get Test Tokens

To donate, you need **TYI_MOCK_USD** tokens:
1. Click **"Get UGC Tokens"** in the navbar to open the UGF faucet
2. Or visit: https://universalgasframework.com/faucets

---

## 🔌 API Reference

### Campaigns

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/causes` | List all active campaigns with totals |
| `POST` | `/api/causes` | Register a new campaign (on-chain + DB) |
| `DELETE` | `/api/causes/:id` | Soft-delete a campaign (`active: false`) |
| `GET` | `/api/causes/:id/donations` | Get all donations for a campaign |

### Donations & Feed

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/donations/feed` | Recent donations across all campaigns |
| `GET` | `/api/leaderboard` | Top donors by total amount |

### UGF Relay (Gasless Transaction Pipeline)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/quote` | Get gas cost quote for a transaction |
| `POST` | `/v1/settle` | Authorize payment with wallet signature |
| `POST` | `/v1/execute` | Submit and broadcast the sponsored tx |
| `POST` | `/v1/status` | Poll execution result + tx hash |

### Utilities

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check |
| `POST` | `/api/faucet` | Claim test tokens |

---

## 🔐 Security Features

### Campaign Deletion — Multi-Challenge Verification
Deleting a campaign requires passing both challenges before the button is enabled:

1. **Challenge 1 — Title Confirmation**: Type the exact campaign name to prevent accidental deletion (Vercel-style)
2. **Challenge 2 — Cryptographic Owner Signature**: Simulates a Web3 wallet ownership proof
3. **Backend Soft-Delete**: Sets `active: false` in the database — past donation records are never deleted, preserving all historical integrity

### Gasless Transaction Security
- **EIP-2612 Permit signatures** are off-chain and bound to a 1-hour deadline
- Rejecting a MetaMask signature prompt cancels the transaction cleanly — no partial states
- Allowance propagation is verified before executing the donate step in Flow C

---

## 🌐 Smart Contracts

Both contracts are deployed on **Base Sepolia (Chain 84532)**:

| Contract | Address |
|---|---|
| `DonationVault` | `0xB6Cfb2BCF4bb8eF6A9aBa53405F23eC872703b5c` |
| `MockUSD (TYI_MOCK_USD)` | `0x27DC1C167AeF232bb1e21073304B526726a8727e` |

### Optional — Deploy Fresh Contracts

```bash
cd contracts
cp .env.example .env
# Set PRIVATE_KEY and RPC_URL in .env

npm run compile
npx hardhat run scripts/deploy.js --network baseSepolia
# Copy the new addresses into backend/.env and cryptoaid/.env
```

---

## 🏛️ Key Design Decisions

| Decision | Reasoning |
|---|---|
| **Soft delete campaigns** | Preserves referential integrity on historical `Donation` records — campaigns are never hard-deleted from the database |
| **CORS allows DELETE method** | Browser preflight requests require explicit `DELETE` in `Access-Control-Allow-Methods` |
| **Backend UGF relay server** | Acts as a local gasless relay compatible with the UGF SDK interface — no external dependency at runtime |
| **Event indexer with 1500-block backfill** | Auto-recovers missed events if the backend was offline, keeping the leaderboard perfectly accurate |
| **EIP-2612 Permit signatures** | Enables single-transaction donations without requiring a separate on-chain approval step |
| **WebSocket live push** | Donation events are broadcast from the indexer to all connected frontends in real time |

---

## 📸 Pages & Views

| View | Description |
|---|---|
| **Home** | 3D Earth Globe, campaign grid, and live activity feed |
| **Campaign Explorer** | Cards for each active cause with progress bars |
| **Donation Modal** | 3-step gasless payment flow with live phase indicators |
| **Creator Dashboard** | Full analytics portal: charts, ledger, terminal, and campaign management |
| **Activity & Leaderboard** | Real-time transaction feed + all-time top donors |

---

## 📄 License

This project was built for **UGF Hackathon 2026**. All rights reserved.

---

<div align="center">
  <p>Built with ❤️ on <strong>Base Sepolia</strong> · Powered by <strong>Universal Gas Framework</strong></p>
</div>
