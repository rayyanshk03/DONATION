# CryptoAid — Product Requirements Document

> **"Donate on-chain without gas, approvals, bridges, or blockchain complexity."**

---

## 1. Executive Summary

CryptoAid is a gasless Web3 donation platform built on **UGF (Universal Gas Facilitation)** that eliminates every friction point of on-chain giving. Users connect a wallet, pick a cause, sign once, and their donation lands on-chain — no ETH, no gas math, no bridges. Gas is abstracted via **Mock USD payments** through the UGF SDK, making blockchain invisible.

**Built for:** UGF Hackathon · 2-person team · 5-day sprint  
**Chain:** Base Sepolia  
**Stack:** Next.js 14 · React-UGF · Express/Prisma · PostgreSQL · ethers.js v6

---

## 2. Vision

A world where donating crypto is as simple as tapping "Pay" on Venmo — no wallets to fund, no gas to calculate, no chains to bridge. CryptoAid proves that UGF makes Web3 accessible to anyone with a browser wallet.

---

## 3. Problem Statement

| Barrier | Impact |
|---|---|
| Gas fees require holding ETH | Non-crypto users can't donate |
| Approve + Send = 2 transactions | Confusing multi-step UX |
| Bridge complexity | Cross-chain donations impossible for beginners |
| Raw blockchain UX | Hex addresses, pending states scare users |
| No transparency | Traditional donation platforms lack verifiability |

**Root cause:** Blockchain UX is built for developers, not donors.

---

## 4. Solution Overview

CryptoAid wraps the **UGF transaction lifecycle** into a single-sign donation experience:

```
Connect Wallet → Select Cause → Sign Once → Donation Complete
```

**How UGF powers this:**
- **No ETH needed:** Gas is paid in Mock USD via UGF — users never hold or spend ETH
- **Single signature:** EIP-2612 permit + UGF execution = one wallet popup
- **Invisible blockchain:** The Quote → Settle → Execute → Confirm lifecycle runs behind a polished UI overlay
- **On-chain proof:** Every donation is an immutable, verifiable on-chain event

---

## 5. Product Positioning

```
┌─────────────────────────────────────────────────┐
│              CryptoAid Positioning               │
├─────────────────────────────────────────────────┤
│  Target:     Crypto-curious donors, Web2 users  │
│  Category:   Gasless On-Chain Donation Platform  │
│  USP:        Zero-gas, single-sign donations     │
│  Powered by: UGF SDK + React-UGF                │
│  Chain:      Base Sepolia (testnet)              │
│  Demo:       Live donations in < 30 seconds      │
└─────────────────────────────────────────────────┘
```

**Competitors vs CryptoAid:**

| Feature | Traditional | Gitcoin | CryptoAid |
|---|---|---|---|
| Gas required | Yes | Yes | **No (UGF)** |
| ETH dependency | Yes | Yes | **No (Mock USD)** |
| Tx count | 2+ | 2+ | **1 sign** |
| Beginner friendly | No | Partial | **Yes** |
| On-chain proof | No | Yes | **Yes** |

---

## 6. User Experience Philosophy

### Core Principles
1. **Invisible Blockchain:** Users never see gas, hex, or chain IDs
2. **One-Sign Flow:** Permit signature + UGF execution in a single interaction
3. **Instant Feedback:** Animated lifecycle overlay shows real-time progress
4. **Social Proof:** Live feed + leaderboard drive engagement

### User Journey

```
┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────────┐
│  Landing  │───▶│ Connect Wallet│───▶│ Pick Cause│───▶│ Enter Amount │
└──────────┘    └──────────────┘    └──────────┘    └──────────────┘
                                                            │
                                                            ▼
┌──────────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐
│ Share on X   │◀───│ Success! │◀───│ Confirmed│◀───│  Sign Once   │
└──────────────┘    └──────────┘    └──────────┘    └──────────────┘
```

---

## 7. Core Features

