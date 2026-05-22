/**
 * ugf.js — UGF (Universal Gas Facilitation) Transaction Engine
 * ─────────────────────────────────────────────────────────────
 * Uses the official UGF Testnet SDK (@tychilabs/ugf-testnet-js)
 * for gasless transactions on Base Sepolia only.
 *
 * UGF Lifecycle:
 *   1. AUTH    — sign in to UGF
 *   2. QUOTE   — estimate gas cost in Mock USD
 *   3. SETTLE  — authorize Mock USD payment (x402)
 *   4. EXECUTE — submit transaction to Base Sepolia
 *   5. CONFIRM — on-chain finality + receipt
 *
 * Public API (called from donate.js):
 *
 *   const receipt = await sendUGFDonation({
 *     signer,            // ethers.js Signer
 *     provider,          // ethers.js Provider
 *     chainId,           // number (84532 for Base Sepolia)
 *     to,                // Target contract address
 *     data,              // Encoded calldata
 *     onQuote(quote),    // called after quote phase
 *     onSettle(),        // called after settle phase
 *     onExecute(txHash), // called after execute phase
 *   });
 *   // receipt.transactionHash is the mined tx hash
 */

// ─── Configuration ───────────────────────────────────────────────────────────
const UGF_BASE_URL = (typeof window !== 'undefined' && window.ENV && window.ENV.VITE_UGF_ENDPOINT)
    || null;

// UGF SDK CDN URL — official ESM distribution
// We try multiple sources for resilience
const UGF_SDK_URLS = [
    './vendor/ugf-testnet-js.mjs',
    'https://unpkg.com/@tychilabs/ugf-testnet-js/dist/index.mjs',
    'https://cdn.jsdelivr.net/npm/@tychilabs/ugf-testnet-js/dist/index.mjs',
    'https://unpkg.com/@tychilabs/ugf-testnet-js@latest/dist/index.mjs',
];

let ugfSdkPromise = null;
let ugfSdkModule = null;
let ugfClient = null;
let sdkLoadError = null;

/**
 * Attempts to dynamically import the UGF SDK from multiple CDN sources.
 * Falls back between CDNs if one fails. Caches the result.
 */
async function loadUGFSDK() {
    if (ugfSdkModule) return ugfSdkModule;
    if (ugfSdkPromise) return ugfSdkPromise;

    ugfSdkPromise = (async () => {
        for (const url of UGF_SDK_URLS) {
            try {
                console.log(`[UGF] Loading SDK from: ${url}`);
                const sdk = await import(/* webpackIgnore: true */ url);
                console.log('[UGF] SDK loaded successfully. Exports:', Object.keys(sdk));
                ugfSdkModule = sdk;
                sdkLoadError = null;
                return sdk;
            } catch (err) {
                console.warn(`[UGF] Failed to load from ${url}:`, err.message);
                continue;
            }
        }
        // All CDN sources failed
        sdkLoadError = new Error(
            'Could not load UGF SDK from any CDN source. ' +
            'Please check your internet connection or try again later. ' +
            'The SDK (@tychilabs/ugf-testnet-js) may be temporarily unavailable.'
        );
        throw sdkLoadError;
    })();

    return ugfSdkPromise;
}

/**
 * Returns a configured UGF client instance.
 * The client is created lazily and cached.
 */
async function getUGFClient() {
    if (ugfClient) return ugfClient;
    const sdk = await loadUGFSDK();

    // The UGFClient constructor accepts optional config
    // If the SDK exports UGFClient, use it; otherwise try default export
    const UGFClientClass = sdk.UGFClient || sdk.default?.UGFClient || sdk.default;
    if (!UGFClientClass) {
        throw new Error('[UGF] SDK loaded but UGFClient class not found. SDK exports: ' + Object.keys(sdk).join(', '));
    }

    ugfClient = UGF_BASE_URL
        ? new UGFClientClass({ baseUrl: UGF_BASE_URL })
        : new UGFClientClass();
    return ugfClient;
}

// Base Sepolia block explorer
const EXPLORER_BASE = 'https://sepolia.basescan.org/tx/';

// ─── UGF Lifecycle Status ────────────────────────────────────────────────────
const UGF_STATUS = {
    IDLE:      'idle',
    QUOTING:   'quoting',
    SETTLING:  'settling',
    EXECUTING: 'executing',
    CONFIRMED: 'confirmed',
    FAILED:    'failed',
};

// Current lifecycle state — observable by UI
let ugfCurrentStatus = UGF_STATUS.IDLE;

