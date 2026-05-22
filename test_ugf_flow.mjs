#!/usr/bin/env node
/**
 * UGF 4-Phase End-to-End Smoke Test
 * Tests: QUOTE → SETTLE → EXECUTE → STATUS (CONFIRM)
 *
 * Run: node test_ugf_flow.js
 */

import { ethers } from 'ethers';

// ── Config ───────────────────────────────────────────────────────────────────
const BACKEND    = 'http://localhost:4000/api';
const VAULT_ADDR = '0x11269B64621C93B73d1abb898FE956f6502E13bc';
const TOKEN_ADDR = '0x1eDa37f016bDA3013de7A49e0fb4348c574C1BEf';

// Test signer (deployer wallet — has ETH on Base Sepolia)
const PRIVATE_KEY = '0xab6c76ff92a10154c7d334b41041852ef1cd70da6d4bd2dfdb9bee5c93fef57d';
const provider    = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/czheP03mJkUjYcTB-Ns2y');
const wallet      = new ethers.Wallet(PRIVATE_KEY, provider);
const SENDER      = wallet.address;

// Encode donate(causeId=1, amount=100 MUSD)
const donateAmount = ethers.parseUnits('100', 18);
const iface        = new ethers.Interface([
  'function donate(uint256 causeId, uint256 amount)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
]);
const calldata = iface.encodeFunctionData('donate', [1n, donateAmount]);

async function post(path, body) {
  const res = await fetch(`${BACKEND}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`POST ${path} → ${res.status}: ${JSON.stringify(data.error || data)}`);
  return data;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  UGF 4-Phase End-to-End Smoke Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Sender: ${SENDER}`);
  console.log(`  Target: ${VAULT_ADDR}\n`);

  // ── Pre-flight: ensure deployer has enough MUSD ─────────────────────────
  const tokenRO = new ethers.Contract(TOKEN_ADDR, [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address,address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
    'function faucet(address to, uint256 amount)',
  ], wallet);

  const balance = await tokenRO.balanceOf(SENDER);
  console.log(`  MUSD balance: ${ethers.formatUnits(balance, 18)} MUSD`);

  if (balance < donateAmount) {
    process.stdout.write('⓪ FAUCET  ... ');
    const faucetTx = await tokenRO.faucet(SENDER, ethers.parseUnits('10000', 18));
    await faucetTx.wait();
    console.log(`✅  claimed 10,000 MUSD`);
  }

  // ── Pre-flight: ensure deployer has allowance for the vault ────────────
  process.stdout.write('⓪ APPROVE ... ');
  const currentAllowance = await tokenRO.allowance(SENDER, VAULT_ADDR);
  if (currentAllowance < donateAmount) {
    const approveTx = await tokenRO.approve(VAULT_ADDR, donateAmount);
    await approveTx.wait();
    console.log(`✅  approved tx=${approveTx.hash.slice(0,10)}...`);
  } else {
    console.log(`✅  already approved (${ethers.formatUnits(currentAllowance,18)} MUSD)`);
  }

  // ── Phase 1: QUOTE ──────────────────────────────────────────────────────
  process.stdout.write('① QUOTE   ... ');
  const quote = await post('/v1/quote', {
    sender: SENDER,
    chainId: 84532,
    calls: [{ target: VAULT_ADDR, calldata, value: '0' }],
    gasToken: 'MOCK_USD',
    sponsorship: 'platform',
  });
  console.log(`✅  quoteId=${quote.quoteId}  gasCostUsd=$${quote.gasCostUsd}`);

  // ── Phase 2: SETTLE ─────────────────────────────────────────────────────
  process.stdout.write('② SETTLE  ... ');
  const authMessage =
    `CryptoAid UGF Authorization\n\nQuote: ${quote.quoteId}\nChain: 84532\n` +
    `Gas: ${quote.gasCostUsd} Mock USD\n\nI authorize UGF to execute this gasless transaction.`;
  const sig        = await wallet.signMessage(authMessage);
  const settlement = await post('/v1/settle', { quoteId: quote.quoteId, signature: sig });
  console.log(`✅  settlementId=${settlement.settlementId}`);

  // ── Phase 3: EXECUTE ────────────────────────────────────────────────────
  process.stdout.write('③ EXECUTE ... ');
  const execution = await post('/v1/execute', { settlementId: settlement.settlementId });
  console.log(`✅  executionId=${execution.executionId}  status=${execution.status}`);

  // ── Phase 4: CONFIRM (polling) ──────────────────────────────────────────
  process.stdout.write('④ CONFIRM ... polling');
  let receipt;
  for (let i = 0; i < 30; i++) {
    await sleep(4000);
    process.stdout.write('.');
    const status = await post('/v1/status', { executionId: execution.executionId });
    if (status.status === 'confirmed') {
      receipt = status;
      break;
    }
    if (status.status === 'failed') {
      throw new Error(`Execution failed: ${status.error}`);
    }
  }

  if (!receipt) throw new Error('Timed out waiting for confirmation');

  console.log(`\n  ✅  Confirmed!`);
  console.log(`     txHash:      ${receipt.transactionHash}`);
  console.log(`     blockNumber: ${receipt.blockNumber}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🎉 UGF flow complete — no ETH used by user!');
  console.log(`  🔗 https://sepolia.basescan.org/tx/${receipt.transactionHash}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
})().catch(err => {
  console.error('\n❌ Smoke test FAILED:', err.message);
  process.exit(1);
});
