/**
 * WalletContext — Vanilla JS equivalent of a React Context.
 * Stores: provider, signer, address, chainId, isConnected
 * Notifies subscribers on state change.
 */



// ─── UGC Token config ─────────────────────────────────────────────────────────
// ⚠ Supports window.ENV (dynamic loader), process env, or safe hardcoded fallbacks.
const UGC_TOKEN_ADDRESS = (typeof window !== 'undefined' && window.ENV && window.ENV.VITE_UGC_TOKEN_ADDRESS)
    || (typeof process !== 'undefined' && process.env && process.env.VITE_UGC_TOKEN_ADDRESS)
    || '0xYourUGCTokenAddressHere';

const DONATION_CONTRACT_ADDRESS = (typeof window !== 'undefined' && window.ENV && window.ENV.VITE_DONATION_CONTRACT_ADDRESS)
    || (typeof process !== 'undefined' && process.env && process.env.VITE_DONATION_CONTRACT_ADDRESS)
    || '0xYourDonationManagerAddressHere';

const TRUSTED_FORWARDER = (typeof window !== 'undefined' && window.ENV && window.ENV.VITE_TRUSTED_FORWARDER)
    || (typeof process !== 'undefined' && process.env && process.env.VITE_TRUSTED_FORWARDER)
    || '0x...';

const UGC_FAUCET_URL = (typeof window !== 'undefined' && window.ENV && window.ENV.VITE_UGC_FAUCET_URL)
    || (typeof process !== 'undefined' && process.env && process.env.VITE_UGC_FAUCET_URL)
    || 'https://universalgasframework.com/faucets';

const TARGET_CHAIN_ID = Number(
    (typeof window !== 'undefined' && window.ENV && window.ENV.VITE_TARGET_CHAIN_ID)
    || (typeof process !== 'undefined' && process.env && process.env.VITE_TARGET_CHAIN_ID)
    || 84532
); // Default to Base Sepolia

const UGC_TOKEN_ABI = [
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function allowance(address owner, address spender) view returns (uint256)',
];

// ─── UGC data fetch ───────────────────────────────────────────────────────────

/**
 * Reads UGC balance + allowance for the connected wallet in a single round-trip.
 * Stores both in WalletContext so donate.js can skip the approve step when
 * ugcAllowance >= donationAmount.
 *
 * @param {ethers.Provider} provider
 * @param {string}          address
 */
async function fetchUgcData(provider, address) {
    const pillEl = document.getElementById('ugcBalancePill');
    if (!provider || !address) return;



    try {
        const token = new ethers.Contract(UGC_TOKEN_ADDRESS, UGC_TOKEN_ABI, provider);
        const [rawBalance, rawDecimals, rawAllowance] = await Promise.all([
            token.balanceOf(address),
            token.decimals(),
            token.allowance(address, DONATION_CONTRACT_ADDRESS),
        ]);
        const decimals = Number(rawDecimals);

        // Persist in context so donate.js can read ugcBalance / ugcAllowance
        WalletContext.setState({ 
            ugcBalance: rawBalance, 
            ugcAllowance: rawAllowance,
            ugcDecimals: decimals
        });

        // Format for the navbar pill
        const formatted = parseFloat(ethers.formatUnits(rawBalance, decimals));
        const display = formatted % 1 === 0
            ? formatted.toLocaleString('en-US')
            : formatted.toLocaleString('en-US', { maximumFractionDigits: 2 });

        if (pillEl) {
            pillEl.textContent   = `$${display}`;
            pillEl.style.display = 'inline-flex';
            pillEl.style.borderColor = 'rgba(16, 185, 129, 0.28)';
            pillEl.style.background = 'rgba(16, 185, 129, 0.12)';
            pillEl.style.color = '#10b981';
        }

        // Low-balance or zero-balance guard
        const minDonation = ethers.parseUnits('10', decimals);
        if (rawBalance < minDonation) {
            showZeroBalanceBanner(rawBalance === 0n);
        } else {
            hideZeroBalanceBanner();
        }

    } catch (err) {
        console.warn('[UGC] Could not read token data:', err.shortMessage || err.message);
        if (pillEl) pillEl.style.display = 'none';
        WalletContext.setState({ ugcBalance: null, ugcAllowance: null });
    }
}

// ─── Zero-balance banner ──────────────────────────────────────────────────────

