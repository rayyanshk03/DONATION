import React, { useState, useEffect, useRef } from "react";
import { 
  User, Wallet, Monitor, Server, Cpu, Coins, ShieldCheck, Activity,
  Play, Pause, ChevronRight, ChevronLeft, RotateCcw, 
  Terminal, Clipboard, CheckCircle2, AlertCircle, ArrowRight
} from "lucide-react";

// Technical actors on Base Sepolia
interface Actor {
  name: string;
  icon: string;
  desc: string;
}

const LIFELINES: Actor[] = [
  { name: "User", icon: "User", desc: "Donor & Wallet" },
  { name: "Wallet", icon: "Wallet", desc: "Browser Extension" },
  { name: "Frontend", icon: "Monitor", desc: "CryptoAid React App" },
  { name: "Backend API", icon: "Server", desc: "Campaign API" },
  { name: "Relayer Engine", icon: "Cpu", desc: "UGF Gas Sponsorship" },
  { name: "Mock USD", icon: "Coins", desc: "TYI_MOCK_USD Token" },
  { name: "Campaign Vault", icon: "ShieldCheck", desc: "Donation Contract" },
  { name: "Event Monitor", icon: "Activity", desc: "WebSocket Indexer" },
];

const COLUMN_WIDTH = 145;
const PADDING = 80;
const LIFELINE_COORDS = LIFELINES.map((_, i) => COLUMN_WIDTH * i + PADDING);

interface Step {
  id: number;
  title: string;
  sender: number;
  receiver: number;
  label: string;
  description: string;
  payloadType: "json" | "solidity";
  fileName?: string;
  payload: string;
  status: "success" | "pending" | "info" | "error";
  type: "call" | "reply";
}

interface Scenario {
  id: string;
  name: string;
  desc: string;
  steps: Step[];
}

