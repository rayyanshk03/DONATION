// ─── Contract config ─────────────────────────────────────────────────────────
// Supports window.ENV (dynamic loader), process env, or global fallbacks.
const CONTRACT_ADDRESS = (typeof window !== 'undefined' && window.ENV && window.ENV.VITE_DONATION_CONTRACT_ADDRESS)
    || (typeof process !== 'undefined' && process.env && process.env.VITE_DONATION_CONTRACT_ADDRESS)
    || (typeof DONATION_CONTRACT_ADDRESS !== 'undefined' ? DONATION_CONTRACT_ADDRESS : '0xYourDonationManagerAddressHere');
const CONTRACT_ABI = [
    // ── Write ────────────────────────────────────────────────────────────────
    'function donateUGC(uint256 causeId, uint256 amount)',
    // ── Read ─────────────────────────────────────────────────────────────────
    'function getCauses(uint256[] causeIds) view returns (address[] wallets, uint256[] donated, uint256[] numDonors)',
    'function totalDonatedUGC(uint256 causeId) view returns (uint256)',
    'function donorCount(uint256 causeId) view returns (uint256)',
];

// Full ERC-20 + EIP-2612 ABI
const ERC20_ABI = [
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function name() view returns (string)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    // EIP-2612 permit support detection
    'function nonces(address owner) view returns (uint256)',
    'function DOMAIN_SEPARATOR() view returns (bytes32)',
    'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
];

// UGC token decimals — updated at runtime via token.decimals()
let UGC_DECIMALS = 18n;

// Block explorer
const EXPLORER_BASE = 'https://sepolia.etherscan.io/tx/';

// ─── EIP-2612 permit helper ───────────────────────────────────────────────────
/**
 * Attempts to build and request an EIP-2612 permit signature.
 *
 * Returns an object { deadline, v, r, s } on success.
 * Returns null if:
 *   - the token does not expose nonces() / DOMAIN_SEPARATOR() (not EIP-2612)
 *   - the wallet rejects the signTypedData request (e.g. hardware wallet)
 *   - any other unexpected error
 *
 * The caller falls back to a standard approve() transaction when null is returned.
 *
 * @param {ethers.Contract} ugcToken  Token contract (connected to signer)
 * @param {string}          owner     User's wallet address
 * @param {BigInt}          amountWei Donation amount in token-wei
 * @param {number}          chainId   Current chain ID
 */