function getUGFStatus() {
    return ugfCurrentStatus;
}

// ─── SDK Helpers ──────────────────────────────────────────────────────────────

/**
 * Authenticates with the UGF service.
 * The SDK may expose different auth patterns depending on version.
 */
async function ensureUGFAuth(client, signer) {
    // Try multiple auth patterns the SDK might expose
    if (client.auth && typeof client.auth.login === 'function') {
        await client.auth.login(signer);
    } else if (typeof client.authenticate === 'function') {
        await client.authenticate(signer);
    } else if (typeof client.login === 'function') {
        await client.login(signer);
    } else {
        console.warn('[UGF] No explicit auth method found on client. SDK may handle auth implicitly.');
    }
}

// ─── TX Pending Overlay — UGF Lifecycle ──────────────────────────────────────

/**
 * Shows the full-screen transaction overlay and sets it to the specified
 * UGF lifecycle phase.
 *
 * @param {'quoting'|'settling'|'executing'|'confirmed'} phase
 * @param {object} [data] — optional data (quote info, tx hash, etc.)
 * @param {string} [stepInfo] — optional step progress text (e.g. "Step 1 of 2: Token Approval")
 */
function showUGFPhase(phase, data = {}, stepInfo = null) {
    const overlay   = document.getElementById('txPendingOverlay');
    const msg       = document.getElementById('txPendingMsg');
    const hint      = document.getElementById('txPendingHint');
    const hashRow   = document.getElementById('txHashRow');
    const label     = document.getElementById('txHashLabel');
    const hashPlain = document.getElementById('txHashDisplay');
    const linkEl    = document.getElementById('txHashLink');
    const linkDisp  = document.getElementById('txHashLinkDisplay');
    const stepBadge = document.getElementById('txStepBadge');

    if (!overlay) return;

    // Open overlay and lock scroll
    document.body.style.overflow = 'hidden';
    overlay.classList.add('tx-pending--open');

    // Update the step badge if stepInfo is provided
    if (stepBadge) {
        if (stepInfo) {
            stepBadge.textContent = stepInfo;
            stepBadge.style.display = 'inline-flex';
        } else {
            stepBadge.style.display = 'none';
        }
    }

    // Update all UGF step indicators
    const steps = document.querySelectorAll('.ugf-step');
    const phaseOrder = ['quoting', 'settling', 'executing', 'confirmed'];
    const currentIdx = phaseOrder.indexOf(phase);

    steps.forEach((step, i) => {
        step.classList.remove('ugf-step--active', 'ugf-step--done');
        if (i < currentIdx)  step.classList.add('ugf-step--done');
        if (i === currentIdx) step.classList.add('ugf-step--active');
    });

    // Phase-specific messaging
    switch (phase) {
        case 'quoting':
            if (msg) msg.textContent = 'Estimating gas cost in Mock USD…';
            if (hint) hint.textContent = '⏱ This takes a few seconds';
            if (hashRow) hashRow.dataset.state = 'userop';
            if (label) label.textContent = 'Quote';
            if (hashPlain) hashPlain.textContent = data.quoteId
                ? `${data.quoteId.slice(0, 10)}…${data.quoteId.slice(-6)}`
                : 'Requesting…';
            break;

        case 'settling':
            if (msg) msg.textContent = 'Locking Mock USD for gas payment…';
            if (hint) hint.textContent = '⏱ Almost there';
            if (label) label.textContent = 'Settlement';
            break;

        case 'executing':
            if (msg) msg.textContent = 'Submitting transaction to Base Sepolia…';
            if (hint) hint.textContent = '⏱ Confirming on-chain (15-30 seconds)';
            if (data.hash) {
                if (hashRow)  hashRow.dataset.state = 'txhash';
                if (label)    label.textContent = 'Transaction';
                if (linkDisp) linkDisp.textContent = `${data.hash.slice(0, 6)}…${data.hash.slice(-4)}`;
                if (linkEl)   linkEl.href = `${EXPLORER_BASE}${data.hash}`;
            }
            break;

        case 'confirmed':
            if (msg) msg.textContent = 'Confirmed on-chain! ✓';
            if (hint) hint.textContent = 'Gas fee: $0.00 — paid by UGF';
            break;
    }
}

/**
 * Hides the transaction overlay and resets its state.
 */