async function claimFaucetTokens(e) {
    if (e) e.preventDefault();
    const ctx = WalletContext.getState();
    if (!ctx.isConnected || !ctx.signer || !ctx.address) {
        showToast('Please connect your wallet first.');
        alert('Please connect your wallet first.');
        return;
    }
    
    if (ctx.chainId !== TARGET_CHAIN_ID) {
        showToast('Please switch to Base Sepolia network first.');
        alert('Please switch to Base Sepolia network first.');
        return;
    }
    const faucetUrl = UGC_FAUCET_URL;
    if (!faucetUrl || faucetUrl.includes('your-swap-or-faucet-url')) {
        showToast('Mock USD faucet is not configured yet.', 'error');
        alert('Mock USD faucet is not configured. Please update VITE_UGC_FAUCET_URL.');
        return;
    }

    showToast('Opening the Mock USD faucet in a new tab…', 'info');
    window.open(faucetUrl, '_blank', 'noopener,noreferrer');
}

function showZeroBalanceBanner(isZero = true) {
    const banner = document.getElementById('ugcZeroBanner');
    if (!banner) return;
    
    const msgEl = banner.querySelector('.ugc-zero-banner__msg');
    if (msgEl) {
        if (isZero) {
            msgEl.textContent = 'You have no Mock USD tokens. Get Mock USD to start donating.';
        } else {
            msgEl.textContent = 'You have a low balance of Mock USD tokens. Get more Mock USD to donate.';
        }
    }

    const link = banner.querySelector('#ugcFaucetLink');
    if (link) {
        link.href = UGC_FAUCET_URL || '#';
        link.onclick = claimFaucetTokens;
    }

    const gaslessBtn = banner.querySelector('#ugcClaimGaslessBtn');
    if (gaslessBtn) {
        gaslessBtn.onclick = claimMockUSDGaslessly;
    }

    banner.classList.add('ugc-banner--visible');
}
async function claimMockUSDGaslessly(e) {
    if (e) e.preventDefault();
    const ctx = WalletContext.getState();
    if (!ctx.isConnected || !ctx.signer || !ctx.address) {
        showToast('Please connect your wallet first.');
        alert('Please connect your wallet first.');
        return;
    }
    
    if (ctx.chainId !== TARGET_CHAIN_ID) {
        showToast('Please switch to Base Sepolia network first.');
        alert('Please switch to Base Sepolia network first.');
        return;
    }

    const gaslessBtn = document.getElementById('ugcClaimGaslessBtn');
    if (gaslessBtn) {
        gaslessBtn.disabled = true;
        gaslessBtn.innerHTML = 'Claiming... <span style="animation: spin 1s linear infinite; display: inline-block;">⚡</span>';
    }

    try {
        showToast('Initiating gasless faucet claim...', 'info');

        // Get token decimals dynamically, default to 18
        const decimals = ctx.ugcDecimals || 18;
        const amount = ethers.parseUnits('1000', decimals);
        const tokenIface = new ethers.Interface(['function faucet(address to, uint256 amount)']);
        const calldata = tokenIface.encodeFunctionData('faucet', [ctx.address, amount]);

        // Call sendUGFDonation
        await window.sendUGFDonation({
            signer: ctx.signer,
            provider: ctx.provider,
            chainId: ctx.chainId,
            to: UGC_TOKEN_ADDRESS,
            data: calldata,
            onQuote: (q) => window.showUGFPhase('quoting', { quoteId: q.quoteId }),
            onSettle: () => window.showUGFPhase('settling'),
            onExecute: (h) => window.showUGFPhase('executing', { hash: h })
        });

        window.showUGFPhase('confirmed');
        showToast('Successfully claimed 1,000 MUSD gaslessly!', 'success');
        
        await new Promise(r => setTimeout(r, 1500));
        window.hideUGFOverlay();

        // Refresh balance
        await fetchUgcData(ctx.provider, ctx.address);

    } catch (err) {
        console.error('[Faucet] Gasless claim failed:', err);
        showToast(err.userMessage || err.message || 'Gasless claim failed.', 'error');
        window.hideUGFOverlay();
    } finally {
        if (gaslessBtn) {
            gaslessBtn.disabled = false;
            gaslessBtn.innerHTML = 'Claim 1,000 MUSD Gaslessly ⚡';
        }
    }
}