// ----------------------------------------------------
// SCENARIO 1: Happy Path Steps (31 steps)
// ----------------------------------------------------
const HAPPY_PATH_STEPS: Step[] = [
  {
    id: 1,
    title: "Connect Wallet Request",
    sender: 0,
    receiver: 2,
    label: "Click 'Connect Wallet'",
    description: "The user initiates the wallet connection request from the React frontend interface.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ action: "CONNECT_WALLET", provider: "browser_extension", timestamp: 1779461043 }, null, 2),
    status: "info",
    type: "call"
  },
  {
    id: 2,
    title: "Request Wallet accounts",
    sender: 2,
    receiver: 1,
    label: "Request wallet connection",
    description: "The frontend issues an RPC request to retrieve the user's active EVM address.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ method: "eth_requestAccounts", params: [], id: 1 }, null, 2),
    status: "info",
    type: "call"
  },
  {
    id: 3,
    title: "Wallet Connected",
    sender: 1,
    receiver: 2,
    label: "Wallet connected",
    description: "The wallet extension prompts approval and returns the user's active Sepolia address and Chain ID.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ status: "connected", address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", chainId: 84532 }, null, 2),
    status: "success",
    type: "reply"
  },
  {
    id: 4,
    title: "Faucet Claim Request",
    sender: 0,
    receiver: 2,
    label: "Click 'Claim 1,000 MUSD Gaslessly'",
    description: "The user clicks the claim button to request test Mock USD tokens without paying gas fees.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ action: "CLAIM_FAUCET", token: "TYI_MOCK_USD", recipient: "0x742d35Cc..." }, null, 2),
    status: "info",
    type: "call"
  },
  {
    id: 5,
    title: "Forward Faucet Mint Request",
    sender: 2,
    receiver: 3,
    label: "Request token mint",
    description: "The frontend client passes the claim request to the API backend server database gateway.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ path: "/api/faucet", method: "POST", body: { address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" } }, null, 2),
    status: "info",
    type: "call"
  },
  {
    id: 6,
    title: "Sponsor Gas for Faucet Mint",
    sender: 3,
    receiver: 4,
    label: "Sponsor gas for faucet mint",
    description: "The backend server submits the claim request payload to the Relayer Engine for transaction execution.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ request: "gas_sponsorship", action: "mint_faucet", recipient: "0x742d35Cc...", amount: "1000000000000000000000" }, null, 2),
    status: "info",
    type: "call"
  },
  {
    id: 7,
    title: "Mint Transaction Submission",
    sender: 4,
    receiver: 5,
    label: "Submit mint(user, 1000)",
    description: "The Relayer Engine broadcasts the sponsored transaction invoking the Mock USD contract's mint function.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ to: "0x27DC1C...", data: "0x40c10f19000000000000000000000000742d35cc6634c0532925a3b844bc454e4438f44e00000000000000000000000000000000000000000000003635c9adc5dea00000", gasLimit: 80000 }, null, 2),
    status: "info",
    type: "call"
  },
  {
    id: 8,
    title: "Mint Execution On-Chain",
    sender: 5,
    receiver: 5,
    label: "Mint tokens to User",
    description: "The Mock USD ERC-20 contract processes the mint, updating state balances and emitting a Transfer event.",
    payloadType: "solidity",
    fileName: "MockUSD.sol",
    payload: `// MockUSD.sol (ERC20 Contract)
function mint(address to, uint256 amount) external onlySponsor {
    _balances[to] += amount;
    _totalSupply += amount;
    emit Transfer(address(0), to, amount);
}`,
    status: "success",
    type: "call"
  },
  {
    id: 9,
    title: "Mint Transaction Receipt",
    sender: 5,
    receiver: 4,
    label: "Return transaction receipt",
    description: "The L2 node returns the transaction receipt indicating confirmation of the state update.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ status: "mined", transactionHash: "0xf4ca7d9287a9bc28a0...", gasUsed: 52140, effectiveGasPrice: "150000000" }, null, 2),
    status: "success",
    type: "reply"
  },
  {
    id: 10,
    title: "Confirm Faucet success",
    sender: 4,
    receiver: 3,
    label: "Faucet mint success",
    description: "The Relayer Engine logs the spent gas fee and notifies the backend server of success.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ status: "success", txHash: "0xf4ca7d9287a9...", feesSponsored: "0.000062 ETH" }, null, 2),
    status: "success",
    type: "reply"
  },
  {
    id: 11,
    title: "Backend Faucet Response",
    sender: 3,
    receiver: 2,
    label: "Faucet success",
    description: "The backend server updates database stats and sends the success result back to the client frontend.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ success: true, txHash: "0xf4ca7d9287a9...", balance: "1000.00 MUSD" }, null, 2),
    status: "success",
    type: "reply"
  },
  {
    id: 12,
    title: "Display MUSD Balance",
    sender: 2,
    receiver: 0,
    label: "1,000 MUSD available",
    description: "The frontend updates the user's local dashboard state to show the newly claimed 1,000 MUSD.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ userAddress: "0x742d35Cc...", musdBalance: "1000.00 MUSD", status: "active" }, null, 2),
    status: "success",
    type: "reply"
  },
  {
    id: 13,
    title: "Initiate Donation",
    sender: 0,
    receiver: 2,
    label: "Click 'Donate $50'",
    description: "The user initiates a $50 donation to a specific cause, selecting the gasless payment method.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ action: "DONATE", amount: "50.00 MUSD", causeId: 3 }, null, 2),
    status: "info",
    type: "call"
  },
  {
    id: 14,
    title: "Request Permit Typed Signature",
    sender: 2,
    receiver: 1,
    label: "Request EIP-2612 permit signature",
    description: "The frontend requests an EIP-712 structured data signature to approve token spending gaslessly.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({
      domain: { name: "MockUSD", version: "1", chainId: 84532, verifyingContract: "0x27DC1C..." },
      types: {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      },
      message: { owner: "0x742d35Cc...", spender: "0xB6Cfb2...", value: "50000000000000000000", nonce: 0, deadline: 1779468000 }
    }, null, 2),
    status: "info",
    type: "call"
  },
  {
    id: 15,
    title: "Signed Permit Signature",
    sender: 1,
    receiver: 2,
    label: "Signed permit (v, r, s)",
    description: "The user approves the signing prompt in their wallet, returning the cryptographically split signature components.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ v: 27, r: "0x789b91763da24a1b023...", s: "0x123a4b6c7d8e9f01234...", deadline: 1779468000 }, null, 2),
    status: "success",
    type: "reply"
  },
  {
    id: 16,
    title: "Submit Donation Payload",
    sender: 2,
    receiver: 3,
    label: "Send permit signature + causeId",
    description: "The frontend sends the permit signature, donation parameters, and metadata to the backend API.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ causeId: 3, amount: "50000000000000000000", signature: { v: 27, r: "0x789b9176...", s: "0x123a4b6c...", deadline: 1779468000 } }, null, 2),
    status: "info",
    type: "call"
  },
  {
    id: 17,
    title: "Request Gas Sponsorship",
    sender: 3,
    receiver: 4,
    label: "Request sponsored gas for donation",
    description: "The backend server asks the Relayer Engine to sponsor and submit the permit donation meta-transaction.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ request: "execute_meta_tx", route: "donate_with_permit", params: { causeId: 3, amount: "50000000000000000000", signature: { v: 27, r: "0x789b...", s: "0x123a...", deadline: 1779468000 } } }, null, 2),
    status: "info",
    type: "call"
  },
  {
    id: 18,
    title: "Approve Gas Sponsorship",
    sender: 4,
    receiver: 4,
    label: "Gas sponsorship approved",
    description: "The Relayer Engine approves sponsorship, checking its Sepolia ETH gas reserves, and formats the transaction data.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ sponsorship: "approved", relayerAddress: "0x5ebad6b0d912903e...", gasLimit: 150000, gasPrice: "200000000" }, null, 2),
    status: "success",
    type: "call"
  },
  {
    id: 19,
    title: "Submit Sponsored Transaction",
    sender: 4,
    receiver: 6,
    label: "Submit donation tx (with permit)",
    description: "The Relayer Engine submits the transaction to the CampaignVault smart contract on Base Sepolia.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ to: "0xB6Cfb2...", data: "0x3af8df67000000000000000000000000742d35cc6634c0532925a3b844bc454e4438f44e0000000000000000000000000000000000000000000000000000000000000003...", gasLimit: 150000 }, null, 2),
    status: "info",
    type: "call"
  },
  {
    id: 20,
    title: "Validate Permit Signature",
    sender: 6,
    receiver: 5,
    label: "Call EIP-2612 permit(...) to approve spending",
    description: "The DonationVault contract calls the Mock USD contract's permit method to authorize the allowance gaslessly.",
    payloadType: "solidity",
    fileName: "DonationVault.sol",
    payload: `// DonationVault.sol
function donateWithPermit(
    uint256 causeId, 
    uint256 amount, 
    uint256 deadline, 
    uint8 v, 
    bytes32 r, 
    bytes32 s
) external onlyRelayer {
    // Approve spending gaslessly via EIP-2612 permit
    IERC20Permit(token).permit(msg.sender, address(this), amount, deadline, v, r, s);
    ...
}`,
    status: "info",
    type: "call"
  },
  {
    id: 21,
    title: "Update allowance mapping",
    sender: 5,
    receiver: 5,
    label: "Verify signature and update allowance",
    description: "Mock USD verifies the signature using ecrecover and updates the spender allowance mapping.",
    payloadType: "solidity",
    fileName: "MockUSD.sol",
    payload: `// MockUSD.sol (ERC20Permit)
function permit(
    address owner, 
    address spender, 
    uint256 value, 
    uint256 deadline, 
    uint8 v, 
    bytes32 r, 
    bytes32 s
) public virtual override {
    require(block.timestamp <= deadline, "ERC20Permit: expired deadline");
    bytes32 structHash = keccak256(abi.encode(_PERMIT_TYPEHASH, owner, spender, value, _useNonce(owner), deadline));
    bytes32 hash = _hashTypedDataV4(structHash);
    address signer = ECDSA.recover(hash, v, r, s);
    require(signer == owner, "ERC20Permit: invalid signature");
    _approve(owner, spender, value);
}`,
    status: "success",
    type: "call"
  },
  {
    id: 22,
    title: "Permit Success Response",
    sender: 5,
    receiver: 6,
    label: "Permit accepted",
    description: "Mock USD returns a success signal to the DonationVault contract after updating approvals.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ status: "approved", owner: "0x742d35Cc...", spender: "0xB6Cfb2...", amountAllowed: "50000000000000000000" }, null, 2),
    status: "success",
    type: "reply"
  },
  {
    id: 23,
    title: "Trigger Mock USD Transfer",
    sender: 6,
    receiver: 5,
    label: "Call transferFrom(user, vault, 50)",
    description: "The DonationVault executes a secure transfer of the 50 MUSD tokens from the donor to the contract vault.",
    payloadType: "solidity",
    fileName: "DonationVault.sol",
    payload: `// DonationVault.sol
function donateWithPermit(...) external onlyRelayer {
    ...
    // Transfer tokens from user wallet to this vault
    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
}`,
    status: "info",
    type: "call"
  },
  {
    id: 24,
    title: "Mock USD Balance Update",
    sender: 5,
    receiver: 5,
    label: "Update user & vault balances",
    description: "The token contract shifts the balance from the User address to the Vault contract address.",
    payloadType: "solidity",
    fileName: "MockUSD.sol",
    payload: `// MockUSD.sol
function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
    _transfer(sender, recipient, amount);
    _approve(sender, _msgSender(), _allowances[sender][_msgSender()] - amount);
    return true;
}`,
    status: "success",
    type: "call"
  },
  {
    id: 25,
    title: "Mock USD Success Response",
    sender: 5,
    receiver: 6,
    label: "$50 transfer complete",
    description: "Mock USD returns execution success back to the caller DonationVault contract.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ status: "success", sender: "0x742d35Cc...", recipient: "0xB6Cfb2...", amountTransferred: "50000000000000000000" }, null, 2),
    status: "success",
    type: "reply"
  },
  {
    id: 26,
    title: "Emit Donated Event",
    sender: 6,
    receiver: 6,
    label: "Emit DonationMade event",
    description: "The DonationVault contract updates the cause metrics and emits the DonationMade event logs.",
    payloadType: "solidity",
    fileName: "DonationVault.sol",
    payload: `// DonationVault.sol
function donateWithPermit(...) external onlyRelayer {
    ...
    // Record cause metrics and emit event
    causes[causeId].raisedAmount += amount;
    emit DonationMade(msg.sender, causeId, amount, block.timestamp);
}`,
    status: "success",
    type: "call"
  },
  {
    id: 27,
    title: "Donation Complete Receipt",
    sender: 6,
    receiver: 4,
    label: "Return transaction receipt",
    description: "The EVM completes the full transaction, outputting log events in the blockchain block receipt.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ status: "mined", transactionHash: "0x5a2d8e7c...", logs: [{ event: "Approval", address: "0x27DC1C..." }, { event: "Transfer", address: "0x27DC1C..." }, { event: "DonationMade", address: "0xB6Cfb2..." }] }, null, 2),
    status: "success",
    type: "reply"
  },
  {
    id: 28,
    title: "Relayer Donation success response",
    sender: 4,
    receiver: 3,
    label: "Donation success",
    description: "The Relayer Engine logs success and forwards the finalized transaction hash to the API backend.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ status: "success", txHash: "0x5a2d8e7c...", gasPaidByRelayer: "0.000108 ETH" }, null, 2),
    status: "success",
    type: "reply"
  },
  {
    id: 29,
    title: "Backend Donation Response",
    sender: 3,
    receiver: 2,
    label: "Donation processed",
    description: "The backend server confirms transaction finalization and alerts the frontend client browser.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ success: true, txHash: "0x5a2d8e7c...", amountDonated: "50.00 MUSD" }, null, 2),
    status: "success",
    type: "reply"
  },
  {
    id: 30,
    title: "Detect On-Chain Event",
    sender: 7,
    receiver: 7,
    label: "Index DonationMade event",
    description: "The backend WebSocket Event Monitor detects the raw DonationMade event log on-chain and updates metrics.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ indexedEvent: "DonationMade", donor: "0x742d35Cc...", causeId: 3, amount: "50.00 MUSD", timestamp: 1779461055 }, null, 2),
    status: "success",
    type: "call"
  },
  {
    id: 31,
    title: "Real-time UI Sync",
    sender: 7,
    receiver: 2,
    label: "Sync leaderboard, progress & user balance",
    description: "The Event Monitor broadcasts WebSockets to all connected client frontends to refresh the leaderboard, user balance, and campaign status.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ event: "UI_UPDATE", target: "leaderboard", data: { newEntry: { name: "0x742d...", amount: 50 } } }, null, 2),
    status: "info",
    type: "reply"
  }
];