### 7.1 Gasless Donation Engine
- UGF-powered gas abstraction — Mock USD covers all fees
- Single EIP-2612 permit signature
- Real-time transaction lifecycle overlay
- Automatic cause-wallet routing

### 7.2 Campaign System
- Dynamic campaign cards with progress bars
- Goal tracking with on-chain verification
- Category tagging (Environmental, Humanitarian, Education)
- Featured/trending campaign highlights

### 7.3 Live Donation Feed
- WebSocket-driven real-time updates
- Animated feed entries with donor avatars
- Auto-refreshing campaign progress bars

### 7.4 Leaderboard
- Top donors ranked by total contribution
- Time-filtered views (24h, 7d, All-time)
- Redis-cached for instant loading

### 7.5 Analytics Dashboard
- Per-cause donation totals and donor counts
- Platform-wide aggregate statistics
- Donation velocity charts

### 7.6 Social Sharing
- Pre-filled X (Twitter) share after donation
- On-chain receipt with Etherscan link
- Shareable donation badges

---

## 8. Frontend Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + custom design tokens |
| Animation | Framer Motion |
| Wallet | RainbowKit + wagmi |
| Blockchain | ethers.js v6 |
| Gas Abstraction | **React-UGF SDK** |
| State | React Context + SWR |
| Icons | Lucide React |

### Component Tree

```
<App>
├── <Navbar>
│   ├── <Logo />
│   ├── <WalletConnectButton />      ← RainbowKit
│   └── <NetworkBadge />
├── <HeroSection>
│   ├── <AnimatedHeadline />
│   ├── <UGFBadge />                  ← "Zero Gas Fees"
│   └── <CTAButton />
├── <CausesGrid>
│   └── <CauseCard />                 ← map(campaigns)
│       ├── <ProgressBar />
│       ├── <DonorCount />
│       └── <DonateButton />
├── <DonationModal>
│   ├── <AmountInput />
│   ├── <PresetButtons />
│   ├── <UGFLifecycleOverlay />       ← Quote→Settle→Execute→Confirm
│   └── <SuccessPanel />
├── <LiveFeed />                      ← WebSocket
├── <Leaderboard />                   ← Redis-cached API
└── <Footer />
```

### Design System

```css
/* Core Tokens */
--bg-primary:     #0a0a0f;
--bg-card:        rgba(255,255,255,0.04);
--accent-blue:    #3b82f6;
--accent-purple:  #8b5cf6;
--accent-green:   #10b981;
--glass-border:   rgba(255,255,255,0.08);
--glass-blur:     blur(20px);
--glow-blue:      0 0 40px rgba(59,130,246,0.15);
--radius-card:    16px;
--font-family:    'Inter', system-ui, sans-serif;
```

**Visual Features:**
- Dark futuristic interface with plasma glow backgrounds
- Glassmorphism cards with frosted borders
- Animated gradient text for headlines
- Framer Motion page transitions and micro-interactions
- Responsive mobile-first grid layout

---

## 9. Backend Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express.js |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Supabase) |
| Cache | Redis (leaderboard + price feeds) |
| Blockchain | ethers.js v6 |

### Architecture Diagram

```
┌─────────────┐     ┌─────────────────────────┐     ┌──────────┐
│   Next.js   │────▶│   Express API Server    │────▶│ Supabase │
│  Frontend   │     │                         │     │ Postgres │
└─────────────┘     │  /api/donations         │     └──────────┘
                    │  /api/leaderboard        │          │
                    │  /api/causes             │     ┌──────────┐
                    │  /api/analytics          │────▶│  Redis   │
                    │  /api/health             │     │  Cache   │
                    └────────────┬────────────┘     └──────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Event Indexer         │
                    │   (ethers.js listener)  │
                    │   Base Sepolia RPC      │
                    └─────────────────────────┘
```

### Backend Responsibilities