async function tryPermitSignature(ugcToken, owner, amountWei, chainId) {
    try {
        // ── Step 1: detect EIP-2612 support ────────────────────────────────
        const [nonce, tokenName] = await Promise.all([
            ugcToken.nonces(owner),
            ugcToken.name(),
        ]);

        // ── Step 2: build the typed-data payload ────────────────────────────
        const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

        const domain = {
            name:              tokenName,
            version:           '1',           // most tokens use '1'; change if needed
            chainId:           chainId,
            verifyingContract: await ugcToken.getAddress(),
        };

        const types = {
            Permit: [
                { name: 'owner',    type: 'address' },
                { name: 'spender',  type: 'address' },
                { name: 'value',    type: 'uint256' },
                { name: 'nonce',    type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
            ],
        };

        const message = {
            owner,
            spender:  CONTRACT_ADDRESS,
            value:    amountWei,
            nonce,
            deadline,
        };

        // ── Step 3: ask the wallet to sign (eth_signTypedData_v4) ───────────
        const signer = ugcToken.runner; // the signer attached to the contract
        const rawSig = await signer.signTypedData(domain, types, message);
        const sig    = ethers.Signature.from(rawSig);

        return { deadline, v: sig.v, r: sig.r, s: sig.s };

    } catch (err) {
        // Token doesn't support EIP-2612, or wallet (e.g. Ledger) refused signTypedData
        const msg = (err.shortMessage ?? err.message ?? '').toLowerCase();
        const knownFallback =
            msg.includes('nonces') ||
            msg.includes('unsupported') ||
            msg.includes('not implemented') ||
            msg.includes('method not found') ||
            err.code === 'ACTION_REJECTED' ||
            err.code === 4001;

        if (!knownFallback) {
            // Unexpected error — log it so developers can investigate
            console.warn('[Permit] Unexpected error, falling back to approve():', err);
        }
        return null;
    }
}

// ─── TX Pending overlay helpers ───────────────────────────────────────────────

function showTxPending(txHash) {
    const overlay  = document.getElementById('txPendingOverlay');
    const hashEl   = document.getElementById('txHashDisplay');
    const hashLink = document.getElementById('txHashLink');
    if (!overlay) return;
    if (txHash) {
        const short = `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
        if (hashEl)   hashEl.textContent = short;
        if (hashLink) hashLink.href = `${EXPLORER_BASE}${txHash}`;
    }
    document.body.style.overflow = 'hidden';
    overlay.classList.add('tx-pending--open');
}

/**
 * Phase 1 -- Called immediately after eth_sendUserOperation succeeds.
 * Shows the blocking overlay with the UserOp hash (plain text, no link yet).
 * Locks the form; user cannot interact until the overlay is dismissed.
 */
function showTxPendingUserOp(opHash) {
    const overlay    = document.getElementById('txPendingOverlay');
    const hashRow    = document.getElementById('txHashRow');
    const label      = document.getElementById('txHashLabel');
    const hashPlain  = document.getElementById('txHashDisplay');
    const msg        = document.getElementById('txPendingMsg');
    const hint       = document.getElementById('txPendingHint');
    if (!overlay) return;

    // Populate the UserOp hash in the plain (non-link) slot
    if (hashPlain && opHash) {
        hashPlain.textContent = `${opHash.slice(0, 6)}...${opHash.slice(-4)}`;
    }

    // Set the row to "userop" state: plain hash visible, explorer link hidden
    if (hashRow)  hashRow.dataset.state  = 'userop';
    if (label)    label.textContent      = 'UserOp';
    if (msg)      msg.textContent        = 'UserOp submitted -- waiting for on-chain confirmation...';
    if (hint)     hint.textContent       = 'This usually takes 15-30 seconds';

    // Lock scroll and open overlay (blocks all form interaction)
    document.body.style.overflow = 'hidden';
    overlay.classList.add('tx-pending--open');
}

/**
 * Phase 2 -- Called once eth_getUserOperationReceipt returns a transactionHash.
 * Upgrades the hash row: plain UserOp hash -> clickable Etherscan link.
 * Does NOT close the overlay -- showTxSuccess() handles the panel swap.
 */
function upgradeTxHashToLink(txHash) {
    const hashRow     = document.getElementById('txHashRow');
    const label       = document.getElementById('txHashLabel');
    const linkEl      = document.getElementById('txHashLink');
    const linkDisplay = document.getElementById('txHashLinkDisplay');
    const msg         = document.getElementById('txPendingMsg');
    const hint        = document.getElementById('txPendingHint');

    const short = txHash ? `${txHash.slice(0, 6)}...${txHash.slice(-4)}` : '--';

    if (linkDisplay) linkDisplay.textContent = short;
    if (linkEl)      linkEl.href             = `${EXPLORER_BASE}${txHash}`;

    // Flip row to "txhash" state: explorer link visible, plain hash hidden
    if (hashRow) hashRow.dataset.state  = 'txhash';
    if (label)   label.textContent      = 'Transaction';
    if (msg)     msg.textContent        = 'Confirmed on-chain!';
    if (hint)    hint.textContent       = 'Gas fee: $0.00 -- paid by platform';
}

function hideTxPending() {
    const overlay = document.getElementById('txPendingOverlay');
    if (!overlay) return;
    overlay.classList.remove('tx-pending--open');
    document.body.style.overflow = '';
    setTimeout(() => {
        // Reset panels
        document.getElementById('txPendingPanel')?.classList.remove('tx-panel--hidden');
        document.getElementById('txSuccessPanel')?.classList.add('tx-panel--hidden');
        // Reset hash row to initial "userop" state for the next donation
        const hashRow   = document.getElementById('txHashRow');
        const label     = document.getElementById('txHashLabel');
        const hashPlain = document.getElementById('txHashDisplay');
        const linkDisp  = document.getElementById('txHashLinkDisplay');
        const msg       = document.getElementById('txPendingMsg');
        const hint      = document.getElementById('txPendingHint');
        if (hashRow)   hashRow.dataset.state  = 'userop';
        if (label)     label.textContent      = 'UserOp';
        if (hashPlain) hashPlain.textContent  = '--';
        if (linkDisp)  linkDisp.textContent   = '--';
        if (msg)       msg.textContent        = 'Submitting to the Biconomy bundler...';
        if (hint)      hint.textContent       = 'This usually takes 15-30 seconds';
    }, 320);
}

function showTxSuccess(amountUgc, causeName, txHash) {
    // Flip panels: hide pending spinner, reveal success
    document.getElementById('txPendingPanel')?.classList.add('tx-panel--hidden');
    document.getElementById('txSuccessPanel')?.classList.remove('tx-panel--hidden');

    // Donation detail line
    const amtFmt = Number(amountUgc).toLocaleString('en-US');
    const detail = document.getElementById('txSuccessDetail');
    if (detail) detail.textContent = `You donated ${amtFmt} UGC to ${causeName}`;

    // Transaction hash row -- clickable Etherscan link
    if (txHash) {
        const short       = `${txHash.slice(0, 10)}...${txHash.slice(-4)}`;
        const hashDisplay = document.getElementById('txSuccessHashDisplay');
        const hashLink    = document.getElementById('txSuccessHashLink');
        if (hashDisplay) hashDisplay.textContent = short;
        if (hashLink)    hashLink.href            = `${EXPLORER_BASE}${txHash}`;
    }

    // Pre-filled tweet with the exact copy requested
    const shareBtn = document.getElementById('txShareBtn');
    if (shareBtn) {
        const tweet = encodeURIComponent(
            `Just donated ${amtFmt} UGC to ${causeName} with zero gas fees!\n#UGC #CryptoDonation #GasFree`
        );
        shareBtn.href = `https://twitter.com/intent/tweet?text=${tweet}`;
    }

    // Re-fetch UGC balance so the navbar badge updates immediately
    syncUgcData().catch(console.warn);
}