function hideUGFOverlay() {
    const overlay = document.getElementById('txPendingOverlay');
    if (!overlay) return;
    overlay.classList.remove('tx-pending--open');
    document.body.style.overflow = '';
    ugfCurrentStatus = UGF_STATUS.IDLE;

    setTimeout(() => {
        // Reset panels
        document.getElementById('txPendingPanel')?.classList.remove('tx-panel--hidden');
        document.getElementById('txSuccessPanel')?.classList.add('tx-panel--hidden');

        // Reset UGF step indicators
        document.querySelectorAll('.ugf-step').forEach(step => {
            step.classList.remove('ugf-step--active', 'ugf-step--done');
        });

        // Reset hash row
        const hashRow   = document.getElementById('txHashRow');
        const label     = document.getElementById('txHashLabel');
        const hashPlain = document.getElementById('txHashDisplay');
        const linkDisp  = document.getElementById('txHashLinkDisplay');
        const msg       = document.getElementById('txPendingMsg');
        const hint      = document.getElementById('txPendingHint');
        const stepBadge = document.getElementById('txStepBadge');
        if (hashRow)   hashRow.dataset.state = 'userop';
        if (label)     label.textContent     = 'Quote';
        if (hashPlain) hashPlain.textContent  = '—';
        if (linkDisp)  linkDisp.textContent   = '—';
        if (msg)       msg.textContent        = 'Preparing your gasless transaction…';
        if (hint)      hint.textContent       = '⏱ This usually takes 15–30 seconds';
        if (stepBadge) {
            stepBadge.textContent = '';
            stepBadge.style.display = 'none';
        }
    }, 320);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Full UGF gasless transaction flow.
 *
 * 1. Authenticates with UGF
 * 2. Quotes gas cost in Mock USD
 * 3. Settles (locks) Mock USD for gas
 * 4. Executes the transaction on Base Sepolia
 * 5. Polls until confirmed
 *
 * Callbacks fire at each phase so the UI can animate the lifecycle overlay.
 *
 * @param {object}   opts
 * @param {ethers.Signer}   opts.signer      — User's EOA signer
 * @param {ethers.Provider}  opts.provider    — Read-only provider
 * @param {number}           opts.chainId     — Chain ID (84532)
 * @param {string|string[]}  opts.to          — Target contract(s)
 * @param {string|string[]}  opts.data        — Encoded calldata(s)
 * @param {Function}         opts.onQuote     — (quote) => void
 * @param {Function}         opts.onSettle    — () => void
 * @param {Function}         opts.onExecute   — (txHash) => void
 * @returns {Promise<{transactionHash: string}>}
 */
async function sendUGFDonation({ signer, provider, chainId, to, data, onQuote, onSettle, onExecute }) {
    try {
        ugfCurrentStatus = UGF_STATUS.IDLE;

        // Load the SDK (will use cached version if already loaded)
        const sdk = await loadUGFSDK();
        const client = await getUGFClient();

        // Read SDK constants — handle different export patterns
        const BASE_SEPOLIA_CHAIN_ID = sdk.BASE_SEPOLIA_CHAIN_ID || sdk.CHAIN_IDS?.BASE_SEPOLIA || '84532';
        const TYI_USD_PAYMENT_COIN = sdk.TYI_USD_PAYMENT_COIN || sdk.TYI_MOCK_USD || sdk.PAYMENT_COINS?.TYI_USD || 'TYI_MOCK_USD';

        if (String(chainId) !== String(BASE_SEPOLIA_CHAIN_ID)) {
            throw new Error(`UGF testnet supports Base Sepolia only (chain ${BASE_SEPOLIA_CHAIN_ID}). Current: ${chainId}`);
        }

        if (Array.isArray(to) || Array.isArray(data)) {
            throw new Error('UGF SDK supports a single transaction at a time.');
        }

        if (!provider || typeof provider.waitForTransaction !== 'function') {
            throw new Error('Missing provider for confirmation.');
        }

        const senderAddress = await signer.getAddress();
        await ensureUGFAuth(client, signer);

        // ── Phase 1: QUOTE ────────────────────────────────────────────────────
        ugfCurrentStatus = UGF_STATUS.QUOTING;
        const txObject = {
            from: senderAddress,
            to: to,
            data: data,
            value: '0',
        };

        let quote;
        // Try different quote API patterns the SDK might expose
        if (client.quote && typeof client.quote.get === 'function') {
            quote = await client.quote.get({
                payer_address: senderAddress,
                tx_object: JSON.stringify(txObject),
                payment_coin: TYI_USD_PAYMENT_COIN,
            });
        } else if (typeof client.getQuote === 'function') {
            quote = await client.getQuote({
                payerAddress: senderAddress,
                txObject: txObject,
                paymentCoin: TYI_USD_PAYMENT_COIN,
            });
        } else {
            throw new Error('[UGF] Quote API not found on client. Available methods: ' +
                Object.getOwnPropertyNames(Object.getPrototypeOf(client)).join(', '));
        }

        if (typeof onQuote === 'function') {
            const quoteId = quote.quote_id || quote.quoteId || quote.digest || quote.id || 'unknown';
            onQuote({
                quoteId: quoteId,
                gasCostUsd: quote.settlement_amount || quote.settlementAmount || quote.cost || '0.00',
                raw: quote,
            });
        }

        // ── Phase 2: SETTLE (x402) ───────────────────────────────────────────
        ugfCurrentStatus = UGF_STATUS.SETTLING;

        // Try different payment/settle API patterns
        if (client.payment && client.payment.x402 && typeof client.payment.x402.execute === 'function') {
            await client.payment.x402.execute({ quote, signer });
        } else if (client.settle && typeof client.settle === 'function') {
            await client.settle({ quote, signer });
        } else if (typeof client.pay === 'function') {
            await client.pay({ quote, signer });
        } else if (client.payment && typeof client.payment.settle === 'function') {
            await client.payment.settle({ quote, signer });
        } else {
            console.warn('[UGF] No explicit settle/pay method found. SDK may handle this in execute phase.');
        }

        if (typeof onSettle === 'function') onSettle();

        // ── Phase 3: EXECUTE ─────────────────────────────────────────────────
        ugfCurrentStatus = UGF_STATUS.EXECUTING;

        let userTxHash;
        const quoteDigest = quote.digest || quote.quote_id || quote.quoteId || quote.id;

        // Try different execute API patterns
        if (client.chains && client.chains.evm && typeof client.chains.evm.sponsorAndExecute === 'function') {
            const result = await client.chains.evm.sponsorAndExecute(
                quoteDigest,
                signer,
                async () => ({
                    to: to,
                    data: data,
                    value: 0n,
                })
            );
            userTxHash = result.userTxHash || result.txHash || result.hash || result.transactionHash;
        } else if (typeof client.execute === 'function') {
            const result = await client.execute({
                quote,
                signer,
                txObject: { to, data, value: '0' },
            });
            userTxHash = result.userTxHash || result.txHash || result.hash || result.transactionHash;
        } else if (client.evm && typeof client.evm.execute === 'function') {
            const result = await client.evm.execute(quoteDigest, signer, { to, data, value: 0n });
            userTxHash = result.userTxHash || result.txHash || result.hash || result.transactionHash;
        } else {
            throw new Error('[UGF] Execute API not found on client.');
        }

        if (!userTxHash) {
            throw new Error('[UGF] Execute succeeded but no transaction hash was returned.');
        }

        if (typeof onExecute === 'function') onExecute(userTxHash);

        // ── Phase 4: CONFIRM ─────────────────────────────────────────────────
        const receipt = await provider.waitForTransaction(userTxHash);
        if (!receipt) {
            throw new Error('Transaction confirmation timed out.');
        }
        ugfCurrentStatus = UGF_STATUS.CONFIRMED;
        return {
            transactionHash: userTxHash,
            blockNumber: receipt.blockNumber,
        };
    } catch (err) {
        ugfCurrentStatus = UGF_STATUS.FAILED;

        // Enhance error messages for common issues
        if (err.message?.includes('Could not load UGF SDK')) {
            err.userMessage = 'UGF SDK is currently unavailable. Please check your internet connection and try again.';
        } else if (err.message?.includes('UGFClient class not found')) {
            err.userMessage = 'UGF SDK version incompatibility. Please report this to the developers.';
        } else if (err.message?.includes('Quote API not found')) {
            err.userMessage = 'UGF service is not responding correctly. Please try again in a moment.';
        }

        throw err;
    }
}

// ─── Pre-load SDK on page load (non-blocking) ────────────────────────────────
// This kicks off SDK loading early so it's ready when the user donates
(async () => {
    try {
        await loadUGFSDK();
        console.log('[UGF] SDK pre-loaded successfully ✓');
    } catch (err) {
        console.warn('[UGF] SDK pre-load failed (will retry on donation):', err.message);
    }
})();

// ─── Expose to global scope for cross-file access ────────────────────────────
window.sendUGFDonation = sendUGFDonation;
window.showUGFPhase    = showUGFPhase;
window.hideUGFOverlay  = hideUGFOverlay;
window.getUGFStatus    = getUGFStatus;
window.UGF_STATUS      = UGF_STATUS;
window.EXPLORER_BASE   = EXPLORER_BASE;