| Responsibility | Implementation |
|---|---|
| Wallet verification | `ethers.verifyMessage()` on login |
| Donation storage | Prisma write on indexed event |
| Leaderboard | Redis sorted set, 60s TTL |
| Cause analytics | Aggregated Prisma queries |
| Event indexing | ethers.js contract event listener |
| Tx lifecycle | Store UGF status per donation |
| Health check | `/api/health` → DB + Redis ping |

---

## 10. Blockchain Architecture

### Chain: Base Sepolia

| Parameter | Value |
|---|---|
| Chain ID | 84532 |
| RPC | `https://sepolia.base.org` |
| Explorer | `https://sepolia.basescan.org` |
| Gas Token | ETH (abstracted by UGF) |
| Token | Mock USD (UGF testnet) |

### On-Chain Flow

```
User Wallet (EOA)
    │
    ├── EIP-2612 Permit Signature (off-chain)
    │
    ▼
UGF SDK
    │
    ├── Quote (estimate gas in Mock USD)
    ├── Settle (lock Mock USD for gas)
    ├── Execute (submit tx to Base Sepolia)
    └── Confirm (finality + receipt)
    │
    ▼
DonationVault.sol
    │
    ├── Records donation amount + cause
    ├── Transfers tokens to cause wallet
    └── Emits DonationMade event
```

---

## 11. Smart Contract Design

### DonationVault.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DonationVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Cause {
        string  name;
        address wallet;
        uint256 totalDonated;
        uint256 donorCount;
        bool    active;
    }

    struct Donation {
        address donor;
        uint256 causeId;
        uint256 amount;
        uint256 timestamp;
    }

    IERC20 public token;
    mapping(uint256 => Cause) public causes;
    uint256 public causeCount;

    // Analytics
    mapping(address => uint256) public totalDonatedByUser;
    mapping(address => mapping(uint256 => bool)) public hasUserDonatedToCause;
    Donation[] public donations;

    // Events
    event CauseCreated(uint256 indexed id, string name, address wallet);
    event DonationMade(
        address indexed donor,
        uint256 indexed causeId,
        uint256 amount,
        uint256 timestamp
    );

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

    function createCause(string memory _name, address _wallet)
        external onlyOwner returns (uint256)
    {
        uint256 id = ++causeCount;
        causes[id] = Cause(_name, _wallet, 0, 0, true);
        emit CauseCreated(id, _name, _wallet);
        return id;
    }

    function donate(uint256 _causeId, uint256 _amount)
        external nonReentrant
    {
        Cause storage c = causes[_causeId];
        require(c.active, "Cause inactive");
        require(_amount > 0, "Zero amount");

        token.safeTransferFrom(msg.sender, c.wallet, _amount);

        c.totalDonated += _amount;
        if (!hasUserDonatedToCause[msg.sender][_causeId]) {
            c.donorCount++;
            hasUserDonatedToCause[msg.sender][_causeId] = true;
        }

        totalDonatedByUser[msg.sender] += _amount;
        donations.push(Donation(msg.sender, _causeId, _amount, block.timestamp));

        emit DonationMade(msg.sender, _causeId, _amount, block.timestamp);
    }

    function getCauseStats(uint256 _id)
        external view returns (uint256 donated, uint256 donors)
    {
        Cause storage c = causes[_id];
        return (c.totalDonated, c.donorCount);
    }

    function getDonationCount() external view returns (uint256) {
        return donations.length;
    }
}
```

---

## 12. UGF Transaction Lifecycle

UGF is the **centerpiece** of CryptoAid. It replaces the entire ETH gas paradigm with Mock USD payments.

### How UGF Removes ETH Dependency

| Traditional Flow | CryptoAid + UGF Flow |
|---|---|
| User must hold ETH | User holds **zero ETH** |
| User pays gas in ETH | Gas paid in **Mock USD** by UGF |
| 2+ wallet popups | **1 signature** (permit) |
| User manages nonces | UGF handles nonce management |
| Failed tx = lost gas | UGF quotes cost **before** execution |

### The Four-Phase Lifecycle

```
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│  1. QUOTE │───▶│ 2. SETTLE │───▶│ 3. EXECUTE│───▶│ 4. CONFIRM│
│           │    │           │    │           │    │           │
│ Estimate  │    │ Lock Mock │    │ Submit tx │    │ On-chain  │
│ gas cost  │    │ USD for   │    │ to Base   │    │ finality  │
│ in Mock   │    │ gas fees  │    │ Sepolia   │    │ + receipt │
│ USD       │    │           │    │           │    │           │
└───────────┘    └───────────┘    └───────────┘    └───────────┘
     UI:              UI:              UI:              UI:
  "Preparing"     "Processing"     "Confirming"     "Success!"