// SCENARIO 2: Signature Invalid Steps (25 steps)
const INVALID_SIG_STEPS: Step[] = [
  ...HAPPY_PATH_STEPS.slice(0, 20),
  {
    id: 21,
    title: "Reject signature",
    sender: 5,
    receiver: 6,
    label: "Reject signature (invalid/expired)",
    description: "The Mock USD contract permit validation fails and reverts the transaction due to invalid signature components or an expired deadline.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ status: "REVERT", error: "ERC20Permit: invalid signature", timestamp: 1779461056 }, null, 2),
    status: "error",
    type: "reply"
  },
  {
    id: 22,
    title: "Transaction reverts",
    sender: 6,
    receiver: 4,
    label: "Transaction reverts",
    description: "The EVM reverts execution. No state modifications are saved on Sepolia.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ success: false, gasUsed: 23140, error: "Reverted" }, null, 2),
    status: "error",
    type: "reply"
  },
  {
    id: 23,
    title: "Notify sponsored transaction failed",
    sender: 4,
    receiver: 3,
    label: "Notify sponsored transaction failed",
    description: "The Relayer Engine logs the revert error code and passes the execution failure status back to the backend API.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ error: "EVM_REVERT_ON_CHAIN", code: 502, txHash: "0xe28fa4..." }, null, 2),
    status: "error",
    type: "reply"
  },
  {
    id: 24,
    title: "Forward error status",
    sender: 3,
    receiver: 2,
    label: "Forward error status",
    description: "The backend server forwards the transaction failure error context to the client frontend.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ success: false, errorCode: "SIGNATURE_EXPIRED_OR_INVALID" }, null, 2),
    status: "error",
    type: "reply"
  },
  {
    id: 25,
    title: "Display signature expired alert",
    sender: 2,
    receiver: 0,
    label: "Display signature expired alert",
    description: "The React frontend halts UI loaders and triggers a modal asking the user to re-sign the donation permit.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ display: "error_toast", message: "Transaction signature invalid. Please re-sign and try again." }, null, 2),
    status: "error",
    type: "reply"
  }
];