function hideZeroBalanceBanner() {
    document.getElementById('ugcZeroBanner')?.classList.remove('ugc-banner--visible');
}
const WalletContext = (() => {
    let state = {
        provider:     null,
        signer:       null,
        address:      null,
        chainId:      null,
        isConnected:  false,
        walletType:   null,
        ugcBalance:   null,   // raw BigInt from balanceOf()
        ugcAllowance: null,   // raw BigInt from allowance() vs DonationManager
        ugcDecimals:  null,   // standard Number from decimals()
    };

    const listeners = new Set();

    function getState() {
        return { ...state };
    }

    function setState(updates) {
        state = { ...state, ...updates };
        listeners.forEach(fn => fn({ ...state }));
    }

    function subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }

    return { getState, setState, subscribe };
})();

// ─── Network helpers ──────────────────────────────────────────────────────────

const CHAIN_NAMES = {
    1:        'Ethereum',
    5:        'Goerli',
    11155111: 'Sepolia',
    137:      'Polygon',
    80001:    'Mumbai',
    56:       'BNB Chain',
    97:       'BNB Testnet',
    42161:    'Arbitrum',
    10:       'Optimism',
    8453:     'Base',
    84532:    'Base Sepolia',
    43114:    'Avalanche',
};

function getChainName(chainId) {
    return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
}

function truncateAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ─── Toast Notifications ──────────────────────────────────────────────────────