// ─── Reset form ───────────────────────────────────────────────────────────────

async function resetDonateForm() {
    const input = document.getElementById('donateAmount');
    if (input) input.value = '';
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    updateUsdDisplay(0);
    updateSummaryLine(0);
    clearError();
    // Re-fetch UGC balance AND allowance so the button correctly shows
    // "Approve UGC" vs "Donate Now" for the next donation attempt
    await syncUgcData();
    refreshSubmitBtn();
    document.getElementById('donateSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── State ────────────────────────────────────────────────────────────────────

let ugcUsdPrice  = null;   // float — UGC/USD
let ugcBalanceWei = 0n;    // BigInt — raw balanceOf() in token-wei
let ugcAllowanceWei = 0n;  // BigInt — raw allowance(user, DonationManager)

// ─── UGC/USD Price ────────────────────────────────────────────────────────────
/**
 * Fetches the UGC/USD price.
 * Priority:
 *   1. Your own backend: GET /api/ugc-price  → { usd: 0.024 }
 *   2. CoinGecko (if UGC is listed): replace the URL below with the real coin ID.
 * Falls back silently — the USD display just shows "—".
 */
async function fetchUgcPrice() {
    const indicator = document.getElementById('ethPriceIndicator');
    try {
        // ── Option A: your backend ──────────────────────────────────────────
        // const resp = await fetch('/api/ugc-price', { signal: AbortSignal.timeout(5000) });

        // ── Option B: CoinGecko (swap 'ugc-coin' for the real CoinGecko ID) ─
        const resp = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=ugc-coin&vs_currencies=usd',
            { signal: AbortSignal.timeout(6000) }
        );
        if (!resp.ok) throw new Error('Bad response');
        const data = await resp.json();
        ugcUsdPrice = data['ugc-coin']?.usd ?? null;

        if (ugcUsdPrice && indicator) {
            indicator.textContent = `1 UGC ≈ $${ugcUsdPrice.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
            indicator.classList.add('price-loaded');
        }
        // Refresh USD display if the user already typed an amount
        const amount = parseFloat(document.getElementById('donateAmount')?.value);
        if (amount > 0) updateUsdDisplay(amount);
    } catch {
        if (indicator) indicator.textContent = 'Price unavailable';
    }
}

// ─── Live USD equivalent ──────────────────────────────────────────────────────

function updateUsdDisplay(amountUgc) {
    const el = document.getElementById('usdEquivalent');
    if (!el) return;
    if (!ugcUsdPrice || !(amountUgc > 0)) {
        el.textContent = '≈ $— USD';
        el.classList.remove('usd-loaded');
        return;
    }
    const usd = (amountUgc * ugcUsdPrice).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    el.textContent = `≈ $${usd} USD`;
    el.classList.add('usd-loaded');
}

// ─── Summary line ─────────────────────────────────────────────────────────────

function updateSummaryLine(amountUgc) {
    const row  = document.getElementById('donateSummary');
    const amt  = document.getElementById('summaryAmount');
    const name = document.getElementById('summaryCause');
    if (!row) return;
    const cause = CAUSES.find(c => c.id === selectedCauseId);
    if (amountUgc > 0 && cause) {
        row.style.display = 'flex';
        if (amt)  amt.textContent  = Number(amountUgc).toLocaleString('en-US');
        if (name) name.textContent = cause.name;
    } else {
        row.style.display = 'none';
    }
}

// ─── Inline error ─────────────────────────────────────────────────────────────

function showError(msg) {
    const el   = document.getElementById('amountError');
    const wrap = document.getElementById('amountInputWrap');
    if (el)   { el.textContent = msg; el.classList.add('visible'); }
    if (wrap)  wrap.classList.add('input-error-state');
}

function clearError() {
    const el   = document.getElementById('amountError');
    const wrap = document.getElementById('amountInputWrap');
    if (el)   { el.textContent = ''; el.classList.remove('visible'); }
    if (wrap)  wrap.classList.remove('input-error-state');
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateAmount(amountUgc) {
    if (!amountUgc || amountUgc <= 0) {
        showError('Please enter an amount greater than 0.');
        return false;
    }
    // Compare in token-wei to avoid float rounding issues
    try {
        const amountWei = ethers.parseUnits(String(amountUgc), UGC_DECIMALS);
        if (ugcBalanceWei > 0n && amountWei > ugcBalanceWei) {
            const humanBalance = Number(ethers.formatUnits(ugcBalanceWei, UGC_DECIMALS))
                .toLocaleString('en-US', { maximumFractionDigits: 2 });
            showError(`Insufficient UGC balance. Your wallet holds ${humanBalance} UGC.`);
            return false;
        }
    } catch {
        showError('Invalid amount.');
        return false;
    }
    clearError();
    return true;
}

// ─── Two-phase submit button ──────────────────────────────────────────────────
/**
 * The button label & style depend on the current UGC allowance:
 *
 *   allowance < donationAmount  →  "Approve UGC"  (amber)
 *   allowance >= donationAmount →  "Donate Now"   (green)
 *   not connected / no amount   →  disabled
 */
function refreshSubmitBtn() {
    const btn = document.getElementById('donateSubmitBtn');
    if (!btn) return;

    const { isConnected } = WalletContext.getState();
    const amountRaw = parseFloat(document.getElementById('donateAmount')?.value);
    const ready     = isConnected && selectedCauseId !== null && amountRaw > 0;

    btn.disabled = !ready;
    if (!ready) {
        // Reset to neutral state
        btn.className = btn.className
            .replace(/\bsubmit-approve\b/g, '')
            .replace(/\bsubmit-donate\b/g, '');
        return;
    }

    let needsApproval = false;
    try {
        const amountWei = ethers.parseUnits(String(amountRaw), UGC_DECIMALS);
        needsApproval   = ugcAllowanceWei < amountWei;
    } catch { needsApproval = true; }

    if (needsApproval) {
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Approve UGC`;
        btn.classList.add('submit-approve');
        btn.classList.remove('submit-donate');
    } else {
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Donate Now`;
        btn.classList.remove('submit-approve');
        btn.classList.add('submit-donate');
    }
}

// ─── Form active / inactive overlay ──────────────────────────────────────────

function updateFormActiveState() {
    const card       = document.getElementById('donateCard');
    const overlay    = document.getElementById('formDisabledOverlay');
    const msgEl      = document.getElementById('overlayMessage');
    const disclaimer = document.getElementById('donateDisclaimer');

    const { isConnected, chainId } = WalletContext.getState();
    const hasCause = selectedCauseId !== null;
    const isWrongNetwork = isConnected && chainId !== null && chainId !== window.TARGET_CHAIN_ID;
    
    // Show overlay if no cause is selected OR if they are on the wrong network
    const showOverlay = !hasCause || isWrongNetwork;

    if (card)    card.classList.toggle('form-inactive', showOverlay);
    if (overlay) overlay.classList.toggle('overlay-visible', showOverlay);

    if (msgEl) {
        if (isWrongNetwork) {
            const chainName = window.getChainName ? window.getChainName(window.TARGET_CHAIN_ID) : 'Sepolia';
            msgEl.innerHTML = `Please switch to ${chainName} to use UGC donations.<br><button class="switch-network-btn-overlay" id="overlaySwitchNetworkBtn" onclick="wallet_switchEthereumChain()">Switch Network</button>`;
        } else {
            msgEl.textContent = !isConnected && !hasCause
                ? 'Select a cause and connect your wallet to donate'
                : 'Select a cause above to continue';
        }
    }
    if (disclaimer) {
        disclaimer.style.display = (hasCause && !isConnected && !isWrongNetwork) ? 'flex' : 'none';
    }

    refreshSubmitBtn();
}

// ─── Sync UGC balance + allowance from WalletContext ─────────────────────────
/**
 * Pulls the latest ugcBalance / ugcAllowance BigInts from WalletContext
 * (set by fetchUgcData in wallet.js) into local module state.
 * Also tries to read the token decimals once.
 */
async function syncUgcData() {
    // Force trigger on-chain fetch to get absolute newest values
    if (window.refreshUgcBalance) {
        await window.refreshUgcBalance();
    }
    const ctx = WalletContext.getState();
    const badgeEl = document.getElementById('walletBalance');
    const valEl   = document.getElementById('balanceValue');

    if (!ctx.isConnected || !ctx.provider || !ctx.address) {
        ugcBalanceWei   = 0n;
        ugcAllowanceWei = 0n;
        if (badgeEl) badgeEl.style.display = 'none';
        return;
    }

    // Use values already fetched by wallet.js if available
    if (ctx.ugcBalance !== null) {
        ugcBalanceWei   = ctx.ugcBalance   ?? 0n;
        ugcAllowanceWei = ctx.ugcAllowance ?? 0n;
    } else {
        // Fallback: read directly (first load / token not yet fetched)
        try {
            const token = new ethers.Contract(
                typeof UGC_TOKEN_ADDRESS !== 'undefined' ? UGC_TOKEN_ADDRESS : ethers.ZeroAddress,
                ERC20_ABI,
                ctx.provider
            );
            const [bal, dec, allow] = await Promise.all([
                token.balanceOf(ctx.address),
                token.decimals(),
                token.allowance(ctx.address, CONTRACT_ADDRESS),
            ]);
            ugcBalanceWei   = bal;
            ugcAllowanceWei = allow;
            UGC_DECIMALS    = dec;
            WalletContext.setState({ ugcBalance: bal, ugcAllowance: allow });
        } catch {
            ugcBalanceWei   = 0n;
            ugcAllowanceWei = 0n;
        }
    }

    // Update the in-form balance badge
    const humanBalance = Number(ethers.formatUnits(ugcBalanceWei, UGC_DECIMALS))
        .toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (valEl)   valEl.textContent    = `${humanBalance} UGC`;
    if (badgeEl) badgeEl.style.display = 'flex';
}

// ─── Called by causes.js when a cause is selected ────────────────────────────

function onCauseSelected(cause) {
    const icon     = document.getElementById('donateToIcon');
    const nameEl   = document.getElementById('donateToName');
    const addrEl   = document.getElementById('donateToAddress');
    const fullAddr = document.getElementById('donateToFullAddress');

    if (icon)     icon.textContent         = cause.icon;
    if (nameEl)   nameEl.textContent       = cause.name;
    if (addrEl)   addrEl.textContent       = truncAddr(cause.address);
    if (fullAddr) fullAddr.dataset.address = cause.address;

    const section = document.getElementById('donateSection');
    if (section) section.classList.add('visible');

    updateFormActiveState();

    const amount = parseFloat(document.getElementById('donateAmount')?.value);
    updateSummaryLine(amount > 0 ? amount : 0);
}

// ─── Submit handler ───────────────────────────────────────────────────────────
/**
 * Three-phase flow:
 *
 *  Phase 1 — EIP-2612 permit (gasless)
 *    Ask the wallet to sign a permit message. No on-chain tx needed.
 *    If the token doesn't support it → fall to Phase 2.
 *    If user rejects the sign → abort entirely.
 *
 *  Phase 2 — Standard approve() tx (fallback)
 *    On-chain tx. User needs a tiny ETH for gas.
 *    Fires only when Phase 1 returns null.
 *
 *  Phase 3 — donate / donateWithPermit
 *    Calls the correct DonationManager entry-point depending on which
 *    approval path succeeded. transferFrom moves UGC to the cause wallet.
 */
async function onDonateSubmit() {
    const { isConnected, signer, chainId } = WalletContext.getState();
    if (!isConnected) { showToast('Please connect your wallet first.'); openWalletModal(); return; }

    const amountRaw = parseFloat(document.getElementById('donateAmount')?.value);
    if (!validateAmount(amountRaw)) return;

    const cause = CAUSES.find(c => c.id === selectedCauseId);
    if (!cause) { showToast('Please select a cause.'); return; }

    const btn          = document.getElementById('donateSubmitBtn');
    const originalHTML = btn.innerHTML;
    const SPINNER      = `<svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;

    let amountWei;
    try {
        amountWei = ethers.parseUnits(String(amountRaw), UGC_DECIMALS);
    } catch {
        showError('Invalid amount.'); return;
    }

    const ugcToken   = new ethers.Contract(UGC_TOKEN_ADDRESS, ERC20_ABI, signer);
    const needsApproval = ugcAllowanceWei < amountWei;

    // ── Shared error classifier ───────────────────────────────────────────────
    function isRejection(err) {
        return (
            err.code === 4001 ||
            err.code === 'ACTION_REJECTED' ||
            err.message?.toLowerCase().includes('rejected') ||
            err.message?.toLowerCase().includes('denied') ||
            err.info?.error?.code === 4001
        );
    }

    function restoreBtn() {
        btn.disabled  = false;
        btn.innerHTML = originalHTML;
        refreshSubmitBtn();
    }

    let permitSig = null;

    if (needsApproval) {
        // ── Phase 1: EIP-2612 Permit (Gasless Signature) ──────────────────────
        btn.disabled  = true;
        btn.innerHTML = `${SPINNER} Requesting gasless allowance signature…`;
        try {
            permitSig = await tryPermitSignature(ugcToken, signer.address, amountWei, chainId);
        } catch (err) {
            console.warn('[Permit] Error in permit signature path:', err);
        }

        // ── Phase 2: Fallback Standard Approve Transaction ────────────────────
        if (!permitSig) {
            btn.innerHTML = `${SPINNER} Sending standard approve transaction (gas required)…`;
            try {
                const tx = await ugcToken.approve(CONTRACT_ADDRESS, amountWei);
                showToast('Approval transaction submitted! Please wait for confirmation.', 'info');
                await tx.wait();
                ugcAllowanceWei = amountWei; // Update local state allowance
                showToast('Allowance approved successfully!', 'success');
            } catch (approveErr) {
                console.error('[Approve] Fallback failed:', approveErr);
                restoreBtn();
                if (isRejection(approveErr)) {
                    showToast('Approval transaction cancelled.', 'error');
                } else {
                    const msg = approveErr.reason ?? approveErr.shortMessage ?? approveErr.message ?? 'Unknown error';
                    showToast(`Approval failed: ${msg}`, 'error');
                }
                return;
            }
        }
    }

    // ── Phase 3: sponsored Gasless Account Abstraction Donation ───────────
    btn.disabled  = true;
    btn.innerHTML = `${SPINNER} Sign the donation in your wallet…`;

    // Encode the correct DonationManager calldata depending on approval path
    const donationIface = new ethers.Interface(CONTRACT_ABI);
    let to, calldata;
    if (permitSig) {
        const { deadline, v, r, s } = permitSig;
        const erc20Iface = new ethers.Interface(ERC20_ABI);
        const permitCalldata = erc20Iface.encodeFunctionData('permit', [
            signer.address,
            CONTRACT_ADDRESS,
            amountWei,
            deadline,
            v,
            r,
            s
        ]);
        const donateCalldata = donationIface.encodeFunctionData('donateUGC', [
            cause.id,
            amountWei
        ]);

        to = [UGC_TOKEN_ADDRESS, CONTRACT_ADDRESS];
        calldata = [permitCalldata, donateCalldata];
    } else {
        to = CONTRACT_ADDRESS;
        calldata = donationIface.encodeFunctionData('donateUGC', [
            cause.id,
            amountWei
        ]);
    }

    const { provider } = WalletContext.getState();

    try {
        // Submit the UserOperation through our gasless sponsored bundler & paymaster
        const receipt = await sendBiconomyDonation({
            signer,
            provider,
            chainId,
            to,
            data: calldata,

            // Fired immediately after eth_sendUserOperation succeeds
            onOpSubmitted(opHash) {
                // Show the blocking overlay with the UserOp hash
                showTxPendingUserOp(opHash);
                // Restore button state beneath the overlay
                btn.innerHTML = originalHTML;
                btn.disabled  = false;
                refreshSubmitBtn();
            },
        });

        // UserOperation is successfully mined — upgrade the hash row to a real Etherscan link
        const txHash = receipt.transactionHash;
        upgradeTxHashToLink(txHash);

        // Visual pause for absolute best user experience before presenting success screen
        await new Promise(r => setTimeout(r, 900));

        // Re-sync balance and allowances to prevent any stale UI state
        await syncUgcData();
        refreshSubmitBtn();
        if (typeof loadOnChainStats === 'function') loadOnChainStats();
        
        // Open the dynamic success overlay panel
        showTxSuccess(amountRaw, cause.name, txHash);

    } catch (err) {
        console.error('[DonateForm] AA error:', err);
        hideTxPending();
        restoreBtn();

        if (isRejection(err)) {
            showToast('Donation cancelled. Nothing was sent.', 'error');
        } else if (err.message?.includes('Biconomy not configured')) {
            showToast('⚠️ Biconomy URLs not set — check biconomy.js', 'error');
            console.error(err.message);
        } else {
            const msg = err.reason ?? err.shortMessage ?? err.message ?? 'Unknown error';
            showToast(`Signing error: ${msg}`, 'error');
        }
    }
}

function initDonateForm() {
    fetchUgcPrice();
    setInterval(fetchUgcPrice, 60_000);

    const input = document.getElementById('donateAmount');

    input?.addEventListener('input', function () {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        const amount = parseFloat(this.value);
        clearError();
        updateUsdDisplay(amount);
        updateSummaryLine(amount);
        refreshSubmitBtn();
        if (this.value.trim() !== '') validateAmount(amount);
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'))
            btn.classList.add('active');
            const amount = parseFloat(btn.dataset.amount);
            if (input) input.value = btn.dataset.amount;
            clearError();
            updateUsdDisplay(amount);
            updateSummaryLine(amount);
            refreshSubmitBtn();
            validateAmount(amount);
        });
    });

    document.getElementById('donateToFullAddress')?.addEventListener('click', async function () {
        const address = this.dataset.address;
        if (!address) return;
        try { await navigator.clipboard.writeText(address); showToast('Address copied!', 'success'); } catch {}
    });

    document.getElementById('donateSubmitBtn')?.addEventListener('click', onDonateSubmit);

    document.getElementById('txDonateAgainBtn')?.addEventListener('click', () => {
        hideTxPending();
        setTimeout(resetDonateForm, 340);
    });

    updateFormActiveState();
}

// ─── Wallet context subscription ──────────────────────────────────────────────

WalletContext.subscribe(async (ctx) => {
    updateFormActiveState();
    await syncUgcData();
    refreshSubmitBtn();
    const amount = parseFloat(document.getElementById('donateAmount')?.value);
    if (amount > 0) validateAmount(amount);
});