// SCENARIO 3: User Rejects Signature Steps (16 steps)
const REJECTED_SIG_STEPS: Step[] = [
  ...HAPPY_PATH_STEPS.slice(0, 14),
  {
    id: 15,
    title: "Signature request rejected by user",
    sender: 1,
    receiver: 2,
    label: "Signature request rejected by user",
    description: "The user explicitly rejects the signature request window inside their browser extension wallet.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ code: 4001, message: "User rejected the request." }, null, 2),
    status: "error",
    type: "reply"
  },
  {
    id: 16,
    title: "Display rejection notification",
    sender: 2,
    receiver: 0,
    label: "Display rejection notification",
    description: "The frontend shows a warning banner explaining that the transaction was canceled since permission was denied.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ display: "warning_banner", message: "Signature request rejected by user." }, null, 2),
    status: "error",
    type: "reply"
  }
];

// SCENARIO 4: Insufficient MUSD (14 steps)
const INSUFFICIENT_USD_STEPS: Step[] = [
  ...HAPPY_PATH_STEPS.slice(0, 12),
  {
    id: 13,
    title: "Initiate Donation with 0 Balance",
    sender: 0,
    receiver: 2,
    label: "Click 'Donate $50'",
    description: "The user attempts to execute a $50 donation, but their MUSD balance is insufficient.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ action: "DONATE", amount: "50.00 MUSD", userBalance: "0.00 MUSD" }, null, 2),
    status: "info",
    type: "call"
  },
  {
    id: 14,
    title: "Block donation & show warning",
    sender: 2,
    receiver: 0,
    label: "Block donation & show warning",
    description: "The frontend prevents transaction construction, warning the user to claim test MUSD tokens from the faucet first.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ blocked: true, error: "INSUFFICIENT_FUNDS", recommendedAction: "CLAIM_FAUCET" }, null, 2),
    status: "error",
    type: "reply"
  }
];

// SCENARIO 5: Relayer Out of ETH (21 steps)
const RELAYER_OUT_STEPS: Step[] = [
  ...HAPPY_PATH_STEPS.slice(0, 17),
  {
    id: 18,
    title: "Check relayer wallet: Insufficient ETH",
    sender: 4,
    receiver: 4,
    label: "Check relayer wallet: Insufficient ETH",
    description: "The Relayer Engine executes a gas budget check on its L2 sponsor hot wallet and fails due to low ETH reserves.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ error: "INSUFFICIENT_SPONSOR_BALANCE", relayerBalance: "0.00012 ETH", gasRequired: "0.0025 ETH" }, null, 2),
    status: "error",
    type: "call"
  },
  {
    id: 19,
    title: "Reject gas sponsorship request",
    sender: 4,
    receiver: 3,
    label: "Reject gas sponsorship request",
    description: "The Relayer Engine returns an error response to the API server database.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ success: false, status: "REJECTED_BY_RELAYER", reason: "OUT_OF_ETH" }, null, 2),
    status: "error",
    type: "reply"
  },
  {
    id: 20,
    title: "Forward gas sponsor failure",
    sender: 3,
    receiver: 2,
    label: "Forward gas sponsor failure",
    description: "The backend server logs the relayer out-of-funds error and notifies the client browser.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ success: false, errorType: "UGF_RELAYER_DEPLETED" }, null, 2),
    status: "error",
    type: "reply"
  },
  {
    id: 21,
    title: "Show service unavailable notice",
    sender: 2,
    receiver: 0,
    label: "Show service unavailable notice",
    description: "The frontend notifies the user that the free gasless service is temporarily unavailable and they should try again later.",
    payloadType: "json",
    fileName: "payload.json",
    payload: JSON.stringify({ display: "modal_error", title: "Sponsorship Depleted", body: "The UGF gas sponsorship wallet is temporarily empty. Please try again in a few minutes." }, null, 2),
    status: "error",
    type: "reply"
  }
];