function showToast(message, type = 'error') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icon = type === 'success' ? '✅' : type === 'info' ? 'ℹ️' : '⚠️';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${message}</span>`;

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('toast--visible'));
    });

    setTimeout(() => {
        toast.classList.remove('toast--visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 4000);
}

// ─── UI Updaters ──────────────────────────────────────────────────────────────

function updateNavbarWalletPill(ctx) {
    const statusEl   = document.getElementById('walletStatus');
    const statusDot  = document.getElementById('statusDot');
    const statusText = document.getElementById('walletStatusText');
    const networkBadge = document.getElementById('networkBadge');

    if (ctx.isConnected) {
        statusEl.classList.add('connected');
        statusDot.classList.add('connected');
        // Show truncated address — UGC balance is appended separately by fetchUgcBalance()
        statusText.textContent   = truncateAddress(ctx.address);
        networkBadge.textContent = getChainName(ctx.chainId);
        networkBadge.style.display = 'inline-block';
    } else {
        statusEl.classList.remove('connected');
        statusDot.classList.remove('connected');
        statusText.textContent = 'Not connected';
        networkBadge.style.display = 'none';
        // Hide UGC balance pill when disconnected
        const pillEl = document.getElementById('ugcBalancePill');
        if (pillEl) pillEl.style.display = 'none';
    }
}

function updateHeroCTA(isConnected) {
    const btn     = document.getElementById('connectWalletBtn');
    const btnText = document.getElementById('ctaBtnText');
    const btnIcon = btn.querySelector('.btn-icon');

    if (isConnected) {
        btnText.textContent = 'Choose a Cause';
        btn.classList.add('cta--connected');
        // Replace wallet icon with arrow-down icon
        btnIcon.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
            </svg>`;
    } else {
        btnText.textContent = 'Connect Wallet';
        btn.classList.remove('cta--connected');
        btnIcon.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
                <line x1="12" y1="12" x2="12" y2="16"></line>
                <line x1="10" y1="14" x2="14" y2="14"></line>
            </svg>`;
    }
}

// ─── Connection Handlers ──────────────────────────────────────────────────────

async function connectMetaMask() {
    if (!window.ethereum) {
        showToast('Wallet not detected. Please install MetaMask or another Web3 wallet.');
        alert('Wallet not detected. Please install MetaMask extension.');
        return false;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) throw new Error('No accounts returned');

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer   = await provider.getSigner();
        const network  = await provider.getNetwork();
        const address  = await signer.getAddress();

        WalletContext.setState({
            provider,
            signer,
            address,
            chainId: Number(network.chainId),
            isConnected: true,
            walletType: 'injected',
        });

        listenForAccountChanges(window.ethereum);
        return true;

    } catch (err) {
        console.error('[WalletContext] Connection error:', err);
        showToast(`Wallet connection failed: ${err.message || 'Try again.'}`);
        alert(`Connection error: ${err.message || 'Please check your wallet extension.'}`);
        return false;
    }
}

async function connectWalletConnect() {
    // WalletConnect v2 requires a project ID from cloud.walletconnect.com
    // For demo purposes we show a QR code modal simulation.
    // In production, replace with actual WalletConnect EthereumProvider init.
    showToast('WalletConnect: Please provide a WalletConnect Project ID to enable this wallet.', 'info');
    alert('WalletConnect requires a Project ID from cloud.walletconnect.com to function in this demo.');
    return false;

    /* === Production implementation ===
    const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
    const wcProvider = await EthereumProvider.init({
        projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
        chains: [1],
        showQrModal: true,
    });
    await wcProvider.enable();
    const provider = new ethers.BrowserProvider(wcProvider);
    const signer   = await provider.getSigner();
    const network  = await provider.getNetwork();
    const address  = await signer.getAddress();
    WalletContext.setState({ provider, signer, address, chainId: Number(network.chainId), isConnected: true, walletType: 'walletconnect' });
    return true;
    */
}

async function connectCoinbase() {
    // Coinbase Wallet SDK injection check
    const isCBW = window.ethereum && window.ethereum.isCoinbaseWallet;
    const isInjected = window.ethereum;

    if (isCBW || isInjected) {
        try {
            // Try connecting via the injected provider (works for CB Wallet extension too)
            const targetProvider = isCBW ? window.ethereum : window.ethereum;
            const accounts = await targetProvider.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) throw new Error('No accounts');

            const provider = new ethers.BrowserProvider(targetProvider);
            const signer   = await provider.getSigner();
            const network  = await provider.getNetwork();
            const address  = await signer.getAddress();

            WalletContext.setState({
                provider,
                signer,
                address,
                chainId: Number(network.chainId),
                isConnected: true,
                walletType: 'coinbase',
            });

            listenForAccountChanges(targetProvider);
            return true;

        } catch (err) {
            console.error('[WalletContext] Coinbase error:', err);
            showToast(`Wallet connection failed: ${err.message || 'Try again.'}`);
            alert(`Connection error: ${err.message || 'Please check your wallet extension.'}`);
            return false;
        }
    } else {
        showToast('Coinbase Wallet not detected. Install the Coinbase Wallet extension.');
        alert('Coinbase Wallet not detected. Please install the Coinbase Wallet extension.');
        return false;
    }
}

// ─── Account / Chain Change Listeners ────────────────────────────────────────

function listenForAccountChanges(rawProvider) {
    rawProvider.on?.('accountsChanged', async (accounts) => {
        if (!accounts || accounts.length === 0) {
            // User disconnected — clear everything including UGC fields
            WalletContext.setState({
                provider: null, signer: null, address: null,
                chainId: null,  isConnected: false, walletType: null,
                ugcBalance: null, ugcAllowance: null,
            });
            hideZeroBalanceBanner();
            showToast('Wallet disconnected.', 'info');
        } else {
            const provider = new ethers.BrowserProvider(rawProvider);
            const signer   = await provider.getSigner();
            const newAddress = accounts[0];
            WalletContext.setState({ signer, address: newAddress });
            // Re-fetch UGC data for the switched account
            await fetchUgcData(provider, newAddress);
        }
    });

    rawProvider.on?.('chainChanged', async () => {
        const provider = new ethers.BrowserProvider(rawProvider);
        const network  = await provider.getNetwork();
        WalletContext.setState({ provider, chainId: Number(network.chainId) });
        showToast(`Switched to ${getChainName(Number(network.chainId))}`, 'info');
    });
}

// ─── Switch Network Helper ───────────────────────────────────────────────────

async function wallet_switchEthereumChain() {
    const ctx = WalletContext.getState();
    const targetHex = '0x' + TARGET_CHAIN_ID.toString(16);
    
    // We should use the ethers BrowserProvider's send method if it exists
    if (!ctx.provider && !window.ethereum) {
        showToast('No active wallet provider found to switch networks.');
        alert('No active wallet provider found to switch networks.');
        return;
    }
    
    try {
        if (ctx.provider && typeof ctx.provider.send === 'function') {
            await ctx.provider.send('wallet_switchEthereumChain', [{ chainId: targetHex }]);
        } else {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: targetHex }],
            });
        }
    } catch (err) {
        if (err.code === 4902 || err.message?.includes('Unrecognized chain ID') || err.message?.includes('4902')) {
            try {
                if (TARGET_CHAIN_ID === 84532) {
                    const addParams = [{
                        chainId: targetHex,
                        chainName: 'Base Sepolia',
                        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                        rpcUrls: ['https://sepolia.base.org'],
                        blockExplorerUrls: ['https://sepolia.basescan.org'],
                    }];
                    if (ctx.provider && typeof ctx.provider.send === 'function') {
                        await ctx.provider.send('wallet_addEthereumChain', addParams);
                    } else {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: addParams,
                        });
                    }
                }
            } catch (addErr) {
                console.error(addErr);
                showToast('Failed to add the network to your wallet.');
                alert(`Failed to add network: ${addErr.message}`);
            }
        } else {
            console.error(err);
            showToast('Failed to switch network. Please switch manually in your wallet.');
            alert(`Failed to switch network: ${err.message}. Please open your wallet extension and switch manually to Base Sepolia.`);
        }
    }
}

window.wallet_switchEthereumChain = wallet_switchEthereumChain;

// ─── Modal Control ────────────────────────────────────────────────────────────

function openWalletModal() {
    const modal = document.getElementById('walletModal');
    modal.classList.add('modal--open');
    document.body.style.overflow = 'hidden';
}

function closeWalletModal() {
    const modal = document.getElementById('walletModal');
    modal.classList.remove('modal--open');
    document.body.style.overflow = '';
}

// Track last address and chain ID so we only trigger a full UGC fetch on actual connection / switch,
// not on every incremental setState call (e.g. when storing ugcBalance itself).
let _lastFetchedAddress = null;
let _lastFetchedChainId = null;

WalletContext.subscribe(async (ctx) => {
    updateNavbarWalletPill(ctx);
    updateHeroCTA(ctx.isConnected);

    const isWrongNetwork = ctx.isConnected && ctx.chainId !== null && ctx.chainId !== TARGET_CHAIN_ID;
    
    const wrongNetBanner = document.getElementById('wrongNetworkBanner');
    const zeroBanner = document.getElementById('ugcZeroBanner');
    
    if (isWrongNetwork) {
        wrongNetBanner?.classList.add('ugc-banner--visible');
        zeroBanner?.classList.remove('ugc-banner--visible');
    } else {
        wrongNetBanner?.classList.remove('ugc-banner--visible');
    }

    if (ctx.isConnected && !isWrongNetwork && (ctx.address !== _lastFetchedAddress || ctx.chainId !== _lastFetchedChainId)) {
        const wasNewConnection = ctx.address !== _lastFetchedAddress;
        _lastFetchedAddress = ctx.address;
        _lastFetchedChainId = ctx.chainId;
        
        if (wasNewConnection) {
            closeWalletModal();
            showToast(`Connected: ${truncateAddress(ctx.address)}`, 'success');
        }

        // Fetch balance + allowance; updates pill + zero-balance banner
        await fetchUgcData(ctx.provider, ctx.address);

        if (wasNewConnection) {
            // Scroll to causes section after data loads
            setTimeout(() => {
                document.getElementById('causesSection')?.scrollIntoView({ behavior: 'smooth' });
            }, 600);
        }
    }

    if (!ctx.isConnected) {
        _lastFetchedAddress = null;
        _lastFetchedChainId = null;
        hideZeroBalanceBanner();
        wrongNetBanner?.classList.remove('ugc-banner--visible');
    }
});


// Expose fetchUgcData globally so other modules can trigger an on-chain sync
window.refreshUgcBalance = async () => {
    const ctx = WalletContext.getState();
    if (ctx.isConnected && ctx.provider && ctx.address) {
        await fetchUgcData(ctx.provider, ctx.address);
    }
};

window.getChainName = getChainName;
window.TARGET_CHAIN_ID = TARGET_CHAIN_ID;
window.WalletContext = WalletContext;
window.openWalletModal = openWalletModal;
window.closeWalletModal = closeWalletModal;
window.connectMetaMask = connectMetaMask;
window.connectWalletConnect = connectWalletConnect;
window.connectCoinbase = connectCoinbase;
window.listenForAccountChanges = listenForAccountChanges;

// Enable clicking on the wallet badge to copy full address easily
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('walletStatus')?.addEventListener('click', async () => {
        const ctx = WalletContext.getState();
        if (ctx.isConnected && ctx.address) {
            try {
                await navigator.clipboard.writeText(ctx.address);
                showToast('Wallet address copied to clipboard!', 'success');
            } catch (err) {
                console.error('Could not copy address:', err);
                alert(`Your wallet address is:\n${ctx.address}`);
            }
        }
    });
});