```

### React-UGF Integration

```tsx
import { useUGF, UGFProvider } from 'react-ugf';

function DonationFlow({ causeId, amount }) {
  const { quote, settle, execute, status } = useUGF();

  async function handleDonate() {
    // Phase 1: Quote — get gas cost in Mock USD
    const q = await quote({
      target: VAULT_ADDRESS,
      calldata: encodeDonateFn(causeId, amount),
      chain: 'base-sepolia',
    });

    // Phase 2: Settle — lock Mock USD for gas
    await settle(q.quoteId);

    // Phase 3: Execute — submit to chain
    const receipt = await execute(q.quoteId);

    // Phase 4: Confirm — finality
    // status auto-updates: 'quoted' → 'settled' → 'executing' → 'confirmed'
  }

  return (
    <UGFLifecycleOverlay status={status}>
      <button onClick={handleDonate}>Donate {amount} USD</button>
    </UGFLifecycleOverlay>
  );
}
```

### Mock USD Gas Payment Flow

```
User's Mock USD Balance
    │
    ├── UGF quotes gas: ~$0.002 in Mock USD
    ├── Mock USD locked during settlement
    ├── Transaction submitted to Base Sepolia
    ├── Gas paid from UGF pool (not user's ETH)
    └── User sees: "Gas Fee: $0.00 — paid by platform"
```

**Key Point:** Users never need ETH. UGF's Mock USD system on the testnet abstracts all gas costs, making the donation flow indistinguishable from a Web2 payment.

---

## 13. Permit Signature Flow

EIP-2612 permits allow token approval via an off-chain signature — no on-chain approve() transaction needed.

```
┌────────────────────────────────────────────────────────┐
│                 Permit Signature Flow                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  1. Frontend builds EIP-712 typed data:                │
│     { owner, spender(Vault), value, deadline, nonce }  │
│                                                        │
│  2. Wallet signs (eth_signTypedData_v4)                │
│     → Returns { v, r, s }                              │
│                                                        │
│  3. UGF bundles permit + donate into single execution  │
│     → permit(owner, spender, value, deadline, v, r, s) │
│     → donate(causeId, amount)                          │
│                                                        │
│  4. User experience: ONE wallet popup                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 14. API Design

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | DB + Redis health check |
| `GET` | `/api/causes` | List all active causes |
| `GET` | `/api/causes/:id` | Cause details + stats |
| `GET` | `/api/donations` | Paginated donation history |
| `GET` | `/api/donations/feed` | Latest 20 for live feed |
| `GET` | `/api/leaderboard` | Top donors (Redis-cached) |
| `GET` | `/api/analytics/overview` | Platform-wide stats |
| `GET` | `/api/analytics/cause/:id` | Per-cause analytics |
| `POST` | `/api/auth/verify` | Wallet signature verification |

### Example Response: `GET /api/donations/feed`

```json
{
  "donations": [
    {
      "id": "d_01abc",
      "donor": "0x1234...abcd",
      "causeId": 2,
      "causeName": "Clean Water",
      "amount": "50.00",
      "txHash": "0xabc...def",
      "timestamp": "2026-05-19T10:00:00Z",
      "ugfStatus": "confirmed"
    }
  ],
  "total": 847
}
```

---

## 15. Database Design

### Prisma Schema

```prisma
model Cause {
  id          Int        @id @default(autoincrement())
  name        String
  description String
  wallet      String
  icon        String
  tag         String
  goalUsd     Decimal
  active      Boolean    @default(true)
  createdAt   DateTime   @default(now())
  donations   Donation[]
}

model Donation {
  id          String   @id @default(cuid())
  donor       String
  amount      Decimal
  txHash      String   @unique
  ugfQuoteId  String?
  ugfStatus   String   @default("pending")
  cause       Cause    @relation(fields: [causeId], references: [id])
  causeId     Int
  createdAt   DateTime @default(now())

  @@index([donor])
  @@index([causeId])
  @@index([createdAt])
}

model Donor {
  id            String   @id @default(cuid())
  wallet        String   @unique
  totalDonated  Decimal  @default(0)
  donationCount Int      @default(0)
  firstDonation DateTime @default(now())
  lastDonation  DateTime @default(now())

  @@index([totalDonated])
}
```

---

## 16. Security Systems

| Layer | Measure |
|---|---|
| Wallet Auth | `ethers.verifyMessage()` signature verification |
| Smart Contract | ReentrancyGuard, Ownable, SafeERC20 |
| API | Rate limiting (100 req/min), CORS whitelist |
| Input | Zod validation on all endpoints |
| Permit | Deadline expiry (1 hour max) |
| DB | Parameterized queries via Prisma |
| Frontend | CSP headers, XSS sanitization |

---

## 17. Event Indexing

The backend listens to `DonationMade` events emitted by `DonationVault.sol` and persists them for analytics and feed.

```
Base Sepolia RPC (WebSocket)
    │
    ▼
ethers.js Contract Listener
    │  event DonationMade(donor, causeId, amount, timestamp)
    ▼
┌────────────────────────────┐
│  Event Handler             │
│  1. Parse event args       │
│  2. Upsert Donor record    │
│  3. Create Donation row    │
│  4. Update Cause totals    │
│  5. Invalidate Redis cache │
│  6. Push to WebSocket feed │
└────────────────────────────┘
```

**Indexer Implementation:**
```typescript
const contract = new ethers.Contract(VAULT_ADDR, VAULT_ABI, provider);

contract.on("DonationMade", async (donor, causeId, amount, timestamp, event) => {
  await prisma.donation.upsert({
    where: { txHash: event.transactionHash },
    create: {
      donor, causeId: Number(causeId),
      amount: ethers.formatUnits(amount, 18),
      txHash: event.transactionHash,
      ugfStatus: "confirmed",
    },
    update: { ugfStatus: "confirmed" },
  });
  await redis.del("leaderboard:*");
  wss.broadcast({ type: "new_donation", donor, causeId, amount });
});
```

---

## 18. Real-Time Systems

| System | Technology | Purpose |
|---|---|---|
| Live Feed | WebSocket (ws) | Push new donations to all connected clients |
| Leaderboard | Redis Sorted Set | O(log N) ranked queries, 60s TTL |
| Price Feed | Redis cache | UGF/USD price cached, 5min TTL |
| Tx Status | UGF SDK polling | Quote→Settle→Execute→Confirm status updates |

**WebSocket Protocol:**
```json
// Server → Client
{ "type": "new_donation", "donor": "0x...", "causeId": 2, "amount": "50.00" }
{ "type": "cause_update", "causeId": 2, "totalDonated": "44150.00", "donorCount": 513 }
```

---

## 19. UI/UX Design System

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `bg-primary` | `#0a0a0f` | Page background |
| `bg-card` | `rgba(255,255,255,0.04)` | Glassmorphic cards |
| `accent-blue` | `#3b82f6` | Primary actions |
| `accent-purple` | `#8b5cf6` | Secondary accents |
| `accent-green` | `#10b981` | Success states |
| `accent-amber` | `#f59e0b` | Warnings |
| `text-primary` | `#f8fafc` | Headings |
| `text-muted` | `#94a3b8` | Body text |

### Typography

| Element | Font | Weight | Size |
|---|---|---|---|
| H1 (Hero) | Inter | 700 | clamp(3rem, 6vw, 5rem) |
| H2 (Section) | Inter | 700 | clamp(1.8rem, 4vw, 2.5rem) |
| Body | Inter | 400 | 1rem |
| Badge | Inter | 600 | 0.8rem |
| Mono (hashes) | JetBrains Mono | 500 | 0.85rem |

### Animation System (Framer Motion)

```tsx
// Page transition
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -10 },
};

// Card hover
const cardHover = {
  scale: 1.02,
  boxShadow: "0 20px 60px rgba(59,130,246,0.15)",
  transition: { type: "spring", stiffness: 300 },
};

// Staggered grid
const stagger = { animate: { transition: { staggerChildren: 0.08 } } };
```

---

## 20. Component Architecture

### Key Components

| Component | Props | Responsibility |
|---|---|---|
| `<CauseCard>` | cause, onSelect, selected | Render campaign with progress + stats |
| `<DonationModal>` | cause, onClose | Amount input → UGF flow → success |
| `<UGFLifecycleOverlay>` | status, txHash | Animated 4-phase progress indicator |
| `<LiveFeed>` | — | WebSocket-connected donation stream |
| `<Leaderboard>` | timeFilter | Ranked donor list with pagination |
| `<AmountInput>` | value, onChange, balance | UGC input with presets + USD conversion |
| `<WalletButton>` | — | RainbowKit connect/disconnect |
| `<SuccessPanel>` | donation | Receipt + share buttons |

### UGF Lifecycle Overlay States

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│ QUOTING │──▶│SETTLING │──▶│EXECUTING│──▶│CONFIRMED│
│ ◌ ○ ○ ○ │   │ ● ◌ ○ ○ │   │ ● ● ◌ ○ │   │ ● ● ● ● │
│ dim      │   │ pulse   │   │ spin    │   │ ✓ glow  │
└─────────┘   └─────────┘   └─────────┘   └─────────┘
```

Each phase shows:
- Animated progress dots
- Status message ("Preparing your donation...")
- Gas cost badge ("Gas: $0.00 — paid by UGF")
- Estimated time remaining

---

## 21. Analytics System

### Platform Metrics (stored in PostgreSQL)

| Metric | Source | Update Trigger |
|---|---|---|
| Total donations | `SUM(donations.amount)` | On new donation |
| Unique donors | `COUNT(DISTINCT donor)` | On new donation |
| Per-cause totals | Grouped aggregation | On new donation |
| Donation velocity | Time-bucketed counts | Hourly cron |
| Avg donation size | `AVG(amount)` | On new donation |

### API Response: `GET /api/analytics/overview`

```json
{
  "totalDonated": "125400.00",
  "totalDonations": 847,
  "uniqueDonors": 312,
  "avgDonation": "148.05",
  "activeCauses": 3,
  "last24hVolume": "8200.00"
}
```

---

## 22. Donation Lifecycle

Complete end-to-end lifecycle of a single donation:

```
Step 1: User clicks "Donate 50 USD" on Clean Water campaign
    │
Step 2: Frontend builds EIP-2612 permit typed data
    │
Step 3: Wallet popup → user signs once (permit signature)
    │
Step 4: React-UGF calls quote()
    │   → UGF estimates gas: ~$0.002 Mock USD
    │   → UI shows: "Preparing your donation..."
    │
Step 5: React-UGF calls settle()
    │   → Mock USD locked for gas payment
    │   → UI shows: "Processing..."
    │
Step 6: React-UGF calls execute()
    │   → permit() + donate() submitted to Base Sepolia
    │   → UI shows: "Confirming on-chain..."
    │
Step 7: Transaction confirmed
    │   → DonationMade event emitted
    │   → Backend indexer captures event
    │   → DB updated, Redis invalidated
    │   → WebSocket pushes to all clients
    │
Step 8: UI shows success panel
    │   → "Donated 50 USD to Clean Water"
    │   → Etherscan link + Share on X button
    │
Step 9: Live feed updates for all viewers
```

---

## 23. Deployment Plan

| Component | Platform | Reason |
|---|---|---|
| Frontend | Vercel | Free, instant Next.js deploys |
| Backend API | Railway | Free tier, easy Express hosting |
| Database | Supabase | Free PostgreSQL + dashboard |
| Redis | Upstash | Free tier, serverless Redis |
| Smart Contract | Base Sepolia | UGF-compatible testnet |
| Domain | Vercel | Auto-provisioned subdomain |

### Environment Variables

```env
# Frontend (.env.local)
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_UGF_API_KEY=ugf_test_...
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_WS_URL=wss://api.cryptoaid.xyz

# Backend (.env)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
RPC_URL=https://sepolia.base.org
VAULT_ADDRESS=0x...
```

---

## 24. Infrastructure Plan

```
┌──────────────────────────────────────────────────┐
│                  Infrastructure                   │
├──────────────────────────────────────────────────┤
│                                                  │
│   Vercel CDN ──▶ Next.js Frontend                │
│        │                                         │
│        ▼                                         │
│   Railway ──▶ Express API + Event Indexer        │
│        │            │                            │
│        ▼            ▼                            │
│   Supabase    Upstash Redis                      │
│   PostgreSQL  (leaderboard cache)                │
│                                                  │
│   Base Sepolia ──▶ DonationVault.sol             │
│        │                                         │
│        ▼                                         │
│   UGF Testnet SDK (gas abstraction)              │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Total cost: $0** — All services on free tiers.

---

## 25. Five-Day Sprint Plan

### Day 1: Foundation

| Task | Owner | Hours |
|---|---|---|
| Init Next.js 14 + Tailwind + Framer Motion | Frontend | 3 |
| Design system tokens + global layout | Frontend | 2 |
| Init Express + Prisma + Supabase | Backend | 3 |
| Write + deploy DonationVault.sol | Backend | 2 |
| **Milestone:** Skeleton app + deployed contract | | |

### Day 2: Core Features

| Task | Owner | Hours |
|---|---|---|
| CauseCard grid + HeroSection | Frontend | 3 |
| RainbowKit wallet integration | Frontend | 2 |
| Donation + Cause + Donor API endpoints | Backend | 3 |
| Event indexer (DonationMade listener) | Backend | 2 |
| **Milestone:** Wallet connects, causes render from API | | |

### Day 3: UGF Integration

| Task | Owner | Hours |
|---|---|---|
| React-UGF provider setup | Frontend | 2 |
| DonationModal with UGF lifecycle flow | Frontend | 4 |
| UGFLifecycleOverlay (4-phase animation) | Frontend | 2 |
| Leaderboard API + Redis caching | Backend | 2 |
| **Milestone:** Full gasless donation flow works end-to-end | | |

### Day 4: Polish & Analytics

| Task | Owner | Hours |
|---|---|---|
| LiveFeed (WebSocket) | Frontend | 2 |
| Leaderboard page | Frontend | 2 |
| Success panel + social sharing | Frontend | 2 |
| Analytics endpoints + dashboard data | Backend | 2 |
| Micro-animations + loading states | Frontend | 2 |
| **Milestone:** Full-featured app with live data | | |

### Day 5: Demo Prep

| Task | Owner | Hours |
|---|---|---|
| Mobile responsiveness pass | Frontend | 2 |
| Error handling + edge cases | Both | 2 |
| Seed demo data (donations, donors) | Backend | 1 |
| Record demo video | Both | 2 |
| Write README + deploy final build | Both | 2 |
| **Milestone:** Demo-ready, deployed, polished | | |

---

## 26. Demo Strategy

### Demo Script (3 minutes)

```
0:00 — "What if donating crypto was as easy as Venmo?"
0:15 — Show landing page (dark, premium UI)
0:30 — Connect wallet via RainbowKit
0:45 — Select "Clean Water" campaign
1:00 — Enter 50 USD → click Donate
1:10 — UGF lifecycle overlay animates (Quote→Settle→Execute→Confirm)
1:30 — Success screen with Etherscan link
1:45 — Show live feed updating in real-time
2:00 — Show leaderboard
2:15 — "Zero gas. One signature. On-chain proof."
2:30 — Architecture slide (UGF flow diagram)
2:45 — "Built with UGF in 5 days. Thank you."
```

### Demo Preparation

- Pre-fund 5 wallets with Mock USD tokens
- Seed 50+ historical donations for realistic feed
- Pre-cache leaderboard for instant load
- Test full flow 10+ times before demo
- Have backup video recording ready

---

## 27. Judging Alignment

| Judging Criteria | CryptoAid Strength |
|---|---|
| **UGF Integration** | Core of entire product — Quote→Settle→Execute→Confirm lifecycle |
| **Technical Depth** | Smart contract + event indexing + React-UGF + permit signatures |
| **User Experience** | Single-sign gasless flow, invisible blockchain |
| **Innovation** | First gasless donation platform on UGF |
| **Completeness** | Full-stack: frontend + backend + contract + analytics |
| **Presentation** | Premium UI, animated lifecycle, live demo |
| **Practicality** | Real-world donation use case |

---

## 28. Risk Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| UGF SDK instability | Blocks donations | Fallback to direct ethers.js tx with toast warning |
| Base Sepolia RPC down | No on-chain reads | Multi-RPC failover (Alchemy + public) |
| WebSocket disconnects | Stale live feed | Auto-reconnect with exponential backoff |
| Event indexer misses | Missing donations | Startup catch-up: scan blocks since last indexed |
| Permit unsupported | 2-step flow | Graceful fallback to standard approve() |
| Demo wallet empty | Can't demo | Pre-fund 5 wallets, have backup |

---

## 29. Stretch Features

If time permits on Day 4-5:

| Feature | Effort | Impact |
|---|---|---|
| Donation receipt NFT (ERC-721) | 4h | Visual proof + collectibility |
| Multi-token support | 3h | Accept USDC, DAI via UGF |
| Campaign creation form | 3h | User-generated causes |
| Dark/light mode toggle | 2h | Accessibility |
| Email notifications (Resend) | 2h | Donor engagement |
| QR code sharing | 1h | Mobile donation links |

---

## 30. Future Improvements

**Post-Hackathon Roadmap:**

1. **Mainnet deployment** — Base mainnet with real USDC
2. **Recurring donations** — Monthly scheduled UGF transactions
3. **DAO governance** — Token holders vote on featured causes
4. **Impact certificates** — On-chain attestations for tax deduction
5. **Fiat on-ramp** — Stripe → Mock USD → UGF → on-chain donation
6. **Multi-chain** — Deploy to Optimism, Arbitrum via UGF
7. **Mobile app** — React Native with WalletConnect v2
8. **Charity verification** — KYC for cause wallets via Gitcoin Passport

---

## 31. Final Conclusion

CryptoAid proves that **UGF makes blockchain invisible**. By wrapping the Quote → Settle → Execute → Confirm lifecycle into a single-sign donation experience, we eliminate every friction point that prevents mainstream adoption of on-chain giving.

**What makes CryptoAid special:**

- **Zero gas:** Users never hold or spend ETH
- **One signature:** Permit + UGF = single wallet popup
- **Real-time:** Live feed + leaderboard powered by event indexing
- **Transparent:** Every donation is an immutable on-chain event
- **Beautiful:** Premium dark UI with glassmorphism and micro-animations
- **Complete:** Full-stack — frontend, backend, smart contract, analytics

> *"The best blockchain UX is the one users never notice."*
>
> CryptoAid — Donate on-chain. Zero friction. Powered by UGF.

---

**Built with ❤️ for the UGF Hackathon**  
**Team Size:** 2 · **Timeline:** 5 Days · **Chain:** Base Sepolia