const SCENARIOS: Scenario[] = [
  { id: "happy", name: "Success Flow", desc: "Gasless faucet mint & $50 donation path", steps: HAPPY_PATH_STEPS },
  { id: "invalid_sig", name: "Invalid Signature", desc: "Contract EIP-2612 permit validation fails", steps: INVALID_SIG_STEPS },
  { id: "rejected_sig", name: "User Rejects Signature", desc: "User cancels signature approval in wallet", steps: REJECTED_SIG_STEPS },
  { id: "insufficient_usd", name: "Insufficient MUSD", desc: "User tries to donate without faucet tokens", steps: INSUFFICIENT_USD_STEPS },
  { id: "relayer_out", name: "Relayer Out of ETH", desc: "UGF sponsor hot wallet runs out of gas money", steps: RELAYER_OUT_STEPS },
];

export default function TransactionSequenceDiagram() {
  const [scenarioId, setScenarioId] = useState<string>("happy");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"payload" | "explanation">("payload");
  const [copied, setCopied] = useState<boolean>(false);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Active scenario steps
  const activeScenario = SCENARIOS.find((sc) => sc.id === scenarioId) || SCENARIOS[0];
  const steps = activeScenario.steps;
  const activeStepObj = steps[currentStep] || steps[0];

  // Auto-scroll the canvas container to center the active step vertically
  useEffect(() => {
    if (canvasContainerRef.current) {
      const container = canvasContainerRef.current;
      const rowHeight = 56;
      const headerHeight = 72; // Lifeline header height
      const activeTop = currentStep * rowHeight + headerHeight;
      const containerHeight = container.clientHeight;

      // Calculate center position
      const targetScrollTop = activeTop - containerHeight / 2 + rowHeight / 2;

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth"
      });
    }
  }, [currentStep, scenarioId]);

  // Reset step if it goes out of bounds on scenario switch
  useEffect(() => {
    if (currentStep >= steps.length) {
      setCurrentStep(0);
    }
  }, [scenarioId, steps.length, currentStep]);

  // Autoplay loop
  useEffect(() => {
    if (isPlaying) {
      autoplayRef.current = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % steps.length);
      }, 3500);
    } else {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    }

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, [isPlaying, steps.length]);

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStep((prev) => (prev + 1) % steps.length);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeStepObj.payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Professional GitHub-Muted Syntax Highlighter (Clean keys, neutral colors)
  const getHighlightedCode = (code: string, type: "json" | "solidity") => {
    let highlighted = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    if (type === "solidity") {
      const keywords = ["contract", "function", "external", "emit", "msg", "address", "uint256", "uint8", "bytes32", "safeTransferFrom", "permit", "token", "onlyRelayer", "onlySponsor", "public", "virtual", "override", "require", "returns", "bool", "abi", "encode", "keccak256", "ecrecover"];
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, "g");
        highlighted = highlighted.replace(regex, `<span class="text-blue-400 font-semibold">${keyword}</span>`);
      });

      // Comments
      highlighted = highlighted.replace(/(\/\/.*)/g, '<span class="text-zinc-500 italic">$1</span>');
      return highlighted;
    }

    try {
      return highlighted.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
        let cls = "text-amber-200/90";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "text-zinc-400 font-medium"; // JSON keys are neutral slate gray
          } else {
            cls = "text-emerald-400/95"; // values are green
          }
        } else if (/true|false/.test(match)) {
          cls = "text-blue-400 font-semibold";
        } else if (/null/.test(match)) {
          cls = "text-zinc-600";
        } else {
          cls = "text-orange-400/90";
        }
        return `<span class="${cls}">${match}</span>`;
      });
    } catch {
      return code;
    }
  };

  const getActorIcon = (iconName: string, active: boolean) => {
    const props = { 
      className: `h-3.5 w-3.5 transition-all duration-300 ${
        active ? "text-blue-400 scale-105" : "text-zinc-500"
      }` 
    };
    switch (iconName) {
      case "User": return <User {...props} />;
      case "Wallet": return <Wallet {...props} />;
      case "Monitor": return <Monitor {...props} />;
      case "Server": return <Server {...props} />;
      case "Cpu": return <Cpu {...props} />;
      case "Coins": return <Coins {...props} />;
      case "ShieldCheck": return <ShieldCheck {...props} />;
      case "Activity": return <Activity {...props} />;
      default: return <Cpu {...props} />;
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      {/* Scrollbar overrides for clean layout */}
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-thin::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #09090b;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}} />

      {/* Scenario Selector Tab Bar (Developer Tool Aesthetic) */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 font-mono">Select Protocol Flow Scenario</span>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 w-full">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => {
                setScenarioId(sc.id);
                setCurrentStep(0);
                setIsPlaying(false);
              }}
              className={`relative px-4 py-3 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                scenarioId === sc.id
                  ? "bg-zinc-900/50 border-zinc-700/60 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                  : "bg-[#09090b] border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800"
              }`}
            >
              <div className="text-[11px] font-semibold flex items-center gap-2 font-mono">
                <span className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                  scenarioId === sc.id
                    ? (sc.id === "happy" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]")
                    : "bg-zinc-700"
                }`}></span>
                {sc.name}
              </div>
              <div className="text-[9px] text-zinc-500 mt-1 font-sans line-clamp-1 leading-normal">
                {sc.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Control Panel (Debugger/Player panel style) */}
      <div className="flex flex-col bg-[#09090b] border border-zinc-900 rounded-xl overflow-hidden shadow-md shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 border-b border-zinc-900/60">
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPlaying ? "bg-emerald-400" : "bg-blue-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? "bg-emerald-500" : "bg-blue-500"}`}></span>
            </span>
            <div>
              <h3 className="text-xs font-semibold text-zinc-300 font-mono">Interactive Flow Controller</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5 font-mono uppercase tracking-tight">
                {isPlaying ? "Autoplay Enabled" : "Step Mode"} | STEP {currentStep + 1} of {steps.length}: {activeStepObj?.title}
              </p>
            </div>
          </div>

          {/* Player controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              title="Reset to first step"
              className="flex items-center justify-center p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            
            <button
              onClick={handlePrev}
              disabled={currentStep === 0 && !isPlaying}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer text-xs font-mono font-medium"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg border text-xs font-semibold font-mono transition-all cursor-pointer ${
                isPlaying 
                  ? "bg-zinc-900 border-zinc-800 text-emerald-400 hover:bg-zinc-800" 
                  : "bg-blue-600 border-blue-500 text-white hover:bg-blue-500"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5 fill-current" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Autoplay
                </>
              )}
            </button>

            <button
              onClick={handleNext}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer text-xs font-mono font-medium"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress Tracker (Clean debugger timeline bar) */}
        <div className="w-full bg-zinc-950 h-[3px]">
          <div 
            className={`h-full transition-all duration-300 ease-out ${
              activeStepObj?.status === "error" ? "bg-red-500" : "bg-blue-500"
            }`}
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Panel Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Column: Interactive Diagram Canvas */}
        <div className="xl:col-span-2 w-full bg-[#09090b] border border-zinc-900 rounded-xl overflow-hidden shadow-md shadow-black/20 flex flex-col p-5">
          {/* Sticky and Scrollable Canvas Container */}
          <div 
            ref={canvasContainerRef}
            className="w-full max-h-[580px] overflow-y-auto overflow-x-auto pb-4 scrollbar-thin select-none relative"
          >
            {/* Diagram Content Canvas */}
            <div className="relative min-w-[1200px] w-full py-4 bg-[#09090b]">
              
              {/* 1. Lifeline Headers (Sticky Top) */}
              <div className="sticky top-0 z-30 bg-[#09090b]/95 backdrop-blur-md border-b border-zinc-900/60 pb-3 pt-2">
                <div className="relative h-16 w-full">
                  {LIFELINES.map((actor, i) => {
                    const x = LIFELINE_COORDS[i];
                    const isActiveNode = activeStepObj?.sender === i || activeStepObj?.receiver === i;
                    
                    return (
                      <div
                        key={i}
                        style={{ left: `${x}px` }}
                        className="absolute -translate-x-1/2 top-1 flex flex-col items-center w-28 transition-all duration-300"
                      >
                        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-all duration-200 text-[11px] font-mono ${
                          isActiveNode
                            ? "bg-zinc-900 border-zinc-700 text-white shadow-md shadow-black/40"
                            : "bg-[#09090b] border-zinc-900 text-zinc-400"
                        }`}>
                          {getActorIcon(actor.icon, isActiveNode)}
                          <span className="font-semibold whitespace-nowrap">{actor.name}</span>
                        </div>
                        <span className={`text-[8px] mt-1.5 text-center font-mono tracking-tight transition-colors duration-300 leading-tight w-24 block ${
                          isActiveNode ? "text-blue-400 font-medium" : "text-zinc-600"
                        }`}>
                          {actor.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Steps Execution Rows */}
              <div className="relative mt-6" style={{ height: `${steps.length * 56}px` }}>
                
                {/* Background Vertical Lifelines */}
                {LIFELINES.map((_, i) => {
                  const x = LIFELINE_COORDS[i];
                  const isNodeActive = activeStepObj?.sender === i || activeStepObj?.receiver === i;
                  return (
                    <div
                      key={i}
                      style={{ left: `${x}px` }}
                      className={`absolute top-0 bottom-0 w-[1px] border-l border-dashed transition-all duration-300 -z-0 ${
                        isNodeActive ? "border-blue-500/20" : "border-zinc-800/40"
                      }`}
                    />
                  );
                })}
                
                {/* Dynamic Step Message Rows */}
                {steps.map((step, index) => {
                  const xSender = LIFELINE_COORDS[step.sender];
                  const xReceiver = LIFELINE_COORDS[step.receiver];
                  const left = Math.min(xSender, xReceiver);
                  const width = Math.abs(xSender - xReceiver);
                  const isActive = currentStep === index;
                  const isLoopback = step.sender === step.receiver;
                  const isReply = step.type === "reply";
                  
                  return (
                    <div
                      key={step.id}
                      style={{ 
                        top: `${index * 56}px`,
                        height: '56px'
                      }}
                      data-step-index={index}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStep(index);
                      }}
                      className={`absolute left-0 right-0 group cursor-pointer transition-colors duration-150 ${
                        isActive ? "bg-blue-950/10" : "hover:bg-zinc-900/10"
                      }`}
                    >
                      {/* 2a. UML Activation Bars */}
                      {LIFELINES.map((_, colIndex) => {
                        const isNodeActiveHere = (colIndex === step.sender || colIndex === step.receiver);
                        if (!isNodeActiveHere) return null;
                        
                        return (
                          <div
                            key={colIndex}
                            style={{ left: `${LIFELINE_COORDS[colIndex] - 4}px` }}
                            className={`absolute top-0 bottom-0 w-[9px] border transition-all duration-300 rounded-sm z-10 ${
                              isActive
                                ? "bg-blue-600/10 border-blue-500/80"
                                : "bg-zinc-900 border-zinc-850"
                            }`}
                          />
                        );
                      })}

                      {isLoopback ? (
                        /* Self Loop / Loopback Message using clean SVG path */
                        <div
                          style={{ left: `${xSender}px` }}
                          className={`absolute top-1/2 -translate-y-1/2 h-10 w-24 flex items-center pointer-events-none transition-all duration-300 ${
                            isActive ? "opacity-100" : "opacity-60 group-hover:opacity-90"
                          }`}
                        >
                          <svg className="w-16 h-10 overflow-visible" viewBox="0 0 64 40">
                            <path
                              d="M 4 5 H 32 A 4 4 0 0 1 36 9 V 21 A 4 4 0 0 1 32 25 H 4"
                              fill="none"
                              stroke={isActive ? "#3b82f6" : "#27272a"}
                              strokeWidth={isActive ? "2" : "1.5"}
                              strokeDasharray={isReply ? "3 3" : "none"}
                              className="transition-all duration-300"
                            />
                            {/* Loopback Arrowhead pointing back left */}
                            <path
                              d="M 4 25 L 10 22 L 10 28 Z"
                              fill={isActive ? "#3b82f6" : "#3f3f46"}
                              className="transition-all duration-300"
                            />
                          </svg>
                          
                          {/* Loopback Label */}
                          <div className={`absolute left-9 top-1/2 -translate-y-1/2 px-2 bg-[#09090b] text-[10px] font-mono transition-all duration-300 ${
                            isActive ? "text-blue-400 font-bold scale-[1.02]" : "text-zinc-500"
                          }`}>
                            {index + 1}. {step.label}
                          </div>
                        </div>
                      ) : (
                        /* Normal Horizontal Message using math-exact SVG lines */
                        <div
                          style={{ left: `${left}px`, width: `${width}px` }}
                          className={`absolute top-1/2 -translate-y-1/2 h-10 flex items-center pointer-events-none transition-all duration-300 ${
                            isActive ? "opacity-100" : "opacity-50 group-hover:opacity-80"
                          }`}
                        >
                          <svg width={width} height="40" className="overflow-visible w-full h-full">
                            {/* Line */}
                            <line
                              x1={step.sender < step.receiver ? 0 : width}
                              y1={20}
                              x2={step.sender < step.receiver ? width : 0}
                              y2={20}
                              stroke={isActive ? "#3b82f6" : "#27272a"}
                              strokeWidth={isActive ? "2" : "1.5"}
                              strokeDasharray={isReply ? "4 4" : "none"}
                              className="transition-all duration-300"
                            />
                            
                            {/* Directional Arrowheads */}
                            {step.sender < step.receiver ? (
                              isReply ? (
                                /* Open Arrowhead LTR (Reply) */
                                <path
                                  d={`M ${width - 6} 15 L ${width} 20 L ${width - 6} 25`}
                                  fill="none"
                                  stroke={isActive ? "#3b82f6" : "#3f3f46"}
                                  strokeWidth="2"
                                  className="transition-all duration-300"
                                />
                              ) : (
                                /* Filled Arrowhead LTR (Call) */
                                <path
                                  d={`M ${width - 6} 16 L ${width} 20 L ${width - 6} 24 Z`}
                                  fill={isActive ? "#3b82f6" : "#3f3f46"}
                                  className="transition-all duration-300"
                                />
                              )
                            ) : (
                              isReply ? (
                                /* Open Arrowhead RTL (Reply) */
                                <path
                                  d={`M 6 15 L 0 20 L 6 25`}
                                  fill="none"
                                  stroke={isActive ? "#3b82f6" : "#3f3f46"}
                                  strokeWidth="2"
                                  className="transition-all duration-300"
                                />
                              ) : (
                                /* Filled Arrowhead RTL (Call) */
                                <path
                                  d={`M 6 16 L 0 20 L 6 24 Z`}
                                  fill={isActive ? "#3b82f6" : "#3f3f46"}
                                  className="transition-all duration-300"
                                />
                              )
                            )}
                          </svg>
                          
                          {/* Message label (High contrast text, dark canvas backing) */}
                          <div 
                            className={`absolute left-1/2 -translate-x-1/2 -top-1.5 px-2 bg-[#09090b] text-[10px] font-mono tracking-tight transition-all duration-300 ${
                              isActive 
                                ? "text-blue-400 font-bold scale-[1.02]" 
                                : "text-zinc-500 group-hover:text-zinc-400"
                            }`}
                          >
                            {index + 1}. {step.label}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Diagram Legend / Footer */}
          <div className="border-t border-zinc-900/60 mt-2 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[11px] text-zinc-500">
            <div className="flex items-center gap-1.5 font-mono">
              <AlertCircle className="h-3.5 w-3.5 text-zinc-600" />
              <span>Select any step row to inspect contract code, RPC calls, parameters, and events.</span>
            </div>
            <span className="font-mono text-zinc-600">Autoscroll synchronized.</span>
          </div>
        </div>

        {/* Right Column: Terminal / Detail Inspector Card */}
        <div className="xl:col-span-1 flex flex-col gap-4 h-full">
          {/* Step Meta Detail Card */}
          <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 shadow-md shadow-black/20 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2.5 py-1 rounded font-semibold uppercase tracking-wider">
                STEP {activeStepObj?.id} OF {steps.length}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${
                  activeStepObj?.status === "error" ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" : "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                }`}></span>
                <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">
                  {activeStepObj?.status}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-[13px] font-bold text-white tracking-wide font-mono uppercase border-b border-zinc-900 pb-2">
                {activeStepObj?.title}
              </h2>
              <p className="text-zinc-400 text-[11.5px] mt-3 leading-relaxed font-sans">
                {activeStepObj?.description}
              </p>
            </div>

            {/* Direct Flow Vector */}
            <div className="flex items-center justify-between border-t border-zinc-900 pt-4 text-[11px] font-mono">
              <div className="bg-zinc-950/80 border border-zinc-900/60 p-2 rounded flex-1 mr-2 text-center truncate">
                <span className="text-zinc-600 block text-[9px] uppercase font-semibold">Sender Node</span>
                <span className="font-medium text-zinc-400 mt-1 block truncate">{LIFELINES[activeStepObj?.sender || 0].name}</span>
              </div>
              <div className="text-zinc-600 flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-zinc-700" />
              </div>
              <div className="bg-zinc-950/80 border border-zinc-900/60 p-2 rounded flex-1 ml-2 text-center truncate">
                <span className="text-zinc-600 block text-[9px] uppercase font-semibold">Receiver Node</span>
                <span className="font-medium text-zinc-400 mt-1 block truncate">{LIFELINES[activeStepObj?.receiver || 0].name}</span>
              </div>
            </div>
          </div>

          {/* Sandbox Dev Terminal IDE Block */}
          <div className="bg-[#09090b] border border-zinc-900 rounded-xl overflow-hidden shadow-md shadow-black/20 flex flex-col flex-1 min-h-[380px]">
            {/* Terminal Header */}
            <div className="bg-[#09090b] border-b border-zinc-900 px-4 py-2.5 flex items-center justify-between">
              {/* Custom Window dots */}
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"></div>
              </div>

              {/* IDE Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("payload")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                    activeTab === "payload"
                      ? "bg-zinc-900 text-white border border-zinc-800"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Coins className="h-3 w-3" />
                  {activeStepObj?.fileName || (activeStepObj?.payloadType === "solidity" ? "Contract.sol" : "payload.json")}
                </button>
                <button
                  onClick={() => setActiveTab("explanation")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                    activeTab === "explanation"
                      ? "bg-zinc-900 text-white border border-zinc-800"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Terminal className="h-3 w-3" />
                  Console Logs
                </button>
              </div>

              {/* Copy action */}
              <button
                onClick={handleCopy}
                disabled={activeTab !== "payload"}
                className="text-zinc-500 hover:text-zinc-300 disabled:opacity-20 transition-all cursor-pointer p-1 rounded"
                title="Copy contents"
              >
                {copied ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Clipboard className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Terminal Body Console */}
            <div className="flex-1 p-4 overflow-y-auto max-h-[380px] font-mono text-[11px] leading-relaxed scrollbar-thin bg-black/10">
              {activeTab === "payload" ? (
                <pre className="text-zinc-300 whitespace-pre-wrap select-all font-mono">
                  <code 
                    dangerouslySetInnerHTML={{ 
                      __html: getHighlightedCode(activeStepObj?.payload || "", activeStepObj?.payloadType || "json") 
                    }} 
                  />
                </pre>
              ) : (
                <div className="text-zinc-400 space-y-3.5 select-text font-mono">
                  <div className="text-zinc-600 flex justify-between border-b border-zinc-900/60 pb-1.5">
                    <span>CONSOLE SESSION TRACE</span>
                    <span>{new Date().toISOString().split('T')[0]}</span>
                  </div>
                  <div className="text-zinc-600">[RPC] Connected to Base Sepolia Network (Chain ID: 84532)</div>
                  <div className="text-zinc-650">--------------------------------------------------</div>
                  <div className="text-zinc-400">
                    <span className="text-zinc-500 font-semibold">&gt; Executing Node Transition {activeStepObj?.id}:</span>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-lg text-zinc-400 text-[10px] space-y-1.5 font-mono shadow-inner shadow-black">
                    <div><span className="text-zinc-600 uppercase font-semibold">Action:</span> <span className="text-blue-400">{activeStepObj?.label}</span></div>
                    <div><span className="text-zinc-600 uppercase font-semibold">Sender:</span> {LIFELINES[activeStepObj?.sender || 0].name} ({LIFELINES[activeStepObj?.sender || 0].desc})</div>
                    <div><span className="text-zinc-600 uppercase font-semibold">Receiver:</span> {LIFELINES[activeStepObj?.receiver || 0].name} ({LIFELINES[activeStepObj?.receiver || 0].desc})</div>
                  </div>
                  {activeStepObj?.status === "error" ? (
                    <div className="text-red-400 flex items-center gap-1.5 font-bold mt-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                      <span>[REVERT] Transaction execution encountered fatal error.</span>
                    </div>
                  ) : (
                    <div className="text-emerald-400/90 flex items-center gap-1.5 font-medium mt-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      <span>[SUCCESS] On-chain transition validated successfully.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
